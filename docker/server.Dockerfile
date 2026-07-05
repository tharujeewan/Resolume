# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies for compiling native node packages (like sharp)
RUN apk add --no-cache python3 make g++ gcc libc6-compat

# Copy package files from server directory
COPY server/package*.json ./

# Install packages
RUN npm ci

# Copy schema and generate client
COPY prisma/schema.prisma ./prisma/schema.prisma
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

# Install runtime dependencies for sharp
RUN apk add --no-cache libc6-compat

ENV NODE_ENV=production
ENV PORT=5000

# Copy from builder
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Expose API port
EXPOSE 5000

# Start server and run migrations
CMD ["sh", "-c", "npx prisma migrate deploy --schema=./prisma/schema.prisma && node dist/index.js"]
