import { neon } from '@neondatabase/serverless';

export default async function handler(req, res) {
    if (req.method !== 'DELETE') return res.status(405).send('Metodo no permitido');

    const { id } = req.query;
    const sql = neon(process.env.DATABASE_URL);

    try {
        await sql`DELETE FROM apuntes WHERE id = ${id}`;
        res.status(200).json({ success: true, message: 'Artículo eliminado' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
}