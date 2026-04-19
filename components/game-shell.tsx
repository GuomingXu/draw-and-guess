"use client";

import { useEffect, useMemo, useState } from "react";

import DrawingBoard from "@/components/drawing-board";
import GuessPanel from "@/components/guess-panel";
import PlayerList from "@/components/player-list";
import RoundResult from "@/components/round-result";
import { getSocket } from "@/lib/socket/client";
import type {
  ClientStrokeInput,
  GameSnapshot,
  PlayerIdentity,
  Stroke,
} from "@/lib/game/types";

export default function GameShell() {
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [self, setSelf] = useState<PlayerIdentity | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const socket = getSocket();

    const handleConnect = () => {
      setError(null);
    };

    const handleJoined = (payload: PlayerIdentity) => {
      setSelf(payload);
    };

    const handleSnapshot = (nextSnapshot: GameSnapshot) => {
      setSnapshot(nextSnapshot);
    };

    const handleStroke = (stroke: Stroke) => {
      setSnapshot((current) => {
        if (!current || current.strokes.some((entry) => entry.id === stroke.id)) {
          return current;
        }

        return {
          ...current,
          strokes: [...current.strokes, stroke],
        };
      });
    };

    const handleError = (payload: { message: string }) => {
      setError(payload.message);
    };

    socket.on("connect", handleConnect);
    socket.on("session:joined", handleJoined);
    socket.on("game:snapshot", handleSnapshot);
    socket.on("canvas:stroke", handleStroke);
    socket.on("system:error", handleError);
    socket.connect();

    return () => {
      socket.off("connect", handleConnect);
      socket.off("session:joined", handleJoined);
      socket.off("game:snapshot", handleSnapshot);
      socket.off("canvas:stroke", handleStroke);
      socket.off("system:error", handleError);
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNow(Date.now());
    }, 250);

    return () => {
      window.clearInterval(interval);
    };
  }, []);

  const phaseSecondsLeft = useMemo(() => {
    if (!snapshot?.phaseEndsAt) {
      return null;
    }

    return Math.max(0, Math.ceil((snapshot.phaseEndsAt - now) / 1000));
  }, [now, snapshot?.phaseEndsAt]);

  const selfPlayer = useMemo(() => {
    const selfId = snapshot?.selfId ?? self?.id;

    if (!snapshot || !selfId) {
      return null;
    }

    return snapshot.players.find((player) => player.id === selfId) ?? null;
  }, [self?.id, snapshot]);

  const canGuess =
    snapshot?.phase === "guessing" &&
    !!selfPlayer &&
    !selfPlayer.isDrawer &&
    !selfPlayer.hasGuessedCorrectly;

  const canDraw = snapshot?.phase === "drawing" && !!selfPlayer?.isDrawer;

  const handleStartGame = () => {
    getSocket().emit("game:start");
  };

  const handleGuessSubmit = (text: string) => {
    getSocket().emit("guess:submit", { text });
  };

  const handleStroke = (stroke: ClientStrokeInput) => {
    getSocket().volatile.emit("draw:stroke", stroke);
  };

  return (
    <main className="min-h-screen bg-[var(--background)] px-4 py-4 text-[var(--foreground)] md:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
        <header className="rounded-[20px] bg-[var(--surface)] px-5 py-3">
          <div>
            <div>
              <h1 className="text-4xl font-semibold leading-[1.1] md:text-[56px]">
                Draw, and Guess
              </h1>
              <p className="mt-2 max-w-3xl text-base leading-6 text-[var(--muted)]">
                Join instantly, wait for at least three players, then rotate
                turns between drawing and guessing.
              </p>
            </div>
          </div>
        </header>

        {snapshot ? (
          <>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-2">
                {error ? (
                  <div className="ds-card px-4 py-3 text-sm text-[var(--foreground)]">
                    {error}
                  </div>
                ) : null}

                <DrawingBoard
                  strokes={snapshot.strokes}
                  phase={snapshot.phase}
                  phaseSecondsLeft={phaseSecondsLeft}
                  secretWord={snapshot.yourSecretWord}
                  isActiveDrawer={!!canDraw}
                  isFrozen={snapshot.phase !== "drawing"}
                  onStroke={handleStroke}
                />

                <RoundResult
                  result={snapshot.lastRoundResult}
                  players={snapshot.players}
                />
              </div>

              <div className="space-y-6">
                <GuessPanel
                  phase={snapshot.phase}
                  roundNumber={snapshot.roundNumber}
                  isDrawer={!!selfPlayer?.isDrawer}
                  canGuess={!!canGuess}
                  onStart={handleStartGame}
                  onGuessSubmit={handleGuessSubmit}
                  canStart={snapshot.canStart}
                  minPlayers={snapshot.minPlayers}
                  connectedPlayerCount={snapshot.connectedPlayerCount}
                />
                <PlayerList players={snapshot.players} selfId={snapshot.selfId} />
              </div>
            </div>
          </>
        ) : (
          <div className="ds-card px-4 py-6 text-sm text-[var(--muted)]">
            Joining the live session...
          </div>
        )}
      </div>
    </main>
  );
}
