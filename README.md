# MERN Crawler (converted)

This is a minimal conversion of the distributed web crawler to a Node/Express backend with a simple client.

Quick start

1. Install dependencies

```bash
cd d:/single/mern-crawler
npm install
```

2. (Optional) set MongoDB URI in `.env` as `MONGODB_URI` or copy `.env.example` to `.env` and edit.

3. Run server

```bash
npm start
```

4. Open browser to `http://localhost:5000` and use the simple UI to crawl a site.

Client (React) development

1. Install client dependencies and run dev server

```bash
cd client
npm install
npm run dev
```

The React dev server runs on `http://localhost:5173` by default and will proxy API requests to the Express server if you configure a proxy. Alternatively, run the Express server and use it to serve the production build from `client/dist`.

Dev proxy

The Vite dev server proxies `/api` to `http://localhost:5000` by default using `client/vite.config.js`. That means you can run the Express backend on port 5000 and the React dev server on 5173 without CORS issues.

Production build served by Express

To build the client and serve it from Express (production):

```bash
cd client
npm install
npm run build
cd ..
npm start
```

Express will automatically serve the `client/dist` files when `NODE_ENV=production` and `client/dist` exists.

Notes

- The crawler is implemented in `server/crawler.js` using `axios` + `cheerio`.
- If `MONGODB_URI` is set and reachable, crawled pages will be persisted to MongoDB using the `Page` model at `server/models/Page.js`.
- The server serves the static client from `client/` and exposes `POST /api/crawl`.
- Next steps: convert the client into a React frontend and add more distributed node behaviour (nodes + health monitor) if you want.
