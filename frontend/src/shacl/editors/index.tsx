import { useState, useEffect } from 'react'
import type { ShapeProperty } from '../../lib/sparql'
import { getInstances } from '../../lib/sparql'

export interface EditorProps {
  property: ShapeProperty
  value: string
  onChange: (value: string, isUri?: boolean) => void
}

// Text Field Editor
export function TextFieldEditor({ property, value, onChange }: EditorProps) {
  return (
    <input
      type="text"
      value={value}
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
      value={value}
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
      value={value}
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
      value={value}
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
      value={value}
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
      value={value}
      onChange={e => onChange(e.target.value, true)}
    >
      <option value="">-- Select --</option>
      {options.map(opt => (
        <option key={opt.uri} value={opt.uri}>{opt.label}</option>
      ))}
    </select>
  )
}

// URI Editor
export function URIEditor({ value, onChange }: EditorProps) {
  return (
    <input
      type="url"
      value={value}
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
  [`${SHUI}InstancesSelectEditor`]: AutoCompleteEditor,
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
    return AutoCompleteEditor
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
