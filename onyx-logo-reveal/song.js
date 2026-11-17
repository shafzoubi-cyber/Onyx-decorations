// THE SONG: renders every sound of the Onyx logo reveal from score.js into out/music.wav.
const path = require('path');
const { SR, Bus, reverb, pingpong } = require('./engine/audio/dsp');
const I = require('./engine/audio/instruments');
const MIX = require('./engine/audio/mix');
const sc = require('./score');
const { T, BEAT, DURATION, m, ev } = sc;

const N = Math.ceil(DURATION * SR);
const bus = () => new Bus(N);
const pad = bus(), str = bus(), keys = bus(), low = bus(), fx = bus(), verb = bus(), dly = bus();

// dark, warm pads and slow strings
for (const c of sc.chords) {
  const dur = c.t1 - c.t0;
  for (const n of c.notes) {
    const p = I.padNote(n, dur, { cutoff: c.t0 >= ev.shine ? 2400 : 1100, attack: 0.9, release: 1.8 }); pad.addStereo(p.L, p.R, c.t0, 0.08);
    const s = I.strings(n + 12, dur, { attack: 0.6, release: 1.2, bright: 0.6, seed: n }); str.addStereo(s.L, s.R, c.t0, 0.05);
  }
  low.addMono(I.bass(c.bass + 12, Math.min(dur, 3.2), { bright: 0.1, sub: 1 }), c.t0, 0.35);
}

// music-box sparkles following the golden pen
for (const n of sc.sparkle) { const mb = I.musicBox(n.midi, { decay: 1.1 }); keys.addMono(mb, n.t, 0.13, Math.sin(n.t * 2) * 0.4); verb.addMono(mb, n.t, 0.22); dly.addMono(mb, n.t, 0.08); }
// the pen itself: a soft airy swell over the O and N
fx.addMono(I.noiseSweep(ev.nEnd - ev.oStart, 700, 3800, { q: 0.9, pink: true, seed: 3 }), ev.oStart, 0.1);

// the X: two slashes, a whoosh + a bright tine each
for (const [i, t] of [ev.x1, ev.x2].entries()) {
  fx.addMono(I.noiseSweep(ev.xDur, 6000, 900, { q: 1.3, pink: true, seed: 10 + i, shape: (x) => Math.pow(1 - x, 1.5) }), t, 0.35, i ? 0.35 : -0.35);
  const e = I.epiano(m(i ? 'A5' : 'E5'), 0.8, { index: 2.2, decay: 1.2 }); keys.addMono(e, t, 0.18, i ? 0.3 : -0.3); verb.addMono(e, t, 0.15);
}

// the hit: low boom, timpani, a bright bell chord
fx.addMono(I.subBoom(2.6, 60, 30), ev.hit, 0.6);
low.addMono(I.timpani(m('A1'), { decay: 1.4 }), ev.hit, 0.55);
for (const n of ['A4', 'D5', 'E5', 'A5']) { const e = I.epiano(m(n), 2.2, { index: 1.8, decay: 1.8 }); keys.addMono(e, ev.hit, 0.13); verb.addMono(e, ev.hit, 0.15); }
const tg = I.ting(m('E7')); keys.addMono(tg, ev.hit, 0.18); verb.addMono(tg, ev.hit, 0.2);

// tagline: a quiet shimmer run outward
for (let i = 0; i < 8; i++) { const mb = I.musicBox(m(['D6', 'E6', 'F#6', 'A6', 'C#7', 'E7', 'F#7', 'A7'][i]), { decay: 0.7 }); keys.addMono(mb, ev.tagStart + i * BEAT / 4, 0.06, i % 2 ? 0.45 : -0.45); verb.addMono(mb, ev.tagStart + i * BEAT / 4, 0.09); }

// shine: the resolving Dmaj9 chord, e-piano + bell
for (const n of ['D3', 'A3', 'C#4', 'E4', 'F#4', 'A4']) { const e = I.epiano(m(n), 3.5, { index: 1.3, decay: 2.6 }); keys.addMono(e, ev.shine, 0.14); verb.addMono(e, ev.shine, 0.12); }
const bl = I.musicBox(m('F#6'), { decay: 2.4 }); keys.addMono(bl, ev.shine, 0.2); verb.addMono(bl, ev.shine, 0.3); dly.addMono(bl, ev.shine, 0.1);
fx.addMono(I.noiseSweep(1.6, 1500, 8000, { q: 1, pink: true, seed: 51 }), ev.shine, 0.07);

const stems = { pad, str, keys, low, fx, verb: reverb(verb, { room: 0.9, damp: 0.35 }), dly: pingpong(dly, BEAT * 0.75, 0.35, 4000) };
const GAIN = { pad: 2.0, str: 4, keys: 1.0, low: 0.7, fx: 0.8, verb: 1, dly: 1 };
const out = path.join(__dirname, 'out');
const mix = MIX.mixdown(stems, GAIN, { stemDir: process.env.STEMS ? out : null });
MIX.highpass(mix, 25);
MIX.fadeOut(mix, DURATION - 1.4, DURATION);
const M = MIX.master(mix, 0.8, undefined, { lufs: process.env.LUFS ? parseFloat(process.env.LUFS) : -14 });
MIX.writeWav(path.join(out, 'music.wav'), mix);
console.log(`wrote out/music.wav (${DURATION.toFixed(2)}s, ${M.lufs.toFixed(1)} LUFS)`);
