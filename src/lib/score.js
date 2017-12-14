import {Chord, ChordDictionary, ContextualChord, MelodicBar} from './chord.js';
import {NoteGroup, Scheduler} from './timing.js';
import {Outcome, Suggester} from './suggest.js';
import {RenderedMeasure, RenderedNote, ScoreRenderer} from './render.js';

import {StaveNote} from '../third_party/vexflow/stavenote.js';
import {Voices} from './voices.js';

// Color stylings.
export const PLAYING = '#efa303';
export const NORMAL = '#000';
export const SELECTED = '#3f67ef';
export const SUGGESTED = '#ccc';

/**
 * InteractiveNote links a stave note to a score and provides features related
 * to editing and styling.
 */
export class InteractiveNote {
  /**
   * @param {!Score} score The score to which this note belongs.
   * @param {!RenderedNote} renderedNote The rendered note object that links the
   *     Vexflow StaveNote object with the underlying timed notes.
   * @param {?InteractiveNote=} leftNote The note immediately to the left of
   *     this one, or null if none exists.
   * @param {?InteractiveNote=} rightNote The note immediately to the right of
   *     this one, or null if none exists.
   */
  constructor(score, renderedNote, leftNote = null, rightNote = null) {
    /** @type {!Score} */
    this.score = score;
    /** @type {!RenderedNote} */
    this.renderedNote = renderedNote;
    /** @type {?InteractiveNote} */
    this.leftNote = leftNote;
    /** @type {?InteractiveNote} */
    this.rightNote = rightNote;

    /**
     * Whether the note is currently selected in the UI.
     * @type {boolean}
     */
    this.selected = false;
    /**
     * Whether the note is currently being played.
     * @type {boolean}
     */
    this.playing = false;
    /**
     * Whether the note is a suggested note that has not yet been finalized.
     * @type {boolean}
     */
    this.suggested = false;
    /**
     * Whether the note is currently being moused over.
     * @type {boolean}
     */
    this.hovered = false;
  }

  /**
   * Render the stave note according to the how the note is being interacted
   * with in the UI.
   */
  render() {
    if (this.selected) {
      // If selected, fill the note as such and ignore everything else.
      this.fill(SELECTED);
      this.opacity(1);
    } else {
      if (this.playing) {
        // If the note is playing, fill the note as such.
        this.fill(PLAYING);
      } else {
        // Otherwise, check if the note is suggested.
        if (this.suggested) {
          this.fill(SUGGESTED, true);
        } else {
          this.fill(NORMAL);
        }
      }
      // If the note is being hovered over, alter its opacity.
      if (this.hovered) {
        this.opacity(0.65);
      } else {
        this.opacity(1);
      }
    }
  }

  /**
   * Paints the stave note the specified color.
   * @param {string} color A valid CSS color.
   * @param {boolean=} fillUnattachedLines If true, finds SVG path elements that
   *     are not contained within a group and are after this element, painting
   *     them the specified color. This is a hacky way of dealing with Vexflow
   *     not providing drawing access to certain noteheads.
   */
  fill(color, fillUnattachedLines = false) {
    // Grab the element.
    const elem = this.renderedNote.staveNote.attrs.el;

    // Grab each sub-element and put them in a list of elements to process.
    const elems = Array.from(elem.getElementsByTagName('*'));

    if (fillUnattachedLines) {
      // Grab unattached path elements and add them to the list of elements.
      let currentElem = elem.nextSibling;
      while (currentElem) {
        // Iterate through each adjacent sibling looking for 'path' elements.
        if (currentElem.tagName.toLowerCase() == 'path') {
          elems.push(currentElem);
        }
        currentElem = currentElem.nextSibling;
      }
    }

    elems.forEach((subEl) => {
      // Iterate through each sub-element and color its fill and stroke,
      // depending on which properties are already set.
      if (subEl.getAttribute('fill')) subEl.setAttribute('fill', color);
      if (subEl.getAttribute('stroke')) subEl.setAttribute('stroke', color);
    });
  }

  /**
   * Fades the stave note to the specified opacity.
   * @param {number} opacity The CSS-style opacity specifier.
   */
  opacity(opacity) {
    this.renderedNote.staveNote.attrs.el.setAttribute('opacity', opacity);
  }
}

/**
 * A score contains notes and named chords.
 */
export class Score {
  /**
   * @param {!NoteGroup} noteGroup The group of notes in the score.
   * @param {!Array<!NamedChord>} namedChords The named chords in this score.
   */
  constructor(noteGroup, namedChords) {
    /** @type {!NoteGroup} */
    this.noteGroup = noteGroup;
    /** @type {!Array<!NamedChord>} */
    this.namedChords = namedChords;
  }

  /**
   * Serializes the score to a string.
   * @return {string}
   */
  serialize() {
    const chordsString = this.namedChords.forEach((namedChord) => {
      return namedChord.name;
    }).join(',');
    const notesString = this.noteGroup.serialize();
    return `${chordsString}-${notesString}`;
  }

  /**
   * Deserializes the string into a score. See serialize() for the format.
   * @param {string} str The string representation of the score.
   * @param {!ChordDictionary} chordDictionary The chord dictionary to use to
   *     deserialize chord names.
   * @return {!Score} The deserialized score.
   */
  static deserialize(str, chordDictionary) {
    const [chordsString, notesString] = str.split('-');
    const chordNames = chordsString.split(',');
    const namedChords = chordNames.map(
        (chordName) => chordDictionary.getChordByName(chordName));
    const noteGroup = NoteGroup.deserialize(notesString);
    return new Score(noteGroup, namedChords);
  }
}

/**
 * TapComposeScore represents a musical score, playback system, instrument,
 * arpeggiation pattern, and suggester that generates new melodies, rhythms, and
 * chords. The score always has one suggested measure at the end that can be
 * shuffled or accepted.
 */
export class TapComposeScore {
  /**
   * @param {!ScoreRenderer} scoreRenderer The renderer that will be used to
   *     draw the score.
   * @param {!Scheduler} scheduler The scheduler that will control all the
   *     timing for this score.
   * @param {!Instrument} instrument The instrument that will be used for
   *     playback of this score.
   * @param {!Arpeggiator} arpeggiator The arpeggiator that will be used to play
   *     the chords.
   * @param {!Suggester} suggester The suggester that returns entire melodic
   *     bars that will be used to generate new content.
   * @param {!ChordDictionary} chordDictionary The chord dictionary to use to
   *     deserialize scores.
   * @param {?string=} serializedScore An optional string representation of a
   *     score. If specified, deserialize and load in the saved score.
   */
  constructor(scoreRenderer, scheduler, instrument, suggester, chordDictionary,
      serializedScore = null) {
    /** @type {!ScoreRenderer} */
    this.scoreRenderer = scoreRenderer;
    /** @type {!Scheduler} */
    this.scheduler = scheduler;
    /** @type {!Instrument} */
    this.instrument = instrument;
    /** @type {!Arpeggiator} */
    this.arpeggiator = arpeggiator;
    /** @type {!Suggester} */
    this.suggester = suggester;
    /** @type {!ChordDictionary} */
    this.chordDictionary = chordDictionary;

    /**
     * The number of measures that have been accepted.
     * @type {number}
     */
    this.acceptedBars = -1;

    if (serializedScore != null) {
      this.deserialize(serializedScore);
    }
    if (this.acceptedBars < 0) {
      // Shuffle if its a new score.
      this.shuffle();
    }
  }

  /**
   * Deserializes the specified string to populate the suggester's history.
   * @param {string} str The string to deserialize.
   */
  deserialize(str) {
    const score = Score.deserialize(str, this.chordDictionary);
    const bars = Voices.fromNoteGroup(score.noteGroup).toProperVoices();

    for (const bar of bars) {
      // Go through each bar and extract all the notes.
      const barNotes = new NoteGroup;
      for (const barVoice of bar) {
        for (const scoreObject of barVoice.scoreObjects) {
          // Convert every score object into a note group.
          barNotes.addGroup(scoreObject.noteGroup);
        }
      }
      const namedChord = score.namedChords[this.suggester.history.length];
      // Use an empty scale for the named chord.
      // TODO(freedmand): Auto-locate the likely scale.
      const contextualChord = new ContextualChord(namedChord, new Chord());

      this.suggester.history.push(
          Outcome.fixed(new MelodicBar(contextualChord, barNotes)));
    }

    // If no bars have been added to the history, nothing has effectively
    // happened. Return prematurely.
    if (this.suggester.history.length == 0) return;

    // Set the suggester so the last bar is suggested.
    this.suggester.acceptIndex = this.suggester.history.length - 1;
    // Update the number of accepted bars.
    this.acceptedBars = this.suggester.acceptIndex;
  }

  /**
   * Shuffles the current suggestion.
   */
  shuffle() {
    this.suggester.suggest();
    this.render();
  }

  /**
   * Accepts the current suggestion.
   */
  accept() {
    this.suggester.accept();
    this.shuffle();
  }

  /**
   * Renders the current note group and set of chords. This method should be
   * called any time this underlying data is changed.
   */
  render() {
    // Grab the entire history from the suggester.
    const outcomes = this.suggester.history;

    // Extract notes and chords from the outcomes.
    const bars = /** @type {!Array<!MelodicBar>} */ (
        outcomes.map((outcome) => outcome.value));
    const allNotes = new NoteGroup(bars.map((bar) => bar.noteGroup));
    const allChords = bars.map((bar) => bar.contextualChord);

    // Clear out the scheduler, shut off the instrument, and clear the score.
    this.scheduler.clear();
    this.instrument.allOff();
    this.scoreRenderer.clear();

    // Render the score.
    /** @type {!Array<!RenderedMeasure>} */
    const renderedMeasures = this.scoreRenderer.render(allNotes, allChords);

    const interactiveNotes = [];
    for (let i = 0; i < renderedMeasures.length; i++) {
      // Iterate through each measure and populate new interactive notes.
      const renderedMeasure = renderedMeasures[i];
      const suggestedMeasure = i == renderedMeasures.length - 1;

      for (const renderedNote of renderedMeasure.renderedNotes) {
        const interactiveNote = new InteractiveNote(this, renderedNote);
        interactiveNotes.push(interactiveNote);
        interactiveNote.suggested = suggestedMeasure;
      }
    }

    // Link up left and right notes.
    for (let i = 0; i < interactiveNotes.length; i++) {
      if (i != 0) interactiveNotes[i].leftNote = interactiveNotes[i - 1];
      if (i != interactiveNotes.length - 1) {
        interactiveNotes[i].rightNote = interactiveNotes[i + 1];
      }
      interactiveNotes[i].render();
    }
  }
}
