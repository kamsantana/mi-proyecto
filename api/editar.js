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

        // =====================================================================
        // 🧹 LIMPIEZA: Si el usuario edita un bloque ya renderizado, limpiamos los divs viejos
        // =====================================================================
        let contenidoLimpio = contenido
            .replace(/<div class="cuadro-bloque [^>]*">/g, '')
            .replace(/<h3>[^<]*<\/h3>/g, '') // Quita títulos dinámicos viejos generados por el backend
            .replace(/<p>/g, '').replace(/<\/p>/g, '')
            .replace(/<\/div>/g, '')
            .replace(/<br>/g, '\n')
            .replace(/<pre><code>/g, '').replace(/<\/code><\/pre>/g, '');

        // =====================================================================
        // 🎨 RE-PROCESAR BLOQUES SEMÁNTICOS DE COLOR
        // =====================================================================
        let contenidoProcesadoHtml = "";
        const lineas = contenidoLimpio.split('\n');
        
        let bloqueActual = { titulo: "📘 Concepto General", textoAcumulado: [], tipo: "azul" };
        let enBloqueDeCodigo = false;
        let codigoAcumulado = [];

        const cerrarYGuardarBloque = () => {
            if (enBloqueDeCodigo && codigoAcumulado.length > 0) {
                bloqueActual.textoAcumulado.push(`<pre><code>${codigoAcumulado.join('\n')}</code></pre>`);
                codigoAcumulado = [];
                enBloqueDeCodigo = false;
            }
            if (bloqueActual.textoAcumulado.length > 0) {
                const textoFormateado = bloqueActual.textoAcumulado.join('<br>');
                contenidoProcesadoHtml += `
                    <div class="cuadro-bloque ${bloqueActual.tipo}">
                        <h3>${bloqueActual.titulo}</h3>
                        <p>${textoFormateado}</p>
                    </div>
                `;
                bloqueActual.textoAcumulado = [];
            }
        };

        for (let linea of lineas) {
            let lineaOriginal = linea;
            let lineaLimpia = linea.trim();

            if (lineaLimpia.startsWith("import ") || lineaLimpia.startsWith("def ") || lineaLimpia.startsWith("if __name__") || (enBloqueDeCodigo && (lineaLimpia.startsWith("print(") || lineaLimpia.startsWith("return ") || lineaLimpia.startsWith("db.append")))) {
                if (!enBloqueDeCodigo) enBloqueDeCodigo = true;
                codigoAcumulado.push(lineaOriginal);
                continue;
            } else if (enBloqueDeCodigo && lineaLimpia === "" && codigoAcumulado.length > 0) {
                codigoAcumulado.push("");
                continue;
            } else if (enBloqueDeCodigo && !lineaOriginal.startsWith("    ") && !lineaLimpia.startsWith("}") && !lineaLimpia.startsWith("]")) {
                bloqueActual.textoAcumulado.push(`<pre><code>${codigoAcumulado.join('\n')}</code></pre>`);
                codigoAcumulado = [];
                enBloqueDeCodigo = false;
            }

            if (!lineaLimpia) continue;

            if (lineaLimpia.startsWith("Caso:") || lineaLimpia.includes("Problema:") || lineaLimpia.includes("🔴") || lineaLimpia.includes("Falla de") || lineaLimpia.includes("Falta de")) {
                cerrarYGuardarBloque();
                bloqueActual = { titulo: "🚨 CASO DE ESTUDIO / PROBLEMA", textoAcumulado: [lineaLimpia], tipo: "rojo" };
            } else if (lineaLimpia.startsWith("Sacrificio:") || lineaLimpia.toLowerCase().includes("trade-off") || lineaLimpia.includes("⚖️") || lineaLimpia.includes("Dilema:")) {
                cerrarYGuardarBloque();
                bloqueActual = { titulo: "⚖️ ANÁLISIS DE TRADE-OFF (SACRIFICIOS)", textoAcumulado: [lineaLimpia], tipo: "naranja" };
            } else if (lineaLimpia.includes("✔") || lineaLimpia.startsWith("Éxito:") || lineaLimpia.includes("🟢") || lineaLimpia.includes("Métricas:") || /^\d+\.\s+(Disponibilidad|Escalabilidad|Resiliencia|Fiabilidad|Durabilidad)/.test(lineaLimpia)) {
                cerrarYGuardarBloque();
                const tituloDinamico = lineaLimpia.includes("🟢") ? lineaLimpia : `🟢 ATRIBUTO: ${lineaLimpia}`;
                bloqueActual = { titulo: tituloDinamico, textoAcumulado: [], tipo: "verde" };
            } else if (lineaLimpia.includes("Tareas:") || lineaLimpia.includes("🛠️") || lineaLimpia.includes("📌 Ejercicio") || lineaLimpia.includes("📋 ENUNCIADO")) {
                cerrarYGuardarBloque();
                bloqueActual = { titulo: "🛠️ TRABAJO AUTÓNOMO / PRÁCTICA", textoAcumulado: [lineaLimpia], tipo: "morado" };
            } else if (lineaLimpia.startsWith("¿") || lineaLimpia.startsWith("🧠") || (lineaLimpia.startsWith("---") === false && lineaLimpia.toUpperCase() === lineaLimpia && lineaLimpia.length > 5 && !lineaLimpia.includes("."))) {
                cerrarYGuardarBloque();
                bloqueActual = { titulo: `📘 ${lineaLimpia}`, textoAcumulado: [], tipo: "azul" };
            } else {
                if (lineaLimpia.startsWith("* ") || lineaLimpia.startsWith("- ")) {
                    bloqueActual.textoAcumulado.push(`• ${lineaLimpia.substring(2)}`);
                } else {
                    bloqueActual.textoAcumulado.push(lineaLimpia);
                }
            }
        }
        cerrarYGuardarBloque();
        // =====================================================================

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
                    contenido = ${contenidoProcesadoHtml}, 
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
                    contenido = ${contenidoProcesadoHtml}, 
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