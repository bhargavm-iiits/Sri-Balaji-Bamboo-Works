#!/bin/sh
set -eu
# The mounted disk needs ownership set once; the application runs as node.
mkdir -p /app/storage
chown node:node /app/storage
chmod 700 /app/storage
exec su-exec node "$@"
