CREATE TABLE IF NOT EXISTS auditors (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  auditor_id INTEGER NOT NULL REFERENCES auditors(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS submissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  submitter_email TEXT NOT NULL DEFAULT '',
  website_url TEXT NOT NULL DEFAULT '',
  weights_url TEXT NOT NULL DEFAULT '',
  code_url TEXT NOT NULL DEFAULT '',
  data_url TEXT NOT NULL DEFAULT '',
  license TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  labels TEXT NOT NULL DEFAULT '',
  approved INTEGER NOT NULL DEFAULT 0,
  audit_notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  audited_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_submissions_status ON submissions(status);
CREATE INDEX IF NOT EXISTS idx_submissions_approved ON submissions(approved);
