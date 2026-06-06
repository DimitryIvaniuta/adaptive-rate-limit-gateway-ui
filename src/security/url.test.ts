import { describe, expect, it } from 'vitest';
import { assertAllowedProbePath, normalizeApiBaseUrl } from './url';

describe('normalizeApiBaseUrl', () => {
  it('supports same-origin mode', () => {
    expect(normalizeApiBaseUrl('  ')).toBe('');
  });

  it('normalizes http and https URLs', () => {
    expect(normalizeApiBaseUrl('http://localhost:8080/')).toBe('http://localhost:8080');
  });

  it('rejects unsafe schemes and credentials', () => {
    expect(() => normalizeApiBaseUrl('javascript:alert(1)')).toThrow('http or https');
    expect(() => normalizeApiBaseUrl('https://admin:secret@example.com')).toThrow('credentials');
  });

  it('rejects control characters and unbounded input', () => {
    expect(() => normalizeApiBaseUrl('https://example.com/a\nb')).toThrow();
    expect(() => normalizeApiBaseUrl(`https://example.com/${'a'.repeat(600)}`)).toThrow('too long');
  });
});

describe('assertAllowedProbePath', () => {
  it('allows gateway routes only', () => {
    expect(() => assertAllowedProbePath('/api/accounts')).not.toThrow();
    expect(() => assertAllowedProbePath('/auth/login')).not.toThrow();
  });

  it('rejects admin, traversal, encoded traversal, and absolute paths', () => {
    expect(() => assertAllowedProbePath('/admin/policy')).toThrow('/api/ or /auth/');
    expect(() => assertAllowedProbePath('/api/../admin')).toThrow('traversal');
    expect(() => assertAllowedProbePath('/api/%2e%2e/admin')).toThrow('traversal');
    expect(() => assertAllowedProbePath('https://example.com/api/demo')).toThrow('/api/ or /auth/');
  });
});
