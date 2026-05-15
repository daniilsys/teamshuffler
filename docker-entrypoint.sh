#!/bin/sh
set -e

echo "Running database migrations..."
npx prisma migrate deploy

echo "Deploying slash commands..."
node dist/deploy-commands.js

echo "Starting bot..."
exec node dist/index.js
