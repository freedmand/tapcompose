/**
 * Listener is a class that wraps an element, event type, and function and
 * provides simple methods to add an event listener and remove it.
 */
export class Listener {
  /**
   * @param {!Element} target The element to listen to.
   * @param {string} eventType The event type to listen for.
   * @param {!Function} fn The function to call when the event triggers.
   */
  constructor(target, eventType, fn) {
    /** @type {!Element} */
    this.target = target;
    /** @type {string} */
    this.eventType = eventType;
    /** @type {!Function} */
    this.fn = fn;
  }

  /**
   * Adds the event listener, effectively registering it.
   */
  add() {
    this.target.addEventListener(this.eventType, this.fn, false);
  }

  /**
   * Removes, or tears down, the event listener that was added. The should be
   * called after add().
   */
  remove() {
    this.target.removeEventListener(this.eventType, this.fn, false);
  }
}

/**
 * Listenable is an interface that allows extending classes to register event
 * listeners and then easily clean up by tearing them all down at once.
 */
export class Listenable {
  constructor() {
    /**
     * The event listeners that have been registered.
     * @type {!Array<Listener>}
     */
    this.listeners = [];
  }

  /**
   * Removes all the event listeners that have been registered and resets the
   * event listeners array.
   */
  tearDown() {
    for (const listener of this.listeners) listener.remove();
    this.listeners = [];
  }

  /**
   * Registers, or adds, an event listener on the specified element for the
   * specified event type that will call the specified function when triggered.
   * @param {!Element} target The element to listen to.
   * @param {string} eventType The event type to listen for.
   * @param {!Function} fn The function to call when the event triggers.
   */
  registerListener(target, eventType, fn) {
    const listener = new Listener(target, eventType, fn);
    this.listeners.push(listener);
    listener.add();
  }
}
