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

  // --------------------------------
  // Get unique online users in room
  // --------------------------------
  const getUniqueRoomOnlineCount = (roomId) => {
    const roomSockets = roomConnections.get(roomId);

    if (!roomSockets) {
      return 0;
    }

    const uniqueUsers = new Set();

    for (const client of roomSockets) {
      if (client.readyState === WebSocket.OPEN && client.userId) {
        uniqueUsers.add(client.userId);
      }
    }

    return uniqueUsers.size;
  };

  // --------------------------------
  // Broadcast room presence
  // --------------------------------
  const broadcastRoomPresence = (roomId) => {
    if (!roomId) {
      return;
    }

    const roomSockets = roomConnections.get(roomId);

    if (!roomSockets) {
      return;
    }

    const presenceMessage = JSON.stringify({
      type: "room_presence_update",
      roomId,
      onlineCount: getUniqueRoomOnlineCount(roomId),
    });

    for (const client of roomSockets) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(presenceMessage);
      }
    }
  };

  // --------------------------------
  // Broadcast global presence
  // --------------------------------
  const broadcastPresence = () => {
    const presenceMessage = JSON.stringify({
      type: "presence_update",
      onlineCount: connectedUsers.size,
    });

    for (const client of connectedUsers.values()) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(presenceMessage);
      }
    }
  };

  // --------------------------------
  // WebSocket connection
  // --------------------------------
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

      broadcastPresence();

      console.log(`WebSocket authenticated for user: ${userId}`);

      ws.send(
        JSON.stringify({
          type: "authenticated",
          message: "WebSocket authentication successful",
          userId,
        }),
      );

      // --------------------------------
      // WebSocket messages
      // --------------------------------
      ws.on("message", async (message) => {
        try {
          const data = JSON.parse(message.toString());

          // ==========================================
          // JOIN ROOM
          // ==========================================
          if (data.type === "join_room") {
            const { roomId } = data;

            if (!roomId) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Room ID is required",
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

            // Leave previous room
            if (ws.currentRoomId && ws.currentRoomId !== roomId) {
              const previousRoomId = ws.currentRoomId;

              const previousRoomSockets = roomConnections.get(previousRoomId);

              if (previousRoomSockets) {
                previousRoomSockets.delete(ws);

                if (previousRoomSockets.size === 0) {
                  roomConnections.delete(previousRoomId);
                }
              }

              broadcastRoomPresence(previousRoomId);
            }

            // Create room set
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

            broadcastRoomPresence(roomId);

            console.log(`User ${userId} joined room ${roomId}`);

            return;
          }

          // ==========================================
          // LEAVE ROOM
          // ==========================================
          if (data.type === "leave_room") {
            const { roomId } = data;

            if (!roomId) {
              return;
            }

            const roomSockets = roomConnections.get(roomId);

            if (roomSockets) {
              roomSockets.delete(ws);

              if (roomSockets.size === 0) {
                roomConnections.delete(roomId);
              }
            }

            if (ws.currentRoomId === roomId) {
              ws.currentRoomId = null;
            }

            ws.send(
              JSON.stringify({
                type: "room_left",
                roomId,
              }),
            );

            broadcastRoomPresence(roomId);

            console.log(`User ${userId} left room ${roomId}`);

            return;
          }

          // ==========================================
          // SEND ROOM MESSAGE
          // ==========================================
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

            // Save message
            const savedMessage = await Message.create({
              sender: userId,
              room: roomId,
              content: content.trim(),
              type: "text",
            });

            // Populate sender
            const populatedMessage = await Message.findById(
              savedMessage._id,
            ).populate("sender", "username email");

            // Broadcast message
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

          // ==========================================
          // UNKNOWN MESSAGE
          // ==========================================
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

      // ==========================================
      // CONNECTION CLOSED
      // ==========================================
      ws.on("close", () => {
        if (connectedUsers.get(userId) === ws) {
          connectedUsers.delete(userId);
        }

        const closedRoomId = ws.currentRoomId;

        if (closedRoomId) {
          const roomSockets = roomConnections.get(closedRoomId);

          if (roomSockets) {
            roomSockets.delete(ws);

            if (roomSockets.size === 0) {
              roomConnections.delete(closedRoomId);
            }
          }
        }

        broadcastPresence();

        broadcastRoomPresence(closedRoomId);

        console.log(`WebSocket disconnected for user: ${userId}`);
      });

      // ==========================================
      // SOCKET ERROR
      // ==========================================
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
