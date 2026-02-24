FROM node:24-bookworm-slim AS builder

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    git \
    python3 \
    make \
    g++ \
    pkg-config \
    redis-server \
    libcairo2-dev \
    libpango1.0-dev \
    libjpeg62-turbo-dev \
    libgif-dev \
    librsvg2-dev \
  && rm -rf /var/lib/apt/lists/*

RUN useradd --create-home --shell /usr/sbin/nologin app
USER app

COPY --chown=app:app package.json package-lock.json /home/app/crafatar/
WORKDIR /home/app/crafatar
RUN npm ci

COPY --chown=app:app . .
RUN mkdir -p images/faces images/helms images/skins images/renders images/capes

ARG VERBOSE_TEST
ARG DEBUG
ARG RUN_TESTS=false
RUN if [ "$RUN_TESTS" = "true" ]; then redis-server --save "" --appendonly no & npm test; fi
RUN npm prune --omit=dev


FROM node:24-bookworm-slim
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    libcairo2 \
    libpango-1.0-0 \
    libjpeg62-turbo \
    libgif7 \
    librsvg2-2 \
  && rm -rf /var/lib/apt/lists/*
# Remove npm tooling from runtime to reduce attack surface and avoid npm-only CVEs.
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack
RUN useradd --create-home --shell /usr/sbin/nologin app
USER app
RUN mkdir /home/app/crafatar
WORKDIR /home/app/crafatar
RUN mkdir -p images/faces images/helms images/skins images/renders images/capes

COPY --chown=app:app --from=builder /home/app/crafatar/node_modules/ node_modules/
COPY --chown=app:app package.json www.js config.js ./
COPY --chown=app:app lib/ lib/

VOLUME /home/app/crafatar/images
ENV NODE_ENV production
ENTRYPOINT ["node", "www.js"]
EXPOSE 3000
