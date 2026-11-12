/*
 * App shell: hash router, screen transitions, HUD, presenter mode.
 *
 * Routes (hash-based, so they work on GitHub Pages without server config):
 *   #/            welcome / title
 *   #/map         mission map
 *   #/mission/N   play mission N
 *   #/results     final celebration
 *   #/leaderboard leaderboard
 *   #/organiser   organiser panel (PIN)
 *
 * Each screen in WL.Screens exposes mount(el, params) and may return a
 * cleanup function.
 */
(function (root) {
  'use strict';
  const WL = (root.WL = root.WL || {});
  const { util } = WL;
  WL.Screens = WL.Screens || {};

  const PRESENTER_KEY = 'winterlight:presenter';

  function readPresenter() {
    try {
      const raw = root.sessionStorage.getItem(PRESENTER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      return null;
    }
  }

  function presenterPlayer(mode, existing) {
    if (existing && existing.mode === mode) return existing;
    return {
      id: 'presenter',
      nickname: 'Presenter',
      mode,
      missions: {},
      badges: [],
      streak: 0,
      bestStreak: 0,
      totalScore: 0,
      finished: false,
      presenter: true,
    };
  }

  const App = {
    el: null,
    cleanup: null,
    route: null,
    player: null,
    presenter: null, // { mode, player }

    init() {
      App.el = document.getElementById('app');
      WL.FX.Snow.init(document.getElementById('snow'));
      App.restorePresenter();
      if (!App.presenter) App.player = WL.Profiles.current();
      App.bindHud();
      root.addEventListener('hashchange', () => App.render());
      App.render();
    },

    /* --------------------------------------------------------- navigation */
    go(path) {
      const target = '#' + path;
      if (location.hash === target) App.render();
      else location.hash = target;
    },

    parse() {
      const h = (location.hash || '#/').replace(/^#/, '');
      const parts = h.split('/').filter(Boolean);
      return { name: parts[0] || 'welcome', params: parts.slice(1) };
    },

    render() {
      const r = App.parse();
      const needsPlayer = ['map', 'mission', 'results'];
      let name = r.name;
      if (!WL.Screens[name]) name = 'welcome';
      if (needsPlayer.includes(name) && !App.player) name = 'welcome';
      App.mount(name, r.params);
    },

    mount(name, params) {
      const swap = () => {
        if (App.cleanup) {
          try {
            App.cleanup();
          } catch (e) {
            console.error(e);
          }
        }
        App.cleanup = null;
        document.getElementById('fx').innerHTML = '';
        App.el.innerHTML = '';
        App.el.className = 'screen-host';
        const section = document.createElement('section');
        section.className = 'screen screen-' + name;
        App.el.appendChild(section);
        App.route = name;
        document.body.dataset.screen = name;
        App.updateHud();
        root.scrollTo(0, 0);
        const result = WL.Screens[name].mount(section, params || []);
        if (typeof result === 'function') App.cleanup = result;
        requestAnimationFrame(() => section.classList.add('in'));
        App.el.focus({ preventScroll: true });
      };
      const current = App.el.querySelector('.screen');
      if (current && !util.reducedMotion()) {
        current.classList.add('out');
        setTimeout(swap, 200);
      } else swap();
    },

    /* ------------------------------------------------------------ players */
    setPlayer(player) {
      App.player = player;
      if (player && !player.presenter) WL.Profiles.setCurrent(player.id);
      App.updateHud();
    },

    savePlayer() {
      const p = App.player;
      if (!p) return;
      if (p.presenter) {
        App.presenter.player = p;
        App.persistPresenter();
      } else {
        WL.Profiles.save(p);
      }
      App.updateHud();
    },

    signOut() {
      WL.Storage.remove('currentPlayer');
      App.player = null;
      App.go('/');
    },

    /** Push the player's score to the leaderboard (never in presenter mode). */
    async submitScore() {
      const p = App.player;
      if (!p || p.presenter) return null;
      try {
        await WL.Leaderboard.submit({
          id: p.id,
          nickname: p.nickname,
          mode: p.mode,
          score: WL.Scoring.totalScore(p),
          missions: WL.Scoring.missionsCompleted(p),
          badges: p.badges,
        });
        const list = await WL.Leaderboard.list(p.mode);
        const me = list.find((e) => e.id === p.id);
        return me ? me.position : null;
      } catch (e) {
        console.warn('[Winterlight] Could not save to leaderboard', e);
        return null;
      }
    },

    /* ---------------------------------------------------------- presenter */
    startPresenter(mode) {
      App.presenter = { mode, player: presenterPlayer(mode) };
      App.persistPresenter();
      App.player = App.presenter.player;
      App.updatePresenterRibbon();
      App.go('/map');
    },

    switchPresenterMode(mode) {
      if (!App.presenter) return;
      App.presenter.mode = mode;
      App.presenter.player = presenterPlayer(mode, App.presenter.player);
      App.player = App.presenter.player;
      App.persistPresenter();
      App.updatePresenterRibbon();
      App.render();
    },

    exitPresenter() {
      App.presenter = null;
      try {
        root.sessionStorage.removeItem(PRESENTER_KEY);
      } catch (e) {
        /* ignore */
      }
      App.player = WL.Profiles.current();
      App.updatePresenterRibbon();
      App.go('/');
    },

    persistPresenter() {
      try {
        root.sessionStorage.setItem(PRESENTER_KEY, JSON.stringify(App.presenter));
      } catch (e) {
        /* ignore */
      }
    },

    restorePresenter() {
      const saved = readPresenter();
      if (saved && saved.mode) {
        App.presenter = { mode: saved.mode, player: presenterPlayer(saved.mode, saved.player) };
        App.player = App.presenter.player;
      }
      App.updatePresenterRibbon();
    },

    isPresenter() {
      return !!App.presenter;
    },

    updatePresenterRibbon() {
      const ribbon = document.getElementById('demo-ribbon');
      if (!ribbon) return;
      ribbon.hidden = !App.presenter;
      document.body.classList.toggle('presenter', !!App.presenter);
      if (!App.presenter) return;
      const mode = App.presenter.mode;
      ribbon.innerHTML = `<span class="ribbon-label">🎤 Presenter mode</span>
        <span class="ribbon-switch" role="group" aria-label="Game mode">
          <button type="button" data-mode="junior" aria-pressed="${mode === 'junior'}">Junior</button>
          <button type="button" data-mode="senior" aria-pressed="${mode === 'senior'}">Senior</button>
        </span>
        <button type="button" class="ribbon-exit" id="demo-exit">Exit</button>`;
      util.$$('[data-mode]', ribbon).forEach((b) => b.addEventListener('click', () => App.switchPresenterMode(b.dataset.mode)));
      ribbon.querySelector('#demo-exit').addEventListener('click', () => App.exitPresenter());
    },

    /* ---------------------------------------------------------------- HUD */
    bindHud() {
      document.getElementById('btn-map').addEventListener('click', () => {
        WL.Sound.play('click');
        if (App.route === 'mission') return App.confirmLeave('/map');
        App.go('/map');
      });
      document.getElementById('btn-board').addEventListener('click', () => {
        WL.Sound.play('click');
        if (App.route === 'mission') return App.confirmLeave('/leaderboard');
        App.go('/leaderboard');
      });
      const soundBtn = document.getElementById('btn-sound');
      const syncSound = () => {
        soundBtn.textContent = WL.Sound.enabled ? '🔊' : '🔇';
        soundBtn.setAttribute('aria-pressed', String(WL.Sound.enabled));
        soundBtn.setAttribute('aria-label', WL.Sound.enabled ? 'Sound on' : 'Sound off');
      };
      soundBtn.addEventListener('click', () => {
        WL.Sound.setEnabled(!WL.Sound.enabled);
        syncSound();
      });
      syncSound();
      document.getElementById('hud-agent').addEventListener('click', () => App.showProfile());
    },

    confirmLeave(path) {
      WL.UI.confirm({
        title: 'Leave this mission?',
        text: "Your progress in this mission won't be saved. You can start it again from the map.",
        ok: 'Leave mission',
        cancel: 'Keep playing',
        icon: '🗺',
      }).then((ok) => ok && App.go(path));
    },

    updateHud() {
      const hud = document.getElementById('hud');
      const p = App.player;
      const show = !!p && App.route !== 'welcome' && App.route !== 'organiser';
      hud.hidden = !show;
      document.body.classList.toggle('has-hud', show);
      if (!p) return;
      document.getElementById('hud-name').textContent = p.nickname;
      document.getElementById('hud-mode').textContent = p.mode === 'senior' ? 'Senior' : 'Junior';
      document.getElementById('hud-avatar').innerHTML = WL.Nova.html({ mood: 'happy', size: 'xs' });
      document.getElementById('hud-score').textContent = WL.Scoring.totalScore(p);
      document.getElementById('hud-streak').textContent = p.streak || 0;
      document.getElementById('hud-streak-wrap').classList.toggle('hot', (p.streak || 0) >= 2);
      document.getElementById('hud-nodes').textContent = WL.Scoring.missionsCompleted(p) + '/' + WL.MISSIONS.length;
    },

    /** Animate the HUD score to its new value. */
    bumpHudScore(from, to) {
      const el = document.getElementById('hud-score');
      el.parentElement.classList.remove('bump');
      void el.offsetWidth;
      el.parentElement.classList.add('bump');
      return util.countUp(el, from, to, 900);
    },

    showProfile() {
      const p = App.player;
      if (!p) return;
      WL.Sound.play('click');
      const total = WL.Scoring.totalScore(p);
      const badges = WL.ACHIEVEMENTS.map((a) => WL.UI.badgeHtml(a.id, { locked: !p.badges.includes(a.id), mode: p.mode, size: 'sm' })).join('');
      WL.UI.modal({
        title: util.esc(p.nickname),
        icon: WL.Nova.html({ mood: 'happy', size: 'md' }),
        cls: 'modal-profile',
        body: `<p class="profile-sub">${p.mode === 'senior' ? 'Senior Agent' : 'Junior Agent'} · ${WL.rankFor(total)}</p>
          <div class="profile-stats">
            <div><strong>${total}</strong><span>score</span></div>
            <div><strong>${WL.Scoring.missionsCompleted(p)}/6</strong><span>nodes</span></div>
            <div><strong>${p.bestStreak || 0}</strong><span>best streak</span></div>
          </div>
          <h3 class="mini-head">Badges</h3>
          <div class="badge-grid">${badges}</div>`,
        actions: p.presenter
          ? [{ label: 'Close', kind: 'btn-primary' }]
          : [
              { label: 'Switch agent', kind: 'btn-ghost', onClick: () => App.signOut() },
              { label: 'Close', kind: 'btn-primary' },
            ],
      });
    },
  };

  WL.App = App;
  document.addEventListener('DOMContentLoaded', () => App.init());
})(typeof window !== 'undefined' ? window : globalThis);
