
const API_BASE_URL = "https://zobac-bakery-8kqp.onrender.com";

const loginForm = document.getElementById("adminLoginForm");
const message = document.getElementById("message");
const loginButton = document.getElementById("loginButton");

if (loginForm && message && loginButton) {
    loginForm.addEventListener("submit", async function (event) {
        event.preventDefault();

        message.textContent = "";
        loginButton.disabled = true;
        loginButton.textContent = "Logging in...";

        try {
            const response = await fetch(
                `${API_BASE_URL}/api/admin/login`,
                {
                    method: "POST",
                    credentials: "include",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        username: document.getElementById("username").value.trim(),
                        password: document.getElementById("password").value
                    })
                }
            );

            const result = await response.json();

            if (!response.ok || result.success !== true) {
                throw new Error(
                    result.message || "Login failed. Check your details."
                );
            }

            window.location.href = "admin.html";

        } catch (error) {
            console.error("Admin login error:", error);

            message.textContent =
                error.message || "Could not connect to the server.";

        } finally {
            loginButton.disabled = false;
            loginButton.textContent = "Log In";
        }
    });
} else {
    console.error(
        "Admin login form elements are missing. Check the IDs in admin-login.html."
    );
}
