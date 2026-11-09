// Read-only code view with line numbers; `highlight` is a Set of 1-based line numbers.
export default function CodeBlock({ code, highlight = new Set(), id }) {
  const lines = code.split('\n')
  return (
    <pre className="codeblock" id={id} tabIndex={0}>
      {lines.map((line, i) => (
        <div key={i} className={highlight.has(i + 1) ? 'cl cl-hl' : 'cl'} data-line={i + 1}>
          <span className="ln">{i + 1}</span>
          <code>{line || ' '}</code>
        </div>
      ))}
    </pre>
  )
}
