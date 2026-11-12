/*
 * Procedural pixel-art scenes (SVG). Each scene is drawn once; its outcome
 * animation is driven by CSS via the container's data-state attribute:
 *   'idle'      → the broken "before" picture
 *   'excellent' | 'partial' | 'poor' → outcome animations
 *   'restored'  → final celebration (tower only)
 * Animations live in css/scenes.css.
 */
(function (root) {
  'use strict';
  const WL = (root.WL = root.WL || {});
  const P = WL.Pixel;
  const { rect, circle, triangle, rng } = P;

  const W = 192;
  const H = 108;

  const NIGHT = ['#0a0f2e', '#0f1640', '#151d52', '#1c2563', '#232d74', '#2b3684', '#344092'];
  const BAND_H = [14, 14, 14, 14, 14, 14, 24];

  function wrap(inner, opts) {
    const o = Object.assign({ w: W, h: H, fit: 'xMidYMid meet', label: '' }, opts);
    return `<svg class="scene-svg" viewBox="0 0 ${o.w} ${o.h}" preserveAspectRatio="${o.fit}" shape-rendering="crispEdges" role="img" aria-label="${WL.util.esc(o.label)}">${inner}</svg>`;
  }

  /** Ridge line: columns from a wavy top down `thick` pixels (or to the bottom). */
  function ridge(width, baseY, amp, freq, phase, fill, thick, extra) {
    let out = '';
    for (let x = 0; x < width; x += 2) {
      const y = Math.round(baseY + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 2.3 + phase * 1.7) * amp * 0.35);
      out += rect(x, y, 2, thick ? thick : H - y, fill, extra);
    }
    return out;
  }

  function aurora(y, amp, color, cls, seed) {
    let out = `<g class="aurora ${cls}">`;
    for (let x = 0; x < W; x += 2) {
      const yy = Math.round(y + Math.sin(x * 0.045 + seed) * amp + Math.sin(x * 0.11 + seed * 2) * amp * 0.3);
      const h = 7 + Math.round((Math.sin(x * 0.07 + seed) + 1) * 4);
      out += rect(x, yy, 2, h, color, ' opacity=".16"') + rect(x, yy + 3, 2, Math.max(2, h - 6), color, ' opacity=".22"');
    }
    return out + '</g>';
  }

  function nightSky(seed, starCount) {
    return P.bands(W, NIGHT, BAND_H) + `<g class="stars">${P.stars(starCount || 70, W, 62, seed)}</g>`;
  }

  function moon(cx, cy, r, skyFill) {
    return `<g class="moon">${circle(cx, cy, r + 3, '#fff6d8', ' opacity=".12"')}${circle(cx, cy, r, '#fff3cf')}${circle(cx + 3, cy - 2, r - 1, skyFill)}</g>`;
  }

  function signpost(x, y, text, w) {
    const width = w || text.length * 3 + 4;
    return (
      rect(x + Math.floor(width / 2) - 1, y + 5, 1, 6, '#4a3226') +
      rect(x, y, width, 6, '#6b4630') +
      rect(x, y, width, 1, '#8a5c3e') +
      `<text x="${x + width / 2}" y="${y + 4.3}" class="px-text" font-size="3" text-anchor="middle" fill="#ffe8b8">${text}</text>`
    );
  }

  function snowman(x, y) {
    return (
      circle(x, y, 3, '#eef3ff') +
      circle(x, y - 5, 2, '#eef3ff') +
      rect(x - 1, y - 6, 1, 1, '#1c2140') +
      rect(x + 1, y - 6, 1, 1, '#1c2140') +
      rect(x, y - 5, 2, 1, '#ff9f43') +
      rect(x - 2, y - 8, 5, 1, '#1c2140') +
      rect(x - 1, y - 10, 3, 2, '#1c2140') +
      rect(x - 3, y - 3, 7, 1, '#e2475b')
    );
  }

  function tick(x, y, cls, delay) {
    return `<g class="${cls}" style="--d:${delay || 0}ms">${rect(x - 1, y - 1, 9, 8, '#1c2140', ' opacity=".55"')}${rect(x, y + 3, 2, 2, '#5fd38d')}${rect(x + 2, y + 4, 1, 2, '#5fd38d')}${rect(x + 3, y + 3, 1, 2, '#5fd38d')}${rect(x + 4, y + 1, 1, 3, '#5fd38d')}${rect(x + 5, y, 2, 2, '#5fd38d')}</g>`;
  }

  function cross(x, y, cls, delay) {
    return `<g class="${cls}" style="--d:${delay || 0}ms">${rect(x - 1, y - 1, 9, 8, '#1c2140', ' opacity=".55"')}${[0, 1, 2, 3, 4, 5].map((i) => rect(x + i + 0.5, y + i * 0.9, 1.2, 1.2, '#e2475b') + rect(x + 5.5 - i, y + i * 0.9, 1.2, 1.2, '#e2475b')).join('')}</g>`;
  }

  function question(x, y, cls, delay) {
    return `<g class="${cls}" style="--d:${delay || 0}ms">${rect(x, y, 4, 1, '#ffd166')}${rect(x + 3, y + 1, 1, 2, '#ffd166')}${rect(x + 1, y + 3, 2, 1, '#ffd166')}${rect(x + 1, y + 4, 1, 1, '#ffd166')}${rect(x + 1, y + 6, 1, 1, '#ffd166')}</g>`;
  }

  /* ---------------------------------------------------------------- village */
  function village(opts) {
    const o = Object.assign({ label: 'Frostvale village at night' }, opts);
    let s = nightSky(11);
    s += aurora(14, 5, '#3ee6a8', 'a1', 1) + aurora(22, 4, '#7a5cff', 'a2', 3);
    s += moon(166, 15, 7, NIGHT[1]);
    s += ridge(W, 60, 7, 0.033, 1, '#222b68') + ridge(W, 60, 7, 0.033, 1, '#3a4890', 1);
    s += ridge(W, 69, 5, 0.06, 3, '#2d387d') + ridge(W, 69, 5, 0.06, 3, '#5664a8', 1);
    // distant Winterlight Tower
    s += `<g class="far-tower">${rect(150, 46, 3, 22, '#3c4a90')}${rect(149, 44, 5, 2, '#3c4a90')}${rect(150, 41, 3, 3, null, ' class="far-crystal"')}</g>`;
    // back trees
    [8, 20, 60, 70, 122, 134, 178, 188].forEach((x, i) => {
      s += P.tree(x, 84 + (i % 2), 13 + (i % 3) * 2, { dark: '#18324a', mid: '#21465a', snow: '#9fb3e0', seed: i + 3 });
    });
    s += ridge(W, 84, 1.5, 0.05, 0, '#c9d7f6') + ridge(W, 86, 1.2, 0.07, 2, '#dfe8ff') + ridge(W, 86, 1.2, 0.07, 2, '#ffffff', 1);
    // Pine Lane
    s += P.house(3, 92, 19, 14, { group: 'pine', idx: 0, wall: '#6e4a6a' });
    s += P.house(26, 93, 15, 12, { group: 'pine', idx: 1, wall: '#4f5a8a', roof: '#2c2a5a' });
    s += P.lamp(46, 94, 'pine', 2);
    s += signpost(4, 96, 'PINE LANE');
    // power grid box
    s += `<g class="gridbox">${rect(54, 84, 8, 10, '#3a4070')}${rect(55, 85, 6, 8, '#2a2f55')}${rect(57, 86, 2, 2, '#ffd166')}${rect(56, 88, 2, 2, '#ffd166')}${rect(58, 90, 1, 2, '#ffd166')}</g>`;
    s += `<g class="sparks">${[[52, 81], [63, 82], [57, 79], [61, 78], [54, 78]].map(([x, y], i) => rect(x, y, 1, 1, '#ffd166', ` style="--d:${i * 70}ms"`)).join('')}</g>`;
    // Market Square + Great Tree
    s += P.lamp(70, 95, 'tree', 1) + P.lamp(122, 95, 'tree', 3);
    s += P.tree(96, 98, 44, { lights: 8, group: 'tree', seed: 7, star: true });
    s += snowman(112, 96);
    s += signpost(74, 99, 'MARKET SQUARE', 44);
    // Holly Row
    s += P.lamp(131, 94, 'holly', 0);
    s += P.house(137, 93, 17, 13, { group: 'holly', idx: 0, wall: '#7a3a4a' });
    s += P.house(158, 92, 21, 15, { group: 'holly', idx: 1, wall: '#5a4a7a' });
    s += P.lamp(184, 94, 'holly', 1);
    s += signpost(150, 97, 'HOLLY ROW');
    s += `<rect class="overload" x="0" y="0" width="${W}" height="${H}" fill="#fff6c8"/>`;
    return wrap(s, o);
  }

  /* ------------------------------------------------------------------ depot */
  function sleigh(x, y, color, cls) {
    return `<g class="sleigh ${cls}"><g class="sleigh-body">
      <g class="trail">${rect(x + 10, y + 2, 3, 1, '#ffd166', ' opacity=".7"')}${rect(x + 13, y + 3, 3, 1, '#ffd166', ' opacity=".4"')}${rect(x + 16, y + 2, 2, 1, '#ffd166', ' opacity=".2"')}</g>
      ${rect(x + 2, y - 3, 3, 3, '#5fd38d')}${rect(x + 3, y - 3, 1, 3, '#ffd166')}${rect(x + 5, y - 2, 3, 2, '#b388ff')}
      ${rect(x, y, 10, 4, color)}${rect(x, y, 10, 1, '#ffffff', ' opacity=".35"')}${rect(x + 1, y + 4, 8, 1, '#1c2140')}
      ${rect(x - 1, y + 5, 12, 1, '#ffd166')}${rect(x - 2, y + 4, 1, 1, '#ffd166')}${rect(x + 10, y + 1, 1, 4, color)}
    </g></g>`;
  }

  function depot(opts) {
    const o = Object.assign({ label: 'The Pinecrest Sleigh Depot at sunset' }, opts);
    const SUNSET = ['#24184f', '#3a2068', '#5a2a7e', '#83388c', '#b04a8e', '#d9638a', '#f08b7e'];
    let s = P.bands(W, SUNSET, [12, 12, 12, 12, 12, 12, 36]) + `<g class="stars">${P.stars(30, W, 30, 21)}</g>`;
    s += circle(126, 62, 11, '#ffd28a', ' opacity=".9"') + circle(126, 62, 15, '#ffd28a', ' opacity=".15"');
    s += `<g class="moon-poor">${moon(30, 14, 6, SUNSET[1])}</g>`;
    s += ridge(W, 58, 5, 0.04, 2, '#5a3a7e');
    // sea (Icicle Bay)
    s += rect(0, 66, W, 42, '#2b4a92');
    const rr = rng(5);
    for (let i = 0; i < 26; i += 1) s += rect(Math.floor(rr() * W), 68 + Math.floor(rr() * 36), 3 + Math.floor(rr() * 4), 1, '#5a7fd0', ' class="ripple" opacity=".7"');
    s += `<path class="coast-route" d="M127 96 Q 104 76 84 62" fill="none" stroke="#ffd166" stroke-width="0.8" stroke-dasharray="2 2"/>`;
    // Frostvale (left hill)
    for (let y = 52; y < 108; y += 1) {
      const half = Math.round(Math.sqrt(Math.max(0, 70 * 70 - (y - 120) * (y - 120))) * 0.62);
      s += rect(0, y, Math.max(0, 6 + half - 4), 1, y < 54 ? '#ffffff' : '#dfe8ff');
    }
    s += P.house(6, 62, 12, 9, { group: 'fv', wall: '#6e4a6a', chimney: false, door: false }) + P.house(21, 63, 10, 8, { group: 'fv', wall: '#4f5a8a', chimney: false, door: false });
    s += signpost(4, 66, 'FROSTVALE');
    // Icicle Bay (rock + lighthouse in the bay)
    s += rect(72, 62, 24, 4, '#c9d7f6') + rect(70, 64, 28, 3, '#9fb3e0');
    s += rect(80, 46, 5, 16, '#eef3ff') + rect(80, 50, 5, 2, '#e2475b') + rect(80, 56, 5, 2, '#e2475b') + rect(79, 44, 7, 2, '#2a2f55') + rect(80, 41, 5, 3, '#ffd166', ' class="lighthouse"');
    s += P.house(87, 62, 8, 6, { group: 'ib', wall: '#3a6fd8', chimney: false, door: false });
    s += signpost(62, 69, 'ICICLE BAY');
    // right land: Snowdrop Hollow + depot
    for (let y = 46; y < 108; y += 1) {
      const half = Math.round(Math.sqrt(Math.max(0, 80 * 80 - (y - 126) * (y - 126))) * 0.8);
      const x0 = Math.max(104, W - half - 10);
      s += rect(x0, y, W - x0, 1, y < 48 ? '#ffffff' : '#dfe8ff');
    }
    s += rect(160, 48, 14, 9, '#eef3ff') + rect(160, 47, 14, 1, '#c3cdea') + rect(165, 50, 4, 1, '#e2475b') + rect(166, 49, 2, 3, '#e2475b') + rect(162, 53, 2, 4, '#3a6fd8') + rect(170, 53, 2, 2, '#3a6fd8');
    s += P.house(178, 56, 11, 8, { group: 'sh', wall: '#7a3a4a', chimney: false, door: false });
    s += signpost(160, 60, 'SNOWDROP', 28);
    // icy road from the depot towards Icicle Bay (bottom)
    s += `<g class="road">${rect(104, 101, 70, 4, '#8a7aa0')}${rect(70, 99, 36, 3, '#8a7aa0')}${[108, 120, 134, 150, 80, 92].map((x) => rect(x, x < 104 ? 99 : 101, 7, 2, '#c8ecff')).join('')}</g>`;
    // depot building
    s += rect(130, 74, 46, 24, '#7a4a2a') + rect(130, 74, 46, 2, '#5a3a2a') + triangle(153, 64, 10, 25, '#4a2e5a') + triangle(153, 64, 7, 22, '#eef3ff');
    s += rect(136, 82, 16, 16, '#3a2238') + rect(156, 80, 14, 8, '#ffd166', ' class="win" data-g="depot"');
    s += `<text x="153" y="79" class="px-text" font-size="3.4" text-anchor="middle" fill="#ffe8b8">SLEIGH DEPOT</text>`;
    s += rect(172, 92, 4, 4, '#b388ff') + rect(176, 94, 4, 3, '#5fd38d') + rect(174, 89, 3, 3, '#ff7eb6');
    // sleighs
    s += sleigh(110, 92, '#e2475b', 's1') + sleigh(140, 99, '#2fb37a', 's2') + sleigh(158, 99, '#3a6fd8', 's3');
    // destination markers
    s += tick(164, 38, 'mark ok ok-sh', 1500) + tick(84, 31, 'mark ok ok-ib', 2600) + tick(14, 48, 'mark ok ok-fv', 3500);
    s += cross(84, 31, 'mark bad bad-ib', 2200) + tick(14, 48, 'mark ok-partial', 1700);
    s += question(166, 38, 'mark q', 1800) + question(86, 32, 'mark q', 2100) + question(16, 48, 'mark q', 2400);
    return wrap(s, o);
  }

  /* ---------------------------------------------------------------- weather */
  function weather(opts) {
    const o = Object.assign({ label: 'The Weather Tower on Mount Flurry' }, opts);
    const STORM = ['#2e3768', '#384275', '#424d82', '#4c588f', '#56639c', '#606ea9', '#6a79b6'];
    const CLEAR = ['#3d7ee0', '#4a8ae6', '#5a98ea', '#6aa6ee', '#7ab4f2', '#8cc2f5', '#a2d0f8'];
    let s = `<g class="sky-storm">${P.bands(W, STORM, BAND_H)}</g><g class="sky-clear">${P.bands(W, CLEAR, BAND_H)}${circle(160, 18, 8, '#fff1a8')}${circle(160, 18, 12, '#fff1a8', ' opacity=".25"')}</g>`;
    // mountain + tower
    s += triangle(42, 18, 64, 54, '#4a5a9a') + triangle(42, 18, 64, 40, '#56669f', ' opacity=".6"') + triangle(42, 18, 22, 18, '#eef3ff');
    s += triangle(150, 46, 40, 50, '#56669f') + triangle(150, 46, 12, 15, '#eef3ff');
    s += rect(39, 4, 7, 16, '#2a2f55') + rect(38, 3, 9, 2, '#3a4070') + rect(34, 0, 17, 2, '#8d9ccc') + rect(41, 9, 3, 3, null, ' class="beacon"') + rect(40, 14, 5, 2, '#47f5e8', ' opacity=".6"');
    // ground layers
    s += ridge(W, 74, 3, 0.04, 1, '#cbd8f5') + ridge(W, 82, 2, 0.06, 2, '#e3ebfd') + ridge(W, 82, 2, 0.06, 2, '#ffffff', 1);
    // sledging hill
    s += circle(108, 104, 28, '#eef3ff') + circle(108, 104, 28, '#ffffff', ' opacity=".0"');
    for (let i = 0; i < 18; i += 1) s += rect(96 + i, 80 + Math.round(i * 0.9), 1, 1, '#c9d7f6');
    s += `<g class="sledge">${rect(116, 82, 6, 2, '#e2475b')}${rect(115, 84, 8, 1, '#7a4a2a')}${rect(118, 79, 2, 3, '#3a6fd8')}${rect(118, 78, 2, 1, '#ffd28a')}</g>`;
    s += signpost(88, 92, 'SLEDGING');
    // frozen lake
    s += `<g class="lake">${rect(6, 92, 64, 10, '#9fd0f5')}${rect(10, 90, 56, 2, '#9fd0f5')}${rect(10, 102, 56, 2, '#9fd0f5')}${rect(14, 94, 14, 1, '#ffffff', ' opacity=".8"')}${rect(36, 97, 20, 1, '#ffffff', ' opacity=".6"')}${rect(24, 95, 2, 4, '#e2475b')}${rect(23, 99, 4, 1, '#2a2f55')}</g>`;
    s += signpost(22, 82, 'FROZEN LAKE');
    // ski jump
    for (let i = 0; i < 30; i += 1) s += rect(150 + i, 56 + Math.round(i * 1.05), 3, 2, '#c84a5a');
    s += rect(156, 64, 1, 34, '#5a3a2a') + rect(168, 76, 1, 22, '#5a3a2a') + rect(150, 54, 4, 2, '#ffd166');
    s += `<g class="ski-open">${signpost(166, 46, 'OPEN', 18)}</g><g class="ski-closed">${signpost(162, 46, 'CLOSED', 24)}</g>`;
    // wind streaks
    const rw = rng(9);
    s += '<g class="winds">';
    for (let i = 0; i < 9; i += 1) s += rect(Math.floor(rw() * W), 10 + Math.floor(rw() * 80), 10 + Math.floor(rw() * 10), 1, '#ffffff', ` class="wl" style="--d:${(rw() * 1.6).toFixed(2)}" opacity=".55"`);
    s += '</g>';
    // falling snow
    const rf = rng(3);
    s += '<g class="wflakes">';
    for (let i = 0; i < 64; i += 1) {
      const size = rf() > 0.75 ? 2 : 1;
      s += rect(Math.floor(rf() * (W + 40)) - 20, -4, size, size, '#ffffff', ` class="wf f${i % 4}" style="--d:${(rf() * 3).toFixed(2)};--s:${(0.75 + rf() * 0.6).toFixed(2)}"`);
    }
    s += '</g>';
    // rising snow pile (partial / poor)
    s += `<g class="pile">${ridge(W, 40, 2.5, 0.09, 1, '#f4f8ff')}${ridge(W, 40, 2.5, 0.09, 1, '#ffffff', 1)}<g class="bury-sign">${signpost(80, 46, 'BURIED!', 26)}</g></g>`;
    return wrap(s, o);
  }

  /* ----------------------------------------------------------------- puzzle */
  function puzzle(opts) {
    const o = Object.assign({ label: 'The Great Puzzle Board in Frostvale Town Hall' }, opts);
    let s = rect(0, 0, W, 86, '#3a2a5e');
    for (let x = 0; x < W; x += 8) s += rect(x, 0, 3, 86, '#40306a');
    s += rect(0, 84, W, 24, '#6a4a3a');
    for (let y = 88; y < H; y += 5) s += rect(0, y, W, 1, '#5a3c30');
    s += rect(0, 84, W, 2, '#4a3226');
    // bunting
    for (let i = 0; i < 24; i += 1) {
      const x = i * 8 + 2;
      const c = ['#e2475b', '#ffd166', '#5fd38d', '#3ee6e0', '#b388ff'][i % 5];
      s += triangle(x + 3, 3 + (i % 2), 4, 3, c);
    }
    // window
    s += rect(8, 18, 28, 34, '#6b4630') + rect(10, 20, 24, 30, '#0f1640') + P.stars(10, 22, 26, 2).replace(/x="(\d+)"/g, (m, v) => `x="${+v + 11}"`).replace(/y="(\d+)"/g, (m, v) => `y="${+v + 21}"`) + rect(21, 20, 2, 30, '#6b4630') + rect(10, 34, 24, 2, '#6b4630') + rect(10, 46, 24, 4, '#eef3ff');
    // clock
    s += circle(170, 26, 9, '#6b4630') + circle(170, 26, 7, '#f3e6c4') + rect(170, 20, 1, 6, '#1c2140') + rect(170, 26, 4, 1, '#1c2140');
    s += rect(160, 60, 22, 24, '#7a4a2a') + rect(158, 58, 26, 3, '#8a5c3e') + rect(163, 64, 6, 6, '#b388ff') + rect(172, 66, 6, 4, '#5fd38d');
    // board
    s += `<g class="board">${rect(50, 9, 92, 73, '#7a4a2a')}${rect(52, 11, 88, 69, '#5a3a2a')}${rect(54, 13, 84, 65, '#141c40')}</g>`;
    s += `<rect class="board-glow" x="50" y="9" width="92" height="73" fill="none" stroke="#ffd166" stroke-width="1.5"/>`;
    s += `<text x="96" y="19" class="px-text" font-size="3.6" text-anchor="middle" fill="#ffe8b8">FESTIVAL TIMETABLE</text>`;
    const cols = [[56, 22, '#ffd166'], [80, 32, '#3ee6e0'], [114, 22, '#ff7eb6']];
    const rr = rng(4);
    let slots = '';
    let fills = '';
    for (let r = 0; r < 6; r += 1) {
      cols.forEach(([x, w, c], ci) => {
        const y = 22 + r * 9;
        const i = r * 3 + ci;
        slots += rect(x, y, w, 7, '#1d2754');
        const len = Math.max(6, Math.floor(w * (0.45 + rr() * 0.4)));
        fills += `<g class="slot-fill" style="--i:${i}">${rect(x, y, w, 7, c, ' opacity=".26"')}${rect(x, y, w, 1, c)}${rect(x + 2, y + 3, len - 2, 2, '#eef3ff')}</g>`;
      });
    }
    s += slots + fills;
    // scrolls for poor/partial
    let list = rect(70, 12, 52, 56, '#f3e6c4') + rect(70, 12, 52, 2, '#d8c59a');
    for (let i = 0; i < 6; i += 1) list += rect(74, 18 + i * 8, 2, 2, '#5a3a2a') + rect(78, 18 + i * 8, 22 + ((i * 7) % 16), 2, '#8a7a5a');
    s += `<g class="scroll scroll-list">${list}</g>`;
    let long = rect(64, 12, 64, 96, '#f3e6c4') + rect(64, 12, 64, 2, '#d8c59a');
    for (let i = 0; i < 26; i += 1) long += rect(68, 17 + i * 3.4, 40 + ((i * 13) % 18), 1.4, '#8a7a5a');
    long += rect(118, 22, 2, 6, '#3a2a5e') + rect(116, 27, 3, 2, '#3a2a5e') + rect(112, 40, 2, 6, '#3a2a5e') + rect(110, 45, 3, 2, '#3a2a5e');
    s += `<g class="scroll scroll-long">${long}</g>`;
    s += `<g class="err">${rect(136, 6, 12, 12, '#e2475b')}${rect(141, 8, 2, 5, '#ffffff')}${rect(141, 14, 2, 2, '#ffffff')}</g>`;
    // scattered pieces
    const colours = ['#ffd166', '#3ee6e0', '#ff7eb6', '#b388ff', '#5fd38d'];
    const rp = rng(8);
    for (let i = 0; i < 12; i += 1) {
      const x = 8 + Math.floor(rp() * 176);
      const y = 88 + Math.floor(rp() * 14);
      s += `<g class="piece" style="--i:${i}">${rect(x, y, 7, 5, colours[i % 5])}${rect(x + 2, y - 1, 2, 1, colours[i % 5])}${rect(x, y, 7, 1, '#ffffff', ' opacity=".4"')}</g>`;
    }
    return wrap(s, o);
  }

  /* ---------------------------------------------------------------- celebot */
  function penguin(x, y, i) {
    return `<g class="peng" style="--i:${i}"><g class="peng-body">${rect(x + 1, y, 5, 2, '#1c2140')}${rect(x, y + 2, 7, 7, '#1c2140')}${rect(x + 2, y + 3, 3, 6, '#ffffff')}${rect(x + 2, y + 1, 1, 1, '#ffffff')}${rect(x + 4, y + 1, 1, 1, '#ffffff')}${rect(x + 3, y + 2, 1, 1, '#ff9f43')}${rect(x + 1, y + 9, 2, 1, '#ff9f43')}${rect(x + 4, y + 9, 2, 1, '#ff9f43')}</g></g>`;
  }

  function celebot(opts) {
    const o = Object.assign({ label: 'CELEBOT the party robot in the Festival Hall' }, opts);
    let s = rect(0, 0, W, 82, '#5a3a4a');
    for (let y = 0; y < 82; y += 6) {
      s += rect(0, y, W, 1, '#4a2e3e');
      for (let x = (y / 6) % 2 ? 0 : 6; x < W; x += 12) s += rect(x, y, 1, 6, '#4a2e3e');
    }
    for (let y = 82; y < H; y += 6) for (let x = 0; x < W; x += 6) s += rect(x, y, 6, 6, (x / 6 + y / 6) % 2 ? '#3a2e5a' : '#4a3a6a');
    s += rect(0, 82, W, 1, '#2a1c38');
    // bunting lights
    s += `<path d="M0 8 Q 48 18 96 8 Q 144 18 192 8" fill="none" stroke="#2a1c38" stroke-width="0.8"/>`;
    for (let i = 0; i < 20; i += 1) {
      const x = i * 10 + 4;
      const t = (x % 96) / 96;
      const y = Math.round(8 + Math.sin(t * Math.PI) * 9);
      s += rect(x, y + 1, 2, 3, null, ` class="bulb b${i % 4}" data-g="party" style="--d:${i * 60}ms"`);
    }
    // disco ball
    s += `<g class="disco">${rect(95, 0, 1, 18, '#8d9ccc')}${circle(95, 22, 5, '#c3cdea')}${rect(92, 20, 2, 2, '#ffffff')}${rect(96, 23, 2, 2, '#ffffff')}${rect(93, 25, 1, 1, '#ffffff')}</g>`;
    // workbench + tools (left)
    s += rect(4, 66, 40, 4, '#7a4a2a') + rect(6, 70, 3, 14, '#5a3a2a') + rect(39, 70, 3, 14, '#5a3a2a') + rect(10, 60, 3, 6, '#8d9ccc') + rect(9, 58, 5, 2, '#8d9ccc') + rect(20, 62, 10, 4, '#e2475b') + rect(32, 61, 6, 5, '#3a6fd8');
    s += rect(8, 30, 30, 22, '#3a2238') + rect(10, 32, 26, 18, '#f3e6c4') + `<text x="23" y="38" class="px-text" font-size="3" text-anchor="middle" fill="#5a3a2a">PARTY</text><text x="23" y="43" class="px-text" font-size="3" text-anchor="middle" fill="#5a3a2a">PLAN</text>` + rect(13, 45, 20, 1, '#8a7a5a');
    // party table (right)
    s += rect(140, 70, 46, 4, '#e2475b') + rect(140, 74, 46, 2, '#b8304a') + rect(144, 76, 3, 8, '#5a3a2a') + rect(179, 76, 3, 8, '#5a3a2a');
    s += rect(152, 60, 14, 10, '#f3e6c4') + rect(152, 63, 14, 2, '#ff7eb6') + rect(158, 56, 2, 4, '#eef3ff') + rect(158, 54, 2, 2, null, ' class="candle"');
    s += rect(170, 64, 4, 6, '#3ee6e0') + rect(176, 65, 4, 5, '#ffd166') + rect(145, 65, 4, 5, '#b388ff');
    // CELEBOT
    let bot = '';
    bot += rect(72, 86, 6, 6, '#2a2f55') + rect(86, 86, 6, 6, '#2a2f55') + rect(73, 87, 4, 4, '#3a4070') + rect(87, 87, 4, 4, '#3a4070');
    bot += rect(66, 60, 32, 27, '#ff7eb6') + rect(66, 60, 32, 2, '#ffa6cc') + rect(68, 85, 28, 2, '#d85a94');
    bot += rect(72, 66, 20, 13, '#2a2f55');
    bot += [0, 1, 2].map((i) => rect(75 + i * 6, 69, 3, 3, null, ` class="cb-light" style="--d:${i * 200}ms"`)).join('');
    bot += rect(75, 74, 14, 2, '#47f5e8', ' opacity=".5"');
    bot += `<g class="cb-arm-l">${rect(57, 64, 9, 4, '#ff7eb6')}${rect(55, 62, 3, 8, '#8d9ccc')}</g>`;
    bot += `<g class="cb-arm-r">${rect(98, 64, 9, 4, '#ff7eb6')}${rect(106, 56, 2, 12, '#8d9ccc')}${rect(108, 56, 12, 7, '#ffd166')}<text x="114" y="61" class="px-text" font-size="2.6" text-anchor="middle" fill="#5a3a2a">YAY</text></g>`;
    bot += rect(64, 34, 36, 25, '#47c8e8') + rect(64, 34, 36, 2, '#8ae6f5') + rect(61, 42, 3, 8, '#2fa0c0') + rect(100, 42, 3, 8, '#2fa0c0');
    bot += rect(67, 37, 30, 19, '#101735');
    // faces
    bot += `<g class="cb-face cb-broken">${rect(71, 41, 4, 1, '#47f5e8')}${rect(72, 40, 2, 3, '#47f5e8')}${rect(85, 40, 7, 6, '#47f5e8')}${rect(87, 42, 3, 2, '#101735')}${[0, 1, 2, 3, 4, 5].map((i) => rect(73 + i * 3, 50 + (i % 2), 3, 1, '#47f5e8')).join('')}</g>`;
    bot += `<g class="cb-face cb-meh">${rect(72, 43, 5, 2, '#47f5e8')}${rect(86, 43, 5, 2, '#47f5e8')}${rect(76, 50, 12, 1, '#47f5e8')}</g>`;
    bot += `<g class="cb-face cb-happy">${rect(72, 43, 5, 1, '#47f5e8')}${rect(71, 44, 1, 1, '#47f5e8')}${rect(77, 44, 1, 1, '#47f5e8')}${rect(86, 43, 5, 1, '#47f5e8')}${rect(85, 44, 1, 1, '#47f5e8')}${rect(91, 44, 1, 1, '#47f5e8')}${rect(74, 49, 16, 1, '#47f5e8')}${rect(75, 50, 14, 1, '#47f5e8')}${rect(77, 51, 10, 1, '#47f5e8')}${rect(69, 47, 3, 1, '#ff7eb6')}${rect(92, 47, 3, 1, '#ff7eb6')}</g>`;
    // antenna + party hat
    bot += rect(81, 28, 2, 6, '#8d9ccc') + triangle(82, 17, 11, 6, '#ffd166') + rect(78, 24, 8, 1, '#e2475b') + rect(80, 20, 4, 1, '#e2475b') + rect(81, 15, 2, 2, '#ff7eb6');
    s += `<g class="celebot">${bot}</g>`;
    s += `<text x="82" y="101" class="px-text" font-size="3.4" text-anchor="middle" fill="#ffe8b8">CELEBOT</text>`;
    s += `<g class="sparks cb-sparks">${[[60, 32], [104, 36], [96, 28], [66, 28], [100, 52]].map(([x, y], i) => rect(x, y, 2, 2, '#ffd166', ` style="--d:${i * 90}ms"`)).join('')}</g>`;
    s += `<g class="smoke">${[0, 1, 2, 3].map((i) => rect(88 + i * 3, 28, 4, 4, '#c3cdea', ` style="--d:${i * 0.5}s" opacity=".6"`)).join('')}</g>`;
    s += penguin(130, 84, 0) + penguin(146, 86, 1) + penguin(162, 84, 2);
    // confetti
    const rc = rng(12);
    s += '<g class="confetti">';
    for (let i = 0; i < 36; i += 1) s += rect(Math.floor(rc() * W), -4, 2, 2, ['#ffd166', '#3ee6e0', '#ff7eb6', '#5fd38d', '#b388ff'][i % 5], ` class="cf" style="--d:${(rc() * 2.5).toFixed(2)};--s:${(0.8 + rc() * 0.6).toFixed(2)}"`);
    s += '</g>';
    return wrap(s, o);
  }

  /* ------------------------------------------------------------------ tower */
  function planet(cx, cy, r, fill, extra) {
    let out = '';
    for (let y = Math.max(0, cy - r); y <= Math.min(H, cy + r); y += 1) {
      const half = Math.floor(Math.sqrt(r * r - (y - cy) * (y - cy)));
      out += rect(cx - half, y, half * 2 + 1, 1, fill, extra);
    }
    return out;
  }

  function tower(opts) {
    const o = Object.assign({ label: 'The Winterlight Tower above the world' }, opts);
    let s = nightSky(31, 110);
    s += aurora(10, 6, '#3ee6a8', 'a1', 2) + aurora(18, 5, '#47f5e8', 'a2', 4) + aurora(26, 4, '#b388ff', 'a3', 6);
    s += planet(96, 330, 236, '#18265a') + planet(96, 330, 234, '#1e3170') + planet(96, 332, 234, '#22387e');
    // towns along the horizon
    const rt = rng(41);
    s += '<g class="towns">';
    for (let i = 0; i < 50; i += 1) {
      const x = 4 + Math.floor((i / 50) * 184 + rt() * 3);
      const surface = 330 - Math.floor(Math.sqrt(234 * 234 - (x - 96) * (x - 96)));
      const y = surface + 2 + Math.floor(rt() * (H - surface - 4));
      const delay = Math.abs(x - 96) * 16 + Math.floor(rt() * 120);
      s += rect(x, y, rt() > 0.6 ? 2 : 1, 1, null, ` class="town${i % 3 === 0 ? ' t3' : ''}" style="--d:${delay}ms"`);
    }
    s += '</g>';
    // beams to towns and the six nodes
    const targets = [[22, 100], [50, 98], [78, 99], [116, 99], [146, 98], [172, 100]];
    s += '<g class="beams">' + targets.map(([x, y], i) => `<line class="beam" x1="96" y1="22" x2="${x}" y2="${y}" style="--d:${600 + i * 140}ms"/>`).join('') + '</g>';
    const nodes = [[24, 56], [44, 38], [66, 26], [126, 26], [148, 38], [168, 56]];
    const lit = o.progress || 0;
    s += '<g class="nodes">' + nodes.map(([x, y], i) => `<line class="node-beam${i < lit ? ' on' : ''}" x1="${x}" y1="${y}" x2="96" y2="22" style="--d:${i * 450}ms"/><g class="node${i < lit ? ' on' : ''}" style="--d:${i * 450}ms">${rect(x - 1, y - 3, 3, 1)}${rect(x - 2, y - 2, 5, 3)}${rect(x - 1, y + 1, 3, 1)}${rect(x, y + 2, 1, 1)}</g>`).join('') + '</g>';
    // the tower
    s += '<g class="tower-body">';
    for (let y = 32; y < 104; y += 1) {
      const half = Math.round(3 + ((y - 32) / 72) * 10);
      s += rect(96 - half, y, half * 2 + 1, 1, '#c3cdea') + rect(96 + Math.ceil(half / 3), y, half - Math.ceil(half / 3) + 1, 1, '#8d9ccc');
    }
    s += '</g>';
    for (let i = 0; i < 6; i += 1) s += rect(95, 92 - i * 10, 3, 4, null, ` class="tw-win" style="--d:${i * 160}ms"`);
    s += `<g class="rings">${rect(84, 52, 25, 2, '#ffd166')}${rect(80, 72, 33, 2, '#ffd166')}${rect(86, 52, 3, 2, '#fff1a8')}${rect(104, 72, 4, 2, '#fff1a8')}</g>`;
    // crystal
    s += circle(96, 22, 16, null, ' class="crystal-glow"');
    let c = '';
    for (let i = 0; i < 9; i += 1) c += rect(96 - i, 14 + i, i * 2 + 1, 1);
    for (let i = 0; i < 8; i += 1) c += rect(96 - (7 - i), 23 + i, (7 - i) * 2 + 1, 1);
    s += `<g class="crystal">${c}</g>` + rect(93, 17, 2, 4, '#ffffff', ' class="crystal-shine" opacity=".85"') + rect(91, 21, 2, 2, '#ffffff', ' opacity=".6"');
    s += `<g class="warn">${rect(91, 40, 11, 8, '#e2475b')}<text x="96.5" y="46" class="px-text" font-size="4.4" text-anchor="middle" fill="#ffffff">!</text></g>`;
    return wrap(s, o);
  }

  /* -------------------------------------------------------- map terrain */
  function mapTerrain(opts) {
    const o = Object.assign({ w: 160, h: 120, fit: 'xMidYMid slice', label: 'Map of the Winterlight lands' }, opts);
    const w = o.w;
    const h = o.h;
    let s = rect(0, 0, w, h, '#d5e1f8');
    const r = rng(77);
    for (let i = 0; i < 260; i += 1) s += rect(Math.floor(r() * w), Math.floor(r() * h), 2 + Math.floor(r() * 5), 1 + Math.floor(r() * 2), r() > 0.5 ? '#c7d5f2' : '#e6eefc');
    // lakes
    const lake = (cx, cy, rx) => {
      let out = '';
      for (let y = -rx; y <= rx; y += 1) {
        const half = Math.floor(Math.sqrt(rx * rx - y * y) * 1.5);
        out += rect(cx - half, cy + Math.round(y * 0.7), half * 2, 1, '#9cc6ef');
      }
      return out + rect(cx - rx, cy - 1, rx, 1, '#c8e3fb') + rect(cx, cy + 2, rx - 2, 1, '#c8e3fb');
    };
    s += lake(40, 62, 9) + lake(118, 92, 7) + lake(98, 30, 5);
    // river
    let x = 54;
    for (let y = 64; y < h; y += 2) {
      x += Math.round(Math.sin(y * 0.15) * 1.6);
      s += rect(x, y, 3, 2, '#a8cdf2');
    }
    // mountains
    const mountain = (mx, my, size) =>
      triangle(mx, my, size, Math.round(size * 0.9), '#7d8cc4') + triangle(mx + 2, my + 2, size - 2, Math.round(size * 0.5), '#93a2d6') + triangle(mx, my, Math.round(size * 0.35), Math.round(size * 0.32), '#f4f8ff');
    [[134, 8, 14], [148, 14, 12], [120, 14, 10], [16, 6, 12], [30, 10, 9], [76, 4, 8]].forEach(([mx, my, sz]) => (s += mountain(mx, my, sz)));
    // forests
    const rf = rng(19);
    const forest = (fx, fy, n) => {
      let out = '';
      for (let i = 0; i < n; i += 1) {
        const tx = fx + Math.floor(rf() * 22) - 11;
        const ty = fy + Math.floor(rf() * 14) - 7;
        out += triangle(tx, ty, 5, 2, '#1f5a4a') + rect(tx, ty + 5, 1, 1, '#5a3a2a') + rect(tx, ty, 1, 1, '#eef3ff');
      }
      return out;
    };
    s += forest(16, 34, 10) + forest(78, 58, 9) + forest(140, 64, 10) + forest(102, 104, 8) + forest(14, 100, 8) + forest(64, 16, 6);
    return wrap(s, o);
  }

  const BUILDERS = { village, depot, weather, puzzle, celebot, tower, map: mapTerrain };

  /* ------------------------------------------------------------- map icons */
  const ICONS = {
    lights: ['....KKKK....', '...KYYYYK...', '..KYYHYYYK..', '..KYHYYYYK..', '..KYYYYYYK..', '..KYYYYYYK..', '...KYYYYK...', '....KYYK....', '....KSSK....', '....KLLK....', '....KSSK....', '.....KK.....'],
    deliveries: ['...KK..KK...', '..KMMKKMMK..', '...KKMMKK...', '.KKKKKKKKKK.', '.KRRRYYRRRK.', '.KRRRYYRRRK.', '.KKKKKKKKKK.', '..KRRYYRRK..', '..KRRYYRRK..', '..KRRYYRRK..', '..KRRYYRRK..', '..KKKKKKKK..'],
    weather: ['.....KK.....', '...KKWWKK...', '..KWWWWWWK..', '.KWWWWWWWWKK', 'KWWWWWWWWWWK', 'KLLLLLLLLLLK', '.KKKKKKKKKK.', '..C..C..C...', '.C..C..C....', '..C..C..C...', '.C..C..C....', '............'],
    puzzle: ['.....KK.....', '....KPPK....', '.KKKKPPKKKK.', '.KPPPPPPPPK.', '.KPPPPPPPPKK', '.KPPPPPPPPPK', '.KPPPPPPPPPK', '.KPPPPPPPPKK', '.KPPPPPPPPK.', '.KPPPPPPPPK.', '.KKKKKKKKKK.', '............'],
    celebot: ['.....KK.....', '.....KM.....', '..KKKKKKKK..', '.KWWWWWWWWK.', '.KWDDDDDDWK.', 'KKWDCDDCDWKK', 'KKWDDDDDDWKK', '.KWDDCCDDWK.', '.KWWWWWWWWK.', '..KKKKKKKK..', '...KLLLLK...', '...KKKKKK...'],
    tower: ['.....KK.....', '....KCCK....', '...KCHCCK...', '...KCCCCK...', '....KCCK....', '.....KK.....', '....KLLK....', '....KWLK....', '...KWWLLK...', '...KWWLLK...', '..KWWWLLLK..', '..KKKKKKKK..'],
    lock: ['............', '....KKKK....', '...KSSSSK...', '...KS..SK...', '...KS..SK...', '..KKKKKKKK..', '..KYYYYYYK..', '..KYYKKYYK..', '..KYYKKYYK..', '..KYYYYYYK..', '..KKKKKKKK..', '............'],
  };
  const SCENE_ICON = { village: 'lights', depot: 'deliveries', weather: 'weather', puzzle: 'puzzle', celebot: 'celebot', tower: 'tower' };

  WL.Scenes = {
    W,
    H,
    render(key, opts) {
      const b = BUILDERS[key];
      return b ? b(opts) : '';
    },
    /** Scene markup inside a frame; outcome animations are triggered with setState. */
    html(key, opts) {
      const o = Object.assign({ state: 'idle', cls: '' }, opts);
      return `<div class="scene scene-${key} ${o.cls}" data-scene="${key}" data-state="${o.state}">${WL.Scenes.render(key, o)}</div>`;
    },
    setState(el, state) {
      if (!el) return;
      el.dataset.state = 'idle';
      void el.offsetWidth; // restart CSS animations
      el.dataset.state = state;
    },
    icon(name, cls) {
      return P.svg(ICONS[SCENE_ICON[name] || name] || ICONS.lock, { cls: 'px-icon ' + (cls || '') });
    },
  };
})(typeof window !== 'undefined' ? window : globalThis);
