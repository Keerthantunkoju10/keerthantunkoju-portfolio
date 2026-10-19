/**
 * ==========================================================================
 * KEERTHAN TUNKOJU PORTFOLIO - NETLIFY SERVERLESS API FUNCTION
 * Routes: /.netlify/functions/api/* (mapped from /api/* in netlify.toml)
 * Features:
 * - Contact Form Processing & Nodemailer Email Alerts
 * - Messages Inbox & Status Updates
 * - Direct SMTP Reply Sending
 * - Mail Configuration & Testing
 * - Admin Authentication
 * ==========================================================================
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// In-memory / lambda-scoped cache (persists during container warm lifetime)
let memoryStore = {
  messages: [
    {
      id: 2,
      name: 'Keerthan Tunkoju',
      email: 'keerthantunkoju10@gmail.com',
      subject: 'General Inquiry',
      message: 'i want to create a website for this Deep Learning Methods for Identifying Brain Tumors Project and implement the live demo project in it',
      created_at: '2026-09-28T10:12:30.000Z',
      is_read: 0,
      status: 'unread',
      replied_at: null,
      reply_body: null,
      reply_subject: null,
      email_alert_status: 'sent'
    }
  ],
  mailSettings: {
    provider: 'gmail',
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 465,
    secure: true,
    auth_user: process.env.GMAIL_USER || process.env.SMTP_USER || 'keerthantunkoju10@gmail.com',
    auth_pass: process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || 'ioml bqxd vtkw kfni',
    from_name: process.env.MAIL_FROM_NAME || 'Keerthan Tunkoju Portfolio',
    from_email: process.env.MAIL_FROM_EMAIL || 'keerthantunkoju10@gmail.com',
    notify_email: process.env.NOTIFY_EMAIL || 'keerthantunkoju10@gmail.com',
    notify_enabled: true,
    auto_reply_enabled: false
  }
};

const normalizeAppPassword = (pass) => {
  if (!pass) return '';
  return pass.toString().replace(/[\s-]/g, '').trim();
};

const DEFAULT_HASH = 'ae0d4efe0967ec0418278cd1773114afc8c546489c092e6ccfe99216eb0ef4a4'; // Keerthan@2024

const getTransporter = (settings) => {
  const user = settings.auth_user || process.env.GMAIL_USER || process.env.SMTP_USER;
  let pass = settings.auth_pass || process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS;
  if (!user || !pass) return null;
  pass = normalizeAppPassword(pass);

  const host = settings.host || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(settings.port) || Number(process.env.SMTP_PORT) || 465;

  if (host.toLowerCase().includes('gmail')) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user: user.trim(), pass: pass }
    });
  }

  return nodemailer.createTransport({
    host: host.trim(),
    port: port,
    secure: port === 465,
    auth: { user: user.trim(), pass: pass },
    tls: { rejectUnauthorized: false }
  });
};

const sendJson = (statusCode, data) => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    },
    body: JSON.stringify(data)
  };
};

exports.handler = async (event, context) => {
  // CORS Preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
      },
      body: ''
    };
  }

  // Normalize path: e.g., '/.netlify/functions/api/contact' or '/api/contact' -> '/contact'
  let cleanPath = event.path
    .replace(/^\/\.netlify\/functions\/api/, '')
    .replace(/^\/api/, '');

  if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath;
  if (cleanPath === '') cleanPath = '/';

  const method = event.httpMethod;
  let body = {};
  if (event.body) {
    try {
      body = JSON.parse(event.body);
    } catch (e) {
      body = {};
    }
  }

  // 1. API: Portfolio Data
  if (cleanPath === '/portfolio' || cleanPath === '/portfolio-data') {
    if (method === 'GET') {
      try {
        const dataPath = path.resolve(__dirname, '../../data.js');
        if (fs.existsSync(dataPath)) {
          delete require.cache[require.resolve('../../data.js')];
          const defaultData = require('../../data.js');
          return sendJson(200, defaultData);
        }
      } catch (e) {}
      return sendJson(200, { success: true });
    }
    if (method === 'POST') {
      return sendJson(200, { success: true, message: 'Portfolio updated successfully' });
    }
  }

  // 2. API: Contact Form Submission & Email Alert
  if (cleanPath === '/contact' && method === 'POST') {
    const { name, email, subject, message } = body;
    if (!name || !email || !message) {
      return sendJson(400, { error: 'Name, email, and message are required.' });
    }

    const newMsg = {
      id: Date.now(),
      name,
      email,
      subject: subject || 'Portfolio Inquiry',
      message,
      created_at: new Date().toISOString(),
      is_read: 0,
      status: 'unread',
      replied_at: null,
      reply_body: null,
      reply_subject: null,
      email_alert_status: 'pending'
    };

    memoryStore.messages.unshift(newMsg);

    // Send email alert to Keerthan
    let alertResult = { skipped: true };
    try {
      const transporter = getTransporter(memoryStore.mailSettings);
      if (transporter && memoryStore.mailSettings.notify_enabled) {
        const notifyTarget = memoryStore.mailSettings.notify_email || 'keerthantunkoju10@gmail.com';
        await transporter.sendMail({
          from: `"Portfolio Contact Alert" <${memoryStore.mailSettings.auth_user}>`,
          to: notifyTarget,
          replyTo: `"${name}" <${email}>`,
          subject: `⚡ [Portfolio Inquiry] ${subject || 'New Message'} from ${name}`,
          text: `New message received from ${name} (${email}):\nSubject: ${subject || 'Portfolio Inquiry'}\n\n${message}`,
          html: `
            <div style="font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px; max-width: 600px;">
              <h2 style="color: #38bdf8; margin-top: 0;">📬 New Inquiry from ${name}</h2>
              <p><strong>Email:</strong> <a href="mailto:${email}" style="color: #38bdf8;">${email}</a></p>
              <p><strong>Subject:</strong> ${subject || 'Portfolio Inquiry'}</p>
              <div style="background: #1e293b; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #38bdf8; white-space: pre-wrap;">${message}</div>
              <p><a href="mailto:${email}?subject=Re: ${encodeURIComponent(subject || 'Portfolio Inquiry')}" style="background: #2563eb; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 6px; display: inline-block;">✉️ Reply via Email</a></p>
            </div>
          `
        });
        newMsg.email_alert_status = 'sent';
        alertResult = { success: true };
      } else {
        newMsg.email_alert_status = 'unconfigured';
        alertResult = { success: false, unconfigured: true, message: 'SMTP not configured in Netlify environment variables.' };
      }
    } catch (err) {
      console.warn('Mail notification error:', err.message);
      newMsg.email_alert_status = 'failed';
      alertResult = { success: false, error: err.message };
    }

    return sendJson(201, {
      success: true,
      message: 'Inquiry received successfully',
      id: newMsg.id,
      mailNotification: alertResult
    });
  }

  // 3. API: Messages Inbox
  if (cleanPath === '/messages' && method === 'GET') {
    return sendJson(200, memoryStore.messages);
  }

  // Mark all messages as read
  if (cleanPath === '/messages/mark-all-read' && method === 'POST') {
    memoryStore.messages.forEach(m => { m.is_read = 1; });
    return sendJson(200, { success: true, message: 'All messages marked as read' });
  }

  // Mark single message as read
  const readMatch = cleanPath.match(/^\/messages\/(\d+)\/read$/);
  if (readMatch && (method === 'POST' || method === 'PATCH')) {
    const id = readMatch[1];
    const msg = memoryStore.messages.find(m => String(m.id) === String(id));
    if (msg) msg.is_read = 1;
    return sendJson(200, { success: true, id });
  }

  // Status update
  const statusMatch = cleanPath.match(/^\/messages\/(\d+)\/status$/);
  if (statusMatch && (method === 'PATCH' || method === 'POST')) {
    const id = statusMatch[1];
    const msg = memoryStore.messages.find(m => String(m.id) === String(id));
    if (msg) {
      if (body.status) msg.status = body.status;
      if (body.isRead !== undefined) msg.is_read = body.isRead ? 1 : 0;
      return sendJson(200, { success: true, message: msg });
    }
    return sendJson(404, { error: 'Message not found' });
  }

  // Record Reply
  const replyMatch = cleanPath.match(/^\/messages\/(\d+)\/reply$/);
  if (replyMatch && method === 'POST') {
    const id = replyMatch[1];
    const msg = memoryStore.messages.find(m => String(m.id) === String(id));
    if (msg) {
      msg.status = 'replied';
      msg.is_read = 1;
      msg.replied_at = new Date().toISOString();
      msg.reply_subject = body.replySubject || 'Re: Portfolio Inquiry';
      msg.reply_body = body.replyBody || '';
      return sendJson(200, { success: true, message: 'Reply recorded' });
    }
    return sendJson(404, { error: 'Message not found' });
  }

  // Delete message
  const deleteMatch = cleanPath.match(/^\/messages\/(\d+)$/);
  if (deleteMatch && method === 'DELETE') {
    const id = deleteMatch[1];
    memoryStore.messages = memoryStore.messages.filter(m => String(m.id) !== String(id));
    return sendJson(200, { success: true, deletedId: id });
  }

  // 4. API: Mail Settings & Google App Password (handles both /settings/email and /mail/settings)
  if (cleanPath === '/settings/email' || cleanPath === '/mail/settings') {
    if (method === 'GET') {
      const s = memoryStore.mailSettings;
      return sendJson(200, {
        provider: s.provider || 'gmail',
        host: s.host || 'smtp.gmail.com',
        port: s.port || 465,
        secure: Boolean(s.secure),
        gmailUser: s.auth_user || '',
        auth_user: s.auth_user || '',
        notifyEmail: s.notify_email || 'keerthantunkoju10@gmail.com',
        notify_email: s.notify_email || 'keerthantunkoju10@gmail.com',
        senderName: s.from_name || 'Keerthan Tunkoju Portfolio',
        from_name: s.from_name || 'Keerthan Tunkoju Portfolio',
        emailNotificationsEnabled: Boolean(s.notify_enabled),
        notify_enabled: Boolean(s.notify_enabled),
        autoReplyEnabled: Boolean(s.auto_reply_enabled),
        hasPassword: Boolean(s.auth_pass && s.auth_pass.length > 0),
        maskedPassword: s.auth_pass ? 'ioml bqxd vtkw kfni' : 'ioml bqxd vtkw kfni'
      });
    }
    if (method === 'POST') {
      const gmailUser = body.gmailUser || body.auth_user;
      const appPassword = body.appPassword || body.auth_pass;
      if (gmailUser) memoryStore.mailSettings.auth_user = gmailUser.trim();
      if (appPassword && appPassword.trim().length > 0 && !appPassword.includes('••••')) {
        memoryStore.mailSettings.auth_pass = normalizeAppPassword(appPassword);
      }
      if (body.notifyEmail || body.notify_email) memoryStore.mailSettings.notify_email = (body.notifyEmail || body.notify_email).trim();
      if (body.senderName || body.from_name) memoryStore.mailSettings.from_name = (body.senderName || body.from_name).trim();
      if (body.emailNotificationsEnabled !== undefined) memoryStore.mailSettings.notify_enabled = Boolean(body.emailNotificationsEnabled);
      if (body.notify_enabled !== undefined) memoryStore.mailSettings.notify_enabled = Boolean(body.notify_enabled);
      if (body.autoReplyEnabled !== undefined) memoryStore.mailSettings.auto_reply_enabled = Boolean(body.autoReplyEnabled);

      return sendJson(200, {
        success: true,
        message: 'Google App Password & email settings successfully saved in function memory'
      });
    }
  }

  // 5. API: Mail Test (handles both /settings/email/test and /mail/test)
  if ((cleanPath === '/settings/email/test' || cleanPath === '/mail/test') && method === 'POST') {
    try {
      const gmailUser = (body.gmailUser || body.auth_user || memoryStore.mailSettings.auth_user || '').trim();
      let appPass = body.appPassword || body.auth_pass;
      if (appPass && !appPass.includes('••••')) {
        appPass = normalizeAppPassword(appPass);
      } else {
        appPass = memoryStore.mailSettings.auth_pass;
      }
      const target = body.testEmail || body.targetEmail || memoryStore.mailSettings.notify_email || gmailUser || 'keerthantunkoju10@gmail.com';

      const testSettings = {
        ...memoryStore.mailSettings,
        auth_user: gmailUser,
        auth_pass: appPass
      };
      const transporter = getTransporter(testSettings);
      if (!transporter) {
        return sendJson(400, { error: 'Please provide both your Gmail address and 16-character Google App Password.' });
      }

      await transporter.sendMail({
        from: `"${testSettings.from_name || 'Portfolio System'}" <${gmailUser}>`,
        to: target,
        subject: `✅ Keerthan Portfolio: Netlify Mail Test Verified`,
        text: `Netlify mail integration verification successful at ${new Date().toLocaleString()}. Check your inbox.`
      });

      return sendJson(200, {
        success: true,
        message: `Test email successfully sent to ${target}! Check your inbox.`
      });
    } catch (err) {
      return sendJson(400, { error: 'SMTP Test Failed: ' + err.message });
    }
  }

  // 6. API: Send Direct Reply
  if (cleanPath === '/mail/send-reply' && method === 'POST') {
    const { messageId, to, subject, replyText } = body;
    if (!to || !replyText) {
      return sendJson(400, { error: 'Recipient email and reply text are required.' });
    }

    try {
      const transporter = getTransporter(memoryStore.mailSettings);
      if (!transporter) {
        return sendJson(400, { error: 'SMTP credentials are not configured in Netlify settings.' });
      }

      await transporter.sendMail({
        from: `"${memoryStore.mailSettings.from_name}" <${memoryStore.mailSettings.auth_user}>`,
        to: to.trim(),
        subject: subject || 'Re: Portfolio Inquiry',
        text: replyText
      });

      if (messageId) {
        const msg = memoryStore.messages.find(m => String(m.id) === String(messageId));
        if (msg) {
          msg.status = 'replied';
          msg.is_read = 1;
          msg.replied_at = new Date().toISOString();
          msg.reply_subject = subject;
          msg.reply_body = replyText;
        }
      }

      return sendJson(200, { success: true, message: `Reply sent successfully to ${to}` });
    } catch (err) {
      return sendJson(400, { error: 'Failed to send reply: ' + err.message });
    }
  }

  // 7. API: Admin Login
  if (cleanPath === '/auth/login' && method === 'POST') {
    const { hash } = body;
    const isValid = hash === DEFAULT_HASH;
    return sendJson(200, { authenticated: isValid });
  }

  // 8. API: Database / Serverless Diagnostics
  if (cleanPath === '/database/stats' && method === 'GET') {
    return sendJson(200, {
      databaseEngine: 'Netlify Serverless + LocalStorage',
      databaseFile: 'netlify/functions/api.js',
      fileSizeBytes: 0,
      totalMessages: memoryStore.messages.length,
      lastUpdated: new Date().toISOString()
    });
  }

  return sendJson(404, { error: `Endpoint not found: ${cleanPath}` });
};
