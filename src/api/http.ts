import type { ProblemResponse, TrafficProbeResult } from '@/types/api';
import { assertAllowedProbePath, normalizeApiBaseUrl } from '@/security/url';

const DEFAULT_TIMEOUT_MS = Number(import.meta.env.VITE_REQUEST_TIMEOUT_MS || 8000);
const TRANSIENT_STATUSES = new Set([408, 429, 502, 503, 504]);

export interface GatewayClientConfig {
  apiBaseUrl: string;
  adminToken: string;
}

export class GatewayApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly problem?: ProblemResponse
  ) {
    super(message);
    this.name = 'GatewayApiError';
  }
}

/**
 * Small typed client over fetch. It avoids axios-style dependency risk and keeps request behavior explicit.
 */
export class GatewayApiClient {
  private readonly baseUrl: string;

  constructor(private readonly config: GatewayClientConfig) {
    this.baseUrl = normalizeApiBaseUrl(config.apiBaseUrl);
  }

  listAccessEntries<T>() {
    return this.request<T>('/admin/access-list');
  }

  createAccessEntry<T>(payload: unknown) {
    return this.request<T>('/admin/access-list', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  disableAccessEntry(id: string) {
    return this.request<void>(`/admin/access-list/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }

  dashboard<T>(kind: 'top-ips' | 'top-tenants' | 'top-routes', window: string, limit: number) {
    const params = new URLSearchParams({ window, limit: String(limit) });
    return this.request<T>(`/admin/dashboard/${kind}?${params.toString()}`);
  }

  redisScores<T>(type: 'ip' | 'tenant', limit: number) {
    const params = new URLSearchParams({ type, limit: String(limit) });
    return this.request<T>(`/admin/dashboard/redis-scores?${params.toString()}`);
  }

  policy<T>() {
    return this.request<T>('/admin/policy');
  }

  health<T>() {
    return this.request<T>('/actuator/health', { admin: false });
  }

  async probe(path: string, init: RequestInit, tenantId?: string, apiKey?: string): Promise<TrafficProbeResult> {
    assertAllowedProbePath(path);
    const started = performance.now();
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const headers = new Headers(init.headers);
      if (tenantId?.trim()) {
        headers.set('X-Tenant-Id', tenantId.trim());
      }
      if (apiKey?.trim()) {
        headers.set('X-Api-Key', apiKey.trim());
      }
      headers.set('X-Request-Id', createRequestId());

      const response = await fetch(this.url(path), {
        ...init,
        headers,
        signal: controller.signal
      });
      const body = await response.text();
      const resultHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        resultHeaders[key] = value;
      });

      return {
        status: response.status,
        statusText: response.statusText,
        durationMs: Math.round(performance.now() - started),
        headers: resultHeaders,
        body
      };
    } finally {
      window.clearTimeout(timeout);
    }
  }

  private async request<T>(path: string, init: RequestInit & { admin?: boolean } = {}): Promise<T> {
    const method = (init.method || 'GET').toUpperCase();
    const maxAttempts = method === 'GET' ? 2 : 1;
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        return await this.singleRequest<T>(path, init, method);
      } catch (error) {
        lastError = error;
        if (!shouldRetry(error) || attempt >= maxAttempts) {
          throw error;
        }
        await delay(150 * attempt);
      }
    }

    throw lastError;
  }

  private async singleRequest<T>(path: string, init: RequestInit & { admin?: boolean }, method: string): Promise<T> {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    try {
      const headers = new Headers(init.headers);
      headers.set('Accept', 'application/json');
      headers.set('X-Request-Id', createRequestId());
      if (init.body && !headers.has('Content-Type')) {
        headers.set('Content-Type', 'application/json');
      }
      if (init.admin !== false) {
        headers.set('X-Admin-Token', this.config.adminToken);
      }

      const response = await fetch(this.url(path), {
        ...init,
        method,
        headers,
        signal: controller.signal
      });

      if (response.status === 204) {
        return undefined as T;
      }

      const payload = await parseResponsePayload(response);

      if (!response.ok) {
        const problem = typeof payload === 'object' && payload !== null ? (payload as ProblemResponse) : undefined;
        throw new GatewayApiError(problem?.message || problem?.error || `Gateway request failed with ${response.status}`, response.status, problem);
      }

      return payload as T;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        throw new GatewayApiError('Request timed out. Check backend health or proxy configuration.', 408);
      }
      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  private url(path: string): string {
    return `${this.baseUrl}${path}`;
  }
}

async function parseResponsePayload(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') || '';
  const text = await response.text();
  if (!text) {
    return undefined;
  }

  if (!contentType.includes('application/json')) {
    return text;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new GatewayApiError('Gateway returned invalid JSON.', response.status);
  }
}

function createRequestId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function shouldRetry(error: unknown): boolean {
  if (error instanceof GatewayApiError) {
    return TRANSIENT_STATUSES.has(error.status);
  }

  return error instanceof TypeError;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}
