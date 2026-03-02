import { execSync } from "node:child_process";
import { createHash } from "node:crypto";

export interface Tags {
  user: string;
  project: string;
}

function hashString(input: string): string {
  return createHash("sha256").update(input).digest("hex").slice(0, 16);
}

function getGitEmail(): string | null {
  try {
    return execSync("git config user.email", { encoding: "utf-8" }).trim();
  } catch {
    return null;
  }
}

function getGitRemoteUrl(): string | null {
  try {
    return execSync("git remote get-url origin", { encoding: "utf-8" }).trim();
  } catch {
    return null;
  }
}

export function getTags(directory: string): Tags {
  const gitEmail = getGitEmail();
  const gitRemote = getGitRemoteUrl();
  
  // Use git email for user identification, fallback to system user
  const userIdentifier = gitEmail || process.env.USER || process.env.USERNAME || "unknown";
  const userHash = hashString(userIdentifier);
  
  // Use git remote URL for project identification, fallback to directory
  const projectIdentifier = gitRemote || directory;
  const projectHash = hashString(projectIdentifier);
  
  return {
    user: `opencode_user_${userHash}`,
    project: `opencode_project_${projectHash}`,
  };
}
