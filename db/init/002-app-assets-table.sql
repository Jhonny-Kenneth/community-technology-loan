CREATE TABLE IF NOT EXISTS app.assets (
    uuid TEXT PRIMARY KEY,

    req_datetime TIMESTAMP NOT NULL,

    entered_date TIMESTAMP NOT NULL,

    src_id TEXT NOT NULL,
    ref_id TEXT NOT NULL,

    modified_by TEXT NOT NULL,

    type TEXT NOT NULL,
    subtype TEXT NOT NULL,

    to_value TEXT,
    from_value TEXT,

    message TEXT,

    processed_datetime TIMESTAMP,

    status TEXT NOT NULL
        CHECK (status IN ('PROCESSING', 'COMPLETED', 'FAILED'))
);