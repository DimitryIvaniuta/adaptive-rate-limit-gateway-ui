import { FormEvent, useState } from 'react';
import type { GatewayApiClient } from '@/api/http';
import { EmptyState } from '@/components/EmptyState';
import type { TrafficProbeResult } from '@/types/api';

interface TrafficProbePageProps {
  client: GatewayApiClient;
}

export function TrafficProbePage({ client }: TrafficProbePageProps) {
  const [method, setMethod] = useState('GET');
  const [path, setPath] = useState('/api/demo');
  const [tenantId, setTenantId] = useState('tenant-demo');
  const [apiKey, setApiKey] = useState('');
  const [body, setBody] = useState('');
  const [result, setResult] = useState<TrafficProbeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const headers = new Headers();
      let requestBody: string | undefined;
      if (method !== 'GET' && method !== 'HEAD' && body.trim()) {
        headers.set('Content-Type', 'application/json');
        JSON.parse(body);
        requestBody = body;
      }

      const requestInit: RequestInit = { method, headers };
      if (requestBody !== undefined) {
        requestInit.body = requestBody;
      }

      setResult(await client.probe(path, requestInit, tenantId, apiKey));
    } catch (probeError) {
      setError(probeError instanceof Error ? probeError.message : 'Probe failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Gateway smoke test</p>
          <h2>Traffic probe</h2>
          <p>Send a controlled request through `/api/**` or `/auth/**` and inspect rate-limit headers.</p>
        </div>
      </div>

      <div className="grid-two align-start">
        <article className="card">
          <h3>Request</h3>
          <form className="form-grid" onSubmit={submit}>
            <label>
              <span>Method</span>
              <select value={method} onChange={(event) => setMethod(event.target.value)}>
                <option>GET</option>
                <option>POST</option>
                <option>PUT</option>
                <option>DELETE</option>
              </select>
            </label>
            <label>
              <span>Path</span>
              <input value={path} onChange={(event) => setPath(event.target.value)} placeholder="/api/demo" />
            </label>
            <label>
              <span>Tenant header</span>
              <input value={tenantId} onChange={(event) => setTenantId(event.target.value)} placeholder="tenant-a" />
            </label>
            <label>
              <span>API key header</span>
              <input value={apiKey} onChange={(event) => setApiKey(event.target.value)} placeholder="optional X-Api-Key" type="password" />
            </label>
            <label className="span-two">
              <span>JSON body</span>
              <textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder='{"sample": true}' />
            </label>
            <button className="primary-button span-two" type="submit" disabled={loading}>{loading ? 'Sending…' : 'Send probe'}</button>
          </form>
        </article>

        <article className="card">
          <h3>Response</h3>
          {error && <div className="notice error" role="alert">{error}</div>}
          {!result && !error && <EmptyState title="No probe yet" description="Send a request to inspect status, headers, and body." />}
          {result && (
            <div className="response-panel">
              <div className="response-summary">
                <strong>{result.status} {result.statusText}</strong>
                <span>{result.durationMs} ms</span>
              </div>
              <h4>Headers</h4>
              <pre>{JSON.stringify(result.headers, null, 2)}</pre>
              <h4>Body</h4>
              <pre>{result.body || '—'}</pre>
            </div>
          )}
        </article>
      </div>
    </section>
  );
}
