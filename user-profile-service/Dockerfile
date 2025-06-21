# Use the official Node.js 18 image.
# https://cloud.google.com/nodejs/docs/setup
FROM node:18-slim

# Create and change to the app directory.
WORKDIR /app

# Copy application dependency manifests to the container image.
# A wildcard is used to ensure both package.json AND package-lock.json are copied.
# Copying this separately prevents re-running npm install when only the application source code changes.
COPY package*.json ./

# Install production dependencies.
RUN npm install

# Copy the rest of the application code.
COPY . .

# Build the TypeScript application
RUN npm run build

# Run the web service on the container's port 8080.
EXPOSE 8080
CMD ["node", "dist/index.js"]
