import api from './api'

const PREFIXES = `
PREFIX sh: <http://www.w3.org/ns/shacl#>
PREFIX shui: <http://www.w3.org/ns/shacl-ui#>
PREFIX archimate: <https://purl.org/archimate#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
`

export interface SparqlBinding {
  [key: string]: {
    type: string
    value: string
    datatype?: string
  }
}

export interface SparqlResults {
  results: {
    bindings: SparqlBinding[]
  }
}

export async function sparqlSelect(query: string): Promise<SparqlBinding[]> {
  const response = await api.post<SparqlResults>('/api/sparql', {
    query: PREFIXES + query
  })
  return response.data.results.bindings
}

export async function sparqlUpdate(query: string): Promise<void> {
  await api.post('/api/sparql-update', PREFIXES + query, {
    headers: { 'Content-Type': 'text/plain' }
  })
}

// Get all entity types that have SHACL shapes
export async function getEntityTypes(): Promise<{ uri: string; label: string }[]> {
  const results = await sparqlSelect(`
    SELECT DISTINCT ?class ?label WHERE {
      ?shape a sh:NodeShape ;
             sh:targetClass ?class .
      OPTIONAL { ?class rdfs:label ?label }
    }
    ORDER BY ?label
  `)

  return results.map(r => ({
    uri: r.class.value,
    label: r.label?.value || r.class.value.split('#').pop() || r.class.value
  }))
}

// Get shape properties for a class
export interface ShapeProperty {
  path: string
  name: string
  description?: string
  datatype?: string
  class?: string
  editor?: string
  viewer?: string
  minCount?: number
  maxCount?: number
  order: number
  inValues?: string[]
  propertyRole?: string
}

export async function getShapeProperties(classUri: string): Promise<ShapeProperty[]> {
  const results = await sparqlSelect(`
    SELECT ?path ?name ?description ?datatype ?class ?editor ?viewer ?minCount ?maxCount ?order ?propertyRole
    WHERE {
      ?shape a sh:NodeShape ;
             sh:targetClass <${classUri}> ;
             sh:property ?prop .

      ?prop sh:path ?path .
      OPTIONAL { ?prop sh:name ?name }
      OPTIONAL { ?prop sh:description ?description }
      OPTIONAL { ?prop sh:datatype ?datatype }
      OPTIONAL { ?prop sh:class ?class }
      OPTIONAL { ?prop shui:editor ?editor }
      OPTIONAL { ?prop shui:viewer ?viewer }
      OPTIONAL { ?prop sh:minCount ?minCount }
      OPTIONAL { ?prop sh:maxCount ?maxCount }
      OPTIONAL { ?prop sh:order ?order }
      OPTIONAL { ?prop shui:propertyRole ?propertyRole }
    }
    ORDER BY ?order
  `)

  const properties: ShapeProperty[] = []

  for (const r of results) {
    const prop: ShapeProperty = {
      path: r.path.value,
      name: r.name?.value || r.path.value.split('#').pop() || r.path.value,
      description: r.description?.value,
      datatype: r.datatype?.value,
      class: r.class?.value,
      editor: r.editor?.value,
      viewer: r.viewer?.value,
      minCount: r.minCount ? parseInt(r.minCount.value) : undefined,
      maxCount: r.maxCount ? parseInt(r.maxCount.value) : undefined,
      order: r.order ? parseInt(r.order.value) : 999,
      propertyRole: r.propertyRole?.value
    }

    // Check for sh:in values
    const inValues = await getEnumValues(classUri, r.path.value)
    if (inValues.length > 0) {
      prop.inValues = inValues
    }

    properties.push(prop)
  }

  return properties.sort((a, b) => a.order - b.order)
}

// Get enum values for a property with sh:in
async function getEnumValues(classUri: string, pathUri: string): Promise<string[]> {
  const results = await sparqlSelect(`
    SELECT ?val WHERE {
      ?shape a sh:NodeShape ;
             sh:targetClass <${classUri}> ;
             sh:property ?prop .
      ?prop sh:path <${pathUri}> ;
            sh:in ?list .
      ?list rdf:rest*/rdf:first ?val .
    }
  `)
  return results.map(r => r.val.value)
}

// Get instances for autocomplete
export async function getInstances(classUri: string): Promise<{ uri: string; label: string }[]> {
  const results = await sparqlSelect(`
    SELECT ?uri ?label WHERE {
      ?uri a <${classUri}> .
      OPTIONAL { ?uri archimate:Name ?archName }
      OPTIONAL { ?uri rdfs:label ?lbl }
      BIND(COALESCE(?archName, ?lbl, STR(?uri)) AS ?displayLabel)
    }
    ORDER BY ?displayLabel
    LIMIT 100
  `)

  return results.map(r => ({
    uri: r.uri.value,
    label: r.archName?.value || r.lbl?.value || r.uri.value.split('#').pop() || r.uri.value
  }))
}

// Create a new entity
export async function createEntity(
  classUri: string,
  properties: Record<string, { value: string; isUri?: boolean; datatype?: string }>
): Promise<string> {
  const id = `inst-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  const entityUri = `http://archigraph.org/data#${id}`

  let triples = `<${entityUri}> a <${classUri}> .`

  for (const [path, prop] of Object.entries(properties)) {
    if (!prop.value) continue

    if (prop.isUri) {
      triples += `\n<${entityUri}> <${path}> <${prop.value}> .`
    } else if (prop.datatype) {
      triples += `\n<${entityUri}> <${path}> "${prop.value}"^^<${prop.datatype}> .`
    } else {
      triples += `\n<${entityUri}> <${path}> "${prop.value}" .`
    }
  }

  await sparqlUpdate(`INSERT DATA { ${triples} }`)
  return entityUri
}

// Get all instances of a class
export async function listEntities(classUri: string): Promise<{ uri: string; label: string }[]> {
  const results = await sparqlSelect(`
    SELECT ?uri ?label WHERE {
      ?uri a <${classUri}> .
      OPTIONAL { ?uri archimate:Name ?archName }
      OPTIONAL { ?uri rdfs:label ?lbl }
      BIND(COALESCE(?archName, ?lbl, STR(?uri)) AS ?label)
    }
    ORDER BY ?label
  `)

  return results.map(r => ({
    uri: r.uri.value,
    label: r.label?.value || r.uri.value
  }))
}

// Delete an entity
export async function deleteEntity(entityUri: string): Promise<void> {
  await sparqlUpdate(`DELETE WHERE { <${entityUri}> ?p ?o }`)
}
