const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  try {
    // Check if email configuration exists
    if (!process.env.EMAIL_SERVICE || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('Email configuration is missing. Please check your .env file.');
    }

    // Create a development or production transporter based on environment
    let transporter;
    
    if (process.env.NODE_ENV === 'development' && process.env.USE_TEST_EMAIL === 'true') {
      // Use a test email account for development
      // This creates a test account with Ethereal Email (a fake SMTP service for development)
      const testAccount = await nodemailer.createTestAccount();
      
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      
      console.log('Using test email account for development:', testAccount.user);
    } else {
      // Use the configured email service (production or development with real credentials)
      transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
    }

    // Define email options
    const mailOptions = {
      from: `Chat App <${process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    
    // Log preview URL if using test account
    if (process.env.NODE_ENV === 'development' && process.env.USE_TEST_EMAIL === 'true') {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }
    
    return { 
      success: true, 
      messageId: info.messageId,
      previewUrl: process.env.NODE_ENV === 'development' ? nodemailer.getTestMessageUrl(info) : null
    };
  } catch (error) {
    console.error('Email sending failed:', error.message);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

module.exports = sendEmail;
