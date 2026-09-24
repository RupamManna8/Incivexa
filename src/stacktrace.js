/**
 * Cross-Platform Stack Trace Parser
 * Extracts function, file, line, and column from V8 / Node.js error stack traces.
 */

export function parseStackTrace(stackString) {
  if (!stackString || typeof stackString !== 'string') return [];

  const lines = stackString.split('\n');
  const frames = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.startsWith('at ')) continue;

    // Pattern 1: at functionName (path/to/file.js:12:34)
    // Pattern 2: at async functionName (path/to/file.js:12:34)
    // Pattern 3: at path/to/file.js:12:34
    // Pattern 4: at new ClassName (path/to/file.js:12:34)
    const withFuncMatch = line.match(/^at\s+(?:async\s+)?(?:new\s+)?(.+?)\s+\((.+?):(\d+):(\d+)\)$/);
    if (withFuncMatch) {
      frames.push({
        function: withFuncMatch[1] || 'anonymous',
        file: normalizeFilePath(withFuncMatch[2]),
        line: parseInt(withFuncMatch[3], 10),
        column: parseInt(withFuncMatch[4], 10)
      });
      continue;
    }

    const bareMatch = line.match(/^at\s+(?:async\s+)?(.+?):(\d+):(\d+)$/);
    if (bareMatch) {
      frames.push({
        function: 'anonymous',
        file: normalizeFilePath(bareMatch[1]),
        line: parseInt(bareMatch[2], 10),
        column: parseInt(bareMatch[3], 10)
      });
    }
  }

  return frames;
}

/**
 * Normalizes file paths to POSIX format (replaces Windows backslashes)
 */
export function normalizeFilePath(filepath) {
  if (!filepath) return 'unknown';
  // Strip file:// prefix if present
  let clean = filepath.replace(/^file:\/\/\/?/, '');
  // Normalize Windows backslashes
  clean = clean.replace(/\\/g, '/');
  return clean;
}

export default parseStackTrace;
