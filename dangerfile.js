const { message, warn, fail } = require('danger');
const OpenAI = require('openai');
const fs = require('fs');

// Crea una instancia de OpenAI usando la API key
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY, // Usa una variable de entorno para mayor seguridad
});

// Función para analizar el contenido de la PR con ChatGPT
async function analyzePRWithChatGPT() {
    // Obtén la descripción de la PR desde GitHub
    const prDescription = danger.github.pr.body || 'Sin descripción';

    // Configura el prompt que se enviará a ChatGPT
    const prompt = `Analiza esta Pull Request y proporciona sugerencias de mejora:\n\n${prDescription}`;

    try {
        // Llama a la API de OpenAI para obtener una respuesta
        const response = await openai.chat.completions.create({
            model: 'gpt-4',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7, // Controla la creatividad de la respuesta
        });

        // Inyecta el comentario en la PR con las sugerencias de ChatGPT
        message(`🤖 ChatGPT sugiere: ${response.choices[0].message.content}`);
    } catch (error) {
        fail('❌ No se pudo obtener una respuesta de ChatGPT.');
    }
}

// Llama a la función para analizar la PR con ChatGPT
analyzePRWithChatGPT();

// Reglas adicionales de Danger
const filesChanged = danger.git.modified_files.concat(danger.git.created_files);

// 1. Verificar si la PR tiene pruebas
const testFiles = filesChanged.filter((file) => file.includes('__tests__') || file.endsWith('.test.js'));
if (testFiles.length === 0) {
    warn('⚠️ No se han encontrado archivos de prueba. Considera agregar pruebas para este cambio.');
}

// 2. Verificar que la descripción de la PR tenga más de 10 caracteres
if (!danger.github.pr.body || danger.github.pr.body.length < 10) {
    fail('❌ La PR necesita una descripción más detallada.');
}

// 3. Limitar las líneas modificadas
if (danger.github.pr.additions + danger.github.pr.deletions > 500) {
    warn('⚠️ La PR tiene más de 500 líneas cambiadas. Considera dividirla en partes más pequeñas.');
}

// 4. Asegurarse de que no haya `console.log` en el código
const filesWithConsoleLogs = filesChanged.filter((file) => {
    const content = fs.readFileSync(file, 'utf-8');
    return content.includes('console.log');
});

if (filesWithConsoleLogs.length > 0) {
    warn("⚠️ Se encontraron 'console.log' en el código. Recuerda eliminarlos.");
}
