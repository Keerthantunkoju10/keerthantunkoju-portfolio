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
const DEFAULT_HASH = '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'; // admin123

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
              else console.log('🌱 Seeded default admin user (username: "admin", password: "admin123").');
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

  // Update portfolio content
  savePortfolioData(dataObj) {
    return new Promise((resolve, reject) => {
      const jsonStr = JSON.stringify(dataObj);
      this.db.run(
        `INSERT INTO portfolio_content (id, data_json, updated_at) 
         VALUES ('main', ?, CURRENT_TIMESTAMP) 
         ON CONFLICT(id) DO UPDATE SET data_json = excluded.data_json, updated_at = CURRENT_TIMESTAMP`,
        [jsonStr],
        function(err) {
          if (err) return reject(err);
          resolve({ success: true, updated_at: new Date().toISOString() });
        }
      );
    });
  }

  // Save new contact form inquiry
  saveMessage({ name, email, subject, message }) {
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO contact_messages (name, email, subject, message) VALUES (?, ?, ?, ?)`,
        [name, email, subject || 'General Inquiry', message],
        function(err) {
          if (err) return reject(err);
          resolve({ success: true, messageId: this.lastID });
        }
      );
    });
  }

  // Retrieve all contact messages for admin
  getMessages() {
    return new Promise((resolve, reject) => {
      this.db.all(
        `SELECT id, name, email, subject, message, created_at, is_read 
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

  // Mark message as read
  markMessageRead(id) {
    return new Promise((resolve, reject) => {
      this.db.run(`UPDATE contact_messages SET is_read = 1 WHERE id = ?`, [id], function(err) {
        if (err) return reject(err);
        resolve({ success: true, changes: this.changes });
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
