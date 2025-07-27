const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  mobile: {
    type: String,
    trim: true
  },
  password: {
    type: String,
    required: function() {
      return !this.googleId && !this.facebookId && !this.githubId && !this.twitterId;
    }
  },
  profilePicture: {
    type: String,
    default: function() {
      const bucketName = process.env.AWS_S3_BUCKET_NAME;
      const region = process.env.AWS_REGION || 'eu-north-1';
      if (bucketName) {
        return `https://${bucketName}.s3.${region}.amazonaws.com/profile-pictures/default-avatar.png`;
      }
      return 'default-avatar.png';
    }
  },
  googleId: String,
  facebookId: String,
  githubId: String,
  twitterId: String,
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  lastSeen: {
    type: Date,
    default: Date.now
  },
  isOnline: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Hash password before saving
UserSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Method to compare password
UserSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
