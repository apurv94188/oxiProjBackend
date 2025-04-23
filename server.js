// server.js
const express = require('express');
const { MongoClient } = require('mongodb');
const cors = require('cors');

const app = express();
app.use(cors());
const uri = "mongodb+srv://oxi_mongo_user:Ultimate123%23@oxiproj.wq30zue.mongodb.net/?retryWrites=true&w=majority&appName=OxiProj";
const client = new MongoClient(uri);

app.get('/gettable', async (req, res) => {
  try {
    await client.connect();
    const db = client.db('oxidb');
    const collection = db.collection('firstcollection');
    const data = await collection.find({}).toArray();
    res.json(data);
  } catch (err) {
    res.status(500).send('Error fetching data');
  }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));
