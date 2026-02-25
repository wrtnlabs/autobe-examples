# Economic/Political Discussion Board: Requirements Specification

## Introduction
The Economic/Political Discussion Board serves as a platform for users to engage in discussions on economic and political topics. This document specifies business requirements for all system functionalities, written in EARS format to ensure testable implementation criteria. All requirements are based on user scenarios, business processes, and stakeholder expectations.

## User Account Management

### Registration Process
WHEN a user provides a valid email and password during registration, THE system SHALL create a new user account with a confirmation email containing an activation link.

WHEN the email format is invalid (e.g., missing '@' or domain), THE system SHALL display error message: 'Please enter a valid email address'.

WHEN the password does not meet complexity requirements (minimum 12 characters, one uppercase letter, one number, one special character), THE system SHALL show error: 'Password must contain 12+ characters with uppercase, number, and symbol'.

### Account Deletion
WHEN a user requests permanent account deletion via "Delete Account" option, THE system SHALL prompt confirmation with warning: 'This will permanently delete your account and ALL associated content (articles and comments)'.

WHEN deletion is confirmed, THE system SHALL immediately remove the user identity, delete all articles, comments, and associated attachments from the database.

### Password Management
WHEN a user submits a password reset request, THE system SHALL send a time-limited reset link to the registered email.

WHEN a user attempts to change password with current password verification fail, THE system SHALL display: 'Current password is incorrect' with field highlighting.

## User Profile Management

### Profile Creation
WHEN a user creates an account, THE system SHALL prompt to provide display name and bio during onboarding.

WHEN the display name exceeds 30 characters, THE system SHALL truncate to 30 characters with ellipsis.

### Profile Viewing
WHEN a user visits another user's profile, THE system SHALL display:
- Display name and bio text
- List of all articles written by the user
- List of all comments written by the user
- Article count and comment count

### Profile Editing
WHEN a user modifies their display name or bio, THE system SHALL save changes immediately with success confirmation.

WHEN modifying bio text beyond 500 characters, THE system SHALL display warning: 'Bio too long - limit 500 characters' and prevent save.

## Sections Management

### Section Creation
WHEN a super administrator creates a new section via administrative interface, THE system SHALL validate section name meets requirement: 1-50 printable characters, no special characters except underscores.

WHEN section name is invalid (contains spaces before or after), THE system SHALL automatically trim whitespace and display confirmation with corrected name.

### Section Browsing
WHEN a user visits the Sections page, THE system SHALL display all available sections with their descriptions in alphabetical order.

## Article Management

### Article Creation
WHEN a user creates a new article, THE system SHALL require:
- Title (required, 1-100 characters)
- Content (required, 50+ characters)
- Section (required selection from available sections)

WHEN no section is selected, THE system SHALL display error: 'Select a section to publish under'.

### Attachment Handling
WHEN a user attaches a file to an article, THE system SHALL validate:
- File type: .jpg, .png, .pdf, .docx, .xlsx (allowed)
- Maximum size: 10MB per file
- Maximum attachments: 5 per article

WHEN unsupported file type is selected, THE system SHALL display: 'Unsupported file type: .exe, .dll, .zip are not allowed'.

### Article Editing
WHEN a user edits an existing article, THE system SHALL allow modifying title, content, attachments, and tags with the following:
- Title: 1-100 characters
- Content: 50+ characters
- Attachments: Add up to 5 additional files

WHEN article content is edited to less than 50 characters, THE system SHALL display: 'Content must be at least 50 characters'.

### Article Deletion
WHEN a user deletes an article, THE system SHALL prompt confirmation: 'Are you sure you want to delete this article? This cannot be undone'.

WHEN article is confirmed deleted, THE system SHALL remove all content, attachments, and associated comments from the database.

## Article Browsing & Search

### Article Listing
WHEN a user visits a section's page, THE system SHALL display paginated article list with:
- Article title
- Author's display name
- Tags (comma-separated)
- Comment count
- Time posted in 24-hour format

WHEN the user sorts by 'Newest first', THE system SHALL sort articles by creation date descending.

### Article Search
WHEN a user searches for 'economy' in the global search bar, THE system SHALL return articles matching either title or content with 'economy' and display paginated results.

WHEN user applies tag filters (e.g., 'politics'), THE system SHALL show only articles containing that tag.

## Comments Management

### Comment Creation
WHEN a user writes a comment on an article, THE system SHALL validate:
- Minimum 5 characters
- No HTML tags (stripped automatically)
- Time posted with author information

WHEN comment is less than 5 characters, THE system SHALL display error: 'Comments must be at least 5 characters long'.

### Comment Editing
WHEN a user edits their own comment, THE system SHALL allow modifying text content only (no author change).

WHEN edited content is removed completely (empty), THE system SHALL revert to previous content and display warning: 'Comment cannot be empty'.'

## Administrator System

### Administrator Roles
WHEN a regular administrator submits a request to become a super administrator, THE system SHALL create a pending request in the administrative interface with the submitter's reason.

WHEN a super administrator reviews requests, THE system SHALL show:
- User profile name
- Reason submitted
- Duration of current administrator status

### Administrative Capabilities
WHEN a super administrator promotes a regular administrator, THE system SHALL change user role to 'super_admin' and log the action with timestamp.

WHEN an administrator deletes an article, THE system SHALL log the deletion event with user ID and timestamp in audit logs.

## Banning System

### User Banning
WHEN an administrator bans a user, THE system SHALL:
- Record ban reason text (minimum 10 characters)
- Prevent user from logging in
- Preserve all existing articles and comments

WHEN a user attempts to log in while banned, THE system SHALL display: 'Your account is currently banned. Reason: [ban reason]'.

### Ban Management
WHEN a user requests ban review, THE system SHALL provide the ban reason to administrative interface without disclosing to regular users.

WHEN a super administrator lifts a ban, THE system SHALL send confirmation email to user with new account activation link.