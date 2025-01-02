import express, { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import User from '../models/User';
import { User as UserType, UserDocument } from '../types/auth';

const router = express.Router();

// Custom validation functions
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPassword = (password: string): boolean => {
  return password.length >= 6;
};

// Custom validation middleware
const validateRegistration = (req: Request, res: Response, next: NextFunction): void => {
  const { email, password, name } = req.body;
  const errors: Array<{ msg: string }> = [];

  if (!email || !isValidEmail(email)) {
    errors.push({ msg: 'Please enter a valid email address' });
  }

  if (!password || !isValidPassword(password)) {
    errors.push({ msg: 'Password must be at least 6 characters long' });
  }

  if (!name || name.trim().length === 0) {
    errors.push({ msg: 'Name is required' });
  }

  if (errors.length > 0) {
    res.status(400).json({ errors });
    return;
  }

  // Normalize data
  req.body.email = email.toLowerCase().trim();
  req.body.name = name.trim();
  next();
};

const validateLogin = (req: Request, res: Response, next: NextFunction): void => {
  const { email, password } = req.body;
  const errors: Array<{ msg: string }> = [];

  if (!email || !isValidEmail(email)) {
    errors.push({ msg: 'Please enter a valid email address' });
  }

  if (!password) {
    errors.push({ msg: 'Password is required' });
  }

  if (errors.length > 0) {
    res.status(400).json({ errors });
    return;
  }

  // Normalize email
  req.body.email = email.toLowerCase().trim();
  next();
};

interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

interface LoginRequest {
  email: string;
  password: string;
}

// Register with email/password
router.post('/register', validateRegistration, async (req: Request<{}, {}, RegisterRequest>, res: Response): Promise<void> => {
  try {
    const { email, password, name } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      res.status(400).json({ message: 'Email already registered' });
      return;
    }

    const user = await User.create({
      email,
      password,
      name,
      picture: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`
    });

    req.login(user, (err) => {
      if (err) {
        res.status(500).json({ message: 'Login failed after registration' });
        return;
      }
      res.status(201).json({ 
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          picture: user.picture
        }
      });
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Registration failed' });
  }
});

// Login with email/password
router.post('/login', validateLogin, async (req: Request<{}, {}, LoginRequest>, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user || !(await user.comparePassword(password))) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    req.login(user, (err) => {
      if (err) {
        res.status(500).json({ message: 'Login failed' });
        return;
      }
      res.json({
        user: {
          id: user._id,
          email: user.email,
          name: user.name,
          picture: user.picture
        }
      });
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Login failed' });
  }
});

router.get('/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: `${process.env.CLIENT_URL}/login`,
    session: true 
  }),
  (req, res) => {
    if (process.env.NODE_ENV === 'production') {
      req.session.cookie.secure = true;
      req.session.cookie.sameSite = 'none';
      req.session.cookie.domain = 'notypeaiweb-backend.onrender.com';
      
      // Save session before redirect
      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.redirect(`${process.env.CLIENT_URL}/login`);
        }
        res.redirect(`${process.env.CLIENT_URL}/dashboard`);
      });
    } else {
      res.redirect(`${process.env.CLIENT_URL}/dashboard`);
    }
  }
);

router.get('/user', (req, res) => {
  console.log('Session ID:', req.sessionID);
  console.log('Session:', req.session);
  console.log('User:', req.user);
  console.log('Is Authenticated:', req.isAuthenticated());
  console.log('Cookies:', req.cookies);
  console.log('Headers:', req.headers);
  
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).json({ 
      message: 'Not authenticated',
      sessionExists: !!req.session,
      hasUser: !!req.user
    });
  }
});

router.post('/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: 'Error logging out' });
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: 'Error destroying session' });
      }
      res.clearCookie('connect.sid');
      res.status(200).json({ message: 'Logged out successfully' });
    });
  });
});

export default router; 