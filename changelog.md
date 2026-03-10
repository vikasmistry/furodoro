# Changelog


## [v0.3.1]

### Added
- **Task Management Sidebar**: Introduced a new sidebar component for managing tasks and the focus stack.
- **Task Integration**: Added `apiService.js` to handle fetching task categories and specific tasks (Integration with LifeUp API).
- **Stack Controls**: Added UI elements (dropdowns for Category and Task, "Add to Stack" button) to the sidebar.
- **Toast Notification System**: Implemented a lightweight toast notification system (`showToast`) for user feedback, complete with success and error styling.
- **Responsive Behavior**: The sidebar now automatically opens on desktop viewports (>900px) for better usability.
- **API Feedback**: Added toast notification when successful connection to LifeUp API is established.

### Fixed
- **Light Mode**: Fixed broken light theme by implementing comprehensive color overrides and variables in `style.css`.
- **Stack Container Color**: Fixed an issue where dropdown menus appeared white in dark mode on Linux by enforcing `color-scheme: dark` for native browser widgets.
- **Mobile Layout**: Fixed vertical alignment issue where the UI was top-aligned on mobile devices. Content is now centered.
- **Security**: Added strict validation and sanitization for the LifeUp Server URL input to prevent XSS and malicious data injection.

### Changed
- **UI/UX**: Updated `style.css` to include styles for the new sidebar, form elements, and toast notifications.
- **Application Logic**: Refactored `script.js` to manage sidebar state, initialization, and event listeners for the new task controls.

### Removed
- **Legacy Styles**: Removed unused CSS rules for GitHub footer icons and default number input spinners.

