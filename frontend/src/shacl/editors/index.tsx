import { useState, useEffect } from 'react'
import type { ShapeProperty } from '../../lib/sparql'
import { getInstances } from '../../lib/sparql'

export interface EditorProps {
  property: ShapeProperty
  value: string | string[]
  onChange: (value: string | string[], isUri?: boolean) => void
}

// Helper to coerce value to string for single-value editors
function asString(value: string | string[]): string {
  return Array.isArray(value) ? value[0] || '' : value
}

// Text Field Editor
export function TextFieldEditor({ property, value, onChange }: EditorProps) {
  return (
    <input
      type="text"
      value={asString(value)}
      onChange={e => onChange(e.target.value)}
      placeholder={property.description}
      required={property.minCount !== undefined && property.minCount > 0}
    />
  )
}

// Text Area Editor
export function TextAreaEditor({ property, value, onChange }: EditorProps) {
  return (
    <textarea
      value={asString(value)}
      onChange={e => onChange(e.target.value)}
      placeholder={property.description}
      rows={4}
    />
  )
}

// Enum Select Editor
export function EnumSelectEditor({ property, value, onChange }: EditorProps) {
  return (
    <select
      value={asString(value)}
      onChange={e => onChange(e.target.value)}
      required={property.minCount !== undefined && property.minCount > 0}
    >
      <option value="">-- Select --</option>
      {property.inValues?.map(v => (
        <option key={v} value={v}>{v}</option>
      ))}
    </select>
  )
}

// Boolean Select Editor
export function BooleanSelectEditor({ value, onChange }: EditorProps) {
  return (
    <select
      value={asString(value)}
      onChange={e => onChange(e.target.value)}
    >
      <option value="">-- Select --</option>
      <option value="true">Yes</option>
      <option value="false">No</option>
    </select>
  )
}

// Date Picker Editor
export function DatePickerEditor({ value, onChange }: EditorProps) {
  return (
    <input
      type="date"
      value={asString(value)}
      onChange={e => onChange(e.target.value)}
    />
  )
}

// AutoComplete Editor for object properties
export function AutoCompleteEditor({ property, value, onChange }: EditorProps) {
  const [options, setOptions] = useState<{ uri: string; label: string }[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (property.class) {
      setLoading(true)
      getInstances(property.class)
        .then(setOptions)
        .finally(() => setLoading(false))
    }
  }, [property.class])

  if (loading) {
    return <select disabled><option>Loading...</option></select>
  }

  return (
    <select
      value={asString(value)}
      onChange={e => onChange(e.target.value, true)}
    >
      <option value="">-- Select --</option>
      {options.map(opt => (
        <option key={opt.uri} value={opt.uri}>{opt.label}</option>
      ))}
    </select>
  )
}

// Instances Select Editor for multi-value object properties
export function InstancesSelectEditor({ property, value, onChange }: EditorProps) {
  const [options, setOptions] = useState<{ uri: string; label: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [selectValue, setSelectValue] = useState('')

  const selected = Array.isArray(value) ? value : (value ? [value] : [])

  useEffect(() => {
    if (property.class) {
      setLoading(true)
      getInstances(property.class)
        .then(setOptions)
        .finally(() => setLoading(false))
    }
  }, [property.class])

  const handleAdd = () => {
    if (selectValue && !selected.includes(selectValue)) {
      onChange([...selected, selectValue], true)
    }
    setSelectValue('')
  }

  const handleRemove = (uri: string) => {
    onChange(selected.filter(u => u !== uri), true)
  }

  const labelFor = (uri: string) => options.find(o => o.uri === uri)?.label || uri.split('#').pop() || uri

  if (loading) {
    return <select disabled><option>Loading...</option></select>
  }

  const available = options.filter(o => !selected.includes(o.uri))

  return (
    <div className="instances-select">
      {selected.length > 0 && (
        <ul className="instances-select-list">
          {selected.map(uri => (
            <li key={uri}>
              <span>{labelFor(uri)}</span>
              <button type="button" onClick={() => handleRemove(uri)} title="Remove">&times;</button>
            </li>
          ))}
        </ul>
      )}
      <div className="instances-select-add">
        <select value={selectValue} onChange={e => setSelectValue(e.target.value)}>
          <option value="">-- Add --</option>
          {available.map(opt => (
            <option key={opt.uri} value={opt.uri}>{opt.label}</option>
          ))}
        </select>
        <button type="button" onClick={handleAdd} disabled={!selectValue}>Add</button>
      </div>
    </div>
  )
}

// URI Editor
export function URIEditor({ value, onChange }: EditorProps) {
  const v = Array.isArray(value) ? value[0] || '' : value
  return (
    <input
      type="url"
      value={v}
      onChange={e => onChange(e.target.value, true)}
      placeholder="https://..."
    />
  )
}

// Editor Factory - maps shui:editor URIs to components
const SHUI = 'http://www.w3.org/ns/shacl-ui#'

const EDITOR_MAP: Record<string, React.ComponentType<EditorProps>> = {
  [`${SHUI}TextFieldEditor`]: TextFieldEditor,
  [`${SHUI}TextAreaEditor`]: TextAreaEditor,
  [`${SHUI}EnumSelectEditor`]: EnumSelectEditor,
  [`${SHUI}BooleanSelectEditor`]: BooleanSelectEditor,
  [`${SHUI}DatePickerEditor`]: DatePickerEditor,
  [`${SHUI}AutoCompleteEditor`]: AutoCompleteEditor,
  [`${SHUI}InstancesSelectEditor`]: InstancesSelectEditor,
  [`${SHUI}URIEditor`]: URIEditor,
}

export function getEditor(property: ShapeProperty): React.ComponentType<EditorProps> {
  // Explicit editor specified
  if (property.editor && EDITOR_MAP[property.editor]) {
    return EDITOR_MAP[property.editor]
  }

  // Infer from constraints
  if (property.inValues && property.inValues.length > 0) {
    return EnumSelectEditor
  }

  if (property.class) {
    const isMulti = property.maxCount === undefined || property.maxCount > 1
    return isMulti ? InstancesSelectEditor : AutoCompleteEditor
  }

  if (property.datatype === 'http://www.w3.org/2001/XMLSchema#boolean') {
    return BooleanSelectEditor
  }

  if (property.datatype === 'http://www.w3.org/2001/XMLSchema#date') {
    return DatePickerEditor
  }

  // Default to text field
  return TextFieldEditor
}
