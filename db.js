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

      // 2. Contact Messages Table (stores form submissions)
      this.db.run(`
        CREATE TABLE IF NOT EXISTS contact_messages (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          subject TEXT,
          message TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          is_read INTEGER DEFAULT 0
        )
      `);

      // 3. Admin Credentials Table
      this.db.run(`
        CREATE TABLE IF NOT EXISTS admin_users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 4. Activity Audit Logs
      this.db.run(`
        CREATE TABLE IF NOT EXISTS activity_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          action TEXT NOT NULL,
          details TEXT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 5. System Settings Table (Stores Google App Password, Gmail address & global configs)
      this.db.run(`
        CREATE TABLE IF NOT EXISTS system_settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Migrations: ensure contact_messages table has email status & reply fields
      const msgColumnMigrations = [
        `ALTER TABLE contact_messages ADD COLUMN email_sent INTEGER DEFAULT 0`,
        `ALTER TABLE contact_messages ADD COLUMN email_error TEXT`,
        `ALTER TABLE contact_messages ADD COLUMN reply_sent INTEGER DEFAULT 0`,
        `ALTER TABLE contact_messages ADD COLUMN reply_message TEXT`,
        `ALTER TABLE contact_messages ADD COLUMN replied_at DATETIME`
      ];
      msgColumnMigrations.forEach(sql => {
        this.db.run(sql, () => {}); // Ignore if column already exists
      });

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

      // Seed Default System Settings (Gmail & App Password defaults)
      const defaultSettings = [
        ['gmail_user', 'keerthantunkoju@gmail.com'],
        ['gmail_app_password', 'ioml bqxd vtkw kfni'],
        ['notify_email', 'keerthantunkoju@gmail.com'],
        ['sender_name', 'Keerthan Tunkoju Portfolio'],
        ['email_notifications_enabled', '1'],
        ['auto_reply_enabled', '0']
      ];

      defaultSettings.forEach(([key, val]) => {
        this.db.run(
          `INSERT OR IGNORE INTO system_settings (key, value) VALUES (?, ?)`,
          [key, val]
        );
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

  // Save new contact form inquiry (with email notification tracking)
  saveMessage({ name, email, subject, message, email_sent = 0, email_error = null }) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO contact_messages (name, email, subject, message, email_sent, email_error) VALUES (?, ?, ?, ?, ?, ?)`,
        [name, email, subject || 'General Inquiry', message, email_sent ? 1 : 0, email_error || null],
        function(err) {
          if (err) return reject(err);
          resolve({ success: true, messageId: this.lastID });
        }
      );
    });
  }

  // Update email notification delivery status on a message
  updateMessageEmailStatus(id, email_sent, email_error = null) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE contact_messages SET email_sent = ?, email_error = ? WHERE id = ?`,
        [email_sent ? 1 : 0, email_error, id],
        function(err) {
          if (err) return reject(err);
          resolve({ success: true, changes: this.changes });
        }
      );
    });
  }

  // Record an admin reply sent via Gmail
  recordMessageReply(id, replyMessage) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `UPDATE contact_messages SET reply_sent = 1, reply_message = ?, replied_at = CURRENT_TIMESTAMP, is_read = 1 WHERE id = ?`,
        [replyMessage, id],
        function(err) {
          if (err) return reject(err);
          resolve({ success: true, changes: this.changes });
        }
      );
    });
  }

  // Retrieve all contact messages for admin (with full email delivery & reply telemetry)
  getMessages() {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT id, name, email, subject, message, created_at, is_read, email_sent, email_error, reply_sent, reply_message, replied_at 
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

  // Mark message as read/unread
  markMessageRead(id, isRead = 1) {
    return new Promise((resolve, reject) => {
      this.db.run(`UPDATE contact_messages SET is_read = ? WHERE id = ?`, [isRead ? 1 : 0, id], function(err) {
        if (err) return reject(err);
        resolve({ success: true, changes: this.changes });
      });
    });
  }

  // Mark all messages as read
  markAllMessagesRead() {
    return new Promise((resolve, reject) => {
      this.db.run(`UPDATE contact_messages SET is_read = 1`, function(err) {
        if (err) return reject(err);
        resolve({ success: true, changes: this.changes });
      });
    });
  }

  // ==========================================
  // SYSTEM SETTINGS (Google App Password & Email Config)
  // Stored centrally in SQLite for all devices
  // ==========================================
  getSettings() {
    return new Promise((resolve, reject) => {
      this.db.all(`SELECT key, value FROM system_settings`, (err, rows) => {
        if (err) return reject(err);
        const settings = {};
        (rows || []).forEach(r => { settings[r.key] = r.value; });
        resolve(settings);
      });
    });
  }

  getSetting(key) {
    return new Promise((resolve, reject) => {
      this.db.get(`SELECT value FROM system_settings WHERE key = ?`, [key], (err, row) => {
        if (err) return reject(err);
        resolve(row ? row.value : null);
      });
    });
  }

  saveSettings(settingsObj) {
    return new Promise((resolve, reject) => {
      const entries = Object.entries(settingsObj);
      if (entries.length === 0) return resolve({ success: true });

      const self = this;
      self.db.serialize(() => {
        const stmt = self.db.prepare(`
          INSERT INTO system_settings (key, value, updated_at) 
          VALUES (?, ?, CURRENT_TIMESTAMP)
          ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
        `);

        entries.forEach(([key, val]) => {
          stmt.run([key, String(val ?? '')]);
        });

        stmt.finalize((err) => {
          if (err) return reject(err);
          resolve({ success: true, count: entries.length });
        });
      });
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
        unreadMessages: 0,
        hasGoogleAppPassword: false,
        gmailUser: '',
        lastUpdated: null
      };

      try {
        if (fs.existsSync(DB_FILE)) {
          stats.fileSizeBytes = fs.statSync(DB_FILE).size;
        }
      } catch (e) {}

      this.db.get(`SELECT COUNT(*) as count, SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread FROM contact_messages`, (err, mRow) => {
        if (!err && mRow) {
          stats.totalMessages = mRow.count || 0;
          stats.unreadMessages = mRow.unread || 0;
        }

        this.db.all(`SELECT key, value FROM system_settings WHERE key IN ('gmail_app_password', 'gmail_user')`, (err3, sRows) => {
          if (!err3 && sRows) {
            sRows.forEach(r => {
              if (r.key === 'gmail_app_password') stats.hasGoogleAppPassword = !!(r.value && r.value.trim().length > 0);
              if (r.key === 'gmail_user') stats.gmailUser = r.value || '';
            });
          }

          this.db.get(`SELECT updated_at FROM portfolio_content WHERE id = 'main'`, (err2, cRow) => {
            if (!err2 && cRow) stats.lastUpdated = cRow.updated_at;
            resolve(stats);
          });

        });
      });
    });
  }
}

module.exports = new PortfolioDatabase();
