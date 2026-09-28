const express = require("express");

const {
  createMessage,
  getRoomMessages,
} = require("../controllers/messageController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.post("/", createMessage);
router.get("/room/:roomId", getRoomMessages);

module.exports = router;
