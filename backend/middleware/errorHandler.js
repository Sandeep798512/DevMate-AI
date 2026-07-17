function errorHandler(err, req, res, next) {
  const status  = err.status || err.statusCode || 500;
  const message = err.message || "Internal server error";
  const isDev   = process.env.NODE_ENV !== "production";

  // Log all errors server-side
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.path} — ${status}: ${message}`);
  if (isDev && err.stack) console.error(err.stack);

  res.status(status).json({
    error: message,
    ...(isDev && status === 500 ? { stack: err.stack } : {}),
  });
}

function validate(fields) {
  return (req, res, next) => {
    for (const field of fields) {
      const val = req.body[field];
      if (!val || typeof val !== "string" || !val.trim()) {
        return res.status(400).json({ error: `'${field}' is required and cannot be empty.` });
      }
      if (val.length > 60000) {
        return res.status(400).json({ error: `'${field}' exceeds maximum allowed length.` });
      }
    }
    next();
  };
}

module.exports = { errorHandler, validate };
