import React from 'react';
import ReactDOM from 'react-dom';
import 'antd/dist/antd.css';
import './index.css';
import App from './App';
import { Auth0Provider } from "@auth0/auth0-react";
import config from "./config.json";
import {SocketContext, socketObj} from "./context";



ReactDOM.render(
  <Auth0Provider
    domain={config.domain}
    clientId={config.clientID}
    redirectUri={window.location.origin}
  >
    <SocketContext.Provider value={socketObj}>
      <App />
    </SocketContext.Provider>
  </Auth0Provider>,
  document.getElementById('root')
);
