import {BounceSynth, InstrumentManager, SawOscillator, SineFade} from './instrument.js';
import {Chord, ChordTemplate} from './chord';
import {Event, Group, Scheduler, TimedNote, Timing} from './timing.js';
import {Interval, Note} from './note.js';
import {durationTemplates, majorContext, majorScale, minorContext, westernChordDictionary} from './western.js';

import {Arpeggiator} from './arpeggiator.js';
import ArpeggiatorInterface from '../interface/arpeggiator.html';
import {BasicMelodyBarSuggester} from './suggest.js';
import {ScoreRenderer} from './render.js';
import {TapComposeScore} from './score.js';

const app = new ArpeggiatorInterface({
  target: document.getElementById('arpeggiator'),
});

// Set up an audio context and instrument.
const audioContext = new AudioContext();
const polyInstrument =
    new InstrumentManager(audioContext, BounceSynth, 6);

// Set up a timing system and scheduler.
const timing = new Timing(120);
const scheduler = new Scheduler(timing);

const scoreElem = document.getElementById('score');

const scoreRenderer = new ScoreRenderer(scoreElem);

const suggester = new BasicMelodyBarSuggester(new Note('G3'), majorContext,
    durationTemplates, -1);

const score = new TapComposeScore(scoreRenderer, scheduler, polyInstrument,
    suggester, westernChordDictionary, 'C2maj7,F2m7-E4,0,1|E4,1,2|G3,2,3|G3,3,4|A4,3,4|Ab4,4,4.5|Ab4,4.5,5|G3,5,7|A4,7,8');

// const score = new Score().render(scheduler, polyInstrument, scoreElem, arpeggio, beatsPerStep);
score.render();
