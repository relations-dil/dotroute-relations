# Changelog

All notable changes to this project are recorded here, newest first. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [SemVer](https://semver.org/).

## [Unreleased]

### Added
- **The package `@relations-dil/dotroute`** (#17): the generic Relations UI that was copied into every app (`relations.js` and its templates) as one script, `dist/relations.js`, with the templates inlined, built by `node build.js` from `lib/`. It needs `dotroute`, `dot` and `@unum-pillars/uikit` (peer dependencies) and no jQuery. `RelationsDR.start()` fetches the models, adds the home route and the models' routes, and starts routing, so an app's `service.js` is one line.
- The script's global is `RelationsDR`, not `Relations`, so a page can also load `@relations-dil/relations`, whose global is `Relations`.
- The Jenkinsfile builds the gui image, and builds, tests and lints the example API, after the package's stages (#19).
- UIkit 3 templates (from `cumulus`'s), with the navbar in a bar the width of the page and the content in a container. The header and home page take their title from `DRApp.title`, the page's `<title>` by default, so apps need no `header.html` or `home.html` of their own.
- Rows that open a record show a pointer (`style="cursor: pointer"`), so the page needs no CSS of its own for it.
- A failed request, or form JSON that won't parse, shows as a message at the top of the page (`DRApp.error`) without redrawing, so what was typed stays.
- `make setup|pack|publish` and a `Jenkinsfile`, like the other repos; 110 tests at 100% line, branch and function coverage.
- Scaffolding for the npm package `@relations-dil/dotroute` (#17): `VERSION` (0.6.4, continuing this repo's tag series), `package.json`, an MIT `LICENSE`, Docker and make (`make build|shell|test|lint|version`, with the Tilt `up`, `down`, `tag` and `untag` kept), ESLint, and a test harness: jsdom plus a fake `rest` that answers from fixtures shaped like the real relations-restx responses.

### Changed
- **Async throughout:** `DRApp.rest` (`DRApp.http`, now `fetch`) and every controller action are async. Apps call `RelationsDR.start()` instead of reading `DRApp.rest("GET", "api/model")` themselves.
- A screen that's still waiting on the API when you navigate away doesn't draw over the page you went to, or send you back after a save, and a failing action is shown instead of an unhandled rejection. (dotroute doesn't await actions, so the package does this itself.)
- `DRApp.rest` no longer pops an `alert` when a request fails: it throws an error with the API's message, shown at the top of the page.
- **The example gui uses the packages** (#17): `gui/` no longer carries its own jQuery, UIkit 2, doT, doTRoute, `relations.js` or templates. Its Dockerfile installs `@relations-dil/dotroute`, `@unum-pillars/uikit`, `dot` and `dotroute` from npm and serves what the page loads from `/vendor`; `index.html` calls `RelationsDR.start()`. Checked in a browser against the Python API. A lockfile pins what it installs, with `npm ci`.
- The list links to a record by its id field, whatever it's named, not always `id`.
- `fields.html` formats options and values with `DRApp.format`, as this repo's version already did.

### Fixed
- The example API passes its own checks (#19): 100% coverage, with tests for `now` and `subnet_attr`, and pylint at 10, with docstrings and `service` found through `sys.modules` rather than imported inside `build()`.
- The example API builds again: `api/requirements.txt` pins the flask stack the way python-relations-restx does (`jsonschema==4.17.3` and friends) and uses `relations-restx==0.6.5`.
- `DRApp.get` no longer leaks a global named `place`.
- A search is URL encoded, and the search box keeps what was searched for.
- A set typed as words ignores extra spaces, and sends `[]`, not `[""]`, when there are none.
