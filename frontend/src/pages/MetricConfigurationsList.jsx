import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { metricConfigsAPI } from "../api/metricConfigs";
import { useToast } from "../components/ToastContainer";
import "./MetricConfigurationsList.css";

const METRIC_TYPE_LABELS = {
  counter: "Counter",
  gauge: "Gauge",
  summary: "Summary",
  histogram: "Histogram",
};

function MetricConfigurationsList() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [configurations, setConfigurations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchConfigurations();
  }, []);

  const fetchConfigurations = async () => {
    try {
      setLoading(true);
      setError("");
      const response = await metricConfigsAPI.getAll();
      // Ensure labels are parsed if they come as strings
      const configs = (response.data || []).map((config) => {
        if (config.labels && typeof config.labels === "string") {
          try {
            config.labels = JSON.parse(config.labels);
          } catch (e) {
            config.labels = [];
          }
        }
        return config;
      });
      setConfigurations(configs);
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to load configurations";
      setError(msg);
      showToast(msg, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    navigate("/metric-configs/new");
  };

  const handleEdit = (id) => {
    // TODO: Implement edit functionality
    showToast("Edit functionality coming soon!", "info");
    // For now, navigate to create page
    // navigate(`/metric-configs/edit/${id}`);
  };

  const handleClone = async (config) => {
    try {
      const clonedConfig = {
        name: `${config.name} (Copy)`,
        metric_type: config.metric_type,
        metric_name: `${config.metric_name}_copy`,
        description: config.description,
        help_text: config.help_text,
        labels: config.labels || [],
      };
      await metricConfigsAPI.create(clonedConfig);
      showToast("Configuration cloned successfully!", "success");
      fetchConfigurations();
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to clone configuration";
      showToast(msg, "error");
    }
  };

  const handleArchive = async (id) => {
    if (!window.confirm("Are you sure you want to archive this configuration?")) {
      return;
    }
    try {
      await metricConfigsAPI.delete(id);
      showToast("Configuration archived successfully!", "success");
      fetchConfigurations();
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to archive configuration";
      showToast(msg, "error");
    }
  };

  const getStatusBadge = (config) => {
    // For now, we'll assume all are active. In a real app, you'd have an is_active field
    const isActive = true; // config.is_active !== false
    return (
      <span
        className={`status-badge ${isActive ? "status-badge--active" : "status-badge--paused"}`}
      >
        <span className="status-dot" aria-hidden="true" />
        {isActive ? "Active" : "Paused"}
      </span>
    );
  };

  const getLabelPill = (label, index) => {
    // Color mapping for different label types
    const colors = [
      { bg: "blue", text: "blue" },
      { bg: "purple", text: "purple" },
      { bg: "amber", text: "amber" },
      { bg: "slate", text: "slate" },
    ];
    const colorIndex = index % colors.length;
    const color = colors[colorIndex];

    // Handle both string and object formats
    const labelText = typeof label === "string" 
      ? label 
      : label.name || label.value || "LABEL";

    return (
      <span
        key={typeof label === "string" ? label : label.name || index}
        className={`label-pill label-pill--${color.bg}`}
      >
        {labelText.toUpperCase()}
      </span>
    );
  };

  const getLabels = (config) => {
    if (!config.labels || config.labels.length === 0) {
      return null;
    }
    return config.labels.map((label, index) => getLabelPill(label, index));
  };

  // Pagination
  const totalPages = Math.ceil(configurations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedConfigs = configurations.slice(startIndex, endIndex);

  if (loading) {
    return (
      <div className="metric-configurations-list">
        <div className="loading-state">Loading configurations...</div>
      </div>
    );
  }

  return (
    <div className="metric-configurations-list">
      <div className="configurations-header">
        <div className="header-content">
          <h1 className="page-title">Metric Configurations</h1>
          <p className="page-subtitle">
            Manage and monitor your existing engineering data feeds.
          </p>
        </div>
        <button
          className="create-button"
          onClick={handleCreateNew}
          type="button"
        >
          <span className="material-symbols-outlined">add</span>
          Create New Configuration
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="configurations-table-container">
        <table className="configurations-table">
          <thead>
            <tr>
              <th>Config Name</th>
              <th>Metric Type</th>
              <th>Description</th>
              <th>Labels</th>
              <th>Status</th>
              <th className="actions-column">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedConfigs.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-state">
                  <div className="empty-content">
                    <p>No configurations found.</p>
                    <button
                      className="create-button create-button--inline"
                      onClick={handleCreateNew}
                      type="button"
                    >
                      Create your first configuration
                    </button>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedConfigs.map((config) => (
                <tr key={config.id} className="table-row">
                  <td>
                    <span className="config-name">{config.name}</span>
                  </td>
                  <td>
                    <span className="metric-type">
                      {METRIC_TYPE_LABELS[config.metric_type] || config.metric_type}
                    </span>
                  </td>
                  <td>
                    <div
                      className="description-cell"
                      title={config.description || ""}
                    >
                      {config.description || "—"}
                    </div>
                  </td>
                  <td>
                    <div className="labels-cell">
                      {getLabels(config) || <span className="no-labels">—</span>}
                    </div>
                  </td>
                  <td>{getStatusBadge(config)}</td>
                  <td>
                    <div className="actions-cell">
                      <button
                        className="action-button"
                        onClick={() => handleEdit(config.id)}
                        title="Edit"
                        aria-label="Edit configuration"
                      >
                        <span className="material-symbols-outlined">edit</span>
                      </button>
                      <button
                        className="action-button"
                        onClick={() => handleClone(config)}
                        title="Clone"
                        aria-label="Clone configuration"
                      >
                        <span className="material-symbols-outlined">content_copy</span>
                      </button>
                      <button
                        className="action-button action-button--danger"
                        onClick={() => handleArchive(config.id)}
                        title="Archive"
                        aria-label="Archive configuration"
                      >
                        <span className="material-symbols-outlined">archive</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {configurations.length > 0 && (
        <div className="table-footer">
          <p className="footer-count">
            Showing {startIndex + 1}-{Math.min(endIndex, configurations.length)} of{" "}
            {configurations.length} configuration{configurations.length !== 1 ? "s" : ""}
          </p>
          <div className="pagination">
            <button
              className="pagination-button"
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            <button
              className="pagination-button"
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}

      <p className="help-text">
        Need help managing configurations?{" "}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            // TODO: Navigate to admin guide
          }}
        >
          Read the admin guide
        </a>{" "}
        or{" "}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            // TODO: Navigate to support
          }}
        >
          contact engineering support
        </a>
        .
      </p>
    </div>
  );
}

export default MetricConfigurationsList;
