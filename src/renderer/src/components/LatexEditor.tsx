import { useEffect, useRef } from 'react'
import * as monaco from 'monaco-editor'
import EditorWorker from 'monaco-editor/editor/editor.worker?worker'

export type EditorDocument = {
  content: string
  uri: string
}

type LatexEditorProps = {
  document: EditorDocument
  onContentChange: (content: string) => void
}

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
  document,
  onContentChange,
}: LatexEditorProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const documentRef = useRef(document)
  const onContentChangeRef = useRef(onContentChange)

  useEffect(() => {
    documentRef.current = document
  }, [document])

  useEffect(() => {
    onContentChangeRef.current = onContentChange
  }, [onContentChange])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    configureWorker()
    configureMonaco()

    const model = monaco.editor.createModel(
      documentRef.current.content,
      'latex',
      monaco.Uri.parse(documentRef.current.uri),
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
      onContentChangeRef.current(model.getValue())
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
  }, [document.uri])

  return (
    <div
      ref={containerRef}
      className="monaco-editor"
      aria-label="LaTeX editor"
    />
  )
}
