const crypto = require("crypto");

const Room = require("../models/Room");

// ---------------------------------------------
// Generate unique invite code
// ---------------------------------------------
const generateInviteCode = () => {
  return crypto.randomBytes(4).toString("hex").toUpperCase();
};

// ---------------------------------------------
// Create public room
// ---------------------------------------------
const createRoom = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Room name is required",
      });
    }

    const existingRoom = await Room.findOne({
      name: name.trim(),
      type: "public",
    });

    if (existingRoom) {
      return res.status(409).json({
        success: false,
        message: "A public room with this name already exists",
      });
    }

    const room = await Room.create({
      name: name.trim(),
      description: description?.trim() || "",
      type: "public",
      createdBy: req.userId,
      members: [req.userId],
    });

    res.status(201).json({
      success: true,
      message: "Room created successfully",
      room,
    });
  } catch (error) {
    console.error("Create room error:", error.message);

    res.status(500).json({
      success: false,
      message: "Server error while creating room",
    });
  }
};

// ---------------------------------------------
// Get rooms available to current user
// ---------------------------------------------
const getRooms = async (req, res) => {
  try {
    const rooms = await Room.find({
      $or: [
        // Public rooms, including older rooms created
        // before the "type" field was added
        {
          $or: [
            { type: "public" },
            { type: { $exists: false } },
            { type: null },
          ],
        },

        // Private rooms where current user is a member
        {
          type: "private",
          members: req.userId,
        },
      ],
    })
      .populate("createdBy", "username email")
      .populate("members", "username email")
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      rooms,
    });
  } catch (error) {
    console.error("Get rooms error:", error.message);

    res.status(500).json({
      success: false,
      message: "Server error while fetching rooms",
    });
  }
};

// ---------------------------------------------
// Join existing room
// ---------------------------------------------
const joinRoom = async (req, res) => {
  try {
    const { roomId } = req.params;

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    const isMember = room.members.some(
      (memberId) => memberId.toString() === req.userId.toString(),
    );

    if (!isMember) {
      room.members.push(req.userId);
      await room.save();
    }

    const updatedRoom = await Room.findById(room._id)
      .populate("createdBy", "username email")
      .populate("members", "username email");

    res.json({
      success: true,
      message: "Joined room successfully",
      room: updatedRoom,
    });
  } catch (error) {
    console.error("Join room error:", error.message);

    res.status(500).json({
      success: false,
      message: "Server error while joining room",
    });
  }
};

// ---------------------------------------------
// Create private chat
// ---------------------------------------------
const createPrivateRoom = async (req, res) => {
  try {
    const { name } = req.body;

    const roomName = name && name.trim() ? name.trim() : "Private Chat";

    let inviteCode;
    let existingRoom;

    // Make sure invite code is unique
    do {
      inviteCode = generateInviteCode();

      existingRoom = await Room.findOne({
        inviteCode,
      });
    } while (existingRoom);

    const room = await Room.create({
      name: roomName,
      description: "Private conversation",
      type: "private",
      inviteCode,
      createdBy: req.userId,
      members: [req.userId],
    });

    const populatedRoom = await Room.findById(room._id)
      .populate("createdBy", "username email")
      .populate("members", "username email");

    res.status(201).json({
      success: true,
      message: "Private chat created successfully",
      room: populatedRoom,
      inviteCode,
    });
  } catch (error) {
    console.error("Create private room error:", error.message);

    res.status(500).json({
      success: false,
      message: "Server error while creating private chat",
    });
  }
};

// ---------------------------------------------
// Join private chat using invite code
// ---------------------------------------------
const joinPrivateRoom = async (req, res) => {
  try {
    const { inviteCode } = req.body;

    if (!inviteCode || !inviteCode.trim()) {
      return res.status(400).json({
        success: false,
        message: "Invite code is required",
      });
    }

    const room = await Room.findOne({
      inviteCode: inviteCode.trim().toUpperCase(),
      type: "private",
    });

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Invalid invite code",
      });
    }

    const isMember = room.members.some(
      (memberId) => memberId.toString() === req.userId.toString(),
    );

    if (!isMember) {
      room.members.push(req.userId);
      await room.save();
    }

    const populatedRoom = await Room.findById(room._id)
      .populate("createdBy", "username email")
      .populate("members", "username email");

    res.json({
      success: true,
      message: "Joined private chat successfully",
      room: populatedRoom,
    });
  } catch (error) {
    console.error("Join private room error:", error.message);

    res.status(500).json({
      success: false,
      message: "Server error while joining private chat",
    });
  }
};

// ---------------------------------------------
// Rename private chat
// ---------------------------------------------
const renamePrivateRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Room name is required",
      });
    }

    const room = await Room.findById(roomId);

    if (!room) {
      return res.status(404).json({
        success: false,
        message: "Room not found",
      });
    }

    if (room.type !== "private") {
      return res.status(400).json({
        success: false,
        message: "Only private chats can be renamed",
      });
    }

    const isMember = room.members.some(
      (memberId) => memberId.toString() === req.userId.toString(),
    );

    if (!isMember) {
      return res.status(403).json({
        success: false,
        message: "You are not a member of this private chat",
      });
    }

    room.name = name.trim();

    await room.save();

    const updatedRoom = await Room.findById(room._id)
      .populate("createdBy", "username email")
      .populate("members", "username email");

    res.json({
      success: true,
      message: "Private chat renamed successfully",
      room: updatedRoom,
    });
  } catch (error) {
    console.error("Rename private room error:", error.message);

    res.status(500).json({
      success: false,
      message: "Server error while renaming private chat",
    });
  }
};

// ---------------------------------------------
// Exports
// ---------------------------------------------
module.exports = {
  createRoom,
  getRooms,
  joinRoom,
  createPrivateRoom,
  joinPrivateRoom,
  renamePrivateRoom,
};
