# Economic and Political Discussion Board

## User Account System

WHEN a new user joins the platform, THE system SHALL require the user to provide:
- A valid email address (consistent with RFC 5322 format)
- A password with minimum 12 characters
- The password shall contain at least one uppercase letter, one lowercase letter, one number, and one special character

WHEN a user attempts to sign up with an email address already registered, THE system SHALL reject the request with an error: "This email address is already in use."

WHEN a user completes registration, THE system SHALL:
- Create a new user account with role "citizen"
- Generate a unique user ID
- Set the initial display name to the email address prefix (before @ symbol)
- Set the bio field to empty string
- Send a welcome verification email
- Enable the account for login

WHEN a user logs in, THE system SHALL:
- Accept the provided email address and password
- Verify the email exists and the account is not banned
- Hash the provided password and compare against stored hash
- If credentials are correct, issue a JSON Web Token (JWT) with:
  - User ID as subject
  - Role as claim (citizen/administrator/superAdministrator)
  - Expiration of 24 hours
  - Signed with application secret key
- Redirect authenticated user to the dashboard

WHEN a user provides incorrect credentials during login, THE system SHALL:
- Return error message: "Invalid email or password"
- Record failed attempt in audit log
- For five consecutive failed attempts from the same IP within 10 minutes, THE system SHALL temporarily lock the account for 30 minutes

WHEN a user requests password change, THE system SHALL:
- Require the user to authenticate with current credentials
- Require the new password to meet the same complexity rules as registration
- Require the user to confirm the new password
- Update the password hash in the database
- Invalidate all existing active sessions
- Send a password change confirmation email

WHEN a user requests account deletion, THE system SHALL:
- Require the user to authenticate with current credentials
- Require explicit confirmation: "I understand that deleting my account will permanently delete all my articles and comments and cannot be undone."
- Begin soft-delete process of all user-owned content:
  - Hide all articles from public listing
  - Hide all comments from article threads
  - Mark all content as "deleted"
  - Replace user display name with "[Deleted User]"
  - Keep user ID and deleted status in database for audit purposes
  - Delete associated file attachments from storage
- Send final confirmation email
- Invalidate all user sessions

## User Profile Management

WHEN a user edits their profile, THE system SHALL allow modification of:
- Display name (maximum 50 characters, alphanumeric and standard punctuation only)
- Bio text (maximum 1000 characters)

WHEN a user sets a display name that is already in use by another user, THE system SHALL reject the change with: "This display name is already taken."

WHEN a user attempts to set a display name that is empty or contains only whitespace, THE system SHALL reject the change with: "Display name cannot be empty."

WHEN a user attempts to set a bio exceeding 1000 characters, THE system SHALL truncate the bio to 1000 characters and notify: "Bio has been truncated to 1000 characters."

WHEN a user views another user's public profile, THE system SHALL display:
- The target user’s display name
- The target user’s bio text
- A list of all published articles written by the target user (title only)
- A list of all comments written by the target user (comment content excerpt: first 150 characters + "...")
- The number of articles and comments by the target user
- The date the target user registered

WHEN a user views their own profile, THE system SHALL include additional options:
- Edit Display Name button
- Edit Bio button
- Change Password button
- Delete Account button

WHEN a user profile contains deleted content, THE system SHALL still display the profile but indicate:
- "This user has deleted their content"
- In article list: "Content deleted" instead of article title
- In comment list: "Comment deleted" instead of comment excerpt

## Section Management

WHEN a section is created, THE system SHALL require:
- A unique name (maximum 50 characters, alphanumeric and spaces)
- A description (maximum 500 characters)

WHEN an administrator creates a new section, THE system SHALL:
- Validate the section name is not already in use
- Validate the description is not empty
- Create section record with:
  - Unique section ID
  - Created timestamp
  - Created by administrator ID
  - Public status: active

WHEN an administrator edits a section, THE system SHALL allow modification of:
- Section name
- Section description

WHEN section name is changed to a name already in use, THE system SHALL reject: "Section name already exists."

WHEN a section is deleted, THE system SHALL:
- Mark section as inactive
- Preserve all existing articles and comments in this section
- Prevent creation of new articles in this section
- Display notification: "This section is no longer available for new posts"
- Retain section data for historical reference

WHEN a user views available sections, THE system SHALL display:
- List of all active sections
- Each section with:
  - Section name
  - Section description
  - Number of published articles in the section
- Inactive sections shall not be displayed

WHEN a user browses articles in a specific section, THE system SHALL:
- Retrieve only articles marked as active and belonging to the requested section
- Hide articles from inactive sections
- Prevent navigation to deleted sections via URL

## Article Creation and Management

WHEN a user creates an article, THE system SHALL require:
- Title (minimum 5 characters, maximum 150 characters)
- Content (minimum 20 characters, maximum 50,000 characters)
- Section ID (must correspond to an active section)

WHEN a user submits an article with a title shorter than 5 characters, THE system SHALL show error: "Title must be at least 5 characters long."

WHEN a user submits an article with a title longer than 150 characters, THE system SHALL show error: "Title cannot exceed 150 characters."

WHEN a user submits an article with content under 20 characters, THE system SHALL show error: "Content must be at least 20 characters long."

WHEN a user submits an article with content over 50,000 characters, THE system SHALL show error: "Content cannot exceed 50,000 characters."

WHEN a user attempts to create an article in an inactive section, THE system SHALL reject with: "You cannot post in this section as it is no longer active."

WHEN a user includes tags with their article, THE system SHALL:
- Accept between 0 and 15 tags
- Each tag must be 2 to 30 characters long
- Only alphanumeric characters and hyphens allowed
- Separate tags by comma, space, or newline
- Normalize whitespace and convert to lowercase
- Store tags as distinct records for filtering

WHEN a user edits their own article, THE system SHALL allow modification of:
- Title
- Content
- Tags
- File attachments
- Image attachments

WHEN a user edits an article more than 30 minutes after creation, THE system SHALL:
- Record "Edited" timestamp
- Append "(Edited)" to the article’s display title
- Maintain original creation timestamp

WHEN a user deletes their own article, THE system SHALL:
- Mark article as deleted
- Hide article from public listings
- Preserve historical data for administrators
- Remove all associated file and image attachments
- Keep article content for audit purposes but mark inaccessible for non-administrators
- Delete comments on the article
- Update section article count

WHEN a user attaches a file to an article, THE system SHALL:
- Allow all file types
- Limit single file size to 50MB
- Limit total file attachments per article to 10 files
- Store file in secure public storage with randomized unique filename
- Generate downloadable URL accessible with article read permissions
- Return file metadata: filename, size, MIME type, upload timestamp

WHEN a user attaches an image to an article, THE system SHALL:
- Allow only image MIME types: image/jpeg, image/png, image/gif, image/webp
- Limit single image size to 20MB
- Limit total image attachments per article to 5 images
- Auto-resize images larger than 1920x1080px (maintain aspect ratio)
- Generate optimized WebP variant if original is JPEG/PNG
- Store original and optimized versions
- Return image metadata: filename, width, height, size, MIME type, upload timestamp

## Article List and Display

WHEN a user views a section article list, THE system SHALL:
- Display exactly 10 articles per page (pagination)
- Default sort order: newest first (by creation timestamp)
- Support alternative sort order: oldest first
- Show for each article:
  - Title (truncated to 80 characters if necessary, with ellipsis)
  - Author display name
  - Tags as comma-separated list (max 5 tags shown)
  - Total number of comments
  - Creation timestamp (in localized format)
- Hide "deleted" articles from public view
- Hide articles from inactive sections
- Hide articles from banned users

WHEN a user changes sorting order, THE system SHALL:
- Maintain pagination state across changes
- Preserve any active filters (search terms, tags)
- Reload article list with new sort order
- Update URL parameter: ?sort=newest or ?sort=oldest
- Maintain smooth transition with loading animation

## Article Viewing

WHEN a user accesses an article page, THE system SHALL display:
- Article title
- Author display name (clickable to profile)
- Creation timestamp
- Last edited timestamp (if edited)
- Full content with markdown formatting (paragraphs, lists, headers)
- All attached files with download links
- All attached images with responsive display
- Associated tags as clickable links
- Comment section with comment count

WHEN a user clicks on a file attachment link, THE system SHALL:
- Verify user has permission to view the article
- Verify the file has not been deleted
- Set appropriate Content-Type header
- Set Content-Disposition: attachment
- Return the file for download

WHEN a user clicks on an image attachment, THE system SHALL:
- Verify user has permission to view the article
- Return optimized WebP variant (if available) for performance
- Display image in modal with carousel if multiple images
- Include Title, Caption, upload date as metadata

## Search and Filtering

WHEN a user performs a search, THE system SHALL:
- Search article titles and content fields
- Use full-text search with relevance scoring
- Return results as paginated list (10 items per page)
- Always show at least 1 result if search returns anything
- Support case-insensitive matching
- Match partial words (substring matching)
- Return articles where search term appears in title or content

WHEN a user applies tag filters, THE system SHALL:
- Filter articles containing ALL specified tags (intersection)
- Match tag exactly (case-insensitive)
- Allow up to 5 tag filters simultaneously
- Show filter as visible chip tags
- Allow removal of individual tags
- Combine with search term if both are provided

WHEN a user combines search and tag filters, THE system SHALL:
- Return articles matching BOTH search term AND tag filters
- Use intersection logic (AND operation)
- Highlight search terms in results
- Display "X results for \"term\" with tags: A, B"

WHEN no results are found, THE system SHALL:
- Display message: "No articles found matching your search. Try different keywords or remove some filters."
- Show suggested popular tags
- Show recently published articles

## Comment Management

WHEN a user writes a comment, THE system SHALL require:
- Minimum 2 characters of content
- Maximum 1,000 characters of content

WHEN a user submits a comment under 2 characters, THE system SHALL show: "Comment must be at least 2 characters long."

WHEN a user submits a comment over 1,000 characters, THE system SHALL show: "Comment cannot exceed 1,000 characters."

WHEN a user replies to an article, THE system SHALL:
- Create comment with:
  - User ID
  - Article ID
  - Timestamp
  - Content text
  - Parent comment ID set to null (single-level only)
- Increment the article’s comment count
- Send notification to article author (if enabled)

WHEN a user edits their own comment, THE system SHALL allow modification of:
- Comment content only

WHEN a user edits a comment more than 30 minutes after creation, THE system SHALL:
- Record "Edited" timestamp
- Append "(Edited)" to comment display text
- Maintain original creation timestamp

WHEN a user deletes their own comment, THE system SHALL:
- Mark the comment as deleted
- Replace content with: "This comment has been deleted."
- Reduce the article’s comment count
- Keep record in audit log

WHEN a user views comments on an article, THE system SHALL:
- Display comments sorted by oldest first (ascending timestamp)
- Show exactly 10 comments per page (pagination)
- For each comment show:
  - Author display name (clickable)
  - Comment content (truncated to 1,000 characters)
  - Creation timestamp
  - "Edited" badge if edited
  - Edit/Delete buttons if comment is user’s own
- Hide deleted comments from public view

## Administrator System

### Administrator Request Submission

WHEN a citizen submits a request to become an administrator, THE system SHALL store the request with the following information:
- The requesting user's unique identifier (userId)
- The requesting user's display name
- The submitted reason text (minimum 50 characters, maximum 1000 characters)
- The timestamp of submission
- The status: "pending"

WHEN a request is submitted, THE system SHALL prevent the same citizen from submitting another request until the current request is either approved or rejected.

WHEN a request is submitted, THE system SHALL notify super administrators via an internal notification system.

IF a request reason is shorter than 50 characters, THEN THE system SHALL reject the request with an error message: "Reason must be at least 50 characters long."

IF a request reason is longer than 1000 characters, THEN THE system SHALL reject the request with an error message: "Reason cannot exceed 1000 characters."

### Administrator Approval Process

WHEN a super administrator reviews a pending admin request, THE system SHALL display:
- The requesting citizen's display name
- The requesting citizen's unique identifier
- The submitted reason text
- The submission timestamp
- The current status

WHEN a super administrator approves a request, THE system SHALL:
- Change the request status to "approved"
- Upgrade the citizen's account role to "administrator"
- Remove any future requests from this user
- Log the action with the super administrator's ID and timestamp

WHEN a super administrator rejects a request, THE system SHALL:
- Change the request status to "rejected"
- Keep the user's role as "citizen"
- Log the action with the super administrator's ID, timestamp, and optional rejection note
- Allow the citizen to submit a new request after 30 days

WHILE a request status is "pending", THE system SHALL prevent the requested user from gaining any administrator privileges.

WHEN a request is approved or rejected, THE system SHALL notify the citizen via email.

### Administrator Grade Hierarchy

THE system SHALL have two administrator grades: "administrator" and "superAdministrator".

THE system SHALL define "superAdministrator" as the highest privilege level.

WHEN a user is promoted to "superAdministrator", THE system SHALL prevent any other user, including existing super administrators, from demoting them.

THE system SHALL allow a super administrator to promote a regular administrator to super administrator.

### Super Admin Privileges

WHEN a user has the role "superAdministrator", THE system SHALL grant them all capabilities of an administrator, plus:
- The ability to promote any administrator to super administrator
- The ability to demote any super administrator to administrator (except themselves)
- The ability to view ALL admin requests, past and present
- The ability to view ALL administrator actions in the audit log
- The ability to reset any user's password
- The ability to override any content deletion or ban decision

IF a user account has the role "superAdministrator", THEN THE system SHALL NOT allow that user to initiate a request to become an administrator.

WHILE a user is a super administrator, THE system SHALL prevent them from being demoted to administrator by any other user except super administrators.

### Demotion Restrictions

IF a user has the role "superAdministrator", THEN THE system SHALL:
- Allow them to demote other super administrators to administrator
- Prevent them from demoting themselves to administrator
- Prevent any other user from demoting them

WHEN a super administrator attempts to demote themselves, THE system SHALL reject the action and return the error: "Super administrators cannot demote themselves."

IF a user has the role "superAdministrator", THEN THE system SHALL display the warning: "You are a super administrator. Demoting yourself is not permitted." when attempting to downgrade their own role.

### Administrator Capabilities Matrix

| Action | Citizen | Administrator | Super Administrator |
|--------|---------|---------------|---------------------|
| Register account | ✅ | ✅ | ✅ |
| Login | ✅ | ✅ | ✅ |
| Change password | ✅ | ✅ | ✅ |
| Delete own account | ✅ | ✅ | ✅ |
| Edit own profile | ✅ | ✅ | ✅ |
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

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*

## Banning System

WHEN an administrator bans a user, THE system SHALL:
- Set the user's account status to "banned"
- Record the banning administrator's user ID
- Record the timestamp of ban
- Require a reason text (minimum 10 characters)
- Preserve the user’s existing articles and comments
- Immediately invalidate all active sessions for the banned user
- Prevent the user from logging in

WHEN a user attempts to log in while banned, THE system SHALL:
- Reject authentication attempt
- Return error: "Your account has been banned. Contact an administrator for more information."
- Record the failed login attempt in audit log

WHEN an administrator unbans a user, THE system SHALL:
- Set the user's account status to "active"
- Record the unbanning administrator's user ID
- Record the timestamp of unban
- Restore the user's ability to log in
- Re-enable all previously deleted content permissions

WHEN a user is banned, THE system SHALL:
- Keep all their articles visible and accessible
- Keep all their comments visible and accessible
- Prevent the user from posting new content
- Prevent the user from editing or deleting their existing content
- Prevent the user from uploading attachments
- Keep ban reason visible to all administrators

WHEN an administrator views the banned users list, THE system SHALL display:
- User display name (or "[Deleted User]" if account deleted)
- User ID
- Ban timestamp
- Ban reason
- Name of administrator who issued the ban
- "Unban" button for active bans

WHEN a banned user's account is later deleted, THE system SHALL:
- Preserve the ban record with status "banned and deleted"
- Keep the ban reason visible in audit history
- Prevent re-registration with the same email address for 1 year

> *Security Note: All ban reasons are stored cryptographically secured in database. Audit logs are immutable and retain full history for compliance purposes.*