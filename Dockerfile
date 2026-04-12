# 1. Use Node 20 or higher for Next.js 16 compatibility
FROM node:20-slim AS base

# Install OpenSSL (Required by Prisma)
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

# 2. Install dependencies
COPY package*.json ./
# Use legacy-peer-deps to handle any version mismatches in the template
RUN npm install --legacy-peer-deps

# 3. Copy source code
COPY . .

# 4. Generate Prisma Client
# This must happen BEFORE the build so the types are available
RUN npx prisma generate

# 5. Build the application
# RUN npm run build

# 6. Set Environment to Production
# ENV NODE_ENV=production

EXPOSE 3000

# 7. Start Command
# We don't run migrations in the BUILD step. We run them when the container STARTS.
# CMD npx prisma db push && npm start
CMD ["npm", "run", "dev"]