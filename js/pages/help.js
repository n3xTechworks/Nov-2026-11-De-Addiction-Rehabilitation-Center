/* help: live search across FAQ groups (hides empty groups, opens the first match, counts results) */
(function () {
  var input = document.getElementById('helpSearch');
  var count = document.getElementById('helpCount');
  var empty = document.getElementById('helpEmpty');
  var groups = [].slice.call(document.querySelectorAll('[data-help-group]'));
  if (!input) return;
  var timer;
  function run() {
    var q = input.value.trim().toLowerCase();
    var total = 0, shown = 0;
    groups.forEach(function (g) {
      var n = 0;
      g.querySelectorAll('.faq-item').forEach(function (item) {
        var hit = !q || item.textContent.toLowerCase().indexOf(q) > -1;
        item.hidden = !hit;
        item.open = !!(q && hit && n === 0);
        if (hit) n++;
      });
      g.hidden = n === 0;
      total += n; if (n) shown++;
    });
    empty.hidden = total !== 0;
    count.textContent = q ? total + (total === 1 ? ' answer' : ' answers') + ' found for "' + input.value.trim() + '"' : total + ' answers in ' + shown + ' topics';
  }
  input.addEventListener('input', function () { clearTimeout(timer); timer = setTimeout(run, 120); });
  input.addEventListener('keydown', function (e) { if (e.key === 'Escape') { input.value = ''; run(); } });
})();
