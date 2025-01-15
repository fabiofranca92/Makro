const sql = require('mssql');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

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

// Function to fetch slugs from the makrocategories table
async function fetchSlugs(conn) {
    const query = 'SELECT slug, id FROM makrocategories';
    const result = await conn.request().query(query);
    return result.recordset.map(row => ({ slug: row.slug, name: row.id }));
}

// Function to send HTTP requests for each slug and save the response as a file
async function sendHttpRequests(slugs) {
    const urlTemplate = 'https://app-search-2.prod.de.metro-marketplace.cloud/api/v3/search?filter[categories][]=%SLUG%&limit=100';

    for (const { slug, name } of slugs) {
        const url = urlTemplate.replace('%SLUG%', slug);
        try {
            const response = await axios.get(url, {
                headers: {
                    'Country-Code': 'pt'  // Adding the custom header to the request
                }
            });
            // Create a file path for the response JSON, using the category name
            const filePath = path.join(__dirname+'/MakroData', `${slug.replace(/\s+/g, '_').toLowerCase()}.json`);

            // Write the JSON response to the file
            fs.writeFileSync(filePath, JSON.stringify(response.data, null, 2), 'utf8');
            console.log(`Request for category '${slug}' successful. Data saved to ${filePath}`);
        } catch (error) {
            console.error(`Error for category '${slug}':`, error.message);
        }
    }
}

// Main execution flow
async function main() {
    try {
        const conn = await createConnection();

        // Fetch the slugs and names from the database
        const slugs = await fetchSlugs(conn);

        // Send HTTP requests for each slug and save the responses
        await sendHttpRequests(slugs);

        // Close the connection
        await conn.close();
        console.log('Database connection closed.');
    } catch (err) {
        console.error('Error in execution:', err);
    }
}

// Run the script
main();
