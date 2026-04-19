export const MIN_PLAYERS = 3;

export const PHASE_DURATIONS_MS = {
  drawing: 15_000,
  guessing: 15_000,
} as const;

export const SCORE_VALUES = {
  correctGuess: 10,
  drawerWithCorrectGuess: 5,
} as const;

export const CANVAS = {
  width: 800,
  height: 500,
  strokeColor: "#111111",
  strokeWidth: 4,
} as const;
