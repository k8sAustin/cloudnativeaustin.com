# cloudnativeaustin.com

The website for [Kubernetes Austin](https://github.com/k8sAustin), the official CNCF Community Group for Central Texas.

Static HTML/CSS/JS — no build step, no framework, deploys straight to Netlify.

## Pages

| Page | Purpose |
|---|---|
| `index.html` | Landing page — hero, about, core values, sponsors preview, CFP teaser |
| `register.html` | How to RSVP (via Meetup.com), what to expect, venue/host info, FAQ |
| `sponsors.html` | Sponsorship model (at-cost, vendor-neutral) and current sponsors |
| `cfp.html` | Call for Papers — tracks, review process, submission link (Sessionize) |
| `code-of-conduct.html` | CNCF Code of Conduct summary and reporting info |
| `404.html` | Not-found page |

## Local development

No build step required — open `index.html` directly, or serve the folder:

```bash
python3 -m http.server 8080
```

## Design system

Tokens (color, type, spacing) live in `assets/css/styles.css` and are documented in
[`design-system/kubernetes-austin/MASTER.md`](design-system/kubernetes-austin/MASTER.md).
Brand color is Kubernetes blue (`#326CE5`); typography is IBM Plex Sans / JetBrains Mono.

## Deployment

Hosted on **GitHub Pages** (`main` branch, root). `.nojekyll` disables Jekyll processing so
plain static files (and dotfiles/underscore-prefixed files) are served as-is.

Short links used in past talks and marketing materials (`/slack`, `/meetup`, `/present`, past
event links, etc.) are preserved as static redirect-stub folders at the repo root — e.g.
`slack/index.html` meta-refreshes to the real destination. Add a new one the same way when a
new short link is needed. `_redirects` is also kept around for Netlify compatibility if this
ever moves back there, but GitHub Pages does not read it.

Update the past-event stub destinations as new event pages go live on
[ocgroups.dev](https://ocgroups.dev/cncf/group/3up7rjk).

## Contributing

Real event dates, sponsor logos, and organizer names should be kept current on this site as
they change — the content here is sourced from the group's public CNCF Community Group page
and org README. Open a PR or ping `#austin-community-group` on the CNCF Slack.
