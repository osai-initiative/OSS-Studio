-- Aggregate provider-reported token counts without retaining prompts, model
-- output, credentials, or raw network addresses.
CREATE TABLE IF NOT EXISTS token_usage (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER REFERENCES platform_accounts(id) ON DELETE CASCADE,
  ip_hash TEXT,
  surface TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  path TEXT NOT NULL,
  status INTEGER NOT NULL,
  streamed INTEGER NOT NULL DEFAULT 0,
  prompt_tokens INTEGER,
  completion_tokens INTEGER,
  total_tokens INTEGER,
  cached_tokens INTEGER,
  reasoning_tokens INTEGER,
  usage_reported INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK ((account_id IS NOT NULL AND ip_hash IS NULL) OR (account_id IS NULL AND ip_hash IS NOT NULL)),
  CHECK (streamed IN (0, 1)),
  CHECK (usage_reported IN (0, 1)),
  CHECK (prompt_tokens IS NULL OR prompt_tokens >= 0),
  CHECK (completion_tokens IS NULL OR completion_tokens >= 0),
  CHECK (total_tokens IS NULL OR total_tokens >= 0),
  CHECK (cached_tokens IS NULL OR cached_tokens >= 0),
  CHECK (reasoning_tokens IS NULL OR reasoning_tokens >= 0)
);

CREATE INDEX IF NOT EXISTS idx_token_usage_time ON token_usage(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_usage_surface_time ON token_usage(surface, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_usage_account_time ON token_usage(account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_token_usage_ip_time ON token_usage(ip_hash, created_at DESC);
