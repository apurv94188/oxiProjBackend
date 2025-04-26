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
    const {user, sheetID, row, cell, value} = req.body;

    try {
        await client.connect();
        const db = client.db(DB_NAME);
        const collection = db.collection(COLLECTION_NAME);

        const udpate_result = await collection.updateOne(
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

        if (udpate_result.modifiedCount > 0){
            res.json({ 
                success: 1,
                modifiedCount: udpate_result.modifiedCount
            });
        }
    } catch (err) {
        console.error('Error updating sheet:', error);
        res.status(500).send('Failed to udppate the cell');
    }

});

app.listen(3000, () => console.log('Server running on http://localhost:3000'));