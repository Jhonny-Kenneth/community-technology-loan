ALTER TABLE app.users ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'APPROVED';
ALTER TABLE app.users ADD COLUMN IF NOT EXISTS approved_by BIGINT;
ALTER TABLE app.users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE app.devices ADD COLUMN IF NOT EXISTS purchase_date DATE;
ALTER TABLE app.devices ADD COLUMN IF NOT EXISTS purchase_cost NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE app.devices ADD COLUMN IF NOT EXISTS depreciation_rate NUMERIC(5,2);

CREATE TABLE IF NOT EXISTS app.tenant_settings (
  tenant_id TEXT PRIMARY KEY REFERENCES app.tenants(tenant_id) ON DELETE CASCADE,
  default_depreciation_rate NUMERIC(5,2) NOT NULL DEFAULT 20 CHECK (default_depreciation_rate BETWEEN 0 AND 100),
  theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('system','light','dark')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app.audit_events (
  event_id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES app.tenants(tenant_id) ON DELETE CASCADE,
  actor_user_id BIGINT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT,
  request_id TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS audit_events_tenant_created ON app.audit_events(tenant_id, created_at DESC);
