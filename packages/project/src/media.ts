import path from "node:path";
import type {
  FileCapabilities,
  FilePreviewKind,
  FileTypeRegistryEntry,
  FileTypeConfidence,
  FileTypeDescriptor
} from "@queryn/types";

type FileTypeDefinition = FileTypeRegistryEntry;

const editableText: FileCapabilities = { canPreview: true, canEdit: true, canRead: true };
const readableText: FileCapabilities = { canPreview: true, canEdit: false, canRead: true };
const readableBinary: FileCapabilities = { canPreview: false, canEdit: false, canRead: true };

function definition(
  mediaType: string,
  previewKind: FilePreviewKind,
  iconKey: string,
  capabilities: FileCapabilities,
  languageId?: string
): FileTypeDefinition {
  return { mediaType, previewKind, iconKey, capabilities, languageId };
}

const text = (mediaType: string, languageId?: string): FileTypeDefinition =>
  definition(mediaType, languageId ? "code" : "text", languageId ? "file-code" : "file-text", editableText, languageId);

/**
 * Filename registry used by both asset lists and preview selection.
 * Keys are normalized lowercase extensions, including the leading dot.
 */
export const FILE_TYPE_REGISTRY: Readonly<Record<string, FileTypeDefinition>> = {
  ".md": definition("text/markdown", "markdown", "file-markdown", editableText, "markdown"),
  ".markdown": definition("text/markdown", "markdown", "file-markdown", editableText, "markdown"),
  ".mdown": definition("text/markdown", "markdown", "file-markdown", editableText, "markdown"),
  ".txt": text("text/plain"),
  ".text": text("text/plain"),
  ".log": text("text/plain"),
  ".json": definition("application/json", "json", "file-json", editableText, "json"),
  ".jsonl": definition("application/x-ndjson", "json", "file-json", editableText, "json"),
  ".ndjson": definition("application/x-ndjson", "json", "file-json", editableText, "json"),
  ".ipynb": definition("application/x-ipynb+json", "json", "file-notebook", editableText, "json"),
  ".xml": definition("application/xml", "xml", "file-xml", editableText, "xml"),
  ".xsd": definition("application/xml", "xml", "file-xml", editableText, "xml"),
  ".xsl": definition("application/xml", "xml", "file-xml", editableText, "xml"),
  ".xslt": definition("application/xml", "xml", "file-xml", editableText, "xml"),
  ".svg": definition("image/svg+xml", "image", "file-image", readableText, "xml"),
  ".yaml": definition("application/yaml", "text", "file-yaml", editableText, "yaml"),
  ".yml": definition("application/yaml", "text", "file-yaml", editableText, "yaml"),
  ".toml": definition("application/toml", "text", "file-config", editableText, "toml"),
  ".ini": definition("text/plain", "text", "file-config", editableText, "ini"),
  ".conf": definition("text/plain", "text", "file-config", editableText, "ini"),
  ".env": definition("text/plain", "text", "file-config", editableText, "shellscript"),
  ".csv": definition("text/csv", "table", "file-table", editableText, "csv"),
  ".tsv": definition("text/tab-separated-values", "table", "file-table", editableText, "tsv"),

  ".html": definition("text/html", "html", "file-html", editableText, "html"),
  ".htm": definition("text/html", "html", "file-html", editableText, "html"),
  ".css": text("text/css", "css"),
  ".scss": text("text/x-scss", "scss"),
  ".sass": text("text/x-sass", "sass"),
  ".less": text("text/x-less", "less"),
  ".js": text("text/javascript", "javascript"),
  ".jsx": text("text/javascript", "javascriptreact"),
  ".mjs": text("text/javascript", "javascript"),
  ".cjs": text("text/javascript", "javascript"),
  ".ts": text("text/typescript", "typescript"),
  ".tsx": text("text/typescript", "typescriptreact"),
  ".py": text("text/x-python", "python"),
  ".pyw": text("text/x-python", "python"),
  ".java": text("text/x-java-source", "java"),
  ".c": text("text/x-c", "c"),
  ".h": text("text/x-c", "c"),
  ".cc": text("text/x-c++", "cpp"),
  ".cp": text("text/x-c++", "cpp"),
  ".cpp": text("text/x-c++", "cpp"),
  ".cxx": text("text/x-c++", "cpp"),
  ".c++": text("text/x-c++", "cpp"),
  ".hh": text("text/x-c++", "cpp"),
  ".hpp": text("text/x-c++", "cpp"),
  ".hxx": text("text/x-c++", "cpp"),
  ".cs": text("text/x-csharp", "csharp"),
  ".rs": text("text/x-rust", "rust"),
  ".go": text("text/x-go", "go"),
  ".kt": text("text/x-kotlin", "kotlin"),
  ".kts": text("text/x-kotlin", "kotlin"),
  ".swift": text("text/x-swift", "swift"),
  ".dart": text("text/x-dart", "dart"),
  ".rb": text("text/x-ruby", "ruby"),
  ".rake": text("text/x-ruby", "ruby"),
  ".php": text("text/x-php", "php"),
  ".sql": text("application/sql", "sql"),
  ".r": text("text/x-r", "r"),
  ".scala": text("text/x-scala", "scala"),
  ".lua": text("text/x-lua", "lua"),
  ".pl": text("text/x-perl", "perl"),
  ".pm": text("text/x-perl", "perl"),
  ".ex": text("text/x-elixir", "elixir"),
  ".exs": text("text/x-elixir", "elixir"),
  ".erl": text("text/x-erlang", "erlang"),
  ".hrl": text("text/x-erlang", "erlang"),
  ".fs": text("text/x-fsharp", "fsharp"),
  ".fsx": text("text/x-fsharp", "fsharp"),
  ".vue": text("text/x-vue", "vue"),
  ".svelte": text("text/x-svelte", "svelte"),
  ".astro": text("text/x-astro", "astro"),
  ".graphql": text("application/graphql", "graphql"),
  ".gql": text("application/graphql", "graphql"),
  ".proto": text("text/plain", "protobuf"),
  ".tex": text("text/x-tex", "latex"),
  ".sty": text("text/x-tex", "latex"),
  ".clj": text("text/x-clojure", "clojure"),
  ".cljs": text("text/x-clojure", "clojure"),
  ".groovy": text("text/x-groovy", "groovy"),
  ".gradle": text("text/x-groovy", "groovy"),
  ".m": text("text/x-objective-c", "objective-c"),
  ".mm": text("text/x-objective-c++", "objective-cpp"),
  ".sol": text("text/x-solidity", "solidity"),
  ".vim": text("text/x-vim", "viml"),
  ".mk": text("text/x-makefile", "makefile"),
  ".rst": text("text/x-rst", "rst"),
  ".adoc": text("text/asciidoc", "asciidoc"),
  ".dockerfile": text("text/plain", "dockerfile"),
  ".makefile": text("text/x-makefile", "makefile"),
  ".sh": text("application/x-sh", "shellscript"),
  ".bash": text("application/x-sh", "shellscript"),
  ".zsh": text("application/x-sh", "shellscript"),
  ".fish": text("application/x-sh", "shellscript"),
  ".ps1": text("text/x-powershell", "powershell"),
  ".bat": text("application/x-bat", "bat"),
  ".cmd": text("application/x-bat", "bat"),

  ".pdf": definition("application/pdf", "pdf", "file-pdf", readableText),
  ".parquet": definition("application/vnd.apache.parquet", "table", "file-database", readableBinary),
  ".xlsx": definition("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "spreadsheet", "file-spreadsheet", readableBinary),
  ".xls": definition("application/vnd.ms-excel", "spreadsheet", "file-spreadsheet", readableBinary),
  ".xlsm": definition("application/vnd.ms-excel.sheet.macroEnabled.12", "spreadsheet", "file-spreadsheet", readableBinary),
  ".docx": definition("application/vnd.openxmlformats-officedocument.wordprocessingml.document", "document", "file-document", readableBinary),
  ".doc": definition("application/msword", "document", "file-document", readableBinary),
  ".pptx": definition("application/vnd.openxmlformats-officedocument.presentationml.presentation", "presentation", "file-presentation", readableBinary),
  ".ppt": definition("application/vnd.ms-powerpoint", "presentation", "file-presentation", readableBinary),

  ".png": definition("image/png", "image", "file-image", readableText),
  ".apng": definition("image/apng", "image", "file-image", readableText),
  ".jpg": definition("image/jpeg", "image", "file-image", readableText),
  ".jpeg": definition("image/jpeg", "image", "file-image", readableText),
  ".gif": definition("image/gif", "image", "file-image", readableText),
  ".webp": definition("image/webp", "image", "file-image", readableText),
  ".bmp": definition("image/bmp", "image", "file-image", readableText),
  ".ico": definition("image/x-icon", "image", "file-image", readableText),
  ".avif": definition("image/avif", "image", "file-image", readableText),

  ".wav": definition("audio/wav", "audio", "file-audio", readableBinary),
  ".mp3": definition("audio/mpeg", "audio", "file-audio", readableBinary),
  ".ogg": definition("audio/ogg", "audio", "file-audio", readableBinary),
  ".m4a": definition("audio/mp4", "audio", "file-audio", readableBinary),
  ".mp4": definition("video/mp4", "video", "file-video", readableBinary),
  ".webm": definition("video/webm", "video", "file-video", readableBinary),
  ".mov": definition("video/quicktime", "video", "file-video", readableBinary),

  ".zip": definition("application/zip", "archive", "file-archive", readableBinary),
  ".tar": definition("application/x-tar", "archive", "file-archive", readableBinary),
  ".gz": definition("application/gzip", "archive", "file-archive", readableBinary),
  ".bz2": definition("application/x-bzip2", "archive", "file-archive", readableBinary),
  ".7z": definition("application/x-7z-compressed", "archive", "file-archive", readableBinary),
  ".rar": definition("application/vnd.rar", "archive", "file-archive", readableBinary),
  ".wasm": definition("application/wasm", "binary", "file-binary", readableBinary)
};

const MIME_TYPE_REGISTRY: Readonly<Record<string, FileTypeDefinition>> = {
  ...Object.fromEntries(Object.values(FILE_TYPE_REGISTRY).map((item) => [item.mediaType, item])),
  "text/plain": text("text/plain"),
  "text/markdown": definition("text/markdown", "markdown", "file-markdown", editableText, "markdown"),
  "application/json": definition("application/json", "json", "file-json", editableText, "json"),
  "application/x-ndjson": definition("application/x-ndjson", "json", "file-json", editableText, "json"),
  "application/xml": definition("application/xml", "xml", "file-xml", editableText, "xml"),
  "text/xml": definition("text/xml", "xml", "file-xml", editableText, "xml"),
  "text/csv": definition("text/csv", "table", "file-table", editableText, "csv"),
  "text/tab-separated-values": definition("text/tab-separated-values", "table", "file-table", editableText, "tsv"),
  "text/html": definition("text/html", "html", "file-html", editableText, "html"),
  "text/css": text("text/css", "css"),
  "application/pdf": definition("application/pdf", "pdf", "file-pdf", readableText),
  "application/zip": definition("application/zip", "archive", "file-archive", readableBinary),
  "application/octet-stream": definition("application/octet-stream", "binary", "file-binary", readableBinary),
  "application/vnd.apache.parquet": definition("application/vnd.apache.parquet", "table", "file-database", readableBinary)
};

const UNKNOWN_CAPABILITIES: FileCapabilities = { canPreview: false, canEdit: false, canRead: false };

/** Return the known MIME type for a filename, preserving the legacy API. */
export function detectMediaType(filePath: string): string | undefined {
  return FILE_TYPE_REGISTRY[extractExtension(filePath)]?.mediaType;
}

/**
 * Classify a file using its extension and, when available, an inspected MIME
 * type. A mismatch deliberately falls back to the MIME-derived safe view.
 */
export function classifyFile(filePath: string, mediaType?: string): FileTypeDescriptor {
  const extension = extractExtension(filePath);
  const byExtension = FILE_TYPE_REGISTRY[extension];
  const normalizedMediaType = normalizeMediaType(mediaType);
  const byMime = normalizedMediaType ? MIME_TYPE_REGISTRY[normalizedMediaType] : undefined;

  if (!byExtension && !byMime) return unknownDescriptor(extension, normalizedMediaType);
  if (!byExtension && byMime) return toDescriptor(extension, byMime, "mime", false, normalizedMediaType);
  if (byExtension && !byMime) return toDescriptor(extension, byExtension, "extension", false, normalizedMediaType ?? byExtension.mediaType);

  if (byExtension && byMime) {
    const mismatch = !isCompatible(byExtension, byMime);
    if (mismatch) {
      return {
        ...toDescriptor(extension, byMime, "mismatch", true, normalizedMediaType),
        iconKey: "file-unknown",
        capabilities: { ...byMime.capabilities, canEdit: false }
      };
    }
    return toDescriptor(extension, byExtension, "mime", false, normalizedMediaType);
  }

  return unknownDescriptor(extension, normalizedMediaType);
}

/** Alias with a domain-oriented name for consumers that do not need the registry terminology. */
export function describeFile(filePath: string, mediaType?: string): FileTypeDescriptor {
  return classifyFile(filePath, mediaType);
}

function toDescriptor(
  extension: string,
  definitionValue: FileTypeDefinition,
  confidence: FileTypeConfidence,
  isExtensionMismatch: boolean,
  mediaType?: string
): FileTypeDescriptor {
  return {
    extension,
    mediaType: mediaType ?? definitionValue.mediaType,
    previewKind: definitionValue.previewKind,
    languageId: definitionValue.languageId,
    iconKey: definitionValue.iconKey,
    capabilities: definitionValue.capabilities,
    confidence,
    isExtensionMismatch
  };
}

function unknownDescriptor(extension: string, mediaType?: string): FileTypeDescriptor {
  return {
    extension,
    mediaType,
    previewKind: "unknown",
    iconKey: "file-unknown",
    capabilities: UNKNOWN_CAPABILITIES,
    confidence: "fallback",
    isExtensionMismatch: false
  };
}

function isCompatible(extensionDefinition: FileTypeDefinition, mimeDefinition: FileTypeDefinition): boolean {
  if (extensionDefinition.mediaType === mimeDefinition.mediaType) return true;
  if (extensionDefinition.previewKind === mimeDefinition.previewKind) return true;
  // Office containers are ZIP files internally. Keep their useful extension
  // view when the signature inspector reports the container MIME.
  if (
    ["document", "spreadsheet", "presentation"].includes(extensionDefinition.previewKind) &&
    mimeDefinition.previewKind === "archive"
  ) return true;
  // A concrete image MIME can safely replace another image MIME.
  if (extensionDefinition.previewKind === "image" && mimeDefinition.previewKind === "image") return true;
  return false;
}

function normalizeMediaType(mediaType?: string): string | undefined {
  const value = mediaType?.split(";", 1)[0]?.trim().toLowerCase();
  return value || undefined;
}

function extractExtension(filePath: string): string {
  const basename = path.basename(filePath).toLowerCase();
  const specialName = basename === "dockerfile" ? ".dockerfile" : basename === "makefile" ? ".makefile" : undefined;
  if (specialName) return specialName;
  // path.extname("sample.c++") returns ".++", while the language registry
  // intentionally treats .c++ as a first-class extension.
  for (const extension of [".c++", ".h++"]) {
    if (basename.endsWith(extension)) return extension;
  }
  const extension = path.extname(basename);
  return extension || (basename.startsWith(".") ? basename : "");
}
