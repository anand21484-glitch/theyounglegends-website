# The Young Legends — website

Live at **https://theyounglegends.co.in** (hosted free on GitHub Pages).

## Folder map

| Path | What it is |
|---|---|
| `index.html` | Home page |
| `azadi-tales/`, `curious-minds/`, `dare-to-dream/` | App pages |
| `explore/`, `parents/`, `educators/`, `our-story/`, `contact/` | Other pages |
| `legal/` | Terms of Use & Responsible Use (Privacy links to the Google Sites policy) |
| `styles/` | Look & feel — `legends.css` (everything), `product.css` (app pages), `pages.css` (other pages) |
| `scripts/` | Behaviour — `site.js` (menu, animations), `home.js` (home page), `pages.js` (forms, Explore filters, legal), `legal-data.js` (legal section lists), `image-slot.js` (image boxes) |
| `tests/` | Automated tests (see **Test-driven workflow** below) |
| `.github/workflows/tests.yml` | Runs all tests on GitHub after every push |
| `assets/` | Logos, app icons, icon set. Put new artwork in `assets/images/` |
| `CNAME` | Connects the domain. **Do not edit or delete.** |
| `404.html`, `robots.txt`, `sitemap.xml`, `.nojekyll` | Housekeeping for GitHub Pages and Google |

Each page lives in its own folder as `index.html`, so addresses stay clean (`/contact/` instead of `/contact.html`).

## Preview on your computer

1. Open this folder in VS Code.
2. Right-click `index.html` → **Open with Live Server**.

Pages use addresses that start with `/`, so double-clicking an HTML file won't show the styles. Always preview with Live Server.

## Test-driven workflow (every change)

1. **Red**: add or update a test in `tests/` describing the change, e.g. a new page, link or form rule. Run the tests and see the new one fail.
2. **Green**: edit the site until all tests pass.
3. **Refactor**: tidy up, run the tests again, then publish.

Run the tests (VS Code terminal, from this folder):

```
python -m pytest tests -q                 # pages, links, SEO, security rules
cd tests; npm install; npm test; cd ..    # forms, filters, legal page, menu
```

One-time setup: install Python 3 and Node.js 20+, then `pip install pytest`.

Live security check of the published site (read-only, safe to run any time):

```
python tests/live_check.py              # full check of the published site
python tests/live_check.py --dns-only   # before publishing: domain records + HTTPS only
python tests/live_check.py --local      # test your local copy (first run: python -m http.server 8000)
```

Or use VS Code's menu: **Terminal → Run Task…** and pick a check, or **Run ALL checks**.
GitHub also runs both test suites on every push. See the **Actions** tab: green tick = safe, red cross = fix before sharing.

Security rules the tests enforce (don't remove them):
- No JavaScript inside HTML pages. All scripts live in `/scripts` (required by the Content-Security-Policy).
- No inline `onclick=`-style attributes.
- Every page has the Content-Security-Policy and Referrer-Policy `<meta>` tags. Copy them from any existing page when adding a new one.
- Links opening a new tab use `rel="noopener"`. External links must use https and be on the allowlist in `tests/test_static.py`.
- Form fields have `maxlength`, and every form has the hidden `_honey` spam trap.

## Publish a change

1. Edit and save the file. Run the tests.
2. Source Control (left sidebar) → type a short message → **Commit** → **Sync Changes**.
3. The live site updates in about a minute. Check the Actions tab for the green tick.

## Add a real image

Image boxes look like this in the HTML:

```html
<image-slot id="hero-scene" shape="rect" placeholder="Hero illustration — ..."></image-slot>
```

1. Save the image in `assets/images/` (WebP or JPG, under ~300 KB).
2. Add `src` and `alt`:

```html
<image-slot id="hero-scene" shape="rect" src="/assets/images/hero-scene.webp" alt="A child exploring history and science"></image-slot>
```

The `placeholder` text says what art belongs in each box.

## Forms

The Contact and Educator forms email **support@theyounglegends.co.in** through FormSubmit (formsubmit.co).
The first time someone submits a form, FormSubmit sends an activation email to that inbox. Click the link once to turn delivery on.

## Still to add

- Artwork and app screenshots for every image box
- Founder note and photo (section hidden until ready, see `our-story`)
- Real parent testimonials (placeholders removed; never use invented ones)
- Terms of Use and Responsible Use text
- Facebook / LinkedIn links (icons removed until accounts exist)
- Dare to Dream waitlist: sign-ups currently arrive as emails in the support inbox. Move to a mailing-list service (e.g. Mailchimp) when the list grows
