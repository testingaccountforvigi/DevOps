/* ============================================================
   admin.js  —  Admin Dashboard  +  Loan Management
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireAdmin()) return;

  const page = document.body.dataset.page;
  if (page === 'admin-dashboard')  initAdminDashboard();
  if (page === 'loan-management')  initLoanManagement();
});

/* ================================================================
   ADMIN DASHBOARD
   ================================================================ */
async function initAdminDashboard() {
  initSidebar('admin-dashboard');

  try {
    const [statsRes, loansRes, usersRes] = await Promise.all([
      api.loans.stats(),
      api.loans.all(),
      api.loans.users(),
    ]);

    renderAdminStats(statsRes.stats);
    renderRecentApplications(loansRes.loans.slice(0, 8));
    renderUserList(usersRes.users.slice(0, 6));
    renderAdminChart(statsRes.stats);
  } catch (err) {
    Toast.error('Failed to load admin data.');
    console.error(err);
  }
}

function renderAdminStats(s) {
  const map = {
    'as-total':    s.total_loans,
    'as-pending':  s.pending_loans,
    'as-approved': s.approved_loans,
    'as-rejected': s.rejected_loans,
    'as-disbursed':s.disbursed_loans,
    'as-users':    s.total_users,
    'as-amount':   Fmt.currency(s.total_approved_amount),
  };
  Object.entries(map).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  });
}

function renderRecentApplications(loans) {
  const tbody = document.getElementById('admin-recent-tbody');
  if (!tbody) return;

  if (loans.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:30px;color:var(--text-faint)">No applications yet</td></tr>`;
    return;
  }

  tbody.innerHTML = loans.map(loan => `
    <tr>
      <td style="color:var(--text-faint)">#${String(loan.id).padStart(4,'0')}</td>
      <td>
        <div class="td-name">${loan.full_name}</div>
        <div class="td-email">${loan.email}</div>
      </td>
      <td style="text-transform:capitalize">
        ${Fmt.loanTypeIcon(loan.loan_type)} ${loan.loan_type}
      </td>
      <td class="td-mono">${Fmt.currency(loan.loan_amount)}</td>
      <td>${Fmt.badge(loan.status)}</td>
      <td style="color:var(--text-faint);font-size:12px">${Fmt.date(loan.created_at)}</td>
    </tr>`).join('');
}

function renderUserList(users) {
  const el = document.getElementById('admin-user-list');
  if (!el) return;

  el.innerHTML = users.map(u => `
    <div class="activity-item">
      <div class="user-avatar" style="width:34px;height:34px;font-size:12px;flex-shrink:0">
        ${Fmt.initials(u.full_name)}
      </div>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:600;color:var(--white)">${u.full_name}</div>
        <div style="font-size:11px;color:var(--text-faint)">${u.email}</div>
      </div>
      <div>${Fmt.badge(u.role)}</div>
    </div>`).join('');
}

function renderAdminChart(s) {
  const data = [
    { label:'Pending',   value: s.pending_loans,  color:'#f59e0b' },
    { label:'Approved',  value: s.approved_loans,  color:'#10b981' },
    { label:'Rejected',  value: s.rejected_loans,  color:'#ef4444' },
    { label:'Disbursed', value: s.disbursed_loans, color:'#06b6d4' },
  ];
  const total = data.reduce((a,b) => a + b.value, 0) || 1;

  const barEl = document.getElementById('admin-bar-chart');
  if (barEl) {
    barEl.innerHTML = data.map(d => `
      <div style="margin-bottom:14px">
        <div style="display:flex;justify-content:space-between;margin-bottom:5px">
          <span style="font-size:13px;color:var(--text-muted)">${d.label}</span>
          <span style="font-size:13px;font-weight:600;color:var(--white)">${d.value}</span>
        </div>
        <div style="height:8px;background:var(--border);border-radius:99px;overflow:hidden">
          <div style="height:100%;width:${(d.value/total*100).toFixed(1)}%;background:${d.color};
            border-radius:99px;transition:width 0.8s ease"></div>
        </div>
      </div>`).join('');
  }
}

/* ================================================================
   LOAN MANAGEMENT
   ================================================================ */
let allAdminLoans = [];

async function initLoanManagement() {
  initSidebar('loan-management');

  document.getElementById('status-filter')?.addEventListener('change', (e) => {
    filterAdminLoans(e.target.value);
  });
  document.getElementById('type-filter')?.addEventListener('change', (e) => {
    filterAdminLoansType(e.target.value);
  });
  document.getElementById('loan-search-admin')?.addEventListener('input', (e) => {
    searchAdminLoans(e.target.value.toLowerCase());
  });

  await loadAllLoans();
}

async function loadAllLoans() {
  showAdminSkeleton();
  try {
    const res = await api.loans.all();
    allAdminLoans = res.loans || [];
    renderAdminLoans(allAdminLoans);
    updateAdminCounts(allAdminLoans);
  } catch (err) {
    Toast.error('Failed to load loan data.');
    console.error(err);
  }
}

function showAdminSkeleton() {
  const tbody = document.getElementById('admin-loans-tbody');
  if (!tbody) return;
  tbody.innerHTML = Array(6).fill(0).map(() =>
    `<tr>${Array(7).fill(0).map(() =>
      `<td><div class="skeleton" style="height:13px;width:75%;border-radius:4px"></div></td>`
    ).join('')}</tr>`
  ).join('');
}

function renderAdminLoans(loans) {
  const tbody = document.getElementById('admin-loans-tbody');
  if (!tbody) return;

  if (loans.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7">
      <div class="empty-state">
        <div class="empty-icon">📋</div>
        <h3>No loans found</h3>
        <p>Try adjusting your filters</p>
      </div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = loans.map(loan => `
    <tr>
      <td style="color:var(--text-faint);font-size:12px">#${String(loan.id).padStart(4,'0')}</td>
      <td>
        <div class="td-name">${loan.full_name}</div>
        <div class="td-email">${loan.email}</div>
      </td>
      <td>
        <span style="text-transform:capitalize">
          ${Fmt.loanTypeIcon(loan.loan_type)} ${loan.loan_type}
        </span>
      </td>
      <td><span style="font-weight:700;color:var(--white)">${Fmt.currency(loan.loan_amount)}</span></td>
      <td>
        <span style="color:${Fmt.creditRating(loan.credit_score).color};font-weight:600">
          ${loan.credit_score}
        </span>
      </td>
      <td>${Fmt.badge(loan.status)}</td>
      <td>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          ${loan.status === 'pending' ? `
            <button class="btn btn-success btn-sm" onclick="updateStatus(${loan.id},'approved')">✓ Approve</button>
            <button class="btn btn-danger btn-sm"  onclick="updateStatus(${loan.id},'rejected')">✗ Reject</button>
          ` : loan.status === 'approved' ? `
            <button class="btn btn-sm" style="background:var(--info);color:#fff"
              onclick="updateStatus(${loan.id},'disbursed')">💸 Disburse</button>
          ` : `
            <span style="font-size:12px;color:var(--text-faint)">—</span>
          `}
        </div>
      </td>
    </tr>`).join('');
}

function updateAdminCounts(loans) {
  const map = {
    'ac-total':    loans.length,
    'ac-pending':  loans.filter(l => l.status==='pending').length,
    'ac-approved': loans.filter(l => l.status==='approved').length,
    'ac-rejected': loans.filter(l => l.status==='rejected').length,
    'ac-disbursed':loans.filter(l => l.status==='disbursed').length,
  };
  Object.entries(map).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  });
}

function filterAdminLoans(status) {
  const filtered = status === 'all' ? allAdminLoans : allAdminLoans.filter(l => l.status === status);
  renderAdminLoans(filtered);
}

function filterAdminLoansType(type) {
  const filtered = type === 'all' ? allAdminLoans : allAdminLoans.filter(l => l.loan_type === type);
  renderAdminLoans(filtered);
}

function searchAdminLoans(q) {
  if (!q) { renderAdminLoans(allAdminLoans); return; }
  const filtered = allAdminLoans.filter(l =>
    l.full_name?.toLowerCase().includes(q) ||
    l.email?.toLowerCase().includes(q) ||
    l.loan_type?.includes(q) ||
    l.status?.includes(q) ||
    String(l.loan_amount).includes(q)
  );
  renderAdminLoans(filtered);
}

async function updateStatus(loanId, newStatus) {
  const labels = { approved:'Approve', rejected:'Reject', disbursed:'Disburse' };
  if (!confirm(`Are you sure you want to ${labels[newStatus]?.toLowerCase()} this loan?`)) return;

  try {
    await api.loans.updateStatus(loanId, newStatus);

    /* Update local state */
    const idx = allAdminLoans.findIndex(l => l.id === loanId);
    if (idx !== -1) allAdminLoans[idx].status = newStatus;

    renderAdminLoans(allAdminLoans);
    updateAdminCounts(allAdminLoans);
    Toast.success(`Loan #${String(loanId).padStart(4,'0')} ${newStatus} successfully.`);
  } catch (err) {
    Toast.error(err.message || 'Failed to update loan status.');
  }
}
