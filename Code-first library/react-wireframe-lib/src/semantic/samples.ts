import type { SemanticComponentDefinition, SemanticNode } from "./types";

function fallbackProps(semanticId: string, state: string): Record<string, unknown> {
  switch (semanticId) {
    case "layout.page_shell":
      return { title: "Sample Page" };
    case "layout.section":
      return { title: "Sample Section" };
    case "layout.stack":
      return {};
    case "layout.inline":
      return {};
    case "navigation.top_nav":
      return { items: ["Home", "Flows", "Settings"] };
    case "navigation.side_nav":
      return { items: ["Overview", "Users", "Billing"], active_item: "Users" };
    case "navigation.tabs":
      return { items: ["Overview", "Details", "History"], active_item: "Details" };
    case "navigation.breadcrumb":
      return { items: ["Home", "Projects", "Semantic Library"] };
    case "navigation.pagination":
      return { current_page: 2, total_pages: 8 };
    case "input.text_field":
      return {
        label: "Email",
        value: state === "focused" ? "hello@example.com" : "",
        helper_text: "name@example.com",
        error_text: state === "error" ? "Invalid email format" : "",
      };
    case "input.select":
      return {
        label: "Role",
        options: ["Designer", "Engineer", "PM"],
        helper_text: state === "error" ? "Selection required" : "",
      };
    case "input.checkbox":
      return { label: "I agree to continue" };
    case "input.text_area":
      return {
        label: "Description",
        value: state === "focused" ? "Type your project summary..." : "",
        helper_text: "Max 500 characters",
        error_text: state === "error" ? "Description is required" : "",
      };
    case "input.radio_group":
      return {
        label: "Plan",
        options: ["Starter", "Pro", "Enterprise"],
        helper_text: state === "error" ? "Please choose one option" : "",
      };
    case "input.toggle_switch":
      return { label: "Enable notifications" };
    case "input.search_field":
      return {
        label: "Search",
        value: state === "focused" ? "semantic mapping" : "",
        helper_text: "Find components",
      };
    case "input.date_input":
      return {
        label: "Due date",
        value: state === "focused" ? "2026-07-01" : "",
        helper_text: "YYYY-MM-DD",
        error_text: state === "error" ? "Invalid date" : "",
      };
    case "input.file_input":
      return {
        label: "Attachment",
        helper_text: "Max 10MB",
        file_name: state === "selected" ? "wireframe-spec.pdf" : "",
      };
    case "action.button_primary":
      return { label: "Primary Action" };
    case "action.button_secondary":
      return { label: "Secondary Action" };
    case "action.icon_button":
      return { label: "Add", icon: "+" };
    case "action.menu_item":
      return { label: "Open settings", shortcut: "Cmd+," };
    case "data.card":
      return {
        title: "Card Title",
        body: state === "empty" ? "" : "Short card summary content",
      };
    case "data.table":
      return {
        columns: ["Name", "Status"],
        rows: state === "empty" ? [] : ["Alpha - Active", "Beta - Pending"],
      };
    case "data.list":
      return {
        items: state === "empty" ? [] : ["Wireframe audit", "State mapping", "Adapter review"],
      };
    case "feedback.alert":
      return { message: `This is a ${state} alert` };
    case "data.badge":
      return { label: state === "neutral" ? "Draft" : state.toUpperCase() };
    case "data.key_value_list":
      return {
        items:
          state === "empty"
            ? []
            : ["Owner: Nadja", "Status: In Progress", "Version: 0.2.0"],
      };
    case "feedback.empty_state":
      return { title: "Nothing here yet", message: "Create your first item to continue" };
    case "feedback.inline_error":
      return { message: "This field is required" };
    case "feedback.loading_indicator":
      return { label: "Loading content" };
    case "feedback.progress_bar":
      return {
        label: "Upload Progress",
        value: state === "complete" ? 100 : state === "indeterminate" ? -1 : 45,
      };
    case "feedback.toast":
      return { title: "Sync", message: `This is a ${state} toast` };
    case "overlay.modal":
      return { title: "Confirm Action" };
    case "overlay.tooltip":
      return { message: "Helpful context hint" };
    case "overlay.popover":
      return { title: "Quick Actions" };
    case "overlay.drawer":
      return { title: "Filters" };
    case "overlay.context_menu":
      return { items: ["Edit", "Duplicate", "Archive"] };
    case "flow.stepper":
      return { steps: ["Step 1", "Step 2", "Step 3"], active_step: 2 };
    default:
      return {};
  }
}

function sampleChildren(semanticId: string): SemanticNode[] | undefined {
  if (semanticId === "layout.page_shell") {
    return [
      {
        instance_id: "sample-shell-nav",
        semantic_id: "navigation.top_nav",
        state: "default",
        props: { items: ["Home", "About", "Help"] },
      },
      {
        instance_id: "sample-shell-section",
        semantic_id: "layout.section",
        state: "default",
        props: { title: "Main Content" },
        children: [
          {
            instance_id: "sample-shell-field",
            semantic_id: "input.text_field",
            state: "default",
            props: { label: "Name", value: "" },
          },
        ],
      },
    ];
  }

  if (semanticId === "layout.section") {
    return [
      {
        instance_id: "sample-section-field",
        semantic_id: "input.text_field",
        state: "default",
        props: { label: "Section Field", value: "" },
      },
    ];
  }

  if (semanticId === "layout.stack") {
    return [
      {
        instance_id: "sample-stack-field",
        semantic_id: "input.text_field",
        state: "default",
        props: { label: "Stacked field", value: "" },
      },
      {
        instance_id: "sample-stack-button",
        semantic_id: "action.button_primary",
        state: "default",
        props: { label: "Continue" },
      },
    ];
  }

  if (semanticId === "layout.inline") {
    return [
      {
        instance_id: "sample-inline-secondary",
        semantic_id: "action.button_secondary",
        state: "default",
        props: { label: "Cancel" },
      },
      {
        instance_id: "sample-inline-primary",
        semantic_id: "action.button_primary",
        state: "default",
        props: { label: "Save" },
      },
    ];
  }

  if (semanticId === "overlay.modal") {
    return [
      {
        instance_id: "sample-modal-alert",
        semantic_id: "feedback.alert",
        state: "info",
        props: { message: "Modal content area" },
      },
    ];
  }

  if (semanticId === "overlay.context_menu") {
    return [
      {
        instance_id: "sample-context-item",
        semantic_id: "action.menu_item",
        state: "default",
        props: { label: "Rename", shortcut: "R" },
      },
    ];
  }

  return undefined;
}

export function buildSampleNode(component: SemanticComponentDefinition): SemanticNode {
  const primaryState = component.states[0] || "default";

  return buildSampleNodeForState(component, primaryState);
}

export function buildSampleNodeForState(
  component: SemanticComponentDefinition,
  state: string,
): SemanticNode {
  return {
    instance_id: `sample-${component.semantic_id.replace(/\./g, "-")}-${state}`,
    semantic_id: component.semantic_id,
    state,
    props: fallbackProps(component.semantic_id, state),
    children: sampleChildren(component.semantic_id),
  };
}
