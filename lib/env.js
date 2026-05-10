export function requiredEnv(name) {
  const value = process.env[name]
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export function optionalEnv(name, fallback = '') {
  return process.env[name] || fallback
}

export function boolEnv(name, fallback = false) {
  const value = process.env[name]
  if (value === undefined || value === null || value === '') return fallback
  return ['true', '1', 'yes', 'y'].includes(String(value).toLowerCase())
}

export function intEnv(name, fallback) {
  const value = Number.parseInt(process.env[name] || '', 10)
  return Number.isFinite(value) ? value : fallback
}
