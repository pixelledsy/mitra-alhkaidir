# Panduan Admin: Berita dan Login

## Cara kerjanya
- Halaman publik: `/berita` (daftar dan isi berita) dan bagian "Berita terbaru" di beranda.
- Halaman admin: `/masuk`. Setelah masuk, ada dua tab: **Berita** (tulis, edit, hapus berita) dan **Galeri** (unggah dan hapus foto galeri).
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
