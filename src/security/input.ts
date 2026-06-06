import type { AccessListCreateRequest, SubjectType } from '@/types/api';

const IPV4_PATTERN = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
const CIDR_PATTERN = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}\/(3[0-2]|[12]?\d)$/;
const TENANT_PATTERN = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{1,126}[a-zA-Z0-9]$/;
const SHA256_PATTERN = /^[a-fA-F0-9]{64}$/;

/**
 * Validates access-list subjects before sending control-plane changes to the gateway.
 */
export function validateAccessSubject(subjectType: SubjectType, value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return 'Subject value is required.';
  }

  if (trimmed.length > 256) {
    return 'Subject value must be at most 256 characters.';
  }

  if (subjectType === 'IP' && !IPV4_PATTERN.test(trimmed) && !CIDR_PATTERN.test(trimmed)) {
    return 'IP subject must be an IPv4 address or IPv4 CIDR, for example 203.0.113.10 or 203.0.113.0/24.';
  }

  if (subjectType === 'TENANT' && !TENANT_PATTERN.test(trimmed)) {
    return 'Tenant subject must contain 3-128 safe characters: letters, numbers, dot, underscore, colon, or dash.';
  }

  if (subjectType === 'API_KEY' && !SHA256_PATTERN.test(trimmed)) {
    return 'API key subject must be a 64-character SHA-256 hex hash, never the raw API key.';
  }

  return null;
}

/**
 * Builds a backend-safe payload and blocks common operator mistakes early.
 */
export function buildAccessListPayload(form: AccessListCreateRequest, expiresLocal: string): AccessListCreateRequest {
  const validationError = validateAccessSubject(form.subjectType, form.subjectValue);
  if (validationError) {
    throw new Error(validationError);
  }

  const expiresAt = expiresLocal ? new Date(expiresLocal) : null;
  if (expiresAt && Number.isNaN(expiresAt.getTime())) {
    throw new Error('Expiration date is invalid.');
  }

  if (expiresAt && expiresAt.getTime() <= Date.now()) {
    throw new Error('Expiration date must be in the future.');
  }

  const reason = form.reason?.trim() || null;
  if (reason && reason.length > 512) {
    throw new Error('Reason must be at most 512 characters.');
  }

  return {
    subjectType: form.subjectType,
    subjectValue: form.subjectValue.trim(),
    mode: form.mode,
    reason,
    expiresAt: expiresAt ? expiresAt.toISOString() : null
  };
}
