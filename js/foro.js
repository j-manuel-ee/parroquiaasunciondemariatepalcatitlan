document.addEventListener("DOMContentLoaded", () => {
    const formOpinion = document.getElementById('formOpinion');
    const contOpiniones = document.getElementById('contOpiniones');
    const filtroEstrellas = document.getElementById('filtroEstrellas');
    
    let opinionesGlobal = []; // Caché local para filtrar velozmente sin saturar Supabase

    // --- CARGAR OPINIONES DESDE SUPABASE ---
    async function cargarOpiniones() {
        try {
            // Descargar datos ordenando por ID descendente (los más recientes primero)
            const { data, error } = await supabaseClient
                .from('foro_opiniones')
                .select('*')
                .order('id', { ascending: false });

            if (error) throw error;

            opinionesGlobal = data || [];
            renderOpiniones(filtroEstrellas.value);

        } catch (err) {
            console.error("Error al cargar opiniones del foro:", err.message);
            contOpiniones.innerHTML = `<h3>Opiniones de la Comunidad</h3><p style="color:red; text-align:center;">No se pudieron desplegar los comentarios. Inténtalo más tarde.</p>`;
        }
    }

    // --- RENDERIZAR EN INTERFAZ CON FILTROS ---
    function renderOpiniones(filtro = "todas") {
        // Reiniciar contenedor manteniendo el título original
        contOpiniones.innerHTML = '<h3>Opiniones de la Comunidad</h3>';

        let filtradas = opinionesGlobal;
        if (filtro !== "todas") {
            filtradas = opinionesGlobal.filter(op => op.calificacion == parseInt(filtro));
        }

        if (filtradas.length === 0) {
            contOpiniones.innerHTML += `<p style="text-align:center; color:#777; font-style:italic; padding: 20px;">No hay opiniones publicadas con esta calificación.</p>`;
            return;
        }

        // Crear dinámicamente las tarjetas emulando tu diseño original
        filtradas.forEach(op => {
            let div = document.createElement('div');
            div.classList.add('opinion');
            
            // Reemplazar la calificación numérica por estrellas visuales duraderas
            const estrellasVisuales = '★'.repeat(op.calificacion) + '☆'.repeat(5 - op.calificacion);

            div.innerHTML = `
                <div class="nombre">${op.nombre} (${op.edad} años, Asiste a: ${op.asistencia})</div>
                <div class="estrellas" style="color: #ecc94b;">${estrellasVisuales}</div>
                <div class="detalle">${op.comentario}</div>
            `;
            contOpiniones.appendChild(div);
        });
    }

    // --- ESCUCHAR CAMBIOS EN EL FILTRO ---
    filtroEstrellas.addEventListener('change', () => {
        renderOpiniones(filtroEstrellas.value);
    });

    // --- GUARDAR NUEVO COMENTARIO EN SUPABASE ---
    if (formOpinion) {
        formOpinion.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Obtener los valores sanitizados del DOM
            const nombre = document.getElementById('nombre').value.trim();
            const edad = parseInt(document.getElementById('edad').value);
            const asistencia = document.getElementById('asistencia').value;
            const calificacion = parseInt(document.getElementById('calificacion').value);
            const comentario = document.getElementById('comentario').value.trim();

            try {
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
            }
        });
    }

    // Ejecución inicial automática al cargar la web
    cargarOpiniones();
});