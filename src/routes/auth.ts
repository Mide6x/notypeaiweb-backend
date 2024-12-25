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
      req.session.cookie.domain = '.onrender.com';
      req.session.cookie.path = '/';
    }
    res.redirect(`${process.env.CLIENT_URL}/dashboard`);
  }
);

router.get('/user', (req, res) => {
  console.log('Session:', req.session);
  console.log('User:', req.user);
  console.log('Is Authenticated:', req.isAuthenticated());
  
  if (req.isAuthenticated()) {
    res.json(req.user);
  } else {
    res.status(401).json({ message: 'Not authenticated' });
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