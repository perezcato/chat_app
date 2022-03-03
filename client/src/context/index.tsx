import React from 'react';
import socketio from "socket.io-client";
import config from "../config.json";

export const socketObj = socketio.connect(config.endpoint);
export const SocketContext = React.createContext<SocketIOClient.Socket | null>(null);