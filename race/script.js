const baseUrl = 'https://lab-2105cf46-fd70-4e4b-8ece-4494323c5240.australiaeast.cloudapp.azure.com:7084'; // Replace with your API URL
// Function to load existing races on page load
window.onload = async () => {
    await loadRaces();
};

// Load races from the API
async function loadRaces() {
    try {
        const response = await fetch(`${baseUrl}/race`);
        if (response.ok) {
            const races = await response.json();
            displayRaces(races);
        } else {
            console.error('Error loading races:', await response.text());
        }
    } catch (error) {
        console.error('Error loading races:', error);
    }
}

// Display the list of races
function displayRaces(races) {
    const racesList = document.getElementById('racesList');
    racesList.innerHTML = ''; // Clear previous entries

    races.forEach(race => {
        const raceDiv = document.createElement('div');
        raceDiv.innerHTML = `<strong>${race.name}</strong> <button onclick="viewRace(${race.id})">View Race</button>`;
        racesList.appendChild(raceDiv);
    });
}

// View race details and display leaderboard and lap times
async function viewRace(raceId) {
    try {
        const response = await fetch(`${baseUrl}/race/${raceId}/leaderboard`);
        if (response.ok) {
            const raceDetails = await response.json();
            displayRaceDetails(raceDetails, raceId);
        } else {
            console.error('Error loading race details:', await response.text());
        }
    } catch (error) {
        console.error('Error loading race details:', error);
    }
}

async function viewLaps(raceId) {
    try {
        const response = await fetch(`${baseUrl}/race/${raceId}/`);
        if (response.ok) {
            const racelaps = await response.json();
            displayLapDetails(racelaps);
        } else {
            console.error('Error loading race laps :', await response.text());
        }
    } catch (error) {
        console.error('Error loading race laps :', error);
    }
}


// Display race details including leaderboard and lap times
function displayRaceDetails(raceDetails, raceId) {
    document.getElementById('racesList').style.display = 'none';
    document.getElementById('raceDetails').style.display = 'block';

    document.getElementById('raceTitle').textContent = raceDetails.name;

    // Display the leaderboard
    const leaderboard = document.getElementById('leaderboard');
    leaderboard.innerHTML = ''; // Clear previous entries
    raceDetails.entrants.forEach((entrant, index) => {
        const driverDiv = document.createElement('div');
        driverDiv.innerHTML = `${index + 1}. Position: ${entrant.position}, Lap: ${entrant.laps}, Time:  ${entrant.time}`;
        leaderboard.appendChild(driverDiv);
    });
    viewLaps(raceId);

}


function displayLapDetails(racelaps) {
    // Display lap times
    const lapTimes = document.getElementById('lapTimes');
    lapTimes.innerHTML = ''; // Clear previous entries
    const lapData = JSON.parse(racelaps.laps); // Parse lap data from string to JSON
    console.log(lapData);
    
    lapData.forEach((lap, lapIndex) => {
        const lapDiv = document.createElement('div');
        lapDiv.innerHTML = `Lap ${lapIndex + 1}:`;

        // Check if lap has an entry for time directly
        if (lap.time) {
            const timeDiv = document.createElement('div');
            timeDiv.innerHTML = `Driver ${lap.entrant + 1}: ${lap.time} seconds${lap.crashed ? ' (Crashed)' : ''}`;
            lapDiv.appendChild(timeDiv);
        }

        // Check for lap times array if it exists
        if (lap.lapTimes) {
            lap.lapTimes.forEach(time => {
                const timeDiv = document.createElement('div');
                timeDiv.innerHTML = `Driver ${time.entrant + 1}: ${time.time} seconds${time.crashed ? ' (Crashed)' : ''}`;
                lapDiv.appendChild(timeDiv);
            });
        }

        lapTimes.appendChild(lapDiv);
    });
}


// Back button functionality
document.getElementById('backToRaces').addEventListener('click', () => {
    document.getElementById('racesList').style.display = 'block';
    document.getElementById('raceDetails').style.display = 'none';
});
