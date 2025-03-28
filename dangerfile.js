const { message, warn, fail, message } = require('danger');
const OpenAI = require('openai');
const fs = require('fs');

// Analizar archivos modificados, excluyendo el propio dangerfile.js
const modifiedJSFiles = danger.git.modified_files.filter(
    (file) => (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')) && file !== 'dangerfile.js'
);

// Revisar errores en los archivos
modifiedJSFiles.forEach(async (file) => {
    const fileContent = await danger.git.diffForFile(file);
    if (fileContent && fileContent.added) {
        const lines = fileContent.added.split('\n');
        lines.forEach((line, index) => {
            // Error: Uso de console.log
            if (line.includes('console.log')) {
                commentOnLine(file, index + 1, `⚠️ Se encontró un \`console.log\` en ${file} línea ${index + 1}. Considera eliminarlo.`);
            }

            // Error: Bucle infinito (while (true) o for (;;))
            if (line.includes('while (true)') || line.includes('for (;;);')) {
                commentOnLine(file, index + 1, `❌ Posible bucle infinito en ${file} línea ${index + 1}. Revisa la lógica.`);
            }

            // Error: Uso de : any en TypeScript
            if (line.includes(': any')) {
                commentOnLine(
                    file,
                    index + 1,
                    `⚠️ Se encontró uso de \`any\` en ${file} línea ${index + 1}. Considera usar un tipo más específico.`
                );
            }

            // Error: Función recursiva sin condición de salida
            if (/function\s+[a-zA-Z0-9_]+\s*\(.*\)\s*{[\s\S]*\1\(/.test(line)) {
                commentOnLine(
                    file,
                    index + 1,
                    `⚠️ Se detectó una función recursiva en ${file} línea ${index + 1}. Verifica que tenga una condición de salida.`
                );
            }
        });
    }
});

// Función auxiliar para comentar en una línea específica del archivo
async function commentOnLine(file, lineNumber, messageText) {
    const fileContent = await danger.github.utils.fileContents(file);
    const lines = fileContent.split('\n');
    const lineContent = lines[lineNumber - 1];
    if (lineContent) {
        const comment = {
            path: file,
            position: lineNumber,
            body: `${messageText}\n\n\`\`\`javascript\n${lineContent}\n\`\`\``,
        };
        danger.github.comment(comment);
    }
}

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

async function analyzePRWithChatGPT() {
    const prDescription = danger.github.pr.body || 'Sin descripción';

    // Configura el prompt que se enviará a ChatGPT
    const prompt = `Analiza esta Pull Request y proporciona sugerencias de mejora:\n\n${prDescription}`;

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
        });

        message(`🤖 ChatGPT sugiere: ${response.choices[0].message.content}`);
    } catch (error) {
        console.error('Error en la API de OpenAI:', error);
        fail('❌ No se pudo obtener una respuesta de ChatGPT.');
    }
}

analyzePRWithChatGPT();
