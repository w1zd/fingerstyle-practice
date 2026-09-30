import assert from 'node:assert/strict';
import { localApi, importBackup, parseBackup } from '../app/local-store.ts';

// Use memory only: these checks never touch a learner's browser progress.
const memory = new Map();
globalThis.localStorage = { getItem: k => memory.get(k) ?? null, setItem: (k, v) => memory.set(k, v) };
const session = { date: '2020-01-02', planDay: 1, minutes: 50, tempo: 50, confidence: 3, notes: 'Clean C–Am', piece: 'Happy Birthday', nextFocus: 'Slow chord landing', rest: false, completedTasks: ['tune', 'picking'] };
await localApi({ kind: 'session', session });
await localApi({ kind: 'pieces', done: ['sb-1'] });
const scores = { timing: 2, clarity: 2, continuity: 2, balance: -1, relaxation: 2 };
for (const date of ['2020-01-01', '2020-01-02']) await localApi({ kind: 'test', test: { date, month: 1, passed: true, notes: 'Controlled take', recordingUrl: '', scores } });
const saved = await localApi();
const backup = JSON.stringify({ version: 1, ...saved });
const original = memory.get('fingerstyle-practice:v1');
const broken = [
  v => { v.sessions[0].date = '2020-02-30'; },
  v => { v.sessions[0].planDay = 337; },
  v => { v.sessions[0].minutes = -1; },
  v => { v.sessions[0].completedTasks = ['fake']; },
  v => { v.tests[0].recordingUrl = 'javascript:alert(1)'; },
  v => { v.tests[0].scores.timing = 8; },
  v => { v.profile.pieces = ['unknown']; },
  v => { v.sessions.push(v.sessions[0]); },
  v => { v.version = 2; },
];
for (const mutate of broken) {
  const value = JSON.parse(backup); mutate(value);
  assert.throws(() => importBackup(JSON.stringify(value)));
  assert.equal(memory.get('fingerstyle-practice:v1'), original, 'Rejected imports must preserve the existing data');
}
assert.throws(() => importBackup('{bad'));
assert.equal(memory.get('fingerstyle-practice:v1'), original);
assert.deepEqual(parseBackup(backup), saved);
importBackup(backup);
assert.deepEqual(await localApi(), saved);
await localApi({ kind: 'session', session: { ...session, minutes: 45, completedTasks: ['tune', 'tune'] } });
let next = await localApi();
assert.equal(next.sessions.length, 1);
assert.equal(next.sessions[0].minutes, 45);
assert.deepEqual(next.sessions[0].completedTasks, ['tune']);
await localApi({ kind: 'session', session: { ...session, rest: true, minutes: 50 } });
next = await localApi();
assert.equal(next.sessions[0].minutes, 0);
assert.equal(next.tests.length, 2, 'Different demonstration dates must survive');
for (const body of [{ kind: 'profile', planDay: 0, goalMinutes: 50 }, { kind: 'pieces', done: ['unknown'] }, { kind: 'session', session: { ...session, confidence: 9 } }]) await assert.rejects(() => localApi(body));
console.log('Storage checks passed: round-trip, damaged backups preserve data, same-date update, distinct milestone dates, rest normalization and invalid writes.');
