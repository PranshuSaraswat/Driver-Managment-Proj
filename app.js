const express = require('express');
const { MongoClient } = require('mongodb');
const dbConfig = require('./atlas_url');
const generateInvoice = require('./Proformainvoice');

const app = express();
app.use(express.json()); // to use the request body as JSON

let client;
let db;
let isConnected = false;

// Connect to MongoDB
MongoClient.connect(dbConfig.url)
  .then(clientInstance => {
    client = clientInstance;
    db = client.db(dbConfig.dbName);
    console.log('Connected to database:', dbConfig.dbName);
    console.log('Using collection:', dbConfig.collectionName);
    isConnected = true;
  })
  .then(() => {
    // Start the server
    app.listen(3000, () => {
      console.log('Server running on port 3000');
    }).on('error', (err) => {
      console.error('Error starting server:', err);
      if (err.code === 'EADDRINUSE') {
        console.log('Port 3000 is already in use. Try using a different port.');
      }
    });
  })
  .catch(err => {
    console.error('Error connecting to MongoDB:', err);
  });

// Define routes
app.post("/AddDriver", async (request, response) => {
  if (!isConnected) {
    response.status(500).json({ error: 'Database connection not established' });
    return;
  }

  const driver = {
    name: request.body.name,
    phone: request.body.phone,
    licenseNumber: request.body.licenseNumber,
    balance: 0
  };

  try {
    const collection = db.collection(dbConfig.collectionName);
    const existingDriver = await collection.findOne({ phone: driver.phone });
    if (existingDriver) {
      response.json({ message: 'Driver details already exist', driver: existingDriver });
    } else {
      const Reg=/^[789]\d{9}$/;
      const checknum= Reg.test(driver.phone);//india
      try{
        if(!checknum) {
          throw new Error();
        }//change here
      }
      catch(err){
        //console.log("Invalid Phone Number Entered");
        response.status(400).json({ error: "Invalid Phone Number"});
        return; //prevent the server from shutting down
      }
  
      const result = await collection.insertOne(driver);
      response.json({ message: 'Driver details added successfully' });
    }
  } catch (err) {
    console.log('Error adding driver:', err);
    response.status(500).json({ error: 'Error adding driver' });
    return; //prevent the server from shutting down
  }
});
//get driver by name
app.get("/DriverByName/:name", async (request, response) => {
  if (!isConnected) {
    response.status(500).json({ error: 'Database connection not established' });
    return;
  }

  const name = request.params.name;

  if (!name || name.length === 0) {
    response.status(400).json({ error: 'Invalid name' });
    return;
  }

  try {
    const collection = db.collection(dbConfig.collectionName);
    const drivers = await collection.find({ name: name }).toArray();
    if (drivers.length > 0) {
      response.json({ message: 'Driver details found', drivers: drivers });
    } else {
      response.json({ message: 'Driver details not found' });
    }
  } catch (err) {
    console.log('Error getting driver:', err);
    response.status(500).json({ error: 'Error getting driver' });
  }
});
//multiple drivers using get name
app.post("/MultipleByName", async (request, response) => {
  if (!isConnected) {
    response.status(500).json({ error: 'Database connection not established' });
    return;
  }

  const names = request.body.names;
  function isAlphabetAndSpaces(arr) {
    return arr.every(str => /^[A-Za-z\s]+$/.test(str));
  }

  if (!names || names.length === 0 || !isAlphabetAndSpaces(names)) {
    response.status(400).json({ error: 'Invalid name' });
    return;
  }

  try {
    const collection = db.collection(dbConfig.collectionName);
    const regex = new RegExp(names.join('|'), 'i'); // create a regex pattern from the names array
    const drivers = await collection.find({ name: { $regex: regex } }).toArray();
    if (drivers.length > 0) {
      response.json({ message: 'Driver details found', drivers: drivers });
    } else {
      response.json({ message: 'Driver details not found' });
    }
  } catch (err) {
    console.log('Error getting drivers:', err);
    response.status(500).json({ error: 'Error getting drivers' });
  }
});
// Get driver balance by phone number
app.get("/Balance/:phone", async (request, response) => {
  if (!isConnected) {
    response.status(500).json({ error: 'Database connection not established' });
    return;
  }

  const phone = request.params.phone;

  if (!phone || phone.length === 0) {
    response.status(400).json({ error: 'Invalid phone number' });
    return;
  }

  try {
    const collection = db.collection(dbConfig.collectionName);
    const driver = await collection.findOne({ phone: phone });
    if (driver) {
      if (driver.balance > 3000){
        response.json({ message: 'Pay immediately! Your balance is ' + driver.balance });
      }
      else{
        response.json({ message: 'Driver balance Under Limit', balance: driver.balance });
      }
    } else {
      response.json({ message: 'Driver balance not found' });
    }
  } catch (err) {
    console.log('Error getting driver balance:', err);
    response.status(500).json({ error: 'Error getting driver balance' });
  }
});
// Pay driver balance fully or partially
app.post("/PayBalance/:phone", async (request, response) => {
  if (!isConnected) {
    response.status(500).json({ error: 'Database connection not established' });
    return;
  }

  const phone = request.params.phone;
  const paymentAmount = request.body.paymentAmount;
  const paymentType = request.body.paymentType; // 'full' or 'partial'

  if (!phone || phone.length === 0) {
    response.status(400).json({ error: 'Invalid phone number' });
    return;
  }

  if (!paymentAmount || paymentAmount <= 0) {
    response.status(400).json({ error: 'Invalid payment amount' });
    return;
  }

  if (!paymentType || (paymentType !== 'full' && paymentType !== 'partial')) {
    response.status(400).json({ error: 'Invalid payment type' });
    return;
  }

  try {
    const collection = db.collection(dbConfig.collectionName);
    const driver = await collection.findOne({ phone: phone });
    if (driver) {
      if (paymentType === 'full') {
        // Pay full balance
        const newBalance = 0;
        await collection.updateOne({ phone: phone }, { $set: { balance: newBalance } });
        await saveTransactionHistory(phone, "payment", driver.balance);
        response.json({ message: 'Balance paid in full' });
      } else if (paymentType === 'partial') {
        // Pay partial balance
        const newBalance = driver.balance - paymentAmount;
        if (newBalance < 0) {
          response.status(400).json({ error: 'Payment amount exceeds balance' });
          return;
        }
        await collection.updateOne({ phone: phone }, { $set: { balance: newBalance } });
        await saveTransactionHistory(phone, "payment", paymentAmount);
        //
        generateInvoice(driver, "Balance Payed", paymentAmount, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
        response.json({ message: 'Partial payment successful' });
      }
    } else {
      response.json({ message: 'Driver balance not found' });
    }
  } catch (err) {
    console.log('Error paying driver balance:', err);
    response.status(500).json({ error: 'Error paying driver balance' });
  }
});
//save transaction history
async function saveTransactionHistory(phoneNumber, transactionType, amount) {
  try {
    const collection = db.collection(dbConfig.collectionName);
    const driver = await collection.findOne({ phone: phoneNumber });
    if (driver) {
      const transactionHistoryCollection = db.collection(dbConfig.collectionName2);
      const transactionHistory = {
        driverId: driver._id,
        transactionType,
        amount,
        timestamp: new Date()
      };
      if (transactionType === 'subscription') {
        transactionHistory.expireAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // expire in 30 days
      }
      await transactionHistoryCollection.insertOne(transactionHistory);
    } else {
      console.log('Error: Driver not found');
    }
  } catch (err) {
    console.log('Error saving transaction history:', err);
  }
}
// Subscribe and add balance
app.post("/Subscribe", async (request, response) => {
  const { phone, subscriptionAmount } = request.body;

  if (!phone || !subscriptionAmount) {
    return response.status(400).json({ error: 'Phone and subscription amount are required' });
  }

  if (subscriptionAmount !== 500 && subscriptionAmount !== 1000) {
    return response.status(400).json({ error: 'Invalid subscription amount. Must be 500 or 1000' });
  }

  try {
    const collection = db.collection('drivers');
    const driver = await collection.findOne({ phone: phone });

    if (!driver) {
      return response.status(404).json({ error: 'Driver not found' });
    }

    // Check if the existing balance exceeds the limit
    if (driver.balance >= 3000) {
      return response.status(400).json({ error: 'Cant Subscribe, Balance already exceeds 3000' });
    }

    const newBalance = driver.balance + subscriptionAmount;
    await collection.updateOne({ phone: phone }, { $set: { balance: newBalance } });

    // Save transaction history
    await saveTransactionHistory(phone, "subscription", subscriptionAmount);

    // Generate an invoice after a successful subscription
    generateInvoice(driver, "subscription", subscriptionAmount, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)); // expire in 30 days

    response.json({ message: `Subscription successful. Balance updated to ${newBalance}` });
  } catch (err) {
    console.log('Error subscribing and adding balance:', err);
    response.status(500).json({ error: 'Error subscribing and adding balance' });
  }
});
