const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES = ["admin", "analyst", "viewer"];
const VALID_STATUSES = ["active", "disabled"];

export function validateEmail(email: unknown): string | null {
  if (typeof email !== "string" || !EMAIL_REGEX.test(email)) {
    return "Invalid email format";
  }
  if (email.length > 254) {
    return "Email too long";
  }
  return null;
}

export function validatePassword(password: unknown): string | null {
  if (typeof password !== "string") {
    return "Password is required";
  }
  if (password.length < 6) {
    return "Password must be at least 6 characters";
  }
  if (password.length > 128) {
    return "Password too long";
  }
  return null;
}

export function validateRole(role: unknown): string | null {
  if (typeof role !== "string" || !VALID_ROLES.includes(role)) {
    return `Role must be one of: ${VALID_ROLES.join(", ")}`;
  }
  return null;
}

export function validateStatus(status: unknown): string | null {
  if (typeof status !== "string" || !VALID_STATUSES.includes(status)) {
    return `Status must be one of: ${VALID_STATUSES.join(", ")}`;
  }
  return null;
}
