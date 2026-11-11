const S = require('../lib/server');

// Jadwal awal (dipakai jika admin belum mengubah apa pun)
const DEFAULT = [
  ['04:30', 'Bangun, salat Subuh berjamaah, tadarus'], ['05:30', 'Mandi dan sarapan'],
  ['06:30', 'Latihan bahasa Arab dan Inggris'], ['07:15', 'Pembelajaran pagi'],
  ['12:00', 'Salat Dzuhur berjamaah dan makan siang'], ['13:00', 'Pembelajaran siang'],
  ['15:00', 'Salat Ashar berjamaah'], ['15:45', 'Olahraga dan ekstrakurikuler'],
  ['17:30', 'Mandi dan bersiap ke masjid'], ['17:50', 'Salat Maghrib berjamaah dan mengaji'],
  ['19:00', 'Salat Isya berjamaah'], ['19:30', 'Belajar malam'], ['21:00', 'Istirahat malam'],
].map(([t, l]) => ({ t, l }));
const RE_T = /^([01]\d|2[0-3]):[0-5]\d$/;

module.exports = async (req, res) => {
  try {
    const m = req.method;
    if (m === 'GET') {
      if (!S.hasDB()) return S.json(res, 200, { items: DEFAULT, custom: false, db: false });
      const raw = await S.redis('GET', 'schedule');
      let items = null;
      if (raw) { try { items = JSON.parse(raw); } catch (e) {} }
      const cache = 'public, max-age=0, s-maxage=10, must-revalidate';
      if (Array.isArray(items) && items.length) return S.json(res, 200, { items, custom: true, db: true }, cache);
      return S.json(res, 200, { items: DEFAULT, custom: false, db: true }, cache);
    }

    if (!S.sameOrigin(req)) return S.json(res, 403, { error: 'Permintaan ditolak' });
    if (!S.session(req)) return S.json(res, 401, { error: 'Sesi berakhir. Silakan masuk lagi.' });
    if (!S.hasDB()) return S.json(res, 503, { error: 'Penyimpanan belum diaktifkan. Lihat PANDUAN-ADMIN.md.' });

    if (m === 'DELETE') { // kembali ke jadwal awal
      await S.redis('DEL', 'schedule');
      return S.json(res, 200, { ok: true });
    }
    if (m === 'PUT') {
      const b = await S.body(req);
      if (!Array.isArray(b.items) || b.items.length < 1 || b.items.length > 40) return S.json(res, 400, { error: 'Isi 1 sampai 40 kegiatan.' });
      const items = [];
      for (const x of b.items) {
        const t = String((x && x.t) || '').trim(), l = String((x && x.l) || '').trim();
        if (!RE_T.test(t)) return S.json(res, 400, { error: 'Jam harus berformat JJ:MM, misalnya 07:15.' });
        if (!l || l.length > 90) return S.json(res, 400, { error: 'Nama kegiatan wajib diisi (maksimal 90 huruf).' });
        items.push({ t, l });
      }
      items.sort((a, b2) => a.t.localeCompare(b2.t));
      for (let i = 1; i < items.length; i++) if (items[i].t === items[i - 1].t) return S.json(res, 400, { error: 'Ada dua kegiatan dengan jam yang sama (' + items[i].t + ').' });
      await S.redis('SET', 'schedule', JSON.stringify(items));
      return S.json(res, 200, { ok: true, items });
    }
    S.json(res, 405, { error: 'Metode tidak didukung' });
  } catch (e) {
    S.json(res, 500, { error: 'Terjadi kesalahan pada server.' });
  }
};
