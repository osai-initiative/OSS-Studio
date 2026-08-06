-- Never retain raw network addresses. Anonymous API usage is grouped by a
-- SHA-256 pseudonym; Studio usage is attributed to its authenticated account.
CREATE TABLE IF NOT EXISTS request_activity (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER,
  ip_hash TEXT,
  surface TEXT NOT NULL,
  method TEXT NOT NULL,
  path TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (account_id IS NOT NULL OR ip_hash IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_request_activity_account_time ON request_activity(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_request_activity_ip_time ON request_activity(ip_hash, created_at DESC);
