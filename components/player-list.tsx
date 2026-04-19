import type { PlayerSummary } from "@/lib/game/types";

interface PlayerListProps {
  players: PlayerSummary[];
  selfId: string | null;
}

export default function PlayerList({ players, selfId }: PlayerListProps) {
  return (
    <section className="ds-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="ds-mono-label mb-2">02 / Session</div>
          <h2 className="text-[28px] font-bold tracking-[-1.2px] text-[var(--foreground)]">
            Players
          </h2>
        </div>
        <span className="ds-mono-label">{players.length} connected</span>
      </div>

      <div className="space-y-3">
        {players.map((player) => (
          <div
            key={player.id}
            className={`flex items-center justify-between rounded-[20px] border border-[var(--border)] bg-[var(--surface-soft)] px-3 py-3 ${
              player.id === selfId
                ? "border-l-[6px] border-l-[var(--accent)] bg-[#fff4f5]"
                : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--surface-circle)] text-xl"
                aria-hidden="true"
              >
                {player.avatar}
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[var(--foreground)]">
                    {player.name}
                  </span>
                  {player.isDrawer ? (
                    <span className="ds-pill bg-[#f7e08b] px-2.5 py-1 text-xs font-semibold text-[#5c4300]">
                      Drawer
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-xs font-medium text-[var(--muted)]">
                  {player.hasGuessedCorrectly ? (
                    <span>Correct guess</span>
                  ) : player.hasSubmittedGuess ? (
                    <span>Guessed</span>
                  ) : (
                    <span>Waiting</span>
                  )}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="ds-mono-label">Score</div>
              <div className="text-xl font-bold text-[var(--foreground)]">
                {player.score}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
