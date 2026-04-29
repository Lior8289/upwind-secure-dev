import { useState, useEffect } from "react";
import { getUsers, createUser, deleteUser, updateUser } from "../api";
import { User } from "../types";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState("analyst");
  const [formError, setFormError] = useState("");

  const fetchUsers = () => {
    getUsers()
      .then(setUsers)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(fetchUsers, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    try {
      await createUser({ email: newEmail, password: newPassword, role: newRole });
      setNewEmail("");
      setNewPassword("");
      setNewRole("analyst");
      setShowForm(false);
      fetchUsers();
    } catch (err: any) {
      setFormError(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    try {
      await deleteUser(id);
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === "active" ? "disabled" : "active";
    try {
      await updateUser(user.id, { status: newStatus });
      fetchUsers();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) return <div className="page-container"><p>Loading users...</p></div>;

  return (
    <div className="page-container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h1>User Management</h1>
        <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
          {showForm ? "Cancel" : "Add User"}
        </button>
      </div>

      {error && (
        <div style={{ background: "#fee", border: "1px solid #fcc", color: "#c33", padding: "8px 12px", marginBottom: 16, fontSize: 13, borderRadius: 3 }}>
          {error}
        </div>
      )}

      {showForm && (
        <div style={{ border: "1px solid #ddd", padding: 16, marginBottom: 20, background: "#fafafa" }}>
          <h3 style={{ marginBottom: 12 }}>New User</h3>
          {formError && (
            <div style={{ background: "#fee", border: "1px solid #fcc", color: "#c33", padding: "8px 12px", marginBottom: 12, fontSize: 13, borderRadius: 3 }}>
              {formError}
            </div>
          )}
          <form onSubmit={handleAddUser}>
            <div style={{ marginBottom: 8 }}>
              <label>Email</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="user@penguwave.io"
                required
              />
            </div>
            <div style={{ marginBottom: 8 }}>
              <label>Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                required
              />
            </div>
            <div style={{ marginBottom: 12 }}>
              <label>Role</label>
              <select value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                <option value="admin">Admin</option>
                <option value="analyst">Analyst</option>
                <option value="viewer">Viewer</option>
              </select>
            </div>
            <button type="submit" className="btn-primary">
              Create User
            </button>
          </form>
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th>Email</th>
            <th>Role</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>
                <span style={{ color: user.status === "active" ? "green" : "#999" }}>
                  {user.status}
                </span>
              </td>
              <td style={{ display: "flex", gap: 12 }}>
                {user.role !== "admin" ? (
                  <>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handleToggleStatus(user);
                      }}
                      style={{ color: "#0066cc", fontSize: 13 }}
                    >
                      {user.status === "active" ? "Disable" : "Enable"}
                    </a>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handleDelete(user.id);
                      }}
                      style={{ color: "red", fontSize: 13 }}
                    >
                      Delete
                    </a>
                  </>
                ) : (
                  <span style={{ color: "#999", fontSize: 13 }}>Protected</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {users.length === 0 && <p style={{ color: "#999" }}>No users.</p>}
    </div>
  );
}
