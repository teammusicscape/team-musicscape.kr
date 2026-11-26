# ACC 2026 Press Room — operator notes

- **Production verified 2026-11-26.** Commit `8363c25` was integrated into main and pushed; its Production deployment succeeded. Canonical-domain page, reader/config scripts, poster, entry pages and sitemap matched that commit. An isolated live read-only browser initially rendered 12 articles with a working poster/coverage anchor, no page errors and no mobile/desktop overflow. MUSE OS link commit `53cf493` was released afterward. A later separately authorized one-record HTTP correction reset that article to review and removed it from anonymous reads; republication is pending a signed-in organization manager. No RLS/publication guard was weakened. Documentation rollback does not reverse that saved database correction.
- The actual deployed document root is `team_musicscape_web/`, not the obsolete HTML/sitemap copies at repository root. Canonical page: `/acc2026/press/`. Both slash and non-slash requests must resolve to this directory's `index.html` (or the server may redirect non-slash to slash). Scripts and poster use root-absolute paths. The deployed sitemap includes the canonical slash route.
- The existing visual design is retained. Concert and archive Press Room entry points now target this owned route. No private contact export or local PDF/DOCX copies are included.

## Public read boundary

`press-room-config.js` contains only the public endpoint, project slug and a publishable client key; it is browser-visible by design. Never place service-role/secret keys, session tokens or private contacts here.

The reader makes anonymous **GET only** requests to `media_coverage`, with `status=eq.published` and `press_room_slug=eq.acc2026`, no credentials, and `cache: no-store`. Supabase RLS is the authoritative access boundary: client filters are defense in depth, not authorization. This frontend does not publish, approve, update or delete records and must not weaken RLS. The mock browser suite does **not** prove live RLS, CORS or database policy behavior.

Only matching published rows with usable title, publisher, date and URL are rendered. Titles/metadata are text, not HTML. HTTPS articles are accepted; the only HTTP exception is the exact `www.jndn.com` authority. Other HTTP hosts, lookalikes, userinfo, explicit ports (including default ports), encoded authorities and backslashes are rejected. External article tabs use `noopener noreferrer`.

No article snapshot or static article fallback is stored. Loading/error/empty states clear prior cards. Reload and restored-tab refresh reread public publication state; superseded responses cannot restore revoked rows. An already-open ordinary tab is not real-time: revocation becomes visible on reload or back-forward-cache restoration.

## Existing downloads

PDF and DOCX retain their existing public old-provider download URLs; the photo package retains its existing Google Drive URL. These dependencies were intentionally not migrated or copied into Git. Generic HTTP HEAD/GET probes returned 403, but an isolated real browser verified the PDF with HTTP 200 and a valid PDF body signature, and the DOCX with a successful download and ZIP signature. Chrome PDF navigation exposes a viewer wrapper to response-body inspection, so the PDF bytes were checked by same-origin browser fetch. Photo-package permissions were not verified. The poster is served locally from `/images/acc-poster.jpg`.

## Local verification (Windows, bash/MSYS, Node 24)

From `D:/Musicscape_web`:

```bash
export MUSE_NODE_MODULES='C:/Users/immir/AppData/Local/hermes/profiles/musedev/cache/scratch/coverage-tests/node_modules'
export MUSE_TEST_BROWSER='C:/Program Files/Google/Chrome/Application/chrome.exe'
export TMP='C:/Users/immir/AppData/Local/hermes/profiles/musedev/cache/scratch'
export TEMP="$TMP" TMPDIR="$TMP"
# Optional synthetic desktop/mobile screenshots, outside Git:
export MUSE_TEST_ARTIFACTS="$TMP/press-room-review"
node tests/press-room.test.mjs
node --check team_musicscape_web/acc2026/press/press-room.js
node --check team_musicscape_web/acc2026/press/press-room-config.js
node --check tests/press-room.test.mjs
```

Playwright is installed outside this repository at `MUSE_NODE_MODULES`; Chrome comes from `MUSE_TEST_BROWSER`. The suite starts a local-only server, mocks all Supabase responses, blocks other external traffic, and never writes production records. It checks URL boundaries, publication scope, literal malicious titles, empty/error/revoked reload states, overlapping restored-tab reads, canonical sitemap, entry links, legacy download URLs, absolute scripts on both routes, poster, section anchors and horizontal overflow at 320/390/768/1024/1440 pixels. Fonts are blocked in this isolated run; live font rendering and actual hosting redirect/cache behavior remain deployment checks.
