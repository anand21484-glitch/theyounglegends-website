"""
Live security check for https://theyounglegends.co.in  (safe, read-only: ~25 normal page requests)

Run from the repo root in the VS Code terminal:
    python tests/live_check.py

Options:
    --dns-only      only domain records + HTTPS (works before the site is published)
    --local         test a local copy instead: first run `python -m http.server 8000` in another terminal
                    (don't use VS Code Live Server for this — it adds its own script to every page)
    --base URL      check a different address
    --offline-dns   skip the DNS / certificate / redirect checks

Exit code 0 = everything passed, 1 = something needs attention.
Uses only the Python standard library — no installs needed.
"""
import argparse
import json
import socket
import ssl
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

DOMAIN = "theyounglegends.co.in"
GITHUB_IPS = {"185.199.108.153", "185.199.109.153", "185.199.110.153", "185.199.111.153"}
PAGES = ["/", "/azadi-tales/", "/curious-minds/", "/dare-to-dream/", "/explore/", "/parents/",
         "/educators/", "/our-story/", "/contact/", "/legal/?doc=terms"]
MUST_NOT_EXIST = ["/.git/HEAD", "/.git/config", "/.env", "/backend/server.py", "/privacy-policy.html.bak"]
UA = {"User-Agent": "TYL-live-check/1.0"}

results = []
LOCAL = False


def check(name, ok, detail=""):
    results.append((name, bool(ok), detail))


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


def fetch(url, follow=True, timeout=15):
    """Returns (status, headers, body-text, final-url). Never raises for HTTP errors."""
    opener = urllib.request.build_opener() if follow else urllib.request.build_opener(NoRedirect)
    req = urllib.request.Request(url, headers=UA)
    try:
        with opener.open(req, timeout=timeout) as r:
            return r.status, r.headers, r.read(400_000).decode("utf-8", "ignore"), r.geturl()
    except urllib.error.HTTPError as e:
        return e.code, e.headers, e.read(50_000).decode("utf-8", "ignore") if e.fp else "", url


def dns(name, rtype):
    url = f"https://dns.google/resolve?name={name}&type={rtype}"
    _, _, body, _ = fetch(url)
    return [a["data"].rstrip(".") for a in json.loads(body).get("Answer", []) if a.get("type") in (1, 5)]


def run_dns_tls_checks():
    a = set(dns(DOMAIN, "A"))
    check("DNS: only GitHub's 4 addresses", a == GITHUB_IPS, ", ".join(sorted(a)))
    www = dns("www." + DOMAIN, "CNAME")
    check("DNS: www points to GitHub", any(x.endswith(".github.io") for x in www), ", ".join(www))

    status, headers, _, _ = fetch(f"http://{DOMAIN}/", follow=False)
    loc = headers.get("Location", "") if headers else ""
    check("HTTP redirects to HTTPS (Enforce HTTPS on)", status in (301, 308) and loc.startswith("https://"),
          f"{status} -> {loc}")

    try:
        ctx = ssl.create_default_context()
        with socket.create_connection((DOMAIN, 443), timeout=15) as s:
            with ctx.wrap_socket(s, server_hostname=DOMAIN) as tls:
                cert = tls.getpeercert()
                version = tls.version()
        expires = datetime.strptime(cert["notAfter"], "%b %d %H:%M:%S %Y %Z").replace(tzinfo=timezone.utc)
        days = (expires - datetime.now(timezone.utc)).days
        check("HTTPS certificate valid for this domain", True, f"expires in {days} days")
        check("HTTPS certificate not expiring within 14 days", days > 14, f"{days} days")
        check("Modern TLS version (1.2+)", version in ("TLSv1.2", "TLSv1.3"), version)
    except Exception as e:  # noqa: BLE001
        check("HTTPS certificate valid for this domain", False, str(e)[:120])


def run_site_checks(base):
    for path in PAGES:
        status, headers, body, _ = fetch(base + path)
        check(f"{path} loads", status == 200, str(status))
        if status == 200:
            check(f"{path} has Content-Security-Policy", 'http-equiv="Content-Security-Policy"' in body)
            check(f"{path} has Referrer-Policy", 'name="referrer"' in body)
            check(f"{path} has no inline <script> code", "<script>" not in body)

    status, _, _, _ = fetch(base + "/this-page-should-not-exist-123/")
    check("Unknown pages return 404", status == 404, str(status))

    if not LOCAL:  # a local preview serves your whole folder (incl. .git), so only test this live
        for path in MUST_NOT_EXIST:
            status, _, _, _ = fetch(base + path)
            check(f"Not exposed: {path}", status == 404, str(status))

    status, headers, _, _ = fetch(base + "/scripts/pages.js")
    ctype = headers.get("Content-Type", "") if headers else ""
    check("Scripts served as JavaScript", status == 200 and "javascript" in ctype, ctype)

    status, _, body, _ = fetch(base + "/robots.txt")
    check("robots.txt points to sitemap", status == 200 and "sitemap.xml" in body)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--base", default=f"https://{DOMAIN}")
    ap.add_argument("--offline-dns", action="store_true")
    ap.add_argument("--local", action="store_true",
                    help="test a local preview at http://127.0.0.1:8000 (start it with: python -m http.server 8000)")
    ap.add_argument("--dns-only", action="store_true",
                    help="only check domain records, HTTPS redirect and certificate (works before publishing)")
    args = ap.parse_args()
    global LOCAL
    LOCAL = args.local
    base = ("http://127.0.0.1:8000" if args.local and args.base == f"https://{DOMAIN}" else args.base).rstrip("/")

    print(f"Checking {base}  ({datetime.now():%d %b %Y %H:%M})\n")
    if not (args.offline_dns or args.local):
        run_dns_tls_checks()
    if args.dns_only:
        base = None
    if base:
        run_site_checks(base)

    width = max(len(n) for n, _, _ in results)
    for name, ok, detail in results:
        print(f"  {'PASS' if ok else 'FAIL'}  {name.ljust(width)}  {detail}")
    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)} passed, {len(failed)} failed")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
