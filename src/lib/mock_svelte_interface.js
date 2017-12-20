/**
 * A mock class encapsulating the basic methods in a Svelte interface with
 * descriptive JSDoc.
 */
export class MockSvelteInterface {
  constructor() {}

  /**
   * Retrieves the value for the specified parameter in the Svelte interface.
   * @param {string} param The parameter to retrieve.
   * @return {*} The object associated with the parameter.
   */
  get(param) {}

  /**
   * Observes the specified parameter, calling the given function whenever the
   * parameter changes.
   * @param {string} param The parameter to observe.
   * @param {!Function} fn The function to call when the parameter changes.
   */
  observe(param, fn) {}
}
