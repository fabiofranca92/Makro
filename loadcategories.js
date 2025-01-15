const fs = require('fs');
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

// Function to create the makrocategories table
async function createTable(conn) {
    const createTableQuery = `
        IF NOT EXISTS (SELECT * FROM sys.tables WHERE name = 'makrocategories')
        BEGIN
            CREATE TABLE makrocategories (
                id NVARCHAR(255) PRIMARY KEY,
                slug NVARCHAR(255) NOT NULL
            );
        END
    `;
    await conn.request().query(createTableQuery);
    console.log('Table created or already exists.');
}

// Function to insert slug into the table
async function insertSlug(conn, id, slug) {
    const insertQuery = `
        IF EXISTS (SELECT 1 FROM makrocategories WHERE id = @id)
        BEGIN
            UPDATE makrocategories
            SET slug = @slug
            WHERE id = @id;
        END
        ELSE
        BEGIN
            INSERT INTO makrocategories (id, slug)
            VALUES (@id, @slug);
        END
    `;
    
    await conn.request()
        .input('id', sql.NVarChar, id)
        .input('slug', sql.NVarChar, slug)
        .query(insertQuery);

    console.log(`Category with slug: ${slug} inserted/updated.`);
}

// Function to load data from the JSON file and extract slugs
async function loadDataFromJson(jsonFilePath, conn) {
    try {
        const data = await fs.promises.readFile(jsonFilePath, 'utf8');
        const jsonData = JSON.parse(data);
        const items = jsonData.items;

        for (const item of items) {
            const slug = item.slug;
            const id = item.id;
            
            await insertSlug(conn, id, slug);

            // If the category has children, insert their slugs as well
            if (item.children && item.children.length > 0) {
                for (const child of item.children) {
                    await insertSlug(conn, child.id, child.slug);
                }
            }
        }
    } catch (err) {
        console.error('Error reading JSON file:', err);
    }
}

// Main execution flow
async function main() {
    try {
        const conn = await createConnection();

        // Create the table in the database
        await createTable(conn);

        // Path to your JSON file
        const jsonFilePath = './jsonformatter.txt'; // Replace with your actual file path
        // Load data from the JSON file
        await loadDataFromJson(jsonFilePath, conn);
        
        // Close the connection after all operations
        await conn.close();
        console.log('Database connection closed.');
    } catch (err) {
        console.error('Error in execution:', err);
    }
}

// Run the script
main();