const express = require('express');
const { createServer } = require('node:http');
const { createBareServer } = require('@tomphttp/bare-server-node');
const basicAuth = require('express-basic-auth');
const path = require('path');
// 公式パッケージからパスを取得
const { uvPath } = require('ultraviolet-static');

const app = express();
const server = createServer(app);
const bare = createBareServer('/bare/');

// Basic認証 (admin / password123)
app.use(basicAuth({
    users: { 'admin': 'password123' },
    challenge: true
}));

// ★重要：手動ダウンロードをやめて、公式ライブラリからファイルを配信
app.use('/uv/', express.static(uvPath));

// publicフォルダ（HTML用）
app.use(express.static(path.join(__dirname, 'public')));

// Bare Server ルーティング
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

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
