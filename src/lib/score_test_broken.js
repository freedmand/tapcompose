import * as t from '../testing/tests.js';

import {Score, TimedNote} from './score.js';

import {Note} from './note.js';

t.runTests('Score', {
  voicesBasic() {
    const t1 = new TimedNote(null, 0, 1);
    const t2 = new TimedNote(null, 1, 2);
    const score = new Score([t1, t2]);
    t.assertEquals(score.voices.length, 1);
    t.assertEquals(score.voices[0].length, 2);
  },

  voicesOverlappingBasic() {
    const t1 = new TimedNote(null, 0, 2);
    const t2 = new TimedNote(null, 1, 3);
    const score = new Score([t1, t2]);
    t.assertEquals(score.voices.length, 2);
    t.assertEquals(score.voices[0].length, 1);
    t.assertEquals(score.voices[1].length, 1);
  },

  voicesOverlappingBasic2() {
    const t1 = new TimedNote(null, 0, 3);
    const t2 = new TimedNote(null, 1, 3);
    const score = new Score([t1, t2]);
    t.assertEquals(score.voices.length, 2);
    t.assertEquals(score.voices[0].length, 1);
    t.assertEquals(score.voices[1].length, 1);
  },

  voicesPattern1() {
    const t1 = new TimedNote(null, 0, 1);
    const t2 = new TimedNote(null, 1, 3);
    const t3 = new TimedNote(null, 2, 4);
    const t4 = new TimedNote(null, 3, 5);
    const score = new Score([t1, t2, t3, t4]);
    t.assertEquals(score.voices.length, 2);
    t.assertEquals(score.voices[0].length, 3);
    t.assertEquals(score.voices[1].length, 1);
  },

  voicesPattern2() {
    const t1 = new TimedNote(null, 0, 3);
    const t2 = new TimedNote(null, 1, 4);
    const t3 = new TimedNote(null, 2, 5);
    const t4 = new TimedNote(null, 6, 8);
    const score = new Score([t1, t2, t3, t4]);
    t.assertEquals(score.voices.length, 3);
    t.assertEquals(score.voices[0].length, 2);
    t.assertEquals(score.voices[1].length, 1);
    t.assertEquals(score.voices[2].length, 1);
  },

  voicesPattern3() {
    const t1 = new TimedNote(null, 0, 3);
    const t2 = new TimedNote(null, 1, 4);
    const t3 = new TimedNote(null, 2, 5);
    const t4 = new TimedNote(null, 4, 6);
    const score = new Score([t1, t2, t3, t4]);
    t.assertEquals(score.voices.length, 3);
    t.assertEquals(score.voices[0].length, 2);
    t.assertEquals(score.voices[1].length, 1);
    t.assertEquals(score.voices[2].length, 1);
  },

  voicesPattern4() {
    const t1 = new TimedNote(null, 0, 1);
    const t2 = new TimedNote(null, 1, 2);
    const t3 = new TimedNote(null, 3, 5);
    const t4 = new TimedNote(null, 4, 5);
    const score = new Score([t1, t2, t3, t4]);
    t.assertEquals(score.voices.length, 2);
    t.assertEquals(score.voices[0].length, 3);
    t.assertEquals(score.voices[1].length, 1);
  },

  voicesArpeggioSimple() {
    const t1 = new TimedNote(null, 0, 1);
    const t2 = new TimedNote(null, 1, 2);
    const t3 = new TimedNote(null, 2, 3);
    const t4 = new TimedNote(null, 3, 4);
    const t5 = new TimedNote(null, 4, 5);
    const score = new Score([t1, t2, t3, t4, t5]);
    t.assertEquals(score.voices.length, 1);
    t.assertEquals(score.voices[0].length, 5);
  },

  voicesArpeggioOneLayer() {
    const t1 = new TimedNote(null, 0, 5);
    const t2 = new TimedNote(null, 0, 1);
    const t3 = new TimedNote(null, 1, 2);
    const t4 = new TimedNote(null, 2, 3);
    const t5 = new TimedNote(null, 3, 4);
    const t6 = new TimedNote(null, 4, 5);
    const score = new Score([t1, t2, t3, t4, t5, t6]);
    t.assertEquals(score.voices.length, 2);
    t.assertEquals(score.voices[0].length, 1);
    t.assertEquals(score.voices[1].length, 5);
  },

  voicesArpeggioLayered() {
    const t1 = new TimedNote(null, 0, 5);
    const t2 = new TimedNote(null, 1, 5);
    const t3 = new TimedNote(null, 2, 5);
    const t4 = new TimedNote(null, 3, 5);
    const t5 = new TimedNote(null, 4, 5);
    const score = new Score([t1, t2, t3, t4, t5]);
    t.assertEquals(score.voices.length, 5);
    t.assertEquals(score.voices[0].length, 1);
    t.assertEquals(score.voices[1].length, 1);
    t.assertEquals(score.voices[2].length, 1);
    t.assertEquals(score.voices[3].length, 1);
    t.assertEquals(score.voices[4].length, 1);
  },

  voicesArpeggioLayeredMostly() {
    const t1 = new TimedNote(null, 0, 6);
    const t2 = new TimedNote(null, 1, 6);
    const t3 = new TimedNote(null, 2, 3);
    const t4 = new TimedNote(null, 3, 6);
    const t5 = new TimedNote(null, 4, 5);
    const t6 = new TimedNote(null, 5, 6);
    const score = new Score([t1, t2, t3, t4, t5, t6]);
    t.assertEquals(score.voices.length, 4);
  },

  properVoicesBasic1() {
    const t1 = new TimedNote(new Note('A4'), 0, 1);
    const t2 = new TimedNote(new Note('B4'), 1, 2);
    const t3 = new TimedNote(new Note('C4'), 2, 3);
    const t4 = new TimedNote(new Note('D4'), 3, 4);
    const score = new Score([t1, t2, t3, t4]);
    const properStrings = score.toProperStrings();
    t.assertEquals(properStrings.length, 1);
    t.assertArrayEquals(properStrings[0], [
      '[a/4 4][b/4 4][c/5 4][d/5 4]',
    ]);
  },

  properVoicesBasic2() {
    const t1 = new TimedNote(new Note('A4'), 0, 4);
    const score = new Score([t1]);
    const properStrings = score.toProperStrings();
    t.assertEquals(properStrings.length, 1);
    t.assertArrayEquals(properStrings[0], [
      '[a/4 1]',
    ]);
  },

  properVoicesLayeredSimple1() {
    const t1 = new TimedNote(new Note('A4'), 0, 4);
    const t2 = new TimedNote(new Note('B4'), 0, 2);
    const t3 = new TimedNote(new Note('C4'), 2, 3);
    const t4 = new TimedNote(new Note('D4'), 3, 4);
    const score = new Score([t1, t2, t3, t4]);
    const properStrings = score.toProperStrings();
    t.assertEquals(properStrings.length, 1);
    t.assertArrayEquals(properStrings[0], [
      '[a/4 1]',
      '[b/4 2][c/5 4][d/5 4]',
    ]);
  },

  properVoicesLayeredSimple2() {
    const t1 = new TimedNote(new Note('A3'), 0, 4);
    const t2 = new TimedNote(new Note('A4'), 0, 1);
    const t3 = new TimedNote(new Note('A4'), 1, 2);
    const t4 = new TimedNote(new Note('C4'), 2, 3);
    const t5 = new TimedNote(new Note('E4'), 3, 4);
    const score = new Score([t1, t2, t3, t4, t5]);
    const properStrings = score.toProperStrings();
    t.assertEquals(properStrings.length, 1);
    t.assertArrayEquals(properStrings[0], [
      '[a/3 1]',
      '[a/4 4][a/4 4][c/5 4][e/5 4]',
    ]);
  },

  properVoicesLayeredRestBeginning() {
    const t1 = new TimedNote(new Note('A4'), 0, 4);
    const t2 = new TimedNote(new Note('B4'), 1, 2);
    const t3 = new TimedNote(new Note('C4'), 2, 3);
    const t4 = new TimedNote(new Note('D4'), 3, 4);
    const score = new Score([t1, t2, t3, t4]);
    const properStrings = score.toProperStrings();
    t.assertEquals(properStrings.length, 1);
    t.assertArrayEquals(properStrings[0], [
      '[a/4 1]',
      '[r 4][b/4 4][c/5 4][d/5 4]',
    ]);
  },

  properVoicesLayeredRestEnd() {
    const t1 = new TimedNote(new Note('A4'), 0, 4);
    const t2 = new TimedNote(new Note('B4'), 0, 1);
    const t3 = new TimedNote(new Note('C4'), 1, 2);
    const t4 = new TimedNote(new Note('D4'), 2, 3);
    const score = new Score([t1, t2, t3, t4]);
    const properStrings = score.toProperStrings();
    t.assertEquals(properStrings.length, 1);
    t.assertArrayEquals(properStrings[0], [
      '[a/4 1]',
      '[b/4 4][c/5 4][d/5 4][r 4]',
    ]);
  },

  properVoicesLayeredComplex() {
    const t1 = new TimedNote(new Note('A4'), 0, 4);
    const t2 = new TimedNote(new Note('B4'), 0.5, 1);
    const t3 = new TimedNote(new Note('C4'), 1, 1.5);
    const t4 = new TimedNote(new Note('D4'), 2, 3);
    const t5 = new TimedNote(new Note('E5'), 1, 3);
    const score = new Score([t1, t2, t3, t4, t5]);
    const properStrings = score.toProperStrings();
    t.assertEquals(properStrings.length, 1);
    t.assertArrayEquals(properStrings[0], [
      '[a/4 1]',
      '[r 8][b/4 8][c/5 8][r 8][d/5 4][r 4]',
      '[r 4][e/6 2][r 4]',
    ]);
  },

  properVoicesTwoMeasures() {
    const t1 = new TimedNote(new Note('A4'), 0, 4);
    const t2 = new TimedNote(new Note('B4'), 4, 8);
    const score = new Score([t1, t2]);
    const properStrings = score.toProperStrings();
    t.assertEquals(properStrings.length, 2);
    t.assertArrayEquals(properStrings[0], [
      '[a/4 1]',
    ]);
    t.assertArrayEquals(properStrings[1], [
      '[b/4 1]',
    ]);
  },
});
