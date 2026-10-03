/**
 * Routes for the Appointment Service.
 *
 * All routes in this router are mounted under the /api/appointments
 * prefix (see index.js).
 */
const express = require('express');
const { pool } = require('../db');

const router = express.Router();

const PATIENT_SERVICE_URL = process.env.PATIENT_SERVICE_URL;

if (!PATIENT_SERVICE_URL) {
  throw new Error(
    'PATIENT_SERVICE_URL environment variable is not set. ' +
      'Required to verify a patient exists before booking an appointment for them.'
  );
}

/**
 * Verifies a patient_id refers to a real patient by calling the Patient
 * Records Service. This is a cross-service referential integrity check:
 * each service owns its own database, so there is no foreign key to
 * enforce "you cannot book an appointment for a patient who doesn't
 * exist" at the database level. We enforce it here instead, at the API
 * boundary, before the INSERT.
 *
 * Returns true if the patient exists, false if the Patient Service
 * returned a 404. Throws for any other failure (service unreachable,
 * unexpected status), which the caller surfaces as a 502 rather than
 * silently allowing an orphaned appointment to be created.
 */
async function patientExists(patientId) {
  const res = await fetch(`${PATIENT_SERVICE_URL}/api/patients/${patientId}`, {
    headers: { Accept: 'application/json' },
  });

  if (res.status === 404) {
    return false;
  }

  if (!res.ok) {
    throw new Error(`Patient Service returned unexpected status ${res.status}`);
  }

  return true;
}

/**
 * Liveness/readiness probe for the AWS ALB target group.
 *
 * Intentionally does not touch the database: a transient DB blip should
 * not cause the ALB to pull a healthy instance out of rotation. Returns
 * a static 200 OK as long as the process is up and serving requests.
 */
router.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Create an appointment
router.post('/', async (req, res, next) => {
  const { patient_id, provider_id, scheduled_at, notes } = req.body;

  if (!patient_id || !provider_id || !scheduled_at) {
    return res.status(400).json({
      error: 'patient_id, provider_id and scheduled_at are required',
    });
  }

  if (!Number.isInteger(patient_id) || patient_id <= 0) {
    return res.status(400).json({ error: 'patient_id must be a positive integer' });
  }

  if (!Number.isInteger(provider_id) || provider_id <= 0) {
    return res.status(400).json({ error: 'provider_id must be a positive integer' });
  }

  const scheduledDate = new Date(scheduled_at);
  if (Number.isNaN(scheduledDate.getTime())) {
    return res.status(400).json({ error: 'scheduled_at must be a valid date/time' });
  }

  try {
    // A patient must already exist before an appointment can be booked
    // for them - you cannot schedule a check-up for someone who was
    // never registered as a patient.
    const exists = await patientExists(patient_id);
    if (!exists) {
      return res.status(422).json({
        error: `No patient found with id ${patient_id}. Add the patient before booking an appointment for them.`,
      });
    }
  } catch (err) {
    return res.status(502).json({
      error: 'Could not verify patient_id against the Patient Service. Please try again.',
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO appointments (patient_id, provider_id, scheduled_at, notes)
       VALUES ($1, $2, $3, $4)
       RETURNING id, patient_id, provider_id, scheduled_at, notes, created_at`,
      [patient_id, provider_id, scheduled_at, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

// List appointments
router.get('/', async (req, res, next) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500);
  const offset = parseInt(req.query.offset, 10) || 0;

  try {
    const result = await pool.query(
      `SELECT id, patient_id, provider_id, scheduled_at, notes, created_at
       FROM appointments
       ORDER BY scheduled_at
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    res.status(200).json(result.rows);
  } catch (err) {
    next(err);
  }
});

// Get a single appointment by id
router.get('/:id', async (req, res, next) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, patient_id, provider_id, scheduled_at, notes, created_at
       FROM appointments
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
