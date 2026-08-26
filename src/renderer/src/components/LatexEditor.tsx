import { useEffect, useRef } from 'react'
import * as monaco from 'monaco-editor'
import EditorWorker from 'monaco-editor/editor/editor.worker?worker'

type LatexEditorProps = {
  onDirtyChange: (isDirty: boolean) => void
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

let latexLanguageRegistered = false

function configureMonaco(): void {
  if (latexLanguageRegistered) return

  latexLanguageRegistered = true
  monaco.languages.register({
    id: 'latex',
    extensions: ['.tex', '.latex', '.sty', '.cls'],
  })
  monaco.languages.setMonarchTokensProvider('latex', {
    tokenizer: {
      root: [
        [/%.*$/, 'comment'],
        [
          /\\(?:begin|end|documentclass|usepackage|section|subsection|title|author|date|maketitle)\b/,
          'keyword',
        ],
        [/\\[a-zA-Z@]+\*?/, 'type.identifier'],
        [/\$\$?/, 'string'],
        [/&|_\^|#/, 'operator'],
      ],
    },
  })
}

function configureWorker(): void {
  self.MonacoEnvironment = {
    getWorker: () => new EditorWorker(),
  }
}

export function LatexEditor({
  onDirtyChange,
}: LatexEditorProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    configureWorker()
    configureMonaco()

    const model = monaco.editor.createModel(
      scratchDocument,
      'latex',
      monaco.Uri.parse('inmemory://kltm/scratch/main.tex'),
    )
    const editor = monaco.editor.create(container, {
      model,
      theme: 'vs-dark',
      automaticLayout: true,
      fontFamily: "Menlo, Monaco, 'Courier New', monospace",
      fontSize: 14,
      lineHeight: 22,
      lineNumbersMinChars: 3,
      minimap: { enabled: false },
      padding: { top: 14, bottom: 14 },
      scrollBeyondLastLine: false,
      smoothScrolling: true,
      tabSize: 2,
      wordWrap: 'on',
    })
    const changeSubscription = editor.onDidChangeModelContent(() => {
      onDirtyChange(true)
    })
    const resizeObserver = new ResizeObserver(() => editor.layout())

    resizeObserver.observe(container)
    editor.focus()

    return () => {
      resizeObserver.disconnect()
      changeSubscription.dispose()
      editor.dispose()
      model.dispose()
    }
  }, [onDirtyChange])

  return (
    <div
      ref={containerRef}
      className="monaco-editor"
      aria-label="LaTeX scratch editor"
    />
  )
}
