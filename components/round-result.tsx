import type { PlayerSummary, RoundResult } from "@/lib/game/types";

interface RoundResultProps {
  result: RoundResult | null;
  players: PlayerSummary[];
}

export default function RoundResult({
  result,
  players,
}: RoundResultProps) {
  if (!result) {
    return null;
  }

  const correctGuessers = players.filter((player) =>
    result.correctGuesserIds.includes(player.id),
  );

  return (
    <section className="rounded-[20px] bg-[var(--surface)] px-5 py-1">
      <p className="text-center text-sm leading-6 text-[var(--muted)]">
        <span className="font-semibold text-[var(--foreground)]">Round result:</span>{" "}
        Answer{" "}
        <span className="font-bold text-[var(--foreground)]">{result.word}</span>.{" "}
        {correctGuessers.length > 0
          ? `Correct guessers: ${correctGuessers
              .map((player) => player.name)
              .join(", ")}.`
          : "No one guessed it this round."}{" "}
        {result.endedBecause === "drawer_disconnected"
          ? "The round ended early because the drawer disconnected."
          : ""}
      </p>
    </section>
  );
}
