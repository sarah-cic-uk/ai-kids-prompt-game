/*
 * Prompt evaluation service: the only thing the UI calls for senior mode.
 *
 * Today it uses the local rubric engine. To add real AI evaluation later:
 *   1. Deploy a small server endpoint (see docs/ARCHITECTURE.md) that holds
 *      the API key, runs the AI with a strict rubric prompt and returns the
 *      SAME EvaluationResult shape as the local engine.
 *   2. Set WL.CONFIG.evaluator = { provider: 'remote', endpoint: 'https://…' }.
 * The browser never sees an API key, and any remote failure falls back to the
 * local engine so a workshop never stalls.
 */
(function (root) {
  'use strict';
  const WL = (root.WL = root.WL || {});

  const localProvider = {
    name: 'local',
    async evaluate(mission, prompt) {
      return WL.LocalEvaluator.evaluatePrompt(mission, prompt);
    },
  };

  function remoteProvider(endpoint, timeoutMs) {
    return {
      name: 'remote',
      async evaluate(mission, prompt, ctx) {
        const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
        const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            signal: controller ? controller.signal : undefined,
            // Only the mission id, attempt number and prompt text are sent. No player identity.
            body: JSON.stringify({ missionId: mission.id, attempt: (ctx && ctx.attempt) || 1, prompt }),
          });
          if (!res.ok) throw new Error('Evaluator HTTP ' + res.status);
          const data = await res.json();
          return validate(data, mission);
        } finally {
          if (timer) clearTimeout(timer);
        }
      },
    };
  }

  /** Never trust a remote response: rebuild it as a well-formed, capped result. */
  function validate(data, mission) {
    const byKey = {};
    (data.criteria || []).forEach((c) => (byKey[c.key] = c));
    const criteria = WL.RUBRIC.map((r) => {
      const c = byKey[r.key] || {};
      const score = Math.max(0, Math.min(20, Math.round(Number(c.score) || 0)));
      return {
        key: r.key,
        label: r.label,
        score,
        max: 20,
        status: score >= 20 ? 'strong' : score > 0 ? 'some' : 'missing',
        matched: [],
        praise: typeof c.praise === 'string' ? c.praise.slice(0, 240) : null,
        tip: typeof c.tip === 'string' ? c.tip.slice(0, 240) : null,
        principle: r.principle,
      };
    });
    const rawScore = criteria.reduce((s, c) => s + c.score, 0);
    const penalty = Math.max(0, Math.min(10, Math.round(Number(data.focus && data.focus.penalty) || 0)));
    const total = Math.max(0, Math.min(100, rawScore - penalty));
    const words = WL.LocalEvaluator.countWords(data.prompt || '');
    return {
      provider: 'remote',
      engine: String(data.engine || 'remote').slice(0, 40),
      missionId: mission.id,
      words,
      criteria,
      rawScore,
      focus: { penalty, note: data.focus && typeof data.focus.note === 'string' ? data.focus.note.slice(0, 240) : null, words, budget: mission.senior.wordBudget, withinBudget: words <= mission.senior.wordBudget },
      total,
      band: WL.LocalEvaluator.bandFor(total),
      flag: data.flag || null,
      summary: typeof data.summary === 'string' ? data.summary.slice(0, 240) : '',
      topTip: data.topTip && typeof data.topTip.text === 'string' ? { key: data.topTip.key || 'objective', text: data.topTip.text.slice(0, 240), principle: '' } : null,
    };
  }

  function current() {
    const cfg = WL.CONFIG.evaluator;
    if (cfg.provider === 'remote' && cfg.endpoint) return remoteProvider(cfg.endpoint, cfg.timeoutMs || 8000);
    return localProvider;
  }

  WL.Evaluator = {
    async evaluate(mission, prompt, ctx) {
      const provider = current();
      try {
        return await provider.evaluate(mission, prompt, ctx);
      } catch (err) {
        if (provider.name !== 'local') {
          console.warn('[Winterlight] Remote evaluator failed, using local engine.', err);
          return localProvider.evaluate(mission, prompt, ctx);
        }
        throw err;
      }
    },
    compare: (a, b) => WL.LocalEvaluator.compareAttempts(a, b),
    _validate: validate,
  };
})(typeof window !== 'undefined' ? window : globalThis);
