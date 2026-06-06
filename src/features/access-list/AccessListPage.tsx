import { FormEvent, useEffect, useMemo, useState } from 'react';
import type { GatewayApiClient } from '@/api/http';
import { AsyncState } from '@/components/AsyncState';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/StatusBadge';
import { buildAccessListPayload, validateAccessSubject } from '@/security/input';
import type { AccessListCreateRequest, AccessListEntry, AccessListMode, SubjectType } from '@/types/api';
import { buildAccessListCsv, downloadTextFile } from '@/utils/csv';
import { formatDateTime } from '@/utils/format';

interface AccessListPageProps {
  client: GatewayApiClient;
  configured: boolean;
}

const initialForm: AccessListCreateRequest = {
  subjectType: 'IP',
  subjectValue: '',
  mode: 'BLOCK',
  reason: '',
  expiresAt: null
};

export function AccessListPage({ client, configured }: AccessListPageProps) {
  const [entries, setEntries] = useState<AccessListEntry[]>([]);
  const [form, setForm] = useState(initialForm);
  const [expiresLocal, setExpiresLocal] = useState('');
  const [query, setQuery] = useState('');
  const [modeFilter, setModeFilter] = useState<'ALL' | AccessListMode>('ALL');
  const [subjectFilter, setSubjectFilter] = useState<'ALL' | SubjectType>('ALL');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingDisable, setPendingDisable] = useState<AccessListEntry | null>(null);

  const subjectError = validateAccessSubject(form.subjectType, form.subjectValue);

  const filteredEntries = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return entries
      .filter((entry) => modeFilter === 'ALL' || entry.mode === modeFilter)
      .filter((entry) => subjectFilter === 'ALL' || entry.subjectType === subjectFilter)
      .filter((entry) => {
        if (!normalizedQuery) {
          return true;
        }
        return [entry.subjectValue, entry.reason, entry.subjectType, entry.mode]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(normalizedQuery));
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [entries, modeFilter, query, subjectFilter]);

  const load = async () => {
    if (!configured) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setEntries(await client.listAccessEntries<AccessListEntry[]>());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load access list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [client, configured]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!configured) {
      setError('Enter admin token before creating access-list entries.');
      return;
    }

    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const payload = buildAccessListPayload(form, expiresLocal);
      await client.createAccessEntry<AccessListEntry>(payload);
      setForm(initialForm);
      setExpiresLocal('');
      setMessage('Access-list entry created.');
      await load();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Failed to create entry.');
    } finally {
      setSubmitting(false);
    }
  };

  const disable = async (entry: AccessListEntry) => {
    setError(null);
    setMessage(null);
    try {
      await client.disableAccessEntry(entry.id);
      setMessage(`Disabled ${entry.mode.toLowerCase()} entry for ${entry.subjectValue}.`);
      setPendingDisable(null);
      await load();
    } catch (disableError) {
      setError(disableError instanceof Error ? disableError.message : 'Failed to disable entry.');
    }
  };

  const setExpiryPreset = (minutes: number) => {
    const date = new Date(Date.now() + minutes * 60_000);
    const offsetMs = date.getTimezoneOffset() * 60_000;
    setExpiresLocal(new Date(date.getTime() - offsetMs).toISOString().slice(0, 16));
  };

  const exportCsv = () => {
    downloadTextFile('adaptive-gateway-access-list.csv', buildAccessListCsv(filteredEntries), 'text/csv;charset=utf-8');
  };

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Control plane</p>
          <h2>Access lists</h2>
          <p>Manage high-priority allowlist and blocklist decisions before dynamic rate limiting runs.</p>
        </div>
        <div className="button-row">
          <button className="secondary-button" type="button" onClick={exportCsv} disabled={filteredEntries.length === 0}>Export CSV</button>
          <button className="secondary-button" type="button" onClick={load} disabled={!configured || loading}>Reload</button>
        </div>
      </div>

      <div className="grid-two align-start">
        <article className="card">
          <h3>Create entry</h3>
          <form className="form-grid" onSubmit={submit}>
            <label>
              <span>Subject type</span>
              <select value={form.subjectType} onChange={(event) => setForm({ ...form, subjectType: event.target.value as SubjectType })}>
                <option value="IP">IP or CIDR</option>
                <option value="TENANT">Tenant</option>
                <option value="API_KEY">API key SHA-256 hash</option>
              </select>
            </label>
            <label>
              <span>Mode</span>
              <select value={form.mode} onChange={(event) => setForm({ ...form, mode: event.target.value as AccessListMode })}>
                <option value="BLOCK">Block</option>
                <option value="ALLOW">Allow</option>
              </select>
            </label>
            <label className="span-two">
              <span>Subject value</span>
              <input
                required
                value={form.subjectValue}
                onChange={(event) => setForm({ ...form, subjectValue: event.target.value })}
                placeholder="203.0.113.10, 203.0.113.0/24, tenant-a, or api-key hash"
                autoComplete="off"
                aria-invalid={Boolean(subjectError)}
              />
            </label>
            {form.subjectValue.trim() && subjectError && <div className="notice error span-two" role="alert">{subjectError}</div>}
            <label className="span-two">
              <span>Reason</span>
              <textarea
                value={form.reason || ''}
                onChange={(event) => setForm({ ...form, reason: event.target.value })}
                placeholder="Incident ticket, fraud signal, VIP integration, etc."
                maxLength={512}
              />
            </label>
            <label className="span-two">
              <span>Expires at</span>
              <input type="datetime-local" value={expiresLocal} onChange={(event) => setExpiresLocal(event.target.value)} />
            </label>
            <div className="button-row span-two">
              <button className="secondary-button" type="button" onClick={() => setExpiryPreset(60)}>+1h</button>
              <button className="secondary-button" type="button" onClick={() => setExpiryPreset(24 * 60)}>+24h</button>
              <button className="secondary-button" type="button" onClick={() => setExpiresLocal('')}>No expiry</button>
            </div>
            <button className="primary-button span-two" type="submit" disabled={submitting || !configured || Boolean(subjectError)}>
              {submitting ? 'Creating…' : 'Create access-list entry'}
            </button>
          </form>
        </article>

        <article className="card">
          <h3>Operational guidance</h3>
          <ul className="guidance-list">
            <li>Use blocklist for confirmed abusive IPs, tenants, or API-key hashes.</li>
            <li>Use allowlist only for trusted integrations with separate monitoring.</li>
            <li>Prefer expiry dates for temporary incident response entries.</li>
            <li>Keep reasons tied to tickets for auditability.</li>
            <li>Export uses spreadsheet-safe escaping to avoid CSV formula execution.</li>
          </ul>
          {message && <div className="notice success">{message}</div>}
          {error && <div className="notice error" role="alert">{error}</div>}
        </article>
      </div>

      {!configured && <EmptyState title="Admin token required" description="Enter X-Admin-Token before managing access lists." />}

      <AsyncState loading={loading} error={null}>
        {configured && (
          <article className="card">
            <div className="table-heading">
              <h3>Active entries</h3>
              <span>{filteredEntries.length} of {entries.length} rows</span>
            </div>
            <div className="toolbar access-toolbar">
              <label>
                <span>Search</span>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Filter by subject, type, mode, or reason" />
              </label>
              <label>
                <span>Mode</span>
                <select value={modeFilter} onChange={(event) => setModeFilter(event.target.value as 'ALL' | AccessListMode)}>
                  <option value="ALL">All</option>
                  <option value="BLOCK">Block</option>
                  <option value="ALLOW">Allow</option>
                </select>
              </label>
              <label>
                <span>Subject</span>
                <select value={subjectFilter} onChange={(event) => setSubjectFilter(event.target.value as 'ALL' | SubjectType)}>
                  <option value="ALL">All</option>
                  <option value="IP">IP</option>
                  <option value="TENANT">Tenant</option>
                  <option value="API_KEY">API key</option>
                </select>
              </label>
            </div>
            {filteredEntries.length === 0 ? (
              <EmptyState title="No active entries" description="No rows match the current filters." />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Mode</th>
                      <th>Subject</th>
                      <th>Value</th>
                      <th>Reason</th>
                      <th>Expires</th>
                      <th>Created</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredEntries.map((entry) => (
                      <tr key={entry.id}>
                        <td><StatusBadge value={entry.mode} tone={entry.mode === 'BLOCK' ? 'danger' : 'ok'} /></td>
                        <td>{entry.subjectType}</td>
                        <td className="mono">{entry.subjectValue}</td>
                        <td>{entry.reason || '—'}</td>
                        <td>{formatDateTime(entry.expiresAt)}</td>
                        <td>{formatDateTime(entry.createdAt)}</td>
                        <td><button className="link-button" type="button" onClick={() => setPendingDisable(entry)}>Disable</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </article>
        )}
      </AsyncState>

      {pendingDisable && (
        <ConfirmDialog
          title="Disable access-list entry?"
          description={`This disables the ${pendingDisable.mode.toLowerCase()} entry for ${pendingDisable.subjectValue}. The gateway may change behavior immediately after cache eviction.`}
          confirmLabel="Disable entry"
          onCancel={() => setPendingDisable(null)}
          onConfirm={() => void disable(pendingDisable)}
        />
      )}
    </section>
  );
}
