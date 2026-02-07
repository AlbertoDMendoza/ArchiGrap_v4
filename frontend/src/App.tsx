import { useEffect, useState } from 'react'
import { getHealth, type HealthResponse } from './lib/api'
import GraphExplorer from './components/GraphExplorer'
import { EntityManager } from './shacl/EntityManager'
import './App.css'

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function checkHealth() {
      try {
        const data = await getHealth()
        setHealth(data)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to connect')
      } finally {
        setLoading(false)
      }
    }
    
    checkHealth()
  }, [])

  if (loading) {
    return <div className="container">
      <h1>ArchiGraph v4</h1>
      <p>Loading...</p>
    </div>
  }

  if (error) {
    return <div className="container">
      <h1>ArchiGraph v4</h1>
      <div style={{ color: 'red' }}>
        <h2>❌ Connection Error</h2>
        <p>{error}</p>
        <p>Make sure backend is running on port 3002</p>
      </div>
    </div>
  }

  return (
    <div className="container">
      <h1>🚀 ArchiGraph v4</h1>
      <p>Semantic-native enterprise architecture platform</p>
      
      <div className="status-card">
        <h2>✅ System Status</h2>
        <table>
          <tbody>
            <tr>
              <td><strong>Backend Status:</strong></td>
              <td>{health?.status}</td>
            </tr>
            <tr>
              <td><strong>Node Version:</strong></td>
              <td>{health?.backend.nodeVersion}</td>
            </tr>
            <tr>
              <td><strong>GraphDB URL:</strong></td>
              <td>{health?.graphdb.url}</td>
            </tr>
            <tr>
              <td><strong>Repository:</strong></td>
              <td>{health?.graphdb.repository}</td>
            </tr>
            <tr>
              <td><strong>Connected:</strong></td>
              <td>{health?.graphdb.connected ? '✅' : '❌'}</td>
            </tr>
            <tr>
              <td><strong>Triples in DB:</strong></td>
              <td>{health?.graphdb.triples.total} (explicit: {health?.graphdb.triples.explicit}, inferred: {health?.graphdb.triples.inferred})</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="entity-manager-section">
        <h2>📝 Entity Manager</h2>
        <EntityManager />
      </div>

      <div className="graph-explorer">
        <h2>🔍 Graph Explorer</h2>
        <GraphExplorer
          sparqlEndpoint={`${import.meta.env.VITE_API_URL}/api/sparql-proxy`}
        />
      </div>
    </div>
  )
}

export default App
