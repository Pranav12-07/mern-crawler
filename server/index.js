const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const crawler = require('./crawler');

dotenv.config();
const app = express();
app.use(bodyParser.json());
app.use(cors());
const PORT = process.env.PORT || 5000;

if (process.env.MONGODB_URI) {
  mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('MongoDB connected'))
    .catch(err => console.error('MongoDB connection error', err));
}

// Serve Vite dev server during development; in production serve built files from client/dist
const clientDist = path.join(__dirname, '../client/dist');
if (process.env.NODE_ENV === 'production' && require('fs').existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res) => res.sendFile(path.join(clientDist, 'index.html')));
} else {
  app.use('/', express.static(path.join(__dirname, '../client')));
}

app.get('/health', (req, res) => res.json({ status: 'healthy' }));

app.post('/api/crawl', async (req, res) => {
  const { website, levels } = req.body;
  if (!website) return res.status(400).json({ error: 'website is required' });
  try {
    const result = await crawler.crawl(website, parseInt(levels) || 1);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Server-Sent Events endpoint for streaming crawl progress
app.get('/api/crawl-stream', (req, res) => {
  const website = req.query.website;
  const levels = parseInt(req.query.levels) || 1;
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

  crawler.crawlWithProgress(website, levels, { save: true, send })
    .then(() => {
      res.write('event: done\ndata: {}\n\n');
      res.end();
    })
    .catch((err) => {
      res.write(`event: error\ndata: ${JSON.stringify({ message: err.message })}\n\n`);
      res.end();
    });
});

app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
