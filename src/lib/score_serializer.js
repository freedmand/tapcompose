import {Chord, ContextualChord} from './chord.js';
import {NoteGroup, TimedNote} from './timing.js';
import {Score, TapComposeScore} from './score.js';
import {SerializationDictionary, VersionedSerializer} from './serializer.js';

import {Note} from './note.js';

// The number of trailing zeros to use when formatting numbers.
const SERIALIZER_PRECISION = 6;

/**
 * Formats the number to a string after fixing it to a constant number of
 * decimal places and removing trailing zeros.
 * @param {number} num The number.
 * @return {string} The formatted number as a string.
 */
function formatNum(num) {
  return parseFloat(num.toFixed(SERIALIZER_PRECISION)).toString();
}

export class ScoreSerializerV0 extends VersionedSerializer {
  constructor() {
    super();
    this.version = 'v0';
  }

  /**
   * @param {!TapComposeScore} tapComposeScore The tap compose score to
   *     serialize.
   * @return {string} The serialized tap compose score.
   */
  serialize(tapComposeScore) {
    // Grab the entire history from the suggester.
    const outcomes = tapComposeScore.suggester.history;

    // Extract notes and chords from the outcomes.
    const bars = /** @type {!Array<!MelodicBar>} */ (
        outcomes.map((outcome) => outcome.value));

    /** @type {!Array<!TimedNote>} */
    const allNotes = Array.from(
        new NoteGroup(bars.map((bar) => bar.noteGroup)).iterate());
    /** @type {!Array<!ContextualChord>} */
    const allChords = bars.map((bar) => bar.contextualChord);

    const chordString = allChords.map((chord) => {
      // Return a chord string of the format C2-maj7|F3-7|...
      return [
        chord.namedChord.baseNote.note,
        chord.namedChord.suffix,
      ].join('-');
    }).join('|');

    const notesString = allNotes.map((note) => {
      return [
        note.note.note,
        formatNum(note.start),
        formatNum(note.end),
      ].join('-');
    }).join('|');

    const serialized = chordString + '~' + notesString;
    // Replace the sharp sign to make a URL form web-safe.
    return serialized.replace(/#/g, '_');
  }

  /**
   * Deserializes the specified string representing a tap compose score into the
   * specified tap compose score.
   * @param {string} str The string version of the tap compose score.
   * @param {!TapComposeScore} tapComposeScore The tap compose score to
   *     deserialize into.
   */
  deserializeIntoObject(str, tapComposeScore) {
    // Replace underscore with sharp sign to go from URL-safe representation to
    // a normal representation.
    str = str.replace(/_/g, '#');

    const firstSplit = str.indexOf('~');
    if (firstSplit == -1) {
      throw new Error('Deserialization error: Invalid chords / notes split');
    }

    const chordsString = str.substring(0, firstSplit);
    const notesString = str.substring(firstSplit + 1);

    const contextualChords = chordsString.split('|').map((chord) => {
      const namedChord = tapComposeScore.chordDictionary.getChordByName(chord);
      // Use an empty scale for the named chord.
      // TODO(freedmand): Auto-locate the likely scale.
      return new ContextualChord(namedChord, new Chord());
    });
    const notes = new NoteGroup(notesString.split('|').map((timedNoteStr) => {
      const parts = timedNoteStr.split('-');
      // Create variables to store the deconstructed string parts.
      let noteStr, startStr, endStr;
      if (parts.length == 4) {
        // If there are four parts, there was a negative octave number. Join it
        // with the note string.
        let negOctave;
        [noteStr, negOctave, startStr, endStr] = parts;
        noteStr += '-' + negOctave;
      } else {
        // Otherwise, deconstruct into three parts.
        [noteStr, startStr, endStr] = parts;
      }
      const note = new Note(noteStr);
      const start = parseFloat(startStr);
      const end = parseFloat(endStr);
      return new TimedNote(note, start, end);
    }));

    // Load in the deserialized score.
    tapComposeScore.load(notes, contextualChords);
  }
}

export const scoreSerializerDictionary = new SerializationDictionary([
  new ScoreSerializerV0(),
], 'v0');
