import {ContextualChord, MelodicBar} from './chord.js';
import {NoteGroup, Scheduler} from './timing.js';
import {Notes, Voices} from './voices.js';

import {Accidental} from '../third_party/vexflow/accidental.js';
import {BarVoice} from './voices.js';
import {Beam} from '../third_party/vexflow/beam.js';
import {Formatter} from '../third_party/vexflow/formatter.js';
import {Instrument} from './instrument.js';
import {Modifier} from '../third_party/vexflow/modifier.js';
import {Renderer} from '../third_party/vexflow/renderer.js';
import {Stave} from '../third_party/vexflow/stave.js';
import {StaveNote} from '../third_party/vexflow/stavenote.js';
import {Suggester} from './suggest.js';
import {Voice} from '../third_party/vexflow/voice.js';

const PLAYING = '#efa303';
const NORMAL = '#000';
const SELECTED = '#3f67ef';
const SUGGESTED = '#ccc';

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
 * RenderedNote links a Vexflow stave note, a note group, and optional beams
 * together in a light-weight unified class.
 */
export class RenderedNote {
  /**
   * @param {!StaveNote} staveNote The Vexflow stave note.
   * @param {!NoteGroup} noteGroup The note group that the stave note describes.
   */
  constructor(staveNote, noteGroup) {
    /** @type {!StaveNote} */
    this.staveNote = staveNote;
    /** @type {!NoteGroup} */
    this.noteGroup = noteGroup;

    /**
     * The beams for the rendered note. Can get assigned later using setBeams().
     * @type {!Array<!Beam>}
     */
    this.beams = [];
  }

  /**
   * Sets this rendered note to store references to the specified beams.
   * @param {!Array<!Beam>} beams The beams.
   */
  setBeams(beams) {
    this.beams = beams;
  }
}

/**
 * RenderedMeasure contains a set of Vexflow voice objects, beams, and the
 * rendered notes that link everything together for a particular measure.
 */
export class RenderedMeasure {
  /**
   *
   * @param {!Array<!Voice>} vfVoices An array of Vexflow voices that occur
   *     within this measure.
   * @param {!Array<!Beam>} beams An array of beam objects that are in this
   *     measure.
   * @param {!Array<!RenderedNote>} renderedNotes An array of rendered note
   *     objects that are in this measure.
   */
  constructor(vfVoices, beams, renderedNotes) {
    /** @type {!Array<!Voice>} */
    this.vfVoices = vfVoices;
    /** @type {!Array<!Beam>} */
    this.beams = beams;
    /** @type {!Array<!RenderedNote>} */
    this.renderedNotes = renderedNotes;
  }
}

/**
 * ScoreRenderer is responsible for talking with Vexflow to turn notes and
 * chords into a graphical score.
 */
export class ScoreRenderer {
  /**
   * @param {!Element} scoreElem The element into which the SVG score will be
   *     rendered.
   */
  constructor(scoreElem) {
    /** @type {!Element} */
    this.scoreElem = scoreElem;
  }

  /**
   * Clears the renderer.
   */
  clear() {
    while (this.scoreElem.firstChild) {
      this.scoreElem.removeChild(this.scoreElem.firstChild);
    }
  }

  /**
   * Converts the specified notes object into a Vexflow stave note object.
   * @param {!Notes} notesObject
   * @param {string=} clef The clef to create the note in.
   * @return {!StaveNote} The Vexflow stave note object.
   */
  toStaveNote(notesObject, clef = 'treble') {
    return new StaveNote({
      clef,
      keys: notesObject.noteNames,
      duration: notesObject.duration,
    });
  }

  /**
   * Converts the specified measures into rendered measures containing Vexflow
   * voice objects.
   * @param {!Array<!Array<!BarVoice>>} measures An array of measures. Each
   *     measure contains an array of BarVoice objects corresponding to each
   *     voice.
   * @param {number=} numBeats The number of beats per measure in each Vexflow
   *     voice.
   * @param {number=} beatValue The value of each beat in each Vexflow voice.
   * @param {string=} clef The clef of the resulting Vexflow voice objects.
   * @return {!Array<!RenderedMeasure>} The array of rendered measures
   *     containing Vexflow objects to render the measures and their links to
   *     the underlying note groups.
   */
  toRenderedMeasures(measures, numBeats = 4, beatValue = 4, clef = 'treble') {
    /** @const {!Array<!RenderedMeasure>} */
    const result = [];

    for (const barVoices of measures) {
      /**
       * All the rendered notes mapping stave notes to note groups for this
       * measure.
       * @const {!Array<!RenderedNote>}
       */
      const renderedNotes = [];
      // Iterate through each measure.
      /** @const {!Array<!Voice>} */
      const vfVoices = [];
      /** @const {!Array<!Beam>} */
      let beams = [];
      for (const barVoice of barVoices) {
        // Iterate through each bar voice and populate a voice of stave notes.
        /** @const {!Array<!StaveNote>} */
        const staveNoteVoice = [];
        /**
         * All the rendered notes mapping stave notes to note groups for this
         * voice.
         * @const {!Array<!RenderedNote>}
         */
        const barVoiceRenderedNotes = [];
        for (const scoreObject of barVoice.scoreObjects) {
          // Iterate through each score object.
          const staveNote = this.toStaveNote(scoreObject, clef);
          staveNoteVoice.push(staveNote);
          const renderedNote = new RenderedNote(
              scoreObject.staveNote, scoreObject.noteGroup);
          renderedNotes.push(renderedNote);
          barVoiceRenderedNotes.push(renderedNote);
        }
        // Create a Vexflow voice.
        const vfVoice = new Voice({num_beats: numBeats, beat_value: beatValue});
        // Generate beams for the stave note voice and add them to the beams for
        // the measure.
        beams = beams.concat(Beam.generateBeams(staveNoteVoice));
        barVoiceRenderedNotes.forEach((renderedNote) => {
          // Store the beams in each rendered note in the bar voice.
          renderedNote.setBeams(beams);
        });

        // Add tickables and add it to the voices.
        vfVoice.addTickables(staveNoteVoice);
        vfVoices.push(vfVoice);
      }
      result.push(new RenderedMeasure(vfVoices, beams, renderedNotes));
    }
    return result;
  }

  /**
   * Renders the specified notes and chords into the score.
   * @param {!NoteGroup} noteGroup The notes to render.
   * @param {!Array<!ContextualChord>} chords The chords to render. There should
   *     be as many chords as there are measures.
   * @param {string=} keySignature The key signature to use when automatically
   *     rendering accidentals on the notes.
   * @param {string=} clef The clef to use when rendering the first bar.
   * @param {string=} timeSignature The time signature to use when rendering the
   *     first bar.
   * @param {number=} staveWidth The width of each bar in pixels
   * @param {number=} clefWidth The width of the clef area of the first bar.
   * @param {number=} offsetX The x offset at which to render everything.
   * @param {number=} offsetY The y offset at which to render everything.
   */
  render(noteGroup, chords, keySignature = 'C', clef = 'treble',
      timeSignature = '4/4',
      staveWidth = 250, clefWidth = 60, offsetX = 60, offsetY = 20) {
    const renderer = new Renderer(this.scoreElem, Renderer.Backends.SVG);

    // Get a drawing context.
    const context = renderer.getContext();

    // Convert the notes into measures.
    const measures = Voices.fromNoteGroup(noteGroup).toProperVoices();
    const renderedMeasures = this.toRenderedMeasures(measures);

    // Iterate through each measure and render each stave.
    for (let i = 0; i < measures.length; i++) {
      // Whether or not the measure is the one currently being suggested.
      const suggestedMeasure = i == measures.length - 1;

      const renderedMeasure = renderedMeasures[i];
      const chord = chords[i];

      // Create a stave
      const stave = new Stave(
        offsetX + i * staveWidth + (i == 0 ? 0 : clefWidth), // x
        offsetY, // y
        staveWidth + (i == 0 ? clefWidth : 0), // width
      );

      stave.setText(chord.name, Modifier.Position.BELOW, {
          fill: suggestedMeasure ? SUGGESTED : NORMAL, // style options
      });

      // Add a clef and time signature to just the first bar.
      if (i == 0) stave.addClef(clef).addTimeSignature(timeSignature);

      // Connect to the rendering context and draw.
      stave.setContext(context).draw();

      if (suggestedMeasure) {
        // Set styles for voices and beams in the suggested measure.
        for (const beam of renderedMeasure.beams) {
          beam.setStyle({fillStyle: SUGGESTED, strokeStyle: SUGGESTED});
        }
        for (const vfVoice of renderedMeasure.vfVoices) {
          vfVoice.setStyle({fillStyle: SUGGESTED, strokeStyle: SUGGESTED});
        }
      }

      // Apply accidentals automatically using the key signature.
      Accidental.applyAccidentals(renderedMeasure.vfVoices, keySignature);

      // Format the voices to fit evenly within the stave.
      new Formatter().joinVoices(renderedMeasure.vfVoices).format(
          renderedMeasure.vfVoices, staveWidth);

      // Render the voices and beams.
      renderedMeasure.vfVoices.forEach((v) => v.draw(context, stave));
      renderedMeasure.beams.forEach((b) => b.setContext(context).draw());
    }
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
