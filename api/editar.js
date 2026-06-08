// api/editar.js
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false }
});

module.exports = async (req, res) => {
    // Manejar solo peticiones PUT
    if (req.method !== 'PUT') {
        return res.status(405).json({ success: false, error: 'Método no permitido' });
    }

    try {
        // SEGURIDAD: Forzar el parseo del body si viene como string bruto
        let body = req.body;
        if (typeof body === 'string') {
            body = JSON.parse(body);
        }

        const { id, seccion, semana, titulo, subtitulo, categoria, contenido, pdf_url, fecha } = body;

        let query;
        let valores;

        // MODO SEGURO 1: Si viene un ID numérico válido, actualizamos por ID
        if (id && !isNaN(id)) {
            query = `
                UPDATE apuntes 
                SET seccion = $1, semana = $2, titulo = $3, subtitulo = $4, categoria = $5, contenido = $6, pdf_url = $7, fecha = $8
                WHERE id = $9
            `;
            valores = [seccion, semana, titulo, subtitulo, categoria, contenido, pdf_url || null, fecha, id];
        } 
        // MODO SEGURO 2: Fallback por Semana y Sección si el ID no se cargó correctamente
        else {
            query = `
                UPDATE apuntes 
                SET titulo = $1, subtitulo = $2, categoria = $3, contenido = $4, pdf_url = $5, fecha = $6
                WHERE LOWER(semana) = LOWER($7) AND LOWER(seccion) = LOWER($8)
            `;
            valores = [titulo, subtitulo, categoria, contenido, pdf_url || null, fecha, semana, seccion];
        }
        
        await pool.query(query, valores);

        return res.status(200).json({ success: true, message: 'Actualizado en Neon con éxito.' });

    } catch (error) {
        console.error("Error completo en la API:", error);
        // CRUCIAL: Devolvemos el error exacto al frontend para inspeccionarlo si falla
        return res.status(500).json({ success: false, error: error.message });
    }
};