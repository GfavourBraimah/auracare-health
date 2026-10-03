-- AuraCare Health - Appointment Service schema
-- For production, prefer a proper migration tool instead of a raw script.

CREATE TABLE IF NOT EXISTS appointments (
    id SERIAL PRIMARY KEY,
    patient_id INTEGER NOT NULL,
    provider_id INTEGER NOT NULL,
    scheduled_at TIMESTAMPTZ NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
