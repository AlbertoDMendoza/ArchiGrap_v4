# ArchiGraph v4

Enterprise Architecture modeling tool with SHACL 1.2-driven generative UI.

## Architecture

ArchiGraph uses a three-layer semantic architecture where UI forms are generated directly from SHACL shapes - no custom form code required.

```
┌─────────────────────────────────────────────────────────────────┐
│  Layer 3: SHACL UI Shapes (shapes.ttl)                          │
│  ─────────────────────────────────────────────────────────────  │
│  Defines how forms render using shui: namespace                 │
│  • shui:editor → which widget to use                            │
│  • shui:viewer → read-only display                              │
│  • shui:propertyRole → label fields, key info                   │
├─────────────────────────────────────────────────────────────────┤
│  Layer 2: Data Ontology (core.ttl, archimate.ttl)               │
│  ─────────────────────────────────────────────────────────────  │
│  OWL classes and properties defining the domain model           │
│  • Classes: System, Capability, Actor, Process, Location        │
│  • Properties: supports, uses, performs, dependsOn              │
├─────────────────────────────────────────────────────────────────┤
│  Layer 1: Instance Data                                         │
│  ─────────────────────────────────────────────────────────────  │
│  Actual EA data created via forms, stored as RDF triples        │
│  • ex:CRM a ag:System ; ag:hasName "CRM System" .               │
└─────────────────────────────────────────────────────────────────┘
```

**Key principle**: Add a property to `shapes.ttl` → form field appears. No React code changes.

## SHACL 1.2 UI Specification

Based on the W3C SHACL 1.2 UI spec: https://w3c.github.io/data-shapes/shacl12-ui/

### Namespace

```turtle
@prefix shui: <http://www.w3.org/ns/shacl-ui#> .
```

### Built-in Editors

| Editor | Use Case |
|--------|----------|
| `shui:TextFieldEditor` | Single-line text input |
| `shui:TextAreaEditor` | Multi-line text |
| `shui:EnumSelectEditor` | Dropdown from `sh:in` values |
| `shui:AutoCompleteEditor` | Type-ahead search for instances |
| `shui:InstancesSelectEditor` | Multi-select instances |
| `shui:BooleanSelectEditor` | Yes/No dropdown |
| `shui:DatePickerEditor` | Calendar widget |
| `shui:DateTimePickerEditor` | Date + time picker |
| `shui:URIEditor` | URI input |
| `shui:DetailsEditor` | Nested sub-forms |
| `shui:RichTextEditor` | HTML editor |

### Built-in Viewers

| Viewer | Use Case |
|--------|----------|
| `shui:LabelViewer` | Display with hyperlink |
| `shui:LiteralViewer` | Plain text |
| `shui:HTMLViewer` | Render HTML |
| `shui:ImageViewer` | Display image from URL |
| `shui:ValueTableViewer` | Multi-value table |

### Property Roles

```turtle
# Mark a property as the display label
shui:propertyRole shui:LabelRole
```

### Example Shape

```turtle
shapes:SystemShape a sh:NodeShape ;
    sh:targetClass ag:System ;

    sh:property [
        sh:path ag:hasName ;
        sh:name "Name" ;
        sh:datatype xsd:string ;
        sh:minCount 1 ;
        sh:order 1 ;
        shui:editor shui:TextFieldEditor ;
        shui:propertyRole shui:LabelRole
    ] ;

    sh:property [
        sh:path ag:hasStatus ;
        sh:name "Status" ;
        sh:in ("Active" "Deprecated" "Planned" "Retired") ;
        sh:minCount 1 ;
        sh:order 2 ;
        shui:editor shui:EnumSelectEditor
    ] ;

    sh:property [
        sh:path ag:hasOwner ;
        sh:name "Owner" ;
        sh:class ag:Actor ;
        sh:order 3 ;
        shui:editor shui:AutoCompleteEditor
    ] .
```

## Data Flow

All operations use SPARQL directly against GraphDB - no custom REST APIs for CRUD.

```
┌──────────────┐     SPARQL      ┌──────────────┐
│    React     │ ──────────────► │   GraphDB    │
│   Frontend   │ ◄────────────── │   (SPARQL)   │
└──────────────┘                 └──────────────┘
        │                               │
        │ 1. SELECT shape               │
        │ 2. Render form                │
        │ 3. INSERT DATA                │
        │ 4. SELECT instances           │
        └───────────────────────────────┘
```

### SPARQL Operations

| Operation | Query |
|-----------|-------|
| List entity types | `SELECT ?class WHERE { ?shape sh:targetClass ?class }` |
| Get shape for form | `SELECT ?prop ?editor ... WHERE { ?shape sh:targetClass <Class> ; sh:property ?p }` |
| Get enum values | `SELECT ?val WHERE { ?prop sh:in/rdf:rest*/rdf:first ?val }` |
| Autocomplete | `SELECT ?uri ?label WHERE { ?uri a <Class> ; ag:hasName ?label }` |
| Create entity | `INSERT DATA { <uri> a <Class> ; ag:hasName "..." }` |
| Update entity | `DELETE { <uri> ?p ?old } INSERT { <uri> ?p ?new } WHERE {...}` |
| Delete entity | `DELETE WHERE { <uri> ?p ?o }` |

## Project Structure

```
archigraph-v4/
├── backend/
│   └── server.js              # Express server with SPARQL proxy
├── frontend/
│   └── src/
│       ├── App.tsx
│       ├── components/
│       └── lib/
│           └── api.ts         # SPARQL query helpers
├── ontology/
│   ├── core.ttl               # 5-concept data ontology (OWL)
│   ├── shapes.ttl             # SHACL UI shapes (shui:)
│   ├── sample-data.ttl        # Example instances
│   └── archimate_ontology/    # Git submodule
│       ├── ontology/
│       │   └── archimate.ttl  # Full ArchiMate ontology
│       └── validation/
│           ├── archimate_core_validation.ttl
│           └── archimate_derivation.ttl
└── start.sh / stop.sh
```

## Ontology Files

| File | Purpose |
|------|---------|
| `core.ttl` | Simplified 5-concept OWL ontology (System, Capability, Actor, Process, Location) |
| `shapes.ttl` | SHACL 1.2 UI shapes defining form structure with `shui:editor` annotations |
| `archimate.ttl` | Full ArchiMate 3.2 ontology with RDF-Star support (optional, for interop) |
| `archimate_core_validation.ttl` | SHACL validation rules for ArchiMate metamodel |
| `archimate_derivation.ttl` | Derivation rules DR1-DR8, PDR1-PDR12 for relationship inference |

## Tech Stack

- **Storage**: GraphDB 10.6 with OWL 2 RL reasoning
- **Backend**: Node.js + Express (SPARQL proxy only)
- **Frontend**: React 19 + TypeScript + Vite
- **Standards**: OWL 2, SHACL 1.2, SPARQL 1.1

## Development

```bash
# Backend
cd backend && npm run dev

# Frontend
cd frontend && npm run dev
```

## Status

### Done
- [x] GraphDB repository with OWL 2 RL reasoning
- [x] Core ontology (core.ttl) - 5 concepts
- [x] SHACL UI shapes (shapes.ttl) - form definitions
- [x] ArchiMate ontology loaded (via submodule)
- [x] Validation rules loaded
- [x] Derivation rules loaded
- [x] Backend SPARQL proxy

### Next
- [ ] SHACLForm React component
- [ ] Editor components (TextField, EnumSelect, AutoComplete, etc.)
- [ ] Entity list view
- [ ] Create/Edit/Delete operations
- [ ] Graph visualization

## References

- [SHACL 1.2 UI Spec](https://w3c.github.io/data-shapes/shacl12-ui/)
- [SHACL 1.2 Core](https://www.w3.org/TR/shacl12-core/)
- [Creating Forms with SHACL 1.2](https://ontologist.substack.com/p/creating-forms-and-views-with-shacl)
