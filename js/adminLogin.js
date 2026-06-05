document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const errorMessage = document.getElementById("error-message");

    if (loginForm) {
        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            errorMessage.style.display = "none";

            const email = document.getElementById("username").value.trim();
            const password = document.getElementById("password").value.trim();

            try {
                // USANDO SUPABASE AUTH (Seguro y recomendado)
                const { data, error } = await supabaseClient.auth.signInWithPassword({
                    email: email,
                    password: password,
                });

                if (error) throw error;

                // Si no hay error, Supabase ya creó la sesión automáticamente.
                // Ya no necesitas guardar nada en localStorage manualmente.
                window.location.href = "adminDashboard.html";
                
            } catch (err) {
                console.error("Error:", err.message);
                errorMessage.textContent = "Correo o contraseña incorrectos.";
                errorMessage.style.display = "block";
            }
        });
    }
});
