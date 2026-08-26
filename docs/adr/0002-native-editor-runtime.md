# ADR 0002: Use Monaco as the embedded editor runtime

## Status

Accepted in checkpoint 2.

## Context

The initial proposal embedded OpenVSCode Server in Electron. Its official
prebuilt releases target Linux, while this application must be packaged for
Windows and macOS. Shipping the server would therefore require maintaining
platform-specific server builds and an extension runtime before the project
manager can be delivered.

## Decision

Use Monaco Editor directly in the Electron renderer for the initial desktop
editor. The editor starts with an in-memory LaTeX scratch document and has no
filesystem or Node.js access.

## Consequences

- The Electron main process remains the exclusive owner of projects, files,
  Git, credentials, and future LaTeX processes.
- Project-file loading and saving will be added through narrow IPC contracts in
  the Project Manager checkpoint.
- This runtime does not support VS Code extensions, including LaTeX Workshop.
  LaTeX build and PDF preview will be implemented as application features in a
  later checkpoint.
