// --- JS CENTRALIZADO DE SEGURIDAD (js/auth.js) ---
async function verificarUsuario() {
    // 1. Obtener sesión de Supabase (el método más seguro)
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (!session) {
        window.location.href = "adminLogin.html";
        return null;
    }

    // 2. Obtener el rol real de la base de datos
    const { data: perfil, error } = await supabaseClient
        .from('perfiles')
        .select('rol')
        .eq('id', session.user.id)
        .single();

    if (error || !perfil) {
        console.error("No se pudo obtener el perfil");
        return 'coordinador'; // Por seguridad, si falla, es coordinador
    }

    return perfil.rol; 
}