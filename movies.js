import express from 'express';

import dbconn from './dbconn.js';

const getMovies = (req, res) => 
{
    dbconn.query('SELECT * FROM movie', (err, rows) => 
    {
        if (err) 
        {
            res.status(500).send(err);
            return;
        }
        
        // Return the rows as a JSON object
        res.json(rows);
    });
}

const getMovie = (req, res) => 
{
  dbconn.query('SELECT * FROM movie WHERE id = ?', [req.params.id], (err, rows) => 
  {
    // Forward on the SQL errors      
    if(err) 
    {
      res.status(500).send(err);
    }
    
    // Return 404 if no match found
    if (rows.length == 0) 
    {
      res.status(404).json({message: 'Movie Not found'});
      return;
    }
    
    // Otherwise output the one result
    res.json(rows[0]);
  });
}
function createMovie(req, res) {
    const {id,name, year, director } = req.body;

    
    const query = 'INSERT INTO movies (id, name, year, director) VALUES (?, ?, ?, ?)';
    const values = [id, name, year, director];

    db.query(query, values, (err, results) => {
        if (err) {
            console.error('Error inserting movie:', err);
            return res.status(500).send({ message: "Error saving the movie." });
        }
        res.status(201).send({ message: "Movie created successfully", movieId: results.insertId });
    });
}
function updateMovie(req, res) {
    const { id } = req.params; // get the movie id from URL params
    const { name, year, director } = req.body; // get the updated data from request body

    if (!name || !year || !director) {
        return res.status(400).send({ message: "All fields are required." });
    }

    const query = 'UPDATE movies SET name = ?, year = ?, director = ? WHERE id = ?';
    const values = [name, year, director, id];

    db.query(query, values, (err, results) => {
        if (err) {
            console.error('Error updating movie:', err);
            return res.status(500).send({ message: "Error updating the movie." });
        }

        if (results.affectedRows === 0) {
            return res.status(404).send({ message: "Movie not found." });
        }

        res.status(200).send({ message: "Movie updated successfully." });
    });
}

function deleteMovie(req, res) {
    const { id } = req.params; // get the movie id from URL params

    const query = 'DELETE FROM movies WHERE id = ?';

    db.query(query, [id], (err, results) => {
        if (err) {
            console.error('Error deleting movie:', err);
            return res.status(500).send({ message: "Error deleting the movie." });
        }

        if (results.affectedRows === 0) {
            return res.status(404).send({ message: "Movie not found." });
        }

        res.status(200).send({ message: "Movie deleted successfully." });
    });
}


const router = express.Router();
router.get('/', getMovies);
router.get('/:id', getMovie);

export default router;