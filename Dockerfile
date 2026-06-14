FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
COPY client/package*.json ./client/
RUN npm ci
RUN npm --prefix client ci

COPY . .
RUN npm run client:build

FROM node:20-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/server ./server
COPY --from=build /app/client/dist ./client/dist

EXPOSE 5000
CMD ["npm", "start"]
