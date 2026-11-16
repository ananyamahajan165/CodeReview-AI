// Mirrors backend/utils/languages.js (name -> file extension)
export const LANGUAGES = {
  JavaScript: 'js', TypeScript: 'ts', Python: 'py', Java: 'java', 'C++': 'cpp', C: 'c', 'C#': 'cs',
  Go: 'go', Rust: 'rs', PHP: 'php', Ruby: 'rb', Kotlin: 'kt', Swift: 'swift', SQL: 'sql',
  'HTML/CSS': 'html', Other: 'txt',
}
export const LANGUAGE_NAMES = Object.keys(LANGUAGES)
export const extensionFor = (language) => LANGUAGES[language] || 'txt'
export const MAX_CODE_CHARS = 20000
