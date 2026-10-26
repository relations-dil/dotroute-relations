ACCOUNT=gaf3
IMAGE=dotroute-relations
INSTALL=node:22.9.0-alpine3.20
VERSION?=$(shell cat VERSION)
TILT_PORT=6850
TTY=$(shell if tty -s; then echo "-it"; fi)
VOLUMES=-v ${PWD}/lib:/opt/service/lib \
		-v ${PWD}/test:/opt/service/test \
		-v ${PWD}/build.js:/opt/service/build.js \
		-v ${PWD}/eslint.config.js:/opt/service/eslint.config.js \
		-v ${PWD}/package.json:/opt/service/package.json \
		-v ${PWD}/package-lock.json:/opt/service/package-lock.json
NPM=-v ${PWD}/README.md:/opt/service/README.md \
	-v ${PWD}/LICENSE:/opt/service/LICENSE \
	-v ${PWD}/CHANGELOG.md:/opt/service/CHANGELOG.md
# Mount ~/.npmrc only when it exists: a missing mount source gets created as a directory.
NPMRC=$(shell test -f ${HOME}/.npmrc && echo "-v ${HOME}/.npmrc:/root/.npmrc")

.PHONY: build shell test lint setup new version sync release-check release verify test-release pack publish up down tag untag help
.DEFAULT_GOAL := help

build: ## Builds the docker image
	docker build . -t $(ACCOUNT)/$(IMAGE):$(VERSION)

shell: ## Opens a shell in the container
	docker run $(TTY) $(VOLUMES) $(ACCOUNT)/$(IMAGE):$(VERSION) sh

test: ## Builds dist/relations.js, then runs the tests with coverage
	docker run $(TTY) $(VOLUMES) $(ACCOUNT)/$(IMAGE):$(VERSION) npm test

lint: ## Runs ESLint
	docker run $(TTY) $(VOLUMES) $(ACCOUNT)/$(IMAGE):$(VERSION) npm run lint

# Pack it, install the tarball into an empty project, and use it the way a consumer would.
setup: ## Packs it, installs the tarball in an empty project, uses it
	docker run $(TTY) $(VOLUMES) $(NPM) $(ACCOUNT)/$(IMAGE):$(VERSION) sh -c "cp -r /opt/service /opt/install && cd /opt/install && \
	npm pack >/dev/null && \
	mkdir /opt/consumer && cd /opt/consumer && npm init -y >/dev/null && npm install /opt/install/relations-dil-dotroute-*.tgz >/dev/null && \
	test -f node_modules/@relations-dil/dotroute/dist/relations.js && \
	node -e \"const R = require('@relations-dil/dotroute'); if (typeof R.install != 'function' || typeof R.start != 'function') process.exit(1); console.log('ok', Object.keys(R).join(' '))\""

# Releases: make new starts one, make release-check says where it's up to and what would stop it, make release finishes it.
# V is +0.0.1 (the default), +0.1, +1 or a version outright, and B names the branch. The work is in scripts/.
V?=+0.0.1

new: ## Starts a release on the ticket branch you're on: next version, VERSION, package files, changelog (V=+0.0.1|+0.1|+1|x.y.z)
	@sh scripts/new.sh "$(V)"

version: ## Sets VERSION and the package files (V=+0.0.1|+0.1|+1|x.y.z)
	@sh scripts/version.sh write "$(V)"

sync: ## Makes package.json and the lockfile say what VERSION says
	docker run --rm $(TTY) -v ${PWD}/package.json:/opt/service/package.json -v ${PWD}/package-lock.json:/opt/service/package-lock.json -w /opt/service $(INSTALL) npm version $(VERSION) --no-git-tag-version --allow-same-version

release-check: ## Says where the release is up to and what would stop it
	@sh scripts/release-check.sh

release: ## Does what's left of the release: checks, npm, a clean install, the tag
	@sh scripts/release.sh

verify: ## Installs the version from npm in a clean container
	@sh scripts/verify.sh

# Tests the release scripts against a throwaway repo and a fake registry, nothing real is touched
test-release: ## Tests the release scripts against a throwaway repo and a fake registry
	docker run --rm $(TTY) -v ${PWD}/scripts:/opt/scripts python:3 sh /opt/scripts/test-release.sh

pack: ## Lists what would be published
	docker run $(TTY) $(VOLUMES) $(NPM) $(ACCOUNT)/$(IMAGE):$(VERSION) sh -c "npm version $(VERSION) --no-git-tag-version --allow-same-version >/dev/null && npm pack --dry-run"

publish: ## Publishes the version to npm
	@test -f ${HOME}/.npmrc || (echo "no ${HOME}/.npmrc to publish with" && exit 1)
	docker run $(TTY) $(VOLUMES) $(NPM) $(NPMRC) $(ACCOUNT)/$(IMAGE):$(VERSION) sh -c "npm version $(VERSION) --no-git-tag-version --allow-same-version >/dev/null && npm publish"

up: ## Runs the example with Tilt
	kubectx docker-desktop
	tilt --port $(TILT_PORT) up

down: ## Stops the example
	kubectx docker-desktop
	tilt down

tag: ## Tags the version and pushes the tag
	git rev-parse -q --verify refs/tags/$(VERSION) || git tag -a $(VERSION) -m "Version $(VERSION)"
	git push origin --tags

untag: ## Removes the version's tag
	-git tag -d $(VERSION)
	git push origin ":refs/tags/$(VERSION)"

help: ## Lists the targets
	@awk -F ':.*## ' '/^[a-z-]+:.*## /{printf "%-16s %s\n", $$1, $$2}' $(MAKEFILE_LIST)
