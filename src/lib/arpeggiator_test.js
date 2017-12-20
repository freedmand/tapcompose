import {NoteGroup, TimedNote} from './timing';
import {TestContext, test} from 'ava';

import {Arpeggiator} from './arpeggiator.js';
import {Chord} from './chord.js';
import {Note} from './note.js';
import {WATERFALL} from './patterns.js';

/**
 * Asserts two note groups contain identical sets of notes. Order is invariant
 * since notes are timed.
 * @param {!TestContext} t The AVA test instance.
 * @param {!NoteGroup} noteGroup1 The first note group to compare.
 * @param {!NoteGroup} noteGroup2 The second note group to compare.
 */
function assertNoteGroupEquals(t, noteGroup1, noteGroup2) {
  const notesArray1 = Array.from(noteGroup1.iterateStrings());
  const notesArray2 = Array.from(noteGroup2.iterateStrings());

  // Sort the notes arrays so they can be compared and assert their deep
  // equality.
  notesArray1.sort();
  notesArray2.sort();
  t.deepEqual(notesArray1, notesArray2);
}

test('Arpeggiator', (t) => {
  const arpeggiator = new Arpeggiator(
    WATERFALL,
    new Chord(
      new Note('C4'),
      new Note('E4'),
      new Note('G4'),
    ),
  );

  // Assume a default octave shift of -2.
  assertNoteGroupEquals(t, arpeggiator.toNoteGroup(), new NoteGroup([
    new TimedNote(new Note('C2'), 0, 8),
    new TimedNote(new Note('E2'), 1, 2),
    new TimedNote(new Note('G2'), 2, 3),
    new TimedNote(new Note('E2'), 3, 4),
    new TimedNote(new Note('G2'), 4, 5),
    new TimedNote(new Note('C3'), 5, 6),
    new TimedNote(new Note('G2'), 6, 7),
    new TimedNote(new Note('E2'), 7, 8),
  ]));
});
