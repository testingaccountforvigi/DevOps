/* ============================================================
   auth.js  —  Login & Register page logic
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  /* Redirect if already logged in */
  if (Auth.isLoggedIn()) {
    window.location.href = Auth.isAdmin() ? 'admin-dashboard.html' : 'dashboard.html';
    return;
  }

  const page = document.body.dataset.page;
  if (page === 'login')    initLogin();
  if (page === 'register') initRegister();
});

/* ================================================================
   LOGIN
   ================================================================ */
function initLogin() {
  const form      = document.getElementById('login-form');
  const emailEl   = document.getElementById('email');
  const passEl    = document.getElementById('password');
  const submitBtn = document.getElementById('submit-btn');
  const alertBox  = document.getElementById('alert-box');

  /* Password visibility toggle */
  bindPasswordToggle('toggle-pw', 'password');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert(alertBox);

    const email    = emailEl.value.trim();
    const password = passEl.value;

    /* Client-side validation */
    let valid = true;
    if (!validateEmail(email)) {
      showFieldError('email-error', 'Please enter a valid email address.');
      valid = false;
    } else {
      hideFieldError('email-error');
    }
    if (password.length < 6) {
      showFieldError('pass-error', 'Password must be at least 6 characters.');
      valid = false;
    } else {
      hideFieldError('pass-error');
    }
    if (!valid) return;

    setLoading(submitBtn, true);

    try {
      const res = await api.auth.login({ email, password });
      Auth.setSession(res.token, res.user);
      Toast.success(`Welcome back, ${res.user.full_name}!`);
      setTimeout(() => {
        window.location.href = res.user.role === 'admin' ? 'admin-dashboard.html' : 'dashboard.html';
      }, 600);
    } catch (err) {
      showAlert(alertBox, err.message || 'Login failed. Please check your credentials.', 'danger');
    } finally {
      setLoading(submitBtn, false);
    }
  });

  /* Demo credentials fill */
  document.getElementById('demo-user')?.addEventListener('click', () => {
    emailEl.value = 'john@example.com';
    passEl.value  = 'User@123';
  });
  document.getElementById('demo-admin')?.addEventListener('click', () => {
    emailEl.value = 'admin@loanpro.com';
    passEl.value  = 'Admin@123';
  });
}

/* ================================================================
   REGISTER
   ================================================================ */
function initRegister() {
  const form        = document.getElementById('register-form');
  const submitBtn   = document.getElementById('submit-btn');
  const alertBox    = document.getElementById('alert-box');
  const passEl      = document.getElementById('password');
  const confirmEl   = document.getElementById('confirm-password');
  const strengthBar = document.getElementById('strength-bar');
  const strengthTxt = document.getElementById('strength-text');

  bindPasswordToggle('toggle-pw',      'password');
  bindPasswordToggle('toggle-confirm', 'confirm-password');

  /* Live password strength */
  passEl?.addEventListener('input', () => {
    const strength = getPasswordStrength(passEl.value);
    updateStrengthUI(strengthBar, strengthTxt, strength);
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert(alertBox);

    const full_name = document.getElementById('full-name').value.trim();
    const email     = document.getElementById('email').value.trim();
    const password  = passEl.value;
    const confirm   = confirmEl.value;
    const role      = document.getElementById('role').value;

    /* Validation */
    let valid = true;

    if (full_name.length < 2) {
      showFieldError('name-error', 'Full name must be at least 2 characters.');
      valid = false;
    } else { hideFieldError('name-error'); }

    if (!validateEmail(email)) {
      showFieldError('email-error', 'Please enter a valid email address.');
      valid = false;
    } else { hideFieldError('email-error'); }

    if (password.length < 8) {
      showFieldError('pass-error', 'Password must be at least 8 characters.');
      valid = false;
    } else { hideFieldError('pass-error'); }

    if (password !== confirm) {
      showFieldError('confirm-error', 'Passwords do not match.');
      valid = false;
    } else { hideFieldError('confirm-error'); }

    if (!valid) return;

    setLoading(submitBtn, true);

    try {
      const res = await api.auth.register({ full_name, email, password, role });
      Auth.setSession(res.token, res.user);
      Toast.success('Account created successfully!');
      setTimeout(() => {
        window.location.href = res.user.role === 'admin' ? 'admin-dashboard.html' : 'dashboard.html';
      }, 600);
    } catch (err) {
      showAlert(alertBox, err.message || 'Registration failed. Please try again.', 'danger');
    } finally {
      setLoading(submitBtn, false);
    }
  });
}

/* ================================================================
   SHARED HELPERS
   ================================================================ */
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setLoading(btn, loading) {
  if (loading) {
    btn.disabled = true;
    btn.dataset.original = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span> Please wait…';
  } else {
    btn.disabled = false;
    btn.innerHTML = btn.dataset.original || btn.innerHTML;
  }
}

function showAlert(el, message, type = 'danger') {
  if (!el) return;
  const icons = { danger: '⚠️', success: '✅', warning: '⚠️', info: 'ℹ️' };
  el.className = `alert alert-${type}`;
  el.innerHTML = `<span class="alert-icon">${icons[type]}</span><span>${message}</span>`;
  el.style.display = 'flex';
}

function clearAlert(el) {
  if (!el) return;
  el.style.display = 'none';
  el.innerHTML = '';
}

function showFieldError(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.add('show');
}

function hideFieldError(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.remove('show');
}

function bindPasswordToggle(btnId, inputId) {
  const btn   = document.getElementById(btnId);
  const input = document.getElementById(inputId);
  if (!btn || !input) return;
  btn.addEventListener('click', () => {
    const show = input.type === 'password';
    input.type   = show ? 'text' : 'password';
    btn.textContent = show ? '🙈' : '👁️';
  });
}

function getPasswordStrength(pw) {
  let score = 0;
  if (pw.length >= 8)  score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

function updateStrengthUI(bar, txt, score) {
  if (!bar || !txt) return;
  const levels = [
    { label: '', color: 'transparent', width: '0%' },
    { label: 'Very Weak', color: '#ef4444', width: '20%' },
    { label: 'Weak',      color: '#f97316', width: '40%' },
    { label: 'Fair',      color: '#f59e0b', width: '60%' },
    { label: 'Strong',    color: '#3b82f6', width: '80%' },
    { label: 'Very Strong', color: '#10b981', width: '100%' },
  ];
  const level = levels[Math.min(score, 5)];
  bar.style.width = level.width;
  bar.style.background = level.color;
  txt.textContent = level.label;
  txt.style.color = level.color;
}
