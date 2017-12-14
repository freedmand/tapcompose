import {FunctionEvent, Group, Scheduler, Timing} from './timing.js';

import test from 'ava';

const nullFn = () => {};

test('Timing Basic', (t) => {
  const timing = new Timing(60);
  t.is(timing.getDuration(1), 1000);
  t.is(timing.getDuration(2), 2000);
  t.is(timing.getDuration(0.5), 500);
});

test('Timing Fast', (t) => {
  const timing = new Timing(120);
  t.is(timing.getDuration(1), 500);
  t.is(timing.getDuration(2), 1000);
  t.is(timing.getDuration(0.5), 250);
});

test('Beats Basic', (t) => {
  const timing = new Timing(60);
  t.is(timing.getBeats(1000), 1);
  t.is(timing.getBeats(2000), 2);
  t.is(timing.getBeats(500), 0.5);
});

test('Beats Fast', (t) => {
  const timing = new Timing(120);
  t.is(timing.getBeats(500), 1);
  t.is(timing.getBeats(1000), 2);
  t.is(timing.getBeats(250), 0.5);
});

test('Group Basic', (t) => {
  const event1 = new FunctionEvent(nullFn, 1);
  const event2 = new FunctionEvent(nullFn, 2);
  const group = new Group([event1, event2]);
  const events = Array.from(group.iterate());
  t.is(event1.beats, events[0].beats);
  t.is(event2.beats, events[1].beats);
});

test('Group Nested Simple', (t) => {
  const event1 = new FunctionEvent(nullFn, 1);
  const event2 = new FunctionEvent(nullFn, 2);
  const subgroup = new Group([event1, event2]);
  const group = new Group(subgroup);
  const events = Array.from(group.iterate());
  t.is(event1.beats, events[0].beats);
  t.is(event2.beats, events[1].beats);
});

test('Group Nested Complex', (t) => {
  const event1 = new FunctionEvent(nullFn, 1);
  const event2 = new FunctionEvent(nullFn, 2);
  const subSubgroup = new Group([event1, event2]);
  const event3 = new FunctionEvent(nullFn, 3);
  const event4 = new FunctionEvent(nullFn, 4);
  const subGroup = new Group(subSubgroup);
  subGroup.addEvent(event3);
  subGroup.addEvent(event4);
  const group = new Group(subGroup);
  const event5 = new FunctionEvent(nullFn, 5);
  group.addEvent(event5);
  const events = Array.from(group.iterate());
  t.is(event5.beats, events[0].beats);
  t.is(event3.beats, events[1].beats);
  t.is(event4.beats, events[2].beats);
  t.is(event1.beats, events[3].beats);
  t.is(event2.beats, events[4].beats);
});

test('Group Nested Timing', (t) => {
  const event1 = new FunctionEvent(nullFn, 0);
  const event2 = new FunctionEvent(nullFn, 0);

  const subSubGroup1 = new Group(event1, 0);
  const subSubGroup2 = new Group(event2, 0);

  const subGroup1 = new Group(subSubGroup1, 0);
  const subGroup2 = new Group(subSubGroup2, 16);

  const topGroup = new Group([subGroup1, subGroup2], 0);
  const events = Array.from(topGroup.iterate());
  t.is(events[0].beats, 0);
  t.is(events[1].beats, 16);
});
