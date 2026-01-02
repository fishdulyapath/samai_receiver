# Stage 1: Build
FROM node:20-alpine AS build

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Stage 2: Production
FROM nginx:alpine

# Copy nginx config
COPY nginx_conf/nginx.conf /etc/nginx/nginx.conf

# Copy built files from build stage
COPY --from=build /app/dist /usr/share/nginx/html/

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
