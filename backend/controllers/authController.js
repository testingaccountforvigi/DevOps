'use strict';

const bcrypt = require('bcryptjs');
const jwt    = require('jsonwebtoken');
const db     = require('../config/db');

/* ── Helpers ── */
const SALT_ROUNDS = 12;

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
  );
}

function sanitizeUser(user) {
  return {
    id:         user.id,
    full_name:  user.full_name,
    email:      user.email,
    role:       user.role,
    created_at: user.created_at,
  };
}

/* ================================================================
   POST /api/auth/register
   ================================================================ */
const register = async (req, res) => {
  const { full_name, email, password, role } = req.body;

  /* Input validation */
  if (!full_name?.trim() || !email?.trim() || !password) {
    return res.status(400).json({
      success: false,
      message: 'full_name, email and password are required.',
    });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email format.' });
  }
  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 8 characters.',
    });
  }

  try {
    /* Duplicate email check — MySQL uses ? placeholders */
    const [existing] = await db.query(
      'SELECT id FROM users WHERE email = ?',
      [email.toLowerCase()]
    );
    if (existing.length > 0) {
      return res.status(409).json({ success: false, message: 'Email is already registered.' });
    }

    /* Hash password */
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const assignedRole  = role === 'admin' ? 'admin' : 'user';

    /* Insert — MySQL has no RETURNING; use insertId then SELECT */
    const [result] = await db.query(
      `INSERT INTO users (full_name, email, password_hash, role)
       VALUES (?, ?, ?, ?)`,
      [full_name.trim(), email.toLowerCase(), password_hash, assignedRole]
    );

    /* Fetch the newly created user row */
    const [userRows] = await db.query(
      'SELECT id, full_name, email, role, created_at FROM users WHERE id = ?',
      [result.insertId]
    );
    const user  = userRows[0];
    const token = signToken(user);

    return res.status(201).json({
      success: true,
      message: 'Registration successful.',
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error('[authController.register]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/* ================================================================
   POST /api/auth/login
   ================================================================ */
const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email?.trim() || !password) {
    return res.status(400).json({ success: false, message: 'Email and password are required.' });
  }

  try {
    const [rows] = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [email.toLowerCase()]
    );

    /* Generic error prevents user-enumeration */
    const INVALID = 'Invalid email or password.';

    if (rows.length === 0) {
      /* Timing-safe: run a dummy compare even when no user found */
      await bcrypt.compare(password, '$2a$12$dummyhashtopreventtimingenumeration00000000000000000000');
      return res.status(401).json({ success: false, message: INVALID });
    }

    const user    = rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);

    if (!isMatch) {
      return res.status(401).json({ success: false, message: INVALID });
    }

    const token = signToken(user);

    return res.json({
      success: true,
      message: 'Login successful.',
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    console.error('[authController.login]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/* ================================================================
   GET /api/auth/profile  (protected)
   ================================================================ */
const getProfile = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, full_name, email, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    return res.json({ success: true, user: rows[0] });
  } catch (err) {
    console.error('[authController.getProfile]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = { register, login, getProfile };
