// Bagian berita yang dipakai bersama oleh index.html dan berita.html
(function () {
  var N = window.NEWS = {};
  N.el = function (t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
  N.fmt = function (d) { try { return new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return d; } };
  N.card = function (n) {
    var a = N.el('a', 'ncard'); a.href = '/berita?id=' + encodeURIComponent(n.id);
    var im = N.el('div', 'nimg'); if (n.image) { var i = new Image(); i.src = n.image; i.alt = ''; i.loading = 'lazy'; im.appendChild(i); }
    var b = N.el('div', 'nbody'), m = N.el('div', 'nmeta');
    m.appendChild(N.el('span', 'ncat', n.category)); m.appendChild(N.el('time', null, N.fmt(n.date)));
    b.appendChild(m); b.appendChild(N.el('h3', null, n.title)); b.appendChild(N.el('p', null, n.excerpt));
    a.appendChild(im); a.appendChild(b); return a;
  };
  N.empty = function (r) { return N.el('p', 'nempty', r && r.db === false ? 'Berita belum tersedia.' : 'Belum ada berita. Silakan kembali lagi nanti.'); };
  N.get = function (qs) { return fetch('/api/news?' + qs, { credentials: 'same-origin' }).then(function (r) { if (!r.ok) throw r; return r.json(); }); };
  document.addEventListener('DOMContentLoaded', function () {
    var g = document.getElementById('newsgrid'); if (!g) return;
    N.get('limit=3').then(function (r) {
      g.textContent = '';
      if (!r.items || !r.items.length) g.appendChild(N.empty(r)); else r.items.forEach(function (n) { g.appendChild(N.card(n)); });
    }).catch(function () { g.textContent = ''; g.appendChild(N.empty()); });
  });
})();
