// THE FILM: draws frame t of the Onyx logo reveal. Pure function of t.
(function () {
  const U = globalThis.U, G = globalThis.G, S = globalThis.SCORE, Studio = globalThis.Studio;
  const { ev, LOGO, O_CENTER, O_R, N_PATH, X_PATHS } = S;
  const { clamp, lerp, ease } = U;
  const W = G.W, H = G.H;

  const NAMES = ['O', 'N', 'X', 'tag'];
  const IMG = {};
  let PARTS = null, buf = null, logoBuf = null;

  const LW = W * (S.WIDE ? 0.5 : 0.84);
  const SC = LW / LOGO.w;
  const LX = W / 2 - LW / 2;
  const LY = H * 0.46 - (LOGO.h * SC) / 2;
  const toScreen = (p) => [LX + (p[0] - LOGO.x) * SC, LY + (p[1] - LOGO.y) * SC];

  const len = (pts) => { let L = 0; for (let i = 1; i < pts.length; i++) L += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]); return L; };
  function partial(pts, d) {
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i], l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (d >= l) { out.push(b); d -= l; } else { const k = d / l; out.push([lerp(a[0], b[0], k), lerp(a[1], b[1], k)]); return out; }
    }
    return out;
  }

  // a dust of gold motes drifting upward (deterministic per index)
  function dust(ctx, t) {
    const a0 = clamp((t - ev.glowIn) / 2);
    if (a0 <= 0) return;
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 70; i++) {
      const sx = U.hash(i, 1), sy = U.hash(i, 2), sp = 0.4 + U.hash(i, 3);
      const x = sx * W + Math.sin(t * 0.4 + i) * 18;
      const y = ((sy * H - t * 28 * sp) % H + H) % H;
      const r = 1 + U.hash(i, 4) * 2.4;
      const tw = 0.5 + 0.5 * Math.sin(t * (1.5 + sp) + i * 2.1);
      ctx.fillStyle = `rgba(232,190,110,${0.6 * a0 * tw})`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }

  function background(ctx, t) {
    ctx.fillStyle = '#050403'; ctx.fillRect(0, 0, W, H);
    const k = clamp((t - ev.glowIn) / 2.5);
    const boost = t >= ev.hit ? 0.25 * Math.exp(-(t - ev.hit) * 2) : 0;
    const g = ctx.createRadialGradient(W / 2, H * 0.46, 0, W / 2, H * 0.46, W * 0.9);
    g.addColorStop(0, `rgba(120,82,30,${0.32 * k + boost})`);
    g.addColorStop(0.5, `rgba(60,38,12,${0.14 * k})`);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    dust(ctx, t);
  }

  // draw piece k through a mask drawn by maskFn (in source-pixel space)
  function masked(ctx, k, maskFn) {
    const p = PARTS[k], bx = buf.getContext('2d');
    bx.setTransform(1, 0, 0, 1, 0, 0); bx.globalCompositeOperation = 'source-over';
    bx.clearRect(0, 0, buf.width, buf.height);
    bx.translate(-p.x, -p.y);
    bx.fillStyle = '#000'; bx.strokeStyle = '#000';
    maskFn(bx);
    bx.setTransform(1, 0, 0, 1, 0, 0);
    bx.globalCompositeOperation = 'source-in';
    bx.drawImage(IMG[k], 0, 0);
    ctx.drawImage(buf, 0, 0, p.w, p.h, p.x, p.y, p.w, p.h);
  }
  function full(ctx, k) { const p = PARTS[k]; ctx.drawImage(IMG[k], p.x, p.y, p.w, p.h); }
  function strokeMask(pts, lw) { return (bx) => { bx.lineWidth = lw; bx.lineCap = 'round'; bx.lineJoin = 'round'; bx.beginPath(); bx.moveTo(pts[0][0], pts[0][1]); for (const q of pts.slice(1)) bx.lineTo(q[0], q[1]); bx.stroke(); }; }

  // returns the pen heads (source coords) currently drawing
  function logoLayer(ctx, t) {
    const heads = [];
    ctx.save();
    const grow = 1 + 0.03 * ease.outQuad(clamp((t - ev.shine) / 3));
    const cy = LY + (LOGO.h * SC) / 2;
    ctx.translate(W / 2, cy); ctx.scale(grow, grow); ctx.translate(-W / 2, -cy);
    ctx.translate(LX, LY); ctx.scale(SC, SC); ctx.translate(-LOGO.x, -LOGO.y);

    // O: a clockwise sweep from 12 o'clock
    const uo = ease.inOutCubic(clamp((t - ev.oStart) / (ev.oEnd - ev.oStart)));
    if (uo >= 1) full(ctx, 'O');
    else if (uo > 0) {
      const a0 = -Math.PI / 2, a1 = a0 + uo * Math.PI * 2;
      masked(ctx, 'O', (bx) => { bx.beginPath(); bx.moveTo(O_CENTER[0], O_CENTER[1]); bx.arc(O_CENTER[0], O_CENTER[1], O_R * 1.4, a0, a1); bx.closePath(); bx.fill(); });
      heads.push([O_CENTER[0] + Math.cos(a1) * O_R, O_CENTER[1] + Math.sin(a1) * O_R]);
    }
    // N: up, down the diagonal, up again
    const un = ease.inOutCubic(clamp((t - ev.nStart) / (ev.nEnd - ev.nStart)));
    if (un >= 1) full(ctx, 'N');
    else if (un > 0) {
      const pts = partial(N_PATH, un * len(N_PATH));
      masked(ctx, 'N', strokeMask(pts, 120));
      heads.push(pts[pts.length - 1]);
    }
    // X: two fast slashes
    const u1 = ease.outCubic(clamp((t - ev.x1) / ev.xDur)), u2 = ease.outCubic(clamp((t - ev.x2) / ev.xDur));
    if (u1 >= 1 && u2 >= 1) full(ctx, 'X');
    else if (u1 > 0) {
      masked(ctx, 'X', (bx) => {
        for (const [u, P] of [[u1, X_PATHS[0]], [u2, X_PATHS[1]]]) {
          if (u <= 0) continue;
          const pts = partial(P, u * len(P));
          strokeMask(pts, 190)(bx);
        }
      });
      for (const [u, P] of [[u1, X_PATHS[0]], [u2, X_PATHS[1]]]) if (u > 0 && u < 1) { const pts = partial(P, u * len(P)); heads.push(pts[pts.length - 1]); }
    }
    // tagline: opens from the centre outward
    const w = ease.inOutQuad(clamp((t - ev.tagStart) / (ev.tagEnd - ev.tagStart)));
    if (w > 0) {
      const p = PARTS.tag, cx = p.x + p.w / 2;
      ctx.save(); ctx.globalAlpha = clamp(w * 1.5);
      ctx.beginPath(); ctx.rect(cx - (p.w / 2) * w - 4, p.y, p.w * w + 8, p.h); ctx.clip();
      full(ctx, 'tag'); ctx.restore();
    }
    ctx.restore();
    return heads.map((h) => { const s = toScreen(h); const c = H * 0.46; return [W / 2 + (s[0] - W / 2) * grow, c + (s[1] - c) * grow]; });
  }

  function penGlow(ctx, x, y, r = 34) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,245,215,1)'); g.addColorStop(0.3, 'rgba(240,190,90,0.7)'); g.addColorStop(1, 'rgba(240,190,90,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  Studio.film({
    async init() {
      PARTS = await (await fetch('assets/parts.json')).json();
      for (const k of NAMES) IMG[k] = await Studio.loadImage(`assets/${k}.png`);
      const mw = Math.max(...NAMES.map((k) => PARTS[k].w)), mh = Math.max(...NAMES.map((k) => PARTS[k].h));
      buf = G.makeCanvas(mw, mh);
      logoBuf = G.makeCanvas(W, H);
    },
    draw(ctx, t) {
      background(ctx, t);
      const lx = logoBuf.getContext('2d');
      lx.setTransform(1, 0, 0, 1, 0, 0); lx.globalCompositeOperation = 'source-over'; lx.globalAlpha = 1;
      lx.clearRect(0, 0, W, H);
      const heads = logoLayer(lx, t);
      // light sweep across the gold
      if (t >= ev.shine && t < ev.shine + 1.6) {
        const k = ease.inOutQuad((t - ev.shine) / 1.6);
        const cx = lerp(LX - 300, LX + LW + 300, k);
        const g = lx.createLinearGradient(cx - 140, 0, cx + 140, 0);
        g.addColorStop(0, 'rgba(255,250,230,0)'); g.addColorStop(0.5, 'rgba(255,250,230,0.85)'); g.addColorStop(1, 'rgba(255,250,230,0)');
        lx.globalCompositeOperation = 'source-atop';
        lx.save(); lx.translate(cx, H / 2); lx.transform(1, 0, -0.4, 1, 0, 0); lx.translate(-cx, -H / 2);
        lx.fillStyle = g; lx.fillRect(cx - 200, 0, 400, H); lx.restore();
      }
      // soft gold bloom under the mark, stronger on the hit
      const bloom = 0.35 + (t >= ev.hit ? 0.9 * Math.exp(-(t - ev.hit) * 3) : 0);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = bloom; ctx.filter = 'blur(18px)';
      ctx.drawImage(logoBuf, 0, 0); ctx.restore();
      ctx.drawImage(logoBuf, 0, 0);
      for (const h of heads) penGlow(ctx, h[0], h[1]);
      // the hit: a warm full-frame flash
      if (t >= ev.hit) {
        const f = 0.55 * Math.exp(-(t - ev.hit) * 9);
        if (f > 0.01) { ctx.fillStyle = `rgba(255,214,140,${f})`; ctx.fillRect(0, 0, W, H); }
      }
    },
    post: { paper: 0, vignette: 0.3, grain: 0.03 },
    fadeOut: 0,
  });
})();
