/**
 * ==========================================================================
 * KEERTHAN TUNKOJU PORTFOLIO - EMAIL SERVICE & MAILER MODULE
 * Powered by Nodemailer with dual Gmail App Password & custom SMTP support.
 * Features:
 * - Robust settings normalization (accepts both auth_user/auth_pass and gmail_user/gmail_app_password)
 * - Automatic App Password whitespace stripping (handles 'abcd efgh ijkl mnop')
 * - Instant branded HTML email notifications for new contact inquiries
 * - Automatic confirmation / receipt emails to visitors (optional)
 * - Direct email reply dispatching from the CMS Dashboard
 * - SMTP connection verification testing with user-friendly diagnostics
 * ==========================================================================
 */

const nodemailer = require('nodemailer');

class PortfolioMailer {
  /**
   * Normalize configuration settings from SQLite db, Netlify environment, or CMS inputs
   */
  normalizeSettings(settings = {}) {
    const rawUser = settings.auth_user || settings.gmail_user || settings.user || process.env.GMAIL_USER || process.env.SMTP_USER || '';
    const user = String(rawUser).trim();

    const rawPass = settings.auth_pass || settings.gmail_app_password || settings.pass || process.env.GMAIL_APP_PASSWORD || process.env.SMTP_PASS || '';
    // Strip all internal whitespace and hyphens from Google App Password
    const pass = String(rawPass).replace(/[\s-]/g, '').trim();

    const host = String(settings.host || settings.smtp_host || process.env.SMTP_HOST || 'smtp.gmail.com').trim();
    const port = Number(settings.port || settings.smtp_port || process.env.SMTP_PORT) || 465;
    const isSecure = settings.secure !== undefined ? Boolean(settings.secure) : (port === 465);

    const fromName = String(settings.from_name || settings.sender_name || 'Keerthan Tunkoju Portfolio').trim();
    const fromEmail = String(settings.from_email || user || 'keerthantunkoju10@gmail.com').trim();
    const notifyEmail = String(settings.notify_email || user || 'keerthantunkoju10@gmail.com').trim();

    const notifyEnabled = settings.notify_enabled !== false &&
      settings.notify_enabled !== 0 &&
      settings.notify_enabled !== '0' &&
      settings.email_notifications_enabled !== '0' &&
      settings.email_notifications_enabled !== 0 &&
      settings.email_notifications_enabled !== false;

    const autoReplyEnabled = settings.auto_reply_enabled === '1' ||
      settings.auto_reply_enabled === 1 ||
      settings.auto_reply_enabled === true;

    return {
      user,
      pass,
      host,
      port,
      secure: isSecure,
      fromName,
      fromEmail,
      notifyEmail,
      notifyEnabled,
      autoReplyEnabled,
      hasCredentials: Boolean(user && pass)
    };
  }

  /**
   * Create a configured Nodemailer transporter
   */
  getTransporter(rawSettings) {
    const s = this.normalizeSettings(rawSettings);

    if (!s.hasCredentials) {
      return null;
    }

    // Gmail optimized transporter
    if (s.host.toLowerCase().includes('gmail')) {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: s.user,
          pass: s.pass
        },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000
      });
    }

    // Custom SMTP transporter
    return nodemailer.createTransport({
      host: s.host,
      port: s.port,
      secure: s.secure,
      auth: {
        user: s.user,
        pass: s.pass
      },
      tls: {
        rejectUnauthorized: false
      },
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000
    });
  }

  /**
   * Generate branded HTML email wrapper
   */
  wrapEmailHtml(content, previewText = '') {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Keerthan Tunkoju Portfolio</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0b1120;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #e2e8f0;
      line-height: 1.6;
    }
    .wrapper {
      max-width: 620px;
      margin: 24px auto;
      background: #111827;
      border: 1px solid #1f293d;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5);
    }
    .header {
      background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 50%, #4f46e5 100%);
      padding: 28px 32px;
      text-align: left;
    }
    .brand-title {
      color: #ffffff;
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin: 0;
    }
    .brand-subtitle {
      color: #e0f2fe;
      font-size: 13px;
      font-weight: 500;
      margin: 6px 0 0 0;
      letter-spacing: 0.2px;
    }
    .content {
      padding: 32px;
    }
    .msg-box {
      background: #1e293b;
      border-left: 4px solid #38bdf8;
      border-radius: 8px;
      padding: 18px 22px;
      margin: 20px 0;
      color: #f1f5f9;
      font-size: 14px;
      line-height: 1.7;
      white-space: pre-wrap;
    }
    .meta-table {
      width: 100%;
      border-collapse: collapse;
      margin: 18px 0;
    }
    .meta-table td {
      padding: 8px 12px;
      border-bottom: 1px solid #1e293b;
      font-size: 13px;
    }
    .meta-label {
      color: #94a3b8;
      width: 110px;
      font-weight: 600;
      text-transform: uppercase;
      font-size: 11px;
      letter-spacing: 0.5px;
    }
    .meta-val {
      color: #f8fafc;
      font-weight: 500;
    }
    .cta-btn {
      display: inline-block;
      background: #2563eb;
      color: #ffffff !important;
      text-decoration: none;
      padding: 12px 24px;
      border-radius: 8px;
      font-weight: 600;
      font-size: 14px;
      margin-top: 18px;
      box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
    }
    .footer {
      background: #0b1120;
      padding: 20px 32px;
      text-align: center;
      border-top: 1px solid #1e293b;
      font-size: 12px;
      color: #64748b;
    }
    .footer a {
      color: #38bdf8;
      text-decoration: none;
      margin: 0 8px;
    }
  </style>
</head>
<body>
  ${previewText ? `<span style="display:none; font-size:0px; line-height:0px; max-height:0px; opacity:0; overflow:hidden;">${previewText}</span>` : ''}
  <div class="wrapper">
    <div class="header">
      <h1 class="brand-title">Keerthan Tunkoju</h1>
      <p class="brand-subtitle">Software Developer &bull; AI &amp; ML Graduate &bull; Full-Stack Engineer</p>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p style="margin: 0 0 8px 0;">Portfolio Central Database &bull; Automated Inquiry &amp; Mail Dispatch System</p>
      <p style="margin: 0;">
        <a href="https://linkedin.com/in/keerthan-tunkoju-a24604258" target="_blank">LinkedIn</a> &bull;
        <a href="https://github.com/Keerthantunkoju10" target="_blank">GitHub</a> &bull;
        <a href="mailto:keerthantunkoju10@gmail.com">keerthantunkoju10@gmail.com</a>
      </p>
    </div>
  </div>
</body>
</html>
    `;
  }

  /**
   * Dispatch an instant email alert to Keerthan when a visitor submits an inquiry
   */
  async sendContactNotification(inquiry, rawSettings) {
    const s = this.normalizeSettings(rawSettings);

    if (!s.notifyEnabled) {
      console.log('ℹ️ [MAIL ALERT] Notifications are disabled in email settings.');
      return { skipped: true, reason: 'Notifications disabled in mail settings' };
    }

    if (!s.hasCredentials) {
      console.log(`ℹ️ [MAIL NOTIFICATION] Google App Password not configured yet. Message recorded in database from: ${inquiry.name} <${inquiry.email}>.`);
      return {
        success: false,
        unconfigured: true,
        message: 'Google App Password is not configured yet. Stored safely in database.'
      };
    }

    const transporter = this.getTransporter(s);
    if (!transporter) {
      return {
        success: false,
        unconfigured: true,
        message: 'Transporter creation failed.'
      };
    }

    const recipient = s.notifyEmail || 'keerthantunkoju10@gmail.com';
    const formattedDate = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'full',
      timeStyle: 'medium'
    });

    const bodyHtml = `
      <h2 style="color: #ffffff; font-size: 18px; margin-top: 0; font-weight: 700;">📬 New Inquiry Received on Your Portfolio</h2>
      <p style="color: #cbd5e1; font-size: 14px; margin-bottom: 20px;">
        A new message has been submitted via your portfolio's contact form. It has been recorded in your central database.
      </p>
      
      <table class="meta-table">
        <tr>
          <td class="meta-label">From</td>
          <td class="meta-val"><strong>${escapeHtml(inquiry.name)}</strong> &lt;<a href="mailto:${escapeHtml(inquiry.email)}" style="color:#38bdf8; text-decoration:none;">${escapeHtml(inquiry.email)}</a>&gt;</td>
        </tr>
        <tr>
          <td class="meta-label">Subject</td>
          <td class="meta-val">${escapeHtml(inquiry.subject || 'Portfolio Inquiry')}</td>
        </tr>
        <tr>
          <td class="meta-label">Received At</td>
          <td class="meta-val">${formattedDate} (IST)</td>
        </tr>
      </table>

      <div style="margin-top: 24px;">
        <span style="color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Message Content:</span>
        <div class="msg-box">${escapeHtml(inquiry.message)}</div>
      </div>

      <div style="margin-top: 24px; text-align: left;">
        <a href="mailto:${escapeHtml(inquiry.email)}?subject=Re: ${encodeURIComponent(inquiry.subject || 'Portfolio Inquiry')}&body=${encodeURIComponent('\n\n--- Original Message from ' + inquiry.name + ' ---\n' + inquiry.message)}" class="cta-btn">
          ✉️ Reply Directly to ${escapeHtml(inquiry.name)}
        </a>
      </div>
    `;

    const fullHtml = this.wrapEmailHtml(bodyHtml, `New inquiry from ${inquiry.name}: ${inquiry.subject || 'Portfolio Inquiry'}`);

    const mailOptions = {
      from: `"${s.fromName}" <${s.user}>`,
      to: recipient,
      replyTo: `"${inquiry.name}" <${inquiry.email}>`,
      subject: `⚡ [Portfolio Inquiry] ${inquiry.subject || 'New Message'} from ${inquiry.name}`,
      text: `New inquiry received from ${inquiry.name} (${inquiry.email}):\nSubject: ${inquiry.subject || 'Portfolio Inquiry'}\nTime: ${formattedDate}\n\nMessage:\n${inquiry.message}\n\n--\nReply directly to this email to contact ${inquiry.name}.`,
      html: fullHtml
    };

    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ [MAIL ALERT DELIVERED] Successfully sent inquiry alert to ${recipient}. MessageId: ${info.messageId}`);
      return { success: true, messageId: info.messageId, recipient };
    } catch (err) {
      console.error(`❌ [MAIL ALERT ERROR] Failed to send email alert to ${recipient}:`, err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Send an automatic confirmation email to the visitor who submitted the form
   */
  async sendAutoReply(inquiry, rawSettings) {
    const s = this.normalizeSettings(rawSettings);
    if (!s.autoReplyEnabled || !s.hasCredentials || !inquiry.email) {
      return { skipped: true };
    }

    const transporter = this.getTransporter(s);
    if (!transporter) return { skipped: true };

    const contentHtml = `
      <h2 style="color: #ffffff; font-size: 18px; margin-top: 0; font-weight: 700;">Thank You for Reaching Out!</h2>
      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
        Hi <strong>${escapeHtml(inquiry.name)}</strong>,
      </p>
      <p style="color: #cbd5e1; font-size: 14px; line-height: 1.7;">
        Thank you for contacting me through my personal portfolio website. I have received your message regarding <em>"${escapeHtml(inquiry.subject || 'your inquiry')}"</em> and will review it and reply as soon as possible.
      </p>

      <div style="background: #1e293b; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 3px solid #38bdf8;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0 0 6px 0; font-weight: 600; text-transform: uppercase;">Your Submitted Message:</p>
        <p style="color: #e2e8f0; font-size: 13px; margin: 0; white-space: pre-wrap;">${escapeHtml(inquiry.message)}</p>
      </div>

      <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #1e293b;">
        <p style="margin: 0; color: #f8fafc; font-weight: 700; font-size: 15px;">Keerthan Tunkoju</p>
        <p style="margin: 4px 0 0 0; color: #38bdf8; font-size: 13px;">Software Developer &bull; AI &amp; ML Graduate</p>
        <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 13px;">Hyderabad, India</p>
      </div>
    `;

    const fullHtml = this.wrapEmailHtml(contentHtml, 'Thank you for contacting Keerthan Tunkoju');

    try {
      const info = await transporter.sendMail({
        from: `"${s.fromName}" <${s.user}>`,
        to: inquiry.email,
        replyTo: s.notifyEmail || s.user,
        subject: `Thank you for contacting Keerthan Tunkoju: ${inquiry.subject || 'Inquiry Received'}`,
        text: `Hi ${inquiry.name},\n\nThank you for reaching out through my portfolio website! I have received your message and will get back to you shortly.\n\nBest regards,\nKeerthan Tunkoju`,
        html: fullHtml
      });
      console.log(`✅ [AUTO-REPLY SENT] Confirmation delivered to ${inquiry.email}`);
      return { success: true, messageId: info.messageId };
    } catch (err) {
      console.warn('Auto-reply warning:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Send a direct email reply to a visitor from the CMS Dashboard
   */
  async sendDirectReply({ to, subject, replyText, originalMessage, originalSenderName }, rawSettings) {
    const s = this.normalizeSettings(rawSettings);
    const transporter = this.getTransporter(s);

    if (!transporter) {
      throw new Error('Google App Password or SMTP credentials are not configured. Please enter your 16-character Google App Password in CMS Mail Settings.');
    }

    const fromAddress = s.fromEmail || s.user;
    const fromName = s.fromName || 'Keerthan Tunkoju';

    const contentHtml = `
      <div style="color: #e2e8f0; font-size: 15px; line-height: 1.8; margin-bottom: 24px;">
        ${escapeHtml(replyText).replace(/\n/g, '<br>')}
      </div>

      ${originalMessage ? `
        <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #1e293b;">
          <p style="color: #94a3b8; font-size: 12px; margin-bottom: 8px; font-weight: 600;">
            --- On ${new Date().toLocaleDateString()}, ${escapeHtml(originalSenderName || 'you')} wrote: ---
          </p>
          <div style="background: #1e293b; padding: 14px 18px; border-radius: 6px; font-size: 13px; color: #94a3b8; border-left: 3px solid #64748b;">
            ${escapeHtml(originalMessage).replace(/\n/g, '<br>')}
          </div>
        </div>
      ` : ''}

      <div style="margin-top: 36px; padding-top: 20px; border-top: 1px solid #1e293b;">
        <p style="margin: 0; color: #f8fafc; font-weight: 700; font-size: 15px;">Keerthan Tunkoju</p>
        <p style="margin: 4px 0 0 0; color: #38bdf8; font-size: 13px;">Software Developer &bull; AI &amp; ML Graduate</p>
        <p style="margin: 4px 0 0 0; color: #94a3b8; font-size: 13px;">Phone: +91 6281151724 &bull; Hyderabad, India</p>
      </div>
    `;

    const fullHtml = this.wrapEmailHtml(contentHtml, subject);

    const mailOptions = {
      from: `"${fromName}" <${fromAddress}>`,
      to: to.trim(),
      replyTo: fromAddress,
      subject: subject || 'Re: Portfolio Inquiry',
      text: `${replyText}\n\n---\nKeerthan Tunkoju\nSoftware Developer & AI/ML Graduate\nkeerthantunkoju10@gmail.com`,
      html: fullHtml
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`✅ [REPLY SENT] Email reply delivered to ${to}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId, to };
  }

  /**
   * Send a test email to verify SMTP configuration
   */
  async sendTestEmail(targetEmail, rawSettings) {
    const s = this.normalizeSettings(rawSettings);
    const transporter = this.getTransporter(s);

    if (!transporter) {
      throw new Error('SMTP credentials are missing. Please provide your Gmail address and 16-character Google App Password.');
    }

    // Verify SMTP handshake
    try {
      await transporter.verify();
    } catch (verifyErr) {
      let msg = verifyErr.message;
      if (msg.includes('535') || msg.includes('Invalid login') || msg.includes('BadCredentials')) {
        throw new Error('Google rejected the App Password (535 Bad Credentials). Ensure 2-Step Verification is ON in your Google Account and generate a new 16-character password at myaccount.google.com/apppasswords.');
      }
      throw verifyErr;
    }

    const recipient = targetEmail || s.notifyEmail || s.user || 'keerthantunkoju10@gmail.com';
    const testTime = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'full',
      timeStyle: 'medium'
    });

    const contentHtml = `
      <div style="text-align: center; padding: 12px 0 20px 0;">
        <div style="display:inline-block; background: #064e3b; color: #34d399; font-weight: 700; font-size: 13px; padding: 6px 14px; border-radius: 9999px; margin-bottom: 16px;">
          ✓ SMTP CONNECTION VERIFIED
        </div>
        <h2 style="color: #ffffff; font-size: 20px; margin: 0 0 8px 0;">Mail Integration Test Successful!</h2>
        <p style="color: #cbd5e1; font-size: 14px; margin: 0;">
          Your Keerthan Portfolio mail service is fully connected, authorized, and operational across all devices.
        </p>
      </div>

      <table class="meta-table">
        <tr>
          <td class="meta-label">Provider</td>
          <td class="meta-val">Google SMTP (${escapeHtml(s.host)}:${s.port})</td>
        </tr>
        <tr>
          <td class="meta-label">Gmail User</td>
          <td class="meta-val">${escapeHtml(s.user)}</td>
        </tr>
        <tr>
          <td class="meta-label">Sender Name</td>
          <td class="meta-val">${escapeHtml(s.fromName)} &lt;${escapeHtml(s.fromEmail)}&gt;</td>
        </tr>
        <tr>
          <td class="meta-label">Target Inbox</td>
          <td class="meta-val">${escapeHtml(recipient)}</td>
        </tr>
        <tr>
          <td class="meta-label">Verified At</td>
          <td class="meta-val">${testTime} (IST)</td>
        </tr>
      </table>

      <p style="color: #94a3b8; font-size: 13px; margin-top: 20px;">
        You will now receive automatic email alerts whenever a recruiter or visitor contacts you through your portfolio website. All inquiries will also be stored permanently in your central database!
      </p>
    `;

    const fullHtml = this.wrapEmailHtml(contentHtml, 'SMTP connection test passed successfully');

    const mailOptions = {
      from: `"${s.fromName}" <${s.user}>`,
      to: recipient,
      subject: `✅ Keerthan Portfolio: Mail Integration Test Verified [${new Date().toLocaleTimeString()}]`,
      text: `Keerthan Portfolio Mail Integration Test passed successfully at ${testTime}.`,
      html: fullHtml
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId, recipient };
  }
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

module.exports = new PortfolioMailer();
