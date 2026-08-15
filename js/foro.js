document.addEventListener("DOMContentLoaded", () => {
    const formOpinion = document.getElementById('formOpinion');
    const contOpiniones = document.getElementById('contOpiniones');
    const filtroEstrellas = document.getElementById('filtroEstrellas');
    
    let opinionesGlobal = []; // Caché local para filtrar velozmente sin saturar Supabase

    // --- FUNCIÓN DE SANITIZACIÓN ANTI-XSS ---
    function escapeHTML(str) {
        if (!str) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    // --- CARGAR OPINIONES DESDE SUPABASE ---
    async function cargarOpiniones() {
        if (!contOpiniones) return;

        try {
            // Estado visual de carga
            contOpiniones.innerHTML = `<h3>Opiniones de la Comunidad</h3><p style="text-align:center; color:#666; font-style:italic; padding: 15px;">Cargando comentarios...</p>`;

            // Descargar datos ordenando por ID descendente (los más recientes primero)
            const { data, error } = await supabaseClient
                .from('foro_opiniones')
                .select('*')
                .order('id', { ascending: false });

            if (error) throw error;

            opinionesGlobal = data || [];
            const filtroActual = filtroEstrellas ? filtroEstrellas.value : "todas";
            renderOpiniones(filtroActual);

        } catch (err) {
            console.error("Error al cargar opiniones del foro:", err.message);
            contOpiniones.innerHTML = `<h3>Opiniones de la Comunidad</h3><p style="color:#c53030; text-align:center; padding: 15px;">No se pudieron desplegar los comentarios. Inténtalo más tarde.</p>`;
        }
    }

    // --- RENDERIZAR EN INTERFAZ CON FILTROS ---
    function renderOpiniones(filtro = "todas") {
        if (!contOpiniones) return;

        // Reiniciar contenedor manteniendo el título original
        contOpiniones.innerHTML = '<h3>Opiniones de la Comunidad</h3>';

        let filtradas = opinionesGlobal;
        if (filtro !== "todas") {
            filtradas = opinionesGlobal.filter(op => op.calificacion === parseInt(filtro, 10));
        }

        if (filtradas.length === 0) {
            contOpiniones.innerHTML += `<p style="text-align:center; color:#777; font-style:italic; padding: 20px;">No hay opiniones publicadas con esta calificación.</p>`;
            return;
        }

        // Crear dinámicamente las tarjetas sanitizando las entradas de texto
        filtradas.forEach(op => {
            const div = document.createElement('div');
            div.classList.add('opinion');
            
            // Reemplazar la calificación numérica por estrellas visuales duraderas
            const numEstrellas = Math.min(Math.max(parseInt(op.calificacion, 10) || 0, 0), 5);
            const estrellasVisuales = '★'.repeat(numEstrellas) + '☆'.repeat(5 - numEstrellas);

            div.innerHTML = `
                <div class="nombre">${escapeHTML(op.nombre)} (${escapeHTML(op.edad)} años, Asiste a: ${escapeHTML(op.asistencia)})</div>
                <div class="estrellas" style="color: #ecc94b;">${estrellasVisuales}</div>
                <div class="detalle">${escapeHTML(op.comentario)}</div>
            `;
            contOpiniones.appendChild(div);
        });
    }

    // --- ESCUCHAR CAMBIOS EN EL FILTRO ---
    if (filtroEstrellas) {
        filtroEstrellas.addEventListener('change', () => {
            renderOpiniones(filtroEstrellas.value);
        });
    }

    // --- GUARDAR NUEVO COMENTARIO EN SUPABASE ---
    if (formOpinion) {
        formOpinion.addEventListener('submit', async (e) => {
            e.preventDefault();

            const submitBtn = formOpinion.querySelector('button[type="submit"]');

            // Obtener los valores sanitizados del DOM
            const nombre = document.getElementById('nombre').value.trim();
            const edad = parseInt(document.getElementById('edad').value, 10);
            const asistencia = document.getElementById('asistencia').value;
            const calificacion = parseInt(document.getElementById('calificacion').value, 10);
            const comentario = document.getElementById('comentario').value.trim();

            if (!nombre || !comentario || isNaN(edad) || isNaN(calificacion)) {
                alert("Por favor completa todos los campos requeridos.");
                return;
            }

            try {
                // Bloquear botón para prevenir doble envío
                if (submitBtn) {
                    submitBtn.disabled = true;
                    submitBtn.textContent = "Publicando...";
                }

                // Insertar el registro directamente a la base de datos
                const { error } = await supabaseClient
                    .from('foro_opiniones')
                    .insert([{ 
                        nombre: nombre, 
                        edad: edad, 
                        asistencia: asistencia, 
                        calificacion: calificacion, 
                        comentario: comentario 
                    }]);

                if (error) throw error;

                alert("¡Muchas gracias! Tu opinión ha sido publicada con éxito en el foro de la comunidad.");
                formOpinion.reset();
                
                // Recargar el foro inmediatamente para ver el nuevo comentario arriba
                cargarOpiniones();

            } catch (err) {
                console.error("Error al publicar opinión:", err.message);
                alert("Hubo un inconveniente al guardar tu comentario: " + err.message);
            } finally {
                // Desbloquear botón al terminar proceso
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = "Publicar Opinión";
                }
            }
        });
    }

    // Ejecución inicial automática al cargar la web
    cargarOpiniones();
});
