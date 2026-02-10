import { useState, useEffect } from 'react'
import { getShapeProperties, getEntityValues, getPropertyValues, type ShapeProperty } from '../../lib/sparql'

export interface ViewerProps {
  property: ShapeProperty
  value: string
  entityUri?: string
  depth?: number
}

// Literal Viewer - plain text fallback
export function LiteralViewer({ value }: ViewerProps) {
  return <span className="viewer-literal">{value}</span>
}

// Label Viewer - display label as text (for IRIs)
export function LabelViewer({ value }: ViewerProps) {
  const label = value.includes('#') ? value.split('#').pop() : value.split('/').pop()
  return <span className="viewer-label">{label || value}</span>
}

// URI Viewer - clickable hyperlink showing the URI
export function URIViewer({ value }: ViewerProps) {
  if (!value) return <span className="viewer-literal" />
  return (
    <a className="viewer-uri" href={value} target="_blank" rel="noopener noreferrer">
      {value}
    </a>
  )
}

// LangString Viewer - text with language badge
export function LangStringViewer({ value }: ViewerProps) {
  // Value may contain language tag like "text@en"
  const match = value.match(/^(.+)@([a-zA-Z-]+)$/)
  if (match) {
    return (
      <span className="viewer-langstring">
        {match[1]}
        <span className="lang-badge">{match[2]}</span>
      </span>
    )
  }
  return <span className="viewer-literal">{value}</span>
}

// HTML Viewer - rendered HTML
export function HTMLViewer({ value }: ViewerProps) {
  return <div className="viewer-html" dangerouslySetInnerHTML={{ __html: value }} />
}

// Image Viewer - displays image
export function ImageViewer({ value }: ViewerProps) {
  if (!value) return <span className="viewer-literal" />
  return <img className="viewer-image" src={value} alt="" loading="lazy" />
}

// Hyperlink Viewer - clickable link for xsd:anyURI
export function HyperlinkViewer({ value }: ViewerProps) {
  if (!value) return <span className="viewer-literal" />
  const label = value.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')
  return (
    <a className="viewer-hyperlink" href={value} target="_blank" rel="noopener noreferrer">
      {label}
    </a>
  )
}

// Blank Node Viewer - human-readable label for blank nodes
export function BlankNodeViewer({ value }: ViewerProps) {
  // Strip internal blank node prefixes to show a readable identifier
  const label = value.replace(/^_:/, '').replace(/^genid-/, '').replace(/^node/, '')
  return <span className="viewer-blanknode">{label || value}</span>
}

// Details Viewer - nested entity display for sh:class properties
const MAX_DETAILS_DEPTH = 3

export function DetailsViewer({ property, value, depth = 0 }: ViewerProps) {
  const [properties, setProperties] = useState<ShapeProperty[]>([])
  const [values, setValues] = useState<Record<string, { value: string | string[]; isUri: boolean; datatype?: string }>>({})
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!property.class || depth >= MAX_DETAILS_DEPTH) {
      setFailed(true)
      setLoading(false)
      return
    }

    Promise.all([
      getShapeProperties(property.class),
      getEntityValues(value, property.class)
    ])
      .then(([props, vals]) => {
        if (props.length === 0 || Object.keys(vals).length === 0) {
          setFailed(true)
        } else {
          setProperties(props)
          setValues(vals)
        }
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
  }, [value, property.class, depth])

  // Fallback to label display
  if (failed || depth >= MAX_DETAILS_DEPTH) {
    return <LabelViewer property={property} value={value} />
  }

  if (loading) {
    return <span className="viewer-details-loading">Loading...</span>
  }

  return (
    <div className="viewer-details">
      {properties.map(prop => {
        const raw = values[prop.path]?.value
        if (!raw || (Array.isArray(raw) && raw.length === 0)) return null

        const Viewer = getViewer(prop)
        const vals = Array.isArray(raw) ? raw : [raw]

        return (
          <div key={prop.path} className="shacl-view-field">
            <dt>{prop.name}</dt>
            <dd>
              {vals.map((v, i) => (
                <Viewer key={i} property={prop} value={v} entityUri={value} depth={depth + 1} />
              ))}
            </dd>
          </div>
        )
      })}
    </div>
  )
}

// ValueTable Viewer - multi-value table for sh:class/sh:node properties
export function ValueTableViewer({ property, value, entityUri, depth = 0 }: ViewerProps) {
  const [columns, setColumns] = useState<ShapeProperty[]>([])
  const [rows, setRows] = useState<{ uri: string; values: Record<string, { value: string | string[]; isUri: boolean; datatype?: string }> }[]>([])
  const [loading, setLoading] = useState(true)
  const [failed, setFailed] = useState(false)

  const shapeUri = property.node || property.class

  useEffect(() => {
    if (!entityUri || !shapeUri) {
      setFailed(true)
      setLoading(false)
      return
    }

    getPropertyValues(entityUri, property.path)
      .then(valueUris => {
        if (valueUris.length === 0) {
          setFailed(true)
          setLoading(false)
          return
        }

        return getShapeProperties(shapeUri).then(props => {
          if (props.length === 0) {
            setFailed(true)
            setLoading(false)
            return
          }

          setColumns(props)

          return Promise.all(
            valueUris.map(uri =>
              getEntityValues(uri, shapeUri).then(vals => ({ uri, values: vals }))
            )
          ).then(setRows)
        })
      })
      .catch(() => setFailed(true))
      .finally(() => setLoading(false))
  }, [entityUri, shapeUri, property.path])

  if (failed || !entityUri || !shapeUri) {
    return <LabelViewer property={property} value={value} />
  }

  if (loading) {
    return <span className="viewer-details-loading">Loading...</span>
  }

  if (rows.length === 0) {
    return <LabelViewer property={property} value={value} />
  }

  return (
    <table className="viewer-table">
      <thead>
        <tr>
          {columns.map(col => (
            <th key={col.path}>{col.name}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(row => (
          <tr key={row.uri}>
            {columns.map(col => {
              const raw = row.values[col.path]?.value
              if (!raw || (Array.isArray(raw) && raw.length === 0)) return <td key={col.path} />
              const cellVal = Array.isArray(raw) ? raw[0] : raw
              const CellViewer = getViewer(col)
              return (
                <td key={col.path}>
                  <CellViewer property={col} value={cellVal} entityUri={row.uri} depth={depth + 1} />
                </td>
              )
            })}
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// Viewer Factory
const SHUI = 'http://www.w3.org/ns/shacl-ui#'

const VIEWER_MAP: Record<string, React.ComponentType<ViewerProps>> = {
  [`${SHUI}LiteralViewer`]: LiteralViewer,
  [`${SHUI}LabelViewer`]: LabelViewer,
  [`${SHUI}URIViewer`]: URIViewer,
  [`${SHUI}LangStringViewer`]: LangStringViewer,
  [`${SHUI}HTMLViewer`]: HTMLViewer,
  [`${SHUI}ImageViewer`]: ImageViewer,
  [`${SHUI}HyperlinkViewer`]: HyperlinkViewer,
  [`${SHUI}DetailsViewer`]: DetailsViewer,
  [`${SHUI}BlankNodeViewer`]: BlankNodeViewer,
  [`${SHUI}ValueTableViewer`]: ValueTableViewer,
}

export function getViewer(property: ShapeProperty): React.ComponentType<ViewerProps> {
  // Explicit viewer specified
  if (property.viewer && VIEWER_MAP[property.viewer]) {
    return VIEWER_MAP[property.viewer]
  }

  // Infer from constraints
  if (property.datatype === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#HTML') {
    return HTMLViewer
  }

  if (property.datatype === 'http://www.w3.org/1999/02/22-rdf-syntax-ns#langString') {
    return LangStringViewer
  }

  if (property.datatype === 'http://www.w3.org/2001/XMLSchema#anyURI') {
    return HyperlinkViewer
  }

  // IRI-valued properties (class or nodeKind)
  if (property.class) {
    return LabelViewer
  }

  // Default to literal
  return LiteralViewer
}
