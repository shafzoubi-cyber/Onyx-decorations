// THE SCORE: Onyx Decoration & More logo reveal. Single source of truth for music AND picture.
(function () {
  const node = typeof require !== 'undefined';
  const U = node ? require('./engine/util') : globalThis.U;
  const MU = node ? require('./engine/music') : globalThis.MUSIC;
  const { m, makeClock, makeChords } = MU;

  const FPS = 30;
  const FORMAT = U.pickFormat('9:16');
  const [W, H] = U.formatSize(FORMAT);
  const SAFE = U.safeArea(W, H);
  const WIDE = W / H > 1.2;
  const clock = makeClock({ bpm: 90, offset: 0.5 }); // 1 beat = 0.667 s, 1 bar = 2.667 s
  const { T, BEAT } = clock;
  const DURATION = T(4, 2); // 12.5 s

  // ---------- the logo, in the 3x-upscaled source pixels ----------
  const LOGO = { x: 255, y: 480, w: 1410, h: 810 };
  const O_CENTER = [510, 838.5], O_R = 234;
  const N_PATH = [[804, 1075], [804, 600], [1125, 1075], [1125, 600]];
  const X_PATHS = [[[1180, 485], [1640, 1175]], [[1640, 485], [1180, 1175]]];

  const ev = {
    glowIn: T(0),
    oStart: T(0, 1), oEnd: T(1, 0),          // O traced as one golden circle
    nStart: T(1, 0), nEnd: T(1, 3),          // N traced up, down, up
    x1: T(2, 0), x2: T(2, 1), xDur: 0.4,     // the X cut in two slashes, one per beat
    hit: T(2, 2),                            // complete: warm flash + low boom
    tagStart: T(2, 3), tagEnd: T(3, 1),      // DECORATION & MORE opens from the centre
    shine: T(3, 2),                          // final chord + light sweep
    end: DURATION,
  };

  const S = {
    trace: [0, ev.x1],
    x: [ev.x1, ev.tagStart],
    tag: [ev.tagStart, ev.shine],
    outro: [ev.shine, DURATION],
  };

  const { chords, chordAt } = makeChords(clock, {
    Dm9: { notes: ['F3', 'A3', 'C4', 'E4'], bass: 'D2' },
    Bbmaj7: { notes: ['F3', 'A3', 'D4'], bass: 'Bb1' },
    Gm9: { notes: ['F3', 'Bb3', 'D4', 'A4'], bass: 'G1' },
    Asus: { notes: ['E3', 'A3', 'D4'], bass: 'A1' },
    Dmaj9: { notes: ['F#3', 'A3', 'C#4', 'E4'], bass: 'D2' },
  }, [
    [0, 0, 3, 'Dm9'], [1, 0, 3, 'Bbmaj7'], [2, 0, 2, 'Gm9'], [2, 2, 2, 'Asus'], [3, 2, 5, 'Dmaj9'],
  ]);

  // music-box sparkles that follow the golden pen around the O and through the N (8th notes)
  const sparkle = [];
  const SP = ['A5', 'E5', 'F5', 'C6', 'A5', 'E6', 'D6', 'C6', 'Bb5', 'F5', 'D6', 'A5', 'F6', 'D6', 'C6', 'A5'];
  for (let i = 0; i < 12; i++) sparkle.push({ t: ev.oStart + i * BEAT / 2, midi: m(SP[i % SP.length]) });

  const markers = {
    x1: ev.x1,
    hit: { t: ev.hit, sync: 'av' }, // full-frame warm flash + boom
    tag: ev.tagStart,
    shine: ev.shine,
  };

  const SCORE = { FPS, FORMAT, W, H, SAFE, WIDE, DURATION, clock, T, BEAT, S, m, chords, chordAt, ev, markers, LOGO, O_CENTER, O_R, N_PATH, X_PATHS, sparkle };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
