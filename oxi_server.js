const express = require('express');
const {MongoClient, ObjectId} = require('mongodb');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
app.use(cors());
app.use(bodyParser.json())

const mongo_uri = 'mongodb://127.0.0.1:27017'
const client = new MongoClient(mongo_uri);

const DB_NAME = 'oxidb';
const COLLECTION_NAME = 'coll_halkat_01';


app.get('/getSheet', async (req, res) => {
    const {user, sheetID} = req.query;
    if(!user || !sheetID) {
        return res.status(400).send('User id or the sheetId is missing');
    }

    try {
        console.log('connectiing to db')
        await client.connect();
        const db = client.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);
        console.log('connected')
        const result = await collection.aggregate([
            { $match: {user} },
            {
                $project: {
                    _id: 0,
                    sheet: {
                        $filter: {
                            input: '$sheets',
                            as: 'sheet',
                            cond: { $eq: ['$$sheet.sheetID', sheetID] }
                        }
                    }
                }
            }
        ]).toArray();

        const sheet = result[0]?.sheet?.[0];

        if (!sheet) {
            return res.status(400).send('Sheet not found');
        }
        res.json(sheet);
    } catch(err) {
        console.error(err);
        res.status(500).send('Error while getting sheet from Mongodb');
    }
});




app.get('/gettable', async (req, res) => {
    console.log("called2")
    try {
      await client.connect();
      //console.log("here")
      const db = client.db('oxidb');
      const collection = db.collection('firstcollection');
      const data = await collection.find({}).toArray();
      //console.log(data);
      res.json(data);
    } catch (err) {
      res.status(500).send('Error fetching data');
    }
  });
  


app.post('/updatedSheet', async (req, res) => {
    const {_id, row, col, newValue} = req.body;
    console.log("updatingg sheet")
    console.log(req.body);
    try {
        await client.connect();
        const db = client.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);

        const udpate_result = await collection.updateOne(
            {_id: ObjectId.createFromHexString(_id), "data.row": row},
            {
                $set: {
                    "data.$.cell.$[elem].value": newValue
                }
            },
            {
                arrayFilters: [{"elem.col": col}]
            }
        );

        res.json({ modifiedCount: udpate_result.modifiedCount});
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to udppate the cell');
    }

});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));