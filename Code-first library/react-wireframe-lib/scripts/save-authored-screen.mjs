import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import Ajv2020 from "ajv/dist/2020.js";

const root = process.cwd();
const catalogPath = path.resolve(root, "../semantic-contract/catalog/semantic-components.json");
const schemaPath = path.resolve(root, "../semantic-contract/schema/screen-instance.schema.json");
const outputDirDefault = path.resolve(root, "../semantic-contract/catalog/screens");

function getArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1 || index + 1 >= process.argv.length) {
    return undefined;
  }
  return process.argv[index + 1];
}

function slug(value) {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60) || "authored_screen";
}

function walkNodes(node, visit) {
  visit(node);
  if (Array.isArray(node.children)) {
    node.children.forEach((child) => walkNodes(child, visit));
  }
}

async function main() {
  const fromPathArg = getArg("--from");
  if (!fromPathArg) {
    console.error("Missing --from. Example: npm run workflow:save -- --from ~/Downloads/my-screen.screen.json");
    process.exit(1);
  }

  const outDirArg = getArg("--out-dir");
  const outDir = outDirArg ? path.resolve(root, outDirArg) : outputDirDefault;
  const fromPath = path.resolve(fromPathArg.replace(/^~\//, `${process.env.HOME || ""}/`));

  const [catalogRaw, schemaRaw, screenRaw] = await Promise.all([
    readFile(catalogPath, "utf8"),
    readFile(schemaPath, "utf8"),
    readFile(fromPath, "utf8"),
  ]);

  const catalog = JSON.parse(catalogRaw);
  const schema = JSON.parse(schemaRaw);
  const screen = JSON.parse(screenRaw);

  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const validateScreen = ajv.compile(schema);

  if (!validateScreen(screen)) {
    console.error(`Screen schema validation failed: ${ajv.errorsText(validateScreen.errors)}`);
    process.exit(1);
  }

  const catalogById = new Map(catalog.map((component) => [component.semantic_id, component]));
  const semanticIssues = [];

  walkNodes(screen.root, (node) => {
    const component = catalogById.get(node.semantic_id);
    if (!component) {
      semanticIssues.push(`${node.instance_id}: unknown semantic_id ${node.semantic_id}`);
      return;
    }

    if (!component.states.includes(node.state)) {
      semanticIssues.push(
        `${node.instance_id}: invalid state ${node.state} for ${node.semantic_id}; allowed: ${component.states.join(", ")}`,
      );
    }
  });

  if (semanticIssues.length > 0) {
    console.error("Screen semantic validation failed:");
    semanticIssues.forEach((issue) => console.error(`- ${issue}`));
    process.exit(1);
  }

  const screenId = slug(screen.screen_id || screen.name);
  const outputPath = path.join(outDir, `${screenId}.screen.json`);

  await mkdir(outDir, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(screen, null, 2)}\n`, "utf8");

  console.log(`Saved authored screen: ${outputPath}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
