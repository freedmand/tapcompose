import {Instrument} from './instrument.js';

// The number of decimal places to use in time-based keys.
const PRECISION = 6;

/**
 * Timing provides methods to go from duration to beats and beats to duration
 * for a specified tempo in beats per minute.
 */
export class Timing {
  /**
   * @param {number} tempo The tempo in beats per minute.
   */
  constructor(tempo) {
    /** @type {number} */
    this.tempo = tempo;
  }

  /**
   * Gets the duration of the note with the specified length in milliseconds.
   * @param {number} beats The note length in beats. A note length of 1
   *     corresponds to a quarter-note, 0.5 to an eighth-note, 0.25 to a
   *     sixteenth-note, and so on.
   */
  getDuration(beats) {
    return beats / this.tempo * 60 * 1000;
  }

  /**
   * Gets the number of beats in the specified number of milliseconds.
   * @param {number} millis The number of milliseconds.
   */
  getBeats(millis) {
    return millis / 1000 / 60 * this.tempo;
  }
}

/**
 * Timer is an easy-to-use abstraction over the traditional setTimeout method.
 * A timer can be set to a certain timeout, overwriting a previous timeout if
 * called. The timeout can also easily be cleared. A timer can be tied to a
 * number of beats.
 */
export class Timer {
  /**
   * @param {!Function} fn The function to run when the timer goes off.
   * @param {?number=} beats
   */
  constructor(fn, beats = null) {
    /**
     * The event's function.
     * @type {!Function}
     */
    this.fn = fn;

    this.beats = beats;

    /**
     * The handle to the timer.
     * @type {?number}
     */
    this.timer = null;
  }

  /**
   * Sets the timeout for the timer to the specified number of milliseconds. If
   * the timer is already running, this resets the timer.
   * @param {number} millis The specified number of milliseconds.
   * @param {boolean} loop Whether to reset the timer upon completion.
   */
  setTimeout(millis, loop = null) {
    clearTimeout();
    this.timer = setTimeout(() => {
      this.fn();
      clearTimeout(this.timer);
      if (loop != null) this.setTimeout(loop, loop);
    }, millis);
  }

  /**
   * Clears the timeout for the timer.
   */
  clearTimeout() {
    if (this.timer != null) clearTimeout(this.timer);
    this.timer = null;
  }
}

/**
 * Scheduler integrates a timing system and a group containing events to run. It
 * provides methods to play, pause, and seek within a timeline of beats.
 */
export class Scheduler {
  /**
   * @param {!Timing} timing The timing system to use.
   */
  constructor(timing) {
    /** @type {!Timing} */
    this.timing = timing;

    /**
     * The schedule of events to run, expressed as a parent group.
     * @type {!Group}
     */
    this.schedule = new Group();

    /**
     * Whether the scheduler is currently playing.
     * @type {boolean}
     */
    this.playing = false;

    /**
     * The start time for the scheduler, when it starts playing.
     * @type {?number}
     */
    this.startTime = null;

    /**
     * The number of beats to offset the stream.
     * @type {number}
     */
    this.beatOffset = 0;

    /**
     * The timers managed by this scheduler.
     * @type {!Array<!Timer>}
     */
    this.timers = [];

    this.autoPauseTimer = new Timer(() => {
      this.pause();
    });
  }

  /**
   * Adds the specified group or event at an optional offset to the schedule.
   * @param {!Group|!Event} groupOrEvent The group or event to add to the
   *     scheduler.
   * @param {number=} beatOffset An optional beat offset to the group or event
   *     being added.
   */
  add(groupOrEvent, beatOffset = 0) {
    this.schedule.addGroup(new Group(groupOrEvent, beatOffset));
  }

  addTimedNotes(timedNotes, staveNote, polyInstrument) {
    if (timedNotes.length == 0) return;
    const groups = new Group(
        timedNotes.map((timedNote) => timedNote.toGroup(polyInstrument)));
    const start = timedNotes[0].start;
    const end = timedNotes[0].end;

    staveNote.setClickPlayback(new Group(
      timedNotes.map((timedNote) => timedNote.toGroup(polyInstrument, true))),
      this.timing, polyInstrument);

    groups.addEvent(new FunctionEvent(() => staveNote.showPlaying(), start));
    groups.addEvent(new FunctionEvent(() => staveNote.showNormal(), end));
    this.schedule.addGroup(new Group(groups));
  }

  initialize() {
    this.clearTimers();
    for (const event of this.schedule.iterate()) {
      const timer = new Timer(event.fn, event.beats);
      this.timers.push(timer);
    }
  }

  play(loop = null) {
    this.playing = true;
    this.startTime = Date.now();

    let maxMillis = 0;
    for (const timer of this.timers) {
      if (timer.beats < this.beatOffset) continue;
      const beat = timer.beats - this.beatOffset;
      const millis =
          this.timing.getDuration(beat);
      if (millis > maxMillis) maxMillis = millis;
      timer.setTimeout(
          millis, loop != null ? this.timing.getDuration(loop) : null);
    }
    this.autoPauseTimer.setTimeout(maxMillis);
  }

  pause() {
    this.playing = false;
    const offset = Date.now() - this.startTime;
    const beatOffset = this.timing.getBeats(offset);
    for (const timer of this.timers) timer.clearTimeout();
    this.autoPauseTimer.clearTimeout();
  }

  clearTimers() {
    for (const timer of this.timers) timer.clearTimeout();
    this.autoPauseTimer.clearTimeout();
    this.timers.splice(0);
  }

  clear() {
    this.clearTimers();
    // Reset some of the vars.
    this.schedule = new Group();
    this.playing = false;
    this.timers = [];
  }
}

/**
 * A base class containing some sort of timed event that can be shifted in time.
 * Subclasses need to override the shift method.
 */
export class Event {
  constructor() {}

  shift(beats) {
    throw new Error('Not implemented.');
  }
}

export class FunctionEvent extends Event {
  /**
   * @param {!Function} fn Function to run in the specified number of beats.
   * @param {number} beats The number of beats before the event triggers.
   */
  constructor(fn, beats) {
    super();
    /** @type {!Function} */
    this.fn = fn;
    /** @type {number} */
    this.beats = beats;
  }

  /**
   * Returns the current event shifted by the given number of beats.
   * @param {number} beats The number of beats to shift.
   * @return {!Event}
   */
  shift(beats) {
    return new FunctionEvent(this.fn, this.beats + beats);
  }
}

export class TimedNote extends Event {
  /**
   * @param {!Note} note The note to play.
   * @param {number} start The starting time of the note in beats.
   * @param {number} end The end time of the note in beats.
   */
  constructor(note, start, end) {
    super();

    /** @type {!Note} */
    this.note = note;
    /** @type {number} */
    this.start = start;
    /** @type {number} */
    this.end = end;
  }

  /**
   * Returns a string representation of the timed note.
   * @return {string}
   */
  toString() {
    /**
     * Formats the number to a string after fixing it to 5 decimal places and
     * removing trailing zeros.
     * @param {number} num The number.
     * @return {string} The formatted number as a string.
     */
    const formatNum = (num) => {
      return parseFloat(num.toFixed(5)).toString();
    }
    return [
      this.note.note,
      formatNum(this.start),
      formatNum(this.end),
    ].join(',');
  }

  /**
   * Returns a unique identifier to represent the start and end of the note in
   * micro-beats.
   * @return {string}
   */
  timeKey() {
    return `${this.start.toFixed(PRECISION)},${this.end.toFixed(PRECISION)}`;
  }

  toGroup(instrument, shiftStart = false, offDelta = 0.1) {
    const group = new Group();
    group.addEvent(new FunctionEvent(() => instrument.noteOn(
        this.note.name,
        this.note.wellTemperedFrequency()), shiftStart ? 0 : this.start));
    group.addEvent(new FunctionEvent(() => instrument.noteOff(
        this.note.name), this.end - offDelta - (shiftStart ? this.start : 0)));
    return group;
  }

  shift(beats) {
    return new TimedNote(this.note, this.start + beats, this.end + beats);
  }
}

export class Group {
  /**
   * @param {!Event|!Group|!Array<!Event|!Group>} eventsOrGroups The event,
   *     group, or array containing events and groups with which to initialize
   *     this group.
   * @param {number=} beatOffset The beat offset to add to every member of this
   *     group.
   */
  constructor(eventsOrGroups, beatOffset = 0) {
    /**
     * The events to run within the group.
     * @type {!Array<!Events>}
     */
    this.events = [];
    /**
     * The subgroups, containing events to run within the group.
     * @type {!Array<!Group>}
     */
    this.subgroups = [];

    /**
     * The beat offset.
     * @type {number}
     */
    this.beatOffset = beatOffset;

    if (eventsOrGroups === undefined) return;
    // Try to add the constructor argument as an event, group, or array
    // containing a combination of events and groups.
    if (eventsOrGroups instanceof Event) {
      // A single event constructor.
      this.events.push(eventsOrGroups);
    } else if (eventsOrGroups instanceof Group) {
      // A single group constructor.
      this.subgroups.push(eventsOrGroups);
    } else if (Array.isArray(eventsOrGroups)) {
      // An array constructor (break it down by element).
      eventsOrGroups.forEach((eventOrGroup) => {
        if (eventOrGroup instanceof Event) {
          // An event sub-element within an array constructor.
          this.events.push(eventOrGroup);
        } else if (eventOrGroup instanceof Group) {
          // A group sub-element within an array constructor.
          this.subgroups.push(eventOrGroup);
        } else {
          throw new Error('Unrecognized constructor to group');
        }
      });
    } else {
      throw new Error('Unrecognized constructor to group');
    }
  }

  /**
   * Adds the specified event to this group.
   * @param {!Event} event The event to add to the group.
   */
  addEvent(event) {
    this.events.push(event);
  }

  /**
   * Adds the specified group as a sub-group to this group.
   * @param {!Group} group The group to add as a sub-group.
   */
  addGroup(group) {
    this.subgroups.push(group);
  }

  /**
   * Sets the group to have the specified beat offset.
   * @param {number} offset The beat offset to which to set the group.
   */
  setOffset(offset) {
    this.beatOffset = offset;
  }

  /**
   * Iterates through all the events this group contains, including recursively
   * within sub-groups.
   */
  * iterate(beatOffset = 0) {
    // Iterate through all events.
    for (const event of this.events) {
      yield event.shift(beatOffset + this.beatOffset);
    }
    for (const group of this.subgroups) {
      // Iterate through all sub-groups recursively.
      for (const event of group.iterate(beatOffset + this.beatOffset)) {
        yield event;
      }
    }
  }

  /**
   * Returns the length of all events this group contains.
   * @return {number}
   */
  length() {
    let i = 0;
    // Iterate through everything, incrementing a counter.
    for (const _ of this.iterate()) i++;
    return i;
  }
}

export class NoteGroup extends Group {
  /**
   * Iterates a string representation of the note group.
   * @yield {string}
   */
  * iterateStrings() {
    for (const timedNote of this.iterate()) {
      yield timedNote.toString();
    }
  }

  /**
   * Converts the group of notes into a group of timed onsets and offsets for an
   * instrument.
   * @param {!Instrument} instrument The instrument to play.
   * @param {number=} offDelta The delta offset to release notes before the
   *     scheduled end in beats.
   * @param {number=} volume The volume at which to play each note.
   * @param {string=} uniqueHandle The unique handle prefix to pass to the
   *     instrument's noteOn and noteOff events.
   * @return {!Group} The resulting group of note onset and offset events for
   *     the instrument.
   */
  toPerformanceGroup(instrument, offDelta = 0.1, volume = 0.2,
      uniqueHandle = '') {
    const performanceGroup = new Group();
    for (const timedNote of this.iterate()) {
      const handle = `${uniqueHandle}${timedNote.note.note}`;
      // Add the note onset event.
      performanceGroup.addEvent(new FunctionEvent(() => {
        instrument.noteOn(handle, timedNote.note.wellTemperedFrequency(),
            volume);
      }, timedNote.start));
      // Add the note offset event.
      performanceGroup.addEvent(new FunctionEvent(() => {
        instrument.noteOff(handle);
      }, timedNote.end - offDelta));
    }
  }
}
