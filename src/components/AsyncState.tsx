interface AsyncStateProps {
  loading: boolean;
  error?: string | null;
  children: React.ReactNode;
}

export function AsyncState({ loading, error, children }: AsyncStateProps) {
  if (loading) {
    return <div className="notice">Loading gateway data…</div>;
  }

  if (error) {
    return <div className="notice error" role="alert">{error}</div>;
  }

  return <>{children}</>;
}
