/*
 * Visual effects: background snowfall (canvas), confetti/sparkle bursts,
 * floating score text and screen shake. Everything respects
 * prefers-reduced-motion.
 */
(function (root) {
  'use strict';
  const WL = (root.WL = root.WL || {});
  const { util } = WL;

  /* ----------------------------------------------------------- snowfall */
  const Snow = {
    canvas: null,
    ctx: null,
    flakes: [],
    intensity: 1,
    running: false,
    last: 0,

    init(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.resize();
      root.addEventListener('resize', () => this.resize());
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) this.running = false;
        else this.start();
      });
      this.start();
    },
    resize() {
      const c = this.canvas;
      const dpr = Math.min(root.devicePixelRatio || 1, 2);
      c.width = Math.floor(root.innerWidth * dpr / 3);
      c.height = Math.floor(root.innerHeight * dpr / 3);
      this.scale = dpr / 3;
      const target = Math.round(Math.min(140, (root.innerWidth * root.innerHeight) / 9000) * this.intensity);
      while (this.flakes.length < target) this.flakes.push(this.flake(true));
      this.flakes.length = Math.min(this.flakes.length, target);
    },
    flake(anywhere) {
      const c = this.canvas;
      const depth = Math.random();
      return {
        x: Math.random() * c.width,
        y: anywhere ? Math.random() * c.height : -2,
        size: depth > 0.85 ? 2 : 1,
        speed: (8 + depth * 22) * (c.height / 300),
        drift: (Math.random() - 0.5) * 6,
        phase: Math.random() * Math.PI * 2,
        alpha: 0.35 + depth * 0.6,
      };
    },
    setIntensity(n) {
      this.intensity = n;
      this.resize();
    },
    start() {
      if (this.running || util.reducedMotion()) return;
      this.running = true;
      this.last = performance.now();
      const loop = (now) => {
        if (!this.running) return;
        const dt = Math.min(0.05, (now - this.last) / 1000);
        this.last = now;
        this.draw(dt, now / 1000);
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    },
    draw(dt, t) {
      const { ctx, canvas } = this;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const f of this.flakes) {
        f.y += f.speed * dt;
        f.x += (f.drift + Math.sin(t + f.phase) * 4) * dt;
        if (f.y > canvas.height + 2) Object.assign(f, this.flake(false));
        if (f.x < -2) f.x = canvas.width + 1;
        if (f.x > canvas.width + 2) f.x = -1;
        ctx.globalAlpha = f.alpha;
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(Math.round(f.x), Math.round(f.y), f.size, f.size);
      }
      ctx.globalAlpha = 1;
    },
  };

  /* -------------------------------------------------------------- bursts */
  const COLORS = ['#ffd166', '#3ee6e0', '#ff7eb6', '#5fd38d', '#b388ff', '#ffffff'];

  function layer() {
    return document.getElementById('fx');
  }

  function centreOf(target) {
    if (!target) return { x: root.innerWidth / 2, y: root.innerHeight / 2 };
    const r = target.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  /** Pixel confetti from a point (or element). kind: 'confetti' | 'sparkle' | 'snow' */
  function burst(target, opts) {
    if (util.reducedMotion()) return;
    const o = Object.assign({ count: 26, kind: 'confetti', spread: 1 }, opts);
    const { x, y } = target && target.x != null ? target : centreOf(target);
    const fx = layer();
    for (let i = 0; i < o.count; i += 1) {
      const p = document.createElement('i');
      p.className = 'particle p-' + o.kind;
      const angle = Math.random() * Math.PI * 2;
      const dist = (60 + Math.random() * 140) * o.spread;
      p.style.left = x + 'px';
      p.style.top = y + 'px';
      p.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
      p.style.setProperty('--dy', Math.sin(angle) * dist - 40 + 'px');
      p.style.setProperty('--rot', Math.round(Math.random() * 720 - 360) + 'deg');
      p.style.setProperty('--c', o.kind === 'snow' ? '#ffffff' : util.pick(COLORS));
      p.style.animationDelay = Math.random() * 120 + 'ms';
      fx.appendChild(p);
      setTimeout(() => p.remove(), 1600);
    }
  }

  /** Confetti raining across the whole screen (celebrations). */
  function rain(duration) {
    if (util.reducedMotion()) return;
    const fx = layer();
    const n = Math.min(120, Math.round(root.innerWidth / 8));
    for (let i = 0; i < n; i += 1) {
      const p = document.createElement('i');
      p.className = 'particle p-rain';
      p.style.left = Math.random() * 100 + 'vw';
      p.style.setProperty('--c', util.pick(COLORS));
      p.style.setProperty('--rot', Math.round(Math.random() * 900) + 'deg');
      p.style.setProperty('--sway', Math.round(Math.random() * 80 - 40) + 'px');
      p.style.animationDuration = 1.8 + Math.random() * 1.8 + 's';
      p.style.animationDelay = Math.random() * (duration || 1200) + 'ms';
      fx.appendChild(p);
      setTimeout(() => p.remove(), 5200);
    }
  }

  /** Floating text such as "+100". */
  function floatText(target, text, cls) {
    const { x, y } = centreOf(target);
    const el = document.createElement('div');
    el.className = 'float-text ' + (cls || '');
    el.textContent = text;
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    layer().appendChild(el);
    setTimeout(() => el.remove(), 1500);
  }

  function shake(el) {
    if (!el || util.reducedMotion()) return;
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
    setTimeout(() => el.classList.remove('shake'), 600);
  }

  function flash(color) {
    if (util.reducedMotion()) return;
    const el = document.createElement('div');
    el.className = 'screen-flash';
    if (color) el.style.background = color;
    layer().appendChild(el);
    setTimeout(() => el.remove(), 700);
  }

  WL.FX = { Snow, burst, rain, floatText, shake, flash };
})(typeof window !== 'undefined' ? window : globalThis);
