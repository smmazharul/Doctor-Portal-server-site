require("dotenv").config();
const express = require('express');
const { MongoClient, FindCursor } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;
const cors = require('cors');
const { query } = require("express");
app.use(cors())
app.use(express.json())
//doctor-portal-firebase-adminsdk.json

const admin = require("firebase-admin");

const serviceAccount = require("./doctor-portal-firebase-adminsdk.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});






const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.qeyo8.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];

        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {

        }

    }
    next();
}







async function run() {
    try {
        await client.connect();
        console.log('database connected successfully');
        const database = client.db('doctorPortal');
        const appontmentsCollection = database.collection('appointments');
        const UsersCollection = database.collection('Users');
        
        app.get('/appointments',verifyToken, async (req, res) => {
            const email = req.query.email;
            const date =new Date( req.query.date).toLocaleDateString();
            const query = { email: email, date:date}
            const cursor=appontmentsCollection.find(query)
            const appointments = await cursor.toArray();
            res.json(appointments);
        });
        
        
        app.post('/appointments', async (req, res) => {
            const appointment = req.body;
            const result= await appontmentsCollection.insertOne(appointment)
            res.json(result)
        });


        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await UsersCollection.insertOne(user)
            console.log(result);
            res.json(result)
        })

        app.get('/users/:email',async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await UsersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === "admin") {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });
        })

        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email };
            const options = { upsert: true };
            const updateDoc = { $set: user };
            const result =await UsersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        })
        

        app.put('/users/admim',verifyToken, async (req, res) => {
            const user = req.body;
            const requester = req.decodedEmail;
            if (requester) {
                const requesterAccount = UsersCollection.findOne({ email: requester });
                if (requesterAccount.role === 'admin') {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'admin' } }
                    const result = await UsersCollection.updateOne(filter, updateDoc);
                    res.json(result)
                }
            }
            else {
                res.status(403).json({massage:'you do not have access to make admin'})
            }
            
        })

    }
    finally {
        // await client.close()
    }
}
run().catch(console.dir)

app.get('/', (req, res) => {
    res.send('we are making now doctor portal website')
})
app.listen(port, (req, res) => {
    console.log('Running to port',port);
})