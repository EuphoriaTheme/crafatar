# Crafatar (Rep Graphics Build)

`repgraphics/crafatar` is a self-hosted Minecraft avatar/render API.

It serves:
- 2D avatars from player skins
- 3D head/body renders
- Raw skins and capes

Inspired by Gravatar/Minotar and built for fast external API use.

## Quick Start (Docker)

```sh
docker network create crafatar
docker volume create crafatar-images

docker run -d --name crafatar-redis --network crafatar redis:7-alpine

docker run -d --name crafatar \
  --network crafatar \
  -p 3000:3000 \
  -v crafatar-images:/home/app/crafatar/images \
  -e REDIS_URL=redis://crafatar-redis:6379 \
  -e BIND=0.0.0.0 \
  docker.io/repgraphics/crafatar:latest
```

Then open:
- `http://localhost:3000`

## Docker Compose

This repository includes a `docker-compose.yml` for local/self-hosted deployment:

```sh
cp .env.example .env
docker compose up -d
```

## Windows Support

Windows hosts are supported through Docker Desktop (Linux containers / WSL2).

PowerShell:

```powershell
Copy-Item .env.example .env
docker compose up -d
```

Note: `repgraphics/crafatar` is a Linux container image, not a native Windows container image.

## Common Endpoints

Replace `{uuid}` with a valid Minecraft UUID:
- `/avatars/{uuid}?size=128`
- `/renders/head/{uuid}?scale=6`
- `/renders/body/{uuid}?scale=6`
- `/skins/{uuid}`

## Configuration

Environment variables are loaded from `.env`.
Common values:
- `REDIS_URL`
- `CACHE_BACKEND` (`redis`, `memory`, `none`)
- `PORT`
- `BIND`
- `EXTERNAL_URL`

## Links

- Source: https://github.com/EuphoriaTheme/crafatar
- Issues: https://github.com/EuphoriaTheme/crafatar/issues
- Docs: https://euphoriadevelopment.uk/docs/
- Service: https://crafatar.euphoriadevelopment.uk/
