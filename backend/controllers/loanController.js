'use strict';

const db = require('../config/db');

const VALID_TYPES    = ['personal', 'home', 'auto', 'business', 'education'];
const VALID_STATUSES = ['pending', 'approved', 'rejected', 'disbursed'];

/* ================================================================
   POST /api/loans/apply   (user)
   ================================================================ */
const applyLoan = async (req, res) => {
  const { loan_amount, loan_type, credit_score } = req.body;
  const user_id = req.user.id;

  if (!loan_amount || !loan_type || !credit_score) {
    return res.status(400).json({
      success: false,
      message: 'loan_amount, loan_type and credit_score are required.',
    });
  }
  if (!VALID_TYPES.includes(loan_type)) {
    return res.status(400).json({
      success: false,
      message: `loan_type must be one of: ${VALID_TYPES.join(', ')}.`,
    });
  }

  const amount = parseFloat(loan_amount);
  const score  = parseInt(credit_score, 10);

  if (isNaN(amount) || amount < 1000) {
    return res.status(400).json({ success: false, message: 'Minimum loan amount is $1,000.' });
  }
  if (isNaN(score) || score < 300 || score > 850) {
    return res.status(400).json({
      success: false,
      message: 'credit_score must be between 300 and 850.',
    });
  }

  try {
    /* MySQL has no RETURNING — insert then fetch by insertId */
    const [result] = await db.query(
      `INSERT INTO loans (user_id, loan_amount, loan_type, credit_score, status)
       VALUES (?, ?, ?, ?, 'pending')`,
      [user_id, amount, loan_type, score]
    );

    const [loanRows] = await db.query(
      'SELECT * FROM loans WHERE id = ?',
      [result.insertId]
    );

    return res.status(201).json({
      success: true,
      message: 'Loan application submitted successfully.',
      loan:    loanRows[0],
    });
  } catch (err) {
    console.error('[loanController.applyLoan]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/* ================================================================
   GET /api/loans/my-loans   (user — own loans only)
   ================================================================ */
const getUserLoans = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM loans WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    return res.json({ success: true, loans: rows });
  } catch (err) {
    console.error('[loanController.getUserLoans]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/* ================================================================
   GET /api/loans/all   (admin)
   Supports optional query params: ?status=&loan_type=&limit=&offset=
   ================================================================ */
const getAllLoans = async (req, res) => {
  try {
    const { status, loan_type, limit = 100, offset = 0 } = req.query;

    /* Build dynamic WHERE clause with ? placeholders */
    const conditions = [];
    const params     = [];

    if (status && VALID_STATUSES.includes(status)) {
      conditions.push('l.status = ?');
      params.push(status);
    }
    if (loan_type && VALID_TYPES.includes(loan_type)) {
      conditions.push('l.loan_type = ?');
      params.push(loan_type);
    }

    const whereSQL = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    /* LIMIT / OFFSET must be integers — cast them to avoid mysql2 type issues */
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const [rows] = await db.query(
      `SELECT l.*, u.full_name, u.email
       FROM loans l
       JOIN users u ON l.user_id = u.id
       ${whereSQL}
       ORDER BY l.created_at DESC
       LIMIT ? OFFSET ?`,
      params
    );

    return res.json({ success: true, loans: rows });
  } catch (err) {
    console.error('[loanController.getAllLoans]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/* ================================================================
   PUT /api/loans/:id/status   (admin)
   ================================================================ */
const updateLoanStatus = async (req, res) => {
  const { id }     = req.params;
  const { status } = req.body;

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({
      success: false,
      message: `Status must be one of: ${VALID_STATUSES.join(', ')}.`,
    });
  }

  try {
    /* Read current status for transition validation */
    const [existing] = await db.query(
      'SELECT status FROM loans WHERE id = ?',
      [id]
    );
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Loan not found.' });
    }

    const current = existing[0].status;
    const allowed = {
      pending:   ['approved', 'rejected'],
      approved:  ['disbursed', 'rejected'],
      rejected:  [],
      disbursed: [],
    };

    if (!allowed[current]?.includes(status)) {
      return res.status(422).json({
        success: false,
        message: `Cannot transition from '${current}' to '${status}'.`,
      });
    }

    /* UPDATE — updated_at is also set by the MySQL trigger, but explicit here for clarity */
    await db.query(
      'UPDATE loans SET status = ?, updated_at = NOW() WHERE id = ?',
      [status, id]
    );

    /* Fetch the updated row */
    const [updatedRows] = await db.query(
      'SELECT * FROM loans WHERE id = ?',
      [id]
    );

    return res.json({
      success: true,
      message: `Loan status updated to '${status}'.`,
      loan:    updatedRows[0],
    });
  } catch (err) {
    console.error('[loanController.updateLoanStatus]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/* ================================================================
   GET /api/loans/stats   (admin)
   MySQL uses SUM(condition) instead of COUNT(*) FILTER (WHERE ...)
   ================================================================ */
const getStats = async (req, res) => {
  try {
    const [[totals]] = await db.query(`
      SELECT
        COUNT(*)                                  AS total_loans,
        SUM(status = 'pending')                   AS pending_loans,
        SUM(status = 'approved')                  AS approved_loans,
        SUM(status = 'rejected')                  AS rejected_loans,
        SUM(status = 'disbursed')                 AS disbursed_loans,
        COALESCE(
          SUM(CASE WHEN status IN ('approved','disbursed') THEN loan_amount ELSE 0 END),
          0
        )                                         AS total_approved_amount
      FROM loans
    `);

    const [[{ total_users }]] = await db.query(
      'SELECT COUNT(*) AS total_users FROM users'
    );

    return res.json({
      success: true,
      stats: {
        total_loans:           parseInt(totals.total_loans)           || 0,
        pending_loans:         parseInt(totals.pending_loans)         || 0,
        approved_loans:        parseInt(totals.approved_loans)        || 0,
        rejected_loans:        parseInt(totals.rejected_loans)        || 0,
        disbursed_loans:       parseInt(totals.disbursed_loans)       || 0,
        total_users:           parseInt(total_users)                  || 0,
        total_approved_amount: parseFloat(totals.total_approved_amount) || 0,
      },
    });
  } catch (err) {
    console.error('[loanController.getStats]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

/* ================================================================
   GET /api/loans/users   (admin)
   ================================================================ */
const getAllUsers = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT id, full_name, email, role, created_at
       FROM users
       ORDER BY created_at DESC
       LIMIT 100`
    );
    return res.json({ success: true, users: rows });
  } catch (err) {
    console.error('[loanController.getAllUsers]', err);
    return res.status(500).json({ success: false, message: 'Internal server error.' });
  }
};

module.exports = { applyLoan, getUserLoans, getAllLoans, updateLoanStatus, getStats, getAllUsers };
