#!/bin/sh
set -eu

if [ -z "${API_TARGET:-}" ]; then
  echo "API_TARGET is required" >&2
  exit 1
fi

sed "s|API_TARGET_PLACEHOLDER|${API_TARGET}|g" \
  /etc/prometheus/prometheus.render.yml > /tmp/prometheus.yml

exec /bin/prometheus \
  --config.file=/tmp/prometheus.yml \
  --storage.tsdb.path=/prometheus \
  --web.listen-address=0.0.0.0:${PORT:-10000}
