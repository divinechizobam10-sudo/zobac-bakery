
require("dotenv").config();

const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL
        ? { rejectUnauthorized: false }
        : false
});

async function migrateCustomers() {
    const filePath = path.join(__dirname, "customers.json");

    try {
        if (!process.env.DATABASE_URL) {
            throw new Error("DATABASE_URL is missing from .env");
        }

        if (!fs.existsSync(filePath)) {
            throw new Error("customers.json was not found.");
        }

        const customers = JSON.parse(
            fs.readFileSync(filePath, "utf8")
        );

        if (!Array.isArray(customers)) {
            throw new Error("customers.json must contain an array.");
        }

        console.log(`Found ${customers.length} customer accounts.`);

        await pool.query(`
            CREATE TABLE IF NOT EXISTS zobac_customers (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                email TEXT NOT NULL UNIQUE,
                phone TEXT NOT NULL DEFAULT '',
                password_hash TEXT NOT NULL,
                created_at TIMESTAMPTZ NOT NULL
            )
        `);

        await pool.query("BEGIN");

        let migrated = 0;

        for (const customer of customers) {
            if (
                !customer.id ||
                !customer.name ||
                !customer.email ||
                !customer.passwordHash ||
                !customer.createdAt
            ) {
                throw new Error(
                    "A customer record is missing required information."
                );
            }

            await pool.query(
                `INSERT INTO zobac_customers
                    (id, name, email, phone, password_hash, created_at)
                 VALUES ($1, $2, $3, $4, $5, $6)
                 ON CONFLICT (id) DO NOTHING`,
                [
                    customer.id,
                    customer.name,
                    customer.email,
                    customer.phone || "",
                    customer.passwordHash,
                    customer.createdAt
                ]
            );

            migrated++;
        }

        await pool.query("COMMIT");

        const result = await pool.query(
            "SELECT COUNT(*)::int AS total FROM zobac_customers"
        );

        console.log("Migration completed successfully.");
        console.log(`Customer records processed: ${migrated}`);
        console.log(`Total accounts in PostgreSQL: ${result.rows[0].total}`);

    } catch (error) {
        await pool.query("ROLLBACK").catch(() => {});
        console.error("Migration failed:", error.message);
    } finally {
        await pool.end();
    }
}

migrateCustomers();
