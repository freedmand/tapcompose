/**
 * A base class for versioned serialization. Stores a version number to support
 * future backwards-compatible updates to the serialization format.
 */
export class VersionedSerializer {
  constructor() {
    /**
     * The version number of this serializer. Override in subclasses.
     * @type {string}
     */
    this.version = '';
  }

  /**
   * Serializes the specified object into a string.
   * @param {*} object The object to serialize.
   * @return {string} The string representation of the object.
   */
  serialize(object) {
    throw new Error('Not implemented.');
  }

  /**
   * Deserializes the specified string into an object.
   * @param {string} str The string to deserialize.
   * @return {*} The deserialized object.
   */
  deserialize(str) {
    throw new Error('Not implemented.');
  }

  /**
   * Deserializes the specified string into the specified object.
   * @param {string} str The string to deserialize.
   * @param {*} object The object to deserialize into.
   */
  deserializeIntoObject(str) {
    throw new Error('Not implemented.');
  }
}

export class SerializationDictionary {
  /**
   * @param {!Array<!Serializer>} serializers An array of all possible
   * serializers. The version number of the serializer is used as a key.
   * @param {string} defaultVersion The latest version to use by default.
   */
  constructor(serializers, defaultVersion) {
    /** @type {!Array<!Serializer} */
    this.serializers = serializers;
    /** @type {string} */
    this.defaultVersion = defaultVersion;

    /**
     * The map from version number to serializer.
     * @type {!Map<string, !Serializer>}
     */
    this.dictionary = new Map();
    for (const serializer of this.serializers) {
      // Initialize the dictionary by iterating through all serializers.
      const version = serializer.version;
      if (version == '') {
        throw new Error('No version number set for serializer');
      }
      if (version.includes('|')) {
        throw new Error(`Version cannot include the '|' character.`);
      }
      this.dictionary.set(version, serializer);
    }
  }

  /**
   * Retrieves a serializer from the dictionary by version.
   * @param {?string=} version The version number of the serializer to retrieve.
   *     If null, uses the default version.
   * @return {?Serializer} The serializer, or undefined if it is not in the
   *     dictionary.
   */
  get(version = null) {
    if (version == null) version = this.defaultVersion;
    return this.dictionary.get(version);
  }

  /**
   * Serializes the specified object using the serializer with the specified
   * version.
   * @param {*} object The object to serialize.
   * @param {?string=} version The version number of the serializer to use. If
   *     left null, use the default version
   * @return {string} The serialized representation of the object.
   */
  serialize(object, version = null) {
    if (version == null) version = this.defaultVersion;
    const serializer = this.get(version);
    if (serializer == null) {
      throw new Error('No serializer found with the specified version.');
    }

    return version + '|' + serializer.serialize(object);
  }

  /**
   * Returns the version number embedded in the serialized string and a trimmed
   * version of the string that does not include the version number.
   * @param {string} str The serialized string.
   * @return {{version: string, trimmed: string}} The version number and a
   *     trimmed version of the input string that does not contain the version
   *     number.
   */
  getVersionFromSerializedString(str) {
    // Separate the version number from the serialized string.
    const separatorIndex = str.indexOf('|');
    if (separatorIndex == -1) {
      throw new Error('No version number could be inferred.');
    }

    // Grab the version and serializer and return the deserialized object.
    const version = str.substring(0, separatorIndex);
    // Get the remainder of the string.
    const trimmed = str.substring(separatorIndex + 1);
    return {version, trimmed};
  }

  /**
   * Deserializes the specified string, inferring the version number.
   * @param {string} str The string to deserialize.
   * @return {*} The deserialized object.
   */
  deserialize(str) {
    const {version, trimmed} = this.getVersionFromSerializedString(str);
    const serializer = this.get(version);
    if (serializer == null) {
      throw new Error(`No serializer found for version ${version}.`);
    }
    return serializer.deserialize(trimmed);
  }

  /**
   * Deserializes the specific string into the specified object, inferring the
   * version number.
   * @param {string} str The string to deserialize.
   * @param {*} object The object to deserialize into.
   */
  deserializeIntoObject(str, object) {
    const {version, trimmed} = this.getVersionFromSerializedString(str);
    const serializer = this.get(version);
    if (serializer == null) {
      throw new Error(`No serializer found for version ${version}.`);
    }
    serializer.deserializeIntoObject(trimmed, object);
  }
}
