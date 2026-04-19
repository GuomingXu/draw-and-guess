"use client";

import { useEffect, useMemo, useRef } from "react";

import { CANVAS } from "@/lib/game/constants";
import type { ClientStrokeInput, GamePhase, Stroke } from "@/lib/game/types";

interface DrawingBoardProps {
  strokes: Stroke[];
  phase: GamePhase;
  phaseSecondsLeft: number | null;
  secretWord: string | null;
  isActiveDrawer: boolean;
  isFrozen: boolean;
  onStroke: (stroke: ClientStrokeInput) => void;
}

export default function DrawingBoard({
  strokes,
  phase,
  phaseSecondsLeft,
  secretWord,
  isActiveDrawer,
  isFrozen,
  onStroke,
}: DrawingBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);
  const previousPointRef = useRef<{ x: number; y: number } | null>(null);

  const canvasCursor = useMemo(() => {
    if (isFrozen || !isActiveDrawer) {
      return "default";
    }

    return "crosshair";
  }, [isActiveDrawer, isFrozen]);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");

    if (!context) {
      return;
    }

    context.clearRect(0, 0, CANVAS.width, CANVAS.height);
    context.lineCap = "round";
    context.lineJoin = "round";

    for (const stroke of strokes) {
      drawStroke(context, stroke);
    }
  }, [strokes]);

  const getCanvasPoint = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const scaleX = CANVAS.width / rect.width;
    const scaleY = CANVAS.height / rect.height;

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (isFrozen || !isActiveDrawer) {
      return;
    }

    drawingRef.current = true;
    previousPointRef.current = getCanvasPoint(event);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current || isFrozen || !isActiveDrawer) {
      return;
    }

    const nextPoint = getCanvasPoint(event);
    const previousPoint = previousPointRef.current;

    if (!previousPoint) {
      previousPointRef.current = nextPoint;
      return;
    }

    const segment = {
      points: [previousPoint, nextPoint],
    };

    const context = canvasRef.current?.getContext("2d");

    if (context) {
      drawStroke(context, {
        id: "local",
        playerId: "local",
        points: segment.points,
        color: CANVAS.strokeColor,
        width: CANVAS.strokeWidth,
        createdAt: Date.now(),
      });
    }

    onStroke(segment);
    previousPointRef.current = nextPoint;
  };

  const finishStroke = () => {
    drawingRef.current = false;
    previousPointRef.current = null;
  };

  return (
    <section className="rounded-[20px] bg-[var(--surface)] p-5">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="ds-mono-label mb-2">
            {secretWord ? "Secret word" : "Live canvas"}
          </div>
          {secretWord ? (
            <div className="text-[32px] font-bold leading-none tracking-[-1.2px] text-[var(--accent)] md:text-[40px]">
              {secretWord}
            </div>
          ) : phase === "guessing" ? (
            <div className="text-base font-semibold text-[var(--foreground)]">
              Guessing
            </div>
          ) : phase === "drawing" ? (
            <div className="text-base font-semibold text-[var(--foreground)]">
              Watch the drawing
            </div>
          ) : null}
        </div>
        {phase !== "waiting" ? (
          <div className="shrink-0 text-right">
            <div className="ds-mono-label mb-2">Timer</div>
            <div className="text-2xl font-bold leading-none text-[var(--foreground)]">
              {phaseSecondsLeft === null ? "-" : `${phaseSecondsLeft}s`}
            </div>
          </div>
        ) : (
          <span className="ds-mono-label">
            {isActiveDrawer && !isFrozen ? "You can draw" : "Read only"}
          </span>
        )}
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS.width}
        height={CANVAS.height}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishStroke}
        onPointerLeave={finishStroke}
        className="h-auto w-full touch-none rounded-[20px] border border-[var(--border)] bg-[var(--surface-soft)]"
        style={{ cursor: canvasCursor, aspectRatio: `${CANVAS.width} / ${CANVAS.height}` }}
      />
    </section>
  );
}

function drawStroke(context: CanvasRenderingContext2D, stroke: Stroke) {
  if (stroke.points.length < 2) {
    return;
  }

  context.strokeStyle = stroke.color;
  context.lineWidth = stroke.width;
  context.beginPath();
  context.moveTo(stroke.points[0].x, stroke.points[0].y);

  for (let index = 1; index < stroke.points.length; index += 1) {
    context.lineTo(stroke.points[index].x, stroke.points[index].y);
  }

  context.stroke();
}
