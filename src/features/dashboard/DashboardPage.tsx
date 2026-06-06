import { useCallback, useEffect, useMemo, useState } from 'react';
import type { GatewayApiClient } from '@/api/http';
import { AsyncState } from '@/components/AsyncState';
import { EmptyState } from '@/components/EmptyState';
import { useInterval } from '@/hooks/useInterval';
import type { DashboardRow, RedisScoreRow } from '@/types/api';
import { formatDateTime, formatNumber, formatPercent } from '@/utils/format';

interface DashboardPageProps {
  client: GatewayApiClient;
  configured: boolean;
}

interface DashboardState {
  topIps: DashboardRow[];
  topTenants: DashboardRow[];
  topRoutes: DashboardRow[];
  redisScores: RedisScoreRow[];
}

const emptyState: DashboardState = {
  topIps: [],
  topTenants: [],
  topRoutes: [],
  redisScores: []
};

const AUTO_REFRESH_OPTIONS = [
  { label: 'Off', value: 0 },
  { label: '15 seconds', value: 15_000 },
  { label: '30 seconds', value: 30_000 },
  { label: '60 seconds', value: 60_000 }
];

export function DashboardPage({ client, configured }: DashboardPageProps) {
  const [windowValue, setWindowValue] = useState('PT1H');
  const [limit, setLimit] = useState(10);
  const [scoreType, setScoreType] = useState<'ip' | 'tenant'>('ip');
  const [autoRefreshMs, setAutoRefreshMs] = useState(0);
  const [data, setData] = useState<DashboardState>(emptyState);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const normalizedLimit = Number.isFinite(limit) ? Math.min(100, Math.max(1, Math.trunc(limit))) : 10;

  const load = useCallback(async () => {
    if (!configured) {
      return;
    }

    setLoading(true);
    setError(null);
    setWarnings([]);

    const requests = {
      topIps: client.dashboard<DashboardRow[]>('top-ips', windowValue, normalizedLimit),
      topTenants: client.dashboard<DashboardRow[]>('top-tenants', windowValue, normalizedLimit),
      topRoutes: client.dashboard<DashboardRow[]>('top-routes', windowValue, normalizedLimit),
      redisScores: client.redisScores<RedisScoreRow[]>(scoreType, normalizedLimit)
    };

    const results = await Promise.allSettled(Object.entries(requests).map(async ([key, promise]) => [key, await promise] as const));
    const nextData: DashboardState = { ...emptyState };
    const nextWarnings: string[] = [];

    results.forEach((result) => {
      if (result.status === 'fulfilled') {
        const [key, value] = result.value;
        nextData[key as keyof DashboardState] = value as never;
        return;
      }

      nextWarnings.push(result.reason instanceof Error ? result.reason.message : 'One dashboard source failed.');
    });

    setData(nextData);
    setLastUpdated(new Date().toISOString());
    setWarnings([...new Set(nextWarnings)]);
    setError(nextWarnings.length === results.length ? 'All dashboard requests failed.' : null);
    setLoading(false);
  }, [client, configured, normalizedLimit, scoreType, windowValue]);

  useEffect(() => {
    void load();
  }, [load]);

  useInterval(() => {
    void load();
  }, configured && autoRefreshMs > 0 ? autoRefreshMs : null);

  const totalRejected = useMemo(
    () => [...data.topIps, ...data.topTenants, ...data.topRoutes].reduce((sum, row) => sum + row.rejected, 0),
    [data.topIps, data.topTenants, data.topRoutes]
  );
  const maxScore = useMemo(() => data.redisScores.reduce((max, row) => Math.max(max, row.score), 0), [data.redisScores]);
  const highestErrorRate = useMemo(
    () => [...data.topIps, ...data.topTenants, ...data.topRoutes].reduce((max, row) => Math.max(max, row.maxErrorRate), 0),
    [data.topIps, data.topTenants, data.topRoutes]
  );

  return (
    <section className="page-stack">
      <div className="page-heading">
        <div>
          <p className="eyebrow">Risk analytics</p>
          <h2>Abuse dashboard</h2>
          <p>Monitor top abusive IPs, tenants, routes, and live Redis abuse scores.</p>
        </div>
        <button className="primary-button" type="button" onClick={() => void load()} disabled={!configured || loading}>Refresh</button>
      </div>

      <div className="toolbar dashboard-toolbar">
        <label>
          <span>Window</span>
          <select value={windowValue} onChange={(event) => setWindowValue(event.target.value)}>
            <option value="PT15M">Last 15 minutes</option>
            <option value="PT1H">Last hour</option>
            <option value="PT6H">Last 6 hours</option>
            <option value="P1D">Last day</option>
          </select>
        </label>
        <label>
          <span>Limit</span>
          <input type="number" min={1} max={100} value={limit} onChange={(event) => setLimit(Number(event.target.value))} />
        </label>
        <label>
          <span>Redis score type</span>
          <select value={scoreType} onChange={(event) => setScoreType(event.target.value as 'ip' | 'tenant')}>
            <option value="ip">IP</option>
            <option value="tenant">Tenant</option>
          </select>
        </label>
        <label>
          <span>Auto-refresh</span>
          <select value={autoRefreshMs} onChange={(event) => setAutoRefreshMs(Number(event.target.value))}>
            {AUTO_REFRESH_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>
      </div>

      {!configured && <EmptyState title="Admin token required" description="Enter the gateway admin token to load abuse dashboards." />}
      {warnings.length > 0 && <div className="notice warn" role="status">Partial dashboard data loaded. {warnings.join(' ')}</div>}

      <AsyncState loading={loading} error={error}>
        {configured && (
          <>
            <div className="metric-grid four">
              <MetricCard label="Rejected signals" value={formatNumber(totalRejected)} helper="Across selected dashboard tables" />
              <MetricCard label="Highest Redis score" value={formatNumber(maxScore)} helper="Current sorted-set score" />
              <MetricCard label="Highest error rate" value={formatPercent(highestErrorRate)} helper="Max observed in selected window" />
              <MetricCard label="Last refresh" value={lastUpdated ? formatDateTime(lastUpdated) : '—'} helper={`Window ${windowValue}`} />
            </div>

            <div className="grid-two">
              <DashboardTable title="Top abusive IPs" rows={data.topIps} />
              <DashboardTable title="Top abusive tenants" rows={data.topTenants} />
              <DashboardTable title="Top rejected/error routes" rows={data.topRoutes} />
              <RedisScoreTable title="Current Redis abuse scores" rows={data.redisScores} />
            </div>
          </>
        )}
      </AsyncState>
    </section>
  );
}

function MetricCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <article className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{helper}</small>
    </article>
  );
}

function DashboardTable({ title, rows }: { title: string; rows: DashboardRow[] }) {
  return (
    <article className="card">
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <EmptyState title="No rows" description="No abusive traffic found for the selected window." />
      ) : (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Subject</th>
                <th>Rejected</th>
                <th>Errors</th>
                <th>Max score</th>
                <th>Max error rate</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.subject}>
                  <td className="mono">{row.subject}</td>
                  <td>{formatNumber(row.rejected)}</td>
                  <td>{formatNumber(row.errors)}</td>
                  <td>{formatNumber(row.maxAbuseScore)}</td>
                  <td>{formatPercent(row.maxErrorRate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </article>
  );
}

function RedisScoreTable({ title, rows }: { title: string; rows: RedisScoreRow[] }) {
  const max = Math.max(1, ...rows.map((row) => row.score));

  return (
    <article className="card">
      <h3>{title}</h3>
      {rows.length === 0 ? (
        <EmptyState title="No live scores" description="Redis sorted-set currently has no abusive subjects." />
      ) : (
        <div className="score-list">
          {rows.map((row) => (
            <div className="score-row" key={row.subject}>
              <span className="mono">{row.subject}</span>
              <progress className="score-progress" value={Math.min(row.score, max)} max={max} aria-label={`Score for ${row.subject}`} />
              <strong>{formatNumber(row.score)}</strong>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
