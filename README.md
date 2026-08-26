# KLTM Workspace

Desktop workspace for creating, editing, versioning, and synchronizing LaTeX projects.

Checkpoint 3 adds local project management: create a LaTeX template with a
Git repository, import an existing top-level `.tex` folder, rename its display
name, archive it without deleting files, and save its registered entry file.
Git synchronization, authentication, and LaTeX compilation are intentionally
deferred to later checkpoints.

## Requirements

- Node.js 24 LTS
- npm 11 or newer
- Git

## Development

```bash
npm install
npm run dev
```

If the parent environment sets `ELECTRON_RUN_AS_NODE=1`, remove that variable when launching the desktop process:

```bash
env -u ELECTRON_RUN_AS_NODE npm run dev
```

## Verification

```bash
npm run typecheck
npm run lint
npm run test:projects
npm run build
npm audit --audit-level=high
```

## Packaging

Packaging commands exist in `package.json`, but distributable builds are not
considered supported until the LaTeX runtime resources are added and the
signing/notarization checkpoint is complete.

## Architecture decisions

- [Electron process boundaries](docs/adr/0001-process-boundaries.md)
- [Native editor runtime](docs/adr/0002-native-editor-runtime.md)
- [Project data ownership](docs/adr/0003-project-data-ownership.md)
