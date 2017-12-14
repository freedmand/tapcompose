import {BounceSynth, InstrumentManager, SawOscillator, SineFade} from './instrument.js';
import {Chord, ChordTemplate} from './chord';
import {Event, Group, Scheduler, TimedNote, Timing} from './timing.js';
import {Interval, Note} from './note.js';
import {durationTemplates, majorContext, majorScale, minorContext} from './western.js';

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
    suggester);

// const score = new Score().render(scheduler, polyInstrument, scoreElem, arpeggio, beatsPerStep);
score.render(scheduler, polyInstrument, scoreElem, app);
