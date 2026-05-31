import { neon } from '@neondatabase/serverless';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Método no permitido' });
    }

    const { username, password } = request.body;
    const sql = neon(process.env.DATABASE_URL);

    try {
        const user = await sql`SELECT * FROM usuarios WHERE username = ${username} AND password = ${password};`;
        
        if (user.length > 0) {
            return response.status(200).json({ success: true, message: 'Login correcto' });
        } else {
            return response.status(401).json({ success: false, message: 'Usuario o contraseña incorrectos' });
        }
    } catch (error) {
        return response.status(500).json({ error: error.message });
    }
}