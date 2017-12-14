import {Chord, ChordTemplate, ContextualChord, ContextualChordTemplate, MelodicBar} from './chord.js';
import {Interval, Note} from './note.js';
import {NoteGroup, TimedNote} from './timing.js';

/**
 * Generates a random integer between the specified bounds.
 * @param {number} min The minimum bounds of the generated int, inclusive.
 * @param {number} max The maximum bounds of the generated int, exclusive.
 */
function randInt(min, max) {
  const bounds = max - min;
  return Math.floor(Math.random() * bounds) + min;
}

/**
 * Samples the array randomly and returns the result.
 * @param {!Array<T>} array An array to sample from.
 * @return {T} A sampled result from the array.
 * @template T
 */
function sample(array) {
  return array[Math.floor(Math.random() * array.length)];
}

/**
 * A single guess option, containing a value and a likelihood.
 */
export class Guess {
  /**
   * @param {*} value The value for the guess.
   * @param {number} likelihood The probability of the guess.
   */
  constructor(value, likelihood) {
    /**
     * The value for the guess.
     * @type {*}
     */
    this.value = value;
    /**
     * The probability that this guess gets added in.
     * @type {number}
     */
    this.likelihood = likelihood;
  }
}

/**
 * A sequence of guesses whose total probability is normalized to 1.
 */
export class Guesses {
  /**
   * @param {!Array<!Guess>} guesses The guesses that comprise this function.
   */
  constructor(guesses) {
    /** @type {!Array<!Guess>} */
    this.guesses = guesses;
    /**
     * The total probability of all the guesses.
     * @type {number}
     */
    this.totalProb = 0;
    /**
     * The most probable outcome.
     * @type {?Guess}
     */
    this.mostLikely = null;

    // Calculate the total probability and the most likely guess.
    for (const guess of this.guesses) {
      this.totalProb += guess.likelihood;
      if (this.mostLikely == null ||
          guess.likelihood > this.mostLikely.likelihood) {
        // Update the most likely guess.
        this.mostLikely = guess;
      }
    }
  }

  /**
   * Samples the guesses weighted by their probabilities.
   * @param {?number=} randomValue A random value between 0 (inclusive) and 1
   *     (exclusive). Leave this unspecified to generate the random value that
   *     will be used to sample the guesses.
   * @return {!Outcome} The random outcome.
   * @throws {Error} Should only happen if the random value is provided and is
   *     greater than or equal to 1.
   */
  sample(randomValue = null) {
    if (randomValue == null) randomValue = random();
    // Scale the random value.
    randomValue *= this.totalProb;
    for (const guess of this.guesses) {
      // If the guess is within the right range, return it.
      if (randomValue < guess.likelihood) return new Outcome(this, guess);
      // Otherwise, make the value smaller and try again.
      randomValue -= guess.likelihood;
    }
    // The guess should have been returned by now.
    throw new Error('This should never happen.');
  }
}

/**
 * The result of sampling through Guesses.
 */
export class Outcome {
  /**
   * @param {!Guesses} guesses The guesses up for consideration.
   * @param {!Guess} guess The guess that was ultimately chosen.
   */
  constructor(guesses, guess) {
    /** @type {!Guesses} */
    this.guesses = guesses;
    /** @type {!Guess} */
    this.guess = guess;
    /**
     * The guess's value.
     * @type {*}
     */
    this.value = this.guess.value;
  }

  /**
   * Returns an outcome with only one possibility having 100%.
   * @param {T} value
   * @template T
   */
  static fixed(value) {
    const guess = new Guess(value, 1.0);
    return new Outcome([guess], guess);
  }
}

/**
 * A generic base class that manages a history and uses it to make guesses that
 * get added to the history.
 */
export class Suggester {
  constructor() {
    /**
     * The history of guesses that have been suggested
     * @type {!Array<!Outcome>}
     */
    this.history = [];

    /**
     * The index of accepted history. Any history items after this index are
     * suggested and have not yet been finalized.
     * @type {number}
     */
    this.acceptIndex = 0;
  }

  /**
   * Adds the specified outcome to the history and returns it.
   * @param {!Outcome} outcome The specified outcome.
   * @return {!Outcome} The specified outcome.
   */
  addToHistory_(outcome) {
    this.history.push(outcome);
    return outcome;
  }

  /**
   * Clears history items after the accept index.
   */
  clearSuggestion() {
    this.history.length = this.acceptIndex;
  }

  /**
   * A method that is meant to be overridden that uses the history to suggest
   * something new in the form of an outcome.
   * @return {!Outcome}
   */
  suggestInternal_() {
    throw new Error('Override');
  }

  /**
   * Suggests a new item and appends it to the history without incrementing the
   * accept index.
   * @param {boolean=} append If true, do not clear the suggestions before
   *     suggesting something new. This will cause successive calls to suggest
   *     to collect into multiple suggestions.
   * @return {!Outcome}
   */
  suggest(append = false) {
    if (!append) this.clearSuggestion();
    return this.addToHistory_(this.suggestInternal_());
  }

  /**
   * Accepts the current suggestions by setting the accept index to the end of
   * the history.
   */
  accept() {
    this.acceptIndex = this.history.length;
  }
}

/**
 * A basic suggester for notes that relies on a base and set of intervals. All
 * suggestions are treated with even probability.
 */
export class BasicNoteSuggester extends Suggester {
  /**
   * @param {!Note} baseNote The base note.
   * @param {!ChordTemplate} initialScaleTemplate The initial template of
   *     intervals to jump to off of the base note.
   * @param {number} minSuggest The minimum suggestion, as an index into the
   *     interval template. If the index is out of the range of the intervals,
   *     it wraps around and shifts an octave in the direction its out of range
   *     (negative = octave below).
   * @param {number} maxSuggest The maximum suggestion, as an index into the
   *     interval template. If the index is out of the range of the intervals,
   *     it wraps around and shifts an octave in the direction its out of range
   *     (negative = octave below).
   */
  constructor(baseNote, initialScaleTemplate, minSuggest = 0,
      maxSuggest = null) {
    super();

    /** @type {!Note} */
    this.baseNote = baseNote;
    /**
     * The current scale representing the notes this suggester will produce.
     * @type {!Chord}
     */
    this.scale = initialScaleTemplate.apply(this.baseNote);
    /** @type {number} */
    this.minSuggest = minSuggest;
    /** @type {number} */
    this.maxSuggest = maxSuggest != null ? maxSuggest :
        initialScaleTemplate.length;
  }

  /**
   * Sets the scale to something else, updating the notes that can be suggested.
   * @param {!Chord} scale A new template of notes to jump to off of the base
   *     note.
   */
  setScale(scale) {
    this.scale = scale;
  }

  suggestInternal_() {
    // Grab a random index and return the appropriate interval and octave shift
    // by accessing it within the chord representing the scale.
    return Outcome.fixed(
        this.scale.getN(randInt(this.minSuggest, this.maxSuggest)));
  }
}

/**
 * A basic suggester for contextual chords that relies on a base and set of
 * contextual chord templates. All suggestions are treated with equal
 * probability.
 */
export class BasicChordSuggester extends Suggester {
  /**
   * @param {!Note} baseNote The base note of the chord suggester.
   * @param {!Array<!ContextualChordTemplate>} contextualChordTemplates The
   *     contextual chords that make up the possible chords to use.
   */
  constructor(baseNote, contextualChordTemplates) {
    super();

    /** @type {!Note} */
    this.baseNote = baseNote;
    /**
     * Every contextual chord, after applying the template to the base note.
     * @type {!Array<!ContextualChord>}
     */
    this.contextualChords = contextualChordTemplates.map((template) => {
      return template.apply(this.baseNote.jump(template.interval));
    });
  }

  suggestInternal_() {
    return Outcome.fixed(sample(this.contextualChords));
  }
}

/**
 * A basic suggester for rhythmic patterns that total a bar in duration.
 */
export class BasicRhythmSuggester extends Suggester {
  /**
   * @param {!Array<!Array<number>>} rhythmTemplates A list of rhythm patterns,
   *     where each rhythm pattern is a list of durations that sum to the same
   *     bar length (in 4/4 time, the bar length would be 4).
   */
  constructor(rhythmTemplates) {
    super();
    /** @type {!Array<!Array<number>>} */
    this.rhythmTemplates = rhythmTemplates;
  }

  suggestInternal_() {
    return Outcome.fixed(sample(this.rhythmTemplates));
  }
}

/**
 * A basic suggester for a melody line and a chord corresponding to one bar of
 * music.
 */
export class BasicMelodyBarSuggester extends Suggester {
  /**
   * @param {!Note} baseNote The base note of the melody bar suggester.
   * @param {!Array<!ContextualChordTemplate>} contextualChordTemplates The
   *     contextual chords that make up the possible chords to use.
   * @param {!Array<!Array<number>>} rhythmTemplates A list of rhythm patterns,
   *     where each rhythm pattern is a list of durations that sum to the same
   *     bar length (in 4/4 time, the bar length would be 4).
   * @param {number} minSuggest The minimum suggestion, as an index into the
   *     interval template. If the index is out of the range of the intervals,
   *     it wraps around and shifts an octave in the direction its out of range
   *     (negative = octave below).
   * @param {number} maxSuggest The maximum suggestion, as an index into the
   *     interval template. If the index is out of the range of the intervals,
   *     it wraps around and shifts an octave in the direction its out of range
   *     (negative = octave below).
   */
  constructor(baseNote, contextualChordTemplates, rhythmTemplates,
        minSuggest = 0, maxSuggest = null) {
    super();

    // Create chord, note, and rhythm suggesters that will work harmoniously
    // together.
    /** @type {!BasicChordSuggester} */
    this.chordSuggester = new BasicChordSuggester(
        baseNote, contextualChordTemplates);
    /** @type {!BasicNoteSuggester} */
    this.noteSuggester = new BasicNoteSuggester(
        baseNote, contextualChordTemplates[0].scale, minSuggest, maxSuggest);
    /** @type {!BasicRhythmSuggester} */
    this.rhythmSuggester = new BasicRhythmSuggester(rhythmTemplates);

    /**
     * The current beat that has been accepted. This is advanced when
     * suggestions are accepted.
     * @type {number}
     */
    this.currentBeat = 0;
    /**
     * The current end beat of the suggestion. This is set when suggesting.
     */
    this.currentEndBeat = 0;
  }

  suggestInternal_() {
    const chord =
        /** @type {!ContextualChord} */ (this.chordSuggester.suggest().value);
    const rhythm = this.rhythmSuggester.suggest().value;
    // Clear the note suggester since its suggestions are being appended below
    // rather than replaced (default behavior).
    this.noteSuggester.clearSuggestion();
    // Set the scale of the note suggester to the chord's defined scale.
    this.noteSuggester.setScale(chord.scale);
    const notes = new NoteGroup();
    let start = this.currentBeat;
    for (const duration of rhythm) {
      notes.addEvent(new TimedNote(
          this.noteSuggester.suggest(true).value, start, start + duration));
      start += duration;
    }
    // Set the current end beat.
    this.currentEndBeat = start;

    return Outcome.fixed(new MelodicBar(chord, notes));
  }

  accept() {
    super.accept();

    // Accept the chord, note, and rhythm suggesters.
    this.chordSuggester.accept();
    this.rhythmSuggester.accept();
    this.noteSuggester.accept();

    // Advance the current beat.
    this.currentBeat = this.currentEndBeat;
  }
}
