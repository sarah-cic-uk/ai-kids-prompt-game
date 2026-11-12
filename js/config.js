/*
 * Operation Winterlight — configuration.
 *
 * Everything here is public (it ships to the browser), so NEVER put API keys
 * or secrets in this file. Real AI evaluation must happen on a server you
 * control; point `evaluator.endpoint` at it and switch `provider` to 'remote'.
 */
(function (root) {
  'use strict';
  const WL = (root.WL = root.WL || {});

  const defaults = {
    version: '1.0.0',

    /* Organiser panel PIN. This is not real security; it just keeps curious players out. */
    organiserPin: '2468',

    /* Senior prompt evaluation.
     *  provider 'local'  → rubric engine in js/engine/evaluator-local.js (default, offline)
     *  provider 'remote' → POST to `endpoint` (see docs/ARCHITECTURE.md); falls back to local on error. */
    evaluator: { provider: 'local', endpoint: '', timeoutMs: 8000 },

    /* Leaderboard storage.
     *  provider 'local'  → this browser's localStorage (default)
     *  provider 'remote' → shared event leaderboard API at `endpoint` (see docs/ARCHITECTURE.md). */
    leaderboard: { provider: 'local', endpoint: '' },

    /* A mission score at or above this counts towards a streak. */
    highScore: 80,

    /* Show the fictional demo agents on a fresh leaderboard. Organisers can switch this off. */
    showDemoDataByDefault: true,
  };

  // Pages/tests may set window.WL_CONFIG_OVERRIDES before this script loads.
  const overrides = root.WL_CONFIG_OVERRIDES || {};
  WL.CONFIG = Object.assign({}, defaults, overrides, {
    evaluator: Object.assign({}, defaults.evaluator, overrides.evaluator),
    leaderboard: Object.assign({}, defaults.leaderboard, overrides.leaderboard),
  });
})(typeof window !== 'undefined' ? window : globalThis);
