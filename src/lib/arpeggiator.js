import {Interval, Note} from './note.js';
import {NoteGroup, TimedNote} from './timing.js';

import {Chord} from './chord.js';

export const OFF = 'OFF';
export const ON = 'ON';
export const HOLD = 'HOLD';

const TRANSITIONS = {
  ON: {
    ON: [OFF, ON],
    OFF: [OFF],
    HOLD: [],
  },
  OFF: {
    ON: [ON],
    OFF: [],
    HOLD: [],
  },
  HOLD: {
    ON: [],
    OFF: [],
    HOLD: [],
  },
};

const PENDING = -1;

/**
 * Arpeggiator provides logic to transform a chord into a timed arpeggio.
 */
export class Arpeggiator {
  /**
   * @param {{number: !Array<number>}} pattern The arpeggiation pattern. See
   *     ./patterns.js for examples.
   * @param {!Chord} chord The chord to arpeggiate.
   * @param {number=} beatsPerStep The number of beats per arpeggiation step.
   * @param {number=} startOffset The starting offset for the arpeggiator.
   * @param {?number=} cutOff If true, the cut off for the arpeggiator.
   * @param {number=} offDelta The delta to release notes early.
   * @param {number=} defaultOctaveShift The default octave jump.
   */
  constructor(pattern, chord, beatsPerStep = 1, startOffset = 0, cutOff = null,
      offDelta = 0.1, defaultOctaveShift = -2) {
    /** @type {{number: !Array<number>}} */
    this.pattern = pattern;
    /** @type {!Chord} */
    this.chord = chord;
    /** @type {number} */
    this.beatsPerStep = beatsPerStep;
    /** @type {number} */
    this.offDelta = offDelta;
    /** @type {number} */
    this.defaultOctaveShift = defaultOctaveShift;

    this.length = this.pattern[0][2].length;
    this.startOffset = startOffset / this.beatsPerStep;
    this.cutOff = cutOff === null ? this.length : cutOff / this.beatsPerStep;
  }

  /**
   * Returns the arpeggiator as a group of timed notes.
   * @return {!NoteGroup}
   */
  toNoteGroup() {
    const group = new NoteGroup();
    /** @type {!Map<string, !TimedNote>} */
    const notesOn = new Map();
    for (const [n, shift, pattern] of this.pattern) {
      // Iterate through each chord tone.
      const note = this.chord.getN(n).octaveShift(
          shift + this.defaultOctaveShift);
      const name = `${n},${shift}`;

      const handleArpeggiationEvent = (event, i) => {
        if (event == ON) {
          // End is pending.
          const timedNote = new TimedNote(note, i * this.beatsPerStep, PENDING);
          notesOn.set(name, timedNote);
        } else if (event == OFF) {
          if (notesOn.has(name)) {
            const timedNote = notesOn.get(name);
            timedNote.end = i * this.beatsPerStep;
            group.addEvent(timedNote);
            notesOn.delete(name);
          }
        } else {
          throw new Error('Unrecognized arpeggiation state.');
        }
      };

      let state = OFF;
      let index;
      let j = 0;
      for (let i = this.startOffset; i < this.cutOff; i++) {
        index = i % this.length;
        const step = pattern[index].toUpperCase();
        // Iterate through each patten.
        const events = TRANSITIONS[state][step];
        if (events.length > 0) state = events[events.length - 1];
        for (const event of events) handleArpeggiationEvent(event, j);
        j++;
      }
      const events = TRANSITIONS[state][OFF];
      for (const event of events) {
        handleArpeggiationEvent(event, j);
      }
    }
    if (notesOn.length > 0) {
      throw new Error(
          'Some notes were not accounted for. This should never happen.');
    }
    return group;
  }
}
