import express from 'express';

import dbconn from './dbconn.js';

const getDrivers = (req, res) => {
    dbconn.query('SELECT * FROM drivers', (err, rows) => {
        if (err) {
            res.status(500).send(err);
            return;
        }

        // Map rows to the required driver format
        const drivers = rows.map(row => ({
            number: row.number,
            shortName: row.shortName,
            name: row.name,
            skill: {
                race: row.skill_race, // assuming your DB column is named skill_race
                street: row.skill_street // assuming your DB column is named skill_street
            }
        }));

        // Return the drivers array as a JSON object
        res.json(drivers);
    });
}

const getDriver = (req, res) => 
{
  dbconn.query('SELECT * FROM drivers WHERE number = ?', [req.params.number], (err, rows) => 
  {
    // Forward on the SQL errors      
    if(err) 
    {
      res.status(500).send(err);
    }
    
    // Return 404 if no match found
    if (rows.length == 0) 
    {
      res.status(404).json({message: 'Drivers Not found'});
      return;
    }
    
    // Otherwise output the one result
    res.json(rows[0]);
  });
}

const addDriver = (req, res) => {
    const { number, shortName, name, skill_race, skill_street } = req.body;

    // Input validation
    if (!number || !shortName || !name || skill_race === undefined || skill_street === undefined) {
        return res.status(400).send({ error: 'Missing required driver data' });
    }
	
    const skillRaceNumeric = Number(skill_race);
    const skillStreetNumeric = Number(skill_street);

    // Ensure the skill ratings sum to 100
    if (Number(skill_race) + Number(skill_street) !== 100) {
        return res.status(400).send({ error: 'Skill ratings must sum to 100' });
    }

    // Insert new driver into the database
    dbconn.query(`
        INSERT INTO drivers (number, shortName, name, skill_race, skill_street) 
        VALUES (?, ?, ?, ?, ?)
    `, [number, shortName, name, skill_race, skill_street], (err, result) => {
        if (err) {
            // Check for duplicate driver number error
            if (err.code === 'ER_DUP_ENTRY') {
                res.status(400).send({ error: 'Driver number already exists' });
            } else {
                res.status(500).send({ error: 'Failed to add driver to database' });
            }
            return;
        }

        // Success: Respond with a success message
        res.status(201).send({ message: 'Driver successfully added', driverId: result.insertId });
    });
};

const updateDriver = (req, res) => {
    const driverNumber = req.params.number; // Get the driver number from the URL parameters
    const { shortName, name, skill_race, skill_street } = req.body;

    // Prepare the SQL update query
    const updates = [];
    const values = [];

    // Check which fields are provided in the request and prepare the update statement
    if (shortName && typeof shortName === 'string') {
        updates.push('shortName = ?');
        values.push(shortName);
    }
    if (name && typeof name === 'string') {
        updates.push('name = ?');
        values.push(name);
    }
    if (skill_race !== undefined && !isNaN(skill_race)) {
        updates.push('skill_race = ?');
        values.push(Number(skill_race)); // Convert to number
    }
    if (skill_street !== undefined && !isNaN(skill_street)) {
        updates.push('skill_street = ?');
        values.push(Number(skill_street)); // Convert to number
    }

    // Ensure at least one field is being updated
    if (updates.length === 0) {
        return res.status(400).send({ error: 'No fields to update' });
    }

    // Combine the values for the query
    values.push(driverNumber); // Add driverNumber at the end for the WHERE clause

    // Create the SQL query string
    const sql = `UPDATE drivers SET ${updates.join(', ')} WHERE number = ?`;

    // Execute the query
    dbconn.query(sql, values, (err, result) => {
        if (err) {
            return res.status(500).send({ error: 'Failed to update driver' });
        }

        // Check if any rows were affected
        if (result.affectedRows === 0) {
            return res.status(404).send({ error: 'Driver not found' });
        }

        // Success: Respond with a success message
        res.send({ message: 'Driver successfully updated' });
    });
};

const deleteDriver = (req, res) => {
    const driverNumber = req.params.number; // Get the driver number from the URL parameters

    // Prepare the SQL delete query
    const sql = `DELETE FROM drivers WHERE number = ?`;

    // Execute the query
    dbconn.query(sql, [driverNumber], (err, result) => {
        if (err) {
            return res.status(500).send({ error: 'Failed to delete driver' });
        }

        // Check if any rows were affected
        if (result.affectedRows === 0) {
            return res.status(404).send({ error: 'Driver not found' });
        }

        // Success: Respond with a success message
        res.send({ message: 'Driver successfully deleted' });
    });
};



const router = express.Router();
router.get('/', getDrivers);
router.post('/', addDriver);
router.get('/:number', getDriver );
router.put('/:number', updateDriver);
router.delete('/:number', deleteDriver);

export default router;