/* ========================================
   violations.js — Violations page logic
   ======================================== */

let allViolations = [];
let filteredViolations = [];
let currentFilter = 'all';
let currentSort   = { key: 'created_at', dir: 'desc' };
let currentPage   = 1;
const PAGE_SIZE   = 10;

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.require()) return;

  // Show add button for admin/officer
  const user = Auth.getUser();
  if (user && (user.role === 'admin' || user.role === 'officer')) {
    document.getElementById('addViolationBtn').style.display = 'inline-flex';
  }

  // Skeleton loading rows
  document.getElementById('violationsBody').innerHTML = skeletonRows(7, 6);
  await loadViolations();
});

/* ---- Load from API ---- */
async function loadViolations() {
  document.getElementById('violationsBody').innerHTML = skeletonRows(7, 6);
  document.getElementById('paginationInfo').textContent = 'Loading…';

  const { ok, status, data } = await apiFetch('/traffic/violations');
  if (!ok) {
    if (status === 401) return Auth.logout();
    Toast.error('Load failed', 'Could not fetch violations. Please retry.');
    document.getElementById('violationsBody').innerHTML = `
      <tr><td colspan="7">
        <div class="empty-state">
          <div class="empty-icon">⚠️</div>
          <h3>Failed to load</h3>
          <p>Check your connection and <a href="#" onclick="loadViolations()" style="color:var(--accent);">try again</a>.</p>
        </div>
      </td></tr>`;
    return;
  }

  allViolations = data.violations || [];
  applyFilters();
}

/* ---- Filter + Search ---- */
function setFilter(el, filter) {
  currentFilter = filter;
  currentPage   = 1;
  document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
  el.classList.add('active');
  applyFilters();
}

function applyFilters() {
  const query = (document.getElementById('searchInput')?.value || '').toLowerCase().trim();

  filteredViolations = allViolations.filter(v => {
    const matchFilter = currentFilter === 'all' || v.status === currentFilter;
    const matchSearch = !query || v.vehicle_number.toLowerCase().includes(query)
                               || v.violation_type.toLowerCase().includes(query);
    return matchFilter && matchSearch;
  });

  applySortToFiltered();
  renderPage();
}

/* ---- Sort ---- */
function sortBy(key) {
  if (currentSort.key === key) {
    currentSort.dir = currentSort.dir === 'asc' ? 'desc' : 'asc';
  } else {
    currentSort = { key, dir: 'asc' };
  }

  // Update header icons
  document.querySelectorAll('thead th .sort-icon').forEach(el => el.textContent = '↕');
  document.querySelectorAll('thead th').forEach(th => {
    th.classList.remove('sort-asc', 'sort-desc');
    const onclick = th.getAttribute('onclick');
    if (onclick && onclick.includes(`'${key}'`)) {
      th.classList.add(currentSort.dir === 'asc' ? 'sort-asc' : 'sort-desc');
      th.querySelector('.sort-icon').textContent = currentSort.dir === 'asc' ? '↑' : '↓';
    }
  });

  applySortToFiltered();
  renderPage();
}

function applySortToFiltered() {
  const { key, dir } = currentSort;
  filteredViolations.sort((a, b) => {
    let va = a[key], vb = b[key];
    if (key === 'fine_amount') { va = parseFloat(va); vb = parseFloat(vb); }
    else if (key === 'created_at') { va = new Date(va); vb = new Date(vb); }
    else { va = String(va).toLowerCase(); vb = String(vb).toLowerCase(); }
    if (va < vb) return dir === 'asc' ? -1 :  1;
    if (va > vb) return dir === 'asc' ?  1 : -1;
    return 0;
  });
}

/* ---- Render table ---- */
function renderPage() {
  const tbody = document.getElementById('violationsBody');
  const total = filteredViolations.length;
  const pages = Math.ceil(total / PAGE_SIZE);
  if (currentPage > pages && pages > 0) currentPage = pages;

  const start = (currentPage - 1) * PAGE_SIZE;
  const items = filteredViolations.slice(start, start + PAGE_SIZE);

  // Pagination info
  const pStart = total === 0 ? 0 : start + 1;
  const pEnd   = Math.min(start + PAGE_SIZE, total);
  document.getElementById('paginationInfo').textContent =
    total === 0 ? 'No results' : `Showing ${pStart}–${pEnd} of ${total}`;

  // Empty state
  if (items.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="7">
        <div class="empty-state">
          <div class="empty-icon">🔍</div>
          <h3>No violations found</h3>
          <p>${currentFilter !== 'all' ? 'Try clearing the filter.' : 'No violations have been recorded yet.'}</p>
        </div>
      </td></tr>`;
    renderPagination(0, 1);
    return;
  }

  const user = Auth.getUser();
  const canPay = user?.role === 'citizen' || user?.role === 'admin';

  tbody.innerHTML = items.map(v => `
    <tr>
      <td class="td-muted" style="font-size:12px;">#${v.id}</td>
      <td><span class="vehicle-num">${v.vehicle_number}</span></td>
      <td>${v.violation_type}</td>
      <td style="font-weight:700;color:var(--text-primary);">${formatCurrency(v.fine_amount)}</td>
      <td>${statusBadge(v.status)}</td>
      <td class="td-muted">${formatDate(v.created_at)}</td>
      <td>
        ${v.status === 'pending' && canPay
          ? `<button class="btn btn-primary btn-sm" onclick="openPayModal(${v.id}, '${v.vehicle_number}', ${v.fine_amount})">
              💳 Pay
             </button>`
          : v.status === 'paid'
          ? `<span style="font-size:12px;color:var(--success);font-weight:600;">✓ Paid</span>`
          : `<span style="font-size:12px;color:var(--text-muted);">—</span>`
        }
      </td>
    </tr>
  `).join('');

  renderPagination(pages, currentPage);
}

function renderPagination(pages, cur) {
  const btns = document.getElementById('pageBtns');
  if (!btns) return;
  if (pages <= 1) { btns.innerHTML = ''; return; }

  let html = `<button class="page-btn" onclick="goPage(${cur-1})" ${cur===1?'disabled':''}>‹</button>`;
  for (let i = 1; i <= pages; i++) {
    if (i === 1 || i === pages || Math.abs(i - cur) <= 1) {
      html += `<button class="page-btn ${i===cur?'active':''}" onclick="goPage(${i})">${i}</button>`;
    } else if (Math.abs(i - cur) === 2) {
      html += `<span style="padding:0 4px;color:var(--text-muted);">…</span>`;
    }
  }
  html += `<button class="page-btn" onclick="goPage(${cur+1})" ${cur===pages?'disabled':''}>›</button>`;
  btns.innerHTML = html;
}

function goPage(p) {
  currentPage = p;
  renderPage();
  document.querySelector('.card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---- Payment Modal ---- */
let payingViolationId = null;

function openPayModal(id, vehicle, amount) {
  payingViolationId = id;
  document.getElementById('payViolationId').textContent = '#' + id;
  document.getElementById('payVehicle').textContent     = vehicle;
  document.getElementById('payAmount').textContent      = formatCurrency(amount);
  document.getElementById('payStep1').style.display = '';
  document.getElementById('payStep2').style.display = 'none';
  document.getElementById('payModal').classList.add('open');
}

async function simulatePayment() {
  const btn = document.querySelector('#payStep1 .btn-primary');
  btn.textContent = '⏳ Processing…';
  btn.disabled = true;

  await new Promise(r => setTimeout(r, 1800)); // simulate delay

  // Update locally optimistically
  const v = allViolations.find(x => x.id === payingViolationId);
  if (v) v.status = 'paid';

  document.getElementById('payStep1').style.display = 'none';
  document.getElementById('payStep2').style.display = '';

  Toast.success('Payment successful!', 'Your violation has been marked as paid.');
  applyFilters();

  btn.textContent = 'Pay Now 🔒';
  btn.disabled = false;
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove('open');
}

// Close on backdrop click
document.querySelectorAll('.modal-overlay').forEach(m => {
  m.addEventListener('click', e => { if (e.target === m) closeModal(m.id); });
});

/* ---- Add Violation Modal ---- */
function openAddModal() {
  document.getElementById('addModal').classList.add('open');
}

async function submitViolation(e) {
  e.preventDefault();
  const btn = document.getElementById('avSubmitBtn');
  btn.textContent = 'Adding…';
  btn.disabled    = true;

  const payload = {
    vehicle_number: document.getElementById('avVehicle').value.trim().toUpperCase(),
    violation_type: document.getElementById('avType').value,
    description   : document.getElementById('avDesc').value.trim(),
    fine_amount   : parseFloat(document.getElementById('avFine').value),
  };

  const { ok, data } = await apiFetch('/traffic/violations', {
    method: 'POST',
    body  : JSON.stringify(payload),
  });

  if (ok) {
    Toast.success('Violation added', `ID #${data.id} created successfully.`);
    closeModal('addModal');
    e.target.reset();
    await loadViolations();
  } else {
    Toast.error('Failed', data.message || 'Could not add violation.');
  }

  btn.textContent = 'Add Violation';
  btn.disabled    = false;
}
