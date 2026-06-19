'use strict';

require('dotenv').config();

const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const authRoutes = require('./routes/authRoutes');
const loanRoutes = require('./routes/loanRoutes');

const app  = express();
const PORT = process.env.PORT || 5000;

/* ── CORS ── */
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
  : '*';

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

/* ── Body parsers ── */
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

/* ── Security headers (lightweight, no helmet needed) ── */
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

/* ── Request logger (development only) ── */
if (process.env.NODE_ENV !== 'production') {
  app.use((req, _res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

/* ── Static frontend ── */
app.use(express.static(path.join(__dirname, '../frontend')));

/* ── API routes ── */
app.use('/api/auth',  authRoutes);
app.use('/api/loans', loanRoutes);

/* ── Health check ── */
app.get('/api/health', (_req, res) => {
  res.json({
    status:    'OK',
    service:   'LoanPro API',
    timestamp: new Date().toISOString(),
    env:       process.env.NODE_ENV || 'development',
  });
});

/* ── 404 handler for unmatched API routes ── */
app.use('/api/*', (_req, res) => {
  res.status(404).json({ success: false, message: 'API endpoint not found.' });
});

/* ── SPA fallback: serve index.html for any non-API route ── */
app.get('*', (_req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

/* ── Global error handler ── */
app.use((err, _req, res, _next) => {
  console.error('[ERROR]', err);
  const status  = err.status || 500;
  const message = process.env.NODE_ENV === 'production'
    ? 'An internal server error occurred.'
    : err.message || 'Internal server error';
  res.status(status).json({ success: false, message });
});

/* ── Start ── */
app.listen(PORT, () => {
  console.log('─────────────────────────────────────────');
  console.log(`  LoanPro API  →  http://localhost:${PORT}`);
  console.log(`  Environment  →  ${process.env.NODE_ENV || 'development'}`);
  console.log('─────────────────────────────────────────');
});

module.exports = app; // for testing
