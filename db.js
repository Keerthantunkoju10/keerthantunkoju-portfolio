/**
 * ==========================================================================
 * KEERTHAN TUNKOJU PORTFOLIO - SQLITE DATABASE MODULE
 * Database File: portfolio.db
 * Tables:
 * 1. portfolio_content: Central storage for all website content
 * 2. contact_messages: Inquiries submitted by visitors via Contact Form
 * 3. admin_users: Admin credentials and password hashes
 * 4. activity_logs: Audit log of edits and changes
 * ==========================================================================
 */

const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const defaultData = require('./data.js');

const DB_FILE = path.join(__dirname, 'portfolio.db');
const DEFAULT_HASH = 'ae0d4efe0967ec0418278cd1773114afc8c546489c092e6ccfe99216eb0ef4a4'; // Keerthan@2024

class PortfolioDatabase {
  constructor() {
    this.db = new sqlite3.Database(DB_FILE, (err) => {
      if (err) {
        console.error('❌ Failed to connect to SQLite database:', err.message);
      } else {
        console.log('✅ SQLite Database connected:', DB_FILE);
        this.initTables();
      }
    });
  }

  initTables() {
    this.db.serialize(() => {
      // 1. Portfolio Content Table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS portfolio_content (
          id TEXT PRIMARY KEY,
          data_json TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 2. Contact Messages Table (stores form submissions & reply history)
      this.db.run(`
        CREATE TABLE IF NOT EXISTS contact_messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          subject TEXT,
          message TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_read INTEGER DEFAULT 0,
          status TEXT DEFAULT 'unread',
          replied_at DATETIME,
          reply_body TEXT,
          reply_subject TEXT,
          email_alert_status TEXT DEFAULT 'pending'
        )
      `);

      // Migration: safely ensure newly added columns exist in older SQLite databases
      this.db.all(`PRAGMA table_info(contact_messages)`, (err, columns) => {
        if (!err && columns) {
          const colNames = columns.map(c => c.name);
          if (!colNames.includes('status')) {
            this.db.run(`ALTER TABLE contact_messages ADD COLUMN status TEXT DEFAULT 'unread'`);
          }
          if (!colNames.includes('replied_at')) {
            this.db.run(`ALTER TABLE contact_messages ADD COLUMN replied_at DATETIME`);
          }
          if (!colNames.includes('reply_body')) {
            this.db.run(`ALTER TABLE contact_messages ADD COLUMN reply_body TEXT`);
          }
          if (!colNames.includes('reply_subject')) {
            this.db.run(`ALTER TABLE contact_messages ADD COLUMN reply_subject TEXT`);
          }
          if (!colNames.includes('email_alert_status')) {
            this.db.run(`ALTER TABLE contact_messages ADD COLUMN email_alert_status TEXT DEFAULT 'pending'`);
          }
        }
      });

      // 3. Mail Integration & SMTP Settings Table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS mail_settings (
          id TEXT PRIMARY KEY,
          provider TEXT DEFAULT 'gmail',
          host TEXT DEFAULT 'smtp.gmail.com',
          port INTEGER DEFAULT 465,
          secure INTEGER DEFAULT 1,
          auth_user TEXT DEFAULT 'keerthantunkoju10@gmail.com',
          auth_pass TEXT DEFAULT '',
          from_name TEXT DEFAULT 'Keerthan Tunkoju Portfolio',
          from_email TEXT DEFAULT 'keerthantunkoju10@gmail.com',
          notify_email TEXT DEFAULT 'keerthantunkoju10@gmail.com',
          notify_enabled INTEGER DEFAULT 1,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 4. Admin Credentials Table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS admin_users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 5. Activity Audit Logs
      this.db.run(`
        CREATE TABLE IF NOT EXISTS activity_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          action TEXT NOT NULL,
          details TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Seed Default Portfolio Data if table is empty
      this.db.get(`SELECT COUNT(*) as count FROM portfolio_content WHERE id = 'main'`, (err, row) => {
        if (!err && row && row.count === 0) {
          const initialJson = JSON.stringify(defaultData);
          this.db.run(
            `INSERT INTO portfolio_content (id, data_json) VALUES ('main', ?)`,
            [initialJson],
            (insertErr) => {
              if (insertErr) console.error('Error seeding portfolio data:', insertErr);
              else console.log('🌱 Seeded portfolio_content table with default resume data.');
            }
          );
        }
      });

      // Seed Default Admin User if table is empty
      this.db.get(`SELECT COUNT(*) as count FROM admin_users WHERE username = 'admin'`, (err, row) => {
        if (!err && row && row.count === 0) {
          this.db.run(
            `INSERT INTO admin_users (username, password_hash) VALUES ('admin', ?)`,
            [DEFAULT_HASH],
            (insertErr) => {
              if (insertErr) console.error('Error seeding admin user:', insertErr);
              else console.log('🌱 Seeded default admin user (username: "admin", password: "Keerthan@2024").');
            }
          );
        }
      });

      // Seed Default Mail Settings if table is empty
      this.db.get(`SELECT COUNT(*) as count FROM mail_settings WHERE id = 'default'`, (err, row) => {
        if (!err && row && row.count === 0) {
          this.db.run(
            `INSERT INTO mail_settings (id, provider, host, port, secure, auth_user, auth_pass, from_name, from_email, notify_email, notify_enabled)
             VALUES ('default', 'gmail', 'smtp.gmail.com', 465, 1, 'keerthantunkoju10@gmail.com', '', 'Keerthan Tunkoju Portfolio', 'keerthantunkoju10@gmail.com', 'keerthantunkoju10@gmail.com', 1)`,
            (insertErr) => {
              if (insertErr) console.error('Error seeding mail settings:', insertErr);
              else console.log('🌱 Seeded default mail settings for keerthantunkoju10@gmail.com.');
            }
          );
        }
      });
    });
  }

  // Get portfolio content
  getPortfolioData() {
    return new Promise((resolve, reject) => {
      this.db.get(`SELECT data_json, updated_at FROM portfolio_content WHERE id = 'main'`, (err, row) => {
        if (err) return reject(err);
        if (row && row.data_json) {
          try {
            resolve(JSON.parse(row.data_json));
          } catch (e) {
            resolve(defaultData);
          }
        } else {
          resolve(defaultData);
        }
      });
    });
  }

  // Sync portfolio data to data.js on disk so static visitors and others immediately see updates
  syncDataFile(dataObj) {
    try {
      const dataFilePath = path.join(__dirname, 'data.js');
      const content = `/**
 * ==========================================================================
 * KEERTHAN TUNKOJU PORTFOLIO - DEFAULT DATA STORE
 * Auto-synced with SQLite database and admin CMS updates.
 * ==========================================================================
 */

const defaultPortfolioData = ${JSON.stringify(dataObj, null, 2)};

// Export for module systems or attach to global scope
if (typeof module !== 'undefined' && module.exports) {
  module.exports = defaultPortfolioData;
}
`;
      fs.writeFileSync(dataFilePath, content, 'utf8');
      try {
        delete require.cache[require.resolve('./data.js')];
      } catch (e) {}
    } catch (err) {
      console.error('Warning: Failed to sync data.js:', err.message);
    }
  }

  // Update portfolio content
  savePortfolioData(dataObj) {
    return new Promise((resolve, reject) => {
      const jsonStr = JSON.stringify(dataObj);
      const self = this;
      this.db.run(
        `INSERT INTO portfolio_content (id, data_json, updated_at) 
         VALUES ('main', ?, CURRENT_TIMESTAMP) 
         ON CONFLICT(id) DO UPDATE SET data_json = excluded.data_json, updated_at = CURRENT_TIMESTAMP`,
        [jsonStr],
        function(err) {
          if (err) return reject(err);
          self.syncDataFile(dataObj);
          resolve({ success: true, updated_at: new Date().toISOString() });
        }
      );
    });
  }

  // Save new contact form inquiry
  saveMessage({ name, email, subject, message, email_alert_status = 'pending' }) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO contact_messages (name, email, subject, message, status, is_read, email_alert_status) VALUES (?, ?, ?, ?, 'unread', 0, ?)`,
        [name, email, subject || 'General Inquiry', message, email_alert_status],
        function(err) {
          if (err) return reject(err);
          resolve({ success: true, messageId: this.lastID });
        }
      );
    });
  }

  // Retrieve all contact messages for admin (with replies and statuses)
  getMessages() {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT id, name, email, subject, message, created_at, is_read,
                COALESCE(status, CASE WHEN is_read = 1 THEN 'read' ELSE 'unread' END) as status,
                replied_at, reply_body, reply_subject,
                COALESCE(email_alert_status, 'pending') as email_alert_status
         FROM contact_messages 
         ORDER BY created_at DESC`,
        (err, rows) => {
          if (err) return reject(err);
          resolve(rows || []);
        }
      );
    });
  }

  // Delete message by ID
  deleteMessage(id) {
    return new Promise((resolve, reject) => {
      this.db.run(`DELETE FROM contact_messages WHERE id = ?`, [id], function(err) {
        if (err) return reject(err);
        resolve({ success: true, changes: this.changes });
      });
    });
  }

  // Mark message read or unread
  markMessageRead(id, isRead = 1) {
    return new Promise((resolve, reject) => {
      const readVal = isRead ? 1 : 0;
      const statusVal = isRead ? 'read' : 'unread';
      this.db.run(
        `UPDATE contact_messages 
         SET is_read = ?, status = CASE WHEN status = 'replied' THEN 'replied' ELSE ? END 
         WHERE id = ?`,
        [readVal, statusVal, id],
        function(err) {
          if (err) return reject(err);
          resolve({ success: true, changes: this.changes });
        }
      );
    });
  }

  // Update message status directly ('unread', 'read', 'replied')
  updateMessageStatus(id, status, isRead = null) {
    return new Promise((resolve, reject) => {
      let query = `UPDATE contact_messages SET status = ?`;
      let params = [status];
      if (isRead !== null) {
        query += `, is_read = ?`;
        params.push(isRead ? 1 : 0);
      }
      query += ` WHERE id = ?`;
      params.push(id);
      this.db.run(query, params, function(err) {
        if (err) return reject(err);
        resolve({ success: true, changes: this.changes });
      });
    });
  }

  // Save email reply details for a message
  saveMessageReply(id, { replySubject, replyBody }) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE contact_messages 
         SET status = 'replied', is_read = 1, replied_at = CURRENT_TIMESTAMP, reply_subject = ?, reply_body = ?
         WHERE id = ?`,
        [replySubject || 'Re: Portfolio Inquiry', replyBody || '', id],
        function(err) {
          if (err) return reject(err);
          resolve({ success: true, changes: this.changes });
        }
      );
    });
  }

  // Update email alert delivery status for an inquiry
  updateEmailAlertStatus(id, alertStatus) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE contact_messages SET email_alert_status = ? WHERE id = ?`,
        [alertStatus, id],
        function(err) {
          if (err) return reject(err);
          resolve({ success: true, changes: this.changes });
        }
      );
    });
  }

  // Retrieve Mail & SMTP Settings
  getMailSettings() {
    return new Promise((resolve, reject) => {
      this.db.get(`SELECT * FROM mail_settings WHERE id = 'default'`, (err, row) => {
        if (err) return reject(err);
        if (row) {
          resolve(row);
        } else {
          resolve({
            id: 'default',
            provider: 'gmail',
            host: 'smtp.gmail.com',
            port: 465,
            secure: 1,
            auth_user: 'keerthantunkoju10@gmail.com',
            auth_pass: '',
            from_name: 'Keerthan Tunkoju Portfolio',
            from_email: 'keerthantunkoju10@gmail.com',
            notify_email: 'keerthantunkoju10@gmail.com',
            notify_enabled: 1
          });
        }
      });
    });
  }

  // Save Mail & SMTP Settings
  saveMailSettings(s) {
    return new Promise((resolve, reject) => {
      this.getMailSettings().then(existing => {
        const passToSave = (s.auth_pass && s.auth_pass !== '••••••••')
          ? s.auth_pass
          : (existing ? existing.auth_pass : '');

        this.db.run(
          `INSERT OR REPLACE INTO mail_settings 
           (id, provider, host, port, secure, auth_user, auth_pass, from_name, from_email, notify_email, notify_enabled, updated_at) 
           VALUES ('default', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
          [
            s.provider || 'gmail',
            s.host || 'smtp.gmail.com',
            Number(s.port) || 465,
            s.secure ? 1 : 0,
            s.auth_user || '',
            passToSave,
            s.from_name || 'Keerthan Tunkoju Portfolio',
            s.from_email || 'keerthantunkoju10@gmail.com',
            s.notify_email || 'keerthantunkoju10@gmail.com',
            s.notify_enabled ? 1 : 0
          ],
          function(err) {
            if (err) return reject(err);
            resolve({ success: true });
          }
        );
      }).catch(reject);
    });
  }

  // Verify Admin Login Hash
  verifyAdmin(hash) {
    return new Promise((resolve, reject) => {
      this.db.get(`SELECT password_hash FROM admin_users WHERE username = 'admin'`, (err, row) => {
        if (err) return reject(err);
        if (row && row.password_hash === hash) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  }

  // Update Admin Password Hash
  changeAdminPassword(newHash) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE admin_users SET password_hash = ? WHERE username = 'admin'`,
        [newHash],
        function(err) {
          if (err) return reject(err);
          resolve({ success: true });
        }
      );
    });
  }

  // Database statistics & diagnostics
  getDbStats() {
    return new Promise((resolve) => {
      let stats = {
        databaseEngine: 'SQLite 3',
        databaseFile: 'portfolio.db',
        fileSizeBytes: 0,
        totalMessages: 0,
        lastUpdated: null
      };

      try {
        if (fs.existsSync(DB_FILE)) {
          stats.fileSizeBytes = fs.statSync(DB_FILE).size;
        }
      } catch (e) {}

      this.db.get(`SELECT COUNT(*) as count FROM contact_messages`, (err, mRow) => {
        if (!err && mRow) stats.totalMessages = mRow.count;

        this.db.get(`SELECT updated_at FROM portfolio_content WHERE id = 'main'`, (err2, cRow) => {
          if (!err2 && cRow) stats.lastUpdated = cRow.updated_at;
          resolve(stats);
        });
      });
    });
  }
}

module.exports = new PortfolioDatabase();
