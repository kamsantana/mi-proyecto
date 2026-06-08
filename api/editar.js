import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
    // Permitir solo peticiones PUT
    if (req.method !== 'PUT') {
        return res.status(405).json({ success: false, error: 'Método no permitido' });
    }

    try {
        // Asegurar el parseo del contenido por si viene en string plano
        let body = req.body;
        if (typeof body === 'string') {
            body = JSON.parse(body);
        }

        const { id, seccion, semana, titulo, subtitulo, categoria, contenido, pdf_url, fecha } = body;
        const sql = neon(process.env.DATABASE_URL);

        // MODO SEGURO 1: Si viene un ID numérico válido, actualizamos por ID
        if (id && !isNaN(id)) {
            await sql`
                UPDATE apuntes 
                SET 
                    seccion = ${seccion}, 
                    semana = ${semana}, 
                    titulo = ${titulo}, 
                    subtitulo = ${subtitulo}, 
                    categoria = ${categoria}, 
                    contenido = ${contenido}, 
                    pdf_url = ${pdf_url || null}, 
                    fecha = ${fecha}
                WHERE id = ${parseInt(id)};
            `;
        } 
        // MODO SEGURO 2 (Fallback): Si no hay ID, editamos buscando por la combinación de semana y materia
        else {
            await sql`
                UPDATE apuntes 
                SET 
                    titulo = ${titulo}, 
                    subtitulo = ${subtitulo}, 
                    categoria = ${categoria}, 
                    contenido = ${contenido}, 
                    pdf_url = ${pdf_url || null}, 
                    fecha = ${fecha}
                WHERE LOWER(semana) = LOWER(${semana}) AND LOWER(seccion) = LOWER(${seccion});
            `;
        }

        return res.status(200).json({ success: true, message: 'Actualizado en Neon con éxito.' });

    } catch (error) {
        console.error("Error en la API de edición:", error);
        return res.status(500).json({ success: false, error: error.message });
    }
}