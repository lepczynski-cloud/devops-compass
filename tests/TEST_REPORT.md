# DevOps Compass 0.2.0 test report

Test date: 2026-10-08

## Automated content validation

Command:

```bash
npm run validate
```

Validated:

- 81 learning units,
- 63 self-assessment capabilities,
- 92 curated resource entries,
- 6 learning directions,
- unique IDs,
- prerequisite references,
- direction references,
- resource references,
- a minimum of two resources per learning unit,
- bilingual quick wins,
- effort estimates,
- review dates,
- HTTPS resource URLs,
- required application files,
- JavaScript syntax.

## Browser flow test

Reproducible command after installing Python Playwright and Chromium:

```bash
npm run test:ui
```


The browser test covered:

1. Home page rendering and one clear primary action.
2. Disabled Continue action before the required choice.
3. Starting-profile selection.
4. Step 4 self-assessment navigation.
5. Opening Cloud after Linux.
6. Keeping Cloud open after the first and second answer.
7. Confirming that the form does not jump back to Linux.
8. Updating the answered counter without rerendering the full step.
9. Completing onboarding and opening the dashboard.
10. Rendering the focused route.
11. Opening a complete learning guide.
12. Displaying a quick win, at least two resources, a verification checklist and an AI tutor prompt.
13. Copy-prompt feedback.
14. Changing a learning status.
15. Reflecting the status on the dashboard.
16. Restoring saved progress during a simulated return visit.
17. Rendering the Polish dashboard.
18. Rendering at 390 px without horizontal overflow.

## Complete guide audit

All 81 learning guides were rendered in a browser test.

For every guide, the audit confirmed:

- at least two resource cards,
- at least three verification statements,
- exactly one generated AI tutor prompt,
- a first useful action,
- a learning sequence.

Result: `81 tested, 0 errors`.

## Manual visual review

Reviewed at desktop and mobile widths:

- home page,
- onboarding step 4,
- dashboard,
- learning guide,
- Polish mobile view.

The visual review checked hierarchy, action clarity, selected states, readability, resource visibility and horizontal overflow.

## Environment note

The test environment prevented direct browser navigation to local HTTP and file URLs. The same production HTML, CSS, JavaScript and data files were therefore loaded into Chromium as an inline test document, with a browser-storage mock for persistence checks. Repository validation and JavaScript syntax checks ran directly against the packaged files.
