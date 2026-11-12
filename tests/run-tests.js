/*
 * Operation Winterlight test suite. No dependencies, just Node 18+:
 *   node tests/run-tests.js
 *
 * Covers mission data integrity, the senior evaluator (determinism, rubric
 * calibration, length handling, safety), junior/senior scoring rules, badges,
 * the leaderboard and remote-evaluator response validation.
 */
'use strict';

const path = require('path');
const root = path.join(__dirname, '..');
['js/config.js', 'js/core/util.js', 'js/data/missions.js', 'js/data/achievements.js', 'js/engine/evaluator-local.js', 'js/engine/scoring.js', 'js/services/evaluator.js'].forEach((f) =>
  require(path.join(root, f))
);
const WL = globalThis.WL;

// Minimal in-memory storage so leaderboard and profile code can run in Node.
const mem = {};
WL.Storage = {
  available: false,
  prefix: 'winterlight:',
  get: (k, d) => (k in mem ? JSON.parse(mem[k]) : d),
  set: (k, v) => ((mem[k] = JSON.stringify(v)), true),
  remove: (k) => delete mem[k],
};
require(path.join(root, 'js/services/leaderboard.js'));
require(path.join(root, 'js/core/state.js'));

const ev = (id, prompt) => WL.LocalEvaluator.evaluatePrompt(WL.getMission(id), prompt);

let passed = 0;
let failed = 0;
const tests = [];
function test(name, fn) {
  tests.push({ name, fn });
}
function assert(cond, msg) {
  if (!cond) throw new Error(msg || 'assertion failed');
}
function eq(a, b, msg) {
  if (a !== b) throw new Error(`${msg || 'expected equal'}: got ${JSON.stringify(a)}, expected ${JSON.stringify(b)}`);
}

/* ------------------------------------------------------------- mission data */
test('there are six missions with ids 1–6 and exactly one final', () => {
  eq(WL.MISSIONS.length, 6);
  WL.MISSIONS.forEach((m, i) => eq(m.id, i + 1, 'mission id order'));
  eq(WL.MISSIONS.filter((m) => m.final).length, 1, 'final missions');
  assert(WL.MISSIONS[5].final, 'mission 6 is final');
});

test('every mission has the required content', () => {
  for (const m of WL.MISSIONS) {
    for (const key of ['title', 'skill', 'location', 'scene', 'problem', 'lesson', 'complete']) assert(m[key], `M${m.id} missing ${key}`);
    assert(m.intro.length >= 1, `M${m.id} intro`);
    assert(m.intel.length >= 3, `M${m.id} intel`);
    assert(m.presenter && m.presenter.point && m.presenter.question, `M${m.id} presenter notes`);
    for (const r of WL.RUBRIC) assert(m.senior.rubric[r.key], `M${m.id} rubric ${r.key}`);
    for (const band of ['excellent', 'partial', 'poor']) assert(m.senior.outcomes[band], `M${m.id} outcome ${band}`);
    assert(m.senior.hints.length >= 3, `M${m.id} hints`);
    assert(m.senior.wordBudget > 0, `M${m.id} budget`);
  }
});

test('junior stages each offer one excellent, one partial and one poor prompt', () => {
  for (const m of WL.MISSIONS) {
    const choiceStages = m.junior.stages.filter((s) => s.options);
    assert(choiceStages.length >= 1, `M${m.id} has a choice stage`);
    for (const s of choiceStages) {
      eq(s.options.length, 3, `M${m.id} options`);
      const qs = s.options.map((o) => o.quality).sort().join(',');
      eq(qs, 'excellent,partial,poor', `M${m.id} qualities`);
      for (const o of s.options) {
        assert(o.text && o.why && o.speech && o.output && o.mood && o.title, `M${m.id} option ${o.id} complete`);
        if (o.quality === 'excellent') eq(o.score, 100, 'excellent = 100');
        if (o.quality === 'partial') assert(o.score >= 40 && o.score <= 60, `partial 40–60, got ${o.score}`);
        if (o.quality === 'poor') assert(o.score >= 10 && o.score <= 20, `poor 10–20, got ${o.score}`);
      }
      // The best answer shouldn't always be in the same slot.
    }
  }
  const slots = WL.MISSIONS.map((m) => m.junior.stages[0].options.findIndex((o) => o.quality === 'excellent'));
  assert(new Set(slots).size >= 3, 'excellent option position varies between missions: ' + slots);
});

test('option ids are unique across the game', () => {
  const ids = WL.MISSIONS.flatMap((m) => m.junior.stages.flatMap((s) => (s.options || []).map((o) => o.id)));
  eq(new Set(ids).size, ids.length, 'unique option ids');
});

test('check steps each have exactly one wrong line', () => {
  const withCheck = WL.MISSIONS.filter((m) => m.check);
  assert(withCheck.length >= 3, 'at least three "check the AI" moments');
  for (const m of withCheck) eq(m.check.lines.filter((l) => l.wrong).length, 1, `M${m.id} wrong lines`);
});

test('the final mission needs several skills (has a check and a fix stage)', () => {
  const m = WL.getMission(6);
  const stages = m.junior.stages;
  assert(stages.some((s) => s.type === 'check'), 'final has check stage');
  eq(stages.filter((s) => s.options).length, 2, 'final has two choice stages');
  const fiveParts = new Set(stages[0].options.find((o) => o.quality === 'excellent').segments.map((s) => s[0]));
  eq(fiveParts.size, 5, 'final excellent junior prompt uses all five parts');
});

test('example senior prompts use all five rubric parts', () => {
  for (const m of WL.MISSIONS) {
    const parts = new Set(m.senior.modelPrompt.map((s) => s[0]));
    eq(parts.size, 5, `M${m.id} model prompt parts`);
  }
});

/* ---------------------------------------------------------- evaluator */
test('evaluation is deterministic', () => {
  for (const m of WL.MISSIONS) {
    const p = m.senior.modelText;
    const a = JSON.stringify(ev(m.id, p));
    const b = JSON.stringify(ev(m.id, p));
    eq(a, b, `M${m.id} deterministic`);
  }
});

test('every example prompt scores 100', () => {
  for (const m of WL.MISSIONS) eq(ev(m.id, m.senior.modelText).total, 100, `M${m.id} model prompt`);
});

test('excellent junior prompts score highly in the senior evaluator', () => {
  for (const m of WL.MISSIONS) {
    const best = m.junior.stages[0].options.find((o) => o.quality === 'excellent');
    const r = ev(m.id, best.text);
    assert(r.total >= 60, `M${m.id} junior excellent scored ${r.total}`);
  }
});

test('poor junior prompts score lower than excellent ones', () => {
  for (const m of WL.MISSIONS) {
    const opts = m.junior.stages[0].options;
    const best = ev(m.id, opts.find((o) => o.quality === 'excellent').text).total;
    const poor = ev(m.id, opts.find((o) => o.quality === 'poor').text).total;
    assert(poor < best, `M${m.id}: poor ${poor} should be < excellent ${best}`);
    assert(poor < 45, `M${m.id}: poor junior prompt should be in the poor band, got ${poor}`);
  }
});

test('scores stay in range and criteria are 0–20', () => {
  const samples = ['', 'hi', 'do it', 'a '.repeat(400), 'Turn the lights on now please', '!!!!!!!!', '😀 😀 😀 😀'];
  for (const m of WL.MISSIONS) {
    for (const s of samples) {
      const r = ev(m.id, s);
      assert(r.total >= 0 && r.total <= 100, `total in range: ${r.total}`);
      eq(r.criteria.length, 5, 'five criteria');
      r.criteria.forEach((c) => assert(c.score >= 0 && c.score <= 20, `criterion ${c.key} ${c.score}`));
    }
  }
});

test('very short prompts are flagged and score zero', () => {
  const r = ev(1, 'fix it');
  eq(r.total, 0);
  eq(r.flag, 'too-short');
});

test('a vague prompt scores poorly with helpful tips', () => {
  const r = ev(1, 'Please do something about the problem');
  assert(r.total < 45, 'vague prompt is poor: ' + r.total);
  assert(r.criteria.some((c) => c.tip), 'gives at least one tip');
  assert(r.topTip && r.topTip.text, 'has a top tip');
});

test('missing the objective caps that criterion', () => {
  const r = ev(1, 'The festival is at 6pm in Frostvale and it is dark. The Great Tree is in Market Square.');
  const obj = r.criteria.find((c) => c.key === 'objective');
  assert(obj.score <= 10, 'objective capped without an action: ' + obj.score);
});

test('length is not rewarded: padding a good prompt never raises the score', () => {
  for (const m of WL.MISSIONS) {
    const base = ev(m.id, m.senior.modelText).total;
    const padded = m.senior.modelText + ' ' + 'I really really like winter and stuff, it is so so cool and awesome!!! Anyway, my favourite colour is blue. '.repeat(3);
    const r = ev(m.id, padded);
    assert(r.total < base, `M${m.id} padded ${r.total} should be < ${base}`);
    assert(r.focus.penalty > 0, `M${m.id} focus penalty applied`);
  }
});

test('a concise prompt can beat a long rambling one', () => {
  const concise = "Turn Frostvale's lights back on one street at a time, starting with the Great Tree in Market Square, before the 6pm festival. Send me a checklist.";
  const rambling =
    'Hello NOVA, I hope you are having a really really nice day. So basically the thing is that it is very dark and there is going to be a festival and everyone is really excited about it and I love festivals so much because they are so cool and fun, and anyway the lights are not on, which is bad, so it would be really great if you could maybe possibly think about doing something about all of that stuff or whatever, if that is alright with you. Thanks so much NOVA, you are the best robot ever!!!';
  const a = ev(1, concise);
  const b = ev(1, rambling);
  assert(a.total >= 80, 'concise prompt is excellent: ' + a.total);
  assert(b.total < 45, 'rambling prompt is poor: ' + b.total);
  assert(a.words < b.words, 'concise is shorter');
});

test('unkind prompts are flagged and score zero', () => {
  const r = ev(1, 'Shut up NOVA and turn the lights back on before 6pm');
  eq(r.total, 0);
  eq(r.flag, 'unkind');
});

test('curly quotes and dashes are normalised', () => {
  const a = ev(5, "Nearly! Please fix these: there are 30 guests aged 8-16, not 3. It's indoors at the Festival Hall 4-6pm because of the blizzard, so nothing outdoors. Keep the music but make it festive songs. Give me 5 short numbered steps.");
  const b = ev(5, 'Nearly! Please fix these: there are 30 guests aged 8–16, not 3. It’s indoors at the Festival Hall 4–6pm because of the blizzard, so nothing outdoors. Keep the music but make it festive songs. Give me 5 short numbered steps.');
  eq(a.total, b.total, 'same score with typographic punctuation');
});

test('each criterion is independently detectable (mission 3)', () => {
  const r = ev(3, 'No more than 10cm of snow, keep it below 0°C and wind under 30km/h.');
  const c = Object.fromEntries(r.criteria.map((x) => [x.key, x.score]));
  eq(c.constraints, 20, 'constraints only prompt scores constraints');
  assert(c.format === 0, 'no format asked for');
});

test('compareAttempts reports improvement per criterion', () => {
  const a = ev(2, 'Plan the deliveries for 60 parcels.');
  const b = ev(2, WL.getMission(2).senior.modelText);
  const cmp = WL.LocalEvaluator.compareAttempts(a, b);
  assert(cmp.delta > 0, 'improved');
  assert(cmp.improved.length >= 3, 'several criteria improved');
});

/* ------------------------------------------------------------- scoring */
test('junior stage scoring with retry and learning bonus', () => {
  const opts = WL.getMission(1).junior.stages[0].options;
  const best = opts.find((o) => o.quality === 'excellent');
  const poor = opts.find((o) => o.quality === 'poor');
  const partial = opts.find((o) => o.quality === 'partial');
  eq(WL.Scoring.juniorStageScore(best).score, 100, 'first-time excellent');
  eq(WL.Scoring.juniorStageScore(poor).score, poor.score, 'poor with no retry');
  eq(WL.Scoring.juniorStageScore(poor, best).score, poor.score + 20, 'poor then best = +20');
  eq(WL.Scoring.juniorStageScore(partial, best).score, partial.score + 20, 'partial then best = +20');
  eq(WL.Scoring.juniorStageScore(poor, partial).score, poor.score + 10, 'poor then partial = +10');
  eq(WL.Scoring.juniorStageScore(partial, poor).score, partial.score, 'going worse earns no bonus');
  assert(WL.Scoring.juniorStageScore(partial, best).score < 100, 'getting it right first time is still best');
});

test('junior multi-stage missions average their stages', () => {
  eq(WL.Scoring.juniorMissionScore([{ score: 100 }, { score: 50 }]), 75);
  eq(WL.Scoring.juniorMissionScore([{ score: 100 }]), 100);
});

test('senior scoring: best attempt, bonus for big improvement, capped at 100', () => {
  const s = WL.Scoring;
  eq(s.seniorMissionScore({ total: 70 }, null).score, 70, 'single attempt');
  eq(s.seniorMissionScore({ total: 60 }, { total: 85 }).score, 90, '85 + 5 bonus');
  eq(s.seniorMissionScore({ total: 60 }, { total: 65 }).score, 65, 'small improvement, no bonus');
  eq(s.seniorMissionScore({ total: 80 }, { total: 50 }).score, 80, 'worse refinement keeps best');
  eq(s.seniorMissionScore({ total: 70 }, { total: 100 }).score, 100, 'cap at 100');
  eq(s.seniorMissionScore({ total: 97 }, { total: 100 }).score, 100, 'no bonus over cap');
});

test('stars thresholds', () => {
  eq(WL.Scoring.stars(100), 3);
  eq(WL.Scoring.stars(80), 3);
  eq(WL.Scoring.stars(79), 2);
  eq(WL.Scoring.stars(45), 2);
  eq(WL.Scoring.stars(44), 1);
  eq(WL.Scoring.stars(0), 0);
});

function freshPlayer(mode) {
  return { id: 'p', nickname: 'Test', mode: mode || 'junior', missions: {}, badges: [], streak: 0, bestStreak: 0 };
}

test('recordMission tracks totals, streaks and best streak', () => {
  const p = freshPlayer();
  WL.Scoring.recordMission(p, 1, { score: 100 });
  WL.Scoring.recordMission(p, 2, { score: 90 });
  eq(p.streak, 2);
  WL.Scoring.recordMission(p, 3, { score: 50 });
  eq(p.streak, 0, 'streak broken');
  eq(p.bestStreak, 2, 'best streak kept');
  eq(WL.Scoring.totalScore(p), 240);
});

test('replaying a mission keeps the best score', () => {
  const p = freshPlayer();
  WL.Scoring.recordMission(p, 1, { score: 100 });
  const s = WL.Scoring.recordMission(p, 1, { score: 40 });
  eq(p.missions[1].score, 100, 'kept best');
  assert(s.keptPrevious, 'summary reports kept score');
  eq(p.missions[1].plays, 2, 'plays counted');
  WL.Scoring.recordMission(p, 1, { score: 100, improved: true });
  assert(p.missions[1].improved, 'learning flags carry over');
});

test('badges are awarded once and in the right situations', () => {
  const p = freshPlayer();
  let r = WL.Scoring.recordMission(p, 1, { score: 35, improved: true });
  assert(r.newBadges.includes('first-light'), 'first light');
  assert(r.newBadges.includes('comeback'), 'comeback');
  r = WL.Scoring.recordMission(p, 2, { score: 100, checkFirstTry: true });
  assert(r.newBadges.includes('perfect') && r.newBadges.includes('sharp-eyes'), 'perfect + sharp eyes');
  assert(!r.newBadges.includes('first-light'), 'no duplicate');
  WL.Scoring.recordMission(p, 3, { score: 100 });
  r = WL.Scoring.recordMission(p, 4, { score: 100, checkFirstTry: true });
  assert(r.newBadges.includes('streak-3'), 'streak 3');
  WL.Scoring.recordMission(p, 5, { score: 100 });
  r = WL.Scoring.recordMission(p, 6, { score: 100, checkFirstTry: true });
  assert(r.newBadges.includes('hero'), 'hero');
  assert(r.newBadges.includes('fact-checker'), 'fact checker');
  assert(!p.badges.includes('streak-6'), 'no streak-6 because mission 1 was low');
  assert(p.finished, 'finished');
  eq(new Set(p.badges).size, p.badges.length, 'no duplicate badges');
});

test('maximum possible total is 600 and Prompt Legend needs 540', () => {
  const p = freshPlayer('senior');
  for (let i = 1; i <= 6; i++) WL.Scoring.recordMission(p, i, { score: 100 });
  eq(WL.Scoring.totalScore(p), 600);
  assert(p.badges.includes('legend') && p.badges.includes('streak-6'), 'legend + unstoppable');
  eq(WL.rankFor(600), 'Winterlight Legend');
  eq(WL.rankFor(0), 'Agent in Training');
});

test('Short & Sweet logic', () => {
  const m = WL.getMission(1);
  const stage = m.junior.stages[0];
  const best = stage.options.find((o) => o.quality === 'excellent');
  assert(WL.Scoring.juniorShortSweet(stage, best), 'mission 1 best is not the longest option');
  const concise = ev(1, "Turn Frostvale's lights back on one street at a time, starting with the Great Tree in Market Square, before the 6pm festival. Send me a checklist.");
  assert(WL.Scoring.seniorShortSweet(m, concise), 'concise senior prompt earns short & sweet');
  assert(!WL.Scoring.seniorShortSweet(m, ev(1, 'Turn on the lights')), 'low score does not');
});

/* --------------------------------------------------------- leaderboard */
test('leaderboard ranks entries, handles ties and separates modes', async () => {
  await WL.Leaderboard.reset();
  await WL.Leaderboard.updateSettings({ showDemo: false });
  await WL.Leaderboard.submit({ id: 'a', nickname: 'Alpha', mode: 'junior', score: 300, missions: 5, badges: [] });
  await WL.Leaderboard.submit({ id: 'b', nickname: 'Bravo', mode: 'junior', score: 500, missions: 6, badges: [] });
  await WL.Leaderboard.submit({ id: 'c', nickname: 'Charlie', mode: 'junior', score: 300, missions: 5, badges: [] });
  await WL.Leaderboard.submit({ id: 'd', nickname: 'Delta', mode: 'senior', score: 600, missions: 6, badges: [] });
  const j = await WL.Leaderboard.list('junior');
  eq(j.length, 3, 'only junior');
  eq(j[0].nickname, 'Bravo');
  eq(j[0].position, 1);
  eq(j[1].position, 2, 'tie shares position');
  eq(j[2].position, 2, 'tie shares position');
  eq((await WL.Leaderboard.list('senior')).length, 1);
});

test('leaderboard updates an existing entry rather than duplicating', async () => {
  await WL.Leaderboard.submit({ id: 'a', nickname: 'Alpha', mode: 'junior', score: 420, missions: 6, badges: [] });
  const j = await WL.Leaderboard.list('junior');
  eq(j.filter((e) => e.id === 'a').length, 1);
  eq(j.find((e) => e.id === 'a').score, 420);
});

test('leaderboard stores only nickname-level data', async () => {
  await WL.Leaderboard.submit({ id: 'z', nickname: 'Zed', mode: 'senior', score: 10, missions: 1, badges: [], email: 'kid@example.com', realName: 'Real Name' });
  const all = await WL.Leaderboard.exportAll();
  const z = all.find((e) => e.id === 'z');
  assert(!('email' in z) && !('realName' in z), 'extra personal fields are dropped');
});

test('demo data toggles and reset clears real entries', async () => {
  await WL.Leaderboard.updateSettings({ showDemo: true });
  const withDemo = await WL.Leaderboard.list('junior');
  assert(withDemo.some((e) => e.demo), 'demo agents shown');
  await WL.Leaderboard.reset();
  const after = await WL.Leaderboard.list('junior');
  assert(after.every((e) => e.demo), 'only demo agents remain after reset');
  await WL.Leaderboard.updateSettings({ showDemo: false });
  eq((await WL.Leaderboard.list('junior')).length, 0, 'empty with demo off');
});

/* --------------------------------------------------- nicknames & privacy */
test('nickname sanitising and validation', () => {
  const P = WL.Profiles;
  eq(P.sanitizeNickname('  <b>Frosty</b>!! '), 'bFrostyb');
  eq(P.sanitizeNickname('A'.repeat(40)).length, P.NICK_MAX);
  assert(P.validateNickname('X'), 'too short rejected');
  assert(P.validateNickname('Sarah Jones'), 'real-looking full names rejected');
  assert(P.validateNickname('poopyhead'), 'rude word rejected');
  eq(P.validateNickname('FrostyFox42'), null, 'good nickname accepted');
});

/* ------------------------------------------------- remote evaluator shape */
test('remote evaluator responses are validated and capped', () => {
  const m = WL.getMission(1);
  const r = WL.Evaluator._validate(
    {
      engine: 'claude-rubric',
      criteria: [
        { key: 'objective', score: 99, tip: 'x'.repeat(1000) },
        { key: 'context', score: -5 },
        { key: 'instructions', score: '15' },
        { key: 'bogus', score: 20 },
      ],
      focus: { penalty: 50 },
      summary: 'ok',
    },
    m
  );
  eq(r.criteria.length, 5, 'always five criteria');
  eq(r.criteria[0].score, 20, 'capped at 20');
  eq(r.criteria[1].score, 0, 'floored at 0');
  eq(r.criteria[2].score, 15, 'numeric strings accepted');
  eq(r.criteria[4].score, 0, 'missing criteria are zero');
  eq(r.focus.penalty, 10, 'penalty capped');
  assert(r.criteria[0].tip.length <= 240, 'long text truncated');
  assert(r.total >= 0 && r.total <= 100, 'total in range');
});

/* ------------------------------------------------------------------ run */
(async () => {
  for (const t of tests) {
    try {
      await t.fn();
      passed += 1;
      console.log('  ✔ ' + t.name);
    } catch (e) {
      failed += 1;
      console.log('  ✘ ' + t.name + '\n      ' + e.message);
    }
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})();
