// Browser-only storage for the static (GitHub Pages) build. Mirrors the
// request/response shapes of app/api/progress/route.ts so the dashboard can
// swap one for the other.
type Row = Record<string, unknown>;
type Saved = { profile: Row & { planDay: number; goalMinutes: number; startedOn: string }; sessions: Row[]; tests: Row[] };

const KEY = 'fingerstyle-practice:v1';

const today = () => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const v = (key: string) => parts.find(p => p.type === key)?.value;
  return `${v('year')}-${v('month')}-${v('day')}`;
};

const empty = (): Saved => ({ profile: { planDay: 1, goalMinutes: 50, startedOn: today() }, sessions: [], tests: [] });

function read(): Saved {
  let raw: string | null;
  try { raw = localStorage.getItem(KEY); } catch { throw new Error('This browser is blocking storage, so progress cannot be saved here. Allow site data or use Export regularly.'); }
  if (!raw) return empty();
  try { return normalise(JSON.parse(raw)); } catch { throw new Error('Saved progress in this browser is unreadable. Import a backup to restore it.'); }
}

function write(data: Saved) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { throw new Error('This could not save in the browser (storage is full or blocked). Your input is still here; export a backup.'); }
}

function normalise(value: unknown): Saved {
  const v = value as Partial<Saved> | null;
  if (!v || typeof v !== 'object' || !v.profile || typeof v.profile !== 'object' || !Array.isArray(v.sessions) || !Array.isArray(v.tests)) throw new Error('That file is not a Fingerstyle Practice backup.');
  const p = v.profile;
  if (!Number.isInteger(p.planDay) || p.planDay < 1 || p.planDay > 336 || ![15, 45, 50, 60].includes(p.goalMinutes)) throw new Error('The backup has an invalid plan day or session length.');
  return { profile: { ...p, startedOn: typeof p.startedOn === 'string' ? p.startedOn : today() }, sessions: v.sessions.filter(s => s && typeof s === 'object' && typeof s.date === 'string'), tests: v.tests.filter(t => t && typeof t === 'object' && typeof t.date === 'string') };
}

export async function localApi<T>(body?: unknown): Promise<T> {
  const data = read();
  if (body === undefined) return { ...data, sessions: [...data.sessions].sort((a, b) => String(b.date).localeCompare(String(a.date))) } as T;
  const b = body as Row;
  if (b.kind === 'profile') {
    data.profile = { ...data.profile, planDay: b.planDay as number, goalMinutes: b.goalMinutes as number };
    write(data);
    return { profile: data.profile } as T;
  }
  if (b.kind === 'pieces') {
    data.profile = { ...data.profile, pieces: [...new Set(b.done as string[])] };
    write(data);
    return { profile: data.profile } as T;
  }
  if (b.kind === 'session') {
    const s = b.session as Row;
    const session: Row = { ...s, minutes: s.rest ? 0 : s.minutes, completedTasks: [...new Set(s.completedTasks as string[])], updatedAt: new Date().toISOString() };
    data.sessions = [session, ...data.sessions.filter(x => x.date !== session.date)];
    write(data);
    return { session } as T;
  }
  if (b.kind === 'test') {
    const t = b.test as Row;
    const test: Row = { ...t, updatedAt: new Date().toISOString() };
    data.tests = [test, ...data.tests.filter(x => !(x.month === test.month && x.date === test.date))];
    write(data);
    return { test } as T;
  }
  throw new Error('Unknown practice action.');
}

export function importBackup(text: string) {
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error('That file is not valid JSON.'); }
  write(normalise(parsed));
}
