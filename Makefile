ACCOUNT=gaf3
IMAGE=dotroute-relations
VERSION?=$(shell cat VERSION)
TILT_PORT=6850
TTY=$(shell if tty -s; then echo "-it"; fi)
VOLUMES=-v ${PWD}/test:/opt/service/test \
		-v ${PWD}/eslint.config.js:/opt/service/eslint.config.js \
		-v ${PWD}/package.json:/opt/service/package.json \
		-v ${PWD}/package-lock.json:/opt/service/package-lock.json

.PHONY: build shell test lint version up down tag untag

build:
	docker build . -t $(ACCOUNT)/$(IMAGE):$(VERSION)

shell:
	docker run $(TTY) $(VOLUMES) $(ACCOUNT)/$(IMAGE):$(VERSION) sh

test:
	docker run $(TTY) $(VOLUMES) $(ACCOUNT)/$(IMAGE):$(VERSION) npm test

lint:
	docker run $(TTY) $(VOLUMES) $(ACCOUNT)/$(IMAGE):$(VERSION) npm run lint

# Make package.json and the lockfile say what VERSION says.
version:
	docker run $(TTY) $(VOLUMES) $(ACCOUNT)/$(IMAGE):$(VERSION) npm version $(VERSION) --no-git-tag-version --allow-same-version

up:
	kubectx docker-desktop
	tilt --port $(TILT_PORT) up

down:
	kubectx docker-desktop
	tilt down

tag:
	-git tag -a $(VERSION) -m "Version $(VERSION)"
	git push origin --tags

untag:
	-git tag -d $(VERSION)
	git push origin ":refs/tags/$(VERSION)"
