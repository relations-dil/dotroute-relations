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

module.exports = { dom, page, fakeRest, DoTRoute }
