import {BasicChordSuggester, Guess, Guesses, Outcome, Suggester} from './suggest.js';
import {majorContext, minorContext} from './western.js';

import {Note} from './note.js';
import test from 'ava';

test('Sample Simple', (t) => {
  const guess1 = new Guess('a', 0.5);
  const guess2 = new Guess('b', 0.5);
  const guesses = new Guesses([guess1, guess2]);
  t.is(guesses.sample(0).value, 'a');
  t.is(guesses.sample(0.49).value, 'a');
  t.is(guesses.sample(0.5).value, 'b');
  t.is(guesses.sample(0.99).value, 'b');
  t.throws(() => guesses.sample(1));
});

test('Sample Complex', (t) => {
  const guess1 = new Guess('a', 0.1);
  const guess2 = new Guess('b', 0.7);
  const guess3 = new Guess('c', 0.4);
  const guess4 = new Guess('d', 0.3);

  const guesses = new Guesses([guess1, guess2, guess3, guess4]);
  t.is(guesses.totalProb, 1.5);
  t.is(guesses.mostLikely.value, 'b');

  t.is(guesses.sample(0 / 1.5).value, 'a');
  t.is(guesses.sample(0.09 / 1.5).value, 'a');
  t.is(guesses.sample(0.100001 / 1.5).value, 'b');
  t.is(guesses.sample(0.79 / 1.5).value, 'b');
  t.is(guesses.sample(0.800001 / 1.5).value, 'c');
  t.is(guesses.sample(1.19 / 1.5).value, 'c');
  t.is(guesses.sample(1.200001 / 1.5).value, 'd');
  t.is(guesses.sample(1.49 / 1.5).value, 'd');
  t.throws(() => guesses.sample(1.500001 / 1.5));
});

class SuggesterMock extends Suggester {
  constructor() {
    super();
    /**
     * A counter for the purposes of having the suggester return incrementing
     * numbers as suggestions.
     * @type {number}
     */
    this.counter = 0;
  }

  suggestInternal_() {
    this.counter++;
    return new Outcome([], new Guess(this.counter, 1));
  }
}

test('Suggester Suggest Simple', (t) => {
  const suggester = new SuggesterMock();
  t.deepEqual(suggester.history.map(h => h.value), []);

  t.is(suggester.suggest().value, 1);
  t.deepEqual(suggester.history.map(h => h.value), [1]);
  t.is(suggester.suggest().value, 2);
  t.deepEqual(suggester.history.map(h => h.value), [2]);
  t.is(suggester.suggest().value, 3);
  t.deepEqual(suggester.history.map(h => h.value), [3]);
});

test('Suggester Suggest and Accept', (t) => {
  const suggester = new SuggesterMock();

  t.is(suggester.suggest().value, 1);
  t.is(suggester.suggest().value, 2);
  suggester.accept();
  t.deepEqual(suggester.history.map(h => h.value), [2]);
  t.is(suggester.suggest().value, 3);
  t.deepEqual(suggester.history.map(h => h.value), [2, 3]);
});

test('Suggester Clear Suggestion', (t) => {
  const suggester = new SuggesterMock();
  t.deepEqual(suggester.history.map(h => h.value), []);
  suggester.clearSuggestion();
  t.deepEqual(suggester.history.map(h => h.value), []);

  t.is(suggester.suggest().value, 1);
  t.deepEqual(suggester.history.map(h => h.value), [1]);
  suggester.clearSuggestion();
  t.deepEqual(suggester.history.map(h => h.value), []);
});

test('Suggester Accept and Clear Suggestion', (t) => {
  const suggester = new SuggesterMock();
  t.is(suggester.suggest().value, 1);
  suggester.accept();
  t.is(suggester.suggest().value, 2);
  t.deepEqual(suggester.history.map(h => h.value), [1, 2]);
  suggester.clearSuggestion();
  t.deepEqual(suggester.history.map(h => h.value), [1]);
});

test('Basic Chord Suggester C Major Scales', (t) => {
  const chordSuggester = new BasicChordSuggester(new Note('C4'), majorContext);

  t.is(chordSuggester.contextualChords[0].namedChord.name , 'C');
  t.is(chordSuggester.contextualChords[1].namedChord.name , 'Cmaj7');
  t.is(chordSuggester.contextualChords[2].namedChord.name , 'F');
  t.is(chordSuggester.contextualChords[3].namedChord.name , 'Fmaj7');
  t.is(chordSuggester.contextualChords[4].namedChord.name , 'G');
  t.is(chordSuggester.contextualChords[5].namedChord.name , 'G7');
  t.is(chordSuggester.contextualChords[6].namedChord.name , 'Dm');
  t.is(chordSuggester.contextualChords[7].namedChord.name , 'Dm7');
  t.is(chordSuggester.contextualChords[8].namedChord.name , 'Am');
  t.is(chordSuggester.contextualChords[9].namedChord.name , 'Am7');
  t.is(chordSuggester.contextualChords[10].namedChord.name, 'Em');
  t.is(chordSuggester.contextualChords[11].namedChord.name, 'Em7');

  const expectedScale = ['C4', 'D4', 'E4', 'F4', 'G4', 'A5', 'B5'];
  for (const contextualChord of chordSuggester.contextualChords) {
    t.deepEqual(
        contextualChord.scale.notes.map((note) => note.note), expectedScale);
  }
});

test('Basic Chord Suggester Eb Minor Scales', (t) => {
  const chordSuggester = new BasicChordSuggester(new Note('Eb2'), minorContext);

  t.is(chordSuggester.contextualChords[0].namedChord.name , 'Ebm');
  t.is(chordSuggester.contextualChords[1].namedChord.name , 'Ebm7');
  t.is(chordSuggester.contextualChords[2].namedChord.name , 'Abm');
  t.is(chordSuggester.contextualChords[3].namedChord.name , 'Abm7');
  t.is(chordSuggester.contextualChords[4].namedChord.name , 'Bb');
  t.is(chordSuggester.contextualChords[5].namedChord.name , 'Bb7');
  t.is(chordSuggester.contextualChords[6].namedChord.name , 'Fdim');
  t.is(chordSuggester.contextualChords[7].namedChord.name , 'Fm7b5');
  t.is(chordSuggester.contextualChords[8].namedChord.name , 'Cb');
  t.is(chordSuggester.contextualChords[9].namedChord.name , 'Cbmaj7');
  t.is(chordSuggester.contextualChords[10].namedChord.name, 'Gb');
  t.is(chordSuggester.contextualChords[11].namedChord.name, 'Gbmaj7');

  const expectedNaturalScale = ['Eb2', 'F2', 'Gb2', 'Ab3', 'Bb3', 'Cb3', 'Db3'];
  const expectedHarmonicScale =
      ['Eb2', 'F2', 'Gb2', 'Ab3', 'Bb3', 'Cb3', 'D3']; // Sharp 7 scale degree.
  // The indices in the contextual chords that are expected to be harmonic
  // scales.
  const harmonicIndices = [4, 5];

  for (let i = 0; i < chordSuggester.contextualChords.length; i++) {
    const contextualChord = chordSuggester.contextualChords[i];
    t.deepEqual(contextualChord.scale.notes.map((note) => note.note),
        harmonicIndices.includes(i) ?
        expectedHarmonicScale : expectedNaturalScale);
  }
});
