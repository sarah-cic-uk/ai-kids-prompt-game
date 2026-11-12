/*
 * Tiny chiptune sound effects made with the Web Audio API, so there are no
 * audio files to download. Muted by default for shared rooms; players switch
 * it on with the speaker button.
 */
(function (root) {
  'use strict';
  const WL = (root.WL = root.WL || {});

  let ctx = null;
  let enabled = WL.Storage ? WL.Storage.get('sound', false) : false;

  function audio() {
    if (!ctx) {
      const AC = root.AudioContext || root.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  function tone(freq, start, dur, type, vol) {
    const a = audio();
    if (!a) return;
    const t = a.currentTime + start;
    const osc = a.createOscillator();
    const gain = a.createGain();
    osc.type = type || 'square';
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(vol || 0.06, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(a.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  const N = { C4: 262, E4: 330, G4: 392, A4: 440, C5: 523, D5: 587, E5: 659, G5: 784, A5: 880, C6: 1047, F4: 349, B4: 494 };

  const SFX = {
    click: () => tone(N.A5, 0, 0.05, 'square', 0.035),
    blip: () => tone(N.E5 + Math.random() * 120, 0, 0.03, 'square', 0.02),
    select: () => { tone(N.C5, 0, 0.07); tone(N.G5, 0.06, 0.09); },
    success: () => [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => tone(f, i * 0.09, 0.16, 'square', 0.05)),
    partial: () => { tone(N.E5, 0, 0.12); tone(N.C5, 0.12, 0.18); },
    fail: () => { tone(N.E4, 0, 0.16, 'sawtooth', 0.04); tone(N.C4, 0.15, 0.3, 'sawtooth', 0.04); },
    star: () => tone(N.C6, 0, 0.12, 'triangle', 0.07),
    badge: () => [N.G4, N.C5, N.E5, N.G5, N.C6].forEach((f, i) => tone(f, i * 0.07, 0.14, 'triangle', 0.07)),
    whoosh: () => { tone(N.C4, 0, 0.2, 'triangle', 0.03); tone(N.G4, 0.05, 0.2, 'triangle', 0.03); },
    power: () => [N.C4, N.G4, N.C5, N.G5, N.C6, N.E5, N.G5, N.C6].forEach((f, i) => tone(f, i * 0.1, 0.2, 'square', 0.045)),
    fanfare: () => [N.G4, N.C5, N.E5, N.G5, N.E5, N.G5, N.C6].forEach((f, i) => tone(f, i * 0.13, i === 6 ? 0.6 : 0.16, 'square', 0.05)),
  };

  WL.Sound = {
    get enabled() {
      return enabled;
    },
    setEnabled(on) {
      enabled = !!on;
      if (WL.Storage) WL.Storage.set('sound', enabled);
      if (enabled) SFX.select();
    },
    play(name) {
      if (!enabled || !SFX[name]) return;
      try {
        SFX[name]();
      } catch (e) {
        /* audio is optional */
      }
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
