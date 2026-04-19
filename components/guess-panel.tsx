import { useMemo, useState } from "react";

import type { GamePhase } from "@/lib/game/types";

interface GuessPanelProps {
  phase: GamePhase;
  roundNumber: number;
  isDrawer: boolean;
  canGuess: boolean;
  onStart: () => void;
  onGuessSubmit: (text: string) => void;
  canStart: boolean;
  minPlayers: number;
  connectedPlayerCount: number;
}

export default function GuessPanel({
  phase,
  roundNumber,
  isDrawer,
  canGuess,
  onStart,
  onGuessSubmit,
  canStart,
  minPlayers,
  connectedPlayerCount,
}: GuessPanelProps) {
  const [guess, setGuess] = useState("");

  const helper = useMemo(() => {
    if (phase === "waiting") {
      return connectedPlayerCount >= minPlayers
        ? "Any player can start the next round."
        : `Waiting for at least ${minPlayers} players.`;
    }

    if (phase === "drawing") {
      return isDrawer
        ? "Draw without words or numbers."
        : "Watch the canvas. Guessing opens after drawing ends.";
    }

    if (phase === "guessing") {
      return isDrawer
        ? "Sit tight while everyone else submits guesses."
        : "Submit your best guess before time runs out.";
    }

    return "The round is in progress.";
  }, [connectedPlayerCount, isDrawer, minPlayers, phase]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!guess.trim()) {
      return;
    }

    onGuessSubmit(guess);
    setGuess("");
  };

  return (
    <section className="ds-card p-5">
      <div className="mb-3 flex items-start justify-between gap-4">
        <div>
          <div className="ds-mono-label mb-2">01 / Controls</div>
          <h2 className="text-[28px] font-bold tracking-[-1.2px] text-[var(--foreground)]">
            Play
          </h2>
        </div>
        <div className="shrink-0 text-right">
          <div className="ds-mono-label mb-2">Players</div>
          <div className="text-[28px] font-semibold tracking-[-1px] text-[var(--foreground)]">
            {connectedPlayerCount}/{minPlayers}
          </div>
        </div>
      </div>

      <p className="mb-5 text-base leading-6 text-[var(--muted)]">
        {helper}
      </p>

      {phase === "waiting" ? (
        <button
          type="button"
          onClick={onStart}
          disabled={!canStart}
          className="ds-button-primary w-full"
        >
          {roundNumber > 0 ? "Start next round" : "Start game"}
        </button>
      ) : null}

      {phase === "guessing" ? (
        <form className="space-y-3" onSubmit={handleSubmit}>
          <input
            value={guess}
            onChange={(event) => setGuess(event.target.value)}
            disabled={!canGuess}
            placeholder={canGuess ? "Type your guess" : "Guessing unavailable"}
            className="ds-input"
          />
          <button
            type="submit"
            disabled={!canGuess}
            className="ds-button-primary w-full"
          >
            Submit guess
          </button>
        </form>
      ) : null}
    </section>
  );
}
