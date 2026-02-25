# Economic/Political Discussion Board

## Service Overview

This is a web-based discussion platform allowing registered users to engage in organized debates and information sharing on economic and political topics. Built as a scalable backend service, it supports user profile management, topic-based content organization through categorized sections, content publication with fine-grained controls, site-wide search, moderation tools, and an escalation path for administrative privileges.

## User Actors and Authentication

### User Actors

There are three distinct user actor types in this system:

1. **Citizen**: A registered user with standard privileges. Citizen accounts are created during sign-up and are the foundation of community participation.
2. **Administrator**: A trusted user with moderation and section management permissions. Administrators can be promoted from Citizen status.
3. **Super Administrator**: A master account with full system control, including user promotion/demotion, system-wide configuration, and administrative oversight. Super Administrators are granted by system initialization and cannot be created by users.

### Authentication Flow

**User Registration**

WHEN a new user visits the registration page, THE system SHALL display a form collecting email and password.

WHEN the user submits the registration form, THE system SHALL:
- Validate the email format using standard RFC 2822 patterns
- Verify the password meets minimum complexity requirements (minimum 12 characters, includes uppercase, lowercase, number, and special character)
- Check that the email address is not already registered in the system
- Generate a unique user identifier (UUID)
- Create a new user account with status "active" and role "Citizen"
- Hash the password using bcrypt with cost factor 12
- Send a confirmation email with a time-limited verification link

WHEN the user clicks the email verification link, THE system SHALL:
- Validate the verification token (must be unexpired and match the user's record)
- Set the user's account status to "verified"
- Redirect the user to the login page with a success message

**User Login**

WHEN a user visits the login page, THE system SHALL display an email and password field.

WHEN the user submits login credentials, THE system SHALL:
- Locate the user account by email
- Verify account status is "verified" and not "banned"
- Compare the submitted password hash against the stored bcrypt hash
- If credentials are valid, generate a signed JWT token valid for 7 days
- Store the token in an HTTP-only, secure cookie named "auth_token"
- Set session timestamp and IP address for security auditing
- Redirect to the home page

WHEN login fails, THE system SHALL:
- Return generic "Invalid email or password" error message
- Increment failed login attempts counter
- If counter reaches 5 within 10 minutes, temporarily lock the account for 30 minutes

**Password Change**

WHEN an authenticated user navigates to the password change page, THE system SHALL:
- Require the user to enter current password
- Require new password to meet complexity requirements (minimum 12 characters, includes uppercase, lowercase, number, special character)
- Require new password to differ from the last 5 passwords
- Verify the current password matches the stored hash
- Hash the new password using bcrypt with cost factor 12
- Store the new hash in the database
- Invalidate all active JWT tokens for this user
- Send a password change confirmation email

**Account Deletion**

WHEN an authenticated user initiates account deletion, THE system SHALL:
- Require the user to enter their password as confirmation
- Verify password is correct
- Set account status to "deletion_pending"
- Preserve the user's data, including articles, comments, and attachments, for 30 days
- Send a confirmation email with a retraction link
- If the user does not cancel deletion within 30 days, THE system SHALL:
  - Permanently delete all articles written by the user
  - Permanently delete all comments written by the user
  - Permanently delete all file attachments associated with their content
  - Remove the user account record from the database

### Session Management

WHEN a user navigates to any protected resource while logged in, THE system SHALL:
- Validate the "auth_token" cookie exists and is signed with the system secret key
- Verify the JWT token has not expired (7-day expiration)
- Verify the user account status is active and not banned
- Validate the user's IP address matches the stored session IP (or is within same regional network)
- If any validation fails, invalidate the token and redirect to login page

WHEN a user logs out, THE system SHALL:
- Clear the "auth_token" cookie
- Invalidate the JWT token server-side
- Remove the session record from the active sessions table

WHEN an authentication token expires or is invalidated, THE system SHALL:
- Redirect the user to the login page
- Display "Session expired. Please log in again." message

## Functional Requirements

### User Account Management

**User Registration (Citizen)**

WHEN a visitor visits the /register endpoint, THE system SHALL display a registration form requiring:
- Email address (in standard format: user@domain.com)
- Password (minimum 12 characters, must contain uppercase, lowercase, number, special character)

WHEN a visitor submits the registration form, THE system SHALL:
- Reject the request if email is already registered
- Reject the request if password fails complexity validation
- Create a new account with status "unverified", a generated UUID, and default "Citizen" role
- Generate a unique 64-character verification token
- Store the token and expiration (24 hours from creation) in the verification_tokens table
- Send an email with verification link containing: https://economicboard.com/verify?token={token}
- Return success message with "Check your email to verify your account"

**User Login**

WHEN a user submits credentials via /login endpoint, THE system SHALL:
- Look up the user by email
- Check if user account status is "banned" → reject with message "Your account has been banned"
- Check if user account status is "unverified" → reject with message "Please verify your email address first"
- Validate the password against the stored bcrypt hash
- If valid, generate a JWT token with claims: sub (user UUID), role (Citizen/Admin), exp (7 days from issue)
- Set HTTP-only, secure, same-site=strict cookie "auth_token" to the JWT
- Store the token's creation time and originating IP address in active_sessions table
- Redirect user to /dashboard

WHEN login fails, THE system SHALL:
- Increment the failed_login_attempts counter
- If failed_login_attempts ≥ 5 within last 10 minutes → temporarily lock account (status "locked") for 30 minutes
- Return generic "Invalid email or password" error to prevent credential enumeration

**Password Change**

WHEN a user navigates to /profile/password, THE system SHALL:
- Require authentication (valid JWT token)
- Require current password as input
- Require new password with same complexity rules (min 12 chars, alphanumeric+symbols)
- Require password to be different from last 5 previously used passwords

WHEN the form is submitted, THE system SHALL:
- Verify current password matches stored hash
- Generate new bcrypt hash of new password
- Store new hash in users table
- Add old hash to password_history table (limit 5 entries per user)
- Mark all existing JWT tokens for this user as invalidated
- Send confirmation email: "Your password has been successfully changed."

**Account Deletion**

WHEN a user requests account deletion at /profile/delete, THE system SHALL:
- Validate user is authenticated and owns the account
- Ask for password confirmation
- Verify password against stored hash
- If valid, set status to "deletion_pending" and set deletion_date to 30 days from today
- Send confirmation email: "Your account will be permanently deleted in 30 days. If you didn't request this, click the link to cancel: [cancel link]"

WHEN 30 days elapse without cancellation, THE system SHALL:
- Delete all articles where author_id = user_id
- Delete all comments where author_id = user_id
- Delete all file attachments where user_id = user_id
- Delete all rows in verification_tokens, active_sessions, password_history for this user
- Delete the user record from users table
- Log the deletion event in audit_log

### User Profile Management

**Profile Display**

WHEN any user visits /profile/{userId}, THE system SHALL:
- Retrieve user record with display_name and bio
- Count total articles authored by user (WHERE author_id = userId AND status = 'published')
- Count total comments authored by user (WHERE author_id = userId AND status = 'active')
- Retrieve list of articles authored by user, showing only title, section, posted_at (ordered by posted_at DESC)
- Retrieve list of comments authored by user, showing article title, content, posted_at (ordered by posted_at DESC)
- Render page displaying: display_name, bio, article count, comment count, article list, comment list

**Profile Edit**

WHEN a user accesses /profile/edit, THE system SHALL:
- Validate user is authenticated and requesting own profile
- Display form with current display_name and bio
- Allow display_name to be changed to any non-empty string, max 50 characters
- Allow bio to be modified up to 500 characters

WHEN form is submitted, THE system SHALL:
- Validate display_name is not empty
- Validate display_name contains no HTML characters
- Validate bio ≤ 500 characters
- Sanitize HTML from bio using whitelist of safe tags (b, i, u, br, p)
- Update users table with new display_name and bio
- Return success message and redirect to profile page

**Profile Viewing**

WHEN any user views another user's profile, THE system SHALL:
- Display display_name and bio
- Display article count and comment count
- Display list of articles authored (only titles, no content, sorted by creation date DESC)
- Display list of comments authored (article titles, comment content, posted datetime, sorted by creation date DESC)
- Hide email address and other private data
- Do not show "edit profile" button if viewer is not owner

### Section Management

**Section Display**

WHEN a user visits /sections, THE system SHALL:
- Retrieve all sections where status = 'active'
- Sort sections alphabetically by name
- Display each section as a card with: name, description, count of articles in section
- List sections in grid layout with pagination (10 sections per page)

**Section Creation**

WHEN a Super Administrator or Administrator submits a request to create a section via POST /sections, THE system SHALL:
- Validate requestor has "Administrator" or "Super Administrator" role
- Verify section name does not already exist (case-insensitive)
- Verify section name is not empty and ≤ 50 characters
- Verify description is ≤ 1000 characters
- Create new section record with:
  - name (normalized to title case)
  - description
  - created_by (admin UUID)
  - created_at (timestamp)
  - status = 'active'
- Return 201 Created with section details

**Section Edit**

WHEN a Super Administrator or Administrator submits a request to edit a section via PUT /sections/{sectionId}, THE system SHALL:
- Validate user is Administrator or Super Administrator
- Validate section exists and status is active
- Verify new name does not conflict with existing sections
- Update section record with new name and description if provided
- Return updated section data

**Section Deletion**

WHEN a Super Administrator or Administrator submits a request to delete a section via DELETE /sections/{sectionId}, THE system SHALL:
- Validate user is Administrator or Super Administrator
- Verify section exists and status is active
- If section has any articles, THE system SHALL:
  - Reassign all articles from this section to "Uncategorized" section (CREATE IF NOT EXISTS)
  - Log reassignment event
- Mark section as status = 'deleted'
- Return success response
- The section name and description remain in audit trail but are no longer accessible to users

**Section Browser**

WHEN a user visits /sections/{sectionId}, THE system SHALL:
- Retrieve section record by ID
- Verify section status is 'active'
- Retrieve all articles in this section where status = 'published'
- Sort articles by posted_at DESC (newest first)
- Paginate results (15 articles per page)
- Return section name as header and article list

### Article Management

**Article Creation**

WHEN a Citizen, Administrator, or Super Administrator accesses /articles/create, THE system SHALL:
- Validate user is logged in
- Display form with:
  - Title (text input, max 200 characters, required)
  - Content (rich text input, max 10,000 characters, required)
  - Section (dropdown list of active sections, required)
  - Tags (text input with comma-separated values, max 10 tags)
  - File Upload (optional, multiple files allowed)
  - Image Upload (optional, multiple images allowed)

WHEN user submits the form, THE system SHALL:
- Validate title is not empty and ≤ 200 characters
- Validate content is not empty and ≤ 10,000 characters
- Validate section exists and is active
- Validate tags: ≤10 tags, each ≤50 characters, no special characters except spaces and hyphens
- For uploaded files:
  - Check file type against allowed list (pdf, doc, docx, xls, xlsx, txt)
  - Check file size ≤ 20MB each
  - Generate unique filename: {uuid}-{originalname}
  - Store file in object storage (e.g., AWS S3)
- For uploaded images:
  - Validate type: jpeg, jpg, png, gif
  - Validate size ≤ 10MB each
  - Resize image to 1200px max width
  - Optimize and compress to ≤ 1MB
  - Generate unique filename: {uuid}-{originalname}
  - Store in object storage
- Create article record with:
  - title
  - content
  - section_id
  - author_id
  - status = 'published'
  - created_at timestamp
  - tags = array of approved tags (trim, lowercase, deduplicate)
- Create file attachment records for each uploaded file
- Create image attachment records for each uploaded image
- Return article details with redirect to /articles/{articleId}

**Article Editing**

WHEN a user accesses /articles/{articleId}/edit, THE system SHALL:
- Load article by ID
- Validate user is author of article (author_id == current_user_id)
- Ensure article status is 'published'
- Ensure article is not older than 7 days (editing window closed after 7 days)
- Display form with:
  - Title (pre-filled)
  - Content (pre-filled)
  - Section (pre-selected)
  - Tags (pre-filled)
  - File uploads: show current attachments with removal checkboxes
  - Image uploads: show current attachments with removal checkboxes

WHEN user submits edit form, THE system SHALL:
- Validate title and content (same rules as creation)
- Validate section is active
- Validate tags (same rules)
- Process new file uploads (same rules as creation)
- Process new image uploads (same rules)
- Remove files selected for deletion (move to recycle bin for 7 days)
- Update article record with:
  - title (new)
  - content (new)
  - tags (updated array)
  - updated_at timestamp
- Associate new files/images with article
- Save all changes
- Return redirect to /articles/{articleId}

**Article Deletion**

WHEN a user attempts to delete their own article via DELETE /articles/{articleId}, THE system SHALL:
- Validate user is the author of the article
- Validate article status is 'published'
- Validate article is not older than 7 days
- If validation passes:
  - Set article status to 'deleted'
  - Set deleted_at timestamp
  - Do NOT delete files/images yet
  - Log deletion in audit trail
  - Return success response

WHEN an Administrator or Super Administrator deletes any article via DELETE /articles/{articleId}, THE system SHALL:
- Validate user has Administrator role
- Set article status to 'deleted_deleted'
- Set deleted_at timestamp
- Set deleted_by = admin UUID
- Set deletion_reason = optional provided reason
- Do NOT delete files/images yet
- Log deletion in audit trail
- Return success response

**File Separation Policy**:
- Files attached to a "deleted" article remain in storage for 30 days
- After 30 days, orphaned files are purged by batch job
- If article is restored before deletion, file attachments are reactivated

### Article List

**Article List Display**

WHEN a user visits /sections/{sectionId}, THE system SHALL:
- Retrieve section and confirm status = active
- Query articles in section with status = 'published'
- Sort articles by posted_at DESC (newest first)
- Apply pagination: 15 articles per page
- For each article, return:
  - title
  - author display_name
  - array of tags
  - count of comments (WHERE article_id = id AND status = 'active')
  - posted_at timestamp
- Do NOT include content, files, or image URLs

**Article Sort Options**

WHEN a user selects "Oldest first" sort option, THE system SHALL:
- Change sorting to posted_at ASC (ascending)
- Requery and return articles with same pagination
- Highlight selected sort option in UI

WHEN user clears sort option, THE system SHALL:
- Default to posted_at DESC (newest first)

**Article Search (by title/content)**

WHEN user submits a search query at /search?q={term}, THE system SHALL:
- Accept query string (min 3 characters)
- Search article titles using case-insensitive LIKE '%{term}%' and full-text search on content
- Return only articles with status = 'published'
- Sort results by relevance score (title match > content match)
- Apply pagination (15 per page)
- Each returned item contains: title, author, tags, comment count, posted_at
- Do NOT include full content
- Highlight matching terms in returned title using <mark> tag

### Article Viewing

**Article Page Display**

WHEN user visits /articles/{articleId}, THE system SHALL:
- Retrieve article by ID
- Verify status = 'published'
- Retrieve article author profile (display_name)
- Retrieve all article tags
- Retrieve all file attachments (filename, size, uploaded_at)
- Retrieve all image attachments (url, width, height, uploaded_at)
- Retrieve all associated comments ordered by posted_at ASC
- Render page with:
  - Article title
  - Author name and profile link
  - Section name and link
  - Full article content
  - List of tags as clickable links
  - List of attached files with download buttons
  - List of attached images as thumbnails
  - Time posted (localized to user's timezone from cookies)
  - Comment section

**File Downloads**

WHEN a user clicks a file download link, THE system SHALL:
- Verify user is logged in (optional for public files)
- Validate file is attached to article with status = 'published'
- Validate file has not been purged
- Return file with Content-Type = detected MIME type
- Set Content-Disposition: attachment; filename="{originalname}"
- Log download event with user ID, filename, timestamp

**Image View**

WHEN a user clicks on an image thumbnail, THE system SHALL:
- Open modal with full-size image (max width 100vw)
- Display image with download button
- Show original filename, size, and upload date

### Comment Management

**Comment Posting**

WHEN user submits a comment via POST /articles/{articleId}/comments, THE system SHALL:
- Validate user is logged in
- Validate article exists and status = 'published'
- Validate comment content is not empty
- Validate comment content ≤ 2,500 characters
- Validate user has not submitted 3+ comments in last 5 minutes (rate limit)
- Create comment record with:
  - article_id
  - author_id
  - content
  - status = 'active'
  - posted_at timestamp
- Increment article comment_count field by 1
- Return new comment data with ID, author, content, posted_at

**Comment Viewing**

WHEN user visits article page, THE system SHALL:
- Retrieve all comments for article_id WHERE status = 'active'
- Sort comments by posted_at ASC (oldest first)
- For each comment, show:
  - Author's display_name
  - Comment content
  - Posted datetime (localized)
- Do NOT show comment ID or internal metadata

**Comment Editing**

WHEN user attempts to edit own comment via PUT /comments/{commentId}, THE system SHALL:
- Validate user is comment author
- Validate comment status = 'active'
- Validate comment is not older than 15 minutes
- Validate new content ≤ 2,500 characters
- Update comment record with new content and set updated_at timestamp
- Return updated comment

**Comment Deletion**

WHEN a user attempts to delete their own comment via DELETE /comments/{commentId}, THE system SHALL:
- Validate user is comment author
- Validate comment status = 'active'
- Validate comment is not older than 7 days
- Set comment status to 'deleted'
- Decrement associated article's comment_count by 1
- Log event

WHEN an Administrator or Super Administrator deletes any comment via DELETE /admin/comments/{commentId}, THE system SHALL:
- Validate user has role ≥ Administrator
- Set comment status to 'deleted_by_admin'
- Set deleted_by = admin UUID
- Set deletion_reason (optional)
- Decrement comment_count
- Log event

### Search and Filtering

**Tag Filtering**

WHEN a user selects tags in /search or /sections/{sectionId} page, THE system SHALL:
- Accept list of tag terms (comma-separated or array)
- Match articles with tags field EXACTLY containing ALL specified tags (AND operation)
- Return only published articles
- Sort by posted_at DESC
- Apply pagination (15 per page)

WHEN user unselects a tag, THE system SHALL:
- Remove that tag from filter
- Re-execute search with remaining tags

WHEN no tags are selected, THE system SHALL:
- Return all articles in section without filter, sorted by posted_at DESC

**Search Summary**

WHEN search query is executed, THE system SHALL:
- Display total number of results found
- Highlight search terms in article titles
- Show "Showing 1-15 of X results" message
- Provide "More Results" button if more than 15 exist

### File and Media Management

**File Attachment Rules**

WHEN a user uploads a file to an article, THE system SHALL:
- Accept files with MIME types: application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/vnd.ms-excel, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/plain
- Reject all other file types
- Validate file size ≤ 20MB per file
- Apply virus scanning via ClamAV or equivalent
- Generate unique filename: {random_uuid}_{originalfilename}
- Store in object storage with path: /articles/{articleId}/files/{filename}
- Record metadata: user_id, article_id, original_name, size, mime_type, uploaded_at
- Return success with file object

**Image Attachment Rules**

WHEN a user uploads an image to an article, THE system SHALL:
- Accept images with MIME types: image/jpeg, image/jpg, image/png, image/gif
- Reject all other types
- Validate file size ≤ 10MB per image
- Verify image is not corrupt (attempt to decode)
- Resize to maximum width of 1200px (maintain aspect ratio)
- Compress losslessly (PNG) or to 80% quality (JPEG)
- Ensure final size ≤ 1MB
- Generate unique filename: {random_uuid}_{originalfilename}
- Store in object storage with path: /articles/{articleId}/images/{filename}
- Record metadata: user_id, article_id, original_name, width, height, size, mime_type, uploaded_at
- Return success with image object including thumbnail URLs

**Download Permissions**

WHEN a file or image download is requested, THE system SHALL:
- Verify the asset is attached to an article with status = 'published'
- Verify the asset has not been purged or deleted from storage
- Return content with appropriate headers (Content-Type, Content-Disposition)
- Log every download with timestamp, user (if logged in), filename
- Implement rate limiting: max 100 file downloads per 5 minutes per IP

**Storage Limits**

WHEN a user attempts to upload files/images to an article, THE system SHALL:
- Check total attached files ≤ 10
- Check total attached images ≤ 10
- Limit total file size per article ≤ 100MB
- Reject upload if limits exceeded

### Administration System

**Administrator Request Submission**

WHEN a Citizen submits an administrator request via POST /admin/request, THE system SHALL:
- Validate user is a Citizen
- Validate user has published at least 5 articles with total 50+ comments
- Validate user has no active bans or suspensions
- Validate reason text is between 50-1000 characters
- Create an admin_request record:
  - user_id
  - reason
  - status = 'pending'
  - submitted_at
- Send email to Super Administrators: "New admin request from {username}"
- Return success message

**Admin Request Review**

WHEN a Super Administrator accesses /admin/pending-requests, THE system SHALL:
- Retrieve all admin_requests with status = 'pending'
- Display: requester display_name, submission date, reason (shortened), actions (Approve/Reject)
- Quantity limited to 25 per page

WHEN a Super Administrator clicks "Approve", THE system SHALL:
- Set request status = 'approved'
- Update user role to 'Administrator'
- Send confirmation email: "You have been promoted to Administrator"
- Log event

WHEN a Super Administrator clicks "Reject", THE system SHALL:
- Set request status = 'rejected'
- Send rejection email: "Your administrator request was declined." (with optional reason)
- Log event

**Administrator Grade Hierarchy**

**Promotion from Administrator to Super Administrator**

WHEN a Super Administrator promotes an Administrator via PUT /admin/{userId}/promote, THE system SHALL:
- Validate caller role is Super Administrator
- Validate target user role is Administrator
- Validate target user has posted at least 20 articles in last 180 days
- Validate target user has never been banned
- Update user role to 'Super Administrator'
- Log promotion event in audit_log
- Send notification email: "You have been promoted to Super Administrator"

**Demotion from Super Administrator to Administrator**

WHEN a Super Administrator demotes another Super Administrator, THE system SHALL:
- Validate caller role is Super Administrator
- Validate target user role is Super Administrator
- Validate target user_id != caller user_id (self-demotion prohibited)
- Update target user role to 'Administrator'
- Log demotion event in audit_log
- Send email notification to user and other Super Administrators

**Super Administrator Self-Demotion Restriction**

WHEN a Super Administrator attempts to demote themselves, THE system SHALL:
- Reject the request with error: "Super Administrators cannot demote themselves. Contact system support."
- Log attempted self-demotion
- If system has only one Super Administrator, show warning: "This system has only one Super Administrator. Demoting yourself will require manual system recovery."

**Administrator Capabilities Matrix**

| Feature                     | Citizen | Administrator | Super Administrator |
|-----------------------------|---------|----------------|----------------------|
| Read Articles               | ✅      | ✅             | ✅                   |
| Write Articles              | ✅      | ✅             | ✅                   |
| Comment on Articles         | ✅      | ✅             | ✅                   |
| Edit Own Articles           | ✅      | ✅             | ✅                   |
| Manage Sections             | ❌      | ✅             | ✅                   |
| Delete Any Article          | ❌      | ✅             | ✅                   |
| Delete Any Comment          | ❌      | ✅             | ✅                   |
| Ban Users                   | ❌      | ✅             | ✅                   |
| Unban Users                 | ❌      | ✅             | ✅                   |
| View Banned Users List      | ❌      | ✅             | ✅                   |
| Promote Admins              | ❌      | ❌             | ✅                   |
| Demote Super Admins         | ❌      | ❌             | ✅                   |
| View Pending Admin Requests | ❌      | ❌             | ✅                   |

### Banning

**User Banning**

WHEN an Administrator or Super Administrator initiates a ban via POST /admin/users/{userId}/ban, THE system SHALL:
- Validate user has Administrator permission
- Validate target user is not already banned
- Require reason text (10-500 characters)
- Set user status = 'banned'
- Set ban_reason = provided reason
- Set banned_at timestamp
- Set banned_by = admin UUID
- Clear all active JWT tokens for this user
- Optionally: send ban notification email
- Log event in audit_log: "User {username} banned by {admin} for {reason}"

**User Unbanning**

WHEN an Administrator or Super Administrator unbans a user via POST /admin/users/{userId}/unban, THE system SHALL:
- Validate user has Administrator permission
- Validate target user status = 'banned'
- Set user status = 'active'
- Clear ban_reason and banned_at
- While preserving user's articles, comments, and files
- Send notification email: "Your account has been unbanned. Welcome back."
- Log event in audit_log: "User {username} unbanned by {admin}"

**Banned User Visibility**

WHEN a user is banned, THE system SHALL:
- Prevent login via any method (email/password, JWT, social authentication)
- Block access to all authenticated endpoints
- Prevent creation of new sessions
- Preserve all articles, comments, file attachments, and profile data
- Do not delete content or data
- Show "Banned User" in place of display_name on all public content
- Display ban reason to Administrator/Super Administrator users when viewing those articles or comments

**Ban Reason Management**

WHEN any Administrator or Super Administrator views any article or comment authored by a banned user, THE system SHALL:
- Display a "User was banned" badge
- Display the reason for ban in hover tooltip (e.g., "Violated community guidelines: spam"
- Provide link to full ban log if permission level allows

WHEN a user is banned multiple times, THE system SHALL:
- Maintain only the most recent ban reason
- Retain previous ban records in audit_log
- Increase temporary ban duration on repeat offenses (first ban: 7 days, second: 30 days, third: permanent)

## System Behavior

### User Registration & Login Flow

```mermaid
graph TD
    A[Visitor visits /register] --> B[User provides email & password]
    B --> C{Server validates}
    C -- Invalid format/email taken/weak password --> D[Return error]
    C -- Valid --> E[Create unverified user account]
    E --> F[Generate 64-char token]
    F --> G[Store in verification_tokens table]
    G --> H[Send verification email]
    H --> I[User clicks link]
    I --> J{Verify token}
    J -- Expired/Invalid --> K[Show link expired]
    J -- Valid --> L[Set user.status = verified]
    L --> M[Redirect to /login]
    
    N[Visitor visits /login] --> O[User provides email & password]
    O --> P{Server validates}
    P -- User banned --> Q[Reject: "Account banned"]
    P -- User unverified --> R[Reject: "Verify email first"]
    P -- Password invalid --> S[Increment failed attempts]
    P -- Password valid --> T[Generate JWT (7-day expiry)]
    T --> U[Set secure cookies: auth_token=JWT]
    U --> V[Redirect to /dashboard]
    
    X[Request with invalid token] --> Y[Validate token signature]
    Y -- Invalid/expired --> Z[Delete cookie, redirect to /login]
    Y -- Valid --> AA[Grant access]
```

### Article Creation Workflow

```mermaid
graph TD
    A[User accesses /articles/create] --> B[User fills form: title, content, section, tags]
    B --> C[Uploads files/images (optional)]
    C --> D[Submit form]
    D --> E{Validate inputs}
    E -- Title empty/Too long --> F[Return error]
    E -- Content empty/Too long --> F
    E -- Section inactive --> F
    E -- Tags over 10/invalid chars --> F
    E -- File size >20MB --> G[Reject file]
    E -- Image >10MB --> H[Reject image]
    E -- File type invalid --> I[Reject file]
    E -- Image type invalid --> J[Reject image]
    E -- Files >10 total --> K[Reject upload]
    E -- Images >10 total --> K
    E -- Total attachments >100MB --> K
    E -- All valid --> L[Save article record]
    L --> M[Save file metadata]
    L --> N[Save image metadata]
    L --> O[Store files/images in object storage]
    O --> P[Generate unique filename]
    P --> Q[Store in S3: /articles/{articleId}/files/{filename}]
    P --> R[Store in S3: /articles/{articleId}/images/{filename}]
    Q --> S[Return success, redirect to article]
    R --> S
```

### Admin Promotion Flow

```mermaid
graph TD
    A[Super Admin accesses /admin/pending] --> B[Clicks "Approve" on request]
    B --> C[Set request.status=approved]
    C --> D[Update user.role=Administrator]
    D --> E[Send promotion email]
    E --> F[Log event]
    
    G[Super Admin accesses /admin/users] --> H[Selects "Promote" on Administrator]
    H --> I{Is target a Super Admin?}
    I -- Yes --> J[Reject: "Cannot promote Super Admin"]
    I -- No --> K[Check: 20+ articles in last 180 days?]
    K -- No --> L[Reject: "Insufficient contribution"]
    K -- Yes --> M[Check: Never banned?]
    M -- No --> N[Reject: "Has history of violations"]
    M -- Yes --> O[Update user.role=Super Administrator]
    O --> P[Send notification]
    P --> Q[Log promotion]
    
    R[Super Admin selects "Demote" on Super Admin] --> S{Is it self-demotion?}
    S -- Yes --> T[Reject: "Cannot demote self. Contact support."]
    S -- No --> U[Update target.role=Administrator]
    U --> V[Send email to user and all Super Admins]
    V --> W[Log demotion]
```

## Performance and Security

### Response Time Expectations

- Article listing (15 items): ≤ 300ms
- Search with 100+ results: ≤ 500ms
- File download: ≤ 2 seconds (for 20MB file)
- Comment posting: ≤ 200ms
- Authentication (login): ≤ 250ms
- Page load (article view): ≤ 800ms

All times measured from server response start to client render complete, including network latency.

### Scalability Requirements

- Support 10,000 concurrent authenticated users
- Handle 1,000 article creations per hour
- Process 200 comments per minute
- Serve 10,000+ article views per hour
- Store 100GB of media files (images and files)
- Support 1,000+ active sections

System assumes horizontal scaling of application and database layers.

### Data Privacy

- All personally identifiable information (email, IP, UUID) is stored encrypted at rest
- Email addresses are never displayed publicly
- User profiles show only display_name and bio
- Articles/comments are publicly accessible
- User activity logs are retained for 90 days unless required by law
- No profiling of users for personalization or recommendation

### Access Control Enforcement

- All reads/writes must validate user authentication
- Role-based access control (RBAC) enforced on every endpoint
- Super Administrators are not exempt from model-level validations (e.g., cannot delete themselves)
- Privilege escalation only occurs through approved processes
- No hardcoded permissions in code — all enforced via database role field

### Session Security

- JWT tokens expire after 7 days
- Cookies set as HTTP-only, Secure, SameSite=Strict
- Token signature verified using HMAC-SHA256 with 512-bit secret (rotated quarterly)
- Session IP address stored and validated on each request
- Token invalidation triggered on password change, account deletion, ban

### Input Validation

- All user inputs sanitized using whitelist filters
- HTML in bio and comments sanitized with custom sanitizer (allow: b, i, u, br, p)
- File extensions checked via MIME type, NOT filename
- File content scanned for malware
- SQL injection prevented via ORM (Prisma)
- XSS prevented via HTML escaping and sanitization
- Rate limiting applied to all write operations: 5 requests per 5 seconds

## Error Handling & Recovery

### Authentication Errors

WHEN authentication fails due to invalid JWT token, THE system SHALL:
- Return 401 Unauthorized
- Do NOT reveal whether token was expired, invalid, or revoked
- Clear invalid cookie
- Redirect to login page

WHEN user tries login after account deletion, THE system SHALL:
- Return 404 "User not found"
- Do not confirm if deletion was requested or account never existed

### Content Validation Errors

WHEN article creation fails due to validation error, THE system SHALL:
- Return 422 Unprocessable Entity
- Include detailed error object:
  {"field": "title", "message": "Title must be between 1 and 200 characters"}
- Do not respond with "Invalid form data"
- Preserve uploaded files temporarily (store in temp bucket)
- Allow user to retry after corrections

WHEN comment content exceeds limit, THE system SHALL:
- Return 422 with: {"field": "content", "message": "Comments cannot exceed 2500 characters"}
- Truncate in UI during editing (optional)

### Permission Denied Errors

WHEN a user tries to access restricted action, THE system SHALL:
- Return 403 Forbidden
- Log event: "User {id} attempted to delete article they don't own"
- Do NOT reveal which actions exist or are restricted
- Never display "Access denied. You need admin permissions."

### Search Failures

WHEN Elasticsearch or full-text search engine fails, THE system SHALL:
- Return 503 Service Unavailable
- Fallback to basic SQL LIKE queries
- Log error with details
- Display message: "Search temporarily unavailable. Try again later."

### File Upload Failures

WHEN file storage fails (disk full, network error), THE system SHALL:
- Return 500 Internal Server Error
- Rollback article creation
- Return error: "Unable to upload attachment. Please try again." 
- Do not expose cloud provider details
- Retain uploaded files in retry queue for 5 minutes

### Ban/Unban Error Handling

WHEN an Administrator attempts to ban a Super Administrator, THE system SHALL:
- Return 403 Forbidden: "Cannot ban Super Administrator"
- Log attempted permission violation

WHEN user attempts to ban themselves, THE system SHALL:
- Return 400 Bad Request: "You cannot ban your own account."

WHEN an invalid user ID is provided for ban/unban, THE system SHALL:
- Return 404 Not Found
- Do not reveal if account exists or is suspended

## Future Considerations

### Mobile App Integration

WHEN the user base grows beyond 10,000 active users, THE system SHALL launch native iOS and Android applications to improve user engagement and accessibility.

WHEN users access the platform from mobile devices, THE system SHALL provide a responsive web experience as a fallback until native apps are released.

WHEN a user installs the mobile application, THE system SHALL synchronize their account data, article preferences, and comment history seamlessly between web and mobile platforms.

WHEN a user posts an article or comment on mobile, THE system SHALL send a push notification to the user's device to confirm successful submission.

WHEN a new article is posted in a section a user follows, THE system SHALL deliver a push notification within 60 seconds if the user has enabled mobile notifications.

WHERE the user has push notifications enabled, THE system SHALL send an alert on topics with more than 50% engagement increase compared to the last 24 hours.

### Notification System

WHEN a user receives a reply to their comment, THE system SHALL generate a notification and display it in the user's notification center.

WHEN a user they follow posts a new article, THE system SHALL send a personalized notification to followers.

WHEN an article a user has commented on receives 10 new comments, THE system SHALL notify the user of the activity.

WHEN an article a user has bookmarked is edited by its author, THE system SHALL notify the user of the update.

WHERE a user has enabled email notifications, THE system SHALL send a daily digest summarizing activity in followed sections and on their articles.

WHEN a user is mentioned in a comment using "@username" syntax, THE system SHALL send an instant notification.

### Analytics Dashboard

THE system SHALL collect and store daily metrics for all registered users.

WHEN a super administrator accesses the analytics dashboard, THE system SHALL display total active users (DAU, WAU, MAU) over the past 30 days.

WHEN a super administrator views the activity graph, THE system SHALL show article posts, comments, and logins per day with trend lines.

WHEN a user has posted more than 10 articles, THE system SHALL record their publication frequency and categorize them as "super contributor".

WHEN a user has commented on articles from 5+ different sections, THE system SHALL identify them as "cross-topic participant".

WHEN a user has received replies to their comments on 15+ articles, THE system SHALL count them as "engaged participant".

### Moderation AI Tools

WHEN a new article is posted with keywords from dialectic extremism list, THE system SHALL flag it for human review and temporarily hide it from public view.

WHEN a comment contains profanity or hate speech patterns, THE system SHALL automatically mask offensive words with asterisks and notify administrators.

WHEN a comment is posted within 1 minute of a previous comment from the same user, THE system SHALL trigger a potential spam detection protocol.

WHEN a user has been flagged for violations and subsequently comments on two separate articles within 15 minutes, THE system SHALL escalate their status to "probation".

WHILE a user is flagged for moderation, THE system SHALL display a "review pending" indicator on their articles and comments.

### Multi-language Support

WHEN a user creates an article in English, THE system SHALL offer automatic translation to 3 default languages: Spanish, French, and German.

WHEN a user clicks "Translate" on any article, THE system SHALL generate a side-by-side view with user's preferred language.

WHEN a user selects "See Original" on a translated article, THE system SHALL revert to the post's original language.

WHEN an article receives comment replies in multiple languages, THE system SHALL auto-group translations under original content.

WHILE a user is viewing a translated article, THE system SHALL filter translation quality to 80%+ confidence before displaying.

### Community Reputation System

THE system SHALL calculate a reputation score for each user based on contributions and community feedback.

WHEN a user's article receives a comment from another user, THE system SHALL award +5 reputation points.

WHEN a user's comment receives 3 upvotes from different users, THE system SHALL grant +10 reputation points.

WHEN a user is reported for violating rules and the report is confirmed, THE system SHALL deduct -25 reputation points.

WHEN a user has consistently posted high-quality articles over 30 days, THE system SHALL increase their reputation by +100.

WHEN a user is banned, THE system SHALL permanently freeze their reputation score.

By implementing these future considerations, the economicBoard platform will evolve from a basic discussion forum into a sophisticated, globally engaged community. Each enhancement is designed to increase participation, maintain content quality, foster trust, and preserve the integrity of economic and political discourse while supporting scalable growth.