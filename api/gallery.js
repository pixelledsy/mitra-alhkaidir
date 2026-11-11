const S = require('../lib/server');

const RE_IMG = /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+\/=]+$/;
const MAX_ITEMS = 300;

function pub(g) {
  return { id: g.id, caption: g.caption || '', w: g.w, h: g.h, createdAt: g.createdAt, image: '/api/gallery?img=' + g.id + '&v=' + g.createdAt };
}

module.exports = async (req, res) => {
  try {
    const q = req.query || {};
    const m = req.method;

    if (m === 'GET') {
      if (q.img) { // file gambar
        if (!S.hasDB()) return S.json(res, 404, { error: 'Tidak ada' });
        const d = await S.redis('HGET', 'galimg', String(q.img));
        const mm = d && /^data:(image\/[a-z]+);base64,(.*)$/.exec(d);
        if (!mm) return S.json(res, 404, { error: 'Tidak ada' });
        res.statusCode = 200;
        res.setHeader('Content-Type', mm[1]);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.end(Buffer.from(mm[2], 'base64'));
      }
      if (!S.hasDB()) return S.json(res, 200, { items: [], db: false });
      const r = await S.redis('HGETALL', 'gallery');
      const vals = Array.isArray(r) ? r.filter((_, i) => i % 2 === 1) : Object.values(r || {});
      const items = [];
      vals.forEach((v) => { try { items.push(JSON.parse(v)); } catch (e) {} });
      items.sort((a, b) => b.createdAt - a.createdAt);
      return S.json(res, 200, { items: items.map(pub), db: true }, 'public, max-age=0, s-maxage=10, must-revalidate');
    }

    // Selain GET: harus admin yang sudah masuk
    if (!S.sameOrigin(req)) return S.json(res, 403, { error: 'Permintaan ditolak' });
    if (!S.session(req)) return S.json(res, 401, { error: 'Sesi berakhir. Silakan masuk lagi.' });
    if (!S.hasDB()) return S.json(res, 503, { error: 'Penyimpanan belum diaktifkan. Lihat PANDUAN-ADMIN.md.' });

    if (m === 'DELETE') {
      const id = String(q.id || '');
      if (!id) return S.json(res, 400, { error: 'ID kosong' });
      await S.redis('HDEL', 'gallery', id);
      await S.redis('HDEL', 'galimg', id);
      return S.json(res, 200, { ok: true });
    }

    const b = await S.body(req);

    if (m === 'PUT') { // ubah keterangan
      const raw = await S.redis('HGET', 'gallery', String(q.id || ''));
      if (!raw) return S.json(res, 404, { error: 'Foto tidak ditemukan' });
      const rec = JSON.parse(raw);
      const cap = String(b.caption == null ? '' : b.caption).trim();
      if (cap.length > 80) return S.json(res, 400, { error: 'Keterangan maksimal 80 huruf.' });
      rec.caption = cap;
      await S.redis('HSET', 'gallery', rec.id, JSON.stringify(rec));
      return S.json(res, 200, { ok: true, item: pub(rec) });
    }

    if (m === 'POST') {
      const img = b.imageData;
      const w = Math.round(+b.w), h = Math.round(+b.h);
      const cap = String(b.caption == null ? '' : b.caption).trim();
      if (typeof img !== 'string' || !RE_IMG.test(img) || img.length > 600000) return S.json(res, 400, { error: 'Gambar tidak valid atau terlalu besar.' });
      if (!(w > 0 && w <= 6000 && h > 0 && h <= 6000)) return S.json(res, 400, { error: 'Ukuran gambar tidak valid.' });
      if (cap.length > 80) return S.json(res, 400, { error: 'Keterangan maksimal 80 huruf.' });
      const count = await S.redis('HLEN', 'gallery');
      if (count >= MAX_ITEMS) return S.json(res, 400, { error: 'Galeri sudah penuh (maksimal ' + MAX_ITEMS + ' foto). Hapus beberapa foto dulu.' });
      const now = Date.now();
      const id = now.toString(36) + S.crypto.randomBytes(3).toString('hex');
      const rec = { id, caption: cap, w, h, createdAt: now };
      await S.redis('HSET', 'galimg', id, img);
      await S.redis('HSET', 'gallery', id, JSON.stringify(rec));
      return S.json(res, 201, { ok: true, item: pub(rec) });
    }
    S.json(res, 405, { error: 'Metode tidak didukung' });
  } catch (e) {
    S.json(res, 500, { error: 'Terjadi kesalahan pada server.' });
  }
};
