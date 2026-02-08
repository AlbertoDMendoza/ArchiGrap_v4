require('dotenv').config()
const express = require('express')
const cors = require('cors')
const axios = require('axios')

const app = express()
const PORT = process.env.PORT || 3002

// Middleware
app.use(cors())
app.use(express.json())

// GraphDB config
let GRAPHDB_URL = process.env.GRAPHDB_URL || 'http://192.168.0.105:7200'
let GRAPHDB_REPO = process.env.GRAPHDB_REPOSITORY || 'archigraph-v4'

// Predefined endpoints (from env or default to current)
const GRAPHDB_ENDPOINTS = (() => {
  try {
    const raw = process.env.GRAPHDB_ENDPOINTS
    if (raw) return JSON.parse(raw)
  } catch (e) {
    console.error('Failed to parse GRAPHDB_ENDPOINTS:', e.message)
  }
  return [{ name: 'Default', url: GRAPHDB_URL, repository: GRAPHDB_REPO }]
})()

// Health check
app.get('/api/health', async (req, res) => {
  try {
    // Check GraphDB connection
    const response = await axios.get(`${GRAPHDB_URL}/rest/repositories/${GRAPHDB_REPO}/size`)
    
    res.json({ 
      status: 'ok',
      graphdb: {
        url: GRAPHDB_URL,
        repository: GRAPHDB_REPO,
        triples: response.data,
        connected: true
      },
      backend: {
        port: PORT,
        nodeVersion: process.version
      }
    })
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message,
      graphdb: {
        url: GRAPHDB_URL,
        repository: GRAPHDB_REPO,
        connected: false
      }
    })
  }
})

// SPARQL query helper
async function sparqlQuery(query) {
  const response = await axios.post(
    `${GRAPHDB_URL}/repositories/${GRAPHDB_REPO}`,
    query,
    {
      headers: {
        'Content-Type': 'application/sparql-query',
        'Accept': 'application/sparql-results+json'
      }
    }
  )
  return response.data
}

// Test SPARQL endpoint
app.post('/api/sparql', async (req, res) => {
  try {
    const { query } = req.body
    const results = await sparqlQuery(query)
    res.json(results)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// SPARQL proxy for Reactodia (handles raw SPARQL queries)
app.post('/api/sparql-proxy', express.text({ type: '*/*' }), async (req, res) => {
  try {
    const query = req.body
    const accept = req.headers.accept || 'application/sparql-results+json'

    const response = await axios.post(
      `${GRAPHDB_URL}/repositories/${GRAPHDB_REPO}`,
      query,
      {
        headers: {
          'Content-Type': 'application/sparql-query',
          'Accept': accept
        },
        responseType: accept.includes('json') ? 'json' : 'text'
      }
    )

    res.set('Content-Type', accept)
    res.send(response.data)
  } catch (error) {
    console.error('SPARQL proxy error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

// GET handler for SPARQL proxy (some clients use GET with query param)
app.get('/api/sparql-proxy', async (req, res) => {
  try {
    const query = req.query.query
    if (!query) {
      return res.status(400).json({ error: 'Missing query parameter' })
    }

    const accept = req.headers.accept || 'application/sparql-results+json'

    const response = await axios.get(
      `${GRAPHDB_URL}/repositories/${GRAPHDB_REPO}`,
      {
        params: { query },
        headers: {
          'Accept': accept
        },
        responseType: accept.includes('json') ? 'json' : 'text'
      }
    )

    res.set('Content-Type', accept)
    res.send(response.data)
  } catch (error) {
    console.error('SPARQL proxy error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

// SPARQL UPDATE endpoint (INSERT/DELETE)
app.post('/api/sparql-update', express.text({ type: '*/*' }), async (req, res) => {
  try {
    const update = req.body

    await axios.post(
      `${GRAPHDB_URL}/repositories/${GRAPHDB_REPO}/statements`,
      update,
      {
        headers: {
          'Content-Type': 'application/sparql-update'
        }
      }
    )

    res.json({ success: true })
  } catch (error) {
    console.error('SPARQL update error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

// Simple instance list endpoint (for testing)
app.get('/api/instances', async (req, res) => {
  try {
    const query = `
      SELECT ?s ?type ?label
      WHERE {
        ?s a ?type .
        OPTIONAL { ?s rdfs:label ?label }
      }
      LIMIT 100
    `
    const results = await sparqlQuery(query)
    res.json(results)
  } catch (error) {
    res.status(500).json({ error: error.message })
  }
})

// Get available endpoints
app.get('/api/config/endpoints', (req, res) => {
  res.json({
    endpoints: GRAPHDB_ENDPOINTS,
    active: { url: GRAPHDB_URL, repository: GRAPHDB_REPO }
  })
})

// Switch active endpoint
app.post('/api/config/endpoint', async (req, res) => {
  const { url, repository } = req.body
  if (!url || !repository) {
    return res.status(400).json({ error: 'url and repository are required' })
  }

  try {
    // Validate connection
    await axios.get(`${url}/rest/repositories/${repository}/size`)

    GRAPHDB_URL = url
    GRAPHDB_REPO = repository
    console.log(`Switched endpoint to ${url} / ${repository}`)

    res.json({ success: true, url, repository })
  } catch (error) {
    res.status(502).json({
      error: `Cannot connect to ${url}/repositories/${repository}: ${error.message}`
    })
  }
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 ArchiGraph v4 backend running on port ${PORT}`)
  console.log(`📊 GraphDB: ${GRAPHDB_URL}`)
  console.log(`🗄️  Repository: ${GRAPHDB_REPO}`)
  console.log(`✨ Health check: http://localhost:${PORT}/api/health`)
})
