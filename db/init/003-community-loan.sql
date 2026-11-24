CREATE TABLE IF NOT EXISTS app.tenants (
  tenant_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS app.users (
  user_id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES app.tenants(tenant_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN','STAFF')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  approval_status TEXT NOT NULL DEFAULT 'APPROVED' CHECK (approval_status IN ('PENDING','APPROVED','REJECTED')),
  approved_by BIGINT,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, email)
);

CREATE TABLE IF NOT EXISTS app.outreach_centers (
  center_id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES app.tenants(tenant_id) ON DELETE CASCADE,
  center_name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (tenant_id, center_name),
  UNIQUE (tenant_id, center_id)
);

CREATE TABLE IF NOT EXISTS app.devices (
  device_id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES app.tenants(tenant_id) ON DELETE CASCADE,
  asset_tag TEXT NOT NULL,
  serial_number TEXT NOT NULL,
  device_type TEXT NOT NULL CHECK (device_type IN ('LAPTOP','TABLET','HOTSPOT')),
  manufacturer TEXT NOT NULL,
  model TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('AVAILABLE','CHECKED_OUT','MAINTENANCE')),
  center_id BIGINT NOT NULL,
  purchase_date DATE,
  purchase_cost NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (purchase_cost >= 0),
  depreciation_rate NUMERIC(5,2) CHECK (depreciation_rate >= 0 AND depreciation_rate <= 100),
  FOREIGN KEY (tenant_id, center_id) REFERENCES app.outreach_centers(tenant_id, center_id),
  UNIQUE (tenant_id, asset_tag),
  UNIQUE (tenant_id, serial_number),
  UNIQUE (tenant_id, device_id)
);

CREATE TABLE IF NOT EXISTS app.loan_reasons (
  reason_id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES app.tenants(tenant_id) ON DELETE CASCADE,
  reason_name TEXT NOT NULL,
  UNIQUE (tenant_id, reason_name),
  UNIQUE (tenant_id, reason_id)
);

CREATE TABLE IF NOT EXISTS app.loans (
  loan_id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES app.tenants(tenant_id) ON DELETE CASCADE,
  device_id BIGINT NOT NULL,
  center_id BIGINT NOT NULL,
  reason_id BIGINT NOT NULL,
  participant_code TEXT NOT NULL,
  checkout_date TIMESTAMPTZ NOT NULL,
  due_date TIMESTAMPTZ NOT NULL CHECK (due_date > checkout_date),
  return_date TIMESTAMPTZ,
  loan_status TEXT NOT NULL CHECK (loan_status IN ('ACTIVE','RETURNED','OVERDUE')),
  FOREIGN KEY (tenant_id, device_id) REFERENCES app.devices(tenant_id, device_id),
  FOREIGN KEY (tenant_id, center_id) REFERENCES app.outreach_centers(tenant_id, center_id),
  FOREIGN KEY (tenant_id, reason_id) REFERENCES app.loan_reasons(tenant_id, reason_id)
);

CREATE TABLE IF NOT EXISTS app.maintenance_records (
  maintenance_id BIGSERIAL PRIMARY KEY,
  tenant_id TEXT NOT NULL REFERENCES app.tenants(tenant_id) ON DELETE CASCADE,
  device_id BIGINT NOT NULL,
  issue_description TEXT NOT NULL,
  service_date DATE NOT NULL,
  resolved_date DATE,
  maintenance_status TEXT NOT NULL CHECK (maintenance_status IN ('OPEN','IN_PROGRESS','RESOLVED')),
  FOREIGN KEY (tenant_id, device_id) REFERENCES app.devices(tenant_id, device_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS one_active_loan_per_device
  ON app.loans(tenant_id, device_id) WHERE loan_status = 'ACTIVE';
CREATE INDEX IF NOT EXISTS devices_tenant_status ON app.devices(tenant_id, status);
CREATE INDEX IF NOT EXISTS loans_tenant_status ON app.loans(tenant_id, loan_status);

CREATE TABLE IF NOT EXISTS app.tenant_settings (
  tenant_id TEXT PRIMARY KEY REFERENCES app.tenants(tenant_id) ON DELETE CASCADE,
  default_depreciation_rate NUMERIC(5,2) NOT NULL DEFAULT 20 CHECK (default_depreciation_rate >= 0 AND default_depreciation_rate <= 100),
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
