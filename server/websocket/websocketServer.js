const WebSocket = require("ws");
const jwt = require("jsonwebtoken");

const Message = require("../models/Message");
const Room = require("../models/Room");

const setupWebSocket = (server) => {
  const wss = new WebSocket.Server({
    server,
  });

  const connectedUsers = new Map();
  const roomConnections = new Map();

  wss.on("connection", (ws, req) => {
    console.log("WebSocket client connected");

    const cookies = req.headers.cookie || "";

    const tokenCookie = cookies
      .split(";")
      .find((cookie) => cookie.trim().startsWith("token="));

    if (!tokenCookie) {
      ws.send(
        JSON.stringify({
          type: "error",
          message: "Authentication required",
        }),
      );

      ws.close();
      return;
    }

    const token = tokenCookie.split("=")[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const userId = decoded.userId.toString();

      ws.userId = userId;

      connectedUsers.set(userId, ws);

      console.log(`WebSocket authenticated for user: ${userId}`);

      ws.send(
        JSON.stringify({
          type: "authenticated",
          message: "WebSocket authentication successful",
          userId,
        }),
      );

      ws.on("message", async (message) => {
        try {
          const data = JSON.parse(message.toString());

          // JOIN ROOM
          if (data.type === "join_room") {
            const { roomId } = data;

            const room = await Room.findById(roomId);

            if (!room) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Room not found",
                }),
              );

              return;
            }

            const isMember = room.members.some(
              (memberId) => memberId.toString() === userId,
            );

            if (!isMember) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "You are not a member of this room",
                }),
              );

              return;
            }

            if (!roomConnections.has(roomId)) {
              roomConnections.set(roomId, new Set());
            }

            roomConnections.get(roomId).add(ws);

            ws.currentRoomId = roomId;

            ws.send(
              JSON.stringify({
                type: "room_joined",
                roomId,
                message: "Joined room successfully",
              }),
            );

            console.log(`User ${userId} joined room ${roomId}`);

            return;
          }

          // SEND ROOM MESSAGE
          if (data.type === "room_message") {
            const { roomId, content } = data;

            if (!roomId || !content || !content.trim()) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Room ID and message content are required",
                }),
              );

              return;
            }

            if (ws.currentRoomId !== roomId) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Join the room before sending messages",
                }),
              );

              return;
            }

            const room = await Room.findById(roomId);

            if (!room) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Room not found",
                }),
              );

              return;
            }

            const isMember = room.members.some(
              (memberId) => memberId.toString() === userId,
            );

            if (!isMember) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "You are not a member of this room",
                }),
              );

              return;
            }

            const savedMessage = await Message.create({
              sender: userId,
              room: roomId,
              content: content.trim(),
              type: "text",
            });

            const populatedMessage = await Message.findById(
              savedMessage._id,
            ).populate("sender", "username email");

            const roomSockets = roomConnections.get(roomId);

            if (roomSockets) {
              for (const client of roomSockets) {
                if (client.readyState === WebSocket.OPEN) {
                  client.send(
                    JSON.stringify({
                      type: "new_message",
                      message: populatedMessage,
                    }),
                  );
                }
              }
            }

            console.log(`Message sent in room ${roomId} by user ${userId}`);

            return;
          }

          ws.send(
            JSON.stringify({
              type: "error",
              message: "Unknown WebSocket message type",
            }),
          );
        } catch (error) {
          console.error("WebSocket message error:", error.message);

          ws.send(
            JSON.stringify({
              type: "error",
              message: "Server error while processing WebSocket message",
            }),
          );
        }
      });

      ws.on("close", () => {
        connectedUsers.delete(userId);

        if (ws.currentRoomId) {
          const roomSockets = roomConnections.get(ws.currentRoomId);

          if (roomSockets) {
            roomSockets.delete(ws);

            if (roomSockets.size === 0) {
              roomConnections.delete(ws.currentRoomId);
            }
          }
        }

        console.log(`WebSocket disconnected for user: ${userId}`);
      });

      ws.on("error", (error) => {
        console.error("WebSocket error:", error.message);
      });
    } catch (error) {
      console.error("WebSocket authentication failed:", error.message);

      ws.send(
        JSON.stringify({
          type: "error",
          message: "Invalid or expired authentication token",
        }),
      );

      ws.close();
    }
  });

  console.log("PulseChat WebSocket server initialized");

  return wss;
};

module.exports = setupWebSocket;
