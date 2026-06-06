const MAX_BASE_URL_LENGTH = 512;
const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001f\u007f]/;
const ENCODED_TRAVERSAL_PATTERN = /(?:%2e|%2f|%5c)/i;

/**
 * Normalizes the gateway API base URL and rejects unsafe inputs.
 * Empty value means same-origin mode, which is preferred behind a reverse proxy.
 */
export function normalizeApiBaseUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (trimmed.length > MAX_BASE_URL_LENGTH) {
    throw new Error('API base URL is too long.');
  }

  if (CONTROL_CHARACTER_PATTERN.test(trimmed)) {
    throw new Error('API base URL must not contain control characters.');
  }

  const parsed = new URL(trimmed);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('API base URL must use http or https.');
  }

  if (parsed.username || parsed.password) {
    throw new Error('API base URL must not contain credentials.');
  }

  parsed.pathname = parsed.pathname.replace(/\/+$/, '');
  parsed.search = '';
  parsed.hash = '';
  return parsed.toString().replace(/\/$/, '');
}

/**
 * Prevents accidental proxy probing against arbitrary paths from the UI form.
 */
export function assertAllowedProbePath(path: string): void {
  const trimmed = path.trim();

  if (trimmed.length > 2048) {
    throw new Error('Probe path is too long.');
  }

  if (!trimmed.startsWith('/api/') && !trimmed.startsWith('/auth/')) {
    throw new Error('Probe path must start with /api/ or /auth/.');
  }

  if (CONTROL_CHARACTER_PATTERN.test(trimmed)) {
    throw new Error('Probe path must not contain control characters.');
  }

  if (trimmed.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    throw new Error('Probe path must be relative to the gateway origin.');
  }

  if (trimmed.includes('..') || trimmed.includes('\\') || ENCODED_TRAVERSAL_PATTERN.test(trimmed)) {
    throw new Error('Probe path must not contain traversal sequences.');
  }
}
