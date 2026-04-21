# Stage 1: Build Frontend
FROM node:18-alpine as frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# Stage 2: Setup Backend and Serve Frontend
FROM node:18-alpine
WORKDIR /app

# Copy Backend files and install dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm install
COPY backend/ ./backend/

# Copy built Frontend to backend's reach
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Set environment variables
ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

WORKDIR /app/backend
CMD ["node", "index.js"]
