//WebSocket Server
const fs = require("fs");
const https = require("https");
const http = require("http");
const WebSocket = require("ws"); // https://www.npmjs.com/package/ws
const url = require("url");
const jwt = require("jsonwebtoken"); // https://www.npmjs.com/package/jsonwebtoken
const ON_DEATH = require("death");

const listenPort = 8110;
const tokenSecret = "secret";
const authServer = false;

const server = http.createServer({
});

// const server = https.createServer({
//   // cert: fs.readFileSync('/path/to/cert.pem'),
//   // key: fs.readFileSync('/path/to/key.pem')
// });

let wss;

//run auth server
if (authServer) {

  wss = new WebSocket.Server({ noServer: true });

  console.log("running jwt auth server");
  server.on("upgrade", function upgrade(request, socket, head) {
    console.log("upgrade");

    isAuthorisedHeader(request, (err, client) => {
      console.log("authenticate client");
    if (err || !client) {
        console.log("authenticate Unauthorized");
        socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
        socket.destroy();
        return;
      } else {
        console.log("authenticate authorized: " + client.user);
      }

      wss.handleUpgrade(request, socket, head, function done(ws) {
        wss.emit("connection", ws, request, client);
      });
    });
  });
} else {
  wss = new WebSocket.Server({ server });
  console.log("running plain server");
}

ON_DEATH(function(signal, err) {
  wss.terminate();
  server.close();
})


function authenticate(request, callback) {
  console.log("authenticate request");
  console.log(request);
  callback(null, {user: "client"});
}

wss.on("connection", function connection(ws, req) {
  const remoteAddress = getRemoteAddress(req);
  console.log("remoteAddress: %s", remoteAddress);

  ws.isAlive = true;
  ws.on("pong", heartbeat);

  ws.on("message", function incoming(data) {
    console.log("received: %s, %s\n", data, data.length);
    let message = data;
    let echo = false;
    try {
      message = JSON.parse(data);
      if (message.echo) {
        echo = true;
      }
      ws.user = message.user;
      message.user = "server";
    } catch (ex) {

    }
    //repeat message to all clients and not it self unless echo is set
    wss.clients.forEach(function each(client) {
      if ((echo || client !== ws) && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  });
});

const interval = setInterval(function ping() {
  console.log("ping clients: %s", wss.clients.size);
  //ping each client
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    if (ws._socket.user) {
      console.log("▶️ ping: %s", ws._socket.user);
    } else {
      console.log("▶️ ping: %s", ws.user);
    }
    ws.ping(noop);
  });
}, 1000);

wss.on("close", function close() {
  console.log("disconnected");
  clearInterval(interval);
});

function getRemoteAddress(connection) {
  let returnAddress = "";
  try {
    returnAddress = connection.socket.remoteAddress;

    if (connection.headers["x-forwarded-for"]) {
      returnAddress = connection.headers["x-forwarded-for"].split(/\s*,\s*/)[0];
    }
  }
  catch (ex) {

  }
  return returnAddress;
}

function isAuthorisedHeader(connection, callback) {
  let client = connection.client;

  try {

    if (connection.headers["authorization"]) {
      const tokenEnc = connection.headers["authorization"].split(/\s/)[1];
      const buff = Buffer.from(tokenEnc, "base64");
      const buffToken = buff.toString("ascii").split(/token:/)[1];
      let token = jwt.verify(buffToken, tokenSecret);
      client.user = token.user;
      client.auth = true;
      callback(null, client);
      return true;
    }
  }
  catch (ex) {
    console.log("authorization error")
    console.log(ex)
  }
  callback("invalid token", client)
  return false;
}

function noop() {}

function heartbeat() {
  if (this._socket.user) {
    console.log("◀️ pong: %s", this._socket.user);
  } else {
    console.log("◀️ pong: %s", this.user);
  }

  this.isAlive = true;
}


server.listen(listenPort);
