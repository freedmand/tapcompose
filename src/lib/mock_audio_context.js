/**
 * Mocks the WebAudio audio context, providing stub implementations for methods.
 */
export class MockAudioContext {
  constructor() {}

  /**
   * Creates a gain node.
   * @return {!MockAudioNode}
   */
  createGain() {
    return new MockAudioNode();
  }

  /**
   * Creates a biquad filter node.
   * @return {!MockAudioNode}
   */
  createBiquadFilter() {
    return new MockAudioNode();
  }

  /**
   * Creates a dynamics compressor node.
   * @return {!MockAudioNode}
   */
  createDynamicsCompressor() {
    return new MockAudioNode();
  }

  /**
   * Creates an oscillator node.
   * @return {!MockAudioNode}
   */
  createOscillator() {
    return new MockAudioNode();
  }
}

/**
 * Mocks a generic audio node, providing methods to set values at time.
 */
export class MockAudioNode {
  constructor() {
    // Set audio params that may come up in various audio node classes.
    /** @type {!MockAudioParam} */
    this.gain = new MockAudioParam();
    /** @type {!MockAudioParam} */
    this.frequency = new MockAudioParam();
    /** @type {!MockAudioParam} */
    this.threshold = new MockAudioParam();
    /** @type {!MockAudioParam} */
    this.knee = new MockAudioParam();
    /** @type {!MockAudioParam} */
    this.ratio = new MockAudioParam();
    /** @type {!MockAudioParam} */
    this.attack = new MockAudioParam();
    /** @type {!MockAudioParam} */
    this.release = new MockAudioParam();
  }

  /**
   * Connects this node to another node.
   * @param {!MockAudioNode} otherNode
   */
  connect(otherNode) {}

  /**
   * Starts the given audio node. This is relevant to oscillator.
   * @param {number} time The time at which to start.
   */
  start(time) {}
}

export class MockAudioParam {
  /**
   * Sets this node to have the specified value at the specified time.
   * @param {number} value The value to which to set the node.
   * @param {number} startTime The time at which to schedule this value change.
   */
  setValueAtTime(value, startTime) {}
}
