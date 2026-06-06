import { describe, expect, it } from 'vitest';
import { buildAccessListCsv } from './csv';
import type { AccessListEntry } from '@/types/api';

describe('buildAccessListCsv', () => {
  it('escapes spreadsheet formulas', () => {
    const entry: AccessListEntry = {
      id: '1',
      mode: 'BLOCK',
      subjectType: 'TENANT',
      subjectValue: '=cmd|calc',
      reason: '+formula',
      expiresAt: null,
      active: true,
      createdAt: '2026-05-30T10:00:00Z',
      updatedAt: '2026-05-30T10:00:00Z'
    };

    const csv = buildAccessListCsv([entry]);
    expect(csv).toContain('"\'=cmd|calc"');
    expect(csv).toContain('"\'+formula"');
  });
});
