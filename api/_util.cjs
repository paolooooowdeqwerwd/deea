const readBody = async (req) => {
  const chunks = []
  for await (const chunk of req) chunks.push(chunk)
  const raw = Buffer.concat(chunks).toString("utf8")
  if (!raw) return null
  try {
    return JSON.parse(raw)
  } catch {
    return { __invalid_json: true }
  }
}

const sendJson = (res, status, data) => {
  res.statusCode = status
  res.setHeader("Content-Type", "application/json; charset=utf-8")
  res.end(JSON.stringify(data))
}

const sendError = (res, status, message) => {
  sendJson(res, status, { error: message })
}

const getBearerToken = (req) => {
  const header = req.headers.authorization || req.headers.Authorization
  if (!header || typeof header !== "string") return null
  const [type, token] = header.split(" ")
  if (type !== "Bearer" || !token) return null
  return token
}

module.exports = { readBody, sendJson, sendError, getBearerToken }
