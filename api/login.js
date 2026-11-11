const S = require('../lib/server');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return S.json(res, 405, { error: 'Metode tidak didukung' });
  if (!S.sameOrigin(req)) return S.json(res, 403, { error: 'Permintaan ditolak' });
  if (await S.tooMany(req)) return S.json(res, 429, { error: 'Terlalu banyak percobaan. Coba lagi dalam 15 menit.' });
  const b = await S.body(req);
  const okUser = S.safeEqual(String(b.username || ''), S.USER);
  const okPass = S.safeEqual(String(b.password || ''), S.PASS);
  if (!(okUser && okPass)) return S.json(res, 401, { error: 'Nama pengguna atau kata sandi salah.' });
  await S.resetLimit(req);
  S.setCookie(req, res, S.makeToken(), S.TTL);
  S.json(res, 200, { ok: true, user: S.USER, db: S.hasDB() });
};
