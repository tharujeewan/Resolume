# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for compiling native node packages (like sharp)
RUN apk add --no-cache python3 make g++ gcc libc6-compat openssl

# Copy package files from server directory
COPY server/package*.json ./

# Install packages
RUN npm ci

# Copy prisma directory (schema and migrations) and generate client
COPY prisma ./prisma
RUN npx prisma generate --schema=./prisma/schema.prisma

# Copy server code and build
COPY server/src ./src
COPY server/tsconfig.json ./
RUN npm run build

# Remove development dependencies
RUN npm prune --production


# Stage 2: Runner
FROM node:20-alpine AS runner

WORKDIR /app

# Install runtime dependencies for sharp and prisma engines
RUN apk add --no-cache libc6-compat openssl

ENV NODE_ENV=production
ENV PORT=5000

# Copy from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Expose API port
EXPOSE 5000

# Start server, run migrations, and seed
CMD ["sh", "-c", "npx prisma migrate deploy --schema=./prisma/schema.prisma && node dist/db/seed.js && node dist/index.js"]
