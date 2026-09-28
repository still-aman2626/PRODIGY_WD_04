const express = require("express");

const {
  createRoom,
  getRooms,
  joinRoom,
} = require("../controllers/roomController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.post("/", createRoom);

router.get("/", getRooms);

router.post("/:roomId/join", joinRoom);

module.exports = router;
