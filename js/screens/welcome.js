/*
 * Welcome flow: title → story intro → nickname → age mode → map.
 * Returning agents on this device can continue with one tap.
 */
(function (root) {
  'use strict';
  const WL = (root.WL = root.WL || {});
  const { util, UI } = WL;
  const esc = util.esc;

  const STORY = [
    { mood: 'neutral', text: 'Hello, Agent! I\'m NOVA, the helper robot of the Winterlight Network.' },
    { mood: 'surprised', text: 'Last night the Great Glitch scrambled the Network. Lights, sleighs, weather and parties all went haywire!' },
    { mood: 'neutral', text: "I'm an AI, so I can fix things fast. But I need clear instructions. The better your prompts, the better I work." },
    { mood: 'happy', text: 'Restore all 6 Winterlight nodes and save winter celebrations everywhere. Ready?' },
  ];

  function titleHtml() {
    return `<div class="title-stage">
      <div class="title-scene">${WL.Scenes.html('village', { cls: 'title-village', fit: 'xMidYMax slice' })}</div>
      <div class="title-block">
        <p class="title-kicker">The Festive AI Challenge</p>
        <h1 class="game-title" aria-label="Operation Winterlight">
          <span class="gt-small">Operation</span>
          <span class="gt-big">${'WINTERLIGHT'.split('').map((c, i) => `<span style="--i:${i}">${c}</span>`).join('')}</span>
        </h1>
      </div>
      <div class="title-nova">${WL.Nova.html({ mood: 'happy', size: 'xl', cls: 'nova-float' })}</div>
    </div>`;
  }

  WL.Screens.welcome = {
    mount(el) {
      const recent = WL.Profiles.recent(4);
      el.innerHTML = `
        ${titleHtml()}
        <div class="welcome-panel panel" id="welcome-panel">
          <div class="step step-start" data-step="start">
            <button class="btn btn-primary btn-xl btn-glow" id="btn-start" type="button">
              <span class="btn-ico" aria-hidden="true">▶</span> Start mission
            </button>
            ${
              recent.length
                ? `<div class="recent">
                  <p class="recent-head">Continue as…</p>
                  <div class="recent-list">${recent
                    .map(
                      (p) => `<button class="recent-agent" type="button" data-id="${esc(p.id)}">
                        <span class="ra-name">${esc(p.nickname)}</span>
                        <span class="ra-meta">${p.mode === 'senior' ? 'Senior' : 'Junior'} · ${WL.Scoring.missionsCompleted(p)}/6 · ★ ${WL.Scoring.totalScore(p)}</span>
                      </button>`
                    )
                    .join('')}</div>
                </div>`
                : ''
            }
            <div class="welcome-links">
              <button class="link-btn" id="btn-lb" type="button">🏆 Leaderboard</button>
              <button class="link-btn" id="btn-org" type="button">🎤 Organisers</button>
            </div>
          </div>
        </div>`;

      const panel = el.querySelector('#welcome-panel');

      el.querySelector('#btn-start').addEventListener('click', () => {
        WL.Sound.play('select');
        showStory(panel);
      });
      el.querySelector('#btn-lb').addEventListener('click', () => WL.App.go('/leaderboard'));
      el.querySelector('#btn-org').addEventListener('click', () => WL.App.go('/organiser'));
      util.$$('.recent-agent', el).forEach((b) =>
        b.addEventListener('click', () => {
          const p = WL.Profiles.get(b.dataset.id);
          if (!p) return;
          WL.Sound.play('select');
          WL.App.setPlayer(p);
          UI.toast(`Welcome back, Agent ${esc(p.nickname)}!`, { icon: '👋' });
          WL.App.go(p.finished ? '/results' : '/map');
        })
      );

      // Light up the title village shortly after loading.
      const scene = el.querySelector('.title-village');
      const t = setTimeout(() => WL.Scenes.setState(scene, 'excellent'), 700);
      return () => clearTimeout(t);
    },
  };

  function showStory(panel) {
    panel.innerHTML = `
      <div class="step step-story">
        <div class="story-row">
          ${WL.Nova.html({ mood: 'neutral', size: 'lg', cls: 'story-nova' })}
          ${UI.bubbleHtml('story-bubble', 'bubble-lg')}
        </div>
        <div class="step-actions">
          <button class="btn btn-ghost" id="story-skip" type="button">Skip</button>
          <button class="btn btn-primary" id="story-next" type="button" disabled>Next ▶</button>
        </div>
      </div>`;
    panel.classList.add('wide');
    const bubble = panel.querySelector('#story-bubble');
    const nova = panel.querySelector('.story-nova');
    const next = panel.querySelector('#story-next');
    let index = 0;
    let typing = false;
    const play = () => {
      typing = true;
      next.disabled = false;
      next.textContent = index === STORY.length - 1 ? "Let's go! ▶" : 'Next ▶';
      UI.say(bubble, nova, STORY[index].text, STORY[index].mood).then(() => (typing = false));
    };
    next.addEventListener('click', () => {
      WL.Sound.play('click');
      if (typing) {
        bubble.querySelector('.bubble-text').click();
        return;
      }
      if (index < STORY.length - 1) {
        index += 1;
        play();
      } else showNickname(panel);
    });
    panel.querySelector('#story-skip').addEventListener('click', () => showNickname(panel));
    play();
  }

  function showNickname(panel) {
    const suggestion = WL.Profiles.randomNickname();
    panel.classList.remove('wide');
    panel.innerHTML = `
      <form class="step step-nick" id="nick-form" novalidate>
        <h2 class="step-title">Choose your agent name</h2>
        <p class="step-sub">Use a secret nickname, <strong>not</strong> your real name.</p>
        <div class="nick-row">
          <label class="sr-only" for="nick">Agent nickname</label>
          <input class="input input-xl" id="nick" name="nick" maxlength="${WL.Profiles.NICK_MAX}" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${esc(suggestion)}" />
          <button class="btn btn-icon" type="button" id="nick-dice" aria-label="Random nickname" title="Random nickname">🎲</button>
        </div>
        <p class="field-error" id="nick-error" role="alert"></p>
        <div class="step-actions">
          <button class="btn btn-primary btn-lg" type="submit">Next ▶</button>
        </div>
        <p class="privacy-note">🔒 We only save your nickname and scores, on this device. No names, emails or photos.</p>
      </form>`;
    const input = panel.querySelector('#nick');
    const error = panel.querySelector('#nick-error');
    panel.querySelector('#nick-dice').addEventListener('click', () => {
      WL.Sound.play('click');
      input.value = WL.Profiles.randomNickname();
      error.textContent = '';
      input.focus();
    });
    input.addEventListener('input', () => {
      const clean = WL.Profiles.sanitizeNickname(input.value);
      if (clean !== input.value.trim()) input.value = clean;
      error.textContent = '';
    });
    panel.querySelector('#nick-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const nick = WL.Profiles.sanitizeNickname(input.value || input.placeholder);
      const problem = WL.Profiles.validateNickname(nick);
      if (problem) {
        error.textContent = problem;
        WL.FX.shake(input);
        WL.Sound.play('fail');
        return;
      }
      WL.Sound.play('select');
      showMode(panel, nick);
    });
    setTimeout(() => input.focus(), 50);
  }

  function showMode(panel, nick) {
    panel.classList.add('wide');
    panel.innerHTML = `
      <div class="step step-mode">
        <h2 class="step-title">Agent ${esc(nick)}, pick your mission level</h2>
        <div class="mode-cards">
          <button class="mode-card mode-junior" type="button" data-mode="junior">
            <span class="mode-icon" aria-hidden="true">${WL.Nova.html({ mood: 'happy', size: 'md' })}</span>
            <span class="mode-name">Junior Agent</span>
            <span class="mode-age">Ages 8–11</span>
            <span class="mode-desc">Choose the best prompt from three options and watch what happens!</span>
            <span class="mode-go">Choose ▶</span>
          </button>
          <button class="mode-card mode-senior" type="button" data-mode="senior">
            <span class="mode-icon" aria-hidden="true">${WL.Nova.html({ mood: 'thinking', size: 'md' })}</span>
            <span class="mode-name">Senior Agent</span>
            <span class="mode-age">Ages 12–16</span>
            <span class="mode-desc">Write your own prompts and get them scored on the five parts of a great prompt.</span>
            <span class="mode-go">Choose ▶</span>
          </button>
        </div>
        <div class="step-actions"><button class="btn btn-ghost" id="mode-back" type="button">◀ Back</button></div>
      </div>`;
    panel.querySelector('#mode-back').addEventListener('click', () => showNickname(panel));
    util.$$('.mode-card', panel).forEach((card) =>
      card.addEventListener('click', () => {
        WL.Sound.play('success');
        WL.FX.burst(card, { count: 30 });
        const player = WL.Profiles.create(nick, card.dataset.mode);
        WL.App.setPlayer(player);
        setTimeout(() => WL.App.go('/map'), 350);
      })
    );
  }
})(typeof window !== 'undefined' ? window : globalThis);
