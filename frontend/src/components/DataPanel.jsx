import { cloneElement, useCallback, useEffect, useState } from 'react';
import { fetchJson } from '../api.js';
import Modal from './Modal.jsx';
import RecordForm from './RecordForm.jsx';

/**
 * Generic dashboard panel that fetches a list of records from a given
 * API endpoint and renders them with a caller-supplied render function.
 *
 * Optionally accepts an `addForm` config ({ buttonLabel, modalTitle,
 * fields, submitLabel }) which adds an "Add" button that opens a modal
 * form. Submitting POSTs to the same `endpoint` and refreshes the list.
 */
export default function DataPanel({
  title,
  icon,
  endpoint,
  renderItem,
  emptyLabel,
  addForm,
  onItemsChange,
  detail,
}) {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState('loading'); // 'loading' | 'ok' | 'error'
  const [error, setError] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const load = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const data = await fetchJson(endpoint);
      const list = Array.isArray(data) ? data : [];
      setItems(list);
      setStatus('ok');
      onItemsChange?.(list);
    } catch (err) {
      setError(err.message || 'Unknown error');
      setStatus('error');
    }
  }, [endpoint, onItemsChange]);

  useEffect(() => {
    load();
  }, [load]);

  function handleAddSuccess() {
    setModalOpen(false);
    load();
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <h2>
          <span className="panel-icon" aria-hidden="true">
            {icon}
          </span>
          {title}
        </h2>
        <span className={`status-pill ${status}`}>
          {status === 'loading' ? 'Loading' : status === 'ok' ? 'Live' : 'Error'}
        </span>
      </div>

      {status === 'loading' && <p className="empty-state">Loading data…</p>}

      {status === 'error' && (
        <div className="error-state">
          Couldn&apos;t reach {endpoint}. {error}
        </div>
      )}

      {status === 'ok' && items.length === 0 && (
        <p className="empty-state">{emptyLabel || 'No records found.'}</p>
      )}

      {status === 'ok' && items.length > 0 && (
        <ul className="record-list">
          {items.map((item) => {
            const row = renderItem(item);
            if (!detail) return row;

            // Attach click/keyboard-activation behavior directly onto the
            // <li> the caller already returns, rather than wrapping it in
            // a <button> (which would be invalid as a direct child of <ul>).
            return cloneElement(row, {
              className: `${row.props.className || ''} record-list-item-clickable`.trim(),
              role: 'button',
              tabIndex: 0,
              onClick: () => setSelectedItem(item),
              onKeyDown: (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setSelectedItem(item);
                }
              },
            });
          })}
        </ul>
      )}

      <div className="toolbar">
        {addForm && (
          <button
            type="button"
            className="secondary-btn"
            onClick={() => setModalOpen(true)}
            aria-label={addForm.buttonLabel}
          >
            + {addForm.buttonLabel}
          </button>
        )}
        <button
          type="button"
          className="refresh-btn"
          onClick={load}
          aria-label={`Refresh ${title}`}
        >
          Refresh
        </button>
      </div>

      {addForm && (
        <Modal open={modalOpen} title={addForm.modalTitle} onClose={() => setModalOpen(false)}>
          <RecordForm
            endpoint={endpoint}
            fields={addForm.fields}
            submitLabel={addForm.submitLabel}
            onSuccess={handleAddSuccess}
            onCancel={() => setModalOpen(false)}
          />
        </Modal>
      )}

      {detail && (
        <Modal
          open={selectedItem !== null}
          title={selectedItem ? detail.getTitle(selectedItem) : ''}
          onClose={() => setSelectedItem(null)}
        >
          {selectedItem && detail.render(selectedItem)}
        </Modal>
      )}
    </section>
  );
}
