const js = require('@eslint/js')
const globals = require('globals')

module.exports = [
    { ignores: ['dist/', 'gui/', 'api/'] },
    js.configs.recommended,
    {
        // The library is a plain script: a page gives it a window, DoTRoute and doT.
        files: ['lib/**/*.js'],
        languageOptions: {
            sourceType: 'script',
            globals: { ...globals.browser, ...globals.commonjs, DoTRoute: 'readonly', doT: 'readonly', RelationsTemplates: 'readonly' }
        }
    },
    {
        // The tests get the globals a page would give the library, from test/setup.js.
        files: ['test/**/*.js', 'build.js', 'eslint.config.js'],
        languageOptions: {
            sourceType: 'commonjs',
            globals: { ...globals.node, window: 'readonly', document: 'readonly', doT: 'readonly' }
        }
    }
]
