/**
 * ==========================================================================
 * KEERTHAN TUNKOJU PORTFOLIO - FULL SERVER WITH SQLITE DATABASE
 * Run with: npm start (or node server.js)
 * Features:
 * - SQLite Database (portfolio.db) Integration
 * - RESTful APIs for Portfolio Content, Contact Inquiries & Authentication
 * - Native Static File Server with PDF Streaming
 * ==========================================================================
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const db = require('./db.js');

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.pdf': 'application/pdf',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

const sendJson = (res, statusCode, data) => {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(data));
};

const parseBody = (req) => {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
};

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // ==========================================
  // 1. API: Portfolio Content (SQLite DB)
  // ==========================================
  if (url.pathname === '/api/portfolio') {
    if (req.method === 'GET') {
      try {
        const data = await db.getPortfolioData();
        return sendJson(res, 200, data);
      } catch (err) {
        return sendJson(res, 500, { error: 'Database read failed: ' + err.message });
      }
    }

    if (req.method === 'POST') {
      try {
        const body = await parseBody(req);
        const result = await db.savePortfolioData(body);
        return sendJson(res, 200, { success: true, message: 'Saved to SQLite database', result });
      } catch (err) {
        return sendJson(res, 400, { error: 'Database write failed: ' + err.message });
      }
    }
  }

  // Legacy fallback alias
  if (url.pathname === '/api/portfolio-data') {
    if (req.method === 'GET') {
      const data = await db.getPortfolioData();
      return sendJson(res, 200, data);
    }
    if (req.method === 'POST') {
      const body = await parseBody(req);
      await db.savePortfolioData(body);
      return sendJson(res, 200, { success: true });
    }
  }

  // ==========================================
  // 1b. API: Upload Profile Photo
  // ==========================================
  if (url.pathname === '/api/upload-photo' && req.method === 'POST') {
    try {
      const { photoBase64, filename } = await parseBody(req);
      if (!photoBase64) {
        return sendJson(res, 400, { error: 'No image data provided' });
      }

      // Extract format & binary data from base64 DataURL
      const matches = photoBase64.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);
      let buffer;
      let ext = '.jpg';
      if (matches) {
        const type = matches[1].toLowerCase();
        if (type === 'jpeg' || type === 'jpg') ext = '.jpg';
        else if (type === 'png') ext = '.png';
        else if (type === 'webp') ext = '.webp';
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        buffer = Buffer.from(photoBase64, 'base64');
      }

      const assetsDir = path.join(__dirname, 'Assets');
      if (!fs.existsSync(assetsDir)) {
        fs.mkdirSync(assetsDir, { recursive: true });
      }

      const outName = 'profile-photo' + ext;
      const targetPath = path.join(assetsDir, outName);
      fs.writeFileSync(targetPath, buffer);

      const relativeUrl = 'Assets/' + outName + '?v=' + Date.now();

      // Update SQLite database portfolio_content as well
      const pData = await db.getPortfolioData();
      if (!pData.profile) pData.profile = {};
      pData.profile.avatar = relativeUrl;
      await db.savePortfolioData(pData);

      return sendJson(res, 200, { success: true, photoUrl: relativeUrl, message: 'Profile photo saved successfully' });
    } catch (err) {
      return sendJson(res, 500, { error: 'Failed to save photo: ' + err.message });
    }
  }

  // ==========================================
  // 2. API: Contact Messages (SQLite DB)
  // ==========================================
  if (url.pathname === '/api/contact' && req.method === 'POST') {
    try {
      const { name, email, subject, message } = await parseBody(req);
      if (!name || !email || !message) {
        return sendJson(res, 400, { error: 'Name, email, and message are required.' });
      }
      const saved = await db.saveMessage({ name, email, subject, message });
      return sendJson(res, 201, { success: true, message: 'Inquiry saved to database', id: saved.messageId });
    } catch (err) {
      return sendJson(res, 500, { error: 'Failed to record message in database: ' + err.message });
    }
  }

  if (url.pathname === '/api/messages' && req.method === 'GET') {
    try {
      const messages = await db.getMessages();
      return sendJson(res, 200, messages);
    } catch (err) {
      return sendJson(res, 500, { error: 'Failed to fetch messages: ' + err.message });
    }
  }

  if (url.pathname.startsWith('/api/messages/') && req.method === 'DELETE') {
    const id = url.pathname.split('/').pop();
    try {
      await db.deleteMessage(id);
      return sendJson(res, 200, { success: true, deletedId: id });
    } catch (err) {
      return sendJson(res, 500, { error: 'Failed to delete message: ' + err.message });
    }
  }

  // ==========================================
  // 3. API: Admin Auth (SQLite DB)
  // ==========================================
  if (url.pathname === '/api/auth/login' && req.method === 'POST') {
    try {
      const { hash } = await parseBody(req);
      const isValid = await db.verifyAdmin(hash);
      return sendJson(res, 200, { authenticated: isValid });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  if (url.pathname === '/api/auth/change-password' && req.method === 'POST') {
    try {
      const { currentHash, newHash } = await parseBody(req);
      const isCurrentValid = await db.verifyAdmin(currentHash);
      if (!isCurrentValid) {
        return sendJson(res, 401, { error: 'Current password incorrect' });
      }
      await db.changeAdminPassword(newHash);
      return sendJson(res, 200, { success: true, message: 'Password updated in database' });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // ==========================================
  // 4. API: Database Diagnostics
  // ==========================================
  if (url.pathname === '/api/database/stats' && req.method === 'GET') {
    try {
      const stats = await db.getDbStats();
      return sendJson(res, 200, stats);
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // ==========================================
  // 5. Static File Serving (with Resume PDF)
  // ==========================================
  let filePath = path.join(__dirname, url.pathname === '/' ? 'index.html' : url.pathname);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server Error: ' + err.code);
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': ext === '.pdf' ? 'public, max-age=3600' : 'no-cache'
      });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`\n==================================================================`);
  console.log(`🚀 Keerthan Portfolio Server running at http://localhost:${PORT}`);
  console.log(`🗄️  Database: SQLite (portfolio.db) active and initialized`);
  console.log(`📄 Resume: http://localhost:${PORT}/Keerthan_Tunkoju_Resume.pdf`);
  console.log(`🔑 Admin Login: Password "admin123"`);
  console.log(`==================================================================\n`);
});
