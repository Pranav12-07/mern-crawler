const axios = require('axios');
const cheerio = require('cheerio');

let Page = null;
let InvertedIndex = null;
try {
  Page = require('./models/Page');
  InvertedIndex = require('./models/InvertedIndex');
} catch (e) {
  // model not available or mongoose not connected; persistence will be skipped
}

const stopWords = new Set([
  'the', 'and', 'a', 'to', 'of', 'in', 'is', 'it', 'you', 'that', 'he', 'was',
  'for', 'on', 'are', 'with', 'as', 'his', 'they', 'be', 'at', 'one', 'have',
  'this', 'from', 'or', 'had', 'by', 'but', 'what', 'some', 'we', 'can', 'out',
  'other', 'were', 'all', 'there', 'when', 'up', 'use', 'your', 'how', 'said',
  'an', 'each', 'she'
]);

function normalizeStartUrl(input) {
  const value = String(input || '').trim();
  if (!value) throw new Error('website is required');
  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  const parsed = new URL(withProtocol);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Only http and https URLs can be crawled');
  }
  parsed.hash = '';
  return parsed.href;
}

function tokenize(text) {
  return String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter(term => term.length > 2 && !stopWords.has(term));
}

function extractPage(url, html) {
  const $ = cheerio.load(html);
  $('script, style, noscript, svg').remove();

  const title = ($('title').first().text() || $('h1').first().text() || url).trim();
  const content = $('body').text().replace(/\s+/g, ' ').trim();
  const links = new Set();

  $('a[href]').each((i, el) => {
    let href = $(el).attr('href');
    if (!href) return;
    href = href.split('#')[0].trim();
    if (!href || href.startsWith('mailto:') || href.startsWith('javascript:') || href.startsWith('tel:')) return;
    try {
      const absolute = new URL(href, url);
      if (['http:', 'https:'].includes(absolute.protocol)) {
        absolute.hash = '';
        links.add(absolute.href);
      }
    } catch (e) {
      // ignore invalid URLs
    }
  });

  return { title, content, links: Array.from(links) };
}

async function fetchPage(url) {
  try {
    const res = await axios.get(url, {
      timeout: 12000,
      maxRedirects: 5,
      headers: { 'User-Agent': 'MernCrawler/1.0 (+https://localhost)' }
    });
    const html = res.data;
    const page = extractPage(url, html);
    return { url, html, ...page, status: 'ok', error: '' };
  } catch (err) {
    return {
      url,
      html: '',
      title: url,
      content: '',
      links: [],
      status: 'error',
      error: err.message || String(err)
    };
  }
}

function termCounts(content) {
  return tokenize(content).reduce((counts, term) => {
    counts[term] = (counts[term] || 0) + 1;
    return counts;
  }, {});
}

async function updateIndex(url, content) {
  if (!InvertedIndex || !content) return;
  const terms = Object.keys(termCounts(content));
  await Promise.all(terms.map(term => InvertedIndex.updateOne(
    { term },
    {
      $addToSet: { urls: url },
      $inc: { count: 1 },
      $set: { updatedAt: new Date() }
    },
    { upsert: true }
  )));
}

async function persistPage(page, depth) {
  if (!Page) return;
  await Page.updateOne(
    { url: page.url },
    {
      url: page.url,
      title: page.title,
      content: page.content,
      html: page.html,
      links: page.links,
      depth,
      status: page.status,
      error: page.error,
      crawledAt: new Date()
    },
    { upsert: true }
  );
  await updateIndex(page.url, page.content);
}

function summarizeResults(pages, startedAt) {
  const ok = pages.filter(page => page.status === 'ok').length;
  const failed = pages.length - ok;
  return {
    pages,
    summary: {
      requestedAt: startedAt,
      completedAt: new Date().toISOString(),
      pagesVisited: pages.length,
      pagesFetched: ok,
      pagesFailed: failed,
      linksDiscovered: pages.reduce((total, page) => total + page.links.length, 0)
    }
  };
}

// Breadth-first crawl up to depth levels.
async function crawl(startUrl, levels = 1, options = { save: true, send: null, maxPages: 50 }) {
  const rootUrl = normalizeStartUrl(startUrl);
  const maxDepth = Math.max(0, Math.min(parseInt(levels, 10) || 0, 5));
  const maxPages = Math.max(1, Math.min(parseInt(options.maxPages, 10) || 50, 250));
  const send = options.send || (() => {});
  const startedAt = new Date().toISOString();
  const visited = new Set();
  const pages = [];
  const queue = [{ url: rootUrl, depth: 0 }];
  visited.add(rootUrl);

  await send({ type: 'started', url: rootUrl, levels: maxDepth, maxPages });

  while (queue.length > 0 && pages.length < maxPages) {
    const { url, depth } = queue.shift();
    if (depth > maxDepth) continue;

    await send({ type: 'fetching', url, depth });
    const page = await fetchPage(url);
    pages.push({ ...page, depth });

    if (options.save) {
      try {
        await persistPage(page, depth);
        await send({ type: 'saved', url });
      } catch (e) {
        await send({ type: 'save_error', url, message: e.message || String(e) });
      }
    }

    await send({
      type: 'fetched',
      url,
      title: page.title,
      depth,
      status: page.status,
      linksCount: page.links.length
    });

    if (depth < maxDepth && page.status === 'ok') {
      for (const link of page.links) {
        if (!visited.has(link) && visited.size < maxPages) {
          visited.add(link);
          queue.push({ url: link, depth: depth + 1 });
        }
      }
    }
  }

  const result = summarizeResults(pages, startedAt);
  await send({ type: 'done', summary: result.summary });
  return result;
}

async function crawlWithProgress(startUrl, levels = 1, options = { save: true, send: null }) {
  return crawl(startUrl, levels, options);
}

module.exports = {
  crawl,
  crawlWithProgress,
  extractPage,
  fetchPage,
  normalizeStartUrl,
  tokenize
};
