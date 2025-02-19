FROM node:18

WORKDIR /app

COPY package*.json ./
COPY backend/package*.json backend/
COPY backend/server.js backend/
COPY frontend/package*.json frontend/

RUN cd backend && npm install
# No need to install frontend dependencies for simple HTML/CSS/JS
# RUN cd frontend && npm install 

COPY frontend ./frontend

# No need to build frontend if it's just HTML/CSS/JS
# For more complex frontends, add build steps here

EXPOSE 3000

CMD ["node", "backend/server.js"]
