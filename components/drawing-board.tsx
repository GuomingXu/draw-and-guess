"use client";

import { useEffect, useMemo, useRef, type MutableRefObject } from "react";

import { CANVAS } from "@/lib/game/constants";
import type {
  ClientStrokeInput,
  GamePhase,
  Point,
  Stroke,
} from "@/lib/game/types";

const STROKE_FLUSH_INTERVAL_MS = 33;

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
  const pendingStrokePointsRef = useRef<Point[]>([]);
  const flushTimerRef = useRef<number | null>(null);
  const renderedStrokeIdsRef = useRef<string[]>([]);
  const optimisticStrokeIdsRef = useRef<Set<string>>(new Set());

  const canvasCursor = useMemo(() => {
    if (isFrozen || !isActiveDrawer) {
      return "default";
    }

    return "crosshair";
  }, [isActiveDrawer, isFrozen]);

  useEffect(() => {
    const context = getCanvasContext(canvasRef.current);

    if (!context) {
      return;
    }

    const previousRenderedStrokeIds = renderedStrokeIdsRef.current;
    const requiresFullRedraw =
      strokes.length < previousRenderedStrokeIds.length ||
      previousRenderedStrokeIds.some((strokeId, index) => strokes[index]?.id !== strokeId);

    if (requiresFullRedraw) {
      context.clearRect(0, 0, CANVAS.width, CANVAS.height);

      for (const stroke of strokes) {
        if (optimisticStrokeIdsRef.current.has(stroke.clientStrokeId)) {
          optimisticStrokeIdsRef.current.delete(stroke.clientStrokeId);
          continue;
        }

        drawStroke(context, stroke);
      }
    } else {
      for (const stroke of strokes.slice(previousRenderedStrokeIds.length)) {
        if (optimisticStrokeIdsRef.current.has(stroke.clientStrokeId)) {
          optimisticStrokeIdsRef.current.delete(stroke.clientStrokeId);
          continue;
        }

        drawStroke(context, stroke);
      }
    }

    renderedStrokeIdsRef.current = strokes.map((stroke) => stroke.id);
  }, [strokes]);

  useEffect(() => {
    return () => {
      clearScheduledFlush(flushTimerRef);
    };
  }, []);

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
    const startPoint = getCanvasPoint(event);
    previousPointRef.current = startPoint;
    pendingStrokePointsRef.current = [startPoint];
    event.currentTarget.setPointerCapture(event.pointerId);
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

    const context = getCanvasContext(canvasRef.current);

    if (context) {
      drawStroke(context, {
        id: "local-preview",
        clientStrokeId: "local-preview",
        playerId: "local-preview",
        points: [previousPoint, nextPoint],
        color: CANVAS.strokeColor,
        width: CANVAS.strokeWidth,
        createdAt: Date.now(),
      });
    }

    pendingStrokePointsRef.current.push(nextPoint);
    scheduleStrokeFlush(flushTimerRef, pendingStrokePointsRef, optimisticStrokeIdsRef, onStroke);
    previousPointRef.current = nextPoint;
  };

  const finishStroke = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) {
      return;
    }

    drawingRef.current = false;
    previousPointRef.current = null;
    flushPendingStroke(pendingStrokePointsRef, flushTimerRef, optimisticStrokeIdsRef, onStroke);
    pendingStrokePointsRef.current = [];

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
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
        onPointerCancel={finishStroke}
        className="h-auto w-full touch-none rounded-[20px] border border-[var(--border)] bg-[var(--surface-soft)]"
        style={{ cursor: canvasCursor, aspectRatio: `${CANVAS.width} / ${CANVAS.height}` }}
      />
    </section>
  );
}

function getCanvasContext(canvas: HTMLCanvasElement | null) {
  const context = canvas?.getContext("2d");

  if (!context) {
    return null;
  }

  context.lineCap = "round";
  context.lineJoin = "round";
  return context;
}

function scheduleStrokeFlush(
  flushTimerRef: MutableRefObject<number | null>,
  pendingStrokePointsRef: MutableRefObject<Point[]>,
  optimisticStrokeIdsRef: MutableRefObject<Set<string>>,
  onStroke: (stroke: ClientStrokeInput) => void,
) {
  if (flushTimerRef.current !== null) {
    return;
  }

  flushTimerRef.current = window.setTimeout(() => {
    flushPendingStroke(
      pendingStrokePointsRef,
      flushTimerRef,
      optimisticStrokeIdsRef,
      onStroke,
      true,
    );
  }, STROKE_FLUSH_INTERVAL_MS);
}

function flushPendingStroke(
  pendingStrokePointsRef: MutableRefObject<Point[]>,
  flushTimerRef: MutableRefObject<number | null>,
  optimisticStrokeIdsRef: MutableRefObject<Set<string>>,
  onStroke: (stroke: ClientStrokeInput) => void,
  keepTrailingPoint = false,
) {
  clearScheduledFlush(flushTimerRef);

  const points = pendingStrokePointsRef.current;

  if (points.length >= 2) {
    const clientStrokeId = crypto.randomUUID();
    optimisticStrokeIdsRef.current.add(clientStrokeId);
    onStroke({ clientStrokeId, points });
  }

  const trailingPoint = points.at(-1);

  pendingStrokePointsRef.current =
    keepTrailingPoint && trailingPoint ? [trailingPoint] : [];
}

function clearScheduledFlush(flushTimerRef: MutableRefObject<number | null>) {
  if (flushTimerRef.current !== null) {
    window.clearTimeout(flushTimerRef.current);
    flushTimerRef.current = null;
  }
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
