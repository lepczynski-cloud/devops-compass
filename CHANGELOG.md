# Changelog

All notable changes to DevOps Compass are documented here.

## 0.2.0 - 2026-10-08

### Changed

- Rebuilt the home page around one clear action and a concrete preview of the value delivered
- Replaced the decorative roadmap concept with a compact route preview and a focused route on the dashboard
- Renamed topic actions to `Open learning guide` so clickable elements are unambiguous
- Expanded every learning unit into an actionable guide with an ordered plan, a first useful action, resources, verification and an AI tutor prompt
- Added estimated first-pass effort and content review dates to learning units
- Improved onboarding controls, selected-state feedback and the persistent Continue bar
- Updated the visual system to feel closer to an engineering tool and less like a generic landing-page template

### Added

- 92 manually curated, free learning resources, with official documentation preferred where practical
- A concrete quick win for every one of the 81 learning units
- At least two learning resources for every learning unit
- Verification checklists for all learning guides
- Context-aware AI tutor prompts in English and Polish
- Focused dependency routes that explain what comes before and after the current priority
- Resource, translation and content-completeness checks in repository validation

### Fixed

- Kept the currently open self-assessment area open after selecting an ability level
- Prevented the step 4 assessment from jumping back to the first area, usually Linux, after every click
- Preserved progress and status changes when opening and closing learning guides
- Improved mobile layout and removed horizontal overflow in the tested 390 px viewport

### Tested

- Completed the full onboarding and dashboard flow in English and Polish
- Verified the assessment state fix across multiple selections
- Opened and audited all 81 learning guides
- Confirmed that every guide contains resources, verification criteria and an AI tutor prompt
- Verified local progress persistence, export, import, reset and mobile rendering

## 0.1.0 - 2026-10-08

### Added

- English and Polish interface
- Five-step path setup
- Six learning directions
- 81 curated learning units
- 63 concrete capability statements
- Local progress tracking
- JSON export and import
- Dark and light themes
- Installable PWA shell
- Cloudflare Workers Static Assets configuration
- Repository validation workflow
