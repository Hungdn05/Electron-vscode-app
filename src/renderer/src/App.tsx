import { useState } from 'react'
import { LatexEditor } from './components/LatexEditor'

function App(): React.JSX.Element {
  const [isScratchDirty, setIsScratchDirty] = useState(false)

  return (
    <main className="app-shell">
      <header className="topbar">
        <span className="app-title">KLTM Workspace</span>
        <span className="project-title">Scratch document · main.tex</span>
      </header>

      <aside className="sidebar">
        <div className="brand">
          <span className="brand-logo" aria-hidden="true">
            K
          </span>
          <strong>KLTM Tools</strong>
        </div>

        <button
          className="primary-action"
          type="button"
          disabled
          title="Available after Project Manager is implemented"
        >
          <span aria-hidden="true">+</span>
          Add file/folder
        </button>

        <nav className="navigation" aria-label="Main navigation">
          <button
            className="navigation-item navigation-item-active"
            type="button"
          >
            <span aria-hidden="true">▣</span>
            Projects
          </button>
          <button
            className="navigation-item"
            type="button"
            disabled
            title="Available in a later checkpoint"
          >
            <span aria-hidden="true">⚙</span>
            Settings
          </button>
        </nav>

        <section
          className="recent-projects"
          aria-labelledby="recent-projects-heading"
        >
          <h2 id="recent-projects-heading">Recent projects</h2>
          <p>No recent projects</p>
        </section>

        <span className="platform-label">Platform: {window.kltm.platform}</span>
      </aside>

      <section className="editor-workspace" aria-label="LaTeX editor workspace">
        <header className="editor-toolbar">
          <div className="editor-breadcrumbs" aria-label="Current document">
            <span>Scratch</span>
            <span aria-hidden="true">/</span>
            <strong>main.tex</strong>
          </div>
          <span className="editor-mode">LaTeX · In memory</span>
        </header>
        <div className="editor-content">
          <LatexEditor onDirtyChange={setIsScratchDirty} />
        </div>
      </section>

      <footer className="statusbar">
        <span>
          {isScratchDirty ? 'Unsaved scratch changes' : 'Scratch document'}
        </span>
        <span className="status-ready">
          <span className="status-dot" aria-hidden="true" />
          In memory
        </span>
      </footer>
    </main>
  )
}

export default App
