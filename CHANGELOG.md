# Changelog

All notable changes to this project are recorded here, newest first. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [SemVer](https://semver.org/).

## [Unreleased]

### Added
- Scaffolding for the npm package `@relations-dil/dotroute` (#17): `VERSION` (0.6.4, continuing this repo's tag series), `package.json`, an MIT `LICENSE`, Docker and make (`make build|shell|test|lint|version`, with the Tilt `up`, `down`, `tag` and `untag` kept), ESLint, and a test harness: jsdom plus a fake `rest` that answers from fixtures shaped like the real relations-restx responses.
