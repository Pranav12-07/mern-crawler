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

app.listen(PORT, () => console.log(`Server listening on ${PORT}`));
