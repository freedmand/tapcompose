import {Interval, Note} from './note.js';

import {NoteGroup} from './timing.js';

/**
 * A ChordTemplate contains the intervals that make up a given chord. The chord
 * template can be applied to a base note to create a Chord.
 */
export class ChordTemplate {
  /**
   * @param {...Interval} intervals The intervals that compose the chord. P1
   *     should be included if the base note is part of the chord.
   */
  constructor(...intervals) {
    /** @type {!Array<!Interval>} */
    this.intervals = intervals;
    /**
     * The size of the chord.
     * @type {number}
     */
    this.length = intervals.length;
  }

  /**
   * Applies the chord template to a base note, producing a chord.
   * @param {!Note} baseNote The base note of the chord.
   * @return {!Chord}
   */
  apply(baseNote) {
    const notes = [];
    for (const interval of this.intervals) {
      notes.push(baseNote.jump(interval));
    }
    return new Chord(...notes);
  }
}

/**
 * A chord contains an array of notes, typically within a single octave.
 */
export class Chord {
  /**
   * @param {...!Note} notes The notes composing the chord.
   */
  constructor(...notes) {
    /**
     * @type {!Array<!Note>}
     */
    this.notes = notes;
  }

  /**
   * Retrieves the note at the n-th index in the chord. If the index is past the
   * number of notes in the chord, the chord wraps to the next octave. The index
   * can be in previous octaves if negative.
   * @param {number} n The index of the note in the chord to grab.
   */
  getN(n) {
    const i = (n % this.notes.length + this.notes.length) % this.notes.length;
    const octaveShift = Math.floor(n / this.notes.length);
    const [s2, s3] = [this.notes[i].s2, this.notes[i].s3];
    return Note.fromTwoThree(s2 + octaveShift, s3);
  }
}

/**
 * A chord template that has a suffix, allowing it to be named.
 */
export class NamedChordTemplate {
  /**
   * @param {!ChordTemplate} chordTemplate The interval template that makes up
   *     this chord.
   * @param {string} suffix The chord's named suffix, e.g. "maj7".
   */
  constructor(chordTemplate, suffix) {
    /** @type {!ChordTemplate} */
    this.chordTemplate = chordTemplate;
    /** @type {string} */
    this.suffix = suffix;
  }
}

/**
 * A named chord at a specific interval in a key signature.
 */
export class ContextualChordTemplate {
  /**
   * @param {!Interval} interval The interval of this chord
   * @param {!NamedChordTemplate} namedChordTemplate The named chord template.
   * @param {!ChordTemplate} scale The scale of reasonable note intervals that
   *     are playable over the chord, including leading and passing tones.
   */
  constructor(interval, namedChordTemplate, scale) {
    /** @type {!Interval} */
    this.interval = interval;
    /** @type {!NamedChordTemplate} */
    this.namedChordTemplate = namedChordTemplate;
    /** @type {!ChordTemplate} */
    this.scale = scale;
  }

  /**
   * Applies the contextual chord template onto a note, returning a contextual
   * chord.
   * @param {!Note} baseNote The base note to which to apply the template.
   * @return {!ContextualChord} The contextual chord representing this template
   *     applied to the specified note.
   */
  apply(baseNote) {
    // Obtain the root note of the scale by jumping backwards this chord's
    // interval.
    const root = baseNote.jump(this.interval, true);

    const baseNoteAccidentals = baseNote.accidentals < 0 ?
        'b'.repeat(-baseNote.accidentals) : '#'.repeat(baseNote.accidentals);

    return new ContextualChord(
        this.namedChordTemplate.chordTemplate.apply(baseNote),
        `${baseNote.baseNote}${baseNoteAccidentals}` +
        `${this.namedChordTemplate.suffix}`,
        this.scale.apply(root),
    );
  }
}

/**
 * A chord, its name, and its scale, or the notes that would be reasonable to
 * play over it.
 */
export class ContextualChord {
  /**
   * @param {!Chord} chord The notes to play.
   * @param {string} name The name of the chord.
   * @param {!Chord} scale The scale of reasonable note intervals that are
   *     playable over the chord, including leading and passing tones.
   */
  constructor(chord, name, scale) {
    /** @type {!Chord} */
    this.chord = chord;
    /** @type {string} */
    this.name = name;
    /** @type {!Chord} */
    this.scale = scale;
  }
}

/**
 * A single bar of melody over a contextual chord.
 */
export class MelodicBar {
  /**
   * @param {!ContextualChord} contextualChord The contextual chord for the bar.
   * @param {!NoteGroup} noteGroup The timed notes within the bar as a note
   *     group, set such that a start of 0 corresponds to the beginning of the
   *     bar.
   */
  constructor(contextualChord, noteGroup) {
    /** @type {!ContextualChord} */
    this.contextualChord = contextualChord;
    /** @type {!NoteGroup} */
    this.noteGroup = noteGroup;
  }
}
