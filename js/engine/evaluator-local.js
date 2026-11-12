/*
 * Local prompt evaluation engine (senior mode).
 *
 * Deterministic: the same prompt always gets the same score. Each mission
 * defines rubric "concepts" (js/data/missions.js); this engine checks which
 * concepts a prompt covers and turns that into five 20-point scores plus
 * feedback that explains the principle behind each part.
 *
 * Length never earns points on its own. A focus check deducts a little for
 * waffle or prompts far over the mission's word budget.
 *
 * Runs in the browser and in Node (tests, or a future server that layers a
 * real AI model on top of this rubric).
 */
(function (root) {
  'use strict';
  const WL = (root.WL = root.WL || {});

  const ENGINE_VERSION = 'local-rubric-1';
  const BANDS = { excellent: 80, partial: 45 };

  const FILLER = [
    /\b(really|very|super|so)\s+\1\b/,
    /\b(um+|uh+|erm+|hmm+)\b/,
    /\band stuff\b|\bor something\b|\bor whatever\b|\bwhatever\b/,
    /\banyway\b/,
    /!{3,}/,
    /\b(lol|lmao|haha+)\b/,
    /\b(i|we) (really )?(like|love)\b/,
    /\bfavou?rite\b/,
    /\b(cool|awesome|epic)\b/,
    /\bblah\b/,
    /\b(\w{3,})\s+\1\s+\1\b/,
  ];

  // Small, deliberately limited list. The game is for children, so unkind prompts get a gentle nudge.
  const UNKIND = /\b(fuck\w*|shit\w*|bitch\w*|cunt\w*|bastard\w*|wank\w*|twat\w*|dickhead|piss off|arsehole|asshole|kill yourself|i hate you|shut up)\b/;

  function normalise(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/[‘’ʼ`]/g, "'")
      .replace(/[“”]/g, '"')
      .replace(/[–—]/g, '-')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function countWords(text) {
    const t = String(text || '').trim();
    return t ? t.split(/\s+/).filter((w) => /[a-z0-9]/i.test(w)).length : 0;
  }

  function conceptMatched(concept, text) {
    const hits = concept.patterns.reduce((n, p) => n + (p.test(text) ? 1 : 0), 0);
    return hits >= (concept.min || 1);
  }

  function joinList(items) {
    if (items.length <= 1) return items.join('');
    return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
  }

  function scoreCriterion(rubricItem, spec, text) {
    const matched = spec.concepts.filter((c) => conceptMatched(c, text));
    const matchedIds = matched.map((c) => c.id);
    const missing = spec.concepts.filter((c) => !matchedIds.includes(c.id));
    const need = spec.need || spec.concepts.length;
    let score = Math.round((20 * Math.min(matched.length, need)) / need);

    const missingRequired = (spec.required || []).filter((id) => !matchedIds.includes(id));
    if (missingRequired.length) score = Math.min(score, 10);

    // Required concepts are the most useful thing to suggest first.
    const nextConcept =
      spec.concepts.find((c) => missingRequired.includes(c.id)) || missing[0] || null;

    const status = score >= 20 ? 'strong' : score > 0 ? 'some' : 'missing';
    const praise = matched.length
      ? 'You included ' + joinList(matched.slice(0, 3).map((c) => c.label)) + '.'
      : null;
    const tip = score < 20 && nextConcept ? nextConcept.tip : null;

    return {
      key: rubricItem.key,
      label: rubricItem.label,
      score,
      max: 20,
      status,
      matched: matched.map((c) => c.label),
      praise,
      tip,
      principle: rubricItem.principle,
    };
  }

  function analyseFocus(text, words, budget) {
    const fillerHits = FILLER.filter((p) => p.test(text)).length;
    let penalty = 0;
    const notes = [];
    if (words > budget * 2) {
      penalty += 10;
      notes.push(`Your prompt is ${words} words. That's a lot for NOVA to wade through! Aim for around ${budget}.`);
    } else if (words > budget * 1.5) {
      penalty += 5;
      notes.push(`Your prompt is ${words} words. Try trimming it towards ${budget}. Every word should help NOVA.`);
    }
    if (fillerHits >= 2) {
      penalty += 5;
      notes.push('Some words were chatty filler that doesn\'t help NOVA. Cut them and your prompt gets sharper.');
    }
    penalty = Math.min(penalty, 10);
    return {
      words,
      budget,
      penalty,
      fillerHits,
      withinBudget: words <= budget,
      note: notes.join(' ') || null,
    };
  }

  function bandFor(total) {
    if (total >= BANDS.excellent) return 'excellent';
    if (total >= BANDS.partial) return 'partial';
    return 'poor';
  }

  function summaryFor(band, criteria, focus) {
    const strongest = criteria.reduce((a, b) => (b.score > a.score ? b : a));
    const strongName = strongest.label.toLowerCase();
    if (band === 'excellent') {
      return focus.withinBudget
        ? `Agent-level prompt! Clear, focused and only ${focus.words} words.`
        : 'Agent-level prompt! NOVA had everything it needed.';
    }
    if (band === 'partial') {
      return strongest.score > 0
        ? `Good work. Your ${strongName} helped NOVA. Fill in the missing parts and NOVA will nail it.`
        : 'A start! NOVA understood a little, but had to guess a lot.';
    }
    return strongest.score > 0
      ? `NOVA got some of it (your ${strongName} helped), but had to guess most of what you wanted.`
      : "NOVA couldn't work out what you wanted. Try using the five parts of a great prompt.";
  }

  function emptyCriteria(reason) {
    return WL.RUBRIC.map((r) => ({
      key: r.key,
      label: r.label,
      score: 0,
      max: 20,
      status: 'missing',
      matched: [],
      praise: null,
      tip: reason === 'unkind' ? null : r.question,
      principle: r.principle,
    }));
  }

  /**
   * Evaluate a senior prompt for a mission.
   * @returns {object} structured result (see docs/ARCHITECTURE.md → EvaluationResult)
   */
  function evaluatePrompt(mission, rawPrompt) {
    const spec = mission.senior;
    const text = normalise(rawPrompt);
    const words = countWords(rawPrompt);
    const base = { provider: 'local', engine: ENGINE_VERSION, missionId: mission.id, words };

    if (UNKIND.test(text)) {
      return Object.assign(base, {
        criteria: emptyCriteria('unkind'),
        rawScore: 0,
        focus: analyseFocus(text, words, spec.wordBudget),
        total: 0,
        band: 'poor',
        flag: 'unkind',
        summary: 'NOVA only works with kind, respectful prompts. Try again, Agent!',
        topTip: { key: 'objective', text: 'Write a friendly prompt that tells NOVA what to do.', principle: WL.RUBRIC[0].principle },
      });
    }

    if (words < 3) {
      return Object.assign(base, {
        criteria: emptyCriteria('short'),
        rawScore: 0,
        focus: analyseFocus(text, words, spec.wordBudget),
        total: 0,
        band: 'poor',
        flag: 'too-short',
        summary: 'That prompt is too short for NOVA to work with. Say what you want, and give some details.',
        topTip: { key: 'objective', text: WL.RUBRIC[0].question + ' Start with an action word.', principle: WL.RUBRIC[0].principle },
      });
    }

    const criteria = WL.RUBRIC.map((r) => scoreCriterion(r, spec.rubric[r.key], text));
    const rawScore = criteria.reduce((sum, c) => sum + c.score, 0);
    const focus = analyseFocus(text, words, spec.wordBudget);
    const total = Math.max(0, Math.min(100, rawScore - focus.penalty));
    const band = bandFor(total);

    const weakest = criteria.reduce((a, b) => (b.score < a.score ? b : a));
    const topTip =
      weakest.score < 20 && weakest.tip
        ? { key: weakest.key, text: weakest.tip, principle: weakest.principle }
        : focus.note
          ? { key: 'focus', text: focus.note, principle: 'Longer isn\'t better. Clear and focused is better.' }
          : null;

    return Object.assign(base, {
      criteria,
      rawScore,
      focus,
      total,
      band,
      flag: null,
      summary: summaryFor(band, criteria, focus),
      topTip,
    });
  }

  /** Compare a refined attempt with the first one, for "what improved" feedback. */
  function compareAttempts(first, second) {
    const changes = second.criteria.map((c) => {
      const before = first.criteria.find((f) => f.key === c.key);
      return { key: c.key, label: c.label, before: before ? before.score : 0, after: c.score, delta: c.score - (before ? before.score : 0) };
    });
    return {
      delta: second.total - first.total,
      improved: changes.filter((c) => c.delta > 0),
      dropped: changes.filter((c) => c.delta < 0),
      changes,
    };
  }

  WL.LocalEvaluator = {
    version: ENGINE_VERSION,
    bands: BANDS,
    evaluatePrompt,
    compareAttempts,
    bandFor,
    countWords,
    normalise,
  };
})(typeof window !== 'undefined' ? window : globalThis);
