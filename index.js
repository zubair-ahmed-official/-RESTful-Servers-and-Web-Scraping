import express from 'express';
import cors from 'cors'; // Import CORS package
import https from 'https';
import fs from 'fs';
import driversRouter from './drivers.js';
import carsRouter from './cars.js'; 
import trackRouter from './track.js'; 
import raceRouter from './races.js'; 

const app = express();
const PORT = 3389; // Keep your port number

// Load SSL certificate and key
const sslOptions = {
    key: fs.readFileSync('./server.key'), // Update with the correct path
    cert: fs.readFileSync('./server.cert') // Update with the correct path
};

// Enable CORS
app.use(cors({
    origin: 'http://lab-2105cf46-fd70-4e4b-8ece-4494323c5240.australiaeast.cloudapp.azure.com:7084/', // Update with your client URL
    methods: 'GET,PUT,POST,DELETE',
}));

// Parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use("/driverPage",express.static('driver'));
app.use("/carPage",express.static('car'));
app.use("/trackPage",express.static('track'));
app.use("/racePage",express.static('race'));

// Define routes
app.use("/driver", driversRouter);
app.use("/car", carsRouter);
app.use("/track", trackRouter);
app.use('/race', raceRouter);

app.use((req, res, next) => {
    res.status(405).send('Method Not Allowed');
});

// Basic error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Create HTTPS server
https.createServer(sslOptions, app).listen(PORT, () => {
    console.log(`HTTPS Server is running on port ${PORT}`);
});
