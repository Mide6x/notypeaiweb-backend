import session from 'express-session';
import MongoStore from 'connect-mongo';

if (!process.env.MONGODB_URI || !process.env.SESSION_SECRET) {
  throw new Error('Required environment variables missing');
}

const sessionConfig = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI,
    ttl: 24 * 60 * 60, // 1 day
  }),
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    domain: process.env.NODE_ENV === 'production' 
      ? '.notype.ai' 
      : undefined
  }
});

export default sessionConfig; 