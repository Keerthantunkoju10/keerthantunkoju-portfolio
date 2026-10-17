/**
 * ==========================================================================
 * KEERTHAN TUNKOJU PORTFOLIO - MAIN CONTROLLER & ONLINE CMS ENGINE
 * Features:
 * 1. State Management & Dynamic Rendering (localStorage + default data fallback)
 * 2. Admin Authentication with Web Crypto SHA-256 Hashing
 * 3. Live Inline In-Place Visual Editing (contenteditable + auto-save)
 * 4. Full Admin CMS Modal with Tabbed Data Management
 * 5. Experience & Project Modals (Add, Edit, Delete)
 * 6. Skills Interactive Management
 * 7. JSON Backup (Download, Copy, Upload/Restore, Reset)
 * 8. Theme Switcher (Dark/Light mode)
 * 9. Mobile Drawer & Keyboard Accessibility (Ctrl+Shift+A)
 * 10. ScrollSpy & Contact Form Validation
 * ==========================================================================
 */

document.addEventListener('DOMContentLoaded', () => {

  /* --------------------------------------------------------------------------
     1. TOAST NOTIFICATION UTILITY
     -------------------------------------------------------------------------- */
  const toastContainer = document.getElementById('toast-container');

  const showToast = (message, type = 'info', duration = 3500) => {
    if (!toastContainer) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--status-success);flex-shrink:0;"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>';
    } else if (type === 'error') {
      iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--status-error);flex-shrink:0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>';
    } else {
      iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color:var(--accent-primary);flex-shrink:0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>';
    }

    toast.innerHTML = `${iconSvg}<span>${message}</span>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(15px)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  };


  /* --------------------------------------------------------------------------
     2. DATA STORE & STATE INITIALIZATION
     -------------------------------------------------------------------------- */
  const STORAGE_KEY = 'keerthan_portfolio_data';
  const AUTH_KEY = 'keerthan_admin_session';
  const PASSWORD_HASH_KEY = 'keerthan_admin_hash';
  // Default hash for 'Keerthan@2024'
  const DEFAULT_HASH = 'ae0d4efe0967ec0418278cd1773114afc8c546489c092e6ccfe99216eb0ef4a4';

  let portfolioData = null;
  let isEditModeActive = false;

  // Resolve backend API URL (handles cross-origin if loaded via Live Server port 5500 or port 3000)
  const getApiUrl = (endpoint) => {
    if (window.location.protocol.startsWith('http') && 
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') && 
        window.location.port !== '3000') {
      return `http://${window.location.hostname}:3000${endpoint}`;
    }
    return endpoint;
  };

  const loadPortfolioData = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        portfolioData = JSON.parse(stored);
        // Self-heal stale or broken avatar references from older browser caches
        if (!portfolioData.profile) portfolioData.profile = {};
        if (!portfolioData.profile.avatar || portfolioData.profile.avatar.includes('profile-photo.jpg')) {
          if (defaultPortfolioData && defaultPortfolioData.profile && defaultPortfolioData.profile.avatar) {
            portfolioData.profile.avatar = defaultPortfolioData.profile.avatar;
          }
        }
        // Ensure certifications array exists and is populated
        if (!portfolioData.certifications || !Array.isArray(portfolioData.certifications) || portfolioData.certifications.length === 0) {
          if (defaultPortfolioData && defaultPortfolioData.certifications) {
            portfolioData.certifications = JSON.parse(JSON.stringify(defaultPortfolioData.certifications));
          } else {
            portfolioData.certifications = [];
          }
        }
        // Self-heal stale experience if old GIS role is present from previous sessions
        if (portfolioData.experience && portfolioData.experience.some(e => (e.role && e.role.toLowerCase().includes('gis')) || (e.company && e.company.toLowerCase().includes('neogeo')))) {
          if (defaultPortfolioData && defaultPortfolioData.experience) {
            portfolioData.experience = JSON.parse(JSON.stringify(defaultPortfolioData.experience));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolioData));
          }
        }
        // Self-heal stale skills if old GIS skill category is present from previous sessions
        if (portfolioData.skills && portfolioData.skills.some(s => s.title && s.title.toLowerCase().includes('gis'))) {
          if (defaultPortfolioData && defaultPortfolioData.skills) {
            portfolioData.skills = JSON.parse(JSON.stringify(defaultPortfolioData.skills));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolioData));
          }
        }
        // Self-heal stale projects if old GIS project is present from previous sessions
        if (portfolioData.projects && portfolioData.projects.some(p => (p.title && p.title.toLowerCase().includes('spatial')) || (p.categoryBadge && p.categoryBadge.toLowerCase().includes('gis')))) {
          if (defaultPortfolioData && defaultPortfolioData.projects) {
            portfolioData.projects = JSON.parse(JSON.stringify(defaultPortfolioData.projects));
            localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolioData));
          }
        }
      } else {
        portfolioData = JSON.parse(JSON.stringify(defaultPortfolioData));
      }
    } catch (e) {
      console.error('Failed to parse portfolio data from storage, using defaults:', e);
      portfolioData = JSON.parse(JSON.stringify(defaultPortfolioData));
    }

    // Server sync: always retrieve latest saved database content so all visitors see latest edits
    if (window.location.protocol.startsWith('http')) {
      fetch(getApiUrl('/api/portfolio-data'))
        .then(res => res.ok ? res.json() : null)
        .then(serverData => {
          if (serverData && serverData.profile) {
            portfolioData = serverData;
            if (!portfolioData.certifications || !Array.isArray(portfolioData.certifications) || portfolioData.certifications.length === 0) {
              if (defaultPortfolioData && defaultPortfolioData.certifications) {
                portfolioData.certifications = JSON.parse(JSON.stringify(defaultPortfolioData.certifications));
              }
            }
            localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolioData));
            renderAll();
            if (typeof populateCmsFields === 'function') {
              populateCmsFields();
            }
          }
        })
        .catch(() => {
          // Server endpoint not present (e.g. static hosting on GitHub Pages/Netlify), purely use localStorage
        });
    }
  };

  const savePortfolioData = (silent = false) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolioData));
      if (!silent) {
        showToast('Changes saved to browser storage!', 'success');
      }

      // If running via node server.js (or reachable on port 3000), persist to SQLite database and data.js on disk
      if (window.location.protocol.startsWith('http')) {
        fetch(getApiUrl('/api/portfolio-data'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(portfolioData)
        })
        .then(res => res.ok ? res.json() : null)
        .then(resData => {
          if (resData && !silent) {
            showToast('Synchronized with database & disk for all visitors!', 'success');
          }
        })
        .catch(() => {});
      }
    } catch (e) {
      console.error('Error saving portfolio data:', e);
      showToast('Error saving data to storage.', 'error');
    }
  };

  // Helper to safely resolve nested property path (e.g. 'profile.name')
  const getNestedValue = (obj, path) => {
    return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : ''), obj);
  };

  const setNestedValue = (obj, path, value) => {
    const parts = path.split('.');
    let current = obj;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!current[parts[i]]) current[parts[i]] = {};
      current = current[parts[i]];
    }
    current[parts[parts.length - 1]] = value;
  };

  // Helper to safely convert base64 data URLs to a Blob for reliable PDF iframe and download handling
  const dataUrlToBlob = (dataUrl) => {
    try {
      const arr = dataUrl.split(',');
      if (arr.length < 2) return null;
      const mimeMatch = arr[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    } catch (e) {
      console.warn('dataUrlToBlob conversion failed:', e);
      return null;
    }
  };

  // Helper to determine if a URL, data URI, or cert object represents a PDF
  const isPdfDocument = (url, certObj = null) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    if (lower.includes('.pdf') || lower.startsWith('data:application/pdf') || lower.includes('application/pdf')) {
      return true;
    }
    if (certObj && certObj.fileType && certObj.fileType.includes('pdf')) {
      return true;
    }
    if (certObj && certObj.fileName && certObj.fileName.toLowerCase().endsWith('.pdf')) {
      return true;
    }
    if (lower.startsWith('data:') && (lower.includes('base64,jvber') || lower.includes('application/octet-stream'))) {
      return true;
    }
    return false;
  };


  /* --------------------------------------------------------------------------
     3. DYNAMIC RENDERING ENGINES
     -------------------------------------------------------------------------- */

  // A. Render Hero & Profile Details
  const renderHeroAndProfile = () => {
    const p = portfolioData.profile;
    if (!p) return;

    // Brand logos
    const navBrand = document.getElementById('nav-brand-name');
    if (navBrand) navBrand.textContent = p.name ? p.name.split(' ')[0] : 'Keerthan';

    const footerBrand = document.getElementById('footer-brand-name');
    if (footerBrand) footerBrand.textContent = p.name || 'Keerthan Tunkoju';

    const footerCopy = document.getElementById('footer-copy-name');
    if (footerCopy) footerCopy.textContent = p.name || 'Keerthan Tunkoju';

    const footerTagline = document.getElementById('footer-tagline');
    if (footerTagline) footerTagline.innerHTML = p.role || '';

    // Hero Badge & Texts
    const heroBadge = document.querySelector('[data-editable="profile.statusText"]');
    if (heroBadge) {
      heroBadge.innerHTML = `<span class="status-indicator"></span> ${p.statusText}`;
    }

    const hlStart = document.querySelector('[data-editable="profile.headlineStart"]');
    if (hlStart) hlStart.textContent = p.headlineStart || "Hi, I'm ";

    const hlAccent = document.querySelector('[data-editable="profile.headlineAccent"]');
    if (hlAccent) hlAccent.textContent = p.headlineAccent || p.name || 'Keerthan Tunkoju';

    const hlEnd = document.querySelector('[data-editable="profile.headlineEnd"]');
    if (hlEnd) hlEnd.textContent = p.headlineEnd || '.';

    const heroDesc = document.querySelector('[data-editable="profile.heroDescription"]');
    if (heroDesc) heroDesc.textContent = p.heroDescription || '';

    // About Section
    const aboutLead = document.querySelector('[data-editable="profile.aboutLead"]');
    if (aboutLead) aboutLead.textContent = p.aboutLead || '';

    const aboutP1 = document.querySelector('[data-editable="profile.aboutP1"]');
    if (aboutP1) aboutP1.textContent = p.aboutP1 || '';

    const aboutP2 = document.querySelector('[data-editable="profile.aboutP2"]');
    if (aboutP2) aboutP2.textContent = p.aboutP2 || '';

    const aboutP3 = document.querySelector('[data-editable="profile.aboutP3"]');
    if (aboutP3) aboutP3.textContent = p.aboutP3 || '';

    // Profile Photo / Avatar Rendering
    const avatarImg = document.getElementById('profile-avatar-img');
    const avatarSvg = document.getElementById('profile-avatar-svg');
    const avatarGraphic = document.getElementById('profile-avatar-graphic');

    if (avatarImg && avatarSvg) {
      if (!avatarImg.dataset.bound) {
        avatarImg.dataset.bound = 'true';
        avatarImg.addEventListener('load', () => {
          avatarImg.style.display = 'block';
          if (avatarSvg) avatarSvg.style.display = 'none';
          if (avatarGraphic) avatarGraphic.classList.add('has-image');
        });
        avatarImg.addEventListener('error', () => {
          if (!avatarImg.dataset.triedFallback) {
            avatarImg.dataset.triedFallback = 'true';
            // Attempt fallback to canonical keerthan-photo.jpg
            if (!avatarImg.src.includes('keerthan-photo.jpg')) {
              avatarImg.src = 'Assets/keerthan-photo.jpg';
              return;
            }
          }
          avatarImg.style.display = 'none';
          if (avatarSvg) avatarSvg.style.display = 'block';
          if (avatarGraphic) avatarGraphic.classList.remove('has-image');
        });
      }

      if (p.avatar && p.avatar.trim() !== '') {
        const cleanAvatar = p.avatar.trim();
        if (avatarImg.getAttribute('src') !== cleanAvatar) {
          avatarImg.src = cleanAvatar;
        }
        avatarImg.style.display = 'block';
        avatarSvg.style.display = 'none';
        if (avatarGraphic) avatarGraphic.classList.add('has-image');
      } else {
        avatarImg.src = 'Assets/keerthan-photo.jpg';
        avatarImg.style.display = 'block';
        avatarSvg.style.display = 'none';
        if (avatarGraphic) avatarGraphic.classList.add('has-image');
      }
    }

    // Stats
    const statsContainer = document.getElementById('stats-container');
    if (statsContainer && p.stats) {
      statsContainer.innerHTML = p.stats.map((stat, idx) => `
        <div class="stat-card">
          <span class="stat-number" data-editable="profile.stats.${idx}.number">${stat.number}</span>
          <span class="stat-label" data-editable="profile.stats.${idx}.label">${stat.label}</span>
        </div>
      `).join('');
    }

    // Hero Socials
    const socialsContainer = document.getElementById('hero-socials-container');
    if (socialsContainer && p.contact) {
      socialsContainer.innerHTML = `
        <a href="${p.contact.github || '#'}" target="_blank" rel="noopener noreferrer" class="social-link" aria-label="GitHub Profile">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
        </a>
        <a href="${p.contact.linkedin || '#'}" target="_blank" rel="noopener noreferrer" class="social-link" aria-label="LinkedIn Profile">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
        </a>
        <a href="mailto:${p.contact.email || ''}" class="social-link" aria-label="Send email">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
        </a>
        <a href="tel:${p.contact.phone ? p.contact.phone.replace(/\s+/g, '') : ''}" class="social-link" aria-label="Call">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
        </a>
      `;
    }

    // Contact Methods in Contact Section
    const contactMethods = document.getElementById('contact-methods-container');
    if (contactMethods && p.contact) {
      contactMethods.innerHTML = `
        <div class="contact-method-item">
          <div class="method-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
          </div>
          <div>
            <span class="method-label">Email Address</span>
            <a href="mailto:${p.contact.email}" class="method-value" data-editable="profile.contact.email">${p.contact.email}</a>
          </div>
        </div>
        <div class="contact-method-item">
          <div class="method-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
          </div>
          <div>
            <span class="method-label">Phone</span>
            <a href="tel:${p.contact.phone.replace(/\s+/g, '')}" class="method-value" data-editable="profile.contact.phone">${p.contact.phone}</a>
          </div>
        </div>
        <div class="contact-method-item">
          <div class="method-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path><rect x="2" y="9" width="4" height="12"></rect><circle cx="4" cy="4" r="2"></circle></svg>
          </div>
          <div>
            <span class="method-label">LinkedIn</span>
            <a href="${p.contact.linkedin}" target="_blank" rel="noopener noreferrer" class="method-value">${p.contact.linkedinDisplay || p.contact.linkedin}</a>
          </div>
        </div>
        <div class="contact-method-item">
          <div class="method-icon">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
          </div>
          <div>
            <span class="method-label">Location</span>
            <span class="method-value" data-editable="profile.contact.location">${p.contact.location}</span>
          </div>
        </div>
      `;
    }
  };

  // B. Render Work & Internship Experience
  const renderExperience = () => {
    const container = document.getElementById('timeline-container');
    if (!container || !portfolioData.experience) return;

    container.innerHTML = portfolioData.experience.map((exp, idx) => `
      <article class="timeline-card" data-exp-id="${exp.id}">
        <div class="timeline-meta">
          <span class="timeline-role" data-editable="experience.${idx}.role">${exp.role}</span>
          <span class="timeline-company" data-editable="experience.${idx}.company">${exp.company}</span>
          <time class="timeline-period" data-editable="experience.${idx}.period">${exp.period}</time>
        </div>
        <div class="timeline-content">
          <ul class="experience-bullets">
            ${exp.bullets.map((b, bIdx) => `
              <li data-editable="experience.${idx}.bullets.${bIdx}">${b}</li>
            `).join('')}
          </ul>
        </div>
        ${isEditModeActive ? `
          <div class="card-admin-controls">
            <button class="btn btn-sm btn-secondary btn-icon" onclick="window.editExperience('${exp.id}')">✏️ Edit Role</button>
            <button class="btn btn-sm btn-danger btn-icon" onclick="window.deleteExperience('${exp.id}')">🗑️ Delete</button>
          </div>
        ` : ''}
      </article>
    `).join('');
  };

  // C. Render Skills Matrix
  const renderSkills = () => {
    const container = document.getElementById('skills-container');
    if (!container || !portfolioData.skills) return;

    const iconSvgs = [
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="m4.93 4.93 4.24 4.24"></path><path d="m14.83 9.17 4.24-4.24"></path><path d="m14.83 14.83 4.24 4.24"></path><path d="m9.17 14.83-4.24 4.24"></path></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>',
      '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>'
    ];

    container.innerHTML = portfolioData.skills.map((cat, idx) => `
      <article class="skills-card">
        <div class="skills-card-header">
          <div class="skills-icon-wrap">
            ${iconSvgs[idx % iconSvgs.length]}
          </div>
          <h3 class="skills-category-title" data-editable="skills.${idx}.title">${cat.title}</h3>
        </div>
        <p class="skills-category-desc" data-editable="skills.${idx}.desc">${cat.desc}</p>
        <ul class="skills-tag-list" aria-label="${cat.title}">
          ${cat.tags.map((tag, tIdx) => `
            <li class="skill-tag">
              <span class="tag-bullet">●</span>
              <span data-editable="skills.${idx}.tags.${tIdx}">${tag}</span>
              ${isEditModeActive ? `
                <button class="skill-remove-btn" title="Remove tag" onclick="window.deleteSkillTag(${idx}, ${tIdx})">&times;</button>
              ` : ''}
            </li>
          `).join('')}
          ${isEditModeActive ? `
            <li>
              <button class="btn btn-sm btn-outline" onclick="window.promptAddSkillTag(${idx})">+ Add</button>
            </li>
          ` : ''}
        </ul>
      </article>
    `).join('');
  };

  // D. Render Projects Grid
  const renderProjects = () => {
    const container = document.getElementById('projects-container');
    if (!container || !portfolioData.projects) return;

    container.innerHTML = portfolioData.projects.map((proj, idx) => `
      <article class="project-card" data-proj-id="${proj.id}">
        <div class="project-preview ${proj.gradientClass || 'preview-gradient-1'}">
          <div class="project-preview-mockup">
            <span class="mockup-header-tag" data-editable="projects.${idx}.categoryBadge">${proj.categoryBadge}</span>
            <div class="mockup-lines">
              <div class="weather-temp-badge">${proj.mockupSub || 'Project Showcase'}</div>
              <div class="line line-long"></div>
              <div class="line line-medium"></div>
            </div>
          </div>
        </div>
        <div class="project-body">
          <div class="project-tags">
            ${proj.tags.map(t => `<span class="tag">${t}</span>`).join('')}
          </div>
          <h3 class="project-title" data-editable="projects.${idx}.title">${proj.title}</h3>
          <p class="project-description" data-editable="projects.${idx}.description">${proj.description}</p>
          <div class="project-links">
            ${proj.githubUrl ? `
              <a href="${proj.githubUrl}" target="_blank" rel="noopener noreferrer" class="project-link" aria-label="GitHub Repository">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
                <span>Code Repo</span>
              </a>
            ` : ''}
            ${proj.liveUrl ? `
              <a href="${proj.liveUrl}" class="project-link primary-link" aria-label="Live Demo">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                <span>View Details</span>
              </a>
            ` : ''}
          </div>
          ${isEditModeActive ? `
            <div class="card-admin-controls">
              <button class="btn btn-sm btn-secondary btn-icon" onclick="window.editProject('${proj.id}')">✏️ Edit Card</button>
              <button class="btn btn-sm btn-danger btn-icon" onclick="window.deleteProject('${proj.id}')">🗑️ Delete</button>
            </div>
          ` : ''}
        </div>
      </article>
    `).join('');
  };

  // E. Render Education & Certifications
  const renderEducation = () => {
    const container = document.getElementById('education-container');
    if (!container || !portfolioData.education) return;

    let html = portfolioData.education.map((edu, idx) => `
      <div class="education-card">
        <div class="education-badge" data-editable="education.${idx}.period">${edu.period}</div>
        <h3 class="education-degree" data-editable="education.${idx}.degree">${edu.degree}</h3>
        <h4 class="education-institute" data-editable="education.${idx}.institute">${edu.institute}</h4>
        <p class="education-score"><strong data-editable="education.${idx}.score">${edu.score}</strong></p>
        <p class="education-desc" data-editable="education.${idx}.desc">${edu.desc}</p>
      </div>
    `).join('');

    if (portfolioData.certifications && portfolioData.certifications.length > 0) {
      html += `
        <div class="education-card certifications-card">
          <div class="education-badge">Certifications &amp; Credentials</div>
          <h3 class="education-degree">Industry Certifications</h3>
          <ul class="cert-list">
            ${portfolioData.certifications.map(cert => {
              const hasFile = cert.fileUrl && cert.fileUrl.trim();
              const isPdf = hasFile && isPdfDocument(cert.fileUrl, cert);
              const badgeHtml = hasFile
                ? `<span class="cert-attached-badge">📄 ${isPdf ? 'PDF Document' : 'Attached File'}</span>`
                : `<span class="cert-attached-badge" style="background:rgba(245,158,11,0.12);color:var(--status-warning);border-color:rgba(245,158,11,0.25);">⭐ Verified Credential</span>`;

              return `
              <li class="cert-item" data-cert-id="${cert.id}" onclick="window.openCertPreview('${cert.id}')" tabindex="0" role="button" aria-label="View ${cert.title} Certificate">
                <div class="cert-item-main">
                  <svg class="cert-check-icon" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                  <div class="cert-info">
                    <strong class="cert-title">${cert.title}</strong>
                    <div class="cert-meta">
                      <span>${cert.org} (${cert.year})</span>
                      ${badgeHtml}
                    </div>
                  </div>
                </div>
                <div class="cert-item-actions">
                  <button type="button" class="btn btn-sm btn-outline cert-view-btn" onclick="event.stopPropagation(); window.openCertPreview('${cert.id}')" title="View Certificate Document">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                    <span>View Certificate</span>
                  </button>
                </div>
              </li>
              `;
            }).join('')}
          </ul>
        </div>
      `;
    }

    container.innerHTML = html;

    // Attach keyboard handlers to certificate items for accessibility
    container.querySelectorAll('.cert-item').forEach(item => {
      const certId = item.getAttribute('data-cert-id');
      if (!certId) return;

      item.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          window.openCertPreview(certId);
        }
      });
    });
  };

  // Master Render Function
  const renderAll = () => {
    renderHeroAndProfile();
    renderExperience();
    renderSkills();
    renderProjects();
    renderEducation();
    bindEditableListeners();
  };


  /* --------------------------------------------------------------------------
     4. ADMIN AUTHENTICATION ENGINE (Web Crypto SHA-256 & Stealth Mode)
     -------------------------------------------------------------------------- */
  const adminTriggerBtn = document.getElementById('admin-trigger-btn');
  const adminToolbar = document.getElementById('admin-toolbar');
  const adminLoginModal = document.getElementById('admin-login-modal');
  const adminLoginForm = document.getElementById('admin-login-form');
  const adminPasswordInput = document.getElementById('admin-password');
  const loginErrorMsg = document.getElementById('login-error-msg');
  const togglePassBtn = document.getElementById('toggle-password-visibility');
  const adminLogoutBtn = document.getElementById('admin-logout-btn');
  const editModeCheckbox = document.getElementById('edit-mode-checkbox');
  const editModeStatus = document.getElementById('edit-mode-status');

  const ADMIN_DEVICE_KEY = 'portfolio_admin_device_authorized';
  const ADMIN_TIMEOUT_SECONDS = 20;
  let adminLoginTimerInterval = null;
  let adminLoginSecondsRemaining = ADMIN_TIMEOUT_SECONDS;

  const adminTimerWrap = document.getElementById('admin-login-timer-wrap');
  const adminTimerCountdown = document.getElementById('admin-timer-countdown');
  const adminTimerProgress = document.getElementById('admin-timer-progress');
  const adminBtnTimerBadge = document.getElementById('admin-btn-timer-badge');

  const updateTimerDisplay = (seconds) => {
    if (adminTimerCountdown) {
      adminTimerCountdown.textContent = `${seconds}s`;
    }
    if (adminTimerProgress) {
      const pct = Math.max(0, (seconds / ADMIN_TIMEOUT_SECONDS) * 100);
      adminTimerProgress.style.width = `${pct}%`;
    }
    if (adminTimerWrap) {
      if (seconds <= 5) {
        adminTimerWrap.classList.add('urgent');
      } else {
        adminTimerWrap.classList.remove('urgent');
      }
    }
    if (adminBtnTimerBadge) {
      adminBtnTimerBadge.textContent = `${seconds}s`;
      if (!isUserAuthenticated() && adminTriggerBtn && adminTriggerBtn.style.display !== 'none' && !adminTriggerBtn.classList.contains('admin-hidden')) {
        adminBtnTimerBadge.style.display = 'inline-block';
      } else {
        adminBtnTimerBadge.style.display = 'none';
      }
    }
  };

  const stopAdminLoginTimer = () => {
    if (adminLoginTimerInterval) {
      clearInterval(adminLoginTimerInterval);
      adminLoginTimerInterval = null;
    }
    if (adminBtnTimerBadge) {
      adminBtnTimerBadge.style.display = 'none';
    }
    if (adminTimerWrap) {
      adminTimerWrap.classList.remove('urgent');
    }
  };

  const startAdminLoginTimer = () => {
    stopAdminLoginTimer();
    adminLoginSecondsRemaining = ADMIN_TIMEOUT_SECONDS;
    updateTimerDisplay(adminLoginSecondsRemaining);

    adminLoginTimerInterval = setInterval(() => {
      if (isUserAuthenticated()) {
        stopAdminLoginTimer();
        return;
      }

      adminLoginSecondsRemaining--;
      updateTimerDisplay(adminLoginSecondsRemaining);

      if (adminLoginSecondsRemaining <= 0) {
        stopAdminLoginTimer();
        closeModal(adminLoginModal);
        if (adminLoginForm) adminLoginForm.reset();
        if (loginErrorMsg) loginErrorMsg.textContent = '';

        if (!isUserAuthenticated()) {
          localStorage.removeItem(ADMIN_DEVICE_KEY);
          if (adminTriggerBtn) {
            adminTriggerBtn.classList.add('admin-hidden');
            adminTriggerBtn.style.display = 'none';
          }
          if (adminBtnTimerBadge) {
            adminBtnTimerBadge.style.display = 'none';
          }
          updateAdminUI();
          showToast('⏱️ Admin login window timed out (20s limit). Admin option locked.', 'error', 4500);
        }
      }
    }, 1000);
  };

  const openAdminLoginModalWithTimer = () => {
    if (isUserAuthenticated()) {
      openModal(document.getElementById('admin-cms-modal'));
      populateCmsFields();
      return;
    }

    if (adminLoginForm) adminLoginForm.reset();
    if (loginErrorMsg) loginErrorMsg.textContent = '';
    openModal(adminLoginModal);
    startAdminLoginTimer();
    setTimeout(() => adminPasswordInput && adminPasswordInput.focus(), 150);
  };

  // Compute SHA-256 hex string using browser-native subtle crypto
  const sha256 = async (message) => {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const getStoredHash = () => {
    const stored = localStorage.getItem(PASSWORD_HASH_KEY);
    // Automatically migrate from old default 'admin123' hash if present in browser storage
    if (!stored || stored === '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9') {
      localStorage.setItem(PASSWORD_HASH_KEY, DEFAULT_HASH);
      return DEFAULT_HASH;
    }
    return stored;
  };

  const setStoredHash = (newHash) => {
    localStorage.setItem(PASSWORD_HASH_KEY, newHash);
  };

  const isUserAuthenticated = () => {
    return sessionStorage.getItem(AUTH_KEY) === 'true';
  };

  const isAuthorizedAdminDevice = () => {
    return isUserAuthenticated() || localStorage.getItem(ADMIN_DEVICE_KEY) === 'true';
  };

  const updateStealthButtonState = () => {
    const btn = document.getElementById('toggle-device-stealth-btn');
    const badge = document.getElementById('stealth-status-badge');
    const urlDisplay = document.getElementById('secret-url-display');
    const isAuth = localStorage.getItem(ADMIN_DEVICE_KEY) === 'true';

    if (urlDisplay) {
      const origin = window.location.origin && window.location.origin !== 'null' ? window.location.origin : '';
      const pathname = window.location.pathname || '';
      urlDisplay.textContent = origin + pathname + '?admin';
    }

    if (btn) {
      btn.textContent = isAuth
        ? 'Hide Admin Button on This Device (100% Stealth Mode)'
        : 'Keep Admin Button Visible on This Device';
    }

    if (badge) {
      if (isAuth) {
        badge.textContent = '🔒 Stealth Active (Button visible on this device only)';
      } else {
        badge.textContent = '🔒 Pure Stealth Mode (Button completely hidden on all devices)';
      }
    }
  };

  const updateAdminUI = () => {
    const authenticated = isUserAuthenticated();
    const isAuthDevice = isAuthorizedAdminDevice();

    if (adminToolbar) {
      adminToolbar.hidden = !authenticated;
    }

    if (adminTriggerBtn) {
      if (authenticated) {
        adminTriggerBtn.classList.remove('admin-hidden');
        adminTriggerBtn.style.display = 'inline-flex';
        adminTriggerBtn.classList.add('active');
        adminTriggerBtn.title = 'Admin Active (Click for CMS Dashboard)';
        if (adminBtnTimerBadge) adminBtnTimerBadge.style.display = 'none';
      } else if (isAuthDevice) {
        adminTriggerBtn.classList.remove('admin-hidden');
        adminTriggerBtn.style.display = 'inline-flex';
        adminTriggerBtn.classList.remove('active');
        adminTriggerBtn.title = 'Admin Login (Ctrl+Shift+A)';
      } else {
        adminTriggerBtn.classList.add('admin-hidden');
        adminTriggerBtn.style.display = 'none';
        if (adminBtnTimerBadge) adminBtnTimerBadge.style.display = 'none';
      }
    }

    // Toggle admin-only section elements
    document.querySelectorAll('[data-admin-only]').forEach(el => {
      el.hidden = !authenticated;
    });

    if (!authenticated && isEditModeActive) {
      setEditMode(false);
    }

    updateStealthButtonState();
  };

  const loginAdmin = async (password) => {
    if (!password) return;
    const computedHash = await sha256(password);
    const currentHash = getStoredHash();

    if (computedHash === currentHash) {
      stopAdminLoginTimer();
      sessionStorage.setItem(AUTH_KEY, 'true');
      localStorage.setItem(ADMIN_DEVICE_KEY, 'true'); // Authorize device upon login
      if (loginErrorMsg) loginErrorMsg.textContent = '';
      closeModal(adminLoginModal);
      if (adminLoginForm) adminLoginForm.reset();
      updateAdminUI();
      // Automatically turn on edit mode for convenient in-place editing
      setEditMode(true);
      showToast('Authenticated as Admin! Visual Edit Mode is now ON.', 'success');
    } else {
      if (loginErrorMsg) {
        loginErrorMsg.textContent = 'Incorrect admin password.';
      }
      showToast('Authentication failed: Invalid password.', 'error');
    }
  };

  const logoutAdmin = () => {
    stopAdminLoginTimer();
    sessionStorage.removeItem(AUTH_KEY);
    localStorage.removeItem(ADMIN_DEVICE_KEY);
    setEditMode(false);
    updateAdminUI();
    showToast('Logged out from admin session.', 'info');
  };

  // Check secret URL parameters on page load (?admin, ?keerthan, #admin)
  const checkSecretUrlGateway = () => {
    const params = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    if (params.has('admin') || params.has('keerthan') || hash === '#admin') {
      localStorage.setItem(ADMIN_DEVICE_KEY, 'true');
      updateAdminUI();

      setTimeout(() => {
        if (isUserAuthenticated()) {
          openModal(document.getElementById('admin-cms-modal'));
          populateCmsFields();
        } else {
          openAdminLoginModalWithTimer();
        }
        showToast('🔒 Admin gateway unlocked (20s login timer active).', 'info', 2500);
      }, 350);

      // Clean address bar so the query string doesn't remain visible
      if (window.history && window.history.replaceState) {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      }
    }
  };

  // Secret Gesture: Triple-click / tap on logo for mobile & desktop stealth access
  const navBrandLogo = document.getElementById('nav-brand-logo');
  let logoTapCount = 0;
  let logoTapTimer = null;

  if (navBrandLogo) {
    const handleSecretLogoTap = (e) => {
      logoTapCount++;
      clearTimeout(logoTapTimer);
      logoTapTimer = setTimeout(() => {
        logoTapCount = 0;
      }, 1200);

      if (logoTapCount >= 3) {
        logoTapCount = 0;
        e.preventDefault();
        localStorage.setItem(ADMIN_DEVICE_KEY, 'true');
        updateAdminUI();

        if (isUserAuthenticated()) {
          openModal(document.getElementById('admin-cms-modal'));
          populateCmsFields();
        } else {
          openAdminLoginModalWithTimer();
        }
        showToast('🔒 Admin gateway unlocked (20s login timer active).', 'info', 2500);
      }
    };

    navBrandLogo.addEventListener('click', handleSecretLogoTap);
  }

  // Keyboard shortcut: Ctrl + Shift + A (or Cmd + Shift + A) to toggle Admin
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'A' || e.key === 'a')) {
      e.preventDefault();
      localStorage.setItem(ADMIN_DEVICE_KEY, 'true');
      updateAdminUI();

      if (isUserAuthenticated()) {
        openModal(document.getElementById('admin-cms-modal'));
        populateCmsFields();
      } else {
        openAdminLoginModalWithTimer();
      }
      showToast('🔒 Admin gateway opened (20s login timer active).', 'info', 2000);
    }
  });

  // Listeners for Auth
  if (adminTriggerBtn) {
    adminTriggerBtn.addEventListener('click', () => {
      if (isUserAuthenticated()) {
        openModal(document.getElementById('admin-cms-modal'));
        populateCmsFields();
      } else {
        openAdminLoginModalWithTimer();
      }
    });
  }

  if (adminLoginForm) {
    adminLoginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      loginAdmin(adminPasswordInput.value.trim());
    });
  }

  if (togglePassBtn && adminPasswordInput) {
    togglePassBtn.addEventListener('click', () => {
      const type = adminPasswordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      adminPasswordInput.setAttribute('type', type);
    });
  }

  if (adminLogoutBtn) {
    adminLogoutBtn.addEventListener('click', logoutAdmin);
  }

  // Stealth toggle button in CMS Security Tab
  const toggleDeviceStealthBtn = document.getElementById('toggle-device-stealth-btn');
  if (toggleDeviceStealthBtn) {
    toggleDeviceStealthBtn.addEventListener('click', () => {
      const isAuth = localStorage.getItem(ADMIN_DEVICE_KEY) === 'true';
      if (isAuth) {
        localStorage.removeItem(ADMIN_DEVICE_KEY);
        updateAdminUI();
        showToast('Admin button is now 100% hidden on this device.', 'info');
      } else {
        localStorage.setItem(ADMIN_DEVICE_KEY, 'true');
        updateAdminUI();
        showToast('Admin button is now visible on this device.', 'success');
      }
    });
  }

  // Copy secret admin URL button
  const copySecretUrlBtn = document.getElementById('copy-secret-url-btn');
  if (copySecretUrlBtn) {
    copySecretUrlBtn.addEventListener('click', () => {
      const origin = window.location.origin && window.location.origin !== 'null' ? window.location.origin : 'https://your-domain.netlify.app';
      const pathname = window.location.pathname || '';
      const url = origin + pathname + '?admin';
      navigator.clipboard.writeText(url).then(() => {
        showToast('Secret admin URL copied to clipboard!', 'success');
      }).catch(() => {
        prompt('Copy your secret admin URL:', url);
      });
    });
  }

  // Run secret URL check on script execution
  checkSecretUrlGateway();


  /* --------------------------------------------------------------------------
     5. LIVE IN-PLACE INLINE VISUAL EDITING ENGINE
     -------------------------------------------------------------------------- */
  const setEditMode = (active) => {
    isEditModeActive = active;
    document.body.classList.toggle('edit-mode-active', active);

    if (editModeCheckbox) editModeCheckbox.checked = active;
    if (editModeStatus) {
      editModeStatus.textContent = active ? 'ON' : 'OFF';
      editModeStatus.style.color = active ? 'var(--status-success)' : 'inherit';
    }

    // Re-render cards so admin edit/delete buttons appear/disappear
    renderExperience();
    renderSkills();
    renderProjects();
    bindEditableListeners();

    if (active) {
      showToast('Edit Mode active! Click any text on the page to edit directly.', 'info');
    }
  };

  if (editModeCheckbox) {
    editModeCheckbox.addEventListener('change', (e) => {
      setEditMode(e.target.checked);
    });
  }

  // Bind blur & input events to all [data-editable] elements
  const bindEditableListeners = () => {
    const editables = document.querySelectorAll('[data-editable]');
    editables.forEach(el => {
      el.contentEditable = isEditModeActive ? 'true' : 'false';

      // Avoid duplicating blur listeners
      el.removeEventListener('blur', handleEditableBlur);
      if (isEditModeActive) {
        el.addEventListener('blur', handleEditableBlur);
      }
    });
  };

  const handleEditableBlur = (e) => {
    const el = e.target;
    const path = el.getAttribute('data-editable');
    if (!path) return;

    const newValue = el.innerText.trim();
    setNestedValue(portfolioData, path, newValue);
    savePortfolioData(true);
    showToast(`Updated "${path.split('.').pop()}"`, 'success', 2000);
  };

  // Top Bar Save Button
  const saveDataBtn = document.getElementById('save-data-btn');
  if (saveDataBtn) {
    saveDataBtn.addEventListener('click', () => {
      savePortfolioData(false);
    });
  }


  /* --------------------------------------------------------------------------
     6. CMS DASHBOARD MODAL & TAB SYSTEM
     -------------------------------------------------------------------------- */
  const cmsModal = document.getElementById('admin-cms-modal');
  const openCmsBtn = document.getElementById('open-cms-btn');
  const tabBtns = document.querySelectorAll('.cms-tab-btn');
  const tabPanes = document.querySelectorAll('.cms-tab-pane');

  if (openCmsBtn) {
    openCmsBtn.addEventListener('click', () => {
      openModal(cmsModal);
      populateCmsFields();
    });
  }

  // Tab switching
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPane = document.getElementById(btn.getAttribute('data-tab'));
      if (targetPane) targetPane.classList.add('active');
    });
  });

  // Populate CMS Fields from Data
  const populateCmsFields = () => {
    const p = portfolioData.profile;
    if (p) {
      const setVal = (id, val) => {
        const input = document.getElementById(id);
        if (input) input.value = val || '';
      };

      setVal('cms-name', p.name);
      setVal('cms-status', p.statusText);
      setVal('cms-hero-desc', p.heroDescription);
      setVal('cms-about-lead', p.aboutLead);
      setVal('cms-about-p1', p.aboutP1);
      setVal('cms-about-p2', p.aboutP2);
      setVal('cms-about-p3', p.aboutP3);
      if (p.contact) {
        setVal('cms-email', p.contact.email);
        setVal('cms-phone', p.contact.phone);
        setVal('cms-location', p.contact.location);
        setVal('cms-linkedin', p.contact.linkedin);
        setVal('cms-github', p.contact.github);
      }
      updateCmsPhotoPreview(p.avatar);
    }

    // Populate Experience List in CMS
    const expList = document.getElementById('cms-exp-list');
    if (expList && portfolioData.experience) {
      expList.innerHTML = portfolioData.experience.map(exp => `
        <div class="cms-item-row">
          <div class="cms-item-info">
            <span class="cms-item-title">${exp.role} @ ${exp.company}</span>
            <span class="cms-item-sub">${exp.period} &bull; ${exp.bullets.length} bullet points</span>
          </div>
          <div class="cms-item-actions">
            <button class="btn btn-sm btn-secondary" onclick="window.editExperience('${exp.id}')">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="window.deleteExperience('${exp.id}')">Delete</button>
          </div>
        </div>
      `).join('');
    }

    // Populate Projects List in CMS
    const projList = document.getElementById('cms-proj-list');
    if (projList && portfolioData.projects) {
      projList.innerHTML = portfolioData.projects.map(proj => `
        <div class="cms-item-row">
          <div class="cms-item-info">
            <span class="cms-item-title">${proj.title}</span>
            <span class="cms-item-sub">${proj.categoryBadge} &bull; ${proj.tags.join(', ')}</span>
          </div>
          <div class="cms-item-actions">
            <button class="btn btn-sm btn-secondary" onclick="window.editProject('${proj.id}')">Edit</button>
            <button class="btn btn-sm btn-danger" onclick="window.deleteProject('${proj.id}')">Delete</button>
          </div>
        </div>
      `).join('');
    }

    // Populate Skills Editor in CMS
    const skillsEditor = document.getElementById('cms-skills-editor');
    if (skillsEditor && portfolioData.skills) {
      skillsEditor.innerHTML = portfolioData.skills.map((cat, catIdx) => `
        <div class="cms-skills-cat-card">
          <h5 class="cms-skills-cat-title">${cat.title}</h5>
          <div class="cms-skills-chip-list">
            ${cat.tags.map((t, tIdx) => `
              <span class="cms-skill-chip">
                ${t}
                <button class="skill-remove-btn" onclick="window.deleteSkillTag(${catIdx}, ${tIdx})">&times;</button>
              </span>
            `).join('')}
          </div>
          <div class="cms-add-skill-row">
            <input type="text" id="add-skill-input-${catIdx}" class="form-input" placeholder="Add new skill..." style="padding:0.4rem 0.6rem;font-size:0.8rem;">
            <button class="btn btn-sm btn-primary" onclick="window.addSkillFromInput(${catIdx})">Add</button>
          </div>
        </div>
      `).join('');
    }

    // Populate Certifications in CMS
    const certCountSpan = document.getElementById('cms-cert-count');
    if (certCountSpan) {
      certCountSpan.textContent = (portfolioData.certifications || []).length;
    }

    const certList = document.getElementById('cms-cert-list');
    if (certList && portfolioData.certifications) {
      if (portfolioData.certifications.length === 0) {
        certList.innerHTML = '<div class="empty-state">No certifications added yet. Click "+ Add Certification" to create one.</div>';
      } else {
        certList.innerHTML = portfolioData.certifications.map(cert => `
          <div class="cms-item-row" data-cert-id="${cert.id}">
            <div class="cms-item-info">
              <span class="cms-item-title">${cert.title}</span>
              <span class="cms-item-sub">
                ${cert.org} (${cert.year}) 
                ${cert.fileUrl ? '&bull; <span class="cert-file-badge">📄 Attached</span>' : '&bull; <span class="cert-file-badge badge-none">Digital Parchment</span>'}
              </span>
            </div>
            <div class="cms-item-actions">
              <button class="btn btn-sm btn-outline" onclick="window.openCertPreview('${cert.id}')">Preview</button>
              <button class="btn btn-sm btn-secondary" onclick="window.editCertification('${cert.id}')">Edit</button>
              <button class="btn btn-sm btn-danger" onclick="window.deleteCertification('${cert.id}')">Delete</button>
            </div>
          </div>
        `).join('');
      }
    }

    // Refresh database messages and diagnostics
    fetchMessagesFromDb();
    fetchDbStats();
  };

  // Profile Photo Utilities & Handlers
  const updateCmsPhotoPreview = (avatarUrl) => {
    const previewImg = document.getElementById('cms-avatar-preview-img');
    const previewPlaceholder = document.getElementById('cms-avatar-preview-placeholder');
    const statusBadge = document.getElementById('cms-photo-status-badge');
    const urlInput = document.getElementById('cms-photo-url-input');

    if (avatarUrl && avatarUrl.trim() !== '') {
      if (previewImg) {
        previewImg.src = avatarUrl;
        previewImg.style.display = 'block';
      }
      if (previewPlaceholder) previewPlaceholder.style.display = 'none';
      if (statusBadge) {
        statusBadge.textContent = 'Active Photo';
        statusBadge.classList.add('active-photo');
      }
      if (urlInput) urlInput.value = avatarUrl;
    } else {
      if (previewImg) {
        previewImg.src = '';
        previewImg.style.display = 'none';
      }
      if (previewPlaceholder) previewPlaceholder.style.display = 'flex';
      if (statusBadge) {
        statusBadge.textContent = 'Default Avatar';
        statusBadge.classList.remove('active-photo');
      }
      if (urlInput) urlInput.value = '';
    }
  };

  const processAndOptimizeImage = (file, maxWidth = 800, maxHeight = 800, quality = 0.88) => {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) {
        return reject(new Error('Please select a valid image file (JPG, PNG, WebP).'));
      }
      if (file.size > 10 * 1024 * 1024) {
        return reject(new Error('Image file is too large. Please select an image under 10MB.'));
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            if (width > height) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            } else {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
          const dataUrl = canvas.toDataURL(mime, quality);
          resolve({ dataUrl, filename: file.name });
        };
        img.onerror = () => reject(new Error('Failed to load image for processing.'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsDataURL(file);
    });
  };

  const handlePhotoUpload = async (file) => {
    if (!file) return;
    try {
      showToast('Processing photo...', 'info', 1500);
      const { dataUrl, filename } = await processAndOptimizeImage(file);

      let finalAvatarUrl = dataUrl;
      let serverSaved = false;

      // Try to save to server if online
      if (window.location.protocol.startsWith('http')) {
        try {
          const res = await fetch(getApiUrl('/api/upload-photo'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ photoBase64: dataUrl, filename })
          });
          if (res.ok) {
            const json = await res.json();
            if (json.photoUrl) {
              finalAvatarUrl = json.photoUrl;
              serverSaved = true;
            }
          }
        } catch (e) {
          console.warn('Server upload unavailable, falling back to client storage.', e);
        }
      }

      if (!portfolioData.profile) portfolioData.profile = {};
      portfolioData.profile.avatar = finalAvatarUrl;
      updateCmsPhotoPreview(finalAvatarUrl);
      savePortfolioData(true);
      renderAll();

      if (serverSaved) {
        showToast('Profile photo saved to backend & visible for all visitors!', 'success', 3500);
      } else {
        showToast('Saved to browser preview. (To publish permanently for all Netlify visitors, push your committed photo to Git)', 'info', 5000);
      }
    } catch (err) {
      showToast(err.message || 'Error uploading photo', 'error');
    }
  };

  // Wire photo upload buttons
  const photoUploadBtn = document.getElementById('cms-photo-upload-btn');
  const photoFileInput = document.getElementById('cms-photo-file-input');
  const photoPreview = document.getElementById('cms-photo-preview');
  const photoRemoveBtn = document.getElementById('cms-photo-remove-btn');
  const photoUrlInput = document.getElementById('cms-photo-url-input');
  const photoUrlApplyBtn = document.getElementById('cms-photo-url-apply-btn');

  if (photoUploadBtn && photoFileInput) {
    photoUploadBtn.addEventListener('click', () => photoFileInput.click());
  }

  if (photoPreview && photoFileInput) {
    photoPreview.addEventListener('click', (e) => {
      if (e.target.tagName !== 'BUTTON' && !e.target.closest('button')) {
        photoFileInput.click();
      }
    });

    // Drag and drop support
    photoPreview.addEventListener('dragover', (e) => {
      e.preventDefault();
      photoPreview.classList.add('dragover');
    });
    photoPreview.addEventListener('dragleave', () => {
      photoPreview.classList.remove('dragover');
    });
    photoPreview.addEventListener('drop', (e) => {
      e.preventDefault();
      photoPreview.classList.remove('dragover');
      if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
        handlePhotoUpload(e.dataTransfer.files[0]);
      }
    });
  }

  if (photoFileInput) {
    photoFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handlePhotoUpload(e.target.files[0]);
      }
    });
  }

  if (photoRemoveBtn) {
    photoRemoveBtn.addEventListener('click', () => {
      if (!confirm('Revert profile photo to the default graphic avatar?')) return;
      if (!portfolioData.profile) portfolioData.profile = {};
      portfolioData.profile.avatar = '';
      if (photoFileInput) photoFileInput.value = '';
      updateCmsPhotoPreview('');
      savePortfolioData();
      renderAll();
      showToast('Profile photo removed (default graphic restored).', 'info');
    });
  }

  if (photoUrlApplyBtn && photoUrlInput) {
    photoUrlApplyBtn.addEventListener('click', () => {
      const url = photoUrlInput.value.trim();
      if (!portfolioData.profile) portfolioData.profile = {};
      portfolioData.profile.avatar = url;
      updateCmsPhotoPreview(url);
      savePortfolioData();
      renderAll();
      showToast(url ? 'Profile photo URL applied!' : 'Profile photo cleared.', 'success');
    });
  }

  // CMS Profile Form Submit
  const cmsProfileForm = document.getElementById('cms-profile-form');
  if (cmsProfileForm) {
    cmsProfileForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const p = portfolioData.profile;
      p.name = document.getElementById('cms-name').value.trim();
      p.statusText = document.getElementById('cms-status').value.trim();
      p.heroDescription = document.getElementById('cms-hero-desc').value.trim();
      p.aboutLead = document.getElementById('cms-about-lead').value.trim();
      p.aboutP1 = document.getElementById('cms-about-p1').value.trim();
      p.aboutP2 = document.getElementById('cms-about-p2').value.trim();
      p.aboutP3 = document.getElementById('cms-about-p3').value.trim();

      if (!p.contact) p.contact = {};
      p.contact.email = document.getElementById('cms-email').value.trim();
      p.contact.phone = document.getElementById('cms-phone').value.trim();
      p.contact.location = document.getElementById('cms-location').value.trim();
      p.contact.linkedin = document.getElementById('cms-linkedin').value.trim();
      p.contact.github = document.getElementById('cms-github').value.trim();

      const photoUrlField = document.getElementById('cms-photo-url-input');
      if (photoUrlField && photoUrlField.value.trim() && photoUrlField.value.trim() !== p.avatar) {
        p.avatar = photoUrlField.value.trim();
      }

      savePortfolioData();
      renderAll();
      showToast('Profile information successfully updated!', 'success');
    });
  }


  /* --------------------------------------------------------------------------
     7. EXPERIENCE & PROJECT MODAL MANAGERS
     -------------------------------------------------------------------------- */
  const expModal = document.getElementById('exp-edit-modal');
  const expForm = document.getElementById('exp-edit-form');
  const projModal = document.getElementById('proj-edit-modal');
  const projForm = document.getElementById('proj-edit-form');

  // Global methods for card inline buttons
  window.editExperience = (id) => {
    const exp = portfolioData.experience.find(e => e.id === id);
    if (!exp) return;

    document.getElementById('exp-id').value = exp.id;
    document.getElementById('exp-role').value = exp.role;
    document.getElementById('exp-company').value = exp.company;
    document.getElementById('exp-period').value = exp.period;
    document.getElementById('exp-bullets').value = exp.bullets.join('\n');
    document.getElementById('exp-modal-title').textContent = 'Edit Work Experience';

    openModal(expModal);
  };

  window.deleteExperience = (id) => {
    if (!confirm('Are you sure you want to delete this experience role?')) return;
    portfolioData.experience = portfolioData.experience.filter(e => e.id !== id);
    savePortfolioData();
    renderExperience();
    populateCmsFields();
    showToast('Role deleted successfully.', 'info');
  };

  const cmsAddExpBtn = document.getElementById('cms-add-exp-btn');
  const openNewExpModal = () => {
    if (expForm) expForm.reset();
    document.getElementById('exp-id').value = '';
    document.getElementById('exp-modal-title').textContent = 'Add New Work Experience';
    openModal(expModal);
  };
  if (cmsAddExpBtn) cmsAddExpBtn.addEventListener('click', openNewExpModal);

  if (expForm) {
    expForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('exp-id').value;
      const role = document.getElementById('exp-role').value.trim();
      const company = document.getElementById('exp-company').value.trim();
      const period = document.getElementById('exp-period').value.trim();
      const bullets = document.getElementById('exp-bullets').value
        .split('\n')
        .map(b => b.trim())
        .filter(b => b.length > 0);

      if (id) {
        // Update existing
        const item = portfolioData.experience.find(x => x.id === id);
        if (item) {
          item.role = role;
          item.company = company;
          item.period = period;
          item.bullets = bullets;
        }
      } else {
        // Add new
        portfolioData.experience.unshift({
          id: 'exp-' + Date.now(),
          role,
          company,
          period,
          bullets
        });
      }

      savePortfolioData();
      renderExperience();
      populateCmsFields();
      closeModal(expModal);
      showToast('Experience successfully saved!', 'success');
    });
  }

  // Projects Modal Management
  window.editProject = (id) => {
    const proj = portfolioData.projects.find(p => p.id === id);
    if (!proj) return;

    document.getElementById('proj-id').value = proj.id;
    document.getElementById('proj-title').value = proj.title;
    document.getElementById('proj-category').value = proj.categoryBadge;
    document.getElementById('proj-theme').value = proj.gradientClass || 'preview-gradient-1';
    document.getElementById('proj-tags').value = proj.tags.join(', ');
    document.getElementById('proj-desc').value = proj.description;
    document.getElementById('proj-github').value = proj.githubUrl || '';
    document.getElementById('proj-live').value = proj.liveUrl || '';
    document.getElementById('proj-modal-title').textContent = 'Edit Project';

    openModal(projModal);
  };

  window.deleteProject = (id) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    portfolioData.projects = portfolioData.projects.filter(p => p.id !== id);
    savePortfolioData();
    renderProjects();
    populateCmsFields();
    showToast('Project deleted successfully.', 'info');
  };

  const cmsAddProjBtn = document.getElementById('cms-add-proj-btn');
  const openNewProjModal = () => {
    if (projForm) projForm.reset();
    document.getElementById('proj-id').value = '';
    document.getElementById('proj-modal-title').textContent = 'Add New Project';
    openModal(projModal);
  };
  if (cmsAddProjBtn) cmsAddProjBtn.addEventListener('click', openNewProjModal);

  if (projForm) {
    projForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('proj-id').value;
      const title = document.getElementById('proj-title').value.trim();
      const categoryBadge = document.getElementById('proj-category').value.trim();
      const gradientClass = document.getElementById('proj-theme').value;
      const tags = document.getElementById('proj-tags').value
        .split(',')
        .map(t => t.trim())
        .filter(t => t.length > 0);
      const description = document.getElementById('proj-desc').value.trim();
      const githubUrl = document.getElementById('proj-github').value.trim();
      const liveUrl = document.getElementById('proj-live').value.trim();

      if (id) {
        const item = portfolioData.projects.find(x => x.id === id);
        if (item) {
          item.title = title;
          item.categoryBadge = categoryBadge;
          item.gradientClass = gradientClass;
          item.tags = tags;
          item.description = description;
          item.githubUrl = githubUrl;
          item.liveUrl = liveUrl;
        }
      } else {
        portfolioData.projects.push({
          id: 'proj-' + Date.now(),
          title,
          categoryBadge,
          mockupSub: categoryBadge,
          gradientClass,
          tags,
          description,
          githubUrl,
          liveUrl
        });
      }

      savePortfolioData();
      renderProjects();
      populateCmsFields();
      closeModal(projModal);
      showToast('Project successfully saved!', 'success');
    });
  }

  // Skills tag modifications
  window.deleteSkillTag = (catIdx, tagIdx) => {
    if (portfolioData.skills && portfolioData.skills[catIdx]) {
      portfolioData.skills[catIdx].tags.splice(tagIdx, 1);
      savePortfolioData();
      renderSkills();
      populateCmsFields();
    }
  };

  window.promptAddSkillTag = (catIdx) => {
    const newTag = prompt(`Enter new skill for "${portfolioData.skills[catIdx].title}":`);
    if (newTag && newTag.trim()) {
      portfolioData.skills[catIdx].tags.push(newTag.trim());
      savePortfolioData();
      renderSkills();
      populateCmsFields();
      showToast('Skill added!', 'success');
    }
  };

  window.addSkillFromInput = (catIdx) => {
    const input = document.getElementById(`add-skill-input-${catIdx}`);
    if (input && input.value.trim()) {
      portfolioData.skills[catIdx].tags.push(input.value.trim());
      input.value = '';
      savePortfolioData();
      renderSkills();
      populateCmsFields();
      showToast('Skill added!', 'success');
    }
  };


  /* --------------------------------------------------------------------------
     7b. CERTIFICATIONS CMS MANAGEMENT & MODAL CONTROLLER
     -------------------------------------------------------------------------- */
  const certModal = document.getElementById('cert-edit-modal');
  const certForm = document.getElementById('cert-edit-form');
  const cmsAddCertBtn = document.getElementById('cms-add-cert-btn');
  const certFileInput = document.getElementById('cert-file-input');
  const certUploadBtn = document.getElementById('cert-upload-btn');
  const certRemoveFileBtn = document.getElementById('cert-remove-file-btn');
  const certFileStatusText = document.getElementById('cert-file-status-text');
  const certFileUrlInput = document.getElementById('cert-file-url');

  // State tracking for selected certificate file metadata and active Blob URLs
  let currentCertFileName = '';
  let currentCertFileType = '';
  let currentPreviewBlobUrl = null;
  let currentCertBlobUrl = null;

  // Live Inline Preview inside CMS Edit Modal
  const updateCertModalPreview = (fileUrl, customFileName = '') => {
    const previewContainer = document.getElementById('cert-upload-preview-container');
    const previewWrap = document.getElementById('cert-inline-preview-wrap');
    const previewBadge = document.getElementById('cert-preview-badge');
    const openLink = document.getElementById('cert-preview-open-link');
    const testModalBtn = document.getElementById('cert-preview-test-modal');

    if (!previewContainer || !previewWrap) return;

    if (!fileUrl || !fileUrl.trim()) {
      previewContainer.style.display = 'none';
      previewWrap.innerHTML = '';
      if (currentPreviewBlobUrl) {
        URL.revokeObjectURL(currentPreviewBlobUrl);
        currentPreviewBlobUrl = null;
      }
      return;
    }

    const rawUrl = fileUrl.replace(/\\/g, '/').trim();
    const cleanUrl = (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('data:') || rawUrl.startsWith('/')) 
      ? rawUrl 
      : '/' + rawUrl;

    const isPdf = isPdfDocument(cleanUrl);
    let viewUrl = cleanUrl;

    if (currentPreviewBlobUrl) {
      URL.revokeObjectURL(currentPreviewBlobUrl);
      currentPreviewBlobUrl = null;
    }

    if (cleanUrl.startsWith('data:') && isPdf) {
      const blob = dataUrlToBlob(cleanUrl);
      if (blob) {
        currentPreviewBlobUrl = URL.createObjectURL(blob);
        viewUrl = currentPreviewBlobUrl;
      }
    }

    let displayFileName = customFileName;
    if (!displayFileName) {
      if (cleanUrl.startsWith('data:')) {
        displayFileName = isPdf ? 'Uploaded_Document.pdf' : 'Uploaded_Image.png';
      } else {
        displayFileName = cleanUrl.split('/').pop().split('?')[0];
      }
    }

    previewContainer.style.display = 'flex';
    if (previewBadge) {
      previewBadge.innerHTML = isPdf ? `📄 PDF Document: ${displayFileName}` : `🖼️ Image Document: ${displayFileName}`;
    }
    if (openLink) {
      openLink.href = viewUrl;
    }
    if (testModalBtn) {
      testModalBtn.onclick = () => {
        const tempCertId = document.getElementById('cert-id').value;
        if (tempCertId) {
          window.openCertPreview(tempCertId);
        } else {
          window.open(viewUrl, '_blank');
        }
      };
    }

    if (isPdf) {
      previewWrap.innerHTML = `
        <iframe src="${viewUrl}#toolbar=0&navpanes=0" class="cms-cert-preview-frame" title="Certificate Document Preview"></iframe>
      `;
    } else {
      previewWrap.innerHTML = `
        <img src="${cleanUrl}" alt="Certificate Document Preview" class="cms-cert-preview-img" loading="lazy">
      `;
    }
  };

  window.editCertification = (id) => {
    if (!portfolioData.certifications) portfolioData.certifications = [];
    const cert = portfolioData.certifications.find(c => c.id === id);
    if (!cert) return;

    currentCertFileName = cert.fileName || '';
    currentCertFileType = cert.fileType || '';

    document.getElementById('cert-id').value = cert.id;
    document.getElementById('cert-title').value = cert.title || '';
    document.getElementById('cert-org').value = cert.org || '';
    document.getElementById('cert-year').value = cert.year || '';
    document.getElementById('cert-desc').value = cert.desc || '';
    document.getElementById('cert-credential-url').value = cert.credentialUrl || '';
    if (certFileUrlInput) certFileUrlInput.value = cert.fileUrl || '';
    document.getElementById('cert-modal-title').textContent = 'Edit Certification';

    if (cert.fileUrl && cert.fileUrl.trim()) {
      const isPdf = isPdfDocument(cert.fileUrl, cert);
      const displayFileName = cert.fileName || (cert.fileUrl.startsWith('data:') 
        ? (isPdf ? 'Certificate_Document.pdf' : 'Certificate_Image.png') 
        : cert.fileUrl.replace(/\\/g, '/').split('/').pop().split('?')[0]);

      if (certFileStatusText) {
        certFileStatusText.innerHTML = `<span class="cert-file-badge">📄 Document Attached: ${displayFileName}</span>`;
      }
      if (certRemoveFileBtn) certRemoveFileBtn.style.display = 'inline-block';
      updateCertModalPreview(cert.fileUrl, displayFileName);
    } else {
      if (certFileStatusText) {
        certFileStatusText.textContent = 'No document attached yet (Digital credential preview will be generated).';
      }
      if (certRemoveFileBtn) certRemoveFileBtn.style.display = 'none';
      updateCertModalPreview('');
    }

    openModal(certModal);
  };

  window.deleteCertification = (id) => {
    if (!confirm('Are you sure you want to delete this certification?')) return;
    portfolioData.certifications = (portfolioData.certifications || []).filter(c => c.id !== id);
    savePortfolioData();
    renderEducation();
    populateCmsFields();
    showToast('Certification deleted successfully.', 'info');
  };

  const openNewCertModal = () => {
    currentCertFileName = '';
    currentCertFileType = '';
    if (certForm) certForm.reset();
    document.getElementById('cert-id').value = '';
    document.getElementById('cert-modal-title').textContent = 'Add New Certification';
    if (certFileUrlInput) certFileUrlInput.value = '';
    if (certFileStatusText) {
      certFileStatusText.textContent = 'No document attached yet (Digital credential preview will be generated).';
    }
    if (certRemoveFileBtn) certRemoveFileBtn.style.display = 'none';
    updateCertModalPreview('');
    openModal(certModal);
  };
  if (cmsAddCertBtn) cmsAddCertBtn.addEventListener('click', openNewCertModal);

  // Certificate Document Upload & Attachment Handlers
  if (certUploadBtn && certFileInput) {
    certUploadBtn.addEventListener('click', () => {
      certFileInput.click();
    });

    certFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      currentCertFileName = file.name;
      currentCertFileType = file.type;

      if (certFileStatusText) {
        certFileStatusText.textContent = `Uploading ${file.name}...`;
      }

      const reader = new FileReader();
      reader.onload = async (evt) => {
        const base64Data = evt.target.result;

        // Try server upload API if on HTTP protocol
        if (window.location.protocol.startsWith('http')) {
          try {
            const res = await fetch(getApiUrl('/api/upload-certificate'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fileBase64: base64Data,
                filename: file.name
              })
            });

            if (res.ok) {
              const result = await res.json();
              if (certFileUrlInput) certFileUrlInput.value = result.fileUrl;
              if (certFileStatusText) {
                certFileStatusText.innerHTML = `<span class="cert-file-badge">✓ Document Uploaded: ${result.filename || file.name}</span>`;
              }
              if (certRemoveFileBtn) certRemoveFileBtn.style.display = 'inline-block';
              updateCertModalPreview(result.fileUrl, result.filename || file.name);
              showToast('Certificate document uploaded successfully!', 'success');
              return;
            }
          } catch (uploadErr) {
            console.warn('Server upload failed, falling back to local data URL:', uploadErr);
          }
        }

        // Fallback: embed base64 directly (e.g. static hosting on Netlify)
        if (certFileUrlInput) certFileUrlInput.value = base64Data;
        if (certFileStatusText) {
          certFileStatusText.innerHTML = `<span class="cert-file-badge">✓ Document Attached: ${file.name}</span>`;
        }
        if (certRemoveFileBtn) certRemoveFileBtn.style.display = 'inline-block';
        updateCertModalPreview(base64Data, file.name);
        showToast('Certificate attached to browser preview! (Push your committed repo to GitHub for permanent Netlify hosting)', 'info', 6000);
      };

      reader.readAsDataURL(file);
    });
  }

  if (certRemoveFileBtn) {
    certRemoveFileBtn.addEventListener('click', () => {
      currentCertFileName = '';
      currentCertFileType = '';
      if (certFileInput) certFileInput.value = '';
      if (certFileUrlInput) certFileUrlInput.value = '';
      if (certFileStatusText) {
        certFileStatusText.textContent = 'No document attached yet (Digital credential preview will be generated).';
      }
      certRemoveFileBtn.style.display = 'none';
      updateCertModalPreview('');
      showToast('Attached certificate document removed.', 'info');
    });
  }

  if (certFileUrlInput) {
    certFileUrlInput.addEventListener('input', () => {
      updateCertModalPreview(certFileUrlInput.value);
    });
  }

  if (certForm) {
    certForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const id = document.getElementById('cert-id').value;
      const title = document.getElementById('cert-title').value.trim();
      const org = document.getElementById('cert-org').value.trim();
      const year = document.getElementById('cert-year').value.trim();
      const desc = document.getElementById('cert-desc').value.trim();
      const credentialUrl = document.getElementById('cert-credential-url').value.trim();
      const fileUrl = certFileUrlInput ? certFileUrlInput.value.trim() : '';

      if (!portfolioData.certifications) portfolioData.certifications = [];

      if (id) {
        const item = portfolioData.certifications.find(x => x.id === id);
        if (item) {
          item.title = title;
          item.org = org;
          item.year = year;
          item.desc = desc;
          item.credentialUrl = credentialUrl;
          item.fileUrl = fileUrl;
          if (currentCertFileName) item.fileName = currentCertFileName;
          if (currentCertFileType) item.fileType = currentCertFileType;
        }
      } else {
        portfolioData.certifications.push({
          id: 'cert-' + Date.now(),
          title,
          org,
          year,
          desc,
          credentialUrl,
          fileUrl,
          fileName: currentCertFileName,
          fileType: currentCertFileType
        });
      }

      savePortfolioData();
      renderEducation();
      populateCmsFields();
      closeModal(certModal);
      showToast('Certification successfully saved!', 'success');
    });
  }


  /* --------------------------------------------------------------------------
     7c. CERTIFICATION PREVIEW MODAL ENGINE (Digital Parchment & Document Viewer)
     -------------------------------------------------------------------------- */
  const certPreviewModal = document.getElementById('cert-preview-modal');
  const certPreviewTitle = document.getElementById('cert-preview-title');
  const certPreviewSubtitle = document.getElementById('cert-preview-subtitle');
  const certPreviewBody = document.getElementById('cert-preview-body');
  const certDownloadBtn = document.getElementById('cert-download-btn');
  const certFullscreenBtn = document.getElementById('cert-fullscreen-btn');
  const certPrintBtn = document.getElementById('cert-print-btn');
  const certCredentialBtn = document.getElementById('cert-credential-btn');
  const certAdminEditBtn = document.getElementById('cert-admin-edit-btn');

  window.openCertPreview = (certId, forceParchment = false) => {
    if (!portfolioData || !portfolioData.certifications) return;
    const cert = portfolioData.certifications.find(c => c.id === certId);
    if (!cert) return;

    // Open modal FIRST so layout dimensions are active and calculated
    openModal(certPreviewModal);

    if (certPreviewTitle) certPreviewTitle.textContent = cert.title;
    if (certPreviewSubtitle) {
      certPreviewSubtitle.innerHTML = `${cert.org} &bull; Issued ${cert.year}`;
    }

    const hasFile = cert.fileUrl && cert.fileUrl.trim() && !forceParchment;
    const rawUrl = (cert.fileUrl || '').replace(/\\/g, '/').trim();
    const cleanUrl = (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('data:') || rawUrl.startsWith('/')) 
      ? rawUrl 
      : '/' + rawUrl;

    const isPdf = hasFile && isPdfDocument(cleanUrl, cert);

    // Clean up previous cert preview blob URL to prevent memory leaks
    if (currentCertBlobUrl) {
      URL.revokeObjectURL(currentCertBlobUrl);
      currentCertBlobUrl = null;
    }

    let viewUrl = cleanUrl;
    if (hasFile && cleanUrl.startsWith('data:') && isPdf) {
      const blob = dataUrlToBlob(cleanUrl);
      if (blob) {
        currentCertBlobUrl = URL.createObjectURL(blob);
        viewUrl = currentCertBlobUrl;
      }
    }

    const safeName = (cert.title || 'certificate').replace(/[^a-zA-Z0-9_-]/g, '_');
    const fileExt = isPdf ? '.pdf' : (cleanUrl.toLowerCase().includes('.png') ? '.png' : '.jpg');
    let displayFileName = '';
    if (cert.fileName) {
      displayFileName = cert.fileName;
    } else if (cleanUrl.startsWith('data:')) {
      displayFileName = `${safeName}${fileExt}`;
    } else {
      displayFileName = cleanUrl.split('/').pop().split('?')[0];
    }

    // Configure Toolbar Action Buttons
    if (certDownloadBtn) {
      if (hasFile) {
        certDownloadBtn.style.display = 'inline-flex';
        certDownloadBtn.href = viewUrl;
        certDownloadBtn.setAttribute('download', `${safeName}${fileExt}`);
        certDownloadBtn.onclick = null;
      } else {
        certDownloadBtn.style.display = 'inline-flex';
        certDownloadBtn.href = '#';
        certDownloadBtn.removeAttribute('download');
        certDownloadBtn.onclick = (e) => {
          e.preventDefault();
          window.print();
        };
      }
    }

    if (certFullscreenBtn) {
      if (hasFile) {
        certFullscreenBtn.style.display = 'inline-flex';
        certFullscreenBtn.href = viewUrl;
        certFullscreenBtn.setAttribute('target', '_blank');
      } else {
        certFullscreenBtn.style.display = 'none';
      }
    }

    if (certPrintBtn) {
      certPrintBtn.onclick = () => {
        window.print();
      };
    }

    if (certCredentialBtn) {
      if (cert.credentialUrl && cert.credentialUrl.trim()) {
        certCredentialBtn.style.display = 'inline-flex';
        certCredentialBtn.href = cert.credentialUrl;
      } else {
        certCredentialBtn.style.display = 'none';
      }
    }

    if (certAdminEditBtn) {
      if (typeof isUserAuthenticated === 'function' && isUserAuthenticated()) {
        certAdminEditBtn.style.display = 'inline-flex';
        certAdminEditBtn.onclick = () => {
          closeModal(certPreviewModal);
          window.editCertification(cert.id);
        };
      } else {
        certAdminEditBtn.style.display = 'none';
      }
    }

    // Render Preview Modal Content
    if (certPreviewBody) {
      if (hasFile) {
        certPreviewBody.classList.add('has-doc');

        if (isPdf) {
          certPreviewBody.innerHTML = `
            <div class="cert-doc-notice-bar">
              <div class="doc-meta">
                <span class="cert-file-badge">📄 Official Certificate Document (PDF)</span>
                <span title="${displayFileName}" style="max-width:280px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${displayFileName}</span>
              </div>
              <div class="cert-doc-notice-actions">
                <button type="button" class="btn btn-sm btn-outline" id="toggle-parchment-btn" title="View digital parchment credential format">
                  📜 Digital Parchment
                </button>
                <a href="${viewUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline" title="Open PDF in new tab">
                  ↗ New Tab
                </a>
                <a href="${viewUrl}" download="${safeName}.pdf" class="btn btn-sm btn-primary">
                  ⬇ Download PDF
                </a>
              </div>
            </div>
            <iframe 
              src="${viewUrl}#toolbar=1&navpanes=0&view=FitH" 
              class="cert-pdf-frame" 
              title="${cert.title}" 
              loading="eager"
              allow="fullscreen">
            </iframe>
          `;

          const toggleBtn = certPreviewBody.querySelector('#toggle-parchment-btn');
          if (toggleBtn) {
            toggleBtn.onclick = () => window.openCertPreview(cert.id, true);
          }
        } else {
          // Attached image document
          certPreviewBody.innerHTML = `
            <div class="cert-doc-notice-bar">
              <div class="doc-meta">
                <span class="cert-file-badge">🖼️ Official Certificate Image</span>
                <span title="${displayFileName}">${displayFileName}</span>
              </div>
              <div class="cert-doc-notice-actions">
                <button type="button" class="btn btn-sm btn-outline" id="toggle-parchment-btn" title="View digital parchment credential format">
                  📜 Digital Parchment
                </button>
                <a href="${viewUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline">
                  ↗ New Tab
                </a>
                <a href="${viewUrl}" download="${safeName}${fileExt}" class="btn btn-sm btn-primary">
                  ⬇ Download Image
                </a>
              </div>
            </div>
            <div class="cert-img-wrapper">
              <img src="${cleanUrl}" alt="${cert.title}" class="cert-preview-img" loading="eager">
            </div>
          `;

          const toggleBtn = certPreviewBody.querySelector('#toggle-parchment-btn');
          if (toggleBtn) {
            toggleBtn.onclick = () => window.openCertPreview(cert.id, true);
          }
        }
      } else {
        // Authentic Digital Parchment Certificate
        certPreviewBody.classList.remove('has-doc');
        const recipientName = (portfolioData.profile && portfolioData.profile.name) ? portfolioData.profile.name : 'Keerthan Tunkoju';
        const descriptionText = cert.desc || 'Demonstrating technical proficiency, professional competency, and completion of practical training curriculum.';
        const toggleBackBtn = cert.fileUrl && cert.fileUrl.trim()
          ? `<div style="margin-bottom:0.75rem;text-align:right;width:100%;max-width:760px;">
               <button type="button" class="btn btn-sm btn-primary" id="toggle-doc-btn">
                 📄 View Attached Original Document (${isPdf ? 'PDF' : 'IMAGE'})
               </button>
             </div>`
          : '';

        certPreviewBody.innerHTML = `
          ${toggleBackBtn}
          <div class="cert-paper">
            <div class="cert-border-outer">
              <div class="cert-border-inner">
                <div class="cert-corner cert-corner-tl"></div>
                <div class="cert-corner cert-corner-tr"></div>
                <div class="cert-corner cert-corner-bl"></div>
                <div class="cert-corner cert-corner-br"></div>

                <div class="cert-emblem" aria-hidden="true">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
                </div>

                <div class="cert-kicker">Certificate of Recognition &amp; Achievement</div>
                <h2 class="cert-headline">Certificate of Completion</h2>

                <p class="cert-recipient-intro">This is proudly presented and awarded to</p>
                <h3 class="cert-recipient-name">${recipientName}</h3>

                <p class="cert-for-text">${descriptionText}</p>

                <div class="cert-awarded-title">${cert.title}</div>
                <div class="cert-org-line">Issued by <strong>${cert.org}</strong> &bull; Completed ${cert.year}</div>

                <div class="cert-footer-row">
                  <div class="cert-signature-block">
                    <div class="cert-sig-line">${cert.org}</div>
                    <div class="cert-sig-label">Authorized Authority</div>
                  </div>

                  <div class="cert-gold-seal">
                    <span>OFFICIAL</span>
                    <strong>VERIFIED</strong>
                    <span>CREDENTIAL</span>
                  </div>

                  <div class="cert-signature-block">
                    <div class="cert-sig-line">${cert.year}</div>
                    <div class="cert-sig-label">Date Issued</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;

        const toggleDocBtn = certPreviewBody.querySelector('#toggle-doc-btn');
        if (toggleDocBtn) {
          toggleDocBtn.onclick = () => window.openCertPreview(cert.id, false);
        }
      }
    }
  };


  /* --------------------------------------------------------------------------
     8. BACKUP, EXPORT, IMPORT & RESET
     -------------------------------------------------------------------------- */
  const exportJsonBtn = document.getElementById('export-json-btn');
  const cmsExportBtn = document.getElementById('cms-export-btn');
  const cmsCopyJsonBtn = document.getElementById('cms-copy-json-btn');
  const cmsImportFileInput = document.getElementById('cms-import-file-input');
  const cmsResetBtn = document.getElementById('cms-reset-btn');

  const downloadJsonBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(portfolioData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `portfolio-data-${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Downloaded portfolio-data.json backup!', 'success');
  };

  const cmsExportDataJsBtn = document.getElementById('cms-export-datajs-btn');

  const downloadDataJs = () => {
    const content = `/**\n * ==========================================================================\n * KEERTHAN TUNKOJU PORTFOLIO - DEFAULT DATA STORE\n * Auto-synced with SQLite database and admin CMS updates.\n * ==========================================================================\n */\n\nconst defaultPortfolioData = ${JSON.stringify(portfolioData, null, 2)};\n\n// Export for module systems or attach to global scope\nif (typeof module !== 'undefined' && module.exports) {\n  module.exports = defaultPortfolioData;\n}\n`;
    const dataStr = "data:text/javascript;charset=utf-8," + encodeURIComponent(content);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "data.js");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('Downloaded data.js! Replace data.js to deploy for all visitors.', 'success', 4000);
  };

  if (exportJsonBtn) exportJsonBtn.addEventListener('click', downloadJsonBackup);
  if (cmsExportBtn) cmsExportBtn.addEventListener('click', downloadJsonBackup);
  if (cmsExportDataJsBtn) cmsExportDataJsBtn.addEventListener('click', downloadDataJs);

  if (cmsCopyJsonBtn) {
    cmsCopyJsonBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(JSON.stringify(portfolioData, null, 2))
        .then(() => showToast('Portfolio JSON copied to clipboard!', 'success'))
        .catch(() => showToast('Could not access clipboard.', 'error'));
    });
  }

  if (cmsImportFileInput) {
    cmsImportFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (parsed && parsed.profile && parsed.experience && parsed.skills && parsed.projects) {
            portfolioData = parsed;
            savePortfolioData();
            renderAll();
            populateCmsFields();
            showToast('Backup restored successfully!', 'success');
          } else {
            showToast('Invalid backup file structure.', 'error');
          }
        } catch (err) {
          showToast('Failed to parse JSON file.', 'error');
        }
      };
      reader.readAsText(file);
    });
  }

  if (cmsResetBtn) {
    cmsResetBtn.addEventListener('click', () => {
      if (confirm('CAUTION: This will reset all website text, experiences, and projects back to Keerthan Tunkoju\'s original resume defaults. Proceed?')) {
        localStorage.removeItem(STORAGE_KEY);
        loadPortfolioData();
        renderAll();
        populateCmsFields();
        showToast('All portfolio data reset to original resume defaults.', 'info');
      }
    });
  }


  /* --------------------------------------------------------------------------
     9. SECURITY TAB: CHANGE ADMIN PASSWORD
     -------------------------------------------------------------------------- */
  const changePassForm = document.getElementById('change-password-form');
  const passwordFeedback = document.getElementById('password-feedback');

  if (changePassForm) {
    changePassForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const currentPass = document.getElementById('current-pass').value;
      const newPass = document.getElementById('new-pass').value;
      const confirmPass = document.getElementById('confirm-pass').value;

      if (newPass !== confirmPass) {
        if (passwordFeedback) {
          passwordFeedback.hidden = false;
          passwordFeedback.className = 'form-alert error';
          passwordFeedback.textContent = 'New passwords do not match.';
        }
        return;
      }

      const currHash = await sha256(currentPass);
      if (currHash !== getStoredHash()) {
        if (passwordFeedback) {
          passwordFeedback.hidden = false;
          passwordFeedback.className = 'form-alert error';
          passwordFeedback.textContent = 'Current admin password is incorrect.';
        }
        return;
      }

      const newHash = await sha256(newPass);
      setStoredHash(newHash);

      if (passwordFeedback) {
        passwordFeedback.hidden = false;
        passwordFeedback.className = 'form-alert success';
        passwordFeedback.textContent = 'Admin password updated successfully!';
      }
      changePassForm.reset();
      showToast('Admin password changed successfully!', 'success');
    });
  }


  /* --------------------------------------------------------------------------
     10. MODAL UTILITY HELPERS
     -------------------------------------------------------------------------- */
  const openModal = (modal) => {
    if (!modal) return;
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  };

  const closeModal = (modal) => {
    if (!modal) return;
    modal.hidden = true;
    document.body.style.overflow = '';

    if (modal === certPreviewModal && currentCertBlobUrl) {
      URL.revokeObjectURL(currentCertBlobUrl);
      currentCertBlobUrl = null;
    }
    if (modal === certModal && currentPreviewBlobUrl) {
      URL.revokeObjectURL(currentPreviewBlobUrl);
      currentPreviewBlobUrl = null;
    }

    if (modal === adminLoginModal && !isUserAuthenticated()) {
      stopAdminLoginTimer();
      localStorage.removeItem(ADMIN_DEVICE_KEY);
      if (adminTriggerBtn) {
        adminTriggerBtn.classList.add('admin-hidden');
        adminTriggerBtn.style.display = 'none';
      }
      if (adminBtnTimerBadge) {
        adminBtnTimerBadge.style.display = 'none';
      }
      updateAdminUI();
    }
  };

  // Close modals when clicking outside card or clicking [data-close-modal]
  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        closeModal(backdrop);
      }
    });
  });

  document.querySelectorAll('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => {
      const parentModal = btn.closest('.modal-backdrop');
      if (parentModal) closeModal(parentModal);
    });
  });

  // Close modals on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-backdrop:not([hidden])').forEach(m => closeModal(m));
    }
  });


  /* --------------------------------------------------------------------------
     11. THEME SWITCHER (DARK / LIGHT MODE)
     -------------------------------------------------------------------------- */
  const themeToggleBtn = document.getElementById('theme-toggle');
  const htmlRoot = document.documentElement;

  const getPreferredTheme = () => {
    const saved = localStorage.getItem('portfolio-theme');
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  };

  const applyTheme = (theme) => {
    htmlRoot.setAttribute('data-theme', theme);
    localStorage.setItem('portfolio-theme', theme);
    if (themeToggleBtn) {
      const label = theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme';
      themeToggleBtn.setAttribute('aria-label', label);
      themeToggleBtn.setAttribute('title', label);
    }
  };

  applyTheme(getPreferredTheme());

  if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
      const current = htmlRoot.getAttribute('data-theme') || 'dark';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  }


  /* --------------------------------------------------------------------------
     12. MOBILE NAVIGATION & SCROLLSPY
     -------------------------------------------------------------------------- */
  const menuToggleBtn = document.getElementById('menu-toggle');
  const navMenu = document.getElementById('nav-menu');
  const navLinks = document.querySelectorAll('.nav-link');

  if (menuToggleBtn && navMenu) {
    menuToggleBtn.addEventListener('click', () => {
      const isOpen = navMenu.classList.contains('open');
      navMenu.classList.toggle('open', !isOpen);
      menuToggleBtn.setAttribute('aria-expanded', !isOpen ? 'true' : 'false');
    });

    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        navMenu.classList.remove('open');
        menuToggleBtn.setAttribute('aria-expanded', 'false');
      });
    });

    // Close mobile nav when tapping anywhere outside
    document.addEventListener('click', (e) => {
      if (
        navMenu.classList.contains('open') &&
        !navMenu.contains(e.target) &&
        !menuToggleBtn.contains(e.target)
      ) {
        navMenu.classList.remove('open');
        menuToggleBtn.setAttribute('aria-expanded', 'false');
      }
    });
  }

  // ScrollSpy with IntersectionObserver
  const sections = document.querySelectorAll('section[id]');
  const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const id = entry.target.getAttribute('id');
        navLinks.forEach(link => {
          if (link.getAttribute('href') === `#${id}`) {
            link.classList.add('active');
          } else {
            link.classList.remove('active');
          }
        });
      }
    });
  }, { threshold: 0.25 });

  sections.forEach(s => sectionObserver.observe(s));


  /* --------------------------------------------------------------------------
     13. CONTACT FORM SIMULATION & FOOTER
     -------------------------------------------------------------------------- */
  const contactForm = document.getElementById('contact-form');
  const formAlert = document.getElementById('form-alert');
  const submitBtn = document.getElementById('submit-btn');

  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = document.getElementById('contact-name');
      const emailInput = document.getElementById('contact-email');
      const messageInput = document.getElementById('contact-message');

      let isValid = true;
      if (!nameInput.value.trim() || nameInput.value.trim().length < 2) {
        document.getElementById('name-error').textContent = 'Please enter your name.';
        isValid = false;
      }
      if (!emailInput.value.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value.trim())) {
        document.getElementById('email-error').textContent = 'Please enter a valid email.';
        isValid = false;
      }
      if (!messageInput.value.trim() || messageInput.value.trim().length < 10) {
        document.getElementById('message-error').textContent = 'Message must be at least 10 characters.';
        isValid = false;
      }

      if (!isValid) return;

      submitBtn.disabled = true;
      submitBtn.querySelector('.btn-text').textContent = 'Recording in Database...';

      const payload = {
        name: nameInput.value.trim(),
        email: emailInput.value.trim(),
        subject: document.getElementById('contact-subject') ? document.getElementById('contact-subject').value.trim() : 'Portfolio Inquiry',
        message: messageInput.value.trim()
      };

      // 1. Post to backend API (Node server or Netlify Function)
      const sendPromise = window.location.protocol.startsWith('http')
        ? fetch(getApiUrl('/api/contact'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }).then(res => res.json())
        : Promise.resolve({ success: true, localOnly: true });

      // 2. If running on Netlify or with data-netlify, also dispatch to Netlify Forms Cloud
      if (contactForm.getAttribute('data-netlify') === 'true' && window.location.protocol.startsWith('http')) {
        try {
          const formData = new URLSearchParams();
          formData.append('form-name', 'contact');
          formData.append('name', payload.name);
          formData.append('email', payload.email);
          formData.append('subject', payload.subject);
          formData.append('message', payload.message);
          fetch('/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: formData.toString()
          }).catch(() => {});
        } catch (e) {}
      }

      sendPromise
        .then(() => {
          // 3. Keep in client-side database backup
          const localMsgs = JSON.parse(localStorage.getItem('keerthan_contact_messages') || '[]');
          localMsgs.unshift({ ...payload, id: Date.now(), created_at: new Date().toISOString() });
          localStorage.setItem('keerthan_contact_messages', JSON.stringify(localMsgs));
        })
        .catch(err => {
          console.warn('Server offline, stored message in client database store:', err);
          const localMsgs = JSON.parse(localStorage.getItem('keerthan_contact_messages') || '[]');
          localMsgs.unshift({ ...payload, id: Date.now(), created_at: new Date().toISOString() });
          localStorage.setItem('keerthan_contact_messages', JSON.stringify(localMsgs));
        })
        .finally(() => {
          submitBtn.disabled = false;
          submitBtn.querySelector('.btn-text').textContent = 'Send Message';
          if (formAlert) {
            formAlert.hidden = false;
            formAlert.className = 'form-alert success';
            formAlert.textContent = `Thank you, ${payload.name}! Your message has been sent and recorded in the database.`;
          }
          contactForm.reset();
          showToast('Inquiry recorded in database & mailbox!', 'success');
          fetchMessagesFromDb();
          fetchDbStats();
        });
    });
  }

  // Dynamic Year
  const yearElement = document.getElementById('current-year');
  if (yearElement) {
    yearElement.textContent = new Date().getFullYear();
  }

  // Interactive Resume Modal Viewer
  const cvBtn = document.getElementById('cv-btn');
  const resumeModal = document.getElementById('resume-modal');
  if (cvBtn) {
    cvBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (resumeModal) {
        openModal(resumeModal);
      } else {
        window.open('Keerthan_Tunkoju_Resume.pdf', '_blank');
      }
    });
  }


  /* --------------------------------------------------------------------------
     14. DATABASE INBOX & MAIL INTEGRATION ENGINE
     -------------------------------------------------------------------------- */
  let cachedMessages = [];
  let currentInboxFilter = 'all';
  let currentInboxSearch = '';
  let activeMailSettings = null;

  // Helper: Format relative timestamp (e.g., 'Just now', '2h ago')
  const formatTimeAgo = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Helper: Escape HTML
  const escapeStr = (str) => {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  };

  // Render the contact messages list based on current filter & search
  const renderMessagesList = () => {
    const container = document.getElementById('messages-list-container');
    const badge = document.getElementById('msg-badge-count');
    const metricTotal = document.getElementById('inbox-metric-total');
    const metricUnread = document.getElementById('inbox-metric-unread');
    const metricReplied = document.getElementById('inbox-metric-replied');
    const filterUnreadBadge = document.getElementById('filter-unread-count');

    // Calculate metrics
    const totalCount = cachedMessages.length;
    const unreadCount = cachedMessages.filter(m => m.status === 'unread' || (!m.status && m.is_read === 0)).length;
    const repliedCount = cachedMessages.filter(m => m.status === 'replied').length;

    if (badge) badge.textContent = unreadCount;
    if (metricTotal) metricTotal.textContent = totalCount;
    if (metricUnread) metricUnread.textContent = unreadCount;
    if (metricReplied) metricReplied.textContent = repliedCount;
    if (filterUnreadBadge) filterUnreadBadge.textContent = unreadCount;

    if (!container) return;

    // Filter messages
    let filtered = [...cachedMessages];

    if (currentInboxFilter === 'unread') {
      filtered = filtered.filter(m => m.status === 'unread' || (!m.status && m.is_read === 0));
    } else if (currentInboxFilter === 'replied') {
      filtered = filtered.filter(m => m.status === 'replied');
    }

    if (currentInboxSearch) {
      const q = currentInboxSearch.toLowerCase();
      filtered = filtered.filter(m =>
        (m.name && m.name.toLowerCase().includes(q)) ||
        (m.email && m.email.toLowerCase().includes(q)) ||
        (m.subject && m.subject.toLowerCase().includes(q)) ||
        (m.message && m.message.toLowerCase().includes(q))
      );
    }

    if (filtered.length === 0) {
      if (cachedMessages.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <p style="font-size: 1.1rem; margin-bottom: 0.5rem;">📬 No inquiries received yet.</p>
            <p>Messages submitted via the portfolio contact form will be stored in your SQLite database and appear here with instant email alerts.</p>
          </div>
        `;
      } else {
        container.innerHTML = `
          <div class="empty-state">
            <p>🔍 No inquiries match the selected filter or search term ("${escapeStr(currentInboxSearch)}").</p>
            <button class="btn btn-sm btn-outline" style="margin-top: 0.75rem;" onclick="window.resetInboxFilters()">Clear Filters</button>
          </div>
        `;
      }
      return;
    }

    container.innerHTML = filtered.map(m => {
      const isUnread = m.status === 'unread' || (!m.status && m.is_read === 0);
      const isReplied = m.status === 'replied';
      const statusClass = isReplied ? 'is-replied' : (isUnread ? 'is-unread' : 'is-read');
      const senderInitial = (m.name || 'V').trim().charAt(0).toUpperCase();
      const timeAgo = formatTimeAgo(m.created_at);
      const formattedFullDate = new Date(m.created_at).toLocaleString();

      let statusBadgeHtml = '';
      if (isReplied) {
        statusBadgeHtml = `<span class="msg-status-badge msg-status-replied">✓ Replied</span>`;
      } else if (isUnread) {
        statusBadgeHtml = `<span class="msg-status-badge msg-status-unread">● New / Unread</span>`;
      } else {
        statusBadgeHtml = `<span class="msg-status-badge msg-status-read">Read</span>`;
      }

      let alertBadgeHtml = '';
      if (m.email_alert_status === 'sent') {
        alertBadgeHtml = `<span class="msg-alert-badge badge-success" title="Notification delivered to your email">📨 Alert Sent</span>`;
      } else if (m.email_alert_status === 'unconfigured') {
        alertBadgeHtml = `<span class="msg-alert-badge" title="Saved in DB (configure SMTP in Mail tab for real-time alerts)">💾 In Database</span>`;
      } else if (m.email_alert_status === 'failed') {
        alertBadgeHtml = `<span class="msg-alert-badge" style="color: #f87171; border-color: rgba(239, 68, 68, 0.3);" title="Email notification failed to deliver">⚠️ Alert Failed</span>`;
      }

      // Pre-composed direct webmail URLs
      const reSubject = encodeURIComponent('Re: ' + (m.subject || 'Portfolio Inquiry'));
      const quoteBody = encodeURIComponent(`\n\n--- On ${formattedFullDate}, ${m.name} wrote: ---\n${m.message}`);
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(m.email)}&su=${reSubject}&body=${quoteBody}`;

      return `
        <div class="msg-card ${statusClass}" data-msg-id="${m.id}">
          <div class="msg-header">
            <div class="msg-sender-group">
              <div class="msg-avatar-initial">${senderInitial}</div>
              <div class="msg-sender-info">
                <div>
                  <span class="msg-sender">${escapeStr(m.name)}</span>
                  <a href="mailto:${escapeStr(m.email)}" class="msg-email">${escapeStr(m.email)}</a>
                </div>
                <div class="msg-badges-row">
                  ${statusBadgeHtml}
                  ${alertBadgeHtml}
                </div>
              </div>
            </div>
            <time class="msg-date" title="${formattedFullDate}">${timeAgo}</time>
          </div>

          <div class="msg-subject">Subject: <strong>${escapeStr(m.subject || 'Portfolio Inquiry')}</strong></div>
          <div class="msg-body">${escapeStr(m.message)}</div>

          ${isReplied && m.reply_body ? `
            <div class="msg-reply-history">
              <div class="msg-reply-head">
                <span>💬 Replied by Keerthan (${m.replied_at ? formatTimeAgo(m.replied_at) : 'Sent'})</span>
                <span style="font-size: 0.7rem; color: var(--text-muted);">${escapeStr(m.reply_subject || 'Re: Inquiry')}</span>
              </div>
              <div class="msg-reply-body">${escapeStr(m.reply_body)}</div>
            </div>
          ` : ''}

          <div class="msg-actions">
            <button class="btn btn-sm btn-primary" onclick="window.openMailComposer(${m.id})">
              <span>✉️ Reply to Inquiry</span>
            </button>
            <a href="${gmailUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-secondary" title="Open reply in Gmail Web">
              <span>🌐 Gmail</span>
            </a>
            <button class="btn btn-sm btn-outline" onclick="window.toggleMessageReadStatus(${m.id})">
              <span>${m.is_read ? 'Mark as Unread' : 'Mark as Read'}</span>
            </button>
            <button class="btn btn-sm btn-danger" onclick="window.deleteMessageFromDb(${m.id})" title="Delete inquiry from SQLite database">
              <span>🗑️ Delete</span>
            </button>
          </div>
        </div>
      `;
    }).join('');
  };

  // Reset filters helper
  window.resetInboxFilters = () => {
    currentInboxFilter = 'all';
    currentInboxSearch = '';
    const searchInput = document.getElementById('inbox-search-input');
    if (searchInput) searchInput.value = '';
    document.querySelectorAll('.inbox-filter-pill').forEach(pill => {
      pill.classList.toggle('active', pill.getAttribute('data-filter') === 'all');
    });
    renderMessagesList();
  };

  // Fetch all messages from SQLite database (with offline localStorage backup)
  const fetchMessagesFromDb = async () => {
    let messages = [];
    if (window.location.protocol.startsWith('http')) {
      try {
        const res = await fetch(getApiUrl('/api/messages'));
        if (res.ok) messages = await res.json();
      } catch (e) {
        console.warn('Could not fetch messages from server, using local cache:', e);
      }
    }
    if (!messages || messages.length === 0) {
      messages = JSON.parse(localStorage.getItem('keerthan_contact_messages') || '[]');
    }

    cachedMessages = messages;
    renderMessagesList();
  };

  // Toggle read/unread status
  window.toggleMessageReadStatus = async (id) => {
    const msg = cachedMessages.find(m => String(m.id) === String(id));
    if (!msg) return;

    const newIsRead = msg.is_read ? 0 : 1;
    const newStatus = newIsRead ? 'read' : 'unread';

    msg.is_read = newIsRead;
    if (msg.status !== 'replied') {
      msg.status = newStatus;
    }

    // Sync to SQLite server
    if (window.location.protocol.startsWith('http')) {
      try {
        await fetch(getApiUrl(`/api/messages/${id}/status`), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isRead: newIsRead, status: msg.status })
        });
      } catch (e) {}
    }

    // Sync to localStorage
    const local = JSON.parse(localStorage.getItem('keerthan_contact_messages') || '[]');
    const target = local.find(x => String(x.id) === String(id));
    if (target) {
      target.is_read = newIsRead;
      if (target.status !== 'replied') target.status = newStatus;
      localStorage.setItem('keerthan_contact_messages', JSON.stringify(local));
    }

    renderMessagesList();
    showToast(`Marked inquiry as ${newIsRead ? 'read' : 'unread'}.`, 'info');
  };

  // Delete message from DB
  window.deleteMessageFromDb = async (id) => {
    if (!confirm('Are you sure you want to delete this message from the database? This action cannot be undone.')) return;
    if (window.location.protocol.startsWith('http')) {
      try {
        await fetch(getApiUrl(`/api/messages/${id}`), { method: 'DELETE' });
      } catch (e) {}
    }
    const local = JSON.parse(localStorage.getItem('keerthan_contact_messages') || '[]');
    const filtered = local.filter(x => x.id !== id && String(x.id) !== String(id));
    localStorage.setItem('keerthan_contact_messages', JSON.stringify(filtered));

    cachedMessages = cachedMessages.filter(x => x.id !== id && String(x.id) !== String(id));
    renderMessagesList();
    fetchDbStats();
    showToast('Inquiry deleted from database.', 'info');
  };

  // Setup Inbox Filter & Search Event Listeners
  const inboxFilterPills = document.querySelectorAll('.inbox-filter-pill');
  inboxFilterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      inboxFilterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      currentInboxFilter = pill.getAttribute('data-filter') || 'all';
      renderMessagesList();
    });
  });

  const inboxSearchInput = document.getElementById('inbox-search-input');
  if (inboxSearchInput) {
    inboxSearchInput.addEventListener('input', (e) => {
      currentInboxSearch = e.target.value.trim();
      renderMessagesList();
    });
  }

  // Navigation between Inbox and Mail Settings tabs
  const gotoMailSettingsBtn = document.getElementById('inbox-goto-settings-btn');
  if (gotoMailSettingsBtn) {
    gotoMailSettingsBtn.addEventListener('click', () => {
      document.querySelectorAll('.cms-tab-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-tab') === 'tab-mail-settings');
      });
      document.querySelectorAll('.cms-tab-pane').forEach(p => {
        p.classList.toggle('active', p.id === 'tab-mail-settings');
      });
      fetchMailSettings();
    });
  }

  const backToInboxBtn = document.getElementById('mail-settings-back-inbox-btn');
  if (backToInboxBtn) {
    backToInboxBtn.addEventListener('click', () => {
      document.querySelectorAll('.cms-tab-btn').forEach(b => {
        b.classList.toggle('active', b.getAttribute('data-tab') === 'tab-messages');
      });
      document.querySelectorAll('.cms-tab-pane').forEach(p => {
        p.classList.toggle('active', p.id === 'tab-messages');
      });
      fetchMessagesFromDb();
    });
  }


  /* --------------------------------------------------------------------------
     MAIL COMPOSER & REPLY MODAL CONTROLLER
     -------------------------------------------------------------------------- */
  const mailComposerModal = document.getElementById('cms-mail-composer-modal');
  const mailReplyForm = document.getElementById('cms-mail-reply-form');
  const replyToInput = document.getElementById('reply-to-email');
  const replySubjectInput = document.getElementById('reply-subject');
  const replyBodyTextarea = document.getElementById('reply-body-text');
  const replyTemplatePicker = document.getElementById('reply-template-picker');
  const replyCharCount = document.getElementById('reply-char-count');
  const replyStatusBanner = document.getElementById('reply-status-banner');
  const toggleOriginalInquiryBtn = document.getElementById('toggle-original-inquiry');
  const replyOrigContent = document.getElementById('reply-orig-content');
  const replyAccordionArrow = document.getElementById('reply-accordion-arrow');

  let activeReplyMessage = null;

  // Update dynamic 1-click webmail URLs in the composer
  const updateWebmailLinks = () => {
    const to = replyToInput ? replyToInput.value.trim() : '';
    const subject = replySubjectInput ? replySubjectInput.value.trim() : '';
    const body = replyBodyTextarea ? replyBodyTextarea.value.trim() : '';

    if (replyCharCount) {
      replyCharCount.textContent = `${body.length} characters`;
    }

    const reSubject = encodeURIComponent(subject);
    const fullBody = encodeURIComponent(body);

    const gmailBtn = document.getElementById('reply-gmail-web-btn');
    if (gmailBtn) {
      gmailBtn.href = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(to)}&su=${reSubject}&body=${fullBody}`;
    }

    const outlookBtn = document.getElementById('reply-outlook-web-btn');
    if (outlookBtn) {
      outlookBtn.href = `https://outlook.live.com/mail/0/deeplink/compose?to=${encodeURIComponent(to)}&subject=${reSubject}&body=${fullBody}`;
    }

    const defaultMailBtn = document.getElementById('reply-default-mail-btn');
    if (defaultMailBtn) {
      defaultMailBtn.href = `mailto:${encodeURIComponent(to)}?subject=${reSubject}&body=${fullBody}`;
    }
  };

  if (replyToInput) replyToInput.addEventListener('input', updateWebmailLinks);
  if (replySubjectInput) replySubjectInput.addEventListener('input', updateWebmailLinks);
  if (replyBodyTextarea) replyBodyTextarea.addEventListener('input', updateWebmailLinks);

  // Accordion toggle for original inquiry
  if (toggleOriginalInquiryBtn && replyOrigContent) {
    toggleOriginalInquiryBtn.addEventListener('click', () => {
      const isHidden = replyOrigContent.style.display === 'none';
      replyOrigContent.style.display = isHidden ? 'block' : 'none';
      if (replyAccordionArrow) {
        replyAccordionArrow.classList.toggle('rotated', isHidden);
      }
    });
  }

  // Pre-crafted Professional Response Templates
  const getTemplateContent = (templateKey, name, subject) => {
    const safeName = name || 'there';
    switch (templateKey) {
      case 'gratitude':
        return `Hi ${safeName},\n\nThank you for reaching out through my portfolio website regarding "${subject || 'your inquiry'}".\n\nI have received your message and appreciate your interest in my background. I would be delighted to discuss how my experience in Software Development, Artificial Intelligence & Machine Learning, and GIS spatial data engineering can add value to your initiatives.\n\nLooking forward to speaking with you!\n\nBest regards,\nKeerthan Tunkoju\nSoftware Developer | AI & ML Graduate\nPhone: +91 6281151724\nLinkedIn: https://linkedin.com/in/keerthan-tunkoju-a24604258`;

      case 'interview':
        return `Hi ${safeName},\n\nThank you for reviewing my profile and reaching out regarding potential opportunities!\n\nI am actively seeking Software Developer and AI/ML engineering positions and would welcome the chance to speak with your team. Please let me know your availability for a brief 15–20 minute discussion this week, or feel free to suggest a convenient time slot.\n\nYou can also review my complete verified resume and credential certifications directly at: http://localhost:3000/Keerthan_Tunkoju_Resume.pdf\n\nBest regards,\nKeerthan Tunkoju\n+91 6281151724 | keerthantunkoju10@gmail.com`;

      case 'collaboration':
        return `Hi ${safeName},\n\nThank you for getting in touch regarding project collaboration!\n\nI would love to learn more about the project scope, technical stack, and timeline you have in mind. Could you share any additional documentation or specifications so I can evaluate the best architectural approach?\n\nI look forward to collaborating with you.\n\nWarm regards,\nKeerthan Tunkoju\nFull-Stack & AI/ML Developer`;

      case 'resume':
        return `Hi ${safeName},\n\nThank you for your inquiry regarding my background, skills, and credentials!\n\nMy complete curriculum vitae and authenticated certificates (including Python, Deep Learning Brain Tumor CNNs, GIS Engineering at NeoGeoInfo, and Web Development) are readily available:\n- Resume PDF: http://localhost:3000/Keerthan_Tunkoju_Resume.pdf\n- Web Resume: http://localhost:3000/resume.html\n- GitHub: https://github.com/Keerthantunkoju10\n- LinkedIn: https://linkedin.com/in/keerthan-tunkoju-a24604258\n\nPlease let me know if you need any additional details!\n\nBest regards,\nKeerthan Tunkoju`;

      case 'clear':
        return '';

      default:
        return '';
    }
  };

  if (replyTemplatePicker) {
    replyTemplatePicker.addEventListener('change', (e) => {
      const selected = e.target.value;
      if (!selected) return;
      const name = activeReplyMessage ? activeReplyMessage.name : '';
      const subject = activeReplyMessage ? activeReplyMessage.subject : '';
      const text = getTemplateContent(selected, name, subject);
      if (replyBodyTextarea) {
        replyBodyTextarea.value = text;
        updateWebmailLinks();
      }
    });
  }

  // Open the Mail Composer Modal for a message
  window.openMailComposer = (id) => {
    const msg = cachedMessages.find(m => String(m.id) === String(id));
    if (!msg) return;

    activeReplyMessage = msg;

    const modalTitle = document.getElementById('mail-composer-title');
    const modalSubtitle = document.getElementById('mail-composer-subtitle');
    const replyMsgId = document.getElementById('reply-msg-id');
    const replyOrigName = document.getElementById('reply-orig-name');
    const replyOrigDate = document.getElementById('reply-orig-date');
    const replyOrigSubject = document.getElementById('reply-orig-subject');
    const replyOrigBody = document.getElementById('reply-orig-body');

    if (modalTitle) modalTitle.textContent = `Compose Email Reply to ${msg.name}`;
    if (modalSubtitle) modalSubtitle.textContent = `Inquiry received on ${new Date(msg.created_at).toLocaleDateString()}`;
    if (replyMsgId) replyMsgId.value = msg.id;

    if (replyToInput) replyToInput.value = msg.email;
    if (replySubjectInput) replySubjectInput.value = `Re: ${msg.subject || 'Portfolio Inquiry'}`;

    if (replyOrigName) replyOrigName.textContent = msg.name;
    if (replyOrigDate) replyOrigDate.textContent = new Date(msg.created_at).toLocaleString();
    if (replyOrigSubject) replyOrigSubject.textContent = msg.subject || 'Inquiry';
    if (replyOrigBody) replyOrigBody.textContent = msg.message;

    // Default template: gratitude
    if (replyTemplatePicker) replyTemplatePicker.value = 'gratitude';
    if (replyBodyTextarea) {
      replyBodyTextarea.value = getTemplateContent('gratitude', msg.name, msg.subject);
    }

    if (replyStatusBanner) {
      replyStatusBanner.hidden = true;
      replyStatusBanner.className = 'mail-feedback-box';
      replyStatusBanner.innerHTML = '';
    }

    updateWebmailLinks();
    openModal(mailComposerModal);
  };

  // Copy recipient email button
  const replyCopyEmailBtn = document.getElementById('reply-copy-email-btn');
  if (replyCopyEmailBtn) {
    replyCopyEmailBtn.addEventListener('click', () => {
      if (replyToInput && replyToInput.value) {
        navigator.clipboard.writeText(replyToInput.value);
        showToast(`Copied ${replyToInput.value} to clipboard!`, 'info');
      }
    });
  }

  // Copy drafted reply button
  const replyCopyDraftBtn = document.getElementById('reply-copy-draft-btn');
  if (replyCopyDraftBtn) {
    replyCopyDraftBtn.addEventListener('click', () => {
      if (replyBodyTextarea && replyBodyTextarea.value) {
        navigator.clipboard.writeText(replyBodyTextarea.value);
        showToast('Reply message copied to clipboard!', 'success');
      }
    });
  }

  // "Mark as Replied" button (records reply locally/on server without sending SMTP)
  const replyMarkOnlyBtn = document.getElementById('reply-mark-only-btn');
  if (replyMarkOnlyBtn) {
    replyMarkOnlyBtn.addEventListener('click', async () => {
      if (!activeReplyMessage) return;
      const id = activeReplyMessage.id;
      const subject = replySubjectInput ? replySubjectInput.value.trim() : 'Re: Portfolio Inquiry';
      const body = replyBodyTextarea ? replyBodyTextarea.value.trim() : 'Replied via webmail.';

      if (window.location.protocol.startsWith('http')) {
        try {
          await fetch(getApiUrl(`/api/messages/${id}/reply`), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ replySubject: subject, replyBody: body })
          });
        } catch (e) {}
      }

      // Update in memory & localStorage
      activeReplyMessage.status = 'replied';
      activeReplyMessage.is_read = 1;
      activeReplyMessage.replied_at = new Date().toISOString();
      activeReplyMessage.reply_subject = subject;
      activeReplyMessage.reply_body = body;

      const local = JSON.parse(localStorage.getItem('keerthan_contact_messages') || '[]');
      const target = local.find(x => String(x.id) === String(id));
      if (target) {
        target.status = 'replied';
        target.is_read = 1;
        target.replied_at = activeReplyMessage.replied_at;
        target.reply_subject = subject;
        target.reply_body = body;
        localStorage.setItem('keerthan_contact_messages', JSON.stringify(local));
      }

      renderMessagesList();
      closeModal(mailComposerModal);
      showToast('Inquiry marked as replied in database.', 'success');
    });
  }

  // Submit handler: Send reply via server SMTP
  if (mailReplyForm) {
    mailReplyForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const to = replyToInput ? replyToInput.value.trim() : '';
      const subject = replySubjectInput ? replySubjectInput.value.trim() : '';
      const replyText = replyBodyTextarea ? replyBodyTextarea.value.trim() : '';
      const sendBtn = document.getElementById('reply-send-smtp-btn');
      const sendBtnText = document.getElementById('reply-send-smtp-text');

      if (!to || !replyText) {
        showToast('Please specify a recipient email and response message.', 'error');
        return;
      }

      if (sendBtn) sendBtn.disabled = true;
      if (sendBtnText) sendBtnText.textContent = 'Sending email via SMTP...';

      if (replyStatusBanner) {
        replyStatusBanner.hidden = false;
        replyStatusBanner.className = 'mail-feedback-box info';
        replyStatusBanner.innerHTML = 'Connecting to mail server and dispatching email reply...';
      }

      try {
        const payload = {
          messageId: activeReplyMessage ? activeReplyMessage.id : null,
          to,
          subject,
          replyText,
          originalMessage: activeReplyMessage ? activeReplyMessage.message : '',
          originalSenderName: activeReplyMessage ? activeReplyMessage.name : ''
        };

        const res = await fetch(getApiUrl('/api/mail/send-reply'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const data = await res.json();

        if (res.ok && data.success) {
          if (replyStatusBanner) {
            replyStatusBanner.className = 'mail-feedback-box success';
            replyStatusBanner.innerHTML = `✅ <strong>Email Delivered!</strong> Successfully dispatched to ${escapeStr(to)}.`;
          }
          showToast(`Email reply delivered to ${to}!`, 'success');

          // Update message state
          if (activeReplyMessage) {
            activeReplyMessage.status = 'replied';
            activeReplyMessage.is_read = 1;
            activeReplyMessage.replied_at = new Date().toISOString();
            activeReplyMessage.reply_subject = subject;
            activeReplyMessage.reply_body = replyText;
          }

          setTimeout(() => {
            closeModal(mailComposerModal);
            fetchMessagesFromDb();
          }, 1500);
        } else {
          const errMsg = data.error || 'Server rejected SMTP email request.';
          if (replyStatusBanner) {
            replyStatusBanner.className = 'mail-feedback-box error';
            replyStatusBanner.innerHTML = `
              ❌ <strong>Could not dispatch via SMTP:</strong> ${escapeStr(errMsg)}<br>
              <span style="font-size: 0.8rem; margin-top: 0.5rem; display: inline-block;">
                💡 <strong>Instant Solution:</strong> Click <strong>"🌐 Gmail"</strong> or <strong>"📨 Outlook"</strong> below to send your pre-formatted reply directly in your browser with 1 click!
              </span>
            `;
          }
          showToast('SMTP dispatch failed. Use 1-Click Gmail compose below.', 'error');
        }
      } catch (err) {
        if (replyStatusBanner) {
          replyStatusBanner.className = 'mail-feedback-box error';
          replyStatusBanner.innerHTML = `
            ❌ <strong>Connection Error:</strong> ${escapeStr(err.message)}<br>
            <span style="font-size: 0.8rem; margin-top: 0.5rem; display: inline-block;">
              Use the 1-Click <strong>"🌐 Gmail"</strong> or <strong>"📨 Outlook"</strong> buttons below to dispatch immediately.
            </span>
          `;
        }
      } finally {
        if (sendBtn) sendBtn.disabled = false;
        if (sendBtnText) sendBtnText.textContent = '🚀 Send via Server (SMTP)';
      }
    });
  }


  /* --------------------------------------------------------------------------
     MAIL SETTINGS & SMTP CONFIGURATION CONTROLLER
     -------------------------------------------------------------------------- */
  const mailSettingsForm = document.getElementById('cms-mail-settings-form');
  const toggleMailPassBtn = document.getElementById('toggle-mail-pass-btn');
  const btnTestMailDispatch = document.getElementById('btn-test-mail-dispatch');
  const mailTestFeedback = document.getElementById('mail-test-feedback');

  // Password visibility reveal
  if (toggleMailPassBtn) {
    toggleMailPassBtn.addEventListener('click', () => {
      const passInput = document.getElementById('mail-setting-pass');
      if (passInput) {
        const isPass = passInput.type === 'password';
        passInput.type = isPass ? 'text' : 'password';
        toggleMailPassBtn.textContent = isPass ? '🔒' : '👁️';
      }
    });
  }

  // Provider preset selection
  const mailSettingProvider = document.getElementById('mail-setting-provider');
  if (mailSettingProvider) {
    mailSettingProvider.addEventListener('change', (e) => {
      const hostInput = document.getElementById('mail-setting-host');
      const portInput = document.getElementById('mail-setting-port');
      const secureInput = document.getElementById('mail-setting-secure');
      if (e.target.value === 'gmail') {
        if (hostInput) hostInput.value = 'smtp.gmail.com';
        if (portInput) portInput.value = '465';
        if (secureInput) secureInput.checked = true;
      }
    });
  }

  // Fetch Mail Settings from Server
  const fetchMailSettings = async () => {
    const healthTitle = document.getElementById('mail-health-title');
    const healthDesc = document.getElementById('mail-health-desc');
    const healthTag = document.getElementById('mail-health-tag');
    const healthDot = document.getElementById('mail-health-dot');
    const metricMailStatus = document.getElementById('inbox-metric-mailstatus');

    if (!window.location.protocol.startsWith('http')) {
      if (healthTitle) healthTitle.textContent = 'Webmail / Client Mode Active';
      if (healthDesc) healthDesc.textContent = 'Running locally. 1-Click Gmail Web and Outlook compose are fully ready.';
      if (healthTag) { healthTag.textContent = 'Webmail Ready'; healthTag.style.color = '#38bdf8'; }
      if (healthDot) healthDot.className = 'status-pulse-dot pulse-yellow';
      if (metricMailStatus) metricMailStatus.innerHTML = '<span style="color:#38bdf8;">✉️ Webmail Mode</span>';
      return;
    }

    try {
      const res = await fetch(getApiUrl('/api/mail/settings'));
      if (res.ok) {
        const s = await res.json();
        activeMailSettings = s;

        // Populate fields
        const setVal = (id, val) => {
          const el = document.getElementById(id);
          if (el && val !== undefined && val !== null) el.value = val;
        };

        setVal('mail-setting-notify-email', s.notify_email || 'keerthantunkoju10@gmail.com');
        setVal('mail-setting-provider', s.provider || 'gmail');
        setVal('mail-setting-from-name', s.from_name || 'Keerthan Tunkoju Portfolio');
        setVal('mail-setting-host', s.host || 'smtp.gmail.com');
        setVal('mail-setting-port', s.port || 465);
        setVal('mail-setting-user', s.auth_user || 'keerthantunkoju10@gmail.com');
        setVal('mail-setting-from-email', s.from_email || 'keerthantunkoju10@gmail.com');
        setVal('mail-test-target', s.notify_email || 'keerthantunkoju10@gmail.com');

        const passInput = document.getElementById('mail-setting-pass');
        if (passInput) {
          passInput.value = s.hasPassword ? '••••••••' : '';
        }

        const notifyCheckbox = document.getElementById('mail-setting-notify-enabled');
        if (notifyCheckbox) notifyCheckbox.checked = s.notify_enabled !== false;

        const secureCheckbox = document.getElementById('mail-setting-secure');
        if (secureCheckbox) secureCheckbox.checked = s.secure !== false;

        // Update health card & status pill
        if (s.hasPassword) {
          if (healthTitle) healthTitle.textContent = 'SMTP Outgoing & Alerts Active';
          if (healthDesc) healthDesc.textContent = `Connected to ${s.host}:${s.port} as ${s.auth_user}. Notifications & replies operational.`;
          if (healthTag) { healthTag.textContent = 'Connected'; healthTag.style.color = '#34d399'; }
          if (healthDot) healthDot.className = 'status-pulse-dot';
          if (metricMailStatus) metricMailStatus.innerHTML = '<span style="color:#34d399;">🟢 SMTP Active</span>';
        } else {
          if (healthTitle) healthTitle.textContent = 'SMTP Password Not Set (Webmail Fallback Active)';
          if (healthDesc) healthDesc.textContent = 'Add your Gmail App Password below to enable direct server email replies & instant email notifications.';
          if (healthTag) { healthTag.textContent = 'Setup Required'; healthTag.style.color = '#f59e0b'; }
          if (healthDot) healthDot.className = 'status-pulse-dot pulse-yellow';
          if (metricMailStatus) metricMailStatus.innerHTML = '<span style="color:#f59e0b;">🟡 Webmail Mode</span>';
        }
      }
    } catch (e) {
      console.warn('Could not load mail settings:', e);
    }
  };

  // Save Mail Settings Form Handler
  if (mailSettingsForm) {
    mailSettingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const saveBtn = document.getElementById('btn-save-mail-settings');
      if (saveBtn) saveBtn.disabled = true;

      const payload = {
        notify_email: document.getElementById('mail-setting-notify-email')?.value.trim() || 'keerthantunkoju10@gmail.com',
        notify_enabled: document.getElementById('mail-setting-notify-enabled')?.checked,
        provider: document.getElementById('mail-setting-provider')?.value || 'gmail',
        from_name: document.getElementById('mail-setting-from-name')?.value.trim() || 'Keerthan Tunkoju Portfolio',
        host: document.getElementById('mail-setting-host')?.value.trim() || 'smtp.gmail.com',
        port: Number(document.getElementById('mail-setting-port')?.value) || 465,
        secure: document.getElementById('mail-setting-secure')?.checked,
        auth_user: document.getElementById('mail-setting-user')?.value.trim() || '',
        auth_pass: document.getElementById('mail-setting-pass')?.value || '',
        from_email: document.getElementById('mail-setting-from-email')?.value.trim() || 'keerthantunkoju10@gmail.com'
      };

      try {
        const res = await fetch(getApiUrl('/api/mail/settings'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (res.ok) {
          showToast('Mail configuration saved successfully!', 'success');
          fetchMailSettings();
        } else {
          const errData = await res.json();
          showToast('Failed to save mail settings: ' + (errData.error || 'Unknown error'), 'error');
        }
      } catch (err) {
        showToast('Network error saving mail settings: ' + err.message, 'error');
      } finally {
        if (saveBtn) saveBtn.disabled = false;
      }
    });
  }

  // Send Test Email Action
  if (btnTestMailDispatch) {
    btnTestMailDispatch.addEventListener('click', async () => {
      const targetInput = document.getElementById('mail-test-target');
      const testBtnText = document.getElementById('btn-test-mail-text');
      const targetEmail = targetInput ? targetInput.value.trim() : 'keerthantunkoju10@gmail.com';

      if (!targetEmail) {
        showToast('Please specify a recipient email to send the test message to.', 'error');
        return;
      }

      btnTestMailDispatch.disabled = true;
      if (testBtnText) testBtnText.textContent = 'Testing connection...';

      if (mailTestFeedback) {
        mailTestFeedback.hidden = false;
        mailTestFeedback.className = 'mail-feedback-box info';
        mailTestFeedback.innerHTML = `Connecting to SMTP host and sending verification test email to <strong>${escapeStr(targetEmail)}</strong>...`;
      }

      const testPayload = {
        targetEmail,
        provider: document.getElementById('mail-setting-provider')?.value || 'gmail',
        host: document.getElementById('mail-setting-host')?.value.trim() || 'smtp.gmail.com',
        port: Number(document.getElementById('mail-setting-port')?.value) || 465,
        auth_user: document.getElementById('mail-setting-user')?.value.trim() || '',
        auth_pass: document.getElementById('mail-setting-pass')?.value || ''
      };

      try {
        const res = await fetch(getApiUrl('/api/mail/test'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(testPayload)
        });

        const data = await res.json();

        if (res.ok && data.success) {
          if (mailTestFeedback) {
            mailTestFeedback.className = 'mail-feedback-box success';
            mailTestFeedback.innerHTML = `
              ✅ <strong>Test Email Dispatched Successfully!</strong><br>
              A verification email has been sent to <strong>${escapeStr(targetEmail)}</strong>. Check your inbox to confirm delivery.
            `;
          }
          showToast('Test email sent successfully!', 'success');
          fetchMailSettings();
        } else {
          const errMsg = data.error || 'SMTP Connection rejected.';
          if (mailTestFeedback) {
            mailTestFeedback.className = 'mail-feedback-box error';
            mailTestFeedback.innerHTML = `
              ❌ <strong>SMTP Verification Failed:</strong> ${escapeStr(errMsg)}<br>
              <span style="font-size: 0.8rem; margin-top: 0.4rem; display: inline-block;">
                🔑 <strong>Common Fix:</strong> If using Gmail, ensure 2-Step Verification is active on your Google Account and generate an <strong>App Password</strong> (16 characters) instead of using your account password.
              </span>
            `;
          }
          showToast('SMTP Test Failed. Check credentials.', 'error');
        }
      } catch (err) {
        if (mailTestFeedback) {
          mailTestFeedback.className = 'mail-feedback-box error';
          mailTestFeedback.innerHTML = `❌ <strong>Connection Error:</strong> ${escapeStr(err.message)}`;
        }
      } finally {
        btnTestMailDispatch.disabled = false;
        if (testBtnText) testBtnText.textContent = '🧪 Send Test Email';
      }
    });
  }


  /* --------------------------------------------------------------------------
     15. DATABASE DIAGNOSTICS & RESYNC HELPERS
     -------------------------------------------------------------------------- */
  const fetchDbStats = async () => {
    if (window.location.protocol.startsWith('http')) {
      try {
        const res = await fetch(getApiUrl('/api/database/stats'));
        if (res.ok) {
          const stats = await res.json();
          const eng = document.getElementById('db-stat-engine');
          const msgs = document.getElementById('db-stat-msgs');
          const size = document.getElementById('db-stat-size');
          if (eng) eng.textContent = stats.databaseEngine;
          if (msgs) msgs.textContent = stats.totalMessages;
          if (size) size.textContent = Math.round(stats.fileSizeBytes / 1024) + ' KB';
        }
      } catch (e) {}
    }
  };

  const refreshMsgBtn = document.getElementById('refresh-messages-btn');
  if (refreshMsgBtn) {
    refreshMsgBtn.addEventListener('click', () => {
      fetchMessagesFromDb();
      showToast('Inbox refreshed from database.', 'info');
    });
  }

  const dbResyncBtn = document.getElementById('db-resync-btn');
  if (dbResyncBtn) {
    dbResyncBtn.addEventListener('click', () => {
      loadPortfolioData();
      fetchDbStats();
      showToast('Database resynchronized successfully.', 'success');
    });
  }


  /* --------------------------------------------------------------------------
     16. INITIAL BOOTSTRAP
     -------------------------------------------------------------------------- */
  loadPortfolioData();
  renderAll();
  updateAdminUI();
  fetchMessagesFromDb();
  fetchMailSettings();
  fetchDbStats();

});
