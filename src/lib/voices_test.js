import {NoteGroup, TimedNote} from './timing.js';

import {Note} from './note.js';
import {Voices} from './voices.js';
import test from 'ava';

test('Voices basic', (t) => {
  const t1 = new TimedNote(null, 0, 1);
  const t2 = new TimedNote(null, 1, 2);
  const voices = Voices.fromNoteGroup(new NoteGroup([t1, t2]));
  t.is(voices.voices.length, 1);
  t.is(voices.voices[0].length(), 2);
});

test('Voices Overlapping Basic', (t) => {
  const t1 = new TimedNote(null, 0, 2);
  const t2 = new TimedNote(null, 1, 3);
  const voices = Voices.fromNoteGroup(new NoteGroup([t1, t2]));
  t.is(voices.length, 2);
  t.is(voices.voices[0].length(), 1);
  t.is(voices.voices[1].length(), 1);
});

test('Voices Overlapping Basic 2', (t) => {
  const t1 = new TimedNote(null, 0, 3);
  const t2 = new TimedNote(null, 1, 3);
  const voices = Voices.fromNoteGroup(new NoteGroup([t1, t2]));
  t.is(voices.length, 2);
  t.is(voices.voices[0].length(), 1);
  t.is(voices.voices[1].length(), 1);
});

test('Voices Pattern 1', (t) => {
  const t1 = new TimedNote(null, 0, 1);
  const t2 = new TimedNote(null, 1, 3);
  const t3 = new TimedNote(null, 2, 4);
  const t4 = new TimedNote(null, 3, 5);
  const voices = Voices.fromNoteGroup(new NoteGroup([t1, t2, t3, t4]));
  t.is(voices.voices.length, 2);
  t.is(voices.voices[0].length(), 3);
  t.is(voices.voices[1].length(), 1);
});

test('Voices Pattern 2', (t) => {
  const t1 = new TimedNote(null, 0, 3);
  const t2 = new TimedNote(null, 1, 4);
  const t3 = new TimedNote(null, 2, 5);
  const t4 = new TimedNote(null, 6, 8);
  const voices = Voices.fromNoteGroup(new NoteGroup([t1, t2, t3, t4]));
  t.is(voices.voices.length, 3);
  t.is(voices.voices[0].length(), 2);
  t.is(voices.voices[1].length(), 1);
  t.is(voices.voices[2].length(), 1);
});

test('Voices Pattern 3', (t) => {
  const t1 = new TimedNote(null, 0, 3);
  const t2 = new TimedNote(null, 1, 4);
  const t3 = new TimedNote(null, 2, 5);
  const t4 = new TimedNote(null, 4, 6);
  const voices = Voices.fromNoteGroup(new NoteGroup([t1, t2, t3, t4]));
  t.is(voices.voices.length, 3);
  t.is(voices.voices[0].length(), 2);
  t.is(voices.voices[1].length(), 1);
  t.is(voices.voices[2].length(), 1);
});

test('Voices Pattern 4', (t) => {
  const t1 = new TimedNote(null, 0, 1);
  const t2 = new TimedNote(null, 1, 2);
  const t3 = new TimedNote(null, 3, 5);
  const t4 = new TimedNote(null, 4, 5);
  const voices = Voices.fromNoteGroup(new NoteGroup([t1, t2, t3, t4]));
  t.is(voices.voices.length, 2);
  t.is(voices.voices[0].length(), 3);
  t.is(voices.voices[1].length(), 1);
});

test('Voices Arpeggio Simple', (t) => {
  const t1 = new TimedNote(null, 0, 1);
  const t2 = new TimedNote(null, 1, 2);
  const t3 = new TimedNote(null, 2, 3);
  const t4 = new TimedNote(null, 3, 4);
  const t5 = new TimedNote(null, 4, 5);
  const voices = Voices.fromNoteGroup(new NoteGroup([t1, t2, t3, t4, t5]));
  t.is(voices.voices.length, 1);
  t.is(voices.voices[0].length(), 5);
});

test('Voices Arpeggio One Layer', (t) => {
  const t1 = new TimedNote(null, 0, 5);
  const t2 = new TimedNote(null, 0, 1);
  const t3 = new TimedNote(null, 1, 2);
  const t4 = new TimedNote(null, 2, 3);
  const t5 = new TimedNote(null, 3, 4);
  const t6 = new TimedNote(null, 4, 5);
  const voices = Voices.fromNoteGroup(new NoteGroup([t1, t2, t3, t4, t5, t6]));
  t.is(voices.voices.length, 2);
  t.is(voices.voices[0].length(), 1);
  t.is(voices.voices[1].length(), 5);
});

test('Voices Arpeggio Layered', (t) => {
  const t1 = new TimedNote(null, 0, 5);
  const t2 = new TimedNote(null, 1, 5);
  const t3 = new TimedNote(null, 2, 5);
  const t4 = new TimedNote(null, 3, 5);
  const t5 = new TimedNote(null, 4, 5);
  const voices = Voices.fromNoteGroup(new NoteGroup([t1, t2, t3, t4, t5]));
  t.is(voices.voices.length, 5);
  t.is(voices.voices[0].length(), 1);
  t.is(voices.voices[1].length(), 1);
  t.is(voices.voices[2].length(), 1);
  t.is(voices.voices[3].length(), 1);
  t.is(voices.voices[4].length(), 1);
});

test('Voices Arpeggio Layered Mostly', (t) => {
  const t1 = new TimedNote(null, 0, 6);
  const t2 = new TimedNote(null, 1, 6);
  const t3 = new TimedNote(null, 2, 3);
  const t4 = new TimedNote(null, 3, 6);
  const t5 = new TimedNote(null, 4, 5);
  const t6 = new TimedNote(null, 5, 6);
  const voices = Voices.fromNoteGroup(new NoteGroup([t1, t2, t3, t4, t5, t6]));
  t.is(voices.voices.length, 4);
});

test('Proper Voices Basic 1', (t) => {
  const t1 = new TimedNote(new Note('A4'), 0, 1);
  const t2 = new TimedNote(new Note('B4'), 1, 2);
  const t3 = new TimedNote(new Note('C4'), 2, 3);
  const t4 = new TimedNote(new Note('D4'), 3, 4);
  const voices = Voices.fromNoteGroup(new NoteGroup([t1, t2, t3, t4]));
  const properStrings = voices.toProperStrings();
  t.is(properStrings.length, 1);
  t.deepEqual(properStrings, [
    ['[a/4 4][b/4 4][c/5 4][d/5 4]'],
  ]);
});

test('Proper Voices Basic 2', (t) => {
  const t1 = new TimedNote(new Note('A4'), 0, 4);
  const voices = Voices.fromNoteGroup(new NoteGroup([t1]));
  const properStrings = voices.toProperStrings();
  t.deepEqual(properStrings, [
    ['[a/4 1]'],
  ]);
});

test('Proper Voices Layered Simple 1', (t) => {
  const t1 = new TimedNote(new Note('A4'), 0, 4);
  const t2 = new TimedNote(new Note('B4'), 0, 2);
  const t3 = new TimedNote(new Note('C4'), 2, 3);
  const t4 = new TimedNote(new Note('D4'), 3, 4);
  const voices = Voices.fromNoteGroup(new NoteGroup([t1, t2, t3, t4]));
  const properStrings = voices.toProperStrings();
  t.deepEqual(properStrings, [
    [
      '[a/4 1]',
      '[b/4 2][c/5 4][d/5 4]',
    ],
  ]);
});

test('Proper Voices Layered Simple 2', (t) => {
  const t1 = new TimedNote(new Note('A3'), 0, 4);
  const t2 = new TimedNote(new Note('A4'), 0, 1);
  const t3 = new TimedNote(new Note('A4'), 1, 2);
  const t4 = new TimedNote(new Note('C4'), 2, 3);
  const t5 = new TimedNote(new Note('E4'), 3, 4);
  const voices = Voices.fromNoteGroup(new NoteGroup([t1, t2, t3, t4, t5]));
  const properStrings = voices.toProperStrings();
  t.deepEqual(properStrings, [
    [
      '[a/3 1]',
      '[a/4 4][a/4 4][c/5 4][e/5 4]',
    ],
  ]);
});

test('Proper Voices Layered Rest Beginning', (t) => {
  const t1 = new TimedNote(new Note('A4'), 0, 4);
  const t2 = new TimedNote(new Note('B4'), 1, 2);
  const t3 = new TimedNote(new Note('C4'), 2, 3);
  const t4 = new TimedNote(new Note('D4'), 3, 4);
  const voices = Voices.fromNoteGroup(new NoteGroup([t1, t2, t3, t4]));
  const properStrings = voices.toProperStrings();
  t.deepEqual(properStrings, [
    [
      '[a/4 1]',
      '[r 4][b/4 4][c/5 4][d/5 4]',
    ],
  ]);
});

test('Proper Voices Layered Rest End', (t) => {
  const t1 = new TimedNote(new Note('A4'), 0, 4);
  const t2 = new TimedNote(new Note('B4'), 0, 1);
  const t3 = new TimedNote(new Note('C4'), 1, 2);
  const t4 = new TimedNote(new Note('D4'), 2, 3);
  const voices = Voices.fromNoteGroup(new NoteGroup([t1, t2, t3, t4]));
  const properStrings = voices.toProperStrings();
  t.deepEqual(properStrings, [
    [
      '[a/4 1]',
      '[b/4 4][c/5 4][d/5 4][r 4]',
    ],
  ]);
});

test('Proper Voices Layered Complex', (t) => {
  const t1 = new TimedNote(new Note('A4'), 0, 4);
  const t2 = new TimedNote(new Note('B4'), 0.5, 1);
  const t3 = new TimedNote(new Note('C4'), 1, 1.5);
  const t4 = new TimedNote(new Note('D4'), 2, 3);
  const t5 = new TimedNote(new Note('E5'), 1, 3);
  const voices = Voices.fromNoteGroup(new NoteGroup([t1, t2, t3, t4, t5]));
  const properStrings = voices.toProperStrings();
  t.deepEqual(properStrings, [
    [
      '[a/4 1]',
      '[r 8][b/4 8][c/5 8][r 8][d/5 4][r 4]',
      '[r 4][e/6 2][r 4]',
    ],
  ]);
});

test('Proper Voices Two Measures', (t) => {
  const t1 = new TimedNote(new Note('A4'), 0, 4);
  const t2 = new TimedNote(new Note('B4'), 4, 8);
  const voices = Voices.fromNoteGroup(new NoteGroup([t1, t2]));
  const properStrings = voices.toProperStrings();
  t.deepEqual(properStrings, [
    [
      '[a/4 1]',
    ],
    [
      '[b/4 1]',
    ],
  ]);
});
