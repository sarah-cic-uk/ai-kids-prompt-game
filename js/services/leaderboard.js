/*
 * Leaderboard service.
 *
 * The game only talks to `WL.Leaderboard`, which delegates to a provider:
 *   - LocalLeaderboardProvider: this browser's localStorage (prototype default)
 *   - RemoteLeaderboardProvider: a shared event API (see docs/ARCHITECTURE.md)
 * Every method returns a Promise, so swapping in the remote provider needs no
 * UI changes.
 *
 * Privacy: entries hold only a nickname, mode, score, mission count, badge ids
 * and timestamps. No real names, emails or device identifiers.
 */
(function (root) {
  'use strict';
  const WL = (root.WL = root.WL || {});

  /** Fictional demo agents, shown until the organiser turns them off or resets. */
  const DEMO = {
    junior: [
      { nickname: 'SnowyOwl', score: 540, missions: 6, badges: ['hero', 'perfect', 'streak-3', 'sharp-eyes'] },
      { nickname: 'PixelPenguin', score: 470, missions: 6, badges: ['hero', 'perfect', 'comeback'] },
      { nickname: 'CocoaComet', score: 410, missions: 6, badges: ['hero', 'comeback'] },
      { nickname: 'FrostByte', score: 330, missions: 5, badges: ['perfect', 'sharp-eyes'] },
      { nickname: 'JinglePixel', score: 260, missions: 4, badges: ['first-light', 'comeback'] },
      { nickname: 'IcicleNinja', score: 150, missions: 3, badges: ['first-light'] },
    ],
    senior: [
      { nickname: 'AuroraAce', score: 565, missions: 6, badges: ['hero', 'legend', 'streak-6', 'short-sweet'] },
      { nickname: 'GlitchHunter', score: 505, missions: 6, badges: ['hero', 'fact-checker', 'comeback'] },
      { nickname: 'NorthernByte', score: 455, missions: 6, badges: ['hero', 'short-sweet'] },
      { nickname: 'PromptWizard', score: 380, missions: 5, badges: ['perfect', 'streak-3'] },
      { nickname: 'SleighCoder', score: 290, missions: 4, badges: ['comeback'] },
      { nickname: 'YetiDev', score: 175, missions: 3, badges: ['first-light'] },
    ],
  };

  function demoEntries(mode) {
    return DEMO[mode].map((d, i) => ({
      id: 'demo-' + mode + '-' + i,
      nickname: d.nickname,
      mode,
      score: d.score,
      missions: d.missions,
      badges: d.badges.slice(),
      demo: true,
      updatedAt: '2026-01-01T00:00:00.000Z',
    }));
  }

  function rank(entries) {
    // Ties: higher score first, then more missions, then whoever got there first.
    const sorted = entries.slice().sort(
      (a, b) => b.score - a.score || b.missions - a.missions || String(a.updatedAt).localeCompare(String(b.updatedAt))
    );
    let lastScore = null;
    let lastPos = 0;
    return sorted.map((e, i) => {
      const position = e.score === lastScore ? lastPos : i + 1;
      lastScore = e.score;
      lastPos = position;
      return Object.assign({}, e, { position });
    });
  }

  class LocalLeaderboardProvider {
    constructor(storage) {
      this.storage = storage;
      this.name = 'local';
    }
    _state() {
      const s = this.storage.get('leaderboard', null);
      if (s && s.entries) return s;
      return { entries: [], showDemo: WL.CONFIG.showDemoDataByDefault, eventName: '', resetAt: null };
    }
    _save(state) {
      this.storage.set('leaderboard', state);
    }
    async list(mode) {
      const s = this._state();
      const real = s.entries.filter((e) => e.mode === mode);
      return rank(s.showDemo ? real.concat(demoEntries(mode)) : real);
    }
    async submit(entry) {
      const s = this._state();
      const i = s.entries.findIndex((e) => e.id === entry.id);
      const clean = {
        id: entry.id,
        nickname: entry.nickname,
        mode: entry.mode,
        score: entry.score,
        missions: entry.missions,
        badges: (entry.badges || []).slice(0, 12),
        updatedAt: new Date().toISOString(),
      };
      if (i >= 0) s.entries[i] = clean;
      else s.entries.push(clean);
      this._save(s);
      return clean;
    }
    async remove(id) {
      const s = this._state();
      s.entries = s.entries.filter((e) => e.id !== id);
      this._save(s);
    }
    async reset() {
      const s = this._state();
      s.entries = [];
      s.resetAt = new Date().toISOString();
      this._save(s);
    }
    async getSettings() {
      const s = this._state();
      return { showDemo: !!s.showDemo, eventName: s.eventName || '', resetAt: s.resetAt, count: s.entries.length };
    }
    async updateSettings(patch) {
      const s = this._state();
      if ('showDemo' in patch) s.showDemo = !!patch.showDemo;
      if ('eventName' in patch) s.eventName = String(patch.eventName || '').slice(0, 40);
      this._save(s);
    }
    async exportAll() {
      return this._state().entries.slice();
    }
  }

  /**
   * Shared event leaderboard backed by an HTTP API. Not used by the
   * prototype. It documents the contract a backend needs to implement.
   *   GET    {endpoint}/entries?mode=junior|senior  → { entries: Entry[] }
   *   PUT    {endpoint}/entries/{id}                → Entry   (body: Entry)
   *   DELETE {endpoint}/entries/{id}
   *   POST   {endpoint}/reset                       (organiser auth on the server)
   */
  class RemoteLeaderboardProvider {
    constructor(endpoint) {
      this.endpoint = endpoint.replace(/\/$/, '');
      this.name = 'remote';
    }
    async _fetch(path, opts) {
      const res = await fetch(this.endpoint + path, Object.assign({ headers: { 'Content-Type': 'application/json' } }, opts));
      if (!res.ok) throw new Error('Leaderboard request failed: ' + res.status);
      return res.status === 204 ? null : res.json();
    }
    async list(mode) {
      const data = await this._fetch('/entries?mode=' + encodeURIComponent(mode));
      return rank(data.entries || []);
    }
    async submit(entry) {
      return this._fetch('/entries/' + encodeURIComponent(entry.id), { method: 'PUT', body: JSON.stringify(entry) });
    }
    async remove(id) {
      return this._fetch('/entries/' + encodeURIComponent(id), { method: 'DELETE' });
    }
    async reset() {
      return this._fetch('/reset', { method: 'POST' });
    }
    async getSettings() {
      return { showDemo: false, eventName: '', resetAt: null, count: null };
    }
    async updateSettings() {
      /* managed on the server */
    }
    async exportAll() {
      const [j, s] = await Promise.all([this.list('junior'), this.list('senior')]);
      return j.concat(s);
    }
  }

  function createProvider() {
    const cfg = WL.CONFIG.leaderboard;
    if (cfg.provider === 'remote' && cfg.endpoint) return new RemoteLeaderboardProvider(cfg.endpoint);
    return new LocalLeaderboardProvider(WL.Storage);
  }

  const provider = createProvider();

  WL.Leaderboard = {
    provider,
    list: (mode) => provider.list(mode),
    submit: (entry) => provider.submit(entry),
    remove: (id) => provider.remove(id),
    reset: () => provider.reset(),
    getSettings: () => provider.getSettings(),
    updateSettings: (p) => provider.updateSettings(p),
    exportAll: () => provider.exportAll(),
    rank,
    _classes: { LocalLeaderboardProvider, RemoteLeaderboardProvider },
  };
})(typeof window !== 'undefined' ? window : globalThis);
