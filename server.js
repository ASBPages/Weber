const http = require('node:http');
const path = require('node:path');
const express = require('express');
const { createBareServer } = require('@tomphttp/bare-server-node');
const basicAuth = require('express-basic-auth');

const app = express();
const bare = createBareServer('/bare/');

app.use(basicAuth({
    users: { 'admin': 'password123' },
    challenge: true
}));

app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer();

server.on('request', (req, res) => {
    if (bare.shouldRoute(req)) {
        bare.routeRequest(req, res);
    } else {
        app(req, res);
    }
});

server.on('upgrade', (req, socket, head) => {
    if (bare.shouldRoute(req)) {
        bare.routeUpgrade(req, socket, head);
    } else {
        socket.end();
    }
});

// Koyebで最も安定する設定
const PORT = process.env.PORT || 8000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server started: port ${PORT}`);
});
