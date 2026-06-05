document.addEventListener("DOMContentLoaded", () => {
    // Simulador de desbloqueo de interfaz por si manejas candado de sesión
    document.body.style.display = "block"; 

    const btnSeccionComentarios = document.getElementById("btnSeccionComentarios");
    const contentArea = document.getElementById("content");
    
    let listaComentarios = [];

    if (btnSeccionComentarios) {
        btnSeccionComentarios.addEventListener("click", abrirSeccionComentarios);
    }

    async function abrirSeccionComentarios() {
        contentArea.innerHTML = `<p class="loading-text">Cargando comentarios desde Supabase...</p>`;
        
        try {
            // Descargar la base de opiniones completa
            const { data, error } = await supabaseClient
                .from('foro_opiniones')
                .select('*')
                .order('id', { ascending: false });

            if (error) throw error;
            listaComentarios = data || [];

            // 1. Montar el esqueleto HTML (Sección de métricas + filtros + tabla)
            contentArea.innerHTML = `
                <h2 style="color: #1f78b4; margin-top: 0;">💬 Moderación y Análisis del Foro</h2>
                
                <div class="charts-wrapper">
                    <div class="chart-box">
                        <h4>Distribución por Edades</h4>
                        <canvas id="chartEdades"></canvas>
                    </div>
                    <div class="chart-box">
                        <h4>¿Asisten Continuamente?</h4>
                        <canvas id="chartAsistencia"></canvas>
                    </div>
                </div>

                <div class="filter-wrapper">
                    <label for="adminFiltroEstrellas"><strong>Filtrar Tabla por Calificación:</strong></label>
                    <select id="adminFiltroEstrellas">
                        <option value="todas">Ver Todas</option>
                        <option value="5">★★★★★ (5 Estrellas)</option>
                        <option value="4">★★★★ (4 Estrellas)</option>
                        <option value="3">★★★ (3 Estrellas)</option>
                        <option value="2">★★ (2 Estrellas)</option>
                        <option value="1">★ (1 Estrella)</option>
                    </select>
                </div>

                <div style="overflow-x: auto;">
                    <table>
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Edad</th>
                                <th>Asiste</th>
                                <th>Calificación</th>
                                <th>Comentario</th>
                                <th>Acción</th>
                            </tr>
                        </thead>
                        <tbody id="tbodyComentarios"></tbody>
                    </table>
                </div>
            `;

            // 2. Desplegar los gráficos circulares
            generarEstadisticasCharts(listaComentarios);

            // 3. Renderizar filas iniciales de la tabla
            filtrarYMostrarTabla("todas");

            // 4. Activar el evento de filtrado interactivo
            document.getElementById("adminFiltroEstrellas").addEventListener("change", (e) => {
                filtrarYMostrarTabla(e.target.value);
            });

        } catch (err) {
            contentArea.innerHTML = `<p style="color:red; text-align:center;">Error al cargar datos: ${err.message}</p>`;
        }
    }

    // --- FUNCIÓN RENDERIZADORA DE TABLA CON ACCESO TOTAL ---
    function filtrarYMostrarTabla(estrellasFiltro) {
        const tbody = document.getElementById("tbodyComentarios");
        if (!tbody) return;
        
        tbody.innerHTML = "";

        let filtrados = listaComentarios;
        if (estrellasFiltro !== "todas") {
            filtrados = listaComentarios.filter(c => c.calificacion == parseInt(estrellasFiltro));
        }

        if (filtrados.length === 0) {
            tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#888;">No se encontraron comentarios bajo este criterio.</td></tr>`;
            return;
        }

        filtrados.forEach(comentario => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${comentario.nombre}</strong></td>
                <td>${comentario.edad}</td>
                <td><span style="padding: 2px 8px; border-radius:4px; font-weight:bold; background-color: ${comentario.asistencia === 'Sí' ? '#c6f6d5; color: #22543d' : '#fed7d7; color: #742a2a'}">${comentario.asistencia}</span></td>
                <td style="color: #ecc94b; font-size:1.1em;">${'★'.repeat(comentario.calificacion)}</td>
                <td style="max-width: 300px; word-wrap: break-word; color:#4a5568;">${comentario.comentario}</td>
                <td>
                    <button class="btn-delete" data-id="${comentario.id}">Eliminar</button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Enganchar botones de eliminación remota
        const botonesEliminar = tbody.querySelectorAll(".btn-delete");
        botonesEliminar.forEach(btn => {
            btn.addEventListener("click", async (e) => {
                const idEliminar = e.target.getAttribute("data-id");
                if (confirm("¿Estás completamente seguro de que deseas remover este comentario de forma permanente del foro público?")) {
                    try {
                        const { error } = await supabaseClient
                            .from('foro_opiniones')
                            .delete()
                            .eq('id', idEliminar);

                        if (error) throw error;
                        alert("El comentario fue eliminado con éxito de los servidores.");
                        abrirSeccionComentarios(); // Refrescar vista completa
                    } catch (err) {
                        alert("No se pudo eliminar el comentario: " + err.message);
                    }
                }
            });
        });
    }

    // --- CÁLCULO ESTADÍSTICO MATEMÁTICO Y CONSTRUCCIÓN DE CANVAS ---
    function generarEstadisticasCharts(datos) {
        // Inicializar contadores estructurados
        const edadesConteo = { "Menos de 18": 0, "18-29": 0, "30-45": 0, "46-60": 0, "Más de 60": 0 };
        const asistenciaConteo = { "Sí": 0, "No": 0 };

        datos.forEach(item => {
            if (edadesConteo[item.edad] !== undefined) edadesConteo[item.edad]++;
            if (asistenciaConteo[item.asistencia] !== undefined) asistenciaConteo[item.asistencia]++;
        });

        // Gráfico 1: Segmento de Edades
        const ctxEdades = document.getElementById('chartEdades').getContext('2d');
        new Chart(ctxEdades, {
            type: 'doughnut',
            data: {
                labels: Object.keys(edadesConteo),
                datasets: [{
                    data: Object.values(edadesConteo),
                    backgroundColor: ['#4299e1', '#48bb78', '#ecc94b', '#ed64a6', '#9f7aea'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'bottom' } }
            }
        });

        // Gráfico 2: Nivel de Asistencia
        const ctxAsistencia = document.getElementById('chartAsistencia').getContext('2d');
        new Chart(ctxAsistencia, {
            type: 'doughnut',
            data: {
                labels: Object.keys(asistenciaConteo),
                datasets: [{
                    data: Object.values(asistenciaConteo),
                    backgroundColor: ['#2f855a', '#c53030'],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'bottom' } }
            }
        });
    }
});