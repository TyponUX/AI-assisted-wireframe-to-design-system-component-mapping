import "./App.css";
import { useMemo, useState } from "react";
import { starterFlow } from "./semantic/contract";
import { NodeRenderer } from "./semantic/renderer";
import { validateContracts } from "./semantic/validate";
import { componentCatalog } from "./semantic/contract";
import { buildSampleNode, buildSampleNodeForState } from "./semantic/samples";
import { buildScreenFromTemplate, pageTemplates } from "./semantic/templates";
import rendererStateCoverage from "./semantic/renderer-state-coverage.json";
import baselineAdapter from "../../mapping/client-adapter.baseline.json";
import enterpriseAdapter from "../../mapping/client-adapter.enterprise.json";
import type { SemanticNode } from "./semantic/types";

type AdapterContractRule = {
  source_semantic_id: string;
  target: { component: string; import: string };
  state_map: Record<string, { target_state?: string } | undefined>;
  fallback_chain?: string[];
  confidence?: number;
};

type AdapterContractFile = {
  client_id: string;
  design_system: string;
  version: string;
  rules: AdapterContractRule[];
};

const adapterRegistry: AdapterContractFile[] = [
  baselineAdapter as AdapterContractFile,
  enterpriseAdapter as AdapterContractFile,
];

function walkNodes(node: SemanticNode, visit: (node: SemanticNode) => void): void {
  visit(node);
  if (Array.isArray(node.children)) {
    node.children.forEach((child) => walkNodes(child, visit));
  }
}

function toScreenId(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60) || "authored_screen";
}

function App() {
  const [mode, setMode] = useState<"flow" | "matrix" | "authoring">("matrix");
  const [matrixFilter, setMatrixFilter] = useState<"default" | "all">("default");
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [activeSubcategory, setActiveSubcategory] = useState<string>("all");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(pageTemplates[0]?.id || "");
  const [authoredScreenName, setAuthoredScreenName] = useState<string>("New Authored Screen");
  const [intentAnnotation, setIntentAnnotation] = useState<string>("rapid_prototype");
  const [stateAnnotation, setStateAnnotation] = useState<string>("draft");
  const [selectedAdapterId, setSelectedAdapterId] = useState<string>(adapterRegistry[0]?.client_id || "");
  const [exportNotice, setExportNotice] = useState<string>("");
  const errors = validateContracts(componentCatalog, starterFlow);
  const selectedTemplate = useMemo(
    () => pageTemplates.find((template) => template.id === selectedTemplateId) || pageTemplates[0]!,
    [selectedTemplateId],
  );
  const authoredScreen = useMemo(
    () =>
      buildScreenFromTemplate(
        selectedTemplate,
        toScreenId(authoredScreenName),
        authoredScreenName,
        intentAnnotation,
        stateAnnotation,
      ),
    [authoredScreenName, intentAnnotation, selectedTemplate, stateAnnotation],
  );
  const authoredScreenValidationErrors = useMemo(
    () => validateContracts(componentCatalog, authoredScreen),
    [authoredScreen],
  );
  const selectedAdapter = useMemo(
    () => adapterRegistry.find((adapter) => adapter.client_id === selectedAdapterId) || adapterRegistry[0]!,
    [selectedAdapterId],
  );
  const authoredScreenNodes = useMemo(() => {
    const nodes: SemanticNode[] = [];
    walkNodes(authoredScreen.root, (node) => nodes.push(node));
    return nodes;
  }, [authoredScreen]);
  const adapterCoverage = useMemo(() => {
    const rulesBySemanticId = new Map(selectedAdapter.rules.map((rule) => [rule.source_semantic_id, rule]));
    const mappedNodeRows: Array<{
      instance_id: string;
      semantic_id: string;
      state: string;
      target_component: string;
      target_import: string;
      target_state: string;
      fallback_chain: string;
      confidence: string;
    }> = [];
    const missingNodeMappings: Array<{ instance_id: string; semantic_id: string }> = [];
    const missingStateMappings: Array<{ instance_id: string; semantic_id: string; state: string }> = [];

    for (const node of authoredScreenNodes) {
      const rule = rulesBySemanticId.get(node.semantic_id);
      if (!rule) {
        missingNodeMappings.push({
          instance_id: node.instance_id,
          semantic_id: node.semantic_id,
        });
        continue;
      }

      const stateMapping = rule.state_map?.[node.state];
      if (!stateMapping?.target_state) {
        missingStateMappings.push({
          instance_id: node.instance_id,
          semantic_id: node.semantic_id,
          state: node.state,
        });
        continue;
      }

      mappedNodeRows.push({
        instance_id: node.instance_id,
        semantic_id: node.semantic_id,
        state: node.state,
        target_component: rule.target.component,
        target_import: rule.target.import,
        target_state: stateMapping.target_state,
        fallback_chain: Array.isArray(rule.fallback_chain) && rule.fallback_chain.length > 0 ? rule.fallback_chain.join(" -> ") : "n/a",
        confidence: typeof rule.confidence === "number" ? `${Math.round(rule.confidence * 100)}%` : "n/a",
      });
    }

    const catalogUnmapped = componentCatalog
      .filter((component) => !rulesBySemanticId.has(component.semantic_id))
      .map((component) => component.semantic_id);

    const catalogStateGaps = componentCatalog.flatMap((component) => {
      const rule = rulesBySemanticId.get(component.semantic_id);
      if (!rule) {
        return [];
      }

      return component.states
        .filter((state) => !rule.state_map?.[state]?.target_state)
        .map((state) => `${component.semantic_id}.${state}`);
    });

    return {
      mappedNodeRows,
      missingNodeMappings,
      missingStateMappings,
      catalogUnmapped,
      catalogStateGaps,
    };
  }, [authoredScreenNodes, selectedAdapter]);
  const authoredScreenJson = useMemo(() => JSON.stringify(authoredScreen, null, 2), [authoredScreen]);
  const authoredScreenFileName = `${authoredScreen.screen_id}.screen.json`;

  function handleExportAuthoredScreen(): void {
    const blob = new Blob([authoredScreenJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = authoredScreenFileName;
    anchor.click();
    URL.revokeObjectURL(url);
    setExportNotice(
      `Downloaded ${authoredScreenFileName}. Run: npm run workflow:save -- --from ~/Downloads/${authoredScreenFileName}`,
    );
  }
  const stateMatrix = useMemo(
    () =>
      componentCatalog.map((component) => ({
        component,
        states:
          matrixFilter === "default"
            ? [{ state: component.states[0] || "default", node: buildSampleNode(component) }]
            : component.states.map((state) => ({
                state,
                node: buildSampleNodeForState(component, state),
              })),
      })),
    [matrixFilter],
  );
  const coverageMismatches = useMemo(
    () =>
      componentCatalog
        .map((component) => {
          const coveredStates = Array.isArray(
            rendererStateCoverage[component.semantic_id as keyof typeof rendererStateCoverage],
          )
            ? rendererStateCoverage[component.semantic_id as keyof typeof rendererStateCoverage]
            : [];
          const missingStates = component.states.filter((state) => !coveredStates.includes(state));
          return {
            semanticId: component.semantic_id,
            missingStates,
          };
        })
        .filter((entry) => entry.missingStates.length > 0),
    [],
  );
  const mismatchBySemanticId = useMemo(
    () =>
      Object.fromEntries(coverageMismatches.map((entry) => [entry.semanticId, entry.missingStates])) as Record<
        string,
        string[]
      >,
    [coverageMismatches],
  );
  const matrixByCategory = useMemo(() => {
    const groups = new Map<string, typeof stateMatrix>();

    for (const entry of stateMatrix) {
      const category = entry.component.category;
      const existing = groups.get(category);
      if (existing) {
        existing.push(entry);
      } else {
        groups.set(category, [entry]);
      }
    }

    return Array.from(groups.entries()).map(([category, entries]) => ({
      category,
      entries,
    }));
  }, [stateMatrix]);

  const matrixByCategoryAndSubcategory = useMemo(
    () =>
      matrixByCategory.map((categoryGroup) => {
        const subMap = new Map<string, typeof categoryGroup.entries>();
        for (const entry of categoryGroup.entries) {
          const subcategory = entry.component.subcategory || "general";
          const existing = subMap.get(subcategory);
          if (existing) {
            existing.push(entry);
          } else {
            subMap.set(subcategory, [entry]);
          }
        }

        return {
          category: categoryGroup.category,
          subgroups: Array.from(subMap.entries()).map(([subcategory, entries]) => ({
            subcategory,
            entries,
          })),
        };
      }),
    [matrixByCategory],
  );

  const visibleMatrixGroups = useMemo(
    () =>
      activeCategory === "all"
        ? matrixByCategoryAndSubcategory
        : matrixByCategoryAndSubcategory.filter((group) => group.category === activeCategory),
    [activeCategory, matrixByCategoryAndSubcategory],
  );

  const visibleMatrixGroupsBySubcategory = useMemo(
    () =>
      visibleMatrixGroups
        .map((group) => ({
          ...group,
          subgroups:
            activeSubcategory === "all"
              ? group.subgroups
              : group.subgroups.filter((subgroup) => subgroup.subcategory === activeSubcategory),
        }))
        .filter((group) => group.subgroups.length > 0),
    [activeSubcategory, visibleMatrixGroups],
  );


  return (
    <main className="wf-app">
      <header className="wf-app-header">
        <h1>Semantic Wireframe Renderer</h1>
        <p>Build neutral workflows, validate semantic coverage, and map them to client adapters.</p>
      </header>

      <section className="wf-mode-toggle" aria-label="View mode">
        <button
          type="button"
          className={mode === "flow" ? "wf-toggle is-active" : "wf-toggle"}
          onClick={() => setMode("flow")}
        >
          Flow Preview
        </button>
        <button
          type="button"
          className={mode === "matrix" ? "wf-toggle is-active" : "wf-toggle"}
          onClick={() => setMode("matrix")}
        >
          State Matrix
        </button>
        <button
          type="button"
          className={mode === "authoring" ? "wf-toggle is-active" : "wf-toggle"}
          onClick={() => setMode("authoring")}
        >
          Workflow Composer
        </button>
      </section>

      <section
        className={
          coverageMismatches.length > 0 ? "wf-coverage-banner wf-coverage-banner-error" : "wf-coverage-banner"
        }
        aria-live="polite"
      >
        <strong>Renderer State Coverage:</strong>{" "}
        {coverageMismatches.length > 0
          ? `${coverageMismatches.length} component(s) have missing state mappings`
          : "in sync with declared contract states"}
      </section>

      {coverageMismatches.length > 0 ? (
        <section className="wf-coverage-missing" aria-live="assertive">
          <h2>Missing State Coverage</h2>
          <ul>
            {coverageMismatches.map((entry) => (
              <li key={entry.semanticId}>
                <strong>{entry.semanticId}</strong>: {entry.missingStates.join(", ")}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {errors.length > 0 ? (
        <section className="wf-errors" aria-live="assertive">
          <h2>Contract Validation Errors</h2>
          <ul>
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </section>
      ) : mode === "flow" ? (
        <section className="wf-canvas">
          <h2 className="wf-section-title">Flow: onboarding.account_setup</h2>
          <NodeRenderer node={starterFlow.root} />
        </section>
      ) : mode === "matrix" ? (
        <section className="wf-canvas">
          <div className="wf-matrix-toolbar">
            <h2 className="wf-section-title">State Matrix</h2>
            <div className="wf-matrix-filters" role="group" aria-label="State matrix filter">
              <button
                type="button"
                className={matrixFilter === "default" ? "wf-filter is-active" : "wf-filter"}
                onClick={() => setMatrixFilter("default")}
              >
                Default Only
              </button>
              <button
                type="button"
                className={matrixFilter === "all" ? "wf-filter is-active" : "wf-filter"}
                onClick={() => setMatrixFilter("all")}
              >
                All States
              </button>
            </div>
          </div>
          <div className="wf-matrix-layout">
            <aside className="wf-matrix-nav" aria-label="State matrix categories">
              <button
                type="button"
                className={activeCategory === "all" ? "wf-category-button is-active" : "wf-category-button"}
                onClick={() => {
                  setActiveCategory("all");
                  setActiveSubcategory("all");
                }}
              >
                All Categories ({stateMatrix.length})
              </button>
              {matrixByCategoryAndSubcategory.map((group) => (
                <div className="wf-category-group" key={group.category}>
                  <button
                    type="button"
                    className={
                      activeCategory === group.category && activeSubcategory === "all"
                        ? "wf-category-button is-active"
                        : "wf-category-button"
                    }
                    onClick={() => {
                      setActiveCategory(group.category);
                      setActiveSubcategory("all");
                    }}
                  >
                    {group.category} ({group.subgroups.reduce((sum, subgroup) => sum + subgroup.entries.length, 0)})
                  </button>
                  <div className="wf-subcategory-list">
                    {group.subgroups.map((subgroup) => (
                      <button
                        type="button"
                        key={`${group.category}-${subgroup.subcategory}`}
                        className={
                          activeCategory === group.category && activeSubcategory === subgroup.subcategory
                            ? "wf-subcategory-button is-active"
                            : "wf-subcategory-button"
                        }
                        onClick={() => {
                          setActiveCategory(group.category);
                          setActiveSubcategory(subgroup.subcategory);
                        }}
                      >
                        {subgroup.subcategory} ({subgroup.entries.length})
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </aside>
            <div className="wf-matrix-stack">
              {visibleMatrixGroupsBySubcategory.map((group) => (
                <section className="wf-matrix-category" key={group.category}>
                  <h3 className="wf-matrix-category-title">{group.category}</h3>
                  {group.subgroups.map((subgroup) => (
                    <div className="wf-matrix-subgroup" key={`${group.category}-${subgroup.subcategory}`}>
                      <h4 className="wf-matrix-subcategory-title">{subgroup.subcategory}</h4>
                      {subgroup.entries.map(({ component, states }) => (
                        <article className="wf-matrix-row" key={component.semantic_id}>
                          <header className="wf-matrix-header">
                            <strong>{component.semantic_id}</strong>
                            <span>{component.role}</span>
                            {mismatchBySemanticId[component.semantic_id] ? (
                              <span className="wf-matrix-warning">
                                Missing: {mismatchBySemanticId[component.semantic_id].join(", ")}
                              </span>
                            ) : null}
                          </header>
                          <div className="wf-matrix-grid">
                            {states.map(({ state, node }) => (
                              <div className="wf-matrix-cell" key={`${component.semantic_id}-${state}`}>
                                <div className="wf-matrix-label">{state}</div>
                                <NodeRenderer node={node} />
                              </div>
                            ))}
                          </div>
                        </article>
                      ))}
                    </div>
                  ))}
                </section>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className="wf-canvas">
          <h2 className="wf-section-title">Workflow Composer</h2>
          <div className="wf-authoring-layout">
            <aside className="wf-authoring-panel">
              <h3>Template Registry</h3>
              <div className="wf-authoring-template-list">
                {pageTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    className={selectedTemplate.id === template.id ? "wf-template-button is-active" : "wf-template-button"}
                    onClick={() => setSelectedTemplateId(template.id)}
                  >
                    <strong>{template.name}</strong>
                    <span>{template.description}</span>
                  </button>
                ))}
              </div>
              <h3>Workflow Composition</h3>
              <label className="wf-field">
                <span>Screen Name</span>
                <input
                  className="wf-input"
                  value={authoredScreenName}
                  onChange={(event) => setAuthoredScreenName(event.target.value)}
                />
              </label>
              <label className="wf-field">
                <span>Intent Annotation</span>
                <input
                  className="wf-input"
                  value={intentAnnotation}
                  onChange={(event) => setIntentAnnotation(event.target.value)}
                />
              </label>
              <label className="wf-field">
                <span>State Annotation</span>
                <input
                  className="wf-input"
                  value={stateAnnotation}
                  onChange={(event) => setStateAnnotation(event.target.value)}
                />
              </label>
              <label className="wf-field">
                <span>Target Adapter</span>
                <select
                  className="wf-input"
                  value={selectedAdapter.client_id}
                  onChange={(event) => setSelectedAdapterId(event.target.value)}
                >
                  {adapterRegistry.map((adapter) => (
                    <option key={adapter.client_id} value={adapter.client_id}>
                      {adapter.design_system} ({adapter.client_id})
                    </option>
                  ))}
                </select>
              </label>
              <div className="wf-authoring-meta">
                <strong>Generated screen_id:</strong> {authoredScreen.screen_id}
              </div>
              <div className="wf-authoring-meta">
                <strong>Mapped workflow nodes:</strong> {adapterCoverage.mappedNodeRows.length}/{authoredScreenNodes.length}
                <br />
                <strong>Unmapped workflow nodes:</strong> {adapterCoverage.missingNodeMappings.length}
                <br />
                <strong>State mapping gaps:</strong> {adapterCoverage.missingStateMappings.length}
                <br />
                <strong>Catalog unmapped semantics:</strong> {adapterCoverage.catalogUnmapped.length}
                <br />
                <strong>Catalog state gaps:</strong> {adapterCoverage.catalogStateGaps.length}
              </div>
              <div className="wf-authoring-actions">
                <button type="button" className="wf-button wf-button-primary" onClick={handleExportAuthoredScreen}>
                  Export JSON
                </button>
                <p className="wf-authoring-help">
                  Save into semantic catalog: <code>npm run workflow:save -- --from ~/Downloads/{authoredScreenFileName}</code>
                </p>
                {exportNotice ? <p className="wf-authoring-notice">{exportNotice}</p> : null}
              </div>
              {adapterCoverage.missingNodeMappings.length > 0 ? (
                <div className="wf-authoring-errors">
                  <strong>Unmapped workflow semantic nodes</strong>
                  <ul>
                    {adapterCoverage.missingNodeMappings.map((entry) => (
                      <li key={`${entry.instance_id}-${entry.semantic_id}`}>
                        {entry.instance_id}: {entry.semantic_id}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {adapterCoverage.missingStateMappings.length > 0 ? (
                <div className="wf-authoring-errors">
                  <strong>Workflow state mapping gaps</strong>
                  <ul>
                    {adapterCoverage.missingStateMappings.map((entry) => (
                      <li key={`${entry.instance_id}-${entry.semantic_id}-${entry.state}`}>
                        {entry.instance_id}: {entry.semantic_id}.{entry.state}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {adapterCoverage.catalogUnmapped.length > 0 ? (
                <div className="wf-authoring-errors">
                  <strong>Catalog semantics missing in adapter</strong>
                  <ul>
                    {adapterCoverage.catalogUnmapped.slice(0, 8).map((semanticId) => (
                      <li key={semanticId}>{semanticId}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {authoredScreenValidationErrors.length > 0 ? (
                <div className="wf-authoring-errors">
                  <strong>Validation</strong>
                  <ul>
                    {authoredScreenValidationErrors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="wf-authoring-ok">Template output is valid.</div>
              )}
            </aside>
            <div className="wf-authoring-preview">
              <article>
                <h3>Live Screen Preview</h3>
                <NodeRenderer node={authoredScreen.root} />
              </article>
              <article>
                <h3>Serialized Screen JSON</h3>
                <pre className="wf-authoring-json">{authoredScreenJson}</pre>
              </article>
              <article>
                <h3>Adapter Mapping Preview ({selectedAdapter.design_system})</h3>
                <pre className="wf-authoring-json">
                  {JSON.stringify(
                    adapterCoverage.mappedNodeRows.map((row) => ({
                      instance_id: row.instance_id,
                      semantic: `${row.semantic_id}.${row.state}`,
                      maps_to: `${row.target_component}.${row.target_state}`,
                      import: row.target_import,
                      fallback_chain: row.fallback_chain,
                      confidence: row.confidence,
                    })),
                    null,
                    2,
                  )}
                </pre>
              </article>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

export default App;
