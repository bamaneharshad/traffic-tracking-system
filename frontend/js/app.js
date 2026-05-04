/* ========================================
   app.js — Shared utilities & UI helpers
   ======================================== */

const API_BASE = (
  window.location.hostname.includes('replit') ||
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'
) ? '/api'
  : 'https://traffic-tracking-system.onrender.com/api';

/* ---- Auth helpers ---- */
const Auth = {
  getToken: () => localStorage.getItem('token'),

  /* BUG FIX: wrap JSON.parse in try/catch — corrupted localStorage crashes page */
  getUser() {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      localStorage.removeItem('user');
      return null;
    }
  },

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
    if (!container || !document.body.contains(container)) {
      container = document.createElement('div');
      container.id = 'toast-container';
      document.body.appendChild(container);
    }
    return container;
  }

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };

  function show(type, title, msg, duration = 4500) {
    const c = ensureContainer();
    const t = document.createElement('div');
    t.className = `toast ${type}`;
    /* Escape title/msg to prevent XSS */
    const safe = s => String(s).replace(/</g, '&lt;').replace(/>/g, '&gt;');
    t.innerHTML = `
      <span class="toast-icon">${icons[type] || 'ℹ️'}</span>
      <div class="toast-body">
        <div class="toast-title">${safe(title)}</div>
        ${msg ? `<div class="toast-msg">${safe(msg)}</div>` : ''}
      </div>
      <button class="toast-close" aria-label="Dismiss">×</button>
    `;
    t.querySelector('.toast-close').addEventListener('click', () => t.remove());
    c.appendChild(t);

    const timer = setTimeout(() => {
      t.classList.add('removing');
      setTimeout(() => t.remove(), 300);
    }, duration);

    /* Cancel auto-remove on hover */
    t.addEventListener('mouseenter', () => clearTimeout(timer));
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
  const KEY = 'tt-theme';
  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(KEY, theme);
  }
  function init() {
    const saved = localStorage.getItem(KEY) || 'light';
    apply(saved);
    return saved;
  }
  function toggle() {
    const cur  = document.documentElement.getAttribute('data-theme') || 'light';
    const next = cur === 'dark' ? 'light' : 'dark';
    apply(next);
    return next;
  }
  return { init, toggle, apply };
})();

/* ---- API fetch helper ----
   BUG FIX: Added try/catch so network failures (backend down, DNS error, CORS)
   return a structured error instead of throwing an uncaught TypeError.
   Also adds a simple retry mechanism for transient failures.
*/
async function apiFetch(path, options = {}, _retries = 2) {
  const token = Auth.getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  try {
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

    /* Parse JSON safely — backend might return non-JSON on some errors */
    let data = {};
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      try { data = await res.json(); } catch { data = {}; }
    }

    return { ok: res.ok, status: res.status, data };

  } catch (err) {
    /* Network error (backend offline, no connection, etc.) */
    if (_retries > 0) {
      /* Retry with exponential back-off: 400ms, 800ms */
      await new Promise(r => setTimeout(r, (3 - _retries) * 400));
      return apiFetch(path, options, _retries - 1);
    }
    /* All retries exhausted — return a structured failure */
    console.error('[apiFetch] Network error on', path, err);
    return {
      ok    : false,
      status: 0,
      data  : { message: 'Network error — check your connection or try again.' },
    };
  }
}

/* ---- Global unhandled-promise error handler ----
   BUG FIX: Prevents silent crashes from showing a blank page.
*/
window.addEventListener('unhandledrejection', (e) => {
  console.error('[Unhandled Promise]', e.reason);
  /* Don't spam toasts for navigation-related aborts */
  if (e.reason && e.reason.name === 'AbortError') return;
  Toast.error('Unexpected error', 'Something went wrong. Please refresh.');
});

/* ---- Sidebar wiring ---- */
function initSidebar() {
  const sidebar   = document.getElementById('sidebar');
  const overlay   = document.getElementById('sidebarOverlay');
  const hamburger = document.getElementById('hamburger');

  function openSidebar()  { sidebar?.classList.add('open');    overlay?.classList.add('open'); }
  function closeSidebar() { sidebar?.classList.remove('open'); overlay?.classList.remove('open'); }

  /* BUG FIX: guard against duplicate listener registration */
  if (hamburger && !hamburger._sidebarBound) {
    hamburger.addEventListener('click', openSidebar);
    hamburger._sidebarBound = true;
  }
  if (overlay && !overlay._sidebarBound) {
    overlay.addEventListener('click', closeSidebar);
    overlay._sidebarBound = true;
  }

  /* Populate user info in sidebar and topbar */
  const user = Auth.getUser();
  if (user) {
    const raw      = (user.name || user.email || '?');
    const initials = raw.slice(0, 2).toUpperCase();

    const sidebarUser = document.getElementById('sidebarUser');
    if (sidebarUser) {
      /* BUG FIX: escape user-supplied data before inserting as HTML */
      const safeName = escapeHtml(user.name || 'User');
      const safeRole = escapeHtml(user.role || 'citizen');
      sidebarUser.innerHTML = `
        <div class="avatar">${escapeHtml(initials)}</div>
        <div>
          <div class="sidebar-user-name">${safeName}</div>
          <div class="sidebar-user-role">${safeRole}</div>
        </div>
      `;
    }

    const tbName   = document.getElementById('topbarUserName');
    const tbRole   = document.getElementById('topbarUserRole');
    const tbAvatar = document.getElementById('topbarAvatar');
    if (tbName)   tbName.textContent   = user.name  || user.email || 'User';
    if (tbRole)   tbRole.textContent   = user.role  || 'citizen';
    if (tbAvatar) tbAvatar.textContent = initials;
  }

  /* Logout buttons — guard against duplicate binding */
  document.querySelectorAll('[data-action="logout"]').forEach(el => {
    if (!el._logoutBound) {
      el.addEventListener('click', () => Auth.logout());
      el._logoutBound = true;
    }
  });

  /* Dark mode toggle */
  const themeBtn = document.getElementById('themeToggle');
  if (themeBtn && !themeBtn._themeBound) {
    function updateIcon(theme) {
      themeBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
      themeBtn.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    }
    updateIcon(document.documentElement.getAttribute('data-theme') || 'light');
    themeBtn.addEventListener('click', () => updateIcon(Theme.toggle()));
    themeBtn._themeBound = true;
  }

  /* Mark active nav link by current page filename */
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });
}

/* ---- Safe HTML escape ---- */
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/* ---- Format helpers ---- */
function formatCurrency(n) {
  const num = parseFloat(n);
  if (isNaN(num)) return '$0.00';
  return '$' + num.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatDate(d) {
  if (!d) return '—';
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function timeAgo(d) {
  if (!d) return '—';
  const parsed = new Date(d);
  if (isNaN(parsed.getTime())) return '—';
  const diff = Date.now() - parsed.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function statusBadge(status) {
  const map = {
    paid      : ['badge-success', '✓ Paid'],
    pending   : ['badge-warning', '⏳ Pending'],
    contested : ['badge-danger',  '⚡ Contested'],
  };
  const [cls, label] = map[status] || ['badge-neutral', escapeHtml(status || '—')];
  return `<span class="badge ${cls}">${label}</span>`;
}

/* ---- Skeleton rows ---- */
function skeletonRows(cols, count = 5) {
  const cell = '<td><span class="skeleton" style="display:block;height:14px;border-radius:4px;"></span></td>';
  const row  = `<tr class="skeleton-row">${cell.repeat(cols)}</tr>`;
  return row.repeat(count);
}

/* ---- Backend health banner ---- */
function showOfflineBanner() {
  if (document.getElementById('offlineBanner')) return;
  const banner = document.createElement('div');
  banner.id = 'offlineBanner';
  banner.style.cssText = [
    'position:fixed;top:0;left:0;right:0;z-index:9998',
    'background:#ef4444;color:#fff',
    'padding:10px 20px;font-size:13px;font-weight:600',
    'text-align:center;display:flex;align-items:center;justify-content:center;gap:12px',
  ].join(';');
  banner.innerHTML = `
    ⚠️ Cannot connect to the server. Some features may be unavailable.
    <button onclick="location.reload()" style="background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.4);color:#fff;padding:4px 12px;border-radius:6px;cursor:pointer;font-size:12px;font-weight:700;">
      Retry
    </button>
    <button onclick="this.parentElement.remove()" style="background:none;border:none;color:#fff;cursor:pointer;font-size:18px;line-height:1;padding:0 4px;">×</button>
  `;
  document.body.prepend(banner);
}

function hideOfflineBanner() {
  document.getElementById('offlineBanner')?.remove();
}

/* ---- Init on DOMContentLoaded ---- */
document.addEventListener('DOMContentLoaded', () => {
  Theme.init();
  initSidebar();
});
