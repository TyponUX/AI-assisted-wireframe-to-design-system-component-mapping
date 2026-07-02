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

function readMetricValue(props: Record<string, unknown>, key: string, fallback = "-"): string {
  const value = props[key];
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return typeof value === "string" && value.length > 0 ? value : fallback;
}

type SeriesEntry = {
  label: string;
  value: number;
};

function readSeriesEntries(props: Record<string, unknown>, key: string): SeriesEntry[] {
  const value = props[key];
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): SeriesEntry | null => {
      if (typeof item === "string") {
        const [labelPart, valuePart] = item.split(":");
        const parsedValue = Number((valuePart || "").trim());
        if (!labelPart || !Number.isFinite(parsedValue)) {
          return null;
        }

        return { label: labelPart.trim(), value: parsedValue };
      }

      if (typeof item === "object" && item !== null) {
        const maybeLabel = (item as { label?: unknown }).label;
        const maybeValue = (item as { value?: unknown }).value;
        if (typeof maybeLabel === "string" && typeof maybeValue === "number" && Number.isFinite(maybeValue)) {
          return { label: maybeLabel, value: maybeValue };
        }
      }

      return null;
    })
    .filter((item): item is SeriesEntry => item !== null);
}

function GenericSemanticBlock({ node, title }: { node: SemanticNode; title: string }) {
  return (
    <Frame title={title} state={node.state}>
      <pre>{JSON.stringify(node.props, null, 2)}</pre>
      {renderChildren(node)}
    </Frame>
  );
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

    case "data.metric":
    case "data.metric_tile": {
      const label = readText(node.props, "label", "Metric");
      const value = readMetricValue(node.props, "value");
      const context = readText(node.props, "context");
      const trend = readMetricValue(node.props, "trend", "");

      if (node.state === "loading") {
        return (
          <article className="wf-card is-loading">
            <strong>{label}</strong>
            <p className="wf-status-text">Loading metric...</p>
          </article>
        );
      }

      if (node.state === "empty") {
        return (
          <article className="wf-card is-empty">
            <strong>{label}</strong>
            <p className="wf-status-text">No metric data available.</p>
          </article>
        );
      }

      return (
        <article className="wf-card">
          <small className="wf-status-text">{label}</small>
          <strong>{value}</strong>
          {context ? <p>{context}</p> : null}
          {trend ? <small className="wf-status-text">Trend: {trend}</small> : null}
        </article>
      );
    }

    case "data.chart_bar": {
      const title = readText(node.props, "title", "Bar Chart");
      const entries = readSeriesEntries(node.props, "series");

      if (node.state === "loading") {
        return <div className="wf-table-wrap is-loading">Loading chart...</div>;
      }

      if (node.state === "empty") {
        return <div className="wf-table-wrap is-empty">No chart data available.</div>;
      }

      if (node.state === "error") {
        return <div className="wf-table-wrap is-error">Failed to load chart data.</div>;
      }

      const maxValue = Math.max(...entries.map((entry) => entry.value), 1);

      return (
        <section className="wf-card">
          <strong>{title}</strong>
          <div>
            {entries.map((entry) => (
              <div key={entry.label}>
                <small>
                  {entry.label}: {entry.value}
                </small>
                <div className="wf-progress-track">
                  <div className="wf-progress-fill" style={{ width: `${(entry.value / maxValue) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      );
    }

    case "data.chart_donut": {
      const title = readText(node.props, "title", "Donut Chart");
      const entries = readSeriesEntries(node.props, "series");

      if (node.state === "loading") {
        return <div className="wf-table-wrap is-loading">Loading chart...</div>;
      }

      if (node.state === "empty") {
        return <div className="wf-table-wrap is-empty">No chart data available.</div>;
      }

      if (node.state === "error") {
        return <div className="wf-table-wrap is-error">Failed to load chart data.</div>;
      }

      const total = entries.reduce((sum, entry) => sum + entry.value, 0);

      return (
        <section className="wf-card">
          <strong>{title}</strong>
          <ul className="wf-list">
            {entries.map((entry) => {
              const percent = total > 0 ? Math.round((entry.value / total) * 100) : 0;
              return (
                <li key={entry.label}>
                  {entry.label}: {entry.value} ({percent}%)
                </li>
              );
            })}
          </ul>
        </section>
      );
    }

    case "data.trend_indicator": {
      const label = readText(node.props, "label", "Trend");
      const value = readMetricValue(node.props, "value", "");
      const direction = readMetricValue(node.props, "direction", node.state);

      return (
        <span className={`wf-badge ${stateClassName(node.state)}`}>
          {label}: {direction}
          {value ? ` (${value})` : ""}
        </span>
      );
    }

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

    case "action.float_button":
      return (
        <button className="wf-button wf-button-primary" type="button" disabled={node.state === "disabled"}>
          {readText(node.props, "icon", "+")} {readText(node.props, "label", "Float Action")}
        </button>
      );

    case "layout.divider":
      return (
        <section>
          {readText(node.props, "label") ? <small className="wf-status-text">{readText(node.props, "label")}</small> : null}
          <hr />
        </section>
      );

    case "layout.grid":
      return (
        <Frame title="Grid Layout" state={node.state}>
          <div className={node.state === "compact" ? "wf-inline is-wrap" : "wf-inline"}>{renderChildren(node)}</div>
        </Frame>
      );

    case "layout.masonry":
      return (
        <Frame title="Masonry Layout" state={node.state}>
          <div className={node.state === "compact" ? "wf-inline is-wrap" : "wf-inline"}>{renderChildren(node)}</div>
        </Frame>
      );

    case "layout.splitter":
      return (
        <Frame title="Splitter Layout" state={node.state}>
          <div className="wf-inline">{renderChildren(node)}</div>
        </Frame>
      );

    case "layout.affix":
      return <GenericSemanticBlock node={node} title="Affix" />;

    case "layout.border_beam":
      return <GenericSemanticBlock node={node} title="Border Beam" />;

    case "navigation.anchor":
      return (
        <Frame title="Anchor Navigation" state={node.state}>
          <nav className="wf-nav">
            {readStringArray(node.props, "items").map((item) => (
              <span key={item} className={item === readText(node.props, "active_item") ? "wf-nav-item is-active" : "wf-nav-item"}>
                {item}
              </span>
            ))}
          </nav>
        </Frame>
      );

    case "navigation.menu":
      if (node.state === "collapsed") {
        return <Frame title="Menu Navigation" state={node.state}><em className="wf-status-text">Menu collapsed</em></Frame>;
      }
      return (
        <Frame title="Menu Navigation" state={node.state}>
          <nav className="wf-side-nav">
            {readStringArray(node.props, "items").map((item) => (
              <span key={item} className={item === readText(node.props, "active_item") ? "wf-nav-item is-active" : "wf-nav-item"}>
                {item}
              </span>
            ))}
          </nav>
        </Frame>
      );

    case "overlay.dropdown":
      if (node.state === "closed") {
        return <section className="wf-popover is-closed">Dropdown closed</section>;
      }
      return (
        <section className="wf-popover">
          <ul className="wf-list">
            {readStringArray(node.props, "items").map((item, index) => (
              <li key={`${item}-${index}`}>{item}</li>
            ))}
          </ul>
        </section>
      );

    case "overlay.tour":
      if (node.state === "closed") {
        return <section className="wf-popover is-closed">Tour closed</section>;
      }
      return (
        <section className="wf-popover">
          <strong>Guided Tour</strong>
          <small className="wf-status-text">Step: {readMetricValue(node.props, "active_step", "1")}</small>
        </section>
      );

    case "overlay.popconfirm":
      if (node.state === "closed") {
        return <section className="wf-popover is-closed">Confirmation closed</section>;
      }
      return (
        <section className="wf-popover">
          <strong>{readText(node.props, "title", "Are you sure?")}</strong>
          <p>{readText(node.props, "message", "Please confirm this action")}</p>
        </section>
      );

    case "input.autocomplete":
      return (
        <label className={`wf-field ${stateClassName(node.state)}`}>
          <span>{readText(node.props, "label", "Autocomplete")}</span>
          <input className="wf-input" defaultValue={readText(node.props, "value")} disabled={node.state === "disabled"} />
          {node.state === "open" ? <small className="wf-select-note">Suggestions open</small> : null}
        </label>
      );

    case "input.cascader":
      return <GenericSemanticBlock node={node} title="Cascader" />;

    case "input.color_picker":
      return <GenericSemanticBlock node={node} title="Color Picker" />;

    case "input.form":
      return (
        <Frame title={readText(node.props, "title", "Form")} state={node.state}>
          {renderChildren(node)}
        </Frame>
      );

    case "input.number_input":
      return (
        <label className={`wf-field ${stateClassName(node.state)}`}>
          <span>{readText(node.props, "label", "Number")}</span>
          <input className="wf-input" type="number" defaultValue={readMetricValue(node.props, "value", "0")} disabled={node.state === "disabled"} />
        </label>
      );

    case "input.mentions":
      return <GenericSemanticBlock node={node} title="Mentions" />;

    case "input.rate":
      return <GenericSemanticBlock node={node} title="Rate" />;

    case "input.slider":
      return (
        <label className={`wf-field ${stateClassName(node.state)}`}>
          <span>{readText(node.props, "label", "Slider")}</span>
          <input className="wf-input" type="range" disabled={node.state === "disabled"} />
        </label>
      );

    case "input.time_input":
      return (
        <label className={`wf-field ${stateClassName(node.state)}`}>
          <span>{readText(node.props, "label", "Time")}</span>
          <input className="wf-input" type="time" defaultValue={readText(node.props, "value")} disabled={node.state === "disabled"} />
        </label>
      );

    case "input.transfer":
      return <GenericSemanticBlock node={node} title="Transfer" />;

    case "input.tree_select":
      return <GenericSemanticBlock node={node} title="Tree Select" />;

    case "input.segmented_control":
      return <GenericSemanticBlock node={node} title="Segmented" />;

    case "data.avatar":
      return <span className="wf-badge">{readText(node.props, "label", "Avatar")}</span>;

    case "data.calendar":
      return <GenericSemanticBlock node={node} title="Calendar" />;

    case "data.carousel":
      return <GenericSemanticBlock node={node} title="Carousel" />;

    case "data.image":
      if (node.state === "loading") {
        return <div className="wf-table-wrap is-loading">Loading image...</div>;
      }
      if (node.state === "error") {
        return <div className="wf-table-wrap is-error">Image failed to load.</div>;
      }
      return <GenericSemanticBlock node={node} title="Image" />;

    case "data.qr_code":
      return <GenericSemanticBlock node={node} title="QR Code" />;

    case "data.icon":
      return <span className="wf-badge">{readText(node.props, "name", "icon")}</span>;

    case "data.typography":
      return <p>{readText(node.props, "text", "Typography sample text")}</p>;

    case "data.timeline":
      return <GenericSemanticBlock node={node} title="Timeline" />;

    case "data.tree":
      return <GenericSemanticBlock node={node} title="Tree" />;

    case "data.collapse":
      return <GenericSemanticBlock node={node} title="Collapse" />;

    case "feedback.result":
      return <aside className={`wf-alert ${stateClassName(node.state)}`}>{readText(node.props, "title", "Result")}</aside>;

    case "feedback.skeleton":
      return <p className="wf-status-text">Skeleton loading placeholder</p>;

    case "feedback.notification":
      return (
        <aside className={`wf-toast ${stateClassName(node.state)}`}>
          <strong>{readText(node.props, "title", "Notification")}</strong>
          <p>{readText(node.props, "message", "Message")}</p>
        </aside>
      );

    case "feedback.message":
      return <aside className={`wf-alert ${stateClassName(node.state)}`}>{readText(node.props, "message", "Message")}</aside>;

    case "feedback.watermark":
      return <small className="wf-status-text">Watermark: {readText(node.props, "label", "Draft")}</small>;

    case "flow.app_context":
      return <GenericSemanticBlock node={node} title="App Context" />;

    case "flow.config_provider":
      return <GenericSemanticBlock node={node} title="Config Provider" />;

    case "flow.utility":
      return <GenericSemanticBlock node={node} title="Utility Wrapper" />;

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
