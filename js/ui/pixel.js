/*
 * Pixel-art helpers. Sprites are drawn as SVG rects on a small grid and
 * scaled up, which keeps them crisp at any size and needs no image files.
 */
(function (root) {
  'use strict';
  const WL = (root.WL = root.WL || {});

  const PALETTE = {
    K: '#1c2140', // outline
    W: '#eef3ff', // white
    H: '#ffffff', // highlight
    L: '#c3cdea', // light shade
    S: '#8d9ccc', // shade
    D: '#101735', // screen dark
    C: '#47f5e8', // cyan glow
    Y: '#ffd166', // gold
    O: '#ff9f43', // orange
    R: '#e2475b', // red
    G: '#5fd38d', // green
    P: '#b388ff', // purple
    M: '#ff7eb6', // pink
    B: '#3a6fd8', // blue
    N: '#7a4a2a', // brown
  };

  function rect(x, y, w, h, fill, extra) {
    return `<rect x="${x}" y="${y}" width="${w}" height="${h}"${fill ? ` fill="${fill}"` : ''}${extra || ''}/>`;
  }

  /**
   * Render a char-map sprite as run-length rects.
   * `classMap` lets some characters use a CSS class instead of a fill (for colours that change with state).
   */
  function sprite(rows, opts) {
    const o = Object.assign({ x: 0, y: 0, palette: PALETTE, classMap: {} }, opts);
    let out = '';
    rows.forEach((row, y) => {
      let x = 0;
      while (x < row.length) {
        const ch = row[x];
        if (ch === '.' || ch === ' ') {
          x += 1;
          continue;
        }
        let len = 1;
        while (x + len < row.length && row[x + len] === ch) len += 1;
        const cls = o.classMap[ch];
        out += cls
          ? rect(o.x + x, o.y + y, len, 1, null, ` class="${cls}"`)
          : rect(o.x + x, o.y + y, len, 1, o.palette[ch] || ch);
        x += len;
      }
    });
    return out;
  }

  /** Mirror 13-char left halves into full symmetric rows. */
  function mirror(leftRows) {
    return leftRows.map((r) => r + r.split('').reverse().join(''));
  }

  function svg(rows, opts) {
    const o = Object.assign({ cls: '', title: '' }, opts);
    const w = Math.max(...rows.map((r) => r.length));
    const h = rows.length;
    return `<svg class="px-sprite ${o.cls}" viewBox="0 0 ${w} ${h}" shape-rendering="crispEdges" aria-hidden="true" focusable="false">${sprite(rows, o)}</svg>`;
  }

  /** Deterministic pseudo-random numbers, so scenes look the same every time. */
  function rng(seed) {
    let a = seed >>> 0;
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function circle(cx, cy, r, fill, extra) {
    let out = '';
    for (let y = -r; y <= r; y += 1) {
      const half = Math.floor(Math.sqrt(r * r - y * y) + 0.35);
      out += rect(cx - half, cy + y, half * 2 + 1, 1, fill, extra);
    }
    return out;
  }

  /** Stepped triangle (pine tier / roof), widest at the bottom. */
  function triangle(cx, top, height, halfMax, fill, extra) {
    let out = '';
    for (let i = 0; i < height; i += 1) {
      const half = Math.round(((i + 1) / height) * halfMax);
      out += rect(cx - half, top + i, half * 2 + 1, 1, fill, extra);
    }
    return out;
  }

  /** Pine tree. Returns svg. `lights` adds bulbs with class `bulb` and data-g group. */
  function tree(cx, baseY, size, opts) {
    const o = Object.assign({ dark: '#1f5a4a', mid: '#2f7d5f', snow: '#e8f0ff', lights: 0, group: '', seed: 1, star: false }, opts);
    const tier = Math.max(4, Math.round(size / 3));
    const trunkH = Math.max(2, Math.round(size / 8));
    let out = rect(cx - 1, baseY - trunkH, 3, trunkH, '#5a3a2a');
    const tiers = 3;
    const rand = rng(o.seed);
    const bulbs = [];
    for (let t = 0; t < tiers; t += 1) {
      const top = baseY - trunkH - size + t * Math.round(size / 3.4);
      const half = Math.round(tier * 0.55 + t * tier * 0.28);
      const h = tier + t;
      out += triangle(cx, top, h, half, o.dark);
      out += triangle(cx, top + 1, h - 2, Math.max(1, half - 2), o.mid);
      out += rect(cx - Math.max(1, Math.round(half * 0.4)), top + Math.round(h * 0.45), Math.max(2, Math.round(half * 0.8)), 1, o.snow, ' opacity=".55"');
      out += rect(cx, top, 1, 1, o.snow);
      for (let b = 0; b < o.lights; b += 1) {
        const row = Math.floor(rand() * (h - 2)) + 2;
        const w = Math.round(((row + 1) / h) * half);
        const bx = cx - w + 1 + Math.floor(rand() * Math.max(1, w * 2 - 1));
        bulbs.push([bx, top + row]);
      }
    }
    bulbs.forEach(([bx, by], i) => {
      out += rect(bx, by, 1, 1, null, ` class="bulb b${i % 4}" data-g="${o.group}" style="--d:${(i * 53) % 900}ms"`);
    });
    if (o.star) {
      const sy = baseY - trunkH - size - 3;
      out += `<g class="tree-star" data-g="${o.group}">${rect(cx - 1, sy + 1, 3, 1)}${rect(cx, sy, 1, 3)}</g>`;
    }
    return out;
  }

  /** Snowy cottage with windows that can light up. */
  function house(x, baseY, w, h, opts) {
    const o = Object.assign({ wall: '#7b4a5e', roof: '#3b2a55', group: '', idx: 0, chimney: true, door: true }, opts);
    const top = baseY - h;
    let out = '';
    const roofH = Math.round(w / 2.4);
    if (o.chimney) out += rect(x + w - 5, top - roofH + 1, 3, roofH, '#4a3150') + rect(x + w - 6, top - roofH, 5, 2, '#e8f0ff');
    out += triangle(x + Math.floor(w / 2), top - roofH, roofH, Math.floor(w / 2) + 1, o.roof);
    out += triangle(x + Math.floor(w / 2), top - roofH, Math.max(2, roofH - 2), Math.floor(w / 2) - 1, '#e8f0ff');
    out += rect(x, top, w, h, o.wall);
    out += rect(x, top, w, 1, '#00000033');
    const winW = 3;
    const cols = Math.max(1, Math.floor((w - 2) / 6));
    let i = 0;
    for (let c = 0; c < cols; c += 1) {
      const wx = x + 2 + c * Math.floor((w - 2) / cols) + 1;
      const wy = top + 2;
      out += rect(wx - 1, wy - 1, winW + 2, winW + 2, '#2a1c38');
      out += rect(wx, wy, winW, winW, null, ` class="win" data-g="${o.group}" style="--d:${(o.idx * 3 + i) * 90}ms"`);
      i += 1;
    }
    if (o.door) out += rect(x + Math.floor(w / 2) - 1, baseY - 5, 3, 5, '#3a2238') + rect(x + Math.floor(w / 2) - 1, baseY - 5, 3, 1, '#2a1c38');
    out += rect(x - 1, baseY - 1, w + 2, 1, '#e8f0ff');
    return out;
  }

  /** A street lamp. */
  function lamp(x, baseY, group, idx) {
    return (
      rect(x, baseY - 10, 1, 10, '#2a2f55') +
      rect(x - 1, baseY - 12, 3, 2, '#2a2f55') +
      `<rect x="${x - 2}" y="${baseY - 15}" width="5" height="5" class="lamp-glow" data-g="${group}" style="--d:${idx * 120}ms"/>` +
      rect(x - 1, baseY - 13, 3, 1, null, ` class="lamp" data-g="${group}" style="--d:${idx * 120}ms"`)
    );
  }

  /** Bumpy ground made of 2px columns. */
  function ground(width, height, baseY, amp, freq, phase, fill, extra) {
    let out = '';
    for (let x = 0; x < width; x += 2) {
      const y = Math.round(baseY + Math.sin(x * freq + phase) * amp + Math.sin(x * freq * 2.7 + phase) * amp * 0.35);
      out += rect(x, y, 2, height - y, fill, extra);
    }
    return out;
  }

  function stars(count, w, h, seed) {
    const rand = rng(seed);
    let out = '';
    for (let i = 0; i < count; i += 1) {
      const x = Math.floor(rand() * w);
      const y = Math.floor(rand() * h);
      const big = rand() > 0.88;
      out += rect(x, y, 1, 1, '#ffffff', ` class="star s${i % 3}"${big ? '' : ' opacity=".7"'}`);
      if (big) out += rect(x - 1, y, 3, 1, '#ffffff', ' opacity=".35"') + rect(x, y - 1, 1, 3, '#ffffff', ' opacity=".35"');
    }
    return out;
  }

  function bands(w, colors, heights, extraCls) {
    let y = 0;
    return colors
      .map((c, i) => {
        const r = rect(0, y, w, heights[i], c, extraCls ? ` class="${extraCls}${i}"` : '');
        y += heights[i];
        return r;
      })
      .join('');
  }

  WL.Pixel = { PALETTE, rect, sprite, mirror, svg, rng, circle, triangle, tree, house, lamp, ground, stars, bands };
})(typeof window !== 'undefined' ? window : globalThis);
