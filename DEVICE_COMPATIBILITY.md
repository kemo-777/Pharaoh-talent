# Device compatibility and verification

The UI is Arabic-first (`lang="ar"`, `dir="rtl"`) and includes a viewport meta tag, fluid typography, responsive CSS breakpoints at 1000px and 760px, flexible grids, mobile navigation, and reduced-motion handling.

## Device test matrix before release

Run the deployed site manually on the following representative sizes and actual browsers:

- Small phone: 320–360 CSS px (Android Chrome; iPhone Safari)
- Typical phone: 375–430 CSS px (Android Chrome; iPhone Safari)
- Tablet: 768px and 820px (Safari/Chrome)
- Laptop: 1280px and 1366px (Chrome, Edge, Firefox)
- Large desktop: 1920px (Chrome/Edge)

At every size, test navigation/menu, Arabic RTL layout, registration/login forms, modal scrolling, search/filter controls, dashboard tabs, keyboard focus, text zoom, dark/light themes, reduced motion, video playback and range seeking, and guardian consent screens.

No real browser automation or physical-device test is claimed by this static checklist. Run a browser suite (for example Playwright) and manual accessibility review before public launch.
