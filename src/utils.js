export function requireStaffApiKey(req, res, next) {
  const key = req.headers['x-staff-key'] || req.query.staff_key;
  if (!key || key !== process.env.STAFF_API_KEY) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}
