import { useEffect, useState } from 'react'
import { getHealth, getEndpoints, setEndpoint, type HealthResponse, type Endpoint } from './lib/api'
import { EntityManager } from './shacl/EntityManager'
import './App.css'

function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [endpoints, setEndpoints] = useState<Endpoint[]>([])
  const [activeEndpoint, setActiveEndpoint] = useState<string>('')
  const [switching, setSwitching] = useState(false)

  const endpointKey = activeEndpoint

  async function refreshHealth() {
    try {
      const data = await getHealth()
      setHealth(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect')
    }
  }

  useEffect(() => {
    async function init() {
      try {
        const [healthData, endpointsData] = await Promise.all([
          getHealth(),
          getEndpoints()
        ])
        setHealth(healthData)
        setEndpoints(endpointsData.endpoints)
        setActiveEndpoint(`${endpointsData.active.url}|${endpointsData.active.repository}`)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to connect')
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [])

  async function handleEndpointChange(value: string) {
    const [url, repository] = value.split('|')
    setSwitching(true)
    try {
      await setEndpoint(url, repository)
      setActiveEndpoint(value)
      await refreshHealth()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to switch endpoint')
    } finally {
      setSwitching(false)
    }
  }

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
        {endpoints.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <label htmlFor="endpoint-select" style={{ marginRight: '0.5rem' }}>
              <strong>Endpoint:</strong>
            </label>
            <select
              id="endpoint-select"
              value={activeEndpoint}
              onChange={(e) => handleEndpointChange(e.target.value)}
              disabled={switching}
            >
              {endpoints.map((ep) => (
                <option key={`${ep.url}|${ep.repository}`} value={`${ep.url}|${ep.repository}`}>
                  {ep.name}
                </option>
              ))}
            </select>
            {switching && <span style={{ marginLeft: '0.5rem' }}>Switching...</span>}
          </div>
        )}
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
        <EntityManager key={endpointKey} />
      </div>

    </div>
  )
}

export default App
