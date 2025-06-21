# Use the official Node.js 18 image.
FROM node:18-slim

# Create and change to the app directory.
WORKDIR /app

# Copy all application code and dependency manifests to the container image.
COPY . .

# Install production dependencies.
# npm install will also run the 'prepare' script which includes 'npm run build'
RUN npm install

# Run the web service on the container's port 8080.
EXPOSE 8080
CMD ["node", "build/index.js"]
