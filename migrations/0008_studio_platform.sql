CREATE TABLE IF NOT EXISTS studio_profiles (
  account_id INTEGER PRIMARY KEY,
  custom_instructions TEXT NOT NULL DEFAULT '',
  preferences TEXT NOT NULL DEFAULT '{}',
  tier TEXT NOT NULL DEFAULT 'standard',
  memory_enabled INTEGER NOT NULL DEFAULT 1,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS studio_memories (
  id TEXT PRIMARY KEY,
  account_id INTEGER NOT NULL,
  project_id TEXT,
  content TEXT NOT NULL,
  tags TEXT NOT NULL DEFAULT '[]',
  source TEXT NOT NULL DEFAULT 'manual',
  pinned INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_studio_memories_owner ON studio_memories(account_id, project_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS studio_chats (
  id TEXT PRIMARY KEY,
  account_id INTEGER NOT NULL,
  project_id TEXT,
  assistant_id TEXT,
  title TEXT NOT NULL DEFAULT 'New conversation',
  mode TEXT NOT NULL DEFAULT 'chat',
  model TEXT NOT NULL DEFAULT 'auto',
  messages TEXT NOT NULL DEFAULT '[]',
  archived INTEGER NOT NULL DEFAULT 0,
  pinned INTEGER NOT NULL DEFAULT 0,
  parent_chat_id TEXT,
  share_token TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_studio_chats_owner ON studio_chats(account_id, archived, pinned DESC, updated_at DESC);

CREATE TABLE IF NOT EXISTS studio_attachments (
  id TEXT PRIMARY KEY,
  account_id INTEGER NOT NULL,
  chat_id TEXT,
  project_id TEXT,
  name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  r2_key TEXT NOT NULL,
  extracted_text TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_studio_attachments_owner ON studio_attachments(account_id, chat_id, project_id, created_at DESC);

CREATE TABLE IF NOT EXISTS studio_documents (
  id TEXT PRIMARY KEY,
  account_id INTEGER NOT NULL,
  project_id TEXT,
  kind TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  metadata TEXT NOT NULL DEFAULT '{}',
  share_token TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_studio_documents_owner ON studio_documents(account_id, project_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS studio_assistants (
  id TEXT PRIMARY KEY,
  account_id INTEGER NOT NULL,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  instructions TEXT NOT NULL,
  visibility TEXT NOT NULL DEFAULT 'private',
  icon TEXT NOT NULL DEFAULT '✦',
  knowledge_ids TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_studio_assistants_catalog ON studio_assistants(visibility, updated_at DESC);

CREATE TABLE IF NOT EXISTS studio_market_installs (
  account_id INTEGER NOT NULL,
  workflow_id TEXT NOT NULL,
  settings TEXT NOT NULL DEFAULT '{}',
  installed_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(account_id, workflow_id)
);

CREATE TABLE IF NOT EXISTS studio_tasks (
  id TEXT PRIMARY KEY,
  account_id INTEGER NOT NULL,
  project_id TEXT,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'agent',
  schedule TEXT,
  next_run TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  progress TEXT NOT NULL DEFAULT '',
  result TEXT NOT NULL DEFAULT '',
  notify INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_studio_tasks_due ON studio_tasks(status, next_run);
CREATE INDEX IF NOT EXISTS idx_studio_tasks_owner ON studio_tasks(account_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS studio_notifications (
  id TEXT PRIMARY KEY,
  account_id INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  href TEXT,
  read INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_studio_notifications_owner ON studio_notifications(account_id, read, created_at DESC);

CREATE TABLE IF NOT EXISTS studio_agent_sessions (
  id TEXT PRIMARY KEY,
  account_id INTEGER NOT NULL,
  project_id TEXT,
  kind TEXT NOT NULL DEFAULT 'agent',
  title TEXT NOT NULL,
  state TEXT NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'ready',
  workspace_key TEXT NOT NULL,
  control_token TEXT UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_studio_agent_sessions_owner ON studio_agent_sessions(account_id, status, updated_at DESC);

CREATE TABLE IF NOT EXISTS studio_study_progress (
  account_id INTEGER NOT NULL,
  topic TEXT NOT NULL,
  level INTEGER NOT NULL DEFAULT 1,
  correct INTEGER NOT NULL DEFAULT 0,
  attempted INTEGER NOT NULL DEFAULT 0,
  notes TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY(account_id, topic)
);
