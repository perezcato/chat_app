import React, {useContext, useEffect, useState} from 'react';
import { useAuth0 } from "@auth0/auth0-react";
import {Container,LeftContainer,RightContainer,ChatContainer,Bottom,Input,SendButton,Message,Login,ChatAppWrapper, PaneHeader, Avatar, NameTag, UserOnline, UserImage, UserDetails, UsersContainer} from "./styles";
import {IUser, IMessage, IRoom, IBlockerUser} from "./interface";
import { Tabs, Menu, Dropdown, Button } from 'antd';
import v from 'voca';
import {AiOutlineSend} from 'react-icons/ai';
import {IoEllipsisVerticalOutline} from 'react-icons/io5'
import {SocketContext} from "./context";
const { TabPane } = Tabs;

function App() {
  const { loginWithRedirect,logout,user,isAuthenticated } = useAuth0();
  const [desc, setDesc] = useState('')
  const [messages,setMessages] = useState<IMessage[]>([])
  const [currentUser, setCurrentUser] = useState<IUser|any>(null);
  const [users, setUsers] = useState<IUser[]>([]);
  const [allUsers, setAllUsers] = useState<IUser[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<IBlockerUser[]>([]);
  const [activeRoom,setActiveRoom] = useState('');
  const [activeUser,setActiveUser] = useState<IUser|any>(null);
  const [rooms,setRooms] = useState<IRoom[]>([]);
  const [disappear,setDisappear] = useState(false);

  const socket = useContext(SocketContext);


  useEffect(()=>{
    if(isAuthenticated){
      setCurrentUser({...user} as IUser)
      socket?.emit('join', { ...user});

      socket?.on("allUsers", (allUsers:IUser[]) => {
        setAllUsers(allUsers);
      })

      socket?.on("onlineUsers", (users:IUser[]) => {
        setUsers(users);
        if(activeUser && !users.includes(activeUser)){
          setActiveUser(null)
          setActiveRoom('')
        }
      })

      socket?.on("blockedUsers", (users:IBlockerUser[]) => {
        setBlockedUsers(users)
      })

      socket?.on("allRooms", (data:any) => {
        if(data.email === user.email){
          setRooms(data.docs);
        }
      })

      socket?.on("addRoom", (room:IRoom) => {
        setRooms([...rooms,room]);
      })

      socket?.on("allMessages", (data:any) => {
        if(data.email === user.email){
          setMessages(data.docs);
        }
      })

      socket?.on('message', (message:IMessage) => {
        setMessages(messages => [ ...messages, message]);
      });
    }
  },[isAuthenticated]);

  useEffect(()=>{
    if(disappear){
      window.addEventListener("blur", handleBlur)
      if(isAuthenticated){
        window.addEventListener("focus", handleFocus)
      }
    }

    return ()=>{
      if(disappear){
        window.removeEventListener("blur", handleBlur)
        if(isAuthenticated){
          window.removeEventListener("focus", handleFocus)
        }
      }
    }
  },[disappear])

  const handleFocus = () =>{
    if (!socket?.connected){
      socket?.connect()
      socket?.emit('join', { ...user});
    }
  }

  const handleBlur = () =>{
    socket?.disconnect()
  }

  const startRoomChat = (user:IUser)=>{
    const ch = [String(currentUser.email+user.email),String(user.email+currentUser.email)]
    const getRoom = rooms.find((room:IRoom) => ch.includes(room.name));
    if(getRoom){
      setActiveRoom(getRoom.name)
    }
    else {
      socket?.emit('saveRoom', {name:ch[0]});
      setActiveRoom(ch[0])
    }
    setActiveUser(user)
  }

  const sendMessage = () => {
    if(desc && activeRoom) {
      socket?.emit('sendMessage', {desc,room:activeRoom,owner:currentUser?.email}, () => setDesc(''));
    }
  }

  const handleLogout = () => {
    socket?.emit('logout', currentUser?.email,() => logout({ returnTo: window.location.origin }));
  }

  const getUsersOnline = ()=>{
    const bUsers = [...blockedUsers.map(value =>value.email === user.email? value.by : value.by === user.email? value.email:null)]
    return users.filter(user=> user.email !== currentUser.email && !bUsers.includes(user.email))
  }

  const getBlockUsers = ()=>{
    const bUsers = [...blockedUsers.map(value => value.by === user.email? value.email:null)]
    return allUsers.filter(user=>  bUsers.includes(user.email))
  }

  const getMessages = ()=>{
    return messages.filter(message=> message.room === activeRoom)
  }

  const blockUser = () =>{
    socket?.emit('blockUser', {email:activeUser?.email,by:currentUser?.email}, () => {
      setActiveRoom('')
      setActiveUser(null)
    });
  }

  const unBlockUser = (email:string) =>{
    socket?.emit('unBlockUser', {email,by:currentUser?.email});
  }

  return (
    isAuthenticated ? (
    <Container>
      <ChatAppWrapper>
        <LeftContainer>
          <PaneHeader>
            <Avatar
                src={currentUser?.picture}
            />
            <NameTag>
              <div
                  style={{
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: 600
                  }}> {v.titleCase(user?.nickname)}
              </div>
            </NameTag>
            <Dropdown overlay={(<Menu>
              <Menu.Item>
                <div onClick={() => handleLogout()}>
                  Logout
                </div>
              </Menu.Item>
            </Menu>)} placement="bottomLeft" arrow>
              <Button
                  style={{
                    background: 'transparent',
                    border: 'none'
                  }}
              >
                <IoEllipsisVerticalOutline color="#f1f1f2eb" />
              </Button>
            </Dropdown>

          </PaneHeader>

          <Tabs
              defaultActiveKey="1"
              onChange={() => console.log('clicked')} style={{ flex: 1 }}>
            <TabPane tab="Chats" key="1" style={{
              width: '100%',
              height: '100%',
            }}>
              {getUsersOnline().length > 0 ? getUsersOnline().map(value =>
                  <UserOnline
                      active={value.email === activeUser?.email} key={value.email}
                      onClick={() => startRoomChat(value)}>
                <UserImage src={value.picture}/>
                <UserDetails>
                  {value.name}
                </UserDetails>
              </UserOnline>): 'No users'}
            </TabPane>
            <TabPane tab="Emails" key="2">
              <UsersContainer>
                {allUsers.length > 0 ? allUsers.map(value =>
                    <UserOnline>
                      <UserImage src={value.picture}/>
                      <UserDetails>
                        {value.name}
                      </UserDetails>
                    </UserOnline>
                ): 'No Emails'}
              </UsersContainer>
            </TabPane>
            <TabPane tab="Blocked Users" key="3">
              {getBlockUsers().length > 0 ? getBlockUsers().map(value =>
                  <UserOnline>
                    <UserImage src={value.picture}/>
                    <UserDetails>
                      {value.name}
                    </UserDetails>
                    <Dropdown overlay={(<Menu>
                      <Menu.Item>
                        <div onClick={() => unBlockUser(value.email)}>
                          Unblock
                        </div>
                      </Menu.Item>
                    </Menu>)} placement="bottomLeft" arrow>
                      <Button
                          style={{
                            background: 'transparent',
                            border: 'none'
                          }}
                      >
                        <IoEllipsisVerticalOutline color="#f1f1f2eb" />
                      </Button>
                    </Dropdown>
                  </UserOnline>): 'No blocked users'}
            </TabPane>
          </Tabs>
        </LeftContainer>

        <RightContainer>
          {
            !!activeUser && (
          <PaneHeader>
              <Avatar
                  src={activeUser?.picture}
              />
              <NameTag>
                <div style={{
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: 600
                }}>{v.titleCase(activeUser.name)}</div>
              </NameTag>

            <Dropdown overlay={(<Menu>
              <Menu.Item>
                <div onClick={() => blockUser()}>
                  Block
                </div>
              </Menu.Item>
            </Menu>)} placement="bottomLeft" arrow>
              <Button
                  style={{
                    background: 'transparent',
                    border: 'none'
                  }}
              >
                <IoEllipsisVerticalOutline color="#f1f1f2eb" />
              </Button>
            </Dropdown>
          </PaneHeader>
            )
          }

          {!!activeRoom && <>
            <ChatContainer>
              {getMessages().map((value:IMessage,index) => <Message right={value.owner===currentUser.email} key={index}>
                {value.desc}
              </Message>)}
            </ChatContainer>

            <Bottom>
              <Input rows={1} value={desc} onChange={(e)=>setDesc(e.target.value)}/>
              <SendButton onClick={sendMessage}> <AiOutlineSend color={'white'} size={20} /> </SendButton>
            </Bottom>
          </>}
        </RightContainer>
      </ChatAppWrapper>
    </Container>):
      <Login>
        <button style={{color: 'blue'}} onClick={() => loginWithRedirect()}>Login</button>
      </Login>
  );
}

export default App;
