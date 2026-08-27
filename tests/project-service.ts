import assert from 'node:assert/strict'
import { mkdtemp, readFile, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { simpleGit } from 'simple-git'
import { ProjectService } from '../src/main/services/project-service'

async function run(): Promise<void> {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'kltm-project-service-'))

  try {
    const service = new ProjectService({
      userDataPath: join(temporaryRoot, 'app-data'),
      documentsPath: join(temporaryRoot, 'documents'),
    })

    const project = await service.createProject({ name: 'Thesis Draft' })
    const expectedProjectDirectory = join(
      temporaryRoot,
      'documents',
      'KLTM Workspace',
      'Thesis Draft',
    )

    assert.equal(project.directoryPath, expectedProjectDirectory)
    assert.equal(project.entryFile, 'main.tex')
    assert.equal(project.isGitRepository, true)
    assert.equal(await simpleGit(project.directoryPath).checkIsRepo(), true)
    await stat(join(project.directoryPath, '.git'))
    assert.match(
      await readFile(join(project.directoryPath, 'main.tex'), 'utf8'),
      /\\begin\{document\}/,
    )

    const document = await service.getDocument(project.id)
    assert.equal(document.entryFile, 'main.tex')
    await service.saveDocument(
      project.id,
      `${document.content}\n% Saved by project service test\n`,
    )
    assert.match(
      await readFile(join(project.directoryPath, 'main.tex'), 'utf8'),
      /% Saved by project service test/,
    )

    const renamedProject = await service.renameProject(
      project.id,
      'Renamed Thesis',
    )
    assert.equal(renamedProject.name, 'Renamed Thesis')
    assert.equal(renamedProject.directoryPath, expectedProjectDirectory)
    assert.equal((await service.listProjects()).length, 1)

    await service.archiveProject(project.id)
    assert.equal((await service.listProjects()).length, 0)

    const restoredProject = await service.importProject(
      async () => project.directoryPath,
    )
    assert.equal(restoredProject?.id, project.id)
    assert.equal((await service.listProjects()).length, 1)

    console.log('ProjectService integration check passed.')
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true })
  }
}

void run()
