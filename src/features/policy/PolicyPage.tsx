import { useEffect, useState } from 'react';
import type { GatewayApiClient } from '@/api/http';
import { AsyncState } from '@/components/AsyncState';
import { EmptyState } from '@/components/EmptyState';
import { StatusBadge } from '@/components/StatusBadge';
import type { RateLimitPolicy } from '@/types/api';
import { formatPercent } from '@/utils/format';

interface PolicyPageProps {
  client: GatewayApiClient;
  configured: boolean;
}

export function PolicyPage({ client, configured }: PolicyPageProps) {
  const [policy, setPolicy] = useState<RateLimitPolicy | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!configured) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      setPolicy(await client.policy<RateLimitPolicy>());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Failed to load policy.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [client, configured]);

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Runtime configuration</p>
          <h2>Policy viewer</h2>
          <p>Inspect active global and route-specific adaptive rate-limit values.</p>
        </div>
        <button className="secondary-button" type="button" onClick={load} disabled={!configured || loading}>Reload policy</button>
      </div>

      {!configured && <EmptyState title="Admin token required" description="Enter the gateway admin token to read the active policy." />}

      <AsyncState loading={loading} error={error}>
        {policy && (
          <>
            <div className="metric-grid">
              <PolicyMetric label="Rate limit" value={policy.enabled ? 'Enabled' : 'Disabled'} tone={policy.enabled ? 'ok' : 'warn'} />
              <PolicyMetric label="Failure mode" value={policy.failOpen ? 'Fail open' : 'Fail closed'} tone={policy.failOpen ? 'warn' : 'ok'} />
              <PolicyMetric label="Global base limit" value={`${policy.baseLimitPerMinute}/min`} tone="neutral" />
              <PolicyMetric label="Tenant base limit" value={`${policy.tenantBaseLimitPerMinute}/min`} tone="neutral" />
              <PolicyMetric label="Minimum limit" value={`${policy.minimumLimitPerMinute}/min`} tone="neutral" />
              <PolicyMetric label="Error threshold" value={formatPercent(policy.errorRateThreshold)} tone="neutral" />
            </div>

            <div className="grid-two align-start">
              <article className="card">
                <h3>Global policy</h3>
                <dl className="definition-list">
                  <dt>Window</dt><dd>{policy.window}</dd>
                  <dt>Allowlist bypass</dt><dd>{policy.allowlistBypass ? 'true' : 'false'}</dd>
                  <dt>Abuse hard block</dt><dd>{policy.abuseScoreHardBlock}</dd>
                  <dt>Statistic buckets</dt><dd>{policy.statisticsBuckets}</dd>
                  <dt>Access-list cache TTL</dt><dd>{policy.accessListCacheTtl}</dd>
                  <dt>Statistics TTL</dt><dd>{policy.statisticsTtl}</dd>
                  <dt>Abuse score TTL</dt><dd>{policy.abuseScoreTtl}</dd>
                  <dt>Error statuses</dt><dd>{policy.responseErrorStatuses.join(', ')}</dd>
                </dl>
              </article>

              <article className="card">
                <h3>Route overrides</h3>
                {Object.entries(policy.routePolicies).length === 0 ? (
                  <EmptyState title="No route overrides" description="All gateway routes inherit the global policy." />
                ) : (
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Route</th>
                          <th>Base</th>
                          <th>Tenant</th>
                          <th>Minimum</th>
                          <th>Window</th>
                          <th>Error threshold</th>
                          <th>Hard block</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(policy.routePolicies).map(([route, value]) => (
                          <tr key={route}>
                            <td className="mono">{route}</td>
                            <td>{value.baseLimitPerMinute ?? 'inherit'}</td>
                            <td>{value.tenantBaseLimitPerMinute ?? 'inherit'}</td>
                            <td>{value.minimumLimitPerMinute ?? 'inherit'}</td>
                            <td>{value.window ?? 'inherit'}</td>
                            <td>{value.errorRateThreshold === undefined ? 'inherit' : formatPercent(value.errorRateThreshold)}</td>
                            <td>{value.abuseScoreHardBlock ?? 'inherit'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>
            </div>

            <article className="card">
              <h3>Raw policy JSON</h3>
              <pre className="json-panel">{JSON.stringify(policy, null, 2)}</pre>
            </article>
          </>
        )}
      </AsyncState>
    </section>
  );
}

function PolicyMetric({ label, value, tone }: { label: string; value: string; tone: 'ok' | 'warn' | 'neutral' }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <StatusBadge value={value} tone={tone} />
    </article>
  );
}
