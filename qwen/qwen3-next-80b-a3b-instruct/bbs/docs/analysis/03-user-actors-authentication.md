# Economic/Political Discussion Board Requirements Specification

## User Account

WHEN a new user attempts to register, THE system SHALL require a valid email address and a password with minimum 12-character length.

WHEN a user submits valid registration credentials, THE system SHALL create an account with citizen role and default profile settings.

WHEN a user attempts to register with an email already in use, THE system SHALL return HTTP 409 with error code USER_EMAIL_EXISTS.

WHEN a registered user attempts to log in with valid credentials, THE system SHALL authenticate the user and issue a JWT access token (15-minute expiry) and a refresh token (14-day expiry).

WHEN a user attempts to log in with invalid credentials, THE system SHALL return HTTP 401 with error code AUTH_INVALID_CREDENTIALS.

WHEN a user submits a password change request, THE system SHALL validate the current password, hash the new password using bcrypt with cost factor 12, and update the password record.

WHEN a user attempts to change their password to a value matching the previous password, THE system SHALL reject the request with error code PASSWORD_SAME_AS_CURRENT.

WHEN a user requests account deletion, THE system SHALL initiate a soft-delete workflow: mark account as deleted, preserve all articles and comments for audit, prevent future logins, and remove personal data only after 30-day retention period.

WHEN account deletion is initiated, THE system SHALL send a confirmation email to the user's registered address with a 24-hour grace period to cancel.

WHILE a user is logged in, THE system SHALL maintain authentication state via the JWT token with automatic refresh when possible.

WHEN a user's access token expires, THE system SHALL return HTTP 401 with error code AUTH_TOKEN_EXPIRED and include a refresh token in response header.

WHEN a user's refresh token is expired or invalid, THE system SHALL require re-authentication via login credentials.

WHEN a user logs out, THE system SHALL add the current access token to a short-term (5-minute) blacklist and clear the refresh token from secure cookie storage.

WHEN a user attempts to access a protected resource with a blacklisted token, THE system SHALL return HTTP 401 with error code AUTH_TOKEN_BLACKLISTED.

## User Profile

WHEN a user views their own profile, THE system SHALL display:

- Display name (editable)
- Bio text (editable)
- List of all published articles (with links)
- List of all comments (with links)
- Account creation date
- Last login date

WHEN a user views another user's profile, THE system SHALL display:

- Display name
- Bio text
- List of published articles (with links)
- List of comments (with links)
- Account creation date

WHEN a user edits their display name, THE system SHALL validate:
- Maximum 50 characters
- No HTML or markdown
- No profanity or offensive content
- Must be unique among all users

WHEN a user edits their bio, THE system SHALL validate:
- Maximum 500 characters
- No HTML or markdown
- No links or email addresses

WHEN a user's display name or bio changes, THE system SHALL update all references in articles and comments to reflect the new values.

WHEN a user's profile is viewed, THE system SHALL load article and comment lists with pagination (limit: 10 per page).

WHEN a profile page is requested by an anonymous user, THE system SHALL only display public profile information.

WHEN a user's account is banned, THE system SHALL still allow profile viewing but display a banner indicating the user is banned.

WHEN a user's account is deleted, THE system SHALL display a placeholder profile with 'Account Deleted' as display name and no article/comment listings.

## Sections

WHEN a section is created, THE system SHALL require:
- Name (max 100 characters, unique, alphanumeric with spaces and hyphens)
- Description (max 1000 characters)

WHEN a new section is created, THE system SHALL assign it a unique ID and default visibility to all users.

WHEN an administrator attempts to create a section with a name already in use, THE system SHALL return HTTP 409 with error code SECTION_NAME_EXISTS.

WHEN a section is edited, THE system SHALL allow renaming and description updates by administrators.

WHEN a section name is changed, THE system SHALL update all articles with associated section ID to reflect the new name.

WHEN a section is deleted, THE system SHALL:
- Mark the section as deactivated
- Preserve all articles and comments in that section
- Redirect all links to the deactivated section to a "Section Deleted" placeholder page

WHEN a section is deactivated, THE system SHALL still allow browsing of content but prevent new article creation in that section.

WHEN a user requests to view all sections, THE system SHALL return a sorted (alphabetical) list of all active sections.

WHEN a user accesses a section URL for an inactive/removed section, THE system SHALL return HTTP 404 and display a user-friendly message, NOT a technical error.

WHEN a user browses a section, THE system SHALL load articles filtered by that section and sorted by newest first.

## Articles

WHEN a user creates an article, THE system SHALL require:
- Title (max 200 characters, required)
- Content (min 10 characters, required, plain text with markdown formatting allowed)
- Section (required, must be one of active sections)

WHEN a user uploads a file attachment to an article, THE system SHALL:
- Accept files up to 25MB in size
- Accept file types: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, ZIP, TXT
- Generate unique filename with UUID prefix to prevent collisions
- Store in secure object storage with ACLs restricting public access
- Associate file with article ID and user ID

WHEN a user uploads an image attachment to an article, THE system SHALL:
- Accept image formats: JPG, JPEG, PNG, GIF, WebP
- Maximum size: 10MB each
- Generate unique filename with UUID prefix
- Store in secure object storage
- Apply automatic compression to reduce file size without quality loss
- Generate thumbnails (200px, 400px, 800px) for responsive display
- Associate image with article ID and user ID

WHEN a user adds tags to an article, THE system SHALL:
- Accept up to 10 tags per article
- Each tag: max 30 characters, alphanumeric with hyphens and underscores only
- Normalize tags to lowercase
- Strip whitespace from tag edges
- Reject tags containing special characters (@, #, $, etc.)
- Split comma-separated entries into individual tags

WHEN a user edits their own article, THE system SHALL allow modification of:
- Title
- Content
- Attached files (add/remove)
- Attached images (add/remove)
- Tags (add/remove)

WHEN a user edits their own article, THE system SHALL record the edit time but preserve original creation time.

WHEN a user wants to edit their article more than 24 hours after creation, THE system SHALL restrict editing to:
- Adding new attachments
- Adding new tags
- But NOT modifying title, content, or removing existing attachments/tags

WHEN a user deletes their own article, THE system SHALL:
- Mark article as deleted (soft-delete)
- Keep article data preserved for audit
- Remove from all public listings
- Keep associated comments for context (but marked as orphaned)
- Preserve all attachments and images
- Send notification to commenters that the parent article was removed

WHEN an administrator deletes an article, THE system SHALL:
- Mark the article as deleted (soft-delete)
- Record the administrator's ID and reason for deletion
- Preserve article data for audit
- Keep associated comments for context
- Preserve all attachments and images
- Notify the article's author of the deletion with reason

WHEN an article is soft-deleted, THE system SHALL:
- Still allow admin access via admin dashboard
- Still allow full data retrieval using ID or audit logs
- Hide from all public and user-facing lists
- Prevent further edits, comments, or reactions

WHEN a user requests to view an article that has been deleted, THE system SHALL return HTTP 404 unless the requester is an administrator.

## Article List

WHEN a user requests the article list for a section, THE system SHALL:
- Return up to 20 articles per page
- Sort by creation date descending (newest first) by default
- Include only active articles (not deleted)
- Return for each article: ID, title, author display name, section name, tags (list), comment count, creation timestamp
- NOT include article content
- Include pagination controls (prev/next)

WHEN a user selects "oldest first" sorting, THE system SHALL sort articles by creation date ascending.

WHEN articles are paginated, THE system SHALL provide cursor-based pagination with unique IDs for navigation to ensure consistency across updates.

WHEN a user navigates to a non-existent page number, THE system SHALL return last available page with warning notification.

WHEN an administrator edits the section name, THE system SHALL update all article listings to reflect the new section name.

WHEN an article author changes their display name, THE system SHALL update all article listings to reflect the new name.

WHEN an article is deleted, THE system SHALL update the article list to exclude it from all views.

WHEN a user requests the article list with no specified section, THE system SHALL return an error (400) because section is required.

## Viewing an Article

WHEN a user views a single article, THE system SHALL display:

- Title
- Author display name with link to author profile
- Section name with link to section
- Creation timestamp
- Last edit timestamp (if edited)
- Full article content (with markdown rendering)
- List of all files attached (with download links)
- List of all images attached (with responsive thumbnail gallery)
- List of all tags (clickable filters)
- Comment count

WHEN a user clicks a file link, THE system SHALL:
- Verify user has permission to view the article
- Serve the file with appropriate Content-Type header
- Prevent direct URL access without article context
- Log download events for analytics

WHEN a user clicks an image link, THE system SHALL:
- Load the full-resolution image in a modal dialog
- Provide navigation arrows for viewing other images in the article
- Include caption if available
- Allow download with original filename

WHEN a user views an article that has been deleted, THE system SHALL return HTTP 404 unless the user is an administrator.

WHEN an article has 100+ comments, THE system SHALL load comments with pagination (page size: 20).

WHEN a user scrolls to the bottom of the page and more comments exist, THE system SHALL load additional comments via lazy-loading.

## Searching Articles

WHEN a user performs a search, THE system SHALL:

- Match search term against article title AND content
- Support partial word matching
- Return results sorted by relevance score (title matches weighted higher)
- Apply case-insensitive matching
- Escape special regex characters

WHEN a search returns results, THE system SHALL:
- Display up to 20 results per page
- Return: article ID, title, author, section, tags, comment count, creation timestamp
- Include snippet from content where search term appears (up to 100 characters)
- Indicate match count in title and content

WHEN a user applies a tag filter, THE system SHALL:
- Combine with search term
- Only return articles containing at least one of the selected tags
- Allow multiple tag selections (OR logic)
- Apply tag normalization (lowercase, trimmed)
- Support up to 5 simultaneous tag filters

WHEN a search has no results, THE system SHALL return an empty list and display a friendly message: "No articles match your search. Try different keywords or remove some tags."

WHEN a search term is under 3 characters, THE system SHALL return no results with explanation: "Search terms must be at least 3 characters long."

WHEN a search returns more than 500 results, THE system SHALL limit results to 500 and display: "Showing first 500 of X matching articles. Refine your search for better results."

WHEN a tag filter is applied with text that doesn't match any existing tags, THE system SHALL return 0 results with message: "No articles found with tag \