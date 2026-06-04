// conexion.js

const SUPABASE_URL = "https://tpeosmlzkiiyahmsxyml.supabase.co";

const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwZW9zbWx6a2lpeWFobXN4eW1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk0NjY3MjMsImV4cCI6MjA5NTA0MjcyM30.V8oIXllByJHjsyXtiL8Oks_FcNHB1zzYem3CxxhmfNs";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);