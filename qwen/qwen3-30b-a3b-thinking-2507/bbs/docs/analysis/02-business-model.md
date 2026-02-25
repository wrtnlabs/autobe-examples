# Economic/Political Discussion Board Requirements Specification

## User Account

### Account Creation

WHEN a new user registers for the platform, THE system SHALL require a valid email address and password meeting minimum security requirements (8 characters with at least one uppercase, one lowercase, and one digit). The registration process SHALL include email verification via time-limited token valid for 24 hours.

### Password Management

WHEN a user requests to change their password, THE system SHALL allow secure password changes through a verification process including email confirmation and password complexity enforcement. THE system SHALL immediately invalidate all active sessions upon password change.

### Account Deletion

WHEN a user requests account deletion, THE system SHALL permanently remove all associated content including articles, comments, and profile data within 24 hours. THE system SHALL send confirmation email with deletion details within 1 hour of request.

## User Profile

### Profile Creation

WHEN a user creates their profile, THE system SHALL allow a display name (max 30 characters) and bio text (max 200 characters). THE system SHALL validate display names to prevent offensive language and require a minimum of 2 characters.

### Profile Editing

WHEN a user updates their display name or bio, THE system SHALL validate input and update the profile within 1 second. THE system SHALL immediately reflect changes across all user-facing views.

### Profile Visibility

WHEN a user views another user's profile, THE system SHALL display: 
- Display name and formatted bio
- List of all articles by the user (with title, date, and tags)
- List of all comments by the user (with date)
- Number of articles and comments

## Sections

### Section Management

WHEN administrators create a new section, THE system SHALL require a name (max 50 characters) and description (min 10, max 200 characters). THE system SHALL restrict section creation to administrators only, with validation to prevent duplicate names.

### Section Access

WHEN a user views available sections, THE system SHALL display a paginated list with section name, description, and article count. THE system SHALL maintain chronological order of section creation dates.

## Articles

### Article Creation

WHEN a user creates a new article, THE system SHALL require title (min 5 characters), content (min 20 characters), and valid section selection. THE system SHALL allow attachment of multiple files (max 10) and images (max 5) per article.

### Article Metadata

WHEN an article is created, THE system SHALL automatically generate: 
- Article ID (UUIDv4 format)
- Creation timestamp (UTC)
- Author ID (user identifier)
- Updated timestamp (initially same as creation time)

### Article Editing

WHEN a user edits their article, THE system SHALL allow changes to title, content, attachments, and tags without altering the article ID or creation timestamp. THE system SHALL log all edits with timestamp and user ID.

## Article List

### Pagination System

WHEN users view articles in a section, THE system SHALL display paginated results with 15 articles per page. THE system SHALL provide navigation controls for page numbers and next/previous buttons.

### Article Display

WHEN articles are listed, THE system SHALL display: 
- Title (truncated to 50 characters)
- Author display name
- First 3 tags (with ellipsis if more)
- Comment count (number)
- Time posted (relative format: "2 hours ago")

### Sorting System

WHEN users sort articles, THE system SHALL allow sorting by: 
- Newest first (default)
- Oldest first
- Most comments
- Most views

## Viewing an Article

### Full Article Display

WHEN users view a single article, THE system SHALL display:
- Full title
- Author display name and profile link
- Full content
- Attached files (with download links)
- Attached images (displayed inline)
- Tags with click-to-filter functionality
- Time posted (ISO timestamp format)

### File Handling

WHEN users download attached files, THE system SHALL: 
- Validate file types against allowed MIME types
- Generate secure temporary download links
- Track download events for analytics

## Searching Articles

### Search Functionality

WHEN users search by title or content, THE system SHALL perform full-text search across article content with relevance scoring. THE system SHALL implement fuzzy matching to handle spelling variations.

### Filtering System

WHEN users apply tags for filtering, THE system SHALL display a list of available tags with counts and allow multi-select filtering. THE system SHALL reset filters when new searches begin.

## Comments

### Comment System

WHEN a user posts a comment, THE system SHALL require comment text (min 5, max 500 characters) and validate against content policy. THE system SHALL prevent comment posting while user is banned.

### Comment Display

WHEN comments are displayed, THE system SHALL show:
- Author display name and profile link
- Full comment text
- Time posted (relative format: "10 minutes ago")
- Edit and delete buttons for author only

### Comment Modification

WHEN a user edits existing comment, THE system SHALL update comment text with timestamp and log the change. THE system SHALL display "Edited" annotation next to modified comments.

## Administrator System

### Administrator Request Process

WHEN a user submits an administrator request, THE system SHALL require a reason (min 20 characters) and create a pending request visible to super administrators within 1 business day.

### Role Management

WHEN super administrators approve an administrator request, THE system SHALL grant regular administrator permissions immediately. THE system SHALL require super administrator approval for all role changes.

### Administrative Capabilities

WHEN administrators manage the platform, THE system SHALL allow:
- Creating, editing, and deleting sections
- Deleting any article or comment without user consent
- Banning users with reason documentation
- Viewing all banned users and their reasons

## Banning System

### Banning Process

WHEN an administrator bans a user, THE system SHALL require a reason (min 10 characters) and apply the ban immediately. THE system SHALL record the banning administrator's ID and timestamp.

### Banned User Experience

WHEN a banned user attempts to log in, THE system SHALL display:
- 'Account suspended' message
- Ban reason text (if publicly viewable)
- Contact information for appeal
- No access to content or functionality

### Appeal System

WHEN a banned user submits an appeal, THE system SHALL create a request visible to super administrators within 24 hours. THE system SHALL send update notification upon resolution.