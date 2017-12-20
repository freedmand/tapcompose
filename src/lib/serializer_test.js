import {SerializationDictionary, VersionedSerializer} from './serializer.js';

import test from 'ava';

class StringArraySerializerV1 extends VersionedSerializer {
  constructor() {
    super();
    this.version = 'v1';
  }

  serialize(stringArray) {
    return stringArray.map((x) => x).join(',');
  }

  deserialize(str) {
    return str.split(',');
  }
}

class StringArraySerializerV2 extends VersionedSerializer {
  constructor() {
    super();
    this.version = 'v2';
  }

  serialize(stringArray) {
    return '[' + stringArray.map((x) => x).join(',') + ']';
  }

  deserialize(str) {
    return str.substring(1, str.length - 1).split(',');
  }
}

test('Basic serialization', (t) => {
  const serializer = new StringArraySerializerV1();
  t.is(serializer.serialize(['a', 'b', 'c']), 'a,b,c');
});

test('Basic deserialization', (t) => {
  const serializer = new StringArraySerializerV1();
  t.deepEqual(serializer.deserialize('a,b,c'), ['a','b','c']);
});

test('Versioned serialization', (t) => {
  const dictionary = new SerializationDictionary([
    new StringArraySerializerV1(),
    new StringArraySerializerV2(),
  ]);

  t.is(dictionary.serialize(['a', 'b', 'c'], 'v1'), 'v1|a,b,c');
  t.is(dictionary.serialize(['a', 'b', 'c'], 'v2'), 'v2|[a,b,c]');
});

test('Versioned serialization not found', (t) => {
  const dictionary = new SerializationDictionary([
    new StringArraySerializerV1(),
    new StringArraySerializerV2(),
  ]);

  t.throws(() => dictionary.serialize(['a', 'b', 'c'], 'v3'));
});

test('Versioned deserialization', (t) => {
  const dictionary = new SerializationDictionary([
    new StringArraySerializerV1(),
    new StringArraySerializerV2(),
  ]);

  t.deepEqual(dictionary.deserialize('v1|a,b,c'), ['a', 'b', 'c']);
  t.deepEqual(dictionary.deserialize('v2|[a,b,c]'), ['a', 'b', 'c']);
});

test('Versioned deserialization not found', (t) => {
  const dictionary = new SerializationDictionary([
    new StringArraySerializerV1(),
    new StringArraySerializerV2(),
  ]);

  t.throws(() => dictionary.deserialize('v3|a,b,c'));
});

