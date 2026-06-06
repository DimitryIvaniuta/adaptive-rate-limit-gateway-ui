import { useState } from 'react';
import type { GatewayApiClient } from '@/api/http';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/StatusBadge';
import type { HealthResponse } from '@/types/api';

interface HealthPageProps {
  client: GatewayApiClient;
}

export function HealthPage({ client }: HealthPageProps) {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setHealth(await client.health<HealthResponse>());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load health.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Operations</p>
          <h2>Health</h2>
          <p>Check the gateway health endpoint and dependency status exposed by Spring Boot Actuator.</p>
        </div>
        <button className="primary-button" type="button" onClick={load} disabled={loading}>{loading ? 'Checking…' : 'Check health'}</button>
      </div>

      {error && <div className="notice error" role="alert">{error}</div>}

      {!health && !error && <EmptyState title="No health check yet" description="Click Check health to call /actuator/health." />}

      {health && (
        <div className="grid-two align-start">
          <article className="card">
            <h3>Gateway status</h3>
            <StatusBadge value={health.status} tone={health.status === 'UP' ? 'ok' : 'danger'} />
          </article>
          <article className="card">
            <h3>Components</h3>
            {health.components ? (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr><th>Component</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {Object.entries(health.components).map(([name, component]) => (
                      <tr key={name}>
                        <td>{name}</td>
                        <td><StatusBadge value={component.status} tone={component.status === 'UP' ? 'ok' : 'danger'} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p>Backend is configured with compact health details.</p>
            )}
          </article>
        </div>
      )}
    </section>
  );
}
