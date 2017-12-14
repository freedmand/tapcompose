// The default volume to play instruments at with the noteOn method.
const DEFAULT_VOL = 0.2;

export class InstrumentManager {
  /**
   * @param {!Context} context The WebAudio context for the instrument.
   * @param {!Instrument} instrumentType The instrument type to play.
   * @param {number} polyphony The number of notes the instrument can play
   *     simultaneously.
   */
  constructor(context, instrumentType, polyphony) {
    /**
     * The instruments to play.
     * @type {!Array<!Instrument>}
     */
    this.instruments = [];

    /**
     * The instruments that are currently on.
     * @type {!Array<boolean>}
     */
    this.playing = [];

    /**
     * The handles for notes currently being played.
     * @type {!Map<string, number>}
     */
    this.handles = new Map();

    // Populate each instrument by initializing a new instance.
    for (let i = 0; i < polyphony; i++) {
      this.instruments.push(new instrumentType(context));
      this.playing.push(false);
    }

    /**
     * The number of notes that can be played simultaneously.
     * @type {number}
     */
    this.polyphony = polyphony;
  }

  /**
   * Play the specified note if possible and reference it by the given handle.
   * @param {string} handle A unique identifier for the key currently being
   *     played that can be referenced on noteOff.
   * @param {number} freq The frequency of the note to play in hertz.
   * @param {number=} volume The volume of the note to play.
   */
  noteOn(handle, freq, volume = DEFAULT_VOL) {
    for (let i = 0; i < this.playing.length; i++) {
      if (!this.playing[i]) {
        this.instruments[i].noteOn(freq, volume);
        this.playing[i] = true;
        this.handles.set(handle, i);
        return;
      }
    }

    console.warn('No keys available to play note.');
    return;
  }

  /**
   * Stop playing the note referenced by the given handle.
   * @param {string} handle A unique identifier for the note to stop playing.
   */
  noteOff(handle) {
    if (this.handles.has(handle)) {
      const i = this.handles.get(handle);
      this.instruments[i].noteOff();
      this.playing[i] = false;
      this.handles.delete(handle);
    } else {
      console.warn('Note off on handle that does not exist.');
      return;
    }
  }

  allOff() {
    for (let i = 0; i < this.instruments.length; i++) {
      this.instruments[i].noteOff();
      this.playing[i] = false;
    }
    this.handles.clear();
  }
}

export class EmptyInstrument {
  constructor() {}

  noteOn(freq, vol = 1) {}

  noteOff() {}
}

export class Instrument {
  /**
   * @param {!Context} context The WebAudio context for the instrument.
   */
  constructor(context) {
    /**
     * The WebAudio context for the instrument.
     * @type {!Context}
     */
    this.context = context;
    /**
     * Whether the instrument is currently playing.
     * @type {boolean}
     */
    this.playing = false;

    /**
     * The WebAudio gain node for this instrument.
     * @type {!GainNode}
     */
    this.gainNode = this.context.createGain();

    // Set the gain value to 0 and connect it to the output.
    this.gainNode.gain.value = 0.0;

    // Wire the output to the context destination.
    this.wire_();
  }

  /**
   * Wires the output node to the destination of the context. Can be overridden
   * in some subclasses.
   */
  wire_() {
    this.gainNode.connect(this.context.destination);
  }

  /**
   * Change the frequency of the instrument. Override in subclasses.
   * @param {number} freq The frequency in hertz.
   */
  changeFrequency_(freq) {}

  /**
   * Play the specified frequency.
   * @param {float} freq The frequency in hertz.
   * @param {float} volume The volume to play.
   */
  noteOn(freq, volume = DEFAULT_VOL) {
    this.playing = true;
    this.attack_(volume);
    this.decay_(volume);
    this.changeFrequency_(freq);
  }

  /**
   * Stop playing notes.
   */
  noteOff() {
    this.playing = false;
    this.release_();
  }

  /**
   * The attack part of the envelope. Can be overridden in subclasses.
   * @param {float} volume The volume to ultimately hit.
   */
  attack_(volume) {
    this.gainNode.gain.cancelScheduledValues(0);
    this.gainNode.gain.value = volume;
  }

  /**
   * The decay part of the envelope. Can be overridden in subclasses.
   * @param {float} volume The volume hit in the attack.
   */
  decay_(volume) {}

  /**
   * The release part of the envelope. Can be overridden in subclasses.
   */
  release_() {
    this.gainNode.gain.value = 0.0;
  }
}

export class OscillatorInstrument extends Instrument {
  constructor(context, oscillatorType) {
    super(context);
    /**
     * The oscillator for the instrument.
     * @type {?Oscillator}
     */
    this.oscillator = null;

    /**
     * The type of oscillator to use.
     * @type {string}
     */
    this.oscillatorType = oscillatorType;

    // Initialize the instrument.
    this.initialize_();
  }

  /**
   * Initialize the specified instrument as an oscillator
   */
  initialize_() {
    this.oscillator = this.context.createOscillator();
    this.oscillator.type = this.oscillatorType;
    this.oscillator.connect(this.gainNode);
    this.oscillator.start(0);
  }

  changeFrequency_(freq) {
    this.oscillator.frequency.setValueAtTime(freq, 0);
  }
}

export class SinOscillator extends OscillatorInstrument {
  constructor(context) {
    super(context, 'sine');
  }
}

export class SawOscillator extends OscillatorInstrument {
  constructor(context) {
    super(context, 'sawtooth');
  }
}

export class MultipleOscillatorInstrument extends Instrument {
  constructor(context, oscillatorTypes) {
    super(context);
    /**
     * The oscillator for the instrument.
     * @type {!Array<!Oscillator>}
     */
    this.oscillators = [];

    /**
     * The types of oscillators to use.
     * @type {!Array<string>}
     */
    this.oscillatorTypes = oscillatorTypes;

    // Initialize the instrument.
    this.initialize_();
  }

  /**
   * Initialize the specified instrument as an oscillator
   */
  initialize_() {
    for (const oscillatorType of this.oscillatorTypes) {
      const oscillator = this.context.createOscillator();
      oscillator.type = oscillatorType;
      oscillator.connect(this.gainNode);
      oscillator.start(0);
      this.oscillators.push(oscillator);
    }
  }

  changeFrequency_(freq) {
    for (const oscillator of this.oscillators) {
      oscillator.frequency.setValueAtTime(freq, 0);
    }
  }
}

export class SineFade extends MultipleOscillatorInstrument {
  constructor(context) {
    super(context, ['sine']);
  }

  decay_(volume) {
    this.gainNode.gain.linearRampToValueAtTime(0, this.context.currentTime + 5);
  }
}

export class BounceSynth extends MultipleOscillatorInstrument {
  constructor(context) {
    super(context, ['sawtooth', 'sawtooth', 'sawtooth']);
  }

  changeFrequency_(freq) {
    for (let i = 0; i < this.oscillators.length; i++) {
      const oscillator = this.oscillators[i];
      const detune = (i - 1) * 0.5;
      oscillator.frequency.setValueAtTime(freq + detune, 0);
    }
  }

  wire_() {
    const biquadFilter = this.context.createBiquadFilter();
    biquadFilter.type = 'lowpass';
    biquadFilter.frequency.value = 800;

    const compressor = this.context.createDynamicsCompressor();
    compressor.threshold.value = 0;
    compressor.knee.value = 0;
    compressor.ratio.value = 20;
    compressor.attack.value = 0.005;
    compressor.release.value = 0.05;

    const preGain = this.context.createGain();
    preGain.gain.value = 0.5;
    this.gainNode.connect(biquadFilter);
    biquadFilter.connect(preGain);
    preGain.connect(compressor);
    compressor.connect(this.context.destination);
  }

  attack_(volume) {
    this.gainNode.gain.linearRampToValueAtTime(
        volume, this.context.currentTime + 0.02);
  }

  decay_(volume) {
    this.gainNode.gain.linearRampToValueAtTime(
        volume * 0.8, this.context.currentTime + 0.1);
  }
}
