const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const port = process.env.PORT || 5000;


// middlewares
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://final-project-client-d376e.web.app",
      "https://final-project-client-d376e.firebaseapp.com/",
    ]
  })
);
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.i8ufgdv.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();

    const usersCollection = client.db("contestHubDB").collection("users");
    const contestCollection = client.db("contestHubDB").collection("contests");
    const bookingsCollection = client.db("contestHubDB").collection("bookings");
 
 

    // jwt related api
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '20h' });
      res.send({ token });
    })

    //     // middlewares 
    // Verify Token Middleware
    const verifyToken = (req, res, next) => {
      // console.log('inside verify token', req.headers.authorization);
      if (!req.headers.authorization) {
        return res.status(401).send({ message: 'unauthorized access' });
      }
      const token = req.headers.authorization.split(' ')[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if (error) {
          return res.status(401).send({ message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
      })
    }

    // use verify admin after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isAdmin = user?.role === 'admin';
      if (!isAdmin) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }

    // use verify creator after verifyToken
    const verifyCreator = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      const isCreator = user?.role === 'creator';
      if (!isCreator) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      next();
    }



    // ============submit task

    // save a user data in db
    app.put('/user', async (req, res) => {
      const user = req.body
      const query = { email: user?.email }
      // check if user already exists in db
      const isExist = await usersCollection.findOne(query)
      if (isExist) {
        if (user.status === 'Requested') {
          // if existing user try to change his role
          const result = await usersCollection.updateOne(query, {
            $set: { status: user?.status },
          })
          return res.send(result)
        } else {
          // if existing user login again
          return res.send(isExist)
        }
      }

      // save user for the first time
      const options = { upsert: true }
      const updateDoc = {
        $set: {
          ...user,
          timestamp: Date.now(),
        },
      }
      const result = await usersCollection.updateOne(query, updateDoc, options)
      res.send(result)
    })
    // get a user info by email from db
    app.get('/user/:email', async (req, res) => {
      const email = req.params.email
      const result = await usersCollection.findOne({ email })
      res.send(result)
    })

    // get all users data from db
    app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
      // console.log(req.headers);
      const result = await usersCollection.find().toArray()
      res.send(result)
    })


app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    })


    app.get('/contests', async (req, res) => {
      const tag = req.query.tag;
      const query = tag ? { tags: { $regex: tag, $options: 'i' } } : {};
      const result = await contestCollection.find(query).toArray();
      res.send(result);
    });


    // get all  data from db
    app.get('/allcontest', async (req, res) => {
      const result = await contestCollection.find().toArray()
      res.send(result)
    })
    // all data with participants
    app.get('/allcontest-popular', async (req, res) => {
     
      const query = {       
        numberOfParticipants: { $exists: true }
      };
      const result = await contestCollection.find(query).toArray();
      res.send(result)
    })
    
    // to find single (read)
    app.get('/contests/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await contestCollection.findOne(query);
      res.send(result);
    })
    // // to find single (read)
    app.get('/booking/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await bookingsCollection.findOne(query);
      res.send(result);
    })

    app.post('/contests', async (req, res) => {
      const item = req.body;
      const result = await contestCollection.insertOne(item);
      res.send(result);
    });

    // update numberOfParticipants
    app.patch('/contests/participantIncrease/:id', verifyToken, async (req, res) => {
      const id = req.params.id
      // increase numberOfParticipants by one for each single payment
      const query = { _id: new ObjectId(id) }
      const updateDoc = {
        $inc: { numberOfParticipants: 1 },
      }
      const result = await contestCollection.updateOne(query, updateDoc)
      res.send(result)
    })
    // update numberOfWinner
 
    app.patch('/contests-winner/:id',verifyToken, async (req, res) => {
      try {
          const id = req.params.id;
          const { review_status, contestName } = req.body;
  
          if (review_status === 'Winner') {
              // Check if there's already a winner for this contest
              const existingWinner = await bookingsCollection.findOne({
                  contestName,
                  review_status: 'Winner',
              });
  
              if (existingWinner) {
                  return res.status(400).send('A winner has already been selected for this contest');
              }
          }
  
          // Proceed to update the user's review status
          const query = { _id: new ObjectId(id) };
          const updateDoc = {
              $set: { review_status },
          };
          const result = await bookingsCollection.updateOne(query, updateDoc);
  
          if (result.matchedCount === 0) {
              return res.status(404).send('User not found');
          }
  
          res.send(result);
      } catch (error) {
          console.error('Error updating contest winner:', error);
          res.status(500).send('Server Error');
      }
  });

  // top winners
  app.get('/top-winners', async (req, res) => {
    try {
        const pipeline = [
            {
                $match: { review_status: 'Winner' }
            },
            {
                $group: {
                    _id: "$user_email",
                    count: { $sum: 1 },
                    user_name: { $first: "$user_name" },
                    user_email: { $first: "$user_email" },
                    user_photo: { $first: "$user_photo" }
                }
            },
            {
                $sort: { count: -1 }
            },
            {
                $limit: 3
            }
        ];

        const topWinners = await bookingsCollection.aggregate(pipeline).toArray();
        res.send(topWinners);
    } catch (error) {
        console.error('Error fetching top winners:', error);
        res.status(500).send('Server Error');
    }
});

// top creators
app.get('/top-creators', async (req, res) => {
  try {
      const pipeline = [
          {
              $group: {
                  _id: "$creator_email",
                  totalParticipants: { $sum: "$numberOfParticipants" },
                  creator_name: { $first: "$creator_name" },
                  creator_email: { $first: "$creator_email" },
                  creator_photo: { $first: "$creator_photo" }
              }
          },
          {
              $sort: { totalParticipants: -1 }
          },
          {
              $limit: 3
          }
      ];

      const topCreators = await bookingsCollection.aggregate(pipeline).toArray();
      res.send(topCreators);
  } catch (error) {
      console.error('Error fetching top creators:', error);
      res.status(500).send('Server Error');
  }
});

    // added comment 

    app.patch('/contests/update/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id
      const { comment } = req.body

      if (!comment) {
        return res.status(400).send({ message: 'Comment is required' })
      }

      const query = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: { comment: comment }, // Update the comment field
      }


      const result = await contestCollection.updateOne(query, updateDoc)
      res.send(result)

    })
    app.patch('/booking/taskview/:id', verifyToken, async (req, res) => {
      const id = req.params.id;
      const data = req.body;
      const query = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          submit_doc: data.submit_doc,
          review_status: 'Pending'
        },
      };
      const result = await bookingsCollection.updateOne(query, updateDoc);
      res.send(result);
    });


    app.get("/allAccepted", async (req, res) => {
      try {
        const result = await contestCollection.find({
          $and: [
            { status: "accepted" },
            { creator_email: { $exists: true, $ne: "" } }
          ]
        }).toArray();

        console.log(result);
        res.json(result);
      } catch (err) {
        console.error(err);
        res.status(500).send("Error fetching accepted contests");
      }
    });

    // get all contest for creator
    app.get('/myCreated/:email',verifyToken, verifyCreator, async (req, res) => {
      const email = req.params.email
      let query = { creator_email: email }
      const result = await contestCollection.find(query).toArray()
      res.send(result)
    })

      app.get('/userchart/:email', verifyToken, async (req, res) => {
        try {
          const email = req.params.email;
          const query = { user_email: email, review_status: { $exists: true } };
          const result = await bookingsCollection.find(query).toArray();
          res.send(result || []);
        } catch (error) {
          console.error('Error fetching user chart data:', error);
          res.status(500).send('Server Error');
        }
      });
      
    // final booking sorting for creator****************
    app.get('/myContestSubmitted/:email', verifyToken, verifyCreator, async (req, res) => {
      const email = req.params.email;
      const query = {
        creator_email: email,
        submit_doc: { $exists: true }
      };
      const result = await bookingsCollection.find(query).toArray();
      res.send(result)
    })
    // review status Winner of user_email
    app.get('/winner-user/:email', async (req, res) => {
      try {
        const email = req.params.email;
        const query = { user_email: email, review_status: 'Winner' }; // Modify query to include review_status: 'Winner'
        const result = await bookingsCollection.find(query).toArray();
        res.send(result || []);
      } catch (error) {
        console.error('Error fetching user chart data:', error);
        res.status(500).send('Server Error');
      }
    });
    

    // generated jhamela holo onek
    app.patch('/reviewstatus/:id',verifyToken, verifyCreator, async (req, res) => {
      const id = req.params.id;
      const { review_status } = req.body;

      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          review_status: review_status
        }
      };
      const result = await bookingsCollection.updateOne(filter, updateDoc);
      res.send(result)

    });


    //update result mark change by admin 
    // app.patch('/bookings-updates/:id', verifyToken, verifyAdmin, async (req, res) => {
    //   const id = req.params.id
    //   console.log(id);
    //   const { booking } = req.body
    //   const filter = { _id: new ObjectId(id) }
    //   console.log(filter);
    //   const updateDoc = {
    //     $set: { review_status: booking.review_status }

    //   }


    //   const result = await bookingsCollection.updateOne(filter, updateDoc)
    //   res.send(result)
    // })
    // status change by admin
    app.patch('/contests/accepted/:id', verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          status: 'accepted'
        }
      }
      const result = await contestCollection.updateOne(filter, updatedDoc)
      res.send(result);
    })

    // newly code
    // app.get('/bookingsCreator', async (req, res) => {
    //   const creatorEmail = req.query.creator_email;

    //   if (!creatorEmail) {
    //     return res.status(400).send('creator_email query parameter is required');
    //   }

    //   const result = await bookingsCollection.find({ creator_email: creatorEmail }).toArray();
    //   res.json(result);
    // })
    app.patch('/bookings/reviewed/:id', verifyToken, verifyCreator, async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          review_status: 'Winner'
        }
      }
      const result = await contestCollection.updateOne(filter, updatedDoc)
      res.send(result);
    })


   
    app.patch('/contests/:id', verifyToken, verifyCreator, async (req, res) => {
      const data = req.body;
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedDoc = {
        $set: {
          contestName: data.contestName,
          prizeMoney: data.prizeMoney,
          contestPrice: data.contestPrice,
          taskSubmissionInstructions: data.taskSubmissionInstructions,
          image: data.image,
          tags: data.tags,
          contestDescription: data.contestDescription,
          contestDeadline: data.contestDeadline
        }
      }

      const result = await contestCollection.updateOne(filter, updatedDoc)
      res.send(result);
    })

  // user's role update. only admin parbe
  app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updatedDoc = {
      $set: {
        role: 'admin'
      }
    }
    const result = await usersCollection.updateOne(filter, updatedDoc);
    res.send(result);
  })
  app.patch('/users/creator/:id', verifyToken, verifyAdmin, async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updatedDoc = {
      $set: {
        role: 'creator'
      }
    }
    const result = await usersCollection.updateOne(filter, updatedDoc);
    res.send(result);
  })
  app.patch('/users/user/:id', verifyToken, verifyAdmin, async (req, res) => {
    const id = req.params.id;
    const filter = { _id: new ObjectId(id) };
    const updatedDoc = {
      $set: {
        role: 'user'
      }
    }
    const result = await usersCollection.updateOne(filter, updatedDoc);
    res.send(result);
  })
    
    
    app.delete('/contests/:id', verifyToken, verifyCreator, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await contestCollection.deleteOne(query);
      res.send(result);
    })
    
    // payment intent
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      console.log(amount, 'amount inside the intent')

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      console.log(paymentIntent);
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    });

    app.get('/bookings/:email', verifyToken, async (req, res) => {
      const email = req.params.email;
      const currentDate = new Date();
      const result = await bookingsCollection.find({ user_email: email }).sort({ contestDeadline: 1 }).toArray();
      res.send(result);

    })

    // api email creator

    app.get('/bookingSubmitted/:email', verifyToken, verifyCreator, async (req, res) => {
      const email = req.params.email;
      const result = await bookingsCollection.find({ creator_email: email }).toArray();
      res.send(result);

    })

    app.get('/bookings', verifyToken, verifyCreator, async (req, res) => {
      const result = await bookingsCollection.find().toArray();
      res.send(result);
    })

    app.post('/booking', verifyToken, async (req, res) => {
      const bookingData = req.body
      const result = await bookingsCollection.insertOne(bookingData)
      res.send(result)
    })



    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Contest hub is running')
})
app.listen(port, () => {
  console.log(`Contest hub is running on port ${port}`);
})