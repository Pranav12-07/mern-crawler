# MERN Crawler

This is the JavaScript/MERN conversion of the distributed crawler. The Python-style distributed pieces are represented with a Node crawler service, Express API routes, MongoDB persistence, and a React dashboard.

## Features

- Crawl a starting website with configurable depth and max page count
- Extract page titles, text content, links, status, and errors
- Store crawled pages in MongoDB
- Maintain a Mongo-backed inverted term index
- Search stored pages with MongoDB text search
- Stream crawl progress to React with Server-Sent Events
- View recent crawled pages and crawl metrics in the browser

## Quick start

1. Install dependencies

```bash
cd d:/single/mern-crawler
npm install
```

2. Install client dependencies

```bash
cd client
npm install
```

3. Configure MongoDB

Copy `.env.example` to `.env` and edit `MONGODB_URI` if needed.

```bash
cd ..
copy .env.example .env
```

The crawler can fetch pages without MongoDB, but stored history and search need `MONGODB_URI`.

4. Run the Express API

```bash
npm start
```

5. Run the React dev server in another terminal

```bash
cd client
npm run dev
```

Open `http://localhost:5173`.

## API

- `GET /health` - server health
- `POST /api/crawl` - crawl immediately
- `GET /api/crawl-stream` - stream crawl progress with Server-Sent Events
- `GET /api/pages` - recent stored pages
- `GET /api/search?q=keyword` - search indexed pages

Example crawl:

```bash
curl -X POST http://localhost:5000/api/crawl \
  -H "Content-Type: application/json" \
  -d "{\"website\":\"https://example.com\",\"levels\":1,\"maxPages\":20}"
```

## Production build

Build the React app and run Express with `NODE_ENV=production`:

```bash
npm run build
$env:NODE_ENV="production"
npm start
```

Express serves `client/dist` after the API routes.

## Public Deployment

The project is ready for a public Node host such as Render.

Render settings:

- Root directory: `mern-crawler`
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Health check path: `/health`
- Environment variables:
  - `NODE_ENV=production`
  - `MONGODB_URI=<your MongoDB Atlas connection string>`

The included `render.yaml` can be used as a Render blueprint. A `Dockerfile` is also included for Docker-based hosts.

## Project structure

- `server/index.js` - Express API and static serving
- `server/crawler.js` - Node crawler, extraction, BFS traversal, progress events
- `server/models/Page.js` - MongoDB page document
- `server/models/InvertedIndex.js` - MongoDB term index document
- `client/src/App.jsx` - React crawler dashboard

The old `distributed-crawler` folder is still present as a reference implementation. The active MERN conversion is in `mern-crawler`.
