const express = require('express');
const { createServer } = require('node:http');
const { createBareServer } = require('@tomphttp/bare-server-node');
const basicAuth = require('express-basic-auth');
const path = require('path');

const app = express();
const server = createServer(app);
const bare = createBareServer('/bare/');

// --- 1. Basic認証の設定 ---
// RailwayのVariablesで設定するか、直接書き換えてください
const USER = process.env.PROXY_USER || 'ABS';
const PASS = process.env.PROXY_PASSWORD || 'ABSsena';

app.use(basicAuth({
    users: { [USER]: PASS },
    challenge: true,
    realm: 'Private Proxy Site'
}));

// --- 2. プロキシエンジンの処理 ---
app.use(express.static(path.join(__dirname, 'public')));

server.on('upgrade', (req, socket, head) => {
    if (bare.shouldRoute(req)) {
        bare.routeUpgrade(req, socket, head);
    } else {
        socket.end();
    }
});

server.on('request', (req, res) => {
    if (bare.shouldRoute(req)) {
        bare.routeRequest(req, res);
    } else {
        app(req, res);
    }
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
    console.log(`Proxy is running on port ${PORT}`);
});
