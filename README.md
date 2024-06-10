## Final Assignment Server
This project is a server-side application built using Express.js, Node.js, MongoDB, and other related technologies. It provides APIs for Contest Platform, user authentication, and various features for an educational platform.

## Table of Contents
# Features: 
- User authentication with JWT.
- CRUD operations for Contests.
- Manage payment using stripe for particiaption in contests.
- Fetch and manage features for the platform.
- Secure API endpoints with token verification.

# Installation
To set up the project locally, follow these steps:
1. Clone the repository:
git clone https://final-project-server-snowy.vercel.app
cd final-project-server
Install dependencies:

2. npm install

3. Create a .env file in the root directory and add the following environment variables:

    PORT=5000
    DB_USER=yourMongoDBUsername
    DB_PASS=yourMongoDBPassword
    ACCESS_TOKEN_SECRET=yourSecretKey
    STRIPE_SECRET_KEY=yourStripeSecretKey

4. Start the server: npm start

# Configuration
The project uses environment variables for configuration. Ensure you have a .env file with the necessary variables:

- PORT: The port number for the server.
- DB_USER: Your MongoDB username.
- DB_PASS: Your MongoDB password.
- ACCESS_TOKEN_SECRET: The secret key for JWT.
- STRIPE_SECRET_KEY: The Secret Key to make the payment successfully using Stripe

# Usage
Once the server is running, it will be accessible at 
http://localhost:5000. You can interact with the API using a tool like Postman or through your front-end application.

# API Endpoints

- Auth Endpoints
POST /jwt: Generate JWT for user authentication.
POST /logout: Logout the user by clearing the JWT.

- Contests Endpoints
GET /contests: Fetch all Contests.
GET /contests: Fetch all Contests with query for tags.
GET /contests/:id: Fetch a single contests by ID.
POST /contests: Create a new contests.
PUT /contests/:id: Update an contests by ID.
DELETE /contests/:id: Delete an contests by ID.

- Booking Endpoints
GET /submitPending: Fetch all submissions with  (requires token).
GET /submit/:id: Fetch a single submission by ID (requires token).
GET /submit: Fetch all submissions (requires token).
GET /mySubmit/:email: Fetch submissions for a specific email (requires token).
POST /submit: Create a new submission.
PUT /submit/:id: Update a submission by ID.

- User Endpoints
GET /submitPending: Fetch all submissions with  (requires token).
GET /submit/:id: Fetch a single submission by ID (requires token).
GET /submit: Fetch all submissions (requires token).
GET /mySubmit/:email: Fetch submissions for a specific email (requires token).
POST /submit: Create a new submission.
PUT /submit/:id: Update a submission by ID.

- Booking Endpoints
POST /create-payment-intent: create all payment intent with stripe
GET /submit/:id: Fetch a single submission by ID (requires token).
GET /submit: Fetch all submissions (requires token).
GET /mySubmit/:email: Fetch submissions for a specific email (requires token).
POST /submit: Create a new submission.
PUT /submit/:id: Update a submission by ID.

- Root Endpoint
GET /: Base endpoint to check if the server is running.

# Middleware
verifyToken: Verifies JWT token for protected routes.
verify admin middleware: Verifies the protected routes based on users role.
verify creator middleware: Verifies the protected routes based on creators role.
