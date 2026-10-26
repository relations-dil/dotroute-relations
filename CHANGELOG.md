# Changelog

All notable changes to this project are recorded here, newest first. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [SemVer](https://semver.org/).

## [Unreleased]

### Added
- `make verify` installs the published version in a clean container and loads it, tried again while the registry catches up, and `make release` runs it after the wait for the registry and before the tag, as the other TypeScript repos do.

### Changed
- `make new` works on the ticket branch you're on: it writes VERSION, the package files and the changelog section there and commits, makes no branch of its own, and refuses on main, since we branch from the ticket. `B=` and `BRANCH_PREFIX` are gone (relations-dil/python-relations#98).
- Checks before a release: a scoped package's slash is encoded when the registry is asked about it, `package-lock.json` has to be at `VERSION` along with `package.json`, and the floor of each dependency and peer dependency has to be published on npm already. The release scripts and their tests are the same in every TypeScript repo.
- Release checks: `make release-check` also runs `make pack`, and refuses `file:` and `http(s):` pins as well as git ones, in `devDependencies` and `optionalDependencies` too. `make sync` and `make version` no longer need the image of the new version, so `make new` no longer builds one.


### Changed
- `make release-check` and `make release` don't run `build`, `test`, `lint` and `setup` again: the Jenkins stages have just run them before the release stage, so it was the same work twice. Run them yourself before checking by hand, as `make release-check` is only the checks now (relations-dil/python-relations#90).

## [0.6.5] - 2026-10-20

### Added
- **Releases like the Python repos** (#24): `make new` (next version, branch, `VERSION`, `package.json`, the lockfile, a dated changelog section), `make release-check`, and `make release` (the checks, `npm publish`, wait for the registry, the tag), with their scripts in `scripts/` and `make test-release` to test them against a throwaway repo and a fake registry. Jenkins runs `make test-release` and, on `main`, `make release`, so a merged release publishes. `make help` lists the targets, and `make tag` no longer fails when the tag exists.
- **`RelationsDR.start({model_path})`** (#21): where the API serves its models, with its trailing slash, `"api/"` by default, so an app whose API serves them under `api/model/` starts with `RelationsDR.start({model_path: "api/model/"})`. A model's url is `model_path` plus its singular name (`DRApp.model_path`, which can also be set before `start()`); `GET api/model`, the list of models, is the same either way. Apps that don't set it change nothing.
- The Jenkinsfile builds the gui image, and builds, tests and lints the example API, after the package's stages (#19).

### Changed
- `make version` sets `VERSION` and the package files (`V=+0.0.1|+0.1|+1|x.y.z`) as in the Python repos; making `package.json` and the lockfile say what `VERSION` says is now `make sync`.
- The example gui's packages are locked, and it installs them with `npm ci`.

### Fixed
- Installing the package from a git commit (`git+https://github.com/relations-dil/dotroute-relations.git#<sha>`) gives a working package: `dist/relations.js` is built by `prepare`, not just `prepack`, since `dist/` isn't committed. The Dockerfile installs with `npm ci --ignore-scripts` because `lib/` isn't copied in yet at that point.
- The example API passes its own checks (#19): 100% coverage, with tests for `now` and `subnet_attr`, and pylint at 10, with docstrings and `service` found through `sys.modules` rather than imported inside `build()`.

## [0.6.4] - 2026-10-11

### Added
- **The package `@relations-dil/dotroute`** (#17): the generic Relations UI that was copied into every app (`relations.js` and its templates) as one script, `dist/relations.js`, with the templates inlined, built by `node build.js` from `lib/`. It needs `dotroute`, `dot` and `@unum-pillars/uikit` (peer dependencies) and no jQuery. `RelationsDR.start()` fetches the models, adds the home route and the models' routes, and starts routing, so an app's `service.js` is one line.
- The script's global is `RelationsDR`, not `Relations`, so a page can also load `@relations-dil/relations`, whose global is `Relations`.
- UIkit 3 templates (from `cumulus`'s), with the navbar in a bar the width of the page and the content in a container. The header and home page take their title from `DRApp.title`, the page's `<title>` by default, so apps need no `header.html` or `home.html` of their own.
- Rows that open a record show a pointer (`style="cursor: pointer"`), so the page needs no CSS of its own for it.
- A failed request, or form JSON that won't parse, shows as a message at the top of the page (`DRApp.error`) without redrawing, so what was typed stays.
- `make setup|pack|publish` and a `Jenkinsfile`, like the other repos; 110 tests at 100% line, branch and function coverage.
- Scaffolding for the npm package `@relations-dil/dotroute` (#17): `VERSION` (0.6.4, continuing this repo's tag series), `package.json`, an MIT `LICENSE`, Docker and make (`make build|shell|test|lint|version`, with the Tilt `up`, `down`, `tag` and `untag` kept), ESLint, and a test harness: jsdom plus a fake `rest` that answers from fixtures shaped like the real relations-restx responses.

### Changed
- **Async throughout:** `DRApp.rest` (`DRApp.http`, now `fetch`) and every controller action are async. Apps call `RelationsDR.start()` instead of reading `DRApp.rest("GET", "api/model")` themselves.
- A screen that's still waiting on the API when you navigate away doesn't draw over the page you went to, or send you back after a save, and a failing action is shown instead of an unhandled rejection. (dotroute doesn't await actions, so the package does this itself.)
- `DRApp.rest` no longer pops an `alert` when a request fails: it throws an error with the API's message, shown at the top of the page.
- **The example gui uses the packages** (#17): `gui/` no longer carries its own jQuery, UIkit 2, doT, doTRoute, `relations.js` or templates. Its Dockerfile installs `@relations-dil/dotroute`, `@unum-pillars/uikit`, `dot` and `dotroute` from npm and serves what the page loads from `/vendor`; `index.html` calls `RelationsDR.start()`. Checked in a browser against the Python API, with the package from a local tarball. It needs `@relations-dil/dotroute` published to build, and gets a lockfile and `npm ci` after.
- The list links to a record by its id field, whatever it's named, not always `id`.
- `fields.html` formats options and values with `DRApp.format`, as this repo's version already did.

### Fixed
- The example API builds again: `api/requirements.txt` pins the flask stack the way python-relations-restx does (`jsonschema==4.17.3` and friends) and uses `relations-restx==0.6.5`.
- `DRApp.get` no longer leaks a global named `place`.
- A search is URL encoded, and the search box keeps what was searched for.
- A set typed as words ignores extra spaces, and sends `[]`, not `[""]`, when there are none.
