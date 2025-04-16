import mongoose, { Schema, Document } from 'mongoose';

export interface IMessage extends Document {
  chatId: Schema.Types.ObjectId;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Date;
}

const MessageSchema: Schema = new Schema(
  {
    chatId: { type: Schema.Types.ObjectId, ref: 'Chat', required: true },
    role: { type: String, required: true, enum: ['user', 'assistant'] },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

export default mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);