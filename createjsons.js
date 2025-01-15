const sql = require('mssql');
const axios = require('axios');
const fs = require('fs');

// Function to create a SQL Server connection
function createConnection() {
    return sql.connect({
        user: 'FF',
        password: 'Char1bury123',
        server: 'ec2-13-60-252-8.eu-north-1.compute.amazonaws.com',
        database: 'Makro',
        options: {
            encrypt: true, // Use true if you're on Azure
            trustServerCertificate: true, // Set to true for local dev/test
        }
    });
}

// Function to fetch categories from the `makrocategories` table
async function getCategories(conn) {
    const result = await conn.request().query('SELECT id, slug FROM makrocategories');
    return result.recordset;
}

// Function to fetch data from the API and save to a file
async function fetchDataAndSave(offset) {
    const url = `https://app-search-2.prod.de.metro-marketplace.cloud/api/v3/search?offset=${offset}&limit=100`;
    try {
        const response = await axios.get(url);

        // Save the response data to a new JSON file based on the category slug and offset
        const filename = `MakroData/response_${offset}.json`;
        fs.writeFileSync(filename, JSON.stringify(response.data, null, 2));

        console.log(`Saved response for offset ${offset} to ${filename}`);
    } catch (error) {
        console.error(`Error fetching data offset ${offset}:`, error);
    }
}

// Main function to loop through each category and make requests with the offset increment
async function main() {
    try {
        const conn = await createConnection();
        const categories = await getCategories(conn);

        // Loop over each category
        for (const category of categories) {
            let offset = 0;
            let iteration = 1;

            // Loop to increment offset by 40 for each iteration
            while (true) {
                console.log(`Fetching data for category offset: ${offset}`);
                await fetchDataAndSave(offset);

                // Increase offset by 40
                offset += 40;

                // Add logic to break the loop when no more data is returned
                // (example: check the response or a maximum limit on iterations)
                iteration++;
                
            }
        }

        // Close the connection after operations
        await conn.close();
        console.log('Database connection closed.');
    } catch (err) {
        console.error('Error in execution:', err);
    }
}

// Run the script
main();
