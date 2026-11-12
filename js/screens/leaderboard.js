/* Junior and senior leaderboards. Big-screen friendly with ?tv in the hash. */
(function (root) {
  'use strict';
  const WL = (root.WL = root.WL || {});
  const { util, UI } = WL;
  const esc = util.esc;

  WL.Screens.leaderboard = {
    mount(el, params) {
      const App = WL.App;
      const p = App.player;
      let mode = params[0] === 'senior' || params[0] === 'junior' ? params[0] : p ? p.mode : 'junior';
      let alive = true;

      el.innerHTML = `
        <div class="lb-wrap">
          <header class="lb-head">
            <div class="lb-trophy" aria-hidden="true">🏆</div>
            <div>
              <p class="lb-kicker" id="lb-event"></p>
              <h1 class="lb-title">Agent Leaderboard</h1>
            </div>
          </header>
          <div class="tabs" role="tablist" aria-label="Leaderboard">
            <button class="tab" role="tab" type="button" data-mode="junior" id="tab-junior" aria-controls="lb-panel">Junior Agents <small>8–11</small></button>
            <button class="tab" role="tab" type="button" data-mode="senior" id="tab-senior" aria-controls="lb-panel">Senior Agents <small>12–16</small></button>
          </div>
          <div class="lb-panel panel" id="lb-panel" role="tabpanel" aria-live="polite"></div>
          <div class="lb-actions">
            ${p ? '<button class="btn btn-primary" id="lb-back" type="button">◀ Back to map</button>' : '<button class="btn btn-primary" id="lb-home" type="button">◀ Home</button>'}
            <button class="btn btn-ghost" id="lb-refresh" type="button">↻ Refresh</button>
          </div>
        </div>`;

      const panel = el.querySelector('#lb-panel');

      async function draw() {
        util.$$('.tab', el).forEach((t) => {
          const on = t.dataset.mode === mode;
          t.classList.toggle('active', on);
          t.setAttribute('aria-selected', String(on));
          t.tabIndex = on ? 0 : -1;
        });
        panel.setAttribute('aria-labelledby', 'tab-' + mode);
        const [list, settings] = await Promise.all([WL.Leaderboard.list(mode), WL.Leaderboard.getSettings()]);
        if (!alive) return;
        el.querySelector('#lb-event').textContent = settings.eventName || 'Operation Winterlight';
        if (!list.length) {
          panel.innerHTML = `<div class="lb-empty">${WL.Nova.html({ mood: 'neutral', size: 'md' })}<p>No ${mode} agents yet. Be the first to restore the Winterlight!</p></div>`;
          return;
        }
        const top = list.slice(0, 3);
        const podiumOrder = [top[1], top[0], top[2]].filter(Boolean);
        const meId = p && !p.presenter ? p.id : null;
        panel.innerHTML = `
          <div class="podium">${podiumOrder
            .map(
              (e) => `<div class="pod pod-${e.position} ${e.id === meId ? 'me' : ''}">
                <span class="pod-medal" aria-hidden="true">${['🥇', '🥈', '🥉'][e.position - 1] || '★'}</span>
                <span class="pod-name">${esc(e.nickname)}</span>
                <span class="pod-score">${e.score}</span>
                <span class="pod-block"><span>${e.position}</span></span>
              </div>`
            )
            .join('')}</div>
          <table class="lb-table">
            <caption class="sr-only">${mode === 'senior' ? 'Senior' : 'Junior'} leaderboard</caption>
            <thead><tr><th scope="col">#</th><th scope="col">Agent</th><th scope="col" class="lb-badges-col">Badges</th><th scope="col">Nodes</th><th scope="col">Score</th></tr></thead>
            <tbody>${list
              .map(
                (e, i) => `<tr class="${e.id === meId ? 'me' : ''} ${e.demo ? 'demo' : ''}" style="--i:${Math.min(i, 12)}">
                  <td class="lb-pos">${e.position}</td>
                  <td class="lb-name">${esc(e.nickname)}${e.id === meId ? ' <span class="you">YOU</span>' : ''}${e.demo ? ' <span class="demo-tag" title="Fictional demo agent">demo</span>' : ''}</td>
                  <td class="lb-badges-col"><span class="lb-badges">${UI.badgeIconsHtml(e.badges, 5)}</span></td>
                  <td class="lb-nodes">${e.missions}/6</td>
                  <td class="lb-score">${e.score}</td>
                </tr>`
              )
              .join('')}</tbody>
          </table>
          ${list.some((e) => e.demo) ? '<p class="lb-note">“demo” agents are made up, to show how the leaderboard works. Organisers can hide them.</p>' : ''}`;
      }

      util.$$('.tab', el).forEach((t) =>
        t.addEventListener('click', () => {
          WL.Sound.play('click');
          mode = t.dataset.mode;
          draw();
        })
      );
      el.querySelector('.tabs').addEventListener('keydown', (e) => {
        if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
        mode = mode === 'junior' ? 'senior' : 'junior';
        draw().then(() => el.querySelector('#tab-' + mode).focus());
      });
      const back = el.querySelector('#lb-back');
      if (back) back.addEventListener('click', () => App.go('/map'));
      const home = el.querySelector('#lb-home');
      if (home) home.addEventListener('click', () => App.go('/'));
      el.querySelector('#lb-refresh').addEventListener('click', () => {
        WL.Sound.play('click');
        draw();
      });

      draw();
      // Keep a big-screen leaderboard fresh during an event.
      const timer = setInterval(draw, 15000);
      const onStorage = (e) => {
        if (e.key && e.key.indexOf(WL.Storage.prefix) === 0) draw();
      };
      root.addEventListener('storage', onStorage);
      return () => {
        alive = false;
        clearInterval(timer);
        root.removeEventListener('storage', onStorage);
      };
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
