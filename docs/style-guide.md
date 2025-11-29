# EyyTrike UI Style Guide

## Color Palette
- Primary: `--brand-green-600` `#16a34a`
- Secondary: `--brand-yellow-500` `#f59e0b`
- Accent: `--brand-yellow-400` `#fbbf24`
- Greens: `--brand-green-700` `#15803d`, `--brand-green-600` `#16a34a`, `--brand-green-500` `#22c55e`, `--brand-green-400` `#34d399`
- Yellows: `--brand-yellow-600` `#ca8a04`, `--brand-yellow-500` `#f59e0b`, `--brand-yellow-400` `#fbbf24`
- Surface: `--surface` `#ffffff`, `--surface-muted` `#f7fafc`
- Text: `--text-primary` `#0f172a`, `--text-muted` `#6b7280`
- Border: `--border` `#e5e7eb`
- Nav Background: `--nav-bg` `#0f3b21`

## Accessibility
- Minimum contrast: AA (4.5:1 for body text, 3:1 for large text)
- Primary on Surface: meets AA
- Secondary on Surface: meets AA
- Accent highlights must be paired with `--text-primary`

## Usage Rules
- Buttons: background `var(--brand-primary)`, hover shade: `--brand-green-700`, text `#fff`
- Secondary buttons: `var(--brand-secondary)` with `#fff`
- Highlights/badges: `var(--brand-accent)` for emphasis
- Containers: `var(--surface)` with `1px solid var(--border)` and subtle shadow
- Page background: light gradient green→yellow; dark mode green-brown gradient
- Nav/header: `var(--nav-bg)`
- Icons: prefer green accents for positive, yellow for warnings

## Spacing & Typography
- Base spacing: 8px grid; commonly use 8/12/16/24/32
- Rounded corners: 10–12px for cards, 6–8px for buttons
- Font: system UI stack; headings 18–24px bold; body 14–16px
- White space: generous margins around sections, 16–24px internal padding

## Patterns
- Focus rings: 3px outline using `rgba(245,158,11,0.35)`
- Transitions: 160–200ms ease for hover/press; use transform for performance
- Gradients: apply sparingly (hero/side panels); prefer solid fills for forms
- Shadows: soft elevation for cards/buttons; avoid heavy drop shadows

## Light & Dark Modes
- Variables adapt under `prefers-color-scheme: dark`
- Ensure text and icons maintain AA contrast by using `--text-primary` and `--text-muted`

## Responsive Guidance
- Mobile-first; expand with media queries (768px, 1024px)
- Avoid fixed widths; use max-widths and fluid grids
- Keep touch targets ≥44×44px

