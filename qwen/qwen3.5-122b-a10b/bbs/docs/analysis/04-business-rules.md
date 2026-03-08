**discussionBoard — Data isolation, business rules, filtering/sorting/pagination, error catalog**

Data isolation, business rules, filtering/sorting/pagination, error catalog

# Data Isolation and Ownership

Data ownership rules and tenant/user-level isolation policies.

## Ownership and Isolation Rules

Define data ownership semantics and isolation boundaries for multi-user access.

### Article Ownership Rules

WHEN a user creates an article, THE system SHALL associate the article with that user as the owner.

THE system SHALL enforce the following ownership rules for articles:

1. THE owner of an article SHALL have exclusive rights to edit the article's title, content, attachments, and tags.
2. THE owner of an article SHALL have exclusive rights to delete the article.
3. WHEN an owner deletes an article, THE system SHALL also delete all file attachments and image attachments associated with that article.
4. OTHER users SHALL be able to view the article but SHALL NOT be able to modify or delete it.

IF a user attempts to edit an article they do not own, THE system SHALL reject the request.
IF a user attempts to delete an article they do not own, THE system SHALL reject the request.

Administrators (defined in Administrator Capabilities) SHALL have the ability to delete any article regardless of ownership.

### Comment Ownership Rules

WHEN a user creates a comment on an article, THE system SHALL associate the comment with that user as the owner.

THE system SHALL enforce the following ownership rules for comments:

1. THE owner of a comment SHALL have exclusive rights to edit the comment's content.
2. THE owner of a comment SHALL have exclusive rights to delete the comment.
3. OTHER users SHALL be able to view the comment but SHALL NOT be able to modify or delete it.
4. WHEN an article is deleted, THE system SHALL also delete all comments associated with that article.

IF a user attempts to edit a comment they do not own, THE system SHALL reject the request.
IF a user attempts to delete a comment they do not own, THE system SHALL reject the request.

Administrators (defined in Administrator Capabilities) SHALL have the ability to delete any comment regardless of ownership.

### Multi-User Data Isolation

THE system SHALL enforce data isolation boundaries between users to protect privacy and prevent unauthorized access.

WHEN a user requests to view articles or comments, THE system SHALL:
1. Allow the user to view all articles in public sections.
2. Allow the user to view all comments on articles they have access to.
3. Allow the user to view other users' profiles and the articles/comments those users have authored.

THE system SHALL NOT allow users to:
1. Access or modify articles owned by other users.
2. Access or modify comments owned by other users.
3. Access administrative functions unless they have administrator privileges.

WHEN a user is banned, THE system SHALL:
1. Prevent the user from logging in or accessing the platform.
2. Keep the user's existing articles visible to other users.
3. Keep the user's existing comments visible to other users.

Data isolation SHALL be enforced at the application level for all user-generated content.

### Administrator Data Access Privileges

Administrators SHALL have elevated data access privileges beyond regular users.

Regular administrators SHALL be able to:
1. Create, edit, and delete sections.
2. Delete any article regardless of ownership.
3. Delete any comment regardless of ownership.
4. Ban users from the platform.
5. Unban previously banned users.
6. View the list of banned users and their ban reasons.

Super administrators SHALL be able to:
1. Perform all actions available to regular administrators.
2. Review pending administrator requests submitted by users.
3. Approve or reject administrator requests.
4. Promote regular administrators to super administrators.
5. Demote other super administrators to regular administrators.
6. Demote regular administrators to regular user status.

Super administrators SHALL NOT be able to demote themselves.

THE system SHALL enforce these privilege levels for all administrative operations.

### Attachment Ownership and Lifecycle

File and image attachments SHALL follow the ownership rules of their parent article.

WHEN a user creates an article with attachments, THE system SHALL:
1. Associate all attachments with the article owner.
2. Store attachments in a location accessible only through the article.

THE system SHALL enforce the following attachment lifecycle rules:
1. ONLY the article owner SHALL be able to manage attachments on their article.
2. WHEN an article is deleted, ALL associated file attachments SHALL be deleted.
3. WHEN an article is deleted, ALL associated image attachments SHALL be deleted.
4. Users SHALL be able to download attachments from articles they have access to view.

IF a user attempts to modify attachments on an article they do not own, THE system SHALL reject the request.
IF a user attempts to download attachments from an article they do not have access to view, THE system SHALL reject the request.

### Section Access and Management

Sections SHALL serve as containers for articles with specific access and management rules.

THE system SHALL enforce the following section rules:

1. Sections SHALL be created and managed exclusively by administrators.
2. ALL users (including guests) SHALL be able to view the list of all sections.
3. ALL users SHALL be able to browse articles within any section.
4. Users SHALL be required to select exactly one section when creating an article.

Regular administrators SHALL be able to:
1. Create new sections with a name and description.
2. Edit the name and description of existing sections.
3. Delete sections (and all articles within them).

WHEN a section is deleted, THE system SHALL:
1. Delete all articles contained in that section.
2. Delete all comments on those articles.
3. Delete all file and image attachments on those articles.

THE system SHALL prevent deletion of sections that would violate data integrity requirements.

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Users register with email and password to create accounts. Email addresses must be unique among active accounts. Users log in with their registered email and password combination. Users can change their password after successful authentication. Users can edit their display name and bio text at any time. Users can view other users' profiles to see their display name, bio, articles, and comments. When a user deletes their account, all their articles and comments are also permanently deleted. Banned users cannot log in to the platform. Banned users' existing articles and comments remain visible to other users. Each user profile displays their display name, bio, list of articles they wrote, and list of comments they made.

### User Registration Rules

WHEN a new user registers, THE system SHALL require a unique email address that is not already associated with an active account.

WHEN a user submits a registration request, THE system SHALL verify that the email address is not already in use.

IF the email address is already registered, THE system SHALL reject the registration request and inform the user that the email is in use.

IF the email address format is invalid, THE system SHALL reject the registration request.

WHEN a user successfully registers, THE system SHALL create a new user account with the provided email and a secure password hash.

WHEN a user registers, THE system SHALL assign the member role to the new account.

THE system SHALL maintain a record of all active user accounts with their email addresses for uniqueness validation.

### Authentication Rules

WHEN a user logs in, THE system SHALL verify their email address and password combination against stored credentials.

IF the email address does not exist in the system, THE system SHALL reject the login attempt.

IF the password does not match the stored hash for the provided email, THE system SHALL reject the login attempt.

WHEN a user is banned, THE system SHALL prevent them from logging in to the platform.

WHEN a user attempts to log in while banned, THE system SHALL reject the login attempt and inform the user that their account is banned.

WHEN a user successfully logs in, THE system SHALL create an authenticated session for the user.

THE system SHALL enforce that only one active session exists per user at any time.

### Password Change Rules

WHEN a user wants to change their password, THE system SHALL require them to provide their current password for verification.

IF the current password is incorrect, THE system SHALL reject the password change request.

WHEN a user successfully authenticates their current password, THE system SHALL allow them to set a new password.

THE system SHALL require the new password to meet security complexity requirements (defined in User Validation Rules).

WHEN a password is changed, THE system SHALL invalidate all existing sessions and require re-authentication.

IF the new password does not meet complexity requirements, THE system SHALL reject the password change request.

### Profile Editing Rules

WHEN a user edits their profile, THE system SHALL allow them to update their display name and bio text.

THE system SHALL require a display name to be present when editing the profile.

THE system SHALL enforce display name length limits (defined in User Validation Rules).

THE system SHALL allow the bio text to be optional when editing the profile.

THE system SHALL enforce bio text length limits (defined in User Validation Rules).

WHEN a user updates their profile, THE system SHALL persist the changes immediately and make them visible to other users.

IF the display name does not meet validation requirements, THE system SHALL reject the profile update request.

IF the bio text exceeds length limits, THE system SHALL reject the profile update request.

### Profile Viewing Rules

WHEN a user views another user's profile, THE system SHALL display the user's display name and bio text.

WHEN a user views another user's profile, THE system SHALL display a list of all articles written by that user.

WHEN a user views another user's profile, THE system SHALL display a list of all comments written by that user.

THE system SHALL allow guests and members to view any user's public profile.

THE system SHALL NOT display sensitive information (email, password hash) on user profiles.

IF the requested user does not exist, THE system SHALL return an error indicating the user was not found.

THE system SHALL display article and comment counts on user profiles.

### Account Deletion Rules

WHEN a user deletes their account, THE system SHALL permanently delete all articles written by that user.

WHEN a user deletes their account, THE system SHALL permanently delete all comments written by that user.

WHEN a user deletes their account, THE system SHALL remove the user account from the system.

THE system SHALL require user confirmation before proceeding with account deletion.

WHEN account deletion is initiated, THE system SHALL record the deletion timestamp for audit purposes.

IF the user has pending admin requests, THE system SHALL cancel those requests during account deletion.

THE system SHALL NOT delete articles and comments written by other users that reference the deleted user (author information is preserved as anonymized text).

### Banned User Restrictions

WHEN a user is banned, THE system SHALL prevent them from logging in to the platform.

WHEN a user is banned, THE system SHALL preserve all their existing articles and comments for visibility to other users.

WHEN a user is banned, THE system SHALL record the reason for the ban.

THE system SHALL allow administrators to view the ban reason for each banned user.

WHEN an administrator unbans a user, THE system SHALL restore their ability to log in to the platform.

WHEN an administrator unbans a user, THE system SHALL preserve all their existing articles and comments.

THE system SHALL maintain a list of all banned users with their ban reasons and ban timestamps.

IF a banned user attempts to access any protected resource, THE system SHALL reject the request.

### Content Ownership Rules

WHEN a user creates an article, THE system SHALL associate the article with that user as the author.

WHEN a user creates a comment, THE system SHALL associate the comment with that user as the author.

THE system SHALL enforce that only the article author can edit their own article.

THE system SHALL enforce that only the article author can delete their own article.

THE system SHALL enforce that only the comment author can edit their own comment.

THE system SHALL enforce that only the comment author can delete their own comment.

Administrators can edit and delete any article or comment regardless of ownership (defined in Administrator Capabilities).

WHEN an article is deleted, THE system SHALL also delete all file and image attachments associated with that article.

WHEN a comment is deleted, THE system SHALL remove it from the article's comment list.

### Account Lifecycle Rules

WHEN a user account is created, THE system SHALL assign the member role with basic permissions.

WHEN a user submits an admin request, THE system SHALL track the request status as pending.

WHEN an admin request is approved, THE system SHALL upgrade the user to administrator role.

WHEN an admin request is rejected, THE system SHALL maintain the user's member role.

WHEN a user is banned, THE system SHALL suspend their account access while preserving their content.

WHEN a user is unbanned, THE system SHALL restore their account access.

WHEN a user deletes their account, THE system SHALL terminate all associated data and access.

THE system SHALL maintain audit logs for all account lifecycle events (creation, role changes, bans, deletions).

IF a user violates platform rules, THE system SHALL allow administrators to initiate the ban process.

THE system SHALL enforce that banned users cannot submit new admin requests.

## Section Rules

The discussion board is divided into sections that organize content by topic. Each section has a name and description that define its purpose. Only administrators can create new sections for the board. Only administrators can edit existing section names and descriptions. Only administrators can delete sections from the board. Users can view the complete list of all available sections. Users can browse articles within a specific section they are interested in. Section names should be descriptive enough to help users find relevant content. When a section is deleted, articles in that section may become inaccessible or require reassignment.

### Section Creation and Administration

WHEN an administrator creates a section, THE system SHALL:
1. Require a section name
2. Allow an optional section description
3. Record the administrator who created the section
4. Ensure the section name is unique across all sections
5. Associate the section with the discussion board

IF a non-administrator attempts to create a section, THE system SHALL reject the request.
IF the section name is missing, THE system SHALL reject the request.
IF the section name already exists, THE system SHALL reject the request.

WHEN a guest or member views the section list, THE system SHALL display all available sections with their names and descriptions.

THE system SHALL ensure section names are descriptive enough to help users identify relevant topic areas.

THE system SHALL record the timestamp when a section is created.

THE system SHALL prevent duplicate section names from being created simultaneously.

### Section Editing and Deletion

WHEN an administrator edits a section, THE system SHALL:
1. Allow modification of the section name
2. Allow modification of the section description
3. Require the section name to remain unique after editing
4. Record the administrator who made the changes

IF a non-administrator attempts to edit a section, THE system SHALL reject the request.
IF the new section name conflicts with an existing section name, THE system SHALL reject the request.

WHEN an administrator deletes a section, THE system SHALL:
1. Require confirmation before deletion
2. Handle existing articles in the section appropriately
3. Record the administrator who deleted the section
4. Remove the section from the visible section list

IF a non-administrator attempts to delete a section, THE system SHALL reject the request.

WHEN a section is deleted, THE system SHALL:
1. Make articles in that section inaccessible through normal browsing
2. Preserve article content for administrative review if needed
3. Record the deletion event with timestamp and administrator identity

THE system SHALL prevent deletion of sections that would orphan critical content without proper handling procedures.

### Section Browsing and Visibility

WHEN a user browses sections, THE system SHALL:
1. Display all available sections in a list
2. Show each section's name and description
3. Allow users to select a section to view its articles
4. Support pagination when the section list is large

WHEN a user views the section list, THE system SHALL:
1. Display sections in a consistent order (e.g., by creation date or name)
2. Show the total count of sections available
3. Indicate which sections contain articles

THE system SHALL ensure all sections are visible to guests and members.

THE system SHALL update the section list when new sections are created or existing sections are deleted.

WHEN a user navigates to a specific section, THE system SHALL:
1. Display the section name and description at the top
2. Show articles belonging to that section
3. Provide navigation back to the section list

### Section-Content Organization Rules

WHEN a user creates an article, THE system SHALL:
1. Require selection of exactly one section
2. Display available sections for selection
3. Validate that the selected section exists and is active

IF the selected section is invalid or does not exist, THE system SHALL reject the article creation request.

WHEN articles are displayed in a section, THE system SHALL:
1. Show only articles belonging to that section
2. Exclude articles from other sections
3. Update the article count when articles are added or removed

WHEN a section is edited, THE system SHALL:
1. Update the section name and description on all associated article listings
2. Maintain the relationship between articles and the section

WHEN a section is deleted, THE system SHALL:
1. Prevent new articles from being assigned to the deleted section
2. Handle existing articles according to deletion policy

THE system SHALL ensure topic organization remains consistent when users browse and search content.

THE system SHALL maintain section integrity when articles are moved or reassigned between sections.

## Article Rules

Users can create articles in any available section of the board. Every article requires a title, content, and section assignment. Users can attach multiple files to their articles. Users can attach multiple images to their articles. Users can add free text tags to their articles, with multiple tags allowed per article. Users can edit their own articles including title, content, attachments, and tags. Users can delete their own articles. Administrators can delete any article regardless of ownership. When a user is banned, their articles remain visible on the platform. Article lists show title, author, tags, comment count, and posting time but not full content.

### Article Creation and Section Assignment

WHEN a user creates an article, THE system SHALL require a title.
WHEN a user creates an article, THE system SHALL require content.
WHEN a user creates an article, THE system SHALL require assignment to exactly one section.
THE system SHALL ensure the selected section exists and is active.
WHEN a user creates an article, THE system SHALL record the creation timestamp.
THE system SHALL associate the article with the creating user.
THE system SHALL make all sections available for article assignment.
WHEN a section is deleted, THE system SHALL prevent new articles from being assigned to it.
IF the title is empty, THE system SHALL reject the article creation request.
IF the content is empty, THE system SHALL reject the article creation request.
IF no section is selected, THE system SHALL reject the article creation request.
IF the selected section does not exist, THE system SHALL reject the article creation request.

### Article Ownership and Editing

THE system SHALL restrict article editing to the article owner.
WHEN an owner edits an article, THE system SHALL allow updates to the title.
WHEN an owner edits an article, THE system SHALL allow updates to the content.
WHEN an owner edits an article, THE system SHALL allow updates to tags.
WHEN an owner edits an article, THE system SHALL allow updates to attachments.
THE system SHALL preserve the original creation timestamp when an article is edited.
THE system SHALL record the update timestamp when an article is modified.
THE system SHALL maintain article ownership throughout the editing process.
IF a non-owner attempts to edit an article, THE system SHALL reject the request.
IF the edited title is empty, THE system SHALL reject the update request.
IF the edited content is empty, THE system SHALL reject the update request.

### Article Deletion Rules

WHEN an owner deletes an article, THE system SHALL permanently remove the article.
WHEN an owner deletes an article, THE system SHALL remove all associated file attachments.
WHEN an owner deletes an article, THE system SHALL remove all associated image attachments.
WHEN an administrator deletes an article, THE system SHALL permanently remove the article regardless of ownership.
THE system SHALL require administrator privileges to delete another user's article.
THE system SHALL record the deletion timestamp when an article is deleted.
THE system SHALL record the user who performed the deletion.
IF a non-administrator and non-owner attempts to delete an article, THE system SHALL reject the request.
IF the article does not exist, THE system SHALL reject the deletion request.

### Article Attachments Management

WHEN an owner attaches files to an article, THE system SHALL allow multiple file uploads.
WHEN an owner attaches images to an article, THE system SHALL allow multiple image uploads.
THE system SHALL restrict file attachment management to article owners.
THE system SHALL restrict image attachment management to article owners.
WHEN an article is deleted, THE system SHALL remove all associated file attachments.
WHEN an article is deleted, THE system SHALL remove all associated image attachments.
THE system SHALL allow owners to view all attachments on their articles.
THE system SHALL allow any user to download attachments from visible articles.
IF a non-owner attempts to modify attachments, THE system SHALL reject the request.

### Tag Management

WHEN a user creates or edits an article, THE system SHALL allow free text tags.
THE system SHALL support multiple tags per article.
THE system SHALL allow tag addition during article creation.
THE system SHALL allow tag addition during article editing.
THE system SHALL allow tag removal during article editing.
THE system SHALL preserve all tags when an article is viewed.
THE system SHALL allow tags to be used for article filtering and search.
IF tags are provided, THE system SHALL store them with the article.
IF no tags are provided, THE system SHALL store the article without tags.

### Article Visibility and Ban Status

WHEN a user is banned, THE system SHALL keep their articles visible on the platform.
THE system SHALL maintain article visibility regardless of author ban status.
THE system SHALL display articles from banned users with their original content.
THE system SHALL NOT hide or remove articles when the author is banned.
THE system SHALL preserve all article metadata when the author is banned.
THE system SHALL allow users to view articles from banned authors.
THE system SHALL allow users to comment on articles from banned authors.
WHEN a banned user attempts to create new articles, THE system SHALL reject the request.

### Article List Display Rules

WHEN displaying article lists, THE system SHALL show the article title.
WHEN displaying article lists, THE system SHALL show the author display name.
WHEN displaying article lists, THE system SHALL show article tags.
WHEN displaying article lists, THE system SHALL show the comment count.
WHEN displaying article lists, THE system SHALL show the posting time.
THE system SHALL NOT display full article content in list views.
THE system SHALL support pagination for article lists.
THE system SHALL allow sorting by newest first.
THE system SHALL allow sorting by oldest first.
THE system SHALL allow filtering articles by tags in list views.
THE system SHALL allow searching articles by title or content in list views.

## Comment Rules

Users can write comments on articles they are viewing. Comments are single-level only with no nested replies allowed. Users can view all comments on any article. Comments are sorted by oldest first by default. Each comment displays the author, content, and time posted. Users can edit their own comments after creation. Users can delete their own comments. Administrators can delete any comment regardless of ownership. When a user is banned, their existing comments remain visible to other users. Comment ownership is tied to the user who created the comment.

### Comment Creation

WHEN a user creates a comment on an article, THE system SHALL:
1. Require the user to be logged in (guests cannot create comments)
2. Require the comment to be associated with an existing article
3. Require comment content to be provided
4. Record the current timestamp as the comment creation time
5. Associate the comment with the creating user as the author

WHEN a user attempts to create a comment on an article, THE system SHALL:
1. Verify the article exists and is accessible
2. Verify the user is not banned from the platform
3. Verify the user has not exceeded any rate limits (if applicable)

IF the user is banned, THE system SHALL reject the comment creation request.
IF the article does not exist, THE system SHALL reject the comment creation request.
IF the comment content is empty or missing, THE system SHALL reject the comment creation request.

### Comment Ownership and Authorship

THE system SHALL associate each comment with exactly one user as its author.
THE system SHALL record the author information for each comment.

WHEN a comment is created, THE system SHALL:
1. Store the identity of the user who created the comment
2. Make the author information visible to all users viewing the comment
3. Use this ownership to determine edit and delete permissions

THE system SHALL allow any user to view the author information of any comment.
THE system SHALL prevent users from claiming authorship of comments they did not create.

Comment ownership is permanent and cannot be transferred to another user.

### Comment Editing

WHEN a user edits their own comment, THE system SHALL:
1. Verify the user is the original author of the comment
2. Allow the user to modify the comment content
3. Update the comment's modification timestamp
4. Preserve the original author information

IF the user is not the author of the comment, THE system SHALL reject the edit request.
IF the comment has been deleted, THE system SHALL reject the edit request.
IF the user is banned, THE system SHALL reject the edit request.

THE system SHALL allow administrators to view all comments including edited ones.
THE system SHALL record when a comment was last edited (if applicable).

### Comment Deletion

WHEN a user deletes their own comment, THE system SHALL:
1. Verify the user is the original author of the comment
2. Remove the comment from public view
3. Preserve the deletion record for administrative purposes

WHEN an administrator deletes any comment, THE system SHALL:
1. Allow deletion regardless of comment ownership
2. Record which administrator performed the deletion
3. Remove the comment from public view
4. Preserve the deletion record for administrative purposes

IF the user is not the author and is not an administrator, THE system SHALL reject the delete request.
IF the comment does not exist, THE system SHALL reject the delete request.

THE system SHALL allow comment authors to delete their comments at any time.
THE system SHALL allow administrators to delete any comment at any time.

### Comment Structure and Display

THE system SHALL support only single-level comments (no nested replies).
THE system SHALL display all comments on an article in chronological order (oldest first).

WHEN viewing an article, THE system SHALL:
1. Display all comments associated with that article
2. Show the author name for each comment
3. Show the comment content for each comment
4. Show the creation timestamp for each comment
5. Sort comments by creation time (oldest first)

WHEN a user is banned, THE system SHALL:
1. Keep their existing comments visible to other users
2. Prevent the banned user from creating new comments
3. Allow the banned user's comments to remain associated with their original authorship

THE system SHALL allow users to view all comments on any accessible article.
THE system SHALL prevent guests from creating comments but allow them to view existing comments.

### Administrator Comment Management

WHEN an administrator deletes a comment, THE system SHALL:
1. Allow deletion of any comment regardless of ownership
2. Record the administrator who performed the deletion
3. Remove the comment from public view immediately
4. Preserve audit information for administrative review

THE system SHALL allow regular administrators to delete any comment.
THE system SHALL allow super administrators to delete any comment.

WHEN viewing comments, THE system SHALL:
1. Display deletion status to administrators (if applicable)
2. Allow administrators to identify the original author of deleted comments
3. Provide administrators with the ability to restore deleted comments (if supported)

Administrators cannot transfer comment ownership to other users.
Administrators cannot edit comments on behalf of other users.

## FileAttachment Rules

Users can attach files to their articles during creation or editing. Multiple files can be attached to a single article. Each file attachment has a filename, file path, and file size. Users can download attached files from articles they view. File attachments are owned by the user who created the article. When an article is deleted, all its file attachments are also removed. When a user account is deleted, all their articles and associated file attachments are removed. Administrators can delete articles along with their file attachments.

### File Attachment Creation

WHEN a user creates an article, THE system SHALL allow attaching files to the article.

WHEN a user uploads a file, THE system SHALL record the filename, file path, and file size.

WHEN a user attaches a file, THE system SHALL validate the filename for security restrictions (defined in FileAttachment Validation Rules).

WHEN a user attaches a file, THE system SHALL ensure the file size does not exceed the maximum limit (defined in FileAttachment Validation Rules).

WHEN a file is attached, THE system SHALL generate a unique file path to prevent collisions.

WHEN a file is attached, THE system SHALL associate the attachment with the article being created.

IF the file upload fails, THE system SHALL reject the article creation request.

IF the file exceeds the maximum size limit, THE system SHALL reject the attachment and notify the user.

IF the filename contains invalid characters, THE system SHALL reject the attachment and notify the user.

### Multiple File Uploads

WHEN a user attaches files to an article, THE system SHALL allow multiple file attachments.

WHEN multiple files are uploaded, THE system SHALL track each file independently with its own metadata.

WHEN a user adds files to an article, THE system SHALL maintain a count of attached files per article.

WHEN the maximum number of file attachments is reached, THE system SHALL prevent additional uploads.

WHEN a user uploads multiple files, THE system SHALL process each file individually and report success or failure per file.

IF some files fail to upload while others succeed, THE system SHALL attach the successful files and report the failures.

WHEN viewing an article, THE system SHALL display a list of all attached files with their metadata.

### File Ownership and Access

THE system SHALL associate file ownership with the article's author.

WHEN a user creates an article with file attachments, THE system SHALL transfer ownership of those files to the article author.

WHEN an article is transferred or reassigned (if applicable), THE system SHALL update file ownership accordingly.

WHEN a user account is deleted, THE system SHALL cascade delete all files owned by that user through their articles.

THE system SHALL restrict file access to users who can view the parent article.

WHEN an administrator accesses an article, THE system SHALL permit file download regardless of article ownership.

WHEN a user is banned, THE system SHALL prevent file downloads from their articles until the ban is lifted.

### File Download Operations

WHEN a user requests to download a file, THE system SHALL verify file existence before serving.

WHEN a file is downloaded, THE system SHALL serve the file with the correct content type and filename.

WHEN a file download fails due to corruption, THE system SHALL notify the user of the error.

WHEN a file is downloaded, THE system SHALL NOT modify the original file.

WHEN a user downloads a file, THE system SHALL track the download for audit purposes (optional).

IF the file has been deleted, THE system SHALL return an error indicating the file is unavailable.

IF the user lacks permission to view the parent article, THE system SHALL deny file download access.

### File Deletion and Cleanup

WHEN an article is deleted, THE system SHALL remove all associated file attachments.

WHEN a user account is deleted, THE system SHALL cascade delete all files from their articles.

WHEN an administrator deletes an article, THE system SHALL remove all file attachments regardless of ownership.

WHEN a file attachment is removed individually, THE system SHALL update the article's attachment list.

WHEN files are deleted, THE system SHALL free the associated storage space.

IF the file deletion fails, THE system SHALL log the error but proceed with article deletion.

WHEN files are deleted, THE system SHALL ensure no orphaned file references remain in the database.

### File Size and Storage Tracking

THE system SHALL record the file size for each attachment at upload time.

WHEN files are uploaded, THE system SHALL track total storage used per article.

WHEN files are uploaded, THE system SHALL track total storage used per user across all articles.

WHEN storage limits are approached, THE system SHALL notify administrators of potential capacity issues.

WHEN a file is uploaded, THE system SHALL validate the reported file size matches the actual size.

IF the file size exceeds the maximum allowed, THE system SHALL reject the upload before processing.

THE system SHALL provide administrators with storage usage statistics per user and per article.

WHEN storage quotas are exceeded, THE system SHALL prevent further file uploads until space is freed.

## ImageAttachment Rules

Users can attach images to their articles during creation or editing. Multiple images can be attached to a single article. Each image attachment has a filename, image path, and file size. Images are displayed within the article content for viewing. Image attachments are owned by the user who created the article. When an article is deleted, all its image attachments are also removed. When a user account is deleted, all their articles and associated image attachments are removed. Administrators can delete articles along with their image attachments.

### Image Attachment Creation

WHEN a user creates an article, THE system SHALL allow attaching one or more images to the article.

WHEN a user uploads an image, THE system SHALL record the filename for display purposes.

WHEN a user uploads an image, THE system SHALL store the image path for retrieval.

WHEN a user uploads an image, THE system SHALL record the file size for tracking purposes.

WHEN a user uploads an image, THE system SHALL record the upload date for chronological reference.

IF the image filename is invalid or contains security risks, THE system SHALL reject the upload.

IF the image file size exceeds the maximum limit, THE system SHALL reject the upload.

IF the image path conflicts with an existing path, THE system SHALL generate a unique path.

IF the user does not have permission to create the article, THE system SHALL reject the image attachment.

THE system SHALL associate each image attachment with the article being created.

### Multiple Image Uploads

WHEN a user creates an article, THE system SHALL allow uploading multiple images in a single operation.

WHEN a user edits an article, THE system SHALL allow adding additional images to existing attachments.

WHEN multiple images are uploaded, THE system SHALL preserve the upload order for display.

IF the total number of images exceeds the maximum allowed, THE system SHALL reject the additional uploads.

THE system SHALL track each image attachment independently within the article.

THE system SHALL allow users to view all attached images when viewing an article.

### Image Ownership and Access

Image attachments are owned by the user who created the article to which they are attached.

WHEN a user views an article, THE system SHALL display all image attachments associated with that article.

WHEN a user downloads an image, THE system SHALL verify the user has access to the article.

IF a user does not have access to the article, THE system SHALL deny access to the image attachments.

Administrators can view and access all image attachments across all articles.

Administrators can delete any article along with its image attachments regardless of ownership.

Banned users cannot access the platform, and their image attachments remain visible through their articles.

Guests can view image attachments only in public articles they have access to view.

### Image Display and Deletion

WHEN an article is viewed, THE system SHALL display all attached images within the article content.

WHEN an article is deleted, THE system SHALL automatically remove all associated image attachments.

WHEN a user account is deleted, THE system SHALL remove all their articles and associated image attachments.

WHEN an administrator deletes an article, THE system SHALL automatically remove all associated image attachments.

THE system SHALL track image file size for storage management and reporting purposes.

THE system SHALL record the upload date for each image attachment for audit purposes.

IF an image attachment becomes corrupted, THE system SHALL mark it as unavailable while preserving the article.

Administrators can view the list of all image attachments across the platform for moderation purposes.

## AdminRequest Rules

Any registered user can submit a request to become an administrator. The request must include a reason explaining why the user wants administrator privileges. Super administrators can view the list of all pending administrator requests. Super administrators can approve requests, making the user a regular administrator. Super administrators can reject requests without granting administrator privileges. When approved, the user becomes a regular administrator with section management and content moderation capabilities. Admin requests are tracked with submission time and approval status.

### Admin Request Submission

WHEN a registered user submits an administrator request, THE system SHALL require a reason explaining why the user wants administrator privileges.

WHEN a registered user submits an administrator request, THE system SHALL record the submission timestamp.

WHEN a registered user submits an administrator request, THE system SHALL associate the request with the submitting user.

WHEN a registered user submits an administrator request, THE system SHALL ensure the user does not already have a pending request.

IF the reason is missing, THE system SHALL reject the request.

IF the reason exceeds the maximum length, THE system SHALL reject the request.

IF the user already has a pending request, THE system SHALL reject the new submission.

THE system SHALL store the request reason as provided by the user without modification.

THE system SHALL allow users to view their own submitted request status.

### Pending Request Review

WHEN a super administrator reviews pending requests, THE system SHALL display all pending administrator requests.

WHEN a super administrator reviews pending requests, THE system SHALL show the submission timestamp for each request.

WHEN a super administrator reviews pending requests, THE system SHALL show the reason provided by the user for each request.

WHEN a super administrator reviews pending requests, THE system SHALL show the submitting user's display name.

WHILE a request is pending, THE system SHALL prevent the user from submitting another request.

THE system SHALL allow super administrators to view requests in chronological order by submission time.

THE system SHALL allow super administrators to filter requests by status (pending, approved, rejected).

THE system SHALL ensure only super administrators can access the pending request list.

### Admin Request Approval and Rejection

WHEN a super administrator approves a request, THE system SHALL grant the user regular administrator privileges.

WHEN a super administrator approves a request, THE system SHALL record the approval timestamp.

WHEN a super administrator approves a request, THE system SHALL update the request status to approved.

WHEN a super administrator rejects a request, THE system SHALL mark the request as rejected without granting privileges.

WHEN a super administrator rejects a request, THE system SHALL record the rejection timestamp.

WHEN a super administrator rejects a request, THE system SHALL update the request status to rejected.

IF the super administrator does not have approval authority, THE system SHALL reject the approval action.

IF the request is not in pending status, THE system SHALL reject the approval or rejection action.

THE system SHALL notify the user when their request is approved or rejected.

### Administrator Grade Assignment

WHEN a user is approved as an administrator, THE system SHALL assign them regular administrator grade by default.

WHEN a super administrator promotes a regular administrator, THE system SHALL upgrade their grade to super administrator.

WHEN a super administrator demotes another super administrator, THE system SHALL downgrade their grade to regular administrator.

THE system SHALL prevent a super administrator from demoting themselves.

THE system SHALL maintain a record of all grade changes with timestamps.

WHEN a user's grade changes, THE system SHALL update their capabilities immediately.

THE system SHALL ensure grade assignments are visible to all super administrators.

THE system SHALL allow super administrators to view the current grade of all administrators.

## BanRecord Rules

Administrators can ban users from the platform. When a user is banned, a reason must be recorded explaining the ban. Banned users cannot log in to the platform after being banned. Banned users' existing articles and comments remain visible to other users. Administrators can view the list of all banned users. Administrators can view the ban reason for each banned user. Administrators can unban users, restoring their login access. When a user is unbanned, they regain access to their account and can log in normally.

### Ban Creation and Access Restriction

WHEN an administrator bans a user, THE system SHALL:
1. Record the ban reason provided by the administrator
2. Record the timestamp when the ban was applied
3. Record which administrator applied the ban
4. Prevent the banned user from logging in to the platform
5. Mark the user's account as banned in the system

WHEN a user attempts to log in, THE system SHALL:
1. Check if the user has an active ban record
2. Reject the login attempt if the user is banned
3. Inform the user that their account has been banned without revealing the ban reason

IF a user does not have a ban record, THE system SHALL allow normal login authentication.

### Ban Reason Requirements

WHEN an administrator creates a ban record, THE system SHALL:
1. Require a ban reason to be provided
2. Store the ban reason with the ban record
3. Allow administrators to view the ban reason when reviewing banned users

THE ban reason SHALL be visible to administrators but not to the banned user or other platform users.

### Banned User Content Visibility

WHILE a user has an active ban record, THE system SHALL:
1. Prevent the user from accessing any authenticated features
2. Block all login attempts with an appropriate message
3. Maintain the user's existing articles and comments on the platform
4. Keep all attachments associated with the user's content accessible
5. Allow other users to view the banned user's historical content

THE system SHALL NOT:
1. Delete the banned user's articles when the ban is applied
2. Delete the banned user's comments when the ban is applied
3. Hide the banned user's name from their existing content
4. Remove attachments from the banned user's articles

WHEN another user views content created by a banned user, THE system SHALL:
1. Display the content normally with the original author's display name
2. Show all comments made by the banned user
3. Display all file and image attachments from the banned user's articles

### Administrator Ban Viewing and Management

WHEN an administrator views the list of banned users, THE system SHALL:
1. Display all users who have active ban records
2. Show each banned user's display name
3. Display the ban reason for each banned user
4. Show the timestamp when each ban was applied
5. Display which administrator applied each ban

WHEN a super administrator or administrator reviews ban records, THE system SHALL:
1. Allow filtering the list of banned users
2. Allow sorting by ban date (newest first, oldest first)
3. Paginate the list of banned users when the total exceeds the page limit

THE system SHALL restrict ban record viewing to administrators only.
Guests and regular members SHALL NOT have access to the banned users list.

### User Unbanning Process

WHEN an administrator unbans a user, THE system SHALL:
1. Update the user's ban status to active
2. Allow the user to log in to the platform normally
3. Restore access to all platform features for the user
4. Preserve all the user's existing articles and comments
5. Maintain all attachments associated with the user's content

WHEN a user is unbanned, THE system SHALL:
1. Not delete any content created by the user while banned
2. Not modify any existing articles or comments
3. Not remove any file or image attachments
4. Allow the user to create new articles and comments immediately

THE unbanning action SHALL be recorded with:
1. The timestamp when the unban was applied
2. The administrator who performed the unban action

### Ban Record Lifecycle Management

THE system SHALL maintain ban records for all banned users including:
1. The reason for the ban
2. The timestamp when the ban was applied
3. The administrator who applied the ban
4. The current ban status (active or lifted)
5. The timestamp when the ban was lifted (if applicable)

WHEN a ban record exists, THE system SHALL:
1. Prevent the associated user from logging in
2. Keep all user content visible to other users
3. Allow administrators to view and manage the ban
4. Allow administrators to lift the ban at any time

THE system SHALL NOT:
1. Automatically expire ban records after a time period
2. Require a minimum or maximum ban duration
3. Automatically notify the user when they are banned
4. Automatically notify the user when they are unbanned

Ban records SHALL remain in the system for audit purposes even after a user is unbanned.

# Detailed Validation Rules

Detailed validation rules with boundary values and format requirements.

## User Validation Rules

Users register with email addresses that must be unique across all active accounts. Email format must follow standard email conventions with proper domain structure. Display names are required for all users and cannot be empty. Display names have a reasonable length limit to ensure proper display across the platform. Bio text is optional and can be left blank by users. Bio text has a maximum length to prevent excessively long profiles. Passwords must meet security requirements including minimum length and complexity. Passwords cannot be changed to the same value without entering the current password. Users can update their display name and bio at any time after registration. When a user deletes their account, all associated articles and comments are also removed. Email addresses are case-insensitive for login purposes. Users must verify their email before full platform access is granted.

### Email Validation Rules

### Email Format Validation

WHEN a user registers with an email address, THE system SHALL:
1. Validate that the email follows standard email format with proper local part, @ symbol, and domain structure
2. Require a valid domain with proper TLD (top-level domain)
3. Reject emails with invalid characters in the local part (before @)
4. Reject emails with multiple @ symbols
5. Reject emails with consecutive dots in the local part
6. Reject emails with dots at the beginning or end of the local part
7. Reject emails with domain parts that are empty or contain invalid characters

IF the email format is invalid, THE system SHALL reject the registration request with an appropriate error message.

### Unique Email Constraint

WHEN a user registers with an email address, THE system SHALL:
1. Check if the email already exists in the system across all active accounts
2. Reject the registration if the email is already registered
3. Allow registration if the email exists only in deleted or inactive accounts (after appropriate cleanup)

WHEN a user updates their email address, THE system SHALL:
1. Verify the new email is not already in use by another active account
2. Reject the update if the email is already registered to another user

IF the email is already registered, THE system SHALL reject the request and inform the user that the email is in use.

### Email Case Insensitivity

WHEN a user logs in with an email address, THE system SHALL:
1. Treat email addresses as case-insensitive for authentication purposes
2. Store email addresses in a consistent case format (lowercase recommended)
3. Match login attempts regardless of the case used in the email

WHEN a user registers with an email address, THE system SHALL:
1. Normalize the email to lowercase before storing
2. Prevent duplicate registrations that differ only in case (e.g., User@Example.com and user@example.com)

### Email Verification Requirement

WHEN a user completes registration, THE system SHALL:
1. Mark the account as unverified
2. Send a verification email to the provided email address
3. Restrict full platform access until email verification is complete
4. Allow limited access for verification purposes only

WHEN a user clicks the verification link, THE system SHALL:
1. Mark the account as verified
2. Grant full platform access to the user
3. Invalidate the verification link after successful use

WHILE a user's email is unverified, THE system SHALL:
1. Prevent access to protected features requiring verified status
2. Allow the user to request a new verification email
3. Display a reminder that email verification is required

### Display Name Validation

### Display Name Requirements

WHEN a user registers or creates a profile, THE system SHALL:
1. Require a display name for all users
2. Validate that the display name is not empty or whitespace-only
3. Validate that the display name meets minimum length requirements
4. Validate that the display name does not exceed maximum length limits
5. Allow display names with letters, numbers, spaces, and common punctuation
6. Reject display names containing only special characters or emojis

WHEN a user updates their display name, THE system SHALL:
1. Validate the new display name against all registration requirements
2. Allow the update if the display name meets all validation criteria
3. Reject the update if the display name fails validation

IF the display name is missing or empty, THE system SHALL reject the request.
IF the display name exceeds the maximum length, THE system SHALL reject the request.
IF the display name contains only special characters, THE system SHALL reject the request.

### Bio Length Validation

### Bio Text Validation

WHEN a user creates or updates their profile bio, THE system SHALL:
1. Allow the bio field to be optional (can be left empty)
2. Validate that the bio does not exceed the maximum length limit
3. Accept any valid text content within the length limit
4. Support multiple languages and special characters in bio text

WHEN a user submits a bio that exceeds the maximum length, THE system SHALL:
1. Reject the submission with an appropriate error message
2. Inform the user of the maximum allowed character count

IF the bio is empty or not provided, THE system SHALL accept the profile without a bio.
IF the bio exceeds the maximum length, THE system SHALL reject the request.

### Password Validation

### Password Complexity Rules

WHEN a user sets or changes their password, THE system SHALL:
1. Require a minimum password length to ensure security
2. Require at least one uppercase letter in the password
3. Require at least one lowercase letter in the password
4. Require at least one numeric digit in the password
5. Require at least one special character in the password
6. Reject passwords that are too common or appear in breach databases
7. Reject passwords that contain the user's email address or display name

IF the password does not meet complexity requirements, THE system SHALL reject the request with specific feedback on which requirements were not met.

### Password Change Validation

WHEN a user changes their password, THE system SHALL:
1. Require the user to enter their current password for verification
2. Validate the current password before allowing the change
3. Prevent changing the password to the same value as the current password
4. Require a new password that meets all complexity requirements
5. Invalidate all existing sessions after password change (optional security measure)

IF the current password is incorrect, THE system SHALL reject the password change request.
IF the new password matches the current password, THE system SHALL reject the request.
IF the new password does not meet complexity requirements, THE system SHALL reject the request.

### Account Deletion Rules

### Account Deletion Cascade

WHEN a user requests account deletion, THE system SHALL:
1. Require explicit confirmation from the user before proceeding
2. Permanently delete all articles written by the user
3. Permanently delete all comments written by the user
4. Remove the user's profile information (display name, bio)
5. Anonymize or remove references to the user in existing content (as appropriate)
6. Delete all file and image attachments associated with the user's articles

WHEN a user's account is deleted, THE system SHALL:
1. Remove the user from any admin request pending status
2. Remove the user from any ban records (or mark as deleted user)
3. Preserve article and comment content visibility if required by policy, or remove as specified
4. Log the account deletion for audit purposes

IF the user has active admin requests, THE system SHALL cancel those requests during deletion.
IF the user is currently banned, THE system SHALL process the ban record appropriately during deletion.

## Section Validation Rules

Section names are required and cannot be empty when created. Section names must be unique across all sections on the platform. Section names have a reasonable character limit for display purposes. Section descriptions are optional and can be left blank. Section descriptions have a maximum length to maintain consistent listing views. Only administrators can create new sections. Only administrators can edit existing section names and descriptions. Only administrators can delete sections from the platform. Users can view all available sections without restrictions. Section names should be descriptive enough to indicate the topic area. Section names cannot contain special characters that would cause display issues.

### Section Creation Validation

WHEN an administrator creates a section, THE system SHALL require a section name.

WHEN an administrator creates a section, THE system SHALL ensure the section name is unique across all sections on the platform.

WHEN an administrator creates a section, THE system SHALL enforce a maximum length limit on the section name.

WHEN an administrator creates a section, THE system SHALL validate that the section name contains only allowed characters.

IF a section name is missing or empty, THE system SHALL reject the creation request.

IF a section name already exists in the system, THE system SHALL reject the creation request with a uniqueness violation.

IF a section name exceeds the maximum length limit, THE system SHALL reject the creation request.

IF a section name contains special characters that would cause display issues, THE system SHALL reject the creation request.

THE system SHALL accept section names with alphanumeric characters, spaces, and common punctuation marks.

THE system SHALL reject section names containing characters that could cause rendering or security issues.

### Section Description Validation

WHEN an administrator creates a section, THE system SHALL allow an optional description.

WHEN an administrator creates or edits a section, THE system SHALL enforce a maximum length limit on the description.

IF a description is provided, THE system SHALL validate it does not exceed the maximum length limit.

IF a description is omitted or left blank, THE system SHALL accept the section creation or update.

THE system SHALL store empty descriptions as null or empty strings.

THE system SHALL allow descriptions to contain text suitable for explaining the section's topic area.

### Section Management Permissions

WHEN a user attempts to create a section, THE system SHALL verify the user has administrator privileges.

WHEN a user attempts to edit an existing section, THE system SHALL verify the user has administrator privileges.

WHEN a user attempts to delete an existing section, THE system SHALL verify the user has administrator privileges.

WHEN a regular user attempts to view the list of sections, THE system SHALL allow access without restrictions.

WHEN a guest attempts to view the list of sections, THE system SHALL allow access without restrictions.

IF a non-administrator attempts to create a section, THE system SHALL reject the request with an authorization error.

IF a non-administrator attempts to edit a section, THE system SHALL reject the request with an authorization error.

IF a non-administrator attempts to delete a section, THE system SHALL reject the request with an authorization error.

THE system SHALL ensure section names are descriptive enough to indicate the topic area.

THE system SHALL maintain section visibility for all users regardless of authentication status.

## Article Validation Rules

Article titles are required and cannot be empty when creating an article. Article titles have a maximum character limit for display in article lists. Article content is required and must contain actual text. Article content has a minimum length to prevent empty or trivial posts. Article content has a maximum length to ensure reasonable page performance. Each article must be assigned to exactly one section. Users cannot create articles without selecting a valid section. Tags are optional but when provided must be non-empty text strings. Multiple tags can be added to a single article. Tags are free-form text without predefined categories. Users can edit their own article title, content, and tags. Users cannot edit articles created by other users. File and image attachments are optional for articles. Users can attach multiple files and images to a single article.

### Article Title Requirements

WHEN a user creates an article, THE system SHALL require a title to be provided.

WHEN a user creates an article, THE system SHALL reject the request if the title is empty or contains only whitespace.

WHEN a user creates an article, THE system SHALL enforce a maximum character limit on the article title for display in article lists.

IF the article title exceeds the maximum character limit, THE system SHALL reject the request and inform the user.

IF the article title is missing during creation, THE system SHALL reject the request with an appropriate error message.

WHEN displaying an article in a list view, THE system SHALL truncate the title if it exceeds the display width while preserving readability.

### Article Content Requirements

WHEN a user creates an article, THE system SHALL require content to be provided.

WHEN a user creates an article, THE system SHALL enforce a minimum character length on the article content to prevent empty or trivial posts.

WHEN a user creates an article, THE system SHALL enforce a maximum character length on the article content to ensure reasonable page performance.

IF the article content is empty or contains only whitespace, THE system SHALL reject the request.

IF the article content is shorter than the minimum length requirement, THE system SHALL reject the request and inform the user.

IF the article content exceeds the maximum length requirement, THE system SHALL reject the request and inform the user.

WHEN a user views an article, THE system SHALL display the full content within performance constraints.

WHILE editing an article, THE system SHALL validate that the updated content meets minimum and maximum length requirements.

### Section Assignment Requirements

WHEN a user creates an article, THE system SHALL require assignment to exactly one section.

WHEN a user creates an article, THE system SHALL validate that the selected section exists and is active.

IF the user does not select a section, THE system SHALL reject the article creation request.

IF the user selects a non-existent section, THE system SHALL reject the article creation request.

WHEN a user views the article creation form, THE system SHALL display the list of available sections for selection.

WHEN displaying an article, THE system SHALL show the section to which the article belongs.

WHEN browsing articles within a section, THE system SHALL display only articles assigned to that section.

### Tag Management Requirements

WHEN a user adds tags to an article, THE system SHALL accept free-form text strings as tags.

WHEN a user adds tags to an article, THE system SHALL allow multiple tags to be attached to a single article.

WHEN a user adds tags to an article, THE system SHALL ensure each tag is a non-empty text string.

WHEN a user adds tags to an article, THE system SHALL enforce uniqueness of tags within the same article (no duplicate tags on one article).

IF a user attempts to add an empty tag, THE system SHALL reject the tag and inform the user.

IF a user attempts to add duplicate tags to the same article, THE system SHALL reject the duplicate and keep the original.

WHEN a user edits an article, THE system SHALL allow modification of the associated tags.

WHEN searching articles, THE system SHALL allow filtering by one or more tags.

WHEN displaying an article, THE system SHALL show all tags associated with the article.

### Article Editing Ownership Requirements

WHEN a user attempts to edit an article, THE system SHALL verify that the user is the original author of the article.

IF the user is not the owner of the article, THE system SHALL reject the edit request and inform the user.

WHEN a user attempts to delete an article, THE system SHALL verify that the user is the original author of the article.

IF the user is not the owner of the article, THE system SHALL reject the delete request and inform the user.

WHEN an administrator attempts to edit or delete an article, THE system SHALL allow the operation regardless of ownership (defined in Administrator Capabilities).

WHEN a user views an article, THE system SHALL display an edit option only if the user owns the article or has administrator privileges.

### Attachment Management Requirements

WHEN a user creates an article, THE system SHALL allow attachment of multiple files to the article.

WHEN a user creates an article, THE system SHALL allow attachment of multiple images to the article.

WHEN a user creates an article, THE system SHALL enforce a maximum limit on the total number of attachments (files and images combined).

IF the user exceeds the maximum attachment limit, THE system SHALL reject the additional attachments and inform the user.

WHEN a user edits an article, THE system SHALL allow modification of existing attachments.

WHEN a user edits an article, THE system SHALL allow removal of existing attachments.

WHEN a user edits an article, THE system SHALL allow adding new attachments.

IF the user is not the owner of the article, THE system SHALL reject any attachment modification requests.

WHEN an article is deleted, THE system SHALL automatically delete all associated file and image attachments.

WHEN a user downloads an attachment, THE system SHALL verify the user has permission to access the article containing the attachment.

## Comment Validation Rules

Comment content is required and cannot be empty when posting. Comment content has a minimum length to prevent trivial or spam comments. Comment content has a maximum length to ensure reasonable display. Comments are single-level only with no nested reply structure. Users can view all comments on an article in chronological order. Comments are sorted by oldest first by default. Users can edit their own comments after posting. Users cannot edit comments created by other users. Users can delete their own comments at any time. Users cannot delete comments created by other users. When editing a comment, the updated timestamp is recorded. Comment content is displayed as plain text with proper formatting.

### Comment Creation Requirements

WHEN a user creates a comment on an article, THE system SHALL:
1. Require comment content to be provided
2. Enforce a minimum character length for comment content to prevent trivial submissions
3. Enforce a maximum character length for comment content to ensure reasonable display
4. Associate the comment with the creating user as the author
5. Link the comment to the target article

IF the comment content is missing, THE system SHALL reject the request.
IF the comment content is below the minimum length threshold, THE system SHALL reject the request.
IF the comment content exceeds the maximum length threshold, THE system SHALL reject the request.

The comment content minimum length and maximum length thresholds are defined in the article content validation rules for consistency.

### Comment Structure and Display

THE system SHALL maintain a single-level comment structure with no nested reply capability.

WHEN viewing comments on an article, THE system SHALL display all comments sorted by oldest first.

THE system SHALL display each comment showing:
1. The author's display name (defined in User Profile)
2. The comment content as plain text with proper formatting
3. The time posted

WHEN the comment content is displayed, THE system SHALL render it as plain text with appropriate line breaks and paragraph formatting preserved.

THE system SHALL NOT allow users to create nested replies or threaded comment structures.

### Comment Modification Rules

WHEN a user edits their own comment, THE system SHALL:
1. Allow modification of the comment content only
2. Record the updated timestamp for the comment
3. Preserve the original author association

WHEN a user deletes their own comment, THE system SHALL:
1. Remove the comment from display
2. Update the comment count on the associated article

IF a user attempts to edit a comment they do not own, THE system SHALL reject the request.
IF a user attempts to delete a comment they do not own, THE system SHALL reject the request.

WHILE a comment exists, THE system SHALL maintain its updated timestamp to reflect the most recent modification.

Administrators (defined in Administrator System) can delete any comment regardless of ownership.

## FileAttachment Validation Rules

File attachments require a valid filename when uploaded. Filenames must not contain path traversal characters for security. File size has a maximum limit to prevent storage abuse. File size is recorded in bytes for accurate tracking. The file path is generated by the system upon upload. File paths must be unique to prevent overwrites. Users can download attached files from their articles. Multiple files can be attached to a single article. File attachments are associated with the article owner. Only the article owner can manage their file attachments. Administrators can delete file attachments when removing articles. File types are validated against allowed formats. File upload failures are reported to users.

### File Filename Validation and Security

WHEN a user uploads a file attachment, THE system SHALL:
1. Require a valid filename to be provided
2. Validate the filename contains only alphanumeric characters, spaces, hyphens, underscores, and file extensions
3. Ensure the filename is not empty or whitespace-only
4. Record the original filename for user reference

IF the filename contains invalid characters, THE system SHALL reject the upload and inform the user.
IF the filename is empty, THE system SHALL reject the upload and inform the user.

### Filename Security Restrictions

WHEN a user uploads a file attachment, THE system SHALL:
1. Block filenames containing path traversal characters (../, ..\, /, \)
2. Block filenames containing null bytes or control characters
3. Sanitize the filename to remove potentially dangerous characters
4. Prevent filenames that could execute code or access system paths

IF a filename contains path traversal characters, THE system SHALL reject the upload and inform the user.
IF a filename contains null bytes, THE system SHALL reject the upload and inform the user.

### File Size Limits and Recording

WHEN a user uploads a file attachment, THE system SHALL:
1. Enforce a maximum file size limit to prevent storage abuse
2. Record the file size in bytes for accurate tracking
3. Display the file size to users when viewing attachments
4. Reject files that exceed the maximum size limit

IF the uploaded file exceeds the maximum size, THE system SHALL reject the upload and inform the user of the size limit.

### File Size Recording

WHEN a file attachment is successfully uploaded, THE system SHALL:
1. Record the exact file size in bytes
2. Store the file size with the attachment metadata
3. Make the file size available for display to users
4. Include the file size in attachment listings

THE system SHALL maintain accurate file size records for all attachments to enable storage tracking and quota management.

### File Path Uniqueness and Multiple Attachments

WHEN a file attachment is uploaded, THE system SHALL:
1. Generate a unique file path for the stored file
2. Ensure no two files share the same path to prevent overwrites
3. Use system-generated identifiers to guarantee path uniqueness
4. Store the file path with the attachment record

IF the generated path already exists, THE system SHALL generate a new unique path.

### Multiple File Attachments

WHEN a user creates or edits an article, THE system SHALL:
1. Allow multiple file attachments to be added to a single article
2. Support uploading multiple files in one operation
3. Display all attached files in the article view
4. Maintain individual file records for each attachment

THE system SHALL enforce a maximum number of file attachments per article to prevent abuse.

### File Download Permissions and Ownership

WHEN a user views an article with file attachments, THE system SHALL:
1. Allow the article owner to download all attached files
2. Allow other users to download attached files if the article is accessible
3. Provide download links for each attached file
4. Display file information (name, size) before download

IF the user does not have permission to access the article, THE system SHALL not show download options.

### File Attachment Ownership

WHEN a user uploads file attachments to an article, THE system SHALL:
1. Associate the attachments with the article owner
2. Allow only the article owner to manage their file attachments
3. Permit the article owner to remove file attachments
4. Restrict other users from modifying the attachments

IF a user is not the article owner, THE system SHALL prevent them from managing the attachments.

Administrators SHALL be able to delete file attachments when removing articles.

### File Type Validation and Upload Failure Handling

WHEN a user uploads a file attachment, THE system SHALL:
1. Validate the file type against a list of allowed formats
2. Check the file extension matches the actual file content
3. Block executable files and other potentially dangerous types
4. Only allow common document, image, and archive formats

IF the file type is not allowed, THE system SHALL reject the upload and inform the user of acceptable formats.

### File Upload Failure Handling

WHEN a file upload fails, THE system SHALL:
1. Report the specific failure reason to the user
2. Preserve any successfully uploaded attachments
3. Allow the user to retry the upload
4. Log the failure for administrative review

IF the upload fails due to network error, THE system SHALL inform the user and allow retry.
IF the upload fails due to server error, THE system SHALL inform the user and log the incident.
IF the upload fails due to validation error, THE system SHALL explain the validation failure to the user.

## ImageAttachment Validation Rules

Image attachments require a valid filename when uploaded. Filenames must not contain path traversal characters for security. Image file size has a maximum limit to prevent storage abuse. Image file size is recorded in bytes for accurate tracking. The image path is generated by the system upon upload. Image paths must be unique to prevent overwrites. Users can download attached images from their articles. Multiple images can be attached to a single article. Image attachments are associated with the article owner. Only the article owner can manage their image attachments. Administrators can delete image attachments when removing articles. Image dimensions are validated for reasonable display sizes. Image formats are validated against allowed types such as JPEG and PNG. Image upload failures are reported to users with clear error messages.

### Image Filename Validation

WHEN a user uploads an image attachment, THE system SHALL validate the filename is present and non-empty.

WHEN a user uploads an image attachment, THE system SHALL reject filenames containing path traversal characters (../, ..\, /, \).

WHEN a user uploads an image attachment, THE system SHALL reject filenames containing null bytes or control characters.

WHEN a user uploads an image attachment, THE system SHALL accept filenames with alphanumeric characters, hyphens, underscores, and dots.

WHEN a user uploads an image attachment, THE system SHALL preserve the original filename extension for format identification.

IF the filename is empty or missing, THE system SHALL reject the upload with an error message indicating filename is required.

IF the filename contains path traversal characters, THE system SHALL reject the upload with a security error message.

IF the filename contains invalid characters, THE system SHALL reject the upload with a format error message.

THE system SHALL sanitize filenames by removing leading and trailing whitespace before storage.

### Image Size and Storage Rules

WHEN an image is uploaded, THE system SHALL enforce a maximum file size limit of 10MB per image.

WHEN an image is uploaded, THE system SHALL record the file size in bytes for storage tracking and display purposes.

WHEN multiple images are attached to an article, THE system SHALL track the cumulative size of all attachments.

WHEN the system generates a storage path, THE system SHALL ensure each image path is unique to prevent file overwrites.

WHEN the system generates a storage path, THE system SHALL use a UUID or timestamp-based naming convention for uniqueness.

IF the image file exceeds the maximum size limit, THE system SHALL reject the upload with a clear size error message.

IF the cumulative size of all attachments exceeds the article limit, THE system SHALL reject additional uploads.

THE system SHALL store the original file size alongside the generated path for reference.

### Image Attachment Access and Ownership

WHEN a user views an article, THE system SHALL display all attached images associated with that article.

WHEN a user downloads an attached image, THE system SHALL verify the user has permission to access the article.

WHEN a user uploads multiple images to an article, THE system SHALL allow up to 10 images per article.

WHEN an image is attached, THE system SHALL associate it with the article owner as the managing user.

WHEN an image is attached, THE system SHALL record the uploading user as the attachment owner.

IF a non-owner user attempts to delete an image attachment, THE system SHALL deny the request with an access error.

IF the article owner attempts to delete their image attachment, THE system SHALL allow the deletion.

IF an administrator deletes an article, THE system SHALL also delete all associated image attachments.

IF a banned user's article is viewed, THE system SHALL still display their image attachments (banning does not hide content).

### Image Format and Dimension Validation

WHEN a user uploads an image, THE system SHALL validate the image dimensions are within acceptable display ranges (minimum 100x100 pixels, maximum 4000x4000 pixels).

WHEN a user uploads an image, THE system SHALL validate the file format against allowed types: JPEG, PNG, GIF, and WebP.

WHEN a user uploads an image, THE system SHALL verify the file extension matches the actual file content type.

WHEN the system processes an image, THE system SHALL reject files that are corrupted or cannot be decoded as valid images.

IF the image dimensions are below the minimum threshold, THE system SHALL reject the upload with a dimension error message.

IF the image dimensions exceed the maximum threshold, THE system SHALL reject the upload with a dimension error message.

IF the file format is not in the allowed list, THE system SHALL reject the upload with a format error message.

IF the file extension does not match the content type, THE system SHALL reject the upload with a format mismatch error.

### Image Upload Error Handling

WHEN an image upload fails, THE system SHALL display a clear error message indicating the specific failure reason.

WHEN an image upload fails due to size limits, THE system SHALL indicate the maximum allowed size in the error message.

WHEN an image upload fails due to format issues, THE system SHALL list the supported image formats in the error message.

WHEN an image upload fails due to server errors, THE system SHALL display a generic error message without exposing technical details.

WHEN multiple images are being uploaded and one fails, THE system SHALL allow the user to retry the failed upload without losing successful uploads.

IF the upload fails due to network interruption, THE system SHALL allow the user to resume or retry the upload.

IF the upload fails due to validation errors, THE system SHALL highlight which specific validation rule was violated.

THE system SHALL log all upload failures for administrative review and troubleshooting purposes.

## AdminRequest Validation Rules

Admin requests require a reason text explaining why the user wants administrator access. The reason field cannot be empty when submitting a request. The reason has a maximum character limit for practical review. Users can only submit one pending admin request at a time. Super administrators can view all pending admin requests. Super administrators can approve requests to grant administrator status. Super administrators can reject requests with optional feedback. Approved requests change the user to regular administrator grade. Rejected requests remain in the system for record purposes. The request status is tracked throughout the approval process. The submission timestamp is recorded for each request. Users cannot submit admin requests if already an administrator.

### Admin Request Submission

WHEN a user submits an administrator access request, THE system SHALL:
1. Require a reason text field explaining the request
2. Validate the reason is not empty before submission
3. Enforce a maximum character limit on the reason text
4. Prevent users from submitting multiple pending requests simultaneously
5. Record the submission timestamp for each request
6. Reject the submission if the user is already an administrator
7. Reject the submission if the user has an existing pending request

IF the reason field is empty, THE system SHALL reject the request submission.
IF the reason exceeds the maximum character limit, THE system SHALL reject the request submission.
IF the user already has a pending admin request, THE system SHALL reject the new request.
IF the user is already an administrator, THE system SHALL reject the request submission.

### Admin Request Approval Workflow

WHEN a super administrator reviews an admin request, THE system SHALL:
1. Display the request reason and submission timestamp
2. Allow approval to grant administrator status
3. Allow rejection with optional feedback text
4. Assign the user to regular administrator grade upon approval
5. Record the review timestamp for approved or rejected requests
6. Update the request status to approved or rejected

WHEN an admin request is approved, THE system SHALL:
1. Change the user's grade to regular administrator
2. Record the approval timestamp
3. Update the request status to approved

WHEN an admin request is rejected, THE system SHALL:
1. Keep the user's current grade unchanged
2. Record the rejection timestamp
3. Update the request status to rejected
4. Allow optional feedback to be stored with the rejection

### Admin Request Management and Viewing

THE system SHALL:
1. Allow super administrators to view all pending admin requests
2. Allow super administrators to view approved and rejected requests for audit purposes
3. Track request status throughout the entire lifecycle (pending, approved, rejected)
4. Record submission timestamp for each request
5. Record review timestamp when requests are approved or rejected
6. Display request reason to super administrators during review
7. Enforce a single pending request limit per user

WHILE a user has a pending admin request, THE system SHALL prevent submission of additional requests.

IF a super administrator views pending requests, THE system SHALL display all requests with status pending.

IF a super administrator views the request list, THE system SHALL display submission timestamps and reasons for review.

## BanRecord Validation Rules

Ban records require a reason text explaining why the user was banned. The reason field cannot be empty when creating a ban record. The reason has a maximum character limit for practical review. The ban timestamp is recorded when the ban takes effect. The administrator who issued the ban is recorded. Banned users cannot log in to the platform immediately. Existing articles and comments remain visible after banning. Administrators can view the ban reason for each banned user. Administrators can unban users by removing the ban record. When unbanned, users regain access to the platform. Ban reasons should be specific and actionable for reference. Multiple ban records cannot exist for the same user simultaneously.

### Ban Creation Validation Rules

WHEN an administrator creates a ban record for a user, THE system SHALL require a reason text field.

WHEN a ban reason is provided, THE system SHALL enforce a maximum character limit of 500 characters.

WHEN a ban record is created, THE system SHALL record the timestamp when the ban takes effect.

WHEN a ban record is created, THE system SHALL record the identifier of the administrator who issued the ban.

THE system SHALL store the ban reason in a format that allows administrators to review it later.

THE system SHALL ensure the ban reason text contains no prohibited content or offensive language.

IF the ban reason field is empty or contains only whitespace, THE system SHALL reject the ban request.

IF the ban reason exceeds 500 characters, THE system SHALL reject the ban request and prompt for a shorter reason.

IF the requesting user is not an administrator, THE system SHALL reject the ban request.

IF the target user is already banned with an active ban record, THE system SHALL reject the creation of a new ban record.

### Ban Enforcement Rules

WHEN a user account is marked as banned, THE system SHALL prevent the user from logging in to the platform.

WHEN a banned user attempts to log in, THE system SHALL deny access and display a ban notification.

WHEN a user is banned, THE system SHALL keep all their existing articles visible to other users.

WHEN a user is banned, THE system SHALL keep all their existing comments visible to other users.

WHEN an administrator views the list of banned users, THE system SHALL display the ban reason for each user.

WHEN a regular member views another user's profile, THE system SHALL NOT display the ban status or reason.

WHEN a guest views content from a banned user, THE system SHALL display the content normally without indicating the author's ban status.

IF a banned user's session is active when the ban is applied, THE system SHALL terminate the session immediately.

IF a user attempts to access the platform while banned, THE system SHALL log the access attempt for audit purposes.

### Ban Management Rules

WHEN an administrator unbans a user, THE system SHALL remove the ban record from the system.

WHEN a ban record is removed, THE system SHALL allow the user to log in to the platform immediately.

WHEN an administrator reviews a ban reason, THE system SHALL display the reason in a readable format.

THE system SHALL require ban reasons to be specific and actionable, describing the violation clearly.

THE system SHALL prevent multiple active ban records from existing for the same user simultaneously.

IF an administrator attempts to create a ban for an already-banned user, THE system SHALL display the existing ban reason instead.

IF an administrator attempts to unban a user who is not banned, THE system SHALL reject the unban request.

WHEN a ban is lifted, THE system SHALL record the unban action with timestamp and administrator identifier.

THE system SHALL maintain a history of all ban and unban actions for audit purposes.

# Filtering, Sorting, and Pagination

List query specifications for filtering, sorting, and pagination.

## List Query Specifications

Define filtering, sorting, and pagination rules for list operations.

### Article List Query

WHEN a user views the article list in a section, THE system SHALL:
1. Display articles belonging to the selected section only
2. Show article title, author, tags, comment count, and time posted for each article
3. NOT display the full article content in the list view
4. Paginate the results according to pagination rules

WHEN filtering articles by section, THE system SHALL:
1. Return only articles that belong to the specified section
2. Include articles from all users (not filtered by ownership)
3. Include articles regardless of author ban status (banned users' articles remain visible)

IF the section does not exist, THE system SHALL return an empty list.
IF the section exists but has no articles, THE system SHALL return an empty list.

### Article Search Query

WHEN a user searches for articles, THE system SHALL:
1. Search across article titles and content
2. Return articles where the search term appears in title OR content
3. Support filtering results by one or more tags
4. Paginate the search results according to pagination rules

WHEN filtering search results by tags, THE system SHALL:
1. Return articles that have ALL specified tags (AND logic)
2. Support filtering by zero tags (no tag filtering applied)
3. Match tags case-insensitively

IF no articles match the search criteria, THE system SHALL return an empty list.
IF the search term is empty, THE system SHALL return all articles in the section (or all articles if no section specified).

### Article Sorting Rules

WHEN users view article lists, THE system SHALL support sorting by:
1. Newest first (articles with most recent creation time appear first)
2. Oldest first (articles with earliest creation time appear first)

WHEN sorting articles by newest first, THE system SHALL:
1. Order articles by creation time in descending order
2. Use article ID as a secondary sort key for articles with identical creation times

WHEN sorting articles by oldest first, THE system SHALL:
1. Order articles by creation time in ascending order
2. Use article ID as a secondary sort key for articles with identical creation times

WHEN sorting search results, THE system SHALL:
1. Apply the same sorting rules as article lists
2. Maintain sort order consistently across pagination

### Pagination Rules

WHEN displaying article lists or search results, THE system SHALL:
1. Support pagination to limit the number of articles per page
2. Return pagination metadata including total count, current page, and page size
3. Support cursor-based pagination for consistent results during scrolling

WHEN using cursor-based pagination, THE system SHALL:
1. Use the last article's creation time and ID as the cursor
2. Return the next page of results when a cursor is provided
3. Return results in the same sort order as the original query
4. NOT skip or duplicate articles when paginating

WHEN the requested page exceeds available results, THE system SHALL:
1. Return the last available page of results
2. Indicate in pagination metadata that no further pages exist

IF pagination parameters are invalid (negative page number, zero or negative page size), THE system SHALL use default values.

### User Profile List Queries

WHEN a user views their profile, THE system SHALL display:
1. A list of all articles written by that user
2. A list of all comments written by that user
3. Both lists separated and independently paginated

WHEN listing user articles, THE system SHALL:
1. Include all articles written by the user across all sections
2. Apply the same sorting and pagination rules as general article lists
3. Show article title, section, tags, comment count, and time posted

WHEN listing user comments, THE system SHALL:
1. Include all comments written by the user across all articles
2. Sort comments by oldest first (as per comment display rules)
3. Show the article title, comment content, and time posted for each comment
4. Apply pagination to the comment list

IF the user has no articles or comments, THE system SHALL display an empty list for that section.

### Admin Management List Queries

WHEN super administrators view pending admin requests, THE system SHALL:
1. Display all requests with status "pending"
2. Sort requests by submission time (newest first)
3. Paginate the results according to pagination rules
4. Show request reason, submitting user, and submission time

WHEN administrators view the banned users list, THE system SHALL:
1. Display all users with active ban status
2. Show each user's display name, ban reason, ban time, and banning administrator
3. Sort by ban time (newest first)
4. Paginate the results according to pagination rules

WHEN filtering admin requests by status, THE system SHALL:
1. Support filtering by pending, approved, and rejected statuses
2. Support filtering by submitting user
3. Apply pagination to filtered results

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### User Account Errors

WHEN a user attempts to sign up with an email that is already registered, THE system SHALL reject the registration request.

WHEN a user attempts to sign up with an invalid email format, THE system SHALL reject the registration request.

WHEN a user attempts to sign up with a password that does not meet complexity requirements, THE system SHALL reject the registration request.

WHEN a user attempts to log in with incorrect credentials, THE system SHALL reject the login request.

WHEN a user attempts to log in while their account is banned, THE system SHALL reject the login request and display the ban reason.

WHEN a user attempts to change their password with an incorrect current password, THE system SHALL reject the password change request.

WHEN a user attempts to delete their account, THE system SHALL permanently remove all their articles, comments, and attachments from the platform.

IF a user's account deletion fails due to system error, THE system SHALL retain the account and notify the user of the failure.

### Authentication and Authorization Errors

WHEN a guest attempts to access a member-only feature without authentication, THE system SHALL redirect to the login page.

WHEN a member attempts to access an administrator-only feature, THE system SHALL deny access and display an authorization error.

WHEN a user's session expires during an operation, THE system SHALL require re-authentication before allowing the operation to proceed.

WHEN a banned user attempts to access any authenticated feature, THE system SHALL block access and display the ban information.

IF authentication validation fails, THE system SHALL NOT reveal whether the email or password was incorrect to prevent enumeration attacks.

### Profile Management Errors

WHEN a user attempts to edit another user's profile, THE system SHALL deny the request.

WHEN a user attempts to set a display name that is empty or contains only whitespace, THE system SHALL reject the profile update.

WHEN a user attempts to set a bio that exceeds the maximum length limit, THE system SHALL reject the profile update.

WHEN a user attempts to view a profile that does not exist, THE system SHALL display a not found error.

IF profile update fails due to concurrent modification, THE system SHALL notify the user and require them to refresh the page.

### Section Management Errors

WHEN a non-administrator attempts to create a section, THE system SHALL deny the request.

WHEN an administrator attempts to create a section with a name that already exists, THE system SHALL reject the section creation.

WHEN an administrator attempts to create a section with an empty name, THE system SHALL reject the section creation.

WHEN an administrator attempts to edit a section that does not exist, THE system SHALL display a not found error.

WHEN an administrator attempts to delete a section that contains articles, THE system SHALL prevent deletion and notify that articles must be removed first.

WHEN a user attempts to browse a section that does not exist, THE system SHALL display a not found error.

### Article Operation Errors

WHEN a user attempts to create an article without a title, THE system SHALL reject the article creation.

WHEN a user attempts to create an article without content, THE system SHALL reject the article creation.

WHEN a user attempts to create an article in a section that does not exist, THE system SHALL reject the article creation.

WHEN a user attempts to edit an article they do not own, THE system SHALL deny the request.

WHEN a user attempts to delete an article they do not own, THE system SHALL deny the request.

WHEN an administrator attempts to delete an article, THE system SHALL permanently remove it from the platform.

WHEN a user attempts to view an article that does not exist, THE system SHALL display a not found error.

WHEN article title exceeds the maximum length limit, THE system SHALL reject the article creation or update.

WHEN article content exceeds the maximum length limit, THE system SHALL reject the article creation or update.

### Comment Operation Errors

WHEN a user attempts to write a comment on an article that does not exist, THE system SHALL reject the comment creation.

WHEN a user attempts to write a comment with empty content, THE system SHALL reject the comment creation.

WHEN a user attempts to edit a comment they do not own, THE system SHALL deny the request.

WHEN a user attempts to delete a comment they do not own, THE system SHALL deny the request.

WHEN an administrator attempts to delete a comment, THE system SHALL permanently remove it from the platform.

WHEN a user attempts to reply to a comment (nested reply), THE system SHALL reject the request as only single-level comments are supported.

IF comment content exceeds the maximum length limit, THE system SHALL reject the comment creation or update.

### File and Image Attachment Errors

WHEN a user attempts to attach more files than the maximum allowed per article, THE system SHALL reject the additional attachments.

WHEN a user attempts to attach a file that exceeds the maximum size limit, THE system SHALL reject the file upload.

WHEN a user attempts to attach a file with an unsupported content type, THE system SHALL reject the file upload.

WHEN a user attempts to download a file that does not exist, THE system SHALL display a not found error.

WHEN a user attempts to download a file attached to an article they cannot access, THE system SHALL deny the request.

WHEN a user attempts to attach an image that exceeds the maximum size limit, THE system SHALL reject the image upload.

WHEN a user attempts to attach an image with an unsupported format, THE system SHALL reject the image upload.

WHEN file attachment fails due to storage error, THE system SHALL notify the user and allow retry.

IF a file fails virus scan, THE system SHALL reject the upload and notify the user.

### Search and Listing Errors

WHEN a user searches with an empty query, THE system SHALL return no results.

WHEN a search query exceeds the maximum length limit, THE system SHALL reject the search request.

WHEN a user requests a page number that exceeds the available results, THE system SHALL return the last page or empty results.

WHEN a user requests an invalid sort option, THE system SHALL default to newest first.

WHEN filtering articles by a tag that does not exist, THE system SHALL return no results.

WHEN article list pagination parameters are invalid (negative page number, zero page size), THE system SHALL return an error.

### Admin Request Errors

WHEN a user submits an admin request with an empty reason, THE system SHALL reject the request.

WHEN a user submits an admin request while already having a pending request, THE system SHALL reject the new request.

WHEN a super administrator attempts to approve an admin request that does not exist, THE system SHALL display a not found error.

WHEN a super administrator attempts to reject an admin request that does not exist, THE system SHALL display a not found error.

WHEN a regular administrator attempts to approve or reject admin requests, THE system SHALL deny the request.

WHEN a user attempts to submit an admin request reason that exceeds the maximum length limit, THE system SHALL reject the request.

### Administrator Grade Management Errors

WHEN a super administrator attempts to promote a user who is already a super administrator, THE system SHALL deny the request.

WHEN a super administrator attempts to demote themselves, THE system SHALL deny the request.

WHEN a regular administrator attempts to promote or demote other administrators, THE system SHALL deny the request.

WHEN a super administrator attempts to promote a user who is not an administrator, THE system SHALL reject the request.

WHEN a super administrator attempts to demote a user who is already a regular administrator, THE system SHALL reject the request.

IF administrator grade change fails due to concurrent modification, THE system SHALL notify the super administrator and require confirmation.

### Ban and Unban Errors

WHEN an administrator attempts to ban a user who is already banned, THE system SHALL reject the ban request.

WHEN an administrator attempts to ban a user without providing a reason, THE system SHALL reject the ban request.

WHEN an administrator attempts to ban themselves, THE system SHALL deny the request.

WHEN an administrator attempts to unban a user who is not banned, THE system SHALL reject the unban request.

WHEN a non-administrator attempts to ban or unban users, THE system SHALL deny the request.

WHEN a non-administrator attempts to view the list of banned users, THE system SHALL deny the request.

WHEN an administrator attempts to ban a user with a reason exceeding the maximum length limit, THE system SHALL reject the ban request.

WHEN a banned user's articles and comments remain visible, THE system SHALL ensure they display normally without indicating the user is banned to other users.

### System Failure Cases

WHEN the system encounters a database connection failure, THE system SHALL display a generic error message and log the details.

WHEN the system encounters an external service failure (e.g., file storage), THE system SHALL gracefully degrade and notify affected users.

WHEN concurrent updates occur on the same resource, THE system SHALL detect the conflict and notify users to retry.

WHEN a file upload fails due to network interruption, THE system SHALL allow the user to resume or retry the upload.

WHEN the system experiences high load causing slow response times, THE system SHALL queue requests and process them in order.

IF any critical system error occurs, THE system SHALL log the error details for administrative review while displaying a user-friendly error message.

# File Validation Rules

Validation rules and policies for file uploads and storage.

## File Validation and Policies

Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

### #### File Upload Validation

WHEN a user uploads a file attachment to an article, THE system SHALL:
1. Validate the file type against approved content types
2. Verify the file size does not exceed the maximum limit
3. Ensure the filename does not contain path traversal characters
4. Record the file size and filename upon successful upload

WHEN a user uploads an image attachment to an article, THE system SHALL:
1. Validate the image format against approved image content types
2. Verify the image file size does not exceed the maximum limit
3. Ensure the filename does not contain path traversal characters
4. Record the image size and filename upon successful upload

WHEN the file content type does not match an approved type, THE system SHALL reject the upload and notify the user.

WHEN the file size exceeds the maximum limit, THE system SHALL reject the upload and notify the user.

WHEN the filename contains invalid characters, THE system SHALL reject the upload and notify the user.

THE system SHALL support the following file content types for file attachments:
- Document formats (PDF, DOC, DOCX, TXT)
- Archive formats (ZIP, RAR)

THE system SHALL support the following image content types for image attachments:
- JPEG/JPG
- PNG
- GIF
- WebP

### Virus Scanning Requirements

WHEN a file or image attachment is uploaded, THE system SHALL scan the file for viruses before accepting it.

WHEN a virus is detected in an uploaded file, THE system SHALL:
1. Reject the upload
2. Notify the user that the file was rejected due to security concerns
3. Log the security event for administrator review

WHILE a file is being scanned, THE system SHALL prevent the file from being attached to any article.

IF the virus scan service is unavailable, THE system SHALL:
1. Queue the file for scanning
2. Temporarily mark the attachment as pending verification
3. Prevent the attachment from being downloaded until verification completes

THE system SHALL quarantine files that are confirmed to contain viruses.

THE system SHALL maintain a log of all virus scan results including:
- File name
- Scan timestamp
- Scan result (clean/quarantined)
- User who uploaded the file

### File Retention Policy

WHEN an article is deleted, THE system SHALL delete all file and image attachments associated with that article.

WHEN a user account is deleted, THE system SHALL delete all articles written by that user and all associated file and image attachments.

THE system SHALL retain file and image attachments as long as the parent article exists and is accessible.

IF a file attachment becomes orphaned (parent article or user deleted), THE system SHALL schedule it for deletion within 24 hours.

THE system SHALL provide administrators with the ability to view storage usage statistics per user.

THE system SHALL enforce storage quotas per user if configured by administrators.

WHEN storage quota is exceeded, THE system SHALL:
1. Prevent new file or image uploads
2. Notify the user that they have exceeded their storage limit
3. Suggest deleting old articles or attachments to free space

THE system SHALL archive inactive attachments (not accessed for 12 months) to reduce active storage usage.

IF an archived attachment is requested, THE system SHALL restore it before allowing download.