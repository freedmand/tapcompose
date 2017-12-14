import {Chord, ChordTemplate, ContextualChord, ContextualChordTemplate, NamedChordTemplate} from './chord.js';
import {Interval, Note} from './note.js';

import test from 'ava';

test('Chord', (t) => {
  const chord = new Chord(new Note('C2'), new Note('E2'), new Note('G2'));
  t.is(chord.getN(0).note, 'C2');
  t.is(chord.getN(1).note, 'E2');
  t.is(chord.getN(2).note, 'G2');
  t.is(chord.getN(3).note, 'C3');
  t.is(chord.getN(4).note, 'E3');
  t.is(chord.getN(5).note, 'G3');
  t.is(chord.getN(6).note, 'C4');

  t.is(chord.getN(-1).note, 'G1');
  t.is(chord.getN(-2).note, 'E1');
  t.is(chord.getN(-3).note, 'C1');
  t.is(chord.getN(-4).note, 'G0');
  t.is(chord.getN(-5).note, 'E0');
  t.is(chord.getN(-6).note, 'C0');
  t.is(chord.getN(-7).note, 'G-1');
});

test('Contextual Chord', (t) => {
  const template = new ContextualChordTemplate(
    Interval.P1(),
    new NamedChordTemplate(
      new ChordTemplate(Interval.P1(), Interval.P4(), Interval.P5()),
      'sus4',
    ),
    new ChordTemplate(
      Interval.P1(),
      Interval.M2(),
      Interval.M3(),
      Interval.P4(),
      Interval.P5(),
    ),
  );

  const contextualChord = template.apply(new Note('E#4'));

  // Check the chord is right.
  t.is(contextualChord.chord.notes.length, 3);
  t.is(contextualChord.chord.notes[0].note, 'E#4');
  t.is(contextualChord.chord.notes[1].note, 'A#5');
  t.is(contextualChord.chord.notes[2].note, 'B#5');

  // Check the name is right.
  t.is(contextualChord.name, 'E#sus4');

  // Check the scale is right.
  t.is(contextualChord.scale.notes.length, 5);
  t.is(contextualChord.scale.notes[0].note, 'E#4');
  t.is(contextualChord.scale.notes[1].note, 'F##4');
  t.is(contextualChord.scale.notes[2].note, 'G##4');
  t.is(contextualChord.scale.notes[3].note, 'A#5');
  t.is(contextualChord.scale.notes[4].note, 'B#5');
});

test('Contextual Chord Off Inter', (t) => {
  const template = new ContextualChordTemplate(
    Interval.P4(),
    new NamedChordTemplate(
      new ChordTemplate(Interval.P1(), Interval.P4(), Interval.P5()),
      'sus4',
    ),
    new ChordTemplate(
      Interval.P1(),
      Interval.M2(),
      Interval.M3(),
      Interval.P4(),
      Interval.P5(),
    ),
  );

  const contextualChord = template.apply(new Note('A#5'));

  // Check the chord is right.
  t.is(contextualChord.chord.notes.length, 3);
  t.is(contextualChord.chord.notes[0].note, 'A#5');
  t.is(contextualChord.chord.notes[1].note, 'D#5');
  t.is(contextualChord.chord.notes[2].note, 'E#5');

  // Check the name is right.
  t.is(contextualChord.name, 'A#sus4');

  // Check the scale is right.
  t.is(contextualChord.scale.notes.length, 5);
  t.is(contextualChord.scale.notes[0].note, 'E#4');
  t.is(contextualChord.scale.notes[1].note, 'F##4');
  t.is(contextualChord.scale.notes[2].note, 'G##4');
  t.is(contextualChord.scale.notes[3].note, 'A#5');
  t.is(contextualChord.scale.notes[4].note, 'B#5');
});