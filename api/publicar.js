import { neon } from '@neondatabase/serverless';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Método no permitido' });
    }

    // 1. Añadimos pdf_url a la extracción de datos del body
    const { semana, titulo, subtitulo, contenido, fecha, categoria, seccion, pdf_url } = request.body;
    const sql = neon(process.env.DATABASE_URL);

    try {
        // 2. Modificamos la query para insertar la nueva columna pdf_url
        // Usamos (pdf_url || null) para que si se envía vacío, la base de datos lo guarde como NULL sin dar error
        await sql`
            INSERT INTO apuntes (semana, titulo, subtitulo, contenido, fecha, categoria, seccion, pdf_url)
            VALUES (${semana}, ${titulo}, ${subtitulo}, ${contenido}, ${fecha}, ${categoria}, ${seccion}, ${pdf_url || null});
        `;
        return response.status(200).json({ success: true, message: 'Artículo publicado con éxito' });
    } catch (error) {
        return response.status(500).json({ error: error.message });
    }
}