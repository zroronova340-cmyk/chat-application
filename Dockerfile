# Stage 1: Build Frontend
FROM node:18-slim as frontend-build
WORKDIR /app
COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install
COPY frontend/ ./frontend/
RUN cd frontend && npm run build

# Stage 2: Setup Backend and Serve Frontend
FROM node:18-slim
WORKDIR /app

# Copy Backend package files
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# Copy the rest of the backend
COPY backend/ ./backend/

# Copy built frontend from Stage 1
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Configuration
ENV NODE_ENV=production
ENV PORT=5000
EXPOSE 5000

WORKDIR /app/backend
CMD ["node", "index.js"]
