/* ========================================
   dashboard.js — Dashboard page logic
   ======================================== */

let doughnutChart   = null;
let themeObserver   = null; /* BUG FIX: track observer so we don't leak on reload */

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.require()) return;

  /* Personalised greeting */
  const user = Auth.getUser();
  if (user) {
    const hour  = new Date().getHours();
    const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    const el = document.getElementById('dashboardGreeting');
    if (el) el.textContent = `${greet}, ${user.name || 'there'}. Here's your violations summary.`;
  }

  /* Show skeleton rows while loading */
  const recentTable = document.getElementById('recentTable');
  if (recentTable) recentTable.innerHTML = skeletonRows(6, 3);

  await loadDashboardData();
});

async function loadDashboardData() {
  const { ok, status, data } = await apiFetch('/traffic/violations');

  /* BUG FIX: status 0 = network error (backend offline) */
  if (status === 0) {
    showOfflineBanner();
    showTableError('recentTable', 6, 'Cannot reach server', loadDashboardData);
    return;
  }

  if (!ok) {
    if (status === 401) return Auth.logout();
    Toast.error('Load failed', data.message || 'Could not fetch violation data.');
    showTableError('recentTable', 6, 'Failed to load data', loadDashboardData);
    return;
  }

  hideOfflineBanner();
  const violations = Array.isArray(data.violations) ? data.violations : [];

  /* ---- Stats ---- */
  const total    = violations.length;
  const pending  = violations.filter(v => v.status === 'pending').length;
  const paid     = violations.filter(v => v.status === 'paid').length;
  const fines    = violations
    .filter(v => v.status === 'pending')
    .reduce((s, v) => s + parseFloat(v.fine_amount || 0), 0);

  setTextSafe('statTotal',   total);
  setTextSafe('statPending', pending);
  setTextSafe('statPaid',    paid);
  setTextSafe('statFines',   formatCurrency(fines));

  /* Pending badge in sidebar nav */
  const badge = document.getElementById('pendingBadge');
  if (badge) {
    badge.textContent    = pending;
    badge.style.display  = pending > 0 ? 'inline-block' : 'none';
  }

  /* ---- Doughnut Chart ---- */
  const canvas = document.getElementById('chartDoughnut');
  if (canvas) {
    const ctx       = canvas.getContext('2d');
    const contested = violations.filter(v => v.status === 'contested').length;

    /* BUG FIX: destroy previous chart instance before creating a new one */
    if (doughnutChart) {
      doughnutChart.destroy();
      doughnutChart = null;
    }

    /* BUG FIX: disconnect previous observer before creating a new one */
    if (themeObserver) {
      themeObserver.disconnect();
      themeObserver = null;
    }

    const legendColor = () =>
      getComputedStyle(document.documentElement)
        .getPropertyValue('--text-secondary').trim() || '#64748b';

    doughnutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels  : ['Pending', 'Paid', 'Contested'],
        datasets: [{
          data           : [pending, paid, contested],
          backgroundColor: ['#f59e0b', '#22c55e', '#ef4444'],
          borderWidth    : 0,
          hoverOffset    : 6,
        }],
      },
      options: {
        cutout : '72%',
        plugins: {
          legend: {
            position: 'bottom',
            labels  : {
              boxWidth: 10,
              padding : 16,
              font    : { size: 12, family: 'Inter' },
              color   : legendColor(),
            },
          },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ${ctx.raw} (${total ? Math.round(ctx.raw / total * 100) : 0}%)`,
            },
          },
        },
      },
    });

    /* Update legend colour when theme changes — one observer per load */
    themeObserver = new MutationObserver(() => {
      if (doughnutChart) {
        doughnutChart.options.plugins.legend.labels.color = legendColor();
        doughnutChart.update('none');
      }
    });
    themeObserver.observe(document.documentElement, {
      attributes     : true,
      attributeFilter: ['data-theme'],
    });
  }

  /* ---- Activity Feed ---- */
  const activityList = document.getElementById('activityList');
  if (activityList) {
    const recent = [...violations]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    if (recent.length === 0) {
      activityList.innerHTML =
        `<li style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px;">No recent activity.</li>`;
    } else {
      const dotColor = { pending: 'amber', paid: 'green', contested: 'red' };
      activityList.innerHTML = recent.map(v => `
        <li class="activity-item">
          <div class="activity-dot ${dotColor[v.status] || 'blue'}"></div>
          <div>
            <div class="activity-text">
              <strong>${escapeHtml(v.vehicle_number)}</strong> — ${escapeHtml(v.violation_type)}
              ${statusBadge(v.status)}
            </div>
            <div class="activity-time">${timeAgo(v.created_at)}</div>
          </div>
        </li>
      `).join('');
    }
  }

  /* ---- Recent Violations Table (5 most recent) ---- */
  const tbody = document.getElementById('recentTable');
  if (tbody) {
    const recent5 = [...violations]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    if (recent5.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="6">
          <div class="empty-state">
            <div class="empty-icon">📋</div>
            <h3>No violations yet</h3>
            <p>Violations will appear here once recorded.</p>
          </div>
        </td></tr>`;
    } else {
      tbody.innerHTML = recent5.map(v => `
        <tr>
          <td class="td-muted" style="font-size:12px;">#${v.id}</td>
          <td><span class="vehicle-num">${escapeHtml(v.vehicle_number)}</span></td>
          <td>${escapeHtml(v.violation_type)}</td>
          <td style="font-weight:700;">${formatCurrency(v.fine_amount)}</td>
          <td>${statusBadge(v.status)}</td>
          <td class="td-muted">${formatDate(v.created_at)}</td>
        </tr>
      `).join('');
    }
  }
}

/* ---- Helpers ---- */
function setTextSafe(id, text) {
  const el = document.getElementById(id);
  if (el) el.textContent = text;
}

function showTableError(tbodyId, cols, msg, retryFn) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  tbody.innerHTML = `
    <tr><td colspan="${cols}" style="text-align:center;padding:40px;color:var(--text-muted);">
      ⚠️ ${escapeHtml(msg)}.
      <a href="#" onclick="event.preventDefault();${retryFn.name}();" style="color:var(--accent);margin-left:6px;">Retry</a>
    </td></tr>`;
}
