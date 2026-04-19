import type {
  ClientStrokeInput,
  GameSnapshot,
  PlayerIdentity,
  Stroke,
} from "../game/types";

export interface ClientToServerEvents {
  "game:start": () => void;
  "draw:stroke": (stroke: ClientStrokeInput) => void;
  "guess:submit": (payload: { text: string }) => void;
}

export interface ServerToClientEvents {
  "session:joined": (payload: PlayerIdentity) => void;
  "game:snapshot": (payload: GameSnapshot) => void;
  "canvas:stroke": (payload: Stroke) => void;
  "system:error": (payload: { message: string }) => void;
}
