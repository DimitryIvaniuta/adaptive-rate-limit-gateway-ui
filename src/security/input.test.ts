import { describe, expect, it } from 'vitest';
import { buildAccessListPayload, validateAccessSubject } from './input';
import type { AccessListCreateRequest } from '@/types/api';

const validForm: AccessListCreateRequest = {
  subjectType: 'TENANT',
  subjectValue: 'tenant-risk-1',
  mode: 'BLOCK',
  reason: ' Incident INC-1 ',
  expiresAt: null
};

describe('validateAccessSubject', () => {
  it('accepts IPv4, CIDR, tenant ids, and SHA-256 hashes', () => {
    expect(validateAccessSubject('IP', '203.0.113.10')).toBeNull();
    expect(validateAccessSubject('IP', '203.0.113.0/24')).toBeNull();
    expect(validateAccessSubject('TENANT', 'tenant-risk-1')).toBeNull();
    expect(validateAccessSubject('API_KEY', 'a'.repeat(64))).toBeNull();
  });

  it('rejects raw API keys and malformed subjects', () => {
    expect(validateAccessSubject('IP', '999.999.999.999')).toContain('IPv4');
    expect(validateAccessSubject('TENANT', '../tenant')).toContain('Tenant');
    expect(validateAccessSubject('API_KEY', 'raw-api-key')).toContain('SHA-256');
  });
});

describe('buildAccessListPayload', () => {
  it('trims text and converts local expiration to ISO', () => {
    const payload = buildAccessListPayload(validForm, '2999-01-01T12:00');
    expect(payload.subjectValue).toBe('tenant-risk-1');
    expect(payload.reason).toBe('Incident INC-1');
    expect(payload.expiresAt).toContain('2999-01-01');
  });

  it('rejects past expiration', () => {
    expect(() => buildAccessListPayload(validForm, '2020-01-01T12:00')).toThrow('future');
  });
});
