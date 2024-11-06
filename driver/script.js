const baseUrlInput = document.getElementById('baseUrl');
const driversListDiv = document.getElementById('driversList');
const driverNumberInput = document.getElementById('driverNumber');
const driverNameInput = document.getElementById('driverName');
const driverShortNameInput = document.getElementById('driverShortName');

// Load drivers
document.getElementById('loadDrivers').addEventListener('click', async () => {
    const baseUrl = baseUrlInput.value;
    try {
        const response = await fetch(`${baseUrl}/driver`);
        const drivers = await response.json();
        displayDrivers(drivers);
    } catch (error) {
        console.error('Error loading drivers:', error);
    }
});

// Add driver
document.getElementById('addDriver').addEventListener('click', async () => {
    const baseUrlInput = document.getElementById('baseUrl'); // Ensure this is correctly referenced
    const driverNumberInput = document.getElementById('driverNumber');
    const driverNameInput = document.getElementById('driverName');
    const driverShortNameInput = document.getElementById('driverShortName');
    const skillRaceInput = document.getElementById('skillRace');
    const skillStreetInput = document.getElementById('skillStreet');

    const baseUrl = baseUrlInput.value.trim(); // Trim whitespace
    const driverData = {
        number: driverNumberInput.value.trim(),
        name: driverNameInput.value.trim(),
        shortName: driverShortNameInput.value.trim(),
        skill_race: Number(skillRaceInput.value), // Convert to number
        skill_street: Number(skillStreetInput.value) // Convert to number
    };

    // Error message container
    const errorMessagesDiv = document.getElementById('errorMessages');
    errorMessagesDiv.innerHTML = ''; // Clear previous messages

    // Validate input fields
    let errorMessages = [];
    if (!driverData.number) {
        errorMessages.push('Driver Number is required.');
    }
    if (!driverData.name) {
        errorMessages.push('Driver Name is required.');
    }
    if (!driverData.shortName) {
        errorMessages.push('Driver Short Name is required.');
    }
    if (isNaN(driverData.skill_race) || driverData.skill_race < 0 || driverData.skill_race > 100) {
        errorMessages.push('Skill Race must be a number between 0 and 100.');
    }
    if (isNaN(driverData.skill_street) || driverData.skill_street < 0 || driverData.skill_street > 100) {
        errorMessages.push('Skill Street must be a number between 0 and 100.');
    }

    // Display error messages if there are any
    if (errorMessages.length > 0) {
        errorMessagesDiv.innerHTML = errorMessages.join('<br>'); // Show errors
        return; // Stop further execution if there are errors
    }

    try {
        const response = await fetch(`${baseUrl}/driver`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(driverData),
        });

        if (response.ok) {
            await loadDrivers(baseUrl); // Reload drivers after adding
        } else {
            const errorText = await response.text();
            console.error('Error adding driver:', errorText);
            errorMessagesDiv.innerHTML = `Error adding driver: ${errorText}`; // Display error response
        }
    } catch (error) {
        console.error('Error adding driver:', error);
        errorMessagesDiv.innerHTML = `Error adding driver: ${error.message}`; // Display error message
    }
});


// Display drivers
function displayDrivers(drivers) {
    // Clear existing content
    driversListDiv.innerHTML = '';

    // Create table elements
    const table = document.createElement('table');
    table.className = 'driver-table';

    // Create table header
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = `
        <th>Number</th>
        <th>Name</th>
        <th>Short Name</th>
        <th>Skill Race</th>
        <th>Skill Street</th>
        <th>Actions</th>
    `;
    table.appendChild(headerRow);

    // Populate table with driver data
    drivers.forEach(driver => {
        const driverRow = document.createElement('tr');
        driverRow.innerHTML = `
            <td>${driver.number}</td>
            <td>${driver.name}</td>
            <td>${driver.shortName}</td>
            <td>${driver.skill.race}</td>
            <td>${driver.skill.street}</td>
            <td>
                <button onclick="deleteDriver('${driver.number}')">Delete</button>
            </td>
        `;
        table.appendChild(driverRow);
    });

    // Append table to the drivers list div
    driversListDiv.appendChild(table);
}

// Delete driver
async function deleteDriver(driverNumber) {
    const baseUrl = baseUrlInput.value;
    try {
        const response = await fetch(`${baseUrl}/driver/${driverNumber}`, {
            method: 'DELETE',
        });

        if (response.ok) {
            await loadDrivers(baseUrl);
        } else {
            console.error('Error deleting driver:', await response.text());
        }
    } catch (error) {
        console.error('Error deleting driver:', error);
    }
}

// Load drivers from a given base URL
async function loadDrivers(baseUrl) {
    try {
        const response = await fetch(`${baseUrl}/driver`);
        const drivers = await response.json();
        displayDrivers(drivers);
    } catch (error) {
        console.error('Error loading drivers:', error);
    }
}
