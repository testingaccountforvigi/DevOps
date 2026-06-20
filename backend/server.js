'use strict';

require('dotenv').config();

const express      = require('express');
const cors         = require('cors');
const path         = require('path');
const authRoutes   = require('./routes/authRoutes');
const loanRoutes   = require('./routes/loanRoutes');

/* ── Prometheus metrics (prom-client) ── */
const promClient = require('prom-client');

// Collect default Node.js metrics: memory, CPU, event loop lag, etc.
// These appear in Grafana automatically once Prometheus scrapes /metrics.
const collectDefaultMetrics = promClient.collectDefaultMetrics;
collectDefaultMetrics({
  prefix: 'loanpro_',        // All default metrics are prefixed with loanpro_
  gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
});

// ── Custom counter: total HTTP requests ────────────────────────
const httpRequestsTotal = new promClient.Counter({
  name: 'loanpro_http_requests_total',
  help: 'Total number of HTTP requests received',
  labelNames: ['method', 'route', 'status_code'],
});

// ── Custom histogram: request duration in seconds ─────────────
const httpRequestDuration = new promClient.Histogram({
  name: 'loanpro_http_request_duration_seconds',
  help: 'HTTP request duration in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
});

// ── Custom gauge: currently active HTTP requests ───────────────
const httpRequestsActive = new promClient.Gauge({
  name: 'loanpro_http_requests_active',
  help: 'Number of HTTP requests currently being processed',
});

const app  = express();
const PORT = process.env.PORT || 5000;

/* ── Middleware: track request metrics ── */
app.use((req, res, next) => {
  // Skip tracking for the /metrics endpoint itself to avoid recursion
  if (req.path === '/metrics') return next();

  const end = httpRequestDuration.startTimer();
  httpRequestsActive.inc();

  res.on('finish', () => {
    const route  = req.route ? req.route.path : req.path;
    const labels = { method: req.method, route, status_code: res.statusCode };
    httpRequestsTotal.inc(labels);
    end(labels);
    httpRequestsActive.dec();
  });

  next();
});

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

/* ── Prometheus metrics endpoint ── */
// Scraped by Prometheus every 15 seconds.
// Returns all registered metrics in the Prometheus text format.
// URL: GET http://backend:3000/metrics
app.get('/metrics', async (_req, res) => {
  try {
    res.set('Content-Type', promClient.register.contentType);
    res.end(await promClient.register.metrics());
  } catch (err) {
    res.status(500).end(err.message);
  }
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
