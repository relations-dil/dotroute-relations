# @relations-dil/dotroute

Universal CRUD screens for any [Relations](https://github.com/relations-dil/python-relations) API. Point it at an API that speaks relations-restx and you get list, create, view, update and delete screens for every model, built from what the API says about itself. No per-model code.

It's [doTRoute](https://github.com/gaf3/dotroute) controllers and [UIkit 3](https://getuikit.com) templates, with no jQuery.

## Use it

```bash
npm install @relations-dil/dotroute
```

That needs `dotroute`, `dot` and `@unum-pillars/uikit`, which npm brings along as peer dependencies. In a page:

```html
<!DOCTYPE html>
<html>
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>My App</title>
        <link rel="stylesheet" href="uikit.min.css">
        <script src="uikit.min.js"></script>
        <script src="uikit-icons.min.js"></script>
        <script src="doT.js"></script>
        <script src="doTRoute.js"></script>
        <script src="relations.js"></script>
        <script>Relations.start()</script>
    </head>
    <body></body>
</html>
```

The page's `<title>` is the app's title, in the header and on the home page. `DRApp` is the doTRoute application: set `DRApp.title`, add your own routes, or replace `DRApp.rest` (below) before calling `Relations.start()`.

## What it asks the API

- `GET api/model` for the models: `singular`, `plural`, `title`, `id` and `list`.
- `GET`, `POST`, `PATCH` and `DELETE` on `api/<model>` and `api/<model>/<id>`, and `OPTIONS` on both for the form, with the values to show and the parent's `options` and `titles` for a key.

That's the [relations-restx](https://github.com/relations-dil/python-relations-restx) contract.

## It's all async

Everything that talks to the API is async, so nothing blocks the page. `DRApp.rest(type, url, data)` is the one place requests go through, and it resolves to the response's JSON. By default it's `DRApp.http`, which uses `fetch` and throws, with the API's message, when a request fails; replace `DRApp.rest` to send requests another way.

- A failed request shows as a message at the top of the page, and the form keeps what was typed.
- A screen that's still waiting on the API when you move to another doesn't draw over the new one, or send you back after a save.

## Developing

Everything runs in Docker, so all you need is Docker and make:

```bash
make build    # the image (once, and after changing package.json)
make test     # builds dist/relations.js, then the tests with coverage
make lint     # ESLint
make setup    # pack it, install it in an empty project, use it
make pack     # what would be published
```

## The example

`api/` is a small Flask API with a few models, `gui/` is the page that shows them, and `make up` runs both with Tilt.
