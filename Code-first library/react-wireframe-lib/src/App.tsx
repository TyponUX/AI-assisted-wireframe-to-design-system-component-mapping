import "./App.css";
import { useEffect, useMemo, useState, type CSSProperties } from "react";
import { starterFlow } from "./semantic/contract";
import { NodeRenderer } from "./semantic/renderer";
import { validateContracts } from "./semantic/validate";
import { componentCatalog } from "./semantic/contract";
import { buildSampleNode, buildSampleNodeForState } from "./semantic/samples";
import { buildScreenFromTemplate, pageTemplates } from "./semantic/templates";
import rendererStateCoverage from "./semantic/renderer-state-coverage.json";
import typographyRoleMap from "../../semantic-contract/catalog/typography-role-map.json";
import typographyAllocationMatrix from "../../semantic-contract/catalog/typography-allocation.matrix.json";
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

type TypographyRoleName =
  | "display"
  | "heading_l"
  | "heading_m"
  | "heading_s"
  | "body_l"
  | "body_m"
  | "body_s"
  | "label"
  | "caption";

type TypographyRoleValue = {
  font_size_px: number;
  line_height_px: number;
  font_weight: number;
};

type TypographyRoleDefinition = {
  desktop: TypographyRoleValue;
  mobile: TypographyRoleValue;
};

type TypographyRoleMap = {
  mobile_breakpoint_px: number;
  roles: Record<TypographyRoleName, TypographyRoleDefinition>;
  base_font_family?: string;
};

type TypographyAllocationEntry = {
  component_default: TypographyRoleName;
  title_role: TypographyRoleName;
  slots: Record<string, TypographyRoleName>;
};

type TypographyAllocationMatrix = {
  default_component_role: TypographyRoleName;
  allocations: Record<string, TypographyAllocationEntry>;
};

type FontFamilyOption = {
  label: string;
  value: string;
};

type ColorTokenUsage = {
  token: string;
  hex: string;
  usage: string;
  displayName?: string;
};

type ColorTokenValues = Record<string, string>;

const typographyRoleOrder: TypographyRoleName[] = [
  "display",
  "heading_l",
  "heading_m",
  "heading_s",
  "body_l",
  "body_m",
  "body_s",
  "label",
  "caption",
];

const colorTokenUsageMap: ColorTokenUsage[] = [
  {
    token: "--color-text-strong",
    hex: "#1d1d1d",
    usage: "Buttons and emphasized text",
    displayName: "Primary colour",
  },
  {
    token: "--color-surface-inverse",
    hex: "#222222",
    usage: "Active toggles and inverse surfaces",
    displayName: "secondary colour",
  },
  { token: "--color-surface", hex: "#ffffff", usage: "Cards, panels, primary surfaces" },
  { token: "--color-surface-subtle", hex: "#f7f7f7", usage: "Canvas and subtle backgrounds" },
  { token: "--color-surface-soft", hex: "#efefef", usage: "Buttons, controls, muted rows" },
  { token: "--color-border", hex: "#bebebe", usage: "Default component borders" },
  { token: "--color-border-subtle", hex: "#d4d4d4", usage: "Dividers and table separators" },
  { token: "--color-border-strong", hex: "#8b8b8b", usage: "Strong borders and outlines" },
  { token: "--color-text-primary", hex: "#1f1f1f", usage: "Default body text" },
  { token: "--color-text-muted", hex: "#525252", usage: "Support copy and metadata" },
  { token: "--color-success-bg", hex: "#f4f9f4", usage: "Success backgrounds" },
  { token: "--color-success-border", hex: "#6e8b6e", usage: "Success borders" },
  { token: "--color-warning-bg", hex: "#faf8f1", usage: "Warning backgrounds" },
  { token: "--color-warning-border", hex: "#9a8d68", usage: "Warning borders" },
  { token: "--color-danger-bg", hex: "#f9f3f3", usage: "Error backgrounds" },
  { token: "--color-danger-border", hex: "#9c7a7a", usage: "Error borders" },
  { token: "--color-info-bg", hex: "#f2f8fd", usage: "Info/notice backgrounds" },
  { token: "--color-info-border", hex: "#89a6be", usage: "Info/notice borders" },
];

const defaultColorTokenValues: ColorTokenValues = Object.fromEntries(
  colorTokenUsageMap.map((entry) => [entry.token, entry.hex]),
) as ColorTokenValues;

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
  const typedTypographyRoleMap = typographyRoleMap as TypographyRoleMap;
  const typedTypographyAllocationMatrix = typographyAllocationMatrix as TypographyAllocationMatrix;
  const contractBaseFontFamily = typedTypographyRoleMap.base_font_family?.trim() || "Inter, Avenir, Helvetica, Arial, sans-serif";
  const [mode, setMode] = useState<"flow" | "matrix" | "authoring" | "typography" | "typography_mapping">("matrix");
  const [selectedFontFamily, setSelectedFontFamily] = useState<string>(() => {
    if (typeof window === "undefined") {
      return contractBaseFontFamily;
    }

    const savedFontFamily = window.localStorage.getItem("wf-font-family");
    return savedFontFamily && savedFontFamily.trim().length > 0 ? savedFontFamily : contractBaseFontFamily;
  });
  const [colorTokenValues, setColorTokenValues] = useState<ColorTokenValues>(() => {
    if (typeof window === "undefined") {
      return defaultColorTokenValues;
    }

    const savedValue = window.localStorage.getItem("wf-color-token-overrides");
    if (!savedValue) {
      return defaultColorTokenValues;
    }

    try {
      const parsedValue = JSON.parse(savedValue) as ColorTokenValues;
      return {
        ...defaultColorTokenValues,
        ...parsedValue,
      };
    } catch {
      return defaultColorTokenValues;
    }
  });
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

  useEffect(() => {
    document.documentElement.style.setProperty("--font-family-base", selectedFontFamily);
    window.localStorage.setItem("wf-font-family", selectedFontFamily);
  }, [selectedFontFamily]);

  useEffect(() => {
    window.localStorage.setItem("wf-color-token-overrides", JSON.stringify(colorTokenValues));
  }, [colorTokenValues]);

  const semanticColorStyle = useMemo(
    () =>
      Object.fromEntries(Object.entries(colorTokenValues).map(([token, value]) => [token, value])) as CSSProperties,
    [colorTokenValues],
  );

  const fontFamilyOptions = useMemo(() => {
    const baseOptions: FontFamilyOption[] = [
      { label: "Contract Default", value: contractBaseFontFamily },
      { label: "Editorial Serif", value: "Georgia, 'Times New Roman', Times, serif" },
      { label: "Classic Sans", value: "'Trebuchet MS', 'Gill Sans', 'Segoe UI', sans-serif" },
      { label: "Code Sans", value: "'IBM Plex Sans', 'Segoe UI', sans-serif" },
      { label: "Humanist", value: "Optima, Candara, 'Noto Sans', sans-serif" },
      { label: "Monospace", value: "'IBM Plex Mono', 'SFMono-Regular', Consolas, monospace" },
    ];

    const optionsByValue = new Map<string, FontFamilyOption>();
    for (const option of baseOptions) {
      optionsByValue.set(option.value, option);
    }

    if (!optionsByValue.has(selectedFontFamily)) {
      optionsByValue.set(selectedFontFamily, {
        label: "Saved Custom",
        value: selectedFontFamily,
      });
    }

    return Array.from(optionsByValue.values());
  }, [contractBaseFontFamily, selectedFontFamily]);
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

  const typographyRows = useMemo(
    () =>
      typographyRoleOrder.map((role) => ({
        role,
        desktop: typedTypographyRoleMap.roles[role].desktop,
        mobile: typedTypographyRoleMap.roles[role].mobile,
      })),
    [typedTypographyRoleMap],
  );

  const typographyMappingRows = useMemo(
    () =>
      Object.entries(typedTypographyAllocationMatrix.allocations)
        .map(([semanticId, allocation]) => ({
          semanticId,
          componentDefault: allocation.component_default,
          titleRole: allocation.title_role,
          slotsSummary: Object.entries(allocation.slots)
            .map(([slot, role]) => `${slot}: ${role}`)
            .join(", "),
        }))
        .sort((a, b) => a.semanticId.localeCompare(b.semanticId)),
    [typedTypographyAllocationMatrix],
  );

  const typographyRoleUsage = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const allocation of Object.values(typedTypographyAllocationMatrix.allocations)) {
      counts[allocation.component_default] = (counts[allocation.component_default] || 0) + 1;
      counts[allocation.title_role] = (counts[allocation.title_role] || 0) + 1;
      for (const slotRole of Object.values(allocation.slots)) {
        counts[slotRole] = (counts[slotRole] || 0) + 1;
      }
    }

    return typographyRoleOrder
      .map((role) => ({ role, count: counts[role] || 0 }))
      .filter((entry) => entry.count > 0);
  }, [typedTypographyAllocationMatrix]);

  function typographyStyle(value: TypographyRoleValue): CSSProperties {
    return {
      fontSize: `${value.font_size_px}px`,
      lineHeight: `${value.line_height_px}px`,
      fontWeight: value.font_weight,
    };
  }


  return (
    <main className="wf-app">
      <header className="wf-app-header">
        <h1>Semantic Wireframe Renderer</h1>
        <p>Build neutral workflows, validate semantic coverage, and map them to client adapters.</p>
      </header>

      <section className="wf-mode-toggle" aria-label="View mode">
        <button
          type="button"
          className={mode === "matrix" ? "wf-toggle is-active" : "wf-toggle"}
          onClick={() => setMode("matrix")}
        >
          Components
        </button>
        <button
          type="button"
          className={mode === "typography" ? "wf-toggle is-active" : "wf-toggle"}
          onClick={() => setMode("typography")}
        >
          Typography Preview
        </button>
        <button
          type="button"
          className={mode === "typography_mapping" ? "wf-toggle is-active" : "wf-toggle"}
          onClick={() => setMode("typography_mapping")}
        >
          Mapping
        </button>
        <button
          type="button"
          className={mode === "flow" ? "wf-toggle is-active" : "wf-toggle"}
          onClick={() => setMode("flow")}
        >
          Flow Preview
        </button>
        <button
          type="button"
          className={mode === "authoring" ? "wf-toggle is-active" : "wf-toggle"}
          onClick={() => setMode("authoring")}
        >
          Workflow Composer
        </button>
      </section>

      <section className="wf-global-controls" aria-label="Global style controls">
        <article className="wf-font-family-control" aria-label="Global typography settings">
          <label className="wf-field">
            <span>Global Font Family</span>
            <select
              className="wf-input"
              value={selectedFontFamily}
              onChange={(event) => setSelectedFontFamily(event.target.value)}
            >
              {fontFamilyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <p className="wf-status-text">
            Applies globally via --font-family-base. Every rendered component and preview inherits this selection.
          </p>
          <p className="wf-font-preview" style={{ fontFamily: selectedFontFamily }}>
            Aa Bb Cc 0123 The quick brown fox jumps over the lazy dog.
          </p>
        </article>

        <article className="wf-color-map-panel" aria-label="Global color token mapping">
          <header className="wf-color-map-header">
            <h2 className="wf-section-title">Color Mapping</h2>
            <button
              type="button"
              className="wf-button wf-button-secondary wf-button-small"
              onClick={() => setColorTokenValues(defaultColorTokenValues)}
            >
              Reset to Default
            </button>
          </header>
          <p className="wf-status-text">Token to hex and usage in your current library UI.</p>
          <div className="wf-color-map-list">
            {colorTokenUsageMap.map((entry) => (
              <div className="wf-color-map-row" key={entry.token}>
                <span className="wf-color-swatch" style={{ background: colorTokenValues[entry.token] }} aria-hidden="true" />
                <div className="wf-color-map-meta">
                  <strong>{entry.displayName || entry.token}</strong>
                  <small className="wf-status-text">
                    {entry.token} • {colorTokenValues[entry.token]} • {entry.usage}
                  </small>
                </div>
                <div className="wf-color-map-controls">
                  <input
                    className="wf-color-input"
                    type="color"
                    value={colorTokenValues[entry.token]}
                    onChange={(event) =>
                      setColorTokenValues((prev) => ({
                        ...prev,
                        [entry.token]: event.target.value,
                      }))
                    }
                    aria-label={`Set ${entry.token}`}
                  />
                  <button
                    type="button"
                    className="wf-icon-button"
                    onClick={() =>
                      setColorTokenValues((prev) => ({
                        ...prev,
                        [entry.token]: defaultColorTokenValues[entry.token],
                      }))
                    }
                    disabled={colorTokenValues[entry.token] === defaultColorTokenValues[entry.token]}
                    title={`Reset ${entry.token}`}
                    aria-label={`Reset ${entry.token}`}
                  >
                    ↺
                  </button>
                </div>
              </div>
            ))}
          </div>
        </article>
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
          <div className="wf-semantic-scope" style={semanticColorStyle}>
            <NodeRenderer node={starterFlow.root} />
          </div>
        </section>
      ) : mode === "typography" ? (
        <section className="wf-canvas">
          <div className="wf-typography-preview" aria-label="Typography role preview">
            <div className="wf-typography-header">
              <h2 className="wf-section-title">Typography Role Preview</h2>
              <p>
                Desktop and mobile mappings from typography-role-map.json. Mobile breakpoint: {typedTypographyRoleMap.mobile_breakpoint_px}px.
              </p>
            </div>
            <div className="wf-typography-grid">
              {typographyRows.map(({ role, desktop, mobile }) => (
                <article className="wf-typography-row" key={role}>
                  <header className="wf-typography-row-header">
                    <strong>{role}</strong>
                  </header>
                  <div className="wf-typography-columns">
                    <section>
                      <div className="wf-matrix-label">Desktop</div>
                      <p style={typographyStyle(desktop)}>The quick brown fox jumps over the lazy dog.</p>
                      <small className="wf-status-text">
                        {desktop.font_size_px}px / {desktop.line_height_px}px / {desktop.font_weight}
                      </small>
                    </section>
                    <section>
                      <div className="wf-matrix-label">Mobile</div>
                      <p style={typographyStyle(mobile)}>The quick brown fox jumps over the lazy dog.</p>
                      <small className="wf-status-text">
                        {mobile.font_size_px}px / {mobile.line_height_px}px / {mobile.font_weight}
                      </small>
                    </section>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>
      ) : mode === "typography_mapping" ? (
        <section className="wf-canvas">
          <div className="wf-typography-preview" aria-label="Typography mapping overview">
            <div className="wf-typography-header">
              <h2 className="wf-section-title">Mapping</h2>
              <p>
                Source of truth: role map to CSS token layer and component allocation matrix.
              </p>
            </div>

            <article className="wf-typography-row">
              <header className="wf-typography-row-header">
                <strong>Role Map / CSS Token Layer</strong>
              </header>
              <p className="wf-status-text">
                Active base font family: {selectedFontFamily}. Contract default: {typedTypographyRoleMap.base_font_family || "n/a"}. Mobile breakpoint: {typedTypographyRoleMap.mobile_breakpoint_px}px.
              </p>
              <div className="wf-typography-columns">
                <section>
                  <div className="wf-matrix-label">Desktop Tokens</div>
                  <ul className="wf-list">
                    {typographyRows.map(({ role, desktop }) => (
                      <li key={`desktop-${role}`}>
                        <strong>{role}</strong>
                        {" -> "}
                        --type-{role.replace("_", "-")}-size: {desktop.font_size_px}px, --type-{role.replace("_", "-")}-line: {desktop.line_height_px}px, --type-{role.replace("_", "-")}-weight: {desktop.font_weight}
                      </li>
                    ))}
                  </ul>
                </section>
                <section>
                  <div className="wf-matrix-label">Mobile Tokens</div>
                  <ul className="wf-list">
                    {typographyRows.map(({ role, mobile }) => (
                      <li key={`mobile-${role}`}>
                        <strong>{role}</strong>
                        {" -> "}
                        {mobile.font_size_px}px / {mobile.line_height_px}px / {mobile.font_weight}
                      </li>
                    ))}
                  </ul>
                </section>
              </div>
            </article>

            <article className="wf-typography-row">
              <header className="wf-typography-row-header">
                <strong>Role Usage Summary</strong>
              </header>
              <div className="wf-matrix-grid">
                {typographyRoleUsage.map((entry) => (
                  <div className="wf-matrix-cell" key={entry.role}>
                    <div className="wf-matrix-label">{entry.role}</div>
                    <strong>{entry.count}</strong>
                    <small className="wf-status-text">allocations</small>
                  </div>
                ))}
              </div>
            </article>

            <article className="wf-typography-row">
              <header className="wf-typography-row-header">
                <strong>Components Mapping Overview</strong>
              </header>
              <p className="wf-status-text">
                Default component role: {typedTypographyAllocationMatrix.default_component_role}. Total mapped components: {typographyMappingRows.length}.
              </p>
              <div className="wf-authoring-json">
                {typographyMappingRows.map((row) => (
                  <div key={row.semanticId}>
                    <strong>{row.semanticId}</strong>
                    <div>component_default: {row.componentDefault}</div>
                    <div>title_role: {row.titleRole}</div>
                    <div>slots: {row.slotsSummary || "n/a"}</div>
                    <hr />
                  </div>
                ))}
              </div>
            </article>
          </div>
        </section>
      ) : mode === "matrix" ? (
        <section className="wf-canvas">
          <div className="wf-matrix-toolbar">
            <h2 className="wf-section-title">Components</h2>
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
                                <div className="wf-semantic-scope" style={semanticColorStyle}>
                                  <NodeRenderer node={node} />
                                </div>
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
                <div className="wf-semantic-scope" style={semanticColorStyle}>
                  <NodeRenderer node={authoredScreen.root} />
                </div>
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
