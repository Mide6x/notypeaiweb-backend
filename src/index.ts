import dotenv from 'dotenv';
import path from 'path';
import MongoStore from 'connect-mongo';

// Load environment variables first
dotenv.config({ path: path.join(__dirname, '../.env') });

// Check for required environment variables
const requiredEnvVars = [
  'GOOGLE_CLIENT_ID',
  'GOOGLE_CLIENT_SECRET',
  'MONGODB_URI',
  'SESSION_SECRET',
  'CLIENT_URL',
  'NODE_ENV',
  'PORT'
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

import express from 'express';
import session from 'express-session';
import passport from 'passport';
import cors from 'cors';
import mongoose from 'mongoose';
import './config/passport';
import authRoutes from './routes/auth';
import aiRoutes from './routes/ai';

const app = express();

// Add this before other middleware
app.enable('trust proxy');

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
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

// Port configuration
const PORT = parseInt(process.env.PORT || '3000', 10);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});

// Add after existing middleware
app.use('/auth', authRoutes);

// Add after existing routes
app.use('/api/ai', aiRoutes);

// Add a health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Error handling
process.on('unhandledRejection', (error) => {
  console.error('Unhandled Rejection:', error);
});