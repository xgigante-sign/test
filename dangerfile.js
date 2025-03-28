const { message, warn, fail } = require('danger');
const OpenAI = require('openai');
const fs = require('fs');

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
        fail('❌ No se pudo obtener una respuesta de ChatGPT.');
    }
}

analyzePRWithChatGPT();

// Reglas adicionales de Danger
const filesChanged = danger.git.modified_files.concat(danger.git.created_files);

// 1. Verificar si la PR tiene pruebas
const testFiles = filesChanged.filter((file) => file.includes('__tests__') || file.endsWith('.test.js'));
if (testFiles.length === 0) {
    warn('⚠️ No se han encontrado archivos de prueba. Considera agregar pruebas para este cambio.');
}

// 1. Verificar tamaño del PR
const bigPRThreshold = 500;
if (danger.github.pr.additions + danger.github.pr.deletions > bigPRThreshold) {
    warn('⚠️ Este PR es bastante grande. Considera dividirlo en partes más pequeñas.');
}

// 2. Verificar descripción del PR
if (!danger.github.pr.body || danger.github.pr.body.length < 10) {
    fail('❌ Agrega una descripción significativa al PR.');
}

// 3. Verificar cambios en package.json sin actualizar package-lock.json
danger.git.modified_files.forEach((file) => {
    if (file === 'package.json' && !danger.git.modified_files.includes('package-lock.json')) {
        fail('❌ Se modificó `package.json` pero no `package-lock.json`.');
    }
});

// 4. Verificar que haya pruebas si se modificó código en /src
const hasTests = danger.git.modified_files.some((file) => file.includes('__tests__') || file.includes('tests'));
const hasSrcChanges = danger.git.modified_files.some((file) => file.includes('src'));
if (hasSrcChanges && !hasTests) {
    warn('⚠️ No se detectaron pruebas para los cambios en `/src`. Considera agregar algunas.');
}

// 5. Verificar console.log en el código
const modifiedJSFiles = danger.git.modified_files.filter(
    (file) => file.endsWith('.js') || file.endsWith('.jsx') || file.endsWith('.ts') || file.endsWith('.tsx')
);
modifiedJSFiles.forEach(async (file) => {
    const fileContent = await danger.git.diffForFile(file);
    if (fileContent && fileContent.added && fileContent.added.includes('console.log')) {
        warn(`⚠️ Se encontró un \`console.log\` en ${file}. Considera eliminarlo antes de hacer merge.`);
    }
});

// 6. Verificar convención de nombres en commits
const conventionalCommitRegex = /^(feat|fix|docs|style|refactor|test|chore)(\([a-z]+\))?: .+/;
danger.git.commits.forEach((commit) => {
    if (!conventionalCommitRegex.test(commit.message)) {
        warn(`⚠️ El commit "${commit.message}" no sigue la convención de nombres (Conventional Commits).`);
    }
});

// 7. Verificar si se actualizaron props en un componente sin actualizar la documentación
const hasComponentChanges = danger.git.modified_files.some((file) => file.includes('src/components'));
const hasDocsChanges = danger.git.modified_files.some((file) => file.includes('docs'));
if (hasComponentChanges && !hasDocsChanges) {
    warn('⚠️ Se modificaron componentes pero no se actualizó la documentación correspondiente.');
}

// 8. Detectar uso de `any` en TypeScript
modifiedJSFiles.forEach(async (file) => {
    const fileContent = await danger.git.diffForFile(file);
    if (fileContent && fileContent.added && fileContent.added.includes(': any')) {
        warn(`⚠️ Se encontró uso de \`any\` en ${file}. Considera usar un tipo más específico.`);
    }
});

// 9. Verificar ESLint y Prettier
message('✅ Recuerda ejecutar `eslint` y `prettier` antes de hacer merge.');

// 10. Asegurar que el PR tenga al menos un revisor
if (!danger.github.requested_reviewers.users.length) {
    warn('⚠️ Este PR no tiene revisores asignados. Recuerda agregar al menos uno.');
}
