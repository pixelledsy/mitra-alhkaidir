# Panduan Admin: Berita dan Login

## Cara kerjanya
- Halaman publik: `/berita` (daftar dan isi berita) dan bagian "Berita terbaru" di beranda.
- Halaman admin: `/masuk`. Setelah masuk, ada empat tab: **Berita** (tulis, edit, hapus berita), **Galeri** (unggah dan hapus foto), **Guru** (daftar pengelola), dan **Jadwal** (jadwal harian).
- Berita disimpan di database Redis (Upstash) yang disambungkan ke Vercel, jadi semua pengunjung melihat berita yang sama.
- Login diperiksa di server (folder `api/`), bukan di browser, jadi sandi tidak tampak di kode halaman.

## Langkah pemasangan (sekali saja, sekitar 5 menit)
1. Unggah seluruh isi folder ini ke GitHub (termasuk folder `api/`, `lib/`, `images/`, dan file `vercel.json`).
2. Buka proyek di Vercel, lalu menu **Storage**, pilih **Create Database**, pilih **Upstash for Redis** (paket gratis cukup), dan hubungkan ke proyek ini.
   Vercel otomatis menambahkan `KV_REST_API_URL` dan `KV_REST_API_TOKEN`.
3. **Deploy ulang** proyek (Deployments, titik tiga, Redeploy) supaya variabel tadi terbaca.
4. Buka `https://alamat-websitemu/masuk` dan masuk.

## Akun utama
- Nama pengguna: `admin`
- Kata sandi: `mitraalkhaidir`

Kata sandi ini mudah ditebak (sama dengan nama yayasan) dan juga tertulis di kode sebagai cadangan. Kalau repository GitHub-mu publik, siapa pun bisa membacanya. Sebaiknya ganti lewat Vercel, **Settings, Environment Variables**:

| Nama | Isi |
|---|---|
| `ADMIN_USERNAME` | nama pengguna baru |
| `ADMIN_PASSWORD` | kata sandi baru yang panjang dan unik |
| `SESSION_SECRET` | teks acak panjang (opsional, lebih aman) |

Setelah mengisi, deploy ulang. Variabel ini menggantikan akun cadangan di kode.

## Keamanan yang sudah ada
- Cookie sesi `HttpOnly`, `Secure`, `SameSite=Strict`, berlaku 12 jam.
- Maksimal 8 percobaan login per 15 menit per alamat IP.
- Hanya admin yang sudah masuk yang bisa menambah, mengubah, atau menghapus berita.
- Isi berita ditampilkan sebagai teks biasa, sehingga kode berbahaya yang diketik tidak dijalankan.

## Cara menulis berita
1. Masuk di `/masuk`.
2. Isi judul, kategori, tanggal, dan isi berita. Pisahkan paragraf dengan satu baris kosong.
3. Gambar sampul boleh dikosongkan. Gambar otomatis dikecilkan.
4. Klik **Terbitkan**. Berita muncul di `/berita` dan di beranda dalam beberapa detik.

## Cara menambah foto galeri
Ada dua cara, dan keduanya bisa dipakai bersamaan:
1. **Lewat halaman admin (paling mudah):** masuk di `/masuk`, buka tab **Galeri**, pilih satu atau beberapa foto, isi keterangan (boleh kosong), lalu klik **Unggah ke galeri**. Foto otomatis dikecilkan dan tampil paling depan di galeri beranda. Maksimal 300 foto.
2. **Lewat kode:** simpan foto di folder `images/`, lalu salin satu baris `div.tile` di bagian galeri `index.html`. Ukuran kotak ditentukan class: `tile` (biasa), `tile tall` (foto tegak), `tile wide` (foto panorama), `tile big` (kotak besar).

Foto yang diunggah lewat admin bisa dihapus atau diubah keterangannya di tab Galeri. Foto bawaan yang tertulis di kode hanya bisa diubah lewat file `index.html`.

## Profil Guru (daftar pengelola)
- Halaman publik: `/guru`. Isinya daftar orang yang memimpin sekolah, dikelompokkan menurut Yayasan, Pondok Pesantren, SMP Islam, dan Madrasah Aliyah.
- Untuk mengisi: masuk di `/masuk`, buka tab **Guru**, isi nama (beserta gelar), jabatan, lembaga, dan foto (boleh dikosongkan). Kalau tanpa foto, yang tampil adalah huruf awal nama.
- **Urutan tampil:** angka kecil tampil lebih dulu di dalam kelompoknya. Misalnya Kepala Madrasah diberi 1 dan wakilnya 2.
- Data bisa diedit dan dihapus kapan saja dari daftar di tab yang sama. Maksimal 200 orang.

## Jadwal harian
- Jadwal ini tampil di bagian "Kehidupan santri" di beranda, dan menyala sesuai jam di perangkat pengunjung.
- Buka tab **Jadwal**, ubah jam atau nama kegiatan, tambah atau hapus baris, lalu klik **Simpan jadwal**. Urutan dirapikan otomatis dan dua kegiatan tidak boleh punya jam yang sama.
- Isi jam **mulai** tiap kegiatan. Kegiatan berlangsung sampai jam mulai kegiatan berikutnya. Kegiatan terakhir (misalnya istirahat malam) berlanjut sampai jam mulai kegiatan pertama keesokan harinya.
- Tombol **Kembalikan ke jadwal awal** menghapus jadwal buatanmu dan memakai jadwal bawaan lagi.
- Waktu salat bergeser sepanjang tahun, jadi sesekali periksa kembali jam Subuh dan Maghrib.

## Ekstrakurikuler
Daftar ekstrakurikuler SMP Islam dan Madrasah Aliyah tertulis langsung di `index.html` (bagian Kehidupan dan tabel tiap lembaga). Untuk mengubahnya, edit file itu.
