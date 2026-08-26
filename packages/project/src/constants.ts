export const MANIFEST_FILE = "queryn.json";
export const NOTES_DIR = "notes";
export const ASSETS_DIR = "assets";
export const QUERYN_DIR = ".queryn";
export const ARTIFACTS_DIR = "artifacts";
export const SESSIONS_DIR = "sessions";
export const RELATIONS_DIR = "relations";
export const QUERYN_PROJECT_DIRS = [NOTES_DIR, ASSETS_DIR, ARTIFACTS_DIR, SESSIONS_DIR, RELATIONS_DIR, QUERYN_DIR] as const;
export const RESERVED_PROJECT_ENTRIES = new Set([
  MANIFEST_FILE,
  NOTES_DIR,
  ASSETS_DIR,
  ARTIFACTS_DIR,
  SESSIONS_DIR,
  RELATIONS_DIR,
  QUERYN_DIR
]);
