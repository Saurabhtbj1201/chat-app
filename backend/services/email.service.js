const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  try {
    // Check if we're in development mode with incomplete email config
    const isDevMode = process.env.NODE_ENV === 'development';
    const hasIncompleteConfig = !process.env.EMAIL_PASS || 
                               process.env.EMAIL_PASS === 'your_email_password' ||
                               process.env.EMAIL_PASS === 'your_app_password_from_google';
    
    if (isDevMode && hasIncompleteConfig) {
      console.log('\n=== EMAIL WOULD BE SENT (DEV MODE) ===');
      console.log('To:', options.to);
      console.log('Subject:', options.subject);
      console.log('Content:', options.html);
      console.log('=======================================\n');
      
      // In development, we can "fake" sending the email
      return { 
        success: false, 
        devMode: true,
        error: 'Email not sent - running in development mode with incomplete configuration'
      };
    }

    // For production or if email is configured in development
    // Check if email configuration exists
    if (!process.env.EMAIL_SERVICE || !process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('Email configuration is missing. Please check your .env file.');
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      service: process.env.EMAIL_SERVICE,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
      }
    });

    // Define email options
    const mailOptions = {
      from: `Chat App <${process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html: options.html
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email sending failed:', error.message);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

module.exports = sendEmail;
