// Scene/beat renderers. Every frame is a pure function of the frame number,
// so any frame can be rendered on its own (and frame 1800 == frame 0).
(function () {
  const L = LIB, C = L.C, W = L.W, H = L.H;
  const { clamp, lerp, prog, E, kf } = L;
  const beat = id => CONFIG.beats.find(b => b.id === id);
  const copy = id => beat(id).copy;

  // ---------- shared geometry ----------
  // Roofline at frame 0 / 1799 (45% drawn), on the house, and over the logo.
  const G0 = { L: [760, 580], A: [960, 380], R: [1160, 580] };
  const GH = { L: [1360, 437], A: [1615, 265], R: [1875, 437] };
  const LOGO = { s: 0.55, x: 410, y: 220 }; // full logo (2000x667) placement
  const GL = {
    L: [LOGO.x + 676 * LOGO.s, LOGO.y + 262 * LOGO.s],
    A: [LOGO.x + 983 * LOGO.s, LOGO.y + 38 * LOGO.s],
    R: [LOGO.x + 1301 * LOGO.s, LOGO.y + 262 * LOGO.s],
  };

  // ---------- tile house ----------
  const TILE = [['sky', 'orange', 'navy', 'sky'], ['navy', 'orange', 'sky', 'navy'], ['orange', 'navy', 'sky', 'orange']];
  const tileColor = { sky: C.sky, orange: C.orange, navy: C.navy };
  const tileXY = k => [1400 + 112 * (k % 4), 470 + 112 * Math.floor(k / 4)];

  function dashedTile(ctx, x, y, a) {
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha *= a;
    ctx.setLineDash([9, 7]);
    ctx.strokeStyle = '#B3C3D7';
    ctx.lineWidth = 3;
    L.roundRect(ctx, x + 1.5, y + 1.5, 93, 93, 16);
    ctx.stroke();
    ctx.restore();
  }
  function tile(ctx, x, y, color, s = 1, rot = 0, alpha = 1, blur = 0) {
    if (s <= 0.001) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x + 48, y + 48);
    ctx.rotate(rot);
    ctx.scale(s, s);
    L.shadow(ctx, 0.16, 20, 8);
    if (blur) ctx.filter = `blur(${blur}px)`;
    ctx.fillStyle = color;
    L.roundRect(ctx, -48, -48, 96, 96, 16);
    ctx.fill();
    ctx.restore();
  }
  // o: {slots: alpha of dashed outlines, scale: k => tile scale, skip: k => bool}
  function house(ctx, o) {
    for (let k = 0; k < 12; k++) {
      const [x, y] = tileXY(k);
      const s = o.skip && o.skip(k) ? 0 : o.scale(k);
      if (s < 1) dashedTile(ctx, x, y, o.slots * (1 - clamp(s)));
      tile(ctx, x, y, tileColor[TILE[Math.floor(k / 4)][k % 4]], s);
    }
  }

  // ---------- vessel tag ----------
  function vessel(ctx, key, slideP = 1) {
    const v = CONFIG.vessel[key];
    const dx = -760 * (1 - E.outQuint(clamp(slideP)));
    ctx.save();
    ctx.translate(dx, 0);
    ctx.font = `500 34px ${CONFIG.font.family}`;
    ctx.letterSpacing = '0px';
    const tw = ctx.measureText(v.label).width;
    const pw = 52 + tw + 30;
    ctx.save();
    L.shadow(ctx, 0.1, 26, 8);
    ctx.fillStyle = '#FFFFFF';
    L.roundRect(ctx, 142, 97, pw, 74, 37);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#DCE6F3';
    ctx.lineWidth = 2;
    L.roundRect(ctx, 142, 97, pw, 74, 37);
    ctx.stroke();
    ctx.fillStyle = C.orange;
    ctx.beginPath(); ctx.arc(171, 134, 9, 0, 7); ctx.fill();
    ctx.fillStyle = C.deepNavy;
    ctx.fillText(v.label, 194, 146);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = i < v.index ? C.sky : i === v.index ? C.orange : C.mute;
      ctx.beginPath(); ctx.arc(142 + pw + 34 + 26 * i, 134, 7, 0, 7); ctx.fill();
    }
    ctx.restore();
  }

  // ---------- scale slam (150% -> 96% -> 100% in 8f, ghost, shake) ----------
  function slam(ctx, t, o) {
    const s = kf(t, [[0, 1.5], [5, 0.96], [8, 1]], E.outCubic);
    const amp = (o.shake ?? 6) * (1 - prog(t, 5, 12)) * (t >= 4 ? 1 : 0);
    const sx = amp * Math.sin(t * 2.9), sy = amp * Math.cos(t * 3.7);
    const cy = o.y - o.size * 0.36;
    const draw = (scale, alpha, blur, color, accent) => L.withScale(ctx, o.x, cy, scale, () => {
      L.text(ctx, 0, { x: o.x + sx, y: o.y + sy, size: o.size, lines: o.lines, align: 'center',
        color, accent, alpha, motion: 'none' });
      if (blur) ctx.filter = 'none';
    });
    // ghost echo behind
    ctx.save();
    ctx.filter = 'blur(7px)';
    draw(s * 1.24 + 0.02 * Math.sin(t / 9), 0.14 + 0.1 * (1 - prog(t, 0, 20)), 7, o.ghost, o.ghost);
    ctx.restore();
    // motion-blur trail while slamming in
    if (t < 6) {
      ctx.save();
      ctx.filter = 'blur(4px)';
      for (let k = 1; k <= 3; k++) draw(s * (1 + 0.07 * k), 0.22 / k, 4, o.color, o.accent);
      ctx.restore();
    }
    draw(s, 1, 0, o.color, o.accent);
  }

  // ---------- word flicker ----------
  function flicker(ctx, f, t, b, look) {
    const n = Math.max(1, Math.floor((b.end - b.start) / b.hold));
    const slot = Math.min(n - 1, Math.floor(t / b.hold));
    const local = t - slot * b.hold;
    const len = slot === n - 1 ? b.end - b.start - slot * b.hold : b.hold;
    const word = b.copy[slot % b.copy.length], next = b.copy[(slot + 1) % b.copy.length];
    const st = look(slot);
    L.background(ctx, st.bg, f);
    const s = 1 + 0.04 * (local / len);
    const size = 250, x = 150, y = 627;
    ctx.save();
    ctx.filter = 'blur(9px)';
    L.text(ctx, 0, { x: x + 32, y: y - 117, size, lines: [next], color: st.color, alpha: 0.13 });
    ctx.restore();
    L.withScale(ctx, x, y, s, () => L.text(ctx, 0, { x, y, size, lines: [word], color: st.color }));
  }

  // ---------- paper sheets ----------
  const SHEETS = [
    { x: 1190, y: 400, r: -15 }, { x: 1490, y: 345, r: 10 },
    { x: 1318, y: 690, r: 4 }, { x: 1612, y: 710, r: -8 },
  ];
  const SHEET_LINES = [0.72, 0.7, 0.6, 0.45, 0.66, 0.38];
  function sheet(ctx, x, y, rot, s, w = 300, h = 400, alpha = 1) {
    if (s <= 0.001) return;
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x, y);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.scale(s, s);
    ctx.save();
    L.shadow(ctx, 0.12, 30, 12);
    ctx.fillStyle = '#FFFFFF';
    L.roundRect(ctx, -w / 2, -h / 2, w, h, 14);
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#D7E5F5';
    ctx.lineWidth = 2;
    L.roundRect(ctx, -w / 2, -h / 2, w, h, 14);
    ctx.stroke();
    const px = -w / 2 + 38, py = -h / 2 + 52;
    ctx.fillStyle = C.navy;
    L.roundRect(ctx, px, py, w * 0.38, 18, 9); ctx.fill();
    ctx.fillStyle = '#D6E5F7';
    SHEET_LINES.forEach((k, i) => { L.roundRect(ctx, px, py + 42 + i * 32, (w - 76) * k / 0.72 * 0.72, 11, 5.5); ctx.fill(); });
    ctx.restore();
  }

  // ---------- chart ----------
  const BARS = [800, 750, 770, 680, 700, 620, 630, 540, 570, 480];
  const LINE = [[200, 860], [380, 820], [560, 840], [740, 728], [920, 750], [1100, 648], [1230, 663], [1460, 548], [1640, 498], [1760, 450]];
  function chart(ctx, barP, lineP, alpha = 1) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    BARS.forEach((top, i) => {
      const p = barP(i);
      if (p <= 0) return;
      const x = 240 + 150 * i, h = (920 - top) * p, y = 920 - h;
      const g = ctx.createLinearGradient(0, y, 0, 920);
      g.addColorStop(0, C.sky);
      g.addColorStop(1, 'rgba(67,167,249,0.16)');
      ctx.fillStyle = g;
      L.roundRect(ctx, x, y, 80, h, [Math.min(18, h / 2), Math.min(18, h / 2), 0, 0]);
      ctx.fill();
    });
    if (lineP > 0) {
      ctx.strokeStyle = C.orange;
      ctx.lineWidth = 14;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      L.strokePoly(ctx, L.polyPartial(LINE, lineP));
    }
    ctx.restore();
  }

  // ---------- check circles ----------
  function check(ctx, cx, cy, r, s) {
    if (s <= 0.001) return;
    L.withScale(ctx, cx, cy, s, () => {
      ctx.save();
      L.shadow(ctx, 0.28, 26, 10, '247,107,19');
      ctx.fillStyle = C.orange;
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, 7); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = r * 0.17;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const k = r / 58;
      L.strokePoly(ctx, [[cx - 18 * k, cy + 2 * k], [cx - 5 * k, cy + 17 * k], [cx + 18 * k, cy - 19 * k]]);
    });
  }

  // ---------- chat bubble ----------
  function bubble(ctx, x, y, w, h, radii, fill, label, size, tx, ty) {
    ctx.save();
    L.shadow(ctx, 0.18, 34, 14);
    ctx.fillStyle = fill;
    L.roundRect(ctx, x, y, w, h, radii);
    ctx.fill();
    ctx.restore();
    L.text(ctx, 0, { x: tx, y: ty, size, lines: [label], color: '#FFFFFF' });
  }

  // ---------- dot map ----------
  const MAP = (() => {
    const r = L.rng(11), dots = [];
    while (dots.length < 34) {
      const x = 840 + r() * 950, y = 195 + r() * 770;
      if (dots.every(d => Math.hypot(d.x - x, d.y - y) > 48)) dots.push({ x, y, hot: r() < 0.42 });
    }
    const links = [];
    for (let i = 0; i < 20; i++) links.push([i, (i * 7 + 5) % dots.length]);
    return { dots, links };
  })();

  // ---------- digit reel ----------
  function reel(ctx, pos, cx, baseline, rowH, speed, ghosts) {
    const base = Math.floor(pos), fr = pos - base;
    for (let k = -1; k <= 2; k++) {
      const d = (((base + k) % 10) + 10) % 10;
      const off = (k - fr) * rowH, dist = Math.abs(off) / rowH;
      if (dist > 1.4) continue;
      if (dist > 0.6 && !ghosts) continue;
      const a = dist <= 1 ? lerp(1, 0.13, Math.min(1, dist * 1.25)) : lerp(0.13, 0, (dist - 1) / 0.4);
      const blur = 9 * Math.min(1, dist) + Math.min(10, speed * 9);
      ctx.save();
      ctx.globalAlpha *= a;
      if (blur > 0.4) ctx.filter = `blur(${blur.toFixed(1)}px)`;
      ctx.fillStyle = C.deepNavy;
      ctx.fillText(String(d), cx, baseline + off);
      ctx.restore();
    }
  }

  const fx = {};

  // ===== Scene 1 & 9.4: roofline, house =====
  function scene1(ctx, f, t, b) {
    L.background(ctx, 'paper', f);
    let g = G0, p = 1;
    if (f < 40) p = lerp(0.45, 1, E.inOutCubic(prog(f, 0, 22)));
    else g = L.lerpGeom(G0, GH, E.inOutCubic(prog(f, 40, 12)));
    if (f >= 40) house(ctx, { slots: prog(f, 46, 5), scale: k => L.pop(f, 50 + 3 * k) });
    L.roofline(ctx, g, p);
    if (b.id === '1.2') L.text(ctx, t, { x: 145, y: 512, size: 205, lh: 200, lines: b.copy, motion: 'rise', start: 4 });
    if (b.id === '1.3') L.text(ctx, t, { x: 145, y: 383, size: 140, lh: 137, lines: b.copy, motion: 'stack', start: 0, stagger: 5 });
  }
  fx['1.1'] = fx['1.2'] = fx['1.3'] = scene1;

  // ===== Scene 2 =====
  fx['2.1'] = (ctx, f, t, b) => flicker(ctx, f, t, b, () => ({ bg: 'paper', color: C.deepNavy }));
  fx['2.2'] = (ctx, f, t, b) => flicker(ctx, f, t, b, s => ({ bg: s % 2 ? 'paper' : 'sky', color: C.deepNavy }));
  fx['2.3'] = (ctx, f, t, b) => flicker(ctx, f, t, b, s => (s % 2 ? { bg: 'paper', color: C.deepNavy } : { bg: 'orange', color: '#FFFFFF' }));
  fx['2.4'] = (ctx, f, t, b) => {
    L.background(ctx, 'paper', f);
    L.text(ctx, t, { x: 145, y: 507, size: 220, lh: 220, lines: b.copy, motion: 'rise', start: 2, stagger: 4 });
    const pts = [];
    for (let x = 158; x <= 802; x += 6) pts.push([x, 866 - 22 * Math.sin(((x - 158) / 320) * 2 * Math.PI + 0.35)]);
    ctx.save();
    ctx.strokeStyle = C.sky;
    ctx.lineWidth = 10;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    L.strokePoly(ctx, L.polyPartial(pts, E.outCubic(prog(t, 12, 16))));
    ctx.restore();
  };
  fx['2.5'] = (ctx, f, t, b) => {
    L.background(ctx, 'navy', f);
    slam(ctx, t, { x: 962, y: 610, size: 330, lines: b.copy, color: '#FFFFFF', accent: C.orange, ghost: '#9DB7DD', shake: 6 });
  };

  // ===== Scene 3 =====
  fx['3.1'] = (ctx, f, t, b) => {
    L.background(ctx, 'paper', f);
    SHEETS.forEach((s, k) => sheet(ctx, s.x, s.y, s.r * (1 + 0.6 * (1 - prog(t, 6 + 3 * k, 10))), L.pop(t, 6 + 3 * k)));
    vessel(ctx, 's03', prog(t, 0, 10));
    L.text(ctx, t, { x: 145, y: 507, size: 220, lh: 220, lines: b.copy, motion: 'rise', start: 3, stagger: 4 });
  };
  let layer = null;
  function getLayer() {
    if (!layer) { layer = document.createElement('canvas'); layer.width = W; layer.height = H; }
    const lc = layer.getContext('2d');
    lc.setTransform(1, 0, 0, 1, 0, 0);
    lc.clearRect(0, 0, W, H);
    return lc;
  }
  fx['3.2'] = (ctx, f, t, b) => {
    L.background(ctx, 'mist', f);
    const lc = getLayer();
    L.text(lc, 99, { x: 145, y: 507, size: 220, lh: 220, lines: b.copy });
    // rings + cursor
    const cx = 1400, cy = 400;
    [88, 148, 208].forEach((R, k) => {
      const p = prog(t, 17 + 3 * k, 14);
      if (p <= 0) return;
      lc.save();
      lc.globalAlpha = [0.75, 0.5, 0.3][k] * clamp(p * 3);
      lc.strokeStyle = C.sky;
      lc.lineWidth = 3;
      lc.beginPath(); lc.arc(cx, cy, lerp(30, R, E.outCubic(p)), 0, 7); lc.stroke();
      lc.restore();
    });
    const cs = kf(t, [[14, 1], [17, 0.84], [23, 1]]);
    L.withScale(lc, 1390, 388, cs, () => {
      lc.save();
      lc.translate(1390, 388);
      lc.rotate(-0.12);
      const arrow = [[0, 0], [0, 178], [44, 138], [80, 214], [114, 199], [80, 126], [140, 124]];
      lc.beginPath();
      arrow.forEach(([x, y], i) => (i ? lc.lineTo(x, y) : lc.moveTo(x, y)));
      lc.closePath();
      lc.lineJoin = 'round';
      L.shadow(lc, 0.2, 20, 8);
      lc.strokeStyle = '#FFFFFF';
      lc.lineWidth = 16;
      lc.stroke();
      lc.shadowColor = 'transparent';
      lc.fillStyle = C.deepNavy;
      lc.fill();
      lc.restore();
    });
    // whip cut from the left: fast slide + directional smear
    const pos = tt => -W * (1 - E.outQuint(prog(tt, 0, 11)));
    const x = pos(t), v = x - pos(t - 1);
    if (Math.abs(v) > 1) {
      for (let k = 6; k >= 1; k--) {
        ctx.globalAlpha = 0.16;
        ctx.drawImage(layer, x - (v * k) / 6, 0);
      }
      ctx.globalAlpha = 1;
    }
    ctx.drawImage(layer, x, 0);
    vessel(ctx, 's03');
  };
  fx['3.3'] = (ctx, f, t, b) => {
    L.background(ctx, 'paper', f);
    const from = [[2250, 180, -30], [2300, 980, 26], [1150, 1380, -22], [2150, 1300, 14]];
    from.forEach(([sx, sy, sr], k) => {
      const p = E.outCubic(prog(t, 2 + 4 * k, 14));
      const depth = 3 - k;
      const tx = 1520 - 18 * depth * 0.6, ty = 550 - 18 * depth * 0.6;
      if (p <= 0) return;
      sheet(ctx, lerp(sx, tx, p), lerp(sy, ty, p), lerp(sr, 0, p), 1, lerp(300, 416, p), lerp(400, 516, p), k === 3 ? 1 : lerp(1, 0.75, p));
    });
    vessel(ctx, 's03');
    L.text(ctx, t, { x: 145, y: 510, size: 190, lh: 190, lines: b.copy, motion: 'stack', start: 2, stagger: 5 });
  };

  // ===== Scene 4 =====
  function calendar(ctx, t) {
    L.withScale(ctx, 1470, 520, L.pop(t, 2), () => {
      ctx.save();
      L.shadow(ctx, 0.14, 40, 16);
      ctx.fillStyle = '#FFFFFF';
      L.roundRect(ctx, 1242, 332, 456, 376, 26); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = '#DCE6F3'; ctx.lineWidth = 2;
      L.roundRect(ctx, 1242, 332, 456, 376, 26); ctx.stroke();
      ctx.fillStyle = C.navy;
      L.roundRect(ctx, 1242, 332, 456, 90, [26, 26, 0, 0]); ctx.fill();
      for (let r = 0; r < 3; r++) for (let c = 0; c < 5; c++) {
        ctx.fillStyle = r === 1 && c === 4 ? C.orange : '#E5EEF9';
        L.roundRect(ctx, 1278 + 78 * c, 458 + 78 * r, 58, 58, 12); ctx.fill();
      }
    });
    // "!" badge: pops, then bounces twice
    let dy = 0;
    if (t >= 16 && t < 23) dy = -40 * Math.abs(Math.sin((Math.PI * (t - 16)) / 7));
    else if (t >= 23 && t < 29) dy = -18 * Math.abs(Math.sin((Math.PI * (t - 23)) / 6));
    L.withScale(ctx, 1690, 340, L.pop(t, 9, 8, 1.15), () => {
      ctx.save();
      L.shadow(ctx, 0.4, 30, 8, '247,107,19');
      ctx.fillStyle = C.orange;
      ctx.beginPath(); ctx.arc(1690, 340 + dy, 60, 0, 7); ctx.fill();
      ctx.restore();
      L.text(ctx, 0, { x: 1690, y: 377 + dy, size: 100, lines: ['!'], align: 'center', color: '#FFFFFF' });
    });
  }
  fx['4.1'] = (ctx, f, t, b) => {
    L.background(ctx, 'paper', f);
    calendar(ctx, t);
    vessel(ctx, 's04');
    L.text(ctx, t, { x: 145, y: 510, size: 200, lh: 200, lines: b.copy, motion: 'rise', start: 2, stagger: 4 });
  };
  fx['4.2'] = (ctx, f, t, b) => {
    L.background(ctx, 'sky', f);
    slam(ctx, t, { x: 970, y: 670, size: 400, lines: b.copy, color: C.deepNavy, accent: C.deepNavy, ghost: '#1F5FA8', shake: 4 });
  };
  fx['4.3'] = (ctx, f, t, b) => {
    L.background(ctx, 'paper', f);
    vessel(ctx, 's04');
    for (let k = 0; k < 9; k++) {
      const cx = 1298 + 150 * (k % 3), cy = 348 + 150 * Math.floor(k / 3);
      if (k < 8) {
        const s = L.pop(t, 6 + 2 * k, 8);
        if (s < 1) {
          ctx.save(); ctx.globalAlpha = 1 - clamp(s);
          ctx.setLineDash([10, 8]); ctx.strokeStyle = '#C3CEDD'; ctx.lineWidth = 4;
          ctx.beginPath(); ctx.arc(cx, cy, 56, 0, 7); ctx.stroke(); ctx.restore();
        }
        check(ctx, cx, cy, 58, s);
      } else {
        ctx.save();
        ctx.setLineDash([10, 8]); ctx.strokeStyle = '#C3CEDD'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(cx, cy, 56, 0, 7); ctx.stroke();
        const p = prog(t, 24, 80);
        ctx.setLineDash([]); ctx.strokeStyle = C.sky; ctx.lineWidth = 7; ctx.lineCap = 'round';
        if (p > 0) { ctx.beginPath(); ctx.arc(cx, cy, 56, -Math.PI / 2, -Math.PI / 2 + 2 * Math.PI * p); ctx.stroke(); }
        ctx.restore();
      }
    }
    L.text(ctx, t, { x: 145, y: 520, size: 150, lh: 148, lines: b.copy, motion: 'rise', start: 2, stagger: 4 });
  };

  // ===== Scene 5 =====
  const ROUTE = L.spline([[1130, 733], [1240, 640], [1300, 545], [1390, 507], [1500, 512], [1600, 462]], 30);
  fx['5.1'] = (ctx, f, t, b) => {
    L.background(ctx, 'mist', f);
    vessel(ctx, 's05');
    // office
    L.withScale(ctx, 1644, 464, L.pop(t, 2), () => {
      ctx.fillStyle = C.navy; L.roundRect(ctx, 1600, 412, 88, 104, 8); ctx.fill();
    });
    // home icon
    L.withScale(ctx, 1128, 760, L.pop(t, 0), () => {
      ctx.strokeStyle = C.orange; ctx.lineWidth = 11; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      L.strokePoly(ctx, [[1088, 755], [1128, 716], [1168, 755]]);
      ctx.fillStyle = C.orange; L.roundRect(ctx, 1100, 756, 56, 44, 6); ctx.fill();
    });
    // dotted route
    const drawn = L.polyLength(ROUTE) * E.inOutCubic(prog(t, 6, 22));
    ctx.fillStyle = '#8E9DBB';
    let acc = 0, next = 0;
    for (let i = 1; i < ROUTE.length && acc <= drawn; i++) {
      const [x0, y0] = ROUTE[i - 1], [x1, y1] = ROUTE[i];
      const seg = Math.hypot(x1 - x0, y1 - y0);
      while (next <= acc + seg && next <= drawn) {
        const k = (next - acc) / seg;
        ctx.beginPath(); ctx.arc(lerp(x0, x1, k), lerp(y0, y1, k), 4.5, 0, 7); ctx.fill();
        next += 23;
      }
      acc += seg;
    }
    // orange X stamps over the trip
    if (t >= 30) {
      const s = kf(t - 30, [[0, 1.7], [5, 0.94], [8, 1]], E.outCubic);
      ctx.save();
      ctx.globalAlpha = clamp((t - 30) / 2);
      L.withScale(ctx, 1647, 467, s, () => {
        ctx.strokeStyle = C.orange; ctx.lineWidth = 15; ctx.lineCap = 'round';
        L.strokePoly(ctx, [[1525, 395], [1770, 540]]);
        L.strokePoly(ctx, [[1525, 540], [1770, 395]]);
      });
      ctx.restore();
    }
    L.text(ctx, t, { x: 145, y: 515, size: 170, lh: 170, lines: b.copy, motion: 'rise', start: 2, stagger: 4 });
  };
  fx['5.2'] = (ctx, f, t, b) => {
    L.background(ctx, 'paper', f);
    // rings
    [[300, 0.38], [400, 0.22]].forEach(([R, a], k) => {
      const p = prog(t, 12 + 3 * k, 14);
      if (p <= 0) return;
      ctx.save(); ctx.globalAlpha = a * clamp(p * 2); ctx.strokeStyle = C.sky; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(1490, 550, R * lerp(0.6, 1, E.outCubic(p)), 0, 7); ctx.stroke(); ctx.restore();
    });
    // phone slides up
    const dy = 760 * (1 - E.outCubic(prog(t, 0, 12)));
    ctx.save();
    ctx.translate(0, dy);
    ctx.fillStyle = '#F3F8FE';
    L.roundRect(ctx, 1308, 188, 364, 724, 64); ctx.fill();
    ctx.strokeStyle = C.deepNavy; ctx.lineWidth = 16;
    L.roundRect(ctx, 1308, 188, 364, 724, 64); ctx.stroke();
    ctx.fillStyle = C.deepNavy; L.roundRect(ctx, 1430, 216, 120, 14, 7); ctx.fill();
    ctx.restore();
    // "Submitted" card pops out at 105% and settles
    L.withScale(ctx, 1397, 502, kf(t, [[11, 0], [16, 1.05], [21, 1]], E.outCubic), () => {
      ctx.save(); L.shadow(ctx, 0.16, 40, 14);
      ctx.fillStyle = '#FFFFFF'; L.roundRect(ctx, 1118, 418, 558, 168, 28); ctx.fill(); ctx.restore();
      ctx.strokeStyle = '#DCE6F3'; ctx.lineWidth = 2; L.roundRect(ctx, 1118, 418, 558, 168, 28); ctx.stroke();
      check(ctx, 1200, 503, 40, 1);
      L.text(ctx, 0, { x: 1266, y: 497, size: 46, lines: ['Submitted'] });
      ctx.font = `400 32px ${CONFIG.font.family}`; ctx.letterSpacing = '0px';
      ctx.fillStyle = C.navy; ctx.fillText('We got it. No trip needed.', 1266, 546);
    });
    vessel(ctx, 's05');
    L.text(ctx, t, { x: 145, y: 442, size: 150, lh: 150, lines: b.copy, motion: 'rise', start: 2, stagger: 3 });
  };
  fx['5.3'] = (ctx, f, t, b) => {
    L.background(ctx, 'paper', f);
    vessel(ctx, 's05');
    L.text(ctx, t, { x: 145, y: 515, size: 185, lh: 177, lines: b.copy, motion: 'wipe', start: 3 });
  };

  // ===== Scene 6 =====
  const BIG = { x: 140, y: 360, w: 1175, h: 297, size: 210, tx: 210, ty: 582 };
  const SMALL = { x: 140, y: 250, w: 677, h: 197, size: 120, tx: 205, ty: 390 };
  const REPLY = { x: 980, y: 620, w: 855, h: 217, size: 136, tx: 1040, ty: 772 };
  const navyBubble = (ctx, g) => bubble(ctx, g.x, g.y, g.w, g.h, [60, 60, 60, 8], C.navy, copy('6.1')[0], g.size, g.tx, g.ty);
  const replyBubble = (ctx, g) => bubble(ctx, g.x, g.y, g.w, g.h, [60, 60, 8, 60], C.orange, copy('6.2')[1], g.size, g.tx, g.ty);
  fx['6.1'] = (ctx, f, t, b) => {
    L.background(ctx, 'paper', f);
    vessel(ctx, 's06');
    const s = kf(t, [[1, 0], [8, 1.06], [12, 0.985], [15, 1]], E.outCubic);
    ctx.save();
    ctx.translate(0, 60 * (1 - clamp(s)));
    L.withScale(ctx, 140, 657, s, () => navyBubble(ctx, BIG));
    ctx.restore();
  };
  fx['6.2'] = (ctx, f, t, b) => {
    L.background(ctx, 'paper', f);
    vessel(ctx, 's06');
    const k = E.inOutCubic(prog(t, 0, 9));
    const g = {};
    for (const key in BIG) g[key] = lerp(BIG[key], SMALL[key], k);
    navyBubble(ctx, g);
    // typing dots blink for 12 frames
    const ts = t < 22 ? L.pop(t, 5, 7) : 1 - E.inCubic(prog(t, 22, 5));
    L.withScale(ctx, 1338, 522, ts, () => {
      ctx.fillStyle = '#E3EEFA'; L.roundRect(ctx, 1240, 480, 197, 85, 42.5); ctx.fill();
      for (let i = 0; i < 3; i++) {
        ctx.globalAlpha = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 0.9 - i * 1.2));
        ctx.fillStyle = C.sky; ctx.beginPath(); ctx.arc(1297 + 42 * i, 523, 13, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
    });
    // orange reply pops in from the right
    const s = kf(t, [[20, 0], [27, 1.06], [30, 0.99], [33, 1]], E.outCubic);
    ctx.save();
    ctx.translate(180 * (1 - clamp(s)), 0);
    L.withScale(ctx, 1835, 837, s, () => replyBubble(ctx, REPLY));
    ctx.restore();
  };
  fx['6.3'] = (ctx, f, t, b) => {
    L.background(ctx, 'mist', f);
    const k = E.inCubic(prog(t, 0, 9));
    if (k < 1) {
      ctx.save(); ctx.translate(-1000 * k, -560 * k); navyBubble(ctx, SMALL); ctx.restore();
      ctx.save(); ctx.translate(1200 * k, 120 * k); replyBubble(ctx, REPLY); ctx.restore();
    }
    vessel(ctx, 's06');
    L.text(ctx, t, { x: 145, y: 513, size: 180, lh: 179, lines: b.copy, motion: 'rise', start: 7, stagger: 4 });
  };

  // ===== Scene 7 =====
  fx['7.1'] = (ctx, f, t, b) => {
    L.background(ctx, 'paper', f);
    chart(ctx, i => E.outCubic(prog(t, 4 + 3 * i, 10)), E.inOutCubic(prog(t, 10, 46)));
    vessel(ctx, 's07');
    L.text(ctx, t, { x: 145, y: 330, size: 140, lines: b.copy, motion: 'rise', start: 2 });
  };
  fx['7.2'] = (ctx, f, t, b) => {
    L.background(ctx, 'mist', f);
    const { dots, links } = MAP;
    ctx.save();
    ctx.strokeStyle = 'rgba(67,167,249,0.55)';
    ctx.lineWidth = 2.5;
    links.forEach(([i, j], n) => {
      const p = E.outCubic(prog(t, 5 + n * 0.6, 10));
      if (p <= 0) return;
      const a = dots[i], c = dots[j];
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(lerp(a.x, c.x, p), lerp(a.y, c.y, p)); ctx.stroke();
    });
    ctx.restore();
    dots.forEach((d, i) => {
      const s = L.pop(t, i * 0.25, 8, 1.3);
      const lit = d.hot ? prog(t, 10 + Math.hypot(d.x - 1200, d.y - 560) / 30, 6) : 0;
      L.withScale(ctx, d.x, d.y, s, () => {
        if (lit > 0) {
          ctx.fillStyle = `rgba(247,107,19,${0.2 * lit})`;
          ctx.beginPath(); ctx.arc(d.x, d.y, 30 * E.outBack(lit), 0, 7); ctx.fill();
        }
        ctx.fillStyle = lit > 0.5 ? C.orange : 'rgba(110,128,168,0.62)';
        ctx.beginPath(); ctx.arc(d.x, d.y, lerp(9, 15, E.outBack(lit)), 0, 7); ctx.fill();
      });
    });
    vessel(ctx, 's07');
    L.text(ctx, t, { x: 145, y: 435, size: 160, lh: 160, lines: b.copy, motion: 'rise', start: 2, stagger: 3 });
  };
  fx['7.3'] = (ctx, f, t, b) => {
    L.background(ctx, 'paper', f);
    chart(ctx, () => 1, 1, lerp(1, 0.18, E.outCubic(prog(t, 0, 10))));
    vessel(ctx, 's07');
    L.text(ctx, t, { x: 145, y: 508, size: 195, lh: 202, lines: b.copy, motion: 'rise', start: 4, stagger: 4 });
  };

  // ===== Scene 8 =====
  const year = t => (t < 8 ? 1976 : 1976 + 44 * Math.pow(prog(t, 8, 52), 2));
  fx['8.1'] = (ctx, f, t, b) => {
    L.background(ctx, 'paper', f);
    L.text(ctx, t, { x: 143, y: 207, size: 86, lines: [b.copy[0]], color: C.navy, motion: 'rise', start: 0 });
    const v = year(t), speed = Math.abs(year(t + 0.5) - year(t - 0.5));
    ctx.font = `700 350px ${CONFIG.font.family}`;
    ctx.letterSpacing = '0px';
    ctx.textAlign = 'center';
    const dw = Math.max(...[...'0123456789'].map(ch => ctx.measureText(ch).width));
    const ws = [...'1976'].map(() => dw + 8);
    let x = 945 - ws.reduce((a, c) => a + c, 0) / 2;
    const pos = [
      Math.floor(v / 1000) + Math.max(0, (v % 1000) - 999),
      Math.floor(v / 100) + Math.max(0, (v % 100) - 99),
      Math.floor(v / 10) + Math.max(0, (v % 10) - 9),
      v,
    ];
    const sp = [0, 0, speed / 10, speed];
    ws.forEach((w, i) => {
      const moving = pos[i] % 1 > 0;
      reel(ctx, pos[i], x + w / 2, 618, 300, sp[i], i >= 2 || moving);
      x += w;
    });
    ctx.textAlign = 'left';
  };
  fx['8.2'] = (ctx, f, t, b) => {
    L.background(ctx, 'orange', f);
    let dy = kf(t, [[0, -340], [6, 0]], E.inCubic);
    if (t >= 6 && t < 13) dy = -48 * Math.abs(Math.sin((Math.PI * (t - 6)) / 7));
    else if (t >= 13 && t < 19) dy = -14 * Math.abs(Math.sin((Math.PI * (t - 13)) / 6));
    const squash = t >= 6 && t < 9 ? 1 - 0.05 * Math.sin((Math.PI * (t - 6)) / 3) : 1;
    ctx.save();
    ctx.filter = 'blur(8px)';
    L.withScale(ctx, 960, 520, 1.13, () =>
      L.text(ctx, 0, { x: 940, y: 665 + dy * 0.6, size: 410, lines: b.copy, align: 'center', color: '#FFFFFF', alpha: 0.12 + 0.12 * (1 - prog(t, 6, 30)) }));
    ctx.restore();
    ctx.save();
    ctx.translate(960, 665);
    ctx.scale(1 / squash, squash);
    ctx.translate(-960, -665);
    L.text(ctx, 0, { x: 960, y: 665 + dy, size: 410, lines: b.copy, align: 'center', color: '#FFFFFF' });
    ctx.restore();
  };
  fx['8.3'] = (ctx, f, t, b) => {
    L.background(ctx, 'paper', f);
    L.text(ctx, t, { x: 145, y: 390, size: 130, lh: 130, lines: b.copy, motion: 'stack', start: 2, stagger: 6 });
  };

  // ===== Scene 9: booth activation (jars of value tiles + orange answer token) =====
  // Drawn in the coordinates of the booth graphic (549 x 291), scaled onto a navy card.
  const ACT = CONFIG.activation;
  const AS = 1.5, AW = 549 * AS, AH = 291 * AS, AX = 1840 - AW, AY = 540 - AH / 2;
  const jarX = i => 17 + 105.5 * i;
  const actXY = (i, c, r) => [jarX(i) + 11 + 25 * c, 204 - 25 * r]; // tile top-left, 20x20
  const ACT_TILES = [];
  ACT.jars.forEach((j, i) => j.rows.forEach((row, r) => row.forEach((v, c) => v && ACT_TILES.push({ i, r, c, v }))));
  ACT_TILES.sort((a, b) => a.r - b.r || a.i - b.i || a.c - b.c); // ripple bottom-up
  const HANG = [272, 48];
  const LAND = (() => { const d = ACT.drop, [x, y] = actXY(d.jar, d.col, d.row); return [x + 10, y + 10]; })();

  function token(ctx, x, y, rot, size, alpha = 1) {
    ctx.save();
    ctx.globalAlpha *= alpha;
    ctx.translate(x, y);
    ctx.rotate(rot);
    ctx.shadowColor = 'rgba(247,107,19,0.55)';
    ctx.shadowBlur = 10;
    ctx.fillStyle = C.orange;
    L.roundRect(ctx, -size / 2, -size / 2, size, size, size * 0.18);
    ctx.fill();
    ctx.restore();
  }
  // o: {cardS, jarA(i), tileS(k), labelP(i), glow(i), landed, tok: {x, y, rot, size, alpha, string, trail}}
  function activation(ctx, o) {
    L.withScale(ctx, AX + AW / 2, AY + AH / 2, o.cardS, () => {
      ctx.save();
      L.shadow(ctx, 0.28, 60, 24);
      ctx.fillStyle = '#0A2C60';
      L.roundRect(ctx, AX, AY, AW, AH, 30);
      ctx.fill();
      ctx.restore();
      ctx.save();
      L.roundRect(ctx, AX, AY, AW, AH, 30);
      ctx.clip();
      const g = ctx.createRadialGradient(AX + AW * 0.75, AY + 40, 0, AX + AW * 0.75, AY + 40, AW * 0.8);
      g.addColorStop(0, 'rgba(67,150,230,0.30)');
      g.addColorStop(1, 'rgba(67,150,230,0)');
      ctx.fillStyle = g;
      ctx.fillRect(AX, AY, AW, AH);
      ctx.restore();

      ctx.save();
      ctx.translate(AX, AY);
      ctx.scale(AS, AS);
      // jars
      ACT.jars.forEach((j, i) => {
        const a = o.jarA(i);
        if (a <= 0) return;
        const x0 = jarX(i), w = 92, r = 16;
        ctx.save();
        ctx.globalAlpha = a;
        ctx.translate(0, 8 * (1 - a));
        ctx.beginPath();
        ctx.moveTo(x0, 95); ctx.lineTo(x0, 240 - r); ctx.quadraticCurveTo(x0, 240, x0 + r, 240);
        ctx.lineTo(x0 + w - r, 240); ctx.quadraticCurveTo(x0 + w, 240, x0 + w, 240 - r); ctx.lineTo(x0 + w, 95);
        ctx.lineCap = 'round';
        ctx.strokeStyle = 'rgba(255,255,255,0.62)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        const gl = o.glow ? o.glow(i) : 0;
        if (gl > 0) {
          ctx.globalAlpha = a * gl;
          ctx.shadowColor = 'rgba(247,107,19,0.9)';
          ctx.shadowBlur = 14;
          ctx.strokeStyle = C.orange;
          ctx.lineWidth = 2.2;
          ctx.stroke();
        }
        ctx.restore();
      });
      // tiles
      ACT_TILES.forEach((tl, k) => {
        const sc = o.tileS(k);
        if (sc <= 0.001) return;
        const [x, y] = actXY(tl.i, tl.c, tl.r);
        L.withScale(ctx, x + 10, y + 10, sc, () => {
          ctx.fillStyle = tl.v === 2 ? C.sky : 'rgba(255,255,255,0.2)';
          L.roundRect(ctx, x, y, 20, 20, 3.5);
          ctx.fill();
        });
      });
      // labels
      ACT.jars.forEach((j, i) => {
        const p = o.labelP(i);
        if (p <= 0) return;
        L.text(ctx, 0, { x: jarX(i) + 46, y: 261 + 6 * (1 - p), size: 13, lh: 15, lines: j.label, align: 'center', color: '#FFFFFF', alpha: p });
      });
      // answer token
      const tk = o.tok;
      if (tk && tk.size > 0.1) {
        if (tk.string > 0) {
          ctx.save();
          ctx.globalAlpha = tk.string;
          ctx.strokeStyle = 'rgba(255,255,255,0.7)';
          ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(HANG[0], 6); ctx.lineTo(tk.x, tk.y - tk.size * 0.6); ctx.stroke();
          ctx.restore();
        }
        (tk.trail || []).forEach(([dy, a]) => {
          ctx.save(); ctx.filter = 'blur(1.5px)'; token(ctx, tk.x, tk.y - dy, tk.rot, tk.size, a); ctx.restore();
        });
        token(ctx, tk.x, tk.y, tk.rot, tk.size, tk.alpha ?? 1);
      }
      ctx.restore();
    });
  }
  // Text block fitted to the left column (the card takes the right side).
  function leftBlock(ctx, lines, maxW, maxSize) {
    const w = Math.max(...lines.map(l => L.textWidth(ctx, l, 100)));
    return Math.min(maxSize, Math.floor((100 * maxW) / w));
  }
  const TEXT_W = AX - 145 - 70;
  // gentle swing of the hanging token, on absolute frames so 9.1 -> 9.2 is continuous
  const hangPose = f => ({ x: HANG[0] + 4 * Math.sin(f / 9), y: HANG[1] + 2 * Math.sin(f / 7), rot: 0.26 + 0.12 * Math.sin(f / 9) });

  fx['9.1'] = (ctx, f, t, b) => {
    L.background(ctx, 'paper', f);
    const hp = hangPose(f);
    activation(ctx, {
      cardS: L.pop(t, 0, 12, 1.04),
      jarA: i => E.outCubic(prog(t, 5 + 2 * i, 8)),
      tileS: k => L.pop(t, 9 + 0.55 * k, 8, 1.15),
      labelP: i => E.outCubic(prog(t, 14 + 2 * i, 10)),
      tok: { ...hp, size: 22 * L.pop(t, 30, 10, 1.2), string: prog(t, 30, 6) },
    });
    const size = leftBlock(ctx, b.copy, TEXT_W, 160), lh = size * 1.0;
    const y0 = 540 - (b.copy.length * lh) / 2 + 0.74 * size;
    L.text(ctx, t, { x: 145, y: y0, size, lh, lines: b.copy, motion: 'rise', start: 6, stagger: 4 });
  };
  fx['9.2'] = (ctx, f, t, b) => {
    L.background(ctx, 'paper', f);
    const hp = hangPose(f);
    let tok;
    if (t < 6) {
      tok = { ...hp, size: 22, string: 1 };
    } else if (t < 15) {
      // tiny lift, string lets go, token falls into the jar
      const y = t < 9 ? lerp(hp.y, hp.y - 12, E.outCubic(prog(t, 6, 3))) : lerp(hp.y - 12, LAND[1], E.inCubic(prog(t, 9, 6)));
      const k = prog(t, 6, 9);
      tok = { x: lerp(hp.x, LAND[0], E.inOutCubic(k)), y, rot: lerp(hp.rot, 0, E.inOutCubic(k)), size: lerp(22, 20, k),
        string: 1 - prog(t, 6, 3), trail: t >= 10 ? [[16, 0.3], [32, 0.14]] : [] };
    } else {
      const dy = kf(t, [[15, 0], [18, -9], [21, 0], [23, -3], [25, 0]], E.outCubic);
      tok = { x: LAND[0], y: LAND[1] + dy, rot: kf(t, [[15, 0.12], [20, -0.06], [25, 0]]), size: 20, string: 0 };
    }
    const glow = i => (i === ACT.drop.jar && t >= 15 ? 1 - prog(t, 30, 30) : 0);
    activation(ctx, { cardS: 1, jarA: () => 1, tileS: () => 1, labelP: () => 1, glow, tok });
    // landing ripple
    if (t >= 15 && t < 32) {
      const rp = prog(t, 15, 16);
      ctx.save();
      ctx.globalAlpha = 0.7 * (1 - rp);
      ctx.strokeStyle = C.orange;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(AX + LAND[0] * AS, AY + LAND[1] * AS, 20 + 70 * E.outCubic(rp), 0, 7);
      ctx.stroke();
      ctx.restore();
    }
    const lines = b.copy.slice(0, 2);
    const size = leftBlock(ctx, lines, TEXT_W, 160), lh = size * 1.02;
    const top = 540 - (2 * lh + 40 + 110) / 2;
    const y0 = top + 0.78 * size;
    L.text(ctx, t, { x: 145, y: y0, size, lh, lines, motion: 'rise', start: 2, stagger: 4 });
    const py = top + 2 * lh + 40;
    const pw = L.textWidth(ctx, b.copy[2], 60) + 100;
    L.withScale(ctx, 145 + pw / 2, py + 55, L.pop(t, 24), () => {
      ctx.fillStyle = C.deepNavy;
      L.roundRect(ctx, 145, py, pw, 110, 55); ctx.fill();
      L.text(ctx, 0, { x: 145 + pw / 2, y: py + 76, size: 60, lines: [b.copy[2]], align: 'center', color: '#FFFFFF' });
    });
  };
  function closeCard(ctx, t, alpha, blur, dy) {
    const img = window.ASSETS.wordmark;
    const lp = E.outCubic(prog(t, 4, 12));
    ctx.save();
    ctx.globalAlpha = clamp(lp * 1.4) * alpha;
    const b = 10 * (1 - lp) + blur;
    if (b > 0.3) ctx.filter = `blur(${b}px)`;
    ctx.drawImage(img, LOGO.x, LOGO.y + 283 * LOGO.s + 26 * (1 - lp) + dy, img.width * LOGO.s, img.height * LOGO.s);
    ctx.restore();
    ctx.save();
    if (blur > 0.3) ctx.filter = `blur(${blur}px)`;
    ctx.translate(0, dy);
    L.text(ctx, t, { x: 960, y: 795, size: 108, lines: copy('9.3'), align: 'center', color: '#FFFFFF', motion: 'rise', start: 22, alpha });
    ctx.restore();
  }
  fx['9.3'] = (ctx, f, t, b) => {
    L.background(ctx, 'navy', f);
    closeCard(ctx, t, 1, 0, 0);
    L.roofline(ctx, GL, E.outCubic(prog(t, 0, 22)), 30, 0.45);
  };
  fx['9.4'] = (ctx, f, t, b) => {
    L.background(ctx, 'navy', f);
    L.background(ctx, 'paper', f, E.outCubic(prog(t, 0, 12)));
    const out = prog(t, 0, 9);
    if (out < 1) closeCard(ctx, 90, 1 - out, 10 * out, -30 * E.inCubic(out));
    const m = E.inOutCubic(prog(t, 4, 26));
    const p = lerp(1, 0.45, E.inOutCubic(prog(t, 14, 46)));
    L.roofline(ctx, L.lerpGeom(GL, G0, m), p, lerp(30, 22, m), lerp(0.45, 0.35, m));
  };

  // ---------- frame entry ----------
  // Output frame -> source frame: the timeline is stretched by CONFIG.timeScale.
  const totalFrames = Math.round(CONFIG.frames * CONFIG.timeScale);
  function renderFrame(ctx, F) {
    F = ((F % totalFrames) + totalFrames) % totalFrames;
    const f = F / CONFIG.timeScale;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.filter = 'none';
    ctx.clearRect(0, 0, W, H);
    const flash = CONFIG.flashes[Math.floor(f)] || CONFIG.flashes[Math.floor(f) - 1];
    if (flash) { L.background(ctx, flash, f); return; }
    const b = CONFIG.beats.find(x => f >= x.start && f < x.end);
    ctx.save();
    fx[b.id](ctx, f, f - b.start, b);
    ctx.restore();
  }
  window.SCENES = { renderFrame, fx, totalFrames };
})();
