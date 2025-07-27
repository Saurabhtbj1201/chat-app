const multer = require('multer');
const path = require('path');

// Set up in-memory storage for multer (before uploading to S3)
const storage = multer.memoryStorage();

// Check file type
const fileFilter = (req, file, cb) => {
  const filetypes = /jpeg|jpg|png|gif/;
  const mimetype = filetypes.test(file.mimetype);
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

  if (mimetype && extname) {
    return cb(null, true);
  }
  cb(new Error('Only image files are allowed!'));
};

// Initialize upload
const upload = multer({
  storage,
  limits: { fileSize: 1024 * 1024 * 5 }, // 5MB max
  fileFilter
});

module.exports = upload;
