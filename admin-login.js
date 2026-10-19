
const API_BASE_URL = "https://zobac-bakery-8kqp.onrender.com";

const loginForm = document.getElementById("adminLoginForm");
const message = document.getElementById("message");
const loginButton = document.getElementById("loginButton");

loginForm.addEventListener("submit", async function (event) {
    event.preventDefault();

    message.textContent = "";
    loginButton.disabled = true;
    loginButton.textContent = "Logging in...";

    try {
        const response = await fetch(`${API_BASE_URL}/api/admin/login`, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: document.getElementById("username").value.trim(),
                password: document.getElementById("password").value
            })
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            message.textContent =
                result.message || "Login failed. Please check your details.";
            return;
        }

        window.location.href = "admin.html";

    } catch (error) {
        console.error("Admin login error:", error);

        message.textContent =
            "Could not connect to the server. Please try again.";

    } finally {
        loginButton.disabled = false;
        loginButton.textContent = "Log In";
    }
});
