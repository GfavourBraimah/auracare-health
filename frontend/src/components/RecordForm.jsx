import { useState } from 'react';
import { postJson } from '../api.js';

/**
 * Generic "create record" form, configured declaratively via a `fields`
 * array. Used to drive the Add Patient / Book Appointment / Create
 * Invoice forms from a single implementation.
 *
 * Each field: { name, label, type, required, step, placeholder, parse,
 *               validate, options, emptyOptionsMessage }
 *   - type: 'text' | 'number' | 'date' | 'datetime-local' | 'textarea' | 'select'
 *   - parse: optional (rawString) => value, applied before submit
 *     (e.g. converting a datetime-local string to an ISO timestamp).
 *   - validate: optional (rawString) => string | null, returning an error
 *     message to block submission, or null/undefined if valid. Runs
 *     client-side as a fast first check; the backend re-validates
 *     everything regardless, so this is a UX nicety, not the source of
 *     truth.
 *   - options: for type 'select', an array of { value, label } choices.
 *   - emptyOptionsMessage: for type 'select' with no options, a message
 *     shown instead of the dropdown (e.g. prompting to add a patient first).
 */
export default function RecordForm({ endpoint, fields, submitLabel, onSuccess, onCancel }) {
  const [values, setValues] = useState(() =>
    Object.fromEntries(fields.map((f) => [f.name, '']))
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function handleChange(name, raw) {
    setValues((prev) => ({ ...prev, [name]: raw }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const payload = {};
      for (const field of fields) {
        const raw = values[field.name];

        if (field.required && (raw === '' || raw === null || raw === undefined)) {
          throw new Error(`${field.label} is required.`);
        }

        if (raw === '' && !field.required) {
          continue;
        }

        if (field.validate) {
          const validationError = field.validate(raw);
          if (validationError) {
            throw new Error(validationError);
          }
        }

        if (field.parse) {
          payload[field.name] = field.parse(raw);
        } else if (field.type === 'number' || field.type === 'select') {
          payload[field.name] = field.numeric === false ? raw : Number(raw);
        } else {
          payload[field.name] = raw;
        }
      }

      await postJson(endpoint, payload);
      onSuccess();
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="record-form" onSubmit={handleSubmit}>
      {fields.map((field) => (
        <label key={field.name} className="form-field">
          <span>
            {field.label}
            {field.required && <span aria-hidden="true"> *</span>}
          </span>
          {field.type === 'textarea' ? (
            <textarea
              value={values[field.name]}
              placeholder={field.placeholder}
              required={field.required}
              rows={3}
              onChange={(e) => handleChange(field.name, e.target.value)}
            />
          ) : field.type === 'select' ? (
            field.options && field.options.length > 0 ? (
              <select
                value={values[field.name]}
                required={field.required}
                onChange={(e) => handleChange(field.name, e.target.value)}
              >
                <option value="" disabled>
                  {field.placeholder || 'Select…'}
                </option>
                {field.options.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            ) : (
              <span className="form-field-empty-note">
                {field.emptyOptionsMessage || 'No options available.'}
              </span>
            )
          ) : (
            <input
              type={field.type}
              value={values[field.name]}
              placeholder={field.placeholder}
              required={field.required}
              step={field.step}
              onChange={(e) => handleChange(field.name, e.target.value)}
            />
          )}
        </label>
      ))}

      {error && <div className="error-state">{error}</div>}

      <div className="form-actions">
        <button type="button" className="secondary-btn" onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className="refresh-btn" disabled={submitting}>
          {submitting ? 'Saving…' : submitLabel}
        </button>
      </div>
    </form>
  );
}
