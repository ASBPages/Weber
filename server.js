const express = require('express');
const basicAuth = require('express-basic-auth');
const httpProxy = require('http-proxy');
const path = require('path');

const app = express();
const proxy = httpProxy.createProxyServer();

// --- 1. Basic認証の設定 ---
const USER = process.env.PROXY_USER || 'ABS'; 
const PASS = process.env.PROXY_PASSWORD || 'ABSOwer';

app.use(basicAuth({
    users: { [USER]: PASS },
    challenge: true,
    realm: 'Private Proxy Site'
}));

// --- 2. シンプルなリバースプロキシ処理 ---
// ★ターゲットのURLをここに設定してください★
// 動作テスト用の仮URLです。
const TARGET_URL = 'https://pixiv.net'; 

app.use((req, res, next) => {
    // ターゲットURLへリクエストを転送する
    proxy.web(req, res, { 
        target: TARGET_URL,
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

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Proxy Server started on port ${PORT}`);
});
