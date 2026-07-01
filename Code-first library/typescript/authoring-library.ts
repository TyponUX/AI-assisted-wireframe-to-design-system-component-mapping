import type {
  SemanticComponent,
  SemanticNode,
  SemanticScreen,
  SlotDefinition,
  SlotType,
} from "./semantic-contract";

type CreateNodeInput = {
  instance_id: string;
  semantic_id: string;
  state: string;
  props?: Record<string, unknown>;
  children?: SemanticNode[];
  variant?: string;
  intent?: string;
};

type CreateComponentInput = {
  semantic_id: string;
  category: SemanticComponent["category"];
  subcategory: string;
  role: string;
  slots: Record<string, SlotDefinition>;
  states: string[];
  behavior: string[];
  constraints?: Record<string, unknown>;
  notes?: string;
};

type CreateScreenInput = {
  screen_id: string;
  name: string;
  root: SemanticNode;
  hypothesis?: string;
};

export function createSlotDefinition(
  type: SlotType,
  required = false,
  repeatable = false,
): SlotDefinition {
  return {
    type,
    required,
    repeatable,
  };
}

export function createSemanticComponent(input: CreateComponentInput): SemanticComponent {
  return {
    semantic_id: input.semantic_id,
    category: input.category,
    subcategory: input.subcategory,
    role: input.role,
    slots: input.slots,
    states: input.states,
    behavior: input.behavior,
    constraints: input.constraints || {},
    notes: input.notes,
  };
}

export function createSemanticNode(input: CreateNodeInput): SemanticNode {
  return {
    instance_id: input.instance_id,
    semantic_id: input.semantic_id,
    state: input.state,
    variant: input.variant,
    intent: input.intent,
    props: input.props || {},
    children: input.children,
  };
}

export function createSemanticScreen(input: CreateScreenInput): SemanticScreen {
  return {
    screen_id: input.screen_id,
    name: input.name,
    hypothesis: input.hypothesis,
    root: input.root,
  };
}

export function serializeSemanticScreen(screen: SemanticScreen): string {
  return JSON.stringify(screen, null, 2);
}

export function parseSemanticScreen(serialized: string): SemanticScreen {
  return JSON.parse(serialized) as SemanticScreen;
}

export function validateSemanticComponents(components: unknown[]): string[] {
  const errors: string[] = [];

  for (const component of components) {
    if (typeof component !== "object" || component === null) {
      errors.push("component unknown_component: value must be an object");
      continue;
    }

    const typed = component as Record<string, unknown>;
    const componentId = typeof typed.semantic_id === "string" ? typed.semantic_id : "unknown_component";

    const requiredFields = [
      "semantic_id",
      "category",
      "subcategory",
      "role",
      "slots",
      "states",
      "behavior",
      "constraints",
    ];

    for (const field of requiredFields) {
      if (!(field in typed)) {
        errors.push(`component ${componentId}: missing required field ${field}`);
      }
    }

    if (!Array.isArray(typed.states) || typed.states.length === 0) {
      errors.push(`component ${componentId}: states must be a non-empty array`);
    }

    if (!Array.isArray(typed.behavior) || typed.behavior.length === 0) {
      errors.push(`component ${componentId}: behavior must be a non-empty array`);
    }

    if (typeof typed.slots !== "object" || typed.slots === null) {
      errors.push(`component ${componentId}: slots must be an object`);
    }
  }

  return errors;
}

export function validateSemanticScreen(screen: unknown): string[] {
  const errors: string[] = [];

  if (typeof screen !== "object" || screen === null) {
    return ["screen unknown_screen: value must be an object"];
  }

  const typed = screen as Record<string, unknown>;
  const screenId = typeof typed.screen_id === "string" ? typed.screen_id : "unknown_screen";

  if (typeof typed.screen_id !== "string") {
    errors.push(`screen ${screenId}: missing screen_id`);
  }

  if (typeof typed.name !== "string") {
    errors.push(`screen ${screenId}: missing name`);
  }

  if (typeof typed.root !== "object" || typed.root === null) {
    errors.push(`screen ${screenId}: missing root node`);
  }

  return errors;
}

export function validateScreenStatesAgainstCatalog(
  screen: SemanticScreen,
  components: SemanticComponent[],
): string[] {
  const errors: string[] = [];
  const byId = new Map(components.map((component) => [component.semantic_id, component]));

  function visit(node: SemanticNode): void {
    const definition = byId.get(node.semantic_id);
    if (!definition) {
      errors.push(`${node.instance_id}: unknown semantic_id ${node.semantic_id}`);
    } else if (!definition.states.includes(node.state)) {
      errors.push(
        `${node.instance_id}: invalid state ${node.state} for ${node.semantic_id}; allowed ${definition.states.join(", ")}`,
      );
    }

    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        visit(child);
      }
    }
  }

  visit(screen.root);
  return errors;
}
