-- ============================================================
--  LoanPro — MySQL 8 Database Schema
--  Version : 2.0.0
--
--  How to run:
--    mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS loan_origination_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
--    mysql -u root -p loan_origination_db < schema.sql
-- ============================================================

-- Use the target database
USE loan_origination_db;

-- ── Safe defaults ─────────────────────────────────────────────
SET FOREIGN_KEY_CHECKS = 0;
SET sql_mode = 'STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- ── Clean slate (for development resets) ─────────────────────
DROP TABLE IF EXISTS loans;
DROP TABLE IF EXISTS users;

-- ── Drop views if they exist ──────────────────────────────────
DROP VIEW IF EXISTS v_loan_summary;
DROP VIEW IF EXISTS v_stats;

-- ── Drop triggers if they exist ───────────────────────────────
DROP TRIGGER IF EXISTS loans_set_updated_at;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
--  TABLE: users
--  Note: MySQL ENUMs are defined inline on the column.
--        No separate CREATE TYPE is needed.
-- ============================================================
CREATE TABLE users (
    id            INT              NOT NULL AUTO_INCREMENT,
    full_name     VARCHAR(100)     NOT NULL,
    email         VARCHAR(150)     NOT NULL,
    password_hash VARCHAR(255)     NOT NULL,
    role          ENUM('user','admin') NOT NULL DEFAULT 'user',
    created_at    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY users_email_unique (email),

    -- Basic length guard (MySQL CHECK constraints enforced in 8.0.16+)
    CONSTRAINT users_fullname_len CHECK (CHAR_LENGTH(full_name) >= 2)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Registered users: applicants and administrators';

-- ============================================================
--  TABLE: loans
-- ============================================================
CREATE TABLE loans (
    id            INT              NOT NULL AUTO_INCREMENT,
    user_id       INT              NOT NULL,
    loan_amount   DECIMAL(15, 2)   NOT NULL,
    loan_type     ENUM('personal','home','auto','business','education') NOT NULL,
    credit_score  SMALLINT         NOT NULL,
    status        ENUM('pending','approved','rejected','disbursed')     NOT NULL DEFAULT 'pending',
    created_at    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    PRIMARY KEY (id),

    CONSTRAINT fk_loans_user
        FOREIGN KEY (user_id) REFERENCES users (id)
        ON DELETE CASCADE ON UPDATE CASCADE,

    -- CHECK constraints (enforced MySQL 8.0.16+)
    CONSTRAINT loans_amount_positive CHECK (loan_amount  > 0),
    CONSTRAINT loans_amount_minimum  CHECK (loan_amount  >= 1000),
    CONSTRAINT loans_credit_range    CHECK (credit_score BETWEEN 300 AND 850)

) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Loan applications submitted by users';

-- ============================================================
--  INDEXES
--  (Primary keys and UNIQUE keys are indexed automatically.)
-- ============================================================
CREATE INDEX idx_users_role        ON users  (role);

CREATE INDEX idx_loans_user_id     ON loans  (user_id);
CREATE INDEX idx_loans_status      ON loans  (status);
CREATE INDEX idx_loans_type        ON loans  (loan_type);
CREATE INDEX idx_loans_created_at  ON loans  (created_at DESC);
CREATE INDEX idx_loans_user_status ON loans  (user_id, status);   -- composite for user queries

-- ============================================================
--  TRIGGER: auto-update updated_at on loans
--
--  MySQL 8 trigger syntax — no stored-function wrapper needed.
--  The ON UPDATE CURRENT_TIMESTAMP on the column already handles
--  most cases, but an explicit BEFORE UPDATE trigger is kept here
--  for full compatibility and auditability.
-- ============================================================
DELIMITER $$

CREATE TRIGGER loans_set_updated_at
BEFORE UPDATE ON loans
FOR EACH ROW
BEGIN
    SET NEW.updated_at = NOW();
END$$

DELIMITER ;

-- ============================================================
--  VIEWS
-- ============================================================

-- Joined view: loan + applicant details
CREATE OR REPLACE VIEW v_loan_summary AS
SELECT
    l.id,
    u.full_name,
    u.email,
    l.loan_type,
    l.loan_amount,
    l.credit_score,
    l.status,
    l.created_at,
    l.updated_at
FROM loans l
JOIN users u ON l.user_id = u.id;

-- Aggregate stats view
-- MySQL does not support COUNT(*) FILTER (WHERE ...).
-- Use SUM(condition) which evaluates TRUE/FALSE as 1/0 in MySQL.
CREATE OR REPLACE VIEW v_stats AS
SELECT
    COUNT(*)                                       AS total_loans,
    SUM(status = 'pending')                        AS pending_loans,
    SUM(status = 'approved')                       AS approved_loans,
    SUM(status = 'rejected')                       AS rejected_loans,
    SUM(status = 'disbursed')                      AS disbursed_loans,
    COALESCE(
        SUM(CASE WHEN status IN ('approved','disbursed') THEN loan_amount ELSE 0 END),
        0
    )                                              AS total_approved_amount,
    CAST(AVG(credit_score) AS DECIMAL(6,1))        AS avg_credit_score
FROM loans;

-- ============================================================
--  Done
-- ============================================================
SELECT 'MySQL 8 schema created successfully.' AS result;
