/* ========================================
   app.js — Shared utilities & UI helpers
   ======================================== */

const API_BASE = '/api';

/* ---- Auth helpers ---- */
const Auth = {
  getToken : () => localStorage.getItem('token'),
  getUser  : () => JSON.parse(localStorage.getItem('user') || 'null'),
  isLoggedIn: () => !!localStorage.getItem('token'),
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = 'login.html';
  },
  require() {
    if (!this.isLoggedIn()) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  }
};

/* ---- Toast Notifications ---- */
const Toast = (() => {
  let container;
  function ensureContainer() {
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  const icons = {
    success: '✅',
    error  : '❌',
    warning: '⚠️',
    info   : 'ℹ️',
  };

  function show(type, title, msg, duration = 4000) {
    const c = ensureContainer();
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    t.innerHTML = `
      <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
      <div class="toast-body">
        <div class="toast-title">${title}</div>
        ${msg ? `<div class="toast-msg">${msg}</div>` : ''}
      </div>
      <button class="toast-close" onclick="this.closest('.toast').remove()">×</button>
    `;
    c.appendChild(t);
    setTimeout(() => {
      t.classList.add('removing');
      setTimeout(() => t.remove(), 300);
    }, duration);
    return t;
  }

  return {
    success: (title, msg) => show('success', title, msg),
    error  : (title, msg) => show('error',   title, msg),
    warning: (title, msg) => show('warning', title, msg),
    info   : (title, msg) => show('info',    title, msg),
  };
})();

/* ---- Dark Mode ---- */
const Theme = (() => {
  const key = 'tt-theme';
  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(key, theme);
  }
  function init() {
    const saved = localStorage.getItem(key) || 'light';
    apply(saved);
    return saved;
  }
  function toggle() {
    const cur = document.documentElement.getAttribute('data-theme') || 'light';
    const next = cur === 'dark' ? 'light' : 'dark';
    apply(next);
    return next;
  }
  return { init, toggle, apply };
})();

/* ---- API fetch helper ---- */
async function apiFetch(path, options = {}) {
  const token = Auth.getToken();
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

/* ---- Sidebar wiring ---- */
function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  const hamburger = document.getElementById('hamburger');

  function openSidebar() {
    sidebar?.classList.add('open');
    overlay?.classList.add('open');
  }
  function closeSidebar() {
    sidebar?.classList.remove('open');
    overlay?.classList.remove('open');
  }

  hamburger?.addEventListener('click', openSidebar);
  overlay?.addEventListener('click', closeSidebar);

  /* Populate user info in sidebar */
  const user = Auth.getUser();
  if (user) {
    const initials = (user.name || user.email || '?').slice(0, 2).toUpperCase();
    const el = document.getElementById('sidebarUser');
    if (el) {
      el.innerHTML = `
        <div class="avatar">${initials}</div>
        <div>
          <div class="sidebar-user-name">${user.name || 'User'}</div>
          <div class="sidebar-user-role">${user.role || 'citizen'}</div>
        </div>
      `;
    }
    /* Topbar user */
    const tbName = document.getElementById('topbarUserName');
    const tbRole = document.getElementById('topbarUserRole');
    const tbAvatar = document.getElementById('topbarAvatar');
    if (tbName) tbName.textContent = user.name || user.email;
    if (tbRole) tbRole.textContent = user.role || 'citizen';
    if (tbAvatar) tbAvatar.textContent = initials;
  }

  /* Logout buttons */
  document.querySelectorAll('[data-action="logout"]').forEach(el => {
    el.addEventListener('click', () => Auth.logout());
  });

  /* Dark mode toggle */
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn) {
    function updateThemeIcon(theme) {
      themeBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
      themeBtn.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    }
    const cur = document.documentElement.getAttribute('data-theme') || 'light';
    updateThemeIcon(cur);
    themeBtn.addEventListener('click', () => {
      const next = Theme.toggle();
      updateThemeIcon(next);
    });
  }

  /* Mark active nav item based on URL */
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    if (el.dataset.page === page) el.classList.add('active');
  });
}

/* ---- Format helpers ---- */
function formatCurrency(n) {
  return '$' + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function timeAgo(d) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function statusBadge(status) {
  const map = {
    paid      : ['badge-success', '✓ Paid'],
    pending   : ['badge-warning', '⏳ Pending'],
    contested : ['badge-danger',  '⚡ Contested'],
  };
  const [cls, label] = map[status] || ['badge-neutral', status];
  return `<span class="badge ${cls}">${label}</span>`;
}

/* ---- Skeleton rows ---- */
function skeletonRows(cols, count = 5) {
  return Array.from({ length: count }, () =>
    `<tr class="skeleton-row">${Array.from({ length: cols }, () => '<td><span class="skeleton" style="display:block;height:14px;"></span></td>').join('')}</tr>`
  ).join('');
}

/* ---- Init on load ---- */
document.addEventListener('DOMContentLoaded', () => {
  Theme.init();
  initSidebar();
});
