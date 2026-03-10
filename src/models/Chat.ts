import mongoose from 'mongoose';

const chatSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  role: { type: String, enum: ['user', 'assistant'], required: true },
  content: { type: String, required: true },
  timestamp: { type: Number, required: true },
  groundingMetadata: { type: mongoose.Schema.Types.Mixed },
}, {
  timestamps: true,
});

export const Chat = mongoose.model('Chat', chatSchema);
