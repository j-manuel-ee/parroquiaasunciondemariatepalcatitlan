// js/oficinaParroquial.js

// Variable global para almacenar el rol del usuario actual
let rolUsuarioActual = 'coordinador'; 

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Control de seguridad y renderizado de módulos por rol
    await verificarAccesoYRoles();

    // 2. Escuchar los eventos del buscador corporativo
    document.getElementById('btnBuscar').addEventListener('click', buscarSacramentos);
    
    document.getElementById('searchNombre').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') buscarSacramentos();
    });
    document.getElementById('searchAnio').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') buscarSacramentos();
    });

    // 3. Escuchar el evento de guardado del formulario de registro
    document.getElementById('formRegistro').addEventListener('submit', guardarRegistroActa);

    // 4. Escuchar eventos del Modal de Edición de Fecha
    document.getElementById('btnCancelarEdicion').addEventListener('click', cerrarModalEdicion);
    document.getElementById('formEditarFecha').addEventListener('submit', guardarEdicionFecha);
});

/**
 * CONTROL DE ACCESOS Y CAPAS:
 * Valida sesión y almacena el rol para habilitar la edición en la tabla.
 */
async function verificarAccesoYRoles() {
    try {
        const { data: { user } } = await supabaseClient.auth.getUser();
        
        if (!user) {
            window.location.href = 'adminLogin.html';
            return;
        }

        const { data: perfil, error } = await supabaseClient
            .from('perfiles')
            .select('rol')
            .eq('id', user.id)
            .single();

        if (error || !perfil) {
            console.error('Error al verificar privilegios en la base de datos.');
            window.location.href = 'adminLogin.html';
            return;
        }

        rolUsuarioActual = perfil.rol; // Guardamos el rol globalmente ('admin' o 'coordinador')
        const esAdmin = (rolUsuarioActual === 'admin');
        
        const colRegistro = document.getElementById("colRegistro");
        const txtModo = document.getElementById("txtModo");

        if (esAdmin) {
            if (colRegistro) colRegistro.style.display = "block";
            if (txtModo) {
                txtModo.textContent = "Modo: Administrador (Búsqueda, Captura y Edición Habilitadas)";
                txtModo.style.color = "#2f855a";
            }
        } else {
            if (colRegistro) colRegistro.style.display = "none";
            if (txtModo) {
                txtModo.textContent = "Modo: Coordinación (Solo Consulta y Actualización de Fechas)";
                txtModo.style.color = "#004080";
            }
        }

        document.body.style.display = 'block';

    } catch (err) {
        console.error('Fallo en la infraestructura de seguridad:', err);
        window.location.href = 'adminLogin.html';
    }
}

/**
 * BUSCADOR DE SACRAMENTOS REFORZADO CON ALGORITMO MULTI-TÉRMINO:
 */
async function buscarSacramentos() {
    const nombreInput = document.getElementById('searchNombre').value.trim();
    const sacramento = document.getElementById('searchSacramento').value;
    const anio = document.getElementById('searchAnio').value;
    const mes = document.getElementById('searchMes').value;
    const diaInput = document.getElementById('searchDia').value.trim();

    const tbody = document.getElementById('tbodyResultados');
    tbody.innerHTML = `<tr><td colspan="8" class="loading-text" style="text-align: center; padding: 20px; font-style: italic;">Buscando en los libros parroquiales...</td></tr>`;

    try {
        let query = supabaseClient.from('sacramentos').select('*');

        if (nombreInput) {
            const palabras = nombreInput.split(/\s+/).filter(p => p.length > 0);
            palabras.forEach(palabra => {
                query = query.ilike('nombre_titular', `%${palabra}%`);
            });
        }

        if (sacramento) {
            query = query.eq('tipo_sacramento', sacramento);
        }

        if (anio) {
            if (mes) {
                if (diaInput) {
                    const diaFormateado = diaInput.padStart(2, '0');
                    query = query.eq('fecha_sacramento', `${anio}-${mes}-${diaFormateado}`);
                } else {
                    const fechaInicio = `${anio}-${mes}-01`;
                    const fechaFin = `${anio}-${mes}-31`;
                    query = query.or(`fecha_sacramento.gte.${fechaInicio},fecha_sacramento.lte.${fechaFin},anio_estimado.eq.${anio}`);
                }
            } else {
                const fechaInicio = `${anio}-01-01`;
                const fechaFin = `${anio}-12-31`;
                query = query.or(`fecha_sacramento.gte.${fechaInicio},fecha_sacramento.lte.${fechaFin},anio_estimado.eq.${anio}`);
            }
        } else if (mes) {
            query = query.like('fecha_sacramento', `%-${mes}-%`);
        }

        const { data, error } = await query.order('nombre_titular', { ascending: true });

        if (error) throw error;

        tbody.innerHTML = '';

        if (!data || data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" class="loading-text" style="text-align: center; padding: 20px; color: #c53030; font-weight: bold;">❌ No se encontró ningún acta coincidente en los libros físicos.</td></tr>`;
            return;
        }

        const sacramentosMap = {
            'bautizo': '⛪ Bautizo',
            'comunion': '🍞 Primera Comunión',
            'confirmacion': '🔥 Confirmación',
            'matrimonio': '💍 Matrimonio'
        };

        data.forEach(reg => {
            const tr = document.createElement('tr');
            
            let fechaFormateada = 'No registrada';
            if (reg.fecha_sacramento) {
                const partes = reg.fecha_sacramento.split('-');
                if (partes.length === 3) {
                    fechaFormateada = `${partes[2]}/${partes[1]}/${partes[0]}`;
                }
            } else if (reg.anio_estimado) {
                fechaFormateada = `Año aprox: ${reg.anio_estimado}`;
            }

            tr.innerHTML = `
                <td><strong>${escapeHTML(reg.nombre_titular)}</strong></td>
                <td style="font-size: 13px;">${sacramentosMap[reg.tipo_sacramento] || reg.tipo_sacramento}</td>
                <td style="font-size: 13px;">${fechaFormateada}</td>
                
                <td class="ubicacion-libro" style="text-align: center;">${reg.numero_libro}</td>
                <td class="ubicacion-foja" style="text-align: center;">${reg.numero_hoja}</td>
                
                <td style="text-align: center; font-size: 13px; font-weight: bold;">${reg.numero_acta}</td>
                <td style="font-size: 12px; color: #4a5568;">${escapeHTML(reg.observaciones || '')}</td>
                <td style="text-align: center;">
                    <button class="btn-editar-fecha" data-id="${reg.id}" data-nombre="${escapeHTML(reg.nombre_titular)}" data-fecha="${reg.fecha_sacramento || ''}" data-anio="${reg.anio_estimado || ''}" style="background-color: #004080; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer; font-weight: bold;">
                      ✏️ Fecha
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });

        // Añadir el detector de clics a todos los nuevos botones de editar recién creados
        document.querySelectorAll('.btn-editar-fecha').forEach(boton => {
            boton.addEventListener('click', abrirModalEdicion);
        });

    } catch (err) {
        console.error('Error al consultar libros:', err);
        tbody.innerHTML = `<tr><td colspan="8" class="loading-text" style="text-align: center; padding: 20px; color: #c53030; font-weight: bold;">⚠️ Error de conexión con la base de datos.</td></tr>`;
    }
}

/**
 * FUNCIONES DEL MODAL DE EDICIÓN:
 */
function abrirModalEdicion(e) {
    const boton = e.target;
    
    // Extraemos la información del renglón desde los atributos data- del botón
    const id = boton.getAttribute('data-id');
    const nombre = boton.getAttribute('data-nombre');
    const fecha = boton.getAttribute('data-fecha');
    const anio = boton.getAttribute('data-anio');

    // Inyectamos los datos en el formulario del Modal
    document.getElementById('editId').value = id;
    document.getElementById('editFecha').value = fecha;
    document.getElementById('editAnioEstimado').value = anio;
    document.getElementById('editModalInfo').textContent = `Feligrés: ${nombre}`;

    // Mostramos el modal usando flex
    document.getElementById('modalEditarFecha').style.display = 'flex';
}

function cerrarModalEdicion() {
    document.getElementById('modalEditarFecha').style.display = 'none';
    document.getElementById('formEditarFecha').reset();
}

async function guardarEdicionFecha(e) {
    e.preventDefault();

    const id = document.getElementById('editId').value;
    const fecha = document.getElementById('editFecha').value || null;
    let anioEstimado = document.getElementById('editAnioEstimado').value || null;

    // Si pusieron fecha exacta pero no año, lo calculamos en automático
    if (fecha && !anioEstimado) {
        anioEstimado = new Date(fecha).getFullYear();
    }

    try {
        const { error } = await supabaseClient
            .from('sacramentos')
            .update({
                fecha_sacramento: fecha,
                anio_estimado: anioEstimado ? parseInt(anioEstimado, 10) : null
            })
            .eq('id', id);

        if (error) throw error;

        alert('📅 Fecha del sacramento actualizada correctamente en el sistema.');
        cerrarModalEdicion();
        buscarSacramentos(); // Refrescamos la tabla para que se vea el cambio reflejado inmediatamente

    } catch (err) {
        console.error('Error al actualizar fecha:', err);
        alert('❌ Error al actualizar la fecha: ' + err.message);
    }
}

/**
 * ESCRIBIR NUEVOS REGISTROS:
 */
async function guardarRegistroActa(e) {
    e.preventDefault();

    const nombre = document.getElementById('regNombre').value.trim();
    const sacramento = document.getElementById('regSacramento').value;
    const fecha = document.getElementById('regFecha').value || null;
    let anioEstimado = document.getElementById('regAnioEstimado').value || null;
    
    const libroInput = parseInt(document.getElementById('regLibro').value.trim(), 10);
    const fojaInput = parseInt(document.getElementById('regFoja').value.trim(), 10);
    const actaInput = parseInt(document.getElementById('regActa').value.trim(), 10);
    
    const notas = document.getElementById('regNotas').value.trim();

    if (isNaN(libroInput) || isNaN(fojaInput) || isNaN(actaInput)) {
        alert('❌ Los campos Libro, Foja y Número de Acta deben ser exclusivamente números enteros.');
        return;
    }

    if (fecha && !anioEstimado) {
        anioEstimado = new Date(fecha).getFullYear();
    }

    try {
        const { error } = await supabaseClient
            .from('sacramentos')
            .insert([{
                nombre_titular: nombre,
                tipo_sacramento: sacramento,
                fecha_sacramento: fecha,
                anio_estimado: anioEstimado ? parseInt(anioEstimado, 10) : null,
                numero_libro: libroInput,
                numero_hoja: fojaInput,
                numero_acta: actaInput,
                observaciones: notas || null
            }]);

        if (error) throw error;

        alert('✅ Ubicación del acta guardada con éxito en la base de datos.');
        
        document.getElementById('formRegistro').reset();
        buscarSacramentos(); 

    } catch (err) {
        console.error('Error al insertar registro:', err);
        alert('❌ Error al guardar el registro: ' + err.message);
    }
}

function escapeHTML(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
