import { useMemo, useState } from 'react';
import { GatewayApiClient } from '@/api/http';
import { AccessListPage } from '@/features/access-list/AccessListPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { HealthPage } from '@/features/health/HealthPage';
import { PolicyPage } from '@/features/policy/PolicyPage';
import { TrafficProbePage } from '@/features/probe/TrafficProbePage';
import { AppLayout, type PageKey } from '@/layout/AppLayout';

const initialApiBaseUrl = import.meta.env.VITE_GATEWAY_API_BASE_URL || sessionStorage.getItem('gatewayApiBaseUrl') || '';

export function App() {
  const [page, setPage] = useState<PageKey>('dashboard');
  const [apiBaseUrl, setApiBaseUrl] = useState(initialApiBaseUrl);
  const [adminToken, setAdminToken] = useState('');

  const client = useMemo(
    () => new GatewayApiClient({ apiBaseUrl, adminToken }),
    [apiBaseUrl, adminToken]
  );

  const configured = adminToken.trim().length > 0;

  const saveApiBaseUrl = (value: string) => {
    setApiBaseUrl(value);
    sessionStorage.setItem('gatewayApiBaseUrl', value);
  };

  return (
    <AppLayout
      activePage={page}
      apiBaseUrl={apiBaseUrl}
      configured={configured}
      onApiBaseUrlChange={saveApiBaseUrl}
      onAdminTokenChange={setAdminToken}
      onPageChange={setPage}
    >
      {page === 'dashboard' && <DashboardPage client={client} configured={configured} />}
      {page === 'access' && <AccessListPage client={client} configured={configured} />}
      {page === 'policy' && <PolicyPage client={client} configured={configured} />}
      {page === 'health' && <HealthPage client={client} />}
      {page === 'probe' && <TrafficProbePage client={client} />}
    </AppLayout>
  );
}
