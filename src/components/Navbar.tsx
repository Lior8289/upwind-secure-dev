import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Link to="/events" style={{ textDecoration: "none", color: "inherit" }}>
          PenguWave
        </Link>
      </div>
      <div className="navbar-links">
        {isAuthenticated && (
          <>
            <Link
              to="/events"
              className={location.pathname.startsWith("/events") ? "active" : ""}
            >
              Events
            </Link>
            {user?.role === "admin" && (
              <Link
                to="/users"
                className={location.pathname === "/users" ? "active" : ""}
              >
                Users
              </Link>
            )}
            <span style={{ fontSize: 13, color: "#666" }}>
              {user?.email} ({user?.role})
            </span>
            <button onClick={logout} className="navbar-login-btn">
              Logout
            </button>
          </>
        )}
        {!isAuthenticated && (
          <Link to="/login" className="navbar-login-btn" style={{ textDecoration: "none" }}>
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
