import { scoreTone } from '../utils/format'

export default function ScoreRing({ score, size = 96 }) {
  const r = 40, c = 2 * Math.PI * r
  return (
    <div className={`score-ring tone-${scoreTone(score)}`} style={{ width: size, height: size }} role="img" aria-label={`Quality score ${score} out of 100`}>
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} className="ring-bg" />
        <circle cx="50" cy="50" r={r} className="ring-fg" strokeDasharray={c} strokeDashoffset={c * (1 - score / 100)} transform="rotate(-90 50 50)" />
      </svg>
      <strong>{score}</strong>
    </div>
  )
}
