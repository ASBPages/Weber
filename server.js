const http = require('node:http');
const path = require('node:path');
const express = require('express');
const { createBareServer } = require('@tomphttp/bare-server-node');
const basicAuth = require('express-basic-auth');

const app = express();
const bare = createBareServer('/bare/');

// 認証 (admin / password123)
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

// Koyeb の要求するポートに 0.0.0.0 で確実にバインド
const PORT = process.env.PORT || 8000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is listening on port ${PORT}`);
});
