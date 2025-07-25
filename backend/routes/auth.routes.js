const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const passport = require('passport');
const upload = require('../middleware/upload.middleware');
const { protect } = require('../middleware/auth.middleware');

// Register route with profile picture upload
router.post('/register', upload.single('profilePicture'), authController.register);

// Login route
router.post('/login', authController.login);

// Get current user
router.get('/me', protect, authController.getCurrentUser);

// Forgot password
router.post('/forgot-password', authController.forgotPassword);

// Reset password
router.post('/reset-password/:token', authController.resetPassword);

// Logout
router.post('/logout', protect, authController.logout);

// Google OAuth routes
router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));
router.get('/google/callback', 
  passport.authenticate('google', { session: false, failureRedirect: '/login' }),
  authController.socialLoginSuccess
);

// Facebook OAuth routes
router.get('/facebook', passport.authenticate('facebook', { scope: ['email'] }));
router.get('/facebook/callback',
  passport.authenticate('facebook', { session: false, failureRedirect: '/login' }),
  authController.socialLoginSuccess
);

// Github OAuth routes
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));
router.get('/github/callback',
  passport.authenticate('github', { session: false, failureRedirect: '/login' }),
  authController.socialLoginSuccess
);

// Twitter OAuth routes
router.get('/twitter', passport.authenticate('twitter'));
router.get('/twitter/callback',
  passport.authenticate('twitter', { session: false, failureRedirect: '/login' }),
  authController.socialLoginSuccess
);

module.exports = router;
