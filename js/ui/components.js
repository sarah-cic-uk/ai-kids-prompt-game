/*
 * Reusable UI pieces: toasts, modals, NOVA speech, prompt "anatomy"
 * highlighting, rubric meters, output cards, stars and badges.
 */
(function (root) {
  'use strict';
  const WL = (root.WL = root.WL || {});
  const { util } = WL;
  const esc = util.esc;

  const RUBRIC_ICON = { objective: '🎯', context: '🧭', instructions: '🛠', constraints: '🚧', format: '🧩' };
  const QUALITY = {
    excellent: { label: 'Excellent prompt', short: 'Excellent', icon: '★' },
    partial: { label: 'Partly worked', short: 'Partly', icon: '◐' },
    poor: { label: "Didn't work", short: 'Poor', icon: '✕' },
  };

  function rubricItem(key) {
    return WL.RUBRIC.find((r) => r.key === key);
  }

  const UI = {
    RUBRIC_ICON,
    QUALITY,

    /* ------------------------------------------------------- announcements */
    announce(text) {
      const el = document.getElementById('sr-live');
      if (!el) return;
      el.textContent = '';
      setTimeout(() => (el.textContent = text), 30);
    },

    /* --------------------------------------------------------------- toast */
    toast(message, opts) {
      const o = Object.assign({ icon: '✦', kind: '', ms: 3200 }, opts);
      const host = document.getElementById('toasts');
      const el = document.createElement('div');
      el.className = 'toast ' + o.kind;
      el.innerHTML = `<span class="toast-ico" aria-hidden="true">${o.icon}</span><span>${message}</span>`;
      host.appendChild(el);
      setTimeout(() => el.classList.add('out'), o.ms);
      setTimeout(() => el.remove(), o.ms + 400);
      return el;
    },

    /* --------------------------------------------------------------- modal */
    modal(opts) {
      const o = Object.assign({ title: '', body: '', actions: [], cls: '', dismissable: true, onClose: null, icon: '' }, opts);
      const rootEl = document.getElementById('modal-root');
      const lastFocus = document.activeElement;
      const wrap = document.createElement('div');
      wrap.className = 'modal-wrap';
      const titleId = util.uid('mt');
      wrap.innerHTML = `
        <div class="modal-backdrop"></div>
        <div class="modal panel ${o.cls}" role="dialog" aria-modal="true" aria-labelledby="${titleId}">
          ${o.dismissable ? '<button class="modal-x icon-btn" type="button" aria-label="Close">✕</button>' : ''}
          ${o.icon ? `<div class="modal-icon" aria-hidden="true">${o.icon}</div>` : ''}
          <h2 class="modal-title" id="${titleId}">${o.title}</h2>
          <div class="modal-body">${o.body}</div>
          <div class="modal-actions"></div>
        </div>`;
      const actionsEl = wrap.querySelector('.modal-actions');
      let closed = false;
      const close = (value) => {
        if (closed) return;
        closed = true;
        wrap.classList.add('out');
        document.removeEventListener('keydown', onKey);
        setTimeout(() => wrap.remove(), 220);
        if (lastFocus && lastFocus.focus) lastFocus.focus();
        if (o.onClose) o.onClose(value);
      };
      o.actions.forEach((a) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn ' + (a.kind || 'btn-ghost');
        b.innerHTML = a.label;
        b.addEventListener('click', () => {
          WL.Sound.play('click');
          const keep = a.onClick ? a.onClick(wrap) === false : false;
          if (!keep) close(a.value);
        });
        actionsEl.appendChild(b);
      });
      if (!o.actions.length) actionsEl.remove();
      const onKey = (e) => {
        if (e.key === 'Escape' && o.dismissable) close(null);
        if (e.key === 'Tab') {
          const f = util.$$('button, [href], input, textarea, select, [tabindex]:not([tabindex="-1"])', wrap).filter((x) => !x.disabled && x.offsetParent !== null);
          if (!f.length) return;
          const first = f[0];
          const last = f[f.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            last.focus();
            e.preventDefault();
          } else if (!e.shiftKey && document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      };
      document.addEventListener('keydown', onKey);
      if (o.dismissable) {
        wrap.querySelector('.modal-backdrop').addEventListener('click', () => close(null));
        wrap.querySelector('.modal-x').addEventListener('click', () => close(null));
      }
      rootEl.appendChild(wrap);
      requestAnimationFrame(() => {
        const focusEl = wrap.querySelector('[autofocus]') || wrap.querySelector('.modal-actions .btn-primary') || wrap.querySelector('.modal-actions .btn') || wrap.querySelector('.modal');
        if (focusEl) focusEl.focus({ preventScroll: true });
      });
      return { el: wrap, close };
    },

    confirm(opts) {
      return new Promise((resolve) => {
        UI.modal({
          title: opts.title,
          body: `<p>${opts.text}</p>`,
          icon: opts.icon || '',
          cls: 'modal-sm',
          onClose: (v) => resolve(v === true),
          actions: [
            { label: opts.cancel || 'Cancel', kind: 'btn-ghost', value: false },
            { label: opts.ok || 'OK', kind: opts.danger ? 'btn-danger' : 'btn-primary', value: true },
          ],
        });
      });
    },

    /* --------------------------------------------------------- NOVA speech */
    /**
     * Make NOVA say something in a speech bubble (typewriter).
     * Returns a promise resolving when typing finishes; tapping the bubble skips.
     */
    say(bubble, novaEl, text, mood) {
      if (novaEl && mood) WL.Nova.setMood(novaEl, mood);
      const textEl = bubble.querySelector('.bubble-text');
      if (bubble._tw) bubble._tw.skip();
      bubble.classList.remove('waiting');
      bubble.hidden = false;
      WL.Nova.setTalking(novaEl, true);
      const tw = util.typewrite(textEl, text, { speed: 20, onChar: () => WL.Sound.play('blip') });
      bubble._tw = tw;
      const skip = () => tw.skip();
      bubble.addEventListener('click', skip, { once: true });
      UI.announce('NOVA: ' + text);
      return tw.done.then(() => {
        bubble.removeEventListener('click', skip);
        WL.Nova.setTalking(novaEl, false);
      });
    },

    /** Play a sequence of {mood, text} lines; tap/Enter advances. Resolves when done or skipped. */
    dialogue(bubble, novaEl, lines, opts) {
      const o = Object.assign({ onSkip: null }, opts);
      let index = 0;
      let skipped = false;
      return new Promise((resolve) => {
        const next = bubble.querySelector('.bubble-next');
        const finish = () => {
          bubble.skipAll = null;
          bubble.classList.remove('waiting');
          bubble.removeEventListener('click', advance);
          document.removeEventListener('keydown', onKey);
          resolve(skipped);
        };
        let typing = false;
        const play = () => {
          const line = lines[index];
          typing = true;
          if (next) next.hidden = true;
          UI.say(bubble, novaEl, line.text, line.mood).then(() => {
            typing = false;
            if (index < lines.length - 1) {
              bubble.classList.add('waiting');
              if (next) next.hidden = false;
            } else finish();
          });
        };
        const advance = () => {
          if (typing || index >= lines.length - 1) return;
          bubble.classList.remove('waiting');
          index += 1;
          WL.Sound.play('click');
          play();
        };
        const onKey = (e) => {
          if (!document.body.contains(bubble)) return document.removeEventListener('keydown', onKey);
          if ((e.key === 'Enter' || e.key === ' ') && (e.target === document.body || e.target.id === 'app')) {
            e.preventDefault();
            advance();
          }
        };
        bubble.addEventListener('click', advance);
        document.addEventListener('keydown', onKey);
        bubble.skipAll = () => {
          skipped = true;
          if (bubble._tw) bubble._tw.skip();
          index = lines.length - 1;
          const textEl = bubble.querySelector('.bubble-text');
          textEl.textContent = lines[index].text;
          if (novaEl) WL.Nova.setMood(novaEl, lines[index].mood);
          finish();
        };
        play();
      });
    },

    bubbleHtml(id, cls) {
      return `<div class="bubble ${cls || ''}" id="${id}" hidden aria-live="off"><span class="bubble-name">NOVA</span><p class="bubble-text"></p><span class="bubble-next" hidden aria-hidden="true">▼</span></div>`;
    },

    /* ------------------------------------------------------ prompt anatomy */
    segmentsHtml(segments) {
      return segments
        .map(([key, text]) => {
          const r = rubricItem(key);
          return `<span class="seg seg-${key}" title="${esc(r ? r.label : key)}">${esc(text)}</span>`;
        })
        .join('');
    },

    legendHtml(keys) {
      const list = keys ? WL.RUBRIC.filter((r) => keys.includes(r.key)) : WL.RUBRIC;
      return `<ul class="legend">${list.map((r) => `<li class="legend-item lg-${r.key}"><span class="legend-dot" aria-hidden="true"></span>${esc(r.short)}</li>`).join('')}</ul>`;
    },

    anatomyHtml(segments, opts) {
      const o = Object.assign({ title: 'Prompt anatomy', note: '' }, opts);
      const keys = Array.from(new Set(segments.map((s) => s[0])));
      return `<div class="anatomy">
        <div class="anatomy-head">${esc(o.title)}</div>
        <p class="anatomy-text">${UI.segmentsHtml(segments)}</p>
        ${UI.legendHtml(keys)}
        ${o.note ? `<p class="anatomy-note">${o.note}</p>` : ''}
      </div>`;
    },

    fivePartsHtml(compact) {
      return `<ol class="five-parts ${compact ? 'compact' : ''}">${WL.RUBRIC.map(
        (r) => `<li class="fp fp-${r.key}"><span class="fp-ico" aria-hidden="true">${RUBRIC_ICON[r.key]}</span><span class="fp-body"><strong>${esc(r.label)}</strong>${compact ? '' : `<span>${esc(r.question)}</span>`}</span></li>`
      ).join('')}</ol>`;
    },

    /* ------------------------------------------------------- NOVA's output */
    outputHtml(output, opts) {
      const o = Object.assign({ title: "NOVA's output", status: '' }, opts);
      let body = '';
      if (output.table) {
        body = `<div class="out-table-wrap"><table class="out-table"><thead><tr>${output.table.head.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${output.table.rows
          .map((r, i) => `<tr style="--i:${i}">${r.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`)
          .join('')}</tbody></table></div>`;
      } else if (output.lines) {
        body = `<ul class="out-lines">${output.lines.map((l, i) => `<li style="--i:${i}" class="${/^[✘💥]/.test(l) ? 'bad' : /^[✔★]/.test(l) ? 'good' : ''}">${esc(l)}</li>`).join('')}</ul>`;
      } else if (output.text) {
        body = `<div class="out-text ${output.overflow ? 'overflow' : ''}"><p>${esc(output.text)}</p>${output.overflow ? '<span class="out-overflow-tag">⚠ Too long! It doesn\'t fit</span>' : ''}</div>`;
      }
      return `<div class="output-card ${o.status}"><div class="output-head"><span class="out-dot"></span><span class="out-dot"></span><span class="out-dot"></span><span class="output-title">${esc(o.title)}</span></div>${body}</div>`;
    },

    /* --------------------------------------------------------------- stars */
    starsHtml(n, cls) {
      return `<span class="stars ${cls || ''}" role="img" aria-label="${n} out of 3 stars">${[0, 1, 2]
        .map((i) => `<span class="star-ico ${i < n ? 'on' : ''}" style="--i:${i}" aria-hidden="true">★</span>`)
        .join('')}</span>`;
    },

    qualityTag(quality) {
      const q = QUALITY[quality];
      return `<span class="qtag q-${quality}"><span aria-hidden="true">${q.icon}</span> ${q.label}</span>`;
    },

    /* -------------------------------------------------------------- badges */
    badgeHtml(id, opts) {
      const a = WL.getAchievement(id);
      if (!a) return '';
      const o = Object.assign({ size: 'md', locked: false, mode: 'junior', showName: true }, opts);
      return `<span class="badge badge-${o.size} ${o.locked ? 'locked' : ''}" title="${esc(a.name)}: ${esc(WL.achievementDesc(a, o.mode))}">
        <span class="badge-ico" aria-hidden="true">${o.locked ? '🔒' : a.icon}</span>${o.showName ? `<span class="badge-name">${esc(a.name)}</span>` : `<span class="sr-only">${esc(a.name)}</span>`}
      </span>`;
    },

    badgeIconsHtml(ids, max) {
      const list = (ids || []).slice(0, max || 6);
      return list
        .map((id) => {
          const a = WL.getAchievement(id);
          return a ? `<span class="mini-badge" title="${esc(a.name)}" aria-label="${esc(a.name)}">${a.icon}</span>` : '';
        })
        .join('');
    },

    /* ---------------------------------------------------------- rubric UI */
    rubricHtml(criteria, opts) {
      const o = Object.assign({ compare: null }, opts);
      return `<ul class="rubric">${criteria
        .map((c, i) => {
          const prev = o.compare ? o.compare.find((x) => x.key === c.key) : null;
          const delta = prev ? c.score - prev.score : 0;
          return `<li class="rb rb-${c.key} st-${c.status}" style="--i:${i}">
            <div class="rb-top">
              <span class="rb-ico" aria-hidden="true">${RUBRIC_ICON[c.key]}</span>
              <span class="rb-label">${esc(c.label)}</span>
              ${delta > 0 ? `<span class="rb-delta up">+${delta}</span>` : delta < 0 ? `<span class="rb-delta down">${delta}</span>` : ''}
              <span class="rb-score"><strong>${c.score}</strong>/20</span>
            </div>
            <div class="rb-meter" role="meter" aria-valuemin="0" aria-valuemax="20" aria-valuenow="${c.score}" aria-label="${esc(c.label)}"><span style="--w:${(c.score / 20) * 100}%"></span></div>
            ${c.praise ? `<p class="rb-praise"><span aria-hidden="true">✔</span> ${esc(c.praise)}</p>` : ''}
            ${c.tip ? `<p class="rb-tip"><span aria-hidden="true">➜</span> ${esc(c.tip)}</p>` : ''}
          </li>`;
        })
        .join('')}</ul>`;
    },

    /** Animate rubric meters in sequence (call after insertion). */
    animateRubric(container) {
      const bars = util.$$('.rb', container);
      bars.forEach((b, i) => {
        setTimeout(() => {
          b.classList.add('in');
          if (WL.Sound) WL.Sound.play('blip');
        }, util.reducedMotion() ? 0 : 180 + i * 220);
      });
    },

    scoreBlockHtml(total, opts) {
      const o = Object.assign({ label: 'Prompt score', max: 100, stars: null, band: null, sub: '' }, opts);
      const stars = o.stars == null ? WL.Scoring.stars(total) : o.stars;
      return `<div class="score-block ${o.band ? 'band-' + o.band : ''}">
        <div class="score-label">${esc(o.label)}</div>
        <div class="score-num"><span class="score-val" data-to="${total}">0</span><span class="score-max">/${o.max}</span></div>
        ${UI.starsHtml(stars, 'score-stars')}
        ${o.sub ? `<div class="score-sub">${o.sub}</div>` : ''}
      </div>`;
    },

    /** Count up the score and pop the stars. */
    revealScore(container) {
      const val = container.querySelector('.score-val');
      if (!val) return Promise.resolve();
      const to = Number(val.dataset.to);
      return util.countUp(val, 0, to, 1100).then(() => {
        util.$$('.star-ico.on', container).forEach((s, i) =>
          setTimeout(() => {
            s.classList.add('pop');
            WL.Sound.play('star');
          }, i * 180)
        );
      });
    },
  };

  WL.UI = UI;
  // Screen registry: each js/screens/*.js file adds itself here; js/app.js routes to them.
  WL.Screens = WL.Screens || {};
})(typeof window !== 'undefined' ? window : globalThis);
