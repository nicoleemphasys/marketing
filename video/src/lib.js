// Reusable motion + drawing primitives (the named animations from the guide board).
(function () {
  const C = CONFIG.colors;
  const W = CONFIG.width, H = CONFIG.height;

  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const prog = (t, start, dur) => clamp((t - start) / dur);
  const E = {
    linear: t => t,
    outCubic: t => 1 - Math.pow(1 - t, 3),
    outQuint: t => 1 - Math.pow(1 - t, 5),
    inCubic: t => t * t * t,
    inOutCubic: t => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    outBack: (t, s = 1.70158) => 1 + (s + 1) * Math.pow(t - 1, 3) + s * Math.pow(t - 1, 2),
  };
  // Piecewise keyframes: [[frame, value], ...], eased per segment.
  function kf(t, keys, ease = E.inOutCubic) {
    if (t <= keys[0][0]) return keys[0][1];
    for (let i = 1; i < keys.length; i++) {
      const [f1, v1] = keys[i];
      if (t <= f1) {
        const [f0, v0] = keys[i - 1];
        return lerp(v0, v1, ease((t - f0) / (f1 - f0)));
      }
    }
    return keys[keys.length - 1][1];
  }
  // Deterministic pseudo-random.
  function rng(seed) {
    let s = seed >>> 0;
    return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
  }

  // ---------- backgrounds ----------
  function radial(ctx, x, y, r, rgb, a) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(${rgb},${a})`);
    g.addColorStop(0.5, `rgba(${rgb},${a * 0.55})`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  function linear(ctx, x0, y0, x1, y1, stops) {
    const g = ctx.createLinearGradient(x0, y0, x1, y1);
    stops.forEach(([o, c]) => g.addColorStop(o, c));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
  // Soft glows drift on a period that divides the loop, so frame 1800 == frame 0.
  function drift(f) {
    const a = (2 * Math.PI * f) / CONFIG.frames;
    return { x: Math.sin(a) * 60, y: Math.cos(a * 2) * 30 };
  }
  function background(ctx, type, f, alpha = 1) {
    const d = drift(f);
    ctx.save();
    ctx.globalAlpha = alpha;
    if (type === 'paper') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, W, H);
      radial(ctx, 1690 + d.x, 140 + d.y, 1050, '67,167,249', 0.24);
      radial(ctx, 90 - d.x, 1010 - d.y, 900, '247,107,19', 0.12);
    } else if (type === 'mist') {
      linear(ctx, 0, 0, W, H, [[0, '#DCEAFB'], [0.45, '#EEF4FC'], [1, '#F8F5F3']]);
      radial(ctx, 1560 - d.x, 860 + d.y, 760, '247,107,19', 0.07);
      radial(ctx, 120 + d.x, 80, 700, '67,167,249', 0.08);
    } else if (type === 'sky') {
      linear(ctx, 0, H, W, 0, [[0, '#55AEF8'], [0.5, '#6BB9F9'], [1, '#78BFF9']]);
      radial(ctx, 380 + d.x, 210 + d.y, 700, '255,255,255', 0.32);
      radial(ctx, 1200 - d.x, 60, 600, '67,167,249', 0.25);
      radial(ctx, 1800, 1000, 700, '255,255,255', 0.14);
    } else if (type === 'orange') {
      linear(ctx, 0, 0, W, H * 0.4, [[0, '#F76B13'], [1, '#FB9256']]);
      radial(ctx, 1560 + d.x, 190 + d.y, 760, '255,196,150', 0.42);
    } else if (type === 'navy') {
      linear(ctx, 0, 0, W, H, [[0, '#082C63'], [0.6, '#163C78'], [1, '#1D3F78']]);
      radial(ctx, 1420 + d.x, 280 + d.y, 1000, '56,128,206', 0.5);
    }
    ctx.restore();
  }

  // ---------- text ----------
  function setFont(ctx, size, weight = 700) {
    ctx.font = `${weight} ${size}px ${CONFIG.font.family}`;
    ctx.letterSpacing = `${(CONFIG.font.tracking * size).toFixed(2)}px`;
  }
  // "for *people.*" -> [['for ', base], ['people.', accent]]
  function parse(line, base, accent) {
    return line.split(/(\*[^*]+\*)/).filter(Boolean).map(s =>
      s.startsWith('*') ? [s.slice(1, -1), accent] : [s, base]);
  }
  function width(ctx, segs) {
    return segs.reduce((w, [t]) => w + ctx.measureText(t).width, 0);
  }
  function drawSegs(ctx, segs, x, y) {
    for (const [t, c] of segs) {
      ctx.fillStyle = c;
      ctx.fillText(t, x, y);
      x += ctx.measureText(t).width;
    }
  }

  // Per-line animation states for the named text motions.
  const motions = {
    none: () => ({}),
    // Rise & unblur: rises 34px, blur 12 -> 0, 10f, stagger.
    rise: (t, i, o) => {
      const p = prog(t, o.start + i * (o.stagger ?? 3), 10), e = E.outCubic(p);
      return { dy: 34 * (1 - e), blur: 12 * (1 - e), alpha: clamp(p * 1.6) };
    },
    // Kinetic stack: lines slide from alternating sides, 8f, 4% overshoot.
    stack: (t, i, o) => {
      const p = prog(t, o.start + i * (o.stagger ?? 5), 8), e = E.outBack(p, 0.75);
      const side = i % 2 ? 1 : -1;
      return { dx: side * 620 * (1 - e), alpha: clamp(p * 2.5), blur: 10 * (1 - p) };
    },
    // Mask wipe: thin orange bar reveals each line, 12f per line.
    wipe: (t, i, o) => {
      const p = prog(t, o.start + i * 12, 12);
      return { reveal: E.inOutCubic(p), bar: p > 0 && p < 1, barFade: 1 - prog(t, o.start + i * 12 + 12, 4) };
    },
  };

  // Draw a block of lines. o: {x, y (first baseline), size, lh, lines, color, accent,
  // align, motion, start, stagger, weight, alpha}
  function text(ctx, t, o) {
    const color = o.color ?? C.deepNavy, accent = o.accent ?? C.orange;
    setFont(ctx, o.size, o.weight ?? 700);
    o.lines.forEach((line, i) => {
      const segs = parse(line, color, accent);
      const w = width(ctx, segs);
      const st = (motions[o.motion ?? 'none'])(t, i, o);
      let x = o.align === 'center' ? o.x - w / 2 : o.x;
      const y = o.y + i * (o.lh ?? o.size);
      ctx.save();
      ctx.globalAlpha *= (st.alpha ?? 1) * (o.alpha ?? 1);
      if (st.blur > 0.3) ctx.filter = `blur(${st.blur.toFixed(1)}px)`;
      if (st.reveal !== undefined) {
        if (st.reveal <= 0) { ctx.restore(); return; }
        const rx = x - 20 + (w + 40) * st.reveal;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, y - o.size * 1.1, rx, o.size * 1.5);
        ctx.clip();
        drawSegs(ctx, segs, x, y);
        ctx.restore();
        if (st.bar || st.barFade > 0) {
          ctx.globalAlpha *= st.bar ? 1 : st.barFade;
          ctx.fillStyle = C.orange;
          roundRect(ctx, rx - 4, y - o.size * 0.86, 10, o.size * 1.06, 5);
          ctx.fill();
        }
      } else {
        drawSegs(ctx, segs, x + (st.dx ?? 0), y + (st.dy ?? 0));
      }
      ctx.restore();
    });
  }
  function textWidth(ctx, line, size, weight = 700) {
    setFont(ctx, size, weight);
    return width(ctx, parse(line, '', ''));
  }

  // ---------- shapes ----------
  function roundRect(ctx, x, y, w, h, r) {
    const rr = Array.isArray(r) ? r : [r, r, r, r]; // tl, tr, br, bl
    ctx.beginPath();
    ctx.moveTo(x + rr[0], y);
    ctx.lineTo(x + w - rr[1], y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + rr[1]);
    ctx.lineTo(x + w, y + h - rr[2]);
    ctx.quadraticCurveTo(x + w, y + h, x + w - rr[2], y + h);
    ctx.lineTo(x + rr[3], y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - rr[3]);
    ctx.lineTo(x, y + rr[0]);
    ctx.quadraticCurveTo(x, y, x + rr[0], y);
    ctx.closePath();
  }
  function shadow(ctx, a = 0.16, blur = 30, oy = 10, rgb = '33,67,124') {
    ctx.shadowColor = `rgba(${rgb},${a})`;
    ctx.shadowBlur = blur;
    ctx.shadowOffsetY = oy;
  }
  // Pop & settle: 0 -> 108% -> 100% in 10f (peak configurable).
  function pop(t, start, dur = 10, peak = 1.08) {
    if (t < start) return 0;
    return kf(t - start, [[0, 0], [dur * 0.6, peak], [dur, 1]], E.outCubic);
  }
  function withScale(ctx, cx, cy, s, fn) {
    if (s <= 0.001) return;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(s, s);
    ctx.translate(-cx, -cy);
    fn();
    ctx.restore();
  }

  // Partial polyline (for roofline draw, route, chart line).
  function polyLength(pts) {
    let L = 0;
    for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    return L;
  }
  function polyPartial(pts, p) {
    const target = polyLength(pts) * clamp(p);
    const out = [pts[0]];
    let acc = 0;
    for (let i = 1; i < pts.length; i++) {
      const [x0, y0] = pts[i - 1], [x1, y1] = pts[i];
      const seg = Math.hypot(x1 - x0, y1 - y0);
      if (acc + seg >= target) {
        const k = seg ? (target - acc) / seg : 0;
        out.push([lerp(x0, x1, k), lerp(y0, y1, k)]);
        return out;
      }
      acc += seg;
      out.push(pts[i]);
    }
    return out;
  }
  function strokePoly(ctx, pts) {
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
  }

  // Roofline: orange -> sky gradient chevron, drawn to progress p (0..1).
  function roofline(ctx, g, p, lw = 22, glowA = 0.35) {
    if (p <= 0.001) return;
    const pts = [g.L, g.A, g.R];
    const grad = ctx.createLinearGradient(g.L[0], 0, g.R[0], 0);
    grad.addColorStop(0, C.orange);
    grad.addColorStop(1, C.sky);
    ctx.save();
    ctx.strokeStyle = grad;
    ctx.lineWidth = lw;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.shadowColor = `rgba(247,107,19,${glowA})`;
    ctx.shadowBlur = 22;
    ctx.shadowOffsetY = 4;
    strokePoly(ctx, polyPartial(pts, p));
    ctx.restore();
  }
  function lerpGeom(a, b, t) {
    const m = (p, q) => [lerp(p[0], q[0], t), lerp(p[1], q[1], t)];
    return { L: m(a.L, b.L), A: m(a.A, b.A), R: m(a.R, b.R) };
  }

  // Smooth curve through points, sampled (Catmull-Rom).
  function spline(pts, steps = 24) {
    const out = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
      for (let s = 0; s < steps; s++) {
        const t = s / steps, t2 = t * t, t3 = t2 * t;
        const f = k => 0.5 * ((2 * p1[k]) + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
        out.push([f(0), f(1)]);
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }

  window.LIB = {
    C, W, H, clamp, lerp, prog, E, kf, rng, background, setFont, parse, width, drawSegs, text, textWidth,
    roundRect, shadow, pop, withScale, polyLength, polyPartial, strokePoly, roofline, lerpGeom, spline,
  };
})();
