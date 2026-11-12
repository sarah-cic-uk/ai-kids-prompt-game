/* Small DOM and timing helpers shared by the UI. */
(function (root) {
  'use strict';
  const WL = (root.WL = root.WL || {});

  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

  const util = {
    esc(value) {
      return String(value == null ? '' : value).replace(/[&<>"']/g, (c) => ESC[c]);
    },
    $(sel, scope) {
      return (scope || document).querySelector(sel);
    },
    $$(sel, scope) {
      return Array.from((scope || document).querySelectorAll(sel));
    },
    sleep(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    },
    clamp(n, min, max) {
      return Math.max(min, Math.min(max, n));
    },
    uid(prefix) {
      const rand = Math.random().toString(36).slice(2, 8);
      return (prefix || 'id') + '-' + Date.now().toString(36) + '-' + rand;
    },
    pick(list) {
      return list[Math.floor(Math.random() * list.length)];
    },
    reducedMotion() {
      return !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
    },
    ordinal(n) {
      const s = ['th', 'st', 'nd', 'rd'];
      const v = n % 100;
      return n + (s[(v - 20) % 10] || s[v] || s[0]);
    },

    /**
     * Type text into an element one character at a time.
     * Returns { done: Promise, skip() } so a tap can finish it instantly.
     */
    typewrite(el, text, opts) {
      const o = Object.assign({ speed: 22, onChar: null }, opts);
      let i = 0;
      let timer = null;
      let finish;
      const done = new Promise((resolve) => (finish = resolve));
      const complete = () => {
        clearTimeout(timer);
        el.textContent = text;
        el.classList.remove('typing');
        finish();
      };
      if (util.reducedMotion() || o.speed <= 0) {
        complete();
        return { done, skip: complete };
      }
      el.textContent = '';
      el.classList.add('typing');
      const step = () => {
        i += 1;
        el.textContent = text.slice(0, i);
        if (o.onChar && i % 3 === 0 && text[i - 1] !== ' ') o.onChar();
        if (i >= text.length) return complete();
        const ch = text[i - 1];
        const pause = /[.!?]/.test(ch) ? o.speed * 9 : ch === ',' ? o.speed * 4 : o.speed;
        timer = setTimeout(step, pause);
      };
      timer = setTimeout(step, o.speed);
      return { done, skip: complete };
    },

    /** Animate a number in an element from `from` to `to`. */
    countUp(el, from, to, ms) {
      if (!el) return Promise.resolve();
      if (util.reducedMotion() || from === to) {
        el.textContent = to;
        return Promise.resolve();
      }
      const start = performance.now();
      const dur = ms || 900;
      return new Promise((resolve) => {
        const tick = (now) => {
          const t = Math.min(1, (now - start) / dur);
          const eased = 1 - Math.pow(1 - t, 3);
          el.textContent = Math.round(from + (to - from) * eased);
          if (t < 1) requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      });
    },

    /** Trigger a download of text content (organiser exports). */
    download(filename, content, type) {
      const blob = new Blob([content], { type: type || 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
  };

  WL.util = util;
})(typeof window !== 'undefined' ? window : globalThis);
