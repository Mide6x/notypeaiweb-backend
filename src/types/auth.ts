import { Document, Types } from 'mongoose';

export interface User {
  _id: Types.ObjectId;
  googleId: string;
  email: string;
  name: string;
  picture: string;
  createdAt: Date;
}

export interface UserDocument extends Document {
  _id: Types.ObjectId;
  googleId: string;
  email: string;
  name: string;
  picture: string;
  createdAt: Date;
}

declare global {
  namespace Express {
    interface User extends UserDocument {}
  }
} 