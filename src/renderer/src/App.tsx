function App(): React.JSX.Element {
  return (
    <main className="app-shell">
      <header className="topbar">
        <span className="app-title">KLTM Workspace</span>
        <span className="project-title">No project opened</span>
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
          <button className="navigation-item navigation-item-active" type="button">
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

        <section className="recent-projects" aria-labelledby="recent-projects-heading">
          <h2 id="recent-projects-heading">Recent projects</h2>
          <p>No recent projects</p>
        </section>

        <span className="platform-label">Platform: {window.kltm.platform}</span>
      </aside>

      <section className="editor-placeholder" aria-labelledby="editor-placeholder-heading">
        <div className="placeholder-content">
          <span className="placeholder-logo" aria-hidden="true">
            K
          </span>
          <h1 id="editor-placeholder-heading">Editor is not running</h1>
          <p>OpenVSCode Server will be integrated in Checkpoint 2.</p>
        </div>
      </section>

      <footer className="statusbar">
        <span>Local workspace</span>
        <span className="status-ready">
          <span className="status-dot" aria-hidden="true" />
          Ready
        </span>
      </footer>
    </main>
  )
}

export default App
