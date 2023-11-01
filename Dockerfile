ARG BASE_IMAGE="python:3.10-slim"

# We use a multi-stage build to build the benchmark worker and then copy it into
# the inference image. This way we don't have to set up a node environment in
# the inference image.
FROM node:18-slim as build

WORKDIR /app

# Install the benchmark worker dependencies
COPY package*.json .
RUN npm install
COPY . .

# Build the benchmark worker with typescript
RUN npm run build

# Build the benchmark worker into a standalone binary with pkg.
# This way we don't have to set up a node environment in the inference image.
RUN npx pkg -t node18-linux-x64 --out-path ./bin .

FROM $BASE_IMAGE

ARG BACKEND
ENV BACKEND=$BACKEND

COPY install-deps .
RUN ./install-deps

# Copy the benchmark worker binary into the inference image
COPY --from=build /app/bin /app/bin


ENV HOST="127.0.0.1"
ENV PORT=1234
ENV IMAGE_GEN_URL="http://${HOST}:${PORT}/"

ARG NORMAL_START_CMD
ENV NORMAL_START_CMD=$NORMAL_START_CMD

ENTRYPOINT []
CMD [\
  "/bin/bash",\
  "-c",\
  "${NORMAL_START_CMD} & /app/bin/qr-code-worker"]
