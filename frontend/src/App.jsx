import { useState } from 'react';
import DataPanel from './components/DataPanel.jsx';

const MIN_PATIENT_NAME_LENGTH = 2;
const MAX_PATIENT_AGE_YEARS = 130;

function validatePatientName(raw) {
  if (raw.trim().length < MIN_PATIENT_NAME_LENGTH) {
    return `Name must be at least ${MIN_PATIENT_NAME_LENGTH} characters long.`;
  }
  return null;
}

function validatePatientDob(raw) {
  const dob = new Date(raw);
  if (Number.isNaN(dob.getTime())) {
    return 'Date of birth is not a valid date.';
  }
  const today = new Date();
  if (dob > today) {
    return 'Date of birth cannot be in the future.';
  }
  const earliest = new Date(today);
  earliest.setFullYear(today.getFullYear() - MAX_PATIENT_AGE_YEARS);
  if (dob < earliest) {
    return `Date of birth cannot be more than ${MAX_PATIENT_AGE_YEARS} years ago.`;
  }
  return null;
}

function formatDate(value) {
  if (!value) return 'Unknown date';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatDateTime(value) {
  if (!value) return 'Unscheduled';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function formatCurrency(value) {
  const amount = Number(value);
  if (Number.isNaN(amount)) return String(value);
  return amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
}

export default function App() {
  // Tracked so Book Appointment / Create Invoice can offer a dropdown of
  // real patients instead of a free-typed ID - you physically cannot pick
  // a patient that doesn't exist. Kept here (not inside the Patients
  // DataPanel) so the other two panels can read it too.
  const [patients, setPatients] = useState([]);

  const patientOptions = patients.map((p) => ({
    value: p.id,
    label: `#${p.id} · ${p.name}`,
  }));

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="brand-mark" aria-hidden="true">
          AC
        </div>
        <div>
          <h1>AuraCare Health</h1>
          <p className="subtitle">Patient Portal Dashboard</p>
        </div>
      </header>

      <main className="app-main">
        <div className="panel-grid">
          <DataPanel
            title="Patients"
            icon="🩺"
            endpoint="/api/patients"
            emptyLabel="No patient records found."
            onItemsChange={setPatients}
            renderItem={(patient) => (
              <li key={patient.id}>
                <div className="record-title">{patient.name}</div>
                <div className="record-sub">DOB: {formatDate(patient.dob)}</div>
              </li>
            )}
            addForm={{
              buttonLabel: 'Add Patient',
              modalTitle: 'Add Patient',
              submitLabel: 'Add Patient',
              fields: [
                {
                  name: 'name',
                  label: 'Full name',
                  type: 'text',
                  required: true,
                  validate: validatePatientName,
                },
                {
                  name: 'dob',
                  label: 'Date of birth',
                  type: 'date',
                  required: true,
                  validate: validatePatientDob,
                },
                {
                  name: 'medical_history',
                  label: 'Medical history',
                  type: 'textarea',
                  required: false,
                  placeholder: 'Optional notes',
                },
              ],
            }}
            detail={{
              getTitle: (patient) => patient.name,
              render: (patient) => (
                <dl className="detail-grid">
                  <div className="detail-row">
                    <dt>Patient ID</dt>
                    <dd>#{patient.id}</dd>
                  </div>
                  <div className="detail-row">
                    <dt>Full name</dt>
                    <dd>{patient.name}</dd>
                  </div>
                  <div className="detail-row">
                    <dt>Date of birth</dt>
                    <dd>{formatDate(patient.dob)}</dd>
                  </div>
                  <div className="detail-row">
                    <dt>Medical history</dt>
                    <dd>{patient.medical_history || 'No medical history on file.'}</dd>
                  </div>
                </dl>
              ),
            }}
          />

          <DataPanel
            title="Appointments"
            icon="📅"
            endpoint="/api/appointments"
            emptyLabel="No upcoming appointments."
            renderItem={(appt) => (
              <li key={appt.id}>
                <div className="record-title">{formatDateTime(appt.scheduled_at)}</div>
                <div className="record-sub">
                  Patient #{appt.patient_id} · Provider #{appt.provider_id}
                  {appt.notes ? ` · ${appt.notes}` : ''}
                </div>
              </li>
            )}
            addForm={{
              buttonLabel: 'Book Appointment',
              modalTitle: 'Book Appointment',
              submitLabel: 'Book Appointment',
              fields: [
                {
                  name: 'patient_id',
                  label: 'Patient',
                  type: 'select',
                  required: true,
                  options: patientOptions,
                  placeholder: 'Select a patient…',
                  emptyOptionsMessage:
                    'No patients yet. Add a patient first before booking an appointment.',
                },
                { name: 'provider_id', label: 'Provider ID', type: 'number', required: true },
                {
                  name: 'scheduled_at',
                  label: 'Date & time',
                  type: 'datetime-local',
                  required: true,
                  // datetime-local gives a timezone-less local string;
                  // convert to a real ISO timestamp before sending.
                  parse: (raw) => new Date(raw).toISOString(),
                },
                {
                  name: 'notes',
                  label: 'Notes',
                  type: 'textarea',
                  required: false,
                  placeholder: 'Optional notes',
                },
              ],
            }}
          />

          <DataPanel
            title="Billing"
            icon="💳"
            endpoint="/api/billing"
            emptyLabel="No invoices found."
            renderItem={(invoice) => (
              <li key={invoice.id}>
                <div className="record-title">{formatCurrency(invoice.amount)}</div>
                <div className="record-sub">
                  Patient #{invoice.patient_id} · {invoice.status}
                </div>
              </li>
            )}
            addForm={{
              buttonLabel: 'Create Invoice',
              modalTitle: 'Create Invoice',
              submitLabel: 'Create Invoice',
              fields: [
                {
                  name: 'patient_id',
                  label: 'Patient',
                  type: 'select',
                  required: true,
                  options: patientOptions,
                  placeholder: 'Select a patient…',
                  emptyOptionsMessage:
                    'No patients yet. Add a patient first before creating an invoice.',
                },
                {
                  name: 'amount',
                  label: 'Amount (USD)',
                  type: 'number',
                  step: '0.01',
                  required: true,
                  validate: (raw) =>
                    Number(raw) <= 0 ? 'Amount must be greater than zero.' : null,
                },
              ],
            }}
          />
        </div>
      </main>

      <footer className="app-footer">
        AuraCare Health · Internal Patient Portal · For authorized clinical staff use only
      </footer>
    </div>
  );
}
