const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { page, fakeRest, DoTRoute } = require('./setup.js')
const fixtures = require('./fixtures.js')

describe("the test harness", () => {

    it("has DoTRoute and doT to work with, and pages with titles", () => {

        assert.equal(typeof DoTRoute.Application, "function")
        assert.equal(typeof doT.template, "function")
        assert.equal(page("", "Named").window.document.title, "Named")

    })

    it("answers a fake rest from its table and records each request", async () => {

        const rest = fakeRest({
            "GET api/model": fixtures.models,
            "OPTIONS api/unit": (data) => ({ ...fixtures.newUnit, got: data })
        })

        assert.deepEqual(await rest("GET", "api/model"), fixtures.models)
        assert.deepEqual((await rest("OPTIONS", "api/unit", { unit: {} })).got, { unit: {} })
        assert.deepEqual(rest.calls.map((call) => `${call.type} ${call.url}`), ["GET api/model", "OPTIONS api/unit"])

    })

    it("fails a request it has no answer for", async () => {

        await assert.rejects(fakeRest({})("GET", "api/nope"), /no fake response for GET api\/nope/)

    })

})
