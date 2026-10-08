# Security policy

## Supported version

The current `main` branch is supported.

## Reporting a security issue

Please avoid publishing a security issue with exploitable details in a public GitHub issue.

Contact the repository owner through the contact details published at:

`https://lepczynski.it/`

Include:

- affected file and version,
- reproduction steps,
- impact,
- a suggested mitigation when available.

## Security model

DevOps Compass is a static application. It does not require an application account or server-side profile storage. Imported JSON is normalized against known IDs and allowed status values before use.

Security headers are defined in `public/_headers`.
