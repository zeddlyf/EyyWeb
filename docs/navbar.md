# Navbar Component

## Overview
Reusable navigation bar for the eyyweb SPA. Provides grouped dropdown menus, global search integration, responsive layout, active view indicators, and accessible keyboard navigation.

## Location
`src/components/Navbar.js`

## Props
- `user`: `{ firstName, lastName, role }` for display and Admin group visibility
- `currentView`: one of `dashboard | analytics | users | feedbackAdmin | notifications | emergency`
- `onNavigate(view)`: function to change the current view
- `onLogout()`: function to sign out
- `onGlobalSearch(query)`: function that receives the search string

## Groups & Items
- Overview: Map (`dashboard`), Analytics (`analytics`)
- Management: Users (`users`), Notifications (`notifications`), Emergency (`emergency`)
- Admin (shown when `user.role === 'admin'`): Moderate (`feedbackAdmin`)

## Accessibility
- `nav` has `role="navigation"` and `aria-label="Primary"`
- Group buttons set `aria-haspopup="menu"` and `aria-expanded`
- Dropdown uses `role="menu"` and items `role="menuitem"`
- Keyboard: `ArrowLeft`/`ArrowRight` to move across groups, `ArrowDown` to open and move within a menu, `ArrowUp` to move upward, `Escape` to close

## Responsive
- Compact hamburger toggler on small screens
- Dropdowns use subtle fade/slide animations

## Search Integration
- Input submits on Enter or button click
- App routes to `Users` and passes `initialSearch` down to `UserManagement`

## Adding Items
1. Edit `items` array in `Navbar.js`
2. Provide `{ id, label, view }`
3. Ensure `App.js` can render the target `view`

## Styling
- Colors follow existing brand palette used across the app (`#1f2937`, `#3B82F6`, etc.)
- Transitions via keyframes in the component style block

## Tests
- `src/components/Navbar.test.js` covers grouping, active state, dropdown keyboard navigation, and search

## Maintenance Notes
- Keep `items` grouping aligned with product hierarchy
- When adding a new view, wire it in `App.js` and expose via `Navbar`