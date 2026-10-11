// What the library reaches for: a window with a title, doT, and DoTRoute. And a stand-in for the API.

const { JSDOM } = require('jsdom')

// A page for an application to run in.
const page = (html = '', title = 'unit-test-app') =>
    new JSDOM(`<!DOCTYPE html><title>${title}</title><body>${html}</body>`, { url: 'http://localhost/', pretendToBeVisual: true })

const dom = page()

globalThis.window = dom.window
globalThis.document = dom.window.document
globalThis.doT = require('dot')

const DoTRoute = require('dotroute')

// A page has DoTRoute as a global, since it's a script.
globalThis.DoTRoute = DoTRoute

// DRApp.rest, answered from a table of "TYPE url" to a response: an object is sent back as is, a
// function is called with the request's data. Every request is recorded in .calls. A request
// that isn't in the table fails, so a test that asks for something unexpected says so.

const fakeRest = (table) => {
    const rest = async (type, url, data) => {
        rest.calls.push({ type, url, data })

        const key = `${type} ${url}`

        if (!(key in table)) {
            throw new Error(`no fake response for ${key}`)
        }

        const response = table[key]

        return typeof response === 'function' ? response(data) : response
    }

    rest.calls = []

    return rest
}

// The library as a page loads it. Loading it makes a DRApp on the page the harness started with.

const RelationsDR = require('../dist/relations.js')
const fixtures = require('./fixtures.js')

// A new page with a new application on it, as the globals the library reaches for, so one test's
// listeners and DOM never reach into another's. The application knows the fixtures' models and
// answers rest from the table given.

const boot = (table = {}, html = '', { attach = true } = {}) => {
    const { window: pane } = page(html)

    globalThis.window = pane
    globalThis.document = pane.document

    const app = RelationsDR.install(new DoTRoute.Application('body', pane, true))

    // The templates say DRApp: on a page that's window.DRApp, here it's a global.
    pane.DRApp = globalThis.DRApp = app
    app.title = 'Test App'
    app.rest = fakeRest(table)

    // What RelationsDR.start does, so the application is as a started one is.
    if (attach) {
        app.models = fixtures.models.models
        app.route('home', '/', 'Home', 'Base', 'home')
        app.attach()
    }

    return app
}

// Go to a path as the router would, and resolve when the route's action has finished.

const visit = (app, path) => {
    if (!app.match(path)) {
        throw new Error(`no route for ${path}`)
    }

    return app.current.route.enter(app)
}

// What's in the page, or in part of it, as one line of text.

const text = (selector = 'body') => document.querySelector(selector).textContent.replace(/\s+/g, ' ').trim()

module.exports = { dom, page, fakeRest, DoTRoute, RelationsDR, fixtures, boot, visit, text }
