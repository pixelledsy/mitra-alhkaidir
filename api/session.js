const S = require('../lib/server');

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const s = S.session(req);
    return S.json(res, 200, { auth: !!s, user: s ? s.u : null, db: S.hasDB() });
  }
  if (req.method === 'POST' || req.method === 'DELETE') { // keluar
    if (!S.sameOrigin(req)) return S.json(res, 403, { error: 'Permintaan ditolak' });
    S.setCookie(req, res, '', 0);
    return S.json(res, 200, { ok: true });
  }
  S.json(res, 405, { error: 'Metode tidak didukung' });
};
