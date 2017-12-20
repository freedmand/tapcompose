function symmod(i, m) {
  let mod = i % m;
  while (mod < 0) mod += m;
  if (mod > m / 2) mod -= m;
  return mod;
}

function fracRound(num, den, val) {
  return Math.round(num / den * val);
}

// A 440Hz in 2,3-space.
const a4_2 = 2;
const a4_3 = 1;

// A 440Hz frequency.
const a4_freq = 440;

export class Note {
  /**
   * @param {string} note The full name of the note.
   */
  constructor(note) {
    // Parse the note.
    if (note.length < 1) {
      throw new Error(INVALID_NOTE);
    }

    // Extract the note letter.
    /**
     * The note letter, in the range from 'A' to 'G' inclusive.
     * @type {string}
     */
    this.noteLetter = note.charAt(0).toUpperCase();
    if (this.noteLetter.charCodeAt(0) < 'A'.charCodeAt(0) ||
        this.noteLetter.charCodeAt(0) > 'G'.charCodeAt(0)) {
      // Ensure it's a valid base note.
      throw new Error('Invalid note letter.');
    }

    // Extract the accidentals, as '#' or 'b' characters.
    /**
     * The number of sharps and flats.
     * @type {number}
     */
    this.accidentals = 0;
    let i;
    for (i = 1; i < note.length; i++) {
      const c = note.charAt(i);
      if (c == '#') {
        this.accidentals++;
      } else if (c == 'b') {
        this.accidentals--;
      } else {
        break;
      }
    }

    // Extract the octave.
    let octaveString = note.substring(i);
    if (isNaN(octaveString)) {
      throw new Error('Octave must have a number.');
    }
    /**
     * The octave number. Octaves increment going from 'G' to 'A'.
     * @type {number}
     */
    this.octave = parseInt(octaveString);

    const letter = this.noteLetter.charCodeAt(0) - 'A'.charCodeAt(0) - 3;
    /**
     * The two-component of the note in 2,3-notation.
     * @type {number}
     */
    this.s2 = symmod(-3 * letter, 11);
    /**
     * The three-component of the note in 2,3-notation.
     * @type {number}
     */
    this.s3 = symmod(2 * letter, 7);
    this.s2 -= 11 * this.accidentals;
    this.s3 += 7 * this.accidentals;
    this.s2 += this.octave;

    /**
     * The full name of the note.
     * @type {string}
     */
    this.note = note;
  }

  /**
   * Returns the well-tempered frequency (like on a piano) for the note.
   * @param {number=} e The number of semitones in a fifth in the musical space.
   * @param {number=} f The number of semitones in an octave in the musical
   *     space.
   * @return {number}
   */
  wellTemperedFrequency(e = 19, f = 12) {
    const three = Math.pow(2, e / f);
    return a4_freq * Math.pow(2, this.s2 - a4_2) *
        Math.pow(three, this.s3 - a4_3);
  }

  /**
   * Returns the 2,3-space frequency for the note (using only powers of 2 and 3,
   * centered on A 440Hz).
   * @return {number}
   */
  twoThreeFrequency() {
    return a4_freq * Math.pow(2, this.s2 - a4_2) * Math.pow(3, this.s3 - a4_3);
  }

  /**
   * Jumps by the specified interval, returning a new note.
   * @param {!Interval} interval The interval to jump by.
   * @param {boolean=} reverse Whether to jump in the reverse direction.
   * @return {!Note} The new note after applying to interval.
   */
  jump(interval, reverse = false) {
    return Note.fromTwoThree(
      this.s2 + interval.s2 * (reverse ? -1 : 1),
      this.s3 + interval.s3 * (reverse ? -1 : 1),
    );
  }

  /**
   * Jumps by the specified number of octaves, returning a new note.
   * @param {number} octaveDelta The number of octaves to jump.
   * @return {!Note} The new note after jumping the specified number of octaves.
   */
  octaveShift(octaveDelta) {
    return Note.fromTwoThree(this.s2 + octaveDelta, this.s3);
  }

  /**
   * Shifts the base note of this note the specified number of steps.
   * @param {number} steps The number of steps to shift.
   */
  baseShift(steps) {
    const minRange = 'A'.charCodeAt(0);
    const maxRange = 'G'.charCodeAt(0);
    const range = maxRange - minRange + 1;
    const offset = this.noteLetter.charCodeAt(0) + steps - minRange;
    const octaveShift = Math.floor(offset / range);
    const note = String.fromCharCode(
        ((offset % range) + range) % range + minRange);
    return new Note(`${note}${this.accidentals < 0 ?
        'b'.repeat(-this.accidentals) : '#'.repeat(this.accidentals)}` +
        `${this.octave + octaveShift}`);
  }

  /**
   * Shifts the accidental of this note the specified number of steps.
   * @param {number} steps
   * @param {?number} maxShift
   */
  accidentalShift(steps, maxShift = null) {
    const newAccidentals = this.accidentals + steps;
    if (maxShift != null && Math.abs(newAccidentals) > maxShift) return new Note(this.note);
    return new Note(this.noteLetter +
      (newAccidentals < 0 ? 'b'.repeat(-newAccidentals) : '#'.repeat(newAccidentals)) +
      this.octave);
  }

  static fromTwoThree(s2, s3) {
    const letter = symmod(-3 * s3, 7);
    const note = String.fromCharCode('A'.charCodeAt(0) + letter + 3);
    const accidentals = fracRound(1, 7, s3);
    const baseS2 = symmod(-3 * letter, 11) - 11 * accidentals;
    const octave = s2 - baseS2;
    return new Note(note +
        (accidentals < 0 ? 'b'.repeat(-accidentals) : '#'.repeat(accidentals)) +
        octave);
  }

  /**
   * Returns the note name, compatible with Vexflow.
   * @return {string}
   */
  vexflowNoteName() {
    const note = this.noteLetter.toLowerCase();
    const octaveDelta =
        this.noteLetter.charCodeAt(0) - 'C'.charCodeAt(0) >= 0 ? 1 : 0;
    const accidental = this.accidentals > 0 ?
        '#'.repeat(this.accidentals) : 'b'.repeat(-this.accidentals);
    return `${note}${accidental}/${this.octave + octaveDelta}`;
  }
}

const intervals = {
  'P1': 'D0',
  'a1': 'D#0',
  'm2': 'Eb0',
  'M2': 'E0',
  'm3': 'F0',
  'M3': 'F#0',
  'P4': 'G0',
  'd5': 'Ab1',
  'P5': 'A1',
  'a5': 'A#1',
  'm6': 'Bb1',
  'M6': 'B1',
  'd7': 'Cb1',
  'm7': 'C1',
  'M7': 'C#1',
  'a7': 'C##1',
  'P8': 'D1',
}

export class Interval {
  constructor(toNote, baseNote = 'D0') {
    const to = new Note(toNote);
    const from = new Note(baseNote);
    const interval = Note.fromTwoThree(to.s2 - from.s2, to.s3 - from.s3);
    /**
     * The two-component of the interval in 2,3-notation.
     * @type {number}
     */
    this.s2 = interval.s2;
    /**
     * The three-component of the interval in 2,3-notation.
     * @type {number}
     */
    this.s3 = interval.s3;
  }

  /**
   * Jumps by the specified interval, returning a new interval.
   * @param {!Interval} interval The interval to jump by.
   * @return {!Interval} The new interval after applying to interval.
   */
  jump(interval) {
    return new Interval(
        Note.fromTwoThree(this.s2 + interval.s2, this.s3 + interval.s3));
  }

  static P1() {
    return new Interval(intervals['P1']);
  }

  static a1() {
    return new Interval(intervals['a1']);
  }

  static m2() {
    return new Interval(intervals['m2']);
  }

  static M2() {
    return new Interval(intervals['M2']);
  }

  static m3() {
    return new Interval(intervals['m3']);
  }

  static M3() {
    return new Interval(intervals['M3']);
  }

  static P4() {
    return new Interval(intervals['P4']);
  }

  static d5() {
    return new Interval(intervals['d5']);
  }

  static P5() {
    return new Interval(intervals['P5']);
  }

  static a5() {
    return new Interval(intervals['a5']);
  }

  static m6() {
    return new Interval(intervals['m6']);
  }

  static M6() {
    return new Interval(intervals['M6']);
  }

  static d7() {
    return new Interval(intervals['d7']);
  }

  static m7() {
    return new Interval(intervals['m7']);
  }

  static M7() {
    return new Interval(intervals['M7']);
  }

  static a7() {
    return new Interval(intervals['a7']);
  }
}
