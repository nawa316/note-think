import mongoose, { Schema, Document } from "mongoose";

export interface IStroke {
  points: { x: number; y: number; pressure: number }[];
  color: string;
  width: number;
  tool: "pen" | "eraser" | "marker";
  timestamp: number;
}

export interface INote extends Document {
  userId: mongoose.Types.ObjectId;
  title: string;
  strokes: IStroke[];
  thumbnail: string; // base64 data URL thumbnail
  canvasWidth: number;
  canvasHeight: number;
  createdAt: Date;
  updatedAt: Date;
}

const StrokeSchema = new Schema<IStroke>(
  {
    points: [
      {
        x: Number,
        y: Number,
        pressure: { type: Number, default: 0.5 },
      },
    ],
    color: { type: String, default: "#000000" },
    width: { type: Number, default: 2 },
    tool: { type: String, enum: ["pen", "eraser", "marker"], default: "pen" },
    timestamp: Number,
  },
  { _id: false }
);

const NoteSchema = new Schema<INote>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: { type: String, default: "Untitled Note", trim: true },
    strokes: [StrokeSchema],
    thumbnail: { type: String, default: "" },
    canvasWidth: { type: Number, default: 1920 },
    canvasHeight: { type: Number, default: 1080 },
  },
  { timestamps: true }
);

export default mongoose.models.Note ||
  mongoose.model<INote>("Note", NoteSchema);
