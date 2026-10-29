import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/types.js';

describe('run log reader', () => {
  it('aggregates the sample night and counts the malformed line', () => {
    const digest = readNight('runs', '2026-10-28');
    expect(digest?.badLines).toBe(1);
    expect(digest?.rows).toHaveLength(5);
    expect(digest?.rows.find(row => row.job === 'fixtures/refresh')).toMatchObject({ runs: 4, retries: 3, lastStatus: 'ok', lastError: 'upstream 503' });
    expect(digest?.rows.find(row => row.job === 'digest/render')?.owner).toBeNull();
  });
  it('returns null for a missing or unsafe night', () => {
    expect(readNight('runs', '2000-01-01')).toBeNull();
    expect(readNight('runs', '../rig')).toBeNull();
  });
});
