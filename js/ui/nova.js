/*
 * NOVA, the robot assistant: a pixel-art sprite with swappable faces.
 * Moods: neutral, happy, confused, surprised, disappointed, thinking.
 */
(function (root) {
  'use strict';
  const WL = (root.WL = root.WL || {});
  const P = WL.Pixel;

  // Left halves (13 columns); mirrored into a 26 x 32 sprite.
  const BODY = P.mirror([
    '...........KK',
    '..........KAA',
    '..........KAA',
    '...........KK',
    '............K',
    '............K',
    '....KKKKKKKKK',
    '...KWWWWWWWWW',
    '..KWWWWWWWWWW',
    '..KWWWDDDDDDD',
    '..KWWDDDDDDDD',
    'KKKWWDDDDDDDD',
    'KCKWWDDDDDDDD',
    'KCKWWDDDDDDDD',
    'KKKWWDDDDDDDD',
    '..KWWDDDDDDDD',
    '..KWWWDDDDDDD',
    '..KWWWWWWWWWW',
    '...KLLLLLLLLL',
    '....KKKKKKKKK',
    '..........KSS',
    '......KKKKKKK',
    '...KK.KWWWWWW',
    '..KWWKKWWWWWA',
    '..KWWKKWWWWAA',
    '..KLLKKWWWWWA',
    '...KK.KLLLLLL',
    '......KKKKKKK',
    '..........KSS',
  ]);

  const FLAME = ['..........OOYYOO..........', '...........OYYO...........', '............OO............'];

  // Extra pixels that break the symmetry (shine and highlights).
  const SHINE = [
    [4, 8, 2, 1, '#ffffff'],
    [3, 9, 1, 2, '#ffffff'],
    [11, 1, 1, 1, '#ffffff'],
    [7, 10, 1, 1, '#2a3566'],
  ];

  // Faces: [x, y, w, h, colour]. 'C' = glow colour, 'D' = screen, 'M' = blush.
  const FACES = {
    neutral: {
      eyes: [[8, 10, 2, 3], [16, 10, 2, 3]],
      mouth: [[10, 14, 1, 1], [15, 14, 1, 1], [11, 15, 4, 1]],
    },
    happy: {
      eyes: [[8, 10, 2, 1], [7, 11, 1, 1], [10, 11, 1, 1], [16, 10, 2, 1], [15, 11, 1, 1], [18, 11, 1, 1]],
      mouth: [[9, 13, 8, 1], [10, 14, 6, 1], [11, 15, 4, 1]],
      extra: [[6, 13, 2, 1, 'M'], [18, 13, 2, 1, 'M']],
    },
    surprised: {
      eyes: [[7, 10, 3, 3], [16, 10, 3, 3]],
      mouth: [[12, 14, 2, 2]],
      extra: [[8, 11, 1, 1, 'D'], [17, 11, 1, 1, 'D'], [7, 9, 3, 1], [16, 9, 3, 1]],
    },
    confused: {
      eyes: [[8, 10, 2, 3], [16, 11, 3, 1]],
      mouth: [[10, 15, 1, 1], [11, 14, 1, 1], [12, 15, 1, 1], [13, 14, 1, 1], [14, 15, 1, 1], [15, 14, 1, 1]],
      extra: [[17, 9, 2, 1]],
    },
    disappointed: {
      eyes: [[7, 12, 3, 1], [16, 12, 3, 1]],
      mouth: [[11, 14, 4, 1], [10, 15, 1, 1], [15, 15, 1, 1]],
      extra: [[8, 11, 2, 1, 'S'], [16, 11, 2, 1, 'S']],
    },
    thinking: {
      eyes: [[9, 10, 2, 2], [17, 10, 2, 2]],
      mouth: [[11, 15, 3, 1]],
      extra: [[6, 15, 1, 1, 'C2'], [8, 15, 1, 1, 'C2'], [18, 15, 1, 1, 'C2']],
    },
  };

  const COLOR = { C: 'var(--nova-face, #47f5e8)', D: '#101735', M: '#ff7eb6', S: '#3a4a86', C2: 'var(--nova-face, #47f5e8)' };

  function faceSvg(mood) {
    const f = FACES[mood];
    const r = (list, cls) =>
      `<g class="${cls}">${list
        .map(([x, y, w, h, c]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${COLOR[c || 'C']}"${c === 'C2' ? ' class="dot"' : ''}/>`)
        .join('')}</g>`;
    return `<g class="face face-${mood}">${r(f.eyes, 'eyes')}${r(f.mouth, 'mouth')}${f.extra ? r(f.extra, 'extra') : ''}</g>`;
  }

  const SPRITE =
    P.sprite(BODY, { classMap: { A: 'nova-accent' } }) +
    SHINE.map(([x, y, w, h, c]) => P.rect(x, y, w, h, c)).join('') +
    Object.keys(FACES).map(faceSvg).join('') +
    `<g class="nova-flame">${P.sprite(FLAME, { y: 29 })}</g>`;

  const EMOTE = { happy: '♥', confused: '?', surprised: '!', disappointed: '…', thinking: '' };

  const Nova = {
    MOODS: Object.keys(FACES),

    /** NOVA markup. size: 'xl' | 'lg' | 'md' | 'sm' | 'xs' */
    html(opts) {
      const o = Object.assign({ mood: 'neutral', size: 'lg', cls: '' }, opts);
      return `<div class="nova nova-${o.size} ${o.cls}" data-mood="${o.mood}" role="img" aria-label="NOVA the robot looks ${o.mood}">
        <span class="nova-emote" aria-hidden="true"></span>
        <svg class="nova-svg" viewBox="0 0 26 32" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${SPRITE}</svg>
        <span class="nova-shadow" aria-hidden="true"></span>
      </div>`;
    },

    setMood(el, mood) {
      if (!el || !FACES[mood]) return;
      const changed = el.dataset.mood !== mood;
      el.dataset.mood = mood;
      el.setAttribute('aria-label', 'NOVA the robot looks ' + mood);
      if (!changed) return;
      el.classList.remove('nova-pop');
      void el.offsetWidth; // restart the animation
      el.classList.add('nova-pop');
      const emote = el.querySelector('.nova-emote');
      if (emote) {
        emote.textContent = EMOTE[mood] || '';
        emote.classList.remove('show');
        void emote.offsetWidth;
        if (EMOTE[mood]) emote.classList.add('show');
      }
    },

    setTalking(el, on) {
      if (el) el.classList.toggle('talking', !!on);
    },
  };

  WL.Nova = Nova;
})(typeof window !== 'undefined' ? window : globalThis);
