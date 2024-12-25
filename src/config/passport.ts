import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import User from '../models/User';
import { UserDocument } from '../types/auth';
import { Document } from 'mongoose';

if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error('Google OAuth credentials are missing in environment variables');
}

passport.serializeUser((user: UserDocument, done) => {
  done(null, user._id.toString());
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    if (!user) {
      return done(null, false);
    }
    const userObject = user.toObject();
    done(null, userObject as unknown as UserDocument);
  } catch (error) {
    done(error, null);
  }
});

const callbackURL = process.env.NODE_ENV === 'production'
  ? `${process.env.SERVER_URL}/auth/google/callback`
  : 'http://localhost:3000/auth/google/callback';

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
      callbackURL,
      scope: ['profile', 'email']
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          if (!profile.emails?.[0]?.value || !profile.photos?.[0]?.value) {
            return done(new Error('Missing required profile information'), undefined);
          }

          user = await User.create({
            googleId: profile.id,
            email: profile.emails[0].value,
            name: profile.displayName || 'Unknown User',
            picture: profile.photos[0].value
          });
        }

        const userObject = user.toObject();
        return done(null, userObject as unknown as UserDocument);
      } catch (error) {
        return done(error as Error, undefined);
      }
    }
  )
);