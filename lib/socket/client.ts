import { io, type Socket } from "socket.io-client";

import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "./events";

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export function getSocket(): Socket<
  ServerToClientEvents,
  ClientToServerEvents
> {
  if (!socket) {
    socket = io({
      autoConnect: false,
      transports: ["websocket"],
    });
  }

  return socket;
}
