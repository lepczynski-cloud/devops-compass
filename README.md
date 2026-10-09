# DevOps Compass

![DevOps Compass social preview](public/assets/og-image.png)

A focused, human-curated DevOps learning plan with free resources, practical checkpoints and safe AI tutor prompts.

DevOps Compass is a static, bilingual browser application. It turns a person's starting point, direction and self-declared abilities into a short sequence of useful next steps. The full competency graph stays underneath, while the interface exposes only the part that matters now.

**Planned production address:** `https://devopscompass.lepczynski.it/`

## What users receive

Each recommended topic opens a complete learning guide with:

- a concrete first useful action,
- an ordered learning plan,
- the concepts to understand,
- free learning resources with a reason to use each one,
- a verification checklist,
- a context-aware AI tutor prompt,
- prerequisites and the next relevant topic,
- an estimated first-pass effort and a review date.

The application currently contains 81 learning units, 63 concrete capability statements and 92 curated resource entries.

## Why it exists

People entering DevOps often receive a large list of tools without a useful order. DevOps Compass takes a narrower approach:

- concepts before product names,
- foundations before unnecessary complexity,
- concrete abilities instead of broad questions such as "Do you know Linux?",
- up to three current priorities instead of the complete roadmap,
- an action and verification method for every recommendation,
- an honest self-assessment without fake readiness percentages.

The learning order, dependencies, resources and practitioner notes are curated manually by [Wojciech Lepczyński](https://lepczynski.it/), based on more than ten years of work with DevOps, cloud platforms, CI/CD, automation, infrastructure and production systems.

## Features

- English and Polish interface
- Five-step, beginner-friendly onboarding
- A safe `DevOps Foundations` path for people who do not know their specialization yet
- Directions for DevOps, cloud, platform engineering, SRE and DevSecOps
- 81 actionable learning guides and 92 curated free resources
- Sections for `Learn now`, `Verify first`, `Up next`, `Later` and `Already covered`
- Focused route view that explains the sequence without exposing the complete roadmap
- AI tutor prompts designed to request sources, verification and safer command variants
- Progress stored in the browser with `localStorage`
- JSON export and import for backups and moving between devices
- No account, application backend, database or analytics
- Installable PWA with offline application shell
- Dark and light themes
- Responsive, dependency-free interface
- Open content model with automated validation

## Privacy model

The application does not create an account and does not send the learning profile to an application server. Answers, progress and settings stay in the current browser.

A browser profile is not a durable backup. Clearing site data, private browsing or changing devices may remove it. The application therefore provides explicit JSON export and import.

Learning resources open external websites. AI prompts are copied by the user and used in a tool of their choice. DevOps Compass does not send prompt content to an AI provider.

## Technology

- semantic HTML
- modern CSS
- vanilla JavaScript
- Cloudflare Workers Static Assets
- no runtime framework
- no external font, icon or analytics dependency

## Run locally

A basic static server is enough:

```bash
python3 -m http.server 8080 --directory public
```

Open `http://localhost:8080`.

For a Cloudflare-compatible local preview:

```bash
npx wrangler dev
```

## Validate the repository

```bash
npm run validate
```

Validation checks translations, unique IDs, competency dependencies, direction paths, learning-resource references, HTTPS URLs, required guide fields, required assets and JavaScript syntax.

An optional Chromium smoke test is also included:

```bash
python3 -m pip install playwright
python3 -m playwright install chromium
npm run test:ui
```

It verifies the complete onboarding flow, the step 4 state fix, progress persistence, mobile layout and every learning guide.

## Deploy to Cloudflare

The repository contains `wrangler.jsonc` and is ready for Cloudflare Workers Static Assets.

### Direct deployment

```bash
npx wrangler login
npm run validate
npx wrangler deploy
```

### Git-based deployment

1. Push this directory to the `lepczynski-cloud/devops-compass` repository.
2. In Cloudflare, create a Worker by importing the GitHub repository.
3. Use `npm run validate` as the build command.
4. Use `npx wrangler deploy` as the deploy command.
5. Keep the Worker name `devops-compass`.
6. Add `devopscompass.lepczynski.it` as a Custom Domain.

Detailed instructions are available in:

- [Cloudflare deployment guide](docs/CLOUDFLARE_DEPLOYMENT.md)
- [Instrukcja wdrożenia po polsku](docs/CLOUDFLARE_PL.md)

## Repository structure

```text
public/
  assets/
    app.js              Application logic and UI
    data.js             Competency graph, resources and bilingual content
    styles.css          Complete visual design
  index.html            Application shell
  manifest.webmanifest  PWA manifest
  sw.js                 Offline application shell
  _headers              Security and cache headers
tools/
  validate.mjs          Repository and content validation
tests/
  TEST_REPORT.md        Functional test scope and results
docs/
  CONTENT_MODEL.md      Guide for maintaining the learning map
```

## Maintaining the content

The application deliberately separates content from UI logic. Competency names, translations, prerequisites, quick wins, resources, verification statements and direction paths live in `public/assets/data.js`.

Read [CONTENT_MODEL.md](docs/CONTENT_MODEL.md) before changing the map.

## Related projects

- [Wojciech Lepczyński's DevOps and cloud blog](https://lepczynski.it/)
- [YouTube channel](https://www.youtube.com/@WojciechLepczynski)
- [Admin Toolkit](https://admintoolkit.lepczynski.it/)

## Contributing

Corrections and evidence-based suggestions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md). The map is intentionally opinionated, but it should remain open to review.

## License

Code and application content are available under the [MIT License](LICENSE).
