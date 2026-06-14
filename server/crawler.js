const axios = require('axios');
const cheerio = require('cheerio');

let Page = null;
try {
  Page = require('./models/Page');
} catch (e) {
  // model not available or mongoose not connected; persistence will be skipped
}

async function fetchLinks(url) {
  try {
    const res = await axios.get(url, { timeout: 10000 });
    const html = res.data;
    const $ = cheerio.load(html);
    const links = new Set();
    $('a[href]').each((i, el) => {
      let href = $(el).attr('href');
      if (!href) return;
      href = href.split('#')[0];
      if (href.startsWith('mailto:') || href.startsWith('javascript:')) return;
      try {
        const abs = new URL(href, url).href;
        links.add(abs);
      } catch (e) {
        // ignore invalid URLs
      }
    });
    return { html, links: Array.from(links) };
  } catch (err) {
    return { html: null, links: [] };
  }
}

// breadth-first crawl up to depth levels
// options: { save: true } to persist pages to MongoDB (if configured)
async function crawl(startUrl, levels = 1, options = { save: true }) {
  const visited = new Set();
  const adjacency = {};
  const queue = [{ url: startUrl, depth: 0 }];
  visited.add(startUrl);

  while (queue.length > 0) {
    const { url, depth } = queue.shift();
    if (depth > levels) continue;
    const { html, links } = await fetchLinks(url);
    adjacency[url] = links;

    // Persist the page if configured and model available
    if (options.save && Page) {
      try {
        await Page.updateOne({ url }, { url, html, links, crawledAt: new Date() }, { upsert: true });
      } catch (e) {
        console.error('Error saving page to DB:', e.message || e);
      }
    }

    if (depth < levels) {
      for (const l of links) {
        if (!visited.has(l)) {
          visited.add(l);
          queue.push({ url: l, depth: depth + 1 });
        }
      }
    }
  }

  return adjacency;
}

module.exports = { crawl };

// crawl with progress callbacks: expects options.send(msg)
async function crawlWithProgress(startUrl, levels = 1, options = { save: true, send: null }) {
  const visited = new Set();
  const adjacency = {};
  const queue = [{ url: startUrl, depth: 0 }];
  visited.add(startUrl);

  const send = options.send || (() => {});

  await send({ type: 'started', url: startUrl, levels });

  while (queue.length > 0) {
    const { url, depth } = queue.shift();
    if (depth > levels) continue;

    await send({ type: 'fetching', url, depth });
    const { html, links } = await fetchLinks(url);
    adjacency[url] = links;

    if (options.save && Page) {
      try {
        await Page.updateOne({ url }, { url, html, links, crawledAt: new Date() }, { upsert: true });
        await send({ type: 'saved', url });
      } catch (e) {
        await send({ type: 'save_error', url, message: e.message || String(e) });
      }
    }

    await send({ type: 'fetched', url, linksCount: links.length, depth });

    if (depth < levels) {
      for (const l of links) {
        if (!visited.has(l)) {
          visited.add(l);
          queue.push({ url: l, depth: depth + 1 });
        }
      }
    }
  }

  await send({ type: 'done', adjacencySummary: { nodes: Object.keys(adjacency).length } });
  return adjacency;
}

module.exports = { crawl, crawlWithProgress };
