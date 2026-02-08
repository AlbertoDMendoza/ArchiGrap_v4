import type { ShapeProperty } from '../../lib/sparql'

export interface ViewerProps {
  property: ShapeProperty
  value: string
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
