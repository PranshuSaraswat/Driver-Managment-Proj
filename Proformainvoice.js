const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const generateMail = require('./mailInvoice'); // Ensure this file has the correct path

async function generateInvoice(driver, transactionType, amount, expireAt) {
  const doc = new PDFDocument({
    size: 'A4',
    layout: 'portrait',
    margins: {
      top: 30,
      bottom: 30,
      left: 30,
      right: 30,
    },
  });

  // Add content to the PDF as per your original code
  doc.fontSize(20).text('Company Name', 70, 50); // Adjusted position
  doc.fontSize(14).text('Some Road No 1', 70, 80);
  doc.fontSize(14).text('Some State, Pincode', 70, 110);

  // Bill to details
  doc.fontSize(14).text('Bill To:', 70, 150);
  doc.fontSize(14).text(driver.name, 70, 180);
  doc.fontSize(14).text(driver.phone, 70, 210);

  // Invoice details
  doc.fontSize(20).text('Delivery Report', 350, 50);
  doc.fontSize(14).text('#INV-001', 350, 80);
  doc.fontSize(14).text('Date:', 350, 110);
  doc.fontSize(14).text(new Date().toLocaleDateString(), 350, 140);
  doc.fontSize(14).text('Balance Due:', 350, 230);
  doc.fontSize(14).text(`₹${amount.toFixed(2)}`, 350, 260);

  // Items table
  doc.fontSize(14).text('Item', 70, 300);
  doc.fontSize(14).text('Quantity', 270, 300);
  doc.fontSize(14).text('Rate', 370, 300);
  doc.fontSize(14).text('Amount', 470, 300);
  doc.fontSize(14).text(transactionType, 70, 350);
  doc.fontSize(14).text('1', 270, 350);
  doc.fontSize(14).text(`₹${amount.toFixed(2)}`, 370, 350);
  doc.fontSize(14).text(`₹${amount.toFixed(2)}`, 470, 350);

  // Final total
  doc.fontSize(14).text('Total:', 370, 400);
  doc.fontSize(14).text(`₹${amount.toFixed(2)}`, 470, 400);

  // Create a file name
  const fileName = `invoice_${driver.phone}_${transactionType}_${Date.now()}.pdf`;
    const filePath = path.join(__dirname, fileName);

    console.log('Writing PDF to file system...');
    const writeStream = fs.createWriteStream(filePath);
    doc.pipe(writeStream);

    doc.end();

    await new Promise((resolve, reject) => {
      writeStream.on('finish', resolve);
      writeStream.on('error', reject);
    });

    console.log('PDF written to file system successfully.');
    console.log('Saving transaction history...');

    console.log('Sending email...');
    try {
      await generateMail(filePath);
      console.log('Email sent successfully.');
    } catch (error) {
      console.error('Error sending email:', error);
    }

}

module.exports = generateInvoice;
