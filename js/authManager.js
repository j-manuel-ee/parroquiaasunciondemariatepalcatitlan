// js/authManager.js
async function obtenerRol() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return null;

    // Consultamos la tabla 'perfiles' que creaste
    const { data, error } = await supabaseClient
        .from('perfiles')
        .select('rol')
        .eq('id', user.id)
        .single();
        
    return data ? data.rol : 'coordinador'; // Por seguridad, si no existe, es coordinador
}