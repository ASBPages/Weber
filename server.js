const express = require('express');
const http = require('node:http');
const path = require('node:path');
const axios = require('axios');
const basicAuth = require('express-basic-auth');

const app = express();

// Basic認証 (ID: admin / PW: password123)
app.use(basicAuth({
    users: { 'admin': 'password123' },
    challenge: true
}));

app.use(express.static(path.join(__dirname, 'public')));

// URLを書き換えて画像やリンクをプロキシ経由にする関数
function rewriteUrl(originalUrl, baseUrl) {
    if (!originalUrl || originalUrl.startsWith('data:') || originalUrl.startsWith('javascript:')) return originalUrl;
    try {
        const resolvedUrl = new URL(originalUrl, baseUrl).href;
        return `/proxy?q=${Buffer.from(resolvedUrl).toString('base64')}`;
    } catch (e) {
        return originalUrl;
    }
}

app.get('/proxy', async (req, res) => {
    const encodedUrl = req.query.q;
    if (!encodedUrl) return res.redirect('/');

    try {
        const targetUrl = Buffer.from(encodedUrl, 'base64').toString('utf-8');
        const response = await axios.get(targetUrl, {
            responseType: 'arraybuffer',
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
            },
            validateStatus: () => true,
            timeout: 10000
        });

        const contentType = response.headers['content-type'];
        if (contentType && contentType.includes('text/html')) {
            let html = response.data.toString('utf-8');
            const baseUrl = targetUrl;

            // リンク・画像・CSSのURLを強制的にプロキシ経由に書き換える
            html = html.replace(/href=["']([^"']+)["']/g, (m, p1) => `href="${rewriteUrl(p1, baseUrl)}"`);
            html = html.replace(/src=["']([^"']+)["']/g, (m, p1) => `src="${rewriteUrl(p1, baseUrl)}"`);
            html = html.replace(/url\((['"]?)([^'")]+)\1\)/g, (m, q, p1) => `url(${rewriteUrl(p1, baseUrl)})`);

            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.send(html);
        } else {
            res.setHeader('Content-Type', contentType || 'application/octet-stream');
            res.send(response.data);
        }
    } catch (error) {
        res.status(500).send(`Proxy Error: ${error.message}`);
    }
});

// ★KoyebのTLSエラーを回避するため、httpモジュールで0.0.0.0にバインド
const server = http.createServer(app);
const PORT = process.env.PORT || 8080;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Stable Proxy started on port ${PORT}`);
});
