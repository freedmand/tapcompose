import {EmptyInstrument, InstrumentManager} from './instrument.js';

import test from 'ava';

test('Instrument Manager Basic', (t) => {
  const instrumentManager = new InstrumentManager(null, EmptyInstrument, 1);

  // No notes playing.
  t.deepEqual(instrumentManager.playing, [false]);
  t.false(instrumentManager.handles.has('1'));

  // Play a note.
  instrumentManager.noteOn('1', 440);
  t.deepEqual(instrumentManager.playing, [true]);
  t.true(instrumentManager.handles.has('1'));

  // Stop playing the note.
  instrumentManager.noteOff('1');
  t.deepEqual(instrumentManager.playing, [false]);
  t.false(instrumentManager.handles.has('1'));
});

test('Instrument Manager Duophony Simple', (t) => {
  const instrumentManager = new InstrumentManager(null, EmptyInstrument, 2);

  // No notes playing.
  t.deepEqual(instrumentManager.playing, [false, false]);
  t.false(instrumentManager.handles.has('1'));
  t.false(instrumentManager.handles.has('2'));

  // Play a note.
  instrumentManager.noteOn('1', 440);
  t.deepEqual(instrumentManager.playing, [true, false]);
  t.true(instrumentManager.handles.has('1'));
  t.false(instrumentManager.handles.has('2'));

  // Play another note.
  instrumentManager.noteOn('2', 440);
  t.deepEqual(instrumentManager.playing, [true, true]);
  t.true(instrumentManager.handles.has('1'));
  t.true(instrumentManager.handles.has('2'));

  // Stop playing the first note.
  instrumentManager.noteOff('1');
  t.deepEqual(instrumentManager.playing, [false, true]);
  t.false(instrumentManager.handles.has('1'));
  t.true(instrumentManager.handles.has('2'));

  // Stop playing the second note.
  instrumentManager.noteOff('2');
  t.deepEqual(instrumentManager.playing, [false, false]);
  t.false(instrumentManager.handles.has('1'));
  t.false(instrumentManager.handles.has('2'));
});
