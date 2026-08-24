import { createProject, createSession, appendSessionEvent } from "/Users/nksv_ilya/Documents/GitHub/osnova-foundation/osnova-core/packages/project/src/index.js";
import path from "node:path";

const root = path.join(process.env.HOME, "osnova-markdown-demo");
const project = await createProject({ rootPath: root, id: "markdown-demo", name: "markdown-demo", formatVersion: "0.2" });
const session = await createSession(project, { title: "Markdown check" });
await appendSessionEvent(root, session.id, {
  type: "user-message",
  data: { content: "Покажи markdown: **жирный**, список и код." }
});
await appendSessionEvent(root, session.id, {
  type: "assistant-message",
  data: {
    content: [
      "## Промежуточный итог",
      "",
      "Установлено следующее:",
      "",
      "- пункт с **жирным** текстом",
      "- пункт с `inline code`",
      "",
      "```ts",
      "const answer: number = 42;",
      "```"
    ].join("\n"),
    providerId: "demo",
    model: "demo"
  }
});
console.log("seeded", root);
