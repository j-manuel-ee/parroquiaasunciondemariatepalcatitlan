const formulario = document.getElementById("registrationForm");

if (formulario) {
    formulario.addEventListener("submit", async (e) => {
        e.preventDefault();

        // 1. Obtener valores de los nuevos recuadros de Nombre (Limpios y en Mayúsculas)
        const apPaterno = document.getElementById("apellidoPaterno").value.trim().toUpperCase();
        const apMaterno = document.getElementById("apellidoMaterno").value.trim().toUpperCase();
        const nombresAlumno = document.getElementById("nombresNino").value.trim().toUpperCase();
        
        // Creamos la versión unificada por si la necesitas en los listados del panel rápido: "PÉREZ LÓPEZ JUAN CARLOS"
        const nombreCompletoUnificado = `${apPaterno} ${apMaterno} ${nombresAlumno}`;

        // 2. Obtener valores de los nuevos recuadros del Domicilio desglosado
        const calle = document.getElementById("calle").value.trim();
        const numExt = document.getElementById("numExterior").value.trim();
        const colonia = document.getElementById("colonia").value.trim();
        const alcaldia = document.getElementById("alcaldia").value.trim();
        const ciudad = document.getElementById("ciudad").value.trim();

        // Formato unificado de dirección para la columna única de la base de datos
        const direccionUnificada = `Calle ${calle}, No. ${numExt}, Col. ${colonia}, Alcaldía ${alcaldia}, ${ciudad}`;

        // 3. Mapear los datos DIRECTO a las nuevas columnas de tu Base de Datos
        const datos = {
            nombre: nombresAlumno,
            apellido_paterno: apPaterno,
            apellido_materno: apMaterno,
            nombre_nino: nombreCompletoUnificado, // Mantenemos la unión guardada para facilitar búsquedas globales
            fecha_nacimiento: document.getElementById("fechaNacimiento").value,
            nivel: document.getElementById("nivel").value,
            bautizado: document.getElementById("bautizado").value === "si",
            nombre_padre: document.getElementById("nombrePadre").value,
            telefono_padre: document.getElementById("telefonoPadre").value,
            email: document.getElementById("email").value,
            direccion: direccionUnificada,
            observaciones: document.getElementById("observaciones").value
        };

        // 4. Inserción directa en Supabase
        const { data, error } = await supabaseClient
            .from("registro_cate")
            .insert([datos])
            .select(); 

        if (error) {
            console.error(error);
            alert("Error al enviar la inscripción: " + error.message);
            return;
        }

        // Obtener el ID real generado por la base de datos
        const folioInscripcion = (data && data[0]) ? data[0].id : Math.floor(Date.now() / 1000);

        alert("Inscripción guardada de forma exitosa. Se descargará tu comprobante oficial.");

        // 5. LLAMADA AL GENERADOR DEL COMPROBANTE EN PDF
        generarComprobantePDF(datos, folioInscripcion, { apPaterno, apMaterno, nombres: nombresAlumno, calle, numExt, colonia, alcaldia, ciudad });

        // Limpiar el formulario para la siguiente inscripción
        formulario.reset();
    });
}

// ==========================================
// FUNCIÓN PARA CREAR EL PDF COMPROBANTE
// ==========================================
function generarComprobantePDF(datos, folio, desglosados) {
    const { jsPDF } = window.jspdf;
    
    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "letter"
    });

    // Marco exterior
    doc.setDrawColor(31, 78, 121);
    doc.setLineWidth(0.6);
    doc.rect(10, 10, 196, 259);

    // Encabezado
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(15);
    doc.setTextColor(31, 78, 121);
    doc.text("PARROQUIA ASUNCIÓN DE MARÍA TEPALCATITLÁN", 108, 22, { align: "center" });

    doc.setFontSize(11);
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text("Colonia Industrial, Gustavo A. Madero, Ciudad de México", 108, 28, { align: "center" });
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(44, 62, 80);
    doc.text("COMPROBANTE OFICIAL DE INSCRIPCIÓN A CATEQUESIS", 108, 38, { align: "center" });

    // Bloque de Folio
    doc.setDrawColor(220, 220, 220);
    doc.setFillColor(245, 247, 250);
    doc.rect(15, 45, 186, 12, "F");

    doc.setFontSize(10);
    doc.setTextColor(197, 48, 48); 
    doc.text(`FOLIO DE REGISTRO: #00${folio}`, 20, 52.5);

    doc.setTextColor(44, 62, 80);
    doc.setFont("Helvetica", "normal");
    doc.text(`Fecha: ${new Date().toLocaleDateString()} - ${new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`, 130, 52.5);

    // Sección 1: Datos Alumno
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(11);
    doc.setFillColor(31, 78, 121);
    doc.rect(15, 64, 186, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.text("1. DATOS DEL CATEQUÍZANDO", 18, 69);

    doc.setTextColor(44, 62, 80);
    doc.setFontSize(10);
    
    doc.setFont("Helvetica", "bold"); doc.text("Apellido Paterno:", 15, 79);
    doc.setFont("Helvetica", "normal"); doc.text(desglosados.apPaterno, 50, 79);

    doc.setFont("Helvetica", "bold"); doc.text("Apellido Materno:", 15, 86);
    doc.setFont("Helvetica", "normal"); doc.text(desglosados.apMaterno, 50, 86);

    doc.setFont("Helvetica", "bold"); doc.text("Nombre(s):", 15, 93);
    doc.setFont("Helvetica", "normal"); doc.text(desglosados.nombres, 50, 93);

    doc.setFont("Helvetica", "bold"); doc.text("Fecha de Nacimiento:", 15, 100);
    doc.setFont("Helvetica", "normal"); doc.text(datos.fecha_nacimiento, 58, 100);

    doc.setFont("Helvetica", "bold"); doc.text("Nivel Asignado:", 15, 107);
    doc.setFont("Helvetica", "bold"); doc.setTextColor(31, 78, 121);
    doc.text(datos.nivel.toUpperCase(), 50, 107);
    
    doc.setFont("Helvetica", "bold"); doc.setTextColor(44, 62, 80);
    doc.text("¿Cuenta con Bautizo?:", 120, 107);
    doc.setFont("Helvetica", "normal"); doc.text(datos.bautizado ? "SÍ" : "NO", 162, 107);

    // Sección 2: Domicilio
    doc.setFont("Helvetica", "bold");
    doc.setFillColor(31, 78, 121);
    doc.rect(15, 116, 186, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.text("2. DOMICILIO REGISTRADO", 18, 121);

    doc.setTextColor(44, 62, 80);
    doc.setFont("Helvetica", "bold"); doc.text("Calle:", 15, 131);
    doc.setFont("Helvetica", "normal"); doc.text(desglosados.calle, 30, 131);
    
    doc.setFont("Helvetica", "bold"); doc.text("Num. Ext:", 140, 131);
    doc.setFont("Helvetica", "normal"); doc.text(desglosados.numExt, 160, 131);

    doc.setFont("Helvetica", "bold"); doc.text("Colonia:", 15, 138);
    doc.setFont("Helvetica", "normal"); doc.text(desglosados.colonia, 35, 138);

    doc.setFont("Helvetica", "bold"); doc.text("Alcaldía:", 15, 145);
    doc.setFont("Helvetica", "normal"); doc.text(desglosados.alcaldia, 35, 145);

    doc.setFont("Helvetica", "bold"); doc.text("Ciudad:", 140, 145);
    doc.setFont("Helvetica", "normal"); doc.text(desglosados.ciudad, 160, 145);

    // Sección 3: Tutor
    doc.setFont("Helvetica", "bold");
    doc.setFillColor(31, 78, 121);
    doc.rect(15, 154, 186, 7, "F");
    doc.setTextColor(255, 255, 255);
    doc.text("3. INFORMACIÓN DEL PADRE O TUTOR", 18, 159);

    doc.setTextColor(44, 62, 80);
    doc.setFont("Helvetica", "bold"); doc.text("Nombre del Tutor:", 15, 169);
    doc.setFont("Helvetica", "normal"); doc.text(datos.nombre_padre.toUpperCase(), 50, 169);

    doc.setFont("Helvetica", "bold"); doc.text("Teléfono de Contacto:", 15, 176);
    doc.setFont("Helvetica", "normal"); doc.text(datos.telefono_padre, 58, 176);

    doc.setFont("Helvetica", "bold"); doc.text("Correo Electrónico:", 15, 183);
    doc.setFont("Helvetica", "normal"); doc.text(datos.email || "No registrado", 55, 183);

    if (datos.observaciones) {
        doc.setFont("Helvetica", "bold"); doc.text("Observaciones:", 15, 190);
        doc.setFont("Helvetica", "italic"); doc.text(datos.observaciones, 45, 190, { maxWidth: 150 });
    }

    // Pie de página con firmas
    doc.setDrawColor(197, 48, 48);
    doc.setLineWidth(0.3);
    doc.line(15, 205, 198, 205);
    
    doc.setFont("Helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(197, 48, 48);
    doc.text("NOTAS IMPORTANTES PARA EL PADRE O TUTOR:", 15, 211);
    
    doc.setFont("Helvetica", "normal");
    doc.setTextColor(80, 80, 80);
    doc.text("1. Este documento avala que la solicitud de inscripción digital fue recibida con éxito.", 15, 216);
    doc.text("2. La inscripción final queda condicionada a la validación de la documentación física en la oficina parroquial.", 15, 221);
    doc.text("3. Conserve este comprobante digital o impreso para cualquier aclaración de grupo u horario.", 15, 226);

    doc.setDrawColor(150, 150, 150);
    doc.setLineWidth(0.4);
    doc.line(30, 248, 85, 248); 
    doc.line(125, 248, 180, 248); 

    doc.setFontSize(9);
    doc.setFont("Helvetica", "bold");
    doc.text("Firma del Padre o Tutor", 57, 253, { align: "center" });
    doc.text("Sello y Firma de la Oficina", 152, 253, { align: "center" });

    const nombreArchivo = `Comprobante_${desglosados.apPaterno}_${desglosados.nombres.replace(/\s+/g, '_')}.pdf`;
    doc.save(nombreArchivo);
}

// ==========================================
// RENDERIZADO DINÁMICO DE RECURSOS DESDE SUPABASE
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    cargarRecursosEnPaginaPublica();
});

async function cargarRecursosEnPaginaPublica() {
    const { data, error } = await supabaseClient
        .from('recursos_catequesis')
        .select('*')
        .order('id', { ascending: false });

    if (error) {
        console.error("Error cargando recursos públicos:", error);
        return;
    }

    const contAdmin = document.getElementById("recursos-administrativos");
    const contGuias = document.getElementById("recursos-guias");
    const contPadres = document.getElementById("recursos-padres");
    const contMulti = document.getElementById("recursos-multimedia");

    if(contAdmin) contAdmin.innerHTML = "";
    if(contGuias) contGuias.innerHTML = "";
    if(contPadres) contPadres.innerHTML = "";
    if(contMulti) contMulti.innerHTML = "";

    const mensajeVacio = `<p style="color:#a0aec0; font-style:italic; padding:10px; font-size:14px;">Próximamente se publicarán materiales en esta sección.</p>`;
    
    let contadores = { administrativos: 0, guias: 0, padres: 0, multimedia: 0 };

    data.forEach(rec => {
        // Adaptamos el HTML para usar exactamente las clases CSS de tu archivo 'catequesis.css'
        const tarjetaHtml = `
            <div class="download-item">
                <div class="download-icon">📄</div>
                <div class="download-info">
                    <h4>${rec.titulo}</h4>
                    <p>${rec.descripcion}</p>
                    <span class="file-info">Documento PDF Oficial</span>
                </div>
                <a href="${rec.url_archivo}" target="_blank" class="btn-download">Descargar</a>
            </div>
        `;

        if (rec.categoria === 'administrativos' && contAdmin) { contAdmin.innerHTML += tarjetaHtml; contadores.administrativos++; }
        if (rec.categoria === 'guias' && contGuias) { contGuias.innerHTML += tarjetaHtml; contadores.guias++; }
        if (rec.categoria === 'padres' && contPadres) { contPadres.innerHTML += tarjetaHtml; contadores.padres++; }
        if (rec.categoria === 'multimedia' && contMulti) { contMulti.innerHTML += tarjetaHtml; contadores.multimedia++; }
    });

    // Colocar mensaje de aviso si la sección está vacía
    if(contAdmin && contadores.administrativos === 0) contAdmin.innerHTML = mensajeVacio;
    if(contGuias && contadores.guias === 0) contGuias.innerHTML = mensajeVacio;
    if(contPadres && contadores.padres === 0) contPadres.innerHTML = mensajeVacio;
    if(contMulti && contadores.multimedia === 0) contMulti.innerHTML = mensajeVacio;
}