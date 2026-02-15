const express = require('express');
const basicAuth = require('express-basic-auth');
const httpProxy = require('http-proxy');
const path = require('path');

const app = express();
const proxy = httpProxy.createProxyServer();

// --- 1. Basic認証の設定（環境変数から読み込む） ---
const USER = process.env.PROXY_USER || 'admin';
const PASS = process.env.PROXY_PASSWORD || 'password123';

app.use(basicAuth({
    users: { [USER]: PASS },
    challenge: true,
    realm: 'Private Proxy Site'
}));

// publicフォルダを静的ファイルとして提供
app.use(express.static(path.join(__dirname, 'public')));

// --- 2. リバースプロキシ処理 ★ここを変更★ ---
app.get('/proxy', (req, res) => {
    const targetUrl = req.query.url; // 入力されたURLを取得
    if (!targetUrl) {
        return res.status(400).send('URLパラメータがありません');
    }

    // ターゲットURLへリクエストを転送する
    proxy.web(req, res, {
        target: targetUrl, // 入力されたURLをターゲットにする
        changeOrigin: true, // ホスト名をターゲットのものに変更する
        selfHandleResponse: false // サーバーからの応答をそのまま返す
    });
});

// エラーハンドリング (重要)
proxy.on('error', (err, req, res) => {
    console.error('Proxy Error:', err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Proxy service encountered an error.');
});

const PORT = process.env.PORT || 8080; // ポートを8080に設定
app.listen(PORT, () => {
    console.log(`Proxy Server started on port ${PORT}`);
});
