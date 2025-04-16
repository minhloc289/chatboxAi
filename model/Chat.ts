import mongoose, { Schema, Document } from 'mongoose';

export interface IChat extends Document {
  userId: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
}

const ChatSchema: Schema = new Schema(
  {
    userId: { type: String, required: true },
    title: { type: String, required: true },
  },
  { timestamps: true }
);

// Ngăn chặn lỗi khi hot reload trong môi trường phát triển
export default mongoose.models.Chat || mongoose.model<IChat>('Chat', ChatSchema);