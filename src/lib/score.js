import {Chord, ChordDictionary, ContextualChord, MelodicBar} from './chord.js';
import {Event, NoteGroup, Scheduler, TimedNote} from './timing.js';
import {Outcome, Suggester} from './suggest.js';
import {RenderedMeasure, RenderedNote, ScoreRenderer} from './render.js';

import {Listenable} from './listenable.js';
import {SerializationDictionary} from './serializer.js';
import {Voices} from './voices.js';

// Color stylings.
export const PLAYING = '#C2ADED';
export const NORMAL = '#000';
export const SELECTED = '#4F1DB8';
export const SUGGESTED = '#ccc';

// The maximum number of accidentals in any one direction on a rendered score.
const MAX_ACCIDENTALS = 2;

// The amount of delay in milliseconds before a subsequent tap/click on an
// interactive note is considered.
const DOUBLE_CLICK_THRESHOLD = 100;

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
     * Grab the first note and set start and end time properties for
     * convenience.
     * @type {!TimedNote}
     */
    const firstNote = this.renderedNote.noteGroup.iterate().next().value;
    /**
     * The start time of this interactive note in beats.
     * @type {number}
     */
    this.start = firstNote.start;
    /**
     * The end time of this interactive note in beats.
     * @type {number}
     */
    this.end = firstNote.end;

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
     * The x position of this element relative to the SVG element.
     * @type {number}
     */
    this.x = this.element.getBBox().x;

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

    this.initialize();

    /**
     * Prevents a click event from registering twice in rapid succession.
     * @type {boolean}
     */
    this.preventDoubleClick = false;
  }

  /**
   * Sets the cursor to turn into a pointer over all stave notes, indicating
   * that they can be clicked on.
   */
  initialize() {
    this.element.style.cursor = 'pointer';
  }

  /**
   * Selects this interactive note.
   * @param {boolean=} play If true, plays the note as it gets selected.
   */
  select(play = false) {
    // Only update if not already selected.
    if (play) this.playOnceOff(this.renderedNote.noteGroup);
    if (!this.selected) {
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
   * Sets this interactive note to the playing style (actual playback is
   * controlled by the tap compose score).
   */
  play() {
    if (!this.playing) {
      this.playing = true;
      this.render();
    }
  }

  /**
   * Sets this interactive note to stop the playing style (actual playback is
   * controlled by the tap compose score).
   */
  stopPlaying() {
    if (this.playing) {
      this.playing = false;
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
    // Avoid rapid clicks in quick succession.
    if (this.preventDoubleClick) return;
    this.preventDoubleClick = true;
    setTimeout(() => this.preventDoubleClick = false, DOUBLE_CLICK_THRESHOLD);

    // Only play the once off if the tap compose score is paused.
    if (!this.tapComposeScore.scheduler.playing) {
      this.playOnceOff(this.renderedNote.noteGroup);
    }
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
        noteGroup.toPerformanceGroup(
        this.tapComposeScore.instrument, true, 'onceOff-');
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
   * @param {!Array<!ContextualChord>} contextualChords The named chords in this score.
   */
  constructor(noteGroup, contextualChords) {
    /** @type {!NoteGroup} */
    this.noteGroup = noteGroup;
    /** @type {!Array<!ContextualChord>} */
    this.contextualChords = contextualChords;
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
   * @param {!MockSvelteInterface} arpeggioApp The arpeggiator interface
   *     that will be used to play the chords and can be dynamically swapped.
   * @param {!Suggester} suggester The suggester that returns entire melodic
   *     bars that will be used to generate new content.
   * @param {!ChordDictionary} chordDictionary The chord dictionary to use to
   *     deserialize scores.
   * @param {!SerializationDictionary} serializerDictionary The serializer
   *     dictionary used to serialize the score to string and deserialize from
   *     string, with different versions.
   * @param {?string=} serializedScore An optional string representation of a
   *     score. If specified, deserialize and load in the saved score.
   */
  constructor(scoreRenderer, scheduler, instrument, arpeggioApp, suggester,
      chordDictionary, serializerDictionary, serializedScore = null) {
    super();

    /** @type {!ScoreRenderer} */
    this.scoreRenderer = scoreRenderer;
    /** @type {!Scheduler} */
    this.scheduler = scheduler;
    /** @type {!Instrument} */
    this.instrument = instrument;
    /** @type {!MockSvelteInterface} */
    this.arpeggioApp = arpeggioApp;
    /** @type {!Suggester} */
    this.suggester = suggester;
    /** @type {!SerializationDictionary} */
    this.serializerDictionary = serializerDictionary;
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
     * The interactive note that is playing in the score, or null if none is.
     * @type {?InteractiveNote}
     */
    this.playing = null;

    if (serializedScore != null) {
      // Attempt the deserialize the score, if specified.
      try {
        this.deserialize(serializedScore);
      } catch (e) {
        console.error('Deserialization failed');
        console.error(e);
      }
    }
    if (this.suggester.history.length < 1) {
      // Shuffle if it's a new score.
      this.shuffle();
    }
  }

  /**
   * Loads the specified note group and contextual chords to populate the
   * suggester's history.
   * @param {!NoteGroup} noteGroup The note group to use in the score.
   * @param {!Array<!ContextualChord>} contextualChords The contextual chords to
   *     use for each bar of the score.
   */
  load(noteGroup, contextualChords) {
    // Clear the suggester's history.
    this.suggester.clear();

    const bars = Voices.fromNoteGroup(noteGroup).toProperVoices();

    for (let i = 0; i < bars.length; i++) {
      const bar = bars[i];
      const contextualChord = contextualChords[i];

      // Go through each bar and extract all the notes.
      const barNotes = new NoteGroup();
      for (const barVoice of bar) {
        for (const scoreObject of barVoice.scoreObjects) {
          // Convert every score object into a note group.
          barNotes.addGroup(scoreObject.noteGroup);
        }
      }

      this.suggester.addToHistory_(
          Outcome.fixed(new MelodicBar(contextualChord, barNotes)));
      // Accept the penultimate bar.
      if (i == bars.length - 2) this.suggester.accept();
    }

    // If no bars have been added to the history, nothing has effectively
    // happened. Return prematurely.
    if (this.suggester.history.length == 0) return;

    // Set the current beat for the suggester.
    this.suggester.currentBeat = this.suggester.acceptIndex * 4;
    this.suggester.currentEndBeat = this.suggester.history.length * 4;
  }

  /**
   * Deserializes the specified string to populate the suggester's history.
   * @param {string} str The string to deserialize.
   */
  deserialize(str) {
    this.serializerDictionary.deserializeIntoObject(str, this);
  }

  /**
   * Serializes the score into a string.
   * @return {string}
   */
  serialize() {
    return this.serializerDictionary.serialize(this);
  }

  /**
   * Shuffles the current suggestion.
   */
  shuffle() {
    this.suggester.suggest();
    this.render();
    this.setBeatOffset(this.suggester.acceptIndex * 4);
    this.playScheduler();
  }

  /**
   * Accepts the current suggestion.
   */
  accept() {
    this.suggester.accept();
    this.shuffle();
  }

  /**
   * Sets the scheduler's beat offset to the specified amount.
   * @param {number} beatOffset The beat offset to set.
   */
  setBeatOffset(beatOffset) {
    if (this.scheduler.playing) this.allOff();
    this.scheduler.setBeatOffset(beatOffset);
  }

  /**
   * Selects the specified interactive note and deselects every other
   * interactive note.
   * @param {!InteractiveNote} interactiveNote The interactive note to select.
   * @param {boolean=} play If true, plays the note as it is selected.
   */
  select(interactiveNote, play = false) {
    // Deselect the previously selected note.
    this.deselect();

    this.setBeatOffset(interactiveNote.start);

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
      this.selected = null;
    }
  }

  /**
   * Sets the specified interactive note to the desired playback option and
   * stops playing every other interactive note.
   * @param {!InteractiveNote} interactiveNote The interactive note to play.
   * @param {boolean=} playback If true, sets the interactive note to playing.
   *     If false, stops playing the interactive note (along with all the other
   *     interactive notes).
   */
  play(interactiveNote, playback = true) {
    if (this.playing != null) {
      this.playing.stopPlaying();
      this.playing = null;
    }

    if (playback) {
      // Play the specified interactive note, if applicable.
      this.playing = interactiveNote;
      this.playing.play();
    }
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
      // Iterate through subgroups and events, and events.
      for (const subgroup of outcome.value.noteGroup.subgroups) {
        for (const timedNote of subgroup.events) {
          // Uncover the timed note within the suggester's history.
          if (timedNote.toString() == originalTimedNote.toString()) {
            timedNote.note = newNote;
            return;
          }
        }
      }
      // TODO(freedmand): Make cleaner.
      for (const timedNote of outcome.value.noteGroup.events) {
        // Uncover the timed note within the suggester's history.
        if (timedNote.toString() == originalTimedNote.toString()) {
          timedNote.note = newNote;
          return;
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
   * Plays the scheduler, ensures everything is deselected.
   */
  playScheduler() {
    this.deselect();
    this.scheduler.play();
  }

  /**
   * Stops the scheduler, stops the instrument, ensures everything is reset.
   */
  allOff() {
    this.scheduler.pause();
    this.instrument.allOff();
    // Stop every interactive note.
    for (const interactiveNote of this.interactiveNotes) {
      interactiveNote.cancelOnceOff(false);
    }
    this.play(null, false);
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
    } else if (e.code == 'Enter') { // Shuffle
      this.shuffle();
    } else if (e.code == 'KeyA') { // Accept
      this.accept();
    } else if (e.code == 'KeyR') { // Play from beginning.
      this.allOff();
      this.scheduler.beatOffset = 0;
      this.playScheduler();
    } else if (e.code == 'Space') { // Play / resume.
      if (!this.scheduler.playing) {
        this.playScheduler();
      } else {
        this.scheduler.pause();
        this.allOff();
      }
      e.preventDefault();
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
    this.scoreRenderer.renderTapComposeScore(this, preserveSelected);
  }
}
