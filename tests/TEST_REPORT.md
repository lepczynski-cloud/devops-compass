# DevOps Compass 0.2.1 test report

Test date: 2026-10-09

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

1. Home page rendering, one clear primary action and a visible public beta notice.
2. Free-to-use, no-ads and any-AI messaging in English and Polish.
3. Disabled Continue action before the required choice.
4. Starting-profile selection.
5. Step 4 self-assessment navigation.
6. Opening Cloud after Linux.
7. Keeping Cloud open after the first and second answer.
8. Confirming that the form does not jump back to Linux.
9. Updating the answered counter without rerendering the full step.
10. Completing onboarding and opening the dashboard.
11. Rendering the focused route.
12. Opening a complete learning guide.
13. Displaying a quick win, at least two resources, a verification checklist and an AI tutor prompt.
14. Copy-prompt feedback.
15. Changing a learning status.
16. Reflecting the status on the dashboard.
17. Restoring saved progress during a simulated return visit.
18. Rendering the Polish dashboard.
19. Rendering at 390 px without horizontal overflow.


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
