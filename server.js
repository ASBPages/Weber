const express = require('express');
const basicAuth = require('express-basic-auth');
const { createBareServer } = require('@tomphttp/bare-server-node');
const { createServer } = require('http');
const path = require('path');

const app = express();
const server = createServer(app);
const bare = createBareServer('/bare/');

// --- Basic認証 (ID/PW) ---
// Koyebの環境変数、またはデフォルト値
const USER = process.env.PROXY_USER || 'admin';
const PASS = process.env.PROXY_PASSWORD || 'password123';

app.use(basicAuth({
    users: { [USER]: PASS },
    challenge: true,
    realm: 'Secure Workspace'
}));

// 静的ファイルの配信
app.use(express.static(path.join(__dirname, 'public')));

// --- UV (Bare Server) の処理 ---
// これがYouTubeなどの裏側の通信を全部中継します
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
server.listen(PORT, () => {
    console.log(`Ultraviolet Proxy running on port ${PORT}`);
});