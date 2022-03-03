## Get the app running
Before this app can run, you have to install and setup
* node
* docker

### Config setup
Open the config file in the client/src folder and update the endpoint to
```
http://localhost:5000
```

Open the index file in the server/src folder and update the origin to
```
http://localhost:3000
```

### docker
Open the parent folder, Run command in terminal
```
docker-compose up
```

### Manually
Open server folder install node packages and start backend server, Run command in terminal
```
npm install
npm run build
npm run start
```

And finally open client folder install node packages and start frontend server, Run command in terminal
```
npm install
npm run start
```
