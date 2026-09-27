# 🚀 Keerthan Tunkoju — Full-Stack Portfolio with SQLite Database, Online CMS & Resume Viewer

A modern, responsive, and accessible personal portfolio website built with **HTML5**, **CSS3**, **Vanilla JavaScript**, and an optional **Node.js + SQLite 3 backend**. It features a **built-in visual CMS, live in-place inline editing, cryptographic admin authentication, a persistent SQLite database for contact inquiries and portfolio data, and an interactive resume viewer**.

---

## 📄 View Resume Integration

The **"View Resume"** button on the hero section and navigation offers multiple ways to access Keerthan Tunkoju's resume:

1. **Direct PDF Download & Viewer**:
   - Built-in authentic PDF: [`Keerthan_Tunkoju_Resume.pdf`](file:///c:/Users/Nikhil/Desktop/Keerthan/Courses/portfolio-website/Keerthan_Tunkoju_Resume.pdf) (330 KB).
   - Direct link: `http://localhost:3000/Keerthan_Tunkoju_Resume.pdf` or local file path.
2. **Interactive Modal**:
   - Clicking **"View Resume"** opens an interactive modal with an embedded PDF reader, quick action toolbar, and download button.
3. **Dedicated Print-Friendly Web Resume**:
   - [`resume.html`](file:///c:/Users/Nikhil/Desktop/Keerthan/Courses/portfolio-website/resume.html) formatted with CSS `@media print` rules for one-click printing or PDF export.

---

## 🗄️ SQLite Database Architecture

The website includes a persistent **SQLite 3** database (`portfolio.db`) managed via `db.js` and exposed through REST API endpoints in `server.js`:

### Database Tables:
| Table Name | Description |
| :--- | :--- |
| `portfolio_content` | Stores the complete portfolio JSON state (hero, bio, experience, projects, skills, contact info). |
| `contact_messages` | Stores all incoming inquiries submitted via the website's contact form (name, email, subject, message, timestamp, status). |
| `admin_users` | Stores administrator credentials with SHA-256 password hashes. |
| `activity_logs` | Logs audit events such as portfolio content saves, message submissions, and admin logins. |

### REST API Endpoints:
- `GET /api/portfolio` — Fetches current portfolio content from SQLite (with fallback to default data).
- `POST /api/portfolio` — Saves updated portfolio content directly into SQLite `portfolio_content`.
- `POST /api/contact` — Persists a visitor's contact inquiry into SQLite `contact_messages`.
- `GET /api/messages` — Retrieves visitor messages for the Admin CMS Inbox.
- `DELETE /api/messages/:id` — Deletes a message by ID from SQLite.
- `GET /api/database/stats` — Returns real-time database diagnostics (file size, total messages, active tables, engine type).
- `POST /api/auth/login` — Verifies administrator credentials against SQLite `admin_users`.

> **Note**: If run without Node.js (e.g. on GitHub Pages or static hosts), the website automatically falls back to browser `localStorage` seamlessly.

---

## 🔐 Private Admin Access & Stealth Mode (Only for You)

The website features **Private Stealth Mode**: the Admin button and controls are **completely hidden from public visitors, recruiters, and employers**. Only you can unlock and access the admin dashboard.

### 🚪 Secret Gateways to Access Admin:
1. **Secret URL Parameter**: Add `?admin` to your website URL (e.g. `https://your-portfolio.netlify.app/?admin`). This unlocks the admin modal and saves your device as authorized.
2. **Secret Keyboard Shortcut**: Press <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>A</kbd> on Windows/Linux (or <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>A</kbd> on Mac) anytime on the site.
3. **Secret Mobile Gesture**: Tap the **`<Keerthan.dev/>`** logo **3 times rapidly** on any mobile phone or browser to trigger the admin login prompt.

| Setting | Value / Details | Notes |
| :--- | :--- | :--- |
| **Visibility** | Stealth Mode (Hidden from public) | Only reveals on authorized devices or via secret triggers |
| **Keyboard Shortcut** | <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>A</kbd> | Opens Admin Login / CMS Dashboard instantly |
| **Mobile Gesture** | Triple-tap navbar logo | Opens Admin prompt on smartphones & tablets |
| **Secret URL** | `https://your-domain/?admin` | Unlocks & authorizes your personal browser |
| **Default Username** | `admin` | Used for server-side verification |
| **Default Password** | `admin123` | Can be changed anytime in the **Security** tab |
| **Security Standard** | Web Crypto API SHA-256 | Cryptographically hashed in the browser |

---

## ✏️ How Online Editing Works

### 1. Live In-Place Visual Editing (Click-to-Edit)
1. Open the Admin prompt using any of the secret triggers above (<kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>A</kbd>, triple-tapping the logo, or `?admin`).
2. Enter the password `admin123`.
3. The **Floating Admin Toolbar** will appear across the top.
4. Toggle **Live Inline Edit** to **ON**.
5. **Click directly on any text on the website** (Hero title, intro, bio paragraphs, stats, project descriptions, skills, or contact info).
6. Edit the text naturally. When you click away (`blur`), your edits are automatically saved to SQLite / local storage with a notification toast!

### 2. Full Admin CMS Dashboard
Click **CMS Dashboard** in the admin toolbar to open the comprehensive management panel:
- **👤 Profile & Bio**: 
  - **Upload Profile Photo**: Upload a new portrait photo directly from your device (with drag & drop, client-side auto-optimization, and disk/SQLite persistence), enter a custom photo URL, or revert to the default avatar graphic.
  - Modify your name, status badge, hero intro, about paragraphs, email, phone, location, LinkedIn, and GitHub links.
- **💼 Experience Manager**: Add new job roles, edit company names and dates, update bullet points, or delete items.
- **🚀 Projects Manager**: Add new projects, customize tags, change preview color gradient themes, update GitHub/Demo links, or remove projects.
- **⚡ Skills Matrix**: Add or delete skills under each of the 4 core categories.
- **📬 Contact Inbox**: View real-time visitor messages submitted through the contact form, with sender details, timestamps, direct email reply, and deletion.
- **🗄️ Database Diagnostics**: View live SQLite database stats (`portfolio.db` file size, message count, driver info) and trigger instant database sync.
- **📦 Data & Backup**:
  - **Export JSON**: Download a full `portfolio-data.json` backup file.
  - **Copy JSON**: Copy the entire state directly to your clipboard.
  - **Import JSON**: Upload a JSON backup file to instantly restore your customizations.
  - **Reset to Defaults**: One-click restore to Keerthan Tunkoju's verified resume defaults.
- **🔐 Security**: Change your admin password with current password verification and new SHA-256 hash generation.

---

## 🚀 How to Run Locally

### With the SQLite Backend (Recommended)
1. Open a terminal in the `portfolio-website` folder:
   ```bash
   cd portfolio-website
   ```
2. Start the server (dependencies are pre-installed):
   ```bash
   npm start
   ```
   *(or `node server.js`)*
3. Visit **`http://localhost:3000`** in your browser.
4. Both the SQLite database (`portfolio.db`) and static asset hosting will be live.

### Standalone (No Node.js Required)
Simply double-click `index.html` in your file explorer. All features (Admin login, live editing, CMS modals, and theme switching) work in your browser using `localStorage`.

---

## 📱 Mobile Responsiveness

The portfolio is designed with a mobile-first responsive approach:
- **Responsive Navigation**: Collapsible hamburger drawer with touch backdrop.
- **Adaptive Layouts**: CSS Grid and Flexbox with fluid scaling (`clamp()`) across viewports from 320px smartphones to 4K displays.
- **Mobile CMS**: Admin toolbar and CMS dashboard are fully scrollable and touch-optimized for phone editing.
- **Touch-Friendly Buttons**: Minimum 44px tap targets for accessibility compliance.

---

## 🌐 Deploying Online

### A. Deploy with Dynamic SQLite Database (Render / Railway / Fly.io / VPS)
1. Push your repository to GitHub.
2. Connect your repo to [Render](https://render.com) or [Railway](https://railway.app).
3. Set Build Command: `npm install`
4. Set Start Command: `npm start`
5. Your portfolio and SQLite database will be hosted live on the web.

### B. Deploy to GitHub Pages (Static Mode)
1. Push to your repository:
   ```bash
   git init
   git add .
   git commit -m "feat: portfolio with online admin CMS, SQLite db, and resume"
   git branch -M main
   git remote add origin https://github.com/Keerthantunkoju10/<your-repo-name>.git
   git push -u origin main
   ```
2. In GitHub, go to **Settings** > **Pages** > Select branch `main` and root `/` > Click **Save**.
3. All admin and content features will operate using client-side `localStorage`.

---

## 📁 File Structure

```text
portfolio-website/
├── Assets/                    # Project screenshots and icons
├── Keerthan_Tunkoju_Resume.pdf# Authentic resume PDF (330 KB)
├── resume.html                # Print-friendly, standalone web resume
├── index.html                 # Semantic HTML5 layout, toolbar, modals, & inbox
├── style.css                  # Responsive CSS3 styles, theme variables, & CMS UI
├── script.js                  # Frontend controller: Auth, SQLite sync, CMS, & UI
├── data.js                    # Default portfolio data store & resume template
├── db.js                      # SQLite 3 database driver, schema, and queries
├── server.js                  # Node.js REST API & static file web server
├── package.json               # Node.js project manifest & dependencies (sqlite3)
├── portfolio.db               # Live SQLite database file
└── README.md                  # Comprehensive documentation and guide
```
