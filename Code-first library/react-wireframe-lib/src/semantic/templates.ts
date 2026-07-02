import { starterFlow } from "./contract";
import type { SemanticNode, SemanticScreen } from "./types";

export type PageTemplate = {
  id: string;
  name: string;
  description: string;
  buildRoot: () => SemanticNode;
};

function cloneNode(node: SemanticNode): SemanticNode {
  return JSON.parse(JSON.stringify(node)) as SemanticNode;
}

const onboardingTemplate: PageTemplate = {
  id: "onboarding-account-setup",
  name: "Onboarding Account Setup",
  description: "Starter onboarding flow with form fields and progress stepper.",
  buildRoot: () => cloneNode(starterFlow.root),
};

const dashboardTemplate: PageTemplate = {
  id: "dashboard-overview",
  name: "Dashboard Overview",
  description: "Overview layout with KPI tiles, trend indicator, and priority charts.",
  buildRoot: () => ({
    instance_id: "template-dashboard-root",
    semantic_id: "layout.page_shell",
    state: "default",
    props: { title: "Dashboard" },
    children: [
      {
        instance_id: "template-dashboard-nav",
        semantic_id: "navigation.top_nav",
        state: "default",
        props: { items: ["Overview", "Reports", "Settings"] },
      },
      {
        instance_id: "template-dashboard-section",
        semantic_id: "layout.section",
        state: "default",
        props: { title: "KPI Snapshot" },
        children: [
          {
            instance_id: "template-dashboard-cards",
            semantic_id: "layout.inline",
            state: "wrap",
            props: {},
            children: [
              {
                instance_id: "template-dashboard-metric1",
                semantic_id: "data.metric_tile",
                state: "default",
                props: {
                  label: "Open Tickets",
                  value: 42,
                  context: "Last 7 days",
                  trend: "+8%",
                },
              },
              {
                instance_id: "template-dashboard-metric2",
                semantic_id: "data.metric",
                state: "default",
                props: {
                  label: "SLA Breaches",
                  value: 5,
                  context: "This week",
                  trend: "-2",
                },
              },
              {
                instance_id: "template-dashboard-metric3",
                semantic_id: "data.trend_indicator",
                state: "up",
                props: {
                  label: "Resolution Rate",
                  direction: "up",
                  value: "+6%",
                },
              },
            ],
          },
          {
            instance_id: "template-dashboard-charts",
            semantic_id: "layout.inline",
            state: "wrap",
            props: {},
            children: [
              {
                instance_id: "template-dashboard-bar",
                semantic_id: "data.chart_bar",
                state: "default",
                props: {
                  title: "Priority Distribution",
                  series: [
                    { label: "High", value: 12 },
                    { label: "Medium", value: 24 },
                    { label: "Low", value: 18 },
                  ],
                },
              },
              {
                instance_id: "template-dashboard-donut",
                semantic_id: "data.chart_donut",
                state: "default",
                props: {
                  title: "Priority Share",
                  series: [
                    { label: "High", value: 20 },
                    { label: "Medium", value: 50 },
                    { label: "Low", value: 30 },
                  ],
                },
              },
            ],
          },
          {
            instance_id: "template-dashboard-table",
            semantic_id: "data.table",
            state: "default",
            props: {
              columns: ["Project", "Status"],
              rows: ["Alpha - Active", "Beta - Pending"],
            },
          },
        ],
      },
    ],
  }),
};

const settingsTemplate: PageTemplate = {
  id: "settings-panel",
  name: "Settings Panel",
  description: "Preferences form with grouped inputs and save actions.",
  buildRoot: () => ({
    instance_id: "template-settings-root",
    semantic_id: "layout.page_shell",
    state: "default",
    props: { title: "Settings" },
    children: [
      {
        instance_id: "template-settings-nav",
        semantic_id: "navigation.side_nav",
        state: "default",
        props: { items: ["Profile", "Notifications", "Security"], active_item: "Notifications" },
      },
      {
        instance_id: "template-settings-content",
        semantic_id: "layout.section",
        state: "default",
        props: { title: "Notification Preferences" },
        children: [
          {
            instance_id: "template-settings-stack",
            semantic_id: "layout.stack",
            state: "default",
            props: {},
            children: [
              {
                instance_id: "template-settings-field",
                semantic_id: "input.text_field",
                state: "default",
                props: { label: "Email", value: "" },
              },
              {
                instance_id: "template-settings-toggle",
                semantic_id: "input.toggle_switch",
                state: "on",
                props: { label: "Receive weekly summary" },
              },
              {
                instance_id: "template-settings-actions",
                semantic_id: "layout.inline",
                state: "default",
                props: {},
                children: [
                  {
                    instance_id: "template-settings-cancel",
                    semantic_id: "action.button_secondary",
                    state: "default",
                    props: { label: "Cancel" },
                  },
                  {
                    instance_id: "template-settings-save",
                    semantic_id: "action.button_primary",
                    state: "default",
                    props: { label: "Save Changes" },
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  }),
};

export const pageTemplates: PageTemplate[] = [
  onboardingTemplate,
  dashboardTemplate,
  settingsTemplate,
];

export function buildScreenFromTemplate(
  template: PageTemplate,
  screenId: string,
  name: string,
  intentAnnotation: string,
  stateAnnotation: string,
): SemanticScreen {
  const root = template.buildRoot();

  root.props = {
    ...root.props,
    intent_annotation: intentAnnotation,
    state_annotation: stateAnnotation,
    template_id: template.id,
  };

  return {
    screen_id: screenId,
    name,
    hypothesis: `${template.name} authored screen`,
    root,
  };
}
