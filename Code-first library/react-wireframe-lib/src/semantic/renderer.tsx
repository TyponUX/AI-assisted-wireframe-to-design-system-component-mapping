import type { ReactNode } from "react";
import type { SemanticNode } from "./types";

type NodeRendererProps = {
  node: SemanticNode;
};

function stateClassName(state: string): string {
  return `is-${state.replace(/_/g, "-")}`;
}

function readText(props: Record<string, unknown>, key: string, fallback = ""): string {
  const value = props[key];
  return typeof value === "string" ? value : fallback;
}

function readStringArray(props: Record<string, unknown>, key: string): string[] {
  const value = props[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function StatusPill({ state }: { state: string }) {
  return <span className="wf-state-pill">{state}</span>;
}

function Frame({ title, children, state }: { title: string; children?: ReactNode; state: string }) {
  return (
    <section className="wf-frame">
      <header className="wf-frame-header">
        <strong>{title}</strong>
        <StatusPill state={state} />
      </header>
      <div className="wf-frame-content">{children}</div>
    </section>
  );
}

function UnknownNode({ node }: { node: SemanticNode }) {
  return (
    <Frame title={`Unknown: ${node.semantic_id}`} state={node.state}>
      <pre>{JSON.stringify(node.props, null, 2)}</pre>
    </Frame>
  );
}

function renderChildren(node: SemanticNode): ReactNode {
  return node.children?.map((child) => <NodeRenderer key={child.instance_id} node={child} />);
}

function renderNode(node: SemanticNode): ReactNode {
  switch (node.semantic_id) {
    case "layout.page_shell":
      return (
        <Frame title={readText(node.props, "title", "Page Shell")} state={node.state}>
          {renderChildren(node)}
        </Frame>
      );

    case "layout.section":
      return (
        <Frame title={readText(node.props, "title", "Section")} state={node.state}>
          {node.state === "collapsed" ? <em className="wf-status-text">Section is collapsed</em> : renderChildren(node)}
        </Frame>
      );

    case "layout.stack":
      return (
        <Frame title="Stack Layout" state={node.state}>
          <div className={node.state === "compact" ? "wf-stack is-compact" : "wf-stack"}>{renderChildren(node)}</div>
        </Frame>
      );

    case "layout.inline":
      return (
        <Frame title="Inline Layout" state={node.state}>
          <div className={node.state === "wrap" ? "wf-inline is-wrap" : "wf-inline"}>{renderChildren(node)}</div>
        </Frame>
      );

    case "navigation.top_nav":
      return (
        <Frame title="Top Navigation" state={node.state}>
          <nav className="wf-nav">
            {readStringArray(node.props, "items").map((item) => (
              <span className="wf-nav-item" key={item}>
                {item}
              </span>
            ))}
          </nav>
        </Frame>
      );

    case "navigation.side_nav": {
      const items = readStringArray(node.props, "items");
      const activeItem = readText(node.props, "active_item");

      return (
        <Frame title="Side Navigation" state={node.state}>
          {node.state === "collapsed" ? (
            <em className="wf-status-text">Side nav collapsed</em>
          ) : (
            <nav className="wf-side-nav">
              {items.map((item) => (
                <span className={item === activeItem ? "wf-nav-item is-active" : "wf-nav-item"} key={item}>
                  {item}
                </span>
              ))}
            </nav>
          )}
        </Frame>
      );
    }

    case "navigation.tabs": {
      const items = readStringArray(node.props, "items");
      const activeItem = readText(node.props, "active_item", items[0] || "");
      return (
        <Frame title="Tabs" state={node.state}>
          <nav className="wf-nav">
            {items.map((item) => (
              <span className={item === activeItem ? "wf-nav-item is-active" : "wf-nav-item"} key={item}>
                {item}
              </span>
            ))}
          </nav>
        </Frame>
      );
    }

    case "navigation.breadcrumb":
      return (
        <Frame title="Breadcrumb" state={node.state}>
          <nav className="wf-breadcrumb">
            {readStringArray(node.props, "items").map((item, index) => (
              <span key={`${item}-${index}`}>{index === 0 ? item : ` / ${item}`}</span>
            ))}
          </nav>
        </Frame>
      );

    case "navigation.pagination": {
      const currentRaw = node.props.current_page;
      const totalRaw = node.props.total_pages;
      const current = typeof currentRaw === "number" ? currentRaw : 1;
      const total = typeof totalRaw === "number" ? totalRaw : 1;
      const disabled = node.state === "disabled";

      return (
        <Frame title="Pagination" state={node.state}>
          <div className="wf-pagination">
            <button className="wf-button wf-button-secondary" type="button" disabled={disabled || current <= 1}>
              Prev
            </button>
            <span>
              Page {current} of {total}
            </span>
            <button className="wf-button wf-button-secondary" type="button" disabled={disabled || current >= total}>
              Next
            </button>
          </div>
        </Frame>
      );
    }

    case "input.text_field":
      return (
        <label className={`wf-field ${stateClassName(node.state)}`}>
          <span>{readText(node.props, "label", "Text Field")}</span>
          <input
            className="wf-input"
            defaultValue={readText(node.props, "value")}
            placeholder={readText(node.props, "helper_text")}
            disabled={node.state === "disabled"}
          />
          {node.state === "error" || readText(node.props, "error_text") ? (
            <small className="wf-error">{readText(node.props, "error_text", "Validation error")}</small>
          ) : null}
        </label>
      );

    case "input.select":
      return (
        <label className={`wf-field ${stateClassName(node.state)}`}>
          <span>{readText(node.props, "label", "Select")}</span>
          <select className="wf-input" defaultValue="" disabled={node.state === "disabled"}>
            <option value="" disabled>
              Select option
            </option>
            {readStringArray(node.props, "options").map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {node.state === "open" ? <small className="wf-select-note">Dropdown open preview</small> : null}
          {node.state === "error" ? <small className="wf-error">Selection required</small> : null}
        </label>
      );

    case "input.checkbox":
      return (
        <label className={`wf-check ${stateClassName(node.state)}`}>
          <input
            type="checkbox"
            defaultChecked={node.state === "checked"}
            disabled={node.state === "disabled"}
          />
          <span>{readText(node.props, "label", "Checkbox")}</span>
        </label>
      );

    case "input.text_area":
      return (
        <label className={`wf-field ${stateClassName(node.state)}`}>
          <span>{readText(node.props, "label", "Text Area")}</span>
          <textarea
            className="wf-input"
            defaultValue={readText(node.props, "value")}
            placeholder={readText(node.props, "helper_text")}
            disabled={node.state === "disabled"}
            rows={3}
          />
          {node.state === "error" || readText(node.props, "error_text") ? (
            <small className="wf-error">{readText(node.props, "error_text", "Validation error")}</small>
          ) : null}
        </label>
      );

    case "input.radio_group": {
      const options = readStringArray(node.props, "options");
      return (
        <fieldset className={`wf-field ${stateClassName(node.state)}`}>
          <legend>{readText(node.props, "label", "Options")}</legend>
          {options.map((option) => (
            <label className="wf-check" key={option}>
              <input type="radio" name={node.instance_id} disabled={node.state === "disabled"} />
              <span>{option}</span>
            </label>
          ))}
          {node.state === "error" ? <small className="wf-error">Selection required</small> : null}
        </fieldset>
      );
    }

    case "input.toggle_switch":
      return (
        <label className={`wf-check ${stateClassName(node.state)}`}>
          <input
            type="checkbox"
            role="switch"
            defaultChecked={node.state === "on"}
            disabled={node.state === "disabled"}
          />
          <span>{readText(node.props, "label", "Toggle")}</span>
        </label>
      );

    case "input.search_field":
      return (
        <label className={`wf-field ${stateClassName(node.state)}`}>
          <span>{readText(node.props, "label", "Search")}</span>
          <input
            className="wf-input"
            type="search"
            defaultValue={readText(node.props, "value")}
            placeholder={readText(node.props, "helper_text", "Search...")}
            disabled={node.state === "disabled"}
          />
        </label>
      );

    case "input.date_input":
      return (
        <label className={`wf-field ${stateClassName(node.state)}`}>
          <span>{readText(node.props, "label", "Date")}</span>
          <input
            className="wf-input"
            type="date"
            defaultValue={readText(node.props, "value")}
            disabled={node.state === "disabled"}
          />
          {node.state === "error" || readText(node.props, "error_text") ? (
            <small className="wf-error">{readText(node.props, "error_text", "Invalid date")}</small>
          ) : null}
        </label>
      );

    case "input.file_input":
      return (
        <label className={`wf-field ${stateClassName(node.state)}`}>
          <span>{readText(node.props, "label", "File")}</span>
          <input className="wf-input" type="file" disabled={node.state === "disabled"} />
          {node.state === "selected" ? (
            <small className="wf-status-text">Selected: {readText(node.props, "file_name", "file.ext")}</small>
          ) : null}
          {node.state === "error" ? <small className="wf-error">File upload error</small> : null}
        </label>
      );

    case "action.button_primary":
      return (
        <button className="wf-button wf-button-primary" type="button" disabled={node.state === "disabled"}>
          {node.state === "loading"
            ? `${readText(node.props, "label", "Primary Action")}...`
            : readText(node.props, "label", "Primary Action")}
        </button>
      );

    case "action.button_secondary":
      return (
        <button className="wf-button wf-button-secondary" type="button" disabled={node.state === "disabled"}>
          {readText(node.props, "label", "Secondary Action")}
        </button>
      );

    case "action.icon_button":
      return (
        <button className="wf-button wf-button-secondary" type="button" disabled={node.state === "disabled"}>
          {readText(node.props, "icon", "+")} {readText(node.props, "label", "Icon Action")}
        </button>
      );

    case "action.menu_item":
      return (
        <button className="wf-menu-item" type="button" disabled={node.state === "disabled"}>
          <span>{readText(node.props, "label", "Menu item")}</span>
          <small>{readText(node.props, "shortcut")}</small>
        </button>
      );

    case "data.card":
      if (node.state === "loading") {
        return (
          <article className="wf-card is-loading">
            <strong>{readText(node.props, "title", "Card")}</strong>
            <p className="wf-status-text">Loading content...</p>
          </article>
        );
      }

      if (node.state === "empty") {
        return (
          <article className="wf-card is-empty">
            <strong>{readText(node.props, "title", "Card")}</strong>
            <p className="wf-status-text">No content available.</p>
          </article>
        );
      }

      return (
        <article className="wf-card">
          <strong>{readText(node.props, "title", "Card")}</strong>
          <p>{readText(node.props, "body", "No content")}</p>
        </article>
      );

    case "data.table":
      if (node.state === "loading") {
        return <div className="wf-table-wrap is-loading">Loading rows...</div>;
      }

      if (node.state === "empty") {
        return <div className="wf-table-wrap is-empty">No table data available.</div>;
      }

      if (node.state === "error") {
        return <div className="wf-table-wrap is-error">Failed to load table data.</div>;
      }

      return (
        <div className="wf-table-wrap">
          <table className="wf-table">
            <thead>
              <tr>
                {readStringArray(node.props, "columns").map((col) => (
                  <th key={col}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(node.props.rows as string[] | undefined)?.slice(0, 3).map((row, index) => (
                <tr key={index}>
                  <td colSpan={99}>{row}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    case "data.list": {
      if (node.state === "loading") {
        return <div className="wf-table-wrap is-loading">Loading list items...</div>;
      }

      if (node.state === "empty") {
        return <div className="wf-table-wrap is-empty">No list items available.</div>;
      }

      if (node.state === "error") {
        return <div className="wf-table-wrap is-error">Failed to load list items.</div>;
      }

      return (
        <ul className="wf-list">
          {readStringArray(node.props, "items").map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      );
    }

    case "data.badge":
      return <span className={`wf-badge ${stateClassName(node.state)}`}>{readText(node.props, "label", "Badge")}</span>;

    case "data.key_value_list": {
      const entries = readStringArray(node.props, "items");
      if (node.state === "empty" || entries.length === 0) {
        return <section className="wf-empty">No details available</section>;
      }

      return (
        <dl className="wf-key-value">
          {entries.map((entry, index) => {
            const [key, ...rest] = entry.split(":");
            return (
              <div className="wf-key-value-row" key={`${entry}-${index}`}>
                <dt>{key}</dt>
                <dd>{rest.join(":").trim() || "-"}</dd>
              </div>
            );
          })}
        </dl>
      );
    }

    case "feedback.alert":
      return <aside className={`wf-alert ${stateClassName(node.state)}`}>{readText(node.props, "message", "Alert")}</aside>;

    case "feedback.empty_state":
      return (
        <section className="wf-empty">
          <strong>{readText(node.props, "title", "Empty state")}</strong>
          <p>{readText(node.props, "message", "No data available")}</p>
        </section>
      );

    case "feedback.inline_error":
      return <p className="wf-error">{readText(node.props, "message", "Field error")}</p>;

    case "feedback.loading_indicator":
      return <p className="wf-status-text">{readText(node.props, "label", "Loading...")}</p>;

    case "feedback.progress_bar": {
      if (node.state === "indeterminate") {
        return (
          <section className="wf-progress-wrap">
            <strong>{readText(node.props, "label", "Progress")}</strong>
            <div className="wf-progress-track">
              <div className="wf-progress-fill wf-progress-indeterminate" />
            </div>
          </section>
        );
      }

      const valueRaw = node.props.value;
      const value = typeof valueRaw === "number" && Number.isFinite(valueRaw) ? Math.max(0, Math.min(100, valueRaw)) : 0;
      const finalValue = node.state === "complete" ? 100 : value;

      return (
        <section className="wf-progress-wrap">
          <strong>{readText(node.props, "label", "Progress")}</strong>
          <div className="wf-progress-track">
            <div className="wf-progress-fill" style={{ width: `${finalValue}%` }} />
          </div>
          <small className="wf-status-text">{finalValue}%</small>
        </section>
      );
    }

    case "feedback.toast":
      return (
        <aside className={`wf-toast ${stateClassName(node.state)}`}>
          <strong>{readText(node.props, "title", "Toast")}</strong>
          <p>{readText(node.props, "message", "Notification")}</p>
        </aside>
      );

    case "overlay.modal":
      if (node.state === "closed") {
        return <section className="wf-modal is-closed">Modal closed</section>;
      }

      return (
        <section className="wf-modal">
          <strong>{readText(node.props, "title", "Modal")}</strong>
          {renderChildren(node)}
        </section>
      );

    case "overlay.tooltip":
      return (
        <aside className={node.state === "hidden" ? "wf-alert is-hidden" : "wf-alert"}>
          {node.state === "hidden" ? "Tooltip hidden" : readText(node.props, "message", "Hint")}
        </aside>
      );

    case "overlay.popover":
      if (node.state === "closed") {
        return <section className="wf-popover is-closed">Popover closed</section>;
      }

      return (
        <section className="wf-popover">
          <strong>{readText(node.props, "title", "Popover")}</strong>
          {renderChildren(node)}
        </section>
      );

    case "overlay.context_menu":
      if (node.state === "closed") {
        return <section className="wf-popover is-closed">Context menu closed</section>;
      }

      return (
        <section className="wf-popover">
          <ul className="wf-list">
            {readStringArray(node.props, "items").map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
          {renderChildren(node)}
        </section>
      );

    case "overlay.drawer":
      if (node.state === "closed") {
        return <section className="wf-drawer is-closed">Drawer closed</section>;
      }

      return (
        <section className="wf-drawer">
          <strong>{readText(node.props, "title", "Drawer")}</strong>
          {renderChildren(node)}
        </section>
      );

    case "flow.stepper": {
      const steps = readStringArray(node.props, "steps");
      const active = Number(node.props.active_step || 1);
      return (
        <ol className="wf-stepper">
          {steps.map((step, index) => (
            <li key={step} className={index + 1 === active ? "is-active" : ""}>
              {step}
            </li>
          ))}
        </ol>
      );
    }

    default:
      return <UnknownNode node={node} />;
  }
}

export function NodeRenderer({ node }: NodeRendererProps) {
  return <div className="wf-node">{renderNode(node)}</div>;
}
