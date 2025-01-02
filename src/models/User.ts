import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, UserDocument } from '../types/auth';

interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

type UserModel = mongoose.Model<User, {}, IUserMethods>;

const userSchema = new mongoose.Schema<User, UserModel, IUserMethods>({
  googleId: {
    type: String,
    sparse: true,
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
  password: {
    type: String,
    required: function(this: { googleId?: string }) {
      return !this.googleId;
    }
  },
  picture: {
    type: String,
    default: 'https://ui-avatars.com/api/?background=random'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

userSchema.pre('save', async function(next) {
  if (this.isModified('password') && this.password) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<User, UserModel>('User', userSchema); 