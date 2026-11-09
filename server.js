/**
 * ==========================================================================
 * KEERTHAN TUNKOJU PORTFOLIO - FULL SERVER WITH SQLITE DATABASE & MAILER
 * Run with: npm start (or node server.js)
 * Features:
 * - SQLite Database (portfolio.db) Integration
 * - RESTful APIs for Portfolio Content, Contact Inquiries & Authentication
 * - Multi-device LAN & Cloud Access (Listens on 0.0.0.0, detects Local Network IP)
 * - Automated Instant Email Notifications via Google App Password / SMTP
 * - Resend Email Notification endpoint for inquiries
 * - Native Static File Server with PDF Streaming
 * ==========================================================================
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Automatically load environment variables from .env if present
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  if (typeof process.loadEnvFile === 'function') {
    try { process.loadEnvFile(envPath); } catch (e) {}
  } else {
    try {
      const envLines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
      for (const line of envLines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx !== -1) {
          const key = trimmed.slice(0, eqIdx).trim();
          let val = trimmed.slice(eqIdx + 1).trim();
          if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
          }
          if (process.env[key] === undefined) process.env[key] = val;
        }
      }
    } catch (e) {}
  }
}

const db = require('./db.js');
const mailer = require('./mailer.js');

const PORT = process.env.PORT || 3000;

// Resolve Local Network IPv4 Address for cross-device access
const getNetworkIp = () => {
  const nets = os.networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        return net.address;
      }
    }
  }
  return 'localhost';
};

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

const DEFAULT_GMAIL_USER = 'keerthantunkoju10@gmail.com';
const DEFAULT_APP_PASSWORD = 'mbhueupbdmpzkscj'; // Fixed Google App Password for all devices

// Clean Google App Password by removing spaces/hyphens
const normalizeAppPassword = (pass) => {
  if (!pass) return '';
  return pass.toString().replace(/[\s-]/g, '').trim();
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
  if (url.pathname === '/api/portfolio' || url.pathname === '/api/portfolio-data') {
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

  // ==========================================
  // 1b. API: Upload Profile Photo
  // ==========================================
  if (url.pathname === '/api/upload-photo' && req.method === 'POST') {
    try {
      const { photoBase64 } = await parseBody(req);
      if (!photoBase64) {
        return sendJson(res, 400, { error: 'No image data provided' });
      }

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

      const canonicalPath = path.join(assetsDir, 'keerthan-photo.jpg');
      fs.writeFileSync(canonicalPath, buffer);

      const timestamp = Date.now();
      const relativeUrl = 'Assets/keerthan-photo.jpg?v=' + timestamp;

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
  // 1c. API: Upload Certificate Document
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
  // 2. API: System Settings (Google App Password & Email Config)
  // Stored in SQLite database for all devices
  // ==========================================
  if (url.pathname === '/api/settings/email') {
    if (req.method === 'GET') {
      try {
        const settings = await db.getSettings();
        const activePass = settings.gmail_app_password || DEFAULT_APP_PASSWORD;
        const hasPassword = !!(activePass && activePass.trim().length > 0);
        return sendJson(res, 200, {
          gmailUser: settings.gmail_user || DEFAULT_GMAIL_USER,
          notifyEmail: settings.notify_email || DEFAULT_GMAIL_USER,
          senderName: settings.sender_name || 'Keerthan Tunkoju Portfolio',
          emailNotificationsEnabled: settings.email_notifications_enabled !== '0',
          autoReplyEnabled: settings.auto_reply_enabled === '1',
          hasPassword: true,
          maskedPassword: '••••••••••••••••',
          fixedPassword: DEFAULT_APP_PASSWORD
        });
      } catch (err) {
        return sendJson(res, 500, { error: 'Failed to retrieve email settings: ' + err.message });
      }
    }

    if (req.method === 'POST') {
      try {
        const { gmailUser, appPassword, notifyEmail, senderName, emailNotificationsEnabled, autoReplyEnabled } = await parseBody(req);
        const toSave = {};
        if (gmailUser !== undefined) toSave.gmail_user = (gmailUser || '').trim();
        if (notifyEmail !== undefined) toSave.notify_email = (notifyEmail || '').trim();
        if (senderName !== undefined) toSave.sender_name = (senderName || '').trim();
        if (emailNotificationsEnabled !== undefined) toSave.email_notifications_enabled = emailNotificationsEnabled ? '1' : '0';
        if (autoReplyEnabled !== undefined) toSave.auto_reply_enabled = autoReplyEnabled ? '1' : '0';

        // Update password if a new raw password was entered, otherwise maintain fixed default
        if (appPassword && appPassword.trim().length > 0 && !appPassword.includes('••••')) {
          toSave.gmail_app_password = normalizeAppPassword(appPassword);
        } else {
          const currentSettings = await db.getSettings();
          toSave.gmail_app_password = currentSettings.gmail_app_password || DEFAULT_APP_PASSWORD;
        }

        await db.saveSettings(toSave);
        return sendJson(res, 200, {
          success: true,
          message: 'Google App Password & email settings successfully saved in database for all devices!'
        });
      } catch (err) {
        return sendJson(res, 500, { error: 'Failed to save email settings: ' + err.message });
      }
    }
  }

  // Test Google App Password & Gmail SMTP Connection
  if (url.pathname === '/api/settings/email/test' && req.method === 'POST') {
    try {
      const body = await parseBody(req);
      const settings = await db.getSettings();

      const gmailUser = (body.gmailUser || settings.gmail_user || DEFAULT_GMAIL_USER).trim();
      let appPass = body.appPassword ? normalizeAppPassword(body.appPassword) : (settings.gmail_app_password || DEFAULT_APP_PASSWORD);
      if (!appPass || appPass.includes('••••') || appPass === 'itdemecrgmaxxtvb') {
        appPass = settings.gmail_app_password || DEFAULT_APP_PASSWORD;
      }
      if (!appPass || !appPass.trim()) {
        appPass = DEFAULT_APP_PASSWORD;
      }
      const testRecipient = (body.testEmail || settings.notify_email || gmailUser || DEFAULT_GMAIL_USER).trim();

      const testSettings = {
        ...settings,
        gmail_user: gmailUser,
        gmail_app_password: appPass,
        notify_email: testRecipient
      };

      const result = await mailer.sendTestEmail(testRecipient, testSettings);
      return sendJson(res, 200, {
        success: true,
        message: `Authentication successful! Live test email delivered to ${testRecipient}.`,
        messageId: result.messageId
      });
    } catch (err) {
      let friendlyError = err.message;
      if (friendlyError.includes('Invalid login') || friendlyError.includes('535-5.7.8') || friendlyError.includes('535') || friendlyError.includes('BadCredentials')) {
        friendlyError = 'Invalid Google App Password or Username. Please ensure 2-Step Verification is active on your Google Account and you generated a 16-character App Password at myaccount.google.com/apppasswords.';
      }
      return sendJson(res, 400, {
        error: friendlyError,
        raw: err.message
      });
    }
  }

  // ==========================================
  // 3. API: Contact Messages (Central SQLite DB & Email Dispatch)
  // ==========================================
  if (url.pathname === '/api/contact' && req.method === 'POST') {
    try {
      const { name, email, subject, message } = await parseBody(req);
      if (!name || !email || !message) {
        return sendJson(res, 400, { error: 'Name, email, and message are required.' });
      }

      // 1. Save immediately to centralized SQLite database
      const saved = await db.saveMessage({ name, email, subject, message });
      const messageId = saved.messageId;

      // 2. Dispatch email notification to Keerthan
      const settings = await db.getSettings();
      let emailResult = { skipped: true };

      try {
        emailResult = await mailer.sendContactNotification({
          id: messageId,
          name,
          email,
          subject,
          message
        }, settings);

        if (emailResult.success) {
          await db.updateMessageEmailStatus(messageId, 1, null);
        } else if (emailResult.error) {
          await db.updateMessageEmailStatus(messageId, 0, emailResult.error);
        }
      } catch (mailErr) {
        console.error('Mail notification error:', mailErr.message);
        await db.updateMessageEmailStatus(messageId, 0, mailErr.message);
        emailResult = { success: false, error: mailErr.message };
      }

      // 3. Optional Auto-Reply to visitor
      if (settings.auto_reply_enabled === '1' && emailResult.success) {
        mailer.sendAutoReply({ name, email, subject, message }, settings).catch(e => {
          console.warn('Auto-reply non-blocking error:', e.message);
        });
      }

      return sendJson(res, 201, {
        success: true,
        message: 'Inquiry saved to centralized database and queued for email delivery',
        id: messageId,
        emailSent: Boolean(emailResult.success)
      });
    } catch (err) {
      return sendJson(res, 500, { error: 'Failed to record message in database: ' + err.message });
    }
  }

  // Fetch all messages (visible across all devices)
  if (url.pathname === '/api/messages' && req.method === 'GET') {
    try {
      const messages = await db.getMessages();
      return sendJson(res, 200, messages);
    } catch (err) {
      return sendJson(res, 500, { error: 'Failed to fetch messages: ' + err.message });
    }
  }

  // Resend email notification for an existing message
  if (url.pathname.match(/^\/api\/messages\/(\d+)\/resend-email$/) && req.method === 'POST') {
    const id = url.pathname.split('/')[3];
    try {
      const msg = await db.getMessageById(id);
      if (!msg) {
        return sendJson(res, 404, { error: 'Message not found in database.' });
      }

      const settings = await db.getSettings();
      const result = await mailer.sendContactNotification(msg, settings);

      if (result.success) {
        await db.updateMessageEmailStatus(id, 1, null);
        return sendJson(res, 200, {
          success: true,
          message: `Inquiry successfully delivered to ${result.recipient}!`,
          messageId: result.messageId
        });
      } else {
        const errMsg = result.error || result.message || 'Email delivery failed.';
        await db.updateMessageEmailStatus(id, 0, errMsg);
        return sendJson(res, 400, {
          error: errMsg,
          unconfigured: result.unconfigured || false
        });
      }
    } catch (err) {
      return sendJson(res, 500, { error: 'Resend email error: ' + err.message });
    }
  }

  // Mark all messages as read
  if (url.pathname === '/api/messages/mark-all-read' && req.method === 'POST') {
    try {
      await db.markAllMessagesRead();
      return sendJson(res, 200, { success: true, message: 'All messages marked as read' });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // Mark individual message as read/unread
  if (url.pathname.match(/^\/api\/messages\/(\d+)\/read$/) && (req.method === 'POST' || req.method === 'PATCH')) {
    const id = url.pathname.split('/')[3];
    try {
      const { isRead } = await parseBody(req);
      await db.markMessageRead(id, isRead !== false ? 1 : 0);
      return sendJson(res, 200, { success: true, id, isRead: isRead !== false });
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // Direct reply to inquiry via Gmail SMTP
  if (url.pathname.match(/^\/api\/messages\/(\d+)\/reply$/) && req.method === 'POST') {
    const id = url.pathname.split('/')[3];
    try {
      const { replyText, recipientEmail, subject } = await parseBody(req);
      if (!replyText || !replyText.trim()) {
        return sendJson(res, 400, { error: 'Reply message cannot be empty.' });
      }

      const settings = await db.getSettings();
      const msg = await db.getMessageById(id);

      await mailer.sendDirectReply({
        to: recipientEmail,
        subject: subject || (msg ? `Re: ${msg.subject || 'Portfolio Inquiry'}` : 'Re: Portfolio Inquiry'),
        replyText,
        originalMessage: msg ? msg.message : null,
        originalSenderName: msg ? msg.name : null
      }, settings);

      await db.recordMessageReply(id, replyText);
      return sendJson(res, 200, { success: true, message: 'Reply sent successfully via Gmail SMTP!' });
    } catch (err) {
      return sendJson(res, 500, { error: 'Failed to send reply: ' + err.message });
    }
  }

  // Delete message from database
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
  // 4. API: Admin Auth (SQLite DB)
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
  // 5. API: Database Diagnostics & Network URLs
  // ==========================================
  if (url.pathname === '/api/database/stats' && req.method === 'GET') {
    try {
      const stats = await db.getDbStats();
      const networkIp = getNetworkIp();
      stats.networkIp = networkIp;
      stats.networkUrl = `http://${networkIp}:${PORT}`;
      stats.localUrl = `http://localhost:${PORT}`;
      return sendJson(res, 200, stats);
    } catch (err) {
      return sendJson(res, 500, { error: err.message });
    }
  }

  // ==========================================
  // 6. Static File Serving (with Resume PDF)
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

server.listen(PORT, '0.0.0.0', () => {
  const netIp = getNetworkIp();
  console.log(`\n==================================================================`);
  console.log(`🚀 Keerthan Portfolio Server Active & Listening on All Interfaces!`);
  console.log(`   📱 Local URL:    http://localhost:${PORT}`);
  console.log(`   🌐 Network URL:  http://${netIp}:${PORT}  <-- Open this on phone/other devices!`);
  console.log(`🗄️  Database:     SQLite (portfolio.db) active and initialized`);
  console.log(`📧 Mail Service: Configured for keerthantunkoju10@gmail.com`);
  console.log(`📄 Resume:       http://localhost:${PORT}/KeerthanTunkoju.pdf`);
  console.log(`🔑 Admin Login:  Password "Keerthan@2024"`);
  console.log(`==================================================================\n`);
});
