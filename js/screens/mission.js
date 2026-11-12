/*
 * Mission screen: runs one mission from briefing to completion.
 *
 * Junior flow:  briefing → pick a prompt → outcome → (one retry) → [check] → complete
 * Senior flow:  briefing → write a prompt → rubric feedback → (one refinement) → [check] → complete
 * The "check" step (missions 2, 4, 6) asks players to spot a mistake in
 * NOVA's output. It teaches that AI output must be checked, and earns badges.
 */
(function (root) {
  'use strict';
  const WL = (root.WL = root.WL || {});
  const { util, UI } = WL;
  const esc = util.esc;

  const LETTERS = ['A', 'B', 'C', 'D'];
  const CANCEL = { cancelled: true };

  WL.Screens.mission = {
    mount(el, params) {
      const App = WL.App;
      const m = WL.getMission(params[0]);
      if (!m) {
        setTimeout(() => App.go('/map'));
        return;
      }
      if (!WL.Profiles.isUnlocked(App.player, m.id, App.isPresenter())) {
        UI.toast('That node is still locked.', { icon: '🔒' });
        setTimeout(() => App.go('/map'));
        return;
      }
      const run = new MissionRun(el, m, App.player);
      run.start();
      return () => run.destroy();
    },
  };

  class MissionRun {
    constructor(el, mission, player) {
      this.el = el;
      this.m = mission;
      this.player = player;
      this.mode = player.mode;
      this.presenter = WL.App.isPresenter();
      this.alive = true;
    }

    destroy() {
      this.alive = false;
      if (this.bubble && this.bubble._tw) this.bubble._tw.skip();
    }

    guard() {
      if (!this.alive) throw CANCEL;
    }

    async start() {
      try {
        this.layout();
        await this.intro();
        const result = this.mode === 'senior' ? await this.runSenior() : await this.runJunior();
        this.guard();
        await this.complete(result);
      } catch (e) {
        if (e !== CANCEL) console.error(e);
      }
    }

    /* ------------------------------------------------------------ layout */
    steps() {
      const s = [
        { key: 'brief', label: 'Brief' },
        { key: 'prompt', label: 'Prompt' },
        { key: 'result', label: 'Result' },
      ];
      if (this.m.check) s.push({ key: 'check', label: 'Check' });
      if (this.mode === 'junior' && this.m.junior.stages.length > 2) s.push({ key: 'fix', label: 'Fix' });
      s.push({ key: 'done', label: 'Done' });
      return s;
    }

    layout() {
      const m = this.m;
      this.el.innerHTML = `
        <div class="mission-layout ${m.final ? 'is-final' : ''}">
          <header class="mission-head">
            <div class="mh-title">
              <span class="mh-num">${m.final ? 'Final mission' : 'Mission ' + m.id + ' of 6'}</span>
              <h1>${esc(m.title)}</h1>
            </div>
            <span class="chip chip-skill">🎓 ${esc(m.skill)}</span>
            <ol class="mh-steps" aria-label="Mission progress">${this.steps()
              .map((s) => `<li data-step="${s.key}"><span>${s.label}</span></li>`)
              .join('')}</ol>
          </header>
          <div class="stage">
            <div class="stage-scene panel-frame">
              ${WL.Scenes.html(m.scene, { progress: WL.Scoring.missionsCompleted(this.player) })}
              <div class="scan" aria-hidden="true"></div>
            </div>
            <div class="stage-nova">
              ${WL.Nova.html({ mood: 'neutral', size: 'md', cls: 'nova-float' })}
              ${UI.bubbleHtml('m-bubble')}
            </div>
          </div>
          <div class="console" id="console"></div>
        </div>`;
      this.sceneEl = this.el.querySelector('.scene');
      this.stageEl = this.el.querySelector('.stage-scene');
      this.novaEl = this.el.querySelector('.stage-nova .nova');
      this.bubble = this.el.querySelector('#m-bubble');
      this.console = this.el.querySelector('#console');
    }

    setStep(key) {
      const items = util.$$('.mh-steps li', this.el);
      const idx = items.findIndex((li) => li.dataset.step === key);
      items.forEach((li, i) => {
        li.classList.toggle('done', i < idx);
        li.classList.toggle('active', i === idx);
        if (i === idx) li.setAttribute('aria-current', 'step');
        else li.removeAttribute('aria-current');
      });
    }

    twoColumn() {
      return root.matchMedia('(min-width: 1000px)').matches;
    }

    show(html, cls) {
      this.console.innerHTML = `<div class="phase ${cls || ''}">${html}</div>`;
      const phase = this.console.firstElementChild;
      requestAnimationFrame(() => phase.classList.add('in'));
      return phase;
    }

    scrollTo(node, block) {
      if (!node || !node.scrollIntoView) return;
      node.scrollIntoView({ behavior: util.reducedMotion() ? 'auto' : 'smooth', block: block || 'start' });
    }

    /** Scroll so the scene is visible (single-column layouts only). */
    focusStage() {
      if (this.twoColumn()) return;
      const r = this.stageEl.getBoundingClientRect();
      if (r.top < 40 || r.bottom > root.innerHeight) this.scrollTo(this.el.querySelector('.stage'));
    }

    focusPhase(phase) {
      if (this.twoColumn()) {
        if (phase.getBoundingClientRect().top < 60) this.scrollTo(phase);
        return;
      }
      this.scrollTo(phase);
    }

    say(text, mood) {
      return UI.say(this.bubble, this.novaEl, text, mood);
    }

    async think(text) {
      WL.Nova.setMood(this.novaEl, 'thinking');
      if (this.bubble._tw) this.bubble._tw.skip();
      this.bubble.hidden = false;
      this.bubble.classList.remove('waiting');
      this.bubble.querySelector('.bubble-text').innerHTML = `${esc(text || 'Processing your prompt')}<span class="dots" aria-hidden="true"><i>.</i><i>.</i><i>.</i></span>`;
      this.stageEl.classList.add('scanning');
      this.focusStage();
      await util.sleep(util.reducedMotion() ? 250 : 1400);
      this.stageEl.classList.remove('scanning');
      this.guard();
    }

    react(quality) {
      WL.Scenes.setState(this.sceneEl, quality);
      if (quality === 'excellent') {
        WL.Sound.play('success');
        WL.FX.burst(this.stageEl, { count: 34 });
      } else if (quality === 'partial') {
        WL.Sound.play('partial');
      } else {
        WL.Sound.play('fail');
        WL.FX.shake(this.stageEl);
      }
    }

    /* --------------------------------------------------- shared snippets */
    intelHtml(open) {
      return `<details class="intel" ${open ? 'open' : ''}>
        <summary><span aria-hidden="true">📋</span> Mission intel</summary>
        <ul>${this.m.intel.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
      </details>`;
    }

    flawedHtml() {
      const f = this.m.flawed;
      return `<div class="flawed">
        <p class="flawed-prompt"><span>Someone asked:</span> “${esc(f.prompt)}”</p>
        ${UI.outputHtml({ lines: f.lines }, { title: f.title, status: 'st-broken' })}
      </div>`;
    }

    draftHtml() {
      const c = this.m.check;
      return `<div class="output-card st-draft">
        <div class="output-head"><span class="out-dot"></span><span class="out-dot"></span><span class="out-dot"></span><span class="output-title">${esc(c.title)}</span></div>
        <ul class="out-lines">${c.lines.map((l) => `<li class="${l.wrong ? 'flag' : ''}">${esc(l.text)}${l.wrong ? ' <span class="flag-tag">✘ wrong</span>' : ''}</li>`).join('')}</ul>
      </div>`;
    }

    presenterNotesHtml() {
      if (!this.presenter || !this.m.presenter) return '';
      return `<details class="presenter-notes" open>
        <summary>🎤 Presenter notes</summary>
        <p><strong>Key point:</strong> ${esc(this.m.presenter.point)}</p>
        <p><strong>Discuss:</strong> ${esc(this.m.presenter.question)}</p>
      </details>`;
    }

    compareHtml(stage) {
      if (!this.presenter) return '';
      return `<details class="compare">
        <summary>🎤 Compare all three prompts</summary>
        <ul class="compare-list">${stage.options
          .map(
            (o, i) => `<li class="q-${o.quality}">
              <div class="cmp-head"><span class="opt-letter">${LETTERS[i]}</span>${UI.qualityTag(o.quality)}<span class="cmp-pts">${o.score} pts</span></div>
              <p class="cmp-text">“${esc(o.text)}”</p>
              <p class="cmp-why">${esc(o.why)}</p>
            </li>`
          )
          .join('')}</ul>
      </details>`;
    }

    /* ------------------------------------------------------------- intro */
    intro() {
      return new Promise((resolve) => {
        const m = this.m;
        this.setStep('brief');
        const phase = this.show(
          `<div class="brief-card">
            <p class="brief-loc"><span aria-hidden="true">📍</span> ${esc(m.location)}</p>
            <h2 class="phase-title">Your mission</h2>
            <p class="brief-problem">${esc(m.problem)}</p>
            ${m.final ? '<p class="final-warn"><span aria-hidden="true">⚡</span> Final challenge: you\'ll need every skill you\'ve learned!</p>' : ''}
            ${this.intelHtml(this.mode === 'senior' || this.twoColumn())}
          </div>
          ${this.presenterNotesHtml()}
          <div class="phase-actions">
            <button class="btn btn-primary btn-lg" id="ready" type="button">${this.mode === 'senior' ? '✎ Write my prompt' : '▶ Choose a prompt'}</button>
          </div>`,
          'phase-brief'
        );
        UI.dialogue(this.bubble, this.novaEl, m.intro);
        phase.querySelector('#ready').addEventListener('click', () => {
          WL.Sound.play('select');
          if (this.bubble.skipAll) this.bubble.skipAll();
          resolve();
        });
      });
    }

    /* ============================================================ JUNIOR */
    async runJunior() {
      const stages = this.m.junior.stages.slice();
      if (this.m.check && !stages.some((s) => s.type === 'check')) stages.push({ type: 'check' });
      const scores = [];
      let shortSweet = false;
      let checkFirstTry;
      let afterCheck = false;

      for (const stage of stages) {
        this.guard();
        if (stage.type === 'check') {
          checkFirstTry = await this.runCheck();
          afterCheck = true;
          continue;
        }
        const pickStep = afterCheck ? 'fix' : 'prompt';
        const outStep = afterCheck ? 'fix' : 'result';
        this.setStep(pickStep);
        if (scores.length === 0 || afterCheck) {
          this.say(afterCheck ? 'Now tell me how to fix it. Which message works best?' : 'Which prompt should I follow, Agent? Choose carefully!', 'neutral');
        }
        const first = await this.pickOption(stage, []);
        this.setStep(outStep);
        const action = await this.juniorOutcome(stage, first, 1, null);
        let retry = null;
        if (action === 'retry') {
          this.setStep(pickStep);
          this.say('Have another look. Which one gives me everything I need?', 'neutral');
          retry = await this.pickOption(stage, [first.id]);
          this.setStep(outStep);
          await this.juniorOutcome(stage, retry, 2, first);
        }
        const sc = WL.Scoring.juniorStageScore(first, retry);
        scores.push(sc);
        if (WL.Scoring.juniorShortSweet(stage, first)) shortSweet = true;
      }

      const score = WL.Scoring.juniorMissionScore(scores);
      const base = Math.round(scores.reduce((s, x) => s + x.base, 0) / scores.length);
      return {
        mode: 'junior',
        score,
        base: Math.min(base, score),
        bonus: Math.max(0, score - base),
        improved: scores.some((s) => s.improved),
        firstTry: scores.every((s) => s.firstTry),
        shortSweet,
        checkFirstTry,
      };
    }

    pickOption(stage, disabled) {
      return new Promise((resolve) => {
        const phase = this.show(
          `<h2 class="phase-title">${esc(stage.prompt)}</h2>
          <p class="phase-sub">${disabled.length ? 'Pick a different prompt this time.' : 'Tap a prompt, then send it to NOVA.'}</p>
          ${stage.showFlawed ? this.flawedHtml() : ''}
          ${stage.showDraft ? this.draftHtml() : ''}
          <div class="options" role="radiogroup" aria-label="Prompt options">
            ${stage.options
              .map((o, i) => {
                const tried = disabled.includes(o.id);
                return `<button type="button" class="option ${tried ? 'tried' : ''}" role="radio" aria-checked="false" data-id="${o.id}" ${tried ? 'disabled' : ''} style="--i:${i}">
                  <span class="opt-letter" aria-hidden="true">${LETTERS[i]}</span>
                  <span class="opt-text">“${esc(o.text)}”</span>
                  ${tried ? '<span class="opt-tried">Tried</span>' : ''}
                </button>`;
              })
              .join('')}
          </div>
          ${stage.showFlawed || stage.showDraft ? '' : this.intelHtml(false)}
          <div class="phase-actions">
            <button class="btn btn-primary btn-lg" id="send" type="button" disabled>Send to NOVA ▶</button>
          </div>`,
          'phase-choose'
        );
        let selected = null;
        const send = phase.querySelector('#send');
        const buttons = util.$$('.option', phase);
        buttons.forEach((b) =>
          b.addEventListener('click', () => {
            if (b.disabled) return;
            selected = stage.options.find((o) => o.id === b.dataset.id);
            buttons.forEach((x) => {
              x.classList.toggle('selected', x === b);
              x.setAttribute('aria-checked', String(x === b));
            });
            send.disabled = false;
            send.classList.add('btn-glow');
            WL.Sound.play('select');
            if (!this.twoColumn()) {
              const r = send.getBoundingClientRect();
              if (r.bottom > root.innerHeight) this.scrollTo(send, 'center');
            }
          })
        );
        send.addEventListener('click', () => {
          if (!selected) return;
          send.disabled = true;
          WL.Sound.play('whoosh');
          resolve(selected);
        });
        if (disabled.length) this.focusPhase(phase);
      });
    }

    async juniorOutcome(stage, option, attempt, firstOption) {
      await this.think('Following your prompt');
      this.react(option.quality);
      this.say(option.speech, option.mood);

      const isBest = option.quality === 'excellent';
      const canRetry = !isBest && attempt === 1;
      const best = stage.options.find((o) => o.quality === 'excellent');
      const sc = attempt === 2 ? WL.Scoring.juniorStageScore(firstOption, option) : null;
      const points =
        attempt === 1
          ? `<span class="outcome-points">+${option.score}</span>`
          : sc.bonus
            ? `<span class="outcome-points bonus">Learning bonus +${sc.bonus}</span>`
            : '<span class="outcome-points none">No bonus this time</span>';

      const phase = this.show(
        `<div class="outcome-head q-${option.quality}">
          ${UI.qualityTag(option.quality)}
          ${points}
        </div>
        ${UI.outputHtml(option.output, { status: 'st-' + option.quality })}
        <div class="explain q-${option.quality}">
          <h3>${esc(option.title)}</h3>
          <p>${esc(option.why)}</p>
          ${isBest && option.segments ? UI.anatomyHtml(option.segments, { title: 'Why it works', note: 'Each colour is one part of a great prompt.' }) : ''}
        </div>
        <div class="reveal-best" ${canRetry || isBest ? 'hidden' : ''}>
          ${best ? `<h3 class="mini-head">The best prompt was…</h3>${UI.anatomyHtml(best.segments, { title: 'Prompt anatomy' })}<p class="reveal-why">${esc(best.why)}</p>` : ''}
        </div>
        ${this.compareHtml(stage)}
        <div class="phase-actions">
          ${
            canRetry
              ? `<button class="btn btn-ghost" id="show-best" type="button">Show me the best</button>
                 <button class="btn btn-primary btn-glow" id="retry" type="button">↻ Try again <small>(+bonus)</small></button>`
              : '<button class="btn btn-primary" id="continue" type="button">Continue ▶</button>'
          }
        </div>`,
        'phase-outcome'
      );
      if (isBest) WL.FX.floatText(phase.querySelector('.outcome-points'), '+' + option.score, 'gold');

      await util.sleep(this.twoColumn() || util.reducedMotion() ? 0 : 1300);
      this.guard();
      this.focusPhase(phase);

      return new Promise((resolve) => {
        const on = (id, fn) => {
          const b = phase.querySelector('#' + id);
          if (b) b.addEventListener('click', fn);
        };
        on('continue', () => {
          WL.Sound.play('click');
          resolve('continue');
        });
        on('retry', () => {
          WL.Sound.play('click');
          resolve('retry');
        });
        on('show-best', () => {
          WL.Sound.play('click');
          const reveal = phase.querySelector('.reveal-best');
          reveal.hidden = false;
          phase.querySelector('.phase-actions').innerHTML = '<button class="btn btn-primary" id="continue" type="button">Continue ▶</button>';
          on('continue', () => {
            WL.Sound.play('click');
            resolve('continue');
          });
          this.scrollTo(reveal, 'center');
        });
      });
    }

    /* ============================================================ SENIOR */
    async runSenior() {
      let first = null;
      let second = null;
      let action = 'continue';

      this.setStep('prompt');
      this.say("Write me a prompt, Agent. I'll score it on the five parts of a great prompt.", 'neutral');
      const text1 = await this.writePrompt(1, null);
      this.setStep('result');
      first = await this.evaluate(text1, 1);
      action = await this.seniorOutcome(first, null, 1);

      if (action === 'refine') {
        this.setStep('prompt');
        this.say('Use my feedback to make it even better!', 'happy');
        const text2 = await this.writePrompt(2, { text: text1, evaluation: first });
        this.setStep('result');
        second = await this.evaluate(text2, 2);
        await this.seniorOutcome(second, first, 2);
      }

      const sc = WL.Scoring.seniorMissionScore(first, second);
      const bestEval = second && second.total > first.total ? second : first;
      let checkFirstTry;
      if (this.m.check) checkFirstTry = await this.runCheck();
      return {
        mode: 'senior',
        score: sc.score,
        base: sc.best,
        bonus: sc.bonus,
        improved: sc.improved,
        firstTry: first.total >= WL.CONFIG.highScore,
        attempts: second ? [first.total, second.total] : [first.total],
        shortSweet: WL.Scoring.seniorShortSweet(this.m, bestEval),
        checkFirstTry,
      };
    }

    async evaluate(text, attempt) {
      const [ev] = await Promise.all([WL.Evaluator.evaluate(this.m, text, { attempt }), this.think('Analysing your prompt')]);
      this.guard();
      return ev;
    }

    writePrompt(attempt, prev) {
      return new Promise((resolve) => {
        const s = this.m.senior;
        const refineTips = prev
          ? prev.evaluation.criteria.filter((c) => c.tip).map((c) => `<li class="tip-${c.key}"><span aria-hidden="true">${UI.RUBRIC_ICON[c.key]}</span> ${esc(c.tip)}</li>`)
          : [];
        if (prev && prev.evaluation.focus.note) refineTips.push(`<li class="tip-focus"><span aria-hidden="true">✂</span> ${esc(prev.evaluation.focus.note)}</li>`);

        const phase = this.show(
          `<h2 class="phase-title">${attempt === 1 ? esc(s.task) : '✎ Refine your prompt'}</h2>
          ${
            attempt === 2
              ? `<p class="phase-sub">Edit your prompt using NOVA's tips. Your best score counts, and improving by ${WL.Scoring.SENIOR_BONUS_THRESHOLD}+ points earns a bonus!</p>
                 ${refineTips.length ? `<div class="refine-tips"><h3 class="mini-head">NOVA's tips</h3><ul>${refineTips.join('')}</ul></div>` : ''}`
              : ''
          }
          ${s.showFlawed ? this.flawedHtml() : ''}
          ${this.intelHtml(attempt === 1)}
          <details class="guide" ${attempt === 1 && this.m.id === 1 ? 'open' : ''}>
            <summary><span aria-hidden="true">🧩</span> The 5 parts of a great prompt</summary>
            ${UI.fivePartsHtml()}
            <p class="guide-note">Longer isn't better! Every word should help NOVA.</p>
          </details>
          ${
            attempt === 1
              ? `<div class="hints">
                  <button class="btn btn-small btn-ghost" id="hint" type="button">💡 Need a hint? <span class="hint-count">(0/${s.hints.length})</span></button>
                  <ul class="hint-list" aria-live="polite"></ul>
                </div>`
              : ''
          }
          <div class="composer">
            <label class="composer-label" for="prompt-box">Your prompt to NOVA</label>
            <textarea id="prompt-box" class="input composer-box" rows="5" maxlength="1500" placeholder="Type your instructions for NOVA…" spellcheck="true"></textarea>
            <div class="composer-meta">
              <span class="wc" id="wc">0 words</span>
              <span class="wc-aim">Aim for about ${s.wordBudget} words or fewer</span>
            </div>
          </div>
          ${
            this.presenter
              ? `<div class="presenter-tools">
                  <span>🎤 Demo:</span>
                  <button class="btn btn-small btn-ghost" data-fill="weak" type="button">Fill a weak prompt</button>
                  <button class="btn btn-small btn-ghost" data-fill="strong" type="button">Fill a strong prompt</button>
                </div>`
              : ''
          }
          <div class="phase-actions">
            <span class="send-hint" id="send-hint">Write at least 3 words</span>
            <button class="btn btn-primary btn-lg" id="send" type="button" disabled>Send to NOVA ▶</button>
          </div>`,
          'phase-write'
        );

        const box = phase.querySelector('#prompt-box');
        const wc = phase.querySelector('#wc');
        const send = phase.querySelector('#send');
        const sendHint = phase.querySelector('#send-hint');
        const update = () => {
          const n = WL.LocalEvaluator.countWords(box.value);
          wc.textContent = n + (n === 1 ? ' word' : ' words');
          wc.classList.toggle('over', n > s.wordBudget * 1.5);
          wc.classList.toggle('good', n >= 8 && n <= s.wordBudget);
          send.disabled = n < 3;
          send.classList.toggle('btn-glow', n >= 3);
          sendHint.hidden = n >= 3;
        };
        box.addEventListener('input', update);
        box.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && (e.ctrlKey || e.metaKey) && !send.disabled) {
            e.preventDefault();
            send.click();
          }
        });
        if (prev) box.value = prev.text;
        update();

        const hintBtn = phase.querySelector('#hint');
        if (hintBtn) {
          let shown = 0;
          const list = phase.querySelector('.hint-list');
          hintBtn.addEventListener('click', () => {
            if (shown >= s.hints.length) return;
            const [key, text] = s.hints[shown];
            shown += 1;
            WL.Sound.play('blip');
            list.insertAdjacentHTML('beforeend', `<li class="hint tip-${key}"><span aria-hidden="true">${UI.RUBRIC_ICON[key]}</span> ${esc(text)}</li>`);
            hintBtn.querySelector('.hint-count').textContent = `(${shown}/${s.hints.length})`;
            if (shown >= s.hints.length) hintBtn.disabled = true;
          });
        }

        util.$$('[data-fill]', phase).forEach((b) =>
          b.addEventListener('click', () => {
            const partial = this.m.junior.stages[0].options.find((o) => o.quality === 'partial');
            box.value = b.dataset.fill === 'strong' ? s.modelText : partial.text;
            update();
            box.focus();
          })
        );

        send.addEventListener('click', () => {
          const text = box.value.trim();
          if (prev && WL.LocalEvaluator.normalise(text) === WL.LocalEvaluator.normalise(prev.text)) {
            UI.toast('Change something first. Use NOVA\'s tips!', { icon: '✎' });
            WL.FX.shake(box);
            return;
          }
          send.disabled = true;
          WL.Sound.play('whoosh');
          resolve(text);
        });

        if (attempt === 2) {
          this.focusPhase(phase);
          setTimeout(() => box.focus({ preventScroll: true }), 250);
        }
      });
    }

    async seniorOutcome(ev, prevEv, attempt) {
      const out = this.m.senior.outcomes[ev.band];
      this.react(ev.band);
      const speech = ev.flag === 'unkind' ? "That wasn't very kind! I work best with friendly, clear instructions." : ev.flag === 'too-short' ? "Hmm, that's too short. I don't know what you want!" : out.speech;
      this.say(speech, ev.flag ? 'disappointed' : out.mood);

      const cmp = prevEv ? WL.Evaluator.compare(prevEv, ev) : null;
      const canRefine = attempt === 1 && ev.total < 100;
      const final = !canRefine;
      let deltaLine = '';
      if (cmp) {
        if (cmp.delta > 0) deltaLine = `<p class="fb-delta up">▲ +${cmp.delta} points better than your first try!${cmp.delta >= WL.Scoring.SENIOR_BONUS_THRESHOLD ? ` Improvement bonus: +${WL.Scoring.SENIOR_LEARNING_BONUS}` : ''}</p>`;
        else if (cmp.delta < 0) deltaLine = `<p class="fb-delta down">▼ ${cmp.delta} points. Don't worry, your best score (${prevEv.total}) still counts.</p>`;
        else deltaLine = '<p class="fb-delta">Same score as your first try. Your best score still counts.</p>';
      }
      const words = `📝 ${ev.words} word${ev.words === 1 ? '' : 's'}${ev.focus.withinBudget && ev.total >= 45 ? ' · nice and focused ✔' : ''}`;

      const phase = this.show(
        `${UI.outputHtml(out.output, { status: 'st-' + ev.band, title: "NOVA's output" })}
        <div class="fb-top">
          ${UI.scoreBlockHtml(ev.total, { band: ev.band, label: attempt === 1 ? 'Prompt score' : 'Refined score' })}
          <div class="fb-summary">
            ${UI.qualityTag(ev.band)}
            <p class="fb-sum-text">${esc(ev.summary)}</p>
            ${deltaLine}
            <p class="fb-words">${words}</p>
          </div>
        </div>
        <h3 class="mini-head">How your prompt scored</h3>
        ${UI.rubricHtml(ev.criteria, { compare: prevEv ? prevEv.criteria : null })}
        ${ev.focus.penalty ? `<div class="focus-note"><strong>✂ Focus check −${ev.focus.penalty}</strong> ${esc(ev.focus.note || '')}</div>` : ''}
        ${canRefine && ev.topTip ? `<div class="top-tip"><strong>💡 Top tip:</strong> ${esc(ev.topTip.text)}${ev.topTip.principle ? `<span class="tt-principle">${esc(ev.topTip.principle)}</span>` : ''}</div>` : ''}
        ${final ? this.modelPromptHtml() : ''}
        <div class="phase-actions">
          ${
            canRefine
              ? `<button class="btn btn-ghost" id="continue" type="button">Continue ▶</button>
                 <button class="btn btn-primary btn-glow" id="refine" type="button">✎ Refine my prompt</button>`
              : '<button class="btn btn-primary" id="continue" type="button">Continue ▶</button>'
          }
        </div>`,
        'phase-feedback band-' + ev.band
      );

      await util.sleep(this.twoColumn() || util.reducedMotion() ? 0 : 1300);
      this.guard();
      this.focusPhase(phase);
      UI.revealScore(phase);
      UI.animateRubric(phase);

      return new Promise((resolve) => {
        phase.querySelector('#continue').addEventListener('click', () => {
          WL.Sound.play('click');
          resolve('continue');
        });
        const refine = phase.querySelector('#refine');
        if (refine)
          refine.addEventListener('click', () => {
            WL.Sound.play('click');
            resolve('refine');
          });
      });
    }

    modelPromptHtml() {
      const s = this.m.senior;
      const words = WL.LocalEvaluator.countWords(s.modelText);
      return `<details class="model" open>
        <summary><span aria-hidden="true">👀</span> One way an expert agent might write it</summary>
        ${UI.anatomyHtml(s.modelPrompt, { title: 'Example prompt', note: `${words} words, and every part has a job. Yours doesn't need to match. There are lots of good prompts!` })}
      </details>`;
    }

    /* ============================================================= CHECK */
    runCheck() {
      return new Promise((resolve) => {
        const c = this.m.check;
        this.setStep('check');
        this.say(c.intro, 'neutral');
        const phase = this.show(
          `<h2 class="phase-title">🔍 Check NOVA's work</h2>
          <p class="phase-sub">AI can sound sure of itself and still be wrong. Tap the line with the mistake.</p>
          <div class="output-card check-card">
            <div class="output-head"><span class="out-dot"></span><span class="out-dot"></span><span class="out-dot"></span><span class="output-title">${esc(c.title)}</span></div>
            <ul class="check-lines">${c.lines
              .map((l, i) => `<li><button type="button" class="check-line" data-i="${i}"><span class="cl-text">${esc(l.text)}</span><span class="cl-mark" aria-hidden="true"></span></button></li>`)
              .join('')}</ul>
          </div>
          <div class="check-actions"><button class="btn btn-small btn-ghost" id="all-good" type="button">✔ It all looks correct</button></div>
          <p class="check-hint" id="check-hint" hidden></p>
          ${this.intelHtml(true)}
          <div class="check-explain" id="check-explain" hidden></div>
          <div class="phase-actions"><button class="btn btn-primary" id="continue" type="button" hidden>Continue ▶</button></div>`,
          'phase-check'
        );
        this.focusPhase(phase);
        let misses = 0;
        let found = false;
        const hint = phase.querySelector('#check-hint');
        const showHint = () => {
          hint.hidden = false;
          hint.innerHTML = `💡 ${esc(c.hint)}`;
        };
        util.$$('.check-line', phase).forEach((b) =>
          b.addEventListener('click', () => {
            if (found) return;
            const line = c.lines[Number(b.dataset.i)];
            if (line.wrong) {
              found = true;
              b.classList.add('found');
              b.querySelector('.cl-mark').textContent = '✘';
              if (line.fix) b.insertAdjacentHTML('beforeend', `<span class="cl-fix">✔ ${esc(line.fix)}</span>`);
              util.$$('.check-line', phase).forEach((x) => (x.disabled = true));
              phase.querySelector('#all-good').disabled = true;
              hint.hidden = true;
              WL.Sound.play('success');
              WL.FX.burst(b, { count: 22, kind: 'sparkle' });
              const first = misses === 0;
              const ex = phase.querySelector('#check-explain');
              ex.hidden = false;
              ex.innerHTML = `<h3>${first ? '👀 Sharp eyes, first try!' : '🔍 Found it!'}</h3><p>${esc(c.explain)}</p>`;
              this.say(first ? "Whoa, you're right! I got that wrong. Good thing you checked!" : 'You found it! I made a mistake there. Thanks for checking!', 'surprised');
              const cont = phase.querySelector('#continue');
              cont.hidden = false;
              cont.addEventListener('click', () => {
                WL.Sound.play('click');
                resolve(first);
              });
              setTimeout(() => this.scrollTo(ex, 'center'), 300);
            } else {
              misses += 1;
              b.classList.add('ok');
              b.disabled = true;
              b.querySelector('.cl-mark').textContent = '✔';
              WL.Sound.play('partial');
              WL.FX.shake(b);
              this.say('That line is correct. Look again!', 'confused');
              showHint();
            }
          })
        );
        phase.querySelector('#all-good').addEventListener('click', () => {
          if (found) return;
          misses += 1;
          WL.Sound.play('fail');
          this.say('Are you sure? Check every detail against the intel!', 'confused');
          showHint();
        });
      });
    }

    /* ========================================================== COMPLETE */
    async complete(result) {
      const App = WL.App;
      const m = this.m;
      const p = this.player;
      this.setStep('done');
      const before = WL.Scoring.totalScore(p);
      const summary = WL.Scoring.recordMission(p, m.id, result);
      App.savePlayer();
      App.bumpHudScore(before, summary.after);

      WL.Scenes.setState(this.sceneEl, m.final ? 'restored' : 'excellent');
      WL.Sound.play(m.final ? 'power' : 'fanfare');
      WL.FX.rain(m.final ? 1800 : 900);
      this.say(m.complete, 'happy');

      const next = WL.getMission(m.id + 1);
      const modeName = this.mode === 'senior' ? 'Senior' : 'Junior';
      const breakdown =
        result.bonus > 0
          ? `${result.base} ${this.mode === 'senior' ? 'best prompt' : 'prompt points'} + ${result.bonus} learning bonus`
          : this.mode === 'senior' && result.attempts && result.attempts.length > 1
            ? `Best of your two prompts`
            : '';
      let streakLine;
      if (summary.high) {
        streakLine = summary.streak >= 2 ? `<div class="streak-line hot">🔥 ${summary.streak} high scores in a row!</div>` : '<div class="streak-line">🔥 Streak started! Score 80+ again to keep it going.</div>';
      } else {
        streakLine = '<div class="streak-line cold">❄ Score 80+ to start a high-score streak.</div>';
      }
      const bestNote = summary.keptPrevious ? `<p class="best-note">Your best score for this mission is still <strong>${summary.missionScore}</strong>.</p>` : '';

      const phase = this.show(
        `<div class="complete-banner">
          <span class="cb-small">${m.final ? 'Winterlight Network restored' : 'Node ' + m.id + ' restored'}</span>
          <span class="cb-big">Mission complete!</span>
        </div>
        <div class="complete-grid">
          ${UI.scoreBlockHtml(result.score, { label: 'Mission score', sub: breakdown })}
          <div class="complete-info">
            ${streakLine}
            ${bestNote}
            <p class="lb-line" id="lb-line">${this.presenter ? '🎤 Presenter mode: scores are not saved.' : ''}</p>
          </div>
        </div>
        ${
          summary.newBadges.length
            ? `<div class="new-badges"><h3 class="mini-head">New badge${summary.newBadges.length > 1 ? 's' : ''}!</h3>
                <div class="badge-row">${summary.newBadges.map((id, i) => `<span class="badge-pop" style="--i:${i}">${UI.badgeHtml(id, { mode: this.mode })}</span>`).join('')}</div></div>`
            : ''
        }
        <div class="lesson-card">
          <span class="lesson-ico" aria-hidden="true">🎓</span>
          <div><strong>Skill unlocked: ${esc(m.skill)}</strong><p>${esc(m.lesson)}</p></div>
        </div>
        ${this.presenterNotesHtml()}
        <div class="phase-actions">
          <button class="btn btn-ghost" id="to-map" type="button">🗺 Map</button>
          ${
            m.final
              ? '<button class="btn btn-primary btn-glow" id="to-results" type="button">🌟 Celebrate!</button>'
              : next
                ? `<button class="btn btn-primary btn-glow" id="to-next" type="button">Next mission ▶</button>`
                : ''
          }
        </div>`,
        'phase-complete'
      );

      await util.sleep(this.twoColumn() || util.reducedMotion() ? 0 : 1100);
      this.guard();
      this.focusPhase(phase);
      UI.revealScore(phase);
      summary.newBadges.forEach((id, i) =>
        setTimeout(() => {
          if (!this.alive) return;
          WL.Sound.play('badge');
          const a = WL.getAchievement(id);
          UI.toast(`Badge unlocked: <strong>${esc(a.name)}</strong>`, { icon: a.icon, kind: 'toast-badge' });
        }, 900 + i * 700)
      );

      phase.querySelector('#to-map').addEventListener('click', () => App.go('/map'));
      const toNext = phase.querySelector('#to-next');
      if (toNext) toNext.addEventListener('click', () => App.go('/mission/' + next.id));
      const toResults = phase.querySelector('#to-results');
      if (toResults) toResults.addEventListener('click', () => App.go('/results'));

      const pos = await App.submitScore();
      const lb = phase.querySelector('#lb-line');
      if (pos && lb && this.alive) lb.innerHTML = `🏆 You're <strong>${util.ordinal(pos)}</strong> on the ${modeName} leaderboard!`;
    }
  }

  WL.MissionRun = MissionRun;
})(typeof window !== 'undefined' ? window : globalThis);
