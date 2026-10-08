# Content model

DevOps Compass keeps the learning map in `public/assets/data.js`. The browser does not generate paths with an AI model. It applies deterministic rules to manually curated data.

## Main entities

### Profiles

Profiles describe a starting context, not a global seniority level.

Examples:

- complete beginner,
- developer or QA,
- systems or support,
- existing cloud or DevOps practitioner.

A profile may preselect areas to verify, but it never marks skills as covered automatically.

### Directions

A direction defines a stable ordered set of learning units:

- foundations,
- DevOps and software delivery,
- cloud and infrastructure,
- platform engineering,
- SRE,
- DevSecOps.

The application expands prerequisites and orders them before dependent units.

### Areas and capabilities

An area is a broad domain such as Linux or networking.

Capabilities are concrete self-assessment statements. Each answer uses one of four levels:

- `0`: not yet,
- `1`: with guidance,
- `2`: independently,
- `3`: troubleshooting level.

An unanswered capability means `not sure`.

### Learning units

A learning unit contains:

- bilingual name and summary,
- category and short icon,
- included topics,
- observable readiness statements,
- prerequisites,
- capability evidence,
- required self-assessment level,
- a practitioner note.

The application can infer that a unit is covered only when all of its evidence statements meet the required level. Partial evidence places the unit in `Verify first`.

## Content principles

1. Concepts before vendor products.
2. Foundations before unnecessary complexity.
3. Observable abilities instead of vague familiarity.
4. No universal percentage score.
5. A recommendation must be explainable through prerequisites.
6. Vendor tools may be examples, not the learning goal.
7. Security, reliability, cost and operations should appear throughout the path.
8. Practitioner notes should be concise and based on repeatable experience.

## Adding a learning unit

1. Add a unique skill object to `skills`.
2. Add valid prerequisite IDs.
3. Add concrete capability evidence when self-assessment is possible.
4. Add the unit to at least one direction path.
5. Provide complete English and Polish content.
6. Run:

```bash
npm run validate
```

## Changing dependencies

Avoid circular dependencies. The application protects itself from infinite traversal, but a cycle indicates a broken mental model and should be fixed.

## Versioning

When content or application behavior changes:

- update `version` in `public/assets/data.js`,
- update `version` in `package.json`,
- change the cache name in `public/sw.js`,
- add an entry to `CHANGELOG.md`.
