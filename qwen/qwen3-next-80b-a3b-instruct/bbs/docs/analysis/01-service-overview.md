# Economic/Political Discussion Board

## Service Vision

The Economic/Political Discussion Board is a democratic digital forum designed to foster informed, civil discourse on economic systems and political ideologies. This service exists to counter the fragmentation and polarization of modern public discourse by providing a structured, moderated environment where users can engage with complex societal issues through evidence-based discussion, rather than emotional reaction. The platform aims to elevate public understanding of economic principles and political systems by enabling users to share insights, challenge assumptions, and learn from diverse perspectives.

## User Actors

### Citizen

A citizen is a registered user who participates in the platform by creating articles, writing comments, and engaging in discussions. Citizens initiate most interactions on the platform.

- WHEN a new citizen registers, THE system SHALL require a valid email address and password with minimum 8 characters
- WHEN a citizen attempts to log in, THE system SHALL authenticate credentials and issue a JWT access token
- WHEN a citizen changes their password, THE system SHALL invalidate all existing sessions
- WHEN a citizen deletes their account, THE system SHALL permanently remove all associated articles, comments, and profile data
- WHEN a citizen submits an administrator request, THE system SHALL create a pending request with reason text
- WHEN a citizen views another user's profile, THE system SHALL display only public information: display name, bio, article count, and comment count
- WHEN a citizen creates an article, THE system SHALL require title (minimum 5 characters) and content (minimum 10 characters)
- WHEN a citizen attaches files or images to an article, THE system SHALL validate file types and enforce size limits (max 100MB per file)
- WHEN a citizen adds tags to an article, THE system SHALL allow up to 10 free-text tags with no duplicates
- WHEN a citizen edits their own article, THE system SHALL permit changes to title, content, attachments, and tags only within 72 hours of creation
- WHEN a citizen deletes their own article, THE system SHALL mark it as deleted with preservation of audit log
- WHEN a citizen writes a comment, THE system SHALL require content of minimum 2 characters and maximum 1,000 characters
- WHEN a citizen edits their own comment, THE system SHALL permit edits only within 30 minutes of posting
- WHEN a citizen deletes their own comment, THE system SHALL mark it as deleted with preservation of audit log
- WHEN a citizen searches articles, THE system SHALL allow filtering by title, content, and tags with pagination of 20 results per page
- WHEN a citizen views an article, THE system SHALL display full content, attachments, tags, and author information
- WHEN a citizen downloads an attached file or image, THE system SHALL generate a time-limited signed URL

### Administrator

An administrator is a citizen granted elevated privileges to maintain platform quality and integrity. Administrators perform moderation and management functions.

- WHEN an administrator logs in, THE system SHALL grant all citizen permissions and additional administrative capabilities
- WHEN an administrator creates a section, THE system SHALL require name (minimum 2 characters) and description (maximum 500 characters)
- WHEN an administrator edits a section, THE system SHALL permit changes to name and description with update to all related articles
- WHEN an administrator deletes a section, THE system SHALL move all articles to a default "General" section and mark the section as deleted
- WHEN an administrator deletes any article, THE system SHALL mark it as deleted by admin with preservation of content for audit
- WHEN an administrator deletes any comment, THE system SHALL mark it as deleted by admin with preservation of content for audit
- WHEN an administrator bans a user, THE system SHALL set account status to banned, record reason (minimum 10 characters), and invalidate all sessions
- WHEN an administrator unbans a user, THE system SHALL set account status to active, clear the ban reason, and restore login capability
- WHEN an administrator views banned users, THE system SHALL display display name, ban reason, ban timestamp, and banning admin ID
- WHEN an administrator attempts to ban themselves, THE system SHALL reject the request with error code CANNOT_BAN_SELF
- WHEN an administrator attempts to promote themselves to super administrator, THE system SHALL reject the request with error code CANNOT_PROMOTE_SELF

### Super Administrator

A super administrator is the highest privilege level, responsible for governance and administrator management. Super administrators have ultimate authority over the system.

- WHEN a super administrator logs in, THE system SHALL grant all administrator permissions and additional super administrator privileges
- WHEN a super administrator approves an admin request, THE system SHALL promote the citizen to administrator status
- WHEN a super administrator rejects an admin request, THE system SHALL remove the pending request and notify the citizen
- WHEN a super administrator promotes a regular administrator, THE system SHALL upgrade the user role to super administrator
- WHEN a super administrator demotes another super administrator, THE system SHALL downgrade the user role to administrator
- WHEN a super administrator attempts to demote themselves, THE system SHALL reject the request with error code CANNOT_DEMOTE_SELF
- WHEN a super administrator views pending admin requests, THE system SHALL display all requests with user identifiers and reasons
- WHEN a super administrator modifies any user account status, THE system SHALL log all changes with full audit trail
- WHEN a super administrator resets a user's password, THE system SHALL invalidate all sessions and notify the user

## Authentication and Session Management

### Registration Process

WHEN a user attempts to register with an email, THE system SHALL:

- Validate email format according to RFC 5322 standard
- Check email uniqueness against existing accounts
- Verify that the password contains at least 8 characters
- Generate a unique confirmation token with 7-day expiration
- Create account with status "pending_verification"
- Send confirmation email with verification link

WHEN a user attempts to register with an already-registered email, THE system SHALL:

- Return HTTP 400 error with code "EMAIL_ALREADY_EXISTS"
- Return message: "An account with this email already exists."

WHEN a user attempts to register with a password less than 8 characters, THE system SHALL:

- Return HTTP 400 error with code "PASSWORD_TOO_SHORT"
- Return message: "Password must be at least 8 characters long."

### Login Process

WHEN a user attempts to log in with email and password, THE system SHALL:

- Locate user account by email address
- Verify password against bcrypt hash (cost factor 12)
- Check that account status is "verified"
- Check that account is not marked as "banned"
- Generate JWT access token with 15-minute expiration containing: userId, role, permissions, exp
- Generate JWT refresh token with 7-day expiration
- Store refresh token in httpOnly, Secure, SameSite=Strict cookie
- Store access token in client-side localStorage
- Return success with access token in response

WHEN a user attempts to log in with invalid credentials, THE system SHALL:

- Return HTTP 401 error with code "INVALID_CREDENTIALS"
- Return message: "Email or password is incorrect."
- Do NOT distinguish between invalid email and invalid password for security

WHEN a user attempts to log in with an unverified account, THE system SHALL:

- Return HTTP 401 error with code "ACCOUNT_NOT_VERIFIED"
- Return message: "Please verify your email address before logging in."

WHEN a user attempts to log in with a banned account, THE system SHALL:

- Return HTTP 403 error with code "ACCOUNT_BANNED"
- Return message: "Your account has been banned. Contact an administrator for more information."

### Session Renewal

WHEN an access token expires but refresh token is still valid, THE system SHALL:

- Validate refresh token signature
- Check refresh token is not revoked
- Generate new JWT access token (15-minute expiration)
- Generate new refresh token (7-day expiration from current time)
- Invalidate previous refresh token
- Return new tokens

WHEN a user logs out, THE system SHALL:

- Clear refresh token from cookie
- Add access token to blacklist with 15-minute TTL
- Terminate session

WHEN a user changes their password, THE system SHALL:

- Update bcrypt password hash
- Invalidate all refresh tokens associated with the account
- Return HTTP 200 with success message

WHEN a user deletes their account, THE system SHALL:

- Mark account status as "deleted"
- Immediately revoke all active sessions and refresh tokens
- Queue all associated content for permanent deletion
- Return HTTP 200 with success message

### Logout Process

WHEN a user initiates logout, THE system SHALL:

- Remove refresh token from HTTP cookie
- Add current access token to blacklist
- Delete session from memory
- Return success response

## User Profile Management

### Profile Editing

WHEN a user edits their profile, THE system SHALL:

- Allow update of display name and bio text
- Validate display name length between 2 and 50 characters
- Validate bio text length between 0 and 500 characters
- Check for display name conflicts with existing users
- Allow alphanumeric, underscore, and hyphen characters in display name
- Update last_updated timestamp

WHEN a user attempts to set a display name less than 2 characters, THE system SHALL:

- Return HTTP 400 error with code "DISPLAY_NAME_TOO_SHORT"
- Return message: "Display name must be at least 2 characters long."

WHEN a user attempts to set a display name exceeding 50 characters, THE system SHALL:

- Return HTTP 400 error with code "DISPLAY_NAME_TOO_LONG"
- Return message: "Display name cannot exceed 50 characters."

WHEN a user attempts to set a display name that already exists, THE system SHALL:

- Return HTTP 400 error with code "DISPLAY_NAME_TAKEN"
- Return message: "This display name is already in use. Please choose another."

WHEN a user attempts to set bio exceeding 500 characters, THE system SHALL:

- Return HTTP 400 error with code "BIO_TOO_LONG"
- Return message: "Bio cannot exceed 500 characters."

### Profile Viewing

WHEN a user views their own profile, THE system SHALL display:

- Display name
- Bio text
- Email address (private, not visible to others)
- Registration date
- Account status (active/banned/deleted)
- Article count
- Comment count
- Edit history (for profile changes)

WHEN a user views another user's profile, THE system SHALL display:

- Display name
- Bio text
- Article count
- Comment count
- Registration date

WHEN a user views profile of a deleted account, THE system SHALL:

- Replace display name with "[Deleted User]"
- Replace bio with "This user deleted their account."
- Show article count and comment count as 0
- Hide all personal information

WHEN a user views profile of a banned account, THE system SHALL:

- Replace display name with "[Banned User]"
- Replace bio with "This user has been banned." 
- Show article count and comment count from before ban
- Hide all personal information
- Show ban reason on admin interface

## Section Management

### Section Creation

WHEN an administrator creates a section, THE system SHALL:

- Require section name (minimum 2 characters, maximum 50)
- Require section description (maximum 500 characters)
- Ensure section name is unique across all sections
- Generate unique section_id
- Set creation timestamp
- Set status to "active"

WHEN a section name exceeds 50 characters, THE system SHALL:

- Return HTTP 400 error with code "SECTION_NAME_TOO_LONG"
- Return message: "Section name cannot exceed 50 characters."

WHEN a section name is less than 2 characters, THE system SHALL:

- Return HTTP 400 error with code "SECTION_NAME_TOO_SHORT"
- Return message: "Section name must be at least 2 characters long."

WHEN a section description exceeds 500 characters, THE system SHALL:

- Return HTTP 400 error with code "SECTION_DESCRIPTION_TOO_LONG"
- Return message: "Section description cannot exceed 500 characters."

WHEN a section name is not unique, THE system SHALL:

- Return HTTP 400 error with code "SECTION_EXISTS"
- Return message: "A section with this name already exists."

### Section Editing

WHEN an administrator edits a section, THE system SHALL:

- Permit changes to section name and description
- Validate new name against existing section names
- Update all articles belonging to this section with new section_id
- Update last_updated timestamp
- Log administrator who made the change

WHEN a section name is changed to an existing name, THE system SHALL:

- Return HTTP 400 error with code "SECTION_EXISTS"
- Return message: "A section with this name already exists."

### Section Deletion

WHEN an administrator deletes a section, THE system SHALL:

- Move all articles in the section to the "General" section
- Set section status to "deleted"
- Preserve section name and description in deleted state
- Log deletion with admin ID and timestamp
- Prevent creation of new articles in the deleted section
- Allow existing articles to remain accessible

WHEN a user attempts to view a deleted section, THE system SHALL:

- Return HTTP 404 error with code "SECTION_NOT_FOUND"
- Return message: "This section has been deleted."

## Article Management

### Article Creation

WHEN a user creates an article, THE system SHALL:

- Require title (minimum 5 characters, maximum 200)
- Require content (minimum 10 characters)
- Require valid section_id (must be active section)
- Validate title uniqueness within user's articles (optional)
- Generate unique article_id
- Set creation timestamp
- Set last_edited timestamp
- Set view_count to 0
- Set comment_count to 0
- Associate with user_id as author

WHEN an article title is less than 5 characters, THE system SHALL:

- Return HTTP 400 error with code "ARTICLE_TITLE_TOO_SHORT"
- Return message: "Title must be at least 5 characters long."

WHEN an article title exceeds 200 characters, THE system SHALL:

- Return HTTP 400 error with code "ARTICLE_TITLE_TOO_LONG"
- Return message: "Title cannot exceed 200 characters."

WHEN an article content is less than 10 characters, THE system SHALL:

- Return HTTP 400 error with code "ARTICLE_CONTENT_TOO_SHORT"
- Return message: "Content must be at least 10 characters long."

WHEN an article attempts to reference an inactive section, THE system SHALL:

- Return HTTP 400 error with code "INVALID_SECTION"
- Return message: "Invalid or inactive section selected."

### Article Editing

WHEN an author edits their own article, THE system SHALL:

- Allow modification of title, content, attachments, and tags
- Permit editing only within 72 hours of article creation
- Update last_edited timestamp
- Log edit history
- Maintain original creation timestamp
- Preserve comment counts and views

WHEN an article is edited after 72 hours, THE system SHALL:

- Return HTTP 403 error with code "EDIT_WINDOW_EXPIRED"
- Return message: "The 72-hour edit window has expired. This article can no longer be modified."

WHEN a non-author attempts to edit an article, THE system SHALL:

- Return HTTP 403 error with code "PERMISSION_DENIED"
- Return message: "You can only edit your own articles."

### Article Deletion

WHEN a user deletes their own article, THE system SHALL:

- Mark article as "deleted" with deletion timestamp
- Set visible status to false
- Remove from section lists and search results
- Preserve article content for audit
- Decrement author's article count

WHEN an administrator deletes an article, THE system SHALL:

- Mark article as "deleted_by_admin" with deletion timestamp and admin_id
- Set visible status to false
- Remove from section lists and search results
- Preserve article content for audit
- Preserve comments associated with article
- Log deletion with reason provided

WHEN a deleted article is requested, THE system SHALL:

- Return HTTP 404 error with code "ARTICLE_NOT_FOUND"
- Return message: "This article has been deleted."

## Article Listing

### List Display

WHEN a user views article list in a section, THE system SHALL display:

- Article title
- Author display name
- Tags (up to 5 tags displayed, comma-separated)
- Comment count
- Creation timestamp
- Section name
- Status (active/deleted)

WHEN article list is requested, THE system SHALL:

- Return paginated results with 20 articles per page
- Support pagination from 1 to 100 
- Return last page (100) if requested page exceeds 100
- Return first page (1) if requested page is less than 1
- Include total count of articles
- Include total number of pages

### Sorting

WHEN sorting articles by newest first, THE system SHALL:

- Order by creation_timestamp DESC
- Return newest articles first

WHEN sorting articles by oldest first, THE system SHALL:

- Order by creation_timestamp ASC
- Return oldest articles first

WHEN no sort criteria is specified, THE system SHALL:

- Default to newest first ordering

## Article Viewing

### Article Display

WHEN a user views a single article, THE system SHALL display:

- Title (maximum 200 characters)
- Author display name
- Full content (up to 50,000 characters)
- List of attached files with download URLs
- List of attached images with view URLs
- List of tags
- Creation timestamp
- Last edited timestamp
- View count
- Comment count
- Section name

WHEN a user views an article with a deleted author, THE system SHALL:

- Display "[Deleted User]" as author
- Keep all other content visible

WHEN a user views an article with a banned author, THE system SHALL:

- Display "[Banned User]" as author
- Keep all content visible

WHEN a user views a deleted article, THE system SHALL:

- Return HTTP 404 error with code "ARTICLE_NOT_FOUND"
- Return message: "This article has been deleted."

### File and Image Access

WHEN a user requests a file download, THE system SHALL:

- Verify article exists and is active
- Verify file attachment exists
- Verify user has permission to view article
- Generate time-limited signed URL (5-minute expiration)
- Increment download counter
- Return download URL

WHEN a user requests an image view, THE system SHALL:

- Verify article exists and is active
- Verify image attachment exists
- Verify user has permission to view article
- Return optimized image (resize to 1200px width if larger)
- Increment view counter
- Return image URL

WHEN a file or image does not exist, THE system SHALL:

- Return HTTP 404 error with code "FILE_NOT_FOUND"
- Return message: "File or image not found."

## Comment Management

### Comment Creation

WHEN a user posts a comment on an article, THE system SHALL:

- Require content (minimum 2 characters, maximum 1,000)
- Validate article exists and is active
- Associate comment with article_id and user_id
- Set creation timestamp
- Set status to "active"
- Increment article's comment_count

WHEN a comment exceeds 1,000 characters, THE system SHALL:

- Return HTTP 400 error with code "COMMENT_CONTENT_TOO_LONG"
- Return message: "Comment cannot exceed 1,000 characters."

WHEN a comment is less than 2 characters, THE system SHALL:

- Return HTTP 400 error with code "COMMENT_CONTENT_TOO_SHORT"
- Return message: "Comment must be at least 2 characters long."

WHEN a comment is posted on a deleted article, THE system SHALL:

- Return HTTP 404 error with code "ARTICLE_NOT_FOUND"
- Return message: "Cannot comment on deleted article."

WHEN a banned user attempts to post a comment, THE system SHALL:

- Return HTTP 403 error with code "ACCOUNT_BANNED"
- Return message: "Your account has been banned."

### Comment Display

WHEN a user views comments on an article, THE system SHALL:

- Return comments sorted by creation_timestamp ASC (oldest first)
- Return 30 comments per page
- Include:
  - Comment ID
  - Author display name
  - Content
  - Creation timestamp
  - Status (active/deleted)

WHEN a comment has been deleted:

- Display: "[Deleted Comment]"
- Include comment ID
- Include creation timestamp
- Include deletion timestamp
- Include author display name

WHEN a comment's author is deleted:

- Display: "[Deleted User]" as author
- Keep comment content

WHEN a comment's author is banned:

- Display: "[Banned User]" as author
- Keep comment content

### Comment Editing

WHEN an author edits their own comment, THE system SHALL:

- Allow editing of content only
- Permit editing only within 30 minutes of posting
- Update last_edited timestamp
- Log edit history
- Display edit indicator

WHEN a comment is edited after 30 minutes, THE system SHALL:

- Return HTTP 403 error with code "COMMENT_EDIT_WINDOW_EXPIRED"
- Return message: "The 30-minute edit window for this comment has expired."

WHEN a non-author attempts to edit a comment, THE system SHALL:

- Return HTTP 403 error with code "PERMISSION_DENIED"
- Return message: "You can only edit your own comments."

WHEN a comment's new content is less than 2 characters, THE system SHALL:

- Return HTTP 400 error with code "COMMENT_CONTENT_TOO_SHORT"
- Return message: "Comment must be at least 2 characters long."

WHEN a comment's new content exceeds 1,000 characters, THE system SHALL:

- Return HTTP 400 error with code "COMMENT_CONTENT_TOO_LONG"
- Return message: "Comment cannot exceed 1,000 characters."

### Comment Deletion

WHEN a user deletes their own comment, THE system SHALL:

- Mark comment as "deleted"
- Decrement article's comment_count
- Preserve comment content for audit
- Log deletion with timestamp

WHEN an administrator deletes a comment, THE system SHALL:

- Mark comment as "deleted_by_admin"
- Decrement article's comment_count
- Preserve comment content for audit
- Log deletion with admin ID and reason

WHEN a deleted comment is requested, THE system SHALL:

- Return: 
  - "[Deleted Comment]"
  - Comment ID
  - Creation timestamp
  - Deletion timestamp
  - Author display name

## Search and Filtering

### Article Search

WHEN a user submits a search query, THE system SHALL:

- Search across article titles and content (full-text search)
- Search across article tags (exact match)
- Return results ordered by relevance score
- Return 20 results per page
- Support pagination from 1 to 100
- Highlight matching keywords in titles and content snippets

WHEN a search query is less than 3 characters, THE system SHALL:

- Return empty results
- Return message: "Search term must be at least 3 characters long."

WHEN a search query exceeds 100 characters, THE system SHALL:

- Return error with code "SEARCH_QUERY_TOO_LONG"
- Return message: "Search query cannot exceed 100 characters."

WHEN a search query is empty or whitespace, THE system SHALL:

- Return empty results
- Return message: "Enter a search term to find articles."

### Tag Filtering

WHEN a user applies tag filters, THE system SHALL:

- Filter articles that contain ALL specified tags (AND logic)
- Support up to 5 tags in a single filter combination
- Match tags case-insensitively
- Trim whitespace from tag inputs
- Return filtered results sorted by creation_timestamp DESC

WHEN a tag filter contains more than 50 characters, THE system SHALL:

- Ignore that tag
- Process remaining valid tags

WHEN a tag filter contains only whitespace, THE system SHALL:

- Ignore that tag
- Process remaining valid tags

### Search Result Display

WHEN displaying search results, THE system SHALL show:

- Article title
- Snippet of matching content (up to 100 characters with keyword highlight)
- Author display name
- Tags (up to 5)
- Creation timestamp
- Section name
- Comment count

WHEN no results are found, THE system SHALL:

- Return empty array
- Return message: "No articles found matching your search."

## File and Media Attachment

### File Attachment

WHEN a user attaches a file to an article, THE system SHALL:

- Validate file size ≤ 100MB
- Validate file extension: .pdf, .doc, .docx, .txt, .md, .rtf, .xls, .xlsx, .ppt, .pptx, .zip, .gz, .7z
- Generate unique filename using UUID + original extension
- Store file in object storage with path /articles/[article_id]/[filename]
- Store file record with:
  - original_name
  - stored_name
  - size
  - mime_type
  - upload_timestamp
  - uploader_id
  - article_id

WHEN a file exceeds 100MB limit, THE system SHALL:

- Return HTTP 400 error with code "FILE_SIZE_EXCEEDED"
- Return message: "Total file attachments cannot exceed 100MB per article."

WHEN there are more than 10 files attached, THE system SHALL:

- Return HTTP 400 error with code "TOO_MANY_FILES"
- Return message: "Maximum 10 files allowed per article."

WHEN a file has an invalid extension, THE system SHALL:

- Return HTTP 400 error with code "INVALID_FILE_TYPE"
- Return message: "Only PDF, DOC, DOCX, TXT, MD, RTF, XLS, XLSX, PPT, PPTX, ZIP, GZ, and 7Z files are allowed."

WHEN a file name contains invalid characters (other than alphanumeric, underscore, hyphen, period), THE system SHALL:

- Return HTTP 400 error with code "INVALID_FILENAME"
- Return message: "File name can only contain letters, numbers, underscores, hyphens, and periods."

### Image Attachment

WHEN a user attaches an image to an article, THE system SHALL:

- Validate image format: jpg, jpeg, png, gif, webp
- Validate total image size ≤ 50MB
- Validate maximum 20 images per article
- Generate thumbnail (800x600px max)
- Store original image and thumbnail in object storage
- Store metadata including:
  - original_name
  - stored_name
  - thumbnail_name
  - width
  - height
  - size
  - mime_type
  - upload_timestamp
  - uploader_id
  - article_id

WHEN an image file format is unsupported, THE system SHALL:

- Return HTTP 400 error with code "INVALID_IMAGE_FORMAT"
- Return message: "Only JPG, JPEG, PNG, GIF, and WEBP images are allowed."

WHEN total images exceed 20 per article, THE system SHALL:

- Return HTTP 400 error with code "TOO_MANY_IMAGES"
- Return message: "Maximum 20 images allowed per article."

WHEN total image size exceeds 50MB, THE system SHALL:

- Return HTTP 400 error with code "IMAGE_SIZE_EXCEEDED"
- Return message: "Total image attachments cannot exceed 50MB per article."

## Administration System

### Administrator Request Submission

WHEN a citizen submits an administrator request, THE system SHALL:

- Allow submission of a reason text (minimum 50 characters, maximum 1,000)
- Check that the user is not already an administrator
- Check that the user has no pending admin request
- Store request with:
  - user_id
  - display_name
  - reason
  - submitted_at
  - status: "pending"
- Notify all super administrators via internal message system

WHEN an admin request reason is less than 50 characters, THE system SHALL:

- Return HTTP 400 error with code "REQUEST_REASON_TOO_SHORT"
- Return message: "Reason for administrator request must be at least 50 characters long."

WHEN an admin request reason exceeds 1,000 characters, THE system SHALL:

- Return HTTP 400 error with code "REQUEST_REASON_TOO_LONG"
- Return message: "Reason cannot exceed 1,000 characters."

WHEN a user tries to submit another admin request while one is pending, THE system SHALL:

- Return HTTP 403 error with code "PENDING_REQUEST_EXISTS"
- Return message: "You already have a pending administrator request. Please wait for its resolution."

WHEN a user who is already an administrator attempts to submit a request, THE system SHALL:

- Return HTTP 400 error with code "ALREADY_ADMIN"
- Return message: "You are already an administrator."

### Admin Request Approval and Rejection

WHEN a super administrator approves an admin request, THE system SHALL:

- Change request status to "approved"
- Promote user role to "administrator"
- Send email notification to user
- Log approval event with super_admin_id and timestamp

WHEN a super administrator rejects an admin request, THE system SHALL:

- Change request status to "rejected"
- Send email notification to user
- Log rejection event with super_admin_id and timestamp
- Allow user to submit a new request after 30 days

WHEN a super administrator views pending requests, THE system SHALL:

- Return list sorted by submission date (newest first)
- Include:
  - Request ID
  - User ID
  - Display name
  - Reason
  - Submission timestamp
  - Status

### Administrator Grade Hierarchy

WHEN a super administrator promotes a regular administrator, THE system SHALL:

- Change user role from "administrator" to "superAdministrator"
- Grant all super administrator privileges
- Log promotion event with timestamp and promoting admin_id
- Notify promoted user via email

WHEN a super administrator demotes another super administrator, THE system SHALL:

- Change user role from "superAdministrator" to "administrator"
- Remove super administrator privileges
- Log demotion event with timestamp and demoting admin_id
- Notify demoted user via email

WHEN a user attempts to promote a non-administrator, THE system SHALL:

- Return HTTP 400 error with code "NOT_AN_ADMIN"
- Return message: "Cannot promote user who is not a regular administrator."

WHEN a super administrator attempts to demote themselves, THE system SHALL:

- Return HTTP 403 error with code "CANNOT_DEMOTE_SELF"
- Return message: "Super administrators cannot demote themselves."

### Super Administrator Privileges

WHEN a user has the role "superAdministrator", THE system SHALL:

- Have all administrator privileges
- Be able to promote administrators to super administrator
- Be able to demote super administrators to administrator
- Be able to view and manage all pending admin requests
- Be able to view full audit logs for all administrative actions
- Be able to reset any user's password
- Be able to override any content removal decision
- Be able to view ban reasons for all banned users

WHEN a user has the role "superAdministrator", THE system SHALL NOT allow:

- Submission of an administrator request
- Demotion of self

### Banning and Unbanning

WHEN an administrator bans a user, THE system SHALL:

- Set user status to "banned"
- Record ban reason (minimum 10 characters)
- Record timestamp and banning admin_id
- Invalidate all active sessions
- Prevent login attempts
- Preserve all articles and comments
- Log ban event

WHEN a ban reason is less than 10 characters, THE system SHALL:

- Return HTTP 400 error with code "BAN_REASON_TOO_SHORT"
- Return message: "Ban reason must be at least 10 characters long."

WHEN an administrator attempts to ban themselves, THE system SHALL:

- Return HTTP 400 error with code "CANNOT_BAN_SELF"
- Return message: "Administrators cannot ban themselves."

WHEN an administrator unbans a user, THE system SHALL:

- Set user status to "active"
- Clear ban reason
- Record unban timestamp and unbanning admin_id
- Allow login attempts
- Notify user via email
- Log unban event

WHEN a user is unbanned but attempts to ban immediately after, THE system SHALL:

- Allow the ban
- Log new ban event

WHEN a user is banned, THE system SHALL:

- Display "[Banned User]" in all user profile displays
- Hide user's personal details
- Keep all content visible

WHEN a banned user attempts to log in, THE system SHALL:

- Return HTTP 403 error with code "ACCOUNT_BANNED"
- Return message: "Your account has been banned. Contact an administrator for more information."

### Administrator Capabilities Matrix

| Action | Citizen | Administrator | Super Administrator |
|--------|---------|---------------|---------------------|
| Register account | ✅ | ✅ | ✅ |
| Login | ✅ | ✅ | ✅ |
| Change password | ✅ | ✅ | ✅ |
| Delete account | ✅ | ✅ | ✅ |
| Edit profile | ✅ | ✅ | ✅ |
| View other profiles | ✅ | ✅ | ✅ |
| Create section | ❌ | ✅ | ✅ |
| Edit section | ❌ | ✅ | ✅ |
| Delete section | ❌ | ✅ | ✅ |
| Create article | ✅ | ✅ | ✅ |
| Edit own article | ✅ | ✅ | ✅ |
| Delete any article | ❌ | ✅ | ✅ |
| Write comment | ✅ | ✅ | ✅ |
| Edit own comment | ✅ | ✅ | ✅ |
| Delete any comment | ❌ | ✅ | ✅ |
| Ban user | ❌ | ✅ | ✅ |
| Unban user | ❌ | ✅ | ✅ |
| View banned users list | ❌ | ✅ | ✅ |
| Submit admin request | ✅ | ✅ | ❌ |
| Approve admin request | ❌ | ❌ | ✅ |
| Reject admin request | ❌ | ❌ | ✅ |
| Promote to admin | ❌ | ❌ | ✅ |
| Demote admin | ❌ | ❌ | ✅ |
| Demote self | ❌ | ❌ | ❌ |
| Reset any user password | ❌ | ❌ | ✅ |
| Override content decisions | ❌ | ❌ | ✅ |
| View audit log | ❌ | ❌ | ✅ |
| Download attachments | ✅ | ✅ | ✅ |
| Search articles | ✅ | ✅ | ✅ |
| Filter by tags | ✅ | ✅ | ✅ |

## Banning System

### Ban Enforcement

WHEN a user is banned, THE system SHALL:

- Immediately invalidate all access tokens and refresh tokens
- Prevent any future authentication for that account
- Retain visibility of all articles and comments created by the banned user
- Display "[Banned User]" in place of their display name in all public interfaces
- Hide ban reason from citizens, only visible to administrators
- Record ban timestamp and administrator who enacted the ban

WHEN a banned user accesses the platform, THE system SHALL:

- Return HTTP 403 status code
- Return error code "ACCOUNT_BANNED"
- Return message: "Your account has been banned. Contact an administrator for more information."
- Not provide any reason details to the banned user

WHEN a banned user tries to view their own profile, THE system SHALL:

- Return "[Banned User]" for display name
- Return "This account has been banned." for bio
- Show article and comment counts as they existed at time of ban
- Hide email and other personal information
- Show message: "Your account has been suspended."

WHEN a user is unbanned, THE system SHALL:

- Set status to "active"
- Clear all ban-related fields
- Allow login attempts
- Restore original display name
- Restore visibility of personal profile information

## Audit and Logging

### System Auditing

THE system SHALL maintain an immutable audit log for the following events:

- All administrator actions (create/delete sections, delete articles/comments)
- All bans and unbans
- All admin requests (submitted, approved, rejected)
- All promotions and demotions
- All password resets
- All user account deletions
- All file uploads and downloads
- All authentication attempts (successful and failed)
- All permission violations
- All system integrity breaches

THE audit logs SHALL include:

- Event type
- Timestamp (ISO 8601)
- Initiating user ID
- Target user ID (if applicable)
- Affected resource ID (article, comment, section, etc.)
- Action details
- Reason provided (for bans, deletions, admin requests)
- IP address of request
- User agent

THE audit logs SHALL be:

- Immutable, with cryptographic hashing of each entry
- Stored in a separate secured database
- Accessible only to super administrators
- Retained for minimum of 365 days

## Performance Expectations

THE system SHALL:

- Return article lists within 1.2 seconds for up to 5,000 articles
- Return search results within 0.8 seconds for common terms
- Load individual article pages within 1.5 seconds
- Process article creation within 800ms
- Process file uploads with progress feedback every 250ms
- Process comment submissions within 500ms
- Process password changes within 300ms
- Process profile edits within 200ms
- Return profile views within 1.0 second for users with 50 articles and 100 comments
- Process admin request approvals within 700ms
- Process search with tag filtering within 1.2 seconds

## Security Requirements

THE system SHALL:

- Store passwords using bcrypt with cost factor 12
- Use JWT with 256-bit signing key
- Set access token expiration to 15 minutes
- Set refresh token expiration to 7 days
- Store refresh tokens in httpOnly, secure, SameSite=Strict cookies
- Sanitize all user inputs to prevent XSS and SQL injection
- Validate all file uploads for type and size
- Limit file uploads to 100MB per file
- Limit total article attachments to 10 files and 20 images
- Enforce HTTPS for all connections
- Implement Content Security Policy (CSP) headers
- Use rate limiting of 100 requests/minute per IP for unauthenticated users
- Use rate limiting of 500 requests/minute per user for authenticated users
- Use Web Application Firewall (WAF) to filter malicious traffic
- Implement account lockout after 5 failed login attempts
- Notify users via email if their account is banned or accessed from new IP

## Legal and Data Protection Requirements

THE system SHALL:

- Comply with GDPR and other applicable data protection regulations
- Allow users to export their personal data in JSON format
- Allow users to request deletion of their personal data
- Anonymize user data after account deletion
- Retain audit logs for at least 12 months
- Not store credit card or payment information
- Clearly state privacy policy terms on signup
- Obtain explicit consent before processing personal data
- Notify users via email if their account data is compromised
- Not use user-generated content for AI training without explicit consent

## Error Handling and Recovery

### Authentication Errors
- EMAIL_EXISTS: User attempted to register with existing email
- PASSWORD_TOO_SHORT: Password is less than 8 characters
- INVALID_EMAIL: Email format is invalid
- ACCOUNT_NOT_VERIFIED: Email not yet verified
- INVALID_CREDENTIALS: Invalid username or password
- ACCOUNT_BANNED: User account is banned
- EMAIL_NOT_VERIFIED: Account not yet verified

### Content Validation Errors
- TITLE_TOO_SHORT: Article title less than 5 characters
- TITLE_TOO_LONG: Article title exceeds 200 characters
- CONTENT_TOO_SHORT: Article content less than 10 characters
- ARTICLE_TITLE_TOO_LONG: Article title exceeds 200 characters
- ARTICLE_CONTENT_TOO_LONG: Article content exceeds 50,000 characters
- COMMENT_CONTENT_TOO_SHORT: Comment less than 2 characters
- COMMENT_CONTENT_TOO_LONG: Comment exceeds 1,000 characters
- REQUEST_REASON_TOO_SHORT: Admin request reason less than 50 characters
- REQUEST_REASON_TOO_LONG: Admin request reason exceeds 1,000 characters
- BAN_REASON_TOO_SHORT: Ban reason less than 10 characters
- DISPLAY_NAME_TOO_SHORT: Display name less than 2 characters
- DISPLAY_NAME_TOO_LONG: Display name exceeds 50 characters
- DISPLAY_NAME_TAKEN: Display name already in use
- BIO_TOO_LONG: Bio exceeds 500 characters
- SECTION_NAME_TOO_SHORT: Section name less than 2 characters
- SECTION_NAME_TOO_LONG: Section name exceeds 50 characters
- SECTION_DESCRIPTION_TOO_LONG: Section description exceeds 500 characters
- SECTION_EXISTS: Section name already exists
- ARTICLE_NOT_FOUND: Article does not exist or has been deleted
- COMMENT_NOT_FOUND: Comment does not exist or has been deleted
- SECTION_NOT_FOUND: Section does not exist or has been deleted
- FILE_NOT_FOUND: File or image does not exist or was deleted

### Permission Denied Errors
- PERMISSION_DENIED: User lacks permission for action
- CANNOT_BAN_SELF: User cannot ban themselves
- CANNOT_DEMOTE_SELF: Super administrator cannot demote themselves
- CANNOT_PROMOTE_SELF: User cannot promote themselves
- NOT_AN_ADMIN: User is not an administrator
- ALREADY_ADMIN: User is already an administrator
- PENDING_REQUEST_EXISTS: User has a pending admin request

### Search and Filter Errors
- SEARCH_QUERY_TOO_SHORT: Search term less than 3 characters
- SEARCH_QUERY_TOO_LONG: Search term exceeds 100 characters

### File Upload Errors
- FILE_SIZE_EXCEEDED: File exceeds 100MB limit
- TOO_MANY_FILES: More than 10 files attached
- INVALID_FILE_TYPE: File type not in whitelist
- INVALID_FILENAME: Invalid characters in filename
- IMAGE_SIZE_EXCEEDED: Image files exceed 50MB limit
- TOO_MANY_IMAGES: More than 20 images attached
- INVALID_IMAGE_FORMAT: Image format not in whitelist

### Edit Window Errors
- EDIT_WINDOW_EXPIRED: Article edit window of 72 hours expired
- COMMENT_EDIT_WINDOW_EXPIRED: Comment edit window of 30 minutes expired

### Session Errors
- TOKEN_EXPIRED: Access token has expired
- TOKEN_INVALID: Access token signature invalid
- TOKEN_REVOKED: Access token has been revoked
- REFRESH_TOKEN_INVALID: Refresh token invalid
- REFRESH_TOKEN_EXPIRED: Refresh token has expired

### System Errors
- INTERNAL_SERVER_ERROR: Unhandled server error
- SERVICE_UNAVAILABLE: Underlying service down

## Future Considerations

THE system SHALL be designed with extensibility in mind for potential future features:

- Mobile app integration for iOS and Android
- Push notification system for comment replies (future feature)
- Analytics dashboard for administrators
- AI-assisted moderation tools for content flagging
- Multi-language support for international users
- Community reputation system with badges
- Advanced search with boolean operators
- Article version history
- User follow system
- Bookmarking articles
- Email subscription for section updates

All future versions shall maintain backward compatibility with:
- JWT token structure
- API endpoint design
- Database schema
- File storage format

> *Developer Note: This document defines business requirements only. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*
