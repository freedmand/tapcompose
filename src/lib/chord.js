import {Interval, Note} from './note.js';

import {NoteGroup} from './timing.js';

// A regular expression to detach a note name from a chord name.
const NOTE_SPLIT_REGEX = /([a-gA-G]b*#*-?[0-9]*)-(.*)/;

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

  /**
   * Applies the template to generate a named chord.
   * @param {!Note} baseNote The note to root the resulting named chord.
   * @return {!NamedChord} The resulting named chord.
   */
  apply(baseNote) {
    const baseNoteAccidentals = baseNote.accidentals < 0 ?
        'b'.repeat(-baseNote.accidentals) : '#'.repeat(baseNote.accidentals);

    return new NamedChord(
      this.chordTemplate.apply(baseNote),
      `${baseNote.noteLetter}${baseNoteAccidentals}${this.suffix}`,
      baseNote,
      this.suffix,
    );
  }
}

/**
 * A chord that has a name.
 */
export class NamedChord {
  /**
   * @param {!Chord} chord The chord.
   * @param {string} name The full name of the chord, without specifying octave
   *     information.
   * @param {!Note} baseNote The base note of the chord.
   * @param {string} suffix The suffix of the chord.
   */
  constructor(chord, name, baseNote, suffix) {
    /** @type {!Chord} */
    this.chord = chord;
    /** @type {string} */
    this.name = name;
    /** @type {!Note} */
    this.baseNote = baseNote;
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

    return new ContextualChord(
        this.namedChordTemplate.apply(baseNote),
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
   * @param {!NamedChord} namedChord The chord and its name.
   * @param {!Chord} scale The scale of reasonable note intervals that are
   *     playable over the chord, including leading and passing tones.
   */
  constructor(namedChord, scale) {
    /** @type {!NamedChord} */
    this.namedChord = namedChord;
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

/**
 * A dictionary that maps chord names to their templates and provides helper
 * methods to turn string representations of chords into chords.
 */
export class ChordDictionary {
  /**
   * @param {!Array<!NamedChordTemplate>} namedChordTemplates
   */
  constructor(namedChordTemplates) {
    /**
     * The dictionary that maps chord names to named chord templates.
     * @type {!Map<string, !NamedChordTemplate>}
     */
    this.chordDictionary = new Map();

    // Populate the chord dictionary by iterating through each named chord
    // template and adding the chord template's suffix in as a key.
    for (const namedChordTemplate of namedChordTemplates) {
      this.chordDictionary.set(namedChordTemplate.suffix, namedChordTemplate);
    }
  }

  /**
   * Retrieves a named chord template by suffix from the chord dictionary.
   * @param {string} suffix The suffix for which to search the dictionary.
   * @return {?NamedChordTemplate} The chord template for this suffix, or
   *     undefined if none is found.
   */
  getChordTemplateBySuffix(suffix) {
    return this.chordDictionary.get(suffix);
  }

  /**
   * Retrieves a chord by name by searching for the suffix in the chord
   * dictionary and applying the result to an extracted base note.
   * @param {string} name The full name of the chord.
   * @return {?NamedChord} The chord that results, or undefined if none is
   *     found.
   */
  getChordByName(name, defaultOctave = 2) {
    const match = NOTE_SPLIT_REGEX.exec(name);
    if (match.length != 3) throw new Error('Invalid chord name.');

    const note = new Note(match[1], defaultOctave);
    const suffix = match[2];
    const namedChordTemplate = this.getChordTemplateBySuffix(suffix);
    if (namedChordTemplate == null) return undefined;

    return namedChordTemplate.apply(note);
  }
}
