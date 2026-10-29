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
};

// null means the requested night does not exist.
export declare function readNight(runsDir: string, night: string): Digest | null;
