import { neon } from '@neondatabase/serverless';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Método no permitido' });
    }

    const { semana, titulo, subtitulo, contenido, fecha, categoria, seccion } = request.body;
    const sql = neon(process.env.DATABASE_URL);

    try {
        await sql`
            INSERT INTO apuntes (semana, titulo, subtitulo, contenido, fecha, categoria, seccion)
            VALUES (${semana}, ${titulo}, ${subtitulo}, ${contenido}, ${fecha}, ${categoria}, ${seccion});
        `;
        return response.status(200).json({ success: true, message: 'Artículo publicado con éxito' });
    } catch (error) {
        return response.status(500).json({ error: error.message });
    }
}