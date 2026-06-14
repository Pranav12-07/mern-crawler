import React, { useState } from 'react'

export default function App() {
  const [website, setWebsite] = useState('')
  const [levels, setLevels] = useState(1)
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setOutput('')
    try {
      const res = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ website, levels })
      })
      const data = await res.json()
      setOutput(JSON.stringify(data, null, 2))
    } catch (err) {
      setOutput('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  function startStream(e) {
    e.preventDefault()
    setOutput('')
    setLoading(true)
    const url = `/api/crawl-stream?website=${encodeURIComponent(website)}&levels=${levels}`
    const es = new EventSource(url)

    es.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data)
        setOutput((o) => o + JSON.stringify(msg) + '\n')
      } catch (e) {
        setOutput((o) => o + ev.data + '\n')
      }
    }

    es.addEventListener('done', () => {
      setLoading(false)
      es.close()
    })

    es.onerror = (err) => {
      setOutput((o) => o + 'Error or connection closed\n')
      setLoading(false)
      es.close()
    }
  }

  return (
    <div className="app">
      <h1>MERN Crawler</h1>
      <form onSubmit={handleSubmit} className="form">
        <label>
          Website
          <input value={website} onChange={e => setWebsite(e.target.value)} placeholder="https://example.com" />
        </label>
        <label>
          Levels
          <input type="number" value={levels} onChange={e => setLevels(Number(e.target.value))} min="0" />
        </label>
        <button type="submit" disabled={loading}> {loading ? 'Crawling...' : 'Crawl (one-shot)'} </button>
        <button onClick={startStream} disabled={loading || !website}> {loading ? 'Crawling...' : 'Crawl (stream)'} </button>
      </form>

      <pre className="output">{output}</pre>
    </div>
  )
}
