// THE SCORE: Marvel Decoration & More logo reveal. Single source of truth for music AND picture.
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
  const clock = makeClock({ bpm: 120, offset: 0.5 }); // 1 beat = 0.5 s, 1 bar = 2 s
  const { T, BEAT } = clock;
  const DURATION = T(5) + 1.5; // 12 s

  // ---------- the logo, in its source-image pixels (5000 x 1922) ----------
  const LOGO = { w: 5000, h: 1922 };
  // the green house outline, traced as one stroke: down the chimney post, along the floor,
  // up the left wall, then up the roof to meet the post
  const HOUSE_PATH = [[692, 41], [692, 1857], [70, 1857], [70, 950], [692, 330]];

  // ---------- events ----------
  const ev = {
    gridIn: T(0),          // blueprint grid fades in
    drawStart: T(0, 1),    // pencil starts tracing the house
    drawEnd: T(1, 3),      // ...and closes it
    window: T(2),          // the window pops in on the downbeat
    letters: [],           // MARVEL stamps on 8th notes
    tagStart: T(3, 2),     // DECORATION & MORE wipes in
    tagEnd: T(3, 3.5),
    shine: T(4),           // final chord + light sweep across the logo
    end: DURATION,
  };
  const LETTERS = ['M', 'A', 'R', 'V', 'E', 'L'];
  const LNOTES = ['F4', 'A4', 'C5', 'F5', 'A5', 'C6'];
  LETTERS.forEach((k, i) => ev.letters.push({ k, t: T(2, 2) + i * BEAT / 2, midi: m(LNOTES[i]) }));

  const S = {
    draw: [0, ev.window],
    letters: [ev.window, ev.tagStart],
    tag: [ev.tagStart, ev.shine],
    outro: [ev.shine, DURATION],
  };

  const { chords, chordAt } = makeChords(clock, {
    F: { notes: ['A3', 'C4', 'F4'], bass: 'F2' },
    Dm: { notes: ['A3', 'D4', 'F4'], bass: 'D2' },
    Bb: { notes: ['Bb3', 'D4', 'F4'], bass: 'Bb1' },
    C: { notes: ['G3', 'C4', 'E4'], bass: 'C2' },
    Fmaj9: { notes: ['A3', 'C4', 'E4', 'G4'], bass: 'F1' },
  }, [
    [0, 0, 4, 'F'], [1, 0, 4, 'Dm'], [2, 0, 4, 'Bb'], [3, 0, 4, 'C'], [4, 0, 6, 'Fmaj9'],
  ]);

  // music-box arpeggio while the house is drawn (8th notes, bars 0-1)
  const arp = [];
  const ARP = { 0: ['F5', 'C5', 'A4', 'C5'], 1: ['F5', 'D5', 'A4', 'D5'] };
  for (const b of [0, 1]) for (let i = 0; i < 8; i++) {
    if (b === 0 && i < 2) continue;
    arp.push({ t: T(b, i / 2), midi: m(ARP[b][i % 4]) });
  }

  const markers = {
    window: { t: ev.window, sync: 'a' }, // small mark: picture onset too faint to measure
    M: { t: ev.letters[0].t, sync: 'av' },
    L: ev.letters[5].t, // 6 stamps 0.25 s apart: too close to measure separately
    tag: ev.tagStart,
    shine: ev.shine,
  };

  const SCORE = { FPS, FORMAT, W, H, SAFE, WIDE, DURATION, clock, T, BEAT, S, m, chords, chordAt, ev, markers, LOGO, HOUSE_PATH, arp };
  if (node) module.exports = SCORE; else globalThis.SCORE = SCORE;
})();
