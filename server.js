const express = require('express');
const { createServer } = require('node:http');
const { createBareServer } = require('@tomphttp/bare-server-node');
const basicAuth = require('express-basic-auth');
const path = require('path');

const app = express();
const server = createServer(app);
const bare = createBareServer('/bare/');

// 認証設定 (admin / password123)
app.use(basicAuth({
    users: { 'admin': 'password123' },
    challenge: true
}));

app.use(express.static(path.join(__dirname, 'public')));

// Bare Server (重要: これがないとYouTubeは動きません)
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

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`Running on port ${PORT}`));
