const S = require('../lib/server');

const GROUPS = ['Yayasan', 'Pondok Pesantren', 'SMP Islam', 'Madrasah Aliyah'];
const RE_IMG = /^data:image\/(webp|jpeg|png);base64,[A-Za-z0-9+\/=]+$/;

function pub(n) {
  return { id: n.id, name: n.name, role: n.role, group: n.group, order: n.order,
    photo: n.hasPhoto ? '/api/staff?img=' + n.id + '&v=' + n.updatedAt : null };
}

module.exports = async (req, res) => {
  try {
    const q = req.query || {};
    const m = req.method;

    if (m === 'GET') {
      if (q.img) {
        if (!S.hasDB()) return S.json(res, 404, { error: 'Tidak ada' });
        const d = await S.redis('HGET', 'staffimg', String(q.img));
        const mm = d && /^data:(image\/[a-z]+);base64,(.*)$/.exec(d);
        if (!mm) return S.json(res, 404, { error: 'Tidak ada' });
        res.statusCode = 200;
        res.setHeader('Content-Type', mm[1]);
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.end(Buffer.from(mm[2], 'base64'));
      }
      if (!S.hasDB()) return S.json(res, 200, { items: [], groups: GROUPS, db: false });
      const r = await S.redis('HGETALL', 'staff');
      const vals = Array.isArray(r) ? r.filter((_, i) => i % 2 === 1) : Object.values(r || {});
      const items = [];
      vals.forEach((v) => { try { items.push(JSON.parse(v)); } catch (e) {} });
      items.sort((a, b) => GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group) || a.order - b.order || a.createdAt - b.createdAt);
      return S.json(res, 200, { items: items.map(pub), groups: GROUPS, db: true }, 'public, max-age=0, s-maxage=10, must-revalidate');
    }

    if (!S.sameOrigin(req)) return S.json(res, 403, { error: 'Permintaan ditolak' });
    if (!S.session(req)) return S.json(res, 401, { error: 'Sesi berakhir. Silakan masuk lagi.' });
    if (!S.hasDB()) return S.json(res, 503, { error: 'Penyimpanan belum diaktifkan. Lihat PANDUAN-ADMIN.md.' });

    if (m === 'DELETE') {
      const id = String(q.id || '');
      if (!id) return S.json(res, 400, { error: 'ID kosong' });
      await S.redis('HDEL', 'staff', id);
      await S.redis('HDEL', 'staffimg', id);
      return S.json(res, 200, { ok: true });
    }

    if (m === 'POST' || m === 'PUT') {
      const b = await S.body(req);
      let old = null;
      if (m === 'PUT') {
        const raw = await S.redis('HGET', 'staff', String(q.id || ''));
        if (!raw) return S.json(res, 404, { error: 'Data tidak ditemukan' });
        old = JSON.parse(raw);
      }
      const pick = (k, d) => (b[k] !== undefined ? b[k] : (old ? old[k] : d));
      const name = String(pick('name', '')).trim();
      const role = String(pick('role', '')).trim();
      const group = String(pick('group', 'Madrasah Aliyah'));
      const order = Math.round(+pick('order', 10));
      if (!name || name.length > 80) return S.json(res, 400, { error: 'Nama wajib diisi (maksimal 80 huruf).' });
      if (!role || role.length > 100) return S.json(res, 400, { error: 'Jabatan wajib diisi (maksimal 100 huruf).' });
      if (GROUPS.indexOf(group) < 0) return S.json(res, 400, { error: 'Lembaga tidak dikenal.' });
      if (!(order >= -999 && order <= 999)) return S.json(res, 400, { error: 'Urutan harus berupa angka -999 sampai 999.' });
      const photo = b.photoData;
      if (typeof photo === 'string' && (!RE_IMG.test(photo) || photo.length > 250000)) return S.json(res, 400, { error: 'Foto tidak valid atau terlalu besar.' });
      if (m === 'POST' && (await S.redis('HLEN', 'staff')) >= 200) return S.json(res, 400, { error: 'Daftar sudah penuh (maksimal 200 orang).' });

      const now = Date.now();
      const id = old ? old.id : now.toString(36) + S.crypto.randomBytes(3).toString('hex');
      const rec = { id, name, role, group, order, hasPhoto: old ? old.hasPhoto : false, createdAt: old ? old.createdAt : now, updatedAt: now };
      if (typeof photo === 'string') { await S.redis('HSET', 'staffimg', id, photo); rec.hasPhoto = true; }
      else if (photo === null && old) { await S.redis('HDEL', 'staffimg', id); rec.hasPhoto = false; }
      await S.redis('HSET', 'staff', id, JSON.stringify(rec));
      return S.json(res, m === 'POST' ? 201 : 200, { ok: true, item: pub(rec) });
    }
    S.json(res, 405, { error: 'Metode tidak didukung' });
  } catch (e) {
    S.json(res, 500, { error: 'Terjadi kesalahan pada server.' });
  }
};
