# Use Node.js LTS (Long Term Support) as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# First copy all source files
COPY . .

# Install dependencies and build
RUN npm install

# Expose port
EXPOSE 3000

# Use development command
CMD ["npm", "run", "dev"] 