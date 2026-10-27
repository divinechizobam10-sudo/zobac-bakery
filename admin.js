const API_BASE = "https://zobac-bakery-8kqp.onrender.com";

// Send admin requests to Render and include the login cookie.
function apiFetch(endpoint, options = {}) {
    return fetch(`${API_BASE}${endpoint}`, {
        ...options,
        credentials: "include",
        headers: {
            ...(options.headers || {})
        }
    });
}

const orderSearch = document.getElementById("orderSearch");
const clearOrderSearch = document.getElementById("clearOrderSearch");
const searchMessage = document.getElementById("searchMessage");
const refreshBtn = document.getElementById("refreshBtn");
const totalOrders = document.getElementById("totalOrders");
const pendingOrders = document.getElementById("pendingOrders");
const todaySales = document.getElementById("todaySales");
const monthlySales = document.getElementById("monthlySales");
const preparingOrders = document.getElementById("preparingOrders");
const deliveredOrders = document.getElementById("deliveredOrders");
const totalSales = document.getElementById("totalSales");
const pendingPayments = document.getElementById("pendingPayments");
const ordersMessage = document.getElementById("ordersMessage");
const ordersTable = document.getElementById("ordersTable");
// Connect the admin dashboard to the Render backend.


async function loadOrders() {
ordersMessage.textContent = "Loading orders...";

try {
    const response = await apiFetch("/api/orders");
    const orders = await response.json();

    if (!response.ok) {
        throw new Error(orders.message || "Could not load orders.");
    }

    totalOrders.textContent = orders.length;

    pendingOrders.textContent = orders.filter(
        order => order.status === "Order Received"
    ).length;

    preparingOrders.textContent = orders.filter(
        order => order.status === "Preparing"
    ).length;

    deliveredOrders.textContent = orders.filter(
        
        order => order.status === "Delivered"
    ).length;
    
    // Calculate sales from confirmed payments only
const confirmedSales = orders
    .filter(order => order.paymentStatus === "Payment Confirmed")
    .reduce((sum, order) => sum + Number(order.total || 0), 0);

// Calculate the value of orders with unconfirmed payments
const unpaidTotal = orders
    .filter(order => order.paymentStatus !== "Payment Confirmed")
    .reduce((sum, order) => sum + Number(order.total || 0), 0);

totalSales.textContent =
    `₦${confirmedSales.toLocaleString("en-NG")}`;

pendingPayments.textContent =
    `₦${unpaidTotal.toLocaleString("en-NG")}`;
    ordersTable.innerHTML = "";
    const searchTerm = orderSearch
    ? orderSearch.value.trim().toLowerCase()
    : "";
    
const now = new Date();

const todayRevenue = orders
    .filter(order => {
        if (order.paymentStatus !== "Payment Confirmed") {
            return false;
        }

        if (!order.createdAt) {
            return false;
        }

        const orderDate = new Date(order.createdAt);

        return !Number.isNaN(orderDate.getTime()) &&
            orderDate.getFullYear() === now.getFullYear() &&
            orderDate.getMonth() === now.getMonth() &&
            orderDate.getDate() === now.getDate();
    })
    .reduce((sum, order) => sum + Number(order.total || 0), 0);

const monthlyRevenue = orders
    .filter(order => {
        if (order.paymentStatus !== "Payment Confirmed") {
            return false;
        }

        if (!order.createdAt) {
            return false;
        }

        const orderDate = new Date(order.createdAt);

        return !Number.isNaN(orderDate.getTime()) &&
            orderDate.getFullYear() === now.getFullYear() &&
            orderDate.getMonth() === now.getMonth();
    })
    .reduce((sum, order) => sum + Number(order.total || 0), 0);

if (todaySales) {
    todaySales.textContent =
        `₦${todayRevenue.toLocaleString("en-NG")}`;
}

if (monthlySales) {
    monthlySales.textContent =
        `₦${monthlyRevenue.toLocaleString("en-NG")}`;
}

const weeklySalesChart = document.getElementById("weeklySalesChart");

if (weeklySalesChart) {
    const today = new Date();
    const days = [];

    for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);

        const dateKey = [
            date.getFullYear(),
            String(date.getMonth() + 1).padStart(2, "0"),
            String(date.getDate()).padStart(2, "0")
        ].join("-");

        const dayRevenue = orders
            .filter(order => {
                if (order.paymentStatus !== "Payment Confirmed") {
                    return false;
                }

                if (!order.createdAt) return false;

                const orderDate = new Date(order.createdAt);

                if (Number.isNaN(orderDate.getTime())) return false;

                const orderKey = [
                    orderDate.getFullYear(),
                    String(orderDate.getMonth() + 1).padStart(2, "0"),
                    String(orderDate.getDate()).padStart(2, "0")
                ].join("-");

                return orderKey === dateKey;
            })
            .reduce((sum, order) => sum + Number(order.total || 0), 0);

        days.push({
            name: date.toLocaleDateString("en-NG", {
                weekday: "short"
            }),
            amount: dayRevenue
        });
    }

    const maxRevenue = Math.max(...days.map(day => day.amount), 1);

    weeklySalesChart.innerHTML = days.map(day => {
        const height = day.amount > 0
            ? Math.max((day.amount / maxRevenue) * 100, 5)
            : 0;

        return `
            <div class="sales-day">
                <span class="sales-amount">
                    ₦${day.amount.toLocaleString("en-NG")}
                </span>
                <div class="sales-bar-area">
                    <div
                        class="sales-bar"
                        style="height: ${height}%"
                        title="₦${day.amount.toLocaleString("en-NG")}"
                    ></div>
                </div>
                <span class="sales-day-name">${day.name}</span>
            </div>
        `;
    }).join("");
}



const filteredOrders = orders.filter(order => {
    const orderNumber = String(order.orderNumber || "").toLowerCase();

    const matchesSearch = orderNumber.includes(searchTerm);

    const matchesStatus =
        !statusFilter ||
        !statusFilter.value ||
        order.status === statusFilter.value;

    const currentPaymentStatus =
        order.paymentStatus || "Payment Pending";

    const matchesPayment =
        !paymentFilter ||
        !paymentFilter.value ||
        currentPaymentStatus === paymentFilter.value ||
        (paymentFilter.value === "Pending" &&
            currentPaymentStatus === "Payment Pending");

    const matchesDate =
        !dateFilter ||
        !dateFilter.value ||
        order.deliveryDate === dateFilter.value;

    return (
        matchesSearch &&
        matchesStatus &&
        matchesPayment &&
        matchesDate
    );
});


if (searchMessage) {
    searchMessage.textContent = searchTerm
        ? `${filteredOrders.length} order(s) found`
        : "";
}
    if (orders.length === 0) {
        ordersMessage.textContent = "No orders yet.";
        return;
    }

    ordersMessage.textContent = "";

   filteredOrders.slice().reverse().forEach(order => {
        const row = document.createElement("tr");

        // Order number
        const orderCell = document.createElement("td");
        orderCell.textContent = order.orderNumber || "—";
        row.appendChild(orderCell);

        // Customer name
        const nameCell = document.createElement("td");
        nameCell.textContent = order.name || "—";
        row.appendChild(nameCell);

        // Customer phone
        const phoneCell = document.createElement("td");
        phoneCell.textContent = order.phone || "—";
        row.appendChild(phoneCell);

       // Delivery address
        const addressCell = document.createElement("td");
        addressCell.textContent = order.address || "Address not provided";
        row.appendChild(addressCell);
        

        // Products bought
        const productsCell = document.createElement("td");

        if (Array.isArray(order.items) && order.items.length > 0) {
            order.items.forEach(item => {
                const product = document.createElement("div");

                product.style.marginBottom = "10px";

                const productName = document.createElement("strong");
                productName.textContent =
                    `${item.name || "Product"} × ${Number(item.quantity) || 1}`;

                product.appendChild(productName);

                
        
                // Show custom cake, pizza or shawarma details
                if (item.customization) {
                    const details = document.createElement("div");

                    details.style.fontSize = "12px";
                    details.style.marginTop = "4px";

                    const customization = item.customization;

                    const detailTexts = [];

                    Object.entries(customization).forEach(([key, value]) => {
                        if (
                            value !== null &&
                            value !== undefined &&
                            value !== ""
                        ) {
                            const label = key
                                .replace(/([A-Z])/g, " $1")
                                .replace(/^./, letter => letter.toUpperCase());

                            const displayValue = Array.isArray(value)
                                ? value.join(", ")
                                : typeof value === "object"
                                    ? JSON.stringify(value)
                                    : String(value);

                            detailTexts.push(`${label}: ${displayValue}`);
                        }
                    });

                    details.textContent = detailTexts.join(" | ");

                    if (detailTexts.length > 0) {
                        product.appendChild(details);
                    }
                }

                productsCell.appendChild(product);
            });
        } else {
            productsCell.textContent = "Product details unavailable";
        }

        row.appendChild(productsCell);

        // Delivery date
        const dateCell = document.createElement("td");
        dateCell.textContent = order.deliveryDate || "—";
        row.appendChild(dateCell);
        
        // Payment method
        const paymentMethodCell = document.createElement("td");
        paymentMethodCell.textContent =
            order.paymentMethod || "Not recorded";
        row.appendChild(paymentMethodCell);

        // Payment status and confirmation button
        const paymentCell = document.createElement("td");

        const paymentLabel = document.createElement("p");
        paymentLabel.textContent =
            order.paymentStatus || "Payment Pending";

        paymentCell.appendChild(paymentLabel);

        if (
            (order.paymentStatus || "Payment Pending") !==
            "Payment Confirmed"
        ) {
            const confirmPaymentBtn =
                document.createElement("button");

            confirmPaymentBtn.textContent = "Confirm Payment";
            confirmPaymentBtn.style.background = "#198754";
            confirmPaymentBtn.style.color = "white";
            confirmPaymentBtn.style.border = "none";
            confirmPaymentBtn.style.padding = "8px";
            confirmPaymentBtn.style.borderRadius = "6px";
            confirmPaymentBtn.style.cursor = "pointer";

            confirmPaymentBtn.addEventListener("click", async () => {
                const confirmed = window.confirm(
                    "Have you verified that the money was received in the bakery's bank account?"
                );

                if (!confirmed) return;

                confirmPaymentBtn.disabled = true;
                confirmPaymentBtn.textContent = "Saving...";

                try {
                    const response = await apiFetch(
                        `/api/orders/${encodeURIComponent(order.orderNumber)}`,
                        {
                            method: "PATCH",
                            headers: {
                                "Content-Type": "application/json"
                            },
                            body: JSON.stringify({
                                paymentStatus: "Payment Confirmed"
                            })
                        }
                    );

                    const result = await response.json();

                    if (!response.ok) {
                        throw new Error(
                            result.message || "Could not confirm payment."
                        );
                    }

                  
order.paymentStatus = "Payment Confirmed";

ordersMessage.textContent =
    "Payment confirmed and saved successfully!";

// Reload orders and refresh the sales figures
await loadOrders();

ordersMessage.textContent =
    "Payment confirmed and saved successfully!";

                } catch (error) {
                    ordersMessage.textContent = error.message;
                    confirmPaymentBtn.disabled = false;
                    confirmPaymentBtn.textContent = "Confirm Payment";
                }
            });

            paymentCell.appendChild(confirmPaymentBtn);
        }

        row.appendChild(paymentCell);

        // Order status dropdown
        const statusCell = document.createElement("td");
        const statusSelect = document.createElement("select");

        [
            "Order Received",
            "Preparing",
            "Out for Delivery",
            "Delivered"
        ].forEach(status => {
            const option = document.createElement("option");
            option.value = status;
            option.textContent = status;
            statusSelect.appendChild(option);
        });

        statusSelect.value = order.status || "Order Received";
        statusCell.appendChild(statusSelect);
        row.appendChild(statusCell);

        // Order total
        const totalCell = document.createElement("td");

        totalCell.textContent =
            `₦${Number(order.total || 0).toLocaleString("en-NG")}`;

        row.appendChild(totalCell);

        // Update status button
        const actionCell = document.createElement("td");
        actionCell.classList.add("action-buttons");
        const saveBtn = document.createElement("button");

        saveBtn.textContent = "Update Status" ;

        saveBtn.addEventListener("click", async () => {
            saveBtn.disabled = true;
            saveBtn.textContent = "Saving...";

            try {
                const response = await apiFetch(
                     `/api/orders/${encodeURIComponent(order.orderNumber)}`,
                    {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            status: statusSelect.value
                        })
                    }
                );

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(
                        result.message || "Update failed."
                    );
                }

                order.status = statusSelect.value;
                ordersMessage.textContent =
                    "Order status updated successfully!";
            } catch (error) {
                ordersMessage.textContent = error.message;
            } finally {
                saveBtn.disabled = false;
                saveBtn.textContent = "Update Status";
            }
        });

        actionCell.appendChild(saveBtn);
        row.appendChild(actionCell);
        
        // WhatsApp response button
        const whatsappBtn = document.createElement("button");
        whatsappBtn.textContent = "Reply on WhatsApp";
        whatsappBtn.style.background = "#25D366";
        whatsappBtn.style.color = "white";
        whatsappBtn.style.border = "none";
        whatsappBtn.style.padding = "8px";
        whatsappBtn.style.borderRadius = "6px";
        whatsappBtn.style.cursor = "pointer";
        whatsappBtn.style.marginTop = "6px";

        whatsappBtn.addEventListener("click", () => {
            let phone = String(order.phone || "").replace(/\D/g, "");

            // Convert Nigerian numbers to international format.
            if (phone.startsWith("0")) {
                phone = "234" + phone.slice(1);
            }

            if (!phone || phone.length < 10) {
                alert("This customer's phone number is missing or invalid.");
                return;
            }

            const message =
                `Hello ${order.name || "Customer"}! 👋\n\n` +
                `Thank you for choosing Zobac Bakery! 💜🧡\n` +
                `We have received your order ${order.orderNumber || ""}.\n\n` +
                `We will keep you updated on your order.\n` +
                `Start your day with joy!`;

            const whatsappURL =
                `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

            window.open(whatsappURL, "_blank");
        });

        actionCell.appendChild(whatsappBtn);
        

const viewDetailsBtn = document.createElement("button");
viewDetailsBtn.textContent = "View Details";
viewDetailsBtn.style.background = "#702BD1";
viewDetailsBtn.style.color = "white";
viewDetailsBtn.style.border = "none";
viewDetailsBtn.style.padding = "8px";
viewDetailsBtn.style.borderRadius = "6px";
viewDetailsBtn.style.cursor = "pointer";
viewDetailsBtn.style.marginTop = "6px";

viewDetailsBtn.addEventListener("click", () => {
    const receiptModal = document.getElementById("receiptModal");
    const receiptDetails = document.getElementById("receiptDetails");

    if (!receiptModal || !receiptDetails) {
        alert("Receipt popup elements were not found. Check admin.html.");
        return;
    }

    let productsHTML = "";

    (order.items || []).forEach((item, index) => {
        productsHTML += `
            <div class="receipt-product">
                <strong>
                    ${index + 1}. ${item.name || "Product"}
                </strong>

                <p>Quantity: ${Number(item.quantity) || 1}</p>

                <p>Price: ₦${Number(item.price || 0).toLocaleString("en-NG")}</p>

                ${
                    item.customization
                        ? `<p>Customization: ${
                            JSON.stringify(item.customization)
                        }</p>`
                        : ""
                }
            </div>
        `;
    });

    receiptDetails.innerHTML = `
        <div style="text-align:center; padding:0 0 12px;">
            <img
                src="logo.jpg"
                alt="Zobac Bakery Logo"
                style="
                    width:100px;
                    height:100px;
                    object-fit:contain;
                    display:block;
                    margin:0 auto 10px;
                "
            >
        </div>

        <h2 style="text-align:center; color:#702BD1;">
            Zobac Bakery
        </h2>

        <p style="text-align:center; font-weight:bold;">
            Start Your Day With Joy
        </p>

        <p style="text-align:center;">Order Receipt</p>

        <hr>

        <h3>Customer Details</h3>

        <p><strong>Order Number:</strong> ${order.orderNumber || "—"}</p>
        <p><strong>Customer:</strong> ${order.name || "—"}</p>
        <p><strong>Phone:</strong> ${order.phone || "—"}</p>
        <p><strong>Delivery Address:</strong> ${order.address || "—"}</p>
        <p><strong>Delivery Date:</strong> ${order.deliveryDate || "—"}</p>

        <hr>

        <h3>Payment Details</h3>

        <p><strong>Payment Method:</strong> ${order.paymentMethod || "—"}</p>
        <p><strong>Payment Status:</strong> ${order.paymentStatus || "Payment Pending"}</p>
        <p><strong>Order Status:</strong> ${order.status || "Order Received"}</p>

        <hr>

        <h3>Products Ordered</h3>

        ${productsHTML || "<p>No product details available.</p>"}

        <h3 style="
            text-align:right;
            color:#702BD1;
            padding:15px;
            border-radius:10px;
            margin-top:20px;
        ">
            Total: ₦${Number(order.total || 0).toLocaleString("en-NG")}
        </h3>

        <hr>

        <p style="text-align:center; font-weight:bold;">
            Thank you for choosing Zobac Bakery!
        </p>

        <p style="text-align:center; font-size:12px;">
            Start Your Day With Joy 💜🧡
        </p>
    `;

    // OPEN THE RECEIPT POPUP
    receiptModal.style.display = "flex";
});

actionCell.appendChild(viewDetailsBtn);


        ordersTable.appendChild(row);
    });
} catch (error) {
    ordersMessage.textContent =
        "Could not load orders. Check that the backend is running.";

    console.error(error);
}


}

if (refreshBtn) {
    refreshBtn.addEventListener("click", loadOrders);
}
if (orderSearch) {
    orderSearch.addEventListener("input", loadOrders);
}

if (clearOrderSearch) {
    clearOrderSearch.addEventListener("click", () => {
        orderSearch.value = "";
        loadOrders();
        orderSearch.focus();
    });
}


/* ===== ORDER FILTERS ===== */

const statusFilter = document.getElementById("statusFilter");
const paymentFilter = document.getElementById("paymentFilter");
const dateFilter = document.getElementById("dateFilter");
const clearFilters = document.getElementById("clearFilters");

if (statusFilter) {
    statusFilter.addEventListener("change", loadOrders);
}

if (paymentFilter) {
    paymentFilter.addEventListener("change", loadOrders);
}

if (dateFilter) {
    dateFilter.addEventListener("change", loadOrders);
}

if (clearFilters) {
    clearFilters.addEventListener("click", () => {
        if (statusFilter) statusFilter.value = "";
        if (paymentFilter) paymentFilter.value = "";
        if (dateFilter) dateFilter.value = "";
        if (orderSearch) orderSearch.value = "";

        loadOrders();
    });
}


/* ===== RECEIPT BUTTONS ===== */

const receiptModal = document.getElementById("receiptModal");
const closeReceiptBtn = document.getElementById("closeReceipt");
const printReceiptBtn = document.getElementById("printReceipt");

// CLOSE RECEIPT
if (closeReceiptBtn) {
    closeReceiptBtn.addEventListener("click", function (event) {
        event.preventDefault();
        receiptModal.style.display = "none";
    });
}

// PRINT RECEIPT
if (printReceiptBtn) {
    printReceiptBtn.addEventListener("click", function (event) {
        event.preventDefault();
        window.print();
    });
}

// =====================================
// TOGGLE CUSTOMER REVIEWS
// =====================================

const toggleReviewsBtn = document.getElementById("toggleReviewsBtn");
const adminReviewsContent = document.getElementById("adminReviewsContent");

if (toggleReviewsBtn && adminReviewsContent) {
    toggleReviewsBtn.addEventListener("click", async () => {
        const isOpening = adminReviewsContent.hidden;

        adminReviewsContent.hidden = !isOpening;

        toggleReviewsBtn.setAttribute(
            "aria-expanded",
            String(isOpening)
        );

        toggleReviewsBtn.textContent = isOpening
            ? "Hide Customer Reviews"
            : "Show Customer Reviews";

        if (isOpening) {
            await loadAdminReviews();
        }
    });
}

// =====================================
// LOAD AND DISPLAY CUSTOMER REVIEWS
// =====================================

const adminReviewsList = document.getElementById("adminReviewsList");
const adminReviewsMessage = document.getElementById("adminReviewsMessage");
const reviewStatusFilter = document.getElementById("reviewFilter");
const refreshReviewsBtn = document.getElementById("refreshReviewsBtn");

async function loadAdminReviews() {
    if (!adminReviewsList || !adminReviewsMessage) {
        console.error("Customer reviews HTML elements were not found.");
        return;
    }

    adminReviewsMessage.textContent = "Loading reviews...";
    adminReviewsList.replaceChildren();

    try {
       const response = await apiFetch("/api/admin/reviews");

        const reviews = await response.json();

        if (!response.ok) {
            throw new Error(
                reviews.message || "Could not load customer reviews."
            );
        }

        console.log("Reviews received by admin:", reviews);

        const selectedStatus = reviewStatusFilter
            ? reviewStatusFilter.value
            : "";

        const filteredReviews = reviews.filter(review =>
            !selectedStatus || review.status === selectedStatus
        );

        if (filteredReviews.length === 0) {
            adminReviewsMessage.textContent =
                "No reviews found for this filter.";
            return;
        }

        adminReviewsMessage.textContent =
            `${filteredReviews.length} review(s) found.`;

        filteredReviews.forEach(review => {
            const card = document.createElement("article");
            card.className = "admin-review-card";

            const name = document.createElement("h3");
            name.textContent = review.customerName || "Customer";

            const stars = document.createElement("p");
            stars.className = "admin-review-stars";

            const rating = Math.max(
                0,
                Math.min(5, Number(review.rating) || 0)
            );

            stars.textContent =
                "★".repeat(rating) + "☆".repeat(5 - rating);

            const order = document.createElement("p");
            order.textContent =
                `Order: ${review.orderNumber || "Not provided"}`;

            const comment = document.createElement("p");
            comment.textContent =
                review.comment || "No comment provided.";

            const status = document.createElement("p");
            status.className =
                `admin-review-status status-${review.status || "pending"}`;
            status.textContent =
                `Status: ${review.status || "pending"}`;

            card.append(name, stars, order, comment, status);

            if (review.createdAt) {
                const date = document.createElement("p");
                const parsedDate = new Date(review.createdAt);

                date.textContent = Number.isNaN(parsedDate.getTime())
                    ? ""
                    : `Submitted: ${parsedDate.toLocaleString()}`;

                card.appendChild(date);
            }

            const actions = document.createElement("div");
            actions.className = "admin-review-actions";

            if (review.status !== "approved") {
                const approveBtn = document.createElement("button");
                approveBtn.type = "button";
                approveBtn.textContent = "Approve";

                approveBtn.addEventListener("click", () => {
                    updateReviewStatus(review.id, "approved");
                });

                actions.appendChild(approveBtn);
            }

            if (review.status !== "rejected") {
                const rejectBtn = document.createElement("button");
                rejectBtn.type = "button";
                rejectBtn.textContent = "Reject";

                rejectBtn.addEventListener("click", () => {
                    updateReviewStatus(review.id, "rejected");
                });

                actions.appendChild(rejectBtn);
            }

            card.appendChild(actions);
            adminReviewsList.appendChild(card);
        });

    } catch (error) {
        console.error("Error loading customer reviews:", error);

        adminReviewsMessage.textContent = error.message;
    }
}


// Approve or reject a review
async function updateReviewStatus(reviewId, status) {
    try {
        const response = await apiFetch(
            `/api/admin/reviews/${encodeURIComponent(reviewId)}`,
            {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "include",
                body: JSON.stringify({ status })
            }
        );

        const result = await response.json();

        if (!response.ok) {
            throw new Error(
                result.message || "Could not update review."
            );
        }

        await loadAdminReviews();

    } catch (error) {
        console.error("Review update error:", error);
        alert(error.message || "Could not update review.");
    }
}


// Filter reviews by status
if (reviewStatusFilter) {
    reviewStatusFilter.addEventListener("change", loadAdminReviews);
}


// Refresh reviews manually
if (refreshReviewsBtn) {
    refreshReviewsBtn.addEventListener("click", loadAdminReviews);
}


 // =====================================
// INVENTORY MANAGEMENT
// =====================================

// Load and display inventory
async function loadAdminInventory() {
    const inventoryTable = document.getElementById("inventoryTable");
    const tableMessage = document.getElementById("inventoryTableMessage");

    try {
        const response = await apiFetch("/api/admin/inventory", {
        credentials: "include"        });

        if (!response.ok) {
            throw new Error("Could not load inventory.");
        }

        const inventory = await response.json();

        // Update inventory summary cards
        document.getElementById("inventoryTotalProducts").textContent =
            inventory.length;

        document.getElementById("inventoryLowStock").textContent =
            inventory.filter(item =>
                item.quantity > 0 &&
                item.quantity <= item.lowStockThreshold
            ).length;

        document.getElementById("inventoryOutOfStock").textContent =
            inventory.filter(item => item.quantity === 0).length;

        // Show a message if there are no products
        if (inventory.length === 0) {
            inventoryTable.innerHTML = `
                <tr>
                    <td colspan="6">No inventory items yet. Add your first product above.</td>
                </tr>
            `;

            tableMessage.textContent = "";
            return;
        }

        // Display each inventory item
        inventoryTable.innerHTML = inventory.map(item => {
            let stockStatus = "In Stock";
            let statusClass = "in-stock";

            if (item.quantity === 0) {
                stockStatus = "Out of Stock";
                statusClass = "out-of-stock";
            } else if (item.quantity <= item.lowStockThreshold) {
                stockStatus = "Low Stock";
                statusClass = "low-stock";
            }

            return `
                <tr>
                    <td>${escapeInventoryText(item.name)}</td>
                    <td>${escapeInventoryText(item.category || "Other")}</td>
                    <td>${item.quantity}</td>
                    <td>
                        <span class="inventory-status ${statusClass}">
                            ${stockStatus}
                        </span>
                    </td>
                    <td>${item.lowStockThreshold}</td>
                    <td>
                        <button
                            type="button"
                            class="restock-inventory-btn"
                            data-inventory-id="${escapeInventoryText(item.id)}"
                        >
                            Restock
                        </button>
                    </td>
                </tr>
            `;
        }).join("");

        tableMessage.textContent = "";

    } catch (error) {
        console.error("Inventory loading error:", error);

        tableMessage.textContent =
            "Unable to load inventory. Please refresh and try again.";
    }
}

// Safely display text in the inventory table
function escapeInventoryText(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[character]);
}


const inventoryForm = document.getElementById("inventoryForm");

if (inventoryForm) {
    inventoryForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const message = document.getElementById("inventoryTableMessage");
        const submitButton = inventoryForm.querySelector(
            'button[type="submit"]'
        );

        const name = document.getElementById("inventoryProductName").value.trim();
        const quantity = Number(
            document.getElementById("inventoryQuantity").value
        );
        const lowStockThreshold = Number(
            document.getElementById("inventoryLowStockLimit").value || 5
        );

        if (!name || !Number.isSafeInteger(quantity) || quantity < 0 ||
            !Number.isSafeInteger(lowStockThreshold) || lowStockThreshold < 0) {
            message.textContent = "Please enter valid product and stock details.";
            return;
        }

        submitButton.disabled = true;
        message.textContent = "Saving stock...";

        try {
            const response = await apiFetch("/api/admin/inventory", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name,
                    quantity,
                    lowStockThreshold
                })
            });

            const responseText = await response.text();
            let result = {};

            if (responseText) {
                try {
                    result = JSON.parse(responseText);
                } catch {
                    throw new Error("The server returned an invalid response.");
                }
            }

            if (!response.ok) {
                throw new Error(
                    result.message || `Could not save stock (HTTP ${response.status}).`
                );
            }

            message.textContent = result.message || "Stock saved successfully.";
            inventoryForm.reset();

            await loadAdminInventory();

        } catch (error) {
            console.error("Saving inventory failed:", error);
            message.textContent = error.message || "Could not save stock.";
        } finally {
            submitButton.disabled = false;
        }
    });
}

// Restock an existing product
const inventoryTable = document.getElementById("inventoryTable");

if (inventoryTable) {
    inventoryTable.addEventListener("click", async function(event) {
        const button = event.target.closest(".restock-inventory-btn");

        if (!button) return;

        const itemId = button.dataset.inventoryId;
        const amountText = prompt(
            "How many units are you adding to the existing stock?"
        );

        if (amountText === null) return;

        const amount = Number(amountText);

        if (
            amountText.trim() === "" ||
            !Number.isSafeInteger(amount) ||
            amount <= 0
        ) {
            alert("Please enter a whole number greater than zero.");
            return;
        }

        button.disabled = true;

        try {
           const response = await apiFetch(
    `/api/admin/inventory/${encodeURIComponent(itemId)}/restock`,
    {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ amount })
    }
);
           const responseText = await response.text();
let result = {};

if (responseText) {
    try {
        result = JSON.parse(responseText);
    } catch {
        throw new Error("The server returned an invalid response.");
    }
}

            if (!response.ok) {
                throw new Error(
                    result.message || "Could not restock this product."
                );
            }

            alert(result.message);
            await loadAdminInventory();

        } catch (error) {
            alert(error.message);
        } finally {
            button.disabled = false;
        }
    });
}

// Refresh inventory manually
const refreshInventoryBtn = document.getElementById(
    "refreshInventoryBtn"
);

if (refreshInventoryBtn) {
    refreshInventoryBtn.addEventListener("click", loadAdminInventory);
}


/* ===== ADMIN DASHBOARD SESSION CHECK ===== */

const adminDashboard = document.getElementById("adminDashboard");
const adminLoginBtn = document.getElementById("adminLoginBtn");
const adminLogoutBtn = document.getElementById("adminLogoutBtn");

async function checkAdminSession() {
    if (adminDashboard) adminDashboard.hidden = true;
    if (adminLoginBtn) adminLoginBtn.hidden = true;
    if (adminLogoutBtn) adminLogoutBtn.hidden = true;

    try {
        const response = await apiFetch("/api/admin/session");
        const result = await response.json();

        if (!response.ok) {
            throw new Error("Could not verify admin session.");
        }

        if (result.authenticated === true) {
            // Logged in: show dashboard and Logout only.
            if (adminDashboard) adminDashboard.hidden = false;
            if (adminLoginBtn) adminLoginBtn.hidden = true;
            if (adminLogoutBtn) adminLogoutBtn.hidden = false;

           await loadOrders();
await loadAdminInventory();
await loadAdminReviews();

        } else {
            // Logged out: show Admin Login only.
            if (adminDashboard) adminDashboard.hidden = true;
            if (adminLoginBtn) adminLoginBtn.hidden = false;
            if (adminLogoutBtn) adminLogoutBtn.hidden = true;
        }

    } catch (error) {
        console.error("Admin session check failed:", error);

        if (adminDashboard) adminDashboard.hidden = true;
        if (adminLoginBtn) adminLoginBtn.hidden = false;
        if (adminLogoutBtn) adminLogoutBtn.hidden = true;

        alert("Could not verify your admin session. Please refresh and try again.");
    }
}


// Log out the admin
async function adminLogout() {
    if (!confirm("Are you sure you want to log out?")) return;

    if (adminLogoutBtn) adminLogoutBtn.disabled = true;

    try {
        const response = await apiFetch("/api/admin/logout", {
            method: "POST"
        });

        if (!response.ok) {
            throw new Error("Logout failed. Please try again.");
        }

        window.location.replace("admin-login.html");

    } catch (error) {
        console.error("Admin logout failed:", error);
        alert(error.message || "Could not log out.");

        if (adminLogoutBtn) adminLogoutBtn.disabled = false;
    }
}


// Check the session when the page opens.
if (adminDashboard) {
    checkAdminSession();
}
