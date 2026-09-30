const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 50,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 200,
      default: "",
    },

    type: {
      type: String,
      enum: ["public", "private"],
      default: "public",
    },

    inviteCode: {
      type: String,
      unique: true,
      sparse: true,
      default: null,
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    members: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("Room", roomSchema);
