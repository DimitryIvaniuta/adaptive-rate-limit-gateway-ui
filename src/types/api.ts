export type SubjectType = 'IP' | 'TENANT' | 'API_KEY';
export type AccessListMode = 'ALLOW' | 'BLOCK';

export interface AccessListCreateRequest {
  subjectType: SubjectType;
  subjectValue: string;
  mode: AccessListMode;
  reason?: string | null;
  expiresAt?: string | null;
}

export interface AccessListEntry extends AccessListCreateRequest {
  id: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardRow {
  subject: string;
  rejected: number;
  errors: number;
  maxAbuseScore: number;
  maxErrorRate: number;
}

export interface RedisScoreRow {
  subject: string;
  score: number;
}

export interface RoutePolicy {
  baseLimitPerMinute?: number;
  tenantBaseLimitPerMinute?: number;
  minimumLimitPerMinute?: number;
  window?: string;
  errorRateThreshold?: number;
  abuseScoreHardBlock?: number;
}

export interface RateLimitPolicy {
  enabled: boolean;
  failOpen: boolean;
  window: string;
  baseLimitPerMinute: number;
  tenantBaseLimitPerMinute: number;
  minimumLimitPerMinute: number;
  allowlistBypass: boolean;
  errorRateThreshold: number;
  abuseScoreHardBlock: number;
  statisticsBuckets: number;
  accessListCacheTtl: string;
  statisticsTtl: string;
  abuseScoreTtl: string;
  responseErrorStatuses: number[];
  routePolicies: Record<string, RoutePolicy>;
}

export interface HealthResponse {
  status: string;
  components?: Record<string, { status: string; details?: Record<string, unknown> }>;
  groups?: string[];
}

export interface ProblemResponse {
  timestamp?: string;
  status?: number;
  error?: string;
  message?: string;
  path?: string;
  fields?: Record<string, string>;
}

export interface TrafficProbeResult {
  status: number;
  statusText: string;
  durationMs: number;
  headers: Record<string, string>;
  body: string;
}
