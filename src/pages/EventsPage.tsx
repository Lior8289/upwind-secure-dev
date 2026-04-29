import { useState, useEffect } from "react";
import { getEvents } from "../api";
import { SecurityEvent } from "../types";

export default function EventsPage() {
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("ALL");
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);

  useEffect(() => {
    getEvents()
      .then(setEvents)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setSelectedEvent(null);
    };
    if (selectedEvent) {
      document.addEventListener("keydown", handleKeyDown);
      return () => document.removeEventListener("keydown", handleKeyDown);
    }
  }, [selectedEvent]);

  const filtered = events.filter((e) => {
    const matchesSearch =
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.description.toLowerCase().includes(search.toLowerCase()) ||
      e.assetHostname.toLowerCase().includes(search.toLowerCase());
    const matchesSeverity = severityFilter === "ALL" || e.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  if (loading) return <div className="page-container"><p>Loading events...</p></div>;
  if (error) return <div className="page-container"><p style={{ color: "red" }}>Error: {error}</p></div>;

  return (
    <div className="page-container">
      <h1>Security Events</h1>

      <div style={{ marginBottom: 16, display: "flex", gap: 12, alignItems: "center" }}>
        <input
          type="text"
          placeholder="Search events..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: "100%", maxWidth: 400 }}
        />
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          style={{ width: 140 }}
        >
          <option value="ALL">All Severities</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      {search && (
        <p>
          Showing results for: <strong>{search}</strong> ({filtered.length} events)
        </p>
      )}

      <table>
        <thead>
          <tr>
            <th>Severity</th>
            <th>Title</th>
            <th>Asset</th>
            <th>Source IP</th>
            <th>Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((event) => (
            <tr
              key={event.id}
              onClick={() => setSelectedEvent(event)}
              style={{ cursor: "pointer" }}
            >
              <td>
                <span className={`severity-table-badge ${event.severity.toLowerCase()}`}>
                  {event.severity}
                </span>
              </td>
              <td>{event.title}</td>
              <td style={{ fontFamily: "monospace", fontSize: 13 }}>
                {event.assetHostname}
              </td>
              <td style={{ fontFamily: "monospace", fontSize: 13 }}>
                {event.sourceIp}
              </td>
              <td style={{ fontSize: 13 }}>
                {new Date(event.timestamp).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {filtered.length === 0 && <p style={{ color: "#999" }}>No events found.</p>}

      <div style={{ marginTop: 12 }}>
        <button
          onClick={() => {
            const blob = new Blob([JSON.stringify(filtered, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "penguwave_events_export.json";
            a.click();
            URL.revokeObjectURL(url);
          }}
          style={{ fontSize: 13 }}
        >
          Export Events (JSON)
        </button>
      </div>

      {selectedEvent && (
        <>
          <div className="event-detail-backdrop" onClick={() => setSelectedEvent(null)} />
          <div className="event-detail-panel">
            <div className="event-detail-header">
              <h2>{selectedEvent.title}</h2>
              <button className="event-detail-close" onClick={() => setSelectedEvent(null)}>
                &times;
              </button>
            </div>
            <div className="event-detail-body">
              <div className="event-detail-section">
                <div className="event-detail-section-title">Overview</div>
                <div className="event-detail-grid">
                  <div className="event-detail-field">
                    <div className="event-detail-field-label">Severity</div>
                    <div className="event-detail-field-value">
                      <span className={`severity-badge ${selectedEvent.severity.toLowerCase()}`}>
                        {selectedEvent.severity}
                      </span>
                    </div>
                  </div>
                  <div className="event-detail-field">
                    <div className="event-detail-field-label">Timestamp</div>
                    <div className="event-detail-field-value">
                      {new Date(selectedEvent.timestamp).toLocaleString()}
                    </div>
                  </div>
                  <div className="event-detail-field full-width">
                    <div className="event-detail-field-label">Description</div>
                    <div className="event-detail-field-value">{selectedEvent.description}</div>
                  </div>
                </div>
              </div>

              <div className="event-detail-section">
                <div className="event-detail-section-title">Network</div>
                <div className="event-detail-grid">
                  <div className="event-detail-field">
                    <div className="event-detail-field-label">Asset Hostname</div>
                    <div className="event-detail-field-value mono">{selectedEvent.assetHostname}</div>
                  </div>
                  <div className="event-detail-field">
                    <div className="event-detail-field-label">Asset IP</div>
                    <div className="event-detail-field-value mono">{selectedEvent.assetIp}</div>
                  </div>
                  <div className="event-detail-field full-width">
                    <div className="event-detail-field-label">Source IP</div>
                    <div className="event-detail-field-value mono">{selectedEvent.sourceIp}</div>
                  </div>
                </div>
              </div>

              {selectedEvent.tags.length > 0 && (
                <div className="event-detail-section">
                  <div className="event-detail-section-title">Tags</div>
                  <div className="event-detail-tags">
                    {selectedEvent.tags.map((tag) => (
                      <span key={tag} className="event-detail-tag">{tag}</span>
                    ))}
                  </div>
                </div>
              )}

              <div className="event-detail-section event-detail-raw">
                <div className="event-detail-section-title">Raw Event Data</div>
                <pre>{JSON.stringify(selectedEvent, null, 2)}</pre>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
