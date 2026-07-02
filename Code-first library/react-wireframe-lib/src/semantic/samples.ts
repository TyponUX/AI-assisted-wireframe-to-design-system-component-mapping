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
    case "action.float_button":
      return { label: "Quick Add", icon: "+" };
    case "layout.divider":
      return { label: "Section divider" };
    case "layout.grid":
    case "layout.masonry":
      return {};
    case "layout.splitter":
      return {};
    case "layout.affix":
      return { label: state === "stuck" ? "Pinned" : "Floating" };
    case "layout.border_beam":
      return { label: state === "active" ? "Active Beam" : "Idle Beam" };
    case "navigation.anchor":
      return { items: ["Overview", "Details", "Activity"], active_item: "Details" };
    case "navigation.menu":
      return { items: ["Dashboard", "Issues", "Reports"], active_item: "Issues" };
    case "overlay.dropdown":
      return { items: ["Rename", "Duplicate", "Archive"] };
    case "overlay.tour":
      return { steps: ["Intro", "Navigation", "Metrics"], active_step: 2 };
    case "overlay.popconfirm":
      return { title: "Delete item?", message: "This action cannot be undone." };
    case "input.autocomplete":
      return {
        label: "Assignee",
        value: state === "focused" ? "Na" : "",
        options: ["Nadja", "Nina", "Nate"],
      };
    case "input.cascader":
      return { label: "Location", options: ["Europe", "Switzerland", "Zurich"] };
    case "input.color_picker":
      return { label: "Accent Color", value: "#0ea5e9" };
    case "input.form":
      return { title: "Profile Form" };
    case "input.number_input":
      return { label: "Story Points", value: 8 };
    case "input.mentions":
      return { label: "Comment", value: "Assign to @nadja" };
    case "input.rate":
      return { label: "Satisfaction", value: 4 };
    case "input.slider":
      return { label: "Confidence", value: 70, min: 0, max: 100 };
    case "input.time_input":
      return { label: "Reminder", value: "09:30" };
    case "input.transfer":
      return {
        label: "Assigned Teams",
        source_items: ["Design", "Marketing"],
        target_items: ["Engineering"],
      };
    case "input.tree_select":
      return { label: "Category", options: ["Product", "Roadmap", "Q3"] };
    case "input.segmented_control":
      return { label: "View", options: ["Daily", "Weekly", "Monthly"], value: "Weekly" };
    case "data.avatar":
      return { label: "NS" };
    case "data.calendar":
      return { active_date: "2026-07-02", events: ["Release", "Review"] };
    case "data.carousel":
      return {};
    case "data.image":
      return { src: "hero.png", alt: "Hero visual", caption: "Q3 Campaign" };
    case "data.qr_code":
      return { value: "https://example.com/invite", label: "Invite Link" };
    case "data.icon":
      return { name: "check-circle", label: "Success" };
    case "data.typography":
      return { text: "Dashboard headline", variant: "heading" };
    case "data.timeline":
      return { items: state === "empty" ? [] : ["Created", "Reviewed", "Shipped"] };
    case "data.tree":
      return { nodes: state === "empty" ? [] : ["Root", "Child", "Leaf"] };
    case "data.collapse":
      return {};
    case "data.card":
      return {
        title: "Card Title",
        body: state === "empty" ? "" : "Short card summary content",
      };
    case "data.metric":
    case "data.metric_tile":
      return {
        label: "Open Tickets",
        value: state === "empty" ? "-" : 128,
        context: "Compared to last week",
        trend: state === "empty" ? "" : "+12%",
      };
    case "data.chart_bar":
      return {
        title: "Priority Distribution",
        series:
          state === "empty"
            ? []
            : [
                { label: "High", value: 12 },
                { label: "Medium", value: 24 },
                { label: "Low", value: 18 },
              ],
      };
    case "data.chart_donut":
      return {
        title: "Priority Share",
        series:
          state === "empty"
            ? []
            : [
                { label: "High", value: 20 },
                { label: "Medium", value: 50 },
                { label: "Low", value: 30 },
              ],
      };
    case "data.trend_indicator":
      return {
        label: "Weekly Trend",
        direction: state,
        value: state === "neutral" ? "0%" : state === "up" ? "+6%" : "-4%",
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
    case "feedback.result":
      return { title: `${state.toUpperCase()} Result`, message: "Operation completed" };
    case "feedback.skeleton":
      return { label: "Loading widget" };
    case "feedback.notification":
      return { title: "System Notification", message: `This is a ${state} notification` };
    case "feedback.message":
      return { message: `This is a ${state} message` };
    case "feedback.watermark":
      return { label: "CONFIDENTIAL" };
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
    case "flow.app_context":
      return { app_name: "Semantic Workbench" };
    case "flow.config_provider":
      return { config: { locale: "en-US", density: "comfortable" } };
    case "flow.utility":
      return { meta: { source: "prototype" } };
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
