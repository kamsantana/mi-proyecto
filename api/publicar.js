import { neon } from '@neondatabase/serverless';

export default async function handler(request, response) {
    if (request.method !== 'POST') {
        return response.status(405).json({ error: 'Método no permitido' });
    }

    const { semana, titulo, subtitulo, contenido, fecha, categoria, seccion, pdf_url } = request.body;

    if (!contenido) {
        return response.status(400).json({ error: 'El contenido no puede estar vacío' });
    }

    const sql = neon(process.env.DATABASE_URL);

    // =====================================================================
    // 🎨 ALGORITMO AVANZADO: DIVISIÓN DE CONTENIDO POR BLOQUES SEMÁNTICOS
    // =====================================================================
    let contenidoProcesadoHtml = "";
    const lineas = contenido.split('\n');
    
    // Bloque inicial por defecto
    let bloqueActual = { titulo: "📘 Concepto General", textoAcumulado: [], tipo: "azul" };
    let enBloqueDeCodigo = false;
    let codigoAcumulado = [];

    const cerrarYGuardarBloque = () => {
        // 1. Si veníamos acumulando un bloque de código, lo cerramos primero
        if (enBloqueDeCodigo && codigoAcumulado.length > 0) {
            bloqueActual.textoAcumulado.push(`<pre><code>${codigoAcumulado.join('\n')}</code></pre>`);
            codigoAcumulado = [];
            enBloqueDeCodigo = false;
        }

        // 2. Guardamos el bloque actual si tiene texto
        if (bloqueActual.textoAcumulado.length > 0) {
            const textoFormateado = bloqueActual.textoAcumulado.join('<br>');
            contenidoProcesadoHtml += `
                <div class="cuadro-bloque ${bloqueActual.tipo}">
                    <h3>${bloqueActual.titulo}</h3>
                    <p>${textoFormateado}</p>
                </div>
            `;
            bloqueActual.textoAcumulado = []; // Limpiar
        }
    };

    for (let linea of lineas) {
        let lineaOriginal = linea;
        let lineaLimpia = linea.trim();

        // Control de bloques de código (detección nativa de Python / JS)
        if (lineaLimpia.startsWith("import ") || lineaLimpia.startsWith("def ") || lineaLimpia.startsWith("if __name__") || (enBloqueDeCodigo && (lineaLimpia.startsWith("print(") || lineaLimpia.startsWith("return ") || lineaLimpia.startsWith("db.append")))) {
            if (!enBloqueDeCodigo) {
                enBloqueDeCodigo = true;
            }
            codigoAcumulado.push(lineaOriginal); // Conservamos indentación original
            continue;
        } else if (enBloqueDeCodigo && lineaLimpia === "" && codigoAcumulado.length > 0) {
            // Permitir líneas vacías dentro del código
            codigoAcumulado.push("");
            continue;
        } else if (enBloqueDeCodigo && !lineaOriginal.startsWith("    ") && !lineaLimpia.startsWith("}") && !lineaLimpia.startsWith("]")) {
            // Si la línea ya no está indentada y no pertenece al código, cerramos el bloque de código interno
            bloqueActual.textoAcumulado.push(`<pre><code>${codigoAcumulado.join('\n')}</code></pre>`);
            codigoAcumulado = [];
            enBloqueDeCodigo = false;
        }

        if (!lineaLimpia) continue;

        // --- DETECTORES DE CAMBIO DE BLOQUE DE COLOR ---

        // 🔴 ROJO: Casos, Problemas graves, Código sucio o errores de diseño
        if (lineaLimpia.startsWith("Caso:") || lineaLimpia.includes("Problema:") || lineaLimpia.includes("🔴") || lineaLimpia.includes("Falla de") || lineaLimpia.includes("Falta de")) {
            cerrarYGuardarBloque();
            bloqueActual = { titulo: "🚨 CASO DE ESTUDIO / PROBLEMA", textoAcumulado: [lineaLimpia], tipo: "rojo" };
            
        // ⚖️ NARANJA: Trade-offs, Sacrificios, Dilemas o Balances arquitectónicos
        } else if (lineaLimpia.startsWith("Sacrificio:") || lineaLimpia.toLowerCase().includes("trade-off") || lineaLimpia.includes("⚖️") || lineaLimpia.includes("Dilema:")) {
            cerrarYGuardarBloque();
            bloqueActual = { titulo: "⚖️ ANÁLISIS DE TRADE-OFF (SACRIFICIOS)", textoAcumulado: [lineaLimpia], tipo: "naranja" };
            
        // 🟢 VERDE: Atributos de Calidad, Éxitos, Métricas u Objetivos cumplidos
        } else if (lineaLimpia.includes("✔") || lineaLimpia.startsWith("Éxito:") || lineaLimpia.includes("🟢") || lineaLimpia.includes("Métricas:") || /^\d+\.\s+(Disponibilidad|Escalabilidad|Resiliencia|Fiabilidad|Durabilidad)/.test(lineaLimpia)) {
            cerrarYGuardarBloque();
            // Si coincide con un atributo de calidad numérico, extraemos el nombre como título dinámico
            const tituloDinamico = lineaLimpia.includes("🟢") ? lineaLimpia : `🟢 ATRIBUTO: ${lineaLimpia}`;
            bloqueActual = { titulo: tituloDinamico, textoAcumulado: [], tipo: "verde" };
            
        // 🛠️ MORADO: Ejercicios propuestos, Enunciados de tareas o Trabajo Autónomo
        } else if (lineaLimpia.includes("Tareas:") || lineaLimpia.includes("🛠️") || lineaLimpia.includes("📌 Ejercicio") || lineaLimpia.includes("📋 ENUNCIADO")) {
            cerrarYGuardarBloque();
            bloqueActual = { titulo: "🛠️ TRABAJO AUTÓNOMO / PRÁCTICA", textoAcumulado: [lineaLimpia], tipo: "morado" };
            
        // 🔵 AZUL: Nuevas secciones generales o preguntas conceptuales de alto nivel
        } else if (lineaLimpia.startsWith("¿") || lineaLimpia.startsWith("🧠") || (lineaLimpia.startsWith("---") === false && lineaLimpia.toUpperCase() === lineaLimpia && lineaLimpia.length > 5 && !lineaLimpia.includes("."))) {
            cerrarYGuardarBloque();
            bloqueActual = { titulo: `📘 ${lineaLimpia}`, textoAcumulado: [], tipo: "azul" };

        // CONTINUACIÓN: Si no detecta palabra clave, se junta de forma inteligente en el cuadro actual
        } else {
            // Convertir selectores markdown simples (* o -) en viñetas limpias para mantener la estética
            if (lineaLimpia.startsWith("* ") || lineaLimpia.startsWith("- ")) {
                bloqueActual.textoAcumulado.push(`• ${lineaLimpia.substring(2)}`);
            } else {
                bloqueActual.textoAcumulado.push(lineaLimpia);
            }
        }
    }
    
    // Cerrar el último bloque remanente
    cerrarYGuardarBloque();
    // =====================================================================

    try {
        await sql`
            INSERT INTO apuntes (semana, titulo, subtitulo, contenido, fecha, categoria, seccion, pdf_url)
            VALUES (${semana}, ${titulo}, ${subtitulo}, ${contenidoProcesadoHtml}, ${fecha}, ${categoria}, ${seccion}, ${pdf_url || null});
        `;
        return response.status(200).json({ success: true, message: 'Artículo parseado y guardado con éxito' });
    } catch (error) {
        return response.status(500).json({ error: error.message });
    }
}