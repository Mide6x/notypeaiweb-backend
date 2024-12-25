import mongoose from 'mongoose';

const summarySchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true
  },
  text: {
    type: String,
    required: true
  },
  summary: {
    type: String,
    required: true
  },
  mode: {
    type: String,
    required: true,
    enum: ['natural', 'fluency', 'academic', 'creative']
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Keep only last 5 summaries per user
summarySchema.index({ userId: 1, createdAt: -1 });

export default mongoose.model('Summary', summarySchema); 