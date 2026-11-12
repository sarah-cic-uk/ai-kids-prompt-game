/* Final results: Winterlight restoration celebration, score breakdown, badges and lessons. */
(function (root) {
  'use strict';
  const WL = (root.WL = root.WL || {});
  const { util, UI } = WL;
  const esc = util.esc;

  WL.Screens.results = {
    mount(el) {
      const App = WL.App;
      const p = App.player;
      const done = WL.Scoring.missionsCompleted(p);
      if (done < WL.MISSIONS.length) {
        UI.toast(`Restore all 6 nodes to see your final results. ${done}/6 done!`, { icon: '◆' });
        setTimeout(() => App.go('/map'));
        return;
      }
      const total = WL.Scoring.totalScore(p);
      const rank = WL.rankFor(total);
      const modeName = p.mode === 'senior' ? 'Senior' : 'Junior';

      el.innerHTML = `
        <div class="results-hero panel-frame">
          ${WL.Scenes.html('tower', { progress: 6, state: 'idle', cls: 'results-scene', fit: 'xMidYMid slice' })}
          <div class="results-overlay">
            <p class="rh-kicker">The Winterlight Network is</p>
            <h1 class="rh-title">${'RESTORED!'.split('').map((c, i) => `<span style="--i:${i}">${c}</span>`).join('')}</h1>
          </div>
        </div>
        <div class="results-body">
          <div class="results-card panel">
            <div class="rc-nova">${WL.Nova.html({ mood: 'happy', size: 'lg', cls: 'nova-float' })}</div>
            <div class="rc-main">
              <p class="rc-thanks">Thank you, Agent <strong>${esc(p.nickname)}</strong>! Winter celebrations around the world are glowing again.</p>
              <div class="rc-total">
                <span class="rc-label">Final score</span>
                <span class="rc-num"><span class="score-val" data-to="${total}">0</span><small>/600</small></span>
              </div>
              <p class="rc-rank">🏅 ${esc(rank)}</p>
              <p class="rc-lb" id="rc-lb">${p.presenter ? '🎤 Presenter mode: scores are not saved.' : ''}</p>
            </div>
          </div>

          <div class="results-grid">
            <section class="panel">
              <h2 class="section-title">Mission report</h2>
              <ul class="report">${WL.MISSIONS.map((m) => {
                const r = p.missions[m.id];
                return `<li>
                  <span class="rp-num">${m.id}</span>
                  <span class="rp-name"><strong>${esc(m.title)}</strong><small>${esc(m.skill)}</small></span>
                  ${UI.starsHtml(WL.Scoring.stars(r.score), 'tiny')}
                  <span class="rp-score">${r.score}</span>
                </li>`;
              }).join('')}</ul>
              <div class="report-foot"><span>Best streak</span><strong>🔥 ${p.bestStreak || 0}</strong></div>
            </section>

            <section class="panel">
              <h2 class="section-title">What you learned</h2>
              <ul class="lessons">${WL.LESSONS.map((l, i) => `<li style="--i:${i}"><span class="ls-ico" aria-hidden="true">${UI.RUBRIC_ICON[l.key] || (l.key === 'check' ? '🔍' : '✂')}</span>${esc(l.text)}</li>`).join('')}</ul>
            </section>

            <section class="panel span-2">
              <h2 class="section-title">Badges <small>${p.badges.length}/${WL.ACHIEVEMENTS.length}</small></h2>
              <div class="badge-grid">${WL.ACHIEVEMENTS.map((a) => UI.badgeHtml(a.id, { locked: !p.badges.includes(a.id), mode: p.mode })).join('')}</div>
            </section>
          </div>

          <div class="results-actions">
            <button class="btn btn-ghost" id="r-map" type="button">🗺 Replay missions</button>
            <button class="btn btn-primary" id="r-lb" type="button">🏆 ${modeName} leaderboard</button>
            ${p.presenter ? '' : '<button class="btn btn-ghost" id="r-new" type="button">👋 Next agent</button>'}
          </div>
        </div>`;

      const scene = el.querySelector('.results-scene');
      const timers = [];
      timers.push(setTimeout(() => WL.Scenes.setState(scene, 'restored'), 300));
      timers.push(
        setTimeout(() => {
          WL.Sound.play('power');
          WL.FX.rain(2200);
        }, 900)
      );
      timers.push(setTimeout(() => UI.revealScore(el.querySelector('.rc-total')), 1200));
      timers.push(setTimeout(() => WL.FX.rain(1500), 4200));

      el.querySelector('#r-map').addEventListener('click', () => App.go('/map'));
      el.querySelector('#r-lb').addEventListener('click', () => App.go('/leaderboard'));
      const next = el.querySelector('#r-new');
      if (next)
        next.addEventListener('click', () =>
          UI.confirm({
            title: 'Hand over to the next agent?',
            text: 'Your scores are saved on the leaderboard. The next player can then choose their own nickname.',
            ok: 'Next agent',
            icon: '👋',
          }).then((ok) => ok && App.signOut())
        );

      App.submitScore().then((pos) => {
        const lb = el.querySelector('#rc-lb');
        if (pos && lb) lb.innerHTML = `🏆 You're <strong>${util.ordinal(pos)}</strong> on the ${modeName} leaderboard!`;
      });

      return () => timers.forEach(clearTimeout);
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
