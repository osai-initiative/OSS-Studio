CREATE TABLE IF NOT EXISTS studio_deployments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'queued',
  detail TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_studio_audit_account ON studio_audit(account_id, id DESC);
CREATE INDEX IF NOT EXISTS idx_studio_deployments_project ON studio_deployments(project_id, id DESC);
