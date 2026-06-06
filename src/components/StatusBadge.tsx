interface StatusBadgeProps {
  value: string;
  tone?: 'ok' | 'warn' | 'danger' | 'neutral';
}

export function StatusBadge({ value, tone = 'neutral' }: StatusBadgeProps) {
  return <span className={`badge ${tone}`}>{value}</span>;
}
