import {Chord, ChordDictionary, ContextualChord, MelodicBar} from './chord.js';
import {NoteGroup, Scheduler} from './timing.js';
import {Outcome, Suggester} from './suggest.js';
import {RenderedMeasure, RenderedNote, ScoreRenderer} from './render.js';

import {Listenable} from './listenable.js';
import {StaveNote} from '../third_party/vexflow/stavenote.js';
import {Voices} from './voices.js';

// Color stylings.
export const PLAYING = '#efa303';
export const NORMAL = '#000';
export const SELECTED = '#3f67ef';
export const SUGGESTED = '#ccc';

// The maximum number of accidentals in any one direction on a rendered score.
const MAX_ACCIDENTALS = 2;

/**
 * InteractiveNote links a stave note to a score and provides features related
 * to editing and styling.
 */
export class InteractiveNote extends Listenable {
  /**
   * @param {!TapComposeScore} tapComposeScore The tap compose score to which
   *     this note belongs.
   * @param {!RenderedNote} renderedNote The rendered note object that links the
   *     Vexflow StaveNote object with the underlying timed notes.
   * @param {number} index The index of this rendered note relative to the
   *     others.
   * @param {?InteractiveNote=} leftNote The note immediately to the left of
   *     this one, or null if none exists.
   * @param {?InteractiveNote=} rightNote The note immediately to the right of
   *     this one, or null if none exists.
   */
  constructor(tapComposeScore, renderedNote, index, leftNote = null,
      rightNote = null) {
    super();

    /** @type {!TapComposeScore} */
    this.tapComposeScore = tapComposeScore;
    /** @type {!RenderedNote} */
    this.renderedNote = renderedNote;
    /** @type {number} */
    this.index = index;
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

    /**
     * The underlying SVG stave note element for this interactive note.
     * @type {!Element}
     */
    this.element = this.renderedNote.staveNote.attrs.el;

    /**
     * The scheduler for performing once off events, like click playback.
     * @type {!Scheduler}
     */
    this.onceOffScheduler =
        new Scheduler(this.tapComposeScore.scheduler.timing);

    // Add event listeners.
    this.registerListener(
        this.element, 'mouseover', this.mouseOver.bind(this));
    this.registerListener(
        this.element, 'mouseout', this.mouseOut.bind(this));

    this.registerListener(
        this.element, 'click', this.clickPlayback.bind(this));
    this.registerListener(
        this.element, 'touchstart', this.clickPlayback.bind(this));
  }

  /**
   * Selects this interactive note.
   * @param {boolean=} play If true, plays the note as it gets selected.
   */
  select(play = false) {
    // Only update if not already selected.
    if (!this.selected) {
      if (play) this.playOnceOff(this.renderedNote.noteGroup);
      this.selected = true;
      this.render();
    }
  }

  /**
   * Deselects this interactive note.
   */
  deselect() {
    // Only update if not already deselected.
    if (this.selected) {
      this.selected = false;
      this.render();
    }
  }


  /**
   * Tears down event listeners that were created by this interactive note.
   */
  tearDown() {
    super.tearDown();

    // Cancel any once off callbacks, if relevant.
    this.cancelOnceOff();
  }

  /**
   * Called when the mouse comes over the note.
   */
  mouseOver() {
    this.hovered = true;
    this.render();
  }

  /**
   * Called when the mouse leaves the note.
   */
  mouseOut() {
    this.hovered = false;
    this.render();
  }

  /**
   * Called when the note is clicked or tapped.
   * @param {!MouseEvent} e The mouse event.
   */
  clickPlayback(e) {
    // Only run if the tap compose score is paused.
    if (this.tapComposeScore.playing) return;

    this.playOnceOff(this.renderedNote.noteGroup);
    this.tapComposeScore.select(this);

    e.stopPropagation();
  }

  /**
   * Plays the specified note group once. Useful for click playback events.
   * @param {!NoteGroup} noteGroup The notes to play once.
   */
  playOnceOff(noteGroup) {
    // Clear any extant once off schedulers.
    this.cancelOnceOff();

    // Create the performance group, add it to the once off scheduler, and play.
    const performanceGroup =
        noteGroup.toPerformanceGroup(this.tapComposeScore.instrument, true);
    this.onceOffScheduler.add(performanceGroup);
    this.onceOffScheduler.initialize();
    this.onceOffScheduler.play();
  }

  /**
   * Cancels any currently running once off playback events.
   * @param {boolean=} cancelAll If true, executes the cancelOnceOff method for
   *     each interactive note in the score.
   */
  cancelOnceOff(cancelAll = true) {
    if (cancelAll) {
      for (const interactiveNote of this.tapComposeScore.interactiveNotes) {
        interactiveNote.cancelOnceOff(false);
      }
      return;
    }
    // Clear the once off scheduler.
    this.onceOffScheduler.clear();
    // Stop any currently playing instruments.
    this.tapComposeScore.instrument.allOff();
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
    // Grab each sub-element and put them in a list of elements to process.
    const elems = Array.from(this.element.getElementsByTagName('*'));

    if (fillUnattachedLines) {
      // Grab unattached path elements and add them to the list of elements.
      let currentElem = this.element.nextSibling;
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
    this.element.setAttribute('opacity', opacity);
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
export class TapComposeScore extends Listenable {
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
    super();

    /** @type {!ScoreRenderer} */
    this.scoreRenderer = scoreRenderer;
    /** @type {!Scheduler} */
    this.scheduler = scheduler;
    /** @type {!Instrument} */
    this.instrument = instrument;
    // /** @type {!Arpeggiator} */
    // this.arpeggiator = arpeggiator;
    /** @type {!Suggester} */
    this.suggester = suggester;
    /** @type {!ChordDictionary} */
    this.chordDictionary = chordDictionary;

    /**
     * Whether the tap compose score is currently playing.
     * @type {boolean}
     */
    this.playing = false;

    /**
     * The interactive notes in this score. These get populated in the render
     * method.
     * @type {!Array<!InteractiveNote>}
     */
    this.interactiveNotes = [];

    /**
     * The interactive note that is selected in the score, or null if none is.
     * @type {?InteractiveNote}
     */
    this.selected = null;

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
   * Selects the specified interactive note and deselects every other
   * interactive note.
   * @param {!InteractiveNote} The interactive note to select.
   * @param {boolean=} play If true, plays the note as it is selected.
   */
  select(interactiveNote, play = false) {
    // Deselect the previously selected note.
    this.deselect();

    // Selects the specified interactive note.
    this.selected = interactiveNote;
    this.selected.select(play);
  }

  /**
   * Deselects any interactive note that may have been selected.
   */
  deselect() {
    if (this.selected != null) {
      this.selected.deselect();
    }
    this.selected = null;
  }

  /**
   * Selects the interactive note adjacent to the currently selected one, if
   * anything is selected.
   * @param {boolean} left If true, selects the left adjacent note. Otherwise,
   *     selects the right adjacent note.
   */
  selectAdjacent(left) {
    // Only works if a note has been selected.
    if (this.selected == null) return;

    // Grab the appropriate new selection.
    const newSelection =
        left ? this.selected.leftNote : this.selected.rightNote;
    // If no interactive note is adjacent, return.
    if (newSelection == null) return;

    // Select the new interactive note.
    this.select(newSelection, true);
  }

  /**
   * Mutates the original timed note into a new note, updating the suggester
   * history. The timing of the notes is not altered.
   * @param {!TimedNote} originalTimedNote The timed note to find and change.
   * @param {!Note} newNote The new note to change to.
   */
  mutate(originalTimedNote, newNote) {
    for (const outcome of this.suggester.history) {
      for (const subgroup of outcome.value.noteGroup.subgroups) {
        for (const timedNote of subgroup.events) {
          // Uncover the timed note within the suggester's history.
          if (timedNote.toString() == originalTimedNote.toString()) {
            timedNote.note = newNote;
            return;
          }
        }
      }
    }

    throw new Error('Mutation not found');
  }

  /**
   *
   * @param {number} jump The number of steps to shift the currently selected
   *     note.
   * @param {boolean} shiftAccidentals If true, shifts the accidentals the
   *     specified number of steps. If false, shifts the note letter.
   */
  shiftSelected(jump, shiftAccidentals) {
    // Only works if a note has been selected.
    if (this.selected == null) return;

    // Iterate through each note of the selected interactive note and shift.
    for (const timedNote of this.selected.renderedNote.noteGroup.events) {
      if (shiftAccidentals) {
        // Shift accidentals.
        this.mutate(
            timedNote, timedNote.note.accidentalShift(jump, MAX_ACCIDENTALS));
      } else {
        // Otherwise, shift note letters.
        this.mutate(
            timedNote, timedNote.note.baseShift(jump));
      }
    }

    this.render(true);
  }

  /**
   * Responds to an onclick event.
   */
  click() {
    this.deselect();
  }

  /**
   * Responds to a keydown event.
   * @param {!KeyboardEvent} e The keyboard event object.
   */
  keydown(e) {
    if (e.code == 'ArrowLeft' || e.code == 'ArrowRight') {
      // Prevent scrolling if something is selected.
      if (this.selected != null) e.preventDefault();

      this.selectAdjacent(e.code == 'ArrowLeft');
      e.stopPropagation();
    } else if (e.code == 'ArrowUp' || e.code == 'ArrowDown') {
      // Prevent scrolling if something is selected.
      if (this.selected != null) e.preventDefault();

      this.shiftSelected(e.code == 'ArrowDown' ? -1 : 1, e.shiftKey);
      e.stopPropagation();
    }
  }

  /**
   * Tear down any events that have been set.
   */
  tearDown() {
    super.tearDown();

    // Remove all interactive note listeners.
    this.interactiveNotes.forEach(
      (interactiveNote) => interactiveNote.tearDown());
  }

  /**
   * Renders the current note group and set of chords. This method should be
   * called any time this underlying data is changed.
   * @param {boolean=} preserveSelected If true, preserves the selected note
   *     index and restores that selection by index.
   */
  render(preserveSelected = false) {
    /**
     * If preserve selected is true, the index to restore after creating new
     * interactive notes.
     * @type {number}
     */
    let selectedIndex;
    if (preserveSelected && this.selected) {
      selectedIndex = this.selected.index;
    }

    // Tear down any interactive notes that already exist and reset them.
    this.tearDown();
    this.interactiveNotes = [];
    this.selected = null;

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
        // Create a new interactive note with the appropriate index.
        const interactiveNote = new InteractiveNote(
            this, renderedNote, this.interactiveNotes.length);
        this.interactiveNotes.push(interactiveNote);
        interactiveNote.suggested = suggestedMeasure;
      }
    }

    // Link up left and right notes.
    for (let i = 0; i < this.interactiveNotes.length; i++) {
      if (i != 0) {
        this.interactiveNotes[i].leftNote = this.interactiveNotes[i - 1];
      }
      if (i != this.interactiveNotes.length - 1) {
        this.interactiveNotes[i].rightNote = this.interactiveNotes[i + 1];
      }
      this.interactiveNotes[i].render();
    }

    if (preserveSelected) {
      this.select(this.interactiveNotes[selectedIndex], true);
    }

    // Add event listeners.
    this.registerListener(
        this.scoreRenderer.scoreElem, 'click', this.click.bind(this));
    this.registerListener(
        this.scoreRenderer.scoreElem, 'touchstart', this.click.bind(this));

    this.registerListener(document.body, 'keydown', this.keydown.bind(this));
  }
}
