/*
 * Organiser panel (PIN protected): presenter mode, event name, leaderboard
 * reset/export, demo data toggle and clearing player profiles between groups.
 * The PIN is a light barrier for a shared screen, not real security.
 */
(function (root) {
  'use strict';
  const WL = (root.WL = root.WL || {});
  const { util, UI } = WL;
  const esc = util.esc;
  const UNLOCK_KEY = 'winterlight:organiser';

  function unlocked() {
    try {
      return root.sessionStorage.getItem(UNLOCK_KEY) === '1';
    } catch (e) {
      return false;
    }
  }
  function setUnlocked(on) {
    try {
      if (on) root.sessionStorage.setItem(UNLOCK_KEY, '1');
      else root.sessionStorage.removeItem(UNLOCK_KEY);
    } catch (e) {
      /* ignore */
    }
  }

  function csv(entries) {
    const head = ['position', 'mode', 'nickname', 'score', 'missions', 'badges', 'updatedAt'];
    const q = (v) => {
      let s = String(v == null ? '' : v);
      if (/^[=+\-@]/.test(s)) s = "'" + s; // keep spreadsheets from treating text as formulas
      return '"' + s.replace(/"/g, '""') + '"';
    };
    const rows = [];
    ['junior', 'senior'].forEach((mode) => {
      WL.Leaderboard.rank(entries.filter((e) => e.mode === mode)).forEach((e) => {
        rows.push([e.position, e.mode, e.nickname, e.score, e.missions, (e.badges || []).join(' '), e.updatedAt].map(q).join(','));
      });
    });
    return [head.join(',')].concat(rows).join('\n');
  }

  WL.Screens.organiser = {
    mount(el) {
      if (!unlocked()) return pinScreen(el);
      return panelScreen(el);
    },
  };

  function pinScreen(el) {
    el.innerHTML = `
      <form class="org-pin panel" id="pin-form" novalidate>
        <div class="org-lock" aria-hidden="true">🔐</div>
        <h1 class="step-title">Organiser access</h1>
        <p class="step-sub">Enter the organiser PIN to manage the event.</p>
        <label class="sr-only" for="pin">PIN</label>
        <input class="input input-xl pin-input" id="pin" inputmode="numeric" autocomplete="off" maxlength="8" placeholder="••••" />
        <p class="field-error" id="pin-error" role="alert"></p>
        <div class="step-actions">
          <button class="btn btn-ghost" type="button" id="pin-back">◀ Back</button>
          <button class="btn btn-primary" type="submit">Unlock</button>
        </div>
        <p class="privacy-note">The default PIN is in the README. Change it in <code>js/config.js</code>.</p>
      </form>`;
    const input = el.querySelector('#pin');
    setTimeout(() => input.focus(), 50);
    el.querySelector('#pin-back').addEventListener('click', () => WL.App.go('/'));
    el.querySelector('#pin-form').addEventListener('submit', (e) => {
      e.preventDefault();
      if (input.value.trim() === String(WL.CONFIG.organiserPin)) {
        setUnlocked(true);
        WL.Sound.play('success');
        WL.App.render();
      } else {
        el.querySelector('#pin-error').textContent = 'That PIN is not right.';
        WL.FX.shake(input);
        WL.Sound.play('fail');
        input.select();
      }
    });
  }

  function panelScreen(el) {
    let alive = true;
    el.innerHTML = `
      <div class="org">
        <header class="org-head">
          <div>
            <p class="lb-kicker">Operation Winterlight</p>
            <h1 class="lb-title">Organiser panel</h1>
          </div>
          <div class="org-head-actions">
            <button class="btn btn-ghost btn-small" id="org-lock" type="button">🔒 Lock</button>
            <button class="btn btn-primary btn-small" id="org-home" type="button">Home ◀</button>
          </div>
        </header>

        <div class="org-grid">
          <section class="panel org-card">
            <h2 class="section-title">🎤 Presenter mode</h2>
            <p>Show the game on a big screen. All missions are unlocked, scores aren't saved, and each mission shows discussion notes. In Junior mode you can compare all three prompts; in Senior mode you can fill in example prompts.</p>
            <div class="btn-row">
              <button class="btn btn-primary" data-demo="junior" type="button">Present Junior</button>
              <button class="btn btn-primary" data-demo="senior" type="button">Present Senior</button>
            </div>
          </section>

          <section class="panel org-card">
            <h2 class="section-title">🏷 Event</h2>
            <label class="field-label" for="event-name">Event name (shown on the leaderboard)</label>
            <div class="nick-row">
              <input class="input" id="event-name" maxlength="40" placeholder="e.g. Winter Code Club 2026" />
              <button class="btn btn-ghost" id="save-event" type="button">Save</button>
            </div>
            <label class="toggle"><input type="checkbox" id="show-demo" /> <span>Show fictional demo agents on the leaderboard</span></label>
            <div class="btn-row">
              <button class="btn btn-ghost" id="open-lb" type="button">🏆 Open leaderboard</button>
            </div>
          </section>

          <section class="panel org-card">
            <h2 class="section-title">🔄 Between competitions</h2>
            <p>Clear scores before the next group. This only affects <strong>this device</strong>.</p>
            <div class="org-stats" id="org-stats"></div>
            <div class="btn-col">
              <button class="btn btn-ghost" id="export" type="button">⬇ Export scores (CSV)</button>
              <button class="btn btn-danger" id="reset-lb" type="button">Reset leaderboard</button>
              <button class="btn btn-danger" id="reset-all" type="button">Reset leaderboard + agent profiles</button>
            </div>
          </section>

          <section class="panel org-card span-2">
            <h2 class="section-title">👥 Leaderboard entries</h2>
            <p class="small">Remove a nickname if needed (for example, an unsuitable name that got past the filter).</p>
            <div id="entries" class="org-entries"></div>
          </section>

          <section class="panel org-card">
            <h2 class="section-title">⚙ System</h2>
            <ul class="sys-list">
              <li><span>Prompt evaluation</span><strong>${WL.CONFIG.evaluator.provider === 'remote' ? 'Remote AI (server)' : 'Local rubric engine'}</strong></li>
              <li><span>Leaderboard</span><strong>${WL.Leaderboard.provider.name === 'remote' ? 'Shared (server)' : 'This device only'}</strong></li>
              <li><span>Storage</span><strong>${WL.Storage.available ? 'Saved on device' : 'Temporary (private mode)'}</strong></li>
              <li><span>Version</span><strong>${esc(WL.CONFIG.version)}</strong></li>
            </ul>
            <p class="small">There's a facilitator guide (timings, talking points and answers) in <code>docs/FACILITATOR.md</code>.</p>
          </section>
        </div>
      </div>`;

    const $ = (s) => el.querySelector(s);

    async function refresh() {
      const [settings, entries] = await Promise.all([WL.Leaderboard.getSettings(), WL.Leaderboard.exportAll()]);
      if (!alive) return;
      $('#event-name').value = settings.eventName;
      $('#show-demo').checked = settings.showDemo;
      const players = WL.Profiles.all().length;
      const j = entries.filter((e) => e.mode === 'junior').length;
      const s = entries.filter((e) => e.mode === 'senior').length;
      $('#org-stats').innerHTML = `<div><strong>${j}</strong><span>junior scores</span></div><div><strong>${s}</strong><span>senior scores</span></div><div><strong>${players}</strong><span>agent profiles</span></div>${
        settings.resetAt ? `<p class="small">Last reset: ${esc(new Date(settings.resetAt).toLocaleString())}</p>` : ''
      }`;
      const ranked = ['junior', 'senior'].flatMap((mode) => WL.Leaderboard.rank(entries.filter((e) => e.mode === mode)));
      $('#entries').innerHTML = ranked.length
        ? `<table class="lb-table org-table"><thead><tr><th>Mode</th><th>#</th><th>Agent</th><th>Score</th><th><span class="sr-only">Remove</span></th></tr></thead><tbody>${ranked
            .map((e) => `<tr><td>${e.mode === 'senior' ? 'Senior' : 'Junior'}</td><td>${e.position}</td><td>${esc(e.nickname)}</td><td>${e.score}</td><td><button class="btn btn-small btn-ghost" data-remove="${esc(e.id)}" type="button" aria-label="Remove ${esc(e.nickname)}">✕</button></td></tr>`)
            .join('')}</tbody></table>`
        : '<p class="small">No real scores yet.</p>';
      util.$$('[data-remove]', el).forEach((b) =>
        b.addEventListener('click', async () => {
          const ok = await UI.confirm({ title: 'Remove this entry?', text: 'The nickname and its score will be removed from the leaderboard.', ok: 'Remove', danger: true });
          if (!ok) return;
          await WL.Leaderboard.remove(b.dataset.remove);
          UI.toast('Entry removed.', { icon: '✕' });
          refresh();
        })
      );
    }

    util.$$('[data-demo]', el).forEach((b) => b.addEventListener('click', () => WL.App.startPresenter(b.dataset.demo)));
    $('#org-lock').addEventListener('click', () => {
      setUnlocked(false);
      WL.App.go('/');
    });
    $('#org-home').addEventListener('click', () => WL.App.go('/'));
    $('#open-lb').addEventListener('click', () => WL.App.go('/leaderboard'));
    $('#save-event').addEventListener('click', async () => {
      await WL.Leaderboard.updateSettings({ eventName: $('#event-name').value.trim() });
      UI.toast('Event name saved.', { icon: '✔' });
    });
    $('#show-demo').addEventListener('change', async (e) => {
      await WL.Leaderboard.updateSettings({ showDemo: e.target.checked });
      UI.toast(e.target.checked ? 'Demo agents shown.' : 'Demo agents hidden.', { icon: '✔' });
    });
    $('#export').addEventListener('click', async () => {
      const entries = await WL.Leaderboard.exportAll();
      util.download('winterlight-scores-' + new Date().toISOString().slice(0, 10) + '.csv', csv(entries), 'text/csv');
    });
    $('#reset-lb').addEventListener('click', async () => {
      const ok = await UI.confirm({ title: 'Reset the leaderboard?', text: 'All junior and senior scores on this device will be deleted. This cannot be undone. Export first if you need a copy.', ok: 'Reset scores', danger: true, icon: '⚠' });
      if (!ok) return;
      await WL.Leaderboard.reset();
      UI.toast('Leaderboard reset. Ready for the next group!', { icon: '🔄' });
      refresh();
    });
    $('#reset-all').addEventListener('click', async () => {
      const ok = await UI.confirm({ title: 'Reset everything?', text: 'All scores AND agent profiles on this device will be deleted, so the next group starts fresh. This cannot be undone.', ok: 'Reset everything', danger: true, icon: '⚠' });
      if (!ok) return;
      await WL.Leaderboard.reset();
      WL.Profiles.clearAll();
      WL.App.player = WL.App.isPresenter() ? WL.App.player : null;
      UI.toast('Everything reset. Ready for the next group!', { icon: '🔄' });
      refresh();
    });

    refresh();
    return () => {
      alive = false;
    };
  }

  WL.Organiser = { csv };
})(typeof window !== 'undefined' ? window : globalThis);
