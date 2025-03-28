const { message, warn, fail, message } = require('danger');
const OpenAI = require('openai');
const fs = require('fs');
const { spawnSync } = require('child_process');

// Obtener archivos JS/TS modificados, excluyendo dangerfile.js
const modifiedJSFiles = danger.git.modified_files.filter(
    (file) => (file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')) && file !== 'dangerfile.js'
);

async function analyzeCodePatterns(file) {
    const fileContent = await danger.git.diffForFile(file);
    if (fileContent && fileContent.added) {
        const lines = fileContent.added.split('\n');

        lines.forEach((line, index) => {
            const lineNumber = index + 1;

            // Error: Uso de console.log
            if (line.includes('console.log')) {
                warn(`⚠️ Se encontró un \`console.log\` en **${file}** línea **${lineNumber}**. Considera eliminarlo.`, file, lineNumber);
            }

            // Error: Bucle infinito
            if (line.includes('while (true)') || line.includes('for (;;);')) {
                fail(`❌ Posible bucle infinito en **${file}** línea **${lineNumber}**. Revisa la lógica.`, file, lineNumber);
            }

            // Error: Uso de : any en TypeScript
            if (line.includes(': any')) {
                warn(`⚠️ Uso de \`any\` en **${file}** línea **${lineNumber}**. Considera un tipo más específico.`, file, lineNumber);
            }

            // Error: Función recursiva sin condición de salida
            if (/function\s+([a-zA-Z0-9_]+)\s*\(.*\)\s*{[\s\S]*\1\(/.test(line)) {
                fail(
                    `⚠️ Posible recursión infinita en **${file}** línea **${lineNumber}**. Asegura una condición de salida.`,
                    file,
                    lineNumber
                );
            }
        });
    }
}

// Verificar si hay archivos modificados
function runESLint(file) {
    const result = spawnSync('npx', ['eslint', file, '--format=json'], { encoding: 'utf-8' });

    if (result.error) {
        console.error(`⚠️ No se pudo ejecutar ESLint en ${file}:`, result.error.message);
        return;
    }

    try {
        const lintResults = JSON.parse(result.stdout);
        lintResults.forEach(({ messages }) => {
            messages.forEach(({ line, message: errorMsg, severity }) => {
                const formattedMessage = `🔍 **ESLint (${severity === 2 ? 'Error' : 'Warning'})**: ${errorMsg}`;
                severity === 2 ? fail(formattedMessage, file, line) : warn(formattedMessage, file, line);
            });
        });
    } catch (error) {
        console.error(`❌ Error al parsear el resultado de ESLint en ${file}:`, error.message);
    }
}

// Ejecutar las verificaciones en cada archivo modificado
modifiedJSFiles.forEach(async (file) => {
    await analyzeCodePatterns(file);
    runESLint(file);
});

if (modifiedJSFiles.length === 0) {
    message('✅ No se detectaron archivos JavaScript o TypeScript modificados.');
}

// Configuración de OpenAI
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
