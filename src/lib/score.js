import {ContextualChord, MelodicBar} from './chord.js';
import {NoteGroup, Scheduler} from './timing.js';

import {ScoreRenderer} from './render.js';
import {StaveNote} from '../third_party/vexflow/stavenote.js';
import {Suggester} from './suggest.js';

/**
 * InteractiveNote links a stave note to a score and provides features related
 * to editing and styling.
 */
export class InteractiveNote {
  /**
   * @param {!Score} score The score to which this note belongs.
   * @param {!StaveNote} staveNote The Vexflow StaveNote object that is used to
   *     render this note.
   * @param {!NoteGroup} noteGroup The underlying timed notes that are in this
   *     note.
   * @param {?RenderedNote=} leftNote The note immediately to the left of this
   *     one.
   * @param {?RenderedNote=} rightNote The note immediately to the right of this
   *     one.
   */
  constructor(score, staveNote, noteGroup, leftNote = null, rightNote = null) {
    /** @type {!Score} */
    this.score = score;
    /** @type {!StaveNote} */
    this.staveNote = staveNote;
    /** @type {!Array<!Note>} */
    this.timedNotes = timedNotes;
    /** @type {?RenderedNote} */
    this.leftNote = leftNote;
    /** @type {?RenderedNote} */
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
   */
  constructor(scoreRenderer, scheduler, instrument, suggester) {
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

    /**
     * The number of measures that have been accepted.
     * @type {number}
     */
    this.acceptedBars = 0;
    this.shuffle();
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
    this.scoreRenderer.render(allNotes, allChords);
  }
}
