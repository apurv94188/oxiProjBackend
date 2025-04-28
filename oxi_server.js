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
        await client.connect();
        const db = client.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);
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


app.patch('/api/updateCell', async (req, res) => {
  const { user, sheetID, row, cell, value } = req.body;

  try {
    await client.connect();
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Step 1: Try fast direct update of existing cell
    const fastUpdate = await collection.updateOne(
      { user, 'sheets.sheetID': sheetID },
      {
        $set: {
          'sheets.$[sheetI].data.$[rowI].col.$[cellI].value': value
        }
      },
      {
        arrayFilters: [
          { 'sheetI.sheetID': sheetID },
          { 'rowI.row': row },
          { 'cellI.cell': cell }
        ]
      }
    );

    if (fastUpdate.modifiedCount > 0) {
      return res.json({ success: 1, mode: 'fast-update' });
    }

    // Step 2: If cell not found, try pushing a new cell into existing row
    const pushCell = await collection.updateOne(
      { user, 'sheets.sheetID': sheetID, 'sheets.data.row': row },
      {
        $push: {
          'sheets.$[sheetI].data.$[rowI].col': {
            cell,
            value,
            style: {} // default empty style
          }
        }
      },
      {
        arrayFilters: [
          { 'sheetI.sheetID': sheetID },
          { 'rowI.row': row }
        ]
      }
    );

    if (pushCell.modifiedCount > 0) {
      return res.json({ success: 1, mode: 'pushed-new-cell' });
    }

    // Step 3: If row also doesn't exist, push a new row with new cell
    const pushRow = await collection.updateOne(
      { user, 'sheets.sheetID': sheetID },
      {
        $push: {
          'sheets.$[sheetI].data': {
            row,
            col: [{
              cell,
              value,
              style: {} // default style
            }]
          }
        }
      },
      {
        arrayFilters: [
          { 'sheetI.sheetID': sheetID }
        ]
      }
    );

    if (pushRow.modifiedCount > 0) {
      return res.json({ success: 1, mode: 'pushed-new-row-and-cell' });
    }

    // Step 4: If none of the updates worked
    res.status(404).json({ success: 0, error: 'User or Sheet not found' });

  } catch (error) {
    console.error('Error updating sheet:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));