-- AuraCare Health - local docker-compose Postgres bootstrap.
--
-- The official postgres image only lets POSTGRES_DB create ONE database
-- on first boot, but each microservice here owns its own logical
-- database (data isolation between services). This script runs
-- automatically on first container init (via /docker-entrypoint-initdb.d)
-- and creates the remaining per-service databases, all owned by the
-- same POSTGRES_USER supplied via environment variables.
--
-- For production, each service's database/credentials would be
-- provisioned separately (e.g. one RDS instance or schema per service)
-- rather than sharing a single local container.

SELECT 'CREATE DATABASE auracare_appointments'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'auracare_appointments')
\gexec

SELECT 'CREATE DATABASE auracare_billing'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'auracare_billing')
\gexec
