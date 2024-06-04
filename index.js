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
    const bookingCollection = client.db("contestHubDB").collection("booking");

     // verify admin middleware
    const verifyAdmin = async (req, res, next) => {
      console.log('hello');
      const user = req.user
      const query = { email: email }
      const result = await usersCollection.findOne(query)
      console.log(result?.role)
      if (!result || result?.role !== 'admin')
        return res.status(401).send({ message: 'unauthorized access!!' })

      next()
    }
    // verify creator middleware
    const verifyCreator = async (req, res, next) => {
      console.log('hello')
      const user = req.user
      const query = { email: email }
      const result = await usersCollection.findOne(query)
      console.log(result?.role)
      if (!result || result?.role !== 'creator') {
        return res.status(401).send({ message: 'unauthorized access!!' })
      }

      next()
    }

    
    
    
    // jwt related api
     app.post('/jwt', async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '20h' });
      res.send({ token });
    })

//     // middlewares 
  // Verify Token Middleware
const verifyToken = async (req, res, next) => {
  const token = req.cookies?.token
  console.log(token)
  if (!token) {
    return res.status(401).send({ message: 'unauthorized access' })
  }
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      console.log(err)
      return res.status(401).send({ message: 'unauthorized access' })
    }
    req.user = decoded
    next()
  })
}

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
app.get('/users', async (req, res) => {
  const result = await usersCollection.find().toArray()
  res.send(result)
})



//     //   users related api. all user data only admin pabe
//     app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
//       console.log(req.headers);
//       const result = await userCollection.find().toArray();
//       res.send(result);
//     });
// // admin user api
//     app.get('/users/admin/:email', verifyToken, async (req, res) => {
//       const email = req.params.email;

//       if (email !== req.decoded.email) {
//         return res.status(403).send({ message: 'forbidden access' })
//       }

//       const query = { email: email };
//       const user = await userCollection.findOne(query);
//       let admin = false;
//       if (user) {
//         admin = user?.role === 'admin';
//       }
//       res.send({ admin });
//     })

//     app.post('/users', async (req, res) => {
//       const user = req.body;
//       // insert email if user doesnt exists: 
//       // you can do this many ways (1. email unique, 2. upsert 3. simple checking)
//       const query = { email: user.email }
//       const existingUser = await userCollection.findOne(query);
//       if (existingUser) {
//         return res.send({ message: 'user already exists', insertedId: null })
//       }
//       const result = await userCollection.insertOne(user);
//       res.send(result);
//     });
// user's role update. only admin parbe
   
// 

    // main contest api

  
app.get('/contests', async (req, res) => {
  const tag = req.query.tag;
  const query = tag ? { tags: { $regex: tag, $options: 'i' } } : {};
  const result = await contestCollection.find(query).toArray();
  res.send(result);
});
// // to find single (read)
app.get('/contests/:id', async (req, res) => {
  const id = req.params.id;
  const query = { _id: new ObjectId(id) }
  const result = await contestCollection.findOne(query);
  res.send(result);
})

app.post('/contests', async (req, res) => {
  const item = req.body;
  const result = await contestCollection.insertOne(item);
  res.send(result);
});

    // update Room Status
    app.patch('/contests/status/:id', async (req, res) => {
      const id = req.params.id
      const status = req.body.status
      // change room availability status
      const query = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: { booked: status },
      }
      const result = await contestCollection.updateOne(query, updateDoc)
      res.send(result)
    })

    // get all contest for creator
    app.get('/myCreated/:email', async (req, res) => {
      const email = req.params.email
      let query = { creator_email: email }
      const result = await contestCollection.find(query).toArray()
      res.send(result)
    })

// app.patch('/menu/:id', async (req, res) => {
//   const item = req.body;
//   const id = req.params.id;
//   const filter = { _id: new ObjectId(id) }
//   const updatedDoc = {
//     $set: {
//       name: item.name,
//       category: item.category,
//       price: item.price,
//       recipe: item.recipe,
//       image: item.image
//     }
//   }

//   const result = await menuCollection.updateOne(filter, updatedDoc)
//   res.send(result);
// })
  //update a user role
  app.patch('/users/update/:email', async (req, res) => {
    const email = req.params.email
    const user = req.body
    const query = { email }
    const updateDoc = {
      $set: { ...user, timestamp: Date.now() },
    }
    const result = await usersCollection.updateOne(query, updateDoc)
    res.send(result)
  })


    app.delete('/contests/:id', verifyToken, verifyCreator, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await contestCollection.deleteOne(query);
      res.send(result);
    })

    // review api
    // app.get('/reviews', async (req, res) => {
    //   const result = await reviewCollection.find().toArray();
    //   res.send(result);
    // })
    // GET /cart: find all cart collection.
    // app.get('/carts', async (req, res) => {
    //   const result = await cartCollection.find().toArray();
    //   res.send(result);
    // })
    // app.get('/carts', async (req, res) => {
    //   const email = req.query.email;
    //   const query = { email: email };
    //   const result = await cartCollection.find(query).toArray();
    //   res.send(result);
    // });

    // POST /cart: insert into all cart collection.

    // app.post('/carts', async (req, res) => {
    //   const cartItem = req.body;
    //   const result = await cartCollection.insertOne(cartItem);
    //   res.send(result);
    // });
    // // DELETE /cart: Delete a specific cart item from cart collection.
    // app.delete('/carts/:id', async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: new ObjectId(id) }
    //   const result = await cartCollection.deleteOne(query);
    //   res.send(result);
    // })

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

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    });


    app.get('/payments/:email', async (req, res) => {
      const query = { email: req.params.email }
      if (req.params.email !== req.decoded.email) {
        return res.status(403).send({ message: 'forbidden access' });
      }
      const result = await paymentCollection.find(query).toArray();
      res.send(result);
    })

     // Save a booking data in db
     app.post('/booking', async (req, res) => {
    //  app.post('/booking', verifyToken, async (req, res) => {
      const bookingData = req.body
      // save room booking info
      const result = await bookingCollection.insertOne(bookingData)
      // send email to guest
      sendEmail(bookingData?.user?.email, {
        subject: 'Booking Successful!',
        message: `You've successfully booked a room through StayVista. Transaction Id: ${bookingData.transactionId}`,
      })


      res.send(result)
    })


  
    app.post('/payments', async (req, res) => {
      const payment = req.body;
      const paymentResult = await paymentCollection.insertOne(payment);

      //  carefully delete each item from the cart
      console.log('payment info', payment);
      const query = {
        _id: {
          $in: payment.registeredIds (id => new ObjectId(id))
        }
      };

      res.send({ paymentResult });
    })
// // stats or analytics
    app.get('/admin-stats', async (req, res) => {
      // count korar jonno
      const users = await usersCollection.estimatedDocumentCount();
      // const menuItems = await menuCollection.estimatedDocumentCount();
      const orders = await paymentCollection.estimatedDocumentCount();

      // this is not the best way
      // const payments = await paymentCollection.find().toArray();
      // const revenue = payments.reduce((total, payment) => total + payment.price, 0);

      const result = await paymentCollection.aggregate([
        {
          $group: {
            _id: null,
            totalRevenue: {
              $sum: '$price'
            }
          }
        }
      ]).toArray();

      const revenue = result.length > 0 ? result[0].totalRevenue : 0;

      res.send({
        users,
        menuItems,
        orders,
        revenue
      })
    })


    // order status advance
    /**
     * ----------------------------
     *    NON-Efficient Way
     * ------------------------------
     * 1. load all the payments
     * 2. for every menuItemIds (which is an array), go find the item from menu collection
     * 3. for every item in the menu collection that you found from a payment entry (document)
    */

    // using aggregate pipeline
    app.get('/order-stats', async(req, res) =>{
      const result = await paymentCollection.aggregate([
        {
          $unwind: '$menuItemIds'
        },
        {
          $lookup: {
            from: 'menu',
            localField: 'menuItemIds',
            foreignField: '_id',
            as: 'menuItems'
          }
        },
        // {
        //   $unwind: '$menuItems'
        // },
        // {
        //   $group: {
        //     _id: '$menuItems.category',
        //     quantity:{ $sum: 1 },
        //     revenue: { $sum: '$menuItems.price'} 
        //   }
        // },
        // {
        //   $project: {
        //     _id: 0,
        //     category: '$_id',
        //     quantity: '$quantity',
        //     revenue: '$revenue'
        //   }
        // }
      ]).toArray();

      res.send(result);

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