/* blog article: copy-link button with toast feedback */
(function () {
  var b = document.querySelector('[data-copy-link]');
  if (!b) return;
  b.addEventListener('click', function () {
    var url = location.href.split('#')[0];
    var ok = function () { if (window.Harborlight) Harborlight.toast('Link copied. Share it privately with someone you trust.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(ok, ok); else ok();
  });
})();
