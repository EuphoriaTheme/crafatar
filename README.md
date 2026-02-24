# Crafatar
<img alt="logo" src="lib/public/logo.png" align="right" width="128px" height="128px">

[![travis](https://img.shields.io/travis/EuphoriaTheme/crafatar/master.svg?style=flat-square)](https://travis-ci.org/EuphoriaTheme/crafatar/) [![Coverage Status](https://img.shields.io/coveralls/EuphoriaTheme/crafatar.svg?style=flat-square)](https://coveralls.io/r/EuphoriaTheme/crafatar) [![Code Climate](https://img.shields.io/codeclimate/github/EuphoriaTheme/crafatar.svg?style=flat-square)](https://codeclimate.com/github/EuphoriaTheme/crafatar) [![dependency status](https://img.shields.io/david/EuphoriaTheme/crafatar.svg?style=flat-square)](https://david-dm.org/EuphoriaTheme/crafatar) [![devDependency status](https://img.shields.io/david/dev/EuphoriaTheme/crafatar.svg?style=flat-square)](https://david-dm.org/EuphoriaTheme/crafatar#info=devDependencies) [![docs status](https://inch-ci.org/github/EuphoriaTheme/crafatar.svg?branch=master&style=flat-square)](https://inch-ci.org/github/EuphoriaTheme/crafatar)

<a href="https://crafatar.euphoriadevelopment.uk/">Crafatar</a> serves Minecraft avatars based on the skin for use in external applications.
Inspired by <a href="https://gravatar.com">Gravatar</a> (hence the name) and <a href="https://minotar.net">Minotar</a>.

Image manipulation is done with [pngjs](https://github.com/pngjs/pngjs) (pure JavaScript PNG processing). 3D renders are created with [node-canvas](https://github.com/Automattic/node-canvas) / [cairo](http://cairographics.org/).

# Examples

| | | | |
| :---: | :---: | :---: | :---: |
| ![jomo's avatar](https://crafatar.euphoriadevelopment.uk/avatars/ae795aa86327408e92ab25c8a59f3ba1?size=128) | ![Jake_0's avatar](https://crafatar.euphoriadevelopment.uk/avatars/2d5aa9cdaeb049189930461fc9b91cc5?size=128) | ![Notch's avatar](https://crafatar.euphoriadevelopment.uk/avatars/069a79f444e94726a5befca90e38aaf5?size=128) | ![sk89q's avatar](https://crafatar.euphoriadevelopment.uk/avatars/0ea8eca3dbf647cc9d1ac64551ca975c?size=128) | ![md_5's avatar](https://crafatar.euphoriadevelopment.uk/avatars/af74a02d19cb445bb07f6866a861f783?size=128) |
| ![jomo's 3d head](https://crafatar.euphoriadevelopment.uk/renders/head/ae795aa86327408e92ab25c8a59f3ba1?scale=6) | ![Jake_0's 3d head](https://crafatar.euphoriadevelopment.uk/renders/head/2d5aa9cdaeb049189930461fc9b91cc5?scale=6) | ![Notch's 3d head](https://crafatar.euphoriadevelopment.uk/renders/head/069a79f444e94726a5befca90e38aaf5?scale=6) | ![sk89q's 3d head](https://crafatar.euphoriadevelopment.uk/renders/head/0ea8eca3dbf647cc9d1ac64551ca975c?scale=6) | ![md_5's 3d head](https://crafatar.euphoriadevelopment.uk/renders/head/af74a02d19cb445bb07f6866a861f783?scale=6) |
| ![jomo's 3d body](https://crafatar.euphoriadevelopment.uk/renders/body/ae795aa86327408e92ab25c8a59f3ba1?scale=6) | ![Jake_0's 3d body](https://crafatar.euphoriadevelopment.uk/renders/body/2d5aa9cdaeb049189930461fc9b91cc5?scale=6) | ![Notch's 3d body](https://crafatar.euphoriadevelopment.uk/renders/body/069a79f444e94726a5befca90e38aaf5?scale=6) | ![sk89q's 3d body](https://crafatar.euphoriadevelopment.uk/renders/body/0ea8eca3dbf647cc9d1ac64551ca975c?scale=6) | ![md_5's 3d body](https://crafatar.euphoriadevelopment.uk/renders/body/af74a02d19cb445bb07f6866a861f783?scale=6) |
| ![jomo's skin](https://crafatar.euphoriadevelopment.uk/skins/ae795aa86327408e92ab25c8a59f3ba1) | ![Jake_0's skin](https://crafatar.euphoriadevelopment.uk/skins/2d5aa9cdaeb049189930461fc9b91cc5) | ![Notch's skin](https://crafatar.euphoriadevelopment.uk/skins/069a79f444e94726a5befca90e38aaf5) | ![sk89q's skin](https://crafatar.euphoriadevelopment.uk/skins/0ea8eca3dbf647cc9d1ac64551ca975c) | ![md_5's skin](https://crafatar.euphoriadevelopment.uk/skins/af74a02d19cb445bb07f6866a861f783) |

## Usage / Documentation

Please [visit the website](https://crafatar.euphoriadevelopment.uk/) for details.
Our [Main Site](https://euphoriadevelopment.uk/docs/) with docs for all our products.

## Contact

* Join our [Discord](https://discord.euphoriadevelopment.uk/)
* Open an [issue](https://github.com/EuphoriaTheme/crafatar/issues/) on GitHub

# Installation

## Docker (Untested 23/02/2026)

```sh
docker network create crafatar
docker run --net crafatar -d --name redis redis
docker run --net crafatar -v crafatar-images:/home/app/crafatar/images -e REDIS_URL=redis://redis -p 3000:3000 ghcr.io/<owner>/<repo>:latest
```

By default, Docker builds now skip tests for faster production builds. To run tests during build:

```sh
docker build --build-arg RUN_TESTS=true -t crafatar .
```

## GitHub Actions (workers)

This repository includes workers in `.github/workflows`:

- `ci.yml`: runs tests on pushes and pull requests.
- `release.yml`: on tag push (for example `v2.3.0`) it builds/pushes Docker image to `ghcr.io/<owner>/<repo>` and creates a GitHub Release.
- `integration.yml`: optional full integration suite (manual trigger + daily schedule).

Create a release:

```sh
git tag v2.3.0
git push origin v2.3.0
```

The release worker will publish the image tag and generate release notes automatically.

Run full integration tests manually from GitHub Actions (workflow_dispatch) or locally:

```sh
npm run test:integration
```

## Manual

- Install [nodejs](https://nodejs.org/) 24 (LTS)
- Install `redis-server`
- Run `npm install`  
  If that fails, it's likely because because of `node-canvas` dependencies. Follow [this guide](https://github.com/Automattic/node-canvas/wiki#installation-guides) to install them.
- Copy `.env.example` to `.env` and adjust values if needed
- Run `npm start`

Crafatar is now available at http://0.0.0.0:3000.

## Configuration / Environment variables

Configuration is loaded from `.env` automatically (via `dotenv`) and falls back to defaults from `config.js`.

### Quick setup

```sh
cp .env.example .env
```

### Variables explained

- `AVATAR_MIN`, `AVATAR_MAX`, `AVATAR_DEFAULT`: avatar size bounds and default size in pixels.
- `RENDER_MIN`, `RENDER_MAX`, `RENDER_DEFAULT`: 3D render scale bounds and default scale.
- `CACHE_LOCAL`: how long cached profile/skin metadata is considered fresh (seconds).
- `CACHE_BROWSER`: HTTP cache max-age sent to clients (seconds).
- `RETENTION_ENABLED`: when `true`, periodically clears stale Redis keys and old image files.
- `RETENTION_DAYS`: maximum age (in days) before cached data/images are deleted.
- `RETENTION_INTERVAL_HOURS`: how often the cleanup job runs.
- `CACHE_BACKEND`: metadata cache backend (`redis`, `memory`, or `none`).
- `EPHEMERAL_STORAGE`: when `true`, Redis is flushed on startup.
- `CLOUDFLARE`: toggles Cloudflare status hints on the index page.
- `REDIS_URL`: Redis connection string.
  - Example with password: `redis://:password@host:port`
  - Example with TLS: `rediss://:password@host:port`
  - Only `redis://` and `rediss://` are accepted. If another scheme is provided (for example `http://`), Redis caching is disabled at startup.
  - In containerized setups (e.g. Pterodactyl), avoid `localhost` unless Redis runs in the same container.
- `PORT`, `BIND`: server listen port and bind address.
- `EXTERNAL_URL`: optional public base URL used in homepage/docs examples (e.g. `https://crafatar.example.com`). If empty, the URL is inferred from request/forwarded headers.
- `EXTERNAL_HTTP_TIMEOUT`: timeout for Mojang/external HTTP requests in milliseconds.
- `DEBUG`: when `true`, enables debug behavior and extra error details.
- `LOG_TIME`: whether log timestamps are enabled.
- `SESSIONS_RATE_LIMIT`: outgoing Mojang session requests allowed per second; empty disables this limiter.
- `FACE_DIR`, `HELM_DIR`, `SKIN_DIR`, `RENDER_DIR`, `CAPE_DIR`: optional custom storage directories (must end with `/`).

### Cache backend notes

- `CACHE_BACKEND=redis` (default): uses Redis for metadata cache.
- `CACHE_BACKEND=memory`: uses in-process memory cache (no Redis required; cache resets on restart).
- `CACHE_BACKEND=none`: disables metadata caching entirely.

### Redis behavior notes

- Redis is used as a cache layer; image generation still works when Redis is unavailable.
- Invalid `REDIS_URL` values (wrong protocol/format) fall back to memory cache unless `CACHE_BACKEND=none`.
- A broken Redis endpoint will reduce cache efficiency and may increase upstream Mojang requests.

## Pterodactyl notes

- Set `BIND=0.0.0.0` when running behind panel/reverse proxies.
- Use an external Redis service or separate Redis node and point `REDIS_URL` to it.
- `CLOUDFLARE=true` is appropriate when traffic is proxied through Cloudflare.

## Security maintenance

```sh
npm run audit
npm run audit:fix
```

These commands use lockfile-based auditing and safe remediation where possible.

# Operational notes

## inodes

Crafatar stores a lot of images on disk. For avatars, these are 8×8 px PNG images with an average file size of \~90 bytes. This can lead to issues on file systems such as ext4, which (by default) has a bytes-per-inode ratio of 16Kb. With thousands of files with an average file size below this ratio, you will run out of available inodes before running out of disk space. (Note that this will still be reported as `ENOSPC: no space left on device`).

Consider using a different file system, changing the inode ratio, or deleting files before the inode limit is reached.

## disk space and memory usage

Eventually you will run out of disk space and/or redis will be out of memory. Make sure to delete image files and/or flush redis before this happens.

# Tests
```sh
npm test
```

If you want to debug failing tests:
```sh
# show logs during tests
env VERBOSE_TEST=true npm test
```

It can be helpful to monitor redis commands to debug caching errors:
```sh
redis-cli monitor
```