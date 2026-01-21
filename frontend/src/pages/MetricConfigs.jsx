import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { metricConfigsAPI } from "../api/metricConfigs";
import { useToast } from "../components/ToastContainer";
import "./MetricConfigs.css";

const METRIC_TYPES = [
  { value: "counter", label: "Counter" },
  { value: "gauge", label: "Gauge" },
  { value: "summary", label: "Summary" },
  { value: "histogram", label: "Histogram" },
];

function slugToMetricName(name) {
  const base = String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 48);

  if (!base) return "";
  const candidate = `${base}_total`;
  return /^[a-zA-Z_:][a-zA-Z0-9_:]*$/.test(candidate) ? candidate : base;
}

function MetricConfigs() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [configurationName, setConfigurationName] = useState("Main Production Feed");
  const [metricType, setMetricType] = useState("counter");

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [anonymizeIp, setAnonymizeIp] = useState(true);
  const [realtimeWebhook, setRealtimeWebhook] = useState(false);

  const metricName = useMemo(() => slugToMetricName(configurationName), [configurationName]);
  const [metricNameOverride, setMetricNameOverride] = useState("");

  const [description, setDescription] = useState("");
  const [helpText, setHelpText] = useState("");
  const [labels, setLabels] = useState([]);
  const [labelInput, setLabelInput] = useState("");

  const effectiveMetricName = metricNameOverride.trim() ? metricNameOverride.trim() : metricName;

  const canSubmit = Boolean(configurationName.trim()) && Boolean(effectiveMetricName);

  const basePayload = useMemo(() => {
    return {
      name: configurationName.trim(),
      metric_type: metricType,
      metric_name: effectiveMetricName,
      description: description.trim(),
      help_text: helpText.trim(),
      labels,
      // UI-only fields are intentionally NOT sent to backend:
      // anonymizeIp, realtimeWebhook
    };
  }, [configurationName, metricType, effectiveMetricName, description, helpText, labels]);

  const normalizeLabel = (raw) => {
    const cleaned = String(raw || "").trim().toLowerCase().replace(/\s+/g, "_");
    return cleaned.replace(/[^a-z0-9_]/g, "");
  };

  const addLabel = (raw) => {
    const next = normalizeLabel(raw);
    if (!next) return;
    setLabels((prev) => (prev.includes(next) ? prev : [...prev, next]));
  };

  const removeLabel = (label) => {
    setLabels((prev) => prev.filter((l) => l !== label));
  };

  const handleSaveDraft = async () => {
    setError("");
    if (!canSubmit) {
      setError("Please provide a configuration name (and metric name if needed).");
      return;
    }

    try {
      setSubmitting(true);
      await metricConfigsAPI.create(basePayload);
      showToast("Saved draft configuration.", "success");
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to save draft";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleContinue = async (e) => {
    e.preventDefault();
    setError("");
    if (!canSubmit) {
      setError("Please provide a configuration name (and metric name if needed).");
      return;
    }

    try {
      setSubmitting(true);
      await metricConfigsAPI.create(basePayload);
      showToast("Metric configuration created successfully!", "success");
      navigate("/api-keys");
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to create metric configuration";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    // Prefer browser history. If unavailable, fall back to dashboard.
    try {
      if (window.history.length > 1) {
        navigate(-1);
        return;
      }
    } catch {
      // ignore
    }
    navigate("/");
  };

  return (
    <div className="metric-config-screen">
      <div className="metric-config-stepper" aria-label="Onboarding steps">
        <div className="stepper-line" aria-hidden="true" />

        <div className="stepper-step stepper-step--active">
          <div className="stepper-dot" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <path d="M4 19V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M4 19H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M8 16v-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M12 16V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <path d="M16 16V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
          <span className="stepper-label">1. Metric Setup</span>
        </div>

        <div className="stepper-step">
          <div className="stepper-dot stepper-dot--inactive" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <path
                d="M7.5 14.5a4.5 4.5 0 1 1 3.9-6.8h8.6v3h-2v2h-2v2h-3.2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <path d="M7.5 13a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z" stroke="currentColor" strokeWidth="2" />
            </svg>
          </div>
          <span className="stepper-label stepper-label--inactive">2. API Key</span>
        </div>

        <div className="stepper-step">
          <div className="stepper-dot stepper-dot--inactive" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
              <path
                d="M5 13l4 4L19 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <span className="stepper-label stepper-label--inactive">3. Activation</span>
        </div>
      </div>

      <header className="metric-config-hero">
        <h1>Configure Your Metrics</h1>
        <p>Define how VIZME tracks and stores your engineering data.</p>
      </header>

      <section className="metric-config-card card">
        <form onSubmit={handleContinue} className="metric-config-form">
          <div className="metric-config-topbar">
            <button
              type="button"
              className="back-icon"
              onClick={handleBack}
              aria-label="Go back"
              title="Back"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none">
                <path
                  d="M15 18l-6-6 6-6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          {error ? <div className="error-message">{error}</div> : null}

          <div className="metric-config-grid">
            <div className="field">
              <label className="field-label">Configuration Name</label>
              <p className="field-hint">Unique identifier for this tracking instance.</p>
              <input
                className="field-input"
                type="text"
                value={configurationName}
                onChange={(e) => setConfigurationName(e.target.value)}
                placeholder="e.g. Production Analytics V2"
                autoComplete="off"
              />
            </div>

            <div className="field">
              <label className="field-label">Metric Type</label>
              <p className="field-hint">Select the primary data structure.</p>
              <div className="select-wrap">
                <select
                  className="field-select"
                  value={metricType}
                  onChange={(e) => setMetricType(e.target.value)}
                >
                  {METRIC_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
                <span className="select-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                    <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </div>
            </div>
          </div>

          <div className="metric-config-divider" />

          <button
            type="button"
            className="advanced-toggle"
            onClick={() => setAdvancedOpen((v) => !v)}
            aria-expanded={advancedOpen}
          >
            <span className="advanced-toggle-left">
              <span className="advanced-gear" aria-hidden="true">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                  <path
                    d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M19.4 15a7.9 7.9 0 0 0 .1-1 7.9 7.9 0 0 0-.1-1l2-1.6-2-3.4-2.4 1a7.2 7.2 0 0 0-1.7-1l-.3-2.6H9l-.3 2.6a7.2 7.2 0 0 0-1.7 1l-2.4-1-2 3.4 2 1.6a7.9 7.9 0 0 0-.1 1 7.9 7.9 0 0 0 .1 1l-2 1.6 2 3.4 2.4-1c.5.4 1.1.8 1.7 1l.3 2.6h6l.3-2.6c.6-.2 1.2-.6 1.7-1l2.4 1 2-3.4-2-1.6Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              Advanced Configuration Settings
            </span>
            <span className={`advanced-chevron ${advancedOpen ? "advanced-chevron--open" : ""}`} aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none">
                <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </button>

          {advancedOpen ? (
            <div className="advanced-panel">
              <div className="advanced-item">
                <div className="advanced-copy">
                  <p className="advanced-title">Anonymize IP Addresses</p>
                  <p className="advanced-subtitle">GDPR-compliant masking for all incoming requests.</p>
                </div>
                <button
                  type="button"
                  className={`switch ${anonymizeIp ? "switch--on" : "switch--off"}`}
                  onClick={() => setAnonymizeIp((v) => !v)}
                  aria-pressed={anonymizeIp}
                >
                  <span className="switch-thumb" aria-hidden="true" />
                </button>
              </div>

              <div className="advanced-item">
                <div className="advanced-copy">
                  <p className="advanced-title">Real-time Webhook</p>
                  <p className="advanced-subtitle">Stream filtered events to your custom endpoint.</p>
                </div>
                <button
                  type="button"
                  className={`switch ${realtimeWebhook ? "switch--on" : "switch--off"}`}
                  onClick={() => setRealtimeWebhook((v) => !v)}
                  aria-pressed={realtimeWebhook}
                >
                  <span className="switch-thumb" aria-hidden="true" />
                </button>
              </div>

              <div className="advanced-item advanced-item--stack">
                <div className="advanced-copy">
                  <p className="advanced-title">Metric Name</p>
                  <p className="advanced-subtitle">Optional override (default derived from configuration name).</p>
                </div>
                <input
                  className="field-input"
                  type="text"
                  value={metricNameOverride}
                  onChange={(e) => setMetricNameOverride(e.target.value)}
                  placeholder={metricName || "e.g. user_clicks_total"}
                  pattern="^[a-zA-Z_:][a-zA-Z0-9_:]*$"
                />
              </div>

              <div className="advanced-item advanced-item--stack">
                <div className="advanced-copy">
                  <p className="advanced-title">Description</p>
                  <p className="advanced-subtitle">Internal notes to help your team understand the purpose of this metric.</p>
                </div>
                <textarea
                  className="field-textarea"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Tracks checkout conversions across the main production environment."
                  rows={3}
                />
              </div>

              <div className="advanced-item advanced-item--stack">
                <div className="advanced-copy">
                  <p className="advanced-title">Help Text</p>
                  <p className="advanced-subtitle">A human-readable description shown alongside the metric in dashboards.</p>
                </div>
                <textarea
                  className="field-textarea"
                  value={helpText}
                  onChange={(e) => setHelpText(e.target.value)}
                  placeholder="e.g. Total number of successful checkouts."
                  rows={3}
                />
              </div>

              <div className="advanced-item advanced-item--stack">
                <div className="advanced-copy">
                  <p className="advanced-title">Labels</p>
                  <p className="advanced-subtitle">
                    Add key/value dimensions you plan to slice by (stored as label keys). Press Enter to add.
                  </p>
                </div>

                <div className="labels-editor">
                  <div className="labels-input-row">
                    <input
                      className="field-input labels-input"
                      type="text"
                      value={labelInput}
                      onChange={(e) => setLabelInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addLabel(labelInput);
                          setLabelInput("");
                        }
                      }}
                      placeholder="e.g. environment, region, service"
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      className="btn btn-secondary labels-add"
                      onClick={() => {
                        addLabel(labelInput);
                        setLabelInput("");
                      }}
                    >
                      Add
                    </button>
                  </div>

                  {labels.length ? (
                    <div className="labels-chips" aria-label="Labels">
                      {labels.map((label) => (
                        <span key={label} className="label-chip">
                          <span className="label-chip-text">{label}</span>
                          <button
                            type="button"
                            className="label-chip-remove"
                            onClick={() => removeLabel(label)}
                            aria-label={`Remove ${label}`}
                            title="Remove"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <div className="labels-empty">No labels added yet.</div>
                  )}
                </div>
              </div>
            </div>
          ) : null}

          <div className="metric-config-actions">
            <button
              type="button"
              className="btn btn-secondary metric-config-draft"
              onClick={handleSaveDraft}
              disabled={submitting}
            >
              Save as Draft
            </button>
            <button
              type="submit"
              className="btn btn-primary metric-config-continue"
              disabled={!canSubmit || submitting}
            >
              Continue to API Keys <span aria-hidden="true">→</span>
            </button>
          </div>
        </form>
      </section>

      <p className="metric-config-footer">
        Need help?{" "}
        <a href="#" onClick={(e) => e.preventDefault()}>
          Read the technical documentation
        </a>{" "}
        or{" "}
        <a href="#" onClick={(e) => e.preventDefault()}>
          contact engineering support
        </a>
        .
      </p>
    </div>
  );
}

export default MetricConfigs;

