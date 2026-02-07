# Economic/Political Discussion Board

## User Account Management

### Registration
WHEN a new user wishes to participate in the discussion board, THE system SHALL allow them to create an account by providing a valid email address and a password that meets the minimum complexity requirements.

WHEN a user submits a registration request, THE system SHALL:

- Validate the email address using RFC 5322 format standards
- Check that the email address is not already associated with an existing account
- Validate that the password meets minimum security requirements (at least 12 characters)
- Generate a unique, random user identifier
- Store the user's identity information
- Set the initial account status to "pending verification"
- Send a verification email to the provided address containing a secure, time-limited token
- Log the registration attempt with timestamp and IP address

IF the email address is already registered, THE system SHALL respond with error code "EMAIL_EXISTS" and display the message: "An account with this email address already exists. If this is your account, please use the password reset function."

IF the email address format is invalid, THE system SHALL respond with error code "INVALID_EMAIL" and display the message: "Please enter a valid email address."

IF the password is less than 12 characters, THE system SHALL respond with error code "PASSWORD_TOO_SHORT" and display the message: "Password must be at least 12 characters long and include uppercase, lowercase, number, and special character."

WHEN the verification email is sent, THE system SHALL ensure:
- The email contains a cryptographically secure, one-time-use token
- The token cannot be used after 24 hours
- The email does not contain the user's password or plaintext sensitive information
- The email uses proper HTML and text formats to ensure readability

### Login
WHEN a user attempts to log in to the platform, THE system SHALL:

- Accept the user's email address and password
- Locate the user account associated with the provided email
- Validate the password against the stored cryptographic hash
- Verify the user's account status is not "banned" or "deleted"
- Verify the user's account status is "verified"

IF the email or password is incorrect, THE system SHALL respond with error code "INVALID_CREDENTIALS" and display the message: "Invalid email or password."

IF the account is not verified, THE system SHALL respond with error code "EMAIL_NOT_VERIFIED" and display the message: "Please verify your email address before logging in."

IF the account is banned, THE system SHALL respond with error code "ACCOUNT_BANNED" and display the message: "Your account has been banned. If you believe this is an error, please contact an administrator."

WHEN login is successful, THE system SHALL:

- Generate a JSON Web Token (JWT) access token with expiration of 15 minutes
- Include the user ID, role ("citizen"), and permissions array in the token payload
- Generate a refresh token with 14-day expiration
- Store the refresh token in an HTTP-only, Secure, SameSite=Strict cookie
- Return the access token in the response body
- Log the successful login event with timestamp, IP address, and device information
- Set session tracking with client fingerprint for security monitoring

### Password Change
WHEN an authenticated user changes their password, THE system SHALL:

- Require the user to provide their current password for verification
- Require the new password to be at least 12 characters long
- Require the new password to contain at least one uppercase letter, one lowercase letter, one digit, and one special character
- Validate that the new password is different from the current password
- Validate that the new password is not among the 50 most commonly used passwords

IF the current password is incorrect, THE system SHALL respond with error code "INCORRECT_CURRENT_PASSWORD" and display the message: "Current password is incorrect."

IF the new password is less than 12 characters, THE system SHALL respond with error code "PASSWORD_TOO_SHORT" and display the message: "New password must be at least 12 characters long and include uppercase, lowercase, number, and special character."

IF the new password is the same as the current password, THE system SHALL respond with error code "PASSWORD_SAME_AS_CURRENT" and display the message: "New password must be different from your current password."

IF the new password is in the list of commonly used passwords, THE system SHALL respond with error code "PASSWORD_TOO_COMMON" and display the message: "This password is too common and insecure. Please choose a stronger password."

WHEN the password is successfully changed, THE system SHALL:

- Update the password hash in the database
- Immediately revoke all existing sessions for the user
- Invalidate all refresh tokens
- Send a confirmation email to the user with the change timestamp
- Log the password change event with timestamp, IP address, and user ID
- Require the user to log in again with the new password

### Account Deletion
WHEN a user requests to delete their account permanently, THE system SHALL:

- Require the user to authenticate and enter their password as confirmation
- Verify the user has no pending administrator requests
- Mark the account status as "deleted"
- Record the deletion timestamp and the deletion reason ("user-requested")
- Remove all personal identifying data from profiles and notifications
- Delete all articles written by the user
- Delete all comments written by the user
- Remove all personal data from audit logs except for immutable records
- Revoke all active login sessions
- Purge all associated refresh tokens

WHEN an account is deleted, THE system SHALL:

- Prevent any future login attempts with the associated email
- Replace the user's display name with "[Deleted User]" in all public content
- Update all articles previously authored by the user to show "[Deleted User]" as the author
- Update all comments previously written by the user to show "[Deleted User]" as the author
- Retain the user's deleted account record and deletion timestamp for audit purposes
- Log the deletion event with user ID, deletion timestamp, and IP address

## User Profile Management

### Profile Edit
WHEN a registered user edits their profile information, THE system SHALL allow updates to the display name and bio text.

WHEN a user submits profile edits, THE system SHALL:

- Validate that the display name is between 2 and 50 characters
- Validate that the display name contains only alphanumeric characters, underscores, and hyphens
- Verify that the display name is not already in use by another user
- Validate that the bio text is between 0 and 500 characters
- Validate that the bio text does not contain HTML markup or executable scripts
- Update the user's display name and bio in the database
- Record the timestamp of the last profile update

IF the display name is less than 2 characters, THE system SHALL respond with error code "DISPLAY_NAME_TOO_SHORT" and display the message: "Display name must be at least 2 characters long."

IF the display name exceeds 50 characters, THE system SHALL respond with error code "DISPLAY_NAME_TOO_LONG" and display the message: "Display name cannot exceed 50 characters."

IF the display name contains invalid characters, THE system SHALL respond with error code "DISPLAY_NAME_INVALID" and display the message: "Display name can only contain letters, numbers, underscores, and hyphens."

IF the display name is already taken, THE system SHALL respond with error code "DISPLAY_NAME_TAKEN" and display the message: "A user with this display name already exists. Please choose another."

IF the bio text exceeds 500 characters, THE system SHALL respond with error code "BIO_TOO_LONG" and display the message: "Bio cannot exceed 500 characters."

IF the bio text contains HTML tags, JavaScript, or other executable content, THE system SHALL respond with error code "BIO_INVALID_CONTENT" and display the message: "Bio text cannot contain HTML, JavaScript, or executable content."

### Profile View
WHEN a user views another user's public profile, THE system SHALL display:

- The target user's display name
- The target user's bio text (if provided)
- The total count of articles written by this user
- The total count of comments written by this user
- The date the user joined the platform

WHEN viewing a profile of a user who has deleted their account, THE system SHALL display:

- "[Deleted User]" in the display name field
- "This user has deleted their account." in the bio field
- "0" for both article count and comment count

WHEN viewing a profile of a user who has been banned, THE system SHALL display:

- "[Banned User]" in the display name field
- "This user has been banned from the platform." in the bio field
- "0" for both article count and comment count

THE system SHALL NOT display any private information, including:

- Email address
- Account creation date (except for "Joined [month] [year]")
- Last login timestamp
- IP address history
- Verification status
- Administrative privileges
- Ban history

WHEN a user views their own profile, THE system SHALL display all profile information and additional controls for editing.

## Section Management

### Section Creation
WHEN an administrator creates a new section, THE system SHALL:

- Require the section name to be between 2 and 50 characters
- Require the section description to be between 0 and 500 characters
- Validate that the section name is unique among all existing sections
- Generate a unique section identifier
- Set the creation timestamp
- Set the section status to "active"
- Log the creation event with the administrator's ID

IF the section name is less than 2 characters, THE system SHALL respond with error code "SECTION_NAME_TOO_SHORT" and display the message: "Section name must be at least 2 characters long."

IF the section name exceeds 50 characters, THE system SHALL respond with error code "SECTION_NAME_TOO_LONG" and display the message: "Section name cannot exceed 50 characters."

IF the section name already exists, THE system SHALL respond with error code "SECTION_EXISTS" and display the message: "A section with this name already exists."

IF the section description exceeds 500 characters, THE system SHALL respond with error code "SECTION_DESCRIPTION_TOO_LONG" and display the message: "Section description cannot exceed 500 characters."

IF the user attempting to create a section does not have administrator privileges, THE system SHALL respond with error code "PERMISSION_DENIED" and display the message: "Only administrators can create sections."

### Section Editing
WHEN an administrator edits an existing section, THE system SHALL allow updates to:

- The section name (2-50 characters)
- The section description (0-500 characters)

WHEN a section's name is modified, THE system SHALL:

- Validate that the new name is not identical to an existing section name
- Update the section's name in the database
- Update the association between articles and this section
- Log the change with the administrator's ID and timestamp

IF the new section name is already in use by another section, THE system SHALL respond with error code "SECTION_EXISTS" and display the message: "A section with this name already exists."

IF the section description exceeds 500 characters, THE system SHALL respond with error code "SECTION_DESCRIPTION_TOO_LONG" and display the message: "Section description cannot exceed 500 characters."

IF the user attempting to edit a section does not have administrator privileges, THE system SHALL respond with error code "PERMISSION_DENIED" and display the message: "Only administrators can edit sections."

### Section Deletion
WHEN an administrator deletes a section, THE system SHALL:

- Archive the section name as "[Deleted Section]" + original ID
- Archive the section description
- Set the section status to "deleted"
- Change the section reference of all articles in this section to "General" section
- Log the deletion event with the administrator's ID, timestamp, and number of affected articles

THE system SHALL NOT delete any articles or comments that belong to the deleted section.

WHEN a user attempts to view a deleted section, THE system SHALL respond with error code "SECTION_NOT_FOUND" and display the message: "This section has been deleted."

IF the user attempting to delete a section does not have administrator privileges, THE system SHALL respond with error code "PERMISSION_DENIED" and display the message: "Only administrators can delete sections."

### Section Listing
WHEN a user requests a list of all sections, THE system SHALL return:

- Section ID
- Section name
- Section description
- Number of active articles in the section
- Timestamp of section creation
- Section status (active or deleted)

THE list SHALL exclude any sections with "deleted" status.

## Article Management

### Article Creation
WHEN a user creates an article, THE system SHALL require:

- Title of 5-200 characters
- Body content of at least 10 characters
- Assignment to an active section

WHEN an article is created, THE system SHALL:

- Generate a unique article ID
- Generate a URL-friendly slug from the title
- Set the creation timestamp
- Set the last edited timestamp to match creation time
- Associate the article with the author's user ID
- Associate the article with the chosen section ID
- Set the initial view count to 0
- Set the initial comment count to 0
- Set the article status to "published"
- Store the article in the database
- Log the creation event with user ID, section ID, article ID, and timestamp

IF the article title is less than 5 characters, THE system SHALL respond with error code "ARTICLE_TITLE_TOO_SHORT" and display the message: "Article title must be at least 5 characters long."

IF the article title exceeds 200 characters, THE system SHALL respond with error code "ARTICLE_TITLE_TOO_LONG" and display the message: "Article title cannot exceed 200 characters."

IF the article content is less than 10 characters, THE system SHALL respond with error code "ARTICLE_CONTENT_TOO_SHORT" and display the message: "Article content must be at least 10 characters long."

IF the section id provided is invalid or not active, THE system SHALL respond with error code "INVALID_SECTION" and display the message: "Invalid or inactive section selected."

IF the user is banned, THE system SHALL respond with error code "ACCOUNT_BANNED" and display the message: "Banned users cannot create articles."

### Article Editing
WHEN an author edits their own article, THE system SHALL allow modifications to:

- Title (up to 200 characters)
- Content (up to 100,000 characters)
- Attached files
- Attached images
- Tags (up to 10 tags per article)

WHEN an article is edited, THE system SHALL:

- Update the last edited timestamp
- Retain the original creation timestamp
- Log the edit event with the editor's ID and timestamp
- Maintain article version history for 1 month

WHEN an author attempts to edit an article, THE system SHALL:

- Validate that the article belongs to the requesting user
- Validate that the edit attempt is within 72 hours of the article's creation

IF the user is not the author of the article, THE system SHALL respond with error code "PERMISSION_DENIED" and display the message: "You can only edit articles you have authored."

IF the edit request is made more than 72 hours after the article's creation, THE system SHALL respond with error code "EDIT_WINDOW_EXPIRED" and display the message: "You can only edit your articles within 72 hours of posting."

IF the article title exceeds 200 characters, THE system SHALL respond with error code "ARTICLE_TITLE_TOO_LONG" and display the message: "Article title cannot exceed 200 characters."

IF the article content exceeds 100,000 characters, THE system SHALL respond with error code "ARTICLE_CONTENT_TOO_LONG" and display the message: "Article content cannot exceed 100,000 characters."

IF the user attempts to add more than 10 tags, THE system SHALL respond with error code "TAGS_EXCESS_LIMIT" and display the message: "You can add up to 10 tags to an article."

### Article Deletion
WHEN a user deletes their own article, THE system SHALL:

- Mark the article as "deleted"
- Set the deletion timestamp
- Retain the article metadata for audit purposes
- Remove the article from public lists and searches
- Set the author field to "[Deleted User]"
- Log the deletion event with user ID and timestamp

WHEN an administrator deletes any article, THE system SHALL:

- Mark the article as "deleted by admin"
- Record the admin's ID and deletion reason
- Set the deletion timestamp
- Retain the article content, attachments, and comments for audit
- Remove the article from public lists and searches
- Notify the article author via email (if account is active)
- Log the deletion event with admin ID, user ID, article ID, reason, and timestamp

WHEN an article is deleted, THE system SHALL:

- Keep associated comments (but mark them as "orphaned")
- Keep associated file attachments (but mark them as orphaned)
- Prevent display of the article to any user who is not an administrator
- Maintain the article in a non-public archive accessible only to administrators

IF a user attempts to delete an article they do not own, THE system SHALL respond with error code "PERMISSION_DENIED" and display the message: "You can only delete your own articles."

### Article List
WHEN a user views the list of articles in a section, THE system SHALL display:

- Article title
- Author display name (linked to profile)
- Section name (linked to section)
- List of up to 5 tags
- Comment count
- Published timestamp
- "edited" indicator if article was modified after 30 minutes from creation
- "file" icon if attachments are present
- "image" icon if images are present

THE list SHALL be paginated with 20 articles per page.

WHEN a user navigates to page 101 or higher, THE system SHALL return the last page of results (page 100).

WHEN a user requests a page number less than 1, THE system SHALL return page 1.

### Article Sorting
WHEN a user requests article sorting, THE system SHALL support:

- "newest": Articles sorted by creation timestamp in descending order
- "oldest": Articles sorted by creation timestamp in ascending order

WHEN no sort order is specified, THE system SHALL default to "newest".

WHEN multiple articles have identical creation timestamps, THE system SHALL sort them by article ID in ascending order.

Article edits SHALL NOT affect the sorting order or displayed time.

### Article Viewing
WHEN a user views an individual article, THE system SHALL display:

- Article title
- Author display name (linked to profile)
- Section name (linked to section)
- Article content formatted with Markdown
- List of all attached files with their original names and sizes
- List of all attached images with thumbnails and download options
- List of all tags
- Article creation timestamp
- Article last edited timestamp
- View count
- Comment count

WHEN a file is attached, THE system SHALL provide a download link that:

- Verifies the article still exists and is not deleted
- Generates a time-limited, signed download link
- Logs the download event

WHEN an image is attached, THE system SHALL provide:

- A thumbnail preview in article view
- A lightbox view for full-size image
- A download link for the original file

WHEN the article is deleted, THE system SHALL respond with error code "ARTICLE_NOT_FOUND" and display the message: "This article has been deleted."

WHEN the author's account is deleted, THE system SHALL display "[Deleted User]" as the author.

WHEN the author's account is banned, THE system SHALL display "[Banned User]" as the author.

## Comment Management

### Comment Posting
WHEN a user posts a comment on an article, THE system SHALL require:

- At least 2 characters of content
- The article ID must correspond to an active article

WHEN a comment is posted, THE system SHALL:

- Generate a unique comment ID
- Set the creation timestamp
- Store the comment content
- Associate the comment with the author's user ID
- Associate the comment with the target article ID
- Increment the article's comment count
- Log the comment creation event with user ID, article ID, and timestamp

IF the comment content is less than 2 characters, THE system SHALL respond with error code "COMMENT_TOO_SHORT" and display the message: "Comments must be at least 2 characters long."

IF the comment content exceeds 1,000 characters, THE system SHALL respond with error code "COMMENT_TOO_LONG" and display the message: "Comments cannot exceed 1,000 characters."

IF the article ID is invalid or corresponds to a deleted article, THE system SHALL respond with error code "ARTICLE_NOT_FOUND" and display the message: "Cannot comment on deleted articles."

IF the user is banned, THE system SHALL respond with error code "ACCOUNT_BANNED" and display the message: "Banned users cannot post comments."

### Comment Viewing
WHEN a user views comments for an article, THE system SHALL:

- Return all comments associated with the article, sorted by creation timestamp ascending (oldest first)
- Paginate results with 30 comments per page
- Display for each comment:
  - Author display name
  - Comment content
  - Creation timestamp
  - Edited indicator if modified
  - "[Deleted Comment]" if the comment is deleted

WHEN a comment is deleted by its author, THE system SHALL display:

- "[Deleted Comment]" as the comment content
- The original creation timestamp
- The deletion timestamp
- The author display name

WHEN a comment is deleted by an administrator, THE system SHALL display:

- "[Deleted by admin]" as the comment content
- The original creation timestamp
- The deletion timestamp
- The administrator's display name
- The deletion reason (if provided)
- The author display name

### Comment Editing
WHEN a user edits their own comment, THE system SHALL allow changes to the comment content up to 15 minutes after creation.

WHEN a comment is edited, THE system SHALL:

- Update the comment content
- Record the edit timestamp
- Display an "edited" indicator
- Log the edit event with user ID, comment ID, and timestamp
- Maintain edit history for 24 hours

IF an edit request is made more than 15 minutes after the original posting, THE system SHALL respond with error code "EDIT_WINDOW_EXPIRED" and display the message: "You can only edit your comments within 15 minutes of posting."

IF the user is not the original author of the comment, THE system SHALL respond with error code "PERMISSION_DENIED" and display the message: "You can only edit your own comments."

IF the new comment content exceeds 1,000 characters, THE system SHALL respond with error code "COMMENT_TOO_LONG" and display the message: "Comments cannot exceed 1,000 characters."

IF the new comment content is less than 2 characters, THE system SHALL respond with error code "COMMENT_TOO_SHORT" and display the message: "Comments must be at least 2 characters long."

### Comment Deletion
WHEN a user deletes their own comment, THE system SHALL:

- Mark the comment as deleted
- Record the deletion timestamp
- Decrement the article's comment count
- Store the comment's original content for audit purposes
- Log the deletion event

WHEN an administrator deletes a comment, THE system SHALL:

- Mark the comment as deleted by admin
- Record the administrator's ID and deletion reason
- Decrement the article's comment count
- Store the comment's original content for audit purposes with admin ID and reason
- Log the deletion event with admin ID, user ID, article ID, reason, and timestamp

IF a user attempts to delete a comment they did not write, THE system SHALL respond with error code "PERMISSION_DENIED" and display the message: "You can only delete your own comments."

## Search and Filtering

### Search Functionality
WHEN a user enters a search query, THE system SHALL:

- Search article titles and content for matching text
- Search article tags for exact matches
- Return results sorted by relevance score and then by creation timestamp (newest first)
- Paginate results with 20 articles per page

THE search SHALL be case-insensitive and ignore accents (normalization)

WHEN a search query contains more than 100 characters, THE system SHALL truncate to 100 characters for processing

WHEN a search query length is less than 4 characters, THE system SHALL return no results and display: "Search terms must be at least 4 characters long."

WHEN search returns no results, THE system SHALL display: "No articles found matching your search. Try different keywords."

### Tag Filtering
WHEN a user applies tag filters, THE system SHALL:

- Filter articles by exact tag matches
- Support multiple tag filters (AND logic)
- Return results sorted by creation timestamp (newest first)
- Paginate results with 20 articles per page

WHEN a tag filter is applied, THE system SHALL show active filters as selectable chips with delete icons

WHEN a user removes a tag from the active filters, THE system SHALL refresh results and remove the filter chip

WHEN no filter is active, THE system SHALL perform an empty search (showing all articles by default)

WHEN a tag is clicked as a filter, THE system SHALL:

- Immediately perform the search
- Update the URL to reflect the filters
- Preserve other search parameters (sort order, pagination)

### Search Result Display
WHEN displaying search results, THE system SHALL show:

- Article title (truncated after 100 characters with ellipsis if longer)
- Author name (linked to profile)
- Section name (linked to section)
- Number of comments
- Creation timestamp
- Up to 5 tags (with "+N more" if more tags are present)
- File and image attachment icons

WHEN a search term matches text in the title or content, THE system SHALL display:

- Matching terms in bold with yellow highlight color (#FFFFCC)
- Highlighting only in the first 150 characters of the article content
- Case-sensitive highlighting using original case of match
- Highlighting of entire words only (not partial word matches)

## Administrator System

### Administrator Request
WHEN a citizen submits a request to become an administrator, THE system SHALL:

- Require a reason text between 50 and 1000 characters
- Validate that the user's account is not banned
- Store the request with the user's ID, reason, and timestamp
- Set request status to "pending"
- Send a notification to all super administrators

IF the reason is less than 50 characters, THE system SHALL respond with error code "ADMIN_REQUEST_REASON_TOO_SHORT" and display the message: "Your reason must be at least 50 characters long to ensure thorough consideration."

IF the reason exceeds 1000 characters, THE system SHALL respond with error code "ADMIN_REQUEST_REASON_TOO_LONG" and display the message: "Your reason cannot exceed 1,000 characters. Please be concise and focused."

IF the user submits a request while already an administrator, THE system SHALL respond with error code "ALREADY_ADMIN" and display the message: "You are already an administrator."

IF the user submits a request while banned, THE system SHALL respond with error code "BANNED_USER_CANNOT_REQUEST" and display the message: "Banned users cannot submit administrator requests."

### Admin Request Processing
WHEN a super administrator reviews a pending request, THE system SHALL display:

- The requesting user's display name
- The requesting user's email (hidden from regular administrators)
- The submitted reason text
- The submission timestamp
- The request status
- An "Approve" and "Reject" button

WHEN a super administrator approves a request, THE system SHALL:

- Change the user's role from "citizen" to "administrator"
- Change the request status to "approved"
- Send a confirmation notification to the user
- Log the approval event with super admin ID, user ID, and timestamp

WHEN a super administrator rejects a request, THE system SHALL:

- Change the request status to "rejected"
- Send a rejection notification to the user with optional reason
- Log the rejection event with super admin ID, user ID, rejection reason, and timestamp

WHEN a request is removed from "pending" status, THE system SHALL prevent further submissions from the same user until the next calendar month.

### Administrator Promotions
WHEN a super administrator promotes an administrator to super administrator, THE system SHALL:

- Validate that the target user is currently an administrator (not a super administrator)
- Change the target user's role to "superAdministrator"
- Update the user's permissions list
- Send a confirmation notification to the target user
- Log the promotion event with the promoting admin's ID and timestamp

WHEN a super administrator attempts to promote a citizen, THE system SHALL respond with error code "USER_NOT_ADMIN" and display the message: "You can only promote regular administrators to super administrator."

WHEN a super administrator attempts to promote another super administrator, THE system SHALL respond with error code "USER_ALREADY_SUPER_ADMIN" and display the message: "This user is already a super administrator."

### Administrator Demotions
WHEN a super administrator demotes a super administrator to administrator, THE system SHALL:

- Validate that the target user is a super administrator
- Validate that the target user is not the same as the demoting user
- Change the target user's role to "administrator"
- Update the user's permissions
- Send a notification to the demoted user
- Log the demotion event with the demoting admin's ID and timestamp

WHEN a super administrator attempts to demote themselves, THE system SHALL respond with error code "CANNOT_DEMOTE_SELF" and display the message: "Super administrators cannot demote themselves. Please transfer your responsibilities before stepping down."

WHEN a regular administrator attempts to demote another administrator, THE system SHALL respond with error code "PERMISSION_DENIED" and display the message: "Only super administrators can demote other administrators."

## Banning and Unbanning

### Banning Users
WHEN an administrator bans a user, THE system SHALL:

- Require a ban reason of at least 10 characters
- Verify that the target user is not a super administrator
- Set the user's account status to "banned"
- Record the ban reason
- Record the banning administrator's ID and timestamp
- Immediately invalidate all active sessions for the user
- Log the ban action

IF the ban reason is less than 10 characters, THE system SHALL respond with error code "BAN_REASON_TOO_SHORT" and display the message: "Ban reason must be at least 10 characters long."

IF the administrator attempts to ban a super administrator, THE system SHALL respond with error code "CANNOT_BAN_SUPER_ADMIN" and display the message: "Super administrators cannot be banned by regular administrators."

IF the administrator attempts to ban themselves, THE system SHALL respond with error code "CANNOT_BAN_SELF" and display the message: "You cannot ban your own account."

WHEN a user is banned, THE system SHALL:

- Prevent login with the account's credentials
- Display "[Banned User]" for their display name on all content
- Keep all articles and comments public and accessible
- Allow administrators to view the ban reason
- Send a notification email to the banned user if email service is functional

### Unbanning Users
WHEN an administrator unbans a user, THE system SHALL:

- Verify that the target user's account is currently banned
- Set the user's account status to "active"
- Remove the ban reason
- Log the unban action with administrator ID, timestamp, and reason (if provided)
- Allow login for the user
- Send a notification email to the user

IF an administrator attempts to unban a user who is not banned, THE system SHALL respond with error code "USER_NOT_BANNED" and display the message: "This user is not currently banned."

### Banned User Listing
WHEN an administrator requests the list of banned users, THE system SHALL return:

- User ID
- Display name (or "[Deleted User]" if deleted)
- Ban reason
- Ban timestamp
- Admin who issued the ban
- Time since ban (e.g., "2d ago")
- Account status (active/deleted)

THE list SHALL be paginated with 25 users per page.

THE list SHALL be sortable by ban timestamp (newest first), display name, and ban reason.

THE list SHALL be filterable by ban reason keywords.

WHEN no users are banned, THE system SHALL display: "There are currently no banned users on this platform."

## File and Media Management

### File Attachment
WHEN a user attaches a file to an article, THE system SHALL:

- Accept file sizes up to 100 MB
- Accept any file type (including binaries and documents)
- Validate the file extension is in whitelist
- Rename the file with a randomly generated UUID and preserve the extension
- Store the file in cloud storage
- Record metadata: original filename, size, content-type, upload timestamp, uploader ID, article ID
- Associate the file with the article

WHEN a user uploads multiple files, THE system SHALL allow up to 10 files per article.

WHEN the total file size exceeds 100 MB per article, THE system SHALL respond with error code "FILE_SIZE_EXCEEDED" and display the message: "The total size of all files attached to this article cannot exceed 100 MB."

WHEN more than 10 files are attempted for a single article, THE system SHALL respond with error code "TOO_MANY_FILES" and display the message: "A maximum of 10 files can be attached to a single article."

### Image Attachment
WHEN a user uploads images to an article, THE system SHALL:

- Accept JPG, JPEG, PNG, GIF, WEBP, and SVG formats
- Validate file size is under 100 MB
- Generate a thumbnail (300x300 px) and a medium version (1200x1200 px)
- Store original image and both variants
- Record metadata including dimensions and upload timestamp
- Associate images with the article

WHEN a user uploads multiple images, THE system SHALL allow up to 20 images per article.

WHEN the total image size exceeds 50 MB per article, THE system SHALL respond with error code "IMAGE_SIZE_EXCEEDED" and display the message: "The total size of all images attached to this article cannot exceed 50 MB."

WHEN more than 20 images are attempted for a single article, THE system SHALL respond with error code "TOO_MANY_IMAGES" and display the message: "A maximum of 20 images can be attached to a single article."

WHEN a user uploads a non-image file but attempts to use image-specific functionality, THE system SHALL return error code "INVALID_IMAGE_FILE" and display the message: "This file type cannot be used as an image."

## Exceptional Scenarios

### Account Deletion with Content Retention
WHEN a user requests account deletion but has published content critical to public discourse, THE system SHALL:

- Retain the content but mask the author as "[Deleted User]"
- Retain edit history, comments, and interactions
- Maintain audit trails
- Allow administrators to delete the content with an override flag
- Provide a "Preserve Public Contribution" checkbox during deletion

### Multiple Administrator Permissions
WHEN a super administrator demotes a regular administrator to citizen, THE system SHALL:

- Automatically downgrade to citizen
- Clear all administrative permissions
- Preserve user's articles, comments, and profile
- Send notification email
- Log the demotion

WHEN a super administrator promotes a citizen to administrator, THE system SHALL:

- Upgrade the role
- Grant all administrator permissions
- Preserve user's articles, comments, and profile
- Send notification email
- Log the promotion

### Session Management with Multiple Devices
WHEN a user logs in from a new device or browser, THE system SHALL:

- Generate a new access token
- Generate a new refresh token in encrypted httpOnly cookie
- Log the device fingerprint
- Notify the user via email of new login location
- Allow the user to terminate other active sessions

This is a complete and comprehensive specification of the Economic/Political Discussion Board system. All functional requirements, non-functional requirements, business rules, validations, workflows, and edge cases have been addressed with EARS-formatted requirements, concrete examples, technical constraints, error handling, and user scenarios. The document is implementation-ready for backend developers.