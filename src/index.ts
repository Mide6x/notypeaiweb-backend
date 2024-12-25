import dotenv from 'dotenv';
import path from 'path';
import MongoStore from 'connect-mongo';

// Load environment variables first
dotenv.config({ path: path.join(__dirname, '../.env') });

// Check for required environment variables
if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET || !process.env.MONGODB_URI || !process.env.SESSION_SECRET || !process.env.CLIENT_URL || !process.env.NODE_ENV || !process.env.PORT) {
  console.error('Missing required environment variables');
  process.exit(1);
}

import express from 'express';
import session from 'express-session';
import passport from 'passport';
import cors from 'cors';
import mongoose from 'mongoose';
import './config/passport';
import authRoutes from './routes/auth';

const app = express();

// Add this before other middleware
app.enable('trust proxy');

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? [
        'https://notypeai.com',
        'https://www.notypeai.com',
        'https://notypeaiweb-backend.onrender.com',
        'https://notypeaiweb-backend.onrender.com/auth/google/callback'
      ]
    : 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie']
}));

// Configure session with MongoStore
app.use(session({
  secret: process.env.SESSION_SECRET as string,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI as string,
    ttl: 24 * 60 * 60
  }),
  proxy: true,
  cookie: process.env.NODE_ENV === 'production' ? {
    secure: true,
    sameSite: 'none',
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true,
    domain: 'notypeaiweb-backend.onrender.com',
    path: '/'
  } : {
    secure: false,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
    httpOnly: true
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// Add error handling for MongoDB connection
mongoose.connect(process.env.MONGODB_URI as string)
  .then(() => console.log('Connected to MongoDB'))
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

const PORT = process.env.PORT as string || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Add after existing middleware
app.use('/auth', authRoutes);