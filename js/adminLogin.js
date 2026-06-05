document.addEventListener("DOMContentLoaded", () => {
    const loginForm = document.getElementById("loginForm");
    const errorMessage = document.getElementById("error-message");

    if (loginForm) {
        loginForm.addEventListener("submit", async (event) => {
            event.preventDefault();
            
            // Ocultar mensaje de error en cada intento
            errorMessage.style.display = "none";

            const username = document.getElementById("username").value.trim();
            const password = document.getElementById("password").value.trim();

            if (username === "" || password === "") {
                errorMessage.textContent = "Todos los campos son obligatorios.";
                errorMessage.style.display = "block";
                return;
            }

            try {
                // Consulta a la tabla de administradores en Supabase
                const { data, error } = await supabaseClient
                    .from("administradores")
                    .select("*")
                    .eq("correo", username)
                    .eq("contrasena", password)
                    .single(); // Esperamos un único registro coincidente

                if (error || !data) {
                    // Si hay error o no encuentra coincidencia, las credenciales están mal
                    errorMessage.textContent = "Correo o contraseña incorrectos. Por favor, inténtelo de nuevo.";
                    errorMessage.style.display = "block";
                } else {
                    // Inicio de sesión exitoso
                    alert("Inicio de sesión exitoso");
                    
                    // Guardamos una bandera temporal en el navegador para autorizar el acceso al dashboard
                    sessionStorage.setItem("admin_autenticado", "true");
                    sessionStorage.setItem("admin_usuario", data.correo);
                    
                    // Redirección oficial a tu panel de administración
                    window.location.href = "adminDashboard.html";
                }
            } catch (err) {
                console.error("Error en la autenticación:", err.message);
                errorMessage.textContent = "Hubo un problema al conectar con el servidor. Inténtalo más tarde.";
                errorMessage.style.display = "block";
            }
        });
    }
});