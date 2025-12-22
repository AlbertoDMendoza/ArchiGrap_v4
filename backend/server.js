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
const GRAPHDB_URL = process.env.GRAPHDB_URL || 'http://192.168.0.105:7200'
const GRAPHDB_REPO = process.env.GRAPHDB_REPOSITORY || 'archigraph-v4'

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

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 ArchiGraph v4 backend running on port ${PORT}`)
  console.log(`📊 GraphDB: ${GRAPHDB_URL}`)
  console.log(`🗄️  Repository: ${GRAPHDB_REPO}`)
  console.log(`✨ Health check: http://localhost:${PORT}/api/health`)
})
