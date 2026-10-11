const { describe, it } = require('node:test')
const assert = require('node:assert/strict')
const { fixtures, boot, visit, text } = require('./setup.js')

// Render the Fields template for some fields into the page, and let the test look at the page.
const fields = (list, more = {}) => {
    const app = boot()
    document.body.innerHTML = app.templates.Fields({ fields: list, ...more })
    return app
}

const one = (selector) => document.querySelector(selector)
const all = (selector) => [...document.querySelectorAll(selector)]

describe("the Fields template", () => {

    describe("a plain value", () => {

        it("is a UIkit 3 text input, labelled with the title or else the name", () => {

            fields([{ name: "name", kind: "str", value: "stuff" }, { name: "other", kind: "str", title: "Other Thing", value: "x" }])

            assert.equal(one("#name").value, "stuff")
            assert.equal(one("#name").className, "uk-input")
            assert.equal(one("#name").getAttribute("placeholder"), "name")
            assert.deepEqual(all("label.uk-form-label").map((label) => label.textContent.trim()), ["name", "Other Thing"])
            assert.equal(one("#other").getAttribute("placeholder"), "Other Thing")

        })

        it("shows the value, else the original, else the default", () => {

            fields([
                { name: "a", kind: "str", value: "v", original: "o", default: "d" },
                { name: "b", kind: "str", original: "o", default: "d" },
                { name: "c", kind: "str", default: "d" },
                { name: "d", kind: "str" }
            ])

            assert.deepEqual(["a", "b", "c", "d"].map((id) => one("#" + id).value), ["v", "o", "d", ""])

        })

        it("is shown as text, with a parent's title, when it can't be changed", () => {

            fields([{ name: "unit_id", kind: "int", value: 2, readonly: true, titles: { 2: ["stuff"] }, format: [null] }])

            assert.equal(document.querySelectorAll("input").length, 0)
            assert.match(text(".uk-form-controls"), /stuff/)

        })

        it("is shown as text when the whole form can't be changed", () => {

            fields([{ name: "name", kind: "str", value: "stuff" }], { readonly: true })

            assert.equal(document.querySelectorAll("input").length, 0)
            assert.match(text(".uk-form-controls"), /stuff/)

        })

        it("asks the controller to check the form again as it changes, when the field says to", () => {

            fields([{ name: "name", kind: "str", trigger: true }, { name: "ok", kind: "bool", trigger: true }])

            assert.match(one("#name").getAttribute("OnInput"), /fields_change\(\)/)
            assert.match(one("#ok").getAttribute("OnClick"), /fields_change\(\)/)

        })

    })

    describe("a bool", () => {

        it("is a checkbox, checked when it's true", () => {

            fields([{ name: "on", kind: "bool", value: true }, { name: "off", kind: "bool", value: false }])

            assert.equal(one("#on").className, "uk-checkbox")
            assert.equal(one("#on").checked, true)
            assert.equal(one("#off").checked, false)

        })

        it("is shown as true or false when it can't be changed", () => {

            fields([{ name: "on", kind: "bool", value: true, readonly: true }, { name: "off", kind: "bool", readonly: true }])

            assert.deepEqual(all(".uk-form-controls").map((box) => box.textContent.trim()), ["true", "false"])

        })

    })

    describe("a list or dict", () => {

        it("is a textarea of JSON to edit", () => {

            fields([{ name: "l", kind: "list", value: [1, { a: 2 }] }, { name: "d", kind: "dict", original: { a: 1 } }])

            assert.equal(one("textarea#l").className, "uk-textarea")
            assert.deepEqual(JSON.parse(one("#l").value), [1, { a: 2 }])
            assert.deepEqual(JSON.parse(one("#d").value), { a: 1 })

        })

        it("is JSON to read when it can't be changed", () => {

            fields([{ name: "l", kind: "list", value: [1], readonly: true }])

            assert.equal(document.querySelectorAll("textarea").length, 0)
            assert.deepEqual(JSON.parse(one("pre").textContent), [1])

        })

    })

    describe("a choice of options", () => {

        const colors = { name: "color", kind: "str", options: ["red", "green"] }

        it("is radio buttons, with the value checked", () => {

            fields([{ ...colors, value: "green" }])

            assert.deepEqual(all("input.uk-radio").map((radio) => [radio.value, radio.checked]), [["red", false], ["green", true]])
            assert.equal(document.querySelectorAll("select").length, 0)

        })

        it("is checkboxes for a set, with the values checked", () => {

            fields([{ ...colors, kind: "set", value: ["red"] }, { name: "multi", kind: "str", options: ["a", "b"], multi: true }])

            assert.deepEqual(all("input[name=color]").map((box) => [box.className, box.checked]), [["uk-checkbox", true], ["uk-checkbox", false]])
            assert.deepEqual(all("input[name=multi]").map((box) => box.checked), [false, false])

        })

        it("is a select when it asks for one, when there are many, or when it's a parent's records", () => {

            fields([
                { name: "styled", kind: "str", options: ["a"], style: "select" },
                { name: "many", kind: "str", options: Array.from({ length: 11 }, (_, i) => String(i)) },
                { name: "parent", kind: "int", options: [1, 2], titles: { 1: ["people"], 2: ["stuff"] }, value: 2 }
            ])

            assert.equal(all("select.uk-select").length, 3)
            assert.deepEqual(all("#parent option").map((option) => [option.value, option.textContent.trim(), option.selected]),
                [["1", "people", false], ["2", "stuff", true]])

        })

        it("can be left blank, when it says it's optional", () => {

            fields([{ name: "parent", kind: "int", options: [1], titles: { 1: ["people"] }, optional: true }])

            assert.deepEqual(all("#parent option").map((option) => option.value), ["", "1"])

        })

        it("has a box to search the options when there are very many, or too many came back", () => {

            fields([{ name: "parent", kind: "int", options: [1], titles: { 1: ["people"] }, overflow: true, like: "pe" }])

            assert.equal(one("#parent__like").value, "pe")
            assert.match(text(".uk-form-controls"), /Search/)
            assert.match(text(".uk-form-controls"), /Too many results returned/)

            fields([{ name: "parent", kind: "int", options: Array.from({ length: 26 }, (_, i) => i), titles: {} }])

            assert.equal(document.querySelectorAll("#parent__like").length, 1)
            assert.doesNotMatch(text(".uk-form-controls"), /Too many/)

        })

        it("has no search box for a few options", () => {

            fields([{ name: "parent", kind: "int", options: [1, 2], titles: { 1: ["a"], 2: ["b"] } }])

            assert.equal(document.querySelectorAll("#parent__like").length, 0)

        })

        it("is shown as its titles when it can't be changed", () => {

            fields([
                { name: "one", kind: "int", options: [1, 2], titles: { 1: ["people"], 2: ["stuff"] }, value: 2, readonly: true },
                { name: "many", kind: "set", options: ["a", "b"], value: ["a", "b"], readonly: true }
            ])

            assert.equal(document.querySelectorAll("input, select").length, 0)
            assert.match(text(".uk-form-controls:nth-of-type(1)"), /stuff/)
            assert.match(all(".uk-form-controls")[1].textContent.replace(/\s+/g, " "), /a b/)

        })

        it("asks the controller to check the form again as it changes, when the field says to", () => {

            fields([
                { name: "s", kind: "int", options: [1], titles: { 1: ["a"] }, trigger: true },
                { name: "r", kind: "str", options: ["a", "b"], trigger: true }
            ])

            assert.match(one("#s").getAttribute("OnChange"), /fields_change\(\)/)
            assert.match(one("input[name=r]").getAttribute("OnClick"), /fields_change\(\)/)

        })

    })

    describe("a class's attributes", () => {

        it("is a box for each, with what the value holds", () => {

            fields([{ name: "loc", kind: "Net", init: { x: "x", y: "y" }, value: { x: 1, y: 2 } }])

            assert.deepEqual(all("input").map((input) => [input.id, input.value]), [["loc__x", "1"], ["loc__y", "2"]])

        })

        it("is empty boxes when it has no value yet", () => {

            fields([{ name: "loc", kind: "Net", init: { x: "x" }, trigger: true }])

            assert.equal(one("#loc__x").value, "")
            assert.match(one("#loc__x").getAttribute("OnInput"), /fields_change\(\)/)

        })

        it("is JSON to read when it can't be changed", () => {

            fields([{ name: "loc", kind: "Net", init: { x: "x" }, value: { x: 1 }, readonly: true }])

            assert.deepEqual(JSON.parse(one("pre").textContent), { x: 1 })

        })

    })

    describe("around a field", () => {

        it("shows what's wrong with it, and a description with its line breaks", () => {

            fields([{ name: "name", kind: "str", errors: ["is required", "is too short"], description: "What it's called.\nUse letters." }])

            assert.match(text(".uk-text-danger"), /is required\s+is too short/)
            assert.equal(one(".uk-text-meta").innerHTML, "What it's called.<br>Use letters.")

        })

        it("shows links, as plain urls or as objects, that open in a new tab", () => {

            fields([{ name: "name", kind: "str", link: ["https://a.example", { url: "https://b.example", name: "B", target: "_self" }] }])
            fields([{ name: "name", kind: "str", link: "https://c.example" }])

            assert.deepEqual(all(".uk-form-controls a").map((a) => [a.getAttribute("href"), a.textContent, a.getAttribute("target")]),
                [["https://c.example", "https://c.example", "_blank"]])

            fields([{ name: "name", kind: "str", link: ["https://a.example", { url: "https://b.example", name: "B", target: "_self" }] }])

            assert.deepEqual(all(".uk-form-controls a").map((a) => [a.getAttribute("href"), a.textContent, a.getAttribute("target")]),
                [["https://a.example", "https://a.example", "_blank"], ["https://b.example", "B", "_self"]])

        })

        it("shows fields inside a field, under a rule, with names that say where they are", () => {

            fields([{ name: "group", kind: "dict", fields: [{ name: "inner", kind: "str", value: "x" }, { name: "deeper.still", kind: "str" }] }])

            assert.equal(document.querySelectorAll("hr").length, 1)
            assert.equal(one("#group-inner").value, "x")
            assert.equal(document.querySelectorAll("#group-deeper-still").length, 1)

        })

        it("sets a rule above the yaml field", () => {

            fields([{ name: "yaml", kind: "str", value: "a: 1" }])

            assert.equal(document.querySelectorAll("hr").length, 1)

        })

    })

})

describe("the form and its screens", () => {

    it("shows what was done and what's wrong, as UIkit 3 alerts", () => {

        const app = boot()

        app.match("/unit/create")
        document.body.innerHTML = app.templates.Create({ ...fixtures.newUnit, message: "Saved", errors: ["name is taken", "id is read only"] })

        assert.match(text(".uk-alert-success"), /^Saved$/)
        assert.match(text(".uk-alert-danger"), /name is taken\s*id is read only/)
        assert.equal(all(".uk-alert-success, .uk-alert-danger").every((alert) => alert.hasAttribute("uk-alert")), true)

    })

    it("has Create and Cancel on the create screen, Update and Cancel on update, Update and Delete on retrieve", () => {

        const app = boot()
        const buttons = (name, path) => {
            app.match(path)
            document.body.innerHTML = app.templates[name](fixtures.newUnit)
            return all(".uk-overflow-auto > p > button").map((button) => button.textContent.trim())
        }

        assert.deepEqual(buttons("Create", "/unit/create"), ["Create", "Cancel"])
        assert.deepEqual(buttons("Update", "/unit/2/update"), ["Update", "Cancel"])
        assert.deepEqual(buttons("Retrieve", "/unit/2"), ["Update", "Delete"])

    })

    it("has a title from the application and a link for every model, with where you are marked", async () => {

        const app = boot({ "GET api/unit": () => ({ ...fixtures.units }) })

        app.title = "My App"

        await visit(app, "/unit")

        assert.equal(text("h3"), "My App")
        assert.deepEqual(all(".uk-navbar-nav li").map((li) => [li.textContent.trim(), li.classList.contains("uk-active")]),
            [["Home", false], ["Unit", true], ["Test", false]])

        app.match("/")
        document.body.innerHTML = app.templates.Home({})

        assert.deepEqual(all(".uk-navbar-nav li").map((li) => li.classList.contains("uk-active")), [true, false, false])
        assert.equal(text("h2"), "My App")

    })

    it("keeps its nav in a bar the width of the page, with its content in a container, closed by the footer", () => {

        const app = boot()

        app.match("/")
        document.body.innerHTML = app.templates.Home({})

        assert.equal(document.querySelectorAll("nav.uk-navbar-container > .uk-container").length, 1)
        assert.equal(document.querySelectorAll("body > .uk-container").length, 1)
        assert.equal(document.querySelectorAll("#relations-error").length, 1)

    })

    it("shows a pointer over the rows that open a record, in the row itself since the package ships no CSS", async () => {

        const app = boot({ "GET api/unit": () => ({ ...fixtures.units }) })

        await visit(app, "/unit")

        const rows = all("tbody tr")

        assert.ok(rows.length > 0)
        rows.forEach((row) => {
            assert.equal(row.style.cursor, "pointer")
            assert.equal(row.classList.contains("clickable"), false)
        })

    })

    it("says when a search found too many to show", async () => {

        const app = boot({ "GET api/unit": () => ({ ...fixtures.units, overflow: true }) })

        await visit(app, "/unit")

        assert.match(text("form"), /Too many results returned/)

    })

})
