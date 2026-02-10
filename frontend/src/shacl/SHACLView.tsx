import { useState, useEffect } from 'react'
import { getShapeProperties, getClassAncestors, type ShapeProperty } from '../lib/sparql'
import { getViewer } from './viewers'
import type { FormValues } from './SHACLForm'
import './SHACLView.css'

interface SHACLViewProps {
  classUri: string
  classLabel: string
  entityUri: string
  values: FormValues
  onEdit?: () => void
  onBack?: () => void
}

export function SHACLView({ classUri, classLabel, entityUri, values, onEdit, onBack }: SHACLViewProps) {
  const [properties, setProperties] = useState<ShapeProperty[]>([])
  const [ancestors, setAncestors] = useState<{ uri: string; label: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    Promise.all([
      getShapeProperties(classUri),
      getClassAncestors(classUri)
    ])
      .then(([props, anc]) => {
        setProperties(props)
        setAncestors(anc)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [classUri])

  if (loading) {
    return <div className="shacl-view-loading">Loading...</div>
  }

  if (error) {
    return <div className="shacl-view-error">{error}</div>
  }

  const entityLabel = entityUri.includes('#') ? entityUri.split('#').pop() : entityUri.split('/').pop()

  return (
    <div className="shacl-view">
      {ancestors.length > 0 && (
        <div className="hierarchy-breadcrumb">
          {ancestors.map((a, i) => (
            <span key={a.uri}>
              {i > 0 && <span className="breadcrumb-sep"> &gt; </span>}
              {a.label}
            </span>
          ))}
          <span className="breadcrumb-sep"> &gt; </span>
          {classLabel}
        </div>
      )}
      <h3>{entityLabel}</h3>
      <span className="shacl-view-type">{classLabel}</span>

      <div className="shacl-view-fields">
        {properties.map(prop => {
          const raw = values[prop.path]?.value
          if (!raw || (Array.isArray(raw) && raw.length === 0)) return null

          const Viewer = getViewer(prop)
          const vals = Array.isArray(raw) ? raw : [raw]
          if (vals.length === 0 || (vals.length === 1 && !vals[0])) return null

          return (
            <div key={prop.path} className="shacl-view-field">
              <dt>{prop.name}</dt>
              <dd>
                {vals.map((v, i) => (
                  <Viewer key={i} property={prop} value={v} entityUri={entityUri} />
                ))}
              </dd>
            </div>
          )
        })}
      </div>

      <div className="shacl-view-actions">
        {onEdit && <button onClick={onEdit}>Edit</button>}
        {onBack && <button className="back-btn" onClick={onBack}>Back</button>}
      </div>
    </div>
  )
}
