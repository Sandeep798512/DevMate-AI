/**
 * Validates that required string fields are present and non-empty.
 * Usage: validate(['code', 'question'])
 */
function validate(requiredFields) {
  return (req, res, next) => {
    for (const field of requiredFields) {
      const value = req.body[field];
      if (!value || typeof value !== "string" || !value.trim()) {
        return res.status(400).json({ error: `Field '${field}' is required and must be a non-empty string.` });
      }
      // Prevent extremely large payloads from reaching the AI
      if (value.length > 50000) {
        return res.status(400).json({ error: `Field '${field}' exceeds maximum length of 50,000 characters.` });
      }
    }
    next();
  };
}

module.exports = { validate };
