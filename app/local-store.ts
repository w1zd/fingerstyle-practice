// Device-local persistence for GitHub Pages. Validate before touching storage.
import { z } from 'zod';
import curriculum from './curriculum.json' with { type: 'json' };

const KEY = 'fingerstyle-practice:v1';
const today = () => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Pacific/Auckland', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const v = (key: string) => parts.find(p => p.type === key)?.value;
  return `${v('year')}-${v('month')}-${v('day')}`;
};
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v => {
  const d = new Date(v + 'T12:00:00Z');
  return v >= '2020-01-01' && v <= today() && !isNaN(d.valueOf()) && d.toISOString().slice(0, 10) === v;
}, 'Use a real date from 2020 through today.');
const pieceIds = new Set([...curriculum.practicePieces.map(p => p.id), ...curriculum.goalPieces.flatMap(p => p.stages.map(s => s.id))]);
const pieces = z.array(z.string().refine(v => pieceIds.has(v), 'Unknown piece or stage.')).max(pieceIds.size).transform(v => [...new Set(v)]);
const updatedAt = z.string().datetime().optional();
const profileSchema = z.object({
  planDay: z.number().int().min(1).max(336),
  goalMinutes: z.union([z.literal(15), z.literal(45), z.literal(50), z.literal(60)]),
  startedOn: date, pieces: pieces.optional(),
});
const sessionSchema = z.object({
  date, planDay: z.number().int().min(1).max(336), minutes: z.number().int().min(0).max(300),
  tempo: z.number().int().min(20).max(240).nullable(), confidence: z.number().int().min(1).max(5),
  notes: z.string().max(3000), piece: z.string().max(120), nextFocus: z.string().max(500), rest: z.boolean(),
  completedTasks: z.array(z.enum(['tune', 'coordination', 'picking', 'break', 'solo', 'ear', 'review'])).max(7).transform(v => [...new Set(v)]),
  updatedAt,
}).transform(s => ({ ...s, minutes: s.rest ? 0 : s.minutes }));
const testSchema = z.object({
  date, month: z.number().int().min(1).max(12), passed: z.boolean(), notes: z.string().max(1500),
  recordingUrl: z.string().max(1000).refine(v => {
    if (!v) return true;
    try { return ['http:', 'https:'].includes(new URL(v).protocol); } catch { return false; }
  }, 'Use a complete http or https recording link.'),
  scores: z.object({ timing: z.number().int().min(0).max(2), clarity: z.number().int().min(0).max(2), continuity: z.number().int().min(0).max(2), balance: z.number().int().min(-1).max(2), relaxation: z.number().int().min(0).max(2) }),
  updatedAt,
});
const savedSchema = z.object({
  version: z.literal(1).optional(), profile: profileSchema,
  sessions: z.array(sessionSchema).max(5000), tests: z.array(testSchema).max(5000),
}).superRefine((s, ctx) => {
  if (new Set(s.sessions.map(x => x.date)).size !== s.sessions.length) ctx.addIssue({ code: 'custom', path: ['sessions'], message: 'A backup must have one check-in per date.' });
  if (new Set(s.tests.map(x => `${x.month}/${x.date}`)).size !== s.tests.length) ctx.addIssue({ code: 'custom', path: ['tests'], message: 'A backup must have one demonstration per month and date.' });
});
type Saved = Omit<z.infer<typeof savedSchema>, 'version'>;
const empty = (): Saved => ({ profile: { planDay: 1, goalMinutes: 50, startedOn: today() }, sessions: [], tests: [] });

function normalise(value: unknown): Saved {
  const result = savedSchema.safeParse(value);
  if (!result.success) {
    const issue = result.error.issues[0];
    throw new Error(`This backup has invalid progress at ${issue.path.join('.') || 'the root'}. ${issue.message} Nothing was replaced.`);
  }
  const { profile, sessions, tests } = result.data;
  return { profile, sessions, tests };
}
function read(): Saved {
  let raw: string | null;
  try { raw = localStorage.getItem(KEY); } catch { throw new Error('This browser is blocking storage, so progress cannot be saved here. Allow site data, then retry.'); }
  if (!raw) return empty();
  try { return normalise(JSON.parse(raw)); } catch { throw new Error('Saved progress in this browser is unreadable. Import a valid backup to restore it.'); }
}
function write(data: Saved) {
  try { localStorage.setItem(KEY, JSON.stringify(data)); } catch { throw new Error('This could not save in the browser (storage is full or blocked). Your input is still here; export a backup.'); }
}

export async function localApi<T>(body?: unknown): Promise<T> {
  const data = read();
  if (body === undefined) return { ...data, sessions: [...data.sessions].sort((a, b) => b.date.localeCompare(a.date)) } as T;
  const b = z.object({ kind: z.string() }).passthrough().parse(body);
  if (b.kind === 'profile') {
    const profile = profileSchema.parse({ ...data.profile, planDay: b.planDay, goalMinutes: b.goalMinutes });
    write({ ...data, profile }); return { profile } as T;
  }
  if (b.kind === 'pieces') {
    const profile = { ...data.profile, pieces: pieces.parse(b.done) };
    write({ ...data, profile }); return { profile } as T;
  }
  if (b.kind === 'session') {
    const session = { ...sessionSchema.parse(b.session), updatedAt: new Date().toISOString() };
    write({ ...data, sessions: [session, ...data.sessions.filter(x => x.date !== session.date)] });
    return { session } as T;
  }
  if (b.kind === 'test') {
    const test = { ...testSchema.parse(b.test), updatedAt: new Date().toISOString() };
    write({ ...data, tests: [test, ...data.tests.filter(x => !(x.month === test.month && x.date === test.date))] });
    return { test } as T;
  }
  throw new Error('Unknown practice action.');
}
export function parseBackup(text: string): Saved {
  if (text.length > 10 * 1024 * 1024) throw new Error('This backup is too large (maximum 10 MB). Nothing was replaced.');
  let parsed: unknown;
  try { parsed = JSON.parse(text); } catch { throw new Error('That file is not valid JSON. Nothing was replaced.'); }
  return normalise(parsed);
}
export function importBackup(text: string) { write(parseBackup(text)); }
