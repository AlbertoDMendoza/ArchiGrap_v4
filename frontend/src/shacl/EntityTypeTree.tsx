import { useState } from 'react'
import type { EntityTypeNode } from '../lib/sparql'

interface EntityTypeTreeProps {
  nodes: EntityTypeNode[]
  selectedUri: string | null
  onSelect: (uri: string, label: string) => void
}

export function EntityTypeTree({ nodes, selectedUri, onSelect }: EntityTypeTreeProps) {
  return (
    <div className="entity-type-tree">
      {nodes.map(node => (
        <TreeNode
          key={node.uri}
          node={node}
          selectedUri={selectedUri}
          onSelect={onSelect}
          depth={0}
        />
      ))}
    </div>
  )
}

function TreeNode({
  node,
  selectedUri,
  onSelect,
  depth
}: {
  node: EntityTypeNode
  selectedUri: string | null
  onSelect: (uri: string, label: string) => void
  depth: number
}) {
  const [expanded, setExpanded] = useState(false)
  const hasChildren = node.children.length > 0
  const isSelected = node.uri === selectedUri

  const handleClick = () => {
    if (node.isShape) {
      onSelect(node.uri, node.label)
    }
    if (hasChildren) {
      setExpanded(!expanded)
    }
  }

  return (
    <div className="tree-node-container">
      <div
        className={[
          'tree-node',
          isSelected ? 'selected' : '',
          !node.isShape ? 'group-only' : ''
        ].filter(Boolean).join(' ')}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={handleClick}
      >
        <span className={`tree-toggle ${hasChildren ? (expanded ? 'expanded' : 'collapsed') : 'leaf'}`} />
        <span className="tree-label">{node.label}</span>
      </div>
      {expanded && hasChildren && (
        <div className="tree-children">
          {node.children.map(child => (
            <TreeNode
              key={child.uri}
              node={child}
              selectedUri={selectedUri}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}
