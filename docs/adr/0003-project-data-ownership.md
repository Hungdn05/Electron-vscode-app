# ADR 0003: Project data is owned by the main process

## Status

Accepted in checkpoint 3.

## Decision

The Electron main process owns project metadata, folder creation, template
generation, Git initialization, and document read/write operations. The
renderer receives only a narrow IPC API for listed projects and the registered
top-level LaTeX entry file.

Project metadata is stored atomically in the application user-data directory.
New projects are created under `Documents/KLTM Workspace` unless the user
selects a folder through Electron's native dialog. The main process represents
that selected location with an expiring token rather than trusting a renderer
path string.

## Consequences

- A new project has `main.tex`, a LaTeX `.gitignore`, a short `README.md`, and
  an initialized local Git repository.
- Imported folders are not modified; they must contain a top-level `.tex` file.
- Rename changes only the app display name, never a user folder or Git remote.
- Archive removes a project from the active registry but does not delete its
  folder. Importing the same folder restores it.
- The renderer cannot enumerate arbitrary directories or write arbitrary paths.
