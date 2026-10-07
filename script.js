// CHECK LOGIN STATUS
document.addEventListener("DOMContentLoaded", function () {
    const isLoggedIn =
        localStorage.getItem("zobacLoggedIn") === "true";
   
    const loginBtn = document.getElementById("loginBtn");
    const accountMenu = document.querySelector(".account-menu");

    if (loginBtn) {
        loginBtn.style.display = isLoggedIn ? "none" : "inline-block";
    }

    if (accountMenu) {
        accountMenu.style.display = isLoggedIn ? "inline-block" : "none";
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

        return savedCart.map(function(item) {
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

    const existingItem = cart.find(function(item) {
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

    const cartItems =
        document.getElementById("cartItems");

    const cartTotal =
        document.getElementById("cartTotal");

    if (!cartItems || !cartTotal) {
        return;
    }

    cartItems.innerHTML = "";

    if (cart.length === 0) {

        cartItems.innerHTML =
            "<p>Your cart is empty.</p>";

        cartTotal.textContent =
            "Total: ₦0";

        updateCartCount();

        return;
    }

    let total = 0;

    cart.forEach(function(item, index) {

        total += item.price * item.quantity;

        let customDetails = "";

        if (item.customization) {

            // CAKE
            if (
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
        }

        cartItems.innerHTML += `
            <div class="cart-item">

                <p>
                    <strong>${item.name}</strong>
                    <br>
                    ₦${item.price.toLocaleString()} × ${item.quantity}
                </p>

                ${customDetails}

                <button onclick="decreaseQuantity(${index})">
                    −
                </button>

                <span>${item.quantity}</span>

                <button onclick="increaseQuantity(${index})">
                    +
                </button>

                <button onclick="removeFromCart(${index})">
                    Remove
                </button>

            </div>
        `;
    });

    cartTotal.textContent =
        "Total: ₦" + total.toLocaleString();

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

    cart.forEach(function(item) {

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

function getCustomerOrders() {

    const key =
        getCustomerStorageKey("Orders");

    if (!key) {
        return [];
    }

    try {
        return JSON.parse(
            localStorage.getItem(key)
        ) || [];

    } catch (error) {

        return [];
    }
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

function placeOrder() {

    const name =
        document.getElementById("customerName").value.trim();

    const phone =
        document.getElementById("customerPhone").value.trim();

    const address =
        document.getElementById("customerAddress").value.trim();

    const date =
        document.getElementById("deliveryDate").value;


    if (
        name === "" ||
        phone === "" ||
        address === "" ||
        date === ""
    ) {

        showNotification(
            "Please fill in all your details."
        );

        return;
    }


    if (cart.length === 0) {

        showNotification(
            "Your cart is empty."
        );

        return;
    }


    const orderMessage =
        document.getElementById("orderMessage");


    const orderNumber =
        Math.floor(
            100000 + Math.random() * 900000
        );


    orderMessage.textContent =
        "Order placed successfully! 🎉 Order: ZOBAC-" +
        orderNumber;

    orderMessage.style.color =
        "#6b247f";

    orderMessage.style.fontWeight =
        "bold";


    document.getElementById(
        "homeAfterOrder"
    ).style.display = "inline-block";


    document.getElementById(
        "viewOrderBtn"
    ).style.display = "inline-block";


    // Get ONLY this customer's orders
    const orders =
        getCustomerOrders();


    orders.push({

        orderNumber:
            "ZOBAC-" + orderNumber,

        name: name,

        phone: phone,

        address: address,

        deliveryDate: date,

        status: "Order Received",

        items: cart,

        total: cart.reduce(
            function(sum, item) {
                return sum +
                    item.price * item.quantity;
            },
            0
        )
    });


    // Save ONLY to this customer's order storage
    saveCustomerOrders(orders);


    // Empty ONLY this customer's cart
    cart = [];

    saveCart();

    updateCartCount();
}


// ===============================
// SHOW ORDERS
// ===============================

function showOrders() {

    const ordersList =
        document.getElementById("ordersList");

    if (!ordersList) {
        return;
    }


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
        function(order) {

            let itemsHTML = "";


            order.items.forEach(
                function(item) {

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
                        <strong>Status:</strong>

                        <span class="order-status">
                            🟠 ${order.status}
                        </span>
                    </p>

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
        function() {

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
                    function(order) {

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
        function() {

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


    cart.forEach(function(item) {

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

    window.location.href =
        "checkout.html";
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
        function() {

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

    cakeSize.onchange = function() {

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

    cakeSizeSelect.onchange = function() {

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

    customCakeBtn.onclick = function() {

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


        setTimeout(function() {
            window.location.href = "shop.html";
        }, 1000);

    };

}
function goToCheckout(){
    if (cart.length === 0){
        showNotification("Your cart is empty. Please add an item first.");
        return;
    }
    window.location.href="checkout.html";
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

    setTimeout(function() {
        notification.classList.remove("show");
    }, 3000);
}
function updateCartCount() {

    const cartCount = document.getElementById("cartCount");

    if (!cartCount) return;

    let totalItems = 0;

    cart.forEach(function(item) {
        totalItems += item.quantity;
    });

    cartCount.textContent = totalItems;
}

updateCartCount();
const backToTop = document.getElementById("backToTop");
if (backToTop) {
    backToTop.onclick= function() {
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

    shawarmaSizeSelect.onchange = function() {

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

    shawarmaBtn.onclick = function() {

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


        setTimeout(function() {

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

    pizzaSizeSelect.onchange = function() {

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

    pizzaBtn.onclick = function() {

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


        setTimeout(function() {

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

    return accounts.find(function(account) {
        return (
            (account.email || "").toLowerCase() === email
        );
    }) || null;
}


// ===============================
// REGISTRATION
// ===============================

document.addEventListener("DOMContentLoaded", function() {

    const registerBtn =
        document.getElementById("registerBtn");

    if (!registerBtn) return;


    registerBtn.addEventListener("click", function() {

        const name =
            document.getElementById("registerName").value.trim();

        const email =
            document.getElementById("registerEmail").value.trim().toLowerCase();

        const phone =
            document.getElementById("registerPhone").value.trim();

        const password =
            document.getElementById("registerPassword").value;

        const confirmPassword =
            document.getElementById("confirmPassword").value;

        const message =
            document.getElementById("registerMessage");


        if (
            !name ||
            !email ||
            !phone ||
            !password ||
            !confirmPassword
        ) {
            message.textContent =
                "Please fill in all fields.";

            message.style.color = "red";
            return;
        }


        if (password.length < 6) {

            message.textContent =
                "Password must be at least 6 characters.";

            message.style.color = "red";
            return;
        }


        if (password !== confirmPassword) {

            message.textContent =
                "Passwords do not match.";

            message.style.color = "red";
            return;
        }


        const accounts = getZobacAccounts();


        // Check this email only
        const existingAccount =
            accounts.find(function(account) {

                return (
                    (account.email || "").toLowerCase() ===
                    email
                );

            });


        if (existingAccount) {

            message.textContent =
                "An account with this email already exists.";

            message.style.color = "red";
            return;
        }


        // Create new account
        const newAccount = {

            name: name,

            email: email,

            phone: phone,

            password: password

        };


        // Add it without deleting other customers
        accounts.push(newAccount);


        saveZobacAccounts(accounts);


        message.textContent =
            "Registration successful!";

        message.style.color = "green";


        setTimeout(function() {

            window.location.href =
                "login.html";

        }, 1000);

    });

});


// ===============================
// LOGIN
// ===============================

document.addEventListener("DOMContentLoaded", function() {

    const loginBtn =
        document.getElementById("loginBtn");

    const emailInput =
        document.getElementById("loginEmail");

    const passwordInput =
        document.getElementById("loginPassword");

    const message =
        document.getElementById("loginMessage");


    if (
        !loginBtn ||
        !emailInput ||
        !passwordInput ||
        !message
    ) {
        return;
    }


    // Remember the last email typed
    const rememberedEmail =
        localStorage.getItem("zobacLoginEmail");

    if (rememberedEmail) {
        emailInput.value = rememberedEmail;
    }


    loginBtn.addEventListener("click", function(event) {

        event.preventDefault();


        const email =
            emailInput.value.trim().toLowerCase();

        const password =
            passwordInput.value;


        message.textContent = "";


        if (!email || !password) {

            message.style.color = "red";

            message.textContent =
                "Please enter your email and password.";

            return;
        }


        const accounts = getZobacAccounts();


        // Find the account belonging to THIS email
        const account =
            accounts.find(function(account) {

                return (
                    (account.email || "").toLowerCase() ===
                    email
                );

            });


        if (!account) {

            message.style.color = "red";

            message.textContent =
                "Account not found. Please register first.";

            return;
        }


        // Check this customer's password
        if (account.password !== password) {

            message.style.color = "red";

            message.textContent =
                "Incorrect email or password.";

            return;
        }


        // Remember THIS customer
        localStorage.setItem(
            "zobacCurrentEmail",
            email
        );


        // Keep your existing login system working
        localStorage.setItem(
            "zobacLoginEmail",
            email
        );

        localStorage.setItem(
            "zobacLoggedIn",
            "true"
        );


        message.style.color = "green";

        message.textContent =
            "Login successful!";


        setTimeout(function() {

            window.location.href =
                "index.html";

        }, 500);

    });

});


// ===============================
// LOAD CURRENT ACCOUNT
// ===============================

document.addEventListener("DOMContentLoaded", function() {

    const accountName =
        document.getElementById("accountName");

    const accountPhone =
        document.getElementById("accountPhone");

    const savedName =
        document.getElementById("savedName");

    const savedPhone =
        document.getElementById("savedPhone");


    // Only run on account.html
    if (
        !accountName ||
        !accountPhone ||
        !savedName ||
        !savedPhone
    ) {
        return;
    }


    const account =
        getCurrentAccount();


    if (!account) {

        accountName.value = "";
        accountPhone.value = "";

        savedName.textContent =
            "Not saved yet";

        savedPhone.textContent =
            "Not saved yet";

        return;
    }


    // Load THIS email's information
    accountName.value =
        account.name || "";

    accountPhone.value =
        account.phone || "";

    savedName.textContent =
        account.name || "Not saved yet";

    savedPhone.textContent =
        account.phone || "Not saved yet";

});


// ===============================
// EDIT ACCOUNT INFORMATION
// ===============================

document.addEventListener("DOMContentLoaded", function() {

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
    editBtn.addEventListener("click", function() {

        nameInput.readOnly = false;
        phoneInput.readOnly = false;

        editBtn.style.display = "none";
        saveBtn.style.display = "inline-block";

    });


    // SAVE
    saveBtn.addEventListener("click", function() {

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
            accounts.findIndex(function(account) {

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
document.addEventListener("DOMContentLoaded", function () {
    const account = JSON.parse(localStorage.getItem("zobacAccount"));
    console.log("Login status:", localStorage.getItem("zobacLoggedIn"));
      

    // Only change Register links inside the navbar
    const registerLinks = document.querySelectorAll(
        '.nav-links a[href="register.html"]'
    );

    registerLinks.forEach(function (link) {
        if (account && isLoggedIn) {
            link.href = "account.html";
            link.textContent = "👤 Account";
        } else if (account && !isLoggedIn) {
            link.href = "login.html";
            link.textContent = "🔐 Login";
        } else {
            link.href = "register.html";
            link.textContent = "📝 Register";
        }
    });
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
    confirmSignOutBtn.addEventListener("click", function () {
        localStorage.removeItem("zobacLoggedIn");

        const accountMenu = document.querySelector(".account-menu");
        if (accountMenu) {
            accountMenu.style.display = "none";
        }

        window.location.href = "index.html";
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
        setTimeout(function() {
            window.location.href="account.html";
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
