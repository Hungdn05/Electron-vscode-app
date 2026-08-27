import { useEffect, useState } from 'react'
import { EditorDocument, LatexEditor } from './components/LatexEditor'

type ActiveDocument = EditorDocument & {
  projectId: string | null
  projectName: string
  entryFile: string
}

type ProjectLocation = {
  token: string
  displayPath: string
}

type ProjectSummary = {
  id: string
  name: string
  entryFile: string
  isGitRepository: boolean
}

const scratchDocument = String.raw`\documentclass[12pt]{article}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage{amsmath}

\title{KLTM LaTeX Draft}
\author{Your name}
\date{\today}

\begin{document}

\maketitle

\section{Introduction}
Write your LaTeX document here.

\end{document}
`

const initialDocument: ActiveDocument = {
  projectId: null,
  projectName: 'Scratch document',
  entryFile: 'main.tex',
  content: scratchDocument,
  uri: 'inmemory://kltm/scratch/main.tex',
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'The operation could not be completed.'
}

function App(): React.JSX.Element {
  const [projects, setProjects] = useState<ProjectSummary[]>([])
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null)
  const [activeDocument, setActiveDocument] =
    useState<ActiveDocument>(initialDocument)
  const [isDirty, setIsDirty] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isBusy, setIsBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [projectLocation, setProjectLocation] =
    useState<ProjectLocation | null>(null)

  const activeProject =
    projects.find((project) => project.id === activeProjectId) ?? null

  async function refreshProjects(): Promise<ProjectSummary[]> {
    const latestProjects = await window.kltm.projects.list()
    setProjects(latestProjects)
    return latestProjects
  }

  useEffect(() => {
    let isMounted = true

    window.kltm.projects.list().then(
      (loadedProjects) => {
        if (isMounted) setProjects(loadedProjects)
      },
      (loadError: unknown) => {
        if (isMounted) setError(getErrorMessage(loadError))
      },
    )

    return () => {
      isMounted = false
    }
  }, [])

  async function openProject(project: ProjectSummary): Promise<void> {
    setError(null)
    setIsBusy(true)
    try {
      const document = await window.kltm.projects.getDocument(project.id)
      setActiveProjectId(project.id)
      setActiveDocument({
        projectId: document.id,
        projectName: document.name,
        entryFile: document.entryFile,
        content: document.content,
        uri: `inmemory://kltm/project/${document.id}/${document.entryFile}`,
      })
      setIsDirty(false)
    } catch (openError) {
      setError(getErrorMessage(openError))
    } finally {
      setIsBusy(false)
    }
  }

  function beginCreate(): void {
    setError(null)
    setProjectName('')
    setProjectLocation(null)
    setIsCreateDialogOpen(true)
  }

  async function chooseProjectLocation(): Promise<void> {
    setError(null)
    try {
      const location = await window.kltm.projects.chooseLocation()
      if (location) setProjectLocation(location)
    } catch (locationError) {
      setError(getErrorMessage(locationError))
    }
  }

  async function createProject(): Promise<void> {
    setError(null)
    setIsBusy(true)
    try {
      const project = await window.kltm.projects.create({
        name: projectName,
        ...(projectLocation ? { locationToken: projectLocation.token } : {}),
      })
      await refreshProjects()
      setIsCreateDialogOpen(false)
      await openProject(project)
    } catch (createError) {
      setError(getErrorMessage(createError))
    } finally {
      setIsBusy(false)
    }
  }

  async function importProject(): Promise<void> {
    setError(null)
    setIsBusy(true)
    try {
      const project = await window.kltm.projects.import()
      if (!project) return
      await refreshProjects()
      await openProject(project)
    } catch (importError) {
      setError(getErrorMessage(importError))
    } finally {
      setIsBusy(false)
    }
  }

  async function renameProject(project: ProjectSummary): Promise<void> {
    const name = window.prompt('Project display name', project.name)?.trim()
    if (!name || name === project.name) return

    setError(null)
    setIsBusy(true)
    try {
      const renamedProject = await window.kltm.projects.rename(project.id, name)
      await refreshProjects()
      if (activeDocument.projectId === project.id) {
        setActiveDocument((document) => ({
          ...document,
          projectName: renamedProject.name,
        }))
      }
    } catch (renameError) {
      setError(getErrorMessage(renameError))
    } finally {
      setIsBusy(false)
    }
  }

  async function archiveProject(project: ProjectSummary): Promise<void> {
    if (
      !window.confirm(
        `Archive “${project.name}”? Its files will remain on your computer.`,
      )
    ) {
      return
    }

    setError(null)
    setIsBusy(true)
    try {
      await window.kltm.projects.archive(project.id)
      await refreshProjects()
      if (activeProjectId === project.id) {
        setActiveProjectId(null)
        setActiveDocument(initialDocument)
        setIsDirty(false)
      }
    } catch (archiveError) {
      setError(getErrorMessage(archiveError))
    } finally {
      setIsBusy(false)
    }
  }

  async function saveDocument(): Promise<void> {
    if (!activeDocument.projectId || !isDirty || isSaving) return

    setError(null)
    setIsSaving(true)
    try {
      await window.kltm.projects.saveDocument(
        activeDocument.projectId,
        activeDocument.content,
      )
      await refreshProjects()
      setIsDirty(false)
    } catch (saveError) {
      setError(getErrorMessage(saveError))
    } finally {
      setIsSaving(false)
    }
  }

  function updateDocument(content: string): void {
    setActiveDocument((document) => ({ ...document, content }))
    setIsDirty(true)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <span className="app-title">KLTM Workspace</span>
        <span className="project-title">
          {activeDocument.projectName} · {activeDocument.entryFile}
        </span>
      </header>

      <aside className="sidebar">
        <div className="brand">
          <span className="brand-logo" aria-hidden="true">
            K
          </span>
          <strong>KLTM Tools</strong>
        </div>

        <div className="project-actions">
          <button
            className="primary-action"
            type="button"
            onClick={beginCreate}
          >
            <span aria-hidden="true">+</span>
            New project
          </button>
          <button
            className="secondary-action"
            type="button"
            onClick={() => void importProject()}
          >
            Import folder
          </button>
        </div>

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
          <h2 id="recent-projects-heading">Projects</h2>
          {projects.length === 0 ? (
            <p>No projects yet</p>
          ) : (
            <div className="project-list">
              {projects.map((project) => (
                <article
                  className={`project-item ${project.id === activeProjectId ? 'project-item-active' : ''}`}
                  key={project.id}
                >
                  <button
                    className="project-open-button"
                    type="button"
                    onClick={() => void openProject(project)}
                    disabled={isBusy}
                  >
                    <strong>{project.name}</strong>
                    <span>{project.entryFile}</span>
                  </button>
                  <div className="project-item-actions">
                    <span
                      className={
                        project.isGitRepository ? 'git-ready' : 'git-pending'
                      }
                    >
                      {project.isGitRepository ? 'Git' : 'Local'}
                    </span>
                    <button
                      className="icon-action"
                      type="button"
                      onClick={() => void renameProject(project)}
                      disabled={isBusy}
                      aria-label={`Rename ${project.name}`}
                      title="Rename display name"
                    >
                      ✎
                    </button>
                    <button
                      className="icon-action"
                      type="button"
                      onClick={() => void archiveProject(project)}
                      disabled={isBusy}
                      aria-label={`Archive ${project.name}`}
                      title="Archive project"
                    >
                      ⌫
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <span className="platform-label">Platform: {window.kltm.platform}</span>
      </aside>

      <section className="editor-workspace" aria-label="LaTeX editor workspace">
        <header className="editor-toolbar">
          <div className="editor-breadcrumbs" aria-label="Current document">
            <span>{activeDocument.projectName}</span>
            <span aria-hidden="true">/</span>
            <strong>{activeDocument.entryFile}</strong>
          </div>
          <div className="editor-controls">
            <span className="editor-mode">
              LaTeX · {activeDocument.projectId ? 'Local file' : 'In memory'}
            </span>
            <button
              className="save-button"
              type="button"
              disabled={!activeDocument.projectId || !isDirty || isSaving}
              onClick={() => void saveDocument()}
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </header>
        <div className="editor-content">
          <LatexEditor
            document={activeDocument}
            onContentChange={updateDocument}
          />
        </div>
      </section>

      <footer className="statusbar">
        <span>
          {error ??
            (isBusy
              ? 'Working…'
              : isDirty
                ? 'Unsaved changes'
                : 'Saved locally')}
        </span>
        <span className="status-ready">
          <span className="status-dot" aria-hidden="true" />
          {activeProject
            ? activeProject.isGitRepository
              ? 'Git initialized'
              : 'Local folder'
            : 'Scratch'}
        </span>
      </footer>

      {isCreateDialogOpen && (
        <div className="dialog-backdrop" role="presentation">
          <section
            className="project-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-project-title"
          >
            <h2 id="new-project-title">Create LaTeX project</h2>
            <p>
              A new folder, starter template, and local Git repository will be
              created.
            </p>
            <label htmlFor="project-name">Project name</label>
            <input
              id="project-name"
              value={projectName}
              onChange={(event) => setProjectName(event.target.value)}
              autoFocus
              disabled={isBusy}
            />
            <label>Location</label>
            <div className="location-picker">
              <span>
                {projectLocation?.displayPath ??
                  'Documents / KLTM Workspace (default)'}
              </span>
              <button
                type="button"
                onClick={() => void chooseProjectLocation()}
                disabled={isBusy}
              >
                Choose…
              </button>
            </div>
            <div className="dialog-actions">
              <button
                type="button"
                onClick={() => setIsCreateDialogOpen(false)}
                disabled={isBusy}
              >
                Cancel
              </button>
              <button
                className="create-button"
                type="button"
                onClick={() => void createProject()}
                disabled={isBusy}
              >
                Create project
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

export default App
