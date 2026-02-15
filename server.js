const express = require('express');
const basicAuth = require('express-basic-auth');
const httpProxy = require('http-proxy');
const path = require('path');
const axios = require('axios'); // 外部サイトのHTMLを取得するために必要

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
app.get('/proxy', async (req, res) => {
    const targetUrl = req.query.url; // 入力されたURLを取得
    if (!targetUrl) {
        return res.status(400).send('URLパラメータがありません');
    }

    try {
        // 1. 外部サイトのHTMLを取得
        const response = await axios.get(targetUrl, {
            responseType: 'text', // レスポンスをテキストとして扱う
        });
        let html = response.data;

        // 2. URLの書き換え処理（例：相対パスを絶対パスに）
        const baseUrl = new URL(targetUrl);
        const targetOrigin = baseUrl.origin; // ex) https://example.com

        // a.  href属性の書き換え (<a>タグのリンク)
        html = html.replace(/(href=["'])\/([^"']+)/g, `$1${targetOrigin}/$2`);

        // b. src属性の書き換え (<img src="...">など)
        html = html.replace(/(src=["'])\/([^"']+)/g, `$1${targetOrigin}/$2`);

        // c. CSSファイルのURL書き換え (CSSの相対パスも)
        html = html.replace(/url\(['"]?\/?([^'")]+)['"]?\)/g, `url('${targetOrigin}/$1')`);

        // 3. 書き換えたHTMLをクライアントに送信
        res.setHeader('Content-Type', 'text/html'); // ヘッダーの設定
        res.send(html);

    } catch (error) {
        console.error('Proxy Error:', error);
        res.status(500).send('Proxy service encountered an error.');
    }
});

const PORT = process.env.PORT || 8080; // ポートを8080に設定
app.listen(PORT, () => {
    console.log(`Proxy Server started on port ${PORT}`);
});
