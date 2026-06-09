// js/oficinaParroquial.js

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

    // 3. Escuchar el evento de guardado del formulario
    document.getElementById('formRegistro').addEventListener('submit', guardarRegistroActa);
});

/**
 * CONTROL DE ACCESOS Y CAPAS:
 * Valida sesión. Si es admin, muestra el formulario de registro.
 * Si es coordinador, lo oculta para proteger la base de datos de escrituras accidentales.
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

        const esAdmin = (perfil.rol === 'admin');
        
        // Ajustar componentes visuales según permisos
        const colRegistro = document.getElementById("colRegistro");
        const txtModo = document.getElementById("txtModo");

        if (esAdmin) {
            if (colRegistro) colRegistro.style.display = "block";
            if (txtModo) {
                txtModo.textContent = "Modo: Administrador (Búsqueda y Captura Habilitadas)";
                txtModo.style.color = "#2f855a";
            }
        } else {
            if (colRegistro) colRegistro.style.display = "none";
            if (txtModo) {
                txtModo.textContent = "Modo: Coordinación (Solo Consulta de Archivos)";
                txtModo.style.color = "#004080";
            }
        }

        // Hacemos visible el documento completo sin parpadeos
        document.body.style.display = 'block';

    } catch (err) {
        console.error('Fallo en la infraestructura de seguridad:', err);
        window.location.href = 'adminLogin.html';
    }
}

/**
 * BUSCADOR DE SACRAMENTOS REFORZADO CON ALGORITMO MULTI-TÉRMINO (CORREGIDO):
 * Permite buscar por un nombre y un apellido (ej. "Juan Pérez") y encontrar
 * coincidencias más largas (ej. "Juan Carlos Pérez Gómez") sin romper Supabase.
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

        // --- ALGORITMO DE BÚSQUEDA INTELIGENTE POR PALABRAS (SINTAXIS CORRECTA V2) ---
        if (nombreInput) {
            // Dividimos lo que escribió el usuario por espacios sueltos
            const palabras = nombreInput.split(/\s+/).filter(p => p.length > 0);
            
            // Encadenamos un .ilike() por cada palabra dentro del query.
            // En Supabase, encadenar métodos de manera consecutiva actúa automáticamente como un AND lógico.
            palabras.forEach(palabra => {
                query = query.ilike('nombre_titular', `%${palabra}%`);
            });
        }
        // ----------------------------------------------------------------------------

        if (sacramento) {
            query = query.eq('tipo_sacramento', sacramento);
        }

        // Segmentación temporal inteligente para la secretaria
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
                
                <td class="ubicacion-libro">${escapeHTML(reg.libro)}</td>
                <td class="ubicacion-libro">${escapeHTML(reg.tomo || '-')}</td>
                <td class="ubicacion-foja">${escapeHTML(reg.foja)}</td>
                
                <td style="text-align: center; font-size: 13px; font-weight: bold;">${escapeHTML(reg.acta_numero || '-')}</td>
                <td style="font-size: 12px; color: #4a5568;">${escapeHTML(reg.observaciones || '')}</td>
            `;
            tbody.appendChild(tr);
        });

    } catch (err) {
        console.error('Error al consultar libros:', err);
        tbody.innerHTML = `<tr><td colspan="8" class="loading-text" style="text-align: center; padding: 20px; color: #c53030; font-weight: bold;">⚠️ Error de conexión con la base de datos.</td></tr>`;
    }
}

/**
 * ESCRIBIR NUEVOS REGISTROS:
 * Toma la información capturada del formulario y la almacena en Supabase.
 */
async function guardarRegistroActa(e) {
    e.preventDefault();

    const nombre = document.getElementById('regNombre').value.trim();
    const sacramento = document.getElementById('regSacramento').value;
    const fecha = document.getElementById('regFecha').value || null;
    let anioEstimado = document.getElementById('regAnioEstimado').value || null;
    const libro = document.getElementById('regLibro').value.trim();
    const tomo = document.getElementById('regTomo').value.trim();
    const foja = document.getElementById('regFoja').value.trim();
    const acta = document.getElementById('regActa').value.trim();
    const notas = document.getElementById('regNotas').value.trim();

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
                anio_estimado: anioEstimado ? parseInt(anioEstimado) : null,
                libro: libro,
                tomo: tomo || null,
                foja: foja,
                acta_numero: acta || null,
                observaciones: notas || null
            }]);

        if (error) throw error;

        alert('✅ Ubicación del acta guardada con éxito en la base de datos.');
        
        document.getElementById('formRegistro').reset();
        buscarSacramentos(); // Refrescar la tabla de búsquedas automáticamente

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