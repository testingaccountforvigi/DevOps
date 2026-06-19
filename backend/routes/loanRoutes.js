'use strict';

const express       = require('express');
const {
  applyLoan,
  getUserLoans,
  getAllLoans,
  updateLoanStatus,
  getStats,
  getAllUsers,
} = require('../controllers/loanController');
const { verifyToken, verifyAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

/* ── User routes ──────────────────────────────────────────── */

/**
 * @route  POST /api/loans/apply
 * @desc   Submit a new loan application
 * @access Protected (user)
 */
router.post('/apply', verifyToken, applyLoan);

/**
 * @route  GET /api/loans/my-loans
 * @desc   Get loans belonging to the logged-in user
 * @access Protected (user)
 */
router.get('/my-loans', verifyToken, getUserLoans);

/* ── Admin routes ─────────────────────────────────────────── */

/**
 * @route  GET /api/loans/stats
 * @desc   Get system-wide loan + user statistics
 * @access Protected (admin)
 */
router.get('/stats', verifyToken, verifyAdmin, getStats);

/**
 * @route  GET /api/loans/users
 * @desc   Get all registered users
 * @access Protected (admin)
 */
router.get('/users', verifyToken, verifyAdmin, getAllUsers);

/**
 * @route  GET /api/loans/all
 * @desc   Get all loan applications (supports ?status=&loan_type= filters)
 * @access Protected (admin)
 */
router.get('/all', verifyToken, verifyAdmin, getAllLoans);

/**
 * @route  PUT /api/loans/:id/status
 * @desc   Update loan status (approved | rejected | disbursed)
 * @access Protected (admin)
 */
router.put('/:id/status', verifyToken, verifyAdmin, updateLoanStatus);

module.exports = router;
