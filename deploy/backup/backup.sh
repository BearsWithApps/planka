#!/bin/sh
# Dump the Planka DB (custom format), verify it, upload to S3.
# Filenames match the old Coolify backups: pg-dump-planka-<epoch>.dmp
set -eu
: "${POSTGRES_PASSWORD:?}" "${S3_BUCKET:?}" "${S3_PREFIX:?}"

ts=$(date +%s)
name="pg-dump-planka-${ts}.dmp"
file="/tmp/${name}"
trap 'rm -f "$file"' EXIT

PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -h "${PGHOST:-postgres}" -U "${PGUSER:-planka}" -d "${PGDATABASE:-planka}" -Fc -f "$file"
pg_restore --list "$file" > /dev/null
aws s3 cp "$file" "s3://${S3_BUCKET}/${S3_PREFIX%/}/${name}" --only-show-errors

echo "$(date -u +%FT%TZ) backup ok ${name} $(wc -c < "$file") bytes -> s3://${S3_BUCKET}/${S3_PREFIX%/}/"
