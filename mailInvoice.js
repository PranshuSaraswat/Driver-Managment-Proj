const nodemailer = require('nodemailer');
const path = require('path');

// Create a transporter
async function generateMail(fPath) {
    var transporter = nodemailer.createTransport({
        host: "live.smtp.mailtrap.io",
        port: 587,
        auth: {
            user: "api",  // Mailtrap username/API key
            pass: "73697db3b188fd827124cbb1d7daf553"  // Mailtrap password/API key
        }
    });

    // Email options
    const mailOptions = {
        from: 'info@demomailtrap.com',              // Sender's email
        to: 'saraswatpranshu@gmail.com',            // Receiver's email
        subject: 'Invoice ',          // Email subject
        text: 'Please find the attached PDF for the Invoice.',      // Email body text
        attachments: [
            {
                path: fPath
            }
        ]
    };

    // Send email with attachment using await to handle promise
    try {
        let info = await transporter.sendMail(mailOptions);
        console.log('Email sent:', info.response);
    } catch (error) {
        console.log('Error:', error);
    }
}
module.exports = generateMail;