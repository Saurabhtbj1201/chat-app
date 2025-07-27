const AWS = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

// Configure AWS SDK
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: process.env.AWS_REGION || 'eu-north-1'
});

// Create S3 service object
const s3 = new AWS.S3();

// Upload file to S3
const uploadFile = async (file, userId) => {
  try {
    if (!file) {
      throw new Error('No file provided');
    }

    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    if (!bucketName) {
      throw new Error('AWS_S3_BUCKET_NAME is not defined in environment variables');
    }

    console.log(`Uploading to bucket: ${bucketName}`);

    // Generate unique filename
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `profile-pictures/${userId}-${uuidv4()}.${fileExtension}`;

    // Set upload parameters
    const params = {
      Bucket: bucketName,
      Key: fileName,
      Body: file.buffer,
      ContentType: file.mimetype
      // Removed ACL parameter which might cause issues with bucket settings
    };

    console.log('Upload params:', { 
      Bucket: params.Bucket, 
      Key: params.Key, 
      ContentType: params.ContentType 
    });

    // Upload to S3
    const result = await s3.upload(params).promise();
    console.log('File uploaded successfully:', result.Location);
    return result.Location; // Return the public URL
  } catch (error) {
    console.error('S3 upload error:', error);
    throw new Error(`Failed to upload file to S3: ${error.message}`);
  }
};

// Delete file from S3
const deleteFile = async (fileUrl) => {
  try {
    if (!fileUrl) {
      console.log('No file URL provided for deletion');
      return;
    }

    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    if (!bucketName) {
      throw new Error('AWS_S3_BUCKET_NAME is not defined in environment variables');
    }

    // Extract key from URL - handle different URL formats
    let key;
    if (fileUrl.includes(`${bucketName}.s3.amazonaws.com/`)) {
      key = fileUrl.split(`${bucketName}.s3.amazonaws.com/`)[1];
    } else if (fileUrl.includes(`s3.${process.env.AWS_REGION}.amazonaws.com/${bucketName}/`)) {
      key = fileUrl.split(`s3.${process.env.AWS_REGION}.amazonaws.com/${bucketName}/`)[1];
    } else if (fileUrl.includes(`/${bucketName}/`)) {
      // Try a more generic approach
      const urlParts = fileUrl.split('/');
      const bucketIndex = urlParts.indexOf(bucketName);
      if (bucketIndex !== -1 && bucketIndex < urlParts.length - 1) {
        key = urlParts.slice(bucketIndex + 1).join('/');
      }
    }
    
    if (!key) {
      console.warn('Could not extract key from URL:', fileUrl);
      return;
    }

    console.log(`Deleting file from S3: Bucket=${bucketName}, Key=${key}`);

    const params = {
      Bucket: bucketName,
      Key: key
    };

    await s3.deleteObject(params).promise();
    console.log('File deleted successfully from S3:', key);
  } catch (error) {
    console.error('S3 delete error:', error);
    throw new Error(`Failed to delete file from S3: ${error.message}`);
  }
};

// Get file URL
const getFileUrl = (key) => {
  if (!key) return null;
  
  const bucketName = process.env.AWS_S3_BUCKET_NAME;
  if (!bucketName) {
    console.error('AWS_S3_BUCKET_NAME is not defined in environment variables');
    return null;
  }
  
  const region = process.env.AWS_REGION || 'eu-north-1';
  return `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
};

module.exports = {
  uploadFile,
  deleteFile,
  getFileUrl
};
