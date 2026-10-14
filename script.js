
// CHECK LOGIN STATUS
document.addEventListener("DOMContentLoaded", async function () {
    const loginBtn = document.getElementById("loginBtn");
    const accountMenu = document.querySelector(".account-menu");

    // Hide account controls until the server confirms login.
    if (loginBtn) {
        loginBtn.style.display = "none";
    }

    if (accountMenu) {
        accountMenu.style.display = "none";
    }

    try {
        const response = await fetch("/api/customer/session", {
            credentials: "same-origin"
        });

        if (!response.ok) {
            throw new Error("Could not check login status.");
        }

        const result = await response.json();
        const isLoggedIn = result.authenticated === true;

        console.log("Login status:", isLoggedIn);

        if (loginBtn) {
            loginBtn.style.display = isLoggedIn
                ? "none"
                : "inline-block";
        }

        if (accountMenu) {
            accountMenu.style.display = isLoggedIn
                ? "inline-block"
                : "none";
        }

    } catch (error) {
        console.error("Could not check login status:", error);

        if (loginBtn) {
            loginBtn.style.display = "inline-block";
        }
    }
});

// ===============================
// CUSTOMER-SPECIFIC CART SYSTEM
// ===============================

// Get the current customer's email
function getCustomerStorageKey(type) {
    const email = getCurrentEmail();

    if (!email) {
        return null;
    }

    return "zobac" + type + "_" + encodeURIComponent(email);
}


// ===============================
// GET SAVED CART
// ===============================

function loadCustomerCart() {

    const key = getCustomerStorageKey("Cart");

    if (!key) {
        return [];
    }

    try {
        const savedCart = JSON.parse(localStorage.getItem(key)) || [];

        return savedCart.map(function (item) {
            return {
                ...item,
                quantity: Number(item.quantity) || 1
            };
        });

    } catch (error) {
        return [];
    }
}


// Current customer's cart
let cart = loadCustomerCart();


// ===============================
// SAVE CART
// ===============================

function saveCart() {

    const key = getCustomerStorageKey("Cart");

    if (!key) {
        return;
    }

    localStorage.setItem(
        key,
        JSON.stringify(cart)
    );
}


// ===============================
// POPULAR TREATS
// ===============================

function showMessage(message) {
    showNotification(message);
}


// ===============================
// ADD TO CART
// ===============================

function addToCart(productName, price) {

    const existingItem = cart.find(function (item) {
        return item.name === productName;
    });

    if (existingItem) {

        existingItem.quantity += 1;

    } else {

        cart.push({
            name: productName,
            price: price,
            quantity: 1
        });
    }

    saveCart();
    updateCartCount();

    showNotification(
        productName + " added to cart! 🛒"
    );
}


// ===============================
// INCREASE QUANTITY
// ===============================

function increaseQuantity(index) {

    cart[index].quantity += 1;

    saveCart();
    showCart();
}


// ===============================
// DECREASE QUANTITY
// ===============================

function decreaseQuantity(index) {

    if (cart[index].quantity > 1) {

        cart[index].quantity -= 1;

    } else {

        cart.splice(index, 1);
    }

    saveCart();
    showCart();
}


// ===============================
// SHOW CART
// ===============================


function showCart() {
    const cartItems = document.getElementById("cartItems");
    const cartTotal = document.getElementById("cartTotal");

    if (!cartItems || !cartTotal) {
        return;
    }

    cartItems.innerHTML = "";

    if (cart.length === 0) {
        cartItems.innerHTML = "<p>Your cart is empty.</p>";
        cartTotal.textContent = "Total: ₦0";
        updateCartCount();
        return;
    }

    let total = 0;

    cart.forEach(function (item, index) {
        total += item.price * item.quantity;

        let customDetails = "";

        if (item.customization) {
            // CAKE
            if (item.customization.theme !== undefined) {
                customDetails = `
                    <div class="custom-details">
                        <p>Size: ${item.customization.size}</p>
                        <p>Theme: ${item.customization.theme}</p>
                        <p>Message: ${item.customization.message || "None"}</p>
                    </div>
                `;
            }

            // PIZZA
            else if (item.customization.crust !== undefined) {
                customDetails = `
                    <div class="custom-details">
                        <p>Size: ${item.customization.size}</p>
                        <p>Crust: ${item.customization.crust}</p>
                        <p>Spice: ${item.customization.spice}</p>
                        <p>Instructions: ${item.customization.instructions || "None"}</p>
                    </div>
                `;
            }

            // SHAWARMA
            else if (item.customization.hotdogs !== undefined) {
                customDetails = `
                    <div class="custom-details">
                        <p>Size: ${item.customization.size}</p>
                        <p>Hotdogs: ${item.customization.hotdogs}</p>
                        <p>Spice: ${item.customization.spice}</p>
                        <p>Instructions: ${item.customization.instructions || "None"}</p>
                    </div>
                `;
            }
        }

        cartItems.innerHTML += `
            <div class="cart-item">
                <p>
                    <strong>${item.name}</strong>
                    <br>
                    ₦${item.price.toLocaleString()} × ${item.quantity}
                </p>

                ${customDetails}

                <button type="button" class="cart-action-btn"
                    data-action="decrease" data-index="${index}">
                    −
                </button>

                <span>${item.quantity}</span>

                <button type="button" class="cart-action-btn"
                    data-action="increase" data-index="${index}">
                    +
                </button>

                <button type="button" class="cart-action-btn"
                    data-action="remove" data-index="${index}">
                    Remove
                </button>
            </div>
        `;
    });

    cartTotal.textContent = "Total: ₦" + total.toLocaleString();

    // Connect buttons without inline JavaScript
    cartItems.querySelectorAll(".cart-action-btn").forEach(function (button) {
        button.addEventListener("click", function () {
            const index = Number(button.dataset.index);
            const action = button.dataset.action;

            if (action === "decrease") {
                decreaseQuantity(index);
            } else if (action === "increase") {
                increaseQuantity(index);
            } else if (action === "remove") {
                removeFromCart(index);
            }
        });
    });

    updateCartCount();
}



// ===============================
// REMOVE FROM CART
// ===============================

function removeFromCart(index) {

    cart.splice(index, 1);

    saveCart();

    showCart();
}


// ===============================
// SHOW SAVED CART
// ===============================

showCart();


// ===============================
// SHOW CHECKOUT
// ===============================

function showCheckout() {

    const checkoutItems =
        document.getElementById("checkoutItems");

    const checkoutTotal =
        document.getElementById("checkoutTotal");

    if (!checkoutItems || !checkoutTotal) {
        return;
    }

    checkoutItems.innerHTML = "";

    let total = 0;

    cart.forEach(function (item) {

        total += item.price * item.quantity;

        checkoutItems.innerHTML += `
            <p>
                <strong>${item.name}</strong>
                <br>
                ₦${item.price.toLocaleString()} × ${item.quantity}
            </p>
        `;
    });

    checkoutTotal.textContent =
        "Total: ₦" + total.toLocaleString();
}

showCheckout();


// ===============================
// CUSTOMER-SPECIFIC ORDERS
// ===============================


function saveCustomerOrders(orders) {
    const key = getCustomerStorageKey("Orders");

    if (!key) {
        return;
    }

    localStorage.setItem(key, JSON.stringify(orders));
}


function saveCustomerOrders(orders) {

    const key =
        getCustomerStorageKey("Orders");

    if (!key) {
        return;
    }

    localStorage.setItem(
        key,
        JSON.stringify(orders)
    );
}


// ===============================
// PLACE ORDER
// ===============================

function getCustomerOrders() {
    const key = getCustomerStorageKey("Orders");

    if (!key) {
        return [];
    }

    try {
        return JSON.parse(localStorage.getItem(key)) || [];
    } catch (error) {
        return [];
    }
}

async function placeOrder() {
    const name = document.getElementById("customerName").value.trim();
    const phone = document.getElementById("customerPhone").value.trim();
    const address = document.getElementById("customerAddress").value.trim();
    const date = document.getElementById("deliveryDate").value;

    const selectedPayment = document.querySelector(
        'input[name="paymentMethod"]:checked'
    );

    if (!selectedPayment) {
        document.getElementById("paymentMessage").textContent =
            "Please choose a payment method.";
        return;
    }

    const paymentMethod = selectedPayment.value;

    if (
        paymentMethod === "Bank Transfer" &&
        document.getElementById("transferConfirmation").dataset.confirmed !== "true"
    ) {
        document.getElementById("paymentMessage").textContent =
            "Please click I've Done the Transfer before placing your order.";
        return;
    }



    /* =================================
       ZOBAC BAKERY PAYMENT SECTION
    ================================= */

    const paymentRadios = document.querySelectorAll(
        'input[name="paymentMethod"]'
    );

    const bankDetails = document.getElementById("bankTransferDetails");
    const bankDropdownBtn = document.getElementById("bankDropdownBtn");
    const closeBankDetails = document.getElementById("closeBankDetails");
    const transferButton = document.getElementById("transferConfirmation");
    const transferMessage = document.getElementById("transferButtonMessage");
    const paymentMessage = document.getElementById("paymentMessage");


    /* OPEN AND CLOSE BANK DETAILS */

    function setBankDropdown(open) {
        if (!bankDetails || !bankDropdownBtn) return;

        bankDetails.hidden = !open;

        bankDropdownBtn.setAttribute(
            "aria-expanded",
            String(open)
        );
    }


    /* BANK DROPDOWN BUTTON */


    const bankArrow = document.getElementById("bankDropdownBtn");

    if (bankArrow) {
        bankArrow.onclick = function () {
            const bankDetails =
                document.getElementById("bankTransferDetails");

            if (!bankDetails) return;

            const isOpen =
                !bankDetails.hidden &&
                bankDetails.style.display !== "none";

            if (isOpen) {
                bankDetails.hidden = true;
                bankDetails.style.display = "none";
                bankArrow.setAttribute("aria-expanded", "false");
            } else {
                bankDetails.hidden = false;
                bankDetails.style.display = "block";
                bankArrow.setAttribute("aria-expanded", "true");

                const bankRadio = document.querySelector(
                    'input[name="paymentMethod"][value="Bank Transfer"]'
                );

                if (bankRadio) {
                    bankRadio.checked = true;
                }
            }
        };
    }



    /* CLOSE BANK DETAILS BUTTON */

    if (closeBankDetails) {
        closeBankDetails.addEventListener("click", function () {
            setBankDropdown(false);
        });
    }


    /* WHEN PAYMENT METHOD CHANGES */

    paymentRadios.forEach(function (radio) {

        radio.addEventListener("change", function () {

            if (this.value === "Bank Transfer") {
                setBankDropdown(true);
            } else {
                setBankDropdown(false);
            }

            // Reset transfer confirmation.
            if (transferButton) {
                transferButton.dataset.confirmed = "false";
                transferButton.textContent = "I've Done the Transfer";
                transferButton.classList.remove("confirmed");
            }

            if (transferMessage) {
                transferMessage.textContent = "";
            }

            if (paymentMessage) {
                paymentMessage.textContent = "";
            }

        });

    });


    /* I'VE DONE THE TRANSFER BUTTON */

    if (transferButton) {

        transferButton.addEventListener("click", function () {

            const selectedPayment = document.querySelector(
                'input[name="paymentMethod"]:checked'
            );

            if (
                !selectedPayment ||
                selectedPayment.value !== "Bank Transfer"
            ) {
                if (paymentMessage) {
                    paymentMessage.textContent =
                        "Please select Bank Transfer first.";
                }

                return;
            }

            this.dataset.confirmed = "true";

            this.textContent =
                "✓ Transfer Confirmation Submitted";

            this.classList.add("confirmed");

            if (transferMessage) {
                transferMessage.textContent =
                    "Your payment still needs to be verified by the bakery.";
            }

            if (paymentMessage) {
                paymentMessage.textContent = "";
            }

        });

    }


    if (cart.length === 0) {
        showNotification("Your cart is empty.");
        return;
    }

    const total = cart.reduce(function (sum, item) {
        return sum + item.price * item.quantity;
    }, 0);

    const orderNumber =
        "ZOBAC-" + Math.floor(100000 + Math.random() * 900000);

    const orderItems = cart.map(function (item) {
        return { ...item };
    });

    const newOrder = {
        orderNumber: orderNumber,
        name: name,
        phone: phone,
        email: getCurrentEmail(),
        address: address,
        deliveryDate: date,
        status: "Order Received",
        paymentMethod: paymentMethod,
        paymentStatus: "Payment Pending",
        items: orderItems,
        total: total
    };

    const orders = getCustomerOrders();
    orders.push(newOrder);
    saveCustomerOrders(orders);

    placeOrderBtn.disabled = true;
    placeOrderBtn.textContent = "Submitting Order...";

    try {
        const response = await fetch("/api/orders", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                orderNumber: orderNumber,
                email: getCurrentEmail(),
                name: name,
                phone: phone,
                address: address,
                deliveryDate: date,
                items: orderItems,
                total: total,
                paymentMethod: paymentMethod,
                paymentStatus: "Payment Pending"
            })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || "Order submission failed.");
        }

        // Empty the cart only after the backend accepts the order.
        cart = [];
        saveCart();
        updateCartCount();

        document.getElementById("homeAfterOrder").style.display =
            "inline-block";

        document.getElementById("viewOrderBtn").style.display =
            "inline-block";

        orderMessage.textContent =
            "Order placed successfully! Order: " + orderNumber +
            ". Payment is pending confirmation.";

        orderMessage.style.color = "#6b247f";
        orderMessage.style.fontWeight = "bold";

        paymentMessage.textContent =
            paymentMethod === "Bank Transfer"
                ? "Your transfer will be verified manually by Zobac Bakery."
                : "Please pay at the bakery. Your payment is still pending.";

    } catch (error) {
        console.error("Order submission error:", error);

        // Remove the unsent order from local storage.
        const savedOrders = getCustomerOrders().filter(
            order => order.orderNumber !== orderNumber
        );
        saveCustomerOrders(savedOrders);

        orderMessage.textContent =
            "We couldn't submit your order to the bakery. " +
            "Please try again. Your cart has been kept.";

        orderMessage.style.color = "#b45309";
        orderMessage.style.fontWeight = "bold";

    } finally {
        placeOrderBtn.disabled = false;
        placeOrderBtn.textContent = "Place Order";
    }
}

const bankArrow = document.getElementById("bankDropdownBtn");

if (bankArrow) {
    bankArrow.onclick = function () {
        const details = document.getElementById("bankTransferDetails");

        if (!details) return;

        const isOpen =
            !details.hidden &&
            details.style.display !== "none";

        details.hidden = isOpen;
        details.style.display = isOpen ? "none" : "block";

        this.setAttribute("aria-expanded", String(!isOpen));

        if (!isOpen) {
            const bankRadio = document.querySelector(
                'input[name="paymentMethod"][value="Bank Transfer"]'
            );

            if (bankRadio) {
                bankRadio.checked = true;
            }
        }
    };
}

const closeBankButton = document.getElementById("closeBankDetails");

if (closeBankButton) {
    closeBankButton.onclick = function () {
        const bankDetails = document.getElementById("bankTransferDetails");
        const bankDropdownBtn = document.getElementById("bankDropdownBtn");

        if (bankDetails) {
            bankDetails.hidden = true;
            bankDetails.style.display = "none";
        }

        if (bankDropdownBtn) {
            bankDropdownBtn.setAttribute("aria-expanded", "false");
        }
    };
}

const transferButton = document.getElementById("transferConfirmation");
const transferMessage = document.getElementById("transferButtonMessage");

if (transferButton) {
    transferButton.addEventListener("click", function () {



        function setBankDropdown(open) {
            const bankDetails = document.getElementById("bankTransferDetails");
            const bankDropdownBtn = document.getElementById("bankDropdownBtn");

            if (!bankDetails || !bankDropdownBtn) return;

            bankDetails.hidden = !open;
            bankDetails.style.display = open ? "block" : "none";

            bankDropdownBtn.setAttribute(
                "aria-expanded",
                String(open)
            );
        }










        const transferButton = document.getElementById("transferConfirmation");
        const transferMessage = document.getElementById("transferButtonMessage");

        if (transferButton) {
            transferButton.addEventListener("click", function () {
                const selectedPayment = document.querySelector(
                    'input[name="paymentMethod"]:checked'
                );

                if (!selectedPayment || selectedPayment.value !== "Bank Transfer") {
                    const paymentMessage = document.getElementById("paymentMessage");

                    if (paymentMessage) {
                        paymentMessage.textContent =
                            "Please select Bank Transfer first.";
                    }
                    return;
                }

                this.dataset.confirmed = "true";
                this.textContent = "✓ Transfer Confirmation Submitted";
                this.classList.add("confirmed");

                if (transferMessage) {
                    transferMessage.textContent =
                        "Your payment still needs to be verified by the bakery.";
                }
            });
        }

    });

}
// Show bank details only when Bank Transfer is selected.
document.querySelectorAll('input[name="paymentMethod"]').forEach(
    function (input) {
        input.addEventListener("change", function () {
            const details = document.getElementById("bankTransferDetails");

            details.style.display =
                this.value === "Bank Transfer" ? "block" : "none";

            document.getElementById("paymentMessage").textContent = "";
        }
        );
    });





// ===============================
// SHOW ORDERS
// ===============================



async function syncCustomerOrderStatuses() {
    try {
        // Get only the orders belonging to the logged-in customer.
        const response = await fetch("/api/customer/orders", {
            credentials: "same-origin"
        });

        if (!response.ok) {
            return;
        }

        const customerServerOrders = await response.json();
        const email = getCurrentEmail();

        if (!email) {
            return;
        }

        const localOrders = getCustomerOrders();

        customerServerOrders.forEach(serverOrder => {
            const existingOrder = localOrders.find(
                order =>
                    order.orderNumber === serverOrder.orderNumber
            );

            if (existingOrder) {
                // Update the order's progress.
                existingOrder.status = serverOrder.status;

                // Update its payment status.
                existingOrder.paymentStatus =
                    serverOrder.paymentStatus ||
                    existingOrder.paymentStatus;

                // Update its payment method when available.
                if (serverOrder.paymentMethod) {
                    existingOrder.paymentMethod =
                        serverOrder.paymentMethod;
                }
            } else {
                // Add an order that is missing from local storage.
                localOrders.push(serverOrder);
            }
        });

        saveCustomerOrders(localOrders);

    } catch (error) {
        console.error(
            "Could not sync order statuses:",
            error
        );
    }
}

async function showOrders() {

    const ordersList =
        document.getElementById("ordersList");

    if (!ordersList) {
        return;
    }
    await syncCustomerOrderStatuses();

    // Get ONLY current customer's orders
    const orders =
        getCustomerOrders();


    ordersList.innerHTML = "";


    if (orders.length === 0) {

        ordersList.innerHTML =
            "<p>No orders yet.</p>";

        return;
    }


    orders.slice().reverse().forEach(
        function (order) {

            let itemsHTML = "";


            order.items.forEach(
                function (item) {

                    let customDetails = "";


                    // CAKE
                    if (
                        item.customization &&
                        item.customization.theme !== undefined
                    ) {

                        customDetails = `
                            <div class="custom-details">
                                <p>Size: ${item.customization.size}</p>
                                <p>Theme: ${item.customization.theme}</p>
                                <p>Message: ${item.customization.message || "None"}</p>
                            </div>
                        `;
                    }


                    // PIZZA
                    else if (
                        item.customization &&
                        item.customization.crust !== undefined
                    ) {

                        customDetails = `
                            <div class="custom-details">
                                <p>Size: ${item.customization.size}</p>
                                <p>Crust: ${item.customization.crust}</p>
                                <p>Spice: ${item.customization.spice}</p>
                                <p>Instructions: ${item.customization.instructions || "None"}</p>
                            </div>
                        `;
                    }


                    // SHAWARMA
                    else if (
                        item.customization &&
                        item.customization.hotdogs !== undefined
                    ) {

                        customDetails = `
                            <div class="custom-details">
                                <p>Size: ${item.customization.size}</p>
                                <p>Hotdogs: ${item.customization.hotdogs}</p>
                                <p>Spice: ${item.customization.spice}</p>
                                <p>Instructions: ${item.customization.instructions || "None"}</p>
                            </div>
                        `;
                    }


                    itemsHTML += `
                        <div class="receipt-item">

                            <p>
                                <strong>${item.name}</strong>
                                × ${item.quantity}
                            </p>

                            <p>
                                ₦${(
                            item.price *
                            item.quantity
                        ).toLocaleString()}
                            </p>

                            ${customDetails}

                        </div>
                    `;
                }
            );


            const trackingSteps = [
                "Order Received",
                "Preparing",
                "Out for Delivery",
                "Delivered"
            ];

            const currentStatus = order.status || "Order Received";
            const currentStep = trackingSteps.indexOf(currentStatus);

            const trackingHTML = `
    <div class="order-tracking">
        <h4>Order Progress</h4>
        <div class="tracking-steps">
            ${trackingSteps.map((step, index) => `
                <div class="tracking-step ${index < currentStep ? "completed" :
                    index === currentStep ? "active" : ""
                }">
                    <div class="tracking-dot">
                        ${index < currentStep ? "✓" : index + 1}
                    </div>
                    <span>${step}</span>
                </div>
            `).join("")}
        </div>
    </div>
`;

            ordersList.innerHTML += `
            
                <div class="order-card">

                    <h3>
                        🧾 ${order.orderNumber}
                    </h3>

                    <p>
                        <strong>Name:</strong>
                        ${order.name}
                    </p>

                    <p>
                        <strong>Phone:</strong>
                        ${order.phone}
                    </p>

                    <p>
                        <strong>Address:</strong>
                        ${order.address}
                    </p>

                    
<p>
    <strong>Delivery Date:</strong>
    ${order.deliveryDate}
</p>

<p>
    <strong>Payment Method:</strong>
    ${order.paymentMethod || "Not recorded"}
</p>

<p>
    <strong>Payment Status:</strong>
    <span class="payment-status">
        ${order.paymentStatus || "Payment Pending"}
    </span>
</p>

                 
<p>
    <strong>Status:</strong>

    <span class="order-status">
        ${order.status === "Delivered" ? "🟢" :
                    order.status === "Out for Delivery" ? "🚚" :
                        order.status === "Preparing" ? "🔵" :
                            "🟠"
                }
        ${order.status}
    </span>
</p>
        ${trackingHTML}
                    <hr>

                    <h4>Items Purchased</h4>

                    ${itemsHTML}

                    <hr>

                    <p>
                        <strong>Total:</strong>
                        ₦${order.total.toLocaleString()}
                    </p>

                    <button
                        onclick="deleteOrder('${order.orderNumber}')"
                    >
                        Delete Order
                    </button>

                </div>
            `;
        }
    );
}


let pendingOrderNumber = null;


// ===============================
// DELETE ORDER
// ===============================

function deleteOrder(orderNumber) {

    pendingOrderNumber =
        orderNumber;

    const deleteModal =
        document.getElementById("deleteModal");

    if (deleteModal) {

        deleteModal.style.display =
            "flex";
    }
}


const yesDeleteBtn =
    document.getElementById("yesDeleteBtn");

const noDeleteBtn =
    document.getElementById("noDeleteBtn");


if (yesDeleteBtn) {

    yesDeleteBtn.onclick =
        function () {

            if (
                pendingOrderNumber === null
            ) {
                return;
            }


            // Get ONLY current customer's orders
            let orders =
                getCustomerOrders();


            const orderIndex =
                orders.findIndex(
                    function (order) {

                        return String(
                            order.orderNumber
                        ) === String(
                            pendingOrderNumber
                        );
                    }
                );


            if (orderIndex !== -1) {

                orders.splice(
                    orderIndex,
                    1
                );


                // Save ONLY current customer's orders
                saveCustomerOrders(
                    orders
                );


                showOrders();

                showNotification(
                    "Order deleted successfully! 🗑️"
                );
            }


            closeDeleteModal();
        };
}


if (noDeleteBtn) {

    noDeleteBtn.onclick =
        function () {

            closeDeleteModal();
        };
}


function closeDeleteModal() {

    const deleteModal =
        document.getElementById("deleteModal");

    if (deleteModal) {

        deleteModal.style.display =
            "none";
    }

    pendingOrderNumber =
        null;
}


showOrders();

// Refresh order statuses every 30 seconds
setInterval(showOrders, 30000);


// ===============================
// CART COUNT
// ===============================

function updateCartCount() {

    const cartCount =
        document.getElementById("cartCount");

    if (!cartCount) {
        return;
    }


    let totalItems = 0;


    cart.forEach(function (item) {

        totalItems +=
            item.quantity;
    });


    cartCount.textContent =
        totalItems;
}


updateCartCount();


// ===============================
// GO TO CHECKOUT
// ===============================


function goToCheckout() {
    if (cart.length === 0) {
        showNotification(
            "Your cart is empty. Please add an item first."
        );
        return;
    }

    const popup = document.getElementById("orderNoticePopup");

    if (popup) {
        popup.classList.add("show");
    } else {
        console.error("Order notice popup was not found.");
    }
}

// Close the popup and stay on the cart page.
const closeOrderNotice =
    document.getElementById("closeOrderNotice");

const cancelOrderNotice =
    document.getElementById("cancelOrderNotice");

const continueOrderNotice =
    document.getElementById("continueOrderNotice");

const orderNoticePopup =
    document.getElementById("orderNoticePopup");

if (closeOrderNotice && orderNoticePopup) {
    closeOrderNotice.addEventListener("click", function () {
        orderNoticePopup.classList.remove("show");
    });
}

if (cancelOrderNotice && orderNoticePopup) {
    cancelOrderNotice.addEventListener("click", function () {
        orderNoticePopup.classList.remove("show");
    });
}

if (continueOrderNotice) {
    continueOrderNotice.addEventListener("click", function () {
        window.location.href = "checkout.html";
    });
}

// Close when the customer clicks the dark background.
if (orderNoticePopup) {
    orderNoticePopup.addEventListener("click", function (event) {
        if (event.target === orderNoticePopup) {
            orderNoticePopup.classList.remove("show");
        }
    });
}


// ===============================
// NOTIFICATION
// ===============================

function showNotification(message) {

    let notification =
        document.getElementById(
            "notificationBar"
        );


    if (!notification) {

        notification =
            document.createElement("div");

        notification.id =
            "notificationBar";

        document.body.appendChild(
            notification
        );
    }


    notification.textContent =
        message;

    notification.classList.add(
        "show"
    );


    setTimeout(
        function () {

            notification.classList.remove(
                "show"
            );

        },
        3000
    );
}
//CAKE PRICES AND SIZE
const cakeSize = document.getElementById("cakeSize");
const cakePrice = document.getElementById("cakePrice");

if (cakeSize && cakePrice) {

    cakeSize.onchange = function () {

        if (cakeSize.value === "Small") {
            cakePrice.textContent = "Price: ₦10,000";
        } else if (cakeSize.value === "Medium") {
            cakePrice.textContent = "Price: ₦15,000";
        } else if (cakeSize.value === "Large") {
            cakePrice.textContent = "Price: ₦30,000";
        } else {
            cakePrice.textContent = "Select a size to see the price.";
        }

    };

}
// CUSTOM CAKE REQUEST

const cakeSizeSelect = document.getElementById("cakeSize");
const cakePriceDisplay = document.getElementById("cakePrice");

if (cakeSizeSelect && cakePriceDisplay) {

    cakeSizeSelect.onchange = function () {

        if (cakeSizeSelect.value === "Small") {
            cakePriceDisplay.textContent = "Price: ₦10,000";
        } else if (cakeSize.value === "Medium") {
            cakePriceDisplay.textContent = "Price: ₦15,000";
        } else if (cakeSize.value === "Large") {
            cakePriceDisplay.textContent = "Price: ₦30,000";
        } else {
            cakePriceDisplay.textContent =
                "Select a size to see the price.";
        }

    };

}


const customCakeBtn = document.getElementById("customCakeBtn");

if (customCakeBtn) {

    customCakeBtn.onclick = function () {

        const cakeType =
            document.getElementById("cakeType").value;

        const cakeSizeValue =
            document.getElementById("cakeSize").value;

        const cakeTheme =
            document.getElementById("cakeTheme").value;

        const cakeMessage =
            document.getElementById("cakeMessage").value;


        if (
            cakeType === "" ||
            cakeSizeValue === "" ||
            cakeTheme === ""
        ) {
            showNotification(
                "Please fill in all required cake details."
            );
            return;
        }


        let cakePrice;

        if (cakeSizeValue === "Small") {
            cakePrice = 10000;
        } else if (cakeSizeValue === "Medium") {
            cakePrice = 15000;
        } else if (cakeSizeValue === "Large") {
            cakePrice = 30000;
        }


        cart.push({
            name: "Custom Birthday Cake",
            price: cakePrice,
            quantity: 1,

            customization: {
                type: cakeType,
                size: cakeSizeValue,
                theme: cakeTheme,
                message: cakeMessage

            }
        });


        saveCart();

        document.getElementById("cakeMessageResult").textContent =
            "Cake added to your cart! 🎂🛒";


        setTimeout(function () {
            window.location.href = "shop.html";
        }, 1000);

    };

}

function showNotification(message) {

    let notification = document.getElementById("notificationBar");

    if (!notification) {
        notification = document.createElement("div");
        notification.id = "notificationBar";
        document.body.appendChild(notification);
    }

    notification.textContent = message;
    notification.classList.add("show");

    setTimeout(function () {
        notification.classList.remove("show");
    }, 3000);
}
function updateCartCount() {

    const cartCount = document.getElementById("cartCount");

    if (!cartCount) return;

    let totalItems = 0;

    cart.forEach(function (item) {
        totalItems += item.quantity;
    });

    cartCount.textContent = totalItems;
}

updateCartCount();
const backToTop = document.getElementById("backToTop");
if (backToTop) {
    backToTop.onclick = function () {
        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    };
}
// SHAWARMA PRICE DISPLAY

const shawarmaSizeSelect =
    document.getElementById("shawarmaSize");

const shawarmaPriceDisplay =
    document.getElementById("shawarmaPrice");

if (shawarmaSizeSelect && shawarmaPriceDisplay) {

    shawarmaSizeSelect.onchange = function () {

        if (shawarmaSizeSelect.value === "Regular") {

            shawarmaPriceDisplay.textContent =
                "Price: ₦2,500 • 2 Hotdogs 🌭";

        } else if (shawarmaSizeSelect.value === "Large") {

            shawarmaPriceDisplay.textContent =
                "Price: ₦4,000 • 3 Hotdogs 🌭";

        } else {

            shawarmaPriceDisplay.textContent =
                "Select a size to see the price.";

        }

    };

}


// SHAWARMA CUSTOMIZATION

const shawarmaBtn =
    document.getElementById("shawarmaBtn");

if (shawarmaBtn) {

    shawarmaBtn.onclick = function () {

        const shawarmaType =
            document.getElementById("shawarmaType").value;

        const shawarmaSize =
            document.getElementById("shawarmaSize").value;



        const shawarmaSpice =
            document.getElementById("shawarmaSpice").value;



        if (
            shawarmaType === "" ||
            shawarmaSize === "" ||
            shawarmaSpice === ""
        ) {

            showNotification(
                "Please fill in all required shawarma details. 🌯"
            );

            return;
        }


        let shawarmaPrice;
        let hotdogs;


        if (shawarmaSize === "Regular") {

            shawarmaPrice = 2500;
            hotdogs = 2;

        } else if (shawarmaSize === "Large") {

            shawarmaPrice = 4000;
            hotdogs = 3;

        }


        cart.push({

            name: shawarmaType,

            price: shawarmaPrice,

            quantity: 1,

            customization: {

                size: shawarmaSize,

                hotdogs: hotdogs,

                spice: shawarmaSpice,



            }

        });


        saveCart();

        updateCartCount();


        showNotification(
            "Shawarma added to your cart! 🌯🛒"
        );


        setTimeout(function () {

            window.location.href = "shop.html";

        }, 1000);

    };

}
// PIZZA PRICE DISPLAY

const pizzaSizeSelect =
    document.getElementById("pizzaSize");

const pizzaPriceDisplay =
    document.getElementById("pizzaPrice");

if (pizzaSizeSelect && pizzaPriceDisplay) {

    pizzaSizeSelect.onchange = function () {

        if (pizzaSizeSelect.value === "Small") {

            pizzaPriceDisplay.textContent =
                "Price: ₦18,000";

        } else if (pizzaSizeSelect.value === "Medium") {

            pizzaPriceDisplay.textContent =
                "Price: ₦25,000";

        } else if (pizzaSizeSelect.value === "Large") {

            pizzaPriceDisplay.textContent =
                "Price: ₦36,000";

        } else {

            pizzaPriceDisplay.textContent =
                "Select a size to see the price.";

        }

    };

}


// PIZZA CUSTOMIZATION

const pizzaBtn =
    document.getElementById("pizzaBtn");

if (pizzaBtn) {

    pizzaBtn.onclick = function () {

        const pizzaType =
            document.getElementById("pizzaType").value;

        const pizzaSize =
            document.getElementById("pizzaSize").value;

        const pizzaCrust =
            document.getElementById("pizzaCrust").value;


        const pizzaSpice =
            document.getElementById("pizzaSpice").value;

        const pizzaInstructions =
            document.getElementById("pizzaInstructions").value;


        if (
            pizzaType === "" ||
            pizzaSize === "" ||
            pizzaCrust === "" ||
            pizzaSpice === ""
        ) {

            showNotification(
                "Please fill in all required pizza details. 🍕"
            );

            return;
        }


        let pizzaPrice;


        if (pizzaSize === "Small") {

            pizzaPrice = 18000;

        } else if (pizzaSize === "Medium") {

            pizzaPrice = 25000;

        } else if (pizzaSize === "Large") {

            pizzaPrice = 36000;

        }


        cart.push({

            name: pizzaType,

            price: pizzaPrice,

            quantity: 1,

            customization: {

                size: pizzaSize,

                crust: pizzaCrust,

                spice: pizzaSpice,

                instructions: pizzaInstructions

            }

        });


        saveCart();

        updateCartCount();


        showNotification(
            "Pizza added to your cart! 🍕🛒"
        );


        setTimeout(function () {

            window.location.href = "shop.html";

        }, 1000);

    };

}
// ===============================
// ZOBAC ACCOUNT SYSTEM
// ===============================

// Get all registered accounts
function getZobacAccounts() {
    try {
        return JSON.parse(localStorage.getItem("zobacAccounts")) || [];
    } catch (error) {
        return [];
    }
}


// Save all registered accounts
function saveZobacAccounts(accounts) {
    localStorage.setItem(
        "zobacAccounts",
        JSON.stringify(accounts)
    );
}


// Get the email currently logged in
function getCurrentEmail() {
    return (
        localStorage.getItem("zobacCurrentEmail") || ""
    ).trim().toLowerCase();
}


// Get the currently logged-in customer's account
function getCurrentAccount() {

    const email = getCurrentEmail();

    if (!email) {
        return null;
    }

    const accounts = getZobacAccounts();

    return accounts.find(function (account) {
        return (
            (account.email || "").toLowerCase() === email
        );
    }) || null;
}

// ===============================
// REGISTRATION - BACKEND
// ===============================

document.addEventListener("DOMContentLoaded", function () {
    const registerBtn = document.getElementById("registerBtn");

    if (!registerBtn) return;

    registerBtn.addEventListener("click", async function () {
        const name = document.getElementById("registerName").value.trim();
        const email = document.getElementById("registerEmail").value.trim().toLowerCase();
        const phone = document.getElementById("registerPhone").value.trim();
        const password = document.getElementById("registerPassword").value;
        const confirmPassword = document.getElementById("confirmPassword").value;
        const message = document.getElementById("registerMessage");

        if (!name || !email || !phone || !password || !confirmPassword) {
            message.textContent = "Please fill in all fields.";
            message.style.color = "red";
            return;
        }

        if (password.length < 8) {
            message.textContent = "Password must be at least 8 characters.";
            message.style.color = "red";
            return;
        }

        if (password !== confirmPassword) {
            message.textContent = "Passwords do not match.";
            message.style.color = "red";
            return;
        }

        registerBtn.disabled = true;
        message.textContent = "Creating your account...";
        message.style.color = "";

        try {
            const response = await fetch("/api/register", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    name: name,
                    email: email,
                    phone: phone,
                    password: password
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Registration failed.");
            }

            message.textContent = result.message;
            message.style.color = "green";

            document.getElementById("registerPassword").value = "";
            document.getElementById("confirmPassword").value = "";

            setTimeout(function () {
                window.location.href = "login.html";
            }, 1000);

        } catch (error) {
            message.textContent =
                error.message === "Failed to fetch"
                    ? "Could not connect to the bakery server. Please open the website through your running backend."
                    : error.message;

            message.style.color = "red";
        } finally {
            registerBtn.disabled = false;
        }
    });
});



 // ===============================
// LOGIN - BACKEND
// ===============================

document.addEventListener("DOMContentLoaded", function () {
    const loginForm = document.getElementById("loginForm");
    const loginBtn = document.getElementById("loginBtn");
    const emailInput = document.getElementById("loginEmail");
    const passwordInput = document.getElementById("loginPassword");
    const message = document.getElementById("loginMessage");

   if (!loginForm || !loginBtn || !emailInput || !passwordInput || !message) {
    console.log("Missing login element:", {
        loginForm,
        loginBtn,
        emailInput,
        passwordInput,
        message
    });
    return;
}

console.log("LOGIN FORM CONNECTED");
    const rememberedEmail = localStorage.getItem("zobacLoginEmail");

    if (rememberedEmail) {
        emailInput.value = rememberedEmail;
    }

   loginBtn.addEventListener("click", async function (event) {
    console.log("LOGIN BUTTON CLICKED");
    event.preventDefault();

    console.log("LOGIN BUTTON CLICKED");

    const email = emailInput.value.trim().toLowerCase();
    const password = passwordInput.value;
        if (!email || !password) {
            message.style.color = "red";
            message.textContent = "Please enter your email and password.";
            return;
        }

        loginBtn.disabled = true;
        message.style.color = "";
        message.textContent = "Logging in...";

        try {
            const response = await fetch("/api/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                credentials: "same-origin",
                body: JSON.stringify({ email, password })
            });
const result = await response.json();
            if (!response.ok) {
                throw new Error(result.message || "Login failed.");
            }

            localStorage.setItem("zobacLoginEmail", email);
            localStorage.setItem("zobacCurrentEmail", email);
            localStorage.removeItem("zobacLoggedIn");

            message.style.color = "green";
            message.textContent = "Login successful!";

            window.location.href = "index.html";

        } catch (error) {
            console.error("Login failed:", error);

            message.style.color = "red";
            message.textContent =
                error.message === "Failed to fetch"
                    ? "Cannot connect to the server. Check that it is running."
                    : error.message;
        } finally {
            loginBtn.disabled = false;
        }
    });
});



// ===============================
// LOAD CURRENT ACCOUNT
// ===============================


document.addEventListener("DOMContentLoaded", async function () {
    const accountName = document.getElementById("accountName");
    const accountPhone = document.getElementById("accountPhone");
    const savedName = document.getElementById("savedName");
    const savedPhone = document.getElementById("savedPhone");
    const saveAccountBtn = document.getElementById("saveAccountBtn");

    // Only run on account.html
    if (!accountName || !accountPhone || !savedName || !savedPhone) {
        return;
    }

    try {
        // Load the logged-in customer's details from the backend
        const response = await fetch("/api/customer/session", {
            credentials: "same-origin"
        });

        const result = await response.json();

        if (!response.ok || result.authenticated !== true) {
            savedName.textContent = "Please log in again";
            savedPhone.textContent = "Please log in again";
            return;
        }

        const customer = result.customer;

        accountName.value = customer.name || "";
        accountPhone.value = customer.phone || "";

        savedName.textContent = customer.name || "Not saved yet";
        savedPhone.textContent = customer.phone || "Not saved yet";

    } catch (error) {
        console.error("Could not load account details:", error);
        savedName.textContent = "Could not load details";
        savedPhone.textContent = "Could not load details";
        return;
    }

    // Save account details to the backend
    if (saveAccountBtn) {
        saveAccountBtn.addEventListener("click", async function (event) {
            event.preventDefault();

            const name = accountName.value.trim();
            const phone = accountPhone.value.trim();

            if (!name) {
                alert("Please enter your name.");
                return;
            }

            saveAccountBtn.disabled = true;
            saveAccountBtn.textContent = "Saving...";

            try {
                const response = await fetch("/api/customer/profile", {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    credentials: "same-origin",
                    body: JSON.stringify({ name, phone })
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(
                        result.message || "Could not save account details."
                    );
                }

                accountName.value = result.customer.name;
                accountPhone.value = result.customer.phone;

                savedName.textContent = result.customer.name;
                savedPhone.textContent = result.customer.phone;

                alert("Account details saved successfully!");

            } catch (error) {
                console.error("Account save failed:", error);
                alert(error.message || "Could not save account details.");
            } finally {
                saveAccountBtn.disabled = false;
                saveAccountBtn.textContent = "Save";
            }
        });
    }
});



// ===============================
// EDIT ACCOUNT INFORMATION
// ===============================

document.addEventListener("DOMContentLoaded", function () {

    const editBtn =
        document.getElementById("editAccountBtn");

    const saveBtn =
        document.getElementById("saveAccountBtn");

    const nameInput =
        document.getElementById("accountName");

    const phoneInput =
        document.getElementById("accountPhone");


    if (
        !editBtn ||
        !saveBtn ||
        !nameInput ||
        !phoneInput
    ) {
        return;
    }


    nameInput.readOnly = true;
    phoneInput.readOnly = true;

    saveBtn.style.display = "none";


    // EDIT
    editBtn.addEventListener("click", function () {

        nameInput.readOnly = false;
        phoneInput.readOnly = false;

        editBtn.style.display = "none";
        saveBtn.style.display = "inline-block";

    });


    // SAVE
    saveBtn.addEventListener("click", function () {

        const currentEmail =
            getCurrentEmail();

        if (!currentEmail) {

            showNotification(
                "Please login first."
            );

            return;
        }


        const accounts =
            getZobacAccounts();


        const accountIndex =
            accounts.findIndex(function (account) {

                return (
                    (account.email || "").toLowerCase() ===
                    currentEmail
                );

            });


        if (accountIndex === -1) {

            showNotification(
                "Account not found."
            );

            return;
        }


        const newName =
            nameInput.value.trim();

        const newPhone =
            phoneInput.value.trim();


        if (!newName || !newPhone) {

            showNotification(
                "Please enter your name and phone number."
            );

            return;
        }


        // Update ONLY this customer's account
        accounts[accountIndex].name =
            newName;

        accounts[accountIndex].phone =
            newPhone;


        saveZobacAccounts(accounts);


        savedName.textContent =
            newName;

        savedPhone.textContent =
            newPhone;


        nameInput.readOnly = true;
        phoneInput.readOnly = true;

        saveBtn.style.display = "none";
        editBtn.style.display = "inline-block";


        showNotification(
            "Your information has been saved! 👤"
        );

    });

});
// ===============================
// UPDATE NAVBAR LINKS
// ===============================

 // UPDATE NAVBAR LINKS
document.addEventListener("DOMContentLoaded", async function () {
    const registerLinks = document.querySelectorAll(
        '.nav-links a[href="register.html"], .nav-links a[href="account.html"]'
    );

    try {
        const response = await fetch("/api/customer/session", {
            credentials: "same-origin"
        });

        if (!response.ok) {
            throw new Error("Could not check customer session.");
        }

        const result = await response.json();
        const isLoggedIn = result.authenticated === true;

        registerLinks.forEach(function (link) {
            if (isLoggedIn) {
                link.href = "account.html";
                link.textContent = "👤 Account";
            } else {
                link.href = "register.html";
                link.textContent = "📝 Register";
            }
        });

    } catch (error) {
        console.error("Could not update navbar links:", error);
    }
});




// SIGN OUT CONFIRMATION
document.addEventListener("DOMContentLoaded", function () {
    const signOutBtn = document.getElementById("signOutBtn");
    const signOutModal = document.getElementById("signOutModal");
    const confirmSignOutBtn = document.getElementById("confirmSignOutBtn");
    const cancelSignOutBtn = document.getElementById("cancelSignOutBtn");

    if (signOutBtn && signOutModal) {
        signOutBtn.addEventListener("click", function () {
            signOutModal.style.display = "flex";
        });
    }

    if (cancelSignOutBtn && signOutModal) {
        cancelSignOutBtn.addEventListener("click", function () {
            signOutModal.style.display = "none";
        });
    }

    if (confirmSignOutBtn) {
        confirmSignOutBtn.addEventListener("click", async function () {
            confirmSignOutBtn.disabled = true;

            try {
                // End the customer session on the server.
                const response = await fetch("/api/customer/logout", {
                    method: "POST",
                    credentials: "same-origin"
                });

                if (!response.ok) {
                    throw new Error("Could not sign out.");
                }

                // Clear the old browser-only login information.
                localStorage.removeItem("zobacLoggedIn");
                localStorage.removeItem("zobacCurrentEmail");

                const accountMenu = document.querySelector(".account-menu");

                if (accountMenu) {
                    accountMenu.style.display = "none";
                }

                window.location.href = "login.html";

            } catch (error) {
                console.error("Sign-out failed:", error);

                alert(
                    "Could not contact the server to sign out. Please try again."
                );

                confirmSignOutBtn.disabled = false;
            }
        });
    }
});

// CLEAR ACCOUNT INFORMATION
document.addEventListener("DOMContentLoaded", function () {
    const clearAccountBtn = document.getElementById("clearAccountBtn");
    const clearModal = document.getElementById("clearModal");
    const confirmClearBtn = document.getElementById("confirmClearBtn");
    const cancelClearBtn = document.getElementById("cancelClearBtn");

    // Open confirmation popup
    if (clearAccountBtn && clearModal) {
        clearAccountBtn.addEventListener("click", function () {
            clearModal.style.display = "flex";
        });
    }

    // Cancel clearing
    if (cancelClearBtn && clearModal) {
        cancelClearBtn.addEventListener("click", function () {
            clearModal.style.display = "none";
        });
    }

    // Confirm clearing
    if (confirmClearBtn && clearModal) {
        confirmClearBtn.addEventListener("click", function () {
            localStorage.removeItem("zobacAccount");
            localStorage.removeItem("zobacLoggedIn");

            clearModal.style.display = "none";

            alert("Your account information has been cleared.");

            window.location.href = "register.html";
        });
    }
});
// ACCOUNT OPTIONS GRID MENU
document.addEventListener("DOMContentLoaded", function () {
    const menuBtn = document.getElementById("accountMenuBtn");
    const menuOptions = document.getElementById("accountMenuOptions");

    if (menuBtn && menuOptions) {
        menuBtn.addEventListener("click", function () {
            const isHidden = menuOptions.style.display === "none";

            menuOptions.style.display = isHidden ? "grid" : "none";

        });
    }
});
// NAVBAR GRID MENU
document.addEventListener("DOMContentLoaded", function () {
    const gridMenuBtn = document.getElementById("gridMenuBtn");
    const gridMenuOptions = document.getElementById("gridMenuOptions");

    if (gridMenuBtn && gridMenuOptions) {
        gridMenuBtn.addEventListener("click", function () {
            const isHidden = gridMenuOptions.style.display === "none";

            gridMenuOptions.style.display = isHidden ? "flex" : "none";
        });

        document.addEventListener("click", function (event) {
            if (
                !gridMenuBtn.contains(event.target) &&
                !gridMenuOptions.contains(event.target)
            ) {
                gridMenuOptions.style.display = "none";
            }
        });
    }
});
document.addEventListener("DOMContentLoaded", function () {
    const loginBtn = document.getElementById("loginBtn");

    if (loginBtn) {
        loginBtn.addEventListener("click", function (event) {
            event.preventDefault();
        });
    }
});
document.addEventListener("DOMContentLoaded", function () {
    const savePasswordBtn = document.getElementById("savePasswordBtn");

    if (!savePasswordBtn) return;

    savePasswordBtn.addEventListener("click", function (event) {
        event.preventDefault();

        const currentPassword = document.getElementById("currentPassword").value;
        const newPassword = document.getElementById("newPassword").value;
        const confirmNewPassword = document.getElementById("confirmNewPassword").value;
        const message = document.getElementById("passwordMessage");

        message.textContent = "";

        let account;

        try {
            account = JSON.parse(localStorage.getItem("zobacAccount"));
        } catch (error) {
            account = null;
        }

        if (!account) {
            message.style.color = "red";
            message.textContent = "Account not found. Please register first.";
            return;
        }

        if (currentPassword !== account.password) {
            message.style.color = "red";
            message.textContent = "Your current password is incorrect.";
            return;
        }

        if (!newPassword || !confirmNewPassword) {
            message.style.color = "red";
            message.textContent = "Please fill in all password fields.";
            return;
        }

        if (newPassword.length < 6) {
            message.style.color = "red";
            message.textContent = "Your new password must be at least 6 characters.";
            return;
        }

        if (newPassword !== confirmNewPassword) {
            message.style.color = "red";
            message.textContent = "The new passwords do not match.";
            return;
        }

        if (newPassword === currentPassword) {
            message.style.color = "red";
            message.textContent = "New password and old password cannot match.";
            return;
        }

        account.password = newPassword;
        localStorage.setItem("zobacAccount", JSON.stringify(account));

        message.style.color = "green";
        message.textContent = "Password changed successfully!";

        document.getElementById("currentPassword").value = "";
        document.getElementById("newPassword").value = "";
        document.getElementById("confirmNewPassword").value = "";
        setTimeout(function () {
            window.location.href = "account.html";
        }, 1500);
    });
});
document.addEventListener("DOMContentLoaded", function () {

    const heroSlides = document.querySelector(".hero-slides");

    if (!heroSlides) return;

    const originalImages = heroSlides.querySelectorAll("img");

    if (originalImages.length < 2) return;

    const totalSlides = originalImages.length;

    // Duplicate the first image for a smooth loop
    const firstImage = originalImages[0].cloneNode(true);
    heroSlides.appendChild(firstImage);

    const allImages = heroSlides.querySelectorAll("img");

    heroSlides.style.width = `${allImages.length * 100}%`;

    allImages.forEach(function (img) {
        img.style.width = `${100 / allImages.length}%`;
        img.style.flexShrink = "0";
    });

    let currentSlide = 0;

    function slideNext() {

        currentSlide++;

        heroSlides.style.transition = "transform 1s ease-in-out";

        heroSlides.style.transform =
            `translateX(-${currentSlide * (100 / allImages.length)}%)`;

        // When we reach the duplicated first image
        if (currentSlide === totalSlides) {

            setTimeout(function () {

                heroSlides.style.transition = "none";

                currentSlide = 0;

                heroSlides.style.transform = "translateX(0)";

            }, 1000);
        }
    }

    // Pause, then slide left
    setInterval(slideNext, 6000);

});

// ==========================
// SHOP PRODUCT SEARCH
// ==========================

const productSearch = document.getElementById("productSearch");
const searchMessage = document.getElementById("searchMessage");

if (productSearch) {
    productSearch.addEventListener("input", function () {
        const searchTerm = productSearch.value.trim().toLowerCase();
        const products = document.querySelectorAll(".menu-card");
        let visibleCount = 0;

        products.forEach(function (product) {
            const productText = product.textContent.toLowerCase();

            if (productText.includes(searchTerm)) {
                product.style.display = "";
                visibleCount++;
            } else {
                product.style.display = "none";
            }
        });

        if (searchMessage) {
            if (visibleCount === 0) {
                searchMessage.textContent = "No products found. Try another search.";
            } else if (searchTerm !== "") {
                searchMessage.textContent = visibleCount + " product(s) found.";
            } else {
                searchMessage.textContent = "";
            }
        }
    });
}


function getCustomerOrders() {
    const key = getCustomerStorageKey("Orders");

    if (!key) {
        return [];
    }

    try {
        return JSON.parse(localStorage.getItem(key)) || [];
    } catch (error) {
        console.error("Could not read customer orders:", error);
        return [];
    }
}




function setBankDropdown(open) {
    bankDetails.hidden = !open;
    bankDropdownBtn.setAttribute("aria-expanded", String(open));
}
const closeBankDetails = document.getElementById("closeBankDetails");


document.querySelectorAll(".add-to-cart-btn").forEach(function (button) {
    button.addEventListener("click", function () {
        console.log("SHOP BUTTON CLICKED:", button.dataset.product);
    });
});
document.querySelectorAll(".add-to-cart-btn").forEach(function (button) {
    button.addEventListener("click", function () {
        const productName = button.dataset.product;
        const price = Number(button.dataset.price);

        addToCart(productName, price);
    });
});

const checkoutBtn = document.getElementById("checkoutBtn");

if (checkoutBtn) {
    checkoutBtn.addEventListener("click", function () {
        if (typeof goToCheckout === "function") {
            goToCheckout();
        } else {
            console.error("goToCheckout() function was not found.");
        }
    });
}
// Checkout page: handle Place Order button
const placeOrderBtn = document.getElementById("placeOrderBtn");

if (placeOrderBtn) {
    placeOrderBtn.addEventListener("click", function () {
        if (typeof placeOrder === "function") {
            placeOrder();
        } else {
            console.error("placeOrder() function was not found.");
        }
    });
}

/* ORDERS PAGE: Check the real backend login session */

document.addEventListener("DOMContentLoaded", async function () {
    const ordersList = document.getElementById("ordersList");

    // Do nothing on pages other than orders.html.
    if (!ordersList) return;

    try {
        const response = await fetch("/api/customer/session", {
            credentials: "same-origin"
        });

        const result = await response.json();

        if (!response.ok || result.authenticated !== true) {
            window.location.href = "login.html";
            return;
        }

        // The server confirms login. Save the customer's email
        // so the existing customer-specific order storage can work.
        if (result.customer && result.customer.email) {
            localStorage.setItem(
                "zobacCurrentEmail",
                result.customer.email.trim().toLowerCase()
            );
        }

        // Load orders after confirming login.
        await showOrders();

    } catch (error) {
        console.error("Could not verify login for Orders:", error);
        ordersList.innerHTML =
            "<p>Could not connect to the bakery server. Please try again.</p>";
    }
});



 // Navbar Login button
const navbarLoginBtn = document.querySelector(".nav-links #loginBtn");

if (navbarLoginBtn) {
    navbarLoginBtn.addEventListener("click", function (event) {
        event.preventDefault();
        window.location.href = "login.html";
    });
}


// Login popup button
const loginPopupBtn = document.getElementById("loginPopupBtn");

if (loginPopupBtn) {
    loginPopupBtn.addEventListener("click", function () {
        window.location.href = "login.html";
    });
}

document.addEventListener("DOMContentLoaded", function () {
    const goBackBtn = document.getElementById("goBackBtn");

    if (goBackBtn) {
        goBackBtn.addEventListener("click", function (event) {
            event.preventDefault();
            window.location.href = "account.html";
        });
    }
});


/* CUSTOMER REVIEW POPUP */
document.addEventListener("DOMContentLoaded", function () {
    const reviewModal = document.getElementById("reviewModal");
    const reviewForm = document.getElementById("reviewForm");
    const reviewStars = document.querySelectorAll("#reviewStars button");
    const reviewOrderNumber = document.getElementById("reviewOrderNumber");
    const reviewComment = document.getElementById("reviewComment");
    const reviewMessage = document.getElementById("reviewMessage");
    const closeReviewBtn = document.getElementById("closeReviewBtn");
    const skipReviewBtn = document.getElementById("skipReviewBtn");

    if (!reviewModal || !reviewForm) return;

    let selectedRating = 0;
    let currentReviewOrder = null;

    function hideReviewPopup() {
        if (currentReviewOrder) {
            sessionStorage.setItem(
                "zobacReviewDismissed_" + currentReviewOrder,
                "true"
            );
        }

        reviewModal.style.display = "none";
    }

  
async function checkForDeliveredOrderReview() {
    if (reviewModal.style.display === "flex") return;

    try {
        const response = await fetch(
            "/api/customer/reviewable-orders",
            { credentials: "same-origin" }
        );

        if (!response.ok) return;

        const orders = await response.json();

        currentReviewOrder = orders.find(order =>
            !sessionStorage.getItem(
                "zobacReviewDismissed_" + order.orderNumber
            )
        );

        if (!currentReviewOrder) return;

        selectedRating = 0;
        reviewForm.reset();

        reviewStars.forEach(star =>
            star.classList.remove("selected")
        );

        reviewOrderNumber.textContent =
            "Order: " + currentReviewOrder.orderNumber;

        reviewMessage.textContent = "";
        reviewModal.style.display = "flex";

    } catch (error) {
        console.error("Could not check reviewable orders:", error);
    }
}


    reviewStars.forEach(star => {
        star.addEventListener("click", function () {
            selectedRating = Number(this.dataset.rating);

            reviewStars.forEach(button => {
                button.classList.toggle(
                    "selected",
                    Number(button.dataset.rating) <= selectedRating
                );
            });
        });
    });

    closeReviewBtn?.addEventListener("click", hideReviewPopup);
    skipReviewBtn?.addEventListener("click", hideReviewPopup);

   
reviewForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!currentReviewOrder) return;

    if (selectedRating < 1 || selectedRating > 5) {
        reviewMessage.textContent = "Please select a star rating.";
        return;
    }

    const comment = reviewComment.value.trim();

    if (!comment) {
        reviewMessage.textContent = "Please write a comment.";
        return;
    }

    const submitButton = document.getElementById("submitReviewBtn");
    submitButton.disabled = true;
    submitButton.textContent = "Submitting...";

    try {
        const response = await fetch("/api/reviews", {
            method: "POST",
            credentials: "same-origin",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                orderNumber: currentReviewOrder.orderNumber,
                rating: selectedRating,
                comment: comment
            })
        });

        const result = await response.json();

        if (!response.ok) {
            reviewMessage.textContent =
                result.message || "Could not submit your review.";
            return;
        }

        localStorage.setItem(
            "zobacReviewSubmitted_" + currentReviewOrder.orderNumber,
            "true"
        );

        reviewMessage.textContent = result.message;
        currentReviewOrder = null;

        setTimeout(() => {
            reviewModal.style.display = "none";
        }, 1500);

    } catch (error) {
        console.error("Review submission failed:", error);
        reviewMessage.textContent =
            "Connection error. Please try again.";
    } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Submit Review";
    }
});


   window.checkForDeliveredOrderReview = checkForDeliveredOrderReview;

checkForDeliveredOrderReview();

setInterval(checkForDeliveredOrderReview, 10000);
});

// =====================================
// ZOBAC BAKERY - HOMEPAGE CUSTOMER REVIEWS
// =====================================

async function loadHomepageReviews() {
    const reviewsList = document.getElementById("reviewsList");

    if (!reviewsList) return;

    try {
        const response = await fetch("/api/reviews", {
            credentials: "same-origin"
        });

        if (!response.ok) {
            throw new Error("Could not load reviews.");
        }

        const reviews = await response.json();

        reviewsList.replaceChildren();

        if (!Array.isArray(reviews) || reviews.length === 0) {
            const message = document.createElement("p");
            message.className = "reviews-loading";
            message.textContent =
                "No customer reviews yet. Be the first to share your experience!";
            reviewsList.appendChild(message);
            return;
        }

        reviews.forEach(review => {
            const card = document.createElement("article");
            card.className = "homepage-review-card";

            const stars = document.createElement("div");
            stars.className = "homepage-review-stars";

            const rating = Math.max(
                0,
                Math.min(5, Number(review.rating) || 0)
            );

            stars.textContent = "★".repeat(rating) + "☆".repeat(5 - rating);
            stars.setAttribute("aria-label", `${rating} out of 5 stars`);

            const comment = document.createElement("p");
            comment.className = "homepage-review-comment";
            comment.textContent = `“${review.comment || ""}”`;

            const customer = document.createElement("h3");
            customer.className = "homepage-review-customer";
            customer.textContent = review.customerName || "Zobac Customer";

            const verified = document.createElement("p");
            verified.className = "homepage-review-verified";
            verified.textContent = "♥ A valued Zobac customer";

            card.append(stars, comment, customer, verified);

            reviewsList.appendChild(card);
        });

    } catch (error) {
        console.error("Homepage reviews error:", error);

        reviewsList.replaceChildren();

        const message = document.createElement("p");
        message.className = "reviews-loading";
        message.textContent =
            "Customer reviews are temporarily unavailable.";

        reviewsList.appendChild(message);
    }
}

loadHomepageReviews();