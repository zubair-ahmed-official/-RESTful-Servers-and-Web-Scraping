import express from 'express';

import dbconn from './dbconn.js';

const getCars = (req, res) => {
    dbconn.query('SELECT cars.id, cars.suitability_race, cars.suitability_street, cars.reliability, drivers.name AS driver_name, drivers.number AS driver_number FROM cars LEFT JOIN drivers ON cars.driver_number = drivers.number', (err, rows) => 
	{   
	    if (err) {
            res.status(500).send(err);
            return;
        }

        // Map rows to the required car format
        const cars = rows.map(row => ({
            id: row.id,
            driver: row.driver_number ? {
                name: row.driver_name, // Use row.driver_name, which is fetched from the LEFT JOIN
                uri: `https://TeamVM/driver/${row.driver_number}`
            } : null, 
            suitability: {
                race: row.suitability_race,
                street: row.suitability_street
            },
            reliability: row.reliability
        }));

        // Return the cars array as a JSON object
        res.json(cars);
    });
}


const getCar = (req, res) => {
    const carId = req.params.id; // Corrected to req.params.id
    dbconn.query(`
        SELECT 
            cars.id, 
            cars.suitability_race, 
            cars.suitability_street, 
            cars.reliability, 
            drivers.name AS driver_name, 
            drivers.number AS driver_number 
        FROM cars 
        LEFT JOIN drivers 
        ON cars.driver_number = drivers.number 
        WHERE cars.id = ?
    `, [carId], (err, rows) => {
        if (err) {
            res.status(500).send({ error: 'Database query failed' });
            return;
        }

        if (rows.length === 0) {
            res.status(404).send({ error: 'Car not found' });
            return;
        }

        // Get the first row since we expect only one result for a single car
        const row = rows[0];

        // Map the row to the required car format
        const car = {
            id: row.id,
            driver: row.driver_number ? {
                name: row.driver_name,
                uri: `https://TeamVM/driver/${row.driver_number}`
            } : null, 
            suitability: {
                race: row.suitability_race,
                street: row.suitability_street
            },
            reliability: row.reliability
        };

        // Return the car object as a JSON response
        res.json(car);
    });
};

const getCarDriver = (req, res) => {
    const carId = req.params.id; // Get car ID from the request parameters
    
    // Query to fetch the car and driver details
    dbconn.query(`
        SELECT 
            cars.id, 
            drivers.name AS driver_name, 
            drivers.number AS driver_number, 
            drivers.shortName 
        FROM cars 
        LEFT JOIN drivers 
        ON cars.driver_number = drivers.number 
        WHERE cars.id = ?
    `, [carId], (err, rows) => {
        if (err) {
            res.status(500).send({ error: 'Database query failed' });
            return;
        }

        // Check if car exists
        if (rows.length === 0) {
            res.status(404).send({ error: 'Car not found' });
            return;
        }

        const row = rows[0];

        // Check if driver is assigned
        if (!row.driver_number) {
            res.status(404).send({ error: 'Driver not assigned to this car' });
            return;
        }

        // Return the driver object
        const driver = {
            number: row.driver_number,
            shortName: row.shortName,
            name: row.driver_name,
            uri: `https://TeamVM/driver/${row.driver_number}`
        };

        res.json(driver); // Return the driver as a JSON object
    });
};

const addCar = (req, res) => {
    const { driver_number, suitability_race, suitability_street, reliability } = req.body;

    // Validate that suitability_race and suitability_street add up to 100
    if (suitability_race + suitability_street !== 100) {
        return res.status(400).send({ error: "Suitability ratings must sum to 100" });
    }

    // Insert new car into the cars table
    dbconn.query(`
        INSERT INTO cars (driver_number, suitability_race, suitability_street, reliability) 
        VALUES (?, ?, ?, ?)
    `, [driver_number || null, suitability_race, suitability_street, reliability], (err, result) => {
        if (err) {
            res.status(500).send({ error: 'Failed to add car to database' });
            return;
        }

        // Success: Respond with a success message and the inserted car's ID
        res.status(201).send({ message: 'Car successfully added', carId: result.insertId });
    });
};

const updateCar = (req, res) => {
    const carId = req.params.id; // Get the car ID from the URL parameters
    const { driver_number, suitability_race, suitability_street, reliability } = req.body; // Destructure data from the request body

    // Prepare the SQL update query
    const sql = `
        UPDATE cars 
        SET 
            driver_number = ?, 
            suitability_race = ?, 
            suitability_street = ?, 
            reliability = ? 
        WHERE id = ?
    `;

    // Execute the query
    dbconn.query(sql, [driver_number, suitability_race, suitability_street, reliability, carId], (err, result) => {
        if (err) {
            return res.status(500).send({ error: 'Failed to update car' });
        }

        // Check if any rows were affected
        if (result.affectedRows === 0) {
            return res.status(404).send({ error: 'Car not found' });
        }

        // Success: Respond with a success message
        res.send({ message: 'Car successfully updated' });
    });
};


const deleteCar = (req, res) => {
    const carId = req.params.id; // Get the car ID from the URL parameters

    // Prepare the SQL delete query
    const sql = `DELETE FROM cars WHERE id = ?`;

    // Execute the query
    dbconn.query(sql, [carId], (err, result) => {
        if (err) {
            return res.status(500).send({ error: 'Failed to delete car' });
        }

        // Check if any rows were affected
        if (result.affectedRows === 0) {
            return res.status(404).send({ error: 'Car not found' });
        }

        // Success: Respond with a success message
        res.send({ message: 'Car successfully deleted' });
    });
};

const updateCarDriver = (req, res) => {
    const carId = req.params.id; // Get the car ID from the URL parameters
    const { driverNumber } = req.body; // Get the driver number from the request body

    // Check if the driver number is provided
    if (!driverNumber) {
        return res.status(400).send({ error: 'Driver number is required' });
    }

    // Validate driver number format
    if (typeof driverNumber !== 'number' || driverNumber <= 0) {
        return res.status(400).send({ error: 'Invalid driver number' });
    }

    // SQL query to check if the driver exists
    const checkDriverSql = 'SELECT COUNT(*) AS count FROM drivers WHERE number = ?';

    dbconn.query(checkDriverSql, [driverNumber], (err, results) => {
        if (err) {
            console.error(err);
            return res.status(500).send({ error: 'Failed to verify driver' });
        }

        // Check if the driver exists
        if (results[0].count === 0) {
            return res.status(404).send({ error: 'Driver not found' });
        }

        // SQL query to check if the driver is already assigned to another car
        const checkAssignmentSql = 'SELECT COUNT(*) AS count FROM cars WHERE driver_number = ? AND id != ?';

        dbconn.query(checkAssignmentSql, [driverNumber, carId], (err, results) => {
            if (err) {
                console.error(err);
                return res.status(500).send({ error: 'Failed to check driver assignment' });
            }

            // If driver is already assigned to another car, return a conflict error
            if (results[0].count > 0) {
                return res.status(400).send({ error: 'Driver is already assigned to another car' });
            }

            // SQL query to update the car with the new driver
            const updateCarSql = 'UPDATE cars SET driver_number = ? WHERE id = ?';

            dbconn.query(updateCarSql, [driverNumber, carId], (err, result) => {
                if (err) {
                    console.error(err);
                    return res.status(500).send({ error: 'Failed to update car driver assignment' });
                }

                // If no rows were affected, the car ID might not exist
                if (result.affectedRows === 0) {
                    return res.status(404).send({ error: 'Car not found or no changes made' });
                }

                // Success: Respond with the updated driver details
                const updatedDriver = {
                    number: driverNumber,
                    uri: `https://TeamVM/driver/${driverNumber}` // Construct the driver URI
                };

                res.status(200).send({
                    message: 'Driver assigned to car successfully',
                    driver: updatedDriver
                });
            });
        });
    });
};

const removeCarDriver = (req, res) => {
    const carId = req.params.id; // Get the car ID from the URL parameters

    // SQL query to remove the driver from the car
    const updateCarSql = 'UPDATE cars SET driver_number = NULL WHERE id = ?';

    dbconn.query(updateCarSql, [carId], (err, result) => {
        if (err) {
            return res.status(500).send({ error: 'Failed to remove driver from car' });
        }

        // If no rows were affected, the car ID might not exist
        if (result.affectedRows === 0) {
            return res.status(404).send({ error: 'Car not found' });
        }

        // Success: Respond with a success message
        res.status(200).send({ message: 'Driver removed from car successfully' });
    });
};

const getLapResults = (req, res) => {
    const carId = req.params.id; // Get the car ID from the URL parameters
    const { trackType, baseLapTime } = req.query; // Get trackType and baseLapTime from the query parameters

    // Validate input
    if (!trackType || !baseLapTime) {
        return res.status(400).send({ error: 'trackType and baseLapTime are required' });
    }

    // Convert baseLapTime to a number
    const baseLapTimeNum = Number(baseLapTime);
    if (isNaN(baseLapTimeNum)) {
        return res.status(400).send({ error: 'Invalid baseLapTime. It must be a number.' });
    }

    // SQL query to get the car's reliability, suitability data, and driver information
    const sql = `
        SELECT 
            cars.reliability,
            cars.suitability_race AS suitabilityRace,
            cars.suitability_street AS suitabilityStreet,
            cars.driver_number
        FROM cars
        WHERE cars.id = ?
    `;

    dbconn.query(sql, [carId], (err, rows) => {
        if (err) {
            return res.status(500).send({ error: 'Database query failed' });
        }

        // Check if car exists
        if (rows.length === 0) {
            return res.status(404).send({ error: 'Car not found' });
        }

        const car = rows[0];

        // Check if the car has a driver
        if (!car.driver_number) {
            return res.status(418).send({ error: "I'm a teapot: No driver assigned to the car." });
        }

        // Determine the maximum random number based on the track type
        let maxRandom;
        if (trackType === 'street') {
            maxRandom = car.reliability + 10;
        } else if (trackType === 'race') {
            maxRandom = car.reliability + 5;
        } else {
            return res.status(400).send({ error: 'Invalid trackType. Use "street" or "normal".' });
        }

        // Generate a random number for crash determination
        const randomNum = Math.floor(Math.random() * maxRandom);

        let crashed = false;
        let lapTime = 0;

        // Check if the car crashes
        if (randomNum >= car.reliability) {
            crashed = true;
            lapTime = 0; // Lap time is 0 seconds if the car crashed
        } else {
            // Calculate speed
            const suitability = trackType === 'street' ? car.suitabilityStreet : car.suitabilityRace;
            const driverSkill = 100; // Placeholder for driver's skill level, can be fetched similarly from driver data
            const speed = (suitability + driverSkill + (100 - car.reliability)) / 3; // Average calculation

            // Calculate the lap time
            lapTime = baseLapTimeNum + (10 * speed / 100);
        }

        // Generate randomness factor (random number between 0 and 5)
        const randomnessFactor = Math.random() * 5;

        // Log the values for debugging
        console.log("Lap Time:", lapTime, "Randomness Factor:", randomnessFactor);

        // Ensure lapTime is a number before doing operations
        if (typeof lapTime !== 'number' || typeof randomnessFactor !== 'number') {
            return res.status(500).send({ error: 'Error calculating lap time or randomness factor.' });
        }

        // Respond with the lap result
        const lapResult = {
            time: parseFloat((lapTime + randomnessFactor).toFixed(3)), // Total lap time including randomness
            randomness: parseFloat(randomnessFactor.toFixed(3)),
            crashed
        };

        res.json(lapResult);
    });
};

const router = express.Router();

router.delete('/:carId/driver/:driverNumber', (req, res) => {
    const { carId, driverNumber } = req.params;

    // Check if the driver is associated with the car
    const sqlCheck = 'SELECT * FROM cars WHERE id = ? AND driver_number = ?'; // Adjust based on your schema
    dbconn.query(sqlCheck, [carId, driverNumber], (err, results) => {
        if (err) return res.status(500).send({ error: 'Database error' });
        
        if (results.length === 0) {
            return res.status(404).send({ error: 'Driver not found for this car' });
        }

        // Proceed to remove the driver
        const sqlRemove = 'UPDATE cars SET driver_number = NULL WHERE id = ? AND driver_number = ?'; // Adjust based on your schema
        dbconn.query(sqlRemove, [carId, driverNumber], (err, result) => {
            if (err) return res.status(500).send({ error: 'Failed to remove driver' });
            res.status(200).send({ message: 'Driver removed successfully' });
        });
    });
});


// Example route

router.get('/', getCars );
router.post('/', addCar );
router.get('/:id', getCar );
router.get('/:id/driver', getCarDriver );
router.put('/:id', updateCar);
router.delete('/:id', deleteCar);
router.put('/:id/driver', updateCarDriver);
router.delete('/:id/driver', removeCarDriver);
router.get('/:id/lap', getLapResults);
// router.delete('/:id/driver/:driverNumber', removeDriverFromCar);

export default router;