import { useState, useEffect } from 'react'
import { getEntityTypes, listEntities, deleteEntity } from '../lib/sparql'
import { SHACLForm } from './SHACLForm'
import './EntityManager.css'

interface EntityType {
  uri: string
  label: string
}

interface Entity {
  uri: string
  label: string
}

export function EntityManager() {
  const [entityTypes, setEntityTypes] = useState<EntityType[]>([])
  const [selectedType, setSelectedType] = useState<EntityType | null>(null)
  const [entities, setEntities] = useState<Entity[]>([])
  const [showForm, setShowForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  // Load entity types on mount
  useEffect(() => {
    getEntityTypes()
      .then(setEntityTypes)
      .finally(() => setLoading(false))
  }, [])

  // Load entities when type changes
  useEffect(() => {
    if (selectedType) {
      listEntities(selectedType.uri).then(setEntities)
    } else {
      setEntities([])
    }
  }, [selectedType])

  const handleTypeSelect = (type: EntityType) => {
    setSelectedType(type)
    setShowForm(false)
    setMessage(null)
  }

  const handleCreateSuccess = (entityUri: string) => {
    setShowForm(false)
    setMessage(`Created: ${entityUri.split('#').pop()}`)
    // Refresh entity list
    if (selectedType) {
      listEntities(selectedType.uri).then(setEntities)
    }
  }

  const handleDelete = async (entity: Entity) => {
    if (!confirm(`Delete "${entity.label}"?`)) return

    try {
      await deleteEntity(entity.uri)
      setEntities(prev => prev.filter(e => e.uri !== entity.uri))
      setMessage(`Deleted: ${entity.label}`)
    } catch (err) {
      setMessage(`Error: ${err instanceof Error ? err.message : 'Delete failed'}`)
    }
  }

  if (loading) {
    return <div className="entity-manager">Loading entity types...</div>
  }

  return (
    <div className="entity-manager">
      <div className="entity-types">
        <h3>Entity Types</h3>
        {entityTypes.length === 0 ? (
          <p className="no-types">No SHACL shapes found. Load shapes.ttl into GraphDB.</p>
        ) : (
          <ul>
            {entityTypes.map(type => (
              <li
                key={type.uri}
                className={selectedType?.uri === type.uri ? 'selected' : ''}
                onClick={() => handleTypeSelect(type)}
              >
                {type.label}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="entity-content">
        {!selectedType ? (
          <p className="select-prompt">Select an entity type to view or create instances.</p>
        ) : showForm ? (
          <SHACLForm
            classUri={selectedType.uri}
            classLabel={selectedType.label}
            onSuccess={handleCreateSuccess}
            onCancel={() => setShowForm(false)}
          />
        ) : (
          <>
            <div className="entity-header">
              <h3>{selectedType.label} Instances</h3>
              <button onClick={() => setShowForm(true)}>+ New {selectedType.label}</button>
            </div>

            {message && <div className="message">{message}</div>}

            {entities.length === 0 ? (
              <p className="no-entities">No instances yet. Click the button above to create one.</p>
            ) : (
              <table className="entity-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>URI</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {entities.map(entity => (
                    <tr key={entity.uri}>
                      <td>{entity.label}</td>
                      <td className="uri">{entity.uri.split('#').pop()}</td>
                      <td>
                        <button
                          className="delete-btn"
                          onClick={() => handleDelete(entity)}
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </div>
    </div>
  )
}
