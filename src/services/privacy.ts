const PRIVATE_TAG_PATTERN = /<private>([\s\S]*?)<\/private>/g;

export function stripPrivateContent(content: string): string {
  return content.replace(PRIVATE_TAG_PATTERN, "[REDACTED]");
}

export function isFullyPrivate(content: string): boolean {
  const matches = content.match(PRIVATE_TAG_PATTERN);
  if (!matches) return false;
  
  // Check if content is entirely within private tags
  const totalPrivateLength = matches.reduce((sum, match) => sum + match.length, 0);
  return totalPrivateLength >= content.length * 0.9;
}
