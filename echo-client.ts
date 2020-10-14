
//WebSocket Client
const WebSocket = require("ws");
const ON_DEATH = require("death");
const jwt = require("jsonwebtoken");


const tokenSecret = "secret";
const clientName = "client" + Date.now();

console.log("client: %s", clientName);

const authServer = false;

var clientToken = jwt.sign({ user: clientName }, tokenSecret);

let connectionUrl = "ws://localhost:8110/";

if (authServer) {
  connectionUrl = "ws://token:"+clientToken+"@localhost:8110/";
}

const isAlive = true;

function heartbeat() {
  clearTimeout(this.pingTimeout);

  // Use `WebSocket#terminate()`, which immediately destroys the connection,
  // instead of `WebSocket#close()`, which waits for the close timer.
  // Delay should be equal to the interval at which your server
  // sends out pings plus a conservative assumption of the latency.
  this.pingTimeout = setTimeout(() => {
    this.terminate();
  }, 1000 + 1000);
}

function sendMessage(client) {
    const newMessage = {
      user: clientName,
      from: clientName,
      content: Date.now(),
      key: Date.now()
    };
    client.send(JSON.stringify(newMessage));
}

var client;

function openConnection() {

  client = new WebSocket(connectionUrl);

  ON_DEATH(function(signal, err) {
    client.close();
  })

  client.onerror=function(event){
    console.log("Could not connect to: " + connectionUrl);
  }

  client.on("open", function open() {
    console.log("connected");
    sendMessage(client);
  });
  client.on("ping", function () {
    heartbeat();
    console.log("▶️ ping: %s", clientName);
  });
  client.on("close", function clear() {
    console.log("disconnected");
    clearTimeout(this.pingTimeout);
  });
  client.on("message", function incoming(data) {
    const message = JSON.parse(data);
    console.log("received: %s, %s", data, data.length);
    console.log(`Roundtrip time: ${Date.now() - message.key} ms`);
    setTimeout(function() {
      console.log("send");
      sendMessage(client);
    }, 5000);
  });

}

function main() {
  openConnection();
}

main();
