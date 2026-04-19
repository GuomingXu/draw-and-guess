export type GamePhase =
  | "waiting"
  | "round_announce"
  | "drawing"
  | "guessing"
  | "round_end";

export type RoundEndReason = "completed" | "drawer_disconnected";

export interface Point {
  x: number;
  y: number;
}

export interface ClientStrokeInput {
  points: Point[];
}

export interface Stroke {
  id: string;
  playerId: string;
  points: Point[];
  color: string;
  width: number;
  createdAt: number;
}

export interface PlayerIdentity {
  id: string;
  name: string;
  avatar: string;
}

export interface PlayerSummary extends PlayerIdentity {
  score: number;
  isDrawer: boolean;
  hasGuessedCorrectly: boolean;
  hasSubmittedGuess: boolean;
}

export interface RoundResult {
  word: string;
  drawerId: string | null;
  correctGuesserIds: string[];
  endedBecause: RoundEndReason;
}

export interface GameSnapshot {
  selfId: string;
  phase: GamePhase;
  roundNumber: number;
  phaseEndsAt: number | null;
  minPlayers: number;
  connectedPlayerCount: number;
  canStart: boolean;
  currentDrawerId: string | null;
  players: PlayerSummary[];
  strokes: Stroke[];
  yourSecretWord: string | null;
  revealedWord: string | null;
  lastRoundResult: RoundResult | null;
}

export interface PlayerState extends PlayerIdentity {
  socketId: string;
  score: number;
}
