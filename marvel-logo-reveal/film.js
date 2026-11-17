// THE FILM: draws frame t of the Marvel logo reveal. Pure function of t.
(function () {
  const U = globalThis.U, G = globalThis.G, S = globalThis.SCORE, Studio = globalThis.Studio;
  const { ev, LOGO, HOUSE_PATH, BEAT } = S;
  const { clamp, lerp, ease } = U;
  const W = G.W, H = G.H;

  const NAMES = ['house', 'window', 'M', 'A', 'R', 'V', 'E', 'L', 'tag'];
  const IMG = {};
  let PARTS = null, houseBuf = null, logoBuf = null;

  // logo placement: centred in the safe area, as wide as it comfortably fits
  const SAFE = S.SAFE;
  const LW = W * (S.WIDE ? 0.62 : 0.86);
  const SC = LW / LOGO.w;
  const LX = W / 2 - LW / 2;
  const LY = H * 0.47 - (LOGO.h * SC) / 2;

  const NAVY = '#15304D', GREEN = '#57B083';

  function pathLen(pts) { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; }
  const HLEN = pathLen(HOUSE_PATH);
  function partialPath(pts, d) { // the first d px of the polyline, plus its head point
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (d >= l) { out.push(b); d -= l; } else { const k = d / l; out.push([lerp(a[0], b[0], k), lerp(a[1], b[1], k)]); return out; }
    }
    return out;
  }

  function background(ctx, t) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#FBFCFA'); g.addColorStop(1, '#EEF4F0');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    // blueprint grid that sketches itself in, then settles very faint
    const a = 0.10 * clamp((t - ev.gridIn) / 1.5);
    if (a <= 0) return;
    const step = 60;
    ctx.save();
    ctx.lineWidth = 1;
    ctx.strokeStyle = `rgba(87,176,131,${a})`;
    const grow = ease.inOutQuad(clamp((t - ev.gridIn) / 2.2));
    for (let x = (W / 2) % step; x < W; x += step) { ctx.beginPath(); ctx.moveTo(x, H / 2 - (H / 2) * grow); ctx.lineTo(x, H / 2 + (H / 2) * grow); ctx.stroke(); }
    for (let y = (H * 0.47) % step; y < H; y += step) { ctx.beginPath(); ctx.moveTo(W / 2 - (W / 2) * grow, y); ctx.lineTo(W / 2 + (W / 2) * grow, y); ctx.stroke(); }
    ctx.restore();
  }

  // draw a part (in logo pixel space; the caller has applied the logo transform)
  function part(ctx, k, { s = 1, dy = 0, alpha = 1 } = {}) {
    const p = PARTS[k], img = IMG[k];
    const cx = p.x + p.w / 2, cy = p.y + p.h / 2;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy + dy); ctx.scale(s, s);
    ctx.drawImage(img, -p.w / 2, -p.h / 2, p.w, p.h);
    ctx.restore();
  }

  function house(ctx, t) {
    const u = ease.inOutQuad(clamp((t - ev.drawStart) / (ev.drawEnd - ev.drawStart)));
    if (u <= 0) return null;
    if (u >= 1) { part(ctx, 'house'); return null; }
    const pts = partialPath(HOUSE_PATH, u * HLEN);
    const b = houseBuf, bx = b.getContext('2d');
    bx.setTransform(1, 0, 0, 1, 0, 0);
    bx.globalCompositeOperation = 'source-over';
    bx.clearRect(0, 0, b.width, b.height);
    bx.lineWidth = 92; bx.lineCap = 'butt'; bx.lineJoin = 'miter'; bx.strokeStyle = '#000';
    bx.beginPath(); bx.moveTo(pts[0][0], pts[0][1] - 40);
    for (const q of pts.slice(1)) bx.lineTo(q[0], q[1]);
    bx.stroke();
    bx.globalCompositeOperation = 'source-in';
    bx.drawImage(IMG.house, 0, 0);
    ctx.drawImage(b, 0, 0);
    return pts[pts.length - 1]; // the pencil head
  }

  function logoLayer(ctx, t) {
    ctx.save();
    // a slow breathe-in of the whole mark once it is complete
    const grow = 1 + 0.035 * ease.outQuad(clamp((t - ev.shine) / 3));
    ctx.translate(W / 2, LY + (LOGO.h * SC) / 2); ctx.scale(grow, grow); ctx.translate(-W / 2, -(LY + (LOGO.h * SC) / 2));
    ctx.translate(LX, LY); ctx.scale(SC, SC);

    const head = house(ctx, t);

    // window: pops in on the downbeat
    if (t >= ev.window) {
      const a = t - ev.window;
      part(ctx, 'window', { s: lerp(1.5, 1, ease.outBack(clamp(a / 0.3), 2.2)) });
    }
    // letters: each stamps on its 8th note
    for (const L of ev.letters) {
      const a = t - L.t;
      if (a < 0) continue;
      const k = clamp(a / 0.22);
      part(ctx, L.k, { s: lerp(1.28, 1, ease.outBack(k, 1.6)), dy: lerp(-60, 0, ease.outQuad(k)) });
    }
    // tagline: wiped in left to right
    const w = ease.inOutQuad(clamp((t - ev.tagStart) / (ev.tagEnd - ev.tagStart)));
    if (w > 0) {
      const p = PARTS.tag;
      ctx.save(); ctx.beginPath(); ctx.rect(p.x, p.y, p.w * w, p.h); ctx.clip();
      part(ctx, 'tag'); ctx.restore();
    }
    ctx.restore();
    return head && [LX + head[0] * SC, LY + head[1] * SC];
  }

  function burst(ctx, t, t0, x, y, color, n = 10, r0 = 30, r1 = 90) {
    const a = t - t0;
    if (a < 0 || a > 0.45) return;
    const k = ease.outQuad(a / 0.45);
    ctx.save(); ctx.strokeStyle = color; ctx.lineCap = 'round'; ctx.lineWidth = 4 * (1 - k) + 0.5; ctx.globalAlpha = 1 - k;
    for (let i = 0; i < n; i++) {
      const ang = (i / n) * Math.PI * 2 + 0.3;
      const ra = lerp(r0, r1, k) * 0.7, rb = lerp(r0, r1, k);
      ctx.beginPath(); ctx.moveTo(x + Math.cos(ang) * ra, y + Math.sin(ang) * ra); ctx.lineTo(x + Math.cos(ang) * rb, y + Math.sin(ang) * rb); ctx.stroke();
    }
    ctx.restore();
  }

  Studio.film({
    async init() {
      PARTS = await (await fetch('assets/parts.json')).json();
      for (const k of NAMES) IMG[k] = await Studio.loadImage(`assets/${k}.png`);
      houseBuf = G.makeCanvas(PARTS.house.w, PARTS.house.h);
      logoBuf = G.makeCanvas(W, H);
    },
    draw(ctx, t) {
      background(ctx, t);

      // the logo goes into its own layer so the final light sweep only touches the ink
      const lx = logoBuf.getContext('2d');
      lx.setTransform(1, 0, 0, 1, 0, 0); lx.globalCompositeOperation = 'source-over'; lx.globalAlpha = 1;
      lx.clearRect(0, 0, W, H);
      const head = logoLayer(lx, t);
      if (t >= ev.shine && t < ev.shine + 1.4) {
        const k = ease.inOutQuad((t - ev.shine) / 1.4);
        const cx = lerp(LX - 300, LX + LW + 300, k);
        const g = lx.createLinearGradient(cx - 160, 0, cx + 160, 0);
        g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.5, 'rgba(255,255,255,0.75)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        lx.globalCompositeOperation = 'source-atop';
        lx.save(); lx.translate(cx, H / 2); lx.transform(1, 0, -0.35, 1, 0, 0); lx.translate(-cx, -H / 2);
        lx.fillStyle = g; lx.fillRect(cx - 200, 0, 400, H); lx.restore();
      }
      // soft shadow under the mark
      ctx.save(); ctx.shadowColor = 'rgba(21,48,77,0.16)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 8;
      ctx.drawImage(logoBuf, 0, 0); ctx.restore();

      // pencil head glow while the house is being traced
      if (head) {
        const gl = ctx.createRadialGradient(head[0], head[1], 0, head[0], head[1], 26);
        gl.addColorStop(0, 'rgba(255,255,255,0.95)'); gl.addColorStop(0.35, 'rgba(87,176,131,0.8)'); gl.addColorStop(1, 'rgba(87,176,131,0)');
        ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(head[0], head[1], 26, 0, Math.PI * 2); ctx.fill();
      }
      // little sparks: the window, then each letter
      const wp = PARTS && PARTS.window;
      if (wp) burst(ctx, t, ev.window, LX + (wp.x + wp.w / 2) * SC, LY + (wp.y + wp.h / 2) * SC, NAVY, 10, 22, 70);
      for (const L of ev.letters) {
        const p = PARTS[L.k];
        burst(ctx, t, L.t, LX + (p.x + p.w / 2) * SC, LY + (p.y + p.h) * SC + 6, GREEN, 6, 10, 40);
      }
    },
    post: { paper: 0, vignette: 0.04, grain: 0.015 },
    fadeOut: 0,
  });
})();
