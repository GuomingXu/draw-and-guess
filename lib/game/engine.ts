import { randomUUID } from "node:crypto";

import { CANVAS, MIN_PLAYERS, PHASE_DURATIONS_MS, SCORE_VALUES } from "./constants";
import { generatePlayerIdentity } from "./identity";
import { normalizeGuess } from "./normalize";
import { pickRandomWord } from "./words";
import type {
  ClientStrokeInput,
  GamePhase,
  GameSnapshot,
  PlayerIdentity,
  PlayerState,
  PlayerSummary,
  RoundEndReason,
  RoundResult,
  Stroke,
} from "./types";

type EngineEvent =
  | { type: "state_changed" }
  | { type: "stroke_created"; stroke: Stroke };

interface GuessResult {
  ok: boolean;
  error?: string;
}

interface StartResult {
  ok: boolean;
  error?: string;
}

interface InternalRoundState {
  drawerId: string | null;
  secretWord: string | null;
  strokes: Stroke[];
  correctGuesserIds: Set<string>;
  submittedGuessPlayerIds: Set<string>;
}

export class GameEngine {
  private phase: GamePhase = "waiting";
  private phaseEndsAt: number | null = null;
  private roundNumber = 0;
  private players: PlayerState[] = [];
  private round: InternalRoundState = this.createEmptyRound();
  private lastRoundResult: RoundResult | null = null;
  private lastDrawerId: string | null = null;
  private timer: NodeJS.Timeout | null = null;
  private listeners = new Set<(event: EngineEvent) => void>();

  subscribe(listener: (event: EngineEvent) => void): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  addPlayer(socketId: string): PlayerIdentity {
    const existingNames = new Set(this.players.map((player) => player.name));
    const identity = generatePlayerIdentity(existingNames);
    const player: PlayerState = {
      id: randomUUID(),
      socketId,
      name: identity.name,
      avatar: identity.avatar,
      score: 0,
    };

    this.players.push(player);
    this.emit({ type: "state_changed" });

    return {
      id: player.id,
      name: player.name,
      avatar: player.avatar,
    };
  }

  removePlayer(playerId: string): void {
    const playerIndex = this.players.findIndex((player) => player.id === playerId);

    if (playerIndex === -1) {
      return;
    }

    const wasDrawer = this.round.drawerId === playerId;

    this.players.splice(playerIndex, 1);
    this.round.correctGuesserIds.delete(playerId);
    this.round.submittedGuessPlayerIds.delete(playerId);

    if (this.players.length === 0) {
      this.resetToWaiting();
      return;
    }

    if (wasDrawer && this.phase !== "waiting") {
      this.finishRound("drawer_disconnected");
      return;
    }

    this.emit({ type: "state_changed" });
  }

  startGame(): StartResult {
    if (this.phase !== "waiting") {
      return { ok: false, error: "The game is already in progress." };
    }

    if (this.players.length < MIN_PLAYERS) {
      return {
        ok: false,
        error: `Need at least ${MIN_PLAYERS} players to start.`,
      };
    }

    this.startNextRound();
    return { ok: true };
  }

  submitStroke(playerId: string, input: ClientStrokeInput): GuessResult {
    if (this.phase !== "drawing") {
      return { ok: false, error: "Drawing is only allowed during the drawing phase." };
    }

    if (this.round.drawerId !== playerId) {
      return { ok: false, error: "Only the current drawer can draw." };
    }

    if (input.points.length < 2) {
      return { ok: false, error: "A stroke needs at least two points." };
    }

    const stroke: Stroke = {
      id: randomUUID(),
      clientStrokeId: input.clientStrokeId,
      playerId,
      points: input.points,
      color: CANVAS.strokeColor,
      width: CANVAS.strokeWidth,
      createdAt: Date.now(),
    };

    this.round.strokes.push(stroke);
    this.emit({ type: "stroke_created", stroke });

    return { ok: true };
  }

  submitGuess(playerId: string, guessText: string): GuessResult {
    if (this.phase !== "guessing") {
      return { ok: false, error: "Guessing is not open right now." };
    }

    if (this.round.drawerId === playerId) {
      return { ok: false, error: "The drawer cannot submit guesses." };
    }

    const normalizedGuess = normalizeGuess(guessText);

    if (!normalizedGuess) {
      return { ok: false, error: "Guess cannot be empty." };
    }

    this.round.submittedGuessPlayerIds.add(playerId);

    if (normalizedGuess === normalizeGuess(this.round.secretWord ?? "")) {
      this.round.correctGuesserIds.add(playerId);
    }

    this.emit({ type: "state_changed" });

    return { ok: true };
  }

  getPlayers(): PlayerState[] {
    return [...this.players];
  }

  getSnapshot(viewerId: string): GameSnapshot {
    const players: PlayerSummary[] = this.players.map((player) => ({
      id: player.id,
      name: player.name,
      avatar: player.avatar,
      score: player.score,
      isDrawer: player.id === this.round.drawerId,
      hasGuessedCorrectly: this.round.correctGuesserIds.has(player.id),
      hasSubmittedGuess: this.round.submittedGuessPlayerIds.has(player.id),
    }));

    const showPrivateWord =
      viewerId === this.round.drawerId &&
      this.round.secretWord !== null &&
      this.phase !== "waiting";

    return {
      selfId: viewerId,
      phase: this.phase,
      roundNumber: this.roundNumber,
      phaseEndsAt: this.phaseEndsAt,
      minPlayers: MIN_PLAYERS,
      connectedPlayerCount: this.players.length,
      canStart: this.phase === "waiting" && this.players.length >= MIN_PLAYERS,
      currentDrawerId: this.round.drawerId,
      players,
      strokes: [...this.round.strokes],
      yourSecretWord: showPrivateWord ? this.round.secretWord : null,
      lastRoundResult: this.lastRoundResult,
    };
  }

  private emit(event: EngineEvent): void {
    for (const listener of this.listeners) {
      listener(event);
    }
  }

  private createEmptyRound(): InternalRoundState {
    return {
      drawerId: null,
      secretWord: null,
      strokes: [],
      correctGuesserIds: new Set(),
      submittedGuessPlayerIds: new Set(),
    };
  }

  private startNextRound(): void {
    this.clearTimer();

    if (this.players.length < MIN_PLAYERS) {
      this.resetToWaiting();
      return;
    }

    const drawerId = this.pickNextDrawerId();
    const secretWord = pickRandomWord();

    this.roundNumber += 1;
    this.round = {
      drawerId,
      secretWord,
      strokes: [],
      correctGuesserIds: new Set(),
      submittedGuessPlayerIds: new Set(),
    };
    this.lastRoundResult = null;
    this.lastDrawerId = drawerId;
    this.phase = "drawing";
    this.phaseEndsAt = Date.now() + PHASE_DURATIONS_MS.drawing;
    this.emit({ type: "state_changed" });
    this.schedulePhaseTransition(
      PHASE_DURATIONS_MS.drawing,
      () => this.enterGuessingPhase(),
    );
  }

  private pickNextDrawerId(): string {
    if (this.players.length === 0) {
      throw new Error("Cannot pick a drawer without players.");
    }

    if (!this.lastDrawerId) {
      return this.players[Math.floor(Math.random() * this.players.length)].id;
    }

    const lastIndex = this.players.findIndex(
      (player) => player.id === this.lastDrawerId,
    );

    if (lastIndex === -1) {
      return this.players[0].id;
    }

    const nextIndex = (lastIndex + 1) % this.players.length;
    return this.players[nextIndex].id;
  }

  private enterGuessingPhase(): void {
    if (this.phase !== "drawing") {
      return;
    }

    this.phase = "guessing";
    this.phaseEndsAt = Date.now() + PHASE_DURATIONS_MS.guessing;
    this.emit({ type: "state_changed" });
    this.schedulePhaseTransition(
      PHASE_DURATIONS_MS.guessing,
      () => this.finishRound("completed"),
    );
  }

  private finishRound(endedBecause: RoundEndReason): void {
    if (this.phase === "waiting") {
      return;
    }

    this.clearTimer();
    this.applyRoundScoring();
    this.lastRoundResult = {
      word: this.round.secretWord ?? "",
      drawerId: this.round.drawerId,
      correctGuesserIds: [...this.round.correctGuesserIds],
      endedBecause,
    };
    this.resetToWaiting({ preserveLastRoundResult: true });
  }

  private applyRoundScoring(): void {
    for (const playerId of this.round.correctGuesserIds) {
      const player = this.players.find((entry) => entry.id === playerId);

      if (player) {
        player.score += SCORE_VALUES.correctGuess;
      }
    }

    if (this.round.correctGuesserIds.size === 0 || !this.round.drawerId) {
      return;
    }

    const drawer = this.players.find((entry) => entry.id === this.round.drawerId);

    if (drawer) {
      drawer.score += SCORE_VALUES.drawerWithCorrectGuess;
    }
  }

  private resetToWaiting(options?: { preserveLastRoundResult?: boolean }): void {
    this.clearTimer();
    this.phase = "waiting";
    this.phaseEndsAt = null;
    this.round = this.createEmptyRound();

    if (!options?.preserveLastRoundResult) {
      this.lastRoundResult = null;
    }

    this.emit({ type: "state_changed" });
  }

  private schedulePhaseTransition(delayMs: number, callback: () => void): void {
    this.clearTimer();
    this.timer = setTimeout(() => {
      this.timer = null;
      callback();
    }, delayMs);
  }

  private clearTimer(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }
}
