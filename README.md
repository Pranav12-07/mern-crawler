# MERN Crawler

Live site: https://mern-crawler.onrender.com/

This repository contains only the files needed for the Render-hosted MERN Crawler website: an Express API, a React/Vite client, MongoDB models, and the Render blueprint.

## MERN Stack Structure

- MongoDB: stores crawled pages and inverted index terms
- Express: exposes crawl, stream, pages, search, status, and health APIs
- React: provides the crawler dashboard and search interface
- Node.js: runs the crawler, API server, and production static serving

## What The App Does

- Crawls a starting website with configurable depth and max page count
- Streams crawl progress to the browser with Server-Sent Events
- Stores crawled pages in MongoDB when `MONGODB_URI` is configured
- Searches stored pages with MongoDB text search
- Shows MongoDB connection status in the UI
- Serves the production React build from Express

## Render Deployment

Render uses `render.yaml`:

- Environment: Node
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Health check path: `/health`

Required environment variables:

- `NODE_ENV=production`
- `MONGODB_URI=<your MongoDB Atlas connection string>`

## Local Development

Install backend dependencies:

```bash
npm install
```

Install frontend dependencies:

```bash
cd client
npm install
```

Run the API:

```bash
npm start
```

Run the Vite client in another terminal:

```bash
cd client
npm run dev
```

Open `http://localhost:5173`.

## Production Build

```bash
npm run build
$env:NODE_ENV="production"
npm start
```

Express serves `client/dist` after the API routes in production.

## Project Files

- `render.yaml` - Render web service configuration
- `package.json` - backend dependencies and build/start scripts
- `server/config/database.js` - MongoDB connection and status helper
- `server/index.js` - Express API and static production serving
- `server/crawler.js` - crawler logic and progress events
- `server/models/Page.js` - MongoDB page document
- `server/models/InvertedIndex.js` - MongoDB inverted index document
- `client/` - React/Vite frontend
