export type SemanticCategory =
  | "layout"
  | "navigation"
  | "input"
  | "action"
  | "data"
  | "feedback"
  | "overlay"
  | "flow";

export type SlotType = "text" | "node" | "action" | "list" | "media" | "meta";

export interface SlotDefinition {
  required: boolean;
  type: SlotType;
  repeatable?: boolean;
}

export interface InteractionDefinition {
  events: string[];
  async?: boolean;
}

export interface AccessibilityDefinition {
  aria_role: string;
  keyboard: string[];
  live_region?: "none" | "polite" | "assertive";
}

export interface ResponsiveDefinition {
  supports_compact: boolean;
  breakpoints: Array<"xs" | "sm" | "md" | "lg" | "xl">;
}

export interface I18nDefinition {
  text_direction: "ltr" | "rtl" | "both";
  locale_sensitive_slots: string[];
  truncation: "wrap" | "truncate" | "clip";
}

export interface SemanticComponent {
  semantic_id: string;
  category: SemanticCategory;
  subcategory: string;
  role: string;
  slots: Record<string, SlotDefinition>;
  states: string[];
  behavior: string[];
  constraints: Record<string, unknown>;
  interaction?: InteractionDefinition;
  accessibility?: AccessibilityDefinition;
  responsive?: ResponsiveDefinition;
  i18n?: I18nDefinition;
  notes?: string;
}

export interface SemanticNode {
  instance_id: string;
  semantic_id: string;
  state: string;
  variant?: string;
  intent?: string;
  props: Record<string, unknown>;
  children?: SemanticNode[];
}

export interface SemanticScreen {
  screen_id: string;
  name: string;
  hypothesis?: string;
  root: SemanticNode;
}

export interface MappingRule {
  source_semantic_id: string;
  target_component: string;
  variant_map?: Record<string, string>;
  slot_map: Record<string, string>;
  state_map: Record<string, string>;
  fallback: string;
  conditions?: string[];
  confidence?: number;
}

export interface ClientAdapter {
  client_id: string;
  design_system: string;
  version: string;
  rules: MappingRule[];
}

export type AdapterTransform =
  | "direct"
  | "text_to_children"
  | "node_passthrough"
  | "list_passthrough"
  | "meta_passthrough"
  | "enum_map"
  | "boolean_invert"
  | "compose_props";

export interface AdapterTarget {
  component: string;
  import: string;
}

export interface AdapterSlotMapEntry {
  to: string;
  transform?: AdapterTransform;
}

export interface AdapterStateMapping {
  target_state: string;
  props?: Record<string, unknown>;
  conditions?: string[];
}

export interface AdapterFallback {
  component: string;
  reason: string;
}

export interface AdapterRule {
  source_semantic_id: string;
  target: AdapterTarget;
  slot_map: Record<string, AdapterSlotMapEntry>;
  state_map: Record<string, AdapterStateMapping>;
  fallback: AdapterFallback;
  fallback_chain?: string[];
  confidence?: number;
  notes?: string;
}

export interface AdapterContract {
  client_id: string;
  design_system: string;
  version: string;
  rules: AdapterRule[];
}

export interface ContractVersion {
  semantic_contract_version: string;
  released_at: string;
}

export interface AdapterCompatibilityMatrix {
  semantic_contract_version: string;
  adapters: Record<
    string,
    {
      adapter_version: string;
      supports: string;
    }
  >;
}

export type TypographyRoleName =
  | "display"
  | "heading_l"
  | "heading_m"
  | "heading_s"
  | "body_l"
  | "body_m"
  | "body_s"
  | "label"
  | "caption";

export interface TypographyRoleValue {
  font_size_px: number;
  line_height_px: number;
  font_weight: 400 | 500 | 600 | 700;
}

export interface TypographyRoleDefinition {
  desktop: TypographyRoleValue;
  mobile: TypographyRoleValue;
}

export interface TypographyRoleMap {
  name: "semantic_typography_role_map";
  version: string;
  description?: string;
  base_font_family: string;
  mobile_breakpoint_px: number;
  weights: {
    regular: 400;
    medium: 500;
    semibold: 600;
    bold: 700;
  };
  roles: Record<TypographyRoleName, TypographyRoleDefinition>;
}

export interface TypographyAllocationEntry {
  component_default: TypographyRoleName;
  title_role: TypographyRoleName;
  slots: Record<string, TypographyRoleName>;
}

export interface TypographyAllocationMatrix {
  name: "semantic_typography_allocation_matrix";
  version: string;
  description?: string;
  supported_roles: TypographyRoleName[];
  default_component_role: TypographyRoleName;
  allocations: Record<string, TypographyAllocationEntry>;
}
