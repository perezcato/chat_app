import express from "express"
import cors from "cors"
import mongoose from "mongoose";
import config from "./config";
import http from "http";
import {users, blockedUsers, addUser, addBlockedUser, removeUser, unBlockUser, addAllUser, allUsers} from "./users"
import {IUser, IMessage, IRoom,IBlockerUser} from "./interface";
import { Server,Socket } from "socket.io";
import MessageModel from "./models/message";
import UserModel from "./models/user";
import RoomModel from "./models/room";
import BlockedUserModel from "./models/blockUser";

const app = express()
app.use(cors())

const port = process.env.PORT || 6000

app.set( 'port', port )
const server = http.createServer(app);

const io = new Server(server,{
  cors: {
    origin: "https://chat-app-client-app.herokuapp.com",
    methods: ["GET", "POST"],
    credentials: true
  }
});

mongoose.connect(config.mongoURI, {useNewUrlParser: true, useUnifiedTopology: true,useCreateIndex:true}).then(()=>{
  console.log("MongoDB connected...");

  io.on('connection',(socket:Socket)=>{
    socket.on('join', async (iUser:IUser) => {
      const res = addUser({...iUser, id: socket.id});
      if (res){
        try{
          const user = await UserModel.findOne({email: iUser.email});
          if(!user){
            const model = new UserModel(iUser);
            await model.save();
          }
        }catch (e) {
          console.log(e);
        }
      }

      RoomModel.find({ "name": { "$regex": iUser.email, "$options": "i" } },
          function (err, docs:IUser[]) {
        io.emit('allRooms',{ docs, email: iUser.email })
      })

      MessageModel.find({ "room": { "$regex": iUser.email, "$options": "i" } },
          function (err, docs:IUser[]) {
        io.emit('allMessages',{ docs, email: iUser.email })
      })

      BlockedUserModel.find({}, function(err, users:IBlockerUser[]) {
        users.forEach(function(user) {
          const index = blockedUsers.findIndex((block) => user.email === block.email)
          if(index === -1){
            addBlockedUser(user)
          }
        });
        io.emit('blockedUsers',blockedUsers)
      });

      UserModel.find({}, function(err, users:IUser[]) {
        users.forEach(function(user) {
          const index = allUsers.findIndex((value) => user.email === value.email)
          if(index === -1){
            addAllUser(user)
          }
        });
        io.emit('allUsers',allUsers)
      });
      io.emit('onlineUsers', users);
    });


    socket.on('saveRoom', async ( room: IRoom ) => {
      const model = new RoomModel(room);
      await model.save();
      io.emit('addRoom', room)
    });

    socket.on('sendMessage', async (message:IMessage, callback) => {
      const model = new MessageModel(message);
      await model.save();
      io.emit('message', message)
      callback();
    });

    socket.on('blockUser', async (block:IBlockerUser, callback) => {
      const model = new BlockedUserModel(block);
      await model.save();
      addBlockedUser(block)
      io.emit('blockedUsers',blockedUsers)
      callback();
    });

    socket.on('unBlockUser', (user:IBlockerUser) => {
      BlockedUserModel.findOneAndDelete({ email: user.email,by:user.by }, null , (err) =>{
        if(err) {
          console.log(err);
        }
        else {
          unBlockUser(user)
          io.emit('blockedUsers',blockedUsers)
        }
      });
    });

    socket.on('disconnect', () => {
      const user = removeUser(socket.id);
      if(user) {
        io.emit('onlineUsers', users);
      }
    })

    socket.on('logout', (email,callback) => {
      const user = removeUser(email);
      if(user) {
        io.emit('onlineUsers', users);
      }
      callback()
    })
  })
  server.listen(port, ()=>console.log('Server running!'))
}).catch (e => {
  console.log(e.message)
  process.exit(1)
})