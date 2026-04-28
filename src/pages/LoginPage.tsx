import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (isLoading) {
    return <div className="container"><p>Loading...</p></div>;
  }

  if (isAuthenticated) {
    return <Navigate to="/events" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login(email, password);
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
      <div style={{ background: "white", padding: 32, borderRadius: 6, width: "100%", maxWidth: 400, border: "1px solid #ddd" }}>
        <h2 style={{ marginBottom: 8, fontSize: 20 }}>Sign In</h2>
        <p style={{ color: "#666", marginBottom: 20, fontSize: 14 }}>
          Enter your credentials to access PenguWave
        </p>

        {error && (
          <div style={{ background: "#fee", border: "1px solid #fcc", color: "#c33", padding: "8px 12px", marginBottom: 16, fontSize: 13, borderRadius: 3 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 12 }}>
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>
          <button type="submit" className="btn-primary" style={{ width: "100%" }} disabled={submitting}>
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
