import express from 'express';
import passport from 'passport';

const router = express.Router();

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