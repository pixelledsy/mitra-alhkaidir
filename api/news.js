const S = require('../lib/server');

const CATS = ['Pengumuman', 'Kegiatan', 'Prestasi', 'PPDB', 'Umum'];
const RE_DATE = /^\d{4}-\d{2}-\d{2}$/;
const RE_IMG = /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+\/=]+$/;
const today = () => new Date(Date.now() + 7 * 36e5).toISOString().slice(0, 10); // WIB

function pub(n, full) {
  const o = {
    id: n.id, title: n.title, category: n.category, date: n.date, excerpt: n.excerpt,
    image: n.hasImage ? '/api/news?img=' + n.id + '&v=' + n.updatedAt : null,
  };
  if (full) o.body = n.body;
  return o;
}

module.exports = async (req, res) => {
  try {
    const q = req.query || {};
    const m = req.method;

    if (m === 'GET') {
      if (q.img) { // gambar sampul
        if (!S.hasDB()) return S.json(res, 404, { error: 'Tidak ada' });
        const d = await S.redis('HGET', 'newsimg', String(q.img));
        const mm = d && /^data:(image\/[a-z]+);base64,(.*)$/.exec(d);
        if (!mm) return S.json(res, 404, { error: 'Tidak ada' });
        res.statusCode = 200;
        res.setHeader('Content-Type', mm[1]);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.end(Buffer.from(mm[2], 'base64'));
      }
      if (!S.hasDB()) return S.json(res, 200, { items: [], total: 0, db: false });
      const cache = 'public, max-age=0, s-maxage=10, must-revalidate'; // browser selalu cek ulang, CDN menyimpan 10 detik
      if (q.id) {
        const raw = await S.redis('HGET', 'news', String(q.id));
        if (!raw) return S.json(res, 404, { error: 'Berita tidak ditemukan' });
        return S.json(res, 200, { item: pub(JSON.parse(raw), true), db: true }, cache);
      }
      let list = await S.allNews();
      if (q.cat) list = list.filter((n) => n.category === q.cat);
      const off = Math.max(0, +q.offset || 0);
      const lim = Math.min(100, Math.max(1, +q.limit || 9));
      return S.json(res, 200, { items: list.slice(off, off + lim).map((n) => pub(n)), total: list.length, db: true }, cache);
    }

    // Selain GET: harus admin yang sudah masuk
    if (!S.sameOrigin(req)) return S.json(res, 403, { error: 'Permintaan ditolak' });
    if (!S.session(req)) return S.json(res, 401, { error: 'Sesi berakhir. Silakan masuk lagi.' });
    if (!S.hasDB()) return S.json(res, 503, { error: 'Penyimpanan berita belum diaktifkan. Lihat PANDUAN-ADMIN.md.' });

    if (m === 'DELETE') {
      const id = String(q.id || '');
      if (!id) return S.json(res, 400, { error: 'ID kosong' });
      await S.redis('HDEL', 'news', id);
      await S.redis('HDEL', 'newsimg', id);
      return S.json(res, 200, { ok: true });
    }

    if (m === 'POST' || m === 'PUT') {
      const b = await S.body(req);
      let old = null;
      if (m === 'PUT') {
        const raw = await S.redis('HGET', 'news', String(q.id || ''));
        if (!raw) return S.json(res, 404, { error: 'Berita tidak ditemukan' });
        old = JSON.parse(raw);
      }
      const title = String(b.title !== undefined ? b.title : (old ? old.title : '')).trim();
      const text = String(b.body !== undefined ? b.body : (old ? old.body : '')).trim();
      const category = b.category !== undefined ? String(b.category) : (old ? old.category : 'Umum');
      const date = b.date ? String(b.date) : (old ? old.date : today());
      if (!title || title.length > 150) return S.json(res, 400, { error: 'Judul wajib diisi (maksimal 150 huruf).' });
      if (!text || text.length > 20000) return S.json(res, 400, { error: 'Isi berita wajib diisi (maksimal 20.000 huruf).' });
      if (CATS.indexOf(category) < 0) return S.json(res, 400, { error: 'Kategori tidak dikenal.' });
      if (!RE_DATE.test(date)) return S.json(res, 400, { error: 'Format tanggal salah.' });
      let img = b.imageData;
      if (typeof img === 'string' && (!RE_IMG.test(img) || img.length > 600000)) return S.json(res, 400, { error: 'Gambar tidak valid atau terlalu besar.' });

      const now = Date.now();
      const id = old ? old.id : now.toString(36) + S.crypto.randomBytes(3).toString('hex');
      const rec = {
        id, title, body: text, category, date,
        excerpt: text.replace(/\s+/g, ' ').slice(0, 160) + (text.length > 160 ? '…' : ''),
        hasImage: old ? old.hasImage : false,
        createdAt: old ? old.createdAt : now, updatedAt: now,
      };
      if (typeof img === 'string') { await S.redis('HSET', 'newsimg', id, img); rec.hasImage = true; }
      else if (img === null && old) { await S.redis('HDEL', 'newsimg', id); rec.hasImage = false; }
      await S.redis('HSET', 'news', id, JSON.stringify(rec));
      return S.json(res, m === 'POST' ? 201 : 200, { ok: true, item: pub(rec) });
    }
    S.json(res, 405, { error: 'Metode tidak didukung' });
  } catch (e) {
    S.json(res, 500, { error: 'Terjadi kesalahan pada server.' });
  }
};
