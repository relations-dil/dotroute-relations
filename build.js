// Builds dist/relations.js: the library with its templates inlined, so a page needs one script and
// no requests for template files.
//
//   node build.js

const { mkdirSync, readdirSync, readFileSync, writeFileSync } = require('node:fs')
const { join } = require('node:path')

const templates = {}

for (const file of readdirSync(join(__dirname, 'lib', 'templates')).filter((name) => name.endsWith('.html')).sort()) {
    templates[file.replace(/\.html$/, '')] = readFileSync(join(__dirname, 'lib', 'templates', file), 'utf8')
}

mkdirSync(join(__dirname, 'dist'), { recursive: true })

writeFileSync(
    join(__dirname, 'dist', 'relations.js'),
    `var RelationsTemplates = ${JSON.stringify(templates, null, 4)};\n\n${readFileSync(join(__dirname, 'lib', 'relations.js'), 'utf8')}`
)

console.log(`dist/relations.js: ${Object.keys(templates).length} templates`)
