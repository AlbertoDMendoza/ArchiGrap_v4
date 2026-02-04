# ArchiGraph v4 Development Documentation

## Project Overview

**Project Name:** ArchiGraph v4  
**Type:** Multi-ADL Enterprise Architecture Platform with Semantic-Native Core  
**Status:** Technical POC / Side Project  
**Philosophy:** Semantic-native storage, not framework-locked  

### Strategic Context (December 2024)

ArchiGraph v4 represents a strategic pivot from a commercial product (v3) to a focused technical proof-of-concept. The project demonstrates SHACL 1.2-driven generative UI for Enterprise Architecture modeling.

**Key Decision Rationale:**
- Higher education EA market too small for venture scale (~750K TAM)
- Essential Project already dominant in ITANA market (150 members, $22K/year, 15+ years established)
- Semantic web commercially challenged since 2015 (property graphs won the market)
- Solo developer, part-time development (10-15 hours/week)
- 3-6 month timeline vs. 18 months originally planned

**New Scope:**
- Internal tool for office work
- Portfolio piece demonstrating semantic web expertise
- Academic research opportunity (first SHACL 1.2 UI implementation for EA domain)
- Potential blog posts, academic papers, open source release (Apache 2.0 or MIT)
- IF valuable internally AND colleagues love it AND want to commercialize THEN revisit with proof

**Success Criteria:**
- **Technical:** Add SHACL property → UI updates without React code changes
- **Personal:** Actually used for work, colleagues interested, scratches semantic web itch
- **Not Success:** Number of users, revenue, GitHub stars, VC interest

---

## Infrastructure

### Hardware & Virtualization

**Platform:** Proxmox 8.0.3  
**Host:** HP ProLiant ML110 Gen9

### Virtual Machines

#### VM 104: archigraph-dev
- **IP:** 192.168.0.104
- **OS:** Ubuntu 22.04
- **Node.js:** v20.19.4
- **RAM:** 4GB
- **CPU Cores:** 2
- **Purpose:** Hosts both frontend (Vite port 5173) and backend (Express port 3002)
- **Project Directory:** `/home/ubuntu/archigraph-v4`

#### VM 105: graphdb-instance
- **IP:** 192.168.0.105
- **Port:** 7200
- **Software:** GraphDB 10.6.3
- **Repository:** archigraph-v4 (OWL 2 RL optimized)

### Network Access

**Direct Access (same network):**
```
http://192.168.0.104:5173  # Frontend
http://192.168.0.104:3002  # Backend API
http://192.168.0.105:7200  # GraphDB Workbench
```

**SSH Tunnel (for remote development):**
```bash
ssh -L 5173:localhost:5173 -L 3002:localhost:3002 ubuntu@192.168.0.104
```

**Recommended Development Setup:**
- VS Code Remote-SSH to VM 104 for part-time development

---

## Architecture

### Core Components

**Storage Layer:**
- GraphDB 10.6.3 on VM 105 (port 7200)
- OWL 2 RL reasoning enabled
- SPARQL endpoint for data access

**Backend:**
- Node.js + Express on VM 104 (port 3002)
- Dependencies: express, axios, dotenv, @anthropic-ai/sdk (only 4 deps)
- Minimal complexity philosophy

**Frontend:**
- React 19.2.0 + TypeScript
- Vite 7.2.4 (dev server)
- Dependencies: react-dom, axios, cytoscape (5 core deps)
- Hosted on VM 104 (port 5173, host: 0.0.0.0)

**Infrastructure Philosophy:**
- No Docker
- No Kubernetes
- No cloud services
- Minimal complexity

### Project Structure

```
/home/ubuntu/archigraph-v4/
├── backend/
│   ├── server.js
│   ├── graphdb.js
│   ├── claude.js
│   ├── routes/
│   ├── .env
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── components/
│   │   └── lib/
│   │       └── api.ts
│   ├── vite.config.ts
│   └── package.json
├── ontology/
│   ├── core.ttl                    # ArchiGraph 5-concept ontology
│   ├── sample-data.ttl             # Sample instance data
│   └── archimate_ontology/         # Git submodule (AlbertoDMendoza/archimate_ontology)
│       ├── ontology/
│       │   ├── archimate.ttl       # Full ArchiMate ontology (RDF-Star)
│       │   └── archimate_skos.ttl  # SKOS vocabulary
│       └── validation/
│           ├── archimate_core_validation.ttl      # SHACL validation rules
│           ├── archimate_derivation.ttl           # Derivation rules (DR1-DR8, PDR1-PDR12)
│           └── archimate-business-analyst-validation.ttl
└── scripts/
    ├── load-ontology.sh
    └── backup-data.sh
```

---

## Technology Stack

### SHACL Validation & UI Generation

#### SHACL Validator
**Selected:** shacl-engine (npm package)  
**Rationale:** 15-26x faster than alternatives, supports experimental SHACL 1.2 including UI spec, MIT license, pure JavaScript  
**NPM:** `shacl-engine`  
**Playground:** https://playground.rdf-ext.org/shacl-experimental/

#### UI Generator (Primary)
**Selected:** shaperone  
**Rationale:** Mature, MIT licensed, TypeScript Web Components, well documented with playgrounds  
**NPM:** `@hydrofoil/shaperone-wc`  
**Docs:** https://forms.hypermedia.app

#### UI Generator (Alternative)
**Selected:** ULB Darmstadt shacl-form  
**Rationale:** Both mature MIT licensed TypeScript Web Components well documented with playgrounds  
**NPM:** `@ulb-darmstadt/shacl-form`  
**Docs:** https://ulb-darmstadt.github.io/shacl-form/

#### SPARQL Query Generator
**Selected:** shape-to-query  
**Rationale:** Auto-generates SPARQL queries from SHACL shapes, eliminates manual query writing  
**NPM:** `@hydrofoil/shape-to-query`  
**Docs:** https://shape-to-query.hypermedia.app/docs  
**Use Case:** Fetch data for form population based on SHACL property definitions

### Documentation & Visualization Tools

#### SHACL Documentation Generator
**Tool:** SHACL Play  
**Docs:** https://shacl-play.sparna.fr/play/doc  
**UML Diagrams:** https://shacl-play.sparna.fr/play/draw  
**Use Case:** Generate end-user documentation and visual diagrams from SHACL ontology automatically  
**Verdict:** Critical for stakeholder communication - business users don't read Turtle

#### Visual Query Builder (Phase 2)
**Tool:** Sparnatural  
**URL:** https://docs.sparnatural.eu/  
**Use Case:** Future enhancement - replace manual SPARQL interface with visual query builder configured by SHACL  
**Priority:** Phase 2, after core generative UI working

### Development Environment

#### VS Code Extension
**Extension:** SHACL Language Server  
**ID:** stardog-union.vscode-langserver-shacl  
**Features:** Diagnostics, hover tooltips, auto-completion for SHACL authoring  
**Install:**
```bash
code --install-extension stardog-union.vscode-langserver-shacl
```

---

## SHACL 1.2 Specification

### Discovery & Validation (December 2024)

**W3C Status:** Official Recommendation (official standard)  
**Previous Status:** Community extensions like DASH were unofficial  
**Impact:** ArchiGraph's proposed UI generation approach is now official W3C standard

### Official UI Namespace

**Namespace:** `shui: http://www.w3.org/ns/shacl-ui#`

### Built-in Editors

The SHACL 1.2 specification includes these built-in editor types:
- `shui:TextFieldEditor` - Single line text input
- `shui:TextAreaEditor` - Multi-line textarea
- `shui:DatePickerEditor` - Calendar widget
- `shui:AutoCompleteEditor` - Search instances (e.g., Actor instances)
- `shui:EnumSelectEditor` - Dropdown from sh:in list
- `shui:BooleanSelectEditor` - True/false dropdown
- `shui:URIEditor` - URI input
- `shui:DetailsEditor` - Detailed view
- `shui:RichTextEditor` - Rich text editing

### Built-in Viewers

- `shui:LabelViewer` - Display with hyperlink
- `shui:LiteralViewer` - Plain text display
- `shui:ImageViewer` - Image from URL
- `shui:HTMLViewer` - Render HTML content

### Widget Auto-Selection (Scoring System)

Each widget has a `scoreFunction` that evaluates property and value:

**Examples:**
- `BooleanSelectEditor` scores 10 for `xsd:boolean` datatype
- `DatePickerEditor` scores 10 for `xsd:date` datatype
- `AutoCompleteEditor` scores 1 for IRI values with `sh:class` constraint
- `TextFieldEditor` scores 10 for any literal that is not `rdf:langString` or `xsd:boolean` (fallback)

### Label Resolution

**Mechanism:** `shui:propertyRole shui:LabelRole` identifies display label properties  
**Precedence:** `sh:order 0` = highest priority; qualified annotations preferred over direct  
**Fallback Chain:** Try each property in order by `sh:order`, then fallback to local name  
**Language Resolution:** Prioritize preferred language (en), then empty lang tag

### New SHACL 1.2 Features

- **Derived Properties:** SHACL-native inference
- **Flexible Targets:** Dynamic via SPARQL
- **Shape Class:** `sh:ShapeClass` with built-in validation (like `owl:Class`)

---

## SHACL 1.2 Implementation Pattern

### Required Namespaces

```turtle
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix shui: <http://www.w3.org/ns/shacl-ui#> .
@prefix ag: <http://archigraph.org/ontology#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
```

### Shape Class Pattern

```turtle
ag:System a sh:ShapeClass ;
    # Built-in validation like owl:Class
```

### Property Examples

#### Name with Label Role
```turtle
sh:path ag:hasName ;
sh:datatype xsd:string ;
sh:minCount 1 ;
shui:propertyRole shui:LabelRole ;
shui:editor shui:TextFieldEditor .
```

#### Description (Textarea)
```turtle
sh:path ag:hasDescription ;
sh:datatype xsd:string ;
shui:editor shui:TextAreaEditor .
```

#### Owner (Autocomplete)
```turtle
sh:path ag:hasOwner ;
sh:class ag:Actor ;
sh:minCount 1 ;
shui:editor shui:AutoCompleteEditor .
```

#### Status (Enum)
```turtle
sh:path ag:hasStatus ;
sh:in ("Active" "Deprecated" "Retired") ;
sh:minCount 1 ;
shui:editor shui:EnumSelectEditor .
```

#### Active Flag (Boolean)
```turtle
sh:path ag:isActive ;
sh:datatype xsd:boolean ;
shui:editor shui:BooleanSelectEditor .
```

#### Created Date
```turtle
sh:path ag:createdDate ;
sh:datatype xsd:date ;
shui:editor shui:DatePickerEditor .
```

### Implementation Benefit

**Zero-Code Generative UI:**
Add SHACL property → React form field appears automatically, zero manual React code required.

---

## React Component Architecture

### Core Components Needed

#### EditorFactory
- **Purpose:** Maps `shui:editor` types to React components
- **Implementation:** `EDITOR_MAP: Record<string, ComponentType>`
- **Example:** `shui:TextFieldEditor` → `TextFieldEditor` component

#### WidgetScorer
- **Purpose:** Implements scoring algorithm to auto-select editor when not explicitly specified
- **Logic:** Evaluates property constraints and selects highest-scoring widget

#### LabelResolver
- **Purpose:** Resolves display labels using `shui:LabelRole` and `sh:order` precedence
- **Signature:** `(resourceIRI, shapesGraph, dataGraph, preferredLang) => string`

#### SHACLForm (Main Component)
- **Purpose:** Main form component that generates UI from SHACL shapes dynamically
- **Input:** SHACL shape from GraphDB
- **Output:** Auto-generated form with validation

### TypeScript Interfaces

#### PropertyShape
```typescript
interface PropertyShape {
    path: string;
    datatype?: string;
    minCount?: number;
    maxCount?: number;
    class?: string;
    in?: any[];
    editor?: string;  // shui:editor
    viewer?: string;  // shui:viewer
    propertyRole?: string;  // shui:propertyRole
}
```

#### WidgetScore
```typescript
interface WidgetScore {
    name: string;
    score: number;  // from scoreFunction
}
```

### Data Flow

```
SHACL shapes from GraphDB
    ↓
TypeScript interfaces
    ↓
React components
    ↓
Auto-generated forms
    ↓
CRUD operations
    ↓
Back to GraphDB
```

---

## ADL Strategy

### Native ADL
- Simplified 20-concept model
- Primary interface for users
- Custom ontology optimized for usability

### ArchiMate Adapter
- Import/export for interoperability
- Compatibility with ArchiMate standard
- Bridges to existing EA tools
- **Derivation Rules** (from archimate_derivation.ttl):
  - DR1-DR8: Valid derivation rules (structural chains, cross-category)
  - PDR1-PDR12: Potential derivation rules (specialization inheritance)
  - Confidence levels: `valid`, `potential`, `suggestion`
  - RDF-Star metadata tracks derivation provenance

### Essential Project Adapter
- Migration path for ITANA market
- Import existing Essential Project data
- Provides semantic upgrade path

### Positioning
- Complement existing tools, don't compete
- Semantic evolution with migration paths
- Focus on innovation (generative UI, reasoning)

---

## Implementation Phases

### Phase 1: Core (Weeks 1-4, 40 hours)
- Minimal ontology (5 concepts: System, Capability, Actor, Process, Location)
- SHACL parser
- Form generator
- Basic CRUD operations
- **Basic SHACL validation** (required fields, data types, identifier patterns)

### Phase 2: Intelligence (Weeks 5-8, 40 hours)
- Claude API integration
- Natural Language to SPARQL
- Graph visualization (Cytoscape)
- **ArchiMate derivation rules** (DR1-DR8, PDR1-PDR12)
  - Automated relationship discovery via SPARQL CONSTRUCT
  - Confidence levels (valid/potential/suggestion) for derived relationships
  - Claude surfaces derived relationships to users

### Phase 3: Polish (Weeks 9-12, 40 hours)
- Advanced SHACL features
- Real office data
- Quality of life improvements
- **Full ArchiMate metamodel validation**
  - Layer consistency checks
  - Cross-layer relationship direction validation
  - Access/Assignment domain/range enforcement
  - RDF-Star relationship metadata validation
  - Model completeness analysis (orphaned elements)

**Total Timeline:** 3 months part-time (180 hours) or 6 weeks full-time sprint

---

## Next Implementation Steps

### Step 1: Create Minimal Ontology
Create `core.ttl` with 5 concepts using SHACL 1.2 syntax:
- System
- Capability
- Actor
- Process
- Location

### Step 2: Create SHACL Shapes
Create `shapes.ttl` using official `shui:` namespace with built-in editors:
- TextFieldEditor
- AutoCompleteEditor
- etc.

### Step 3: Load Ontology into GraphDB
Run `load-ontology.sh` script to load into GraphDB repository `archigraph-v4`

### Step 4: Build SHACLForm Component
Build React component that parses shapes and generates form fields automatically

### Step 5: Implement EditorFactory
Component mapping `shui:editor` types to React components

### Step 6: Test End-to-End
Create System instance via auto-generated form → persists in GraphDB

### Step 7: Implement Widget Scoring
Auto-select editors when not explicitly specified

### Step 8: Build Label Resolver
Using `shui:LabelRole` and `sh:order` precedence

---

## Current Status

### Backend
- ✅ Running on port 3002
- ✅ Listening on all interfaces (0.0.0.0)
- ✅ Health check working (shows GraphDB connection, triples count)

### Frontend
- ✅ Running on port 5173
- ✅ Vite configured with host 0.0.0.0
- ✅ Frontend .env created with `VITE_API_URL=http://192.168.0.104:3002`
- ✅ TypeScript fix applied (GraphDB triples interface corrected: total, explicit, inferred structure)

### GraphDB
- ✅ Connected to VM 105 port 7200
- ✅ Repository `archigraph-v4` created with OWL2-RL optimization
- ✅ ArchiMate ontology loaded (RDF-Star edition with fixes)
- ✅ SHACL validation rules loaded (archimate_core_validation.ttl)
- ✅ Derivation rules loaded (DR1-DR8, PDR1-PDR12)
- ✅ Triple count: 3930 (1194 explicit, 2736 inferred)

### Ontology
- ✅ ArchiMate ontology added as git submodule (AlbertoDMendoza/archimate_ontology)
- ✅ Local fixes applied: duplicate classes, typos, wrong comments, hierarchy corrections
- ✅ core.ttl created (5-concept simplified model)

### Blockers Resolved
- ❌ Need to run `npm install axios cytoscape` in frontend directory
- ❌ Need to create `shapes.ttl` in ontology directory (SHACL UI shapes)

---

## Development Workflow

### Connect to Development Environment
```bash
# Option 1: Direct SSH
ssh ubuntu@192.168.0.104

# Option 2: VS Code Remote-SSH
# Use VS Code Remote-SSH extension to connect
```

### Terminal 1: Backend
```bash
cd /home/ubuntu/archigraph-v4/backend
npm run dev  # Uses nodemon for auto-reload
```

### Terminal 2: Frontend
```bash
cd /home/ubuntu/archigraph-v4/frontend
npm run dev  # Uses Vite HMR
```

### Access from Work Laptop
```
http://192.168.0.104:5173  # Frontend
http://192.168.0.104:3002  # Backend API
```

### Version Control
```bash
git add .
git commit -m "Descriptive message"
git push
```

---

## Academic & Open Source Strategy

### Research Opportunity

**Title:** SHACL 1.2-Native Enterprise Architecture: Practical Implementation of W3C SHACL UI Specification

**Novel Contributions:**
1. First implementation of SHACL 1.2 UI spec for EA domain
2. Widget scoring algorithm extended with EA-specific heuristics
3. Property role patterns for multi-vocabulary environments (ArchiMate, Essential, custom)
4. Performance benchmarks: GraphDB + React + SHACL 1.2
5. User study: business users creating EA models via SHACL-generated forms

**Novelty:** No existing EA tool uses SHACL 1.2 UI specification - all use custom frameworks

**Validation:** W3C standard compliance, official `shui:` namespace, built-in widgets

**Impact:** Demonstrates semantic web standards viable for enterprise tooling, not just academic

### Publication Venues
- IEEE Software (architecture track)
- ESWC (European Semantic Web Conference)
- ISWC (International Semantic Web Conference)
- Enterprise Architecture conference proceedings

### Open Source Release

**Timing:** After 3-6 months internal use to prove it works

**License:** Apache 2.0 or MIT for broad adoption

**Components to Release:**
- SHACL parser
- React components
- Widget scoring system
- Label resolver

**Documentation:**
- Tutorial blog posts
- Video demos
- Example ontologies

**Community:**
- GitHub discussions
- Semantic web community
- Zep Discord

### Consulting Angle
Portfolio piece demonstrating semantic web expertise for future consulting opportunities

---

## Implementation Impact & Benefits

### Less Custom Code
Use existing mature libraries instead of building from scratch

### Faster Development
Proven Web Components reduce React coding effort

### Better Developer Experience
IDE support (SHACL Language Server) catches SHACL errors at authoring time

### Stakeholder Value
Auto-generated docs and UML diagrams communicate better than technical Turtle files

### Future-Proof
SHACL 1.2 experimental support positions for upcoming W3C standard adoption

---

## Essential Project Findings

### Technology Reality Check
- **Technology:** Protégé Frames (NOT ArchiMate, NOT OWL/RDF)
- **Vintage:** Built on Protégé 3.x from 2009 (pre-Semantic Web era)
- **Metamodel:** 500+ class proprietary meta-model
- **HERM:** Higher Ed Reference Model built in Essential format
- **Export:** Can export to OWL but not native
- **Capabilities:** No semantic reasoning, no federation capabilities
- **ITANA Usage:** ITANA members currently use Essential + HERM

### ArchiGraph Positioning vs. Essential
- **Advantage:** Semantic evolution with migration path from Essential
- **Differentiation:** ArchiMate compatibility, Essential adapter, migration path
- **Core Value:** Semantic-native storage, GraphDB OWL reasoning, SHACL-driven generative UI, business-friendly CNL

---

## Configuration Files

### Backend .env
```bash
# GraphDB Connection
GRAPHDB_URL=http://192.168.0.105:7200
GRAPHDB_REPOSITORY=archigraph-v4

# Anthropic API
ANTHROPIC_API_KEY=your_api_key_here

# Server Config
PORT=3002
HOST=0.0.0.0
```

### Frontend .env
```bash
VITE_API_URL=http://192.168.0.104:3002
```

---

## Success Validation Criteria

**Test:** When user adds `sh:property` to SHACL shape, UI form field appears automatically without writing React code

**This proves:** Generative UI working as designed

---

## Key Principles

1. **No Pressure:** It's a side project - build cool tech, solve real problems, have fun
2. **Semantic-First:** Storage layer is semantic-native, not framework-locked
3. **Standards Compliance:** Use official W3C SHACL 1.2 spec, not custom extensions
4. **Minimal Dependencies:** Keep stack simple and maintainable
5. **Academic Rigor:** Document everything for potential publication
6. **Pragmatic Scope:** POC first, commercialization only if proven valuable

---

## References & Resources

### Official Specifications
- SHACL 1.2: https://www.w3.org/TR/shacl/
- SHACL UI Namespace: http://www.w3.org/ns/shacl-ui#

### Libraries & Tools
- shacl-engine: npm package
- shaperone: https://forms.hypermedia.app
- shape-to-query: https://shape-to-query.hypermedia.app/docs
- SHACL Play: https://shacl-play.sparna.fr/play/doc
- Sparnatural: https://docs.sparnatural.eu/

### Development Tools
- GraphDB: https://graphdb.ontotext.com/
- VS Code SHACL Extension: stardog-union.vscode-langserver-shacl

---

## Contact & Collaboration

For questions about this project, consult the knowledge graph in the Graphiti MCP instance or refer to the episodes stored in Neo4j Aura.

**Last Updated:** February 2025
**Document Version:** 1.1
