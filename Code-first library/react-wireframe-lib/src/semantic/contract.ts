import componentCatalogRaw from "../../../semantic-contract/catalog/semantic-components.json";
import starterFlowRaw from "../../../semantic-contract/catalog/starter-flow.onboarding.json";
import type { SemanticComponentDefinition, SemanticScreen } from "./types";

export const componentCatalog = componentCatalogRaw as unknown as SemanticComponentDefinition[];
export const starterFlow = starterFlowRaw as unknown as SemanticScreen;

export const componentCatalogById = new Map(
  componentCatalog.map((component) => [component.semantic_id, component]),
);
