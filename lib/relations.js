// Universal CRUD screens for any Relations API.
//
// A doTRoute application with controllers and UIkit 3 templates that build list, create, retrieve,
// update and delete screens from what a relations-restx API says about itself: GET api/model for
// the models, and OPTIONS for each form.
//
// Everything that talks to the API is async. Load doT, doTRoute and this, then:
//
//     Relations.start();
//
// DRApp is the doTRoute application. Set DRApp.title (the page's title by default) before starting.
// RelationsTemplates is put in front of this file by build.js.

var Relations = {

    templates: RelationsTemplates,

    // Everything that makes an application a Relations one.

    install: function (app) {

        // Templates are inlined, so there's nothing to fetch.

        app.load = function (name) {
            return Relations.templates[name];
        };

        // The API. Each request resolves to the response's JSON, or throws what went wrong.

        app.http = async function (type, url, data) {

            var response = await fetch(url, {
                method: type,
                headers: type != 'GET' ? {"Content-Type": "application/json"} : {},
                body: data ? JSON.stringify(data) : (type != 'GET' ? '{}' : undefined)
            });

            var body = null;

            try {
                body = await response.json();
            } catch {
                body = null;
            }

            if ((response.status != 200) && (response.status != 201) && (response.status != 202)) {
                var failure = new Error(type + ": " + url + " failed" + (body && body.message ? ": " + body.message : ""));
                failure.status = response.status;
                failure.body = body;
                throw failure;
            }

            return body;

        };

        app.rest = app.http;

        // Show a problem at the top of the page, without redrawing it, so what was typed stays.

        app.error = function (message) {

            var box = document.getElementById("relations-error");

            if (!box) {
                box = document.createElement("div");
                box.id = "relations-error";
                document.body.insertBefore(box, document.body.firstChild);
            }

            var alert = document.createElement("div");
            var text = document.createElement("p");

            alert.className = "uk-alert-danger";
            alert.setAttribute("uk-alert", "");
            text.textContent = message;
            alert.appendChild(text);

            box.innerHTML = "";
            box.appendChild(alert);

        };

        app.format = function (value, format, titles) {
            if (titles && titles[value]) {
                value = titles[value];
            }
            if (Array.isArray(value)) {
                if (format) {
                    var formatted = [];
                    for (var index = 0; index < value.length; index++) {
                        formatted.push(app.format(value[index], format[index]));
                    }
                    return formatted.join(' - ');
                } else {
                    return value.join(" ");
                }
            }
            if (format == "datetime") {
                return new Date(value*1000).toLocaleString();
            }
            return value == null ? '' : value;
        };

        app.get = function (values, path) {

            var place;

            if (typeof path === 'string' || path instanceof String) {
                path = path.split('__');
            }

            for (var index = 0; index < path.length; index++) {

                place = path[index];

                if (place.match(/^-?\d+$/)) {
                    if (values == null) {
                        values = [];
                    }
                    place = parseInt(place);
                } else {
                    if (values == null) {
                        values = {};
                    }
                    if (place[0] == '_') {
                        place = place.slice(1);
                    }
                }

                if (index < path.length - 1) {

                    var next = path[index+1].match(/^-?\d+$/) ? [] : {};

                    if (!Array.isArray(values)) {
                        values = values[place] || next;
                    } else if ((place > -1 ? place : Math.abs(place + 1)) > values.length - 1 || values[place] == null) {
                        values = next;
                    } else {
                        values = values[place];
                    }

                }

            }

            return values[place];

        };

        // Controllers

        app.controller("Base", null, {
            home: function () {
                app.render(this.it);
            },
            // Run an action's work. It's handed a function saying whether the page is still the one
            // the action started on: an action that awaits the API shouldn't draw over, or send the
            // user back from, a page they've since moved on to. A failure is shown, not lost.
            attempt: async function (work) {
                var current = app.current;
                var still = function () {
                    return app.current === current;
                };
                try {
                    await work.call(this, still);
                } catch (error) {
                    if (still()) {
                        app.error(error.message);
                    }
                }
            }
        });

        app.controller("Model", "Base", {
            model: null,
            url: function (params) {
                if (params && Object.keys(params).length) {
                    return "api/" + this.model.singular + "?" + new URLSearchParams(params);
                } else {
                    return "api/" + this.model.singular;
                }
            },
            id_url: function () {
                return this.url() + "/" + app.current.path.id;
            },
            route: function (action, id) {
                if (id) {
                    app.go(this.model.singular + "_" + action, id);
                } else {
                    app.go(this.model.singular + "_" + action);
                }
            },
            list: function () {
                return this.attempt(async function (still) {
                    var it = await app.rest("GET", this.url());
                    if (!still()) {
                        return;
                    }
                    it.like = '';
                    this.it = it;
                    app.render(this.it);
                });
            },
            like: function (event) {
                if (event.keyCode == 10 || event.keyCode == 13) {
                    event.preventDefault();
                    return this.search();
                }
            },
            search: function () {
                var like = document.getElementById("like").value;
                if (!like) {
                    return this.list();
                }
                return this.attempt(async function (still) {
                    var it = await app.rest("GET", this.url({like: like}));
                    if (!still()) {
                        return;
                    }
                    it.like = like;
                    this.it = it;
                    app.render(this.it);
                });
            },
            fields_input: function () {

                var input = {};
                input[this.model.singular] = {};
                input["likes"] = {};

                var byId = function (id) {
                    return document.getElementById(id);
                };

                for (var index = 0; index < this.it.fields.length; index++) {

                    var field = this.it.fields[index];
                    var value;

                    if (field.readonly) {
                        continue;
                    }

                    var named = document.querySelectorAll('input[name="' + field.name + '"]');

                    if (named.length) {
                        var checked = Array.prototype.filter.call(named, function (each) {
                            return each.checked;
                        });
                        if (field.kind == "set") {
                            value = checked.map(function (each) {
                                return each.value;
                            });
                        } else {
                            value = checked.length ? checked[0].value : undefined;
                        }
                    } else if (field.init) {
                        value = {};
                        var inits = Object.values(field.init);
                        for (var init = 0; init < inits.length; init++) {
                            var attr = byId(field.name + '__' + inits[init]).value;
                            if (attr != '') {
                                value[inits[init]] = attr;
                            }
                        }
                    } else if (field.kind == "set") {
                        value = byId(field.name).value.split(/\s+/).filter(Boolean);
                    } else if (field.kind == "bool") {
                        value = byId(field.name).checked;
                    } else {
                        value = byId(field.name).value;
                    }

                    if (byId(field.name + '__like')) {
                        input["likes"][field.name] = byId(field.name + '__like').value;
                    }

                    if (value && (value.length || field.init)) {
                        if (field.options) {
                            for (var option = 0; option < field.options.length; option++) {
                                if (Array.isArray(value)) {
                                    for (var val = 0; val < value.length; val++) {
                                        if (value[val] == field.options[option]) {
                                            value[val] = field.options[option];
                                        }
                                    }
                                } else {
                                    if (value == field.options[option]) {
                                        value = field.options[option];
                                    }
                                }
                            }
                        } else if (field.kind == "list" || field.kind == "dict") {
                            try {
                                value = JSON.parse(value);
                            } catch {
                                throw new Error((field.title || field.name) + ": not valid JSON");
                            }
                        } else if (field.kind == "int") {
                            value = Math.round(value);
                        }
                        if (!field.init || Object.keys(value).length) {
                            input[this.model.singular][field.name] = value;
                        }
                    } else if (field.kind == "bool") {
                        input[this.model.singular][field.name] = value;
                    } else if (field.kind == "set" || field.kind == "list") {
                        input[this.model.singular][field.name] = [];
                    } else if (field.kind == "dict") {
                        input[this.model.singular][field.name] = {};
                    }

                }

                return input;

            },
            fields_change: function () {
                return this.attempt(async function (still) {
                    var url = app.current.path.id ? this.id_url() : this.url();
                    var it = await app.rest("OPTIONS", url, this.fields_input());
                    if (!still()) {
                        return;
                    }
                    this.it = it;
                    app.render(this.it);
                });
            },
            create: function () {
                return this.attempt(async function (still) {
                    var it = await app.rest("OPTIONS", this.url());
                    if (!still()) {
                        return;
                    }
                    this.it = it;
                    app.render(this.it);
                });
            },
            create_save: function () {
                return this.attempt(async function (still) {
                    var input = this.fields_input();
                    var it = await app.rest("OPTIONS", this.url(), input);
                    if (!still()) {
                        return;
                    }
                    this.it = it;
                    if (this.it.errors.length) {
                        app.render(this.it);
                        return;
                    }
                    var model = (await app.rest("POST", this.url(), input))[this.model.singular];
                    if (!still()) {
                        return;
                    }
                    if (this.model.id) {
                        this.route("retrieve", model[this.model.id]);
                    } else {
                        this.route("list");
                    }
                });
            },
            retrieve: function () {
                return this.attempt(async function (still) {
                    var it = await app.rest("OPTIONS", this.id_url());
                    if (!still()) {
                        return;
                    }
                    this.it = it;
                    app.render(this.it);
                });
            },
            update: function () {
                return this.retrieve();
            },
            update_save: function () {
                return this.attempt(async function (still) {
                    var input = this.fields_input();
                    var it = await app.rest("OPTIONS", this.id_url(), input);
                    if (!still()) {
                        return;
                    }
                    this.it = it;
                    if (this.it.errors.length) {
                        app.render(this.it);
                        return;
                    }
                    await app.rest("PATCH", this.id_url(), input);
                    if (!still()) {
                        return;
                    }
                    this.route("retrieve", app.current.path.id);
                });
            },
            delete: function () {
                return this.attempt(async function (still) {
                    if (!confirm("Are you sure?")) {
                        return;
                    }
                    await app.rest("DELETE", this.id_url());
                    if (!still()) {
                        return;
                    }
                    this.route("list");
                });
            }
        });

        // Templates

        app.partial("Header", app.load("header"));
        app.partial("Form", app.load("form"));
        app.partial("Footer", app.load("footer"));

        app.template("Home", app.load("home"), null, app.partials);
        app.template("Fields", app.load("fields"), null, app.partials);
        app.template("List", app.load("list"), null, app.partials);
        app.template("Create", app.load("create"), null, app.partials);
        app.template("Retrieve", app.load("retrieve"), null, app.partials);
        app.template("Update", app.load("update"), null, app.partials);

        // A model's routes and controller

        app.model = function (model) {

            app.controller(model.title, "Model", {
                model: model
            });

            app.route(model.singular + "_list", "/" + model.singular, "List", model.title, "list");
            app.route(model.singular + "_create", "/" + model.singular + "/create", "Create", model.title, "create");

            if (model.id) {
                app.route(model.singular + "_retrieve", "/" + model.singular + "/{id:^\\d+$}", "Retrieve", model.title, "retrieve");
                app.route(model.singular + "_update", "/" + model.singular + "/{id:^\\d+$}/update", "Update", model.title, "update");
            }

        };

        // Routes and controllers for every model that doesn't have them yet

        app.attach = function () {

            for (var model = 0; model < app.models.length; model++) {
                if (!app.controllers[app.models[model].title]) {
                    app.model(app.models[model]);
                }
            }

        };

        return app;

    },

    // Find out what the API has, make the routes, and start routing. Resolves once the first page is
    // up, and shows what went wrong (the API down, say) instead of leaving the page blank.

    start: async function () {

        var app = window.DRApp;

        try {
            app.models = (await app.rest("GET", "api/model"))["models"];
            app.route("home", "/", "Home", "Base", "home");
            app.attach();
            app.start();
            app.refresh();
        } catch (error) {
            app.error(error.message);
        }

    }

};

// A page gets its application as DRApp, started once start() has the models.

if (typeof DoTRoute !== "undefined") {
    window.DRApp = Relations.install(new DoTRoute.Application(null, null, true));
    window.DRApp.title = document.title;
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = Relations;
}
