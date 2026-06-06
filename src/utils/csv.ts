import type { AccessListEntry } from '@/types/api';

const CSV_FORMULA_PREFIX = /^[=+\-@\t\r]/;

function safeCsvCell(value: unknown): string {
  const raw = value === undefined || value === null ? '' : String(value);
  const safe = CSV_FORMULA_PREFIX.test(raw) ? `'${raw}` : raw;
  return `"${safe.replace(/"/g, '""')}"`;
}

/**
 * Creates an export safe from spreadsheet formula injection.
 */
export function buildAccessListCsv(entries: AccessListEntry[]): string {
  const header = ['mode', 'subjectType', 'subjectValue', 'reason', 'expiresAt', 'createdAt', 'updatedAt'];
  const rows = entries.map((entry) => [
    entry.mode,
    entry.subjectType,
    entry.subjectValue,
    entry.reason ?? '',
    entry.expiresAt ?? '',
    entry.createdAt,
    entry.updatedAt
  ]);

  return [header, ...rows].map((row) => row.map(safeCsvCell).join(',')).join('\n');
}

export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
