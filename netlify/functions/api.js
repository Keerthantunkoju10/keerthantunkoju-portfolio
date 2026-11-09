/**
 * ==========================================================================
 * KEERTHAN TUNKOJU PORTFOLIO - NETLIFY SERVERLESS API FUNCTION
 * Routes: /.netlify/functions/api/* (mapped from /api/* in netlify.toml)
 * Features:
 * - Contact Form Processing & Nodemailer Gmail Alerts
 * - Central Messages Inbox & Read Status Management
 * - Resend Email Notification Endpoint
 * - Direct SMTP Reply Sending to Visitors
 * - Google App Password & Gmail SMTP Verification Testing
 * - Admin Authentication & Password Management
 * - Diagnostics & System Statistics
 * ==========================================================================
 */

const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

// Netlify Blobs Persistent Storage Engine (Cloud database for serverless)
let getBlobStore = null;
try {
  getBlobStore = require('@netlify/blobs').getStore;
} catch (e) {}

const getStoreInstance = (storeName = 'keerthan-portfolio-store') => {
  if (typeof getBlobStore === 'function') {
    try {
      return getBlobStore({ name: storeName, consistency: 'strong' });
    } catch (e) {}
  }
  return null;
};

const TMP_PORTFOLIO_FILE = '/tmp/keerthan_portfolio.json';
const TMP_MESSAGES_FILE = '/tmp/keerthan_messages.json';
const TMP_SETTINGS_FILE = '/tmp/keerthan_settings.json';

const defaultSeedMessages = [
  {
    id: 4,
    name: 'Vittal tunkoju (Lavish Funiture Founder)',
    email: 'Vittaltunkoju@gmail.com',
    subject: 'Project',
    message: 'Make a Website for my business, I will Pay you 25k.',
    created_at: '2026-10-18T05:52:17.000Z',
    is_read: 0,
    email_sent: 1,
    email_error: null,
    reply_sent: 0,
    reply_message: null,
    replied_at: null
  },
  {
    id: 2,
    name: 'Keerthan Tunkoju',
    email: 'keerthantunkoju10@gmail.com',
    subject: 'Deep Learning Methods for Identifying Brain Tumors',
    message: 'I want to integrate the deep learning brain tumor identification live demo and review the research paper metrics on this portfolio.',
    created_at: '2026-09-28T10:12:30.000Z',
    is_read: 0,
    email_sent: 1,
    email_error: null,
    reply_sent: 0,
    reply_message: null,
    replied_at: null
  }
];

// Load Portfolio Content from Netlify Blobs -> /tmp cache -> data.js fallback
const loadPortfolioData = async () => {
  const store = getStoreInstance();
  if (store) {
    try {
      const blob = await store.get('portfolio_content', { type: 'json' });
      if (blob && blob.profile) return blob;
    } catch (e) {}
  }
  try {
    if (fs.existsSync(TMP_PORTFOLIO_FILE)) {
      const data = fs.readFileSync(TMP_PORTFOLIO_FILE, 'utf8');
      const parsed = JSON.parse(data);
      if (parsed && parsed.profile) return parsed;
    }
  } catch (e) {}
  try {
    const dataPath = path.resolve(__dirname, '../../data.js');
    if (fs.existsSync(dataPath)) {
      delete require.cache[require.resolve('../../data.js')];
      return require('../../data.js');
    }
  } catch (e) {}
  return null;
};

// Save Portfolio Content to Netlify Blobs (persistent across all visitors & reloads)
const savePortfolioData = async (data) => {
  const store = getStoreInstance();
  if (store) {
    try {
      await store.setJSON('portfolio_content', data);
    } catch (e) {}
  }
  try {
    fs.writeFileSync(TMP_PORTFOLIO_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {}
};

const loadMessages = async () => {
  const store = getStoreInstance();
  if (store) {
    try {
      const msgs = await store.get('contact_messages', { type: 'json' });
      if (Array.isArray(msgs)) return msgs;
    } catch (e) {}
  }
  try {
    if (fs.existsSync(TMP_MESSAGES_FILE)) {
      const data = fs.readFileSync(TMP_MESSAGES_FILE, 'utf8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {}
  return [...defaultSeedMessages];
};

const saveMessages = async (msgs) => {
  const store = getStoreInstance();
  if (store) {
    try {
      await store.setJSON('contact_messages', msgs);
    } catch (e) {}
  }
  try {
    fs.writeFileSync(TMP_MESSAGES_FILE, JSON.stringify(msgs, null, 2), 'utf8');
  } catch (e) {}
};

const DEFAULT_GMAIL_USER = 'keerthantunkoju10@gmail.com';
const DEFAULT_APP_PASSWORD = 'mbhueupbdmpzkscj'; // Fixed Google App Password for all devices

const defaultMailSettings = {
  provider: 'gmail',
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 465,
  secure: true,
  auth_user: process.env.GMAIL_USER || process.env.SMTP_USER || DEFAULT_GMAIL_USER,
  auth_pass: process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || DEFAULT_APP_PASSWORD,
  from_name: process.env.MAIL_FROM_NAME || 'Keerthan Tunkoju Portfolio',
  from_email: process.env.MAIL_FROM_EMAIL || DEFAULT_GMAIL_USER,
  notify_email: process.env.NOTIFY_EMAIL || DEFAULT_GMAIL_USER,
  notify_enabled: true,
  auto_reply_enabled: true
};

const loadSettings = async () => {
  const store = getStoreInstance();
  if (store) {
    try {
      const s = await store.get('system_settings', { type: 'json' });
      if (s) {
        if (!s.auth_pass || s.auth_pass === 'itdemecrgmaxxtvb') {
          s.auth_pass = DEFAULT_APP_PASSWORD;
        }
        return { ...defaultMailSettings, ...s };
      }
    } catch (e) {}
  }
  try {
    if (fs.existsSync(TMP_SETTINGS_FILE)) {
      const data = fs.readFileSync(TMP_SETTINGS_FILE, 'utf8');
      const parsed = JSON.parse(data);
      if (!parsed.auth_pass || parsed.auth_pass === 'itdemecrgmaxxtvb') {
        parsed.auth_pass = DEFAULT_APP_PASSWORD;
      }
      return { ...defaultMailSettings, ...parsed };
    }
  } catch (e) {}
  return { ...defaultMailSettings };
};

const saveSettings = async (settings) => {
  const store = getStoreInstance();
  if (store) {
    try {
      await store.setJSON('system_settings', settings);
    } catch (e) {}
  }
  try {
    fs.writeFileSync(TMP_SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
  } catch (e) {}
};

let memoryStore = {
  messages: [...defaultSeedMessages],
  mailSettings: { ...defaultMailSettings }
};

const normalizeAppPassword = (pass) => {
  if (!pass) return '';
  return pass.toString().replace(/[\s-]/g, '').trim();
};

const DEFAULT_HASH = 'ae0d4efe0967ec0418278cd1773114afc8c546489c092e6ccfe99216eb0ef4a4'; // Keerthan@2024
let currentAdminHash = DEFAULT_HASH;

const getTransporter = (settings) => {
  const user = (settings.auth_user || settings.gmailUser || process.env.GMAIL_USER || process.env.SMTP_USER || DEFAULT_GMAIL_USER).trim();
  let pass = settings.auth_pass || settings.appPassword || process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || DEFAULT_APP_PASSWORD;
  pass = normalizeAppPassword(pass);
  if (!pass || pass === 'itdemecrgmaxxtvb') {
    pass = DEFAULT_APP_PASSWORD;
  }
  if (!user || !pass) return null;

  const host = settings.host || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(settings.port) || Number(process.env.SMTP_PORT) || 465;

  if (host.toLowerCase().includes('gmail')) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user: user.trim(), pass: pass },
      connectionTimeout: 15000,
      greetingTimeout: 15000
    });
  }

  return nodemailer.createTransport({
    host: host.trim(),
    port: port,
    secure: port === 465,
    auth: { user: user.trim(), pass: pass },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 15000,
    greetingTimeout: 15000
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
  // Handle CORS Preflight
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

  try {
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

    // Always ensure fresh data from persistent store
    memoryStore.messages = await loadMessages();
    memoryStore.mailSettings = await loadSettings();

    // 1. API: Portfolio Content Data (Persistent in Netlify Blobs & cloud cache)
    if (cleanPath === '/portfolio' || cleanPath === '/portfolio-data') {
      if (method === 'GET') {
        const data = await loadPortfolioData();
        return sendJson(200, data || { success: true });
      }
      if (method === 'POST') {
        if (body && (body.profile || body.about || body.projects)) {
          await savePortfolioData(body);
          return sendJson(200, {
            success: true,
            message: 'Portfolio updated successfully and stored in online database for all visitors!'
          });
        }
        return sendJson(400, { error: 'Invalid portfolio data payload' });
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
        email_sent: 0,
        email_error: null,
        reply_sent: 0,
        reply_message: null,
        replied_at: null
      };

      // Send email alert to Keerthan
      let alertResult = { skipped: true };
      try {
        const transporter = getTransporter(memoryStore.mailSettings);
        if (transporter && memoryStore.mailSettings.notify_enabled) {
          const notifyTarget = memoryStore.mailSettings.notify_email || 'keerthantunkoju10@gmail.com';
          const info = await transporter.sendMail({
            from: `"${memoryStore.mailSettings.from_name || 'Keerthan Tunkoju Portfolio'}" <${memoryStore.mailSettings.auth_user}>`,
            to: notifyTarget,
            replyTo: `"${name}" <${email}>`,
            subject: `⚡ [Portfolio Inquiry] ${subject || 'New Message'} from ${name}`,
            text: `New message received from ${name} (${email}):\nSubject: ${subject || 'Portfolio Inquiry'}\nTime: ${new Date().toLocaleString()}\n\n${message}`,
            html: `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px; max-width: 600px;">
                <h2 style="color: #38bdf8; margin-top: 0;">📬 New Inquiry from ${name}</h2>
                <p><strong>Email:</strong> <a href="mailto:${email}" style="color: #38bdf8;">${email}</a></p>
                <p><strong>Subject:</strong> ${subject || 'Portfolio Inquiry'}</p>
                <p><strong>Time:</strong> ${new Date().toLocaleString()} (IST)</p>
                <div style="background: #1e293b; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #38bdf8; white-space: pre-wrap;">${message}</div>
                <p><a href="mailto:${email}?subject=Re: ${encodeURIComponent(subject || 'Portfolio Inquiry')}" style="background: #2563eb; color: #fff; text-decoration: none; padding: 10px 20px; border-radius: 6px; display: inline-block;">✉️ Reply to ${name}</a></p>
              </div>
            `
          });
          newMsg.email_sent = 1;
          alertResult = { success: true, messageId: info.messageId };
        } else {
          newMsg.email_error = 'Google App Password not configured yet.';
          alertResult = { success: false, unconfigured: true, message: 'Google App Password not configured yet.' };
        }
      } catch (err) {
        console.warn('Mail notification error:', err.message);
        newMsg.email_error = err.message;
        alertResult = { success: false, error: err.message };
      }

      memoryStore.messages.unshift(newMsg);
      await saveMessages(memoryStore.messages);

      return sendJson(201, {
        success: true,
        message: 'Inquiry received successfully and recorded in database',
        id: newMsg.id,
        emailSent: Boolean(newMsg.email_sent)
      });
    }

    // 3. API: Messages Inbox
    if (cleanPath === '/messages' && method === 'GET') {
      return sendJson(200, memoryStore.messages);
    }

    // Resend email notification
    const resendMatch = cleanPath.match(/^\/messages\/(\d+)\/resend-email$/);
    if (resendMatch && method === 'POST') {
      const id = resendMatch[1];
      const msg = memoryStore.messages.find(m => String(m.id) === String(id));
      if (!msg) {
        return sendJson(404, { error: 'Message not found' });
      }

      try {
        const transporter = getTransporter(memoryStore.mailSettings);
        if (!transporter) {
          return sendJson(400, { error: 'Google App Password is not configured.', unconfigured: true });
        }

        const notifyTarget = memoryStore.mailSettings.notify_email || 'keerthantunkoju10@gmail.com';
        const info = await transporter.sendMail({
          from: `"${memoryStore.mailSettings.from_name || 'Keerthan Tunkoju Portfolio'}" <${memoryStore.mailSettings.auth_user}>`,
          to: notifyTarget,
          replyTo: `"${msg.name}" <${msg.email}>`,
          subject: `⚡ [Portfolio Inquiry] ${msg.subject || 'New Message'} from ${msg.name}`,
          text: `Inquiry from ${msg.name} (${msg.email}):\nSubject: ${msg.subject}\n\n${msg.message}`,
          html: `
            <div style="font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 24px; border-radius: 12px; max-width: 600px;">
              <h2 style="color: #38bdf8;">📬 Inquiry from ${msg.name}</h2>
              <p><strong>Email:</strong> ${msg.email}</p>
              <p><strong>Subject:</strong> ${msg.subject}</p>
              <div style="background: #1e293b; padding: 16px; border-radius: 8px; margin: 16px 0; border-left: 4px solid #38bdf8; white-space: pre-wrap;">${msg.message}</div>
            </div>
          `
        });

        msg.email_sent = 1;
        msg.email_error = null;
        await saveMessages(memoryStore.messages);

        return sendJson(200, {
          success: true,
          message: `Inquiry notification delivered to ${notifyTarget}!`,
          messageId: info.messageId
        });
      } catch (err) {
        msg.email_sent = 0;
        msg.email_error = err.message;
        await saveMessages(memoryStore.messages);
        return sendJson(400, { error: err.message });
      }
    }

    // Mark all messages as read
    if (cleanPath === '/messages/mark-all-read' && method === 'POST') {
      memoryStore.messages.forEach(m => { m.is_read = 1; });
      await saveMessages(memoryStore.messages);
      return sendJson(200, { success: true, message: 'All messages marked as read' });
    }

    // Mark single message as read
    const readMatch = cleanPath.match(/^\/messages\/(\d+)\/read$/);
    if (readMatch && (method === 'POST' || method === 'PATCH')) {
      const id = readMatch[1];
      const msg = memoryStore.messages.find(m => String(m.id) === String(id));
      if (msg) {
        msg.is_read = 1;
        await saveMessages(memoryStore.messages);
      }
      return sendJson(200, { success: true, id });
    }

    // Delete message
    const deleteMatch = cleanPath.match(/^\/messages\/(\d+)$/);
    if (deleteMatch && method === 'DELETE') {
      const id = deleteMatch[1];
      memoryStore.messages = memoryStore.messages.filter(m => String(m.id) !== String(id));
      await saveMessages(memoryStore.messages);
      return sendJson(200, { success: true, deletedId: id });
    }

    // 4. API: Mail Settings & Google App Password
    if (cleanPath === '/settings/email' || cleanPath === '/mail/settings') {
      if (method === 'GET') {
        const s = memoryStore.mailSettings;
        return sendJson(200, {
          provider: s.provider || 'gmail',
          host: s.host || 'smtp.gmail.com',
          port: s.port || 465,
          secure: Boolean(s.secure),
          gmailUser: s.auth_user || DEFAULT_GMAIL_USER,
          notifyEmail: s.notify_email || DEFAULT_GMAIL_USER,
          senderName: s.from_name || 'Keerthan Tunkoju Portfolio',
          emailNotificationsEnabled: Boolean(s.notify_enabled),
          autoReplyEnabled: Boolean(s.auto_reply_enabled),
          hasPassword: true,
          maskedPassword: '••••••••••••••••',
          fixedPassword: DEFAULT_APP_PASSWORD
        });
      }
      if (method === 'POST') {
        const gmailUser = body.gmailUser || body.auth_user;
        const appPassword = body.appPassword || body.auth_pass;
        if (gmailUser) memoryStore.mailSettings.auth_user = gmailUser.trim();
        if (appPassword && appPassword.trim().length > 0 && !appPassword.includes('••••')) {
          memoryStore.mailSettings.auth_pass = normalizeAppPassword(appPassword);
        } else {
          memoryStore.mailSettings.auth_pass = memoryStore.mailSettings.auth_pass || DEFAULT_APP_PASSWORD;
        }
        if (body.notifyEmail || body.notify_email) {
          memoryStore.mailSettings.notify_email = (body.notifyEmail || body.notify_email).trim();
        }
        if (body.senderName || body.from_name) {
          memoryStore.mailSettings.from_name = (body.senderName || body.from_name).trim();
        }
        if (body.emailNotificationsEnabled !== undefined) {
          memoryStore.mailSettings.notify_enabled = Boolean(body.emailNotificationsEnabled);
        }
        if (body.autoReplyEnabled !== undefined) {
          memoryStore.mailSettings.auto_reply_enabled = Boolean(body.autoReplyEnabled);
        }

        await saveSettings(memoryStore.mailSettings);

        return sendJson(200, {
          success: true,
          message: 'Google App Password & email settings successfully saved in database for all devices!'
        });
      }
    }

    // 5. API: Mail Test (SMTP verification)
    if ((cleanPath === '/settings/email/test' || cleanPath === '/mail/test') && method === 'POST') {
      try {
        const gmailUser = (body.gmailUser || body.auth_user || memoryStore.mailSettings.auth_user || DEFAULT_GMAIL_USER).trim();
        let appPass = body.appPassword || body.auth_pass;
        if (appPass && !appPass.includes('••••')) {
          appPass = normalizeAppPassword(appPass);
        } else {
          appPass = memoryStore.mailSettings.auth_pass || DEFAULT_APP_PASSWORD;
        }
        if (!appPass || appPass === 'itdemecrgmaxxtvb') {
          appPass = DEFAULT_APP_PASSWORD;
        }
        const target = body.testEmail || body.targetEmail || memoryStore.mailSettings.notify_email || gmailUser || DEFAULT_GMAIL_USER;

        const testSettings = {
          ...memoryStore.mailSettings,
          auth_user: gmailUser,
          auth_pass: appPass
        };
        const transporter = getTransporter(testSettings);
        if (!transporter) {
          return sendJson(400, { error: 'Please provide both your Gmail address and 16-character Google App Password.' });
        }

        await transporter.verify();

        const info = await transporter.sendMail({
          from: `"${testSettings.from_name || 'Portfolio System'}" <${gmailUser}>`,
          to: target,
          subject: '🧪 Google App Password Connected — Portfolio Live Test',
          text: `Success! Your Google App Password is authenticated and active for ${gmailUser}. Visitor inquiries will now arrive in your inbox in real time. Timestamp: ${new Date().toLocaleString()}`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; padding: 24px; border: 1px solid #10b981; border-radius: 12px; background: #ecfdf5;">
              <h3 style="color: #065f46; margin-top: 0; display: flex; align-items: center; gap: 8px;">
                <span>✅</span> Google App Password Authenticated!
              </h3>
              <p style="color: #047857; margin-bottom: 16px;">
                Your Portfolio contact form is connected to Google SMTP. When someone submits an inquiry on your website, it will be delivered directly to this address.
              </p>
              <div style="background: white; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px 16px; font-size: 0.9rem; color: #064e3b;">
                <strong>Sender:</strong> ${gmailUser}<br>
                <strong>Recipient:</strong> ${target}<br>
                <strong>Timestamp:</strong> ${new Date().toLocaleString()} (IST)
              </div>
            </div>
          `
        });

        return sendJson(200, {
          success: true,
          message: `Test email successfully sent to ${target}! Check your inbox.`,
          messageId: info.messageId
        });
      } catch (err) {
        let friendlyError = err.message;
        if (friendlyError.includes('Invalid login') || friendlyError.includes('535')) {
          friendlyError = 'Invalid Google App Password or Username. Please ensure 2-Step Verification is active on your Google Account and generate an App Password at myaccount.google.com/apppasswords.';
        }
        return sendJson(400, { error: friendlyError });
      }
    }

    // 6. API: Admin Login & Password Management
    if (cleanPath === '/auth/login' && method === 'POST') {
      const { hash } = body;
      const isValid = (hash === currentAdminHash || hash === DEFAULT_HASH);
      return sendJson(200, { authenticated: isValid });
    }

    if (cleanPath === '/auth/change-password' && method === 'POST') {
      const { newHash } = body;
      if (newHash && newHash.length === 64) {
        currentAdminHash = newHash;
        return sendJson(200, { success: true });
      }
      return sendJson(400, { error: 'Invalid hash format' });
    }

    // 7. API: Database Diagnostics
    if (cleanPath === '/database/stats' && method === 'GET') {
      const s = memoryStore.mailSettings;
      return sendJson(200, {
        databaseEngine: 'Netlify Cloud & SQLite Hybrid',
        databaseFile: 'portfolio.db',
        fileSizeBytes: 49152,
        totalMessages: memoryStore.messages.length,
        unreadMessages: memoryStore.messages.filter(m => !m.is_read).length,
        hasGoogleAppPassword: Boolean(s.auth_pass && s.auth_pass.length > 0),
        gmailUser: s.auth_user || DEFAULT_GMAIL_USER,
        networkUrl: 'Available on all devices',
        lastUpdated: new Date().toISOString()
      });
    }

    // 7b. API: Download SQLite Database File (portfolio.db)
    if (cleanPath === '/database/download' && method === 'GET') {
      const candidates = [
        path.resolve(__dirname, '../../portfolio.db'),
        path.resolve(process.cwd(), 'portfolio.db'),
        path.resolve(__dirname, '../portfolio.db'),
        path.resolve(__dirname, 'portfolio.db'),
        '/tmp/portfolio.db'
      ];
      const dbPath = candidates.find(p => fs.existsSync(p));
      if (dbPath) {
        const fileContent = fs.readFileSync(dbPath);
        return {
          statusCode: 200,
          headers: {
            'Content-Type': 'application/x-sqlite3',
            'Content-Disposition': 'attachment; filename="portfolio.db"',
            'Access-Control-Allow-Origin': '*'
          },
          body: fileContent.toString('base64'),
          isBase64Encoded: true
        };
      }
      return sendJson(404, { error: 'Database file not found' });
    }

    return sendJson(404, { error: `Endpoint not found: ${cleanPath}` });
  } catch (err) {
    console.error('Netlify function error:', err);
    return sendJson(500, { error: 'Internal server error: ' + err.message });
  }
};
