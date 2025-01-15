const fs = require('fs');
const path = require('path');
const sql = require('mssql');

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

// Function to insert product data into the makro_products table
async function insertProduct(conn, barcode, name, unit_price, price, vat_value, quantity) {
    const query = `
        INSERT INTO makro_products (barcode, name, unit_price, price, vat_value, quantity)
        VALUES (@barcode, @name, @unit_price, @price, @vat_value, @quantity);
    `;
    
    await conn.request()
        .input('barcode', sql.NVarChar, barcode)
        .input('name', sql.NVarChar, name)
        .input('unit_price', sql.Decimal, unit_price)
        .input('price', sql.Decimal, price)
        .input('vat_value', sql.Decimal, vat_value)
        .input('quantity', sql.Int, quantity)
        .query(query);
    
    console.log(`Inserted/Updated product: ${name}`);
}

// Function to read and process JSON files in a directory
async function processJsonFiles(directoryPath,conn) {
    const files = fs.readdirSync(directoryPath);

    for (const file of files) {
        if (file.endsWith('.json')) {
            const filePath = path.join(directoryPath, file);
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

            // Process each product in the JSON file
            if (data.items && data.items.length > 0) {
                for (const item of data.items) {
                    const barcode = item.gtin || '';
                    const name = item.name || '';
                    const unit_price = item.bestOffer?.unitPrice?.price?.grossPrice || 0;
                    const price = item.bestOffer?.price?.grossPrice || 0;
                    const vat_value = item.bestOffer?.price?.vatValue || 0;
                    const quantity = item.bestOffer?.quantity || 0;

                    // Insert into the database
                    await insertProduct(conn, barcode, name, unit_price, price, vat_value, quantity);
                }
            }
        }
    }
}

// Main execution flow
async function main() {
    try {
        const conn = await createConnection();
        const directoryPath = './MakroData'; // replace with your directory containing the JSON files

        // Process all JSON files in the directory
        await processJsonFiles(directoryPath,conn);

        // Close the connection
        await conn.close();
        console.log('Database connection closed.');
    } catch (err) {
        console.error('Error in execution:', err);
    }
}

// Run the script
main();
