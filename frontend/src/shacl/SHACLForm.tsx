import { useState, useEffect } from 'react'
import { getShapeProperties, createEntity, updateEntity, type ShapeProperty } from '../lib/sparql'
import { getEditor } from './editors'
import './SHACLForm.css'

interface SHACLFormProps {
  classUri: string
  classLabel: string
  entityUri?: string
  initialValues?: FormValues
  onSuccess?: (entityUri: string) => void
  onCancel?: () => void
}

export interface FormValues {
  [path: string]: {
    value: string
    isUri?: boolean
    datatype?: string
  }
}

export function SHACLForm({ classUri, classLabel, entityUri, initialValues, onSuccess, onCancel }: SHACLFormProps) {
  const [properties, setProperties] = useState<ShapeProperty[]>([])
  const [values, setValues] = useState<FormValues>({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEdit = !!entityUri

  useEffect(() => {
    setLoading(true)
    getShapeProperties(classUri)
      .then(props => {
        setProperties(props)
        // Initialize form values from initialValues or empty
        const initial: FormValues = {}
        for (const prop of props) {
          initial[prop.path] = initialValues?.[prop.path] ?? {
            value: '',
            isUri: !!prop.class,
            datatype: prop.datatype
          }
        }
        setValues(initial)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [classUri, initialValues])

  const handleChange = (path: string, value: string, isUri?: boolean) => {
    setValues(prev => ({
      ...prev,
      [path]: {
        ...prev[path],
        value,
        isUri: isUri ?? prev[path]?.isUri
      }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    try {
      if (isEdit) {
        await updateEntity(entityUri, classUri, values)
        onSuccess?.(entityUri)
      } else {
        const newUri = await createEntity(classUri, values)
        onSuccess?.(newUri)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : `Failed to ${isEdit ? 'update' : 'create'} entity`)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return <div className="shacl-form-loading">Loading form...</div>
  }

  if (error) {
    return <div className="shacl-form-error">{error}</div>
  }

  return (
    <form className="shacl-form" onSubmit={handleSubmit}>
      <h3>{isEdit ? 'Edit' : 'Create'} {classLabel}</h3>

      {properties.map(prop => {
        const Editor = getEditor(prop)
        const isRequired = prop.minCount !== undefined && prop.minCount > 0

        return (
          <div key={prop.path} className="shacl-form-field">
            <label>
              {prop.name}
              {isRequired && <span className="required">*</span>}
            </label>
            {prop.description && (
              <small className="field-description">{prop.description}</small>
            )}
            <Editor
              property={prop}
              value={values[prop.path]?.value || ''}
              onChange={(val, isUri) => handleChange(prop.path, val, isUri)}
            />
          </div>
        )
      })}

      <div className="shacl-form-actions">
        <button type="submit" disabled={submitting}>
          {submitting ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update' : 'Create')}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}
