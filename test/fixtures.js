// What a relations-restx API sends back, by request, for two models: unit, and test (which belongs
// to a unit). These follow the contract in python-relations-restx (resource.py): the keys, the
// "formats" with a parent's titles, the OPTIONS fields with a parent's options, and so on.

const models = {
    models: [
        { id: "id", titles: ["name"], title: "Unit", singular: "unit", plural: "units", list: ["id", "name"] },
        { id: "id", titles: ["unit_id", "name"], title: "Test", singular: "test", plural: "tests", list: ["id", "unit_id", "name"] }
    ]
}

const units = {
    units: [{ id: 1, name: "people" }, { id: 2, name: "stuff" }],
    overflow: false,
    formats: {}
}

const tests = {
    tests: [{ id: 1, unit_id: 2, name: "moar" }],
    overflow: false,
    formats: { unit_id: { titles: { 2: ["stuff"] }, format: [null] } }
}

// The form for a new unit: no values yet, and the id is read only.
const newUnit = {
    fields: [
        { name: "id", kind: "int", readonly: true },
        { name: "name", kind: "str", required: true }
    ],
    errors: []
}

// The form for a new test: unit_id is a parent, so it comes with the parent's options and titles.
const newTest = {
    fields: [
        { name: "id", kind: "int", readonly: true },
        { name: "unit_id", kind: "int", required: true, format: [null], overflow: false, options: [1, 2], titles: { 1: ["people"], 2: ["stuff"] } },
        { name: "name", kind: "str", required: true }
    ],
    errors: []
}

const unit = { unit: { id: 2, name: "stuff" }, formats: {} }

module.exports = { models, units, tests, newUnit, newTest, unit }
