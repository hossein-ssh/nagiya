# Dockerfile for Group Management App
FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json bun.lock* ./

# Install all dependencies (including tsx for server execution)
RUN npm install

# Copy application source
COPY . .

# Build frontend production bundle
RUN npm run build

# Default environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Expose server port
EXPOSE 3000

# Start command
CMD ["npm", "start"]
