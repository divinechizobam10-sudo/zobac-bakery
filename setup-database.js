
require("dotenv").config();
const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

async function setupDatabase() {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS zobac_orders (
                order_number TEXT PRIMARY KEY,
                order_data JSONB NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);

        console.log("Success! The zobac_orders table is ready.");
    } catch (error) {
        console.error("Database setup failed:", error);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

setupDatabase();
