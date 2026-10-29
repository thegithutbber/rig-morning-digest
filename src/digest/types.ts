import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export type DigestRow = {
  job: string;
  owner: string | null;
  runs: number;
  retries: number;
  lastStatus: 'ok' | 'retry' | 'fail';
  lastError: string | null;
  firstTime: string;
  lastTime: string;
};

export type Digest = {
  rows: DigestRow[];
  badLines: number;
  counts: Record<DigestRow['lastStatus'], number>;
};

// null means the requested night does not exist.
export function readNight(runsDir: string, night: string): Digest | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) return null;
  let content: string;
  try {
    content = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
  const jobs = new Map<string, DigestRow>();
  let badLines = 0;
  const counts = { ok: 0, retry: 0, fail: 0 };
  for (const line of content.split(/\r?\n/)) {
    if (!line.trim()) continue;
    try {
      const entry: unknown = JSON.parse(line);
      if (!entry || typeof entry !== 'object') throw new Error('invalid entry');
      const e = entry as Record<string, unknown>;
      if (typeof e.at !== 'string' || Number.isNaN(Date.parse(e.at)) || typeof e.job !== 'string' ||
          !['ok', 'retry', 'fail'].includes(String(e.status)) ||
          !(typeof e.owner === 'string' || e.owner === null) ||
          !(typeof e.error === 'string' || e.error === undefined)) throw new Error('invalid entry');
      const status = e.status as DigestRow['lastStatus'];
      counts[status]++;
      const row = jobs.get(e.job);
      if (!row) {
        jobs.set(e.job, { job: e.job, owner: e.owner as string | null, runs: 1,
          retries: Number(status === 'retry'), lastStatus: status,
          lastError: typeof e.error === 'string' ? e.error : null, firstTime: e.at, lastTime: e.at });
      } else {
        row.runs++;
        if (status === 'retry') row.retries++;
        if (Date.parse(e.at) < Date.parse(row.firstTime)) row.firstTime = e.at;
        if (Date.parse(e.at) >= Date.parse(row.lastTime)) {
          row.lastTime = e.at;
          row.lastStatus = status;
          row.owner = e.owner as string | null;
        }
        if (typeof e.error === 'string') row.lastError = e.error;
      }
    } catch {
      badLines++;
    }
  }
  return { rows: [...jobs.values()].sort((a, b) => a.job.localeCompare(b.job)), badLines, counts };
}
