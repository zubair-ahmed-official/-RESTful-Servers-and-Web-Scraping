import express from 'express';
import dbconn from './dbconn.js';
import axios from 'axios';

// Get all races
const getAllRaces = (req, res) => {
    dbconn.query('SELECT * FROM races', (err, rows) => {
        if (err) {
            console.error('Error retrieving races:', err);
            return res.status(500).json({ error: 'Failed to retrieve races' });
        }

        // Map the rows to the expected race format
        const races = rows.map(row => ({
            id: row.id,
            trackId: row.track_id,
            name: row.name,
            entrants: JSON.parse(row.entrants), // Assuming entrants are stored as JSON
            laps: row.laps,
            createdAt: row.created_at // Assuming a created_at timestamp
        }));

        res.status(200).json(races);
    });
};

// Get a specific race by ID
const getRaceById = (req, res) => {
    const raceId = req.params.id;

    dbconn.query('SELECT * FROM races WHERE id = ?', [raceId], (err, rows) => {
        if (err) {
            console.error('Error retrieving race:', err);
            return res.status(500).json({ error: 'Failed to retrieve race' });
        }

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Race not found' });
        }

        // Get the race and format it as needed
        const row = rows[0];
        const race = {
            id: row.id,
            trackId: row.track_id,
            name: row.name,
            entrants: JSON.parse(row.entrants), // Assuming entrants are stored as JSON
            laps: row.laps,
            createdAt: row.created_at
        };

        res.status(200).json(race);
    });
};

const getRaceEntrants = (req, res) => {
    const raceId = req.params.id;

    dbconn.query('SELECT entrants FROM races WHERE id = ?', [raceId], (err, rows) => {
        if (err) {
            console.error('Error retrieving race entrants:', err);
            return res.status(500).json({ error: 'Failed to retrieve race entrants' });
        }

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Race not found' });
        }

        // Parse the entrants JSON field, defaulting to an empty array if necessary
        const entrants = rows[0].entrants ? JSON.parse(rows[0].entrants) : [];
        const carUris = entrants
            .filter(entrant => entrant && entrant.uri) // Filter out null or undefined entries
            .map(entrant => entrant.uri); // Extract car URIs

        res.status(200).json(carUris);
    });
};

const addRaceEntrant = (req, res) => {
    const raceId = req.params.id;
    const { carUri, driverNumber, carId } = req.body;

    if (!carUri) {
        return res.status(400).json({ error: 'Car URI is required' });
    }

    // Retrieve the current entrants and startingPositions from the database
    dbconn.query('SELECT entrants, startingPositions FROM races WHERE id = ?', [raceId], (err, rows) => {
        if (err) {
            console.error('Error retrieving race data:', err);
            return res.status(500).json({ error: 'Failed to retrieve race data' });
        }

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Race not found' });
        }

        const raceData = rows[0];

        // Check if startingPositions has been set, indicating qualifying has taken place
        const startingPositions = raceData.startingPositions ? JSON.parse(raceData.startingPositions) : [];
        if (startingPositions.length > 0) {
            return res.status(400).json({ error: 'Qualifying has already taken place; you cannot add entrants after setting the starting positions.' });
        }

        // Parse the entrants array from the database
        const entrants = raceData.entrants ? JSON.parse(raceData.entrants) : [];

        // Check if the car URI already exists in the entrants array
        if (entrants.some(entrant => entrant.uri === carUri)) {
            return res.status(400).json({ error: 'This car is already entered in the race.' });
        }

        // Check if the car has an assigned driver and validate suitability values
        if (carId) {
            dbconn.query('SELECT driver_number, suitability_race, suitability_street FROM cars WHERE id = ?', [carId], (carErr, carRows) => {
                if (carErr) {
                    console.error('Error checking car details:', carErr);
                    return res.status(500).json({ error: 'Failed to validate car details' });
                }

                if (carRows.length === 0) {
                    return res.status(400).json({ error: 'Car ID does not exist in the cars table' });
                }

                const car = carRows[0];

                // Check if the car has a driver assigned
                if (!car.driver_number) {
                    return res.status(400).json({ error: 'The car you are attempting to enter has no driver.' });
                }

                // Check if the suitability values sum to 100
                const suitabilityTotal = (car.suitability_race || 0) + (car.suitability_street || 0);
                if (suitabilityTotal !== 100) {
                    return res.status(400).json({ error: 'The suitability values for the car are invalid (i.e., they do not sum to 100).' });
                }

                // Validate driver if driverNumber is provided
                if (driverNumber) {
                    dbconn.query('SELECT * FROM drivers WHERE number = ?', [driverNumber], (driverErr, driverRows) => {
                        if (driverErr) {
                            console.error('Error checking driver number:', driverErr);
                            return res.status(500).json({ error: 'Failed to validate driver number' });
                        }

                        if (driverRows.length === 0) {
                            return res.status(400).json({ error: 'Driver number does not exist in the drivers table' });
                        }

                        // Check if the driver number is already in the entrants array
                        if (entrants.some(entrant => entrant.driverNumber === driverNumber)) {
                            return res.status(400).json({ error: 'This driver is already entered in the race.' });
                        }

                        // Validate skill values of driver
                        const driver = driverRows[0];
                        const skillTotal = (driver.skill_race || 0) + (driver.skill_street || 0);
                        if (skillTotal !== 100) {
                            return res.status(400).json({ error: 'The skill values for the driver are invalid (i.e., they do not sum to 100).' });
                        }

                        // All validations passed, add the car and driver to the entrants array
                        const entrant = { uri: carUri, driverNumber, carId};
                        entrants.push(entrant);

                        // Update the entrants array in the database
                        updateEntrantsArray(raceId, entrants, res);
                    });
                } else {
                    // If no driverNumber, add entrant with only carUri
                    const entrant = { uri: carUri };
                    entrants.push(entrant);

                    // Update the entrants array in the database
                    updateEntrantsArray(raceId, entrants, res);
                }
            });
        } else {
            // If no carId is provided, respond with an error
            return res.status(400).json({ error: 'Car ID is required to verify driver and suitability values.' });
        }
    });
};

const updateEntrantsArray = (raceId, entrants, res) => {
    const entrantsJson = JSON.stringify(entrants);

    // Update the entrants array in the database
    dbconn.query('UPDATE races SET entrants = ? WHERE id = ?', [entrantsJson, raceId], (updateErr) => {
        if (updateErr) {
            console.error('Error updating entrants array:', updateErr);
            return res.status(500).json({ error: 'Failed to update entrants for the race' });
        }

        // Success: Respond with a success message and the updated entrants array
        res.status(200).json({ message: 'Entrants successfully added', entrants });
    });
};


const removeRaceEntrant = (req, res) => {
    const raceId = req.params.id;
    const { carUri } = req.body;

    if (!carUri) {
        return res.status(400).json({ error: 'Car URI is required' });
    }

    // Retrieve the current entrants for the specified race
    dbconn.query('SELECT entrants FROM races WHERE id = ?', [raceId], (err, rows) => {
        if (err) {
            console.error('Error retrieving race entrants:', err);
            return res.status(500).json({ error: 'Failed to retrieve race entrants' });
        }

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Race not found' });
        }

        // Parse the entrants array from the database
        const entrants = rows[0].entrants ? JSON.parse(rows[0].entrants) : [];

        // Check if the car URI exists in the entrants array
        const entrantIndex = entrants.findIndex(entrant => entrant.uri === carUri);
        if (entrantIndex === -1) {
            return res.status(400).json({ error: 'This car is not entered in the race.' });
        }

        // Remove the specified car URI from the entrants array
        entrants.splice(entrantIndex, 1);

        // Update the entrants array in the database
        const updateQuery = 'UPDATE races SET entrants = ? WHERE id = ?';
   	 dbconn.query(updateQuery, [JSON.stringify(entrants), raceId], (updateErr) => {
        if (updateErr) {
            console.error('Error updating race entrants:', updateErr);
            return res.status(500).json({ error: 'Failed to update race entrants' });
        }

        res.status(200).json({ message: 'Car URI successfully removed from race entrants' });
    });
    });
};

const qualifyRace = (req, res) => {
    const raceId = req.params.id;

    // Retrieve the race and entrants data
    dbconn.query('SELECT entrants, startingPositions FROM races WHERE id = ?', [raceId], (err, rows) => {
        if (err) {
            console.error('Error retrieving race data:', err);
            return res.status(500).json({ error: 'Failed to retrieve race data' });
        }

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Race not found' });
        }

        const raceData = rows[0];

        // Check if startingPositions has already been set, indicating qualifying has taken place
        const startingPositions = raceData.startingPositions ? JSON.parse(raceData.startingPositions) : [];
        if (startingPositions.length > 0) {
            return res.status(400).json({ error: 'Qualifying has already been completed for this race.' });
        }

        // Parse the entrants array
        const entrants = raceData.entrants ? JSON.parse(raceData.entrants) : [];

        // Check if there are any entrants
        if (entrants.length === 0) {
            return res.status(400).json({ error: 'No entrants available for qualifying.' });
        }

        // Generate starting positions - here we simply shuffle the entrants for random positions
        const shuffledEntrants = entrants.map((entrant, index) => index);
        shuffledEntrants.sort(() => Math.random() - 0.5);  // Randomize positions

        // Update the startingPositions in the database
        dbconn.query('UPDATE races SET startingPositions = ? WHERE id = ?', [JSON.stringify(shuffledEntrants), raceId], (updateErr) => {
            if (updateErr) {
                console.error('Error updating starting positions:', updateErr);
                return res.status(500).json({ error: 'Failed to set starting positions' });
            }

            // Retrieve the updated race object with startingPositions
            dbconn.query('SELECT * FROM races WHERE id = ?', [raceId], (finalErr, finalRows) => {
                if (finalErr) {
                    console.error('Error retrieving updated race:', finalErr);
                    return res.status(500).json({ error: 'Failed to retrieve updated race data' });
                }

                res.status(200).json(finalRows[0]);  // Return the updated race object
            });
        });
    });
};

const determineStartingPositions = (req, res) => {
    const raceId = req.params.id;

    // Retrieve race, track, and entrant details to check required conditions and skills
    dbconn.query(`
        SELECT races.entrants, races.startingPositions, tracks.type AS trackType 
        FROM races 
        JOIN tracks ON races.track_id = tracks.id 
        WHERE races.id = ?
    `, [raceId], (err, rows) => {
        if (err) {
            console.error('Error retrieving race data:', err);
            return res.status(500).json({ error: 'Failed to retrieve race data' });
        }

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Race not found' });
        }

        const raceData = rows[0];

        // Check if there are any entrants in the race
        const entrants = raceData.entrants ? JSON.parse(raceData.entrants) : [];
        if (entrants.length === 0) {
            return res.status(400).json({ error: 'There are no entrants in this race.' });
        }

        // Check if startingPositions have already been populated
        const startingPositions = raceData.startingPositions ? JSON.parse(raceData.startingPositions) : [];
        if (startingPositions.length > 0) {
            return res.status(400).json({ error: 'The starting positions have already been populated for this race.' });
        }

        // Determine the track type to use the correct skill attribute
        const trackType = raceData.trackType === 'street' ? 'skill_street' : 'skill_race';

        // Retrieve each driver's skill for the current track type
        const entrantDataPromises = entrants.map(entrant => {
            return new Promise((resolve, reject) => {
                dbconn.query(`
                    SELECT drivers.number, drivers.name, drivers.${trackType} AS skill
                    FROM drivers
                    JOIN cars ON drivers.number = cars.driver_number
                    WHERE cars.id = ?
                `, [entrant.carId], (err, driverRows) => {
                    if (err) {
                        reject(err);
                    } else if (driverRows.length === 0) {
                        // Assign skill of 0 if no driver data is found
                        console.warn(`No driver found for car with ID ${entrant.carId}. Setting skill to 0.`);
                        resolve({ carId: entrant.carId, driverNumber: null, skill: 0 });
                    } else {
                        // Use actual skill value if found
                        const driver = driverRows[0];
                        resolve({ carId: entrant.carId, driverNumber: driver.number, skill: driver.skill || 0 });
                    }
                });
            });
        });

        // Process all promises to get entrant data with driver skills
        Promise.all(entrantDataPromises)
            .then(entrantData => {
                // Sort entrants by driver skill in descending order
                entrantData.sort((a, b) => b.skill - a.skill);

                // Populate startingPositions based on sorted entrant order
                const newStartingPositions = entrantData.map((entrant, index) => ({
                    carId: entrant.carId,
                    driverNumber: entrant.driverNumber,
                    startingPosition: index  // Position 0 is the highest skill (pole position)
                }));

                // Update startingPositions in the database
                dbconn.query('UPDATE races SET startingPositions = ? WHERE id = ?', [JSON.stringify(newStartingPositions), raceId], (updateErr) => {
                    if (updateErr) {
                        console.error('Error updating starting positions:', updateErr);
                        return res.status(500).json({ error: 'Failed to set starting positions' });
                    }

                    // Retrieve and return the updated race object
                    dbconn.query('SELECT * FROM races WHERE id = ?', [raceId], (finalErr, finalRows) => {
                        if (finalErr) {
                            console.error('Error retrieving updated race:', finalErr);
                            return res.status(500).json({ error: 'Failed to retrieve updated race data' });
                        }

                        res.status(200).json(finalRows[0]);  // Return the updated race object with starting positions
                    });
                });
            })
            .catch(error => {
                console.error('Error retrieving driver data for entrants:', error);
                res.status(400).json({ error: 'Failed to retrieve driver skill data for qualifying. All entrants must have assigned drivers.' });
            });
    });
};

const getRaceLaps = (req, res) => {
    const raceId = req.params.id;

    // Query to retrieve the laps array for the given race ID
    dbconn.query('SELECT laps FROM races WHERE id = ?', [raceId], (err, rows) => {
        if (err) {
            console.error('Error retrieving race laps:', err);
            return res.status(500).json({ error: 'Failed to retrieve race laps' });
        }

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Race not found' });
        }

        // Parse and return the laps array
        const laps = rows[0].laps ? JSON.parse(rows[0].laps) : [];
        res.status(200).json({ laps });
    });
};

const addRaceLap = (req, res) => {
    const raceId = req.params.id;
    const { lapTimes } = req.body;

    if (!lapTimes || !Array.isArray(lapTimes)) {
        return res.status(400).json({ error: 'lapTimes array is required in the request body.' });
    }

    dbconn.query(`
        SELECT 
            races.laps,
            races.entrants,
            races.startingPositions,
            tracks.totalLaps AS totalLaps,
            tracks.baseLapTime AS baseLapTime,
            tracks.type AS trackType
        FROM races
        JOIN tracks ON races.track_id = tracks.id
        WHERE races.id = ?
    `, [raceId], (err, rows) => {
        if (err) {
            console.error('Error retrieving race data:', err);
            return res.status(500).json({ error: 'Failed to retrieve race data' });
        }

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Race not found' });
        }

        const raceData = rows[0];
        const currentLaps = JSON.parse(raceData.laps || '[]');
        const entrantList = JSON.parse(raceData.entrants || '[]');
        const totalLaps = raceData.totalLaps;

        if (entrantList.length === 0) {
            return res.status(400).json({ error: 'There are no entrants in this race.' });
        }
        
        if (currentLaps.length >= totalLaps) {
            return res.status(400).json({ error: 'Cannot add more laps; total lap count exceeded.' });
        }

        if (lapTimes.length !== entrantList.length) {
            return res.status(400).json({ error: 'lapTimes array must match the number of entrants.' });
        }

        const newLap = {
            number: currentLaps.length + 1,
            lapTimes: lapTimes.map(lapTime => ({
                entrant: lapTime.entrant,
                time: lapTime.crashed ? 0 : lapTime.time,
                crashed: lapTime.crashed || false
            }))
        };

        currentLaps.push(newLap);

        dbconn.query('UPDATE races SET laps = ? WHERE id = ?', [JSON.stringify(currentLaps), raceId], (updateErr) => {
            if (updateErr) {
                console.error('Error updating race laps:', updateErr);
                return res.status(500).json({ error: 'Failed to add new lap to race' });
            }

            res.status(200).json({ message: 'New lap successfully added', lap: newLap });
        });
    });
};

function simulateExternalLapTimeRequest(carId, baseLapTime, trackType) {
    // This function simulates receiving data from an external service
    const crashed = Math.random() < 0.1; // 10% chance of crashing
    if (crashed) {
        return { time: 0, crashed: true, randomness: 0 };
    }
    const time = baseLapTime - (Math.random() * 10); // Random time based on base lap time
    const randomness = Math.random() * 5; // Randomness added to the time
    return { time, crashed: false, randomness };
}

// Helper function to update entrants array in the database
const calculateLeaderboard = (entrants, laps) => {
    return entrants.map((entrant, index) => {
        let totalTime = index * 5; // Starting penalty based on position
        let hasCrashed = false;
        let completedLaps = 0;

        laps.forEach(lap => {
            if (lap.lapTimes && Array.isArray(lap.lapTimes)) {
                const lapTime = lap.lapTimes.find(l => l.entrant === index);
                if (lapTime) {
                    if (lapTime.crashed) {
                        hasCrashed = true;
                    } else {
                        completedLaps++;
                        totalTime += lapTime.time; // Add lap time
                    }
                }
            }
        });

        return {
            entrant: index,
            carId: entrant.carId,
            cumulativeTime: hasCrashed ? Infinity : totalTime, // Use Infinity for crashed cars
            hasCrashed,
            laps: completedLaps
        };
    });
};

// Function to format the leaderboard output
const formatLeaderboard = (leaderboard) => {
    return leaderboard.map((entry, position) => ({
        position: position + 1,
        number: entry.carId, // Car number
        shortName: entry.shortName, // Driver's short name
        name: entry.name, // Driver's full name
        uri: entry.uri, // URI for the car
        laps: entry.laps, // Number of completed laps
        time: entry.cumulativeTime === Infinity ? 'Crashed' : entry.cumulativeTime // Total time
    }));
};

// Function to get the leaderboard up to a specific lap
const getLeaderboardUpToLap = (req, res) => {
    const raceId = req.params.id;
    const lapNumber = parseInt(req.params.number, 10);

    if (isNaN(lapNumber) || lapNumber < 1) {
        return res.status(400).json({ error: 'Lap number must be a positive integer.' });
    }

    dbconn.query('SELECT laps, entrants FROM races WHERE id = ?', [raceId], (err, rows) => {
        if (err) {
            console.error('Error retrieving race data:', err);
            return res.status(500).json({ error: 'Failed to retrieve race data' });
        }

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Race not found' });
        }

        const raceData = rows[0];
        const entrants = JSON.parse(raceData.entrants || '[]');
        let laps;

        try {
            laps = JSON.parse(raceData.laps || '[]');
        } catch (parseError) {
            console.error('Error parsing laps data:', parseError);
            return res.status(500).json({ error: 'Invalid laps data format in database.' });
        }

        // Filter laps up to the specified lap number
        const filteredLaps = laps.slice(0, lapNumber);
        const leaderboard = calculateLeaderboard(entrants, filteredLaps);
        const formattedLeaderboard = formatLeaderboard(leaderboard);

        res.status(200).json({ 
            lap: lapNumber,
            entrants: formattedLeaderboard 
        });
    });
};

// Function to get the overall leaderboard for the race
const getLeaderboard = (req, res) => {
    const raceId = req.params.id;

    dbconn.query('SELECT laps, entrants FROM races WHERE id = ?', [raceId], (err, rows) => {
        if (err) {
            console.error('Error retrieving race data:', err);
            return res.status(500).json({ error: 'Failed to retrieve race data' });
        }

        if (rows.length === 0) {
            return res.status(404).json({ error: 'Race not found' });
        }

        const raceData = rows[0];
        const entrants = JSON.parse(raceData.entrants || '[]');
        let laps;

        try {
            laps = JSON.parse(raceData.laps || '[]');
        } catch (parseError) {
            console.error('Error parsing laps data:', parseError);
            return res.status(500).json({ error: 'Invalid laps data format in database.' });
        }

        const leaderboard = calculateLeaderboard(entrants, laps);
        const formattedLeaderboard = formatLeaderboard(leaderboard);

        res.status(200).json({
            lap: laps.length, // Return the total number of laps completed
            entrants: formattedLeaderboard 
        });
    });
};



const router = express.Router();
router.get('/', getAllRaces);
router.get('/:id', getRaceById);
router.get('/:id/entrant', getRaceEntrants);
router.post('/:id/entrant', addRaceEntrant);
router.delete('/:id/entrant', removeRaceEntrant);
router.post('/:id/qualify', qualifyRace);
router.put('/:id/qualify', determineStartingPositions);
router.get('/:id/lap', getRaceLaps);
router.post('/:id/lap', addRaceLap);
router.get('/:id/lap/:number', getLeaderboardUpToLap);
router.get('/:id/leaderboard', getLeaderboard);

export default router;
