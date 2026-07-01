import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import Ajv2020 from "ajv/dist/2020.js";

const root = process.cwd();

const catalogPath = path.resolve(root, "../semantic-contract/catalog/semantic-components.json");
const flowPath = path.resolve(root, "../semantic-contract/catalog/starter-flow.onboarding.json");
const authoredScreensDirPath = path.resolve(root, "../semantic-contract/catalog/screens");
const componentSchemaPath = path.resolve(root, "../semantic-contract/schema/semantic-component.schema.json");
const screenSchemaPath = path.resolve(root, "../semantic-contract/schema/screen-instance.schema.json");
const contractVersionPath = path.resolve(root, "../semantic-contract/contract-version.json");
const rendererPath = path.resolve(root, "src/semantic/renderer.tsx");
const stateCoveragePath = path.resolve(root, "src/semantic/renderer-state-coverage.json");
const mappingDirPath = path.resolve(root, "../mapping");
const adapterSchemaPath = path.resolve(root, "../mapping/adapter-contract.schema.json");
const adapterCompatibilityPath = path.resolve(root, "../mapping/adapter-compatibility.matrix.json");

function getCaseBlock(rendererSource, semanticId) {
  const escaped = semanticId.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = new RegExp(`case "${escaped}":[\\s\\S]*?(?=case "|default:)`, "m");
  const match = rendererSource.match(pattern);
  return match ? match[0] : null;
}

function walkNodes(node, visit) {
  visit(node);
  if (Array.isArray(node.children)) {
    node.children.forEach((child) => walkNodes(child, visit));
  }
}

function summarize(label, items) {
  if (items.length === 0) {
    console.log(`PASS ${label}`);
  } else {
    console.log(`FAIL ${label}`);
    items.forEach((item) => console.log(`  - ${item}`));
  }
}

function parseSemver(version) {
  const match = String(version).match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    return null;
  }

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function supportsContract(contractVersion, range) {
  const contract = parseSemver(contractVersion);
  if (!contract) {
    return false;
  }

  const caretMatch = String(range).match(/^\^(\d+)\.(\d+)\.(\d+)$/);
  if (!caretMatch) {
    return false;
  }

  const min = {
    major: Number(caretMatch[1]),
    minor: Number(caretMatch[2]),
    patch: Number(caretMatch[3]),
  };

  if (contract.major !== min.major) {
    return false;
  }

  if (contract.minor < min.minor) {
    return false;
  }

  if (contract.minor === min.minor && contract.patch < min.patch) {
    return false;
  }

  return true;
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const requiredSubcategoriesByCategory = {
  layout: ["containers", "composition"],
  navigation: ["global", "local", "hierarchy", "flow_navigation"],
  input: ["text_entry", "selection", "specialized"],
  action: ["buttons", "menu_actions"],
  data: ["collections", "summaries", "status"],
  feedback: ["inline", "transient", "progress"],
  overlay: ["blocking", "anchored", "contextual"],
  flow: ["progression"],
};

async function main() {
  const authoredScreenEntries = await readdir(authoredScreensDirPath, { withFileTypes: true }).catch(() => []);
  const [
    catalogRaw,
    flowRaw,
    componentSchemaRaw,
    screenSchemaRaw,
    contractVersionRaw,
    rendererSource,
    stateCoverageRaw,
    adapterSchemaRaw,
    adapterCompatibilityRaw,
    mappingEntries,
  ] = await Promise.all([
    readFile(catalogPath, "utf8"),
    readFile(flowPath, "utf8"),
    readFile(componentSchemaPath, "utf8"),
    readFile(screenSchemaPath, "utf8"),
    readFile(contractVersionPath, "utf8"),
    readFile(rendererPath, "utf8"),
    readFile(stateCoveragePath, "utf8"),
    readFile(adapterSchemaPath, "utf8"),
    readFile(adapterCompatibilityPath, "utf8"),
    readdir(mappingDirPath, { withFileTypes: true }),
  ]);

  const catalog = JSON.parse(catalogRaw);
  const flow = JSON.parse(flowRaw);
  const componentSchema = JSON.parse(componentSchemaRaw);
  const screenSchema = JSON.parse(screenSchemaRaw);
  const contractVersion = JSON.parse(contractVersionRaw);
  const stateCoverage = JSON.parse(stateCoverageRaw);
  const adapterSchema = JSON.parse(adapterSchemaRaw);
  const adapterCompatibility = JSON.parse(adapterCompatibilityRaw);
  const authoredScreenFiles = authoredScreenEntries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) => fileName.endsWith(".screen.json"));

  const adapterFiles = mappingEntries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) => fileName.startsWith("client-adapter.") && fileName.endsWith(".json"))
    .filter((fileName) => !fileName.includes("template"));

  const catalogById = new Map(catalog.map((component) => [component.semantic_id, component]));

  const contractIssues = [];
  const rendererIssues = [];
  const flowIssues = [];
  const functionalityIssues = [];
  const adapterIssues = [];
  const schemaIssues = [];
  const versioningIssues = [];
  const categoryGapWarnings = [];
  const authoredScreenIssues = [];

  const ajv = new Ajv2020({ allErrors: true, strict: false });
  const validateComponent = ajv.compile(componentSchema);
  const validateScreen = ajv.compile(screenSchema);
  const validateAdapter = ajv.compile(adapterSchema);

  if (!Array.isArray(catalog)) {
    schemaIssues.push("semantic catalog must be an array");
  }

  if (!isObject(contractVersion) || typeof contractVersion.semantic_contract_version !== "string") {
    versioningIssues.push("contract-version.json must define semantic_contract_version");
  }

  if (!isObject(adapterCompatibility) || !isObject(adapterCompatibility.adapters)) {
    versioningIssues.push("adapter-compatibility.matrix.json must define adapters map");
  }

  for (const component of catalog) {
    if (!validateComponent(component)) {
      schemaIssues.push(
        `${component.semantic_id || "unknown-component"} fails semantic-component.schema.json: ${ajv.errorsText(validateComponent.errors)}`,
      );
    }
  }

  if (adapterFiles.length === 0) {
    adapterIssues.push("no client adapter files found in mapping directory");
  }

  for (const component of catalog) {
    if (!Array.isArray(component.states) || component.states.length === 0) {
      contractIssues.push(`${component.semantic_id} must define at least one state`);
    }

    if (typeof component.subcategory !== "string" || component.subcategory.length === 0) {
      contractIssues.push(`${component.semantic_id} must define subcategory`);
    }
    if (!Array.isArray(component.behavior) || component.behavior.length === 0) {
      contractIssues.push(`${component.semantic_id} must define at least one behavior`);
    }

    if (!Array.isArray(component.interaction?.events) || component.interaction.events.length === 0) {
      contractIssues.push(`${component.semantic_id} must define interaction.events`);
    }

    if (!component.accessibility || typeof component.accessibility.aria_role !== "string") {
      contractIssues.push(`${component.semantic_id} must define accessibility.aria_role`);
    }

    if (!Array.isArray(component.accessibility?.keyboard) || component.accessibility.keyboard.length === 0) {
      contractIssues.push(`${component.semantic_id} must define accessibility.keyboard`);
    }

    if (!component.responsive || !Array.isArray(component.responsive.breakpoints) || component.responsive.breakpoints.length === 0) {
      contractIssues.push(`${component.semantic_id} must define responsive.breakpoints`);
    }

    if (!component.i18n || typeof component.i18n.text_direction !== "string") {
      contractIssues.push(`${component.semantic_id} must define i18n.text_direction`);
    }

    const caseBlock = getCaseBlock(rendererSource, component.semantic_id);
    if (!caseBlock) {
      rendererIssues.push(`${component.semantic_id} has no renderer case`);
      continue;
    }

    const declaredStates = component.states;
    const coveredStates = Array.isArray(stateCoverage[component.semantic_id])
      ? stateCoverage[component.semantic_id]
      : [];
    for (const state of declaredStates) {
      if (!coveredStates.includes(state)) {
        functionalityIssues.push(
          `${component.semantic_id} declares state ${state} but renderer-state-coverage.json does not include it`,
        );
      }
    }
  }

  const byCategory = new Map();
  for (const component of catalog) {
    const category = component.category;
    const subcategory = component.subcategory;
    if (!byCategory.has(category)) {
      byCategory.set(category, new Map());
    }
    const subMap = byCategory.get(category);
    subMap.set(subcategory, (subMap.get(subcategory) || 0) + 1);
  }

  for (const [category, requiredSubcategories] of Object.entries(requiredSubcategoriesByCategory)) {
    const subMap = byCategory.get(category) || new Map();
    for (const subcategory of requiredSubcategories) {
      if (!subMap.has(subcategory)) {
        categoryGapWarnings.push(`${category}.${subcategory} has no components`);
      }
    }
  }

  for (const adapterFileName of adapterFiles) {
    const adapterPath = path.resolve(mappingDirPath, adapterFileName);
    const adapterRaw = await readFile(adapterPath, "utf8");
    const adapter = JSON.parse(adapterRaw);

    if (!validateAdapter(adapter)) {
      schemaIssues.push(`${adapterFileName} fails adapter-contract.schema.json: ${ajv.errorsText(validateAdapter.errors)}`);
      continue;
    }

    if (!Array.isArray(adapter.rules) || adapter.rules.length === 0) {
      adapterIssues.push(`${adapterFileName} must include non-empty rules array`);
      continue;
    }

    const adapterRulesBySemanticId = new Map(adapter.rules.map((rule) => [rule.source_semantic_id, rule]));

    for (const component of catalog) {
      const adapterRule = adapterRulesBySemanticId.get(component.semantic_id);
      if (!adapterRule) {
        adapterIssues.push(`${adapterFileName}: ${component.semantic_id} has no adapter rule`);
        continue;
      }

      if (!adapterRule.target || typeof adapterRule.target.component !== "string" || typeof adapterRule.target.import !== "string") {
        adapterIssues.push(`${adapterFileName}: ${component.semantic_id} must define target.component and target.import`);
      }

      if (!adapterRule.fallback || typeof adapterRule.fallback.component !== "string" || typeof adapterRule.fallback.reason !== "string") {
        adapterIssues.push(`${adapterFileName}: ${component.semantic_id} must define fallback.component and fallback.reason`);
      }

      if (!Array.isArray(adapterRule.fallback_chain) || adapterRule.fallback_chain.length === 0) {
        adapterIssues.push(`${adapterFileName}: ${component.semantic_id} must define fallback_chain`);
      }

      if (typeof adapterRule.confidence !== "number" || adapterRule.confidence < 0 || adapterRule.confidence > 1) {
        adapterIssues.push(`${adapterFileName}: ${component.semantic_id} confidence must be between 0 and 1`);
      }

      for (const state of component.states) {
        const mappedState = adapterRule.state_map?.[state];
        if (!mappedState || typeof mappedState.target_state !== "string") {
          adapterIssues.push(`${adapterFileName}: ${component.semantic_id} state ${state} is not mapped in state_map`);
        }
      }

      for (const [slotName, slotDefinition] of Object.entries(component.slots)) {
        if (slotDefinition.required && !adapterRule.slot_map?.[slotName]) {
          adapterIssues.push(`${adapterFileName}: ${component.semantic_id} required slot ${slotName} missing in slot_map`);
        }
      }
    }

    for (const sourceSemanticId of adapterRulesBySemanticId.keys()) {
      if (!catalogById.has(sourceSemanticId)) {
        adapterIssues.push(`${adapterFileName}: adapter rule for unknown semantic_id ${sourceSemanticId}`);
      }
    }

    const versionEntry = adapterCompatibility.adapters?.[adapterFileName];
    if (!versionEntry) {
      versioningIssues.push(`${adapterFileName} missing from adapter-compatibility.matrix.json`);
      continue;
    }

    if (!supportsContract(contractVersion.semantic_contract_version, versionEntry.supports)) {
      versioningIssues.push(
        `${adapterFileName} supports ${versionEntry.supports}, incompatible with semantic contract ${contractVersion.semantic_contract_version}`,
      );
    }
  }

  const expectedSnippets = {
    "input.select": "<select",
    "input.text_field": "<input",
    "input.checkbox": "type=\"checkbox\"",
    "action.button_primary": "<button",
    "action.button_secondary": "<button",
    "data.table": "<table",
    "flow.stepper": "<ol",
  };

  for (const [semanticId, snippet] of Object.entries(expectedSnippets)) {
    const caseBlock = getCaseBlock(rendererSource, semanticId);
    if (!caseBlock || !caseBlock.includes(snippet)) {
      functionalityIssues.push(`${semanticId} expected snippet ${snippet} not found in renderer case`);
    }
  }

  walkNodes(flow.root, (node) => {
    const component = catalogById.get(node.semantic_id);
    if (!component) {
      flowIssues.push(`${node.instance_id} references unknown semantic_id ${node.semantic_id}`);
      return;
    }

    if (!component.states.includes(node.state)) {
      flowIssues.push(
        `${node.instance_id} uses invalid state ${node.state} for ${node.semantic_id}; allowed states: ${component.states.join(", ")}`,
      );
    }
  });

  for (const authoredScreenFile of authoredScreenFiles) {
    const authoredScreenPath = path.resolve(authoredScreensDirPath, authoredScreenFile);
    const authoredScreenRaw = await readFile(authoredScreenPath, "utf8");
    const authoredScreen = JSON.parse(authoredScreenRaw);

    if (!validateScreen(authoredScreen)) {
      authoredScreenIssues.push(
        `${authoredScreenFile} fails screen-instance.schema.json: ${ajv.errorsText(validateScreen.errors)}`,
      );
      continue;
    }

    walkNodes(authoredScreen.root, (node) => {
      const component = catalogById.get(node.semantic_id);
      if (!component) {
        authoredScreenIssues.push(
          `${authoredScreenFile}: ${node.instance_id} references unknown semantic_id ${node.semantic_id}`,
        );
        return;
      }

      if (!component.states.includes(node.state)) {
        authoredScreenIssues.push(
          `${authoredScreenFile}: ${node.instance_id} uses invalid state ${node.state} for ${node.semantic_id}; allowed states: ${component.states.join(", ")}`,
        );
      }
    });
  }

  console.log("\nSemantic Contract Check\n");
  summarize("Contract completeness", contractIssues);
  summarize("Renderer coverage", rendererIssues);
  summarize("Functional rendering checks", functionalityIssues);
  summarize("Schema validation", schemaIssues);
  summarize("Adapter contract coverage", adapterIssues);
  summarize("Version compatibility", versioningIssues);
  summarize("Category gap warnings", categoryGapWarnings);
  summarize("Starter flow compatibility", flowIssues);
  summarize("Authored screens compatibility", authoredScreenIssues);

  const totalFailures =
    contractIssues.length +
    rendererIssues.length +
    functionalityIssues.length +
    schemaIssues.length +
    adapterIssues.length +
    versioningIssues.length +
    flowIssues.length +
    authoredScreenIssues.length;

  if (totalFailures > 0) {
    console.log(`\nResult: ${totalFailures} issue(s) found.`);
    process.exit(1);
  }

  console.log("\nResult: all checks passed.");
}

main().catch((error) => {
  console.error("Contract check failed to run:", error);
  process.exit(1);
});
