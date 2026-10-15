
const express = require("express");
const nodemailer = require("nodemailer");
require("dotenv").config();
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const session = require("express-session");
const helmet = require("helmet");

const app = express();
const PORT = process.env.PORT || 3000;

const ORDERS_FILE = path.join(__dirname, "orders.json");
const CUSTOMERS_FILE = path.join(__dirname, "customers.json");
const REVIEWS_FILE = path.join(__dirname, "reviews.json");
const INVENTORY_FILE = path.join(__dirname, "inventory.json");
app.use(helmet());
console.log("SESSION_SECRET exists:", Boolean(process.env.SESSION_SECRET));
console.log("SESSION_SECRET length:", process.env.SESSION_SECRET?.length || 0);
app.use(session({
    name: "zobacAdminSession",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 30 * 60 * 1000
    }
}));






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

// Load registered customers.
function loadCustomers() {
    try {
        if (!fs.existsSync(CUSTOMERS_FILE)) {
            return [];
        }

        const data = fs.readFileSync(CUSTOMERS_FILE, "utf8");
        return JSON.parse(data);
    } catch (error) {
        console.error("Could not load customers:", error.message);
        throw error;
    }
}

// Save registered customers.
function saveCustomers(customers) {
    fs.writeFileSync(
        CUSTOMERS_FILE,
        JSON.stringify(customers, null, 2),
        "utf8"
    );
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
    "Meat Pie-No Sugar": 800,
    "Zobac Deluxe": 1500,
    "Banana Bread": 3000,
    "Chin Chin": 1000,
    "Cookies": 1000,

    "Pizza": {
        "Small": 18000,
        "Medium": 25000,
        "Large": 36000
    },

    "Sharwama": {
        "Regular": 2500,
        "Large": 4000
    },

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
app.get("/api/customer/session", (req, res) => {
    if (
        req.session?.customerAuthenticated !== true ||
        !req.session.customerId
    ) {
        return res.json({
            authenticated: false
        });
    }

    try {
        const customers = loadCustomers();

        const customer = customers.find(
            account => account.id === req.session.customerId
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
app.patch("/api/customer/profile", (req, res) => {
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

        const customers = loadCustomers();

        const customer = customers.find(
            account => account.id === req.session.customerId
        );

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: "Customer account not found."
            });
        }

        customer.name = cleanName;
        customer.phone = cleanPhone;

        saveCustomers(customers);

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

// Customer logout
app.post("/api/customer/logout", (req, res, next) => {
    req.session.destroy((error) => {
        if (error) {
            return next(error);
        }

        res.clearCookie("zobacAdminSession");

        return res.json({
            success: true,
            message: "Logged out successfully."
        });
    });
});
    
 // Check whether a customer is logged in
app.get("/api/customer/session", (req, res) => {
    if (
        req.session?.customerAuthenticated !== true ||
        !req.session.customerId
    ) {
        return res.json({
            authenticated: false
        });
    }

    try {
        const customers = loadCustomers();

        const customer = customers.find(
            account => account.id === req.session.customerId
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

// Customer logout
app.post("/api/customer/logout", (req, res, next) => {
    req.session.destroy((error) => {
        if (error) {
            return next(error);
        }

        res.clearCookie("zobacAdminSession");

        return res.json({
            success: true,
            message: "Logged out successfully."
        });
    });
});


// Customer registration
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



        const customers = loadCustomers();

        const existingCustomer = customers.find(
            customer => customer.email === cleanEmail
        );

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

        customers.push(customer);
        saveCustomers(customers);

        return res.status(201).json({
            success: true,
            message: "Registration successful. You can now log in."
        });

    } catch (error) {
        console.error("Customer registration failed:", error.message);

        return res.status(500).json({
            success: false,
            message: "Registration failed. Please try again."
        });
    }
});
// Customer login
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

        const customers = loadCustomers();

        const customer = customers.find(
            account => account.email === cleanEmail
        );

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
app.get("/api/customer/reviewable-orders", (req, res) => {
    if (
        !req.session ||
        req.session.customerAuthenticated !== true
    ) {
        return res.status(401).json({
            message: "Please log in to review an order."
        });
    }

    try {
        const customers = loadCustomers();
        const orders = loadOrders();
        const reviews = loadReviews();

        const customer = customers.find(
            item => item.id === req.session.customerId
        );

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

        res.json(customerOrders.map(order => ({
            orderNumber: order.orderNumber,
            items: order.items,
            createdAt: order.createdAt
        })));
    } catch (error) {
        console.error("Error finding reviewable orders:", error);
        res.status(500).json({
            message: "Could not load reviewable orders."
        });
    }
});


// Submit a review for a delivered order
app.post("/api/reviews", (req, res) => {
    if (
        !req.session ||
        req.session.customerAuthenticated !== true
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

        const customers = loadCustomers();
        const orders = loadOrders();
        const reviews = loadReviews();

        const customer = customers.find(
            item => item.id === req.session.customerId
        );

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

        res.status(201).json({
            success: true,
            message: "Review submitted successfully. It is awaiting approval."
        });
    } catch (error) {
        console.error("Error submitting review:", error);
        res.status(500).json({
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

// Admin login
app.post("/api/admin/login", (req, res, next) => {
    const { username, password } = req.body;

    if (
        !process.env.ADMIN_USERNAME ||
        !process.env.ADMIN_PASSWORD ||
        !process.env.SESSION_SECRET
    ) {
        return res.status(500).json({
            success: false,
            message: "Admin login is not configured."
        });
    }

    if (
        username !== process.env.ADMIN_USERNAME ||
        password !== process.env.ADMIN_PASSWORD
    ) {
        return res.status(401).json({
            success: false,
            message: "Incorrect username or password."
        });
    }

    // Create a fresh session after successful login
    req.session.regenerate((err) => {
        if (err) return next(err);

        req.session.adminAuthenticated = true;

        req.session.save((saveError) => {
            if (saveError) return next(saveError);

            res.json({
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

        res.clearCookie("zobacAdminSession", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax"
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

        // Get the customer's identity from the server session.
        const customers = loadCustomers();

        const customer = customers.find(
            account => account.id === req.session.customerId
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

        // Check that Gmail settings are available.
        if (
            !process.env.EMAIL_USER ||
            !process.env.EMAIL_PASS ||
            !process.env.BAKERY_EMAIL
        ) {
            console.error("Bakery email settings are missing.");

            return res.status(500).json({
                message: "Bakery email settings are not configured yet."
            });
        }

        // Load saved orders and prevent duplicate order numbers.
        const savedOrders = loadOrders();

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
            if (existing.inventoryDeducted === true) {
                continue;
            }

            for (const item of existing.items || []) {
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


        savedOrders.push(savedOrder);
        saveOrders(savedOrders);

        console.log("ORDER VALIDATED AND SAVED");
        console.log("ATTEMPTING TO SEND BAKERY EMAIL");

        // Create Gmail transporter.
        const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        // Prepare order items for the email.
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
                `Price: ₦${(price * quantity).toLocaleString("en-NG")}`,
                details ? `Customization: ${details}` : ""
            ].filter(Boolean).join(" | ");
        }).join("\n");

        // Send the order email.
        await transporter.sendMail({
            from: process.env.EMAIL_USER,
            to: process.env.BAKERY_EMAIL,
            subject: `New Zobac Bakery Order - ${order.orderNumber}`,
            text: `
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
        });

        console.log("BAKERY EMAIL SENT SUCCESSFULLY");

            return res.status(201).json({
            message: "Order details sent to the bakery email.",
            orderNumber: savedOrder.orderNumber,
            status: savedOrder.status,
            paymentMethod: savedOrder.paymentMethod,
            paymentStatus: savedOrder.paymentStatus,
            emailSent: true
        });

    } 
    catch (error) {
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
app.get("/api/customer/orders", (req, res) => {
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
        const customers = loadCustomers();

        const customer = customers.find(
            account => account.id === req.session.customerId
        );

        if (!customer) {
            return res.status(401).json({
                success: false,
                message: "Customer account not found. Please log in again."
            });
        }

        const customerEmail = customer.email.toLowerCase();

        const customerOrders = loadOrders().filter(
            order =>
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

// Retrieve saved orders.
app.get("/api/orders", requireAdmin, (req, res) => {
         try {
        const savedOrders = loadOrders();
        res.json(savedOrders);
    } catch (error) {
        console.error("Could not retrieve orders:", error.message);

        res.status(500).json({
            message: "Could not retrieve orders."
        });
    }
});



 // Update an order's status and manage inventory.
app.patch("/api/orders/:orderNumber", requireAdmin, (req, res) => {
    try {
        const { status, paymentStatus } = req.body;

        const allowedStatuses = [
            "Order Received",
            "Preparing",
            "Out for Delivery",
            "Delivered"
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

        const savedOrders = loadOrders();

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

        saveOrders(savedOrders);

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

// Start the backend.
app.listen(PORT, () => {
    console.log(
        `Zobac Bakery backend running at http://localhost:${PORT}`
    );
});
