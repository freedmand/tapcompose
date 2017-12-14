/**
 * Exports chords and chord contexts to represent the classical Western music
 * system.
 */

import {ChordTemplate, ContextualChordTemplate, NamedChordTemplate} from './chord.js';

import {Interval} from './note.js';

// Named chord templates.
export const major = new NamedChordTemplate(
  new ChordTemplate(Interval.P1(), Interval.M3(), Interval.P5()),
  '',
);
export const minor = new NamedChordTemplate(
  new ChordTemplate(Interval.P1(), Interval.m3(), Interval.P5()),
  'm',
);
export const dominant7 = new NamedChordTemplate(
  new ChordTemplate(Interval.P1(), Interval.M3(), Interval.P5(), Interval.m7()),
  '7',
);
export const minor7 = new NamedChordTemplate(
  new ChordTemplate(Interval.P1(), Interval.m3(), Interval.P5(), Interval.m7()),
  'm7',
);
export const major7 = new NamedChordTemplate(
  new ChordTemplate(Interval.P1(), Interval.M3(), Interval.P5(), Interval.M7()),
  'maj7',
);
export const diminished = new NamedChordTemplate(
  new ChordTemplate(Interval.P1(), Interval.m3(), Interval.d5()),
  'dim',
);
export const diminished7 = new NamedChordTemplate(
  new ChordTemplate(Interval.P1(), Interval.m3(), Interval.d5(), Interval.d7()),
  'dim7',
);
export const halfDiminished7 = new NamedChordTemplate(
  new ChordTemplate(Interval.P1(), Interval.m3(), Interval.d5(), Interval.m7()),
  'm7b5',
);
export const augmented = new NamedChordTemplate(
  new ChordTemplate(Interval.P1(), Interval.M3(), Interval.a5()),
  'aug',
);

// Named scales.
export const majorScale = new ChordTemplate(
  Interval.P1(), Interval.M2(), Interval.M3(), Interval.P4(), Interval.P5(),
  Interval.M6(), Interval.M7());
export const minorScale = new ChordTemplate(
  Interval.P1(), Interval.M2(), Interval.m3(), Interval.P4(), Interval.P5(),
  Interval.m6(), Interval.m7());
export const harmonicMinorScale = new ChordTemplate(
  Interval.P1(), Interval.M2(), Interval.m3(), Interval.P4(), Interval.P5(),
  Interval.m6(), Interval.M7());


// Key signature contexts.
export const majorContext = [
  new ContextualChordTemplate(Interval.P1(), major    , majorScale),
  new ContextualChordTemplate(Interval.P1(), major7   , majorScale),
  new ContextualChordTemplate(Interval.P4(), major    , majorScale),
  new ContextualChordTemplate(Interval.P4(), major7   , majorScale),
  new ContextualChordTemplate(Interval.P5(), major    , majorScale),
  new ContextualChordTemplate(Interval.P5(), dominant7, majorScale),
  new ContextualChordTemplate(Interval.M2(), minor    , majorScale),
  new ContextualChordTemplate(Interval.M2(), minor7   , majorScale),
  new ContextualChordTemplate(Interval.M6(), minor    , majorScale),
  new ContextualChordTemplate(Interval.M6(), minor7   , majorScale),
  new ContextualChordTemplate(Interval.M3(), minor    , majorScale),
  new ContextualChordTemplate(Interval.M3(), minor7   , majorScale),
];

export const minorContext = [
  new ContextualChordTemplate(Interval.P1(), minor          , minorScale),
  new ContextualChordTemplate(Interval.P1(), minor7         , minorScale),
  new ContextualChordTemplate(Interval.P4(), minor          , minorScale),
  new ContextualChordTemplate(Interval.P4(), minor7         , minorScale),
  new ContextualChordTemplate(Interval.P5(), major          ,
                              harmonicMinorScale),
  new ContextualChordTemplate(Interval.P5(), dominant7      ,
                              harmonicMinorScale),
  new ContextualChordTemplate(Interval.M2(), diminished     , minorScale),
  new ContextualChordTemplate(Interval.M2(), halfDiminished7, minorScale),
  new ContextualChordTemplate(Interval.m6(), major          , minorScale),
  new ContextualChordTemplate(Interval.m6(), major7         , minorScale),
  new ContextualChordTemplate(Interval.m3(), major          , minorScale),
  new ContextualChordTemplate(Interval.m3(), major7         , minorScale),
];

export const durationTemplates = [
  [1, 1, 1, 1],
  [1, 0.5, 0.5, 1, 1],
  [1, 1, 1, 0.5, 0.5],
  [0.5, 0.5, 0.5, 0.5, 1, 1],
  [1, 1, 0.5, 0.5, 0.5, 0.5],
];
