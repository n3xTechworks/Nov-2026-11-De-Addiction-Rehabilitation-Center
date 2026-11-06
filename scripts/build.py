#!/usr/bin/env python3
"""Harborlight static build. Run from anywhere:  python3 scripts/build.py   (stdlib only, safe to re-run)

src/pages/<name>.html  ->  <name>.html (site root)
    Optional front matter between two '---' lines (key: value), then the page body.
    Layout: public (head + helpline bar + header + <main id="main"> + [inner hero] + body + footer). No dashboard, no auth pages.
    See COMPONENTS.md "Build system" for every key and macro.
Also writes data/site-data.js from data/programs.json (so pages work from file://),
and warns about any referenced images/*.webp that does not exist yet.
"""
import html
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src"
PROGRAM_LIST = json.loads((ROOT / "data" / "programs.json").read_text(encoding="utf-8"))["programs"]
PROGRAMS = {x["slug"]: x for x in PROGRAM_LIST}
esc = html.escape
LAZY = ' loading="lazy" decoding="async"'


def inr(n):
    s = str(int(n))
    if len(s) <= 3:
        return s
    head, tail = s[:-3], s[-3:]
    parts = []
    while len(head) > 2:
        parts.insert(0, head[-2:])
        head = head[:-2]
    if head:
        parts.insert(0, head)
    return ",".join(parts + [tail])


def price(n):
    return "₹" + inr(n)


# ---------------------------------------------------------------- partials
def partial(name):
    p = SRC / "partials" / (name + ".html")
    if not p.exists():
        sys.exit("missing partial: " + name)
    return p.read_text(encoding="utf-8")


def include_partials(text, depth=0):
    def rep(m):
        return include_partials(partial(m.group(1).strip()), depth + 1) if depth < 5 else ""
    return re.sub(r"\{\{>\s*([\w\-]+)\s*\}\}", rep, text)


# ---------------------------------------------------------------- macros
ARROW = '<svg class="flip" viewBox="0 0 24 24" width="16" height="16" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'


def img_tag(slot, w, h, alt, size, lazy=True, cls=""):
    c = ' class="%s"' % cls if cls else ""
    return '<img%s src="images/%s-%s.webp" width="%d" height="%d" alt="%s"%s>' % (c, slot, size, w, h, esc(alt), LAZY if lazy else "")


def pr_facts(facts):
    return '<dl class="pr-facts">%s</dl>' % "".join("<div><dt>%s</dt><dd>%s</dd></div>" % (esc(k), esc(v)) for k, v in facts)


def pick_programs(arg):
    arg = (arg or "all").strip()
    if arg in ("core", "specialist"):
        return [x for x in PROGRAM_LIST if x["kind"] == arg]
    if arg == "all":
        return PROGRAM_LIST
    out = []
    for slug in [a.strip() for a in arg.split(",") if a.strip()]:
        if slug not in PROGRAMS:
            sys.exit("unknown program: " + slug)
        out.append(PROGRAMS[slug])
    return out


def program_row(x):
    """list row: arched photo left / body right (kicker, title, text, facts, actions)."""
    core = x["kind"] == "core"
    badge = '<span class="badge">Core program</span>' if core else '<span class="badge badge--amber">Specialist program</span>'
    title = '<a href="%s">%s</a>' % (x["page"], esc(x["name"])) if core else esc(x["name"])
    action = ('<a class="link" href="%s">Explore the %s program %s</a>' % (x["page"], esc(x["short"].lower()), ARROW) if core
              else '<a class="link" href="contact.html#enquiry">Ask about %s %s</a>' % (esc(x["short"].lower()), ARROW))
    return ('<article class="program-row" id="{slug}" data-program="{slug}">\n'
            '  <div class="pr-media">{img}</div>\n'
            '  <div class="pr-body">\n'
            '    <p class="pr-kicker">{badge}<span>{length}</span></p>\n'
            '    <h3 class="pr-title">{title}</h3>\n'
            '    <p class="pr-text">{summary}</p>\n'
            '    {facts}\n'
            '    <div class="pr-actions">{action}</div>\n'
            '  </div>\n'
            '</article>').format(slug=x["slug"], img=img_tag(x["image"], 800, 533, x["imageAlt"], 800), badge=badge, length=esc(x["facts"][0][1]),
                                 title=title, summary=esc(x["summary"]), facts=pr_facts(x["facts"]), action=action)


def macro_program_rows(arg, ctx):
    return '<div class="program-list">\n%s\n</div>' % "\n".join(program_row(x) for x in pick_programs(arg))


def macro_program_index(arg, ctx):
    """photo-less rows with an amber number (Home overviews / 'other programs')."""
    out = []
    for i, x in enumerate(pick_programs(arg), 1):
        out.append('<article class="program-row program-row--index">\n'
                   '  <span class="pr-num" aria-hidden="true">%02d</span>\n'
                   '  <div class="pr-body">\n'
                   '    <h3 class="pr-title"><a href="%s">%s</a></h3>\n'
                   '    <p class="pr-text">%s</p>\n'
                   '    %s\n'
                   '    <div class="pr-actions"><a class="link" href="%s">Learn about %s %s</a></div>\n'
                   '  </div>\n</article>' % (i, x["page"], esc(x["name"]), esc(x["tagline"]), pr_facts(x["facts"]), x["page"], esc(x["short"].lower()), ARROW))
    return '<div class="program-list">\n%s\n</div>' % "\n".join(out)


def need_program(ctx):
    x = ctx.get("_program")
    if not x:
        sys.exit("%s: program macro used but no 'program:' key in front matter" % ctx["_name"])
    return x


def macro_p_facts(arg, ctx):
    x = need_program(ctx)
    rows = "".join("<div><dt>%s</dt><dd>%s</dd></div>" % (esc(k), esc(v)) for k, v in x["facts"])
    return '<div class="panel panel--accent" id="facts"><h2>At a glance</h2><dl class="spec-grid spec-grid--1">%s</dl><p class="panel-note">%s</p></div>' % (rows, esc(x["tagline"]))


def macro_p_who(arg, ctx):
    x = need_program(ctx)
    return '<ul class="checklist">%s</ul>' % "".join("<li>%s</li>" % esc(i) for i in x["who"])


def macro_p_day(arg, ctx):
    x = need_program(ctx)
    return '<ol class="timeline">%s</ol>' % "".join('<li><span class="tl-year">%s</span><h3>%s</h3><p>%s</p></li>' % (esc(a), esc(b), esc(c)) for a, b, c in x["day"])


def macro_p_therapies(arg, ctx):
    x = need_program(ctx)
    return '<ol class="how-steps">%s</ol>' % "".join('<li><span class="how-num" aria-hidden="true">%d</span><div><h3>%s</h3><p>%s</p></div></li>' % (i + 1, esc(a), esc(b)) for i, (a, b) in enumerate(x["therapies"]))


def macro_p_faq(arg, ctx):
    x = need_program(ctx)
    items = "".join('<details class="faq-item" name="faq-%s"><summary>%s</summary><div class="faq-answer"><p>%s</p></div></details>' % (x["slug"], esc(q), esc(a)) for q, a in x["faqs"])
    return '<div class="faq"><div class="faq-list">%s</div></div>' % items


def macro_p_cost(arg, ctx):
    x = need_program(ctx)
    return ('<div class="panel panel--sand" id="cost"><h2>Length and cost</h2><p class="price"><span class="price-from">From</span> %s <span class="price-note">%s</span></p><p>%s</p></div>'
            % (price(x["priceFrom"]), esc(x["priceUnit"]), esc(x["cost"])))


def macro_p_others(arg, ctx):
    x = need_program(ctx)
    return macro_program_index(",".join(o["slug"] for o in PROGRAM_LIST if o["kind"] == "core" and o["slug"] != x["slug"]), ctx)


def macro_horizon(arg, ctx):
    """{{horizon}}: thin horizon line with a rising amber sun, between two sections."""
    return '<div class="horizon" aria-hidden="true"><span></span></div>'


MACROS = {
    "horizon": macro_horizon,
    "program_rows": macro_program_rows, "program_index": macro_program_index,
    "p_facts": macro_p_facts, "p_who": macro_p_who, "p_day": macro_p_day, "p_therapies": macro_p_therapies,
    "p_faq": macro_p_faq, "p_cost": macro_p_cost, "p_others": macro_p_others,
}

HERO_CURVE = '<div class="hero-horizon" aria-hidden="true"></div>'


def srcset(slot):
    s = "images/{s}-800.webp 800w, images/{s}-1600.webp 1600w".format(s=slot)
    if slot.startswith("hero-"):
        s += ", images/{s}-2000.webp 2000w".format(s=slot)
    return s


def page_hero(fm):
    slot = fm.get("hero")
    if not slot:
        return ""
    crumbs = [c.strip() for c in fm.get("crumbs", "").split("|") if c.strip()]
    nav = ""
    if crumbs:
        parts = ['<a href="index.html">Home</a>']
        for i, c in enumerate(crumbs):
            if "=" in c and i < len(crumbs) - 1:
                label, href = c.split("=", 1)
                parts.append('<a href="%s">%s</a>' % (href, esc(label)))
            else:
                parts.append('<span aria-current="page">%s</span>' % esc(c.split("=")[0]))
        nav = '<nav class="crumbs" aria-label="Breadcrumb">' + '<span aria-hidden="true">/</span>'.join(parts) + "</nav>\n      "
    eyebrow = '<p class="eyebrow">%s</p>\n      ' % esc(fm["eyebrow"]) if fm.get("eyebrow") else ""
    lead = '\n      <p>%s</p>' % fm["lead"] if fm.get("lead") else ""
    return ('<section class="page-hero" aria-labelledby="hero-title">\n'
            '    <img class="page-hero-bg" src="images/{s}-1600.webp" srcset="{ss}" sizes="100vw" width="1600" height="1067" alt="{alt}" fetchpriority="high">\n'
            '    <div class="hero-shade" aria-hidden="true"></div>\n'
            '    <div class="container page-hero-content">\n'
            '      {nav}{eyebrow}<h1 id="hero-title">{h1}</h1>{lead}\n'
            '    </div>\n    {curve}\n  </section>\n').format(s=slot, ss=srcset(slot), curve=HERO_CURVE, alt=esc(fm.get("hero_alt", "")), nav=nav, eyebrow=eyebrow, h1=fm.get("h1", ""), lead=lead)


# ---------------------------------------------------------------- front matter
def parse(text):
    fm = {}
    body = text
    if text.startswith("---"):
        parts = text.split("\n---", 1)
        head = parts[0][3:]
        body = parts[1].lstrip("\n") if len(parts) > 1 else ""
        for line in head.splitlines():
            if ":" in line and not line.strip().startswith("#"):
                k, v = line.split(":", 1)
                fm[k.strip()] = v.strip()
    return fm, body


NAV_HOME = {"home1", "home2"}
MISSING = set()


def apply_nav(text, nav):
    return re.sub(r'data-nav="(\w[\w\-]*)"', lambda m: 'aria-current="page"' if m.group(1) == nav else "", text)


def render_vars(text, ctx):
    def macro(m):
        name, arg = m.group(1), (m.group(2) or "").strip()
        if name in MACROS:
            return MACROS[name](arg, ctx)
        return m.group(0)
    text = re.sub(r"\{\{(\w+)(?:\s+([^}]*))?\}\}", macro, text)

    def var(m):
        key = m.group(1)
        if key.startswith("p."):
            pv = ctx.get("_program") or {}
            f = key[2:]
            val = pv.get(f)
            if f == "priceFrom" and pv:
                val = price(pv["priceFrom"])
            return "" if val is None else esc(str(val))
        if key in ctx:
            return str(ctx[key])
        print("  warning: %s: unknown placeholder {{%s}}" % (ctx["_name"], key))
        return ""
    return re.sub(r"\{\{([\w\.\-]+)\}\}", var, text)


def build_page(path):
    name = path.stem
    fm, body = parse(path.read_text(encoding="utf-8"))
    if "template" in fm:
        t = SRC / "templates" / (fm["template"] + ".html")
        tfm, tbody = parse(t.read_text(encoding="utf-8"))
        fm = {**tfm, **fm}
        body = tbody
    if fm.get("program"):
        if fm["program"] not in PROGRAMS:
            sys.exit("%s: unknown program %s" % (name, fm["program"]))
        pv = PROGRAMS[fm["program"]]
        fm.setdefault("hero", pv.get("heroImage", pv["image"]))
        fm.setdefault("hero_alt", pv.get("heroAlt", pv["imageAlt"]))
        fm.setdefault("crumbs", "Programs=programs.html|" + pv["short"])
        fm.setdefault("eyebrow", "Core program")
        fm.setdefault("h1", pv["name"])
        fm.setdefault("lead", pv["tagline"])
    nav = fm.get("nav", "")
    ctx = {"_name": name, "title": fm.get("title", "Harborlight Recovery Centre | " + name),
           "description": fm.get("description", "Harborlight Recovery Centre: confidential, evidence-based addiction treatment and rehabilitation."),
           "css": fm.get("css", name), "js": fm.get("js", name), "body_class": fm.get("body_class", ""),
           "home_current": " is-current" if nav in NAV_HOME else "", "year": "2026", "hero_curve": HERO_CURVE}
    for k, v in fm.items():
        if k not in ctx:
            ctx[k] = v
    if fm.get("program"):
        ctx["_program"] = PROGRAMS[fm["program"]]
    for k in ("title", "description"):
        ctx[k] = render_vars(ctx[k], ctx) if "{{" in ctx[k] else ctx[k]
    pre = fm.get("preload") or fm.get("hero")
    ctx["preload_tag"] = ('  <link rel="preload" as="image" href="images/{p}-1600.webp" imagesrcset="{ss}" imagesizes="100vw" fetchpriority="high">\n'.format(p=pre, ss=srcset(pre)) if pre else "")
    body = body.rstrip() + "\n"
    out = partial("head") + partial("header") + '  <main id="main">\n  ' + page_hero(fm) + body + "  </main>\n" + partial("footer")
    out = include_partials(out)
    out = render_vars(out, ctx)
    out = apply_nav(out, nav)
    for img in set(re.findall(r'images/([\w\-]+\.webp)', out)):
        if not (ROOT / "images" / img).exists():
            MISSING.add((img, name))
    (ROOT / (name + ".html")).write_text(out, encoding="utf-8")
    return name


def main():
    js = ("/* generated by scripts/build.py from data/programs.json: do not edit */\nwindow.HARBORLIGHT_PROGRAMS = "
          + json.dumps(PROGRAM_LIST, ensure_ascii=False) + ";\n")
    (ROOT / "data" / "site-data.js").write_text(js, encoding="utf-8")
    names = [build_page(p) for p in sorted((SRC / "pages").glob("*.html"))]
    print("built %d pages: %s" % (len(names), ", ".join(names)))
    if MISSING:
        by = {}
        for img, page in sorted(MISSING):
            by.setdefault(img, []).append(page)
        print("  note: %d image file(s) not in images/ yet: %s" % (len(by), ", ".join("%s (%s)" % (k, ",".join(v)) for k, v in sorted(by.items()))))


if __name__ == "__main__":
    main()
