export function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function getEnv(name, fallback = undefined) {
  const value = process.env[name];
  return value === undefined || value === "" ? fallback : value;
}

export function getBoolEnv(name, fallback = false) {
  const value = getEnv(name, String(fallback));
  return String(value).toLowerCase() === "true";
}

export function getNumberEnv(name, fallback) {
  const value = getEnv(name, String(fallback));
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}
