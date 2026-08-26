type ProjectStatus = 'active' | 'archived'

interface ProjectSummary {
  id: string
  name: string
  directoryPath: string
  entryFile: string
  isGitRepository: boolean
  status: ProjectStatus
  createdAt: string
  updatedAt: string
}

interface ProjectDocument {
  id: string
  name: string
  entryFile: string
  content: string
}

declare global {
  interface Window {
    kltm: {
      readonly platform: string
      readonly projects: {
        list: () => Promise<ProjectSummary[]>
        chooseLocation: () => Promise<{
          token: string
          displayPath: string
        } | null>
        create: (input: {
          name: string
          locationToken?: string
        }) => Promise<ProjectSummary>
        import: () => Promise<ProjectSummary | null>
        rename: (id: string, name: string) => Promise<ProjectSummary>
        archive: (id: string) => Promise<ProjectSummary>
        getDocument: (id: string) => Promise<ProjectDocument>
        saveDocument: (id: string, content: string) => Promise<void>
      }
    }
  }
}

export {}
