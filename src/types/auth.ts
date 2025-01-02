import { Document, Types } from 'mongoose';

export interface User {
  _id: Types.ObjectId;
  googleId?: string;
  email: string;
  name: string;
  picture: string;
  password?: string;
  createdAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export type UserDocument = Document & User;

declare global {
  namespace Express {
    interface User extends UserDocument {}
  }
} 