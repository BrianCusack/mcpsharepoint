# Use the official Bun image as the base image
FROM oven/bun:latest AS builder

# Set the working directory inside the container
WORKDIR /app

# Copy the source code and configuration files
COPY src /app/src
COPY tsconfig.json /app/tsconfig.json
COPY package.json /app/package.json

# Install dependencies using Bun
RUN bun install

# Compile TypeScript to JavaScript
RUN bun run build

# Use a lightweight Bun runtime image for the release stage
FROM oven/bun:latest AS release

# Set the working directory inside the container
WORKDIR /app

# Copy the compiled code and dependencies from the builder stage
COPY --from=builder /app /app

# Set the environment to production
ENV NODE_ENV=production

# Run the application
ENTRYPOINT ["bun", "run", "start"]
