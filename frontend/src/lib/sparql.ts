import api from './api'

const PREFIXES = `
PREFIX sh: <http://www.w3.org/ns/shacl#>
PREFIX shui: <http://www.w3.org/ns/shacl-ui#>
PREFIX archimate: <https://purl.org/archimate#>
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX owl: <http://www.w3.org/2002/07/owl#>
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
// Supports both explicit (sh:targetClass) and implicit (shape URI = class URI) target patterns
export async function getEntityTypes(): Promise<{ uri: string; label: string }[]> {
  const results = await sparqlSelect(`
    SELECT DISTINCT ?class ?label WHERE {
      {
        ?shape a sh:NodeShape ;
               sh:targetClass ?class .
      } UNION {
        ?class a sh:NodeShape .
        ?class sh:property ?_p .
        FILTER NOT EXISTS { ?class sh:targetClass ?_any }
      }
      OPTIONAL { ?class rdfs:label ?label }
    }
    ORDER BY ?label
  `)

  return results.map(r => ({
    uri: r.class.value,
    label: r.label?.value || r.class.value.split('#').pop() || r.class.value
  }))
}

// Tree node for hierarchical entity type display
export interface EntityTypeNode {
  uri: string
  label: string
  isShape: boolean  // false = grouping-only node, not selectable
  children: EntityTypeNode[]
}

// Get entity types organized as a tree based on rdfs:subClassOf
export async function getEntityTypeTree(): Promise<EntityTypeNode[]> {
  const results = await sparqlSelect(`
    SELECT DISTINCT ?class ?label ?parent ?parentLabel WHERE {
      {
        ?shape a sh:NodeShape ; sh:targetClass ?class .
      } UNION {
        ?class a sh:NodeShape ; sh:property ?_p .
        FILTER NOT EXISTS { ?class sh:targetClass ?_any }
      }
      OPTIONAL { ?class rdfs:label ?label }
      OPTIONAL {
        ?class rdfs:subClassOf ?parent .
        FILTER(?parent != ?class)
        FILTER(?parent != owl:Thing)
        FILTER(?parent != <http://www.w3.org/2002/07/owl#Thing>)
        FILTER(!isBlank(?parent))
        FILTER NOT EXISTS {
          ?class rdfs:subClassOf ?mid .
          ?mid rdfs:subClassOf ?parent .
          FILTER(?mid != ?class)
          FILTER(?mid != ?parent)
        }
        OPTIONAL { ?parent rdfs:label ?parentLabel }
      }
    }
  `)

  // Collect all shape classes and their parent relationships
  const shapeUris = new Set<string>()
  const classLabels = new Map<string, string>()
  const childToParents = new Map<string, Set<string>>()

  for (const r of results) {
    const classUri = r.class.value
    shapeUris.add(classUri)
    classLabels.set(classUri, r.label?.value || classUri.split('#').pop() || classUri.split('/').pop() || classUri)

    if (r.parent) {
      const parentUri = r.parent.value
      if (!childToParents.has(classUri)) childToParents.set(classUri, new Set())
      childToParents.get(classUri)!.add(parentUri)
      // Store parent label too (it may be a grouping node)
      if (r.parentLabel && !classLabels.has(parentUri)) {
        classLabels.set(parentUri, r.parentLabel.value)
      } else if (!classLabels.has(parentUri)) {
        classLabels.set(parentUri, parentUri.split('#').pop() || parentUri.split('/').pop() || parentUri)
      }
    }
  }

  // Build parent-to-children map
  const parentToChildren = new Map<string, Set<string>>()
  for (const [child, parents] of childToParents) {
    for (const parent of parents) {
      if (!parentToChildren.has(parent)) parentToChildren.set(parent, new Set())
      parentToChildren.get(parent)!.add(child)
    }
  }

  // Find all ancestor URIs that are used as parents but aren't shapes themselves
  const groupOnlyUris = new Set<string>()
  for (const [, parents] of childToParents) {
    for (const p of parents) {
      if (!shapeUris.has(p)) groupOnlyUris.add(p)
    }
  }

  // All relevant URIs (shapes + grouping nodes)
  const allUris = new Set([...shapeUris, ...groupOnlyUris])

  // Build tree recursively, allowing duplicates for multiple inheritance
  // but preventing cycles by tracking ancestors on the current path
  function buildNode(uri: string, pathAncestors: Set<string>): EntityTypeNode {
    const childUris = parentToChildren.get(uri) || new Set()
    const children: EntityTypeNode[] = []
    const nextAncestors = new Set(pathAncestors)
    nextAncestors.add(uri)
    for (const childUri of childUris) {
      if (allUris.has(childUri) && !nextAncestors.has(childUri)) {
        children.push(buildNode(childUri, nextAncestors))
      }
    }
    children.sort((a, b) => a.label.localeCompare(b.label))
    return {
      uri,
      label: classLabels.get(uri) || uri,
      isShape: shapeUris.has(uri),
      children
    }
  }

  // Root nodes: classes/groups that have no qualifying parent in our set
  const roots: EntityTypeNode[] = []
  for (const uri of allUris) {
    const parents = childToParents.get(uri)
    const hasQualifyingParent = parents && [...parents].some(p => allUris.has(p))
    if (!hasQualifyingParent) {
      roots.push(buildNode(uri, new Set()))
    }
  }
  roots.sort((a, b) => a.label.localeCompare(b.label))

  return roots
}

// Get ancestor classes for breadcrumb display
// Fetches direct-parent pairs and walks the chain client-side
// to avoid issues with RDFS transitive closure inference
export async function getClassAncestors(classUri: string): Promise<{ uri: string; label: string }[]> {
  const results = await sparqlSelect(`
    SELECT DISTINCT ?child ?parent ?parentLabel WHERE {
      ?child rdfs:subClassOf ?parent .
      FILTER(?parent != ?child)
      FILTER(?parent != owl:Thing)
      FILTER(?parent != <http://www.w3.org/2002/07/owl#Thing>)
      FILTER(!isBlank(?parent))
      FILTER NOT EXISTS {
        ?child rdfs:subClassOf ?mid .
        ?mid rdfs:subClassOf ?parent .
        FILTER(?mid != ?child)
        FILTER(?mid != ?parent)
      }
      OPTIONAL { ?parent rdfs:label ?parentLabel }
    }
  `)

  // Build child->direct parent map
  const directParent = new Map<string, { uri: string; label: string }>()
  for (const r of results) {
    const childUri = r.child.value
    const parentUri = r.parent.value
    const parentLabel = r.parentLabel?.value || parentUri.split('#').pop() || parentUri.split('/').pop() || parentUri
    // For multiple parents, just pick the first one for breadcrumb
    if (!directParent.has(childUri)) {
      directParent.set(childUri, { uri: parentUri, label: parentLabel })
    }
  }

  // Walk up from classUri
  const ancestors: { uri: string; label: string }[] = []
  const visited = new Set<string>()
  let current = classUri
  while (directParent.has(current) && !visited.has(current)) {
    visited.add(current)
    const parent = directParent.get(current)!
    ancestors.unshift(parent) // prepend so root is first
    current = parent.uri
  }

  return ancestors
}

// Get shape properties for a class
export interface ShapeProperty {
  path: string
  name: string
  description?: string
  datatype?: string
  class?: string
  node?: string
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
    SELECT ?path ?name ?description ?datatype ?class ?node ?editor ?viewer ?minCount ?maxCount ?order ?propertyRole
    WHERE {
      {
        ?shape a sh:NodeShape ;
               sh:targetClass <${classUri}> .
      } UNION {
        BIND(<${classUri}> AS ?shape)
        ?shape a sh:NodeShape .
        FILTER NOT EXISTS { ?shape sh:targetClass ?_any }
      }
      ?shape sh:property ?prop .

      ?prop sh:path ?path .
      OPTIONAL { ?prop sh:name ?name }
      OPTIONAL { ?prop sh:description ?description }
      OPTIONAL { ?prop sh:datatype ?datatype }
      OPTIONAL { ?prop sh:class ?class }
      OPTIONAL { ?prop sh:node ?node }
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
      node: r.node?.value,
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
      {
        ?shape a sh:NodeShape ;
               sh:targetClass <${classUri}> .
      } UNION {
        BIND(<${classUri}> AS ?shape)
        ?shape a sh:NodeShape .
        FILTER NOT EXISTS { ?shape sh:targetClass ?_any }
      }
      ?shape sh:property ?prop .
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

// Get current property values for an entity based on its shape
export async function getEntityValues(
  entityUri: string,
  classUri: string
): Promise<Record<string, { value: string; isUri: boolean; datatype?: string }>> {
  const results = await sparqlSelect(`
    SELECT ?path ?value ?isUri ?datatype WHERE {
      {
        ?shape a sh:NodeShape ;
               sh:targetClass <${classUri}> .
      } UNION {
        BIND(<${classUri}> AS ?shape)
        ?shape a sh:NodeShape .
        FILTER NOT EXISTS { ?shape sh:targetClass ?_any }
      }
      ?shape sh:property ?prop .
      ?prop sh:path ?path .
      <${entityUri}> ?path ?value .
      BIND(isIRI(?value) AS ?isUri)
      BIND(DATATYPE(?value) AS ?datatype)
    }
  `)

  const values: Record<string, { value: string; isUri: boolean; datatype?: string }> = {}
  for (const r of results) {
    values[r.path.value] = {
      value: r.value.value,
      isUri: r.isUri.value === 'true',
      datatype: r.datatype?.value
    }
  }
  return values
}

// Update an entity by deleting old shape-managed triples and inserting new ones
export async function updateEntity(
  entityUri: string,
  classUri: string,
  properties: Record<string, { value: string; isUri?: boolean; datatype?: string }>
): Promise<void> {
  // Get all paths from the shape to know what to delete
  const shapeResults = await sparqlSelect(`
    SELECT ?path WHERE {
      {
        ?shape a sh:NodeShape ;
               sh:targetClass <${classUri}> .
      } UNION {
        BIND(<${classUri}> AS ?shape)
        ?shape a sh:NodeShape .
        FILTER NOT EXISTS { ?shape sh:targetClass ?_any }
      }
      ?shape sh:property ?prop .
      ?prop sh:path ?path .
    }
  `)
  const paths = shapeResults.map(r => r.path.value)

  // Build DELETE query for all shape-managed paths
  const deleteTriples = paths.map((p, i) => `<${entityUri}> <${p}> ?old${i} .`).join('\n  ')
  const optionals = paths.map((p, i) => `OPTIONAL { <${entityUri}> <${p}> ?old${i} }`).join('\n  ')

  await sparqlUpdate(`
    DELETE { ${deleteTriples} }
    WHERE { ${optionals} }
  `)

  // Build INSERT for new values
  let insertTriples = ''
  for (const [path, prop] of Object.entries(properties)) {
    if (!prop.value) continue
    if (prop.isUri) {
      insertTriples += `<${entityUri}> <${path}> <${prop.value}> .\n`
    } else if (prop.datatype) {
      insertTriples += `<${entityUri}> <${path}> "${prop.value}"^^<${prop.datatype}> .\n`
    } else {
      insertTriples += `<${entityUri}> <${path}> "${prop.value}" .\n`
    }
  }

  if (insertTriples) {
    await sparqlUpdate(`INSERT DATA { ${insertTriples} }`)
  }
}

// Get all values of a property for an entity
export async function getPropertyValues(
  entityUri: string,
  propertyPath: string
): Promise<string[]> {
  const results = await sparqlSelect(`
    SELECT ?value WHERE {
      <${entityUri}> <${propertyPath}> ?value .
    }
  `)
  return results.map(r => r.value.value)
}

// Delete an entity
export async function deleteEntity(entityUri: string): Promise<void> {
  await sparqlUpdate(`DELETE WHERE { <${entityUri}> ?p ?o }`)
}
