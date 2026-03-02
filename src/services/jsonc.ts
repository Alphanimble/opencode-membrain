/**
 * JSONC (JSON with Comments) comment stripper
 * Properly handles strings to avoid breaking URLs like https://
 */

export function stripJsoncComments(jsonc: string): string {
  let result = "";
  let inString = false;
  let escaped = false;
  let i = 0;

  while (i < jsonc.length) {
    const char = jsonc[i];
    const nextChar = jsonc[i + 1];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === "\\") {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      result += char;
    } else {
      // Not in a string
      if (char === '"') {
        inString = true;
        result += char;
      } else if (char === "/" && nextChar === "/") {
        // Single-line comment - skip to end of line
        while (i < jsonc.length && jsonc[i] !== "\n") {
          i++;
        }
        if (i < jsonc.length) {
          result += jsonc[i]; // Keep the newline
        }
      } else if (char === "/" && nextChar === "*") {
        // Multi-line comment - skip to end
        i += 2; // Skip /*
        while (i < jsonc.length - 1) {
          if (jsonc[i] === "*" && jsonc[i + 1] === "/") {
            i += 2; // Skip */
            break;
          }
          i++;
        }
      } else {
        result += char;
      }
    }

    i++;
  }

  return result;
}
