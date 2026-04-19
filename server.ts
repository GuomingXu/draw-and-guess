import { createServer } from "node:http";

import next from "next";
import { Server as SocketIOServer } from "socket.io";

import { GameEngine } from "./lib/game/engine";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "./lib/socket/events";

const dev = process.env.NODE_ENV !== "production";
const hostname = "0.0.0.0";
const port = Number.parseInt(process.env.PORT ?? "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();
const engine = new GameEngine();

app.prepare().then(() => {
  const httpServer = createServer((request, response) => {
    void handle(request, response);
  });

  const io = new SocketIOServer<ClientToServerEvents, ServerToClientEvents>(
    httpServer,
    {
      transports: ["websocket"],
    },
  );

  const broadcastSnapshots = () => {
    for (const player of engine.getPlayers()) {
      io.to(player.socketId).emit("game:snapshot", engine.getSnapshot(player.id));
    }
  };

  engine.subscribe((event) => {
    if (event.type === "stroke_created") {
      io.emit("canvas:stroke", event.stroke);
      return;
    }

    broadcastSnapshots();
  });

  io.on("connection", (socket) => {
    const player = engine.addPlayer(socket.id);

    socket.emit("session:joined", player);
    socket.emit("game:snapshot", engine.getSnapshot(player.id));

    socket.on("game:start", () => {
      const result = engine.startGame();

      if (!result.ok && result.error) {
        socket.emit("system:error", { message: result.error });
      }
    });

    socket.on("draw:stroke", (stroke) => {
      const result = engine.submitStroke(player.id, stroke);

      if (!result.ok && result.error) {
        socket.emit("system:error", { message: result.error });
      }
    });

    socket.on("guess:submit", ({ text }) => {
      const result = engine.submitGuess(player.id, text);

      if (!result.ok && result.error) {
        socket.emit("system:error", { message: result.error });
      }
    });

    socket.on("disconnect", () => {
      engine.removePlayer(player.id);
    });
  });

  httpServer.listen(port, hostname, () => {
    console.log(`> Ready on http://localhost:${port}`);
  });
});
