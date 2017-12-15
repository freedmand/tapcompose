import {BounceSynth, InstrumentManager, SawOscillator, SineFade} from './instrument.js';
import {Chord, ChordTemplate} from './chord';
import {Event, Group, Scheduler, TimedNote, Timing} from './timing.js';
import {Interval, Note} from './note.js';
import {durationTemplates, extendedContext, westernChordDictionary} from './western.js';

import {Arpeggiator} from './arpeggiator.js';
import ArpeggiatorInterface from '../interface/arpeggiator.html';
import {BasicMelodyBarSuggester} from './suggest.js';
import {CompatibleAudioContext} from './compatibility.js';
import {ScoreRenderer} from './render.js';
import {TapComposeScore} from './score.js';

const arpeggioApp = new ArpeggiatorInterface({
  target: document.getElementById('arpeggiator'),
});

// Set up an audio context and instrument.
new CompatibleAudioContext((audioContext) => {
  const polyInstrument =
      new InstrumentManager(audioContext, BounceSynth, 6);

  // Set up a timing system and scheduler.
  const timing = new Timing(120);
  const scheduler = new Scheduler(timing);

  const scoreElem = document.getElementById('score');

  const scoreRenderer = new ScoreRenderer(scoreElem);

  const suggester = new BasicMelodyBarSuggester(new Note('A4'), extendedContext,
      durationTemplates, -1);

  let serializedScore = null;
  if (location.hash.trim() != '') {
    serializedScore = location.hash.trim().replace('#', '').replace('_', '#');
  }

  const score = new TapComposeScore(scoreRenderer, scheduler, polyInstrument,
      arpeggioApp, suggester, westernChordDictionary, serializedScore);

  score.render();
});
