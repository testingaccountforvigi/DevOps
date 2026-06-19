/* ============================================================
   loans.js  —  My Loans page  +  Apply Loan page
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  if (!Auth.requireAuth()) return;

  const page = document.body.dataset.page;
  if (page === 'my-loans')   initMyLoans();
  if (page === 'apply-loan') initApplyLoan();
});

/* ================================================================
   MY LOANS
   ================================================================ */
function initMyLoans() {
  initSidebar('loans');
  loadMyLoans();

  /* Filter buttons */
  document.querySelectorAll('[data-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterLoans(btn.dataset.filter);
    });
  });

  /* Search */
  document.getElementById('loan-search')?.addEventListener('input', (e) => {
    searchLoans(e.target.value.toLowerCase());
  });
}

let allLoans = [];

async function loadMyLoans() {
  showTableSkeleton('loans-tbody', 5, 5);
  try {
    const res = await api.loans.myLoans();
    allLoans = res.loans || [];
    renderLoansTable(allLoans);
    updateCounts(allLoans);
  } catch (err) {
    Toast.error('Failed to load loans.');
    console.error(err);
  }
}

function renderLoansTable(loans) {
  const tbody = document.getElementById('loans-tbody');
  const empty = document.getElementById('loans-empty');
  if (!tbody) return;

  if (loans.length === 0) {
    tbody.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  tbody.innerHTML = loans.map((loan, i) => {
    const rating = Fmt.creditRating(loan.credit_score);
    return `
    <tr>
      <td style="color:var(--text-faint);font-size:12px">#${String(loan.id).padStart(4,'0')}</td>
      <td>
        <div style="display:flex;align-items:center;gap:10px">
          <span style="font-size:20px">${Fmt.loanTypeIcon(loan.loan_type)}</span>
          <div>
            <div style="font-weight:600;text-transform:capitalize;color:var(--white)">${loan.loan_type} Loan</div>
            <div style="font-size:11px;color:var(--text-faint)">${Fmt.date(loan.created_at)}</div>
          </div>
        </div>
      </td>
      <td>
        <div style="font-weight:700;color:var(--white)">${Fmt.currency(loan.loan_amount)}</div>
      </td>
      <td>
        <div style="font-weight:600;color:${rating.color}">${loan.credit_score}</div>
        <div style="font-size:11px;color:var(--text-faint)">${rating.label}</div>
      </td>
      <td>${Fmt.badge(loan.status)}</td>
      <td>
        <button class="btn btn-ghost btn-sm" onclick="viewLoanDetail(${loan.id})">View</button>
      </td>
    </tr>`;
  }).join('');
}

function updateCounts(loans) {
  const counts = {
    all:      loans.length,
    pending:  loans.filter(l => l.status === 'pending').length,
    approved: loans.filter(l => l.status === 'approved').length,
    rejected: loans.filter(l => l.status === 'rejected').length,
    disbursed:loans.filter(l => l.status === 'disbursed').length,
  };
  Object.entries(counts).forEach(([k, v]) => {
    const el = document.getElementById(`count-${k}`);
    if (el) el.textContent = v;
  });
}

function filterLoans(status) {
  const filtered = status === 'all' ? allLoans : allLoans.filter(l => l.status === status);
  renderLoansTable(filtered);
}

function searchLoans(query) {
  if (!query) { renderLoansTable(allLoans); return; }
  const filtered = allLoans.filter(l =>
    l.loan_type.includes(query) ||
    l.status.includes(query) ||
    String(l.loan_amount).includes(query) ||
    String(l.credit_score).includes(query)
  );
  renderLoansTable(filtered);
}

/* Loan detail modal */
function viewLoanDetail(id) {
  const loan = allLoans.find(l => l.id === id);
  if (!loan) return;

  const rating = Fmt.creditRating(loan.credit_score);
  const statusSteps = ['pending','approved','disbursed'];
  const curStep = statusSteps.indexOf(loan.status);

  document.getElementById('modal-loan-id').textContent   = `#${String(loan.id).padStart(4,'0')}`;
  document.getElementById('modal-loan-type').textContent = `${Fmt.loanTypeIcon(loan.loan_type)} ${Fmt.capitalize(loan.loan_type)} Loan`;
  document.getElementById('modal-amount').textContent    = Fmt.currency(loan.loan_amount);
  document.getElementById('modal-credit').innerHTML      = `<span style="color:${rating.color}">${loan.credit_score}</span> <span style="font-size:12px;color:var(--text-faint)">${rating.label}</span>`;
  document.getElementById('modal-status').innerHTML      = Fmt.badge(loan.status);
  document.getElementById('modal-date').textContent      = Fmt.dateTime(loan.created_at);

  /* Progress steps */
  const stepsEl = document.getElementById('modal-steps');
  if (stepsEl) {
    const labels = ['Applied','Approved','Disbursed'];
    if (loan.status === 'rejected') {
      stepsEl.innerHTML = `<div style="text-align:center;padding:10px 0;color:var(--danger)">❌ Application Rejected</div>`;
    } else {
      stepsEl.innerHTML = `<div class="loan-steps">` +
        statusSteps.map((s, i) => `
          <div class="step ${i < curStep ? 'done' : i === curStep ? 'active' : ''}">
            ${i < statusSteps.length - 1 ? '<div class="step-line"></div>' : ''}
            <div class="step-circle">${i < curStep ? '✓' : i + 1}</div>
            <div class="step-label">${labels[i]}</div>
          </div>`).join('') +
        `</div>`;
    }
  }

  document.getElementById('loan-detail-modal').classList.add('open');
}

function closeModal() {
  document.getElementById('loan-detail-modal')?.classList.remove('open');
}

/* ================================================================
   APPLY LOAN
   ================================================================ */
function initApplyLoan() {
  initSidebar('apply-loan');

  const form      = document.getElementById('apply-form');
  const submitBtn = document.getElementById('submit-btn');
  const amountEl  = document.getElementById('loan-amount');
  const amountDisp= document.getElementById('amount-display');
  const termEl    = document.getElementById('loan-term');
  const alertBox  = document.getElementById('alert-box');

  /* Loan type card selection */
  document.querySelectorAll('.loan-type-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.loan-type-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      card.querySelector('input[type=radio]').checked = true;
      updateSummary();
    });
  });

  /* Amount slider sync */
  amountEl?.addEventListener('input', () => {
    if (amountDisp) amountDisp.textContent = Fmt.currency(amountEl.value);
    updateSummary();
  });
  termEl?.addEventListener('change', updateSummary);
  document.getElementById('credit-score')?.addEventListener('input', updateSummary);

  updateSummary();

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert(alertBox);

    const typeEl = document.querySelector('input[name="loan_type"]:checked');
    const loan_type   = typeEl?.value || '';
    const loan_amount = parseFloat(amountEl?.value || 0);
    const credit_score= parseInt(document.getElementById('credit-score')?.value || 0);

    let valid = true;
    if (!loan_type) {
      showAlert(alertBox, 'Please select a loan type.', 'warning'); valid = false;
    }
    if (loan_amount < 1000) {
      showAlert(alertBox, 'Minimum loan amount is $1,000.', 'warning'); valid = false;
    }
    if (credit_score < 300 || credit_score > 850) {
      showAlert(alertBox, 'Credit score must be between 300 and 850.', 'warning'); valid = false;
    }
    if (!valid) return;

    setLoading(submitBtn, true);
    try {
      await api.loans.apply({ loan_type, loan_amount, credit_score });
      Toast.success('Loan application submitted successfully!');
      setTimeout(() => window.location.href = 'loans.html', 1000);
    } catch (err) {
      showAlert(alertBox, err.message || 'Failed to submit application.', 'danger');
    } finally {
      setLoading(submitBtn, false);
    }
  });
}

const RATES = { personal: 0.089, home: 0.065, auto: 0.072, business: 0.095, education: 0.055 };

function updateSummary() {
  const typeEl   = document.querySelector('input[name="loan_type"]:checked');
  const amount   = parseFloat(document.getElementById('loan-amount')?.value || 0);
  const term     = parseInt(document.getElementById('loan-term')?.value || 12);
  const rate     = RATES[typeEl?.value] || 0.089;
  const monthly  = calcEMI(amount, rate, term);
  const total    = monthly * term;
  const interest = total - amount;

  setSummary('s-amount',   Fmt.currency(amount));
  setSummary('s-rate',     `${(rate * 100).toFixed(1)}% p.a.`);
  setSummary('s-term',     `${term} months`);
  setSummary('s-monthly',  Fmt.currency(monthly));
  setSummary('s-interest', Fmt.currency(interest));
  setSummary('s-total',    Fmt.currency(total));
}

function calcEMI(principal, annualRate, months) {
  if (!principal || !months) return 0;
  const r = annualRate / 12;
  return r === 0 ? principal / months : principal * r * Math.pow(1+r, months) / (Math.pow(1+r, months) - 1);
}

function setSummary(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

/* ── Shared helpers (re-exported so loans.js is self-contained) ── */
function showAlert(el, message, type = 'danger') {
  if (!el) return;
  const icons = { danger:'⚠️', success:'✅', warning:'⚠️', info:'ℹ️' };
  el.className = `alert alert-${type}`;
  el.innerHTML = `<span class="alert-icon">${icons[type]}</span><span>${message}</span>`;
  el.style.display = 'flex';
}
function clearAlert(el) { if (el) { el.style.display = 'none'; el.innerHTML = ''; } }
function setLoading(btn, loading) {
  if (loading) { btn.disabled = true; btn.dataset.original = btn.innerHTML; btn.innerHTML = '<span class="spinner"></span> Submitting…'; }
  else         { btn.disabled = false; btn.innerHTML = btn.dataset.original || btn.innerHTML; }
}

function showTableSkeleton(tbodyId, rows, cols) {
  const el = document.getElementById(tbodyId);
  if (!el) return;
  el.innerHTML = Array(rows).fill(0).map(() =>
    `<tr>${Array(cols).fill(0).map(() =>
      `<td><div class="skeleton" style="height:14px;width:80%;border-radius:4px"></div></td>`
    ).join('')}</tr>`
  ).join('');
}
