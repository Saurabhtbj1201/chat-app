const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const GithubStrategy = require('passport-github2').Strategy;
const TwitterStrategy = require('passport-twitter').Strategy;
const User = require('../models/user.model');

module.exports = (passport) => {
  // JWT Strategy
  const opts = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET
  };

  passport.use(new JwtStrategy(opts, async (jwt_payload, done) => {
    try {
      const user = await User.findById(jwt_payload.id).select('-password');
      if (user) return done(null, user);
      return done(null, false);
    } catch (error) {
      return done(error, false);
    }
  }));

  // Google Strategy
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL, // Use env variable

    profileFields: ['id', 'displayName', 'photos', 'email', 'name']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ googleId: profile.id });
      
      if (user) {
        return done(null, user);
      }
      
      user = await User.findOne({ email: profile.emails[0].value });
      
      if (user) {
        user.googleId = profile.id;
        await user.save();
        return done(null, user);
      }
      
      const newUser = new User({
        googleId: profile.id,
        firstName: profile.name?.givenName || profile.displayName || profile.username || 'Unknown',
        lastName: profile.name?.familyName || profile.displayName || profile.username || 'Unknown',
        email: profile.emails?.[0]?.value || `${profile.username || 'user'}@${provider}.com`,
        profilePicture: profile.photos?.[0]?.value
      });
      
      await newUser.save();
      return done(null, newUser);
    } catch (error) {
      return done(error, false);
    }
  }));

  // Facebook Strategy
  passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: '/api/auth/facebook/callback',
    profileFields: ['id', 'emails', 'name', 'displayName', 'photos']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ facebookId: profile.id });
      if (user) return done(null, user);

      user = await User.findOne({ email: profile.emails?.[0]?.value });
      if (user) {
        user.facebookId = profile.id;
        await user.save();
        return done(null, user);
      }

      const newUser = new User({
        facebookId: profile.id,
        firstName: profile.name?.givenName || profile.displayName || profile.username || 'Unknown',
        lastName: profile.name?.familyName || profile.displayName || profile.username || 'Unknown',
        email: profile.emails?.[0]?.value,
        profilePicture: profile.photos?.[0]?.value
      });
      await newUser.save();
      return done(null, newUser);
    } catch (error) {
      return done(error, false);
    }
  }));

  // Github Strategy
  passport.use(new GithubStrategy({
    clientID: process.env.GITHUB_CLIENT_ID,
    clientSecret: process.env.GITHUB_CLIENT_SECRET,
    callbackURL: '/api/auth/github/callback',
    scope: ['user:email']
  }, async (accessToken, refreshToken, profile, done) => {
    try {
      let user = await User.findOne({ githubId: profile.id });
      if (user) return done(null, user);

      // GitHub may not always provide email, so fallback to username if needed
      const email = profile.emails?.[0]?.value || `${profile.username}@github.com`;
      user = await User.findOne({ email });
      if (user) {
        user.githubId = profile.id;
        await user.save();
        return done(null, user);
      }

      const newUser = new User({
        githubId: profile.id,
        firstName: profile.displayName || profile.username || 'Unknown',
        lastName: profile.username || 'Unknown',
        email,
        profilePicture: profile.photos?.[0]?.value
      });
      await newUser.save();
      return done(null, newUser);
    } catch (error) {
      return done(error, false);
    }
  }));

  // Twitter Strategy
  passport.use(new TwitterStrategy({
    consumerKey: process.env.TWITTER_API_KEY,
    consumerSecret: process.env.TWITTER_API_SECRET,
    callbackURL: 'http://localhost:5000/api/auth/twitter/callback', // Make sure this matches Twitter app settings
    includeEmail: true
  }, async (token, tokenSecret, profile, done) => {
    try {
      let user = await User.findOne({ twitterId: profile.id });
      if (user) return done(null, user);

      const email = profile.emails?.[0]?.value || `${profile.username}@twitter.com`;
      user = await User.findOne({ email });
      if (user) {
        user.twitterId = profile.id;
        await user.save();
        return done(null, user);
      }

      const newUser = new User({
        twitterId: profile.id,
        firstName: profile.displayName || profile.username || 'Unknown',
        lastName: profile.username || 'Unknown',
        email,
        profilePicture: profile.photos?.[0]?.value
      });
      await newUser.save();
      return done(null, newUser);
    } catch (error) {
      return done(error, false);
    }
  }));
};
