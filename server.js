const express = require('express');
const { createServer } = require('node:http');
const { createBareServer } = require('@tomphttp/bare-server-node');
const basicAuth = require('express-basic-auth');
const path = require('path');

const app = express();
const server = createServer(app);
const bare = createBareServer('/bare/');

// --- Basic認証 (Koyebの環境変数 PROXY_USER / PROXY_PASSWORD を使用) ---
const USER = process.env.PROXY_USER || 'admin';
const PASS = process.env.PROXY_PASSWORD || 'password123';

app.use(basicAuth({
    users: { [USER]: PASS },
    challenge: true,
    realm: 'Secure Manga Proxy'
}));

// --- 静的ファイルの配信 ---
app.use(express.static(path.join(__dirname, 'public')));

// --- プロキシエンジン (Bare Server) ---
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
    console.log(`Manga Proxy running on port ${PORT}`);
});
