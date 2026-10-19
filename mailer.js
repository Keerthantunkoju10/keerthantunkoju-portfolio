/**
 * ==========================================================================
 * KEERTHAN TUNKOJU PORTFOLIO - EMAIL SERVICE & MAILER MODULE
 * Powered by Nodemailer with fallback support for direct webmail links.
 * ==========================================================================
 */

const nodemailer = require('nodemailer');

class PortfolioMailer {
  /**
   * Create a transporter instance from settings
   */
  getTransporter(settings) {
    if (!settings || !settings.auth_user || !settings.auth_pass) {
      return null;
    }

    const host = settings.host || 'smtp.gmail.com';
    const port = Number(settings.port) || 465;
    const isSecure = settings.secure === 1 || settings.secure === true || port === 465;

    // Use built-in Gmail service configuration if host is gmail
    if (host.toLowerCase().includes('gmail')) {
      return nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: settings.auth_user.trim(),
          pass: settings.auth_pass.trim()
        }
      });
    }

    return nodemailer.createTransport({
      host: host.trim(),
      port: port,
      secure: isSecure,
      auth: {
        user: settings.auth_user.trim(),
        pass: settings.auth_pass.trim()
      },
      tls: {
        rejectUnauthorized: false
      }
    });
  }

  /**
   * Generate branded HTML email header & wrapper
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
      <p class="brand-subtitle">Software Developer &bull; AI &amp; ML Graduate</p>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p style="margin: 0 0 8px 0;">Portfolio CMS &bull; Automated Inquiry &amp; Mail Dispatch System</p>
      <p style="margin: 0;">
        <a href="https://linkedin.com/in/keerthan-tunkoju-a24604258">LinkedIn</a> &bull;
        <a href="https://github.com/Keerthantunkoju10">GitHub</a> &bull;
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
  async sendContactNotification(inquiry, settings) {
    if (!settings || settings.notify_enabled === 0 || settings.notify_enabled === false) {
      return { skipped: true, reason: 'Notifications disabled in mail settings' };
    }

    const transporter = this.getTransporter(settings);
    const recipient = settings.notify_email || 'keerthantunkoju10@gmail.com';

    if (!transporter) {
      console.log(`ℹ️ [MAIL NOTIFICATION] SMTP credentials not configured. Inquiry saved in SQLite DB from: ${inquiry.name} <${inquiry.email}>.`);
      return {
        success: false,
        unconfigured: true,
        message: 'SMTP credentials not configured. Message stored securely in database inbox.'
      };
    }

    const formattedDate = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'full',
      timeStyle: 'medium'
    });

    const bodyHtml = `
      <h2 style="color: #ffffff; font-size: 18px; margin-top: 0; font-weight: 700;">📬 New Inquiry Received on Your Portfolio</h2>
      <p style="color: #cbd5e1; font-size: 14px; margin-bottom: 20px;">
        A new message has been submitted via your portfolio's contact form. It has been recorded in your SQLite database.
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
      from: `"${settings.from_name || 'Portfolio Contact Alert'}" <${settings.from_email || settings.auth_user}>`,
      to: recipient,
      replyTo: `"${inquiry.name}" <${inquiry.email}>`,
      subject: `⚡ [Portfolio Inquiry] ${inquiry.subject || 'New Message'} from ${inquiry.name}`,
      text: `New message from ${inquiry.name} (${inquiry.email}):\nSubject: ${inquiry.subject || 'Portfolio Inquiry'}\n\n${inquiry.message}`,
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
   * Send a direct email reply to a visitor from the CMS Dashboard
   */
  async sendDirectReply({ to, subject, replyText, originalMessage, originalSenderName }, settings) {
    const transporter = this.getTransporter(settings);

    if (!transporter) {
      throw new Error('SMTP credentials are not configured. Please enter your Gmail App Password or custom SMTP credentials in CMS Mail Settings.');
    }

    const fromAddress = settings.from_email || settings.auth_user || 'keerthantunkoju10@gmail.com';
    const fromName = settings.from_name || 'Keerthan Tunkoju';

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
  async sendTestEmail(targetEmail, settings) {
    const transporter = this.getTransporter(settings);

    if (!transporter) {
      throw new Error('SMTP credentials are missing. Please provide username and password.');
    }

    const recipient = targetEmail || settings.notify_email || 'keerthantunkoju10@gmail.com';
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
          Your Keerthan Portfolio mail service is fully connected, authorized, and operational.
        </p>
      </div>

      <table class="meta-table">
        <tr>
          <td class="meta-label">SMTP Provider</td>
          <td class="meta-val">${escapeHtml(settings.provider || 'Gmail')} (${escapeHtml(settings.host || 'smtp.gmail.com')}:${settings.port || 465})</td>
        </tr>
        <tr>
          <td class="meta-label">Authenticated User</td>
          <td class="meta-val">${escapeHtml(settings.auth_user || '')}</td>
        </tr>
        <tr>
          <td class="meta-label">Sender Display</td>
          <td class="meta-val">${escapeHtml(settings.from_name || 'Keerthan Tunkoju')} &lt;${escapeHtml(settings.from_email || settings.auth_user || '')}&gt;</td>
        </tr>
        <tr>
          <td class="meta-label">Notification Target</td>
          <td class="meta-val">${escapeHtml(recipient)}</td>
        </tr>
        <tr>
          <td class="meta-label">Verified At</td>
          <td class="meta-val">${testTime} (IST)</td>
        </tr>
      </table>

      <p style="color: #94a3b8; font-size: 13px; margin-top: 20px;">
        You will now receive automatic email alerts whenever a recruiter or visitor contacts you through your portfolio website. You can also reply directly to messages right from the CMS Dashboard Inbox!
      </p>
    `;

    const fullHtml = this.wrapEmailHtml(contentHtml, 'SMTP connection test passed successfully');

    const mailOptions = {
      from: `"${settings.from_name || 'Keerthan Portfolio'}" <${settings.from_email || settings.auth_user}>`,
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
