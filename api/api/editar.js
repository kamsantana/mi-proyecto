// api/editar.js
const { Pool } = require('pg'); // O la librería que uses para Neon

// Reutiliza tu configuración de conexión idéntica a la de publicar.js
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, 
  ssl: { rejectUnauthorized: false }
});

module.exports = async (req, res) => {
    // Manejar solo peticiones PUT
    if (req.method !== 'PUT') {
        return res.status(405).json({ success: false, error: 'Método no permitido' });
    }

    const { id, seccion, semana, titulo, subtitulo, categoria, contenido, pdf_url, fecha } = req.body;

    if (!id) {
        return res.status(400).json({ success: false, error: 'Falta el ID del artículo.' });
    }

    try {
        const query = `
            UPDATE apuntes 
            SET seccion = $1, semana = $2, titulo = $3, subtitulo = $4, categoria = $5, contenido = $6, pdf_url = $7, fecha = $8
            WHERE id = $9
        `;
        const valores = [seccion, semana, titulo, subtitulo, categoria, contenido, pdf_url, fecha, id];
        
        await pool.query(query, valores);

        return res.status(200).json({ success: true, message: 'Actualizado en Neon con éxito.' });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ success: false, error: 'Error en la base de datos.' });
    }
};