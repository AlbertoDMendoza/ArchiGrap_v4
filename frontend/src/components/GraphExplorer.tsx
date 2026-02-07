import * as Reactodia from '@reactodia/workspace'

interface GraphExplorerProps {
  sparqlEndpoint: string
}

// Use background Web Worker to compute graph layout
const Layouts = Reactodia.defineLayoutWorker(() => new Worker(
  new URL('@reactodia/workspace/layout.worker', import.meta.url),
  { type: 'module' }
))

export function GraphExplorer({ sparqlEndpoint }: GraphExplorerProps) {
  const { defaultLayout } = Reactodia.useWorker(Layouts)

  const { onMount } = Reactodia.useLoadedWorkspace(
    async ({ context, signal }) => {
      const { model, getCommandBus } = context

      // Create SPARQL data provider for GraphDB
      const dataProvider = new Reactodia.SparqlDataProvider(
        {
          endpointUrl: sparqlEndpoint,
          queryMethod: 'POST',
        },
        Reactodia.OwlStatsSettings
      )

      // Import layout with the data provider
      await model.importLayout({
        dataProvider,
        validateLinks: true,
        signal,
      })

      // Focus the unified search on element types
      getCommandBus(Reactodia.UnifiedSearchTopic)
        .trigger('focus', { sectionKey: 'elementTypes' })
    },
    [sparqlEndpoint]
  )

  return (
    <div style={{ width: '100%', height: '80vh', position: 'relative' }}>
      <Reactodia.Workspace ref={onMount} defaultLayout={defaultLayout}>
        <Reactodia.DefaultWorkspace
          languages={[
            { code: 'en', label: 'English' },
            { code: 'es', label: 'Español' },
            { code: 'de', label: 'Deutsch' },
            { code: 'fr', label: 'Français' },
          ]}
        />
      </Reactodia.Workspace>
    </div>
  )
}

export default GraphExplorer
