const express = require("express");
const nodemailer = require("nodemailer");
const dns = require("node:dns");
dns.setDefaultResultOrder("ipv4first");
require("dotenv").config();
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");
const session = require("express-session");
const helmet = require("helmet");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;
// ===== POSTGRESQL DATABASE CONNECTION =====

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL
        ? { rejectUnauthorized: false }
        : false
});

pool.on("error", (error) => {
    console.error("Unexpected PostgreSQL error:", error.message);
});

// Trust Render's HTTPS proxy.
app.set("trust proxy", 1);





const ALLOWED_ORIGINS = [
    "https://divinechizobam10-sudo.github.io",
    "http://127.0.0.1:5500",
    "http://localhost:5500",
    "http://127.0.0.1:5501",
    "http://localhost:5501"
];


app.use((req, res, next) => {
    const origin = req.headers.origin;

    console.log("CORS check:", req.method, origin);

    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Access-Control-Allow-Credentials", "true");
        res.setHeader("Vary", "Origin");
    }

    res.setHeader(
        "Access-Control-Allow-Methods",
        "GET, POST, PATCH, PUT, DELETE, OPTIONS"
    );

    res.header(
        "Access-Control-Allow-Headers",
        "Content-Type, Authorization"
    );

    if (req.method === "OPTIONS") {
        return res.status(204).end();
    }

    next();
});


app.use(helmet());

console.log(
    "SESSION_SECRET exists:",
    Boolean(process.env.SESSION_SECRET)
);

console.log(
    "SESSION_SECRET length:",
    process.env.SESSION_SECRET?.length || 0
);



app.use(session({
    name: "zobacSession",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production"
            ? "none"
            : "lax",
        maxAge: 30 * 60 * 1000
    }
}));


const ORDERS_FILE = path.join(__dirname, "orders.json");
const REVIEWS_FILE = path.join(__dirname, "reviews.json");
const INVENTORY_FILE = path.join(__dirname, "inventory.json");







// Check that email settings exist without revealing credentials.
console.log("Gmail account configured:", Boolean(process.env.EMAIL_USER));
console.log("App password configured:", Boolean(process.env.EMAIL_PASS));
console.log("Bakery receiving email configured:", Boolean(process.env.BAKERY_EMAIL));

// Load saved orders.
function loadOrders() {
    try {
        if (!fs.existsSync(ORDERS_FILE)) {
            return [];
        }

        const data = fs.readFileSync(ORDERS_FILE, "utf8");
        return JSON.parse(data);
    } catch (error) {
        console.error("Could not load orders:", error.message);
        throw error;
    }
}

// Save orders.
function saveOrders(orders) {
    fs.writeFileSync(
        ORDERS_FILE,
        JSON.stringify(orders, null, 2),
        "utf8"
    );
}

/* ===== POSTGRESQL ORDER FUNCTIONS ===== */

// Get all orders from PostgreSQL.
async function loadOrdersFromDatabase() {
    const result = await pool.query(`
        SELECT order_data
        FROM zobac_orders
        ORDER BY created_at DESC
    `);

    return result.rows.map(row => row.order_data);
}

// Save a new order to PostgreSQL.
async function saveOrderToDatabase(order) {
    await pool.query(
        `INSERT INTO zobac_orders
            (order_number, order_data, created_at)
         VALUES ($1, $2::jsonb, COALESCE($3::timestamptz, NOW()))`,
        [
            order.orderNumber,
            JSON.stringify(order),
            order.createdAt || null
        ]
    );
}

// Update an existing order in PostgreSQL.
async function updateOrderInDatabase(order) {
    const result = await pool.query(
        `UPDATE zobac_orders
         SET order_data = $2::jsonb
         WHERE order_number = $1`,
        [
            order.orderNumber,
            JSON.stringify(order)
        ]
    );

    if (result.rowCount === 0) {
        throw new Error(
            `Order ${order.orderNumber} was not found in PostgreSQL.`
        );
    }
}



// =====================================
// CUSTOMER ACCOUNTS - POSTGRESQL
// =====================================

function formatCustomer(row) {
    if (!row) return null;

    return {
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone || "",
        passwordHash: row.password_hash,
        createdAt: new Date(row.created_at).toISOString()
    };
}

// Find a customer using their ID.
async function getCustomerById(id) {
    const result = await pool.query(
        `SELECT id, name, email, phone, password_hash, created_at
         FROM zobac_customers
         WHERE id = $1`,
        [id]
    );

    return formatCustomer(result.rows[0]);
}

// Find a customer using their email.
async function getCustomerByEmail(email) {
    const result = await pool.query(
        `SELECT id, name, email, phone, password_hash, created_at
         FROM zobac_customers
         WHERE email = $1`,
        [email]
    );

    return formatCustomer(result.rows[0]);
}

// Get all registered customers.
async function getAllCustomers() {
    const result = await pool.query(
        `SELECT id, name, email, phone, password_hash, created_at
         FROM zobac_customers
         ORDER BY created_at DESC`
    );

    return result.rows.map(formatCustomer);
}

function loadReviews() {
    if (!fs.existsSync(REVIEWS_FILE)) {
        return [];
    }

    const data = fs.readFileSync(REVIEWS_FILE, "utf8");
    const reviews = JSON.parse(data);

    if (!Array.isArray(reviews)) {
        throw new Error("reviews.json must contain an array.");
    }

    return reviews;
}

function saveReviews(reviews) {
    fs.writeFileSync(
        REVIEWS_FILE,
        JSON.stringify(reviews, null, 2),
        "utf8"
    );
}

    
// =====================================
// INVENTORY MANAGEMENT
// =====================================

// Load inventory from inventory.json
function loadInventory() {
    try {
        if (!fs.existsSync(INVENTORY_FILE)) {
            return [];
        }

        const data = fs.readFileSync(INVENTORY_FILE, "utf8");
        const inventory = JSON.parse(data);

        if (!Array.isArray(inventory)) {
            throw new Error("inventory.json must contain an array.");
        }

        return inventory;
    } catch (error) {
        console.error("Could not load inventory:", error.message);
        throw error;
    }
}

// Save inventory to inventory.json
function saveInventory(inventory) {
    fs.writeFileSync(
        INVENTORY_FILE,
        JSON.stringify(inventory, null, 2),
        "utf8"
    );
}

// Zobac Bakery trusted product prices.
const PRODUCT_PRICES = {
    "Cake": {
        "Small": 10000,
        "Medium": 15000,
        "Large": 30000
    },

    "Butter Bread": 2000,
    "Doughnuts": 500,
    "Wheat Bread": 2500,
    "Meat Pie": 1000,
    "Zobac Deluxe": 1500,
    "Banana Bread": 3000,
    "Chin Chin": 1000,
    "Cookies": 1000,
    "Plantain Chips": 2000,
    "Peanut Burger": 1000,
    "Zobo": 500
};

// Check trusted price for a product and customization.
function getTrustedPrice(item) {
    if (!item || typeof item !== "object") {
        return null;
    }

    const name = item.name || item.productName;
    const customization = item.customization || {};

    // Custom birthday cake.
    if (name === "Custom Birthday Cake") {
        return PRODUCT_PRICES.Cake[customization.size] ?? null;
    }

    // Custom pizza.
    if (typeof name === "string" && /pizza/i.test(name)) {
        return PRODUCT_PRICES.Pizza[customization.size] ?? null;
    }

    // Shawarma. Both spellings are supported.
    if (typeof name === "string" && /shawarma|sharwama/i.test(name)) {
        return PRODUCT_PRICES.Sharwama[customization.size] ?? null;
    }

    // Fixed-price products.
    const price = PRODUCT_PRICES[name];

    if (typeof price === "number") {
        return price;
    }

    return null;
}

app.use(express.json());

 // Check whether a customer is logged in

app.get("/api/customer/session", async (req, res) => {
    if (
        req.session?.customerAuthenticated !== true ||
        !req.session.customerId
    ) {
        return res.json({
            authenticated: false
        });
    }

    try {
        const customer = await getCustomerById(
            req.session.customerId
        );

        if (!customer) {
            return res.json({
                authenticated: false
            });
        }

        return res.json({
            authenticated: true,
            customer: {
                name: customer.name,
                email: customer.email,
                phone: customer.phone
            }
        });

    } catch (error) {
        console.error(
            "Could not check customer session:",
            error.message
        );

        return res.status(500).json({
            authenticated: false,
            message: "Could not check login status."
        });
    }
});


 // Update the logged-in customer's account details

app.patch("/api/customer/profile", async (req, res) => {
    if (
        req.session?.customerAuthenticated !== true ||
        !req.session.customerId
    ) {
        return res.status(401).json({
            success: false,
            message: "Please log in to update your account."
        });
    }

    try {
        const { name, phone } = req.body;

        if (
            typeof name !== "string" ||
            typeof phone !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide a valid name and phone number."
            });
        }

        const cleanName = name.trim();
        const cleanPhone = phone.trim();

        if (
            !cleanName ||
            cleanName.length > 100 ||
            cleanPhone.length > 30
        ) {
            return res.status(400).json({
                success: false,
                message: "Please check your name and phone number."
            });
        }

        const result = await pool.query(
            `UPDATE zobac_customers
             SET name = $2, phone = $3
             WHERE id = $1
             RETURNING id, name, email, phone, password_hash, created_at`,
            [
                req.session.customerId,
                cleanName,
                cleanPhone
            ]
        );

        const customer = formatCustomer(result.rows[0]);

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer account not found."
            });
        }

        return res.json({
            success: true,
            message: "Account details updated successfully.",
            customer: {
                name: customer.name,
                email: customer.email,
                phone: customer.phone
            }
        });

    } catch (error) {
        console.error("Account update failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Could not save your account details."
        });
    }
});


// Change logged-in customer's password
app.patch("/api/customer/change-password", async (req, res) => {
    try {
        if (
            req.session?.customerAuthenticated !== true ||
            !req.session.customerId
        ) {
            return res.status(401).json({
                success: false,
                message: "Please log in to change your password."
            });
        }

        const {
            currentPassword,
            newPassword
        } = req.body;

        if (
            typeof currentPassword !== "string" ||
            typeof newPassword !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Please complete all password fields."
            });
        }

        if (
            newPassword.length < 8 ||
            newPassword.length > 72
        ) {
            return res.status(400).json({
                success: false,
                message: "Your new password must be 8–72 characters long."
            });
        }

        // Get customer from PostgreSQL
        const customer = await getCustomerById(
            req.session.customerId
        );

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer account not found."
            });
        }

        // Verify current password
        const passwordIsCorrect = await bcrypt.compare(
            currentPassword,
            customer.passwordHash
        );

        if (!passwordIsCorrect) {
            return res.status(400).json({
                success: false,
                message: "Your current password is incorrect."
            });
        }

        if (newPassword === currentPassword) {
            return res.status(400).json({
                success: false,
                message: "Your new password must be different from your current password."
            });
        }

        // Hash and save new password in PostgreSQL
        const newPasswordHash = await bcrypt.hash(
            newPassword,
            12
        );

        await pool.query(
            `UPDATE zobac_customers
             SET password_hash = $2
             WHERE id = $1`,
            [
                customer.id,
                newPasswordHash
            ]
        );

        return res.json({
            success: true,
            message: "Your password has been changed successfully."
        });

    } catch (error) {
        console.error("Password change failed:", error);

        return res.status(500).json({
            success: false,
            message: "Could not change your password. Please try again."
        });
    }
});

// Customer logout
app.post("/api/customer/logout", (req, res, next) => {
    req.session.destroy((error) => {
        if (error) {
            return next(error);
        }

       res.clearCookie("zobacSession", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production"
        ? "none"
        : "lax"
});

        return res.json({
            success: true,
            message: "Logged out successfully."
        });
    });
});
    



app.post("/api/register", async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;

        if (
            typeof name !== "string" ||
            typeof email !== "string" ||
            typeof password !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Please provide your name, email and password."
            });
        }

        const cleanName = name.trim();
        const cleanEmail = email.trim().toLowerCase();

        if (!cleanName || cleanName.length > 100) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid name."
            });
        }

        if (
            !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) ||
            cleanEmail.length > 254
        ) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid email address."
            });
        }

        if (password.length < 8 || password.length > 72) {
            return res.status(400).json({
                success: false,
                message: "Your password must be 8–72 characters long."
            });
        }

        if (
            phone !== undefined &&
            (typeof phone !== "string" || phone.trim().length > 30)
        ) {
            return res.status(400).json({
                success: false,
                message: "Please enter a valid phone number."
            });
        }

        // Check PostgreSQL for an existing account.
        const existingCustomer = await getCustomerByEmail(cleanEmail);

        if (existingCustomer) {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists."
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const customer = {
            id: require("crypto").randomUUID(),
            name: cleanName,
            email: cleanEmail,
            phone: typeof phone === "string" ? phone.trim() : "",
            passwordHash,
            createdAt: new Date().toISOString()
        };

        // Save the new customer permanently in PostgreSQL.
        await pool.query(
            `INSERT INTO zobac_customers
             (id, name, email, phone, password_hash, created_at)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [
                customer.id,
                customer.name,
                customer.email,
                customer.phone,
                customer.passwordHash,
                customer.createdAt
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Registration successful. You can now log in."
        });

    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                success: false,
                message: "An account with this email already exists."
            });
        }

        console.error("Customer registration failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Registration failed. Please try again."
        });
    }
});


app.post("/api/login", async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (
            typeof email !== "string" ||
            typeof password !== "string"
        ) {
            return res.status(400).json({
                success: false,
                message: "Please enter your email and password."
            });
        }

        const cleanEmail = email.trim().toLowerCase();

        // Find customer in PostgreSQL.
        const customer = await getCustomerByEmail(cleanEmail);

        if (
            !customer ||
            !(await bcrypt.compare(password, customer.passwordHash))
        ) {
            return res.status(401).json({
                success: false,
                message: "Incorrect email or password."
            });
        }

        // Start a fresh session after successful login.
        req.session.regenerate((err) => {
            if (err) return next(err);

            req.session.customerId = customer.id;
            req.session.customerAuthenticated = true;

            req.session.save((saveError) => {
                if (saveError) return next(saveError);

                return res.json({
                    success: true,
                    message: "Login successful.",
                    customer: {
                        name: customer.name,
                        email: customer.email,
                        phone: customer.phone
                    }
                });
            });
        });

    } catch (error) {
        console.error("Customer login failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Login failed. Please try again."
        });
    }
});


function requireAdmin(req, res, next) {
    if (req.session && req.session.adminAuthenticated === true) {
        return next();
    }

    return res.status(401).json({
        success: false,
        message: "Please log in as admin."
    });
}


/* CUSTOMER REVIEWS */

// Get approved reviews for the homepage
app.get("/api/reviews", (req, res) => {
    try {
        const reviews = loadReviews();

        const approvedReviews = reviews
            .filter(review => review.status === "approved")
            .map(review => ({
                id: review.id,
                customerName: review.customerName,
                rating: review.rating,
                comment: review.comment,
                createdAt: review.createdAt
            }));

        res.json(approvedReviews);
    } catch (error) {
        console.error("Error loading reviews:", error);
        res.status(500).json({ message: "Could not load reviews." });
    }
});



// Get the logged-in customer's delivered orders that can be reviewed
app.get("/api/customer/reviewable-orders", async (req, res) => {
    if (
        !req.session ||
        req.session.customerAuthenticated !== true ||
        !req.session.customerId
    ) {
        return res.status(401).json({
            message: "Please log in to review an order."
        });
    }

    try {
        // Get customer from PostgreSQL.
        const customer = await getCustomerById(
            req.session.customerId
        );

        const orders = await loadOrdersFromDatabase();
        const reviews = loadReviews();

        if (!customer) {
            return res.status(404).json({
                message: "Customer account not found."
            });
        }

        const customerOrders = orders.filter(order => {
            const belongsToCustomer =
                order.customerId === customer.id ||
                (
                    !order.customerId &&
                    String(order.email || "").toLowerCase() ===
                    String(customer.email || "").toLowerCase()
                );

            const alreadyReviewed = reviews.some(
                review =>
                    review.orderNumber === order.orderNumber
            );

            return (
                belongsToCustomer &&
                order.status === "Delivered" &&
                !alreadyReviewed
            );
        });

        return res.json(customerOrders.map(order => ({
            orderNumber: order.orderNumber,
            items: order.items,
            createdAt: order.createdAt
        })));

    } catch (error) {
        console.error("Error finding reviewable orders:", error);

        return res.status(500).json({
            message: "Could not load reviewable orders."
        });
    }
});



// Submit a review for a delivered order
app.post("/api/reviews", async (req, res) => {
    if (
        !req.session ||
        req.session.customerAuthenticated !== true ||
        !req.session.customerId
    ) {
        return res.status(401).json({
            message: "Please log in before submitting a review."
        });
    }

    try {
        const { orderNumber, rating, comment } = req.body;

        const cleanOrderNumber =
            String(orderNumber || "").trim();

        const cleanComment =
            typeof comment === "string" ? comment.trim() : "";

        const numericRating = Number(rating);

        if (!cleanOrderNumber) {
            return res.status(400).json({
                message: "Please select an order."
            });
        }

        if (
            !Number.isInteger(numericRating) ||
            numericRating < 1 ||
            numericRating > 5
        ) {
            return res.status(400).json({
                message: "Please choose a rating from 1 to 5 stars."
            });
        }

        if (cleanComment.length < 3 || cleanComment.length > 1000) {
            return res.status(400).json({
                message: "Your comment must be between 3 and 1000 characters."
            });
        }

        // Get customer from PostgreSQL.
        const customer = await getCustomerById(
            req.session.customerId
        );

        const orders = await loadOrdersFromDatabase();
        const reviews = loadReviews();

        if (!customer) {
            return res.status(404).json({
                message: "Customer account not found."
            });
        }

        const order = orders.find(
            item =>
                String(item.orderNumber) === cleanOrderNumber
        );

        if (!order) {
            return res.status(404).json({
                message: "Order not found."
            });
        }

        const belongsToCustomer =
            order.customerId === customer.id ||
            (
                !order.customerId &&
                String(order.email || "").toLowerCase() ===
                String(customer.email || "").toLowerCase()
            );

        if (!belongsToCustomer) {
            return res.status(403).json({
                message: "You can only review your own orders."
            });
        }

        if (order.status !== "Delivered") {
            return res.status(400).json({
                message: "You can only review orders marked Delivered."
            });
        }

        const alreadyReviewed = reviews.some(
            review =>
                review.orderNumber === order.orderNumber
        );

        if (alreadyReviewed) {
            return res.status(409).json({
                message: "This order has already been reviewed."
            });
        }

        const review = {
            id: Date.now().toString(36) +
                Math.random().toString(36).slice(2, 10),
            orderNumber: order.orderNumber,
            customerId: customer.id,
            customerName: customer.name,
            rating: numericRating,
            comment: cleanComment,
            status: "pending",
            createdAt: new Date().toISOString()
        };

        reviews.push(review);
        saveReviews(reviews);

        return res.status(201).json({
            success: true,
            message: "Review submitted successfully. It is awaiting approval."
        });

    } catch (error) {
        console.error("Error submitting review:", error);

        return res.status(500).json({
            message: "Could not submit your review."
        });
    }
});


// Admin: view all customer reviews
app.get("/api/admin/reviews", requireAdmin, (req, res) => {
    try {
        const reviews = loadReviews();

        res.json(reviews.map(review => ({
            id: review.id,
            orderNumber: review.orderNumber,
            customerName: review.customerName,
            rating: review.rating,
            comment: review.comment,
            status: review.status,
            createdAt: review.createdAt
        })));
    } catch (error) {
        console.error("Error loading admin reviews:", error);
        res.status(500).json({
            message: "Could not load reviews."
        });
    }
});


// Admin: approve or reject a customer review
app.patch("/api/admin/reviews/:id", requireAdmin, (req, res) => {
    try {
        const { status } = req.body;

        if (!["approved", "rejected"].includes(status)) {
            return res.status(400).json({
                message: "Status must be approved or rejected."
            });
        }

        const reviews = loadReviews();

        const review = reviews.find(
            item => item.id === req.params.id
        );

        if (!review) {
            return res.status(404).json({
                message: "Review not found."
            });
        }

        review.status = status;
        saveReviews(reviews);

        res.json({
            success: true,
            message: `Review ${status} successfully.`
        });
    } catch (error) {
        console.error("Error updating review:", error);
        res.status(500).json({
            message: "Could not update review."
        });
    }
});

// Admin: view all registered customers
app.get("/api/admin/customers", requireAdmin, async (req, res) => {
    try {
        // Get all customers from PostgreSQL.
        const customers = await getAllCustomers();

        return res.json(customers.map(customer => ({
            id: customer.id,
            name: customer.name,
            email: customer.email,
            phone: customer.phone,
            createdAt: customer.createdAt
        })));

    } catch (error) {
        console.error("Error loading registered customers:", error);

        return res.status(500).json({
            success: false,
            message: "Could not load registered customers."
        });
    }
});


app.post("/api/admin/login", (req, res, next) => {
    const { username, password } = req.body || {};

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: "Please enter your username and password."
        });
    }

    if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
        return res.status(500).json({
            success: false,
            message: "Admin login is not configured on the server."
        });
    }

    if (
        username !== process.env.ADMIN_USERNAME ||
        password !== process.env.ADMIN_PASSWORD
    ) {
        return res.status(401).json({
            success: false,
            message: "Incorrect admin username or password."
        });
    }

    req.session.regenerate((err) => {
        if (err) {
            return next(err);
        }

        req.session.adminAuthenticated = true;

        req.session.save((saveError) => {
            if (saveError) {
                return next(saveError);
            }

            return res.json({
                success: true,
                message: "Admin login successful."
            });
        });
    });
});

// Check whether the admin is logged in
app.get("/api/admin/session", (req, res) => {
    res.json({
        authenticated: req.session?.adminAuthenticated === true
    });
});

// Admin logout
app.post("/api/admin/logout", (req, res, next) => {
    req.session.destroy((err) => {
        if (err) return next(err);

      res.clearCookie("zobacSession", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production"
        ? "none"
        : "lax"
});

        res.json({
            success: true,
            message: "Admin logged out."
        });
    });
});

app.get("/admin.html", (req, res) => {
    if (req.session?.adminAuthenticated !== true) {
        return res.redirect("/admin-login.html");
    }

    res.sendFile(path.join(__dirname, "admin.html"));
});

app.get("/admin.js", requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, "admin.js"));
});

app.use((req, res, next) => {
    if (["/orders.json", "/server.js"].includes(req.path)) {
        return res.sendStatus(404);
    }

    next();
});

app.use(express.static(__dirname));

// Backend status.
app.get("/api/status", (req, res) => {
    res.json({
        message: "Zobac Bakery backend is running!"
    });
});

// Backend information.
app.get("/api/info", (req, res) => {
    res.json({
        bakery: "Zobac Bakery",
        status: "online",
        features: [
            "Backend status check",
            "Order submission",
            "Order validation",
            "Email notifications"
        ]
    });
});

// Submit an order and email the bakery.
app.post("/api/orders", async (req, res) => {
    try {
        // Require a logged-in customer.
        if (
            req.session?.customerAuthenticated !== true ||
            !req.session.customerId
        ) {
            return res.status(401).json({
                success: false,
                message: "Please log in before placing an order."
            });
        }
// Get the customer's identity from PostgreSQL.
const customer = await getCustomerById(
    req.session.customerId
);

        if (!customer) {
            return res.status(401).json({
                success: false,
                message: "Customer account not found. Please log in again."
            });
        }

        const order = req.body;

console.log("NEW ORDER RECEIVED BY BACKEND");
console.log("ORDER DATA:", JSON.stringify(order, null, 2));
        // Validate customer information.
        if (
            !order ||
            typeof order.name !== "string" ||
            !order.name.trim() ||
            typeof order.phone !== "string" ||
            !order.phone.trim() ||
            typeof order.address !== "string" ||
            !order.address.trim() ||
            typeof order.deliveryDate !== "string" ||
            !order.deliveryDate.trim() ||
            !Array.isArray(order.items) ||
            order.items.length === 0
        ) {
            return res.status(400).json({
                message: "Please provide complete order details."
            });
        }

        // Validate order number.
        if (
            typeof order.orderNumber !== "string" ||
            !order.orderNumber.trim()
        ) {
            return res.status(400).json({
                message: "A valid order number is required."
            });
        }
        
        // Validate the selected payment method.
        const allowedPaymentMethods = [
            "Bank Transfer",
            "Pay at Bakery"
        ];

        if (!allowedPaymentMethods.includes(order.paymentMethod)) {
            return res.status(400).json({
                message: "Please select a valid payment method."
            });
        }


        // Validate each item before saving anything.
        const invalidItem = order.items.some(item => {
            if (!item || typeof item !== "object") {
                return true;
            }

            const quantity = Number(item.quantity);
            const price = Number(item.price);
            const itemName = item.name || item.productName;

            return (
                typeof itemName !== "string" ||
                !itemName.trim() ||
                !Number.isInteger(quantity) ||
                quantity < 1 ||
                !Number.isFinite(price) ||
                price < 0
            );
        });

        if (invalidItem) {
            return res.status(400).json({
                message: "One or more order items have invalid details."
            });
        }

        // Check submitted prices against trusted prices.
        const priceMismatch = order.items.some(item => {
            const trustedPrice = getTrustedPrice(item);

            return (
                trustedPrice === null ||
                Number(item.price) !== trustedPrice
            );
        });

        console.log("PRICE MISMATCH:", priceMismatch);

        if (priceMismatch) {
            console.log(
                "ORDER ITEMS:",
                JSON.stringify(order.items, null, 2)
            );

            return res.status(400).json({
                message:
                    "An item has an invalid price. Please review your cart."
            });
        }

        // Calculate the total from trusted prices.
        const calculatedTotal = order.items.reduce((sum, item) => {
            const trustedPrice = getTrustedPrice(item);
            return sum + trustedPrice * Number(item.quantity);
        }, 0);

        console.log("SUBMITTED TOTAL:", order.total);
        console.log("CALCULATED TOTAL:", calculatedTotal);

        // Check that the submitted total matches.
        if (
            !Number.isFinite(Number(order.total)) ||
            Number(order.total) !== calculatedTotal
        ) {
            return res.status(400).json({
                message:
                    "The order total is incorrect. Please review your cart."
            });
        }

    
// Check Brevo settings without blocking order checkout.
if (
    !process.env.BREVO_API_KEY ||
    !process.env.BREVO_FROM_EMAIL ||
    !process.env.BAKERY_EMAIL
) {
    console.error("Brevo email settings are incomplete.");
}
        // Load saved orders and prevent duplicate order numbers.
const savedOrders = await loadOrdersFromDatabase();
        const existingOrder = savedOrders.find(
            saved => saved.orderNumber === order.orderNumber
        );

        if (existingOrder) {
            return res.status(409).json({
                message: "This order number has already been submitted."
            });
        }

        
        // Check inventory before accepting a new order.
        const inventory = loadInventory();

        // Match order product names to inventory product names.
        function findInventoryProduct(item) {
            const productName = String(
                item.name || item.productName || ""
            ).trim();

            const candidates = [productName];

            if (/cake/i.test(productName)) {
                candidates.push("Cake");
            }

            if (/pizza/i.test(productName)) {
                candidates.push("Pizza");
            }

            if (/shawarma|sharwama/i.test(productName)) {
                candidates.push("Shawarma", "Sharwama");
            }

            if (/doughnuts?/i.test(productName)) {
                candidates.push("Doughnuts", "Glazed Doughnuts");
            }

            return inventory.find(stock =>
                candidates.some(candidate =>
                    String(stock.name || "").toLowerCase() ===
                    candidate.toLowerCase()
                )
            );
        }

        // Count stock promised to orders that haven't had
        // inventory deducted yet.
        const reservedStock = new Map();

        for (const existing of savedOrders) {
   if (
    existing.inventoryDeducted === true ||
    existing.status === "Cancelled" ||
    existing.status === "Delivered"
) {
    continue;
}
console.log("CHECKING RESERVED ORDER:", {
    orderNumber: existing.orderNumber,
    status: existing.status,
    inventoryDeducted: existing.inventoryDeducted
});
            for (const item of existing.items || []) {
                  console.log("RESERVED PRODUCT:", {
    product: item.name || item.productName,
    quantity: item.quantity
});
                const stock = findInventoryProduct(item);
                const quantity = Number(item.quantity);

                if (
                    stock &&
                    Number.isSafeInteger(quantity) &&
                    quantity > 0
                ) {
                    reservedStock.set(
                        stock.id,
                        (reservedStock.get(stock.id) || 0) + quantity
                    );
                }
            }
          
        }

        // Combine duplicate products in the new order.
        const requestedStock = new Map();

        for (const item of order.items) {
            const stock = findInventoryProduct(item);
            const quantity = Number(item.quantity);
            const productName = String(
                item.name || item.productName || "Unknown product"
            );

            if (!stock) {
                return res.status(400).json({
                    message:
                        `No inventory record found for "${productName}". ` +
                        "Please contact the bakery."
                });
            }

            if (
                !Number.isSafeInteger(Number(stock.quantity)) ||
                Number(stock.quantity) < 0
            ) {
                return res.status(500).json({
                    message:
                        `The inventory quantity for "${stock.name}" is invalid.`
                });
            }

            const previous = requestedStock.get(stock.id);

            requestedStock.set(stock.id, {
                item: stock,
                quantity: (previous ? previous.quantity : 0) + quantity
            });
        }

        // Reject orders that exceed available, unreserved stock.
        for (const request of requestedStock.values()) {
            const stock = request.item;
            const reserved = reservedStock.get(stock.id) || 0;
            const available = Number(stock.quantity) - reserved;
            console.log("INVENTORY CHECK:", {
    product: stock.name,
    actualStock: stock.quantity,
    reservedStock: reserved,
    requested: request.quantity,
    availableStock: available
});
            if (request.quantity > available) {
                return res.status(409).json({
                    success: false,
                    message:
                        `Sorry, only ${Math.max(0, available)} ` +
                        `${stock.name} available. ` +
                        `You requested ${request.quantity}. ` +
                        "Please update your cart and try again."
                });
            }
        }

        console.log("Inventory stock check passed.");

        // Save the validated order.
       

const savedOrder = {
    ...order,
    email: customer.email,
    customerId: customer.id,
    status: "Order Received",
    paymentMethod: order.paymentMethod,
    paymentStatus: "Payment Pending",
    createdAt: new Date().toISOString()
};


       await saveOrderToDatabase(savedOrder);
        
console.log("ORDER VALIDATED AND SAVED");

        // Send the bakery email through Brevo.
        let emailSent = false;

        try {
            if (
                !process.env.BREVO_API_KEY ||
                !process.env.BREVO_FROM_EMAIL ||
                !process.env.BAKERY_EMAIL
            ) {
                throw new Error("Brevo email settings are incomplete.");
            }

            const itemDetails = order.items.map(item => {
                const quantity = Number(item.quantity);
                const price = getTrustedPrice(item);
                const customization = item.customization || {};

                const details = Object.entries(customization)
                    .filter(([key, value]) =>
                        value !== "" &&
                        value !== null &&
                        value !== undefined
                    )
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(", ");

                return [
                    `${item.name || item.productName}`,
                    `Qty: ${quantity}`,
                    `Price: ₦${(
                        price * quantity
                    ).toLocaleString("en-NG")}`,
                    details ? `Customization: ${details}` : ""
                ].filter(Boolean).join(" | ");
            }).join("\n");

            const emailResponse = await fetch(
                "https://api.brevo.com/v3/smtp/email",
                {
                    method: "POST",
                    headers: {
                        "accept": "application/json",
                        "api-key": process.env.BREVO_API_KEY,
                        "content-type": "application/json"
                    },
                    body: JSON.stringify({
                        sender: {
                            name: "Zobac Bakery",
                            email: process.env.BREVO_FROM_EMAIL
                        },
                        to: [
                            {
                                email: process.env.BAKERY_EMAIL
                            }
                        ],
                        subject: `New Zobac Bakery Order - ${order.orderNumber}`,
                        textContent: `
NEW ZOBAC BAKERY ORDER

Order number: ${order.orderNumber}

Customer: ${order.name}
Customer email: ${customer.email}
Phone: ${order.phone}
Delivery address: ${order.address}

Delivery date: ${order.deliveryDate || "Not specified"}

Payment method: ${savedOrder.paymentMethod}
Payment status: ${savedOrder.paymentStatus}

Items:

${itemDetails}

Verified order total: ₦${calculatedTotal.toLocaleString("en-NG")}

Please verify payment before dispatch.
                        `
                    })
                }
            );

            if (!emailResponse.ok) {
                const errorDetails = await emailResponse.text();
                throw new Error(
                    `Brevo API error (${emailResponse.status}): ${errorDetails}`
                );
            }

            emailSent = true;
            console.log("BAKERY EMAIL SENT SUCCESSFULLY");

       
} catch (emailError) {
    console.error("BAKERY EMAIL FAILED:", emailError.message);
    console.error("EMAIL ERROR NAME:", emailError.name);
    console.error("EMAIL ERROR CODE:", emailError.cause?.code || "Not provided");
}

        // The order is saved even if email sending fails.
        return res.status(201).json({
            success: true,
            message: emailSent
                ? "Order placed successfully. Bakery notification sent."
                : "Order placed successfully. Email notification could not be sent.",
            orderNumber: savedOrder.orderNumber,
            status: savedOrder.status,
            paymentMethod: savedOrder.paymentMethod,
            paymentStatus: savedOrder.paymentStatus,
            emailSent: emailSent
        });


   
    }catch (error) {
        console.error("ORDER OR EMAIL ERROR:", error);

        // The order may already be saved if Gmail failed.
        return res.status(500).json({
            message:
                "The order may be saved, but the bakery email could not be sent. Please contact the bakery to confirm.",
            emailSent: false
        });
    }
});
    
// Return orders belonging only to the logged-in customer.
app.get("/api/customer/orders", async (req, res) => {
    


    if (
        req.session?.customerAuthenticated !== true ||
        !req.session.customerId
    ) {
        return res.status(401).json({
            success: false,
            message: "Please log in to view your orders."
        });
    }

    try {
        const customer = await getCustomerById(
    req.session.customerId
);

        if (!customer) {
            return res.status(401).json({
                success: false,
                message: "Customer account not found. Please log in again."
            });
        }

        const customerEmail = customer.email.toLowerCase();

const customerOrders = (await loadOrdersFromDatabase()).filter(            order =>
                typeof order.email === "string" &&
                order.email.trim().toLowerCase() === customerEmail
        );

        return res.json(customerOrders);

    } catch (error) {
        console.error("Could not retrieve customer orders:", error.message);

        return res.status(500).json({
            success: false,
            message: "Could not retrieve your orders."
        });
    }
});

app.get("/api/admin/brevo-check", async (req, res) => {
    if (req.session?.adminAuthenticated !== true) {
        return res.status(401).json({
            success: false,
            message: "Admin login required."
        });
    }

    try {
        const response = await fetch("https://api.brevo.com/v3/smtp/email", {
            method: "POST",
            headers: {
                accept: "application/json",
                "api-key": process.env.BREVO_API_KEY,
                "content-type": "application/json"
            },
            body: JSON.stringify({
                sender: {
                    name: "Zobac Bakery",
                    email: process.env.BREVO_FROM_EMAIL
                },
                to: [
                    { email: process.env.BAKERY_EMAIL }
                ],
                subject: "Zobac Bakery - Test Email",
                textContent: "This is a test email from Zobac Bakery. Your bakery email notification connection is working."
            }),
            signal: AbortSignal.timeout(15000)
        });

        const result = await response.text();

        if (!response.ok) {
            console.error("BREVO TEST EMAIL FAILED:", response.status, result);

            return res.status(response.status).json({
                success: false,
                message: "Brevo could not send the test email.",
                details: result
            });
        }

        console.log("BREVO TEST EMAIL ACCEPTED:", result);

        return res.json({
            success: true,
            message: "Brevo accepted the test email. Check the bakery inbox."
        });

    } catch (error) {
        console.error("BREVO TEST EMAIL ERROR:", error.message);

        return res.status(500).json({
            success: false,
            message: error.message
        });
    }
});
    
// Admin: send an order receipt to the customer through Brevo.
app.post(
    "/api/admin/orders/:orderNumber/send-receipt",
    requireAdmin,
    async (req, res) => {
        try {
            const orderNumber = String(
                req.params.orderNumber || ""
            ).trim();

            if (!orderNumber) {
                return res.status(400).json({
                    success: false,
                    message: "Order number is required."
                });
            }

            if (
                !process.env.BREVO_API_KEY ||
                !process.env.BREVO_FROM_EMAIL
            ) {
                return res.status(500).json({
                    success: false,
                    message: "Brevo email settings are incomplete."
                });
            }

            // Retrieve the actual saved order.
            const orders = await loadOrdersFromDatabase();

            const order = orders.find(
                item => item.orderNumber === orderNumber
            );

            if (!order) {
                return res.status(404).json({
                    success: false,
                    message: "Order not found."
                });
            }

            // Use the email saved with the customer's order.
            const customerEmail = String(
                order.email || ""
            ).trim();

            if (
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerEmail)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "This order has no valid customer email address."
                });
            }

            const formatMoney = amount =>
                `₦${Number(amount || 0).toLocaleString("en-NG")}`;

            // Prevent customer/order information from breaking HTML.
            const escapeHtml = value =>
                String(value ?? "").replace(
                    /[&<>"']/g,
                    character => ({
                        "&": "&amp;",
                        "<": "&lt;",
                        ">": "&gt;",
                        '"': "&quot;",
                        "'": "&#39;"
                    })[character]
                );

            const items = Array.isArray(order.items)
                ? order.items
                : [];

            const itemRows = items.map(item => {
                const name = item.name || item.productName || "Product";
                const quantity = Number(item.quantity) || 0;
                const price = Number(item.price) || 0;
                const customization = item.customization || {};

                const customizationText = Object.entries(customization)
                    .filter(([, value]) =>
                        value !== "" &&
                        value !== null &&
                        value !== undefined
                    )
                    .map(([key, value]) => `${key}: ${value}`)
                    .join(", ");

                return `
                    <tr>
                        <td style="padding:10px;border-bottom:1px solid #eee;">
                            ${escapeHtml(name)}
                            ${
                                customizationText
                                    ? `<br><small>${escapeHtml(customizationText)}</small>`
                                    : ""
                            }
                        </td>
                        <td style="padding:10px;border-bottom:1px solid #eee;text-align:center;">
                            ${quantity}
                        </td>
                        <td style="padding:10px;border-bottom:1px solid #eee;text-align:right;">
                            ${formatMoney(price * quantity)}
                        </td>
                    </tr>
                `;
            }).join("");

            const total = Number(order.total) || items.reduce(
                (sum, item) =>
                    sum +
                    (Number(item.price) || 0) *
                    (Number(item.quantity) || 0),
                0
            );

            const receiptHtml = `
                <div style="font-family:Arial,sans-serif;max-width:650px;margin:auto;color:#333;">
                    <div style="background:#4b2e24;color:white;text-align:center;padding:25px;">
                        <h1 style="margin:0;">Zobac Bakery</h1>
                        <p style="margin:8px 0;">Start Your Day With Joy</p>
                        <h2 style="margin-bottom:0;">Order Receipt</h2>
                    </div>

                    <div style="padding:20px;">
                        <h3>Thank you for ordering with us!</h3>

                        <p>
                            <strong>Order Number:</strong>
                            ${escapeHtml(order.orderNumber)}
                        </p>

                        <p>
                            <strong>Customer:</strong>
                            ${escapeHtml(order.name)}
                        </p>

                        <p>
                            <strong>Phone:</strong>
                            ${escapeHtml(order.phone)}
                        </p>

                        <p>
                            <strong>Delivery Address:</strong>
                            ${escapeHtml(order.address)}
                        </p>

                        <p>
                            <strong>Delivery Date:</strong>
                            ${escapeHtml(order.deliveryDate || "Not specified")}
                        </p>

                        <h3>Order Items</h3>

                        <table style="width:100%;border-collapse:collapse;">
                            <thead>
                                <tr style="background:#f5efff;">
                                    <th style="padding:10px;text-align:left;">Item</th>
                                    <th style="padding:10px;">Qty</th>
                                    <th style="padding:10px;text-align:right;">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemRows}
                            </tbody>
                        </table>

                        <h3 style="text-align:right;">
                            Total: ${formatMoney(total)}
                        </h3>

                        <p>
                            <strong>Payment Method:</strong>
                            ${escapeHtml(order.paymentMethod)}
                        </p>

                        <p>
                            <strong>Payment Status:</strong>
                            ${escapeHtml(order.paymentStatus)}
                        </p>

                        <p>
                            <strong>Order Status:</strong>
                            ${escapeHtml(order.status)}
                        </p>

                        <hr>

                        <p style="text-align:center;color:#702bd1;">
                            Thank you for choosing Zobac Bakery!
                        </p>
                    </div>
                </div>
            `;

            const emailResponse = await fetch(
                "https://api.brevo.com/v3/smtp/email",
                {
                    method: "POST",
                    headers: {
                        "accept": "application/json",
                        "api-key": process.env.BREVO_API_KEY,
                        "content-type": "application/json"
                    },
                    body: JSON.stringify({
                        sender: {
                            name: "Zobac Bakery",
                            email: process.env.BREVO_FROM_EMAIL
                        },
                        to: [
                            {
                                email: customerEmail,
                                name: order.name || "Customer"
                            }
                        ],
                        subject: `Your Zobac Bakery Receipt - ${order.orderNumber}`,
                        htmlContent: receiptHtml
                    }),
                    signal: AbortSignal.timeout(15000)
                }
            );

            if (!emailResponse.ok) {
                const errorDetails = await emailResponse.text();

                console.error(
                    "RECEIPT EMAIL FAILED:",
                    emailResponse.status,
                    errorDetails
                );

                return res.status(502).json({
                    success: false,
                    message: "Brevo could not send the receipt. Please try again."
                });
            }

            console.log(
                `RECEIPT SENT: ${order.orderNumber} to ${customerEmail}`
            );

            return res.json({
                success: true,
                message: `Receipt sent successfully to ${customerEmail}.`
            });

        } catch (error) {
            console.error("SEND RECEIPT ERROR:", error.message);

            return res.status(500).json({
                success: false,
                message: "Could not send the receipt. Please try again."
            });
        }
    }
);


// Retrieve saved orders.
app.get("/api/orders", requireAdmin, async (req, res) => {
         try {
const savedOrders = await loadOrdersFromDatabase();        res.json(savedOrders);
    } catch (error) {
        console.error("Could not retrieve orders:", error.message);

        res.status(500).json({
            message: "Could not retrieve orders."
        });
    }
});



 // Update an order's status and manage inventory.
app.patch("/api/orders/:orderNumber", requireAdmin, async (req, res) => {
    try {
        const { status, paymentStatus } = req.body;
const allowedStatuses = [
    "Order Received",
    "Preparing",
    "Out for Delivery",
    "Delivered",
    "Cancelled"
];
        const allowedPaymentStatuses = [
            "Payment Pending",
            "Payment Confirmed"
        ];

        // Validate the order status.
        if (
            status !== undefined &&
            !allowedStatuses.includes(status)
        ) {
            return res.status(400).json({
                message: "Invalid order status."
            });
        }

        // Validate the payment status.
        if (
            paymentStatus !== undefined &&
            !allowedPaymentStatuses.includes(paymentStatus)
        ) {
            return res.status(400).json({
                message: "Invalid payment status."
            });
        }

        if (
            status === undefined &&
            paymentStatus === undefined
        ) {
            return res.status(400).json({
                message: "No update provided."
            });
        }

const savedOrders = await loadOrdersFromDatabase();
        const orderIndex = savedOrders.findIndex(
            order =>
                order.orderNumber === req.params.orderNumber
        );

        if (orderIndex === -1) {
            return res.status(404).json({
                message: "Order not found."
            });
        }

        const order = savedOrders[orderIndex];

        // Deduct stock only when an order first moves to Preparing.
        const shouldDeductStock =
            status === "Preparing" &&
            order.status !== "Preparing" &&
            order.inventoryDeducted !== true;

        if (shouldDeductStock) {
            const inventory = loadInventory();
            const deductions = new Map();

            if (!Array.isArray(order.items) || order.items.length === 0) {
                return res.status(400).json({
                    message: "This order has no valid items to deduct."
                });
            }

            // Match order product names to inventory names.
            for (const item of order.items) {
                const productName = String(
                    item.name || item.productName || ""
                ).trim();

                const quantity = Number(item.quantity);

                if (
                    !productName ||
                    !Number.isSafeInteger(quantity) ||
                    quantity < 1
                ) {
                    return res.status(400).json({
                        message: "This order contains an invalid product or quantity."
                    });
                }

                // Support common custom-product names.
                const candidateNames = [productName];

                if (/custom birthday cake/i.test(productName)) {
                    candidateNames.push("Cake");
                }

                if (/pizza/i.test(productName)) {
                    candidateNames.push("Pizza");
                }

                if (/shawarma|sharwama/i.test(productName)) {
                    candidateNames.push("Sharwama", "Shawarma");
                }

                if (/doughnuts?/i.test(productName)) {
                    candidateNames.push("Doughnuts", "Glazed Doughnuts");
                }

                const inventoryItem = inventory.find(stock =>
                    candidateNames.some(candidate =>
                        String(stock.name || "").toLowerCase() ===
                        candidate.toLowerCase()
                    )
                );

                // Never silently skip a product that isn't tracked.
                if (!inventoryItem) {
                    return res.status(400).json({
                        message:
                            `No inventory record found for "${productName}". ` +
                            "Add this product to inventory before preparing the order."
                    });
                }

                // Combine repeated products in the same order.
                const existing = deductions.get(inventoryItem.id);

                const totalQuantity =
                    (existing ? existing.quantity : 0) + quantity;

                if (!Number.isSafeInteger(totalQuantity)) {
                    return res.status(400).json({
                        message: "The requested product quantity is too large."
                    });
                }

                deductions.set(inventoryItem.id, {
                    item: inventoryItem,
                    quantity: totalQuantity
                });
            }

            // Check every product before changing any stock.
            for (const deduction of deductions.values()) {
                if (
                    !Number.isSafeInteger(deduction.item.quantity) ||
                    deduction.item.quantity < deduction.quantity
                ) {
                    return res.status(409).json({
                        message:
                            `Not enough stock for "${deduction.item.name}". ` +
                            `Available: ${deduction.item.quantity}. ` +
                            `Required: ${deduction.quantity}.`
                    });
                }
            }

            // All checks passed. Deduct the required quantities.
            for (const deduction of deductions.values()) {
                deduction.item.quantity -= deduction.quantity;
                deduction.item.updatedAt = new Date().toISOString();
            }

            saveInventory(inventory);

            // Record the deduction to prevent deducting this order twice.
            order.inventoryDeducted = true;
            order.inventoryDeductedAt = new Date().toISOString();
        }

        // Update the requested order fields.
        if (status !== undefined) {
            order.status = status;
        }

        if (paymentStatus !== undefined) {
            order.paymentStatus = paymentStatus;
        }

await updateOrderInDatabase(order);

        return res.json({
            message: shouldDeductStock
                ? "Order updated and inventory deducted successfully."
                : "Order updated successfully.",
            order
        });

    } catch (error) {
        console.error(
            "Could not update order:",
            error.message
        );

        return res.status(500).json({
            message: "Could not update order."
        });
    }
});


    
 // =====================================
// ADMIN INVENTORY API
// =====================================

// Get all inventory items
app.get("/api/admin/inventory", requireAdmin, (req, res) => {
    try {
        const inventory = loadInventory();
        res.json(inventory);
    } catch (error) {
        console.error("Error loading inventory:", error.message);
        res.status(500).json({
            message: "Could not load inventory."
        });
    }
});

// Add a new inventory item
app.post("/api/admin/inventory", requireAdmin, (req, res) => {
    try {
        const { name, quantity, lowStockThreshold, category } = req.body;

        // Check product name
        if (typeof name !== "string" || !name.trim()) {
            return res.status(400).json({
                message: "Product name is required."
            });
        }

        // Check stock quantity
        if (!Number.isInteger(quantity) || quantity < 0) {
            return res.status(400).json({
                message: "Quantity must be a whole number of 0 or more."
            });
        }

        // Set the default low-stock warning level to 5
        const threshold = lowStockThreshold === undefined
            ? 5
            : lowStockThreshold;

        if (!Number.isInteger(threshold) || threshold < 0) {
            return res.status(400).json({
                message: "Low-stock threshold must be a whole number of 0 or more."
            });
        }

        const inventory = loadInventory();

        // Prevent duplicate product names
        const duplicate = inventory.some(item =>
            item.name.toLowerCase() === name.trim().toLowerCase()
        );

        if (duplicate) {
            return res.status(409).json({
                message: "This product already exists in inventory."
            });
        }

        // Create the inventory item
        const newItem = {
            id: Date.now().toString(36) +
                Math.random().toString(36).slice(2, 8),
            name: name.trim(),
            category: typeof category === "string"
                ? category.trim()
                : "Other",
            quantity,
            lowStockThreshold: threshold,
            updatedAt: new Date().toISOString()
        };

        inventory.push(newItem);
        saveInventory(inventory);

        res.status(201).json({
            message: "Inventory item added successfully.",
            item: newItem
        });

    } catch (error) {
        console.error("Error adding inventory item:", error.message);
        res.status(500).json({
            message: "Could not add inventory item."
        });
    }
});

 // Restock an existing inventory item
app.patch(
    "/api/admin/inventory/:id/restock",
    requireAdmin,
    (req, res) => {
        try {
            const amount = req.body.amount;

            // Only allow positive whole numbers
            if (!Number.isSafeInteger(amount) || amount <= 0) {
                return res.status(400).json({
                    message: "Restock amount must be a whole number greater than zero."
                });
            }

            const inventory = loadInventory();

            const item = inventory.find(
                product => product.id === req.params.id
            );

            if (!item) {
                return res.status(404).json({
                    message: "Inventory item not found."
                });
            }

            // Prevent quantities from exceeding safe integer limits
            if (!Number.isSafeInteger(item.quantity + amount)) {
                return res.status(400).json({
                    message: "The resulting stock quantity is too large."
                });
            }

            // Add the new stock
            item.quantity += amount;
            item.updatedAt = new Date().toISOString();

            saveInventory(inventory);

            res.json({
                message: `${item.name} restocked successfully. New stock: ${item.quantity}.`,
                item
            });

        } catch (error) {
            console.error("Restocking error:", error.message);

            res.status(500).json({
                message: "Could not restock this product."
            });
        }
    }
);
// Edit an existing inventory item
app.patch("/api/admin/inventory/:id", requireAdmin, (req, res) => {
    try {
        const { name, category, quantity, lowStockThreshold } = req.body;

        if (typeof name !== "string" || !name.trim()) {
            return res.status(400).json({
                message: "Product name is required."
            });
        }

        if (!Number.isSafeInteger(quantity) || quantity < 0) {
            return res.status(400).json({
                message: "Quantity must be a whole number of 0 or more."
            });
        }

        if (
            !Number.isSafeInteger(lowStockThreshold) ||
            lowStockThreshold < 0
        ) {
            return res.status(400).json({
                message: "Low-stock threshold must be a whole number of 0 or more."
            });
        }

        const inventory = loadInventory();

        const item = inventory.find(
            product => product.id === req.params.id
        );

        if (!item) {
            return res.status(404).json({
                message: "Inventory item not found."
            });
        }

        const duplicate = inventory.some(product =>
            product.id !== item.id &&
            product.name.toLowerCase() === name.trim().toLowerCase()
        );

        if (duplicate) {
            return res.status(409).json({
                message: "Another inventory item already uses this name."
            });
        }

        item.name = name.trim();
        item.category = typeof category === "string" && category.trim()
            ? category.trim()
            : "Other";
        item.quantity = quantity;
        item.lowStockThreshold = lowStockThreshold;
        item.updatedAt = new Date().toISOString();

        saveInventory(inventory);

        return res.json({
            message: "Inventory item updated successfully.",
            item
        });

    } catch (error) {
        console.error("Error updating inventory item:", error.message);

        return res.status(500).json({
            message: "Could not update inventory item."
        });
    }
});


// Delete an inventory item
app.delete("/api/admin/inventory/:id", requireAdmin, (req, res) => {
    try {
        const inventory = loadInventory();

        const itemIndex = inventory.findIndex(
            product => product.id === req.params.id
        );

        if (itemIndex === -1) {
            return res.status(404).json({
                message: "Inventory item not found."
            });
        }

        const deletedItem = inventory[itemIndex];

        inventory.splice(itemIndex, 1);
        saveInventory(inventory);

        return res.json({
            message: `${deletedItem.name} deleted from inventory successfully.`
        });

    } catch (error) {
        console.error("Error deleting inventory item:", error.message);

        return res.status(500).json({
            message: "Could not delete inventory item."
        });
    }
});
/* ===== START SERVER AFTER DATABASE CHECK ===== */

async function startServer() {
    try {
        if (!process.env.DATABASE_URL) {
            throw new Error("DATABASE_URL is missing.");
        }

        await pool.query("SELECT 1");

        console.log("PostgreSQL database connection successful.");

        app.listen(PORT, () => {
            console.log(
                `Zobac Bakery backend running at http://localhost:${PORT}`
            );
        });
    } catch (error) {
        console.error("Could not start the backend:", error.message);
        process.exit(1);
    }
}

startServer();