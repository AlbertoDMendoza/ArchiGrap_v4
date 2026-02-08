import { useState, useEffect } from 'react'
import { getShapeProperties, type ShapeProperty } from '../lib/sparql'
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    getShapeProperties(classUri)
      .then(setProperties)
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
      <h3>{entityLabel}</h3>
      <span className="shacl-view-type">{classLabel}</span>

      <div className="shacl-view-fields">
        {properties.map(prop => {
          const val = values[prop.path]?.value || ''
          if (!val) return null

          const Viewer = getViewer(prop)

          return (
            <div key={prop.path} className="shacl-view-field">
              <dt>{prop.name}</dt>
              <dd>
                <Viewer property={prop} value={val} />
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
