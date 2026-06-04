let alumnoSeleccionado = null;

// ==========================================
// 1. INICIALIZACIÓN Y LISTENERS
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    console.log("Dashboard cargado");

    cargarAlumnos();

    // Filtros en tiempo real
    document.getElementById("buscarAlumno").addEventListener("input", aplicarFiltros);
    document.getElementById("filtroNivel").addEventListener("change", aplicarFiltros);
    document.getElementById("filtroEstatus").addEventListener("change", aplicarFiltros);
    
    // Acciones del Modal
    document.getElementById("guardarEstatus").addEventListener("click", actualizarEstatus);
    document.getElementById("darDeBaja").addEventListener("click", darDeBaja);
    document.getElementById("reactivarAlumno").addEventListener("click", reactivarAlumno);
    document.getElementById("cerrarModal").addEventListener("click", () => {
        document.getElementById("modalAlumno").style.display = "none";
    });

    // Acción para Generar el archivo PDF de asistencia
    document.getElementById("btnGenerarPDF").addEventListener("click", generarListaPDF);

    // Inicializar el formulario del gestor de materiales si existe en el DOM
    const formRecurso = document.getElementById("formSubirRecurso");
    if (formRecurso) {
        formRecurso.addEventListener("submit", subirRecursoWeb);
    }
});

// Cerrar modal al hacer clic afuera
window.addEventListener("click", (e) => {
    const modal = document.getElementById("modalAlumno");
    if (e.target === modal) {
        modal.style.display = "none";
    }
});

// Helper para calcular la edad precisa a partir de la fecha de nacimiento
function calcularEdad(fechaNacimiento) {
    if (!fechaNacimiento) return "N/A";
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--;
    }
    return edad + " años";
}

// ==========================================
// 2. OBTENCIÓN Y RENDERIZADO DE DATOS (ALUMNOS)
// ==========================================
async function cargarAlumnos() {
    const { data, error } = await supabaseClient
        .from("registro_cate")
        .select("*")
        .order("id", { ascending: false });

    if (error) {
        console.error(error);
        alert("Error al cargar alumnos.");
        return;
    }

    window.alumnos = data;
    pintarTabla(data);

    let pendientes = 0;
    let aceptados = 0;
    let noBautizados = 0;

    data.forEach(alumno => {
        const estatus = alumno.estatus || "Pendiente";
        if (alumno.activo !== false) {
            if (estatus === "Pendiente") pendientes++;
            if (estatus === "Aceptado") aceptados++;
        }
        if (!alumno.bautizado) noBautizados++;
    });

    document.getElementById("totalInscritos").textContent = data.filter(a => a.activo !== false).length;
    document.getElementById("totalPendientes").textContent = pendientes;
    document.getElementById("totalAceptados").textContent = aceptados;
    document.getElementById("totalNoBautizados").textContent = noBautizados;
}

function pintarTabla(alumnos) {
    const tabla = document.getElementById("tablaCatequesis");
    tabla.innerHTML = "";
    let filasHtml = "";

    alumnos.forEach(alumno => {
        let estatus = alumno.estatus || "Pendiente";
        let badgeClass = "pendiente";

        if (alumno.activo === false) {
            estatus = "Dado de baja";
            badgeClass = "baja";
        } else {
            if (estatus === "Aceptado") badgeClass = "aceptado";
            if (estatus === "Rechazado") badgeClass = "rechazado";
            if (estatus === "Documentación incompleta") badgeClass = "incompleto";
        }

        filasHtml += `
            <tr>
                <td>${alumno.id}</td>
                <td>${alumno.nombre_nino}</td>
                <td>${alumno.nivel.toUpperCase()}</td>
                <td>${alumno.nombre_padre}</td>
                <td>${alumno.telefono_padre}</td>
                <td><span class="badge ${badgeClass}">${estatus}</span></td>
                <td>
                    <button class="btn btn-view" onclick="verAlumno(${alumno.id})">Ver</button>
                </td>
            </tr>
        `;
    });
    tabla.innerHTML = filasHtml;
}

// ==========================================
// 3. FILTROS Y MANEJO DEL MODAL
// ==========================================
function aplicarFiltros() {
    const textoBusqueda = document.getElementById("buscarAlumno").value.toLowerCase();
    const nivelSeleccionado = document.getElementById("filtroNivel").value;
    const estatusSeleccionado = document.getElementById("filtroEstatus").value;

    const alumnosFiltrados = window.alumnos.filter(alumno => {
        const coincideTexto =
            alumno.nombre_nino?.toLowerCase().includes(textoBusqueda) ||
            alumno.nombre_padre?.toLowerCase().includes(textoBusqueda) ||
            alumno.telefono_padre?.toLowerCase().includes(textoBusqueda);

        const coincideNivel = !nivelSeleccionado || alumno.nivel === nivelSeleccionado;

        let coincideEstatus = true;
        if (estatusSeleccionado === "Baja") {
            coincideEstatus = alumno.activo === false;
        } else if (estatusSeleccionado !== "") {
            coincideEstatus = alumno.activo !== false && (alumno.estatus || "Pendiente") === estatusSeleccionado;
        }

        return coincideTexto && coincideNivel && coincideEstatus;
    });

    pintarTabla(alumnosFiltrados);
}

function verAlumno(id) {
    const alumno = window.alumnos.find(a => a.id === id);
    if (!alumno) return;

    alumnoSeleccionado = alumno.id;

    document.getElementById("nuevoEstatus").value = alumno.estatus || "Pendiente";
    document.getElementById("detalleNombre").textContent = alumno.nombre_nino;
    document.getElementById("detalleNacimiento").textContent = alumno.fecha_nacimiento;
    document.getElementById("detalleNivel").textContent = alumno.nivel.toUpperCase();
    document.getElementById("detalleBautizado").textContent = alumno.bautizado ? "Sí" : "No";
    document.getElementById("detalleTutor").textContent = alumno.nombre_padre;
    document.getElementById("detalleTelefono").textContent = alumno.telefono_padre;
    document.getElementById("detalleCorreo").textContent = alumno.email || "Sin correo";
    document.getElementById("detalleDireccion").textContent = alumno.direccion;
    document.getElementById("detalleEstatus").textContent = alumno.activo === false ? "Dado de Baja" : (alumno.estatus || "Pendiente");
    document.getElementById("detalleRegistro").textContent = new Date(alumno.fecha_registro).toLocaleDateString();
    document.getElementById("observacionesCatequista").value = alumno.observaciones_catequista || "";

    const botonBaja = document.getElementById("darDeBaja");
    const botonReactivar = document.getElementById("reactivarAlumno");

    if (alumno.activo === false) {
        botonBaja.style.display = "none";
        botonReactivar.style.display = "inline-block";
    } else {
        botonBaja.style.display = "inline-block";
        botonReactivar.style.display = "none";
    }

    document.getElementById("modalAlumno").style.display = "block";
}

// ==========================================
// 4. ACCIONES BASE DE DATOS (UPDATE / BAJAS)
// ==========================================
async function actualizarEstatus() {
    if (!alumnoSeleccionado) return;

    const nuevoEstatus = document.getElementById("nuevoEstatus").value;
    const observacionesCatequista = document.getElementById("observacionesCatequista").value;

    const { error } = await supabaseClient
        .from("registro_cate")
        .update({
            estatus: nuevoEstatus,
            observaciones_catequista: observacionesCatequista,
            fecha_actualizacion: new Date().toISOString()
        })
        .eq("id", alumnoSeleccionado);

    if (error) {
        alert("Error: " + error.message);
        return;
    }

    alert("Información actualizada correctamente");
    document.getElementById("modalAlumno").style.display = "none";
    cargarAlumnos();
}

async function darDeBaja() {
    if (!alumnoSeleccionado || !confirm("¿Deseas dar de baja a este alumno?")) return;

    const { error } = await supabaseClient
        .from("registro_cate")
        .update({ activo: false, fecha_actualizacion: new Date().toISOString() })
        .eq("id", alumnoSeleccionado);

    if (error) {
        alert(error.message);
        return;
    }

    alert("Alumno dado de baja.");
    document.getElementById("modalAlumno").style.display = "none";
    cargarAlumnos();
}

async function reactivarAlumno() {
    if (!alumnoSeleccionado) return;

    const { error } = await supabaseClient
        .from("registro_cate")
        .update({ activo: true, estatus: "Pendiente", fecha_actualizacion: new Date().toISOString() })
        .eq("id", alumnoSeleccionado);

    if (error) {
        alert(error.message);
        return;
    }

    alert("Alumno reactivado correctamente.");
    document.getElementById("modalAlumno").style.display = "none";
    cargarAlumnos();
}

// ===================================================================
// 5. GENERACIÓN AUTOMÁTICA DE LISTAS EN PDF (CON FILTRO POR EDAD)
// ===================================================================
function generarListaPDF() {
    const { jsPDF } = window.jspdf;
    const curso = document.getElementById("cursoLista").value;
    const criterio = document.getElementById("criterioDivision").value;

    if (!curso) {
        alert("Por favor, selecciona un curso primero.");
        return;
    }

    // Filtrar los alumnos activos y aceptados de este curso
    const alumnosCurso = window.alumnos.filter(alumno => 
        alumno.nivel === curso && 
        alumno.activo !== false && 
        alumno.estatus === "Aceptado"
    );

    if (alumnosCurso.length === 0) {
        alert("No se encontraron alumnos con estatus 'Aceptado' y activos en este curso para armar las listas.");
        return;
    }

    // Ordenar alfabéticamente por nombre de manera inicial
    alumnosCurso.sort((a, b) => a.nombre_nino.localeCompare(b.nombre_nino, 'es', { sensitivity: 'base' }));

    let grupos = [];
    let nombresDeGrupos = [];

    // LÓGICA DE DIVISIÓN POR EDADES
    if (criterio === "edades") {
        let grupoPequenos = [];  // 6 a 10 años
        let grupoGrandes = [];   // 11 a 16 años
        let otrosRangos = [];    // Edades fuera del rango estándar (ej. menos de 6 o más de 16)

        alumnosCurso.forEach(alumno => {
            const edadTexto = calcularEdad(alumno.fecha_nacimiento);
            const edadNumero = parseInt(edadTexto, 10) || 0;

            if (edadNumero >= 6 && edadNumero <= 10) {
                grupoPequenos.push(alumno);
            } else if (edadNumero >= 11 && edadNumero <= 16) {
                grupoGrandes.push(alumno);
            } else {
                otrosRangos.push(alumno);
            }
        });

        // Añadimos los grupos que realmente tengan registrados alumnos
        if (grupoPequenos.length > 0) {
            grupos.push(grupoPequenos);
            nombresDeGrupos.push("Grupo 1 (Edades: 6 a 10 años)");
        }
        if (grupoGrandes.length > 0) {
            grupos.push(grupoGrandes);
            nombresDeGrupos.push("Grupo 2 (Edades: 11 a 16 años)");
        }
        if (otrosRangos.length > 0) {
            grupos.push(otrosRangos);
            nombresDeGrupos.push("Grupo Especial (Otras Edades)");
        }

    } else {
        // LÓGICA TRADICIONAL EQUITATIVA (1, 2, 3 o 4 grupos alfabéticos)
        let cantidadGrupos = 1;
        if (criterio === "equitativo_2") cantidadGrupos = 2;
        if (criterio === "equitativo_3") cantidadGrupos = 3;
        if (criterio === "equitativo_4") cantidadGrupos = 4;

        for (let i = 0; i < cantidadGrupos; i++) {
            grupos.push([]);
            nombresDeGrupos.push(`Grupo ${i + 1}`);
        }

        alumnosCurso.forEach((alumno, index) => {
            const destinoGrupo = index % cantidadGrupos;
            grupos[destinoGrupo].push(alumno);
        });
    }

    // GENERACIÓN DEL DOCUMENTO PDF
    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "letter"
    });

    let paginaAgregada = false;

    grupos.forEach((alumnosDelGrupo, i) => {
        if (alumnosDelGrupo.length === 0) return;

        if (paginaAgregada) {
            doc.addPage();
        }
        paginaAgregada = true;

        // Encabezados estéticos del PDF
        doc.setFont("Helvetica", "bold");
        doc.setFontSize(16);
        doc.setTextColor(44, 62, 80); 
        doc.text("PARROQUIA ASUNCIÓN DE MARÍA TEPALCATITLÁN", 106, 15, { align: "center" });
        
        doc.setFontSize(13);
        doc.setFont("Helvetica", "normal");
        doc.text("Control Oficial de Asistencias - Ciclo Catequético", 106, 22, { align: "center" });

        doc.setFontSize(11);
        doc.setFont("Helvetica", "bold");
        doc.text(`Curso: ${curso.toUpperCase()}`, 15, 32);
        doc.text(`${nombresDeGrupos[i]}`, 90, 32);
        doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 160, 32);

        doc.setDrawColor(44, 62, 80);
        doc.setLineWidth(0.5);
        doc.line(15, 36, 200, 36);

        const encabezados = [["N°", "Nombre del Alumno", "Curso", "Edad", "Clase 1", "Clase 2", "Clase 3", "Clase 4"]];

        const filas = alumnosDelGrupo.map((alumno, idx) => [
            idx + 1,
            alumno.nombre_nino,
            alumno.nivel.toUpperCase(),
            calcularEdad(alumno.fecha_nacimiento),
            "", "", "", "" 
        ]);

        doc.autoTable({
            startY: 40,
            head: encabezados,
            body: filas,
            theme: "grid",
            headStyles: {
                fillColor: [31, 78, 121], 
                textColor: [255, 255, 255],
                fontStyle: "bold",
                halign: "center"
            },
            styles: {
                font: "Helvetica",
                fontSize: 9,
                cellPadding: 3
            },
            columnStyles: {
                0: { halign: "center", cellWidth: 10 }, 
                1: { halign: "left", cellWidth: 75 },   
                2: { halign: "center", cellWidth: 30 }, 
                3: { halign: "center", cellWidth: 15 }, 
                4: { halign: "center", cellWidth: 14 }, 
                5: { halign: "center", cellWidth: 14 }, 
                6: { halign: "center", cellWidth: 14 }, 
                7: { halign: "center", cellWidth: 14 }  
            },
            margin: { top: 40, left: 15, right: 15 }
        });
    });

    const nombreArchivo = `Listas_${curso.toUpperCase()}_Criterio_${criterio}.pdf`;
    doc.save(nombreArchivo);
}

// ==========================================
// 6. CONTROL DE NAVEGACIÓN DE PESTAÑAS
// ==========================================
function cambiarPestaña(tipo) {
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.seccion-panel').forEach(panel => panel.classList.remove('active'));

    if (tipo === 'alumnos') {
        document.querySelector("button[onclick=\"cambiarPestaña('alumnos')\"]").classList.add('active');
        document.getElementById('panel-alumnos').classList.add('active');
    } else {
        document.querySelector("button[onclick=\"cambiarPestaña('recursos')\"]").classList.add('active');
        document.getElementById('panel-recursos').classList.add('active');
        cargarRecursosAdmin(); 
    }
}

// ==========================================
// 7. GESTIÓN DE MATERIALES DESDE PANEL
// ==========================================
async function subirRecursoWeb(e) {
    e.preventDefault();
    
    const categoria = document.getElementById("recCategoria").value;
    const titulo = document.getElementById("recTitulo").value.trim();
    const descripcion = document.getElementById("recDescripcion").value.trim();
    const archivoInput = document.getElementById("recArchivo");
    
    if (!archivoInput.files || archivoInput.files.length === 0) {
        alert("Por favor selecciona un archivo PDF.");
        return;
    }
    
    const file = archivoInput.files[0];
    const nombreUnicoStorage = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;

    try {
        const { data: storageData, error: storageError } = await supabaseClient
            .storage
            .from('materiales_catequesis')
            .upload(nombreUnicoStorage, file);

        if (storageError) throw storageError;

        const { data: urlData } = supabaseClient
            .storage
            .from('materiales_catequesis')
            .getPublicUrl(nombreUnicoStorage);

        const urlPublica = urlData.publicUrl;

        const { error: dbError } = await supabaseClient
            .from('recursos_catequesis')
            .insert([{
                titulo: titulo,
                descripcion: descripcion,
                categoria: categoria,
                url_archivo: urlPublica,
                nombre_storage: nombreUnicoStorage
            }]);

        if (dbError) throw dbError;

        alert("¡Material publicado con éxito en la página web oficial!");
        document.getElementById("formSubirRecurso").reset();
        cargarRecursosAdmin();

    } catch (error) {
        console.error(error);
        alert("Error al subir recurso: " + error.message);
    }
}

async function cargarRecursosAdmin() {
    const { data, error } = await supabaseClient
        .from('recursos_catequesis')
        .select('*')
        .order('id', { ascending: false });

    if (error) {
        console.error(error);
        return;
    }

    const tbody = document.getElementById("tablaRecursos");
    if (!tbody) return;
    tbody.innerHTML = "";
    
    const nombresCategorias = {
        administrativos: "📄 Admins.",
        guias: "📖 Guías Estudio",
        padres: "👨‍👩‍👦 Padres",
        multimedia: "🎬 Multimedia"
    };

    data.forEach(rec => {
        tbody.innerHTML += `
            <tr>
                <td><strong>${nombresCategorias[rec.categoria] || rec.categoria}</strong></td>
                <td><a href="${rec.url_archivo}" target="_blank" style="color: #2b6cb0; font-weight:600; text-decoration:none;">${rec.titulo}</a></td>
                <td>${rec.descripcion}</td>
                <td>${new Date(rec.fecha_subida).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-delete" onclick="eliminarRecurso(${rec.id}, '${rec.nombre_storage}')" style="padding: 4px 8px; font-size:12px;">Eliminar</button>
                </td>
            </tr>
        `;
    });
}

async function eliminarRecurso(id, nombreStorage) {
    if (!confirm("¿Estás seguro de que deseas eliminar este material? Se borrará inmediatamente de la página web.")) return;

    try {
        const { error: storageError } = await supabaseClient
            .storage
            .from('materiales_catequesis')
            .remove([nombreStorage]);

        if (storageError) console.warn("Aviso Storage:", storageError.message);

        const { error: dbError } = await supabaseClient
            .from('recursos_catequesis')
            .delete()
            .eq('id', id);

        if (dbError) throw dbError;

        alert("Recurso eliminado correctamente.");
        cargarRecursosAdmin();

    } catch (error) {
        console.error(error);
        alert("Error al eliminar: " + error.message);
    }
}