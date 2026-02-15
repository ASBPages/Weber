const express = require('express');
const { createServer } = require('node:http');
const { createBareServer } = require('@tomphttp/bare-server-node');
const basicAuth = require('express-basic-auth');
const path = require('path');

const app = express();
const server = createServer();
const bare = createBareServer('/bare/');

// Basic認証 (ID: admin / PW: password123)
app.use(basicAuth({
    users: { 'admin': 'password123' },
    challenge: true
}));

app.use(express.static(path.join(__dirname, 'public')));

// Koyebのヘルスチェック用
app.get('/health', (req, res) => res.status(200).send('OK'));

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

// ★KoyebでのTLSエラー回避の鍵: ポート0.0.0.0でHTTPとして待機
const PORT = process.env.PORT || 8080;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server started on port ${PORT}`);
});
