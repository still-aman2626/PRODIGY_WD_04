const Room = require("../models/Room");

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
    });

    if (existingRoom) {
      return res.status(409).json({
        success: false,
        message: "Room already exists",
      });
    }

    const room = await Room.create({
      name: name.trim(),
      description: description?.trim() || "",
      createdBy: req.userId,
      members: [req.userId],
    });

    const populatedRoom = await Room.findById(room._id)
      .populate("createdBy", "username email")
      .populate("members", "username email online");

    res.status(201).json({
      success: true,
      message: "Room created successfully",
      room: populatedRoom,
    });
  } catch (error) {
    console.error("Create room error:", error.message);

    res.status(500).json({
      success: false,
      message: "Server error while creating room",
    });
  }
};

const getRooms = async (req, res) => {
  try {
    const rooms = await Room.find()
      .populate("createdBy", "username email")
      .populate("members", "username email online")
      .sort({ createdAt: -1 });

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

    const alreadyMember = room.members.some(
      (memberId) => memberId.toString() === req.userId.toString(),
    );

    if (alreadyMember) {
      return res.status(400).json({
        success: false,
        message: "You are already a member of this room",
      });
    }

    room.members.push(req.userId);

    await room.save();

    const populatedRoom = await Room.findById(room._id)
      .populate("createdBy", "username email")
      .populate("members", "username email online");

    res.json({
      success: true,
      message: "Joined room successfully",
      room: populatedRoom,
    });
  } catch (error) {
    console.error("Join room error:", error.message);

    res.status(500).json({
      success: false,
      message: "Server error while joining room",
    });
  }
};

module.exports = {
  createRoom,
  getRooms,
  joinRoom,
};
