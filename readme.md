# ArchiGraph v4

Generic SHACL 1.2 form renderer. Zero domain knowledge — all ontology, shapes, and data live in GraphDB. The app queries shapes via SPARQL, renders forms, and writes data back.

**"The behavior of the app is presented in the data."**

## Architecture

The app is a pure SHACL renderer. It discovers what to show by querying `sh:NodeShape` / `sh:targetClass` from GraphDB, reads `shui:editor` annotations to pick widgets, and writes instance data back via SPARQL INSERT.

```
┌──────────────────────────────────────────────────────────────────┐
│  GraphDB                                                         │
│  ────────────────────────────────────────────────────────────── │
│  Layer 3: SHACL UI Shapes                                        │
│    sh:NodeShape + shui:editor annotations → drive form layout    │
│                                                                  │
│  Layer 2: Domain Ontology (e.g. ArchiMate)                       │
│    OWL classes and properties loaded once                         │
│                                                                  │
│  Layer 1: Instance Data                                          │
│    Created via forms, stored as RDF triples                      │
└──────────────────────────────────────────────────────────────────┘
        ▲                           │
        │  SPARQL SELECT / INSERT   │
        │                           ▼
┌──────────────────────────────────────────────────────────────────┐
│  React Frontend                                                   │
│  ────────────────────────────────────────────────────────────── │
│  Generic SHACL form renderer — no domain-specific code           │
└──────────────────────────────────────────────────────────────────┘
```

**Key principle**: Add a shape to GraphDB → form appears. No React code changes.

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

### Example Shape (loaded into GraphDB)

```turtle
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix shui: <http://www.w3.org/ns/shacl-ui#> .
@prefix archimate: <https://purl.org/archimate#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

<urn:shapes:BusinessActorShape> a sh:NodeShape ;
    sh:targetClass archimate:BusinessActor ;

    sh:property [
        sh:path archimate:Name ;
        sh:name "Name" ;
        sh:datatype xsd:string ;
        sh:minCount 1 ;
        sh:order 1 ;
        shui:editor shui:TextFieldEditor ;
        shui:propertyRole shui:LabelRole
    ] ;

    sh:property [
        sh:path archimate:Documentation ;
        sh:name "Documentation" ;
        sh:datatype xsd:string ;
        sh:order 2 ;
        shui:editor shui:TextAreaEditor
    ] .
```

## Data Flow

All operations use SPARQL directly against GraphDB — no custom REST APIs for CRUD.

```
┌──────────────┐     SPARQL      ┌──────────────┐
│    React     │ ──────────────► │   GraphDB    │
│   Frontend   │ ◄────────────── │   (SPARQL)   │
└──────────────┘                 └──────────────┘
        │                               │
        │ 1. SELECT shapes             │
        │ 2. Render forms              │
        │ 3. INSERT DATA               │
        │ 4. SELECT instances          │
        └───────────────────────────────┘
```

### SPARQL Operations

| Operation | Query |
|-----------|-------|
| List entity types | `SELECT ?class WHERE { ?shape sh:targetClass ?class }` |
| Get shape for form | `SELECT ?prop ?editor ... WHERE { ?shape sh:targetClass <Class> ; sh:property ?p }` |
| Get enum values | `SELECT ?val WHERE { ?prop sh:in/rdf:rest*/rdf:first ?val }` |
| Autocomplete | `SELECT ?uri ?label WHERE { ?uri a <Class> ; archimate:Name ?label }` |
| Create entity | `INSERT DATA { <uri> a <Class> ; archimate:Name "..." }` |
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
│       ├── shacl/
│       │   ├── EntityManager.tsx   # Entity list + CRUD
│       │   ├── SHACLForm.tsx       # Generic form renderer
│       │   └── editors/
│       │       └── index.tsx       # shui: URI → React component map
│       └── lib/
│           ├── api.ts             # Axios client
│           └── sparql.ts          # SPARQL query helpers
├── ontology/
│   └── archimate_ontology/    # Git submodule (reference/source)
│       ├── ontology/
│       │   └── archimate.ttl  # Full ArchiMate 3.2 ontology
│       └── validation/
│           ├── archimate_core_validation.ttl
│           └── archimate_derivation.ttl
└── start.sh / stop.sh
```

## Loading Shapes into GraphDB

The app has no built-in shapes. You must load SHACL shapes into GraphDB that target your domain classes. For ArchiMate:

1. Load the ArchiMate ontology (`ontology/archimate_ontology/ontology/archimate.ttl`) into GraphDB
2. Load SHACL shapes via SPARQL INSERT or Turtle file import

Example — insert a shape via SPARQL:

```sparql
PREFIX sh: <http://www.w3.org/ns/shacl#>
PREFIX shui: <http://www.w3.org/ns/shacl-ui#>
PREFIX archimate: <https://purl.org/archimate#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

INSERT DATA {
  <urn:shapes:BusinessActorShape> a sh:NodeShape ;
    sh:targetClass archimate:BusinessActor ;
    sh:property [
      sh:path archimate:Name ;
      sh:name "Name" ;
      sh:datatype xsd:string ;
      sh:minCount 1 ;
      sh:order 1 ;
      shui:editor shui:TextFieldEditor ;
      shui:propertyRole shui:LabelRole
    ] ;
    sh:property [
      sh:path archimate:Documentation ;
      sh:name "Documentation" ;
      sh:datatype xsd:string ;
      sh:order 2 ;
      shui:editor shui:TextAreaEditor
    ] .
}
```

## Tech Stack

- **Storage**: GraphDB 10.6 with OWL 2 RL reasoning
- **Backend**: Node.js + Express (SPARQL proxy only)
- **Frontend**: React 19 + TypeScript + Vite
- **Standards**: OWL 2, SHACL 1.2, SPARQL 1.1

## Current Status

- Shape discovery via SPARQL (`sh:NodeShape` + `sh:targetClass`)
- Form generation from `sh:property` constraints
- 7 editor components mapped to `shui:` URIs
- Entity create + delete via SPARQL
- Dark theme UI

## Next Steps

1. Edit existing entities (SELECT current values → form → DELETE/INSERT)
2. View mode — implement viewers (`LiteralViewer`, `LabelViewer`, `URIViewer`, `LangStringViewer`, `HTMLViewer`, `ImageViewer`, `DetailsViewer`)
3. Widget scoring — numeric scoring per spec instead of if/else
4. Label resolution — `shui:propertyRole shui:LabelRole` + `sh:order`
5. Multi-value properties — `sh:maxCount > 1` with add/remove UI
6. DetailsEditor/DetailsViewer — nested forms for blank nodes
7. Language-tagged strings — `TextFieldWithLangEditor`, `TextAreaWithLangEditor`, `LangStringViewer`
8. ValueTableViewer — tabular display of multiple values

## Development

```bash
# Backend
cd backend && npm run dev

# Frontend
cd frontend && npm run dev
```

## References

- [SHACL 1.2 UI Spec](https://w3c.github.io/data-shapes/shacl12-ui/)
- [SHACL 1.2 Core](https://www.w3.org/TR/shacl12-core/)
- [Creating Forms with SHACL 1.2](https://ontologist.substack.com/p/creating-forms-and-views-with-shacl)
