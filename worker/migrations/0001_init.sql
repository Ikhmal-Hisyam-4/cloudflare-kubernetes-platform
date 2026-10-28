-- Port of backend/alembic/versions/57b3256b8a1a_init_schema.py to SQLite (D1).
-- Timestamps are ISO-8601 UTC strings, so they sort correctly as text.

CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  balance_cents INTEGER NOT NULL DEFAULT 0,
  alert_threshold_cents INTEGER NOT NULL DEFAULT 0,
  topup_amount_cents INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE os_images (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL
);

CREATE TABLE plans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  name TEXT NOT NULL,
  gpu_model TEXT,
  gpu_count INTEGER NOT NULL DEFAULT 0,
  vcpu INTEGER NOT NULL,
  ram_gb INTEGER NOT NULL,
  storage_gb INTEGER NOT NULL,
  rate_running_cents INTEGER NOT NULL,
  rate_stopped_cents INTEGER NOT NULL
);

CREATE TABLE instances (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  plan_id INTEGER NOT NULL REFERENCES plans(id),
  name TEXT NOT NULL,
  os_image TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'provisioning',
  compute_type TEXT NOT NULL DEFAULT 'gpu',
  gpu_model TEXT,
  location TEXT,
  storage_gb INTEGER NOT NULL,
  rate_running_cents INTEGER NOT NULL,
  rate_stopped_cents INTEGER NOT NULL,
  ip_address TEXT,
  dns_name TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX ix_instances_user_id ON instances(user_id);

CREATE TABLE usage_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  instance_id INTEGER NOT NULL REFERENCES instances(id),
  hour TEXT NOT NULL,
  compute_cost_cents INTEGER NOT NULL,
  storage_cost_cents INTEGER NOT NULL,
  -- 0 until the charge has been deducted from the user's balance (see src/billing.ts).
  settled INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT uq_usage_records_instance_hour UNIQUE (instance_id, hour)
);
CREATE INDEX ix_usage_records_instance_id ON usage_records(instance_id);

CREATE TABLE transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  type TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  method TEXT,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX ix_transactions_user_id ON transactions(user_id);

CREATE TABLE ssh_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  public_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX ix_ssh_keys_user_id ON ssh_keys(user_id);

CREATE TABLE api_keys (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  key_hash TEXT NOT NULL,
  last_used_at TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX ix_api_keys_user_id ON api_keys(user_id);
