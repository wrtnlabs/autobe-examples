**discussionBoard — What operations users can perform, use cases, business workflows**

What operations users can perform, use cases, business workflows

# Core Business Operations

What the system must do for each business concept.

## User Operations

Users register an account by providing a unique email and secure password. After email verification, users can log in to the platform. Registered users can view and edit their own profile, including display name and bio. Users may delete their account, which permanently removes all associated articles and comments. When attempting to register with an email already in use, the system rejects the request. Users can change their password at any time after authentication. Deletion requires explicit confirmation and triggers cascade removal of all user-generated content.

### User Registration

WHEN a user registers, THE system SHALL:
1. Require a unique email address
2. Require a password meeting minimum security requirements
3. Require a display name (1-100 characters)
4. Create a user account with role 'member'
5. Generate an email verification token

IF the email address is already in use, THE system SHALL reject the registration request.
IF the password does not meet security requirements, THE system SHALL reject the registration request.
IF the display name exceeds 100 characters, THE system SHALL reject the registration request.

A user account remains inactive until email verification is completed.
WHEN email verification is completed, THE system SHALL activate the user account.

### Account Verification

WHEN a user clicks the email verification link, THE system SHALL:
1. Validate the verification token
2. Mark the account as verified
3. Enable account login functionality

WHEN an unverified account's verification token expires, THE system SHALL:
1. Invalidate the verification token
2. Allow the user to request a new verification email

WHEN a user requests a verification email re-send, THE system SHALL:
1. Generate a new verification token
2. Send the verification email to the registered address

THE system SHALL reject verification attempts with expired or invalid tokens.

### Password Management

WHEN a user changes their password, THE system SHALL:
1. Require the current password for authentication
2. Require a new password meeting security requirements
3. Verify the new password confirmation matches
4. Update the password hash

IF the current password is incorrect, THE system SHALL reject the password change request.
IF the new password does not meet security requirements, THE system SHALL reject the password change request.
IF the new password confirmation does not match, THE system SHALL reject the password change request.

WHEN a user has been banned, THE system SHALL prevent password changes until the ban is lifted.

### Profile Editing

WHEN a user edits their profile, THE system SHALL:
1. Allow updating the display name (1-100 characters)
2. Allow updating the bio text
3. Maintain all other profile information

IF the display name exceeds 100 characters, THE system SHALL reject the profile update.
IF the display name is empty after trimming, THE system SHALL reject the profile update.

WHILE a user is banned, THE system SHALL prevent profile editing.

### Account Deletion

WHEN a user deletes their account, THE system SHALL:
1. Verify account ownership through authentication
2. Remove the user account record
3. Delete all articles created by the user
4. Delete all comments created by the user
5. Delete all file attachments associated with the user's articles
6. Delete all administrator requests created by the user
7. Remove the user from the list of banned users

IF the user is currently banned, THE system SHALL allow account deletion but record the deletion.

AFTER account deletion, THE system SHALL NOT restore any associated content.

WHEN a user initiates account deletion, THE system SHALL require explicit confirmation to prevent accidental deletion.

## Section Operations

Administrators create new discussion sections by specifying a unique name and descriptive text. Users can view the list of all available sections and browse articles within any section. Section names must be unique and are used for organizational purposes. Administrators can edit section details including name and description. Sections can be deleted only when no articles remain attached. When deleting a section, associated articles are not automatically reassigned and become orphaned. Section listing is ordered by creation time.

### Section Creation

WHEN an administrator creates a section, THE system SHALL:
1. Require a unique name between 1-100 characters
2. Require a description text field
3. Record the creation timestamp
4. Associate the section with the creating administrator

IF the section name already exists, THE system SHALL reject the request.
IF the name length is outside 1-100 characters, THE system SHALL reject the request.

### Section Listing

WHEN a user requests the list of all sections, THE system SHALL:
1. Return all sections ordered by creation time (newest first)
2. Include section name and description for each
3. Include the number of articles in each section
4. Support pagination with configurable page size

WHERE pagination is used, THE system SHALL provide total count and current page information.

### Section Editing

WHEN an administrator edits a section, THE system SHALL:
1. Allow updating the section name and description
2. Preserve existing article associations
3. Record the update timestamp
4. Ensure the new name remains unique across all sections

IF the new section name already exists, THE system SHALL reject the request.
IF no changes are made to the section, THE system SHALL not update the timestamp.

### Section Deletion

WHEN an administrator deletes a section, THE system SHALL:
1. Verify the section exists
2. Allow deletion only if no articles are associated with the section
3. Remove all section metadata from the system
4. Preserve existing articles that were associated with the deleted section (orphan them)

IF articles exist in the section, THE system SHALL reject the deletion request.
WHEN a section is deleted, THE system SHALL mark associated articles as orphaned with a null section reference.

### Name Uniqueness Requirement

THE system SHALL enforce section name uniqueness across all sections.
IF a section name already exists when creating or updating, THE system SHALL reject the operation.
IF the name length is outside 1-100 characters, THE system SHALL reject the operation.

WHERE an administrator attempts to rename a section to an existing name, THE system SHALL reject the change and preserve the original section details.

### Administrator-Only Operations

ONLY administrators can perform the following section operations:
1. Create new sections
2. Edit existing sections
3. Delete sections

WHERE a non-administrator user attempts to create, edit, or delete a section, THE system SHALL reject the request.

GUEST and MEMBER users can only view sections and browse articles within sections.

## Article Operations

Users create articles by selecting a section and providing a title and content. Articles may include multiple file attachments and images. Users can assign multiple tags to articles using free-text input. After creation, users can edit their own articles, including title, content, attachments, and tags. Users may delete articles they authored. When deleting an article, all associated comments and attachments are also removed. Article listings display only title, author, tags, comment count, and time posted. Full content is visible only on the article detail page.

### Article Creation

WHEN a user creates an article, THE system SHALL:
1. Require a title
2. Require content in text format
3. Require selection of one section
4. Allow optional file attachments
5. Allow optional image uploads
6. Allow optional tag assignments
7. Record the current timestamp as creation time
8. Associate the article with the creating user

THE system SHALL reject the request when the title is missing or empty.
THE system SHALL reject the request when the content is missing or empty.
THE system SHALL reject the request when no section is selected.
THE system SHALL reject the request when the user does not have access to the selected section.

### Section Selection

WHEN a user selects a section for their article, THE system SHALL:
1. Present all available sections
2. Show each section's name and description
3. Ensure only one section is selected per article
4. Validate the section exists and is active

THE system SHALL reject the request when the user selects a section that does not exist.
THE system SHALL reject the request when the user attempts to post to a section they do not have access to.

### File and Image Attachments

WHEN a user attaches files or images to an article, THE system SHALL:
1. Allow multiple file attachments
2. Allow multiple image uploads
3. Record each attachment's filename, size, file type, and upload timestamp
4. Store attachments with references to the parent article
5. Support both document files and image files

WHEN an article is saved or published, THE system SHALL:
1. Associate all attached files and images with the article
2. Allow users to reference attachments in the article content

THE system SHALL reject the request when any file exceeds the maximum file size limit defined for the system.
THE system SHALL reject the request when any file type is not permitted for uploads.

### Article Deletion and Content Visibility

WHEN a user deletes their own article, THE system SHALL:
1. Remove the article from the system
2. Delete all associated comments on the article
3. Delete all file attachments associated with the article
4. Delete all image attachments associated with the article
5. Remove all tag associations for the article
6. Preserve the article's existence in historical records for audit purposes

WHEN an article is deleted by an administrator, THE system SHALL:
1. Remove the article from public view
2. Preserve all comments, attachments, and tag associations for administrator review

THE system SHALL prevent deletion of an article by a user who is not the original author.
THE system SHALL prevent deletion of an article if it violates system integrity requirements.

## Comment Operations

Users write comments on articles, providing content text. Comments appear directly on the article page and are sorted by oldest first. Users can view all comments on any article. Authors may edit or delete their own comments, including updating content and timestamp. Comments are single-level only with no nesting allowed. When a user account is deleted, all their comments remain but are attributed to a removed user. Administrators can delete any comment regardless of authorship.

### Comment Writing

WHEN a user writes a comment, THE system SHALL:
1. Require the user to be logged in
2. Require association with an existing article
3. Require non-empty content text
4. Record the creation timestamp
5. Associate the comment with the authenticated user

IF the user is not logged in, THE system SHALL reject the comment.
IF the article does not exist, THE system SHALL reject the comment.
IF the comment content is empty, THE system SHALL reject the comment.

### Comment Viewing

WHEN a user views an article page, THE system SHALL:
1. Display all comments associated with that article
2. Show each comment's author name, content, and posting time
3. Show comments sorted chronologically from oldest to newest

THE system SHALL continue to display comments even if the comment author's account is deleted.

### Comment Editing

WHEN a user edits their own comment, THE system SHALL:
1. Require the user to be the original author
2. Allow content updates with new timestamp
3. Maintain the original posting time

IF the user attempts to edit another user's comment, THE system SHALL reject the request.
IF the comment content is unchanged, THE system SHALL reject the request.

### Comment Deletion

WHEN a user deletes their own comment, THE system SHALL:
1. Verify the user is the original author
2. Remove the comment from display

WHEN an administrator deletes any comment, THE system SHALL:
1. Remove the comment from display regardless of authorship
2. Record the administrator's action for audit purposes

THE system SHALL retain comments associated with an article even when the author's account is deleted.

### Author Ownership Verification

WHEN a user attempts to edit or delete a comment, THE system SHALL:
1. Verify the user is logged in
2. Confirm the user is the original author of the comment

IF verification fails, THE system SHALL reject the request.

Administrators are exempt from authorship verification for deletion.

### Comment Sorting

WHEN comments are displayed, THE system SHALL:
1. Sort all comments chronologically by creation time
2. Display oldest comments first
3. Maintain sort order regardless of subsequent edits

THE system SHALL NOT apply any other sorting criteria beyond chronological order.

### No Nested Replies

WHEN a user attempts to reply to a comment, THE system SHALL:
1. Reject the request with an error indicating nested replies are not supported
2. Only accept comment responses at the article level

THE system SHALL treat all comments as single-level entries associated directly with their article.

### Administrator Override

WHEN an administrator performs any comment operation, THE system SHALL:
1. Allow administrators to delete any comment regardless of authorship
2. Allow administrators to view all comments on the platform

THE system SHALL differentiate administrator privileges from regular user permissions in comment operations.

## FileAttachment Operations

Users attach files to articles during creation or editing. Each attachment includes filename, URL, and file size. Users can download attached files from article detail pages. Files cannot be edited after upload; deletion removes the entire attachment record. Each file attachment is tied to exactly one article. When an article is deleted, all associated file attachments are removed. Users can attach multiple files per article. File listing is derived from article context rather than standalone.

### File Attachment Creation

WHEN a user attaches a file to an article, THE system SHALL:
1. Require a valid file upload with filename
2. Store the file URL for retrieval
3. Record the file size in bytes
4. Store the file type (MIME type)
5. Capture the upload timestamp
6. Associate the file with the current article

IF the user exceeds the maximum number of attachments per article, THE system SHALL reject the request.
IF the user attempts to attach a file to an article they do not own, THE system SHALL reject the request.
IF the file size exceeds the permitted limit, THE system SHALL reject the request.

### File Download

WHEN a user requests to download an attached file, THE system SHALL:
1. Verify the user has access to the article
2. Return the file content using the stored file URL
3. Set appropriate headers for file delivery

IF the requested file does not exist, THE system SHALL reject the request.
IF the user does not have permission to access the article, THE system SHALL reject the request.

### File Listing

WHEN retrieving files attached to an article, THE system SHALL:
1. Return all files associated with the article
2. Include filename, file size, file type, and upload timestamp for each file
3. Exclude files from deleted articles

FILES are listed in the order they were uploaded.

WHERE a user searches for attachments, THE system SHALL filter files by filename.

### File Deletion

WHEN a user deletes an attachment, THE system SHALL:
1. Remove the file attachment record from the system
2. Delete the associated file content
3. Update the article's attachment count

WHEN an article is deleted, THE system SHALL automatically delete all associated file attachments.

IF a user attempts to delete a file attachment they do not own, THE system SHALL reject the request.

### Article Association

WHEN a file is attached to an article, THE system SHALL:
1. Link the file to exactly one article
2. Store the relationship between the file and article
3. Prevent association with multiple articles

IF an attempt is made to change the article association after creation, THE system SHALL reject the request.

WHEN an article is moved to a different section, THE system SHALL preserve all file attachments.

### Multiple Attachments Per Article

WHEN a user attaches multiple files to an article, THE system SHALL:
1. Support the attachment of multiple files in a single operation
2. Maintain separate records for each file
3. Preserve the order of attachment

THE system SHALL enforce a maximum number of attachments per article.

WHILE multiple files are being attached, THE system SHALL ensure all attachments are associated with the same article.

### Filename Storage

WHEN a file is attached, THE system SHALL:
1. Store the original filename provided by the user
2. Preserve the filename format and characters
3. Not modify the filename during storage

WHERE a filename already exists, THE system SHALL allow duplicate filenames as long as they belong to different articles.

THE system SHALL preserve the filename when displaying file listings.

### File URL Management

WHEN a file is attached, THE system SHALL:
1. Generate and store a unique file URL for retrieval
2. Ensure the URL is stable and persistent
3. Not change the URL when other file properties are updated

WHERE file content is updated or replaced, THE system SHALL generate a new file URL.

THE system SHALL validate all file URLs are properly formatted before storage.

## Tag Operations

Users assign free-text tags to articles using simple keyword input. Tags are displayed with article listings and used for filtering search results. Each tag must be between 1 and 50 characters. Tags are not created as separate entities but referenced directly through article association. Users can search articles by tag name. Tag lists show frequency of use and are ordered alphabetically. Tag names are case-insensitive for searching but preserved in display.

### Tag Assignment to Articles

WHEN a user creates or edits an article, THE system SHALL:
1. Allow the user to assign multiple free-text tags to the article
2. Require each tag name to be between 1 and 50 characters (defined in Tag entity)
3. Accept tag names as free text input without prior creation
4. Associate each tag with the article through an ArticleTag relationship
5. Record the timestamp when each tag is assigned (defined in ArticleTag.assignedAt)

IF a tag name is empty (0 characters) or exceeds 50 characters, THE system SHALL reject the tag assignment.
IF a user attempts to assign tags to a non-existent article, THE system SHALL reject the assignment.

### Tag Listing in Article Lists

WHEN users view an article list in a section, THE system SHALL:
1. Display the list of tags assigned to each article
2. Show the tags as they were assigned (preserving original case)
3. Order the displayed tags alphabetically by name

WHERE tags are displayed, THE system SHALL show only the tag name, not internal metadata.

### Tag Search Functionality

WHEN a user searches for articles by tag, THE system SHALL:
1. Perform case-insensitive matching of the search term to tag names
2. Return articles associated with tags that match the search term
3. Support partial matching of tag names (e.g., searching "pol" finds "politics")
4. Return paginated search results

WHERE the search term is provided, THE system SHALL convert it to lowercase for comparison while preserving original tag casing in display.

### Tag-Based Filtering

WHEN a user filters articles by tag, THE system SHALL:
1. Show only articles that have the specified tag assigned
2. Support filtering by multiple tags (articles must match ALL specified tags)
3. Return paginated filtered results
4. Display the filter criteria applied in the user interface

### Tag Character Length Validation

WHEN a user creates, edits, or assigns a tag, THE system SHALL:
1. Reject tag names that are empty (0 characters)
2. Reject tag names that exceed 50 characters
3. Count characters using standard Unicode character count
4. Validate length before associating the tag with any article

IF a tag name fails length validation, THE system SHALL reject the operation and indicate the maximum length requirement.

### Tag Case-Insensitive Search Behavior

WHEN searching for tags or articles by tag name, THE system SHALL:
1. Normalize both the search term and stored tag names to lowercase for comparison
2. Preserve the original case of tag names in all display contexts
3. Return matches regardless of case differences (e.g., "Politics" matches "politics")
4. Sort search results by relevance, then alphabetically by tag name

WHERE tag names are displayed in search results, THE system SHALL show them with their original casing.

### Tag Frequency Tracking

THE system SHALL:
1. Track the total number of articles associated with each tag
2. Update the frequency count whenever an ArticleTag relationship is created or removed
3. Maintain an accurate count even when articles are soft-deleted or their tags are changed

WHERE tag lists are displayed, THE system SHALL show the frequency count alongside each tag name.

### Tag Alphabetical Ordering

WHEN listing tags in any context (article lists, search results, tag clouds), THE system SHALL:
1. Order tags alphabetically by name (case-insensitive sorting)
2. Sort by normalized lowercase names while preserving original case in display
3. Apply consistent ordering across all tag listing features
4. Handle special characters according to standard Unicode collation rules

## ArticleTag Operations

ArticleTag records link articles to their assigned tags when authors create or edit articles. Each article can have multiple tag associations created automatically during article operations. The assignment timestamp records when each tag was applied to the article. ArticleTag records are deleted when the associated article is removed. Users cannot directly manage ArticleTag records outside of article operations. Tag associations are listed alongside article details. Tag assignment is not modifiable after article creation except through article editing.

### Tag Association Creation

WHEN an author creates or edits an article, THE system SHALL create ArticleTag records that link the article to each assigned tag.

WHEN the article includes a tag that doesn't exist, THE system SHALL create the new tag record first, then create the ArticleTag record.

THE system SHALL record the exact timestamp when each tag association is created.

THE system SHALL associate each ArticleTag record with both the article and the tag.

WHEN tags are assigned to an article, THE system SHALL create separate ArticleTag records for each tag.

### Tag Association Management

WHEN an article is edited and tags are changed, THE system SHALL create new ArticleTag records for added tags and remove ArticleTag records for deleted tags.

WHEN an author attempts to modify a tag association directly outside of article operations, THE system SHALL reject the request.

THE system SHALL preserve the original assignment timestamp for existing ArticleTag records when other tags are added or removed.

WHEN an article has multiple tag associations, THE system SHALL maintain each association's distinct assignment timestamp.

WHEN the same tag is reassigned to an article after being removed, THE system SHALL create a new ArticleTag record with a new assignment timestamp.

### Tag Association Deletion

WHEN an article is deleted, THE system SHALL delete all associated ArticleTag records.

WHEN an article is deleted, THE system SHALL NOT delete the associated tag records.

WHEN an author deletes their account, THE system SHALL delete all associated ArticleTag records for their articles.

WHEN an administrator deletes an article, THE system SHALL delete all associated ArticleTag records for that article.

WHEN a tag is no longer associated with any articles, THE system SHALL retain the tag record for potential future use.

## AdministratorRequest Operations

Users submit administrator requests with a reason explaining their qualification. Requests start in pending status and require review by super administrators. Super administrators can view lists of pending, approved, and rejected requests. When approved, users gain administrator capabilities immediately. Super administrators can approve, reject, or re-open pending requests. Rejected requests cannot be modified but may be resubmitted. Request history is maintained for audit purposes. Status changes are recorded with timestamps.

### Administrator Request Submission

WHEN a member submits an administrator request, THE system SHALL:
1. Require a reason explaining their qualification
2. Set the request status to "pending"
3. Record the submission timestamp
4. Link the request to the submitting user

IF the reason is empty, THE system SHALL reject the request.
IF a user already has a pending administrator request, THE system SHALL reject the new request.
IF a banned user attempts to submit a request, THE system SHALL reject the request.

### Pending Request Status

WHEN an administrator request is submitted, THE system SHALL:
1. Assign status "pending" automatically
2. Make the request visible to super administrators
3. Block the submitting user from performing other administrator operations until resolved

WHILE a request has "pending" status, THE system SHALL:
1. Allow super administrators to view the request details
2. Prevent the user from submitting additional requests
3. Block the user from gaining administrator capabilities

IF a request is not in "pending" status, THE system SHALL not allow reprocessing.

### Super Administrator Review Process

WHEN a super administrator reviews an administrator request, THE system SHALL:
1. Allow viewing of the submission reason and user profile
2. Enable selection of approval or rejection actions
3. Require justification when rejecting
4. Record the review timestamp and processing user

IF a regular administrator attempts to review a request, THE system SHALL block the action.
IF a super administrator attempts to review their own request, THE system SHALL block the action.

### Approval Workflow

WHEN a super administrator approves an administrator request, THE system SHALL:
1. Update the request status to "approved"
2. Immediately promote the user to "admin" role
3. Record the approval timestamp
4. Preserve the original submission reason for audit

WHEN a user's administrator request is approved, THE system SHALL:
1. Grant the user administrator capabilities
2. Allow the user to perform administrator operations
3. Maintain their original member capabilities

WHERE a request is approved, THE system SHALL:
1. Log the administrator grade change event
2. Update the user's role in the system
3. Enable the user to view the administrator dashboard

## BanRecord Operations

Administrators ban users by creating a ban record with a reason for the action. Banned users cannot log in to the platform. Existing articles and comments remain visible under the banned user's account. Administrators can unban users by recording an unban timestamp. Ban records are listable and show ban reason, timestamp, and unbanned status. When unbanning, the original ban reason remains visible in historical records. Users cannot initiate their own ban or appeal through the system. Ban lists are accessible only to administrators.

### User Banning

WHEN an administrator bans a user, THE system SHALL:
1. Require a ban reason to be provided
2. Create a BanRecord associated with the banned user
3. Set the bannedAt timestamp to the current datetime
4. Set the status to "banned" (implied by having unbannedAt as null)
5. Record the administrator who created the ban

IF the ban reason is empty, THE system SHALL reject the request.
IF the user is already banned, THE system SHALL reject the request.
IF the user attempts to ban themselves, THE system SHALL reject the request.

### Login Prevention

WHEN a banned user attempts to log in, THE system SHALL:
1. Check if the user has an active ban (unbannedAt is null)
2. Reject the login attempt
3. Return an appropriate error message indicating the account is banned

WHILE a user is banned, THE system SHALL:
1. Prevent authentication with any credentials
2. Not issue session tokens or authentication tokens
3. Not allow password reset flows associated with the banned account

IF a user's ban is lifted (unbanned), THEN they MAY log in again.

### Content Preservation

WHEN a user is banned, THE system SHALL:
1. Preserve all existing articles written by the banned user
2. Preserve all existing comments written by the banned user
3. Maintain the visible authorship of articles and comments
4. Not delete or hide the user's content

WHILE a user is banned, THE system SHALL:
1. Allow other users to view the banned user's articles
2. Allow other users to view the banned user's comments
3. Display the user's profile information as it existed at the time of banning
4. Allow comments on the banned user's articles

THE system SHALL NOT:
1. Remove or anonymize content when a user is banned
2. Hide the authorship of articles or comments due to banning
3. Delete or archive content as a consequence of banning

# Business Actions and Workflows

Business actions and workflows beyond basic CRUD.

## User Actions

Users sign up by providing email and password to create an account. After registration, users log in with their credentials to access the platform. Users can change their password at any time from their profile settings. When users choose to delete their account, all articles and comments they have created are also removed from the system. Users can view and edit their profile information, including display name and bio text. Users can browse other users' profiles to see their display name, bio, articles, and comments. Administrative actions like banning users are performed exclusively by authorized administrators.

### User Registration

WHEN a new user signs up, THE system SHALL:
1. Require a valid email address
2. Require a password that meets minimum security requirements
3. Create a new user account with the provided information
4. Set the initial user role to "member"
5. Store the account creation timestamp

WHEN a user provides an email address that already exists in the system, THE system SHALL reject the registration request.

WHEN a user submits a registration request with invalid email format, THE system SHALL reject the request.

### Account Login

WHEN a user logs in with valid credentials, THE system SHALL:
1. Authenticate the user using email and password
2. Create an active session for the user
3. Return a success response

WHEN a banned user attempts to log in, THE system SHALL reject the login request and prevent session creation.

WHEN a user provides incorrect credentials, THE system SHALL reject the login request and show an appropriate error message.

### Password Change

WHEN a user requests to change their password, THE system SHALL:
1. Require the current password for verification
2. Require a new password that meets minimum security requirements
3. Validate that the new password is different from the current password
4. Update the password securely

WHEN a user submits a new password that matches their current password, THE system SHALL reject the request.

WHEN a user submits an incorrect current password, THE system SHALL reject the password change request.

### Account Deletion

WHEN a user deletes their account, THE system SHALL:
1. Remove all articles created by the user
2. Remove all comments created by the user
3. Remove the user account record
4. Terminate any active sessions for the user

WHEN account deletion is completed, THE system SHALL no longer display the user's profile or any content associated with that account.

### Profile Viewing

WHEN a user views another user's profile, THE system SHALL:
1. Display the profile owner's display name
2. Display the profile owner's bio
3. Display a list of all articles written by the profile owner
4. Display a list of all comments written by the profile owner
5. Show the number of articles and comments for quick reference

WHEN a user views their own profile, THE system SHALL indicate that it is their own profile.

### Profile Editing

WHEN a user edits their profile, THE system SHALL:
1. Allow the user to update their display name (1-100 characters)
2. Allow the user to update their bio text
3. Save the updated information to the user record

WHEN a user updates their profile, THE system SHALL retain the user's existing articles and comments associated with their account.

WHEN a user provides an empty display name, THE system SHALL reject the profile update request.

### User Banning

WHEN an administrator bans a user, THE system SHALL:
1. Record the ban reason provided by the administrator
2. Set the banned user's status to "banned"
3. Prevent the banned user from logging in
4. Preserve the banned user's existing articles and comments for continued visibility

WHEN an administrator unbans a user, THE system SHALL:
1. Record the unban reason
2. Restore the user's ability to log in
3. Remove the ban status from the user

WHEN a banned user attempts to log in, THE system SHALL reject the request and indicate the account is banned.

## Section Actions

Users can view the complete list of available sections on the discussion board. Each section displays its name and description to help users navigate to relevant topics. Users can browse articles within any section to read discussions in their areas of interest. Administrators have the authority to create new sections with custom names and descriptions. Existing sections can be edited or deleted by administrators as needed. Section management is restricted to administrators only; regular users cannot modify sections.

### Section Listing and Browsing

WHEN a user views the list of sections, THE system SHALL:
1. Display each section's name and description
2. Present sections in alphabetical order by name
3. Include all active sections

WHERE a user is browsing articles, THE system SHALL:
1. Allow filtering articles by selecting a section
2. Show only articles belonging to the selected section
3. Maintain section context during article browsing

WHEN a user browses articles in a section, THE system SHALL:
1. Show the section name and description at the top
2. Display paginated article list for that section
3. Sort articles by newest first by default
4. Allow switching between newest first and oldest first sort order

### Section Creation

WHEN a super administrator creates a new section, THE system SHALL:
1. Require a unique section name between 1-100 characters
2. Require a section description
3. Record the creation timestamp
4. Associate the section with the creating administrator

IF a section with the same name already exists, THE system SHALL reject the request.
IF the section name exceeds 100 characters, THE system SHALL reject the request.
IF the section name is empty, THE system SHALL reject the request.

### Section Editing

WHEN a super administrator edits an existing section, THE system SHALL:
1. Allow updating the section name and description
2. Ensure the new section name is unique across all sections
3. Update the modification timestamp
4. Record which administrator made the change

IF a section with the desired name already exists (other than the current section), THE system SHALL reject the request.
IF the section name is empty after editing, THE system SHALL reject the request.

### Section Deletion

WHEN a super administrator deletes a section, THE system SHALL:
1. Remove the section record
2. Preserve all articles and comments that belonged to the deleted section
3. Change the section association of existing articles to null
4. Record the deletion timestamp and administrator

WHERE an administrator attempts to delete a section that contains articles, THE system SHALL:
1. Cancel the deletion request
2. Return an error message explaining that articles must be moved first

IF a section has no articles, THE system SHALL allow deletion without additional steps.

### Section Management Permissions

ONLY super administrators can create, edit, or delete sections.
WHEN a regular administrator attempts to manage sections, THE system SHALL reject the request.
WHEN a guest or member attempts to view the section management interface, THE system SHALL redirect to the public section listing.

WHERE a user views section details, THE system SHALL:
1. Show which administrator last modified the section
2. Display the last modification timestamp
3. Show the total count of articles in the section

## Article Actions

Users create articles by providing a title, content, and selecting a section. When creating an article, users can attach multiple files and images. Users can also add multiple tags to categorize their articles. After creation, users can edit their articles' title, content, attachments, and tags at any time. Users can delete their own articles, which removes the article and all its associated content. When viewing article lists, users can sort entries by newest or oldest first and navigate through paginated results. Users can search articles by title or content and filter results by tags.

### Article Creation

WHEN a user creates an article, THE system SHALL:
1. Require a title
2. Require content
3. Require selection of exactly one section
4. Accept multiple file attachments
5. Accept multiple image attachments
6. Accept multiple free-text tags
7. Associate the article with the creating user
8. Record the creation timestamp
9. Validate that the title length is between 1 and 500 characters
10. Validate that content is not empty
11. Validate that the selected section exists

IF the title is missing or empty, THE system SHALL reject the request.
IF the content is missing or empty, THE system SHALL reject the request.
IF no section is selected, THE system SHALL reject the request.
IF a user attempts to attach more files than allowed, THE system SHALL reject the request.

WHERE attachments are allowed, THE system SHALL:
- Accept files of various types
- Validate file sizes against platform limits
- Store attachment metadata including filename, URL, size, type, and upload timestamp
- Associate each attachment with the article

WHERE tags are allowed, THE system SHALL:
- Accept multiple free-text tag values
- Validate each tag length is between 1 and 50 characters
- Store each tag with the assignment timestamp
- Create associations between the article and the tags

### Article Editing

WHEN a user edits their own article, THE system SHALL:
1. Allow modification of the title
2. Allow modification of the content
3. Allow addition or removal of file attachments
4. Allow addition or removal of image attachments
5. Allow modification of tags
6. Update the last modification timestamp

WHEN a user attempts to edit an article they do not own, THE system SHALL reject the request.

IF the title length is outside the allowed range (1-500 characters), THE system SHALL reject the request.
IF the content is empty after editing, THE system SHALL reject the request.
IF a user attempts to attach more files than allowed, THE system SHALL reject the request.
IF any tag length exceeds the allowed maximum (50 characters), THE system SHALL reject the request.

WHILE editing an article, THE system SHALL preserve existing attachments and tags that are not explicitly removed or modified.

### Article Deletion

WHEN a user deletes their own article, THE system SHALL:
1. Remove the article record
2. Remove all associated comments
3. Remove all file and image attachments
4. Remove all tag associations
5. Cascade the deletion to related ArticleTag entries
6. Maintain the visibility of comments if the article was already deleted

WHEN a user attempts to delete an article they do not own, THE system SHALL reject the request.

WHEN an administrator deletes an article, THE system SHALL:
1. Remove the article record
2. Remove all associated comments
3. Remove all file and image attachments
4. Remove all tag associations
5. Cascade the deletion to related ArticleTag entries

IF an article does not exist when deletion is requested, THE system SHALL reject the request.

### Article Search

WHEN a user searches articles, THE system SHALL:
1. Search by title
2. Search by content
3. Return paginated results
4. Support case-insensitive matching
5. Sort results by relevance or date based on user preference

WHEN a user searches articles by title, THE system SHALL return articles where the title contains the search terms.

WHEN a user searches articles by content, THE system SHALL return articles where the content contains the search terms.

IF no articles match the search criteria, THE system SHALL return an empty list.

WHERE searching includes both title and content, THE system SHALL combine results from both search fields and remove duplicates.

### Article Filtering

WHEN a user filters articles by tags, THE system SHALL:
1. Allow selection of one or more tags
2. Return only articles associated with all selected tags
3. Support pagination of filtered results

WHERE filtering by section, THE system SHALL:
1. Return only articles belonging to the selected section
2. Support pagination of filtered results

WHERE multiple filters are applied (e.g., section and tags), THE system SHALL apply all filters together and return articles matching all criteria.

IF no articles match the filter criteria, THE system SHALL return an empty list.

WHERE tag filtering is applied, THE system SHALL validate that each specified tag exists before applying the filter.

### Article Sorting

WHEN a user sorts articles, THE system SHALL:
1. Support sorting by newest first (most recent creation time)
2. Support sorting by oldest first (least recent creation time)
3. Default to newest first when no sorting preference is specified

WHEN articles are sorted by newest first, THE system SHALL order articles with the most recent creation timestamp first.

WHEN articles are sorted by oldest first, THE system SHALL order articles with the least recent creation timestamp first.

WHERE articles have identical creation timestamps, THE system SHALL maintain consistent ordering.

WHERE sorting applies to filtered or searched results, THE system SHALL apply sorting after filtering and searching operations.

### Article Pagination

WHEN article lists are paginated, THE system SHALL:
1. Support pagination for section article lists
2. Support pagination for search results
3. Support pagination for filtered results
4. Include the total count of articles in the response
5. Support navigation to specific pages

WHERE pagination is applied, THE system SHALL:
1. Return a fixed number of articles per page
2. Provide next and previous page navigation tokens
3. Indicate if more pages are available

WHEN a user requests a specific page, THE system SHALL:
1. Return the correct subset of articles
2. Validate the page number exists
3. Return an empty result if the page number exceeds available pages

IF pagination parameters are invalid (e.g., negative page number), THE system SHALL reject the request and return an appropriate error.

## Comment Actions

Users can write comments on any article to contribute to discussions. Comments are single-level only with no nested reply functionality. Each comment displays the author, content, and posting time. Users can edit their own comments to correct or update their contributions. Users can delete their own comments at any time after posting. Comments on an article are displayed sorted by oldest first, showing all existing comments. When viewing an article, users can see all comments associated with that article.

### Comment Writing

WHEN a user writes a comment on an article, THE system SHALL:
1. Require the comment content to be non-empty
2. Associate the comment with the current article
3. Associate the comment with the authenticated user as author
4. Record the creation timestamp

IF the comment content is empty or contains only whitespace, THE system SHALL reject the request.
IF the user is banned, THE system SHALL reject the request.
IF the article does not exist, THE system SHALL reject the request.

### Comment Editing

WHEN a user edits their own comment, THE system SHALL:
1. Allow updates to the comment content
2. Update the last modified timestamp
3. Preserve the original creation timestamp and author association

IF the comment does not exist, THE system SHALL reject the request.
IF the user is not the author of the comment, THE system SHALL reject the request.
IF the new content is identical to the existing content, THE system SHALL reject the request.
IF the user is banned, THE system SHALL reject the request.

### Comment Deletion

WHEN a user deletes their own comment, THE system SHALL:
1. Remove the comment from view
2. Preserve the comment record for audit purposes
3. Update the associated article's comment count

IF the comment does not exist, THE system SHALL reject the request.
IF the user is not the author of the comment, THE system SHALL reject the request.
IF the user is banned, THE system SHALL reject the request.

### Comment Sorting

WHEN viewing comments on an article, THE system SHALL sort them by creation timestamp in ascending order (oldest first).

All comments on an article shall display in a single list with no nested reply structure.
When a new comment is added, it shall appear at the end of the sorted list.

### Single-Level Comment Structure

WHEN a comment is written, THE system SHALL associate it with exactly one article and one author.

THE system SHALL NOT allow nested or threaded replies to comments.
Each comment exists at the top level of the comment hierarchy for its associated article.

All comment relationships are managed through direct article-comment associations only.

### Comment Display

WHEN displaying a comment, THE system SHALL show:
1. The author's display name
2. The comment content
3. The creation timestamp

THE system SHALL NOT show deleted comments to regular users.
Administrators may view all comments including those marked as deleted.

### Comment Viewing

WHEN a user views an article, THE system SHALL display all non-deleted comments associated with that article.

THE system SHALL include the comment count in the article summary.
THE system SHALL load all comments for the article in a single request without pagination.

Administrators and super administrators may view all comments including deleted ones.

## FileAttachment Actions

Users can attach multiple files to their articles during creation or editing. Users can also attach images to articles, which may be displayed as part of the content. When creating or editing articles, users can select multiple files and images simultaneously. After attachment, users can download their own files and images when viewing the article. Attached files maintain their original filenames and are linked to specific articles.

### File Attachment Creation

WHEN a user attaches a file to an article, THE system SHALL:
1. Allow the user to select one or more files for attachment
2. Require each file to have a valid filename
3. Associate each file with the specific article being attached
4. Record the file size and file type (MIME type) at upload time
5. Store the file at a unique URL for later retrieval

IF a user attempts to attach a file to an article they do not own, THE system SHALL reject the request.

File attachment is part of article creation or editing workflows (defined in Article Actions).

## Tag Actions

Users can assign multiple free-text tags to their articles for categorization. Tags help organize content and enable search functionality. When creating or editing an article, users can add new tags or select existing ones. Tags are displayed on article lists and detail pages to improve discoverability. Users can search articles by specific tags or combinations of tags. Tag filtering allows users to narrow down search results based on content categories.

### Tag Assignment Process

WHEN a user creates or edits an article, THE system SHALL allow them to assign one or more tags to categorize the content.

THE system SHALL require at least one tag to be assigned when submitting an article.

WHEN a user submits tag names for assignment, THE system SHALL accept both existing tags and new tag names.

IF the user submits an empty tag name, THE system SHALL reject that specific tag assignment.

WHILE an article is being created or edited, THE system SHALL maintain tag assignment until the article is saved successfully.


### Tag Assignment Validation

IF the article being tagged has been deleted, THE system SHALL reject the tag assignment.

IF a user attempts to tag an article they do not own, THE system SHALL reject the assignment.

IF the user is banned, THE system SHALL prevent any tag assignment.

IF the article belongs to a section the user cannot access, THE system SHALL reject the tag assignment.

### Multi-Tag Support

WHEN a user creates or edits an article, THE system SHALL allow them to assign multiple tags simultaneously.

THE system SHALL support adding up to 10 tags per article.

WHILE editing an article, THE system SHALL allow the user to modify the entire set of tags (add, remove, or replace).

WHEN a user removes a tag from an article, THE system SHALL update the tag-article association immediately.

THE system SHALL maintain a many-to-many relationship between articles and tags, enabling any article to have multiple tags and any tag to be used across multiple articles.


### Multi-Tag Error Handling

IF the user attempts to assign more than 10 tags, THE system SHALL reject the request and indicate the maximum limit has been exceeded.

IF any single tag in the batch assignment is invalid (empty, exceeds length limits), THE system SHALL reject the entire tag assignment set.

### Free-Text Tag Creation and Selection

WHEN a user begins typing a tag name, THE system SHALL allow them to create a new tag if it does not already exist.

THE system SHALL provide a dropdown of existing matching tags as the user types, showing up to 5 suggestions.

WHEN a user selects or creates a tag, THE system SHALL accept the tag name immediately for assignment to the current article.

THE system SHALL normalize tag names by trimming leading and trailing whitespace.

WHILE a user is typing a new tag, THE system SHALL validate the tag name against length constraints.


### Free-Text Validation Rules

IF a tag name is empty (after trimming), THE system SHALL reject the tag.

IF a tag name exceeds 50 characters, THE system SHALL reject the tag and indicate the maximum length.

IF a user attempts to assign an identical tag twice to the same article, THE system SHALL accept only one instance.

IF the user is banned, THE system SHALL prevent creation of new tags.

### Tag-Based Search Functionality

WHEN a user initiates a search for articles, THE system SHALL allow filtering results by specific tags.

THE system SHALL support searching articles that contain ALL selected tags (AND logic) when multiple tags are specified.

WHEN a user searches by a single tag, THE system SHALL return all articles associated with that tag.

THE system SHALL paginate search results, showing up to 20 articles per page.

WHILE displaying search results, THE system SHALL show the number of articles matching each tag filter.


### Tag Search Behavior

IF no articles match the selected tags, THE system SHALL return an empty result set.

IF a tag in the search filter has been deleted or has no associated articles, THE system SHALL include no results for that tag but continue processing other filter criteria.

### Tag Filtering in Article Lists

WHEN a user browses articles in a section, THE system SHALL provide a filter mechanism to show only articles with specific tags.

THE system SHALL allow users to apply multiple tag filters simultaneously.

WHEN tag filters are applied, THE system SHALL update the article list to show only articles matching all selected tags.

THE system SHALL display active filters and allow users to remove individual filters.

WHEN a user clears all tag filters, THE system SHALL restore the complete article list for the current section.


### Filter Implementation Details

THE system SHALL support tag filtering on both the main article list and search results.

WHEN a user selects a tag from an article's tag list, THE system SHALL apply that tag as a filter and refresh the view.

### Tag Display in User Interface

WHEN an article is displayed in a list view, THE system SHALL show all assigned tags.

THE system SHALL display tags as clickable links that allow filtering by that tag.

WHEN an article detail page is shown, THE system SHALL display all tags with the same styling and functionality.

THE system SHALL limit tag display to a maximum of 10 tags per article, indicating if more tags exist with a "+X more" indicator.

WHEN a user hovers over a tag in the UI, THE system SHALL show the article count associated with that tag.


### Tag Display Formatting

THE system SHALL render tags in a consistent visual style across all interfaces.

WHEN showing tags on the article list, THE system SHALL display them below the article title.

WHEN showing tags on the article detail page, THE system SHALL display them at the end of the article content.

### Tag Usage Analytics

THE system SHALL track which tags are most frequently applied to articles.

WHEN an article with tags is created or edited, THE system SHALL update the tag usage statistics.

THE system SHALL exclude tags from banned users' content in tag analytics.

WHEN a tag has no more associated articles, THE system SHALL retain the tag for potential future use.

THE system SHALL maintain a count of articles associated with each tag.


### Tag Popularity Display

THE system SHALL display popular tags in the sidebar or navigation when viewing article lists.

WHEN displaying popular tags, THE system SHALL order them by decreasing article count.

## ArticleTag Actions

Each article can be associated with multiple tags through ArticleTag records. These associations are created automatically when users assign tags during article creation or editing. ArticleTag records track when each tag is assigned to an article. The system maintains these associations to enable efficient searching and filtering by tags. Users do not interact with ArticleTag records directly but benefit from the organized content structure.

### Tag Assignment and Creation

WHEN a user creates a new article with tags, THE system SHALL automatically create ArticleTag records for each specified tag.

WHEN a user edits an existing article to add or remove tags, THE system SHALL automatically create or delete ArticleTag records accordingly.

WHERE an article is associated with multiple tags, THE system SHALL create one ArticleTag record per tag.

IF a user specifies a non-existent tag name during article creation or editing, THE system SHALL create the tag first, then create the ArticleTag record.

WHEN a user removes all tags from an article, THE system SHALL delete all ArticleTag records for that article.

WHILE an article is being edited, THE system SHALL temporarily preserve existing ArticleTag records until the edit is confirmed.

THE system SHALL ensure ArticleTag records are only created for articles that exist and are accessible to the user.

THE system SHALL prevent duplicate ArticleTag records for the same article-tag combination.

IF a user attempts to assign a banned user's tag to an article, THE system SHALL reject the operation.

IF a user attempts to assign a tag to a non-existent article, THE system SHALL reject the operation.

### Tag Tracking and Content Organization

WHEN an ArticleTag record is created, THE system SHALL record the exact timestamp of when the tag is assigned to the article.

THE system SHALL maintain the association between ArticleTag records and their respective articles for search indexing purposes.

WHILE an article is being viewed, THE system SHALL display all associated tags through their ArticleTag records.

THE system SHALL use ArticleTag records to enable efficient searching of articles by tag.

THE system SHALL use ArticleTag records to support filtering articles within sections by specific tags.

WHEN a section's article list is displayed, THE system SHALL include tag information derived from ArticleTag records.

THE system SHALL preserve ArticleTag records when an article's title or content is edited, but tags are not modified.

WHEN an article is deleted, THE system SHALL automatically delete all associated ArticleTag records.

THE system SHALL exclude ArticleTag records for banned users from search and filtering results.

WHEN searching articles by tags, THE system SHALL return only articles with active (non-banned user) ArticleTag matches.

## AdministratorRequest Actions

Any user can submit a request to become an administrator by providing a reason for their application. Submitted requests enter a pending status and appear in a queue for review. Super administrators can view all pending administrator requests and decide to approve or reject them. When approved, the user receives administrator privileges and can perform administrative tasks. Super administrators can promote regular administrators to super administrator status. Super administrators can also demote other super administrators to regular administrator status, except demoting themselves. Rejected requests are recorded with their outcome and reason for rejection.

### Administrator Request Submission

WHEN a member submits a request to become an administrator, THE system SHALL:
1. Require the member to provide a reason for their application
2. Create the request with status set to pending
3. Associate the request with the submitting member
4. Record the submission timestamp

IF the reason is empty or consists only of whitespace, THE system SHALL reject the request.

### Pending Request Review

WHEN a super administrator accesses the administrator request queue, THE system SHALL:
1. Display all pending administrator requests
2. Show the submitting member's display name and the application reason
3. Display the submission timestamp
4. Allow sorting requests by submission time

WHERE a request has been processed, THE system SHALL exclude it from the pending queue.

### Administrator Request Approval

WHEN a super administrator approves an administrator request, THE system SHALL:
1. Change the request status to approved
2. Record the approval timestamp
3. Update the submitting user's role to administrator
4. Assign the user administrator privileges

WHERE the approving user is not a super administrator, THE system SHALL reject the request.

### Administrator Request Rejection

WHEN a super administrator rejects an administrator request, THE system SHALL:
1. Change the request status to rejected
2. Require the administrator to provide a rejection reason
3. Record the rejection timestamp
4. Store the rejection reason in the request record

IF the rejection reason is empty or consists only of whitespace, THE system SHALL reject the request.

### Administrator Role Promotion

WHEN a super administrator promotes an administrator to super administrator, THE system SHALL:
1. Change the target user's role to super administrator
2. Record the promotion timestamp
3. Log the promoting administrator

WHERE the promoting user attempts to promote themselves, THE system SHALL reject the request.

### Administrator Role Demotion

WHEN a super administrator demotes a super administrator to regular administrator, THE system SHALL:
1. Change the target user's role to administrator
2. Record the demotion timestamp
3. Log the demoting administrator

WHERE the demoting user attempts to demote themselves, THE system SHALL reject the request.

WHERE the target user is a regular administrator (not super administrator), THE system SHALL reject the request.

### Administrator Request Status Visibility

WHEN any user views their administrator request, THE system SHALL:
1. Show the current request status (pending, approved, or rejected)
2. Display the submission timestamp
3. For approved requests, show the approval timestamp
4. For rejected requests, show the rejection timestamp and reason
5. For pending requests, show that the request is under review

WHERE a user is not authorized to view another user's request, THE system SHALL hide the request from their view.

## BanRecord Actions

Administrators can ban users from the platform by recording a ban reason. When a user is banned, they lose the ability to log in to the system. Banned users retain visibility of their existing articles and comments, which remain accessible to other users. Administrators can view the list of all banned users and their associated ban reasons. Administrators can unban users, which restores their account access. The system records when users were banned and when they were unbanned, if applicable.

### User Banning

WHEN an administrator bans a user, THE system SHALL:
1. Record the ban with a ban reason provided by the administrator
2. Immediately prevent the banned user from logging in
3. Retain all existing articles and comments created by the banned user
4. Set the bannedAt timestamp to the current datetime

IF an administrator attempts to ban themselves, THE system SHALL reject the request.
IF an administrator attempts to ban a user with an empty ban reason, THE system SHALL reject the request.
IF an administrator attempts to ban a user who has a pending administrator request, THE system SHALL reject the request.

### Ban Reason Recording

WHEN a user is banned, THE system SHALL:
1. Require the administrator to provide a ban reason
2. Store the ban reason as part of the BanRecord
3. Display the ban reason to administrators when viewing banned users
4. Preserve the ban reason indefinitely while the ban is active

WHERE a ban reason is recorded, THE system SHALL:
1. Not allow it to be modified after initial recording
2. Display it as plain text without formatting
3. Allow administrators to view it in the banned user list

WHILE a user is banned, THE system SHALL retain the ban reason in the BanRecord.

### Ban Effect

WHEN a banned user attempts to log in, THE system SHALL:
1. Check if the user has an active ban record
2. Reject the login attempt if a ban record exists and is not unbanned
3. Return an appropriate error message indicating the account is banned
4. Not create a new session for the banned user

WHILE a user is banned, THE system SHALL:
1. Keep all their articles visible and accessible to other users
2. Keep all their comments visible and accessible to other users
3. Prevent them from creating new articles or comments
4. Prevent them from editing existing articles or comments
5. Preserve all their FileAttachments and Tag associations

THE system SHALL NOT delete or hide content created by banned users.

### Unban Action

WHEN an administrator unbans a user, THE system SHALL:
1. Update the BanRecord with the unbannedAt timestamp
2. Record the unban reason provided by the administrator
3. Restore the user's ability to log in to the platform
4. Allow the user to resume all normal platform activities

WHERE a user is unbanned, THE system SHALL:
1. Preserve the BanRecord with its original ban reason
2. Maintain all articles and comments created during the ban period (if any)
3. Keep the historical ban record in the system
4. Not automatically delete any content created while banned

IF an administrator attempts to unban a user who is not banned, THE system SHALL reject the request.

### Banned User List

WHEN an administrator requests the banned user list, THE system SHALL:
1. Display all users who currently have active ban records
2. Show each user's display name and ban status
3. Show the ban reason for each banned user
4. Show the bannedAt timestamp for each banned user
5. Support pagination for large lists

WHERE viewing the banned user list, THE system SHALL:
1. Include only users with active (non-unbanned) ban records
2. Sort by bannedAt timestamp (newest first by default)
3. Allow filtering by display name
4. Allow sorting by ban date

THE system SHALL NOT include unbanned users in the active banned user list.

### Ban Record Viewing

WHEN an administrator views details of a banned user, THE system SHALL:
1. Display the complete BanRecord including all fields
2. Show the original ban reason and ban date
3. Show if the user has been unbanned, including unban date and reason
4. Display all articles and comments created by the user
5. Show the user's profile information

WHERE an administrator views BanRecord details, THE system SHALL:
1. Preserve the integrity of all related content (articles, comments, attachments)
2. Show whether the ban is currently active or has been lifted
3. Display timestamps in the user's local timezone context
4. Include all administrative actions taken on this record

THE system SHALL make ban records immutable after creation.

### Ban Duration Tracking

WHEN tracking ban duration, THE system SHALL:
1. Calculate the time between bannedAt and unbannedAt timestamps
2. Display the ban duration for completed bans
3. Show elapsed time since banning for active bans
4. Store ban records indefinitely for audit purposes

WHERE a ban duration is calculated, THE system SHALL:
1. Include the full time span from bannedAt to unbannedAt
2. Show "ongoing" for currently active bans
3. Support viewing historical ban durations
4. Preserve duration information even after user account deletion

THE system SHALL retain ban duration data regardless of user account status changes.

# Error Scenarios and Edge Cases

Business-level error scenarios, edge case coverage, and expected system behaviors for exceptional conditions.

## User Error Scenarios

Users cannot register with an email already used by an active account. Registration fails if the password doesn't meet minimum security requirements. Password changes fail if the new password is the same as the current one. Users cannot delete their account while it's banned. Banned users attempting to log in are blocked regardless of credentials. Account deletion only proceeds if the user confirms the action explicitly. Password recovery requests fail for non-existent email addresses. Duplicate login attempts from the same session are prevented. Users cannot set their display name to an empty value. Account deletion fails if the user attempts to delete a banned account.

### Duplicate Email Blocking

WHEN a user attempts to register with an email address that is already associated with an active account, THE system SHALL reject the registration and display an error message.

IF the email address exists in the system but belongs to a deleted account, THE system SHALL allow registration with that email address.

WHEN a user attempts to change their email to one already used by an active account, THE system SHALL reject the change and preserve the current email address.

### Password Strength Validation

WHEN a user registers or changes their password, THE system SHALL require a password that meets minimum security requirements.

IF the password does not meet minimum security requirements, THE system SHALL reject the request and display specific error information about what is missing.

Password requirements include: minimum length, use of uppercase letters, use of lowercase letters, and use of numbers.

### Same Password Rejection

WHEN a user attempts to change their password to a value identical to their current password, THE system SHALL reject the request and display an error message.

WHILE the user is entering the same password consecutively, THE system SHALL continue to reject the request until a different password is provided.

### Banned User Login Prevention

WHEN a banned user attempts to log in with valid credentials, THE system SHALL reject the login attempt.

IF the user has been banned, THE system SHALL not authenticate them regardless of password correctness.

THE system SHALL provide a generic error message that does not reveal whether the email exists in the system.

### Account Deletion Confirmation

WHEN a user initiates account deletion, THE system SHALL require explicit confirmation before proceeding.

IF the user does not explicitly confirm the deletion, THE system SHALL not delete the account.

WHILE the deletion is pending confirmation, THE system SHALL retain all account data and allow the user to cancel the request.

### Password Recovery Email Validation

WHEN a user requests a password recovery email for an email address that does not exist in the system, THE system SHALL process the request but not send any email.

THE system SHALL not reveal whether the email address exists in the system by providing different responses for existing vs non-existing emails.

### Session Login Uniqueness

WHEN a user logs in from a new device or browser session while already logged in elsewhere, THE system SHALL allow the new session to be created.

IF the user logs in with credentials from the same active session, THE system SHALL maintain the existing session without duplication.

### Empty Display Name Rejection

WHEN a user attempts to set their display name to an empty value, THE system SHALL reject the update.

IF the display name field is empty or contains only whitespace characters, THE system SHALL preserve the current display name and display an error message.

### Banned Account Deletion Blocking

WHEN a banned user attempts to delete their account, THE system SHALL prevent the deletion.

IF the user's account has an active ban, THE system SHALL retain the account and not proceed with deletion.

THE system SHALL provide an error message explaining that account deletion is not permitted while banned.

## Section Error Scenarios

Users cannot create a section with a name that already exists in the system. Section creation fails if the name exceeds the maximum length limit. Editing a section fails if the new name conflicts with an existing section. Section deletion fails if the section still contains articles. Users without administrator privileges cannot create, edit, or delete sections. Section names must contain visible characters—whitespace-only names are rejected. Deletion attempts for non-existent sections fail with appropriate feedback. Only super administrators can modify other super administrators' section permissions. Section descriptions must not contain prohibited content. Users cannot view sections that are in the process of being created.

### Duplicate Section Name Prevention

WHEN an administrator attempts to create a section with a name that already exists in the system, THE system SHALL reject the request and notify the administrator that the section name is already in use.

WHEN an administrator attempts to rename a section to a name that already exists for another section, THE system SHALL reject the request and notify the administrator that the new section name is already in use.

THE system SHALL enforce case-insensitive uniqueness for section names.

WHERE a section name conflict exists, THE system SHALL provide clear feedback identifying which name is duplicated.

### Name Length Validation

WHEN an administrator attempts to create or rename a section with a name exceeding 100 characters, THE system SHALL reject the request.

THE system SHALL reject section names that are empty or consist only of whitespace.

WHEN a section name is provided, THE system SHALL require at least one non-whitespace character.

WHERE a section name is submitted, THE system SHALL enforce a maximum length of 100 characters.

### Conflicting Section Renaming

WHEN an administrator attempts to rename a section to a name that conflicts with an existing section, THE system SHALL reject the request.

THE system SHALL verify name uniqueness during section rename operations.

IF a section rename would result in two sections having identical names, THE system SHALL prevent the rename and retain the existing name.

WHERE a conflict exists during renaming, THE system SHALL notify the administrator of the conflict without revealing other section names.

### Section Deletion with Existing Articles

WHEN an administrator attempts to delete a section that contains articles, THE system SHALL reject the deletion request.

THE system SHALL verify that a section is empty of articles before allowing deletion.

IF a section contains one or more articles, THE system SHALL preserve all articles and prevent section deletion.

WHERE section deletion fails due to existing articles, THE system SHALL inform the administrator that articles must be moved or deleted first.

### Administrator-Only Section Management

WHEN a non-administrator attempts to create a section, THE system SHALL reject the request.

WHEN a non-administrator attempts to edit a section, THE system SHALL reject the request.

WHEN a non-administrator attempts to delete a section, THE system SHALL reject the request.

WHERE section management operations are attempted by non-administrators, THE system SHALL restrict access to administrators only.

### Whitespace-Only Name Rejection

WHEN an administrator attempts to create a section with a name consisting only of whitespace characters, THE system SHALL reject the request.

THE system SHALL trim whitespace from section names before validation.

WHERE a section name contains only whitespace characters after trimming, THE system SHALL reject the request and notify the administrator that the name is invalid.

### Non-Existent Section Access

WHEN an administrator attempts to edit a section that does not exist, THE system SHALL reject the request.

WHEN an administrator attempts to delete a section that does not exist, THE system SHALL reject the request.

WHERE a section operation targets a non-existent section ID, THE system SHALL return an appropriate error indication.

IF a section cannot be found for editing or deletion, THE system SHALL not reveal whether the section previously existed.

### Super Admin Permission Hierarchy

WHEN an administrator attempts to modify another administrator's section permissions, THE system SHALL reject the request.

WHEN a regular administrator attempts to modify a super administrator's permissions, THE system SHALL reject the request.

THE system SHALL prevent super administrators from demoting themselves to regular administrators.

WHERE super administrator permissions would be affected by an operation, THE system SHALL restrict modifications to appropriate permission levels only.

### Prohibited Description Content

WHEN an administrator attempts to create or edit a section description containing prohibited content, THE system SHALL reject the request.

THE system SHALL validate section descriptions for prohibited content during creation and editing.

WHERE a section description contains prohibited content, THE system SHALL prevent the operation and notify the administrator.

WHAT constitutes prohibited content SHALL be determined by the system's content policy rules.

### Pending Section Visibility

WHEN a section is in the process of being created, THE system SHALL not make it visible to users until creation is complete.

THE system SHALL ensure section creation is atomic and complete before making the section available.

WHERE section creation fails partway through, THE system SHALL not expose a partially created section.

WHERE a section is being created or modified, THE system SHALL maintain data consistency and prevent access to incomplete sections.

## Article Error Scenarios

Users cannot create an article without selecting a section. Article creation fails if the title exceeds the maximum length. Content cannot be empty when creating or editing an article. Users cannot edit articles they do not own. Deleting an article also removes all associated comments and file attachments. Attaching files exceeds maximum total size limit for a single article. Users cannot attach files while their account is banned. Editing an article's section requires confirming the new section exists. Tag names exceeding maximum length are rejected during article creation. Articles cannot be created or edited when the user's account is deactivated.

### Section Selection Requirement

WHEN a user creates an article without selecting a section, THE system SHALL reject the request.

IF a user attempts to create an article with an invalid section reference, THE system SHALL reject the request.

### Title Length Validation

WHEN a user creates or edits an article with a title exceeding 500 characters, THE system SHALL reject the request with an appropriate error message.

THE system SHALL enforce the title length constraint on all article creation and editing operations.

### Empty Content Rejection

WHEN a user creates an article with empty content, THE system SHALL reject the request.

WHEN a user edits an article to have empty content, THE system SHALL reject the edit request.

### Article Ownership Enforcement

WHEN a user attempts to edit an article they do not own, THE system SHALL reject the request.

WHEN a user attempts to delete an article they do not own, THE system SHALL reject the request.

### Cascading Comment Deletion

WHEN an article is deleted, THE system SHALL automatically delete all comments associated with that article.

WHEN an article is deleted, THE system SHALL also remove all file attachments and tag associations for that article.

### File Size Limit Enforcement

WHEN a user attempts to attach files to an article that would exceed the maximum total file size limit, THE system SHALL reject the attachment request.

THE system SHALL enforce the file size limit on all file attachment operations for articles.

### Banned User Attachment Blocking

WHEN a banned user attempts to attach files to an article, THE system SHALL reject the attachment request.

THE system SHALL prevent banned users from creating new file attachments to any article.

### Section Existence Verification

WHEN a user attempts to change an article's section to a non-existent section, THE system SHALL reject the edit request.

WHEN a user attempts to change an article's section to a deleted section, THE system SHALL reject the edit request.

### Tag Length Validation

WHEN a user creates or edits an article with a tag name exceeding 50 characters, THE system SHALL reject that specific tag.

IF any tag in the article's tag list exceeds the maximum length, THE system SHALL reject the entire article creation or edit request.

### Deactivated Account Article Restrictions

WHEN a user with a deactivated account attempts to create an article, THE system SHALL reject the request.

WHEN a user with a deactivated account attempts to edit an article, THE system SHALL reject the request.

## Comment Error Scenarios

Comments cannot be created with empty content. Users cannot comment on articles in sections they cannot access. Editing a comment fails if the new content is identical to the existing content. Deleting a comment requires the user to be the original author. Comments cannot be added to articles that have been deleted. Banned users cannot write new comments. Comment content exceeding length limits is rejected. Users cannot edit comments after a specified time period has elapsed. Comment count updates only when valid comments are added or removed. Deleting an article removes all associated comments automatically.

### Empty Comment Content Rejection

WHEN a user attempts to submit a comment with empty or whitespace-only content, THE system SHALL reject the request.

IF the comment content is missing, THE system SHALL reject the request.

IF the comment content contains only whitespace characters, THE system SHALL reject the request.

WHEN the system rejects a comment due to empty content, THE system SHALL return an error indicating that comment content is required.

### Section Access Requirement

WHEN a user attempts to write a comment on an article, THE system SHALL verify the user has access to the article's section.

IF the article belongs to a section that the user cannot access, THE system SHALL reject the comment request.

WHEN comment submission is rejected due to section access restrictions, THE system SHALL return an error indicating the user does not have permission to comment on that article.

### Identical Content Editing Prevention

WHEN a user attempts to edit a comment to contain identical content as the current version, THE system SHALL reject the edit request.

IF the new comment content is identical to the existing content (case-sensitive comparison), THE system SHALL reject the request.

WHEN the system rejects an edit due to identical content, THE system SHALL return an error indicating that no changes have been made.

### Comment Author Verification

WHEN a user attempts to edit or delete a comment, THE system SHALL verify the user is the original author of that comment.

IF the user is not the author of the comment, THE system SHALL reject the request.

WHEN the system rejects an edit or delete request due to author verification failure, THE system SHALL return an error indicating the user does not have permission to modify that comment.

### Deleted Article Comment Blocking

WHEN a user attempts to write a comment on an article, THE system SHALL verify the article has not been deleted.

IF the target article has been deleted, THE system SHALL reject the comment request.

WHEN the system rejects a comment due to the article being deleted, THE system SHALL return an error indicating the article no longer exists.

### Banned User Comment Restriction

WHEN a banned user attempts to write a comment, THE system SHALL reject the request.

IF the user has an active ban record (unbannedAt is null), THE system SHALL reject the comment submission.

WHEN the system rejects a comment due to user ban status, THE system SHALL return an error indicating the user's account is currently banned.

### Content Length Validation

WHEN a user attempts to submit a comment, THE system SHALL validate that the comment content does not exceed the maximum length limit.

IF the comment content exceeds the maximum length of 10,000 characters, THE system SHALL reject the request.

WHEN the system rejects a comment due to length violation, THE system SHALL return an error indicating the comment content is too long.

### Comment Edit Timeout

WHEN a user attempts to edit a comment, THE system SHALL verify the edit is within the allowed time window.

IF more than 30 minutes have elapsed since the comment was created, THE system SHALL reject the edit request.

WHEN the system rejects an edit due to timeout, THE system SHALL return an error indicating the comment can no longer be modified.

### Comment Count Synchronization

WHEN a valid comment is successfully added to an article, THE system SHALL increment the article's comment count.

WHEN a valid comment is successfully deleted, THE system SHALL decrement the article's comment count.

IF a comment deletion fails (e.g., user lacks permission), THE system SHALL NOT modify the article's comment count.

WHEN an article's comment count is displayed, THE system SHALL show the accurate count reflecting all valid comments.

### Cascading Comment Removal

WHEN an article is deleted, THE system SHALL automatically delete all comments associated with that article.

IF a comment deletion fails during cascading removal, THE system SHALL continue attempting to delete other associated comments.

WHEN cascading comment removal completes, THE system SHALL ensure no orphaned comments remain associated with the deleted article.

The deletion of comments during cascading removal does not require user confirmation.

## FileAttachment Error Scenarios

Files cannot be uploaded if they exceed the maximum file size limit. Users cannot attach more than the maximum number of files per article. File type restrictions block non-permitted extensions. Downloading a file fails if the file has been deleted or moved. Users cannot attach files while their account is banned. File names containing prohibited characters are rejected. File uploads fail if the total article attachment size exceeds the limit. Duplicate file uploads to the same article are prevented. Corrupted or incomplete file transfers are handled gracefully. File download links expire after a period of inactivity.

### File Size Limit Enforcement

WHEN a user attempts to attach a file that exceeds the maximum file size limit, THE system SHALL reject the upload and display an error message indicating the maximum allowed size.

WHEN a user attempts to attach a file that equals the maximum file size limit, THE system SHALL accept the upload as valid.

WHEN a user attempts to attach a file below the maximum file size limit, THE system SHALL process the upload normally.

THE system SHALL validate file size before any processing occurs to prevent resource waste.

IF a user attempts to attach multiple files and the combined size exceeds the maximum limit, THE system SHALL reject all files with an error indicating the total size limit has been exceeded.

### Attachment Count Limit

WHEN a user attempts to attach more files than the maximum attachment count limit, THE system SHALL reject the upload and display an error message indicating the maximum number of attachments allowed.

WHEN a user attempts to attach exactly the maximum number of files, THE system SHALL process the upload normally.

WHEN a user attempts to attach fewer files than the maximum count, THE system SHALL process the upload normally.

THE system SHALL count both file attachments and image attachments toward the same maximum limit.

### File Type Restriction

WHEN a user attempts to attach a file with an unsupported file type extension, THE system SHALL reject the upload and display an error message listing allowed file types.

WHEN a user attempts to attach a file with a permitted file type extension, THE system SHALL process the upload normally.

THE system SHALL validate file type based on the file extension before processing any file content.

IF a file has a valid extension but contains data from an unsupported format, THE system SHALL reject the upload and display an error message.

### File Deletion Handling

WHEN a file is deleted from the system, THE system SHALL ensure the file is no longer accessible via any download link.

WHEN a user attempts to download a file that has been deleted, THE system SHALL reject the request and display an appropriate error message.

WHEN an article is deleted, THE system SHALL also delete all associated file attachments.

THE system SHALL maintain referential integrity so that orphaned file references cannot exist in the system.

### Banned User Attachment Blocking

WHEN a banned user attempts to attach a file to an article, THE system SHALL reject the upload and display an error message indicating the user account has been banned.

WHEN a banned user attempts to download an attached file, THE system SHALL allow the download as the file content remains publicly accessible.

THE system SHALL block all file upload operations for banned users regardless of their role or permissions.

IF a user is banned after uploading files, their existing attachments remain accessible and unchanged.

### Prohibited Character Filename Rejection

WHEN a user attempts to attach a file with a filename containing prohibited characters, THE system SHALL reject the upload and display an error message indicating valid filename requirements.

THE system SHALL validate filenames for prohibited characters before processing the file upload.

PROHIBITED CHARACTERS include: < > : " / \ | ? *

WHEN a filename contains only valid characters, THE system SHALL process the upload normally.

IF a file has no name or an empty filename, THE system SHALL reject the upload with an appropriate error message.

### Total Attachment Size Limit

WHEN a user attempts to attach files where the combined total size exceeds the maximum total attachment size limit, THE system SHALL reject all file uploads with an error message indicating the total size limit has been exceeded.

THE system SHALL calculate the cumulative size of all files in the current upload request before processing any files.

WHEN the cumulative size of existing attachments plus new uploads would exceed the limit, THE system SHALL reject the new uploads.

IF a user modifies an existing article and the total size would exceed the limit after modifications, THE system SHALL reject the update with an appropriate error message.

### Duplicate File Prevention

WHEN a user attempts to attach the same file to the same article twice, THE system SHALL reject the second upload and display an error message indicating the file has already been attached.

THE system SHALL use file content hash to detect duplicate files regardless of filename differences.

IF the same file is attached to different articles, THE system SHALL process each attachment as a separate operation.

WHEN a user removes and then re-adds a file to the same article, THE system SHALL process the re-addition as a new attachment.

### Transfer Error Handling

WHEN a file upload encounters a network interruption or transfer error, THE system SHALL rollback the partial upload and discard incomplete data.

WHEN a file upload completes but the system detects file corruption during validation, THE system SHALL reject the upload and display an error message.

THE system SHALL log transfer errors for administrative review without exposing technical details to users.

IF a temporary system error occurs during upload, THE system SHALL allow the user to retry the upload after resolving the issue.

### Download Link Expiration

WHEN a user attempts to download a file using an expired download link, THE system SHALL reject the request and display an appropriate error message.

THE system SHALL generate time-limited download links for file attachments with a defined expiration period.

WHEN a download link approaches expiration, THE system SHALL allow users to generate a new link for the same file.

THE system SHALL invalidate download links after their expiration period to prevent unauthorized access.

IF a user has direct access to the file (e.g., is the author), THE system SHALL generate a new valid link instead of rejecting the request.

## Tag Error Scenarios

Tags cannot be created with empty names. Tag names exceeding maximum length are rejected. Duplicate tag names in the system are prevented. Users cannot apply tags while their account is banned. Tag application fails if the article doesn't exist. Free-text tag input is trimmed of leading and trailing spaces. Tags are case-sensitive to avoid duplication. Tag creation is restricted to administrator-level permissions. Removing a tag from an article updates the article's tag count. Tags cannot be applied to deleted articles.

### Empty Tag Name Rejection

WHEN a user attempts to apply a tag to an article with an empty tag name, THE system SHALL reject the request.

WHEN a user attempts to create a tag with an empty string, THE system SHALL reject the request.

IF a tag name is empty or contains only whitespace characters, THE system SHALL reject the request.

### Tag Length Validation

WHEN a user attempts to create a tag with a name exceeding 50 characters, THE system SHALL reject the request.

WHEN a user attempts to apply a tag with a name exceeding 50 characters, THE system SHALL reject the request.

THE system SHALL enforce a maximum length of 50 characters for all tag names.

THE system SHALL reject tag creation or application requests when the tag name is empty.

THE system SHALL validate that tag names contain at least one non-whitespace character.

THE system SHALL enforce a minimum length of 1 character for tag names.

THE system SHALL validate that tag names do not exceed the maximum length of 50 characters before processing the request.

### Duplicate Tag Prevention

WHEN a user attempts to create a tag with a name that already exists in the system, THE system SHALL reject the request.

WHEN a user attempts to apply a tag that already exists on an article, THE system SHALL reject the request.

THE system SHALL enforce uniqueness of tag names across all articles.

THE system SHALL prevent duplicate tag entries for the same tag name in the tag database.

THE system SHALL reject tag creation requests when a tag with the same name already exists.

THE system SHALL check for existing tag names before allowing new tag creation.

### Banned User Tag Restriction

WHEN a banned user attempts to apply a tag to an article, THE system SHALL reject the request.

WHEN a banned user attempts to create a new tag, THE system SHALL reject the request.

WHILE a user is banned, THE system SHALL prevent the user from applying or creating tags.

THE system SHALL verify user ban status before allowing any tag operations.

THE system SHALL reject tag-related requests when the user has an active ban record.

### Non-Existent Article Tag Application

WHEN a user attempts to apply a tag to an article that does not exist, THE system SHALL reject the request.

IF the target article has been deleted, THE system SHALL reject the request to apply tags.

THE system SHALL verify article existence before allowing tag application.

THE system SHALL return an error when attempting to apply tags to non-existent articles.

THE system SHALL validate that the target article ID corresponds to an existing article before processing the tag application.

### Tag Name Trimming

WHEN a user submits a tag name with leading or trailing whitespace, THE system SHALL trim the whitespace before processing.

WHEN a user submits a tag name with leading or trailing whitespace, THE system SHALL reject the request if the trimmed name is empty.

THE system SHALL automatically remove leading and trailing whitespace from tag names before validation and storage.

THE system SHALL validate the trimmed tag name against length requirements.

THE system SHALL preserve whitespace within the tag name but remove only leading and trailing spaces.

### Case-Sensitive Tag Uniqueness

WHEN a user attempts to create a tag with the same name but different casing as an existing tag, THE system SHALL reject the request.

THE system SHALL enforce case-sensitive uniqueness for tag names.

THE system SHALL prevent creation of tags with names that exactly match existing tag names, including case matching.

THE system SHALL treat tag names with identical characters and different casing as duplicates.

THE system SHALL verify tag name uniqueness while preserving case sensitivity in tag storage.

### Administrator-Only Tag Creation

WHEN a non-administrator user attempts to create a new tag, THE system SHALL reject the request.

WHEN a guest attempts to create a new tag, THE system SHALL reject the request.

WHEN a banned user attempts to create a new tag, THE system SHALL reject the request.

ONLY administrators and super administrators SHALL be permitted to create new tags.

THE system SHALL verify user role before allowing tag creation operations.

THE system SHALL restrict tag creation to users with administrator or super administrator roles.

### Article Tag Count Update

WHEN a tag is applied to an article, THE system SHALL increment the article's tag count.

WHEN a tag is removed from an article, THE system SHALL decrement the article's tag count.

THE system SHALL maintain an accurate count of tags associated with each article.

THE system SHALL update the tag count whenever tags are added or removed from an article.

THE system SHALL ensure the article's tag count reflects the actual number of tag associations.

### Tag Deletion Prevention

WHEN a user attempts to delete a tag that is associated with one or more articles, THE system SHALL reject the request.

THE system SHALL prevent deletion of tags that have active associations with articles.

WHEN a user attempts to delete a tag, THE system SHALL verify that no articles reference the tag.

THE system SHALL maintain referential integrity by preventing tag deletion while tag associations exist.

THE system SHALL only allow deletion of tags that are not associated with any articles.

## ArticleTag Error Scenarios

ArticleTag associations fail if either the article or tag doesn't exist. Duplicate tag assignments to the same article are prevented. Removing a tag from an article updates the article's tag count. ArticleTag entries are automatically deleted when the associated article is deleted. Tags cannot be added to articles during account ban or suspension. Creating an ArticleTag fails if the article is in a restricted section. Invalid date formats for assignedAt fields are rejected. The system prevents more than the maximum number of tags per article. ArticleTag creation fails if the user lacks permission to modify the article. Tag removal updates the associated article's last modified timestamp.

### Non-existent Article or Tag Association

WHEN a user attempts to associate an ArticleTag with a non-existent article, THE system SHALL reject the request.

WHEN a user attempts to associate an ArticleTag with a non-existent tag, THE system SHALL reject the request.

THE system SHALL prevent ArticleTag creation when either the article or tag identifier is invalid or does not exist in the system.

### Duplicate Tag Assignment Prevention

WHEN a user attempts to assign the same tag to an article that already has that tag assigned, THE system SHALL reject the request.

THE system SHALL ensure that each tag can only be assigned once per article.

IF a duplicate tag assignment is attempted, THE system SHALL return an error indicating the tag is already assigned to the article.

### Cascading Tag Deletion

WHEN an article is deleted, THE system SHALL automatically delete all associated ArticleTag records for that article.

WHEN a tag is deleted, THE system SHALL automatically remove all ArticleTag associations for that tag across all articles.

THE system SHALL ensure data consistency by cleaning up all ArticleTag references when an article or tag is removed.

### Banned User Tag Association Blocking

WHEN a banned user attempts to create an ArticleTag association, THE system SHALL reject the request.

THE system SHALL prevent banned users from assigning new tags to articles, regardless of article ownership.

IF a banned user tries to tag an article they authored, THE system SHALL block the operation and indicate the user's account is suspended.

### Restricted Section Tag Application

WHEN a user attempts to add a tag to an article in a restricted section, THE system SHALL reject the tag assignment request.

THE system SHALL enforce section-level access controls on tag operations.

IF the article belongs to a section with restricted tagging permissions, THE system SHALL prevent the ArticleTag creation.

### Invalid Date Format Rejection

WHEN an ArticleTag is created with an invalid format for the assignedAt timestamp, THE system SHALL reject the request.

THE system SHALL validate that all datetime values conform to ISO 8601 format.

IF the assignedAt field contains malformed date data, THE system SHALL return an error indicating invalid date format.

### Maximum Tags Per Article

WHEN a user attempts to add more tags to an article than the system allows, THE system SHALL reject the request.

THE system SHALL enforce a maximum limit on tags per article.

IF the article already has the maximum number of tags assigned, THE system SHALL reject additional tag assignments until existing tags are removed.

### Article Modification Permission

WHEN a user attempts to create an ArticleTag for an article they do not have permission to modify, THE system SHALL reject the request.

THE system SHALL verify that the user has authorization to modify the article before allowing tag assignment.

IF the user lacks the required permissions, THE system SHALL indicate insufficient access rights and prevent the ArticleTag creation.

### Timestamp Update on Tag Removal

WHEN an ArticleTag association is removed, THE system SHALL update the associated article's last modified timestamp.

THE system SHALL record the current datetime when a tag is disassociated from an article.

This timestamp update ensures the article shows recent activity even when only tag associations change.

### ArticleTag Deletion Consistency

WHEN an ArticleTag is deleted, THE system SHALL ensure all related references are properly removed without leaving orphaned records.

THE system SHALL maintain referential integrity between ArticleTag records and their associated articles and tags.

IF any inconsistency is detected during deletion, THE system SHALL roll back the operation and return an error.

## AdministratorRequest Error Scenarios

Users cannot submit a new administrator request while another is pending. Requests with empty reason text are rejected. Super administrators cannot be demoted by regular administrators. A super administrator cannot demote themselves. Administrator requests for banned users are automatically rejected. Duplicate requests from the same user within a time window are prevented. Approving a request sets the user's administrator status immediately. Rejecting a request allows resubmission after a waiting period. Request timestamps must be valid chronological dates. Only super administrators can view or modify all pending requests.

### Pending Request Blocking

WHEN a user submits a new administrator request while another request is in "pending" status, THE system SHALL reject the new request and indicate that a request is already pending.

WHILE a user has an administrator request with "pending" status, THE system SHALL prevent the user from submitting additional administrator requests.

### Empty Reason Rejection

WHEN a user submits an administrator request with empty or whitespace-only reason text, THE system SHALL reject the request as invalid.

IF the reason field contains only whitespace characters, THE system SHALL treat it as an empty reason and reject the request.

### Administrator Grade Hierarchy

WHEN a regular administrator attempts to demote a super administrator to regular administrator, THE system SHALL reject the action.

Only super administrators have the authority to modify administrator grades, and regular administrators cannot change super administrator status.

### Self-Demotion Prevention

WHEN a super administrator attempts to demote themselves to regular administrator, THE system SHALL reject the action.

A super administrator must be demoted by another super administrator; self-demotion is prohibited.

### Banned User Request Rejection

WHEN a banned user submits an administrator request, THE system SHALL automatically reject the request without processing.

The system SHALL store the rejection reason indicating the user is currently banned.

### Duplicate Request Cooldown

WHEN a user submits a duplicate administrator request within the cooldown period after rejection, THE system SHALL reject the request.

The cooldown period is defined in business rules as 30 days from the rejection date.

### Immediate Status Update on Approval

WHEN a super administrator approves an administrator request, THE system SHALL immediately update the user's role to "admin".

The system SHALL record the approval timestamp as the effective date of the administrator status change.

### Waiting Period for Resubmission

WHEN a user submits a new administrator request within the waiting period after rejection, THE system SHALL reject the request as premature.

The waiting period begins on the rejection date and continues until the cooldown period expires.

### Invalid Timestamp Rejection

WHEN an administrator request has an invalid submission timestamp (e.g., future date or date outside acceptable range), THE system SHALL reject the request.

The system SHALL validate that the submittedAt timestamp is a reasonable chronological date.

### Super Admin Request Visibility

WHEN a regular administrator attempts to view the list of all pending administrator requests, THE system SHALL restrict access and only show requests submitted by that administrator.

WHEN a super administrator views the administrator requests list, THE system SHALL display all pending, approved, and rejected requests.

## BanRecord Error Scenarios

Users cannot ban themselves. Ban creation requires a non-empty reason. Unbanning a user who is not banned fails gracefully. Administrators cannot ban super administrators. Users with pending administrator requests cannot be banned. Banning a user does not delete their existing content. Duplicate ban records for the same user are prevented. Ban reasons exceeding maximum length are rejected. The unbanning process requires explicit administrator action—no automatic unbanning. Banned users retain access to their existing articles and comments.

### Self-Ban Prevention

WHEN an administrator attempts to ban themselves, THE system SHALL reject the request.
WHILE a user is currently logged in as an administrator, THE system SHALL prevent them from initiating a ban on their own account.

### Required Ban Reason

WHEN an administrator creates a ban record, THE system SHALL require a non-empty ban reason.
IF the ban reason is empty, THE system SHALL reject the ban request with an appropriate error.

### Unbanning Non-Banned Users

WHEN an administrator attempts to unban a user who is not currently banned, THE system SHALL return a clear indication that no active ban exists.
IF no ban record exists for the target user, THE system SHALL not create a new ban record automatically.

### Super Administrator Protection

WHEN a regular administrator attempts to ban a super administrator, THE system SHALL reject the request.
WHEN any administrator attempts to ban a user with super administrator grade, THE system SHALL block the operation regardless of ban reason provided.

### Pending Request User Ban Blocking

WHEN an administrator attempts to ban a user who has a pending administrator request, THE system SHALL reject the ban request.
WHILE a user has an active pending administrator request, THE system SHALL prevent their account from being banned until the request is processed.

### Content Retention on Ban

WHEN a user is banned, THE system SHALL retain all of their existing articles.
WHEN a user is banned, THE system SHALL retain all of their existing comments.
WHILE a user is banned, THE system SHALL maintain the visibility of their previously published content.

### Duplicate Ban Prevention

THE system SHALL prevent multiple active ban records for the same user.
IF a ban record already exists for a user, THE system SHALL reject any new ban request for that user until the existing ban is resolved.

### Reason Length Validation

WHEN an administrator creates a ban record, THE system SHALL validate the ban reason length.
IF the ban reason exceeds the maximum allowed length, THE system SHALL reject the request and notify the administrator of the length constraint.

### Explicit Unbanning Requirement

WHILE a user is banned, THE system SHALL require explicit administrator action to unban them.
THE system SHALL NOT automatically unban users based on time passage or other automated conditions.

### Existing Content Access for Banned Users

WHEN a user is banned, THE system SHALL preserve the visibility of their articles to other users.
WHEN a user is banned, THE system SHALL preserve the visibility of their comments to other users.
BANNED users SHALL NOT be able to create new articles or comments, but their existing content remains accessible to the community.

# End-to-End User Scenarios

Cross-domain user scenarios, multi-step business flows, and end-to-end use cases.

## User User Scenarios

Users sign up by providing a unique email address and creating a password. After registration, users must verify their email address before gaining full access. Once verified, users can log in using their email and password credentials. Upon login, users can view and edit their profile information including display name and bio text. Users can change their password at any time for security purposes. When users decide to leave the platform, they can delete their account, which permanently removes all their articles and comments. Banned users are prevented from logging in, though their existing content remains visible to others.

### User Registration Flow

WHEN a new user begins registration, THE system SHALL provide a registration form that collects email and password.

WHEN a user submits their registration, THE system SHALL:
1. Validate that the email address is not already in use
2. Require a valid password format
3. Create a new user account with pending verification status
4. Generate and store a verification token for email confirmation

IF the email address is already registered, THE system SHALL reject the registration request.
IF the password does not meet security requirements, THE system SHALL reject the registration request.

### Email Verification Process

WHEN a user registers, THE system SHALL automatically send a verification email containing a unique verification link.

WHEN a user clicks the verification link, THE system SHALL:
1. Validate the verification token
2. Update the user's status to verified
3. Grant the user full access to the platform

IF the verification token is invalid or expired, THE system SHALL reject the verification request and provide instructions for requesting a new verification email.
IF a user attempts to log in before verifying their email, THE system SHALL prevent login and prompt the user to verify their email address.

### Password Management

WHEN a user logs in, THE system SHALL authenticate them using their email and password credentials.

WHEN a user requests to change their password, THE system SHALL:
1. Require the user to provide their current password for verification
2. Require a new password that meets security requirements
3. Update the stored password hash

IF the current password is incorrect during a password change request, THE system SHALL reject the request.
IF the new password does not meet security requirements, THE system SHALL reject the request.
IF a user attempts to set their new password to be identical to their current password, THE system SHALL reject the request.

### Profile Editing

WHEN a user accesses their profile settings, THE system SHALL display their current display name and bio.

WHEN a user edits their profile information, THE system SHALL:
1. Allow updates to the display name (1-100 characters)
2. Allow updates to the bio text
3. Preserve the original email and password
4. Update the last modified timestamp

IF the display name is empty or exceeds 100 characters, THE system SHALL reject the update request.

### Account Deletion

WHEN a user initiates account deletion, THE system SHALL:
1. Require confirmation of the deletion action
2. Permanently remove the user's account
3. Delete all articles written by the user
4. Delete all comments written by the user
5. Invalidate all active sessions for that user

IF a user attempts to delete their account, THE system SHALL require explicit confirmation before proceeding with deletion.

### Login Authentication

WHEN a user attempts to log in, THE system SHALL:
1. Verify the provided email exists in the system
2. Validate the provided password against the stored hash
3. Grant access if authentication is successful
4. Create a new authentication session

IF the email address is not found, THE system SHALL reject the login attempt.
IF the password is incorrect, THE system SHALL reject the login attempt.
IF a user's account has been banned, THE system SHALL prevent login and indicate the account has been suspended.

### Banned User Experience

WHEN a banned user attempts to log in, THE system SHALL prevent the login and notify the user their account has been suspended.

WHEN a banned user attempts to view the platform, THE system SHALL:
1. Prevent access to authenticated features
2. Show a message indicating their account has been banned
3. Preserve visibility of their existing articles and comments to other users

WHEN an administrator unbans a user, THE system SHALL:
1. Update the ban status to unbanned
2. Restore the user's ability to log in and access the platform
3. Retain the record of the ban and unban actions

## Section User Scenarios

Users can browse the complete list of discussion sections available on the platform. Each section displays its name and description to help users understand its topic focus. When users select a specific section, they can view all articles posted within that section. The article list within each section supports pagination to handle large numbers of posts. Users can sort articles in a section by newest first or oldest first to find content relevant to their needs. Section navigation allows users to explore different economic and political topics efficiently.

### Section Browsing and Navigation

WHEN a user browses the discussion board home page, THE system SHALL display a list of all available sections.

WHEN a user selects a section from the list, THE system SHALL navigate to that section's page and display articles belonging to that section.

WHEN a user clicks on a section name in any article or comment context, THE system SHALL navigate to that section's page.

THE system SHALL display each section with its name and description during browsing.

WHERE a user has administrative privileges, THE system SHALL provide section management capabilities in addition to standard browsing.

IF no sections exist, THE system SHALL display a message indicating no sections are available.

WHILE browsing sections, THE system SHALL ensure all sections are accessible regardless of user authentication status.

WHERE multiple sections exist, THE system SHALL display sections in alphabetical order by default.

### Section Description Viewing

WHEN a user views a section page, THE system SHALL display the section's description below the section name.

THE system SHALL display section descriptions in plain text format without markdown processing.

WHERE a section description is empty, THE system SHALL display a placeholder text indicating no description is available.

WHEN a user hovers over a section in the section list, THE system SHALL display the full section description in a tooltip.

THE system SHALL not truncate section descriptions when viewing the section page itself.

WHERE an administrator edits a section description, THE system SHALL update the description immediately for all future views.

WHILE viewing any section, THE system SHALL ensure the description is clearly distinguishable from other page content.

### Article Listing by Section

WHEN a user navigates to a section page, THE system SHALL display a paginated list of articles belonging to that section.

THE system SHALL display at most 20 articles per page in the section article list.

WHEN a user reaches the last page of articles, THE system SHALL disable the "next page" navigation control.

WHEN a user is on the first page of articles, THE system SHALL disable the "previous page" navigation control.

THE system SHALL display only articles that belong to the currently viewed section.

WHEN a user creates a new article in a section, THE system SHALL immediately include it in that section's article list (subject to pagination).

WHEN a user deletes an article, THE system SHALL remove it from the section's article list.

WHERE a section contains no articles, THE system SHALL display a message indicating no articles are available in that section.

### Article Sorting Options

WHEN a user views a section's article list, THE system SHALL provide sorting options for "newest first" and "oldest first".

BY DEFAULT, THE system SHALL sort articles by newest first.

WHEN a user selects "oldest first" sorting, THE system SHALL reorder the article list accordingly.

THE system SHALL maintain the selected sorting preference when navigating between pages within the same section.

WHEN a user changes sections, THE system SHALL reset sorting to the default (newest first) for the new section.

WHERE articles have identical timestamps, THE system SHALL use article ID as a secondary sort criterion to ensure stable ordering.

THE system SHALL display the current sorting option alongside the sort controls for clarity.

### Content Organization and Topic Categorization

THE system SHALL use sections as the primary method for organizing content by topic category.

WHERE a user visits the discussion board, THE system SHALL provide clear visual distinction between different sections to aid content navigation.

WHEN a user creates an article, THE system SHALL require selection of exactly one section to ensure proper categorization.

THE system SHALL prevent articles from being assigned to multiple sections simultaneously.

WHERE sections are renamed, THE system SHALL update all articles belonging to that section to reflect the new section name.

WHEN an administrator creates a new section, THE system SHALL make it immediately available for article categorization.

WHERE a section is deleted, THE system SHALL prevent new articles from being assigned to that section while preserving existing articles in archived form.

## Article User Scenarios

Users create new articles by selecting a section, entering a title, and writing content. When creating an article, users can attach multiple files and images to support their discussion points. Users can add relevant tags to their articles to improve discoverability. After publication, users can edit their articles at any time, including updating the title, content, attachments, and tags. When users are ready to remove their content, they can delete their own articles. Article creation requires all fields to be completed before submission. Users can view their own articles along with those created by others.

### Article Creation Workflow

WHEN a user creates an article, THE system SHALL:
1. Require a title
2. Require content (text)
3. Require section selection from available sections
4. Allow optional file attachments
5. Allow optional image attachments
6. Allow optional tag assignments
7. Associate the article with the creating user
8. Set the creation timestamp to the current time
9. Set the section assignment as required field

IF the title is missing, THE system SHALL reject the request.
IF the content is empty, THE system SHALL reject the request.
IF no section is selected, THE system SHALL reject the request.
IF the user lacks permission to post in the selected section, THE system SHALL reject the request.

WHERE section assignment is required, THE system SHALL only allow sections created by administrators.

WHILE the user is creating an article, THE system SHALL:
- Display validation errors for missing required fields
- Allow preview of the article before final submission
- Enable addition of multiple files and images
- Allow free-text tag entry with no predefined list

### Article Editing Workflow

WHEN a user edits their own article, THE system SHALL:
1. Allow title modification
2. Allow content modification
3. Allow section reassignment to another available section
4. Allow file attachment updates (add/remove)
5. Allow image attachment updates (add/remove)
6. Allow tag modifications (add/remove)
7. Update the last edited timestamp

WHERE a user attempts to edit another user's article, THE system SHALL reject the request.

WHEN an administrator edits any article, THE system SHALL:
1. Allow all modifications permitted to regular users
2. Preserve the original author association
3. Update the last edited timestamp

WHEN an article is edited, THE system SHALL:
- Update only the fields that were modified
- Maintain unchanged fields as they were before editing
- Update the timestamp for the last modification

IF a user attempts to edit an article they do not own and are not an administrator, THE system SHALL reject the request.

### Article Deletion Workflow

WHEN a user deletes their own article, THE system SHALL:
1. Remove the article from public view
2. Delete all associated comments
3. Delete all file and image attachments
4. Remove all tag associations
5. Record the deletion timestamp

WHERE a user attempts to delete another user's article, THE system SHALL reject the request.

WHEN an administrator deletes any article, THE system SHALL:
1. Remove the article from public view
2. Delete all associated comments
3. Delete all file and image attachments
4. Remove all tag associations
5. Record the deletion timestamp and administrator identifier

WHEN an article is deleted, THE system SHALL:
- Preserve evidence of deletion (audit trail) without exposing the deleted content
- Update the user's article count statistics
- Update section article counts

WHERE an article is deleted, THE system SHALL:
- Keep references to the article's comments, file attachments, and tags in their respective lists
- Maintain references to the user who created the deleted content
- Record that the content was deleted without exposing the deleted material

WHILE an article is being deleted, THE system SHALL:
- Prevent new comments from being added to the article
- Prevent new file or image attachments to the article
- Prevent new tag assignments to the article

### File and Image Attachments

WHEN a user adds file attachments to an article, THE system SHALL:
1. Allow multiple files to be attached to a single article
2. Validate file sizes against limits
3. Validate file types against allowed formats
4. Store file metadata (name, URL, size, type, upload timestamp)
5. Associate each file with the article

WHERE an article is edited, THE system SHALL:
1. Allow new files to be added to existing attachments
2. Allow existing files to be removed
3. Maintain attachments that are not being modified
4. Update the article's last modified timestamp

WHEN a user uploads images to an article, THE system SHALL:
1. Allow multiple images to be uploaded alongside files
2. Validate image file sizes against limits
3. Validate image file types (typically image formats)
4. Store image metadata (name, URL, size, type, upload timestamp)
5. Associate each image with the article

WHERE an article is viewed, THE system SHALL:
1. Display attached files with download links
2. Display attached images with preview functionality
3. Show file and image counts in the article details

WHEN a user downloads a file or image attachment, THE system SHALL:
1. Verify the user has permission to access the article
2. Provide the file content at the stored URL
3. Set appropriate content-disposition headers for file downloads

IF file or image attachment limits are exceeded, THE system SHALL:
1. Reject the upload request
2. Display the maximum allowed count to the user
3. Preserve existing attachments if any

WHERE a file or image is associated with an article, THE system SHALL:
1. Store the association with the article identifier
2. Track the upload timestamp
3. Associate with the user who uploaded the file

### Tag Management

WHEN a user adds tags to an article, THE system SHALL:
1. Allow free-text tag entry (no predefined list)
2. Allow multiple tags per article
3. Validate tag name length (1-50 characters)
4. Create tag if it doesn't exist in the system
5. Associate each tag with the article through an ArticleTag relationship
6. Record the assignment timestamp for each tag

WHERE a user edits an article, THE system SHALL:
1. Allow new tags to be added
2. Allow existing tags to be removed
3. Maintain unchanged tag associations
4. Update the article's last modified timestamp

WHEN a user searches articles, THE system SHALL:
1. Match articles by tag name
2. Include articles tagged with any of the search terms
3. Return paginated results with article metadata
4. Sort results by specified criteria (newest, oldest)

WHERE a tag is used across articles, THE system SHALL:
1. Maintain the tag name as a canonical reference
2. Track how many articles use each tag
3. Support filtering articles by specific tags

WHEN an article is deleted, THE system SHALL:
1. Remove the ArticleTag associations between the article and its tags
2. Preserve the tags themselves for continued use in other articles
3. Update tag usage counts for affected tags

IF a tag name exceeds the maximum length (50 characters), THE system SHALL:
1. Reject the tag assignment request
2. Display the length constraint to the user
3. Preserve existing tag associations on the article

### Section Assignment

WHEN a user creates an article, THE system SHALL:
1. Require assignment to exactly one section
2. Only allow sections created by administrators
3. Validate that the selected section exists and is active
4. Associate the article with the chosen section
5. Prevent assignment to multiple sections

WHERE a user edits an article, THE system SHALL:
1. Allow reassignment to a different section
2. Validate that the new section exists and is active
3. Update the section association
4. Record the section change with the article's update timestamp

WHEN a user browses articles by section, THE system SHALL:
1. Filter articles to show only those in the selected section
2. Display paginated results with article metadata
3. Sort articles by specified criteria (newest first, oldest first)
4. Show section description when viewing the section's article list

WHERE an article is associated with a section, THE system SHALL:
1. Update the section's article count
2. Maintain the relationship through the section identifier
3. Preserve the section association unless explicitly changed

WHEN a section is deleted by an administrator, THE system SHALL:
1. Prevent new articles from being assigned to that section
2. Either delete articles in that section or assign them to a default section
3. Update the section count in the system
4. Preserve evidence of the section's existence in article history

IF an invalid section is selected for article creation, THE system SHALL:
1. Reject the article creation request
2. Display a validation message indicating the section selection is required
3. Show available sections for selection

WHILE an article is being created, THE system SHALL:
1. Display available sections for selection
2. Show section descriptions to assist in selection
3. Validate that exactly one section is selected before submission

## Comment User Scenarios

Users can add comments to any article to contribute to discussions. Comments appear sorted by oldest first to maintain conversation context. Users can edit their own comments to correct mistakes or improve their thoughts. When users want to remove their contributions, they can delete their own comments. Each comment displays the author's name, content, and posting time for transparency. Comments are single-level with no reply threads, keeping discussions straightforward. Users can view all comments on an article before adding their own.

### Comment Writing

WHEN a user writes a comment on an article, THE system SHALL:
1. Require the user to be logged in
2. Require the comment content to be non-empty
3. Require the comment to be associated with a valid article
4. Record the comment author as the creating user
5. Set the creation timestamp to the current time

IF the user is not logged in, THE system SHALL reject the request.
IF the comment content is empty, THE system SHALL reject the request.
IF the article does not exist, THE system SHALL reject the request.
IF the user is banned, THE system SHALL reject the request.

WHERE a user writes a comment, THE system SHALL ensure the article is accessible to the user.

### Comment Editing

WHEN a user edits their own comment, THE system SHALL:
1. Allow modification of the comment content
2. Update the last updated timestamp
3. Preserve the authorship information
4. Maintain the comment's association with the original article

WHEN a user attempts to edit another user's comment, THE system SHALL reject the request.
IF the comment does not exist, THE system SHALL reject the request.
IF the user is banned, THE system SHALL reject the request.
IF the new comment content is identical to the existing content, THE system SHALL reject the request.
IF the new comment content is empty, THE system SHALL reject the request.

WHERE a user edits a comment, THE system SHALL verify the user is the comment author.

### Comment Deletion

WHEN a user deletes their own comment, THE system SHALL:
1. Remove the comment from the system
2. Update the comment count on the associated article
3. Preserve the article and its other comments
4. Not affect other users' comments on the same article

WHEN a user attempts to delete another user's comment, THE system SHALL reject the request.
IF the comment does not exist, THE system SHALL reject the request.
IF the user is banned, THE system SHALL reject the request.

WHERE a user deletes a comment, THE system SHALL verify the user is the comment author.

### Comment Sorting

WHEN a user views comments on an article, THE system SHALL:
1. Sort comments by creation timestamp in ascending order
2. Display comments with the oldest appearing first
3. Include all comments associated with the article
4. Maintain sort order regardless of article editing

WHILE viewing comments on an article, THE system SHALL:
1. Preserve the oldest-first sorting order
2. Include newly added comments at the end of the sort order
3. Not reorder existing comments when new comments are added

WHERE comment sorting is applied, THE system SHALL NOT support alternative sort orders.

### Comment Display

WHEN a user views a comment, THE system SHALL display:
1. The comment author's display name
2. The comment content
3. The comment creation timestamp
4. The comment's association with the article

WHERE comment display is shown, THE system SHALL:
1. Include author display name (not email or internal identifiers)
2. Show content exactly as stored (no truncation for list views)
3. Display timestamps in a user-friendly format
4. Maintain consistency across comment views

WHILE viewing an article, THE system SHALL display all comments associated with that article.

### Single-Level Comments

WHEN a user writes a comment, THE system SHALL:
1. Create a single-level comment with no nested replies
2. Associate the comment directly with the article
3. Not allow sub-comments or reply threads
4. Maintain flat comment structure

WHILE viewing comments, THE system SHALL:
1. Display comments as a flat list with no hierarchy
2. Not provideReply buttons or nested comment interfaces
3. Treat all comments as equal in the discussion tree
4. Not support threaded or nested discussion structures

WHERE comment structure is enforced, THE system SHALL:
1. Reject attempts to create nested comment hierarchies
2. Only permit top-level comments on articles
3. Maintain consistent single-level structure across all articles

### Discussion Participation

WHEN a user participates in article discussions, THE system SHALL:
1. Allow multiple users to comment on the same article
2. Enable conversation through sequential comment posting
3. Display all comments to provide full context
4. Maintain chronological order for discussion flow

WHERE a user participates in discussion, THE system SHALL:
1. Show all existing comments before new comment input
2. Display new comments in chronological order
3. Allow users to reference previous comments in their contributions
4. Maintain discussion thread integrity

WHILE participating in discussion, THE system SHALL:
1. Preserve comment history for new participants
2. Allow continuous discussion despite user turnover
3. Maintain all comment context for ongoing conversations
4. Support multiple participants in same discussion thread

### Comment Visibility

WHEN comments are displayed, THE system SHALL:
1. Show all comments associated with an article
2. Make comments visible to all users with article access
3. Preserve comments when users are banned
4. Show comment author name and content clearly

WHERE comment visibility is managed, THE system SHALL:
1. Display comments even when author accounts are deactivated
2. Show comment content as written (subject to moderation)
3. Maintain comment counts on article listings
4. Include all comments in article page views

WHILE a user views an article, THE system SHALL:
1. Display all comments associated with that article
2. Show comment visibility consistently across users
3. Include comments in article view statistics
4. Maintain comment display during article editing

## FileAttachment User Scenarios

Users attach files to their articles during creation or editing to support their points with additional resources. Multiple files can be attached to a single article, each with its filename displayed. Users can download attached files when viewing articles to access supporting materials. When editing articles, users can remove attached files if they no longer need them. All file attachments are managed through the article interface, with users seeing a list of attached files. File management is tied directly to article lifecycle, so attachments are deleted when the article is removed.

### File Attachment to Articles

WHEN a user attaches a file to an article, THE system SHALL:
1. Require the user to be logged in and not banned
2. Associate the file with the specific article
3. Store the filename, file URL, file size, and file type
4. Record the upload timestamp

WHILE a user is editing an article, THE system SHALL:
1. Allow adding new file attachments to that article
2. Preserve existing attachments during the edit process
3. Display currently attached files for review before saving

IF the user is banned, THE system SHALL reject the file attachment request.
IF the article does not exist, THE system SHALL reject the attachment request.

### File Upload Process

WHEN a user uploads a file for an article, THE system SHALL:
1. Accept the file through the article interface
2. Generate a unique file identifier
3. Store the file securely
4. Create a FileAttachment record with the required metadata
5. Associate the FileAttachment with the article

WHEN file storage fails, THE system SHALL:
1. Cancel the file attachment operation
2. Notify the user of the failure
3. Preserve the article content without the attachment

### Multiple File Upload

WHEN a user uploads multiple files for an article, THE system SHALL:
1. Process each file independently in the same request
2. Create separate FileAttachment records for each file
3. Maintain the order of uploads if specified by the user
4. Display all uploaded files as a list after successful upload

THE system SHALL:
1. Limit the maximum number of file attachments per article to 10
2. Process all files in a single request when batch upload is initiated
3. Handle partial failures by processing successful files and rejecting failed ones
4. Report which files succeeded and which failed in case of partial failure

IF the user attempts to attach more than 10 files to a single article, THE system SHALL reject the request and indicate the maximum attachment limit has been exceeded.

### File Download

WHEN a user downloads an attached file from an article, THE system SHALL:
1. Verify the user can view the article containing the file
2. Locate the file using the stored file URL
3. Deliver the file to the user's browser for download
4. Preserve the original filename in the download

WHILE a user views an article, THE system SHALL:
1. Display download links for all attached files
2. Show the filename, file size, and upload date for each attachment
3. Allow direct download by clicking on any attachment

IF the file has been deleted from storage, THE system SHALL:
1. Display an error message indicating the file is unavailable
2. Remove the FileAttachment record from the article display
3. Log the issue for administrator review

### Attachment Management

WHEN a user manages attachments for their article, THE system SHALL:
1. Display all attached files with their metadata
2. Provide options to view or download each file
3. Allow removal of individual files before publishing the article
4. Maintain attachment count within system limits

WHILE editing an article, THE system SHALL:
1. Preserve existing attachments unless explicitly removed
2. Allow adding new attachments during the editing process
3. Show a complete list of current attachments for review
4. Update the article's timestamp when attachments are added or removed

WHEN a user successfully uploads a file, THE system SHALL:
1. Immediately associate it with the article
2. Update the article's attachment count
3. Display the new file in the attachment list
4. Confirm successful upload to the user

### File Removal

WHEN a user removes a file attachment from an article, THE system SHALL:
1. Delete the file from storage
2. Remove the FileAttachment record from the article
3. Update the article's attachment count
4. Update the article's last modified timestamp

WHILE editing an article, THE system SHALL:
1. Allow users to deselect files for removal before saving changes
2. Prevent removal of files if the user lacks permission to edit the article
3. Confirm successful removal and update the attachment list
4. Preserve other attachments when removing specific files

IF a user attempts to remove a file they did not upload to an article, THE system SHALL:
1. Allow removal if the user has administrative privileges
2. Reject the request with appropriate error message if the user is not an administrator
3. Log the attempt for security auditing

WHEN an article is deleted, THE system SHALL:
1. Remove all associated FileAttachment records
2. Delete all associated files from storage
3. Return storage resources
4. Complete deletion before confirming article removal

### Attachment Display

WHEN a user views an article, THE system SHALL:
1. Display a section listing all attached files
2. Show the filename, file size, and upload timestamp for each attachment
3. Provide download links for each attached file
4. Organize attachments in a clearly marked section separate from article content

WHEN viewing an article with no attachments, THE system SHALL:
1. Display a message indicating no files are attached
2. Not display an empty attachments section
3. Allow file uploads if the user has permission to edit the article

THE system SHALL:
1. Display file type icons to help identify file formats
2. Show file size in human-readable format (e.g., KB, MB)
3. Sort attachments chronologically with newest last
4. Maintain consistent formatting across all article views

### File Handling

THE system SHALL:
1. Store all file attachments in a secure, organized directory structure
2. Validate file types to prevent malicious file uploads
3. Enforce maximum file size limits per attachment
4. Handle concurrent upload requests without data corruption
5. Implement virus scanning for uploaded files
6. Maintain file integrity through checksum verification
7. Provide backup procedures for file attachments
8. Implement access controls to prevent unauthorized file access

WHEN file-related operations encounter issues, THE system SHALL:
1. Log detailed error information for troubleshooting
2. Notify users of file operation failures with actionable information
3. Preserve data consistency by failing gracefully
4. Implement retry mechanisms for transient failures

IF a file is corrupted or inaccessible, THE system SHALL:
1. Mark the FileAttachment as unavailable
2. Display an appropriate error message
3. Allow administrators to investigate and resolve the issue
4. Continue serving the article content without the affected file

## Tag User Scenarios

Users add free-text tags to their articles during creation or editing to categorize content by topic. Multiple tags can be applied to a single article to improve searchability. When searching for content, users can filter articles by specific tags to find relevant discussions. Tags appear alongside article listings to provide quick topic identification. The tagging system supports flexible categorization without predefined lists, allowing users to create their own organizational structure. Users can add or remove tags as article topics evolve or as they refine their content focus.

### Tag Creation

### Tag Creation on Articles

WHEN a user creates a new article, THE system SHALL allow them to add multiple free-text tags to categorize the article by topic.

WHEN a user edits an existing article, THE system SHALL allow them to add new tags, modify existing tags, or remove tags.

WHEN a user submits tags with an article, THE system SHALL require each tag to be non-empty and between 1-50 characters.

WHEN a user adds a tag that already exists, THE system SHALL associate the article with the existing tag rather than creating a duplicate.

IF a user submits a tag that violates the length requirements, THE system SHALL reject the request and indicate which tag is invalid.

WHERE a user adds a tag, THE system SHALL record the tag assignment timestamp for tracking purposes.

### Tag Management

### Tag Management on Articles

WHEN a user edits their own article, THE system SHALL allow them to add, modify, or remove tags.

WHEN a user removes a tag from an article, THE system SHALL disassociate the tag from that article without deleting the tag itself.

WHEN a user updates tags on an article, THE system SHALL record the update timestamp for the article.

WHEN a user attempts to edit tags on an article they do not own, THE system SHALL deny the request.

WHERE an article has been deleted, THE system SHALL disassociate all tags from that article.

WHERE a user has been banned, THE system SHALL prevent them from adding or modifying tags on articles.

### Tag Filtering

### Tag Filtering for Article Lists

WHEN a user filters articles by a specific tag, THE system SHALL display only articles associated with that tag.

WHEN filtering by a tag that has no articles, THE system SHALL display an empty list rather than an error.

WHEN a user applies multiple tag filters, THE system SHALL display only articles associated with ALL specified tags.

WHERE articles are filtered by tags, THE system SHALL respect pagination rules (defined in 04-business-rules.md).

WHERE articles are filtered by tags, THE system SHALL maintain sorting options (newest first, oldest first) as defined in the section listing.

### Tag Search

### Tag Search Functionality

WHEN a user searches for tags, THE system SHALL return tags whose names match the search query.

WHEN searching for tags, THE system SHALL match tags that contain the search query as a substring.

WHERE no tags match a search query, THE system SHALL return an empty result list.

WHEN a user selects a tag from search results, THE system SHALL filter articles by that tag.

WHERE articles are displayed with tag search applied, THE system SHALL indicate which tag triggered the search results.

### Tag Display

### Tag Display in Article Listings and Details

WHERE an article listing displays an article, THE system SHALL show all tags associated with that article.

WHERE an article detail page is displayed, THE system SHALL show all tags associated with that article.

WHERE an article has no tags, THE system SHALL display no tag indicators rather than empty placeholders.

WHERE tags are displayed, THE system SHALL separate multiple tags with consistent formatting (e.g., comma-separated).

WHERE a user views another user's profile, THE system SHALL display tags associated with that user's articles.

### Multi-Tag Support

### Multi-Tag Support for Articles

WHEN a user creates or edits an article, THE system SHALL allow them to add multiple tags simultaneously.

WHEN an article is associated with multiple tags, THE system SHALL enable filtering by any single tag or combination of tags.

WHERE an article has multiple tags, THE system SHALL preserve all tag associations when the article is displayed or searched.

WHEN a user removes one tag from an article with multiple tags, THE system SHALL preserve the remaining tag associations.

WHERE tag counts exceed display capacity, THE system SHALL provide a mechanism to view all associated tags.

### Topic Categorization

### Topic Categorization Using Tags

WHERE users add tags to articles, THE system SHALL enable topic-based organization of content without predefined categories.

WHEN users apply similar tags to related topics, THE system SHALL group articles by common tags to show topic clusters.

WHERE articles share multiple common tags, THE system SHALL suggest related articles based on tag overlap.

WHEN viewing articles filtered by a tag, THE system SHALL indicate the topic category represented by that tag.

WHERE tag analytics are available, THE system SHALL show which tags are most commonly associated with specific sections.

### Free-Text Tagging

### Free-Text Tagging Without Predefined Lists

WHEN a user creates a new tag that does not exist, THE system SHALL create the tag for future use.

WHERE no tags exist yet, THE system SHALL allow users to begin creating tags from scratch.

WHEN a user enters a tag with variations (case differences, spacing), THE system SHALL treat each unique variation as a separate tag.

WHERE tag management is needed, THE system SHALL allow users to search existing tags before creating new ones to avoid duplicates.

WHEN articles are associated with tags, THE system SHALL support any tag format the user chooses without validation beyond length requirements.

## ArticleTag User Scenarios

Users assign multiple tags to their articles automatically through the tagging interface when creating or editing content. Each tag assignment creates a record linking the article to the specific tag. When users remove a tag from an article, the association is removed from the article tag system. The system maintains timestamps for when each tag was assigned to an article. Users see all tags associated with an article when viewing or searching content. Article tag relationships support efficient content organization and discovery without requiring complex queries.

### Tag Assignment Process

WHEN a user creates an article, THE system SHALL allow them to assign multiple tags by entering free-text tag names separated by commas or spaces.

WHEN a user edits an existing article, THE system SHALL allow them to add new tags or modify existing tags.

WHEN a user submits tag assignments, THE system SHALL create ArticleTag records linking the article to each specified tag.

THE system SHALL automatically create a new Tag record if the entered tag name does not already exist in the system.

THE system SHALL convert tag names to lowercase for consistency.

WHILE a tag assignment is being processed, THE system SHALL prevent duplicate assignments of the same tag to the same article.

### Tag Association Display

WHEN a user views an article, THE system SHALL display all tags associated with that article.

WHEN a user views the list of articles in a section, THE system SHALL display the tags assigned to each article in the list view.

WHEN a user hovers over or clicks on a tag, THE system SHALL navigate to a page showing all articles with that tag.

THE system SHALL display the count of articles associated with each tag when showing tag lists.

### Tag Removal Scenarios

WHEN a user edits an article and removes a tag, THE system SHALL delete the corresponding ArticleTag record linking that article to the removed tag.

WHEN an article is deleted, THE system SHALL automatically remove all ArticleTag records associated with that article.

WHEN a tag is deleted, THE system SHALL automatically remove all ArticleTag records associated with that tag.

IF a user attempts to remove a tag from an article they do not own, THE system SHALL reject the request.

### Tag Timestamp Visibility

WHEN a user views an article, THE system SHALL display the timestamp for when each tag was assigned to the article.

THE system SHALL record the assignment timestamp in the ArticleTag record when a tag is first associated with an article.

WHEN an article is edited and the same tag is re-assigned, THE system SHALL NOT update the original assignment timestamp.

WHILE displaying tag lists or article tags, THE system SHALL show timestamps in the user's local timezone.

### Tag Management Workflows

WHEN a user searches for articles by tags, THE system SHALL return all articles associated with the selected tags.

THE system SHALL allow users to filter article lists by selecting one or more tags.

WHEN a user selects multiple tags, THE system SHALL return only articles that have ALL selected tags.

THE system SHALL provide a tag cloud or tag listing page showing all active tags sorted by frequency of use.

WHEN a user enters a tag name in the search bar, THE system SHALL suggest existing matching tags as they type.

### Article-Tag Linking

THE system SHALL ensure every ArticleTag record links exactly one article to exactly one tag.

WHEN a tag is reassigned to another article, THE system SHALL create a new ArticleTag record rather than modifying the existing one.

THE system SHALL maintain referential integrity between ArticleTag records, Article records, and Tag records.

WHEN a user attempts to link a tag to a non-existent article, THE system SHALL reject the request with an appropriate error message.

### Content Organization with Tags

THE system SHALL use ArticleTag records to organize content by enabling efficient tag-based filtering and searching.

WHEN a user views articles in a section, THE system SHALL allow them to further organize results by selecting tags of interest.

THE system SHALL display the relationship between articles and tags clearly in the user interface.

WHEN multiple articles share common tags, THE system SHALL group or highlight related content.

### Tagged Content Discovery

WHEN a user searches for articles containing specific keywords AND tags, THE system SHALL combine both search criteria to return relevant results.

THE system SHALL allow users to discover related content by viewing all articles associated with the same tag.

WHEN a user clicks on a popular tag, THE system SHALL navigate to a dedicated page listing all articles with that tag, sorted by newest first by default.

THE system SHALL show tags relevant to the user's interests based on their tagging history and article views.

## AdministratorRequest User Scenarios

Any user can submit a request to become an administrator by providing a reason for their request. After submission, the request enters a pending state visible only to super administrators. Super administrators can review the list of pending requests and choose to approve or reject them. When a request is approved, the user gains regular administrator capabilities. Administrators can view their request status at any time to track processing. If rejected, users can submit a new request after receiving feedback. The system records timestamps for when requests are submitted and processed.

### Administrator Request Submission

WHEN a user submits a request to become an administrator, THE system SHALL:
1. Require the user to provide a reason explaining why they should become an administrator
2. Create the request with a status of "pending"
3. Record the submission timestamp
4. Associate the request with the submitting user

IF the reason is empty, THE system SHALL reject the request.
IF the user is already an administrator, THE system SHALL reject the request.
IF the user is banned, THE system SHALL reject the request.

### Pending Request View for Super Administrators

WHEN a super administrator views pending administrator requests, THE system SHALL:
1. Display a list of all requests with status "pending"
2. Show the submitting user's display name
3. Show the reason provided in the request
4. Show the submission timestamp
5. Provide options to approve or reject each request

WHILE the request remains pending, THE system SHALL:
- Prevent the user from accessing administrator capabilities

### Request Approval Workflow

WHEN a super administrator approves an administrator request, THE system SHALL:
1. Update the request status to "approved"
2. Record the approval timestamp
3. Assign the user the "admin" role
4. Notify the user of the approval

WHERE an administrator requests another promotion, THE system SHALL:
- Require explicit action from a super administrator to change the grade

### Administrator Onboarding After Approval

AFTER a user's administrator request is approved, THE system SHALL:
1. Immediately grant the user administrator capabilities
2. Allow the user to create, edit, and delete sections
3. Allow the user to delete any article or comment
4. Allow the user to view and manage ban records

WHEN a newly approved administrator accesses the system, THE system SHALL:
- Show a welcome message indicating their new role

### Request Status Check by Users

WHEN a user checks the status of their administrator request, THE system SHALL:
1. Show the current status (pending, approved, or rejected)
2. Show the submission timestamp
3. Show the processing timestamp (if processed)
4. Show the rejection reason (if rejected)

WHERE a request has status "pending", THE system SHALL:
- Allow the user to view the reason they provided

WHERE a request has been rejected, THE system SHALL:
- Allow the user to submit a new request with updated information

### Rejection Handling and Feedback

WHEN a super administrator rejects an administrator request, THE system SHALL:
1. Update the request status to "rejected"
2. Record the rejection timestamp
3. Require a reason for the rejection to be recorded
4. Notify the user of the rejection

IF the rejection reason is empty, THE system SHALL reject the rejection action.

WHERE a user receives a rejection notification, THE system SHALL:
- Allow the user to view the provided rejection reason before submitting a new request

### Administrator Activation

WHEN a user becomes an administrator, THE system SHALL:
1. Update their role from "member" to "admin"
2. Enable all administrator capabilities immediately
3. Preserve all previous member capabilities

WHERE an administrator logs in, THE system SHALL:
- Show administrator-specific UI elements and capabilities

### Administrator Role Changes

WHEN a super administrator promotes an admin to super admin, THE system SHALL:
1. Update the user's role to "super admin"
2. Record the change timestamp
3. Notify the user of the role change

WHEN a super administrator demotes a super admin to regular admin, THE system SHALL:
1. Update the user's role to "admin"
2. Record the change timestamp
3. Notify the user of the role change

IF the demotion would result in the last super admin losing their status, THE system SHALL reject the action.

WHERE a user attempts to demote themselves, THE system SHALL reject the action.

## BanRecord User Scenarios

Administrators can ban users by recording a reason for the ban, which prevents the banned user from logging in. When a user is banned, their existing articles and comments remain visible to other users. All administrators can view the list of currently banned users and their associated ban reasons. Administrators can unban users when circumstances change, which restores their access. Banned users cannot participate in discussions or create new content, but their previous contributions remain accessible. Each ban record maintains a timestamp for when the ban was implemented. Administrators can view ban history to understand patterns of user behavior.

### User Banning Process

WHEN an administrator bans a user, THE system SHALL:
1. Require a ban reason to be provided
2. Record the current datetime as the ban timestamp
3. Set the user's account status to banned
4. Log the administrator who executed the ban

IF the ban reason is missing, THE system SHALL reject the ban request.
IF an administrator attempts to ban themselves, THE system SHALL reject the ban request.
IF the target user is already banned, THE system SHALL reject the ban request.

THE system SHALL NOT allow banned users to log in to the platform.

WHILE a user is banned, THE system SHALL:
1. Continue to display their existing articles and comments to other users
2. Prevent the banned user from creating new articles
3. Prevent the banned user from posting new comments
4. Prevent the banned user from editing their existing content

# File Storage

File upload capabilities, media processing, and storage requirements.

## File Upload and Management

Define file upload capabilities, supported formats, processing requirements, and access control for stored files.

### File Upload Capabilities

WHEN a user uploads a file to an article, THE system SHALL:
1. Accept multiple files and images in a single upload
2. Preserve the original file name
3. Record the file size and file type
4. Generate a unique file URL for access
5. Associate the file with the specific article

WHEN a user uploads a file, THE system SHALL:
1. Validate that the file meets size and type requirements
2. Reject the upload if any file exceeds the maximum size limit
3. Reject the upload if any file exceeds the maximum attachment count per article
4. Store the file only after successful validation

IF a user attempts to upload a file that exceeds size limits, THE system SHALL reject the request with an appropriate error message.
IF a user attempts to attach more files than allowed per article, THE system SHALL reject the request with an appropriate error message.

### Media Handling

WHEN a user uploads an image as part of an article, THE system SHALL:
1. Accept common image formats for visual content
2. Preserve image dimensions and metadata where applicable
3. Make the image available for download through the file URL
4. Associate the image with the article it was uploaded for

WHEN an administrator deletes an article, THE system SHALL:
1. Remove all associated images and files from the article
2. Maintain the association between files and the deleted article for audit purposes

WHEN a user downloads an attached image or file, THE system SHALL:
1. Authenticate the request if the article is restricted
2. Deliver the file from the stored file URL
3. Preserve the original file type and content integrity

### Storage Management

WHEN file storage capacity reaches its limit, THE system SHALL:
1. Continue accepting uploads within current capacity constraints
2. Allow administrators to monitor storage utilization
3. Enable administrators to view storage reports

WHEN a user deletes their account, THE system SHALL:
1. Delete all files and images associated with that user's articles
2. Maintain referential integrity with remaining content
3. Remove all file associations from the user's articles

WHEN a file is no longer referenced by any article, THE system SHALL:
1. Mark the file for deletion
2. Preserve audit trail of file existence and associations
3. Allow administrators to review orphaned files for cleanup

### File Attachment Controls

WHEN a user uploads files to an article, THE system SHALL:
1. Allow attachment of both documents and images
2. Limit the total number of attachments per article
3. Validate file types against permitted formats
4. Associate all attachments with the article

WHEN a user attempts to attach files to an article, THE system SHALL:
1. Reject the request if any file does not meet format requirements
2. Reject the request if the article already has the maximum number of attachments
3. Maintain the article's association with valid attachments

WHEN a user tries to download a file attachment, THE system SHALL:
1. Verify the user has access to the article
2. Deliver the file through its unique file URL
3. Respect any ban restrictions on the user's account

IF a user attempts to access a file attachment they do not have permission to view, THE system SHALL reject the request.
IF an administrator bans a user, THE system SHALL:
1. Allow the user's existing attachments to remain visible on articles
2. Prevent the banned user from uploading new files
3. Maintain the association between the banned user's files and their articles