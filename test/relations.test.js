const { describe, it, afterEach } = require('node:test')
const assert = require('node:assert/strict')
const { RelationsDR, DoTRoute, fixtures, boot, visit, text, page } = require('./setup.js')

const realFetch = globalThis.fetch

afterEach(() => {
    globalThis.fetch = realFetch
})

// A controller to run fields_input on, for a model called thing, with the fields given.
const inputOf = (app, fields, html) => {
    document.body.innerHTML = html
    const controller = Object.assign(Object.create(app.controllers.Model), { model: { singular: 'thing' }, it: { fields } })
    return controller.fields_input()
}

const field = (name, kind, more = {}) => ({ name, kind, ...more })

describe("DRApp.format", () => {

    it("shows a title for a value that has one, a list as words, and a value as it is", () => {

        const app = boot()

        assert.equal(app.format(2, null, { 2: ["stuff"] }), "stuff")
        assert.equal(app.format([1, "a"]), "1 a")
        assert.equal(app.format("plain"), "plain")
        assert.equal(app.format(0), 0)
        assert.equal(app.format(null), "")
        assert.equal(app.format(undefined), "")

    })

    it("formats each part of a list with its own format", () => {

        const app = boot()

        assert.equal(app.format([60, "x"], ["datetime", null]), `${new Date(60000).toLocaleString()} - x`)
        assert.equal(app.format(["a", "b"], [null, null]), "a - b")

    })

    it("formats a datetime from seconds", () => {

        assert.equal(boot().format(120, "datetime"), new Date(120000).toLocaleString())

    })

})

describe("DRApp.get", () => {

    it("walks a path of __ separated names and indexes", () => {

        const app = boot()

        assert.equal(app.get({ a: { b: [10, 20] } }, "a__b__1"), 20)
        assert.equal(app.get({ a: [1, 2] }, ["a", "0"]), 1)
        assert.equal(app.get({ a: 5 }, "_a"), 5)
        assert.equal(app.get({ a: [{ b: 3 }] }, "a__0__b"), 3)

    })

    it("gives undefined for what isn't there, and starts from nothing", () => {

        const app = boot()

        assert.equal(app.get({ a: 1 }, "x__y"), undefined)
        assert.equal(app.get({ a: [1] }, "a__5__b"), undefined)
        assert.equal(app.get(null, "a"), undefined)
        assert.equal(app.get(null, "0"), undefined)
        assert.equal(app.get({ a: [{ b: 1 }, { b: 2 }] }, "a__-1__b"), undefined)
        assert.equal(app.get({ a: null }, "a__0"), undefined)

    })

    it("leaves no global behind", () => {

        boot().get({ a: 1 }, "a")

        assert.equal("place" in globalThis, false)

    })

})

describe("DRApp.http", () => {

    const respond = (status, body, calls = []) => {
        globalThis.fetch = async (url, options) => {
            calls.push({ url, options })
            return { status, json: async () => { if (body === undefined) { throw new Error("no json") } return body } }
        }
        return calls
    }

    it("gets JSON with no body", async () => {

        const calls = respond(200, { units: [] })

        assert.deepEqual(await boot().http("GET", "api/unit"), { units: [] })
        assert.deepEqual(calls, [{ url: "api/unit", options: { method: "GET", headers: {}, body: undefined } }])

    })

    it("sends what it's given as JSON, or an empty object when there's nothing to send", async () => {

        const calls = respond(201, { unit: { id: 3 } })
        const app = boot()

        await app.http("POST", "api/unit", { unit: { name: "x" } })
        await app.http("DELETE", "api/unit/3")

        const headers = { "Content-Type": "application/json" }

        assert.deepEqual(calls[0].options, { method: "POST", headers, body: '{"unit":{"name":"x"}}' })
        assert.deepEqual(calls[1].options, { method: "DELETE", headers, body: "{}" })

    })

    it("takes 200, 201 and 202 as success", async () => {

        for (const status of [200, 201, 202]) {
            respond(status, { status })
            assert.deepEqual(await boot().http("PATCH", "api/unit/1", { unit: {} }), { status })
        }

    })

    it("throws what went wrong, with the API's message and the response", async () => {

        respond(404, { message: "unit: none retrieved" })

        await assert.rejects(boot().http("GET", "api/unit/9"), (error) => {
            assert.equal(error.message, "GET: api/unit/9 failed: unit: none retrieved")
            assert.equal(error.status, 404)
            assert.deepEqual(error.body, { message: "unit: none retrieved" })
            return true
        })

    })

    it("throws without a message when the response has none, or isn't JSON", async () => {

        respond(500, { traceback: "..." })
        await assert.rejects(boot().http("GET", "api/unit"), { message: "GET: api/unit failed" })

        respond(502, undefined)
        await assert.rejects(boot().http("GET", "api/unit"), (error) => {
            assert.equal(error.message, "GET: api/unit failed")
            assert.equal(error.body, null)
            return true
        })

    })

    it("is what DRApp.rest is until something else is put there", () => {

        const { window: pane } = page()
        globalThis.window = pane
        globalThis.document = pane.document
        const app = RelationsDR.install(new DoTRoute.Application("body", pane, true))

        assert.equal(app.rest, app.http)

    })

})

describe("DRApp.error", () => {

    it("shows a problem at the top of the page, as text", () => {

        const app = boot()

        app.error("<b>bad</b> thing")

        assert.equal(document.body.firstChild.id, "relations-error")
        assert.equal(text("#relations-error"), "<b>bad</b> thing")
        assert.equal(document.querySelectorAll("#relations-error b").length, 0)
        assert.equal(document.querySelector("#relations-error .uk-alert-danger").hasAttribute("uk-alert"), true)

    })

    it("replaces the last problem in the box that's already there", () => {

        const app = boot({}, '<div id="relations-error"></div><p>page</p>')

        app.error("first")
        app.error("second")

        assert.equal(document.querySelectorAll("#relations-error").length, 1)
        assert.equal(text("#relations-error"), "second")

    })

})

describe("RelationsDR.install", () => {

    it("fetches no template files: they're inlined", () => {

        const app = boot()

        assert.equal(app.load("header"), RelationsDR.templates.header)
        assert.deepEqual(Object.keys(RelationsDR.templates).sort(),
            ["create", "fields", "footer", "form", "header", "home", "list", "retrieve", "update"])

    })

    it("is what a page gets as DRApp when it loads, titled for the page", () => {

        const { window: pane } = page("", "Some Title")

        assert.equal(typeof window.DRApp.title, "string")
        assert.equal(typeof window.DRApp.controllers.Model, "object")
        assert.equal(pane.document.title, "Some Title")

    })

})

describe("loaded as a script", () => {

    it("is the global RelationsDR, leaving Relations to @relations-dil/relations", () => {

        const { JSDOM } = require('jsdom')
        const fs = require('node:fs')
        const { window: pane } = new JSDOM('<title>Script</title>', { url: 'http://localhost/', runScripts: 'outside-only' })

        pane.eval(fs.readFileSync(require.resolve('dot/doT.js'), 'utf8'))
        pane.eval(fs.readFileSync(require.resolve('dotroute'), 'utf8'))
        pane.eval(fs.readFileSync(require.resolve('../dist/relations.js'), 'utf8'))

        assert.equal(pane.eval('typeof RelationsDR.start'), "function")
        assert.equal(pane.eval('typeof Relations'), "undefined")
        assert.equal(pane.eval('DRApp.title'), "Script")

    })

})

describe("model and attach", () => {

    it("make routes and a controller for each model", () => {

        const app = boot()

        assert.deepEqual(Object.keys(app.routes).sort(), [
            "home", "test_create", "test_list", "test_retrieve", "test_update",
            "unit_create", "unit_list", "unit_retrieve", "unit_update"
        ])
        assert.deepEqual(Object.keys(app.controllers).sort(), ["Base", "Model", "Test", "Unit"])
        assert.equal(app.controllers.Unit.model, fixtures.models.models[0])

    })

    it("route ids that are numbers, and leave out retrieve and update for a model with no id", () => {

        const app = boot()

        assert.equal(app.match("/unit/5"), true)
        assert.equal(app.current.route.name, "unit_retrieve")
        assert.deepEqual(app.current.path, { id: "5" })
        assert.equal(app.match("/unit/five"), false)
        assert.equal(app.match("/unit/5/update"), true)

        app.model({ id: null, titles: ["name"], title: "Loose", singular: "loose", plural: "looses", list: ["name"] })

        assert.ok(app.routes.loose_list && app.routes.loose_create)
        assert.equal(app.routes.loose_retrieve, undefined)
        assert.equal(app.routes.loose_update, undefined)

    })

    it("only attach models that don't have controllers yet", () => {

        const app = boot()
        const routes = app.routing.length

        app.attach()

        assert.equal(app.routing.length, routes)

    })

})

describe("RelationsDR.start", () => {

    it("fetches the models, makes the routes, starts routing and shows home", async () => {

        const app = boot({ "GET api/model": fixtures.models }, "", { attach: false })

        await RelationsDR.start()

        assert.deepEqual(app.rest.calls.map((call) => `${call.type} ${call.url}`), ["GET api/model"])
        assert.equal(app.models, fixtures.models.models)
        assert.ok(app.routes.home && app.routes.unit_list)
        assert.match(text("h3"), /^Test App$/)
        assert.deepEqual([...document.querySelectorAll(".uk-navbar-nav a")].map((a) => a.textContent.trim()), ["Home", "Unit", "Test"])

    })

    it("shows what went wrong, instead of leaving the page blank, when the API is down", async () => {

        const app = boot({}, "", { attach: false })

        app.rest = async () => { throw new Error("GET: api/model failed: down") }

        await RelationsDR.start()

        assert.equal(text("#relations-error"), "GET: api/model failed: down")

    })

    it("shows a hash that nothing routes to", async () => {

        boot({ "GET api/model": fixtures.models }, "", { attach: false })

        window.location.hash = "#/nowhere"

        await RelationsDR.start()

        assert.equal(text("#relations-error"), "Unable to route: #/nowhere")

    })

})

describe("model_path", () => {

    const one = () => ({ fields: [{ name: "id", kind: "int", readonly: true, original: 2 }, { name: "name", kind: "str", required: true, original: "stuff" }], errors: [] })

    // An app on the models-under-api/model/ layout, started the way a page starts it.
    const started = async (table) => {

        const app = boot({ "GET api/model": fixtures.models, ...table }, "", { attach: false })

        await RelationsDR.start({ model_path: "api/model/" })

        return app

    }

    const requests = (app) => app.rest.calls.map((call) => `${call.type} ${call.url}`)

    it("is api/ until it's set", () => {

        assert.equal(boot().model_path, "api/")

    })

    it("stays api/ when start gets no options, or options without one", async () => {

        const app = boot({ "GET api/model": fixtures.models }, "", { attach: false })

        await RelationsDR.start({})

        assert.equal(app.model_path, "api/")
        assert.equal(app.controllers.Unit.url(), "api/unit")

        await RelationsDR.start()

        assert.equal(app.model_path, "api/")

    })

    it("is what start is given", async () => {

        const app = await started({})

        assert.equal(app.model_path, "api/model/")

    })

    it("asks for the models at api/model, in either layout", async () => {

        const app = await started({})

        assert.deepEqual(requests(app), ["GET api/model"])
        assert.equal(app.models, fixtures.models.models)

    })

    it("makes the models' urls under it", async () => {

        const app = await started({})
        const unit = app.controllers.Unit

        assert.equal(unit.url(), "api/model/unit")
        assert.equal(unit.url({}), "api/model/unit")
        assert.equal(unit.url({ like: "a b&c" }), "api/model/unit?like=a+b%26c")

        app.match("/unit/7")
        assert.equal(unit.id_url(), "api/model/unit/7")

    })

    it("lists and searches there", async () => {

        const app = await started({
            "GET api/model/unit": () => ({ ...fixtures.units }),
            "GET api/model/unit?like=stu": { units: [{ id: 2, name: "stuff" }], overflow: false, formats: {} }
        })

        await visit(app, "/unit")

        assert.equal(document.querySelectorAll("tbody tr").length, 2)

        document.getElementById("like").value = "stu"
        await app.controllers.Unit.search()

        assert.equal(app.rest.calls.at(-1).url, "api/model/unit?like=stu")
        assert.equal(document.querySelectorAll("tbody tr").length, 1)

    })

    it("creates there", async () => {

        const app = await started({
            "OPTIONS api/model/unit": (data) => data ? { ...fixtures.newUnit, errors: [] } : fixtures.newUnit,
            "POST api/model/unit": { unit: { id: 3, name: "new" } }
        })

        await visit(app, "/unit/create")
        document.getElementById("name").value = "new"
        await app.controllers.Unit.create_save()

        assert.deepEqual(requests(app).slice(1), ["OPTIONS api/model/unit", "OPTIONS api/model/unit", "POST api/model/unit"])
        assert.equal(window.location.hash, "#/unit/3")

    })

    it("retrieves and updates there", async () => {

        const app = await started({ "OPTIONS api/model/unit/2": one, "PATCH api/model/unit/2": { updated: 1 } })

        await visit(app, "/unit/2/update")
        document.getElementById("name").value = "things"
        await app.controllers.Unit.update_save()

        assert.deepEqual(requests(app).slice(1), ["OPTIONS api/model/unit/2", "OPTIONS api/model/unit/2", "PATCH api/model/unit/2"])
        assert.deepEqual(app.rest.calls.at(-1).data, { unit: { name: "things" }, likes: {} })

    })

    it("deletes there", async () => {

        const app = await started({ "OPTIONS api/model/unit/2": one, "DELETE api/model/unit/2": { deleted: 1 } })

        window.confirm = () => true
        globalThis.confirm = () => true

        await visit(app, "/unit/2")
        await app.controllers.Unit.delete()

        assert.deepEqual(requests(app).slice(1), ["OPTIONS api/model/unit/2", "DELETE api/model/unit/2"])
        assert.equal(window.location.hash, "#/unit")

    })

    it("can be set on DRApp before start, which start then leaves alone", async () => {

        const app = boot({ "GET api/model": fixtures.models }, "", { attach: false })

        app.model_path = "api/model/"
        await RelationsDR.start()

        assert.equal(app.controllers.Unit.url(), "api/model/unit")

    })

})

describe("controllers", () => {

    const unitRows = () => [...document.querySelectorAll("tbody tr")].map((row) => text.call(null, "tbody tr:nth-child(" + (1 + [...document.querySelectorAll("tbody tr")].indexOf(row)) + ")"))

    describe("urls and routes", () => {

        it("make the API's urls", () => {

            const app = boot()
            const unit = app.controllers.Unit

            assert.equal(unit.url(), "api/unit")
            assert.equal(unit.url({}), "api/unit")
            assert.equal(unit.url({ like: "a b&c" }), "api/unit?like=a+b%26c")

            app.match("/unit/7")
            assert.equal(unit.id_url(), "api/unit/7")

        })

        it("go to this model's route for an action, with an id when there is one", () => {

            const app = boot()
            const unit = app.controllers.Unit

            unit.route("list")
            assert.equal(window.location.hash, "#/unit")

            unit.route("retrieve", 4)
            assert.equal(window.location.hash, "#/unit/4")

            unit.route("update", 4)
            assert.equal(window.location.hash, "#/unit/4/update")

        })

    })

    describe("list and search", () => {

        it("lists what the API has", async () => {

            const app = boot({ "GET api/unit": () => ({ ...fixtures.units }) })

            await visit(app, "/unit")

            assert.deepEqual(unitRows().length, 2)
            assert.match(text("tbody tr:nth-child(1)"), /^1 people$/)
            assert.match(text("tbody tr:nth-child(2)"), /^2 stuff$/)
            assert.equal(document.getElementById("like").value, "")
            assert.equal(app.controllers.Unit.it.like, "")

        })

        it("shows a parent's title where a key is", async () => {

            const app = boot({ "GET api/test": () => ({ ...fixtures.tests }) })

            await visit(app, "/test")

            assert.match(text("tbody tr:nth-child(1)"), /^1 stuff moar$/)

        })

        it("searches, keeping the search in the box, and lists everything when it's empty", async () => {

            const app = boot({
                "GET api/unit?like=stu": { units: [{ id: 2, name: "stuff" }], overflow: false, formats: {} },
                "GET api/unit": () => ({ ...fixtures.units })
            })

            await visit(app, "/unit")

            document.getElementById("like").value = "stu"
            await app.controllers.Unit.search()

            assert.deepEqual(app.rest.calls.at(-1), { type: "GET", url: "api/unit?like=stu", data: undefined })
            assert.equal(document.querySelectorAll("tbody tr").length, 1)
            assert.equal(document.getElementById("like").value, "stu")

            document.getElementById("like").value = ""
            await app.controllers.Unit.search()

            assert.equal(app.rest.calls.at(-1).url, "api/unit")
            assert.equal(document.querySelectorAll("tbody tr").length, 2)

        })

        it("searches when enter is pressed, and for nothing else", async () => {

            const app = boot({ "GET api/unit": () => ({ ...fixtures.units }) })

            await visit(app, "/unit")

            let prevented = 0
            const unit = app.controllers.Unit

            assert.equal(unit.like({ keyCode: 65, preventDefault: () => prevented++ }), undefined)
            assert.equal(prevented, 0)

            for (const keyCode of [10, 13]) {
                await unit.like({ keyCode, preventDefault: () => prevented++ })
            }

            assert.equal(prevented, 2)
            assert.equal(app.rest.calls.length, 3)

        })

    })

    describe("create", () => {

        it("shows an empty form", async () => {

            const app = boot({ "OPTIONS api/unit": fixtures.newUnit })

            await visit(app, "/unit/create")

            assert.equal(document.querySelectorAll("input").length, 1)
            assert.equal(document.getElementById("name").value, "")
            assert.deepEqual(app.rest.calls, [{ type: "OPTIONS", url: "api/unit", data: undefined }])

        })

        it("saves what was typed, then shows the new record", async () => {

            const app = boot({
                "OPTIONS api/unit": (data) => data ? { ...fixtures.newUnit, errors: [] } : fixtures.newUnit,
                "POST api/unit": { unit: { id: 3, name: "new" } }
            })

            await visit(app, "/unit/create")
            document.getElementById("name").value = "new"
            await app.controllers.Unit.create_save()

            const sent = { unit: { name: "new" }, likes: {} }

            assert.deepEqual(app.rest.calls.slice(1).map((call) => [call.type, call.url, call.data]), [
                ["OPTIONS", "api/unit", sent],
                ["POST", "api/unit", sent]
            ])
            assert.equal(window.location.hash, "#/unit/3")

        })

        it("shows the form again, with what's wrong, and doesn't save", async () => {

            const app = boot({
                "OPTIONS api/unit": (data) => data ? { ...fixtures.newUnit, errors: ["name is taken"] } : fixtures.newUnit
            })

            await visit(app, "/unit/create")
            await app.controllers.Unit.create_save()

            assert.equal(app.rest.calls.some((call) => call.type == "POST"), false)
            assert.match(text(".uk-alert-danger"), /name is taken/)

        })

        it("goes back to the list when the model has no id to show", async () => {

            const app = boot({
                "OPTIONS api/loose": { ...fixtures.newUnit, errors: [] },
                "POST api/loose": { loose: { name: "x" } }
            })

            app.model({ id: null, titles: ["name"], title: "Loose", singular: "loose", plural: "looses", list: ["name"] })

            await visit(app, "/loose/create")
            document.getElementById("name").value = "x"
            await app.controllers.Loose.create_save()

            assert.equal(window.location.hash, "#/loose")

        })

    })

    describe("retrieve and update", () => {

        const one = (data) => data ? { ...fixtures.newUnit, fields: [{ name: "id", kind: "int", readonly: true, original: 2 }, { name: "name", kind: "str", required: true, original: "stuff" }], errors: [] } : { fields: [{ name: "id", kind: "int", readonly: true, original: 2 }, { name: "name", kind: "str", required: true, original: "stuff" }], errors: [] }

        it("shows a record, read only, with buttons for what can be done to it", async () => {

            const app = boot({ "OPTIONS api/unit/2": one })

            await visit(app, "/unit/2")

            assert.equal(document.querySelectorAll("input").length, 0)
            assert.match(text("form"), /stuff/)
            assert.deepEqual([...document.querySelectorAll(".uk-overflow-auto > p > button")].map((b) => b.textContent.trim()), ["Update", "Delete"])

        })

        it("shows it as a form to change", async () => {

            const app = boot({ "OPTIONS api/unit/2": one })

            await visit(app, "/unit/2/update")

            assert.equal(document.getElementById("name").value, "stuff")

        })

        it("saves a change, then shows the record", async () => {

            const app = boot({ "OPTIONS api/unit/2": one, "PATCH api/unit/2": { updated: 1 } })

            await visit(app, "/unit/2/update")
            document.getElementById("name").value = "things"
            await app.controllers.Unit.update_save()

            assert.deepEqual(app.rest.calls.at(-1), { type: "PATCH", url: "api/unit/2", data: { unit: { name: "things" }, likes: {} } })
            assert.equal(window.location.hash, "#/unit/2")

        })

        it("shows the form again, with what's wrong, and doesn't save a change", async () => {

            const app = boot({
                "OPTIONS api/unit/2": (data) => data ? { ...one(), errors: ["name is taken"] } : one()
            })

            await visit(app, "/unit/2/update")
            await app.controllers.Unit.update_save()

            assert.equal(app.rest.calls.some((call) => call.type == "PATCH"), false)
            assert.match(text(".uk-alert-danger"), /name is taken/)

        })

        it("asks the API about the form again when a field says it should, on a new record or an old one", async () => {

            const app = boot({
                "OPTIONS api/unit": fixtures.newUnit,
                "OPTIONS api/unit/2": one
            })

            await visit(app, "/unit/create")
            await app.controllers.Unit.fields_change()
            assert.deepEqual(app.rest.calls.at(-1), { type: "OPTIONS", url: "api/unit", data: { unit: {}, likes: {} } })

            await visit(app, "/unit/2/update")
            await app.controllers.Unit.fields_change()
            assert.equal(app.rest.calls.at(-1).url, "api/unit/2")

        })

    })

    describe("delete", () => {

        it("deletes once it's confirmed, then shows the list", async () => {

            const app = boot({ "OPTIONS api/unit/2": { fields: [], errors: [] }, "DELETE api/unit/2": { deleted: 1 } })

            window.confirm = () => true
            globalThis.confirm = () => true

            await visit(app, "/unit/2")
            await app.controllers.Unit.delete()

            assert.deepEqual(app.rest.calls.at(-1), { type: "DELETE", url: "api/unit/2", data: undefined })
            assert.equal(window.location.hash, "#/unit")

        })

        it("does nothing when it isn't confirmed", async () => {

            const app = boot({ "OPTIONS api/unit/2": { fields: [], errors: [] } })

            globalThis.confirm = () => false

            await visit(app, "/unit/2")
            await app.controllers.Unit.delete()

            assert.equal(app.rest.calls.length, 1)

        })

    })

    describe("when things go wrong or the user moves on", () => {

        // A rest whose answer to one request is held until the test lets it go.
        const held = (key, response) => {
            const holding = {}
            const promise = new Promise((resolve) => { holding.release = () => resolve(response) })
            return { answer: () => promise, release: () => holding.release() }
        }

        const away = (app) => {
            app.current = { ...app.current, moved: true }
        }

        it("shows a failure at the top of the page", async () => {

            const app = boot({})

            await visit(app, "/unit")

            assert.equal(text("#relations-error"), "no fake response for GET api/unit")

        })

        it("shows a failure in a form's JSON, and leaves what was typed", async () => {

            const app = boot({
                "OPTIONS api/thing": { fields: [{ name: "l", kind: "list", title: "Things" }], errors: [] }
            })

            app.model({ id: null, titles: ["l"], title: "Thing", singular: "thing", plural: "things", list: ["l"] })

            await visit(app, "/thing/create")
            document.getElementById("l").value = "[nope"
            await app.controllers.Thing.create_save()

            assert.equal(text("#relations-error"), "Things: not valid JSON")
            assert.equal(document.getElementById("l").value, "[nope")

        })

        it("shows nothing of a failure the user has already moved on from", async () => {

            const app = boot({})
            const pending = visit(app, "/unit")

            away(app)
            await pending

            assert.equal(document.getElementById("relations-error"), null)

        })

        for (const [name, path, table, run] of [
            ["list", "/unit", { "GET api/unit": null }, (app) => app.controllers.Unit.list()],
            ["search", "/unit", { "GET api/unit?like=x": null }, (app) => { document.body.innerHTML = '<input id="like" value="x">'; return app.controllers.Unit.search() }],
            ["fields_change", "/unit/create", { "OPTIONS api/unit": null }, (app) => { app.controllers.Unit.it = { fields: [] }; return app.controllers.Unit.fields_change() }],
            ["create", "/unit/create", { "OPTIONS api/unit": null }, (app) => app.controllers.Unit.create()],
            ["retrieve", "/unit/2", { "OPTIONS api/unit/2": null }, (app) => app.controllers.Unit.retrieve()]
        ]) {
            it(`doesn't draw a late ${name} over the page the user went to`, async () => {

                const slow = held("slow", { units: [], overflow: false, formats: {}, fields: [], errors: [] })
                const app = boot(Object.fromEntries(Object.keys(table).map((key) => [key, slow.answer])))

                app.match(path)

                const before = document.body.innerHTML
                const pending = run(app)

                away(app)
                slow.release()
                await pending

                assert.equal(document.body.innerHTML.replace(/<input id="like"[^>]*>/, ""), before.replace(/<input id="like"[^>]*>/, ""))

            })
        }

        it("doesn't send the user back after a save they've moved on from", async () => {

            const slowOptions = held("options", { fields: [], errors: [] })
            const slowPost = held("post", { unit: { id: 3 } })
            const app = boot({ "OPTIONS api/unit": slowOptions.answer, "POST api/unit": slowPost.answer })

            app.controllers.Unit.it = { fields: [] }
            app.match("/unit/create")
            window.location.hash = "#/somewhere"

            const pending = app.controllers.Unit.create_save()

            slowOptions.release()
            await new Promise((resolve) => setTimeout(resolve, 5))
            away(app)
            slowPost.release()
            await pending

            assert.equal(window.location.hash, "#/somewhere")

        })

        it("doesn't draw a late form check, or send the user back after a late save, or delete", async () => {

            const checking = held("check", { fields: [], errors: [] })
            const app = boot({
                "OPTIONS api/unit/2": checking.answer,
                "PATCH api/unit/2": { updated: 1 },
                "DELETE api/unit/2": { deleted: 1 }
            })

            app.controllers.Unit.it = { fields: [] }
            app.match("/unit/2/update")
            window.location.hash = "#/somewhere"

            const pending = app.controllers.Unit.update_save()

            away(app)
            checking.release()
            await pending

            assert.equal(window.location.hash, "#/somewhere")

            const patching = held("patch", { updated: 1 })

            app.rest = async (type) => type == "PATCH" ? patching.answer() : { fields: [], errors: [] }
            app.match("/unit/2/update")

            const saving = app.controllers.Unit.update_save()

            await new Promise((resolve) => setTimeout(resolve, 5))
            away(app)
            patching.release()
            await saving

            assert.equal(window.location.hash, "#/somewhere")

            const deleting = held("delete", { deleted: 1 })

            globalThis.confirm = () => true
            app.rest = () => deleting.answer()
            app.match("/unit/2")

            const removing = app.controllers.Unit.delete()

            away(app)
            deleting.release()
            await removing

            assert.equal(window.location.hash, "#/somewhere")

        })

        it("doesn't send the user to a page after a late create that has errors, either", async () => {

            const late = held("late", { fields: [], errors: ["nope"] })
            const app = boot({ "OPTIONS api/unit": late.answer })

            app.controllers.Unit.it = { fields: [] }
            app.match("/unit/create")

            const pending = app.controllers.Unit.create_save()

            away(app)
            late.release()
            await pending

            assert.equal(document.getElementById("relations-error"), null)

        })

    })

})

describe("reading a form", () => {

    // What the old jQuery version of fields_input gave for each of these, recorded before it was
    // changed, and what this one gives. Where they differ it's noted.

    const cases = [
        ["str", [field("name", "str")], '<input id="name" value="hello">', { name: "hello" }],
        ["str, empty, is left out", [field("name", "str")], '<input id="name" value="">', {}],
        ["int, rounded", [field("n", "int")], '<input id="n" value="3.6">', { n: 4 }],
        ["int, empty, is left out", [field("n", "int")], '<input id="n" value="">', {}],
        ["float, which stays as text", [field("r", "float")], '<input id="r" value="3.5">', { r: "3.5" }],
        ["bool, checked", [field("a", "bool")], '<input id="a" type="checkbox" checked>', { a: true }],
        ["bool, not checked", [field("a", "bool")], '<input id="a" type="checkbox">', { a: false }],
        ["set, from words", [field("t", "set")], '<input id="t" value="a b c">', { t: ["a", "b", "c"] }],
        ["set, from words with extra spaces", [field("t", "set")], '<input id="t" value="a  b">', { t: ["a", "b"] }],
        ["set, from words with a leading space (was ['', 'a', 'b'])", [field("t", "set")], '<input id="t" value=" a b">', { t: ["a", "b"] }],
        ["set, from no words (was [''])", [field("t", "set")], '<input id="t" value="">', { t: [] }],
        ["options as radios, one checked", [field("s", "str", { options: ["active", "inactive"] })],
            '<input type="radio" name="s" value="active"><input type="radio" name="s" value="inactive" checked>', { s: "inactive" }],
        ["options as radios, none checked, is left out", [field("s", "str", { options: ["active", "inactive"] })],
            '<input type="radio" name="s" value="active"><input type="radio" name="s" value="inactive">', {}],
        ["a set of options as checkboxes", [field("c", "set", { options: ["red", "green", "blue"], multi: true })],
            '<input type="checkbox" name="c" value="red" checked><input type="checkbox" name="c" value="green"><input type="checkbox" name="c" value="blue" checked>', { c: ["red", "blue"] }],
        ["a set of options as checkboxes, none checked", [field("c", "set", { options: ["red", "green"] })],
            '<input type="checkbox" name="c" value="red"><input type="checkbox" name="c" value="green">', { c: [] }],
        ["a select's int option, as the int", [field("u", "int", { options: [1, 2] })],
            '<select id="u"><option value="1">a</option><option value="2" selected>b</option></select>', { u: 2 }],
        ["a select's str option", [field("s", "str", { options: ["x", "y"] })],
            '<select id="s"><option value="x">x</option><option value="y" selected>y</option></select>', { s: "y" }],
        ["list, from JSON", [field("l", "list")], '<textarea id="l">[1,{"a":2}]</textarea>', { l: [1, { a: 2 }] }],
        ["list, empty", [field("l", "list")], '<textarea id="l"></textarea>', { l: [] }],
        ["dict, from JSON", [field("d", "dict")], '<textarea id="d">{"a":[1]}</textarea>', { d: { a: [1] } }],
        ["dict, empty", [field("d", "dict")], '<textarea id="d"></textarea>', { d: {} }],
        ["a class's attributes, all of them", [field("loc", "Net", { init: { x: "x", y: "y" } })],
            '<input id="loc__x" value="1"><input id="loc__y" value="2">', { loc: { x: "1", y: "2" } }],
        ["a class's attributes, some of them", [field("loc", "Net", { init: { x: "x", y: "y" } })],
            '<input id="loc__x" value="1"><input id="loc__y" value="">', { loc: { x: "1" } }],
        ["a class's attributes, none, is left out", [field("loc", "Net", { init: { x: "x", y: "y" } })],
            '<input id="loc__x" value=""><input id="loc__y" value="">', {}],
        ["read only fields are skipped", [field("id", "int", { readonly: true }), field("name", "str")],
            '<input id="id" value="9"><input id="name" value="n">', { name: "n" }],
        ["several together", [field("id", "int", { readonly: true }), field("name", "str"), field("active", "bool"), field("l", "list")],
            '<input id="name" value="x"><input id="active" type="checkbox" checked><textarea id="l"></textarea>', { name: "x", active: true, l: [] }]
    ]

    for (const [name, fields, html, expected] of cases) {
        it(name, () => {
            assert.deepEqual(inputOf(boot(), fields, html), { thing: expected, likes: {} })
        })
    }

    it("collects what's typed to search a parent's options", () => {

        const input = inputOf(boot(), [field("u", "int", { options: [1, 2] })],
            '<select id="u"><option value="2" selected>b</option></select><input id="u__like" value="st">')

        assert.deepEqual(input, { thing: { u: 2 }, likes: { u: "st" } })

    })

    it("says which field has JSON that won't parse", () => {

        assert.throws(() => inputOf(boot(), [field("d", "dict", { title: "Details" })], '<textarea id="d">{nope</textarea>'),
            { message: "Details: not valid JSON" })
        assert.throws(() => inputOf(boot(), [field("d", "dict")], '<textarea id="d">{nope</textarea>'),
            { message: "d: not valid JSON" })

    })

})
