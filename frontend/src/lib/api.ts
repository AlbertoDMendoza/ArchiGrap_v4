import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || ''

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
})

export interface HealthResponse {
  status: string
  graphdb: {
    url: string
    repository: string
    triples: {
      inferred: number
      total: number
      explicit: number
    }
    connected: boolean
  }
  backend: {
    port: number
    nodeVersion: string
  }
}

export async function getHealth(): Promise<HealthResponse> {
  const response = await api.get<HealthResponse>('/api/health')
  return response.data
}

export async function sparqlQuery(query: string) {
  const response = await api.post('/api/sparql', { query })
  return response.data
}

export async function listInstances() {
  const response = await api.get('/api/instances')
  return response.data
}

export default api
