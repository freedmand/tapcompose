import {Interval, Note} from './note.js';
import {TestContext, test} from 'ava';

/**
 * Asserts the two notes are equal.
 * @param {!TestContext} t The AVA test context.
 * @param {!Note} note1 The first note.
 * @param {!Note} note2 The second note.
 */
function assertNoteEquals(t, note1, note2) {
  t.is(note1.note, note2.note);
};

/**
 * Asserts that applying the specified interval to the base note will result in
 * the expected final note.
 * @param {!TestContext} t The AVA test context.
 * @param {!Note} baseNote The base note to jump from.
 * @param {!Interval} interval The interval to jump.
 * @param {string} finalNote The expected final note name.
 * @param {boolean=} reverse Whether to jump in reverse.
 */
function assertJump(t, baseNote, interval, finalNote, reverse = false) {
  assertNoteEquals(t,
      new Note(baseNote).jump(interval, reverse),
      new Note(finalNote));
}

test('Simple', t => {
  const note = new Note('C4');
  t.is(note.noteLetter, 'C');
  t.is(note.accidentals, 0);
  t.is(note.octave, 4);
});

test('Single Sharp', (t) => {
  const note = new Note('A#0');
  t.is(note.noteLetter, 'A');
  t.is(note.accidentals, 1);
  t.is(note.octave, 0);
});

test('Multiple Sharps', (t) => {
  const note = new Note('A###0');
  t.is(note.noteLetter, 'A');
  t.is(note.accidentals, 3);
  t.is(note.octave, 0);
});

test('Single Flat', (t) => {
  const note = new Note('Ab0');
  t.is(note.noteLetter, 'A');
  t.is(note.accidentals, -1);
  t.is(note.octave, 0);
});

test('Multiple Flats', (t) => {
  const note = new Note('Abbb0');
  t.is(note.noteLetter, 'A');
  t.is(note.accidentals, -3);
  t.is(note.octave, 0);
});

test('Lowercase', (t) => {
  const note = new Note('c4');
  t.is(note.noteLetter, 'C');
  t.is(note.accidentals, 0);
  t.is(note.octave, 4);
});

test('Negative Octave', (t) => {
  const note = new Note('Gbb-4');
  t.is(note.noteLetter, 'G');
  t.is(note.accidentals, -2);
  t.is(note.octave, -4);
});

test('Large Octave', (t) => {
  const note = new Note('E22');
  t.is(note.noteLetter, 'E');
  t.is(note.accidentals, 0);
  t.is(note.octave, 22);
});

test('From Two Three', (t) => {
  const twoThreeEquals = (noteName) => {
    const note = new Note(noteName);
    t.is(Note.fromTwoThree(note.s2, note.s3).note, note.note);
  };
  twoThreeEquals('E4');
  twoThreeEquals('F#3');
  twoThreeEquals('Cb0');
  twoThreeEquals('B-5');
  twoThreeEquals('E##-20');
});

test('Intervals', (t) => {
  assertJump(t, 'D3', Interval.M3(), 'F#3');
  assertJump(t, 'F#3', Interval.M3(), 'A#4');
  assertJump(t, 'Cb-2', Interval.P5(), 'Gb-2');
  assertJump(t, 'B0', Interval.P5(), 'F#0');
  assertJump(t, 'A1', Interval.m7(), 'G1');
});

test('Interval jump reverse', (t) => {
  assertJump(t, 'D3', Interval.M3(), 'Bb3', true);
  assertJump(t, 'D3', Interval.M6(), 'F2', true);
  assertJump(t, 'F2', Interval.m2(), 'E2', true);
  assertJump(t, 'F2', Interval.a1(), 'Fb2', true);
  assertJump(t, 'G6', Interval.P5(), 'C6', true);
  assertJump(t, 'A6', Interval.P5(), 'D5', true);
});

test('Interval jump forward and back', (t) => {
  /**
   * Asserts the specified note with the specified interval applied and then
   * reversed still results in the original note.
   * @param {!Note} note The note to start and expect to finish on.
   * @param {!Interval} interval The interval to jump, first forwards and then
   *     in reverse.
   */
  const assertJumpForwardAndBank = (note, interval) => {
    assertNoteEquals(t, note, note.jump(interval).jump(interval, true));
  }
  assertJumpForwardAndBank(new Note('D3'), Interval.M3());
  assertJumpForwardAndBank(new Note('G#5'), Interval.m2());
  assertJumpForwardAndBank(new Note('E-1'), Interval.M7());
  assertJumpForwardAndBank(new Note('F0'), Interval.P5());
});

test('A Frequency', (t) => {
  t.is(new Note('A4').wellTemperedFrequency(), 440);
  t.is(new Note('A5').wellTemperedFrequency(), 880);
  t.is(new Note('A3').wellTemperedFrequency(), 220);
});

test('Vexflow Note Name Naturals', (t) => {
  t.is(new Note('A4').vexflowNoteName(), 'a/4');
  t.is(new Note('B4').vexflowNoteName(), 'b/4');
  t.is(new Note('C4').vexflowNoteName(), 'c/5');
  t.is(new Note('D4').vexflowNoteName(), 'd/5');
  t.is(new Note('E4').vexflowNoteName(), 'e/5');
  t.is(new Note('F4').vexflowNoteName(), 'f/5');
  t.is(new Note('G4').vexflowNoteName(), 'g/5');
});

test('Base Note Shift Down', (t) => {
  t.is(new Note('G4').baseShift(-1).note, 'F4');
  t.is(new Note('F4').baseShift(-1).note, 'E4');
  t.is(new Note('E4').baseShift(-1).note, 'D4');
  t.is(new Note('D4').baseShift(-1).note, 'C4');
  t.is(new Note('C4').baseShift(-1).note, 'B4');
  t.is(new Note('B4').baseShift(-1).note, 'A4');
  t.is(new Note('A4').baseShift(-1).note, 'G3');
});

test('Base Note Shift Up', (t) => {
  t.is(new Note('A4').baseShift(1).note, 'B4');
  t.is(new Note('B4').baseShift(1).note, 'C4');
  t.is(new Note('C4').baseShift(1).note, 'D4');
  t.is(new Note('D4').baseShift(1).note, 'E4');
  t.is(new Note('E4').baseShift(1).note, 'F4');
  t.is(new Note('F4').baseShift(1).note, 'G4');
  t.is(new Note('G4').baseShift(1).note, 'A5');
});
