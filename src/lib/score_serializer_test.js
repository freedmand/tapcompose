import {BounceSynth, InstrumentManager} from './instrument.js';
import {Scheduler, Timing} from './timing.js';
import {durationTemplates, extendedContext, westernChordDictionary} from './western.js';

import {BasicMelodyBarSuggester} from './suggest.js';
import {MockAudioContext} from './mock_audio_context.js';
import {MockScoreRenderer} from './render.js';
import {MockSvelteInterface} from './mock_svelte_interface.js';
import {Note} from './note.js';
import {ScoreSerializerV0} from './score_serializer.js';
import {TapComposeScore} from './score.js';
import {scoreSerializerDictionary} from './score_serializer.js';
import test from 'ava';

/**
 * Returns an initialized tap compose score with default settings.
 * @return {!TapComposeScore}
 */
function initTapComposeScore() {
  // Mock the arpeggiation app and audio context.
  const mockArpeggioApp = new MockSvelteInterface;
  const mockAudioContext = new MockAudioContext();

  const polyInstrument =
      new InstrumentManager(mockAudioContext, BounceSynth, 6);

  // Set up a timing system and scheduler.
  const timing = new Timing(120);
  const scheduler = new Scheduler(timing);

  const mockScoreRenderer = new MockScoreRenderer();

  const suggester = new BasicMelodyBarSuggester(new Note('A4'), extendedContext,
      durationTemplates, -1);

  const score = new TapComposeScore(mockScoreRenderer, scheduler,
      polyInstrument, mockArpeggioApp, suggester, westernChordDictionary,
      scoreSerializerDictionary);
  return score;
}

test('Serialization single bar', (t) => {
  const score = `v0|E4-m~D4-0-1|A4-1-1.5|C4-1.5-2|D4-2-3|B4-3-4`;
  const tapComposeScore = initTapComposeScore();
  tapComposeScore.deserialize(score);
  t.is(tapComposeScore.serialize(), score);
});

test('Serialization two bars', (t) => {
  const score = `v0|D4-m7|E4-~A4-0-1|G3-1-1.5|F4-1.5-2|D4-2-3|E4-3-4|G_4-4-5|` +
      `B4-5-5.5|G_4-5.5-6|A4-6-7|G_4-7-8`;
  const tapComposeScore = initTapComposeScore();
  tapComposeScore.deserialize(score);
  t.is(tapComposeScore.serialize(), score);
});

test('Serialization four bars', (t) => {
  const score = `v0|E4-7|F4-maj7|F4-maj7|A4-7~E4-0-1|E4-1-2|B4-2-2.5|` +
      `E4-2.5-3|E4-3-3.5|E4-3.5-4|B4-4-5|A4-5-6|A4-6-7|G4-7-8|D4-8-9|` +
      `G3-9-9.5|D4-9.5-10|A4-10-11|G3-11-12|F4-12-12.5|G3-12.5-13|` +
      `B4-13-13.5|C_4-13.5-14|G4-14-15|F4-15-16`;
  const tapComposeScore = initTapComposeScore();
  tapComposeScore.deserialize(score);
  t.is(tapComposeScore.serialize(), score);
});
