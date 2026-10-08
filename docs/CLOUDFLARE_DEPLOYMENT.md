# Deploy DevOps Compass with Cloudflare

The recommended production setup is Cloudflare Workers Static Assets connected to the GitHub repository.

## Chosen names

- Worker: `devops-compass`
- Repository: `lepczynski-cloud/devops-compass`
- Production domain: `devopscompass.lepczynski.it`
- Static asset directory: `public`

The Worker name should remain consistent with the `name` field in `wrangler.jsonc`.

## 1. Create and push the GitHub repository

Create a public repository named `devops-compass` under `lepczynski-cloud`, then push this directory.

Example:

```bash
git init
git branch -M main
git add .
git commit -m "Initial DevOps Compass release"
git remote add origin git@github.com:lepczynski-cloud/devops-compass.git
git push -u origin main
```

## 2. Connect the repository in Cloudflare

1. Sign in to the Cloudflare dashboard.
2. Open `Workers & Pages`.
3. Select `Create application`.
4. Choose the option to import a repository.
5. Authorize GitHub if necessary.
6. Select `lepczynski-cloud/devops-compass`.
7. Set the Worker name to `devops-compass`.
8. Use these build settings:

```text
Build command: npm run validate
Deploy command: npx wrangler deploy
Root directory: /
```

The deployment configuration is already defined in `wrangler.jsonc`:

```json
{
  "name": "devops-compass",
  "compatibility_date": "2026-10-08",
  "assets": {
    "directory": "./public",
    "not_found_handling": "single-page-application"
  }
}
```

After the first deployment, Cloudflare assigns a `workers.dev` address. Every push to the selected production branch should trigger a new build and deployment.

## 3. Add the custom subdomain

1. Open the deployed `devops-compass` Worker.
2. Open `Settings`.
3. Open `Domains & Routes`.
4. Select `Add`.
5. Select `Custom Domain`.
6. Enter `devopscompass.lepczynski.it`.
7. Confirm the change.

Cloudflare creates the required DNS record and provisions the certificate when the zone `lepczynski.it` is already managed by the same Cloudflare account.

If a DNS record for `devopscompass.lepczynski.it` already exists, remove or rename that conflicting record before adding the Custom Domain.

## 4. Verify the deployment

Check:

- the English interface opens by default for non-Polish browser language,
- Polish browser language opens the Polish interface,
- the language and theme switches work,
- progress remains after a reload,
- JSON export and import work,
- the PWA manifest and icons load,
- the browser console has no CSP or service-worker errors,
- `https://devopscompass.lepczynski.it/robots.txt` and `/sitemap.xml` are available.

## Direct deployment alternative

Cloudflare Git integration is recommended, but the repository can also be deployed from a local terminal:

```bash
npx wrangler login
npm run validate
npx wrangler deploy
```

Add the custom domain from the dashboard after the first deployment.

## Updating the application

1. Change source files.
2. Update the version in `public/assets/data.js`, `package.json` and the cache name in `public/sw.js`.
3. Run `npm run validate`.
4. Commit and push to `main`.
5. Verify the Cloudflare build and production URL.

## Rollback

Cloudflare keeps deployment history for the Worker. Use the deployment history in the dashboard to select a previous version when a release must be reverted.
