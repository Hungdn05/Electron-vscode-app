import { randomUUID } from 'crypto'
import {
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from 'fs/promises'
import { basename, join, resolve } from 'path'
import { simpleGit } from 'simple-git'
import { z } from 'zod'

const projectStatusSchema = z.enum(['active', 'archived'])

const projectSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(80),
  directoryPath: z.string().min(1),
  entryFile: z.string().min(1),
  isGitRepository: z.boolean(),
  status: projectStatusSchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

const registrySchema = z.object({
  version: z.literal(1),
  projects: z.array(projectSchema),
})

export type ProjectSummary = z.infer<typeof projectSchema>
export type ProjectDocument = Pick<
  ProjectSummary,
  'id' | 'name' | 'entryFile'
> & {
  content: string
}

type ProjectRegistry = z.infer<typeof registrySchema>

const projectNameSchema = z
  .string()
  .trim()
  .min(1, 'Project name is required.')
  .max(80, 'Project name must be at most 80 characters.')
  .refine(
    (value) =>
      !/[\\/]/.test(value) &&
      !value.includes('\u0000') &&
      value !== '.' &&
      value !== '..',
    'Project name cannot contain path characters.',
  )
  .refine(
    (value) => !/[<>:"|?*]/.test(value),
    'Project name contains characters unsupported on Windows.',
  )

const createProjectSchema = z.object({
  name: projectNameSchema,
  locationToken: z.string().uuid().optional(),
})

const projectIdSchema = z.string().uuid()
const documentContentSchema = z.string().max(5_000_000)

const latexTemplate = String.raw`\documentclass[12pt]{article}
\usepackage[utf8]{inputenc}
\usepackage[T1]{fontenc}
\usepackage{amsmath}

\title{KLTM LaTeX Project}
\author{Your name}
\date{\today}

\begin{document}

\maketitle

\section{Introduction}
Write your LaTeX document here.

\end{document}
`

const latexGitIgnore = `# LaTeX build artifacts
*.aux
*.bbl
*.blg
*.fdb_latexmk
*.fls
*.log
*.out
*.pdf
*.synctex.gz
`

export class ProjectService {
  private readonly registryPath: string
  private readonly defaultWorkspacePath: string
  private readonly locationTokens = new Map<string, string>()

  constructor({
    userDataPath,
    documentsPath,
  }: {
    userDataPath: string
    documentsPath: string
  }) {
    this.registryPath = join(userDataPath, 'projects.json')
    this.defaultWorkspacePath = join(documentsPath, 'KLTM Workspace')
  }

  async listProjects(includeArchived = false): Promise<ProjectSummary[]> {
    const registry = await this.readRegistry()
    return registry.projects
      .filter((project) => includeArchived || project.status === 'active')
      .sort((first, second) => second.updatedAt.localeCompare(first.updatedAt))
  }

  async chooseProjectLocation(
    selectDirectory: () => Promise<string | null>,
  ): Promise<{
    token: string
    displayPath: string
  } | null> {
    const selectedPath = await selectDirectory()
    if (!selectedPath) return null

    const selectedDirectory = await this.requireDirectory(selectedPath)
    const token = randomUUID()
    this.locationTokens.set(token, selectedDirectory)

    return { token, displayPath: selectedDirectory }
  }

  async createProject(input: unknown): Promise<ProjectSummary> {
    const { name, locationToken } = createProjectSchema.parse(input)
    const parentDirectory = await this.resolveProjectParent(locationToken)
    const projectDirectory = join(parentDirectory, name)
    const now = new Date().toISOString()

    if (resolve(projectDirectory) === resolve(parentDirectory)) {
      throw new Error('Project directory is invalid.')
    }

    try {
      await stat(projectDirectory)
      throw new Error(
        `A folder named “${name}” already exists in this location.`,
      )
    } catch (error) {
      if (this.isExpectedMissingPath(error)) {
        // The target does not exist yet, which is required for safe creation.
      } else if (error instanceof Error) {
        throw error
      }
    }

    await mkdir(projectDirectory)

    try {
      await Promise.all([
        writeFile(join(projectDirectory, 'main.tex'), latexTemplate, 'utf8'),
        writeFile(join(projectDirectory, '.gitignore'), latexGitIgnore, 'utf8'),
        writeFile(
          join(projectDirectory, 'README.md'),
          `# ${name}\n\nLaTeX project managed by KLTM Workspace.\n`,
          'utf8',
        ),
      ])
      await simpleGit(projectDirectory).init()
    } catch (error) {
      await rm(projectDirectory, { recursive: true, force: true })
      const detail =
        error instanceof Error ? error.message : 'Unknown Git error'
      throw new Error(`Could not initialize Git for this project: ${detail}`)
    }

    const project: ProjectSummary = {
      id: randomUUID(),
      name,
      directoryPath: projectDirectory,
      entryFile: 'main.tex',
      isGitRepository: true,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }

    const registry = await this.readRegistry()
    registry.projects.push(project)
    try {
      await this.writeRegistry(registry)
    } catch (error) {
      await rm(projectDirectory, { recursive: true, force: true })
      throw error
    }
    return project
  }

  async importProject(
    selectDirectory: () => Promise<string | null>,
  ): Promise<ProjectSummary | null> {
    const selectedPath = await selectDirectory()
    if (!selectedPath) return null

    const directoryPath = await this.requireDirectory(selectedPath)
    const registry = await this.readRegistry()
    const existingProject = registry.projects.find(
      (project) => resolve(project.directoryPath) === directoryPath,
    )
    if (existingProject) {
      if (existingProject.status === 'archived') {
        existingProject.status = 'active'
        existingProject.updatedAt = new Date().toISOString()
        await this.writeRegistry(registry)
      }
      return existingProject
    }

    const entryFile = await this.findEntryFile(directoryPath)
    const isGitRepository = await this.checkIsGitRepository(directoryPath)
    const now = new Date().toISOString()
    const project: ProjectSummary = {
      id: randomUUID(),
      name: basename(directoryPath),
      directoryPath,
      entryFile,
      isGitRepository,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    }

    registry.projects.push(project)
    await this.writeRegistry(registry)
    return project
  }

  async renameProject(id: unknown, name: unknown): Promise<ProjectSummary> {
    const projectId = projectIdSchema.parse(id)
    const newName = projectNameSchema.parse(name)
    const registry = await this.readRegistry()
    const project = this.getProject(registry, projectId)

    project.name = newName
    project.updatedAt = new Date().toISOString()
    await this.writeRegistry(registry)
    return project
  }

  async archiveProject(id: unknown): Promise<ProjectSummary> {
    const projectId = projectIdSchema.parse(id)
    const registry = await this.readRegistry()
    const project = this.getProject(registry, projectId)

    project.status = 'archived'
    project.updatedAt = new Date().toISOString()
    await this.writeRegistry(registry)
    return project
  }

  async getDocument(id: unknown): Promise<ProjectDocument> {
    const projectId = projectIdSchema.parse(id)
    const registry = await this.readRegistry()
    const project = this.getProject(registry, projectId)
    const documentPath = this.getProjectDocumentPath(project)
    const content = await readFile(documentPath, 'utf8')

    return {
      id: project.id,
      name: project.name,
      entryFile: project.entryFile,
      content,
    }
  }

  async saveDocument(id: unknown, content: unknown): Promise<void> {
    const projectId = projectIdSchema.parse(id)
    const documentContent = documentContentSchema.parse(content)
    const registry = await this.readRegistry()
    const project = this.getProject(registry, projectId)
    const documentPath = this.getProjectDocumentPath(project)
    const temporaryPath = `${documentPath}.${randomUUID()}.tmp`

    await writeFile(temporaryPath, documentContent, 'utf8')
    await rename(temporaryPath, documentPath)

    project.updatedAt = new Date().toISOString()
    await this.writeRegistry(registry)
  }

  private async readRegistry(): Promise<ProjectRegistry> {
    try {
      const content = await readFile(this.registryPath, 'utf8')
      return registrySchema.parse(JSON.parse(content))
    } catch (error) {
      if (this.isExpectedMissingPath(error)) {
        return { version: 1, projects: [] }
      }
      if (error instanceof z.ZodError || error instanceof SyntaxError) {
        throw new Error(
          'The project registry is invalid. Restore it from a backup before continuing.',
        )
      }
      throw error
    }
  }

  private async writeRegistry(registry: ProjectRegistry): Promise<void> {
    await mkdir(resolve(this.registryPath, '..'), { recursive: true })
    const temporaryPath = `${this.registryPath}.${randomUUID()}.tmp`
    await writeFile(
      temporaryPath,
      `${JSON.stringify(registry, null, 2)}\n`,
      'utf8',
    )
    await rename(temporaryPath, this.registryPath)
  }

  private async resolveProjectParent(locationToken?: string): Promise<string> {
    if (!locationToken) {
      await mkdir(this.defaultWorkspacePath, { recursive: true })
      return this.defaultWorkspacePath
    }

    const selectedDirectory = this.locationTokens.get(locationToken)
    this.locationTokens.delete(locationToken)
    if (!selectedDirectory) {
      throw new Error(
        'The selected project location has expired. Choose it again.',
      )
    }
    return selectedDirectory
  }

  private async requireDirectory(directoryPath: string): Promise<string> {
    const resolvedPath = resolve(directoryPath)
    const directoryStats = await stat(resolvedPath)
    if (!directoryStats.isDirectory()) {
      throw new Error('The selected path is not a folder.')
    }
    return resolvedPath
  }

  private async findEntryFile(directoryPath: string): Promise<string> {
    const entries = await readdir(directoryPath, { withFileTypes: true })
    const texFiles = entries
      .filter(
        (entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.tex'),
      )
      .map((entry) => entry.name)
      .sort()

    const entryFile = texFiles.includes('main.tex') ? 'main.tex' : texFiles[0]
    if (!entryFile) {
      throw new Error('Choose a folder that contains a top-level .tex file.')
    }
    return entryFile
  }

  private async checkIsGitRepository(directoryPath: string): Promise<boolean> {
    try {
      return await simpleGit(directoryPath).checkIsRepo()
    } catch {
      return false
    }
  }

  private getProject(registry: ProjectRegistry, id: string): ProjectSummary {
    const project = registry.projects.find((candidate) => candidate.id === id)
    if (!project) {
      throw new Error('Project not found.')
    }
    return project
  }

  private getProjectDocumentPath(project: ProjectSummary): string {
    if (project.status !== 'active') {
      throw new Error('Restore this archived project before opening it.')
    }
    if (basename(project.entryFile) !== project.entryFile) {
      throw new Error('Project entry file is invalid.')
    }
    return join(project.directoryPath, project.entryFile)
  }

  private isExpectedMissingPath(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ENOENT'
    )
  }
}
