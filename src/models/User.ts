import mongoose, { Document } from 'mongoose';
import { User } from '../types/auth';

const userSchema = new mongoose.Schema({
  googleId: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  picture: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export interface UserModel extends Document, Omit<User, '_id'> {}
export default mongoose.model<UserModel>('User', userSchema); 