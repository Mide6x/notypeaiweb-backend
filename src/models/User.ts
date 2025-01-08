import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, UserDocument } from '../types/auth';

interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

type UserModel = mongoose.Model<User, {}, IUserMethods>;

const userSchema = new Schema<User, UserModel, IUserMethods>({
  googleId: {
    type: String,
    sparse: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    default: function(this: any) {
      if (this.email) {
        const username = this.email.split('@')[0];
        return username.charAt(0).toUpperCase() + username.slice(1);
      }
      return 'User';
    }
  },
  password: {
    type: String,
    required: function(this: { googleId?: string }) {
      return !this.googleId;
    }
  },
  picture: {
    type: String,
    default: function(this: any) {
      const seed = this.email || this._id?.toString();
      // Using DiceBear avatars which doesn't have CORS issues
      return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(seed)}`;
    }
  },
  preferences: {
    language: {
      type: String,
      default: 'en',
      enum: ['en', 'fr', 'es', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko']
    },
    theme: {
      type: String,
      default: 'light',
      enum: ['light', 'dark']
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure email and name are always properly formatted before saving
userSchema.pre('save', async function(next) {
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  
  // Ensure email is lowercase and trimmed
  if (this.email) {
    this.email = this.email.toLowerCase().trim();
  }
  
  // Set name from email if not provided
  if (!this.name && this.email) {
    const username = this.email.split('@')[0];
    this.name = username.charAt(0).toUpperCase() + username.slice(1);
  }
  
  // Ensure name is trimmed
  if (this.name) {
    this.name = this.name.trim();
  }
  
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<User, UserModel>('User', userSchema); 