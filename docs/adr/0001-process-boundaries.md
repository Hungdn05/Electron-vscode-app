# ADR 0001: Electron process boundaries

## Status

Accepted for Checkpoint 1.

## Context

KLTM Workspace will combine a trusted local React interface with an OpenVSCode Server page and privileged desktop services for projects, Git, authentication, and LaTeX compilation.

## Decision

- The renderer is sandboxed and has no Node.js integration.
- The preload exposes only named, typed capabilities. It never exposes the raw Electron IPC API.
- Filesystem, process, Git, credential, and LaTeX operations belong to Electron main services.
- OpenVSCode Server will run as a supervised child process bound to loopback and protected by a per-launch token.
- OpenVSCode content will be hosted in a `WebContentsView` without access to the React renderer's privileged preload API.
- External navigation and permission requests are denied unless a later checkpoint introduces an explicit allowlist.

## Consequences

Every new privileged operation requires a narrow preload method, sender validation, input validation, and a main-process handler. This adds small amounts of boilerplate while preserving an auditable security boundary.
