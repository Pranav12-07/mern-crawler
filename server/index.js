const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const crawler = require('./crawler');
const Page = require('./models/Page');

dotenv.config();
const app = express();
app.use(bodyParser.json());
app.use(cors());
const PORT = process.env.PORT || 5000;

if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error', err));
}

const clientDist = path.join(__dirname, '../client/dist');

app.get('/health', (req, res) => res.json({ status: 'healthy' }));

app.post('/api/crawl', async (req, res) => {
  const { website, levels, maxPages } = req.body;
  if (!website) return res.status(400).json({ error: 'website is required' });
  try {
    const result = await crawler.crawl(website, parseInt(levels, 10) || 1, { save: true, maxPages });
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Server-Sent Events endpoint for streaming crawl progress
app.get('/api/crawl-stream', (req, res) => {
  const website = req.query.website;
  const levels = parseInt(req.query.levels, 10) || 1;
  const maxPages = parseInt(req.query.maxPages, 10) || 50;
  if (!website) return res.status(400).json({ error: 'website is required' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders && res.flushHeaders();

  const send = (msg) => {
    try {
      res.write(`data: ${JSON.stringify(msg)}\n\n`);
    } catch (e) {
      // ignore
    }
  };

  crawler.crawlWithProgress(website, levels, { save: true, send, maxPages })
    .then(() => {
      res.write('event: done\ndata: {}\n\n');
      res.end();
    })
    .catch((err) => {
      res.write(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`);
      res.end();
    });
});

app.get('/api/pages', async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    return res.json({ pages: [] });
  }

  try {
    const pages = await Page.find({})
      .select('url title links depth status error crawledAt')
      .sort({ crawledAt: -1 })
      .limit(50)
      .lean();

    res.json({ pages });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/search', async (req, res) => {
  const query = String(req.query.q || '').trim();
  if (!query) return res.status(400).json({ error: 'q parameter is required' });
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({ error: 'MongoDB is not connected' });
  }

  try {
    const textResults = await Page.find(
      { $text: { $search: query } },
      { score: { $meta: 'textScore' }, url: 1, title: 1, content: 1, crawledAt: 1 }
    )
      .sort({ score: { $meta: 'textScore' } })
      .limit(20)
      .lean();

    res.json({
      query,
      hits: textResults.map(page => ({
        url: page.url,
        title: page.title || page.url,
        snippet: String(page.content || '').slice(0, 240),
        crawledAt: page.crawledAt,
        score: page.score
      }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve the built React client after API routes in production.
if (process.env.NODE_ENV === 'production' && require('fs').existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
} else {
  app.use('/', express.static(path.join(__dirname, '../client')));
}

app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
