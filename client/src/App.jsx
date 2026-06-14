import React, { useEffect, useMemo, useState } from 'react'

export default function App() {
  const [website, setWebsite] = useState('')
  const [levels, setLevels] = useState(1)
  const [maxPages, setMaxPages] = useState(25)
  const [events, setEvents] = useState([])
  const [result, setResult] = useState(null)
  const [pages, setPages] = useState([])
  const [query, setQuery] = useState('')
  const [search, setSearch] = useState(null)
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canCrawl = useMemo(() => website.trim().length > 0 && !loading, [website, loading])

  useEffect(() => {
    loadStatus()
    loadPages()
  }, [])

  async function loadStatus() {
    try {
      const res = await fetch('/api/status')
      const data = await res.json()
      setStatus(data)
    } catch (err) {
      setStatus({ api: 'unknown', mongo: { connected: false, state: 'unknown' } })
    }
  }

  async function loadPages() {
    try {
      const res = await fetch('/api/pages')
      const data = await res.json()
      setPages(data.pages || [])
    } catch (err) {
      setError(err.message)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!website || website.trim() === '') {
      setError('Please enter a website URL to crawl.')
      return
    }
    setLoading(true)
    setError('')
    setEvents([])
    setResult(null)
    try {
      const res = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website, levels, maxPages })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Crawl failed')
      setResult(data)
      await loadStatus()
      await loadPages()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function startStream(e) {
    e.preventDefault()
    if (!canCrawl) return
    setEvents([])
    setResult(null)
    setError('')
    setLoading(true)
    const url = `/api/crawl-stream?website=${encodeURIComponent(website)}&levels=${levels}&maxPages=${maxPages}`
    const es = new EventSource(url)

    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data)
        setEvents((items) => [msg, ...items].slice(0, 80))
      } catch (e) {
        setEvents((items) => [{ type: 'message', text: ev.data }, ...items])
      }
    }

    es.addEventListener('done', async () => {
      setLoading(false)
      es.close()
      await loadStatus()
      await loadPages()
    })

    es.onerror = () => {
      setError('The stream closed before the crawl finished.')
      setLoading(false)
      es.close()
    }
  }

  async function handleSearch(e) {
    e.preventDefault()
    if (!query.trim()) return
    setError('')
    setSearch(null)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Search failed')
      setSearch(data)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="appShell">
      <aside className="sidebar">
        <div>
          <p className="eyebrow">MERN stack</p>
          <h1>Distributed crawler, recoded for Mongo + Express + React + Node</h1>
        </div>

        <form onSubmit={handleSubmit} className="panel form">
          <label>
            Website
            <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://example.com" />
          </label>
          <div className="fieldGrid">
            <label>
              Depth
              <input type="number" value={levels} onChange={e => setLevels(Number(e.target.value))} min="0" max="5" />
            </label>
            <label>
              Max pages
              <input type="number" value={maxPages} onChange={e => setMaxPages(Number(e.target.value))} min="1" max="250" />
            </label>
          </div>
          <div className="actions">
            <button type="submit" disabled={!canCrawl}>{loading ? 'Crawling' : 'Crawl now'}</button>
            <button type="button" onClick={startStream} disabled={!canCrawl}>Stream crawl</button>
          </div>
        </form>

        <form onSubmit={handleSearch} className="panel searchForm">
          <label>
            Search indexed pages
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="keyword or phrase" />
          </label>
          <button type="submit" disabled={!query.trim()}>Search</button>
        </form>
      </aside>

      <main className="workspace">
        {error && <div className="notice">{error}</div>}

        <section className="stats">
          <div>
            <span>{result?.summary?.pagesVisited ?? pages.length}</span>
            <p>Pages tracked</p>
          </div>
          <div>
            <span>{result?.summary?.linksDiscovered ?? pages.reduce((total, page) => total + (page.links?.length || 0), 0)}</span>
            <p>Links discovered</p>
          </div>
          <div>
            <span>{events.length}</span>
            <p>Live events</p>
          </div>
          <div>
            <span className={status?.mongo?.connected ? 'okText' : 'warnText'}>
              {status?.mongo?.connected ? 'On' : 'Off'}
            </span>
            <p>MongoDB {status?.mongo?.state || 'checking'}</p>
          </div>
        </section>

        <section className="section">
          <div className="sectionHeader">
            <h2>Recent crawl events</h2>
            {loading && <span className="statusDot">Running</span>}
          </div>
          <div className="eventList">
            {events.length === 0 && <p className="empty">Start a streamed crawl to watch pages as they are fetched.</p>}
            {events.map((event, index) => (
              <div className="event" key={`${event.type}-${event.url || index}-${index}`}>
                <strong>{event.type}</strong>
                <span>{event.url || event.text || event.summary?.pagesVisited || ''}</span>
              </div>
            ))}
          </div>
        </section>

        {search && (
          <section className="section">
            <div className="sectionHeader">
              <h2>Search results</h2>
              <span>{search.hits.length} hits</span>
            </div>
            <div className="pageList">
              {search.hits.map(hit => (
                <article className="pageItem" key={hit.url}>
                  <a href={hit.url} target="_blank" rel="noreferrer">{hit.title}</a>
                  <p>{hit.snippet}</p>
                  <small>{hit.url}</small>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="section">
          <div className="sectionHeader">
            <h2>Stored pages</h2>
            <button type="button" className="ghost" onClick={loadPages}>Refresh</button>
          </div>
          <div className="pageList">
            {pages.length === 0 && <p className="empty">No stored MongoDB pages yet. Crawls still run without MongoDB, but history and search need `MONGODB_URI`.</p>}
            {pages.map(page => (
              <article className="pageItem" key={page.url}>
                <a href={page.url} target="_blank" rel="noreferrer">{page.title || page.url}</a>
                <div className="meta">
                  <span>Depth {page.depth}</span>
                  <span>{page.status}</span>
                  <span>{page.links?.length || 0} links</span>
                </div>
                {page.error && <p className="errorText">{page.error}</p>}
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
