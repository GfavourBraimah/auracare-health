/**
 * Thin fetch wrapper for the AuraCare backend services.
 *
 * All requests use same-origin relative paths (/api/patients,
 * /api/appointments, /api/billing). In production these are routed by
 * nginx to the appropriate backend container; in local dev they are
 * routed by the Vite dev server proxy (see vite.config.js).
 */
export async function fetchJson(path) {
  const res = await fetch(path, {
    headers: { Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Request to ${path} failed with status ${res.status}`);
  }

  return res.json();
}

/**
 * POST a JSON body to a same-origin API path and return the parsed JSON
 * response. On a non-2xx response, attempts to surface the backend's
 * error detail (FastAPI uses {"detail": ...}, the Node service uses
 * {"error": ...}) instead of a generic status message.
 */
export async function postJson(path, body) {
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    let detail = '';
    try {
      const data = await res.json();
      detail =
        typeof data?.detail === 'string'
          ? data.detail
          : data?.error || (data?.detail ? JSON.stringify(data.detail) : '');
    } catch {
      // Response body wasn't JSON (or was empty) - fall back below.
    }
    throw new Error(detail || `Request to ${path} failed with status ${res.status}`);
  }

  return res.json();
}
