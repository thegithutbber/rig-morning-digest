import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
function fixture() {
  const runsDir = mkdtempSync(join(tmpdir(), 'rig-digest-'));
  dirs.push(runsDir);
  const config = { adapter: 'shim', installed: 'today', beatEverySeconds: 60, runsDir };
  return { runsDir, app: createApp(config) };
}

describe('digest routes', () => {
  it('returns 404 for both routes when a night is missing', async () => {
    const { app } = fixture();
    for (const path of ['/digest/2000-01-01', '/api/digest/2000-01-01']) expect((await app.request(path)).status).toBe(404);
  });
  it('renders an empty night and returns empty rows', async () => {
    const { app, runsDir } = fixture();
    writeFileSync(join(runsDir, '2000-01-01.jsonl'), '');
    const page = await app.request('/digest/2000-01-01');
    const api = await app.request('/api/digest/2000-01-01');
    expect(page.status).toBe(200);
    expect(await page.text()).toContain('nothing ran');
    expect(api.status).toBe(200);
    expect((await api.json()).rows).toEqual([]);
  });
  it('keeps valid jobs in the same order on the page and API when a line is malformed', async () => {
    const { app, runsDir } = fixture();
    const record = (job: string, owner: string | null) => JSON.stringify({ at: '2000-01-01T10:00:00+01:00', job, status: 'ok', owner });
    writeFileSync(join(runsDir, '2000-01-01.jsonl'), [record('z-job', null), 'bad json', record('a-job', 'Ada')].join('\n'));
    const page = await app.request('/digest/2000-01-01');
    const api = await app.request('/api/digest/2000-01-01');
    const html = await page.text();
    const body = await api.json();
    expect(page.status).toBe(200);
    expect(api.status).toBe(200);
    expect(body.badLines).toBe(1);
    expect(body.rows.map((row: {job: string}) => row.job)).toEqual(['a-job', 'z-job']);
    expect(html.indexOf('a-job')).toBeLessThan(html.indexOf('z-job'));
    expect(html).toContain('malformed line');
    expect(html).toContain('—');
  });
});
