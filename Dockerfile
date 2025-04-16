# Use the official Node.js image as the base image
FROM node:22-slim AS builder

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set the working directory inside the container
WORKDIR /app

# Copy the source code and configuration files
COPY src /app/src
COPY tsconfig.json /app/tsconfig.json
COPY package.json /app/package.json
COPY pnpm-lock.yaml /app/pnpm-lock.yaml

# Install dependencies using pnpm
RUN pnpm install

# Compile TypeScript to JavaScript
RUN pnpm run build

# Use a lightweight Node.js runtime image for the release stage
FROM node:22-slim AS release

# Install pnpm globally
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set the working directory inside the container
WORKDIR /app

# Copy the compiled code and dependencies from the builder stage
COPY --from=builder /app /app

# Set the environment to production
ENV NODE_ENV=production

# Run the application
ENTRYPOINT ["pnpm", "start"]
