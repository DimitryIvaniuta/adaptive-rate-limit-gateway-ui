interface ConnectionPanelProps {
  apiBaseUrl: string;
  onApiBaseUrlChange: (value: string) => void;
  onAdminTokenChange: (value: string) => void;
}

/**
 * Connection settings are intentionally simple. Admin token is kept in component state only.
 */
export function ConnectionPanel(props: ConnectionPanelProps) {
  return (
    <section className="connection-panel" aria-label="Gateway connection settings">
      <label>
        <span>Gateway API base URL</span>
        <input
          value={props.apiBaseUrl}
          onChange={(event) => props.onApiBaseUrlChange(event.target.value)}
          placeholder="empty = same-origin proxy, or http://localhost:8080"
          autoComplete="off"
        />
      </label>
      <label>
        <span>Admin token</span>
        <input
          type="password"
          onChange={(event) => props.onAdminTokenChange(event.target.value)}
          placeholder="X-Admin-Token"
          autoComplete="off"
        />
      </label>
    </section>
  );
}
