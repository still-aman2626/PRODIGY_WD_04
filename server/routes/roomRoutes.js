const express = require("express");

const roomController = require("../controllers/roomController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

// Public rooms
router.post("/", roomController.createRoom);
router.get("/", roomController.getRooms);

// Private chats
router.post("/private/create", roomController.createPrivateRoom);
router.post("/private/join", roomController.joinPrivateRoom);
router.patch("/private/:roomId/name", roomController.renamePrivateRoom);

// Join existing room
router.post("/:roomId/join", roomController.joinRoom);

module.exports = router;
