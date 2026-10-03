/**
 * AuraCare Health - Appointment Service
 *
 * Entry point for the Express application. All business routes are
 * mounted under the /api/appointments prefix, including
 * /api/appointments/health which is used as the AWS ALB target group
 * health check.
 */
const express = require('express');
const appointmentsRouter = require('./routes/appointments');
const { initSchema } = require('./db');

const app = express();

app.use(express.json());

app.use('/api/appointments', appointmentsRouter);

// Centralized error handler. Keeps internal error details out of
// responses (PHI-adjacent service: never leak stack traces to clients).
app.use((err, req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

if (require.main === module) {
  initSchema()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Appointment service listening on port ${PORT}`);
      });
    })
    .catch((err) => {
      console.error('Failed to initialize database schema:', err);
      process.exit(1);
    });
}

module.exports = app;
