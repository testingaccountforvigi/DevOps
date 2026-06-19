/* ============================================================
   dashboard.js  —  User Dashboard
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  if (!Auth.requireAuth()) return;
  initSidebar('dashboard');

  const user = Auth.getUser();
  renderWelcome(user);

  await loadDashboardData(user);
});

/* ── Welcome banner ── */
function renderWelcome(user) {
  const el = document.getElementById('welcome-name');
  if (el) el.textContent = user.full_name.split(' ')[0];

  const dateEl = document.getElementById('today-date');
  if (dateEl) {
    dateEl.textContent = new Date().toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });
  }
}

/* ── Load all dashboard data ── */
async function loadDashboardData(user) {
  try {
    const res = await api.loans.myLoans();
    const loans = res.loans || [];

    renderSummaryCards(loans);
    renderRecentLoans(loans.slice(0, 5));
    renderLoanChart(loans);
  } catch (err) {
    Toast.error('Failed to load dashboard data.');
    console.error(err);
  }
}

/* ── Summary stat cards ── */
function renderSummaryCards(loans) {
  const total     = loans.length;
  const pending   = loans.filter(l => l.status === 'pending').length;
  const approved  = loans.filter(l => l.status === 'approved').length;
  const disbursed = loans.filter(l => l.status === 'disbursed').length;
  const totalAmt  = loans
    .filter(l => ['approved','disbursed'].includes(l.status))
    .reduce((sum, l) => sum + parseFloat(l.loan_amount), 0);

  setCard('stat-total',    total);
  setCard('stat-pending',  pending);
  setCard('stat-approved', approved + disbursed);
  setCard('stat-amount',   Fmt.currency(totalAmt));
}

function setCard(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/* ── Recent loans table ── */
function renderRecentLoans(loans) {
  const tbody = document.getElementById('recent-loans-body');
  const empty = document.getElementById('recent-empty');
  if (!tbody) return;

  if (loans.length === 0) {
    tbody.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  tbody.innerHTML = loans.map(loan => `
    <tr>
      <td>
        <span style="font-size:18px">${Fmt.loanTypeIcon(loan.loan_type)}</span>
        <span style="margin-left:8px;font-weight:600;text-transform:capitalize">${loan.loan_type}</span>
      </td>
      <td class="td-mono">${Fmt.currency(loan.loan_amount)}</td>
      <td>
        <div style="display:flex;align-items:center;gap:6px">
          <div style="font-weight:600;color:${Fmt.creditRating(loan.credit_score).color}">${loan.credit_score}</div>
          <div style="font-size:11px;color:var(--text-faint)">${Fmt.creditRating(loan.credit_score).label}</div>
        </div>
      </td>
      <td>${Fmt.badge(loan.status)}</td>
      <td style="color:var(--text-faint)">${Fmt.date(loan.created_at)}</td>
    </tr>
  `).join('');
}

/* ── Donut-style chart (pure CSS/SVG) ── */
function renderLoanChart(loans) {
  const counts = {
    pending:  loans.filter(l => l.status === 'pending').length,
    approved: loans.filter(l => l.status === 'approved').length,
    rejected: loans.filter(l => l.status === 'rejected').length,
    disbursed:loans.filter(l => l.status === 'disbursed').length,
  };

  const total = Object.values(counts).reduce((a,b) => a + b, 0);
  if (total === 0) return;

  const colors = {
    pending : '#f59e0b',
    approved: '#10b981',
    rejected: '#ef4444',
    disbursed:'#06b6d4',
  };

  /* SVG donut */
  const size = 160, cx = 80, cy = 80, r = 60, stroke = 22;
  const circumference = 2 * Math.PI * r;
  let offset = 0;

  const segments = Object.entries(counts).map(([key, val]) => {
    const pct  = val / total;
    const dash = pct * circumference;
    const seg  = `<circle cx="${cx}" cy="${cy}" r="${r}"
      fill="none" stroke="${colors[key]}" stroke-width="${stroke}"
      stroke-dasharray="${dash} ${circumference - dash}"
      stroke-dashoffset="${-offset}"
      transform="rotate(-90 ${cx} ${cy})"
      style="transition:stroke-dasharray 0.5s ease">
      <title>${Fmt.capitalize(key)}: ${val}</title>
    </circle>`;
    offset += dash;
    return seg;
  });

  const svgEl = document.getElementById('loan-donut');
  if (svgEl) {
    svgEl.innerHTML = `
      <svg viewBox="0 0 160 160" width="160" height="160">
        ${segments.join('')}
        <text x="${cx}" y="${cy - 6}" text-anchor="middle"
          fill="#e2e8f0" font-size="22" font-weight="800">${total}</text>
        <text x="${cx}" y="${cy + 14}" text-anchor="middle"
          fill="#64748b" font-size="10">Total Loans</text>
      </svg>`;
  }

  /* Legend */
  const legendEl = document.getElementById('chart-legend');
  if (legendEl) {
    legendEl.innerHTML = Object.entries(counts).map(([key, val]) => `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
        <span style="width:10px;height:10px;background:${colors[key]};border-radius:50%;display:inline-block;flex-shrink:0"></span>
        <span style="font-size:13px;color:var(--text-muted);text-transform:capitalize;flex:1">${key}</span>
        <span style="font-size:13px;font-weight:600;color:var(--white)">${val}</span>
      </div>`).join('');
  }
}
