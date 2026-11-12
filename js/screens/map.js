/* Mission map: six nodes along a snowy trail, unlocking one after another. */
(function (root) {
  'use strict';
  const WL = (root.WL = root.WL || {});
  const { util, UI } = WL;
  const esc = util.esc;

  // Node positions as % of the map (left, top), tuned for a 4:3 map.
  const POS = [
    [16, 74],
    [38, 82],
    [56, 60],
    [32, 40],
    [62, 30],
    [84, 16],
  ];

  /** One curved path per leg of the trail; leg i joins node i and node i+1. */
  function trailSegments() {
    const pts = POS.map(([x, y]) => [x, y * 0.75]);
    const segs = [];
    for (let i = 1; i < pts.length; i += 1) {
      const [x0, y0] = pts[i - 1];
      const [x1, y1] = pts[i];
      const cx = (x0 + x1) / 2 + (i % 2 ? 8 : -8);
      const cy = (y0 + y1) / 2 + (i % 2 ? 6 : -6);
      segs.push(`M ${x0} ${y0} Q ${cx} ${cy} ${x1} ${y1}`);
    }
    return segs;
  }

  WL.Screens.map = {
    mount(el) {
      const App = WL.App;
      const p = App.player;
      const demo = App.isPresenter();
      const done = WL.Scoring.missionsCompleted(p);
      const nextId = WL.Profiles.nextMissionId(p);
      const total = WL.Scoring.totalScore(p);

      const nodes = WL.MISSIONS.map((m, i) => {
        const res = p.missions[m.id];
        const unlocked = WL.Profiles.isUnlocked(p, m.id, demo);
        const state = res ? 'done' : unlocked ? (m.id === nextId ? 'next' : 'open') : 'locked';
        const [x, y] = POS[i];
        return `<button class="map-node st-${state} ${m.final ? 'final' : ''}" type="button" style="left:${x}%;top:${y}%" data-id="${m.id}" ${state === 'locked' ? 'aria-disabled="true"' : ''}
            aria-label="Mission ${m.id}: ${esc(m.title)}. ${state === 'done' ? 'Completed, ' + res.score + ' points' : state === 'locked' ? 'Locked' : 'Ready to play'}">
          <span class="node-ring" aria-hidden="true"></span>
          <span class="node-icon" aria-hidden="true">${state === 'locked' ? WL.Scenes.icon('lock') : WL.Scenes.icon(m.scene)}</span>
          <span class="node-num" aria-hidden="true">${m.id}</span>
          ${res ? `<span class="node-stars" aria-hidden="true">${UI.starsHtml(WL.Scoring.stars(res.score), 'tiny')}</span>` : ''}
          <span class="node-label" aria-hidden="true">${esc(m.title)}</span>
        </button>`;
      }).join('');

      const intro =
        done === 0
          ? `Welcome, Agent ${esc(p.nickname)}! Start with Mission 1 in Frostvale. Tap the glowing node.`
          : done >= WL.MISSIONS.length
            ? 'All nodes restored! Replay any mission, or see your final results.'
            : `${done} of 6 nodes restored. Keep going, Agent!`;

      el.innerHTML = `
        <div class="map-layout">
          <div class="map-board panel-frame">
            <div class="map-terrain">${WL.Scenes.render('map')}</div>
            <svg class="map-trail" viewBox="0 0 100 75" preserveAspectRatio="none" aria-hidden="true">
              ${trailSegments()
                .map((d, i) => `<path d="${d}" class="trail-seg ${p.missions[WL.MISSIONS[i].id] ? 'done' : ''}"/>`)
                .join('')}
            </svg>
            <div class="map-nodes">${nodes}</div>
            <div class="map-title"><span>Winterlight Network</span></div>
          </div>
          <aside class="map-side">
            <div class="map-nova">
              ${WL.Nova.html({ mood: done >= 6 ? 'happy' : 'neutral', size: 'md', cls: 'nova-float' })}
              <div class="bubble bubble-static"><span class="bubble-name">NOVA</span><p class="bubble-text">${intro}</p></div>
            </div>
            <div class="map-progress panel">
              <div class="mp-row"><span>Nodes restored</span><strong>${done}/6</strong></div>
              <div class="mp-bar" role="progressbar" aria-valuemin="0" aria-valuemax="6" aria-valuenow="${done}" aria-label="Nodes restored"><span style="--w:${(done / 6) * 100}%"></span></div>
              <div class="mp-row"><span>Total score</span><strong>★ ${total}</strong></div>
              <div class="mp-row"><span>Badges</span><strong>${p.badges.length}/${WL.ACHIEVEMENTS.length}</strong></div>
              ${done >= 6 ? '<button class="btn btn-primary btn-glow" id="btn-final" type="button">🌟 Final results</button>' : ''}
              ${nextId ? `<button class="btn btn-primary" id="btn-next" type="button">▶ Play Mission ${nextId}</button>` : ''}
            </div>
            <div class="skills panel">
              <h3 class="mini-head">Your prompt skills</h3>
              <ul class="skill-list">${WL.MISSIONS.map(
                (m) => `<li class="${p.missions[m.id] ? 'got' : ''}"><span aria-hidden="true">${p.missions[m.id] ? '✔' : '○'}</span> ${esc(m.skill)}</li>`
              ).join('')}</ul>
            </div>
          </aside>
        </div>`;

      util.$$('.map-node', el).forEach((b) =>
        b.addEventListener('click', () => {
          const id = Number(b.dataset.id);
          if (b.classList.contains('st-locked')) {
            WL.Sound.play('fail');
            WL.FX.shake(b);
            UI.toast(`Complete Mission ${id - 1} first to unlock this node.`, { icon: '🔒' });
            return;
          }
          WL.Sound.play('whoosh');
          openBriefing(WL.getMission(id), p);
        })
      );
      const nextBtn = el.querySelector('#btn-next');
      if (nextBtn) nextBtn.addEventListener('click', () => openBriefing(WL.getMission(nextId), p));
      const finalBtn = el.querySelector('#btn-final');
      if (finalBtn) finalBtn.addEventListener('click', () => App.go('/results'));
    },
  };

  function openBriefing(m, p) {
    const res = p.missions[m.id];
    UI.modal({
      title: `Mission ${m.id}: ${esc(m.title)}`,
      cls: 'modal-brief',
      body: `<div class="brief-scene">${WL.Scenes.html(m.scene, { progress: WL.Scoring.missionsCompleted(p) })}</div>
        <div class="brief-meta">
          <span class="chip chip-skill">🎓 ${esc(m.skill)}</span>
          <span class="chip">📍 ${esc(m.location)}</span>
          ${m.final ? '<span class="chip chip-final">⚡ Final challenge</span>' : ''}
        </div>
        <p class="brief-problem">${esc(m.problem)}</p>
        ${res ? `<p class="brief-best">Your score: <strong>${res.score}</strong> ${UI.starsHtml(WL.Scoring.stars(res.score), 'tiny')} Replay as often as you like. Your best score counts.</p>` : ''}`,
      actions: [
        { label: 'Back', kind: 'btn-ghost' },
        { label: res ? '↻ Replay mission' : '▶ Start mission', kind: 'btn-primary', onClick: () => WL.App.go('/mission/' + m.id) },
      ],
    });
  }
})(typeof window !== 'undefined' ? window : globalThis);
