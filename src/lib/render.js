import {FunctionEvent, NoteGroup} from './timing.js';
import {NORMAL, SUGGESTED} from './score.js';
import {Notes, Voices} from './voices.js';

import {Accidental} from '../third_party/vexflow/accidental.js';
import {Arpeggiator} from './arpeggiator.js';
import {BarVoice} from './voices.js';
import {Beam} from '../third_party/vexflow/beam.js';
import {Formatter} from '../third_party/vexflow/formatter.js';
import {Instrument} from './instrument.js';
import {InteractiveNote} from './score.js';
import {Modifier} from '../third_party/vexflow/modifier.js';
import {Renderer} from '../third_party/vexflow/renderer.js';
import {Stave} from '../third_party/vexflow/stave.js';
import {StaveNote} from '../third_party/vexflow/stavenote.js';
import {Voice} from '../third_party/vexflow/voice.js';

// The SVG namespace.
const SVG_NS = 'http://www.w3.org/2000/svg';

// An additional width to add to the score element to cause the score to go past
// the end when scrolling.
const SCROLL_OFFSET = 200;

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
 * The playback cursor which moves fluidly over the SVG in response to playback.
 */
class Cursor {
  /**
   * @param {!TapComposeScore} tapComposeScore The tap compose score the cursor
   *     will be placed in.
   * @param {!Array<!InteractiveNote>} interactiveNotes The interactive notes
   *     the cursor moves between.
   * @param {number=} startingPosition The starting position of the cursor in
   *     beats.
   * @param {number=} width The width of the cursor in pixels.
   */
  constructor(tapComposeScore, interactiveNotes, startingPosition = 0,
      width = 6) {
    /** @type {!TapComposeScore} */
    this.tapComposeScore = tapComposeScore;
    /** @type {!Array<InteractiveNote>} */
    this.interactiveNotes = interactiveNotes;
    /** @type {number} */
    this.width = width;

    /**
     * The SVG element that represents this cursor.
     * @type {?Element}
     */
    this.rect = null;

    this.initialize(startingPosition);
  }

  /**
   * Draws the cursor.
   * @param {number} position The starting position in beats.
   */
  initialize(position) {
    // Create the cursor element.
    this.rect = document.createElementNS(SVG_NS, 'rect');
    this.rect.setAttributeNS(null, 'y', 0);
    this.rect.setAttributeNS(null, 'width', 6);
    this.rect.setAttributeNS(null, 'height', 300);
    this.rect.setAttributeNS(null, 'class', 'cursor');

    const svg =
        this.tapComposeScore.scoreRenderer.scoreElem.querySelector('svg');
    svg.appendChild(this.rect);

    this.setPosition(position);
  }

  /**
   * Sets the position of the cursor to the specified beat offset.
   * @param {number} beatOffset The beat offset.
   */
  setPosition(beatOffset) {
    for (const interactiveNote of this.interactiveNotes) {
      if (beatOffset >= interactiveNote.start &&
          beatOffset <= interactiveNote.end) {
        // Found the interactive note. Set the position by first getting the x
        // bounds.
        const x1 = interactiveNote.x;
        let x2 = interactiveNote.x;
        if (interactiveNote.rightNote != null) x2 = interactiveNote.rightNote.x;

        // Get the position percentage.
        const position = (beatOffset - interactiveNote.start) /
            (interactiveNote.end - interactiveNote.start);
        // Get the coordinate and set it.
        const finalX = x1 + position * (x2 - x1);
        this.rect.setAttributeNS(null, 'x', finalX + this.width / 2);
      }
    }
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
   * Sets the URL to the specified hash value, excluding the leading '#'.
   * @param {string} hash The hash to which to set the URL.
   */
  setHash(hash) {
    location.hash = hash;
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
              staveNote, scoreObject.noteGroup);
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
   * @return {!Array<!RenderedMeasure>} The rendered measures.
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

    // Set the total width for the SVG.
    const totalWidth = staveWidth * measures.length + clefWidth + SCROLL_OFFSET;
    this.scoreElem.style.width = `${totalWidth}px`;

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

      stave.setText(chord.namedChord.name, Modifier.Position.BELOW, {
          fill: suggestedMeasure ? SUGGESTED : NORMAL, // style options
          shift_y: 20,
      });

      // Add a clef and time signature to just the first bar.
      if (i == 0) stave.addClef(clef).addTimeSignature(timeSignature);

      // Connect to the rendering context and draw.
      stave.setContext(context).draw();

      // Apply accidentals automatically using the key signature.
      Accidental.applyAccidentals(renderedMeasure.vfVoices, keySignature);

      if (suggestedMeasure) {
        // Set styles for voices and beams in the suggested measure.
        for (const beam of renderedMeasure.beams) {
          beam.setStyle({fillStyle: SUGGESTED, strokeStyle: SUGGESTED});
        }
        for (const vfVoice of renderedMeasure.vfVoices) {
          vfVoice.setStyle({fillStyle: SUGGESTED, strokeStyle: SUGGESTED});
        }
      }

      // Format the voices to fit evenly within the stave.
      new Formatter().joinVoices(renderedMeasure.vfVoices).format(
          renderedMeasure.vfVoices, staveWidth);

      // Render the voices and beams.
      renderedMeasure.vfVoices.forEach((v) => v.draw(context, stave));
      renderedMeasure.beams.forEach((b) => b.setContext(context).draw());
    }

    return renderedMeasures;
  }

  /**
   * Renders the specified tap compose score entirely, including linking events
   * together and creating the cursor.
   * @param {!TapComposeScore} tapComposeScore The tap compose score to render.
   * @param {boolean} preserveSelected If true, preserves the selected note
   *     index and restores that selection by index.
   */
  renderTapComposeScore(tapComposeScore, preserveSelected) {
    const serialized = tapComposeScore.serialize();
    this.setHash(serialized.replace('#', '_'));

    /**
     * If preserve selected is true, the index to restore after creating new
     * interactive notes.
     * @type {number}
     */
    let selectedIndex;
    if (preserveSelected && tapComposeScore.selected) {
      selectedIndex = tapComposeScore.selected.index;
    }

    // Tear down any interactive notes that already exist and reset them.
    tapComposeScore.tearDown();
    tapComposeScore.interactiveNotes = [];
    tapComposeScore.selected = null;

    // Grab the entire history from the suggester.
    const outcomes = tapComposeScore.suggester.history;

    // Extract notes and chords from the outcomes.
    const bars = /** @type {!Array<!MelodicBar>} */ (
        outcomes.map((outcome) => outcome.value));
    const allNotes = new NoteGroup(bars.map((bar) => bar.noteGroup));
    const allChords = bars.map((bar) => bar.contextualChord);

    // Clear out the scheduler, shut off the instrument, and clear the score.
    tapComposeScore.scheduler.clear();
    tapComposeScore.instrument.allOff();
    this.clear();

    // Render the score.
    /** @type {!Array<!RenderedMeasure>} */
    const renderedMeasures = this.render(allNotes, allChords);

    const interactiveNotes = [];
    for (let i = 0; i < renderedMeasures.length; i++) {
      // Iterate through each measure and populate new interactive notes.
      const renderedMeasure = renderedMeasures[i];
      const suggestedMeasure = i == renderedMeasures.length - 1;

      for (const renderedNote of renderedMeasure.renderedNotes) {
        // Create a new interactive note with the appropriate index.
        const interactiveNote = new InteractiveNote(
            tapComposeScore, renderedNote,
            tapComposeScore.interactiveNotes.length);
        tapComposeScore.interactiveNotes.push(interactiveNote);

        // Add the event to the scheduler.
        const performanceGroup =
            interactiveNote.renderedNote.noteGroup.toPerformanceGroup(
              tapComposeScore.instrument);
          performanceGroup.addEvent(new FunctionEvent(() => {
            tapComposeScore.play(interactiveNote, true);
          }, interactiveNote.start));
          performanceGroup.addEvent(new FunctionEvent(() => {
            tapComposeScore.play(interactiveNote, false);
          }, interactiveNote.end));

        tapComposeScore.scheduler.add(performanceGroup);
        interactiveNote.suggested = suggestedMeasure;
      }
    }

    // Link up left and right notes.
    for (let i = 0; i < tapComposeScore.interactiveNotes.length; i++) {
      if (i != 0) {
        tapComposeScore.interactiveNotes[i].leftNote =
            tapComposeScore.interactiveNotes[i - 1];
      }
      if (i != tapComposeScore.interactiveNotes.length - 1) {
        tapComposeScore.interactiveNotes[i].rightNote =
            tapComposeScore.interactiveNotes[i + 1];
      }
      tapComposeScore.interactiveNotes[i].render();
    }

    // Add arpeggios.
    let arpeggioGroup = new NoteGroup();
    arpeggioGroup.name = 'arpeggio';
    // Make a callback function for every arpeggio change.
    const arpeggioChange = () => {
      tapComposeScore.allOff();
      tapComposeScore.scheduler.pause();

      // Remove the arpeggio group if present.
      tapComposeScore.scheduler.schedule.removeGroupByName('arpeggio');
      arpeggioGroup = new NoteGroup();
      arpeggioGroup.name = 'arpeggio';

      for (let i = 0; i < allChords.length; i++) {
        // Grab arpeggio information from the arpeggio app.
        const {arpeggio, beatsPerStep} =
            tapComposeScore.arpeggioApp.get('arpeggios')[
            tapComposeScore.arpeggioApp.get('styleIndex')];

        // Add the chord into the arpeggiator and then into the arpeggio group.
        const chord = allChords[i].namedChord.chord;
        const arpeggioSubgroup = new Arpeggiator(arpeggio, chord, beatsPerStep,
            i * 4, (i + 1) * 4).toNoteGroup().toPerformanceGroup(
            tapComposeScore.instrument);
        arpeggioSubgroup.setOffset(4 * i);
        arpeggioGroup.addGroup(arpeggioSubgroup);
      }
      tapComposeScore.scheduler.add(arpeggioGroup);

      // Initialize the scheduler.
      tapComposeScore.scheduler.initialize();
    }
    tapComposeScore.arpeggioApp.observe('styleIndex', arpeggioChange);

   // Create the cursor and link it to the beat callback.
   const cursor = preserveSelected ?
       // If preserving selected.
       new Cursor(tapComposeScore, tapComposeScore.interactiveNotes,
       tapComposeScore.interactiveNotes[selectedIndex].start) :
       // Otherwise.
       new Cursor(tapComposeScore, tapComposeScore.interactiveNotes);
  tapComposeScore.scheduler.setBeatOffsetCallback(
       (beatOffset) => cursor.setPosition(beatOffset));

    // Restore the selection if applicable.
    if (preserveSelected) {
      tapComposeScore.select(
          tapComposeScore.interactiveNotes[selectedIndex], true);
    }

    // Add event listeners.
    tapComposeScore.registerListener(
        tapComposeScore.scoreRenderer.scoreElem, 'click',
        tapComposeScore.click.bind(tapComposeScore));
    tapComposeScore.registerListener(
        tapComposeScore.scoreRenderer.scoreElem, 'touchstart',
        tapComposeScore.click.bind(tapComposeScore));

    tapComposeScore.registerListener(document.body, 'keydown',
        tapComposeScore.keydown.bind(tapComposeScore));
  }
}

/**
 * A mock score renderer class that does not produce any output.
 */
export class MockScoreRenderer extends ScoreRenderer {
  constructor() {
    super();
  }

  clear() {}

  setHash() {}

  toStaveNote() {}

  toRenderedMeasures() {}

  render() {}

  renderTapComposeScore() {}
}
