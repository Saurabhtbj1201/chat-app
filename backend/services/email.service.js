const nodemailer = require('nodemailer');

const sendEmail = async (options) => {
  try {
    let transporter;

    // If config is missing and in development, use Ethereal test account
    if (
      (!process.env.EMAIL_SERVICE || !process.env.EMAIL_USER || !process.env.EMAIL_PASS)
      && process.env.NODE_ENV === 'development'
    ) {
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
      console.log('Using Ethereal test email account:', testAccount.user);
    } else if (
      process.env.EMAIL_SERVICE && process.env.EMAIL_USER && process.env.EMAIL_PASS
    ) {
      transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });
    } else {
      // In production, throw error if config is missing
      throw new Error('Email configuration is missing. Please check your .env file.');
    }

    const mailOptions = {
      from: `Chat App <${process.env.EMAIL_USER || 'test@ethereal.email'}>`,
      to: options.to,
      subject: options.subject,
      html: options.html
    };

    const info = await transporter.sendMail(mailOptions);

    if (process.env.NODE_ENV === 'development') {
      console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
    }

    return {
      success: true,
      messageId: info.messageId,
      previewUrl: process.env.NODE_ENV === 'development' ? nodemailer.getTestMessageUrl(info) : null,
      testAccount: transporter.options.auth.user.includes('ethereal.email')
    };
  } catch (error) {
    console.error('Email sending failed:', error.message, error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

module.exports = sendEmail;
