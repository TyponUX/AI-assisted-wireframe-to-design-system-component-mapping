export type SemanticNode = {
  instance_id: string;
  semantic_id: string;
  state: string;
  variant?: string;
  intent?: string;
  props: Record<string, unknown>;
  children?: SemanticNode[];
};

export type SemanticScreen = {
  screen_id: string;
  name: string;
  hypothesis?: string;
  root: SemanticNode;
};

export type SemanticComponentDefinition = {
  semantic_id: string;
  category: string;
  subcategory: string;
  role: string;
  slots: Record<
    string,
    {
      required: boolean;
      type: "text" | "node" | "action" | "list" | "media" | "meta";
      repeatable?: boolean;
    }
  >;
  states: string[];
  behavior: string[];
  constraints: Record<string, unknown>;
  notes?: string;
};
