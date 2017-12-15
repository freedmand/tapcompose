import {Listenable} from './listenable';

const RESUME_CHECK_INTERVAL = 100;

/**
 * An audio context that is compatible with mobile. Initialize with a callback
 * that will return an audio context.
 */
export class CompatibleAudioContext extends Listenable {
  /**
   * @param {!Function} callback The callback function to run after web audio is
   *     successfully initialized.
   */
  constructor(callback) {
    super();

    this.callback = callback;
    /**
     * The audio context. Will attempt to create in initialize.
     * @type {?AudioContext}
     */
    this.audioContext = null;

    this.webAudioUnlocked = false;
    this.htmlAudioUnlocked = false;
    this.registerListener(document.body, 'touchend', this.tap.bind(this));
    this.registerListener(document.body, 'click', this.tap.bind(this));

    this.initialize();
  }

  initialize() {
    try {
      // Try to initialize a new web audio context using a variety of means.
      if (typeof AudioContext !== 'undefined') {
        this.audioContext = new AudioContext();
      } else if (typeof webkitAudioContext !== 'undefined') {
        this.audioContext = new webkitAudioContext();
      }
    } catch(_) {}

    if (this.audioContext == null) {
      alert('tapcompose is not compatible with your device because it lacks' +
          'WebAudio support');
      return;
    }

    // Now that web audio works, iron out strange mobile behavior.
    if (this.audioContext.state != 'suspended') {
      this.tearDown();
      this.callback(this.audioContext);
    }
  }

  tap() {
    this.audioContext.resume();

    // Unlock WebAudio - create short silent buffer and play it
    // This will allow us to play web audio at any time in the app
    if (!this.webAudioUnlocked) {
      if (this.audioContext.state == 'running') {
        this.webAudioUnlocked = true;
        this.verify();
      } else {
        var buffer = this.audioContext.createBuffer(1, 1, 22050); // 1/10th of a second of silence
        var source = this.audioContext.createBufferSource();
        source.buffer = buffer;
        source.connect(this.audioContext.destination);
        source.onended = () => {
          this.webAudioUnlocked = true;
          this.verify();
        };
        source.start();
      }
    }

    // Unlock HTML5 Audio - load a data url of short silence and play it
    // This will allow us to play web audio when the mute toggle is on
    var silenceDataURL = 'data:audio/mp3;base64,//MkxAAHiAICWABElBeKPL/RANb2w+yiT1g/gTok//lP/W/l3h8QO/OCdCqCW2Cw//MkxAQHkAIWUAhEmAQXWUOFW2dxPu//9mr60ElY5sseQ+xxesmHKtZr7bsqqX2L//MkxAgFwAYiQAhEAC2hq22d3///9FTV6tA36JdgBJoOGgc+7qvqej5Zu7/7uI9l//MkxBQHAAYi8AhEAO193vt9KGOq+6qcT7hhfN5FTInmwk8RkqKImTM55pRQHQSq//MkxBsGkgoIAABHhTACIJLf99nVI///yuW1uBqWfEu7CgNPWGpUadBmZ////4sL//MkxCMHMAH9iABEmAsKioqKigsLCwtVTEFNRTMuOTkuNVVVVVVVVVVVVVVVVVVV//MkxCkECAUYCAAAAFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';
    var tag = document.createElement("audio");
    tag.controls = false;
    tag.preload = "auto";
    tag.loop = false;
    tag.src = silenceDataURL;
    tag.onended = () => {
        this.htmlAudioUnlocked = true;
        this.verify();
    };
    tag.play();
  }

  verify() {
    this.audioContext.resume();

    if (this.webAudioUnlocked && this.htmlAudioUnlocked) {
      setTimeout(() => {
        if (this.audioContext.state == 'running') {
          this.run();
        }
      }, 0);
    }
  }

  run() {
    // Complete! Tear down event handlers.
    this.tearDown();

    // Set an interval timer to continually renew a suspended audio context.
    setInterval(() => {
      if (this.audioContext.state == 'suspended') this.audioContext.resume();
    }, RESUME_CHECK_INTERVAL);

    // Finally, call the callback with the initialized audio context!
    this.callback(this.audioContext);
  }
}
