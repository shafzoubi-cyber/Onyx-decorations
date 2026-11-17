// THE SONG: renders every sound of the logo reveal from score.js into out/music.wav.
const path = require('path');
const { SR, Bus, reverb, pingpong } = require('./engine/audio/dsp');
const I = require('./engine/audio/instruments');
const MIX = require('./engine/audio/mix');
const sc = require('./score');
const { T, BEAT, DURATION, m, ev } = sc;

const N = Math.ceil(DURATION * SR);
const bus = () => new Bus(N);
const pad = bus(), keys = bus(), bass = bus(), hits = bus(), fx = bus(), verb = bus(), dly = bus();

// warm pads under everything
for (const c of sc.chords) {
  for (const n of c.notes) { const { L, R } = I.padNote(n, c.t1 - c.t0, { cutoff: c.t0 >= ev.shine ? 2200 : 1200, attack: 0.6, release: 1.6 }); pad.addStereo(L, R, c.t0, 0.08); }
}
// soft bass from the window onwards
for (const c of sc.chords) if (c.t0 >= ev.window) bass.addMono(I.bass(c.bass + 12, Math.min(c.t1 - c.t0, 3), { bright: 0.2, sub: 0.9 }), c.t0, 0.45);

// music-box arpeggio while the house is drawn
for (const n of sc.arp) { const mb = I.musicBox(n.midi); keys.addMono(mb, n.t, 0.16, 0.15); verb.addMono(mb, n.t, 0.2); dly.addMono(mb, n.t, 0.07); }
// the pencil: a soft rising whoosh that follows the stroke
fx.addMono(I.noiseSweep(ev.drawEnd - ev.drawStart, 500, 5200, { q: 1.1, pink: true }), ev.drawStart, 0.16);

// window pop: a click + bright ting, exactly on the downbeat
fx.addMono(I.pop(2400, 5), ev.window, 0.5);
fx.addMono(I.thud(110, 0.07), ev.window, 0.55);
const tg = I.ting(m('C7')); hits.addMono(tg, ev.window, 0.3); verb.addMono(tg, ev.window, 0.25);

// MARVEL: each letter is a marimba note + a little stamp, rising up the F major chord
ev.letters.forEach((L, i) => {
  const x = I.marimba(L.midi, { thock: 0.5 });
  const pan = -0.5 + i * 0.2; // sound moves left to right with the letters
  hits.addMono(x, L.t, 0.55, pan); verb.addMono(x, L.t, 0.18);
  hits.addMono(I.thud(140 - i * 6, 0.05, 30 + i), L.t, 0.4, pan);
  hits.addMono(I.woodTick(1 + i * 0.08), L.t, 0.25, pan);
});

// tagline: a shimmering sweep as it wipes in
fx.addMono(I.noiseSweep(ev.tagEnd - ev.tagStart + 0.2, 2500, 9000, { q: 1.4, pink: false, seed: 44 }), ev.tagStart, 0.08);
for (let i = 0; i < 6; i++) { const mb = I.musicBox(m(['C6', 'D6', 'F6', 'G6', 'A6', 'C7'][i]), { decay: 0.8 }); keys.addMono(mb, ev.tagStart + i * BEAT / 4, 0.07, -0.4 + i * 0.16); verb.addMono(mb, ev.tagStart + i * BEAT / 4, 0.1); }

// final chord: e-piano + bell + low boom, as the light sweeps across
for (const n of ['F3', 'C4', 'E4', 'A4', 'C5', 'G5']) { const e = I.epiano(m(n), 3.0, { index: 1.4, decay: 2.2 }); keys.addMono(e, ev.shine, 0.16); verb.addMono(e, ev.shine, 0.12); }
const bl = I.musicBox(m('F6'), { decay: 2.2 }); keys.addMono(bl, ev.shine, 0.22); verb.addMono(bl, ev.shine, 0.3); dly.addMono(bl, ev.shine, 0.1);
fx.addMono(I.subBoom(2.4, 70, 32), ev.shine, 0.35);
fx.addMono(I.noiseSweep(1.4, 1200, 7000, { q: 1, pink: true, seed: 51 }), ev.shine, 0.1);

const stems = { pad, keys, bass, hits, fx, verb: reverb(verb, { room: 0.86, damp: 0.35 }), dly: pingpong(dly, BEAT * 0.75, 0.35, 4000) };
const GAIN = { pad: 2.2, keys: 1.0, bass: 0.6, hits: 0.9, fx: 0.8, verb: 1, dly: 1 };
const out = path.join(__dirname, 'out');
const mix = MIX.mixdown(stems, GAIN, { stemDir: process.env.STEMS ? out : null });
MIX.highpass(mix, 25);
MIX.fadeOut(mix, DURATION - 1.2, DURATION);
const M = MIX.master(mix, parseFloat(process.env.DRIVE || '0.8'), undefined, { lufs: process.env.LUFS ? parseFloat(process.env.LUFS) : -14 });
MIX.writeWav(path.join(out, 'music.wav'), mix);
console.log(`wrote out/music.wav (${DURATION.toFixed(2)}s${M.lufs !== undefined ? `, ${M.lufs.toFixed(1)} LUFS` : ''})`);
