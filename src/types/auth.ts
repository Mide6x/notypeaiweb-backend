import { Document, Types } from 'mongoose';

export interface UserPreferences {
  language: 'en' | 'fr' | 'es' | 'de' | 'it' | 'pt' | 'ru' | 'zh' | 'ja' | 'ko';
  theme: 'light' | 'dark';
}

export interface User {
  _id: Types.ObjectId;
  googleId?: string;
  email: string;
  name: string;
  picture: string;
  password?: string;
  preferences: UserPreferences;
  createdAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

export type UserDocument = Document & User;

declare global {
  namespace Express {
    interface User extends UserDocument {}
  }
} 