import express from 'express';
import dbconn from './dbconn.js';
import axios from 'axios';
import https from 'https';

// Get all tracks
const getTracks = (req, res) => {
    dbconn.query('SELECT id, name, type, totalLaps, baseLapTime FROM tracks', (err, rows) => {
        if (err) {
            res.status(500).send({ error: 'Failed to retrieve tracks' });
            return;
        }

        // Map the rows to the track format
        const tracks = rows.map(row => ({
            id: row.id,
            name: row.name,
            type: row.type,
            totalLaps: row.totalLaps,
            baseLapTime: row.baseLapTime
        }));

        res.json(tracks);
    });
};

// Get a specific track by ID
const getTrack = (req, res) => {
    const trackId = req.params.id;
    dbconn.query('SELECT id, name, type, totalLaps, baseLapTime FROM tracks WHERE id = ?', [trackId], (err, rows) => {
        if (err) {
            res.status(500).send({ error: 'Failed to retrieve track' });
            return;
        }

        if (rows.length === 0) {
            res.status(404).send({ error: 'Track not found' });
            return;
        }

        const row = rows[0];
        const track = {
            id: row.id,
            name: row.name,
            type: row.type,
            totalLaps: row.totalLaps,
            baseLapTime: row.baseLapTime
        };

        res.json(track);
    });
};

// Add a new track
const addTrack = (req, res) => {
    const { name, type, totalLaps, baseLapTime } = req.body;

    // Validate that the required fields are provided
    if (!name || !type ||  totalLaps === undefined || baseLapTime === undefined) {
        return res.status(400).send({ error: 'All fields are required' });
    }

    console.log('Inserting track data:', { name, type, totalLaps, baseLapTime });

    // Insert the new track into the database
    const sql = 'INSERT INTO tracks (name, type, totalLaps, baseLapTime) VALUES (?, ?, ?, ?)';
    dbconn.query(sql, [name, type, totalLaps, baseLapTime], (err, result) => {
        if (err) {
            console.error('Error executing query:', err); // Log the SQL error
            return res.status(500).send({ error: `Database error: ${err.message}` });
        }

        res.status(201).send({ message: 'Track successfully added', trackId: result.insertId });
    });
};

// Update an existing track
const updateTrack = (req, res) => {
    const trackId = req.params.id;
    const { name, type, totalLaps, baseLapTime } = req.body;

    const sql = `
        UPDATE tracks
        SET name = ?, type = ?, totalLaps = ?, baseLapTime = ?
        WHERE id = ?
    `;

    dbconn.query(sql, [name, type, totalLaps, baseLapTime, trackId], (err, result) => {
        if (err) {
            res.status(500).send({ error: 'Failed to update track' });
            return;
        }

        if (result.affectedRows === 0) {
            res.status(404).send({ error: 'Track not found' });
            return;
        }

        res.send({ message: 'Track successfully updated' });
    });
};

// Delete a track by ID
const deleteTrack = (req, res) => {
    const trackId = req.params.id;

    const sql = 'DELETE FROM tracks WHERE id = ?';
    dbconn.query(sql, [trackId], (err, result) => {
        if (err) {
            res.status(500).send({ error: 'Failed to delete track' });
            return;
        }

        if (result.affectedRows === 0) {
            res.status(404).send({ error: 'Track not found' });
            return;
        }

        res.send({ message: 'Track successfully deleted' });
    });
};

const getRaces = (req, res) => {
    const trackId = req.params.id;

    dbconn.query('SELECT * FROM races WHERE track_id = ?', [trackId], (err, rows) => {
        if (err) {
            res.status(500).send({ error: 'Failed to retrieve races' });
            return;
        }

        // If no races found, return a 404
        if (rows.length === 0) {
            res.status(404).send({ error: 'No races found for this track' });
            return;
        }

        // Map the rows to the expected race format
        const races = rows.map(row => ({
            id: row.id,
            name: row.name,
            entrants: row.entrants,
            laps: row.laps,
            createdAt: row.created_at // Assuming you have a created_at timestamp
        }));

        res.json(races);
    });
};

// Create a new race for a specific track
const createRace = (req, res) => {
    const trackId = req.params.id; // Get the track ID from the request parameters
    const { name, entrants, laps, startingPositions } = req.body; // Extract race details from the request body

    // Input validation (ensure required fields are provided)
    if (!name || !entrants || !laps || !startingPositions) {
        return res.status(400).send({ error: 'Race name, entrants, laps, and startingPositions are required.' });
    }

    // Construct the SQL query to insert the new race
    const query = 'INSERT INTO races (track_id, name, entrants, laps, startingPositions) VALUES (?, ?, ?, ?, ?)';
    const values = [trackId, name, JSON.stringify(entrants), laps, JSON.stringify(startingPositions)]; // Convert entrants and startingPositions to JSON strings

    // Execute the query
    dbconn.query(query, values, (err, result) => {
        if (err) {
            console.error(err);
            return res.status(500).send({ error: 'Failed to create race.' });
        }

        // Respond with the created race information
        res.status(201).send({
            id: result.insertId,
            trackId: trackId,
            name: name,
            entrants: entrants,
            laps: laps,
            startingPositions: startingPositions,
            createdAt: new Date() // Add creation date if needed
        });
    });
};

import { JSDOM } from 'jsdom';

const sampleTrack = {
  id: 1,
  name: 'Monaco',
  type: 'normal race track',
  totalLaps: 78,
  baseLapTime: 75, // in seconds
};

const scrapeCountryNames = async () => {
    try {
        const response = await axios.get('https://www.formula1.com/en/racing/2024.html');
        const dom = new JSDOM(response.data);
        const document = dom.window.document;

        const countries = [];

        // Use the correct selector to target country names
        const countryElements = document.querySelectorAll('.f1-heading.tracking-normal.text-fs-18px.leading-tight.normal-case.font-bold.non-italic.f1-heading__body.font-formulaOne');

        // Iterate through the NodeList to get the text content of each element
        countryElements.forEach(element => {
            const countryName = element.textContent.trim(); // Extract and trim the text content
            countries.push(countryName); // Add the country name to the countries array
        });
	console.log(countries);

        return countries; // Return the array of country names

    } catch (error) {
        console.error('Error scraping country names:', error);
        throw new Error('Failed to scrape country names');
    }
};

const formatCountryName = (country) => {
    // Mapping for specific countries to their URL format
    const countryMapping = {
        'Abu Dhabi': 'united-arab-emirates',
        'Emilia-Romagna': 'emiliaromagna',
        'Sakhir': 'pre-season-testing'
    };

    // Return the mapped value if it exists, otherwise format the country name
    return countryMapping[country] || country.trim().replace(/\s+/g, '-').toLowerCase();
};

// Function to scrape tracks for a specific country
const scrapeTracks = async (country) => {
    const formattedCountry = formatCountryName(country); // Format the country name
    try {
        const response = await axios.get(`https://www.formula1.com/en/racing/2024/${formattedCountry}/circuit.html`);
        const dom = new JSDOM(response.data);
        const document = dom.window.document;

        const tracks = [];

        // Use the correct selector to target track elements (adjust based on the actual HTML structure)
        const trackElements = document.querySelectorAll('.ml-normal'); 

	//const lapElements = document.querySelectorAll('span.f1-text.font-titillium'); // Adjust to select spans that may contain relevant text
        //let lapNumber = null;


       trackElements.forEach(element => {
            const trackName = element.textContent.trim(); // Extract and trim the text content
            
            // Create a new track object to hold both the track name and the lap number
            const trackData = {
                Name: trackName
            };
            
            // Iterate through lap elements to find the correct "Number of Laps"
            const lapElements = document.querySelectorAll('span.f1-text.font-titillium'); // Adjust based on actual structure
            lapElements.forEach(lapElement => {
                if (lapElement.textContent.trim() === "Number of Laps") {
                    const lapNumber = lapElement.nextElementSibling ? lapElement.nextElementSibling.textContent.trim() : null;
                    if (lapNumber) {
                        trackData.Lap = lapNumber; // Add the lap number to the track data object
                    }
                }
            });
            const fastestLap = document.querySelectorAll('span.f1-text.font-titillium'); // Adjust based on actual structure
            fastestLap.forEach(fastest => {
                if (fastest.textContent.trim() === "Lap Record") {
                const fastestLapTime = fastest.nextElementSibling ? fastest.nextElementSibling.textContent.trim() : null;
                    
                        //trackData.baseLapTime = blt; // Add the lap number to the track data object
		//const fastestLapTime = fastest.textContent.trim(); // Get the fastest lap time directly from the h2 element
                // Convert the fastest lap time to seconds (assuming format is "1:30.734")
                const lapParts = fastestLapTime.split(':');
                const seconds = parseFloat(lapParts[0]) * 60 + parseFloat(lapParts[1]);
           
                trackData.BaseLapTime = seconds; //
                    
                }
            });

	    const circuitInfoElement = document.querySelector('.prose'); // Adjust selector for the circuit info
            if (circuitInfoElement) {
                const circuitInfoText = circuitInfoElement.textContent.toLowerCase();
                trackData.Type = circuitInfoText.includes('street') || circuitInfoText.includes('streets') ? 'street' : 'race';
            } else {
                trackData.Type = 'race'; // Default to race if no info found
            }


            // Push the complete track data object into the tracks array
            tracks.push(trackData);
  });
        return tracks; // Return the array of track names

    } catch (error) {
        console.error(`Error scraping tracks for ${country}:`, error.message);
        return []; // Return an empty array if scraping fails for this country
    }
};

// Define the endpoint for scraping
const scrapeAllTracks = async (req, res) => {
    try {
        const countries = await scrapeCountryNames();
        const allTracks = {};

        for (const country of countries) {
            const tracks = await scrapeTracks(country);
            allTracks[country] = tracks;
        }

        res.json(allTracks); // Return all track data

    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const router = express.Router();

// Endpoint to scrape tracks
/* router.get('/scrape', async (req, res) => {
  try {
    const countryNames = await scrapeCountryNames(); // Get country names
    const allTracks = [];

    // For each country, scrape the track data
    for (const country of countryNames) {
      const tracks = await scrapeTracks(country.toLowerCase().replace(/ /g, '-')); // Convert country name to URL format
      allTracks.push(...tracks); // Add the scraped tracks to the allTracks array
    }

    console.log('Track Names:', allTracks); // Log the track names
    res.json(allTracks); // Return the track names as a JSON response
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}); */

// Define the route for scraping tracks

router.get('/', getTracks );
router.post('/', addTrack );
router.get('/:id', getTrack );
router.put('/:id', updateTrack);
router.delete('/:id', deleteTrack);
router.get('/:id/races', getRaces);
router.post('/:id/races', createRace);
router.get('/track/scrape', scrapeAllTracks );

export default router;
