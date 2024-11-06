// Load cars when the button is clicked
document.getElementById('loadCars').addEventListener('click', async () => {
    const baseUrl = document.getElementById('baseUrl').value.trim();
    await loadCars(baseUrl);
});

// Add a new car
document.getElementById('addCar').addEventListener('click', async () => {
    const baseUrl = document.getElementById('baseUrl').value.trim();
    const driverNumber = Number(document.getElementById('driverNumber').value.trim());
    const suitabilityRace = Number(document.getElementById('suitabilityRace').value.trim());
    const suitabilityStreet = Number(document.getElementById('suitabilityStreet').value.trim());
    const reliability = Number(document.getElementById('reliability').value.trim());

    // Validate inputs
    if (suitabilityRace + suitabilityStreet !== 100) {
        alert("Suitability ratings must sum to 100");
        return; // Exit if validation fails
    }

    const carData = {
        driver_number: driverNumber, // ensure this is being set correctly
        suitability_race: suitabilityRace,
        suitability_street: suitabilityStreet,
        reliability: reliability
    };
    console.log(carData);

    try {
        const response = await fetch(`${baseUrl}/car`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(carData),
        });

        const responseText = await response.text(); // Read the response body once

        if (response.ok) {
            await loadCars(baseUrl); // Reload cars after adding
        } else {
            console.error('Error adding car:', responseText);
            displayError(`Failed to add car: ${responseText}`);
        }
    } catch (error) {
        console.error('Error adding car:', error);
        displayError(`Error adding car: ${error.message}`);
    }
});


// Load cars from the API
async function loadCars(baseUrl) {
    try {
        const response = await fetch(`${baseUrl}/car`);
        if (response.ok) {
            const cars = await response.json();
            displayCars(cars);
        } else {
            console.error('Error loading cars:', await response.text());
        }
    } catch (error) {
        console.error('Error loading cars:', error);
    }
}

// Display cars in a table
function displayCars(cars) {
    const carsListDiv = document.getElementById('carsList');
    carsListDiv.innerHTML = ''; // Clear previous entries

    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Driver URI</th>
                <th>Driver Suitability Race</th>
                <th>Driver Suitability Street</th>
                <th>Driver Reliability</th>
                <th>Action</th>
            </tr>
        </thead>
        <tbody>
        </tbody>
    `;

    const tbody = table.querySelector('tbody');
    cars.forEach(car => {
        const carRow = document.createElement('tr');
        carRow.innerHTML = `
            <td>${car.id}</td>
            <td>${car.driver ? car.driver.name : 'No Driver'}</td>
            <td>${car.driver ? car.driver.uri : 'No Driver'}</td>
            <td>${car.suitability.race ? car.suitability.race : 0}</td>
            <td>${car.suitability.street ? car.suitability.street : 0}</td>
            <td>${car.reliability ? car.reliability : 0}</td>
            <td>
                <button onclick="deleteCar('${car.id}')">Delete</button>
                <input type="text" id="driverNumber" placeholder="Driver Number" />
                <button onclick="associateDriver('${car.id}', document.getElementById('driverNumber').value)">Associate Driver</button>
                <button onclick="removeDriver('${car.id}', document.getElementById('driverNumber').value)">Remove Driver</button>
            </td>
        `;
        tbody.appendChild(carRow);
    });

    carsListDiv.appendChild(table);
}

// Function to remove a driver from a car
async function removeDriver(carId, driverNumber) {
    const baseUrl = document.getElementById('baseUrl').value.trim();

    // Validate inputs
    if (!driverNumber) {
        alert("Driver number is required to remove.");
        return; // Exit if the driver number is empty
    }

    try {
        const response = await fetch(`${baseUrl}/car/${carId}/driver/${driverNumber}`, {
            method: 'DELETE',
        });

        if (response.ok) {
            await loadCars(baseUrl); // Refresh the car list
            console.log(`Driver ${driverNumber} removed from car ${carId}.`);
        } else {
            const errorText = await response.text();
            console.error('Error removing driver:', errorText);
console.log(carId, driverNumber);
            alert(`Failed to remove driver: ${errorText}`);
        }
    } catch (error) {
        console.error('Error removing driver:', error);
        alert(`Error removing driver: ${error.message}`);
    }
}

// Function to associate a driver with a car
async function associateDriver(carId, driverNumber) {
    const baseUrl = document.getElementById('baseUrl').value.trim();

    // Validate inputs
    if (!driverNumber) {
        alert("Driver number is required to associate.");
        return; // Exit if the driver number is empty
    }
	
  console.log(driverNumber);

    try {
        const response = await fetch(`${baseUrl}/car/${carId}/driver`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ driverNumber: Number(driverNumber) }), // Ensure driver number is numeric
        });

        if (response.ok) {
            await loadCars(baseUrl); // Refresh the car list
            console.log(`Driver ${driverNumber} associated with car ${carId}.`);
        } else {
            const errorText = await response.text();
            console.error('Error associating driver:', errorText);
            alert(`Failed to associate driver: ${errorText}`);
        }
    } catch (error) {
        console.error('Error associating driver:', error);
        alert(`Error associating driver: ${error.message}`);
    }
}



// Function to delete a car
async function deleteCar(carId) {
    const baseUrl = document.getElementById('baseUrl').value.trim();
    try {
        const response = await fetch(`${baseUrl}/car/${carId}`, {
            method: 'DELETE',
        });

        if (response.ok) {
            await loadCars(baseUrl); // Reload cars after deletion
        } else {
            console.error('Error deleting car:', await response.text());
        }
    } catch (error) {
        console.error('Error deleting car:', error);
    }
}


// Error display function
function displayError(message) {
    const errorMessagesDiv = document.getElementById('errorMessages');
    errorMessagesDiv.innerHTML = message; // Show error message
}

