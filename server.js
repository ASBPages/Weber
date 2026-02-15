const express = require('express');
const basicAuth = require('express-basic-auth');
const path = require('path');
const axios = require('axios');

const app = express();

// --- Basic認証 ---
app.use(basicAuth({
    users: { 'admin': 'password123' },
    challenge: true,
    realm: 'Secure Workspace'
}));

app.use(express.static(path.join(__dirname, 'public')));

// URLをプロキシ用に書き換えるヘルパー
function rewriteUrl(originalUrl, baseUrl) {
    if (!originalUrl || originalUrl.startsWith('data:') || originalUrl.startsWith('javascript:')) return originalUrl;
    try {
        const resolvedUrl = new URL(originalUrl, baseUrl).href;
        return `/proxy?q=${Buffer.from(resolvedUrl).toString('base64')}`;
    } catch (e) {
        return originalUrl;
    }
}

// プロキシ処理
app.get('/proxy', async (req, res) => {
    const encodedUrl = req.query.q;
    if (!encodedUrl) return res.redirect('/');

    try {
        const targetUrl = Buffer.from(encodedUrl, 'base64').toString('utf-8');
        const response = await axios.get(targetUrl, {
            responseType: 'arraybuffer',
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
                'Referer': targetUrl
            },
            timeout: 10000,
            validateStatus: () => true
        });

        const contentType = response.headers['content-type'];
        if (contentType && contentType.includes('text/html')) {
            let html = response.data.toString('utf-8');
            const baseUrl = targetUrl;

            // 強力な正規表現による書き換え (href, src, action, url())
            html = html.replace(/href=["']([^"']+)["']/g, (m, p1) => `href="${rewriteUrl(p1, baseUrl)}"`);
            html = html.replace(/src=["']([^"']+)["']/g, (m, p1) => `src="${rewriteUrl(p1, baseUrl)}"`);
            html = html.replace(/action=["']([^"']+)["']/g, (m, p1) => `action="${rewriteUrl(p1, baseUrl)}"`);
            html = html.replace(/url\((['"]?)([^'")]+)\1\)/g, (m, q, p1) => `url(${rewriteUrl(p1, baseUrl)})`);

            res.setHeader('Content-Type', 'text/html');
            res.send(html);
        } else {
            res.setHeader('Content-Type', contentType || 'application/octet-stream');
            res.send(response.data);
        }
    } catch (error) {
        res.status(500).send(`Error loading page: ${error.message}`);
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, '0.0.0.0', () => console.log(`Server running on port ${PORT}`));
