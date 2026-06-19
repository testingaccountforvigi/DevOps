'use strict';

const mysql = require('mysql2/promise');

/* ── Connection pool ── */
const pool = mysql.createPool({
  host:               process.env.DB_HOST     || 'localhost',
  port:               parseInt(process.env.DB_PORT || '3306', 10),
  database:           process.env.DB_NAME     || 'loan_origination_db',
  user:               process.env.DB_USER     || 'root',
  password:           process.env.DB_PASSWORD || '',

  /* Pool settings */
  connectionLimit:    20,
  waitForConnections: true,
  queueLimit:         0,

  /* Always return JS Date objects for DATETIME columns */
  dateStrings: false,

  /* Force UTC so timestamps are consistent */
  timezone: '+00:00',
});

/* ── Verify connectivity on startup ── */
pool.getConnection()
  .then(conn => {
    return conn.query('SELECT NOW() AS now')
      .then(([rows]) => {
        console.log(`[DB] MySQL 8 connected — server time: ${rows[0].now}`);
        conn.release();
      });
  })
  .catch(err => {
    console.error('[DB] Connection failed:', err.message);
    console.error('[DB] Check your .env DB_* variables and ensure MySQL is running.');
    process.exit(1);
  });

/**
 * db.query(sql, params)
 *   Wraps pool.query and returns [rows, fields] — same as mysql2 native.
 *   Controllers destructure with:  const [rows] = await db.query(...)
 *
 * db.getConnection()
 *   Returns a dedicated connection for transactions.
 *   Always call conn.release() in a finally block.
 */
const db = {
  query:         (sql, params) => pool.query(sql, params),
  getConnection: ()            => pool.getConnection(),
};

module.exports = db;
