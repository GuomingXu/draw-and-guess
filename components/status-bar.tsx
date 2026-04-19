import type { GamePhase } from "@/lib/game/types";

interface StatusBarProps {
  phase: GamePhase;
  roundNumber: number;
  connectedPlayerCount: number;
  minPlayers: number;
  phaseSecondsLeft: number | null;
  currentDrawerName: string | null;
  connectionLabel: string;
}

const PHASE_LABELS: Record<GamePhase, string> = {
  waiting: "Waiting",
  round_announce: "Round announce",
  drawing: "Drawing",
  guessing: "Guessing",
  round_end: "Round end",
};

export default function StatusBar({
  phase,
  roundNumber,
  connectedPlayerCount,
  minPlayers,
  phaseSecondsLeft,
  currentDrawerName,
  connectionLabel,
}: StatusBarProps) {
  return (
    <section className="flex flex-nowrap items-center gap-3 overflow-x-auto rounded-[20px] bg-[var(--surface)] px-3 py-2">
      <StatusItem label="Phase" value={PHASE_LABELS[phase]} />
      <StatusItem label="Round" value={roundNumber > 0 ? String(roundNumber) : "-"} />
      <StatusItem
        label="Timer"
        value={phaseSecondsLeft === null ? "-" : `${phaseSecondsLeft}s`}
      />
      <StatusItem label="Connection" value={connectionLabel} />
      <StatusItem
        label="Players"
        value={`${connectedPlayerCount}/${minPlayers} minimum`}
      />
      <StatusItem label="Drawer" value={currentDrawerName ?? "TBD"} />
    </section>
  );
}

function StatusItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="ds-glass flex shrink-0 items-center gap-2 whitespace-nowrap rounded-[16px] px-3 py-1.5">
      <span className="ds-mono-label">{label}</span>
      <span className="text-sm font-semibold text-[var(--foreground)]">{value}</span>
    </div>
  );
}
