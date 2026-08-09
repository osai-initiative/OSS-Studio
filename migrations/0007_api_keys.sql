CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  account_id INTEGER NOT NULL REFERENCES platform_accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  prefix TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_used_at TEXT,
  revoked_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_api_keys_account ON api_keys(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash_active ON api_keys(key_hash, revoked_at);
