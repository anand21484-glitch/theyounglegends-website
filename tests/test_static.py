"""
Static tests for The Young Legends website.

Run from the repo root:   python -m pytest tests -q

Every rule the site must follow lives here as a test. When you change the site
(TDD): first add or update a test that describes the change, watch it fail,
then edit the site until it passes.
"""
import re
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit

import pytest

ROOT = Path(__file__).resolve().parent.parent
DOMAIN = "theyounglegends.co.in"
PLAY_AZADI = "https://play.google.com/store/apps/details?id=com.anand.theyounglegends"
PLAY_CM = "https://play.google.com/store/apps/details?id=com.theyounglegends.curiousminds"
PRIVACY_CM = "https://anand21484-glitch.github.io/Curious-Minds/doc/curious-minds-privacy-policy.html"
PRIVACY_URL = "https://sites.google.com/view/azadi-tales-privacy"
FORM_ENDPOINT = "https://formsubmit.co"

PAGES = {
    "/": "index.html",
    "/azadi-tales/": "azadi-tales/index.html",
    "/curious-minds/": "curious-minds/index.html",
    "/dare-to-dream/": "dare-to-dream/index.html",
    "/explore/": "explore/index.html",
    "/parents/": "parents/index.html",
    "/educators/": "educators/index.html",
    "/our-story/": "our-story/index.html",
    "/contact/": "contact/index.html",
    "/legal/": "legal/index.html",
}
ALL_HTML = list(PAGES.values()) + ["404.html"]

# Only these external sites may be linked to. Add new ones deliberately.
ALLOWED_EXTERNAL_HOSTS = {
    "play.google.com", "anand21484-glitch.github.io", "sites.google.com", "www.instagram.com",
    "www.youtube.com", DOMAIN,
}


class Doc(HTMLParser):
    """Collects the tags/attributes we test against."""

    def __init__(self, text):
        super().__init__(convert_charrefs=True)
        self.tags = []          # (tag, attrs-dict)
        self.inline_scripts = []
        self._in_script = False
        self._script_has_src = False
        self.h1 = 0
        self.title = ""
        self._in_title = False
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        self.tags.append((tag, a))
        if tag == "script":
            self._in_script = True
            self._script_has_src = "src" in a
        if tag == "h1":
            self.h1 += 1
        if tag == "title":
            self._in_title = True

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)

    def handle_endtag(self, tag):
        if tag == "script":
            self._in_script = False
        if tag == "title":
            self._in_title = False

    def handle_data(self, data):
        if self._in_script and not self._script_has_src and data.strip():
            self.inline_scripts.append(data.strip()[:80])
        if self._in_title:
            self.title += data

    def find(self, tag, **want):
        return [a for t, a in self.tags if t == tag and all(a.get(k) == v for k, v in want.items())]


def read(rel):
    return (ROOT / rel).read_text(encoding="utf-8")


@pytest.fixture(scope="module")
def docs():
    return {rel: Doc(read(rel)) for rel in ALL_HTML}


# ---------------------------------------------------------------- structure

@pytest.mark.parametrize("rel", ALL_HTML + ["robots.txt", "sitemap.xml", "CNAME", ".nojekyll"])
def test_required_files_exist(rel):
    assert (ROOT / rel).is_file(), f"missing {rel}"


def test_cname_points_to_domain():
    assert read("CNAME").strip() == DOMAIN


@pytest.mark.parametrize("rel", ALL_HTML)
def test_page_basics(docs, rel):
    d = docs[rel]
    assert d.h1 == 1, f"{rel}: exactly one <h1> required, found {d.h1}"
    assert d.title.strip(), f"{rel}: <title> missing"
    assert d.find("html", lang="en"), f"{rel}: <html lang='en'> missing"
    assert d.find("meta", name="viewport"), f"{rel}: viewport meta missing"


def test_titles_are_unique(docs):
    titles = [docs[rel].title.strip() for rel in PAGES.values()]
    assert len(titles) == len(set(titles)), "every page needs its own <title>"


@pytest.mark.parametrize("path,rel", PAGES.items())
def test_seo_meta(docs, path, rel):
    d = docs[rel]
    assert d.find("meta", name="description"), f"{rel}: meta description missing"
    canon = d.find("link", rel="canonical")
    assert canon and canon[0]["href"] == f"https://{DOMAIN}{path}"
    assert d.find("meta", property="og:title")


def test_sitemap_and_robots():
    urls = re.findall(r"<loc>https://" + re.escape(DOMAIN) + r"([^<]*)</loc>", read("sitemap.xml"))
    assert urls, "sitemap is empty"
    for u in urls:
        path = urlsplit(u.replace("&amp;", "&")).path
        assert path in PAGES, f"sitemap lists unknown page {u}"
    assert f"Sitemap: https://{DOMAIN}/sitemap.xml" in read("robots.txt")


# ---------------------------------------------------------------- links

def _target_file(path):
    t = ROOT / path.lstrip("/")
    return t / "index.html" if path.endswith("/") else t


@pytest.mark.parametrize("rel", ALL_HTML)
def test_internal_links_and_assets_resolve(docs, rel):
    d = docs[rel]
    ids = {a["id"] for _, a in d.tags if "id" in a}
    broken = []
    for tag, a in d.tags:
        for attr in ("href", "src"):
            u = a.get(attr)
            if not u or u.startswith(("http", "mailto:", "data:")):
                continue
            p = urlsplit(u)
            if not p.path:                                  # same-page anchor
                if p.fragment and p.fragment not in ids and p.fragment != "top":
                    broken.append(u)
                continue
            target = _target_file(p.path)
            if not target.is_file():
                broken.append(u)
            elif target.name == "icons.svg" and p.fragment:
                if f'id="{p.fragment}"' not in target.read_text(encoding="utf-8"):
                    broken.append(u)
            elif p.fragment and target.suffix == ".html":
                if f'id="{p.fragment}"' not in target.read_text(encoding="utf-8"):
                    broken.append(u)
    assert not broken, f"{rel}: broken links {broken}"


@pytest.mark.parametrize("rel", ALL_HTML)
def test_no_dead_hash_links(docs, rel):
    dead = [a for t, a in docs[rel].tags if t == "a" and a.get("href") == "#"]
    assert not dead, f"{rel}: {len(dead)} links go nowhere (href='#')"


@pytest.mark.parametrize("rel", ALL_HTML)
def test_external_links_are_https_and_allowlisted(docs, rel):
    bad = []
    for _, a in docs[rel].tags:
        for attr in ("href", "src"):
            u = a.get(attr, "")
            if u.startswith("http://"):
                bad.append(u)
            elif u.startswith("https://") and urlsplit(u).hostname not in ALLOWED_EXTERNAL_HOSTS:
                bad.append(u)
    assert not bad, f"{rel}: insecure or unexpected external links {bad}"


def test_store_and_privacy_links(docs):
    home = docs["index.html"]
    assert home.find("a", href=PLAY_AZADI), "Google Play button must open Azadi Tales"
    for rel in PAGES.values():
        hrefs = [a.get("href", "") for t, a in docs[rel].tags if t == "a"]
        policy = PRIVACY_CM if rel == "curious-minds/index.html" else PRIVACY_URL  # each app page links its own policy
        assert policy in hrefs, f"{rel}: privacy link missing"


def test_curious_minds_is_live_on_google_play(docs):
    """Curious Minds launched on Google Play (Nov 2026)."""
    cm = docs["curious-minds/index.html"]
    badge = cm.find("a", href=PLAY_CM)
    assert badge, "Curious Minds page needs a working Google Play badge"
    assert all("noopener" in a.get("rel", "") for a in badge)
    for rel in ("index.html", "curious-minds/index.html"):
        assert "Coming soon to" not in read(rel), f"{rel}: still says Curious Minds is coming soon"
    home_cm_card = re.search(r"Curious Minds · Science.*?</div></div>", read("index.html"), re.S).group(0)
    assert "Available on Google Play" in home_cm_card, "home page app card should say it's on Google Play"


@pytest.mark.parametrize("rel", ["curious-minds/index.html", "parents/index.html"])
def test_curious_minds_privacy_policy_linked(docs, rel):
    links = docs[rel].find("a", href=PRIVACY_CM)
    assert links, f"{rel}: link to the Curious Minds privacy policy missing"
    assert all("noopener" in a.get("rel", "") and a.get("target") == "_blank" for a in links)


def test_parents_page_links_both_app_privacy_policies(docs):
    hrefs = [a.get("href") for t, a in docs["parents/index.html"].tags if t == "a"]
    assert PRIVACY_URL in hrefs and PRIVACY_CM in hrefs


# ---- Website copy must match what the apps really do (Play Store listings, Nov 2026)

SITE_TEXT_FILES = ALL_HTML + ["scripts/legal-data.js"]


@pytest.mark.parametrize("rel", SITE_TEXT_FILES)
def test_no_curiosity_score_feature(rel):
    """Neither app has a 'Curiosity Score'; Curious Minds uses XP points, badges and a Scoreboard."""
    assert not re.search(r"Curiosity (Score|\+)", read(rel)), f"{rel}: mentions a Curiosity Score"


@pytest.mark.parametrize("rel", SITE_TEXT_FILES)
def test_no_friend_challenges_claim(rel):
    """Neither app has friend challenges."""
    assert not re.search(r"(?i)friend challenge", read(rel)), f"{rel}: mentions friend challenges"


@pytest.mark.parametrize("rel", ["parents/index.html", "index.html"])
def test_offline_copy_includes_curious_minds(rel):
    """Curious Minds is 100% offline, so offline answers must not mention only Azadi Tales."""
    for m in re.finditer(r"(?is)<details><summary>Do the apps work offline\?.*?</details>", read(rel)):
        assert "Curious Minds" in m.group(0), f"{rel}: offline FAQ must mention Curious Minds"
    if rel == "parents/index.html":
        card = re.search(r"(?is)<h4>[^<]*[Oo]ffline[^<]*</h4><p>.*?</p>", read(rel)).group(0)
        assert "Curious Minds" in card and "where supported" not in card


@pytest.mark.parametrize("rel", SITE_TEXT_FILES)
def test_both_apps_fully_offline_no_ask_the_hero(rel):
    """Live Azadi Tales has no 'Ask the Hero' (internet) feature, so both apps are fully offline."""
    html = read(rel)
    assert not re.search(r"(?i)ask the hero", html), f"{rel}: mentions Ask the Hero"
    assert "stories, quizzes and puzzles work" not in html, f"{rel}: Azadi Tales offline claim is still qualified"


def test_azadi_page_states_it_is_completely_offline():
    faq = re.search(r"(?is)<summary>Does it need an internet connection\?.*?</details>", read("azadi-tales/index.html")).group(0)
    assert "No." in faq and "completely offline" in faq


def test_curious_minds_page_shows_real_features():
    html = read("curious-minds/index.html")
    assert "XP" in html and "badge" in html.lower()
    assert re.search(r"(?i)100% offline|fully offline", html)


def test_curious_minds_age_range_matches_play_listing():
    """Play Store listing says ages 5 to 14."""
    assert not re.search(r"5(&ndash;|–|-)15", read("curious-minds/index.html")), \
        "Curious Minds page should say ages 5–14"
    for rel in ("index.html", "parents/index.html"):   # age-guidance tables
        row = re.search(r"<b>Curious Minds</b></span></td><td>([^<]*)</td>", read(rel))
        assert row and row.group(1) == "5&ndash;14", f"{rel}: Curious Minds age row should be 5–14"


# ---------------------------------------------------------------- security

@pytest.mark.parametrize("rel", ALL_HTML)
def test_target_blank_has_noopener(docs, rel):
    bad = [a.get("href") for t, a in docs[rel].tags
           if a.get("target") == "_blank" and "noopener" not in a.get("rel", "")]
    assert not bad, f"{rel}: reverse-tabnabbing risk on {bad}"


@pytest.mark.parametrize("rel", ALL_HTML)
def test_no_inline_scripts(docs, rel):
    """All JavaScript lives in /scripts so the Content-Security-Policy can block injected code."""
    assert not docs[rel].inline_scripts, f"{rel}: inline <script> found: {docs[rel].inline_scripts}"


@pytest.mark.parametrize("rel", ALL_HTML)
def test_no_inline_event_handlers(rel):
    found = re.findall(r"\son[a-z]+\s*=\s*[\"']", read(rel))
    assert not found, f"{rel}: inline event handlers {found}"


@pytest.mark.parametrize("rel", ALL_HTML)
def test_scripts_are_first_party(docs, rel):
    srcs = [a["src"] for t, a in docs[rel].tags if t == "script" and "src" in a]
    assert all(s.startswith("/scripts/") for s in srcs), f"{rel}: third-party script {srcs}"


def _csp(d):
    m = d.find("meta", **{"http-equiv": "Content-Security-Policy"})
    assert m, "Content-Security-Policy meta tag missing"
    return {p.split()[0]: p.split()[1:] for p in m[0]["content"].split(";") if p.strip()}


@pytest.mark.parametrize("rel", ALL_HTML)
def test_content_security_policy(docs, rel):
    csp = _csp(docs[rel])
    assert csp.get("default-src") == ["'self'"]
    assert "script-src" in csp
    assert "'unsafe-inline'" not in csp["script-src"] and "'unsafe-eval'" not in csp["script-src"]
    assert csp.get("object-src") == ["'none'"]
    assert csp.get("base-uri") == ["'self'"]
    assert csp.get("form-action") == ["'self'"]
    assert FORM_ENDPOINT in csp.get("connect-src", []), "forms need connect-src for FormSubmit"


@pytest.mark.parametrize("rel", ALL_HTML)
def test_referrer_policy(docs, rel):
    m = docs[rel].find("meta", name="referrer")
    assert m and m[0]["content"] == "strict-origin-when-cross-origin"


FORM_PAGES = ["contact/index.html", "educators/index.html", "dare-to-dream/index.html"]


@pytest.mark.parametrize("rel", FORM_PAGES)
def test_forms_have_honeypot_and_length_limits(rel):
    html = read(rel)
    form = re.search(r"<form[^>]*data-form=.*?</form>", html, re.S)
    assert form, f"{rel}: data-form form missing"
    f = form.group(0)
    assert 'name="_honey"' in f, "spam honeypot missing"
    fields = re.findall(r"<(?:input|textarea)\b[^>]*>", f)
    for field in fields:
        if re.search(r'type="(radio|checkbox|hidden|submit)"', field) or "_honey" in field:
            continue
        assert "maxlength=" in field, f"{rel}: no maxlength on {field[:70]}"
    for field in fields:
        if 'type="email"' in field:
            assert "required" in field


def test_contact_form_requires_consent():
    f = re.search(r"<form[^>]*data-form=\"contact_submit\".*?</form>", read("contact/index.html"), re.S).group(0)
    assert re.search(r'type="checkbox" required', f)


SECRET_PATTERNS = re.compile(
    r"(sk-[A-Za-z0-9_-]{20,}|AIza[0-9A-Za-z_-]{30,}|ghp_[A-Za-z0-9]{30,}|-----BEGIN [A-Z ]*PRIVATE KEY)")


def test_no_secrets_committed():
    hits = []
    for p in ROOT.rglob("*"):
        if p.is_file() and ".git" not in p.parts and "node_modules" not in p.parts \
                and p.suffix in {".html", ".js", ".mjs", ".css", ".json", ".md", ".txt", ".xml", ".yml"}:
            if SECRET_PATTERNS.search(p.read_text(encoding="utf-8", errors="ignore")):
                hits.append(str(p.relative_to(ROOT)))
    assert not hits, f"possible secrets in {hits}"


# ---------------------------------------------------------------- content

@pytest.mark.parametrize("rel", ALL_HTML)
def test_no_placeholder_or_prototype_leftovers(rel):
    html = read(rel)
    for bad in ("to be added", "Lorem", "TBD", "ds-base.css", "omelette"):
        assert bad not in html, f"{rel}: contains '{bad}'"


@pytest.mark.parametrize("rel", ALL_HTML)
def test_images_have_alt(docs, rel):
    missing = [a.get("src") for t, a in docs[rel].tags if t == "img" and "alt" not in a]
    assert not missing, f"{rel}: <img> without alt {missing}"
