const baseUrl = 'https://lab-2105cf46-fd70-4e4b-8ece-4494323c5240.australiaeast.cloudapp.azure.com:7084'; // Replace with your API URL

// Event listeners for scraping and adding tracks
document.getElementById('scrapeTracks').addEventListener('click', async () => {
    await scrapeTracks();
});


// Event listener for the add track button
document.getElementById('addTrack').addEventListener('click', async () => {
    const trackData = {
        name: document.getElementById('newTrackName').value.trim(),
        type: document.getElementById('newTrackType').value.trim(),
        totalLaps: Number(document.getElementById('newTrackLaps').value.trim()),
        baseLapTime: Number(document.getElementById('newTrackBaseLapTime').value.trim())
    };

    if (!trackData.name || !trackData.type || isNaN(trackData.totalLaps) || isNaN(trackData.baseLapTime)) {
        alert("Please fill in all fields correctly.");
        return;
    }

    try {
        const response = await fetch(`https://lab-2105cf46-fd70-4e4b-8ece-4494323c5240.australiaeast.cloudapp.azure.com:7084/track/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(trackData)
        });

        if (response.ok) {
            console.log('Track added successfully');
            await loadTracks(); // Refresh the track list after adding
        } else {
            const errorText = await response.text();
            console.error('Error adding track:', errorText);
            alert(`Failed to add track: ${errorText}`);
        }
    } catch (error) {
        console.error('Error adding track:', error);
        alert(`Error adding track: ${error.message}`);
    }
});

// Function to scrape tracks from the API
async function scrapeTracks() {
    try {
        const response = await fetch(`${baseUrl}/track/track/scrape`);
        if (response.ok) {
            const tracks = await response.json();
            displayScrapedTracks(tracks);
        } else {
            console.error('Error scraping tracks:', await response.text());
        }
    } catch (error) {
        console.error('Error scraping tracks:', error);
    }
}

// Function to display scraped tracks
function displayScrapedTracks(tracks) {
    const scrapedTracksList = document.getElementById('scrapedTracksList');
    scrapedTracksList.innerHTML = ''; // Clear previous entries

    // Iterate over each country in the tracks object
    for (const country in tracks) {
        // Create a heading for each country
        const countryHeader = document.createElement('h3');
        countryHeader.textContent = country;
        scrapedTracksList.appendChild(countryHeader);

        // Create a table for each country's tracks
        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th>Name</th>
                    <th>Laps</th>
                    <th>Fastest Lap</th>
                    <th>Type</th>
                    <th>Action</th>
                </tr>
            </thead>
            <tbody>
            </tbody>
        `;

        const tbody = table.querySelector('tbody');

        // Iterate through each track in the country
        tracks[country].forEach(track => {
            const trackRow = document.createElement('tr');
            trackRow.innerHTML = `
                <td><strong>${track.Name}</strong></td>
                <td>${track.Lap}</td>
                <td>${track.BaseLapTime}s</td>
                <td>${track.Type}</td>
                <td>
                    <button onclick="addTrackToDB('${track.Name}', ${track.Lap}, ${track.BaseLapTime}, '${track.Type}')">Add to Database</button>
                </td>
            `;
            tbody.appendChild(trackRow);
        });

        // Append the table to the scrapedTracksList div
        scrapedTracksList.appendChild(table);
    }
}

async function addTrackToDB(name, laps, baseLapTime, type) {
    const baseUrl = 'https://lab-2105cf46-fd70-4e4b-8ece-4494323c5240.australiaeast.cloudapp.azure.com:7084'; // API Base URL

    const trackData = {
        name: name,
        type: type,
        totalLaps: laps !== undefined ? Number(laps) : 0, // Convert to number
        baseLapTime: Number(baseLapTime) // Convert to number
    };

    try {
        const response = await fetch(`${baseUrl}/track`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(trackData), // Send the track data as JSON
        });

        if (response.ok) {
            alert('Track added successfully');
            await loadTracks(); // Refresh the track list after adding
        } else {
            const errorText = await response.text(); // Read the error message
            console.error('Error adding track:', errorText);
            alert(`Failed to add track: ${errorText}`); // Notify user of the error
        }
    } catch (error) {
        console.error('Error adding track:', error);
        alert(`Error adding track: ${error.message}`); // Notify user of the error
    }
}


// Function to load existing tracks from the database
async function loadTracks() {
    try {
        const response = await fetch(`${baseUrl}/track`);
        if (response.ok) {
            const tracks = await response.json();
            displayTracks(tracks);
        } else {
            console.error('Error loading tracks:', await response.text());
        }
    } catch (error) {
        console.error('Error loading tracks:', error);
    }
}

// Function to display existing tracks
function displayTracks(tracks) {
    const tracksList = document.getElementById('tracksList');
    tracksList.innerHTML = ''; // Clear previous entries

    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Base Lap Time</th>
                <th>total Laps</th>
                <th>Action</th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    `;

    const tbody = table.querySelector('tbody');
    tracks.forEach(track => {
        const trackRow = document.createElement('tr');
        trackRow.innerHTML = `
            <td>${track.name}</td>
            <td>${track.type}</td>
            <td>${track.baseLapTime}</td>
            <td>${track.totalLaps}</td>
            <td>
                <button onclick="deleteTrack('${track.id}')">Delete</button>
            </td>
        `;
        tbody.appendChild(trackRow);
    });

    tracksList.appendChild(table);
}

// Function to delete a track
async function deleteTrack(trackId) {
    try {
        const response = await fetch(`${baseUrl}/track/${trackId}`, {
            method: 'DELETE',
        });

        if (response.ok) {
            console.log('Track deleted successfully');
            await loadTracks(); // Refresh the track list after deletion
        } else {
            console.error('Error deleting track:', await response.text());
        }
    } catch (error) {
        console.error('Error deleting track:', error);
    }
}

// Load existing tracks on page load
window.onload = loadTracks;
