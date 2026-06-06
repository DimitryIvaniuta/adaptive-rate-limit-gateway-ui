import type { ReactNode } from 'react';
import { ConnectionPanel } from '@/layout/ConnectionPanel';

export type PageKey = 'dashboard' | 'access' | 'policy' | 'health' | 'probe';

const navigation: Array<{ key: PageKey; label: string; description: string }> = [
  { key: 'dashboard', label: 'Abuse dashboard', description: 'Top IPs, tenants, routes, Redis scores' },
  { key: 'access', label: 'Access lists', description: 'Allowlist and blocklist management' },
  { key: 'policy', label: 'Policy viewer', description: 'Active adaptive limit configuration' },
  { key: 'health', label: 'Health', description: 'Actuator and dependency status' },
  { key: 'probe', label: 'Traffic probe', description: 'Test /api and /auth routes' }
];

interface AppLayoutProps {
  activePage: PageKey;
  apiBaseUrl: string;
  configured: boolean;
  children: ReactNode;
  onApiBaseUrlChange: (value: string) => void;
  onAdminTokenChange: (value: string) => void;
  onPageChange: (page: PageKey) => void;
}

export function AppLayout(props: AppLayoutProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar" aria-label="Primary navigation">
        <div className="brand-block">
          <div className="brand-logo" aria-hidden="true">AG</div>
          <div>
            <p className="eyebrow">Adaptive Gateway</p>
            <h1>Banking API Shield</h1>
          </div>
        </div>

        <nav className="nav-list">
          {navigation.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`nav-item ${props.activePage === item.key ? 'active' : ''}`}
              onClick={() => props.onPageChange(item.key)}
            >
              <span>{item.label}</span>
              <small>{item.description}</small>
            </button>
          ))}
        </nav>

        <div className="sidebar-card">
          <p className="eyebrow">Protection posture</p>
          <strong>{props.configured ? 'Admin connected' : 'Token required'}</strong>
          <span>{props.configured ? 'Operational controls enabled' : 'Enter X-Admin-Token to manage policies'}</span>
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">Production control plane</p>
            <h2>Adaptive Rate Limit Gateway Console</h2>
          </div>
          <div className="status-pill" data-status={props.configured ? 'ok' : 'warn'}>
            {props.configured ? 'Connected' : 'Read-only until token is entered'}
          </div>
        </header>

        <ConnectionPanel
          apiBaseUrl={props.apiBaseUrl}
          onApiBaseUrlChange={props.onApiBaseUrlChange}
          onAdminTokenChange={props.onAdminTokenChange}
        />

        <main className="content-panel">{props.children}</main>

        <footer className="footer">
          <span>Adaptive Gateway UI · React 19.2 · TypeScript</span>
          <span>Same-origin proxy recommended for production</span>
        </footer>
      </div>
    </div>
  );
}
