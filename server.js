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

const nodemailer = require('nodemailer');

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

// Clean Google App Password by removing spaces/hyphens
const normalizeAppPassword = (pass) => {
  if (!pass) return '';
  return pass.toString().replace(/[\s-]/g, '').trim();
};

// Create Nodemailer Gmail Transporter
const createGmailTransporter = (user, pass) => {
  const cleanPass = normalizeAppPassword(pass);
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: (user || '').trim(),
      pass: cleanPass
    }
  });
};

// Asynchronously send Gmail notification to admin
const sendContactNotification = async ({ messageId, name, email, subject, message }) => {
  try {
    const settings = await db.getSettings();
    const gmailUser = settings.gmail_user;
    const appPassword = settings.gmail_app_password;
    const notifyEmail = settings.notify_email || gmailUser;
    const senderName = settings.sender_name || 'Keerthan Tunkoju Portfolio';
    const notificationsEnabled = settings.email_notifications_enabled !== '0';

    if (!gmailUser || !appPassword || !notificationsEnabled) {
      console.log('ℹ️ Email alert skipped: Google App Password not yet configured or alerts disabled.');
      return { skipped: true };
    }

    const transporter = createGmailTransporter(gmailUser, appPassword);

    const mailOptions = {
      from: `"${senderName}" <${gmailUser}>`,
      to: notifyEmail,
      replyTo: email,
      subject: `📬 [Portfolio Inquiry] From ${name}: "${subject || 'General Inquiry'}"`,
      text: `New contact inquiry received on your portfolio website:\n\nName: ${name}\nEmail: ${email}\nSubject: ${subject || 'General Inquiry'}\nTime: ${new Date().toLocaleString()}\n\nMessage:\n${message}\n\n--\nReply directly to this email to respond to ${name}.`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
          <div style="background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%); padding: 24px; color: #ffffff;">
            <h2 style="margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px;">📬 New Portfolio Inquiry</h2>
            <p style="margin: 6px 0 0; opacity: 0.9; font-size: 14px;">A recruiter or visitor has submitted a message via your portfolio contact form.</p>
          </div>
          <div style="padding: 24px;">
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin-bottom: 20px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 6px 0; color: #64748b; width: 80px; font-weight: 600;">Sender:</td>
                  <td style="padding: 6px 0; color: #0f172a; font-weight: 700;">${name}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Email:</td>
                  <td style="padding: 6px 0;"><a href="mailto:${email}" style="color: #0284c7; text-decoration: none; font-weight: 600;">${email}</a></td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Subject:</td>
                  <td style="padding: 6px 0; color: #0f172a;">${subject || 'General Inquiry'}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #64748b; font-weight: 600;">Received:</td>
                  <td style="padding: 6px 0; color: #64748b;">${new Date().toLocaleString()}</td>
                </tr>
              </table>
            </div>

            <div style="margin-bottom: 24px;">
              <h3 style="font-size: 13px; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 8px;">Message Content:</h3>
              <div style="background: #f1f5f9; border-left: 4px solid #0284c7; padding: 14px 18px; color: #1e293b; font-size: 15px; line-height: 1.6; white-space: pre-wrap; border-radius: 0 8px 8px 0;">${message}</div>
            </div>

            <div style="text-align: center; margin-top: 24px;">
              <a href="mailto:${email}?subject=Re: ${encodeURIComponent(subject || 'Portfolio Inquiry')}" style="display: inline-block; background: #0284c7; color: #ffffff; font-weight: 600; font-size: 14px; padding: 12px 24px; border-radius: 8px; text-decoration: none; box-shadow: 0 2px 4px rgba(2,132,199,0.2);">✉️ Reply to ${name}</a>
            </div>
          </div>
          <div style="background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 14px; text-align: center; font-size: 12px; color: #94a3b8;">
            Delivered automatically via your Portfolio CMS Central SQLite Database using your Google App Password.
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Contact notification email delivered via Gmail SMTP:', info.messageId);
    if (messageId) {
      await db.updateMessageEmailStatus(messageId, 1, null);
    }

    // Optional Auto-Reply to visitor
    if (settings.auto_reply_enabled === '1') {
      try {
        await transporter.sendMail({
          from: `"${senderName}" <${gmailUser}>`,
          to: email,
          subject: `Thank you for contacting Keerthan Tunkoju`,
          text: `Hi ${name},\n\nThank you for reaching out through my portfolio website! I have received your message regarding "${subject || 'your inquiry'}" and will get back to you shortly.\n\nBest regards,\nKeerthan Tunkoju`,
          html: `
            <div style="font-family: sans-serif; max-width: 540px; margin: 0 auto; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h3 style="color: #0f172a; margin-top: 0;">Thank You for Reaching Out!</h3>
              <p style="color: #334155; line-height: 1.6;">Hi <strong>${name}</strong>,</p>
              <p style="color: #334155; line-height: 1.6;">Thank you for contacting me through my personal portfolio. I have received your message regarding <em>"${subject || 'your inquiry'}"</em> and will review it promptly.</p>
              <p style="color: #334155; line-height: 1.6;">Have a wonderful day!</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
              <p style="color: #64748b; font-size: 13px; margin: 0;">
                <strong>Keerthan Tunkoju</strong><br>
                Computer Science &amp; Engineering | Full-Stack Developer<br>
                Hyderabad, India
              </p>
            </div>
          `
        });
        console.log('✅ Auto-reply sent to visitor:', email);
      } catch (autoErr) {
        console.warn('Auto-reply warning:', autoErr.message);
      }
    }

    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('❌ Failed to send Gmail notification:', err.message);
    if (messageId) {
      await db.updateMessageEmailStatus(messageId, 0, err.message);
    }
    return { success: false, error: err.message };
  }
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
  // 2. API: System Settings (Google App Password & Email Config)
  // Stored in SQLite database for all devices
  // ==========================================
  if (url.pathname === '/api/settings/email') {
    if (req.method === 'GET') {
      try {
        const settings = await db.getSettings();
        const hasPassword = !!(settings.gmail_app_password && settings.gmail_app_password.trim().length > 0);
        return sendJson(res, 200, {
          gmailUser: settings.gmail_user || '',
          notifyEmail: settings.notify_email || '',
          senderName: settings.sender_name || 'Keerthan Tunkoju Portfolio',
          emailNotificationsEnabled: settings.email_notifications_enabled !== '0',
          autoReplyEnabled: settings.auto_reply_enabled === '1',
          hasPassword: hasPassword,
          maskedPassword: hasPassword ? '••••••••••••••••' : ''
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

        // Only update password if a new non-masked password was entered
        if (appPassword && appPassword.trim().length > 0 && !appPassword.includes('••••')) {
          toSave.gmail_app_password = normalizeAppPassword(appPassword);
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

      const gmailUser = (body.gmailUser || settings.gmail_user || '').trim();
      let appPass = body.appPassword ? normalizeAppPassword(body.appPassword) : settings.gmail_app_password;
      if (appPass && appPass.includes('••••')) {
        appPass = settings.gmail_app_password;
      }
      const testRecipient = (body.testEmail || settings.notify_email || gmailUser || '').trim();

      if (!gmailUser || !appPass) {
        return sendJson(res, 400, {
          error: 'Please provide both your Gmail address and 16-character Google App Password.'
        });
      }

      const transporter = createGmailTransporter(gmailUser, appPass);
      // Verify connection
      await transporter.verify();

      // Send live test email
      const info = await transporter.sendMail({
        from: `"${settings.sender_name || 'Portfolio System'}" <${gmailUser}>`,
        to: testRecipient,
        subject: '🧪 Google App Password Connected — Portfolio Live Test',
        text: `Success! Your Google App Password is authenticated and active for ${gmailUser}. Visitor inquiries will now arrive in your inbox in real time.`,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; padding: 24px; border: 1px solid #10b981; border-radius: 12px; background: #ecfdf5;">
            <h3 style="color: #065f46; margin-top: 0; display: flex; align-items: center; gap: 8px;">
              <span>🎉</span> Google App Password Authenticated!
            </h3>
            <p style="color: #047857; font-size: 14px; line-height: 1.6;">
              Your Google App Password has been successfully verified for <strong>${gmailUser}</strong>.
            </p>
            <div style="background: #ffffff; padding: 14px 18px; border-radius: 8px; border: 1px solid #a7f3d0; font-size: 13px; color: #065f46; line-height: 1.7; margin: 16px 0;">
              <div><strong>Destination:</strong> ${testRecipient}</div>
              <div><strong>Status:</strong> Active on All Devices (Saved in SQLite)</div>
              <div><strong>Timestamp:</strong> ${new Date().toLocaleString()}</div>
            </div>
            <p style="color: #047857; font-size: 12px; margin: 0;">
              Whenever a recruiter or client submits an inquiry through your portfolio website, you will receive an instant email alert here!
            </p>
          </div>
        `
      });

      return sendJson(res, 200, {
        success: true,
        message: `Authentication successful! Live test email delivered to ${testRecipient}.`,
        messageId: info.messageId
      });
    } catch (err) {
      let friendlyError = err.message;
      if (friendlyError.includes('Invalid login') || friendlyError.includes('535-5.7.8')) {
        friendlyError = 'Invalid Google App Password or Username. Please ensure 2-Step Verification is active on your Google Account and you generated a 16-character App Password at myaccount.google.com/apppasswords.';
      }
      return sendJson(res, 400, {
        error: friendlyError,
        raw: err.message
      });
    }
  }

  // ==========================================
  // 3. API: Contact Messages (Central SQLite DB)
  // ==========================================
  if (url.pathname === '/api/contact' && req.method === 'POST') {
    try {
      const { name, email, subject, message } = await parseBody(req);
      if (!name || !email || !message) {
        return sendJson(res, 400, { error: 'Name, email, and message are required.' });
      }

      // Save to centralized SQLite database
      const saved = await db.saveMessage({ name, email, subject, message });

      // Asynchronously deliver notification email via Google App Password
      sendContactNotification({
        messageId: saved.messageId,
        name,
        email,
        subject,
        message
      }).catch(err => {
        console.error('Background email notification error:', err.message);
      });

      return sendJson(res, 201, {
        success: true,
        message: 'Inquiry saved to centralized database & queued for instant email alert',
        id: saved.messageId
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
      const gmailUser = settings.gmail_user;
      const appPass = settings.gmail_app_password;
      if (!gmailUser || !appPass) {
        return sendJson(res, 400, {
          error: 'Google App Password is not configured yet. Please configure it in the "Email & Google App Password" tab first.'
        });
      }

      const transporter = createGmailTransporter(gmailUser, appPass);
      const cleanSubject = (subject || 'Portfolio Inquiry').startsWith('Re:')
        ? (subject || 'Portfolio Inquiry')
        : `Re: ${subject || 'Portfolio Inquiry'}`;

      await transporter.sendMail({
        from: `"${settings.sender_name || 'Keerthan Tunkoju'}" <${gmailUser}>`,
        to: recipientEmail,
        subject: cleanSubject,
        text: replyText,
        html: `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; padding: 24px; line-height: 1.6; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px;">
            <div style="white-space: pre-wrap; font-size: 15px; margin-bottom: 24px;">${replyText}</div>
            <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0 16px;">
            <p style="font-size: 13px; color: #64748b; margin: 0; line-height: 1.5;">
              <strong>Keerthan Tunkoju</strong><br>
              <a href="mailto:${gmailUser}" style="color: #0284c7; text-decoration: none;">${gmailUser}</a>
            </p>
          </div>
        `
      });

      await db.recordMessageReply(id, replyText);
      return sendJson(res, 200, { success: true, message: 'Reply sent successfully via Gmail SMTP!' });
    } catch (err) {
      return sendJson(res, 500, { error: 'Failed to send reply: ' + err.message });
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
  console.log(`🔑 Admin Login: Password "Keerthan@2024"`);
  console.log(`==================================================================\n`);
});
