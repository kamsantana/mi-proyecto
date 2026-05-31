import { neon } from '@neondatabase/serverless';

export default async function handler(request, response) {
    // Validar que exista la variable de entorno de Neon
    if (!process.env.DATABASE_URL) {
        return response.status(500).json({ error: "Falta la variable DATABASE_URL" });
    }

    try {
        const sql = neon(process.env.DATABASE_URL);
        // Traer todas las semanas ordenadas por id
        const data = await sql`SELECT * FROM apuntes ORDER BY id ASC;`;
        
        return response.status(200).json(data);
    } catch (error) {
        return response.status(500).json({ error: error.message });
    }
}