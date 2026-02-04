# Economic/Political Discussion Board Requirements Specification

## User Account

WHEN a new user registers on the platform, THE system SHALL require an email address and password to create a citizen account.

WHEN a registered user submits valid login credentials, THE system SHALL authenticate the user and generate a secure session token.

WHEN a user submits invalid login credentials, THE system SHALL return HTTP 401 with error code AUTH_INVALID_CREDENTIALS.

WHEN a user requests a password change, THE system SHALL verify the current password and update the hashed password in the database using bcrypt with cost factor 12.

WHEN a user requests account deletion, THE system SHALL:
- Mark the account for deletion
- Retain the user's articles and comments for audit purposes
- Prevent future logins
- Remove the user's profile information (display name, bio)
- Maintain association between deleted account and their content for moderation

WHERE the user is a registered citizen, THE system SHALL allow registration, login, password changes, and account deletion.

IF a user attempts to register with an email address already in use, THE system SHALL reject the registration and return error code EMAIL_ALREADY_EXISTS.

WHILE a user's session is active, THE system SHALL maintain authentication state via a secure token.

## User Profile

WHEN a user views their own profile, THE system SHALL display:
- Display name
- Bio text
- List of all articles authored by the user
- List of all comments authored by the user
- Creation timestamp of the account

WHEN a user views another user's profile, THE system SHALL display:
- Display name
- Bio text
- List of all articles authored by the user
- List of all comments authored by the user

WHEN a user edits their own profile (display name or bio), THE system SHALL:
- Accept display name with length between 1 and 100 characters
- Accept bio text with length up to 500 characters
- Preserve the timestamp of the last profile update
- Allow updates only for the authenticated user

WHEN a user attempts to edit someone else's profile, THE system SHALL return HTTP 403 Forbidden.

WHERE the user owns the profile, THE system SHALL allow profile editing.

## Sections

WHEN an administrator creates a new section, THE system SHALL require:
- Name: non-empty string with minimum length of 2 characters and maximum length of 50 characters
- Description: non-empty string with minimum length of 10 characters and maximum length of 1000 characters

WHEN an administrator creates a section, THE system SHALL ensure the section name is unique.

WHEN an administrator edits an existing section, THE system SHALL allow modification of:
- Name (must remain unique)
- Description

WHEN an administrator deletes a section, THE system SHALL:
- Remove the section from section listings
- Retain all articles and comments associated with that section
- Update articles to have "deleted section" as the section indication
- Preserve all content for historical and moderation purposes

WHEN a user views the list of sections, THE system SHALL return all active sections with name and description.

WHEN a user browses articles within a specific section, THE system SHALL return only articles associated with that section identifier.

IF an administrator attempts to create a section with duplicate name, THE system SHALL reject the request with error code SECTION_NAME_EXISTS.

IF an administrator attempts to edit a section to have empty name or description, THE system SHALL reject the request with error code SECTION_INVALID.

## Articles

WHEN a user creates an article, THE system SHALL require:
- Title: non-empty string with minimum length of 5 characters and maximum length of 200 characters
- Content: non-empty string with minimum length of 100 characters
- Section: must reference a valid, active section identifier

WHEN a user creates an article, THE system SHALL auto-assign:
- Unique article ID (UUIDv4)
- Author ID (current authenticated user)
- Creation timestamp in ISO 8601 format
- Initial comment count: 0
- No tags unless specified

WHEN a user edits their own article, THE system SHALL permit modification of:
- Title (max 200 characters)
- Content (min 100 characters)
- Attachments (add, remove, or replace files and images)
- Tags (add, remove, or modify)
- Section (change to other valid section)

WHEN a user edits their article, THE system SHALL:
- Preserve original creation timestamp
- Record modification timestamp in ISO 8601 format
- Increment version counter by 1

WHEN a user attempts to edit an article they do not own, THE system SHALL deny the request and return HTTP 403 Forbidden.

WHEN a user deletes their own article, THE system SHALL:
- Mark the article as deleted with status 'deleted by user'
- Retain metadata (title, author, timestamp, comment count)
- Preserve all attached files and images
- Make content invisible to non-administrators
- Maintain article ID and association for audit trail

WHEN an administrator deletes any article, THE system SHALL:
- Mark the article as deleted with status 'deleted by admin'
- Retain full metadata and content for audit purposes
- Preserve all attached files and images
- Record the administrator ID and deletion timestamp
- Generate an audit log entry with: article_id, admin_id, deletion_time, and reason (if provided)

IF an article title is empty or fewer than 5 characters, THE system SHALL reject creation or edit and return error code ARTICLE_TITLE_TOO_SHORT.

IF article content is empty or fewer than 100 characters, THE system SHALL reject creation or edit and return error code ARTICLE_CONTENT_TOO_SHORT.

IF an article references a non-existent or inactive section, THE system SHALL reject creation or edit and return error code SECTION_INVALID.

WHEN the original article has been edited, THE system SHALL allow viewing the full edit history by administrators only.

## File and Image Attachments

WHEN a user attaches files to an article, THE system SHALL:
- Allow up to 10 files per article
- Accept file types: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV, ZIP, RAR
- Enforce a maximum file size of 100 MB per file
- Store files with unique encrypted storage identifiers

WHEN a user attaches images to an article, THE system SHALL:
- Allow up to 15 images per article
- Accept formats: JPEG, PNG, GIF, BMP, WEBP
- Enforce maximum image size of 20 MB per image
- Automatically resize images to maximum 1920x1080 pixels
- Generate and store thumbnail versions (300x300)

WHEN a user uploads a file or image, THE system SHALL:
- Validate MIME type against allowed types
- Generate unique storage key (UUIDv4) for each file
- Store original and processed versions
- Record metadata: filename, size, type, upload timestamp, storage location

IF an uploaded file has an unsupported extension (e.g., .exe, .bat, .dll), THE system SHALL reject the upload and return error code ATTACH_INVALID_TYPE.

IF a user attempts to exceed the maximum number of attachments, THE system SHALL reject the upload and return error code ATTACH_QUOTA_EXCEEDED.

WHEN an article is deleted, THE system SHALL NOT delete associated files or images from storage.

WHEN attachments are removed from an article, THE system SHALL retain original files in storage for 30 days before scheduled archival cleanup.

## Tagging System

WHEN a user adds tags to an article, THE system SHALL:
- Allow up to 10 tags per article
- Each tag: minimum 2 characters, maximum 50 characters
- Permit characters: alphanumeric, hyphen (-), underscore (_)
- Trim whitespace from start and end of tag
- Store all tags in lowercase internally (case-insensitive)
- Reject any tag containing spaces or invalid characters
- Ignore duplicate tags within the same article

WHEN a tag is submitted with invalid format, THE system SHALL return error code TAG_INVALID_FORMAT.

WHEN a tag is submitted that does not exist system-wide, THE system SHALL create it in the global tag registry.

WHEN tags are displayed on an article, THE system SHALL render as comma-separated, lowercase, hyphen-delimited strings for URL compatibility.

WHEN a user searches articles by tag, THE system SHALL:
- Match case-insensitively
- Handle partial matches
- Return articles tagged with either exact tag or synonyms if system supports them

## Article List

WHEN a user displays the article list for a section, THE system SHALL show each article with:
- Title (limited to 100 characters for display, full title available on click)
- Author display name
- List of up to 5 tags (displayed as comma-separated, no links)
- Comment count (integer)
- Creation timestamp in human-readable format: "YYYY-MM-DD HH:mm" using Asia/Seoul timezone

WHEN a user sorts articles by 'newest first', THE system SHALL order by creation timestamp DESC (most recent first).

WHEN a user sorts articles by 'oldest first', THE system SHALL order by creation timestamp ASC (oldest first).

WHEN a user requests a page of articles, THE system SHALL:
- Return exactly 20 articles per page (unless fewer remain)
- Provide a pagination token for next page
- Return HTTP 404 if requested page exceeds total available pages
- Include total article count in response header: X-Total-Count

WHEN a section contains more than 10,000 articles, THE system SHALL optimize loading with caching for frequently accessed pages.

WHEN a user navigates between article pages, THE system SHALL maintain consistent sorting order.

WHEN a user changes sorting criteria, THE system SHALL reset pagination to page 1.

WHEN a user requests an article list with invalid section identifier, THE system SHALL return HTTP 404 with message 'Section not found'.

WHEN article title or author name contains non-Latin characters (e.g., Chinese, Arabic, Cyrillic), THE system SHALL display them correctly without truncation or corruption.

## Viewing an Article

WHEN a user views an individual article, THE system SHALL display:
- Full title (untruncated)
- Author display name with link to profile
- Full article content with preserved formatting
- List of all attached files (with download links)
- List of all attached images (with thumbnail preview)
- All tags as clickable links
- Creation and modification timestamps
- Comment count
- Comment section

WHEN a user opens an article, THE system SHALL increment a view counter (for analytics only).

WHEN a user clicks to download a file attachment, THE system SHALL:
- Validate user permission to access the article
- Return the file with correct MIME type
- Provide an appropriate filename for download

WHEN a user clicks to view an image attachment, THE system SHALL:
- Return the full-size image
- Include image metadata if available
- Provide zoom capability

WHEN a user accesses an article marked as deleted, THE system SHALL:
- Show article as 'Deleted' if user is not an administrator
- Show article with full details if user is administrator

## Searching Articles

WHEN a user searches articles by title or content, THE system SHALL:
- Search for exact matches and partial matches
- Rank results by relevance (more matches = higher priority)
- Include both title and content fields in search scope
- Return search results in paginated format (20 per page)
- Allow pagination via cursor or offset/token
- Include total result count in response header

WHEN a user filters search results by tags, THE system SHALL:
- Only return articles tagged with ALL specified tags (AND logic)
- Support multiple tag filtering (up to 5 tags)
- Combine tag filters with title/content search
- Return results sorted by relevance
- Include total filtered count

WHEN a search term is empty or contains only whitespace, THE system SHALL return no results and a message: "Please enter a search term."

WHEN a user searches by tag only, THE system SHALL return articles with that specific tag (case-insensitive).

## Comments

WHEN a user writes a comment on an article, THE system SHALL require:
- Content: non-empty string with minimum length of 1 character and maximum length of 1000 characters
- Association to an active article
- Association to a valid authenticated user

WHEN a user writes a comment, THE system SHALL:
- Assign a unique identifier
- Record creation timestamp in ISO 8601 format
- Set initial reply count: 0 (single-level only)
- Link to the parent article and author

WHEN a user edits their own comment, THE system SHALL allow modification only if:
- The comment is less than 60 minutes old
- The user is the original author
- The content length remains within limits (1-1000 characters)

WHEN a user edits a comment, THE system SHALL:
- Preserve original creation timestamp
- Record modification timestamp
- Increment edit counter
- Display "(edited)" indicator on frontend

WHEN a user attempts to edit a comment they don't own, THE system SHALL return HTTP 403 Forbidden.

WHEN a user deletes their own comment, THE system SHALL:
- Mark the comment as deleted with status 'deleted by user'
- Retain metadata