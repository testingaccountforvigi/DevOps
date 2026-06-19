'use strict';

const express                    = require('express');
const { register, login, getProfile } = require('../controllers/authController');
const { verifyToken }            = require('../middleware/authMiddleware');

const router = express.Router();

/**
 * @route  POST /api/auth/register
 * @desc   Register a new user
 * @access Public
 */
router.post('/register', register);

/**
 * @route  POST /api/auth/login
 * @desc   Authenticate and return JWT
 * @access Public
 */
router.post('/login', login);

/**
 * @route  GET /api/auth/profile
 * @desc   Return current user profile
 * @access Protected
 */
router.get('/profile', verifyToken, getProfile);

module.exports = router;
