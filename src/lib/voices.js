import {NoteGroup} from './timing.js';

// The factor to divide by durations in beats to get VexFlow durations.
const DURATION_FACTOR = 4;

/**
 * An object like a note or rest that is sequential in time and can be placed in
 * a rendered score. The object should have a duration. This class should be
 * overridden.
 */
export class ScoreObject {
  /**
   * @param {number} duration The duration of the score object in beats.
   */
  constructor(duration) {
    // TODO(freedmand): Cover durations that aren't perfect quarter-notes,
    // half-notes, etc.
    /**
     * The duration in a score representation.
     * @param {string}
     */
    this.duration = (DURATION_FACTOR / duration).toFixed();
  }

  /**
   * Returns a string representation of the score object.
   * @return {string}
   */
  toString() {
    return '';
  }
}

/**
 * A rest object represents a gap in a voice.
 */
class Rest extends ScoreObject {
  toString() {
    return `[r ${this.duration}]`;
  }
}

/**
 * A notes object that represents one or more notes at the same instant in time
 * in the same voice.
 */
export class Notes extends ScoreObject {
  /**
   * @param {!NoteGroup} noteGroup The group of notes that represent this notes
   *     object.
   */
  constructor(noteGroup) {
    // Extract the duration from the first note in the group.
    const firstNote = noteGroup.iterate().next().value;
    super(firstNote.end - firstNote.start);

    /** @type {!NoteGroup} */
    this.noteGroup = noteGroup;
    /**
     * An array of Vexflow note names representing this cluster of notes.
     * @type {!Array<string>}
     */
    this.noteNames = [];
    for (const timedNote of this.noteGroup.iterate()) {
      // Populate the list of note names.
      this.noteNames.push(timedNote.note.vexflowNoteName());
    }
  }

  toString() {
    return `[${this.noteNames.join(',')} ${this.duration}]`;
  }
}

/**
 * A bar voice contains rests and notes and corresponds to a single voice in a
 * single measure.
 */
export class BarVoice {
  /**
   * @param {!Array<!ScoreObject>} scoreObjects An array of score objects
   *     composing the voice. Each score object is sequential in time.
   */
  constructor(scoreObjects) {
    this.scoreObjects = scoreObjects;
  }
}

/**
 * A voice manages a group of non-overlapping notes and the time intervals that
 * compose the voice.
 */
export class Voice {
  /**
   * @param {!NoteGroup} noteGroup The note group representing this voice. Each
   *     sub-group corresponds to one of the interval elements.
   * @param {!Array<!Array<number>>} intervals An array of start/end pairs that
   *     demonstrate the time intervals that compose this voice.
   */
  constructor(noteGroup, intervals) {
    /** @type {!NoteGroup} */
    this.noteGroup = noteGroup;
    /** @type {!Array<!Array<number>>} */
    this.intervals = intervals;
  }

  /**
   * Returns the number of notes in this voice.
   * @return {number}
   */
  length() {
    return this.noteGroup.length();
  }
}

/**
 * Voices manages multiple voice objects, provides a factory method for
 * converting a note group into voices, and provides methods to generate
 * bar-based score objects from the voices.
 */
export class Voices {
  /**
   * @param {!Array<!Voice>} voices An array of voice objects comprising the
   *     voices.
   */
  constructor(voices) {
    /** @type {!Array<!Voice>} */
    this.voices = voices;
    /**
     * The number of voices in this voice.
     * @type {number}
     */
    this.length = this.voices.length;
  }

  /**
   * @param {!NoteGroup} noteGroup The note group to turn into a series of
   *     voices.
   * @return {!Voices}
   */
  static fromNoteGroup(noteGroup) {
    /**
     * A map from start and end times to all the notes with those start and end
     * times.
     * @const {!Map<string, !NoteGroup>}
     */
    const noteMap = new Map();
    for (const timedNote of noteGroup.iterate()) {
      // Iterate through each timed note.
      const timeKey = timedNote.timeKey();
      if (noteMap.has(timeKey)) {
        // If the timestamp is already a key in the map, append the note to the
        // entry.
        noteMap.get(timeKey).addEvent(timedNote);
      } else {
        // Otherwise, create a note group in the timemap at the timestamp with
        // the timedNote as the first entry.
        noteMap.set(timeKey, new NoteGroup(timedNote));
      }
    }

    /**
     * Parses the specified time key into an array of start and end times.
     * @param {string} timeKey The time key to parse.
     * @return {!Array<number>} An array containing the start and end times.
     */
    const parseTimeKey =
        (timeKey) => timeKey.split(',').map((x) => parseFloat(x));

    // Create an array that will ultimately store all the voices.
    const voices = [];
    for (const [key, entries] of noteMap.entries()) {
      // Iterate through each noteMap entry.
      const timeKey = parseTimeKey(key);
      // Extract the start and end time information from the key.
      const [start1, end1] = timeKey;
      let foundVoice = false; // only true if entry belongs to a voice.
      for (const voice of voices) {
        // Iterate through each voice.
        let overlapping = false;
        for (const [start2, end2] of voice.intervals) {
          // Check for overlap with any of the intervals.
          if (end1 > start2 && start1 < end2) {
            overlapping = true;
            break;
          }
        }
        // Skip if it overlaps the voice's intervals.
        if (overlapping) continue;
        // Otherwise, assimilate into the voice, creating a new group for each
        // entry.
        const group = new NoteGroup();
        for (const timedNote of entries.iterate()) {
          group.addEvent(timedNote);
        }
        voice.noteGroup.addGroup(group);
        voice.intervals.push(timeKey);
        foundVoice = true;
        break;
      }
      if (foundVoice) continue;
      // If the entry has not been assimilated into a voice, create a new voice.
      voices.push(new Voice(
        new NoteGroup(entries), // noteGroup
        [timeKey], // intervals
      ));
    }

    return new Voices(voices);
  }

  /**
   * Converts the voices into a list of bars, or measures, containing mocked
   * score objects that can be converted to Vexflow notation.
   * @param {number=} numBeats The number of beats in each measure.
   * @return {!Array<!Array<!BarVoice>>} Returns a list of measures, where each
   *     measure contains one or more bar voices.
   */
  toProperVoices(numBeats = 4) {
    /**
     * An array of measures. Each element is a measure. Each element of each
     * measure is a voice.
     * @const {!Array<!Array<!BarVoice>>}
     */
    const measures = [];
    /**
     * A helper method to add the specified score objects as a bar voice into
     * the specified measure by number. The measure must be no more than 1
     * greater than the current number of measures.
     * @param {number} measureNum The measure to insert the voice into.
     * @param {!Array<!ScoreObject>} scoreObjects The score objects to insert
     *     into the measure.
     */
    const addToMeasure = (measureNum, scoreObjects) => {
      // Create extra room for one more measure if needed.
      if (measureNum > measures.length - 1) measures.push([]);
      measures[measureNum].push(new BarVoice(scoreObjects));
    };

    for (const voice of this.voices) {
      // Iterate through each voice.
      let measureEnd = numBeats;
      let scoreObjects = [];
      let currentBeat = 0;
      let currentMeasure = 0;
      // Sort the note groups by their start times.
      const groupedNotes = voice.noteGroup.subgroups;
      groupedNotes.sort((noteGroup1, noteGroup2) => {
        // Extract and sort by start times.
        const start1 = noteGroup1.events[0].start;
        const start2 = noteGroup2.events[0].start;
        if (start1 < start2) {
          return -1;
        } else if (start1 > start2) {
          return 1;
        } else return 0;
      });
      for (const noteGroup of groupedNotes) {
        // Extract the start and end times for the note group.
        const start = noteGroup.events[0].start;
        const end = noteGroup.events[0].end;
        if (start > currentBeat && start >= measureEnd) {
          // Insert a rest to fill the remainder of the measure.
          scoreObjects.push(new Rest(measureEnd - currentBeat));
          addToMeasure(currentMeasure, scoreObjects);
          // Advance to the next measure.
          scoreObjects = [];
          currentBeat = measureEnd;
          currentMeasure++;
          measureEnd += numBeats;
        }
        if (start > currentBeat) {
          // Need to insert a rest to fill until the current beat.
          scoreObjects.push(new Rest(start - currentBeat));
        }
        if (start >= measureEnd) {
          // Need to start a new bar.
          addToMeasure(currentMeasure, scoreObjects);
          scoreObjects = [];
          currentMeasure++;
          measureEnd += numBeats;
          // TODO(freedmand): Accommodate notes spanning measures.
        }
        scoreObjects.push(new Notes(noteGroup, end - start));
        currentBeat = end;
      }
      if (measureEnd > currentBeat) {
        // Need to insert a rest to fill until the end of the score.
        scoreObjects.push(new Rest(measureEnd - currentBeat));
      }
      if (scoreObjects.length != 0) {
        // If there is remaining content in the voice, add it to the current
        // measure.
        addToMeasure(currentMeasure, scoreObjects);
      }
    }
    return measures;
  }

  /**
   * Returns a string representation of the bar voices toProperVoices returns.
   * Useful for testing.
   * @return {string}
   */
  toProperStrings() {
    return this.toProperVoices().map((properVoices) => {
      return properVoices.map((properVoice) => {
        return properVoice.scoreObjects.map((x) => x.toString()).join('');
      });
    });
  }
}
