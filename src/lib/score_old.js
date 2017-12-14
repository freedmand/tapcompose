import {BasicMelodyBarSuggester, BasicNoteSuggester} from './suggest.js';
import {Chord, ChordTemplate, MelodicBar} from './chord.js';
import {FunctionEvent, Group, Scheduler, TimedNote, Timer} from './timing.js';
import {Interval, Note} from './note.js';
import {durationTemplates, majorContext, majorScale} from './western.js';

import {Accidental} from '../third_party/vexflow/accidental.js';
import {Arpeggiator} from './arpeggiator.js';
import {Beam} from '../third_party/vexflow/beam.js';
import {Formatter} from '../third_party/vexflow/formatter.js';
import {Modifier} from '../third_party/vexflow/modifier.js';
import {Renderer} from '../third_party/vexflow/renderer.js';
// VexFlow imports
import {Stave} from '../third_party/vexflow/stave.js';
import {StaveNote} from '../third_party/vexflow/stavenote.js';
import {Voice} from '../third_party/vexflow/voice.js';

function sample(array) {
  return array[Math.floor(Math.random() * array.length)];
}

const PLAYING = '#efa303';
const NORMAL = '#000';
const SELECTED = '#3f67ef';
const SUGGESTED = '#ccc';

/**
 * RenderedNote is a bridge between a note in notation form and the note in the
 * scheduling system.
 */
class RenderedNote {
  /**
   *
   * @param {!Array<!Note>} timedNotes The note, or notes, that this stave note
   *     represents. If a chord, multiple notes will be used.
   * @param {!StaveNote} staveNote The Vexflow notation to represent this note.
   * @param {?RenderedNote} hopLeft The note to the left of this one.
   * @param {?RenderedNote} hopRight The note to the right of this one.
   */
  constructor(timedNotes, staveNote, hopLeft = null, hopRight = null) {
    /** @type {!Array<!Note>} */
    this.timedNotes = timedNotes;
    /** @type {!StaveNote} */
    this.staveNote = staveNote;
    /** @type {?RenderedNote} */
    this.hopLeft = hopLeft;
    /** @type {?RenderedNote} */
    this.hopRight = hopRight;

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
    this.highlighted = false;

    /**
     * The playback function to run that plays the corresponding sound when the
     * note is clicked on.
     * @type {?Function}
     */
    this.clickPlayback = null;
    /**
     * The scheduler that is in charge of playing this note.
     * @type {?Scheduler}
     */
    this.scheduler = null;
    /**
     * Any beams associated with the rendering of this note.
     * @type {!Array<!Beam>}
     */
    this.beams = [];
  }

  setClickPlayback(group, timing, instrument) {
    this.clickPlayback = () => {
      instrument.allOff();
      if (window['clickplaybackTimers'] == null) {
        window['clickplaybackTimers'] = [];
      } else {
        for (const timer of window['clickplaybackTimers']) {
          timer.clearTimeout();
        }
        window['clickplaybackTimers'] = [];
      }
      for (const event of group.iterate()) {
        const timer = new Timer(event.fn, event.beats);
        timer.setTimeout(timing.getDuration(event.beats));
        window['clickplaybackTimers'].push(timer);
      }
    };
  }

  elem() {
    return this.staveNote.attrs.el;
  }

  linkListeners(allStaveNotes, scheduler, instrument, score) {
    const start = this.timedNotes[0].start;
    const el = this.staveNote.attrs.el;
    this.scheduler = scheduler;
    el.style.cursor = 'pointer';
    el.addEventListener('mouseover', () => this.highlight());
    el.addEventListener('mouseout', () => this.unhighlight());
    el.addEventListener('click', (e) => {
      allStaveNotes.forEach((staveNote) => {
        if (staveNote != this) staveNote.unselect(score);
      });
      this.select(score);
      if (!scheduler.playing && this.clickPlayback !== null) {
        this.clickPlayback();
      }
      // Handle moving the playhead.
      if (scheduler.playing) {
        scheduler.pause();
        allStaveNotes.forEach((staveNote) => staveNote.showNormal());
        instrument.allOff();
        scheduler.beatOffset = start;
        scheduler.play();
      } else {
        scheduler.beatOffset = start;
      }
      e.stopPropagation();
    });
  }

  showNormal() {
    this.playing = false;
    this.render();
  }

  showPlaying() {
    this.playing = true;
    this.render();
  }

  showSuggested() {
    this.suggested = true;
    this.render();
  }

  select(score, playback = false) {
    score.selected = this;
    this.selected = true;
    if (playback && !this.scheduler.playing && this.clickPlayback !== null) {
      this.clickPlayback();
    }
    this.render();
  }

  unselect(score) {
    score.selected = null;
    this.selected = false;
    this.render();
  }

  selectLeft(score) {
    if (this.hopLeft != null) {
      this.unselect(score);
      this.hopLeft.select(score, true);
    }
  }

  selectRight(score) {
    if (this.hopRight != null) {
      this.unselect(score);
      this.hopRight.select(score, true);
    }
  }

  highlight() {
    this.highlighted = true;
    this.render();
  }

  unhighlight() {
    this.highlighted = false;
    this.render();
  }

  render() {
    if (this.selected) {
      this.fill(SELECTED);
      this.opacity(1);
    } else {
      if (this.playing) {
        this.fill(PLAYING);
      } else {
        if (this.suggested) {
          this.fill(SUGGESTED, true);
        } else {
          this.fill(NORMAL);
        }
      }
      if (this.highlighted) {
        this.opacity(0.65);
      } else {
        this.opacity(1);
      }
    }
  }

  fill(color, includeBeams = false) {
    const el = this.elem();
    Array.from(el.getElementsByTagName('*')).forEach((subEl) => {
      if (subEl.getAttribute('fill')) subEl.setAttribute('fill', color);
      if (subEl.getAttribute('stroke')) subEl.setAttribute('stroke', color);
    });
    if (includeBeams) {
      for (const beam of this.beams) {
        beam.setStyle({fillStyle: color, strokeStyle: color});
      }
    }
  }

  opacity(opacity) {
    this.elem().setAttribute('opacity', opacity);
  }
}

class VFMock {
  constructor(duration) {
    this.duration = Score.vfDuration(duration);
    this.staveNote = null;
  }

  toString() {
    return '';
  }
}

class Rest extends VFMock {
  constructor(duration) {
    super(duration);
  }

  toString() {
    return `[r ${this.duration}]`;
  }

  vf(clef = 'treble') {
    const staveNote = new StaveNote({
      clef,
      keys: ['b/4'],
      duration: `${this.duration}r`,
    });
    this.staveNote = new RenderedNote(null, staveNote);
    return staveNote;
  }
}

class Notes extends VFMock {
  constructor(timedNotes, duration) {
    super(duration);
    this.timedNotes = timedNotes;
    this.noteNames =
        timedNotes.map((timedNote) => timedNote.note.vexflowNoteName());
    this.staveNote = null;
  }

  toString() {
    return `[${this.noteNames.join(',')} ${this.duration}]`;
  }

  vf(clef = 'treble') {
    const staveNote = new StaveNote({
      clef,
      keys: this.noteNames,
      duration: this.duration,
    });
    // for (let i = 0; i < this.timedNotes; i++) {
    //   const accidentals = this.timedNotes[i].note.accidentals;
    //   if (accidentals != 0) {
    //     staveNote.addAccidental(i, new Accidental(accidentals < 0 ? 'b'.repeat(-accidentals) : '#'.repeat(accidentals)));
    //   }
    // }
    this.staveNote = new RenderedNote(this.timedNotes, staveNote);
    return staveNote;
  }
}




export class Score {
  /**
   * @param {!NoteGroup} noteGroup
   * @param todo
   */
  constructor(noteGroup, chords = null) {
    /**
     * The last beat of the score.
     * @type {number}
     */
    this.endBeat = 0;

    for (const timedNote of noteGroup.iterate()) {
      // Set the new end beat, if applicable.
      if (timedNote.end > this.endBeat) {
        this.endBeat = timedNote.end;
      }
    }

    this.suggester = new BasicMelodyBarSuggester(
        new Note('C4'), majorContext, durationTemplates, -1);
    this.noteGroup = noteGroup;
    this.chords = chords !== null ? chords : [];

    /** @type {?MelodicBar} */
    this.suggestedBar = null;
    this.generateSuggestions();

    const allNotes = new NoteGroup();
    allNotes.addGroup(noteGroup);
    allNotes.addGroup(this.suggestedBar.noteGroup);

    this.selected = null;
    const noteMap = new Map();
    for (const timedNote of allNotes.iterate()) {
      // Iterate through each timed note.
      const timeKey = timedNote.timeKey();
      if (noteMap.has(timeKey)) {
        // If the timestamp is already a key in the map, append the note to the
        // entry.
        noteMap.get(timeKey).push(timedNote);
      } else {
        // Otherwise, create an entry in the timemap at the timestamp with the
        // timedNote as the first entry.
        noteMap.set(timeKey, [timedNote]);
      }
    }

    /**
     * Parses the specified time key into an array of start and end times.
     * @param {string} timeKey The time key to parse.
     * @return {!Array<number>} An array containing the start and end times.
     */
    const parseTimeKey =
        (timeKey) => timeKey.split(',').map((x) => parseInt(x));

    // Create a voices array initialized with the first notes.
    const voices = [];
    for (const [key, entries] of noteMap.entries()) {
      // Iterate through each noteMap entry.
      const timeKey = parseTimeKey(key);
      const [start1, end1] = timeKey;
      let foundVoice = false; // only true if entry belongs to a voice.
      for (const {intervals, timedNotes, groupedNotes} of voices) {
        // Iterate through each voice.
        let overlapping = false;
        for (const [start2, end2] of intervals) {
          // Check for overlap with any of the intervals.
          if (end1 > start2 && start1 < end2) {
            overlapping = true;
            break;
          }
        }
        // Skip if it overlaps the voice's intervals.
        if (overlapping) continue;
        // Otherwise, assimilate into the voice.
        const group = [];
        for (const timedNote of entries) {
          timedNotes.push(timedNote);
          group.push(timedNote);
        }
        groupedNotes.push(group);
        intervals.push(timeKey);
        foundVoice = true;
        break;
      }
      if (foundVoice) continue;
      // If the entry has not been assimilated into a voice, create a new voice.
      voices.push({
        intervals: [timeKey],
        timedNotes: entries,
        groupedNotes: [entries.slice()],
      });
    }

    /**
     * The voices for this sequence of timed notes.
     * @type {!Array<!Array<!TimedNote>>}
     */
    this.voices = voices.map(({intervals, timedNotes}) => timedNotes);

    /**
     * The voices with interval information.
     * TODO(freedmand): Fill out type.
     */
    this.voiceIntervals = voices;
  }

  generateSuggestions() {
    this.suggestedBar = this.suggester.suggest().value;
    this.suggestedBar.noteGroup.setOffset(this.suggester.acceptIndex * 4);
  }

  static vfDuration(duration) {
    // TODO(freedmand): Come up with solution that covers errors and fractions.
    return (4 / duration).toFixed();
  }

  toProperVoices(numBeats = 4) {
    const measures = [];
    const voices = [];
    const addToMeasure = (measureNum, voice) => {
      if (measureNum > measures.length - 1) {
        measures.push([]);
      }
      measures[measureNum].push(voice);
    };
    for (const {groupedNotes} of this.voiceIntervals) {
      let measureEnd = numBeats;
      let voice = [];
      let currentBeat = 0;
      let currentMeasure = 0;
      // Sort the intervals.
      groupedNotes.sort((timedNotes1, timedNotes2) => {
        const start1 = timedNotes1[0].start;
        const start2 = timedNotes2[0].start;
        if (start1 < start2) {
          return -1;
        } else if (start1 > start2) {
          return 1;
        } else return 0;
      });
      for (const timedNotes of groupedNotes) {
        const start = timedNotes[0].start;
        const end = timedNotes[0].end;
        if (start > currentBeat && start >= measureEnd) {
          // Insert a rest to fill the remainder of the measure.
          voice.push(new Rest(measureEnd - currentBeat));
          addToMeasure(currentMeasure, voice);
          voice = [];
          currentBeat = measureEnd;
          currentMeasure++;
          measureEnd += numBeats;
        }
        if (start > currentBeat) {
          // Need to insert a rest to fill until the current beat.
          voice.push(new Rest(start - currentBeat));
        }
        if (start >= measureEnd) {
          // Need to start a new bar.
          addToMeasure(currentMeasure, voice);
          voice = [];
          currentMeasure++;
          measureEnd += numBeats;
          // TODO(freedmand): Accommodate notes spanning measures.
        }
        voice.push(new Notes(timedNotes, end - start));
        currentBeat = end;
      }
      if (measureEnd > currentBeat) {
        // Need to insert a rest to fill until the end of the score.
        voice.push(new Rest(measureEnd - currentBeat));
      }
      if (voice.length != 0) {
        addToMeasure(currentMeasure, voice);
      }
    }
    return measures;
  }

  toProperStrings() {
    return this.toProperVoices().map(
        (properVoices) => properVoices.map(
        (properVoice) => properVoice.map((x) => x.toString()).join('')));
  }

  toVexflowVoices(numBeats = 4) {
    const measures = this.toProperVoices(numBeats);
    const result = [];
    const mappings = [];
    for (const voices of measures) {
      const vfVoices = [];
      let beams = [];
      for (const vfMocks of voices) {
        const voice = [];
        for (const vfMock of vfMocks) {
          vfMock.vf();
          voice.push(vfMock.staveNote.staveNote);
          mappings.push([vfMock.timedNotes, vfMock.staveNote]);
        }
        const vfVoice = new Voice({num_beats: 4, beat_value: 4});
        beams = beams.concat(Beam.generateBeams(voice));
        vfMocks.forEach((vfMock) => {
          vfMock.staveNote.beams = beams;
        });

        vfVoice.addTickables(voice);
        vfVoices.push(vfVoice);
      }
      result.push([vfVoices, beams]);
    }
    return {
      measures: result,
      mappings,
    };
  }

  render(scheduler, instrument, scoreElem, app, playFromSuggested = false) {
    const currentStyleIndex = app.get('styleIndex');
    app.observe('styleIndex', (styleIndex) => {
      if (styleIndex == currentStyleIndex) return;
      this.render(scheduler, instrument, scoreElem, app, playFromSuggested);
    });

    // Clear out the scheduler and shut off the instrument.
    scheduler.clear();
    instrument.allOff();
    // Remove any extant listeners.
    if (window['removeListeners'] != null) {
      for (const [elem, args] of window['removeListeners']) {
        elem.removeEventListener(...args);
      }
      window['removeListeners'] = null;
    }

    // Clear out the element.
    while (scoreElem.firstChild) scoreElem.removeChild(scoreElem.firstChild);

    const renderer =
        new Renderer(scoreElem, Renderer.Backends.SVG);

    // Get a drawing context.
    const context = renderer.getContext();

    const {measures, mappings} = this.toVexflowVoices();
    // Size the svg.
    const STAVE_WIDTH = 250;
    const CLEF_WIDTH = 60;
    const STAVE_OFFSET = 20;
    renderer.resize(
        STAVE_OFFSET + CLEF_WIDTH +  measures.length * STAVE_WIDTH, 300);

    for (let i = 0; i < measures.length; i++) {
      const suggestedMeasure = i == measures.length - 1;

      const [voices, beams] = measures[i];
      const {chord, name: chordName} = this.chords.concat(this.chordSuggestion)[i];

      // Create a stave at position 10, 40 of width 400 on the canvas.
      const stave = new Stave(
          STAVE_OFFSET + i * STAVE_WIDTH + (i == 0 ? 0 : CLEF_WIDTH), 40,
          STAVE_WIDTH + (i == 0 ? CLEF_WIDTH : 0));
      stave.setText(chordName, Modifier.Position.BELOW, {fill: suggestedMeasure ? SUGGESTED : NORMAL});

      // Add a clef and time signature to just the first bar.
      if (i == 0) stave.addClef('treble').addTimeSignature('4/4');

      // Connect it to the rendering context and draw!
      stave.setContext(context).draw();

      if (i == measures.length - 1) {
        for (const beam of beams) {
          beam.setStyle({fillStyle: SUGGESTED, strokeStyle: SUGGESTED});
        }
        for (const voice of voices) {
          voice.setStyle({fillStyle: SUGGESTED, strokeStyle: SUGGESTED});
        }
      }

      Accidental.applyAccidentals(voices, 'C');

      const formatter =
          new Formatter().joinVoices(voices).format(
          voices, STAVE_WIDTH);

      // Render voice
      voices.forEach((v) => v.draw(context, stave));
      beams.forEach((b) => b.setContext(context).draw());
    }

    const allStaveNotes = mappings.map(([_, staveNote]) => staveNote);
    for (let i = 0; i < mappings.length; i++) {
      const [timedNotes, staveNote] = mappings[i];
      if (i != 0) {
        staveNote.hopLeft = mappings[i - 1][1];
      }
      if (i != mappings.length - 1) {
        staveNote.hopRight = mappings[i + 1][1];
      }
      for (const timedNote of timedNotes) {
        if (score.selected != null) {
          if (score.selected.timedNotes.includes(timedNote)) {
            score.selected = staveNote;
            staveNote.select(score);
            break;
          }
        }
      }
      for (const timedNote of timedNotes) {
        if (timedNote.start >= this.endBeat) {
          staveNote.showSuggested();
        }
      }
      staveNote.linkListeners(allStaveNotes, scheduler, instrument, score);
      scheduler.addTimedNotes(timedNotes, staveNote, instrument);
    }
    document.body.addEventListener('click', () => {
      allStaveNotes.forEach((staveNote) => staveNote.unselect(score));
    });
    // Add arpeggios.
    const allChords = this.chords.concat(this.chordSuggestion);
    for (let i = 0; i < allChords.length; i++) {
      const contextualChord = allChords[i];
      const name = contextualChord.name;
      const chord = contextualChord.chord;
      const {arpeggio, beatsPerStep} = app.get('arpeggios')[app.get('styleIndex')];
      scheduler.add(new Arpeggiator(arpeggio, chord, beatsPerStep, i * 4, (i + 1) * 4).toNoteGroup().toPerformanceGroup(instrument), 4 * i);
    }

    scheduler.initialize();
    if (playFromSuggested) {
      instrument.allOff();
      scheduler.beatOffset = this.chords.length * 4;
      scheduler.play();
    }

    const keyDownFn = (e) => {
      let shiftKey = false;
      if (window.event) {
        shiftKey = !!window.event.shiftKey; // typecast to boolean
      } else {
        shiftKey = !!e.shiftKey;
      }

      if (e.code == 'Space') {
        if (!scheduler.playing) {
          instrument.allOff();
          scheduler.play();
        } else {
          scheduler.pause();
          allStaveNotes.forEach((staveNote) => staveNote.showNormal());
          setTimeout(() => instrument.allOff(), 300);
        }
      } else if (e.code == 'ArrowDown' || e.code == 'ArrowUp') {
        const shift = e.code == 'ArrowDown' ? -1 : 1;
        if (score.selected != null) {
          for (const timedNote of score.selected.timedNotes) {
            timedNote.note = shiftKey ? timedNote.note.accidentalShift(shift, 2) : timedNote.note.baseShift(shift);
          }

          score.selected.clickPlayback();
          this.render(scheduler, instrument, scoreElem, app);
          return;
        }
      } else if (e.code == 'ArrowLeft') {
        if (score.selected != null) score.selected.selectLeft(score);
      } else if (e.code == 'ArrowRight') {
        if (shiftKey) {
          if (score.selected != null) {
            for (const timedNote of score.selected.timedNotes) {
              timedNote.end += 1;
            }
            // score.selected.clickPlayback();
            this.render(scheduler, instrument, scoreElem, app);
            return;
          }
        } else {
          if (score.selected != null) {
            score.selected.selectRight(score);
          }
        }
      } else if (e.code == 'Enter') {
        new Score(this.timedNotes, this.chords).render(scheduler, instrument, scoreElem, app, true);
      } else if (e.code == 'KeyA') {
        new Score(this.timedNotes.concat(this.suggestions), this.chords.concat(this.chordSuggestion)).render(scheduler, instrument, scoreElem, app, true);
      } else if (e.code == 'KeyR') {
        instrument.allOff();
        scheduler.beatOffset = 0;
        scheduler.play();
      } else if (e.code == 'KeyP') {
        if (score.selected != null) {
          instrument.allOff();
          scheduler.beatOffset = score.selected.timedNotes[0].start;
          scheduler.play();
        } else {
          instrument.allOff();
          scheduler.beatOffset = 0;
          scheduler.play();
        }
      }
    };
    document.body.addEventListener('keydown', keyDownFn);
    window['removeListeners'] = [
      [document.body, ['keydown', keyDownFn]],
    ];
  }
}
