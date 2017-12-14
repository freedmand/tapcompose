import {HOLD, OFF, ON} from './arpeggiator.js';

export const WATERFALL = [
  [0, 0, [ON  , HOLD, HOLD, HOLD, HOLD, HOLD, HOLD, HOLD]],
  [1, 0, [OFF , ON  , OFF , ON  , OFF , OFF , OFF , ON  ]],
  [2, 0, [OFF , OFF , ON  , OFF , ON  , OFF , ON  , OFF ]],
  [3, 0, [OFF , OFF , OFF , OFF , OFF , ON  , OFF , OFF ]],
];

export const PERSISTENCE = [
  [0, -1, [ON  , OFF , ON  , OFF , ON  , OFF , ON  , OFF ]],
  [0,  0, [ON  , OFF , ON  , OFF , ON  , OFF , ON  , OFF ]],
  [1,  0, [ON  , OFF , ON  , OFF , ON  , OFF , ON  , OFF ]],
  [2,  0, [ON  , OFF , ON  , OFF , ON  , OFF , ON  , OFF ]],
  [3,  0, [ON  , OFF , ON  , OFF , ON  , OFF , ON  , OFF ]],
];

export const KLEZ = [
  [0, -1, [ON  , HOLD, OFF , OFF , ON  , HOLD, OFF , OFF , ON  , HOLD, OFF , OFF , ON  , HOLD, OFF , OFF ]],
  [0,  0, [OFF , OFF , ON  , ON  , OFF , OFF , ON  , HOLD, OFF , OFF , ON  , HOLD, OFF , OFF , ON  , HOLD]],
  [1,  0, [OFF , OFF , ON  , ON  , OFF , OFF , ON  , HOLD, OFF , OFF , ON  , HOLD, OFF , OFF , ON  , HOLD]],
  [2,  0, [OFF , OFF , ON  , ON  , OFF , OFF , ON  , HOLD, OFF , OFF , ON  , HOLD, OFF , OFF , ON  , HOLD]],
  [3,  0, [OFF , OFF , ON  , ON  , OFF , OFF , ON  , HOLD, OFF , OFF , ON  , HOLD, OFF , OFF , ON  , HOLD]],
];

export const TWINKLE = [
  [0, -1, [ON  , HOLD, HOLD, HOLD, HOLD, HOLD, HOLD, HOLD]],
  [2, -1, [ON  , OFF , ON  , OFF , ON  , OFF , ON  , OFF ]],
  [1,  0, [OFF , ON  , OFF , ON  , OFF , ON  , OFF , ON  ]],
  [0,  1, [ON  , HOLD, HOLD, HOLD, HOLD, HOLD, HOLD, HOLD]],
];

export const RAPID = [
  [0, -1, [ON  , HOLD, HOLD, HOLD, ON  , HOLD, HOLD, HOLD]],
  [0,  0, [ON  , ON  , OFF , ON  , ON  , ON  , OFF , ON ]],
  [1,  0, [ON  , OFF , ON  , OFF , ON  , OFF , ON  , OFF]],
  [2,  0, [ON  , ON  , OFF , ON  , ON  , ON  , OFF , ON ]],
  [3,  0, [ON  , OFF , ON  , OFF , ON  , OFF , ON  , OFF]],
];
