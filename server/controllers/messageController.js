const Message = require("../models/Message");
const Room = require("../models/Room");

const createMessage = async (req, res) => {
  try {
    const { roomId, content } = req.body;

    if (!roomId || !content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: "Room and message content are required",
      });
    }

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
      return res.status(403).json({
        success: false,
        message: "You are not a member of this room",
      });
    }

    const message = await Message.create({
      sender: req.userId,
      room: roomId,
      content: content.trim(),
      type: "text",
    });

    const populatedMessage = await Message.findById(message._id).populate(
      "sender",
      "username email",
    );

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: populatedMessage,
    });
  } catch (error) {
    console.error("Create message error:", error.message);

    res.status(500).json({
      success: false,
      message: "Server error while creating message",
    });
  }
};

const getRoomMessages = async (req, res) => {
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
      return res.status(403).json({
        success: false,
        message: "You are not a member of this room",
      });
    }

    const messages = await Message.find({
      room: roomId,
    })
      .populate("sender", "username email")
      .sort({ createdAt: 1 });

    res.json({
      success: true,
      messages,
    });
  } catch (error) {
    console.error("Get messages error:", error.message);

    res.status(500).json({
      success: false,
      message: "Server error while fetching messages",
    });
  }
};

module.exports = {
  createMessage,
  getRoomMessages,
};
