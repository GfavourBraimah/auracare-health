/**
 * Database connection pool for the Appointment Service.
 *
 * HIPAA compliance note:
 * Database credentials (including the full connection string) are NEVER
 * hardcoded or committed to source control. They are read exclusively from
 * the DATABASE_URL environment variable, which must be injected at runtime
 * by the deployment platform (e.g. ECS task secrets, Kubernetes Secret,
 * AWS Secrets Manager / Parameter Store). See .env.example for the expected
 * format for local development.
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  throw new Error(
    'DATABASE_URL environment variable is not set. ' +
      'Database credentials must be provided via environment variables only ' +
      '(see .env.example). Refusing to start without it.'
  );
}

const pool = new Pool({ connectionString: DATABASE_URL });

/**
 * Creates the appointments table if it does not already exist, by running
 * db/init.sql against the configured database. Called once on startup
 * (see index.js), the same way the Python services call
 * Base.metadata.create_all() before serving requests.
 *
 * For production, prefer a proper migration tool (e.g. node-pg-migrate,
 * Knex, Flyway) instead of relying on an idempotent CREATE TABLE script.
 */
async function initSchema() {
  const sql = fs.readFileSync(path.join(__dirname, 'db', 'init.sql'), 'utf8');
  await pool.query(sql);
}

module.exports = { pool, initSchema };
