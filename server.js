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
const mailer = require('./mailer.js');

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
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization'
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
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
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

      // Also overwrite Assets/keerthan-photo.jpg so any direct or default asset references reflect the uploaded photo
      const canonicalPath = path.join(assetsDir, 'keerthan-photo.jpg');
      fs.writeFileSync(canonicalPath, buffer);

      const timestamp = Date.now();
      const relativeUrl = 'Assets/keerthan-photo.jpg?v=' + timestamp;

      // Update SQLite database portfolio_content and sync to data.js
      const pData = await db.getPortfolioData();
      if (!pData.profile) pData.profile = {};
      pData.profile.avatar = relativeUrl;
      await db.savePortfolioData(pData);

      return sendJson(res, 200, { success: true, photoUrl: relativeUrl, message: 'Profile photo saved successfully and synchronized for all visitors' });
    } catch (err) {
      return sendJson(res, 500, { error: 'Failed to save photo: ' + err.message });
    }
  }

  // ==========================================
  // 1c. API: Upload Certificate Document (PDF or Image)
  // ==========================================
  if (url.pathname === '/api/upload-certificate' && req.method === 'POST') {
    try {
      const { fileBase64, filename } = await parseBody(req);
      if (!fileBase64) {
        return sendJson(res, 400, { error: 'No certificate file data provided' });
      }

      const certsDir = path.join(__dirname, 'Assets', 'certifications');
      if (!fs.existsSync(certsDir)) {
        fs.mkdirSync(certsDir, { recursive: true });
      }

      let buffer;
      let ext = '.pdf';
      const pdfMatch = fileBase64.match(/^data:application\/pdf;base64,(.+)$/);
      const imgMatch = fileBase64.match(/^data:image\/([a-zA-Z0-9+]+);base64,(.+)$/);

      if (pdfMatch) {
        ext = '.pdf';
        buffer = Buffer.from(pdfMatch[1], 'base64');
      } else if (imgMatch) {
        const type = imgMatch[1].toLowerCase();
        if (type === 'jpeg' || type === 'jpg') ext = '.jpg';
        else if (type === 'png') ext = '.png';
        else if (type === 'webp') ext = '.webp';
        buffer = Buffer.from(imgMatch[2], 'base64');
      } else {
        buffer = Buffer.from(fileBase64, 'base64');
      }

      const cleanName = (filename || 'certificate').replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();
      const outName = `${cleanName}-${Date.now()}${ext}`;
      const targetPath = path.join(certsDir, outName);
      fs.writeFileSync(targetPath, buffer);

      const relativeUrl = `Assets/certifications/${outName}`;
      return sendJson(res, 200, {
        success: true,
        fileUrl: relativeUrl,
        filename: outName,
        message: 'Certificate uploaded successfully'
      });
    } catch (err) {
      return sendJson(res, 500, { error: 'Failed to upload certificate: ' + err.message });
    }
  }

  // ==========================================
  // 2. API: Contact Messages & Mail Integration
  // ==========================================
  if (url.pathname === '/api/contact' && req.method === 'POST') {
    try {
      const { name, email, subject, message } = await parseBody(req);
      if (!name || !email || !message) {
        return sendJson(res, 400, { error: 'Name, email, and message are required.' });
      }

      // 1. Save inquiry into SQLite database
      const saved = await db.saveMessage({ name, email, subject, message });

      // 2. Dispatch email notification to Keerthan's configured address
      let emailNotificationResult = { skipped: true };
      try {
        const mailSettings = await db.getMailSettings();
        if (mailSettings && mailSettings.notify_enabled) {
          emailNotificationResult = await mailer.sendContactNotification({
            name,
            email,
            subject,
            message
          }, mailSettings);

          if (emailNotificationResult.success) {
            await db.updateEmailAlertStatus(saved.messageId, 'sent');
          } else if (emailNotificationResult.unconfigured) {
            await db.updateEmailAlertStatus(saved.messageId, 'unconfigured');
          } else {
            await db.updateEmailAlertStatus(saved.messageId, 'failed');
          }
        }
      } catch (mailErr) {
        console.warn('⚠️ Mail notification failed (inquiry safe in DB):', mailErr.message);
        await db.updateEmailAlertStatus(saved.messageId, 'failed');
      }

      return sendJson(res, 201, {
        success: true,
        message: 'Inquiry saved to database',
        id: saved.messageId,
        mailNotification: emailNotificationResult
      });
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

  // Update read / unread status of a message
  if (url.pathname.match(/^\/api\/messages\/(\d+)\/status$/) && (req.method === 'PATCH' || req.method === 'POST')) {
    const id = url.pathname.match(/^\/api\/messages\/(\d+)\/status$/)[1];
    try {
      const { status, isRead } = await parseBody(req);
      await db.updateMessageStatus(id, status, isRead);
      return sendJson(res, 200, { success: true, id, status, isRead });
    } catch (err) {
      return sendJson(res, 500, { error: 'Failed to update message status: ' + err.message });
    }
  }

  // Record a reply in database (whether sent via SMTP or external webmail)
  if (url.pathname.match(/^\/api\/messages\/(\d+)\/reply$/) && req.method === 'POST') {
    const id = url.pathname.match(/^\/api\/messages\/(\d+)\/reply$/)[1];
    try {
      const { replySubject, replyBody } = await parseBody(req);
      await db.saveMessageReply(id, { replySubject, replyBody });
      return sendJson(res, 200, { success: true, id, message: 'Reply recorded in database.' });
    } catch (err) {
      return sendJson(res, 500, { error: 'Failed to record reply: ' + err.message });
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
  // 3. API: Mail Integration & SMTP Settings
  // ==========================================
  if (url.pathname === '/api/mail/settings') {
    if (req.method === 'GET') {
      try {
        const settings = await db.getMailSettings();
        const safe = {
          provider: settings.provider || 'gmail',
          host: settings.host || 'smtp.gmail.com',
          port: settings.port || 465,
          secure: Boolean(settings.secure),
          auth_user: settings.auth_user || '',
          hasPassword: Boolean(settings.auth_pass && settings.auth_pass.length > 0),
          auth_pass: settings.auth_pass ? '••••••••' : '',
          from_name: settings.from_name || 'Keerthan Tunkoju Portfolio',
          from_email: settings.from_email || 'keerthantunkoju10@gmail.com',
          notify_email: settings.notify_email || 'keerthantunkoju10@gmail.com',
          notify_enabled: Boolean(settings.notify_enabled),
          updated_at: settings.updated_at
        };
        return sendJson(res, 200, safe);
      } catch (err) {
        return sendJson(res, 500, { error: 'Failed to load mail settings: ' + err.message });
      }
    }

    if (req.method === 'POST') {
      try {
        const body = await parseBody(req);
        await db.saveMailSettings(body);
        return sendJson(res, 200, { success: true, message: 'Mail settings saved successfully' });
      } catch (err) {
        return sendJson(res, 500, { error: 'Failed to save mail settings: ' + err.message });
      }
    }
  }

  // Test email dispatch to verify SMTP credentials
  if (url.pathname === '/api/mail/test' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const settings = await db.getMailSettings();
      // If a temporary password was passed in the test request, use it for testing
      if (body.auth_pass && body.auth_pass !== '••••••••') {
        settings.auth_pass = body.auth_pass;
      }
      if (body.auth_user) settings.auth_user = body.auth_user;
      if (body.host) settings.host = body.host;
      if (body.port) settings.port = body.port;
      if (body.provider) settings.provider = body.provider;

      const targetEmail = body.targetEmail || settings.notify_email || 'keerthantunkoju10@gmail.com';
      const result = await mailer.sendTestEmail(targetEmail, settings);
      return sendJson(res, 200, {
        success: true,
        message: `Test email successfully sent to ${targetEmail}! Check your inbox.`,
        details: result
      });
    } catch (err) {
      return sendJson(res, 400, {
        success: false,
        error: 'SMTP Test Failed: ' + err.message
      });
    }
  }

  // Send direct email reply from CMS Dashboard to visitor
  if (url.pathname === '/api/mail/send-reply' && req.method === 'POST') {
    try {
      const { messageId, to, subject, replyText, originalMessage, originalSenderName } = await parseBody(req);
      if (!to || !replyText) {
        return sendJson(res, 400, { error: 'Recipient email and reply text are required.' });
      }

      const settings = await db.getMailSettings();
      const sendResult = await mailer.sendDirectReply({
        to,
        subject: subject || 'Re: Portfolio Inquiry',
        replyText,
        originalMessage,
        originalSenderName
      }, settings);

      // Record reply in database
      if (messageId) {
        await db.saveMessageReply(messageId, {
          replySubject: subject || 'Re: Portfolio Inquiry',
          replyBody: replyText
        });
      }

      return sendJson(res, 200, {
        success: true,
        message: `Reply email successfully delivered to ${to}`,
        details: sendResult
      });
    } catch (err) {
      return sendJson(res, 400, {
        success: false,
        error: 'Email reply could not be sent: ' + err.message
      });
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
  console.log(`🔑 Admin Login: Password "Keerthan@2024"`);
  console.log(`==================================================================\n`);
});
