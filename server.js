import { createBareServer } from '@tomphttp/bare-server-node';
import express from 'express';
import { createServer } from 'node:http'; // ★重要: httpsではなくhttpを使う
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const app = express();
const server = createServer(); // Expressではなく直接HTTPサーバーを作る
const bare = createBareServer('/bare/');

// 静的ファイルの配信
app.use(express.static(join(__dirname, 'public')));

// サーバーのリクエスト処理（Bare Server優先）
server.on('request', (req, res) => {
    if (bare.shouldRoute(req)) {
        bare.routeRequest(req, res);
    } else {
        app(req, res);
    }
});

// WebSocket処理（動画再生に必須）
server.on('upgrade', (req, socket, head) => {
    if (bare.shouldRoute(req)) {
        bare.routeUpgrade(req, socket, head);
    } else {
        socket.end();
    }
});

// ★Koyeb推奨ポート 8000 で、0.0.0.0（全開放）で待機する
const PORT = parseInt(process.env.PORT || '8000');
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
