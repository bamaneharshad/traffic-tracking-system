/* ========================================
   dashboard.js — Dashboard page logic
   ======================================== */

let doughnutChart = null;

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.require()) return;

  // Personalised greeting
  const user = Auth.getUser();
  if (user) {
    const hour = new Date().getHours();
    const greet = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
    document.getElementById('dashboardGreeting').textContent =
      `${greet}, ${user.name || 'there'}. Here's your violations summary.`;
  }

  // Show skeleton rows in table
  document.getElementById('recentTable').innerHTML = skeletonRows(6, 3);

  await loadDashboardData();
});

async function loadDashboardData() {
  const { ok, status, data } = await apiFetch('/traffic/violations');

  if (!ok) {
    if (status === 401) return Auth.logout();
    Toast.error('Load failed', 'Could not fetch violation data.');
    document.getElementById('recentTable').innerHTML = `
      <tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted);">
        Failed to load data. <a href="#" onclick="loadDashboardData()" style="color:var(--accent);">Retry</a>
      </td></tr>`;
    return;
  }

  const violations = data.violations || [];

  // --- Stats ---
  const total    = violations.length;
  const pending  = violations.filter(v => v.status === 'pending').length;
  const paid     = violations.filter(v => v.status === 'paid').length;
  const fines    = violations
    .filter(v => v.status === 'pending')
    .reduce((s, v) => s + parseFloat(v.fine_amount || 0), 0);

  document.getElementById('statTotal').textContent   = total;
  document.getElementById('statPending').textContent = pending;
  document.getElementById('statPaid').textContent    = paid;
  document.getElementById('statFines').textContent   = formatCurrency(fines);

  // Update pending badge in sidebar
  const badge = document.getElementById('pendingBadge');
  if (badge) {
    badge.textContent = pending;
    badge.style.display = pending > 0 ? 'inline-block' : 'none';
  }

  // --- Doughnut Chart ---
  const ctx = document.getElementById('chartDoughnut')?.getContext('2d');
  if (ctx) {
    const contested = violations.filter(v => v.status === 'contested').length;
    if (doughnutChart) doughnutChart.destroy();

    doughnutChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Pending', 'Paid', 'Contested'],
        datasets: [{
          data: [pending, paid, contested],
          backgroundColor: ['#f59e0b', '#22c55e', '#ef4444'],
          borderWidth: 0,
          hoverOffset: 6,
        }]
      },
      options: {
        cutout: '72%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 10,
              padding: 16,
              font: { size: 12, family: 'Inter' },
              color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim(),
            }
          },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.label}: ${ctx.raw} (${total ? Math.round(ctx.raw / total * 100) : 0}%)`
            }
          }
        }
      }
    });

    // Fix chart colors in dark mode
    const obs = new MutationObserver(() => {
      if (doughnutChart) {
        doughnutChart.options.plugins.legend.labels.color =
          getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim();
        doughnutChart.update();
      }
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }

  // --- Activity Feed ---
  const activityList = document.getElementById('activityList');
  if (activityList) {
    const recent = [...violations]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .slice(0, 5);

    if (recent.length === 0) {
      activityList.innerHTML = `<li style="text-align:center;padding:20px;color:var(--text-muted);font-size:13px;">No recent activity.</li>`;
    } else {
      const dotColor = { pending: 'amber', paid: 'green', contested: 'red' };
      activityList.innerHTML = recent.map(v => `
        <li class="activity-item">
          <div class="activity-dot ${dotColor[v.status] || 'blue'}"></div>
          <div>
            <div class="activity-text">
              <strong>${v.vehicle_number}</strong> — ${v.violation_type}
              <span class="badge ${v.status === 'paid' ? 'badge-success' : v.status === 'pending' ? 'badge-warning' : 'badge-danger'}"
                    style="margin-left:6px;font-size:10px;">${v.status}</span>
            </div>
            <div class="activity-time">${timeAgo(v.created_at)}</div>
          </div>
        </li>
      `).join('');
    }
  }

  // --- Recent Violations Table (5 most recent) ---
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
          <td><span class="vehicle-num">${v.vehicle_number}</span></td>
          <td>${v.violation_type}</td>
          <td style="font-weight:700;">${formatCurrency(v.fine_amount)}</td>
          <td>${statusBadge(v.status)}</td>
          <td class="td-muted">${formatDate(v.created_at)}</td>
        </tr>
      `).join('');
    }
  }
}
