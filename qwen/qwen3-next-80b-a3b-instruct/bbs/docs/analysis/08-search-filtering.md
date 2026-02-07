# Economic/Political Discussion Board Requirements Specification

## User Account System

### Registration & Login

- WHEN a new user navigates to the registration page, THE system SHALL present a form requiring email address and password.
- WHEN a user submits their email and password for registration, THE system SHALL validate that:
  - The email address is in a valid format
  - The password is at least 8 characters long
  - The email address is not already registered
- WHEN validation fails, THE system SHALL display specific error messages for each failed validation rule.
- WHEN all validation passes, THE system SHALL create a new user record with status \"active\" and generate a session token.
- WHEN registration is successful, THE system SHALL redirect the user to the homepage and maintain their authenticated session.
- WHEN a registered user attempts to log in, THE system SHALL accept email and password credentials.
- WHEN submitted credentials match a registered user account, THE system SHALL authenticate the user and establish a session.
- WHEN submitted credentials do not match, THE system SHALL display: \"Invalid email or password. Please try again.\"
- WHEN a user attempts to log in with an account that has been banned, THE system SHALL display: \"Your account has been banned. Contact an administrator for details.\"
- WHEN a user successfully logs in, THE system SHALL record the login timestamp and IP address for security auditing.
- WHEN a user logs out, THE system SHALL invalidate their session token and clear client storage.

### Password Management

- WHEN a logged-in user requests to change their password, THE system SHALL require:
  - Current password verification
  - New password confirmation
  - New password compliance with minimum length (8+ characters)
- WHEN all requirements are satisfied, THE system SHALL update the password hash and log the password change event.
- WHEN the current password verification fails, THE system SHALL display: \"Current password is incorrect.\"
- WHEN the new password and confirmation do not match, THE system SHALL display: \"New passwords do not match.\"
- WHEN a user attempts to use a previously used password, THE system SHALL display: \"You cannot reuse previous passwords.\"
- WHEN a user forgets their password, THE system SHALL provide a \"Forgot Password?\" link that initiates a password reset flow.
- WHEN a password reset request is submitted, THE system SHALL:
  - Generate a unique, time-limited reset token
  - Send the token via email to the registered address
  - Log the reset request in the security audit trail
- WHEN a user clicks the reset link in their email, THE system SHALL allow them to set a new password only if:
  - The reset token is valid
  - The token has not expired (less than 24 hours old)
  - The new password meets strength requirements
- WHEN a password is successfully changed via reset, THE system SHALL invalidate all other active sessions for that user.

### Account Deletion

- WHEN a logged-in user requests to delete their account, THE system SHALL require:
  - Password confirmation
  - A final confirmation step with clear warning: \"This action is permanent. All your articles, comments, and profile data will be permanently deleted."
- WHEN confirmation is provided, THE system SHALL:
  - Mark the user account as \"deleted\" and disable login capabilities
  - Anonymize all references to the user in system logs
  - Delete all articles created by the user
  - Delete all comments created by the user
  - Remove the user from all administrative roles
- WHEN account deletion completes successfully, THE system SHALL redirect the user to the homepage and clear their session.
- WHEN a deleted user attempts to register again with the same email, THE system SHALL display: \"This email address has been used before and cannot be reused.\"

## User Profile System

### Profile Structure

- EACH user profile SHALL contain:
  - Display name (up to 50 characters, non-empty)
  - Bio text (up to 500 characters, optional)
  - Join date (UTC timestamp)
  - Article count (total number of published articles)
  - Comment count (total number of published comments)
  - Administrative status (boolean)
- WHEN a profile is viewed, THE system SHALL display these fields in the following order: display name, bio, join date, article count, comment count, administrative status.
- WHEN a user views their own profile, THE system SHALL display an \"Edit Profile\" button.
- WHEN a user views another user's profile, THE system SHALL NOT display the \"Edit Profile\" button.
- WHEN a profile is displayed, THE system SHALL show the user's display name as a link to their profile page.

### Profile Editing

- WHEN a user clicks \"Edit Profile\", THE system SHALL display a form with:
  - Display name field (pre-filled with current value)
  - Bio text area (pre-filled with current value)
- WHEN the user submits the form, THE system SHALL validate:
  - Display name is not empty
  - Display name does not exceed 50 characters
  - Bio does not exceed 500 characters
- WHEN validation fails, THE system SHALL display appropriate error messages next to each field.
- WHEN validation passes, THE system SHALL update the user's profile and redirect back to the profile page.
- WHEN a user changes their display name, THE system SHALL update all existing articles and comments to reflect the new display name.
- WHEN a user deletes their bio text, THE system SHALL store it as an empty string (not NULL).

### Profile Discovery

- WHEN a user views an article or comment, THE system SHALL display the author's display name as a clickable link to their profile.
- WHEN a user clicks on a profile link from an article or comment, THE system SHALL navigate to that user's profile page.
- WHEN a user is redirected to a profile page for a deleted account, THE system SHALL display: \"This user's account has been deleted.\"
- WHEN a user searches for another user's profile via URL, THE system SHALL respond with 404 if the profile does not exist or is deleted.
- WHEN a profile page loads, THE system SHALL show:
  - The user's display name and bio
  - A list of articles they have written (with title, section, and posted date)
  - A list of comments they have made (with article title, content, and posted date)
- EACH article and comment in the profile lists SHALL be linked to its full content.
- WHEN a profile has no articles or comments, THE system SHALL display: \"This user has not created any content yet.\" for each section.

## Section Management System

### Section Definition

- EACH section SHALL have:
  - Name (required, up to 100 characters)
  - Description (required, up to 500 characters)
  - Created at timestamp
  - Created by admin ID (references user with admin privileges)
- WHEN an administrator creates a new section, THE system SHALL require them to enter:
  - Section name
  - Section description
- WHEN section name or description is empty, THE system SHALL display: \"Section name and description are required.\"
- WHEN section name exceeds 100 characters, THE system SHALL display: \"Section name cannot exceed 100 characters.\"
- WHEN section description exceeds 500 characters, THE system SHALL display: \"Section description cannot exceed 500 characters.\"
- WHEN a section with the same name already exists, THE system SHALL display: \"A section with this name already exists.\"
- WHEN a section is created successfully, THE system SHALL display a success notification and redirect to the section list.

### Section Listing

- WHEN any user visits the homepage or \"Sections\" page, THE system SHALL display a list of all active sections.
- EACH section in the list SHALL show:
  - Section name (clickable link to section articles)
  - Section description
  - Number of articles in the section
  - Last article posted date
- WHEN there are no sections, THE system SHALL display: \"No sections have been created yet. Contact an administrator to create one.\"
- WHEN a section is deleted, THE system SHALL NOT show it in the section list.
- WHEN a section contains 0 articles, THE system SHALL still appear in the list.

### Section Navigation

- WHEN a user clicks on a section name in the list, THE system SHALL navigate to that section's article listing page.
- WHEN visiting a section's article listing, THE system SHALL:
  - Display the section name as the page title
  - Show only articles that belong to that section
  - Apply the section filter to search and pagination
- WHEN a user attempts to access a section that has been deleted, THE system SHALL display: \"This section has been removed.\"

### Section Modifications

- WHEN a user with administrator privileges attempts to edit a section, THE system SHALL:
  - Display a form with:
    - Pre-filled section name
    - Pre-filled section description
- WHEN the form is submitted, THE system SHALL validate:
  - New name is not empty
  - New name does not exceed 100 characters
  - New description does not exceed 500 characters
  - New name is not identical to an existing section name
- WHEN validation passes, THE system SHALL update the section with new values and display a success message.
- WHEN validation fails, THE system SHALL return the edit form with error messages.
- WHEN an administrator attempts to delete a section, THE system SHALL:
  - Display a warning: \"Deleting a section will not delete articles or comments, but they will no longer be visible under this section. Are you sure?"
  - After confirmation, remove the section from the section list
  - Set the section_id of all articles previously assigned to this section to NULL
- WHEN a section is deleted, ALL of its associated articles SHALL remain accessible and visible but will be displayed as \"Uncategorized\" in their section field.

## Article Management System

### Article Creation

- WHEN a user wants to create a new article, THE system SHALL display a form with:
  - Title field (required, up to 200 characters)
  - Content field (required, WYSIWYG editor with text formatting)
  - Section selector (dropdown with all available sections)
  - Tags input field (comma-separated, free-form)
  - File attachment button
  - Image upload button
- WHEN the user submits the article form, THE system SHALL validate:
  - Title is not empty and does not exceed 200 characters
  - Content is not empty
  - A section is selected
  - Total file attachments do not exceed 5 files
  - Total image attachments do not exceed 10 images
  - Each tag is at most 50 characters
  - At most 20 tags are submitted
- WHEN validation fails, THE system SHALL display specific error messages for each validation rule.
- WHEN validation passes, THE system SHALL:
  - Save the article record with status \"published\"
  - Create tag records (if they don't exist) and link them
  - Store file and image attachments with metadata
  - Record the author's user ID and section ID
  - Set the posted date to the current UTC timestamp
  - Redirect to the new article's view page
- WHEN an article is created, THE system SHALL NOT increment the author's article count until it is successfully saved.

### Article Editing

- WHEN a user attempts to edit their own article, THE system SHALL:
  - Load the article's current title, content, section, tags, files, and images
  - Provide editable form fields identical to article creation
  - Display a \"Delete Article\" button
- WHEN a user submits an edit, THE system SHALL validate the same constraints as article creation.
- WHEN validation passes, THE system SHALL update all fields and reset the \"last modified\" timestamp.
- WHEN a user edits their article, THE system SHALL NOT update the \"posted date\" - only the \"last modified\" timestamp shall be updated.
- WHEN a user removes a file or image attachment during editing, THE system SHALL:
  - Delete the file from storage
  - Remove the attachment record from the database
- WHEN a user adds a new tag during editing, THE system SHALL create a new tag record if it doesn't exist.
- WHEN a user removes a tag, THE system SHALL unlink the article from the tag but NOT delete the tag record (so it remains available for other articles).
- WHEN a user changes the section of an article, THE system SHALL decrement the old section's article count and increment the new section's article count.
- WHEN a user edits an article they no longer have access to (e.g., if they were banned), THE system SHALL display: \"You do not have permission to edit this article.\"

### Article Deletion

- WHEN a user deletes their own article, THE system SHALL:
  - Display a confirmation dialog: \"Are you sure you want to delete this article? This action cannot be undone.\"
  - After confirmation:
    - Set the article's status to \"deleted\"
    - Hide the article from all public listings, searches, and feeds
    - Keep the article record in the database for audit purposes
    - Preserve attachments (but mark them as unused)
    - Preserve comment records but mark them as orphaned
- WHEN a user attempts to delete an article that has already been deleted, THE system SHALL display: \"This article has already been deleted.\"
- WHEN an administrator deletes any article, THE system SHALL:
  - Set the article's status to \"deleted\"
  - Record the administrator's ID as the deleter
  - Log the deletion to the audit trail with reason
  - Apply all same data preservation logic as user deletion

### Article Metadata

- EACH article record SHALL store:
  - Title (string, max 200 chars)
  - Content (text)
  - Section ID (reference to section)
  - Author ID (reference to user)
  - Posted date (UTC timestamp - non-editable)
  - Last modified date (UTC timestamp - updated on edits)
  - Status (enum: \"published\", \"deleted\")
  - Article count (auto-calculated on creation/edit)
  - Comment count (auto-calculated on comment creation/deletion)
  - Tags (array of tag IDs)
  - Files (array of file IDs, max 5)
  - Images (array of image IDs, max 10)
- WHEN an article is viewed, THE system SHALL render:
  - The article title as H1
  - The article content with preserved formatting
  - Publication timestamp in local user timezone format: \"MMM DD, YYYY at HH:mm\"
  - Author display name (clickable)
  - Section name (clickable)
  - Tag list (each tag clickable)
  - Downloadable file list
  - Image gallery with lightbox

## Article List & Sorting System

### Article Listing

- WHEN a user accesses a section's article list, THE system SHALL fetch and display articles with status \"published\".
- EACH article in the list SHALL display:
  - Title (truncated at 80 characters, followed by \"...\" if longer)
  - Author display name (linked to profile)
  - Section name (linked to section)
  - Tag list (up to 5 tags, followed by \"+X more\" if more than 5)
  - Number of comments (numerical value)
  - Posted date (formatted as \"MMM DD, YYYY at HH:mm\" in user's timezone)
  - Attachment indicators: (📄 file icon) and (🖼️ image icon)
- WHEN a section has no articles, THE system SHALL display: \"No articles found in this section.\"
- WHEN a user visits the top-level section listing, THE system SHALL display all published articles across all sections.

### Pagination

- WHEN there are more than 15 published articles in the current view, THE system SHALL display pagination controls.
- WHEN page navigation occurs (next, previous, specific page), THE system SHALL preserve:
  - Section filter
  - Search term
  - Tag filters
  - Sort order
- WHEN the last page contains fewer than 15 articles, THE system SHALL still display that page.
- WHEN pagination links are clicked, THE system SHALL load new articles with a smooth fade-in animation.
- WHEN a user changes the sort order or search term, THE system SHALL reset pagination to page 1.

### Sorting

- WHEN a user views an article list, THE system SHALL provide two sort options:
  - \"Newest first\"
  - \"Oldest first\"
- WHEN \"Newest first\" is selected, THE system SHALL sort articles by posted date descending.
- WHEN \"Oldest first\" is selected, THE system SHALL sort articles by posted date ascending.
- WHEN no sort option is selected, THE system SHALL default to \"Newest first\".
- WHEN multiple articles have identical posted dates, THE system SHALL sort by article ID ascending.
- WHEN a user changes sort order, THE system SHALL reload the page with new ordering and reset to page 1.
- WHEN search or filter is applied, THE system SHALL preserve the sort order from previous state.

## Article Viewing System

### Article Display

- WHEN a user navigates to an article by URL, THE system SHALL:
  - Fetch the article if status = \"published\"
  - If status = \"deleted\", display: \"This article has been removed.\"
  - If article does not exist, display: \"Article not found.\"
- WHEN the article is found and visible, THE system SHALL render:
  - Article title as H1
  - Author display name (linked)
  - Section name (linked)
  - Posted date (formatted)
  - Article content with full formatting
  - All attached files as downloadable links
  - All attached images as gallery items with lightbox support
  - All tags as clickable links
- WHEN attached files are displayed, THE system SHALL show:
  - File name
  - File size
  - Date uploaded
  - Download button
- WHEN attached images are displayed, THE system SHALL:
  - Show thumbnail version
  - Allow clicking to view full size in modal
  - Show image caption or alt text if available

### Resource Access

- WHEN a user clicks \"Download\" on an article attachment, THE system SHALL:
  - Validate user has access to the article
  - Serve the file with appropriate content-type
  - Record file download event in audit log
  - Track anonymous downloads from logged-out users
- WHEN a user right-clicks \"Save image as\" on an article image, THE system SHALL allow saving.
- WHEN an article's attachment is deleted but still linked in content, THE system SHALL display: \"This file was removed by the author.\" for file links and \"This image was removed by the author.\" for image links.

## Comment System

### Comment Creation

- WHEN a user wants to comment on an article, THE system SHALL:
  - Display a comment form beneath the article
  - Require authentication: logged-in users only
- WHEN a logged-in user submits a comment, THE system SHALL validate:
  - Comment content is not empty
  - Comment content does not exceed 2,000 characters
- WHEN validation fails, THE system SHALL display appropriate error message.
- WHEN validation passes, THE system SHALL:
  - Create the comment record with:
    - User ID
    - Article ID
    - Content
    - Posted date (UTC)
  - Increment the article's comment count
  - Display success message: \"Your comment has been posted.\"
  - Immediately append the new comment to the bottom of the list with smooth animation
- WHEN a user attempts to comment on a deleted article, THE system SHALL display: \"Comments are not allowed on deleted articles.\"
- WHEN a user attempts to comment while banned, THE system SHALL display: \"You cannot post comments while banned.\"

### Comment Viewing

- WHEN an article page loads, THE system SHALL load all comments for that article with status \"active\".
- COMMENTS SHALL be displayed in ascending order by posted date (oldest first).
- EACH comment SHALL display:
  - Author display name (linked to profile)
  - Posted date (formatted as \"MMM DD, YYYY at HH:mm\")
  - Comment content (with line breaks preserved)
  - If comment is edited: \"(edited)\" in smaller text after date
- WHEN a comment is deleted, THE system SHALL:
  - Mark it as deleted in the database
  - Replace visible content with: \"This comment has been deleted by the author.\" (for author-delete)
  - OR: \"This comment has been removed by an administrator.\" (for admin-delete)
- WHEN a user's comment has been deleted by administrator, THE system SHALL display the same message as author-deleted with no ability to un-delete.

### Comment Editing

- WHEN a user clicks \"Edit\" on their own comment, THE system SHALL:
  - Display a form with current comment text
  - Include a \"Cancel\" and \"Save\" button
- WHEN the form is submitted with non-empty content, THE system SHALL update the comment and set the \"last modified\" timestamp.
- WHEN the form is submitted with empty content, THE system SHALL display: \"Comment cannot be empty.\"
- WHEN content is successfully edited, THE system SHALL update the comment in place and append the \"(edited)\" tag.
- WHEN a user edits a comment they no longer have access to, THE system SHALL display: \"You cannot edit this comment.\"

### Comment Deletion

- WHEN a user deletes their own comment, THE system SHALL:
  - Display confirmation: \"Are you sure you want to delete this comment?\"
  - After confirmation, mark the comment as deleted in the database
  - Replace displayed text with \"This comment has been deleted by the author.\"
  - Decrement the article's comment count
- WHEN a user attempts to delete a comment that was already deleted, THE system SHALL display: \"This comment has already been deleted.\"
- WHEN an administrator deletes any comment, THE system SHALL:
  - Mark the comment as deleted
  - Record the administrator ID
  - Log action to audit trail
  - Display: \"This comment has been removed by an administrator.\"
  - Decrement the article's comment count

## Search System

### Core Search Functionality

- WHEN a user enters a search query in the global search bar, THE system SHALL search through:
  - Article titles (case-insensitive)
  - Article content (case-insensitive)
- WHEN the query contains fewer than 4 characters, THE system SHALL return no results and display: \"Search terms must be at least 4 characters long.\"
- WHEN the query is empty, THE system SHALL return no results and display: \"Please enter a search term.\"
- WHEN the query contains only whitespace, THE system SHALL treat it as empty.
- WHEN a search is performed, THE system SHALL only return articles that are not deleted and in active sections.
- WHEN a search returns no results, THE system SHALL display: \"No articles found matching your search. Try using different keywords.\"
- WHEN a search query contains multiple words, THE system SHALL match articles containing any of the words (OR logic) unless wrapped in double quotes.
- WHEN a phrase is wrapped in double quotes (e.g., \"climate change\"), THE system SHALL match the exact phrase within titles or content.
- WHEN a search term includes hyphenated words (e.g., \"post-industrial\"), THE system SHALL treat it as a single term.
- WHEN a number is searched (e.g., \"inflation 5%\"), THE system SHALL match numbers literally in content.
- WHILE searching, THE system SHALL ignore common stopwords (\"the\", \"and\", \"or\", etc.) unless enclosed in double quotes.
- WHEN a search query is submitted, THE system SHALL perform a case-insensitive match.
- WHEN a partial word match occurs (e.g., \"dem\" matches \"democracy\"), THE system SHALL include the article.

### Tag Filtering

- WHEN a user is viewing search results, THE system SHALL display a tag filter sidebar.
- THE tag filter SHALL show the 20 most frequently used tags from matching articles.
- WHEN a user clicks a tag, THE system SHALL apply that tag as a filter.
- WHEN a user clicks an active tag, THE system SHALL remove it from filters.
- WHILE filter is active, active tags SHALL be shown as chips above the results with remove buttons.
- WHEN a tag filter is active, THE system SHALL preserve search term and sort criteria.
- WHEN no tags are filtered, THE system SHALL show results matching only the search term.
- WHEN a tag has no matching articles, THE system SHALL NOT appear in the filter list.

### Pagination

- WHEN search results contain more than 15 articles, THE system SHALL display pagination controls.
- Pagination SHALL follow same behavior as article list: 15 articles/page, preserve filters and sort.
- When changing page, THE system SHALL scroll to top of results.
- When changing sort or search, THE system SHALL reset to page 1.

### Sorting

- Search results SHALL follow the same sort options as article list:
  - \"Newest first\"
  - \"Oldest first\"
- Default sort is \"Newest first\".
- Sort order SHALL preserve across page navigation.
- When sort is changed, THE system SHALL reload results, reset to page 1.

### Result Display

- EACH search result SHALL display:
  - Title (truncated at 100 characters with ellipsis)
  - Author display name (linked)
  - Section name (linked)
  - Up to 5 tags with \"+N more\" if more than 5
  - Number of comments
  - Posted date (formatted: \"MMM DD, YYYY at HH:mm\")
  - File icon if article has attachments
  - Photo icon if article has images
- WHEN the search term matches text in article title or first 150 characters of content, THE system SHALL highlight matching text with bold yellow background (#FFFFCC).
- Highlighting SHALL be case-insensitive.
- Highlighting SHALL preserve original case.
- Highlighting SHALL not apply to tags or metadata.

## Admin System

### Administrative Role Request

- WHEN any user submits an admin request, THE system SHALL:
  - Collect a reason (text, up to 1,000 characters)
  - Store request record with:
    - User ID
    - Request timestamp
    - Reason text
    - Status: \"pending\"
- WHEN the request is submitted, THE system SHALL display: \"Your admin request has been submitted. We'll notify you when it's reviewed.\"
- WHEN a super administrator views the admin request queue, THE system SHALL:
  - Display all pending requests as:
    - Requester display name
    - Request timestamp
    - Request reason
    - Two buttons: \"Approve\" and \"Reject\"
- WHEN an admin request is approved:
  - The user's role is upgraded to \"administrator\"
  - The request record status is set to \"approved\"
  - The user receives a notification: \"Your administrative request has been approved. You can now manage sections and content.\"
- WHEN an admin request is rejected:
  - The request record status is set to \"rejected\"
  - The user receives a notification: \"Your administrative request has been rejected. You may submit another request in 30 days.\"
- WHEN a user has an active or resolved admin request, THEY CANNOT submit another request until 30 days have passed.

### Administrator Grade System

- THERE ARE TWO ADMINISTRATOR GRADES:
  - **Regular Administrator**: Can delete content, manage sections, ban users
  - **Super Administrator**: Can do everything a regular admin can, plus promote/demote other admins
- WHEN a super administrator promotes a regular administrator, THE system SHALL:
  - Change the target user's role to \"super administrator\"
  - Log the promotion with acting admin's ID and timestamp
  - Notify the promoted user: \"Congratulations! You have been promoted to Super Administrator.\"
- WHEN a super administrator demotes another super administrator, THE system SHALL:
  - Change the target user's role to \"administrator\"
  - Log the demotion with acting admin's ID and timestamp
  - Notify the demoted user: \"Your administrative privileges have been downgraded to Regular Administrator.\"
- WHEN a super administrator attempts to demote themselves, THE system SHALL display: \"Super administrators cannot demote themselves.\"
- WHEN a user is demoted from super to regular, THEY RETAIN ALL PREVIOUS ADMINISTRATIVE RIGHTS EXCEPT promotion/demotion privileges.

### Administrator Capabilities Matrix

- Administrators (regular and super) SHALL have ALL user privileges (create/edit/delete articles/comments).
- Administrators SHALL have the following additional privileges:
  - Create, edit, delete sections
  - Delete any article
  - Delete any comment
  - Ban users
  - Unban users
  - View list of banned users
- Super administrators SHALL have ALL administrator privileges as listed above.

### Ban & Unban System

#### Banning Users

- WHEN an administrator bans a user, THE system SHALL:
  - Require a reason (up to 500 characters)
  - Set the user's status to \"banned\"
  - Record the administrator ID and reason
  - Set the ban timestamp
  - Display: \"User has been banned. Reason: [reason]\"
- WHEN a banned user attempts to log in, THE system SHALL display: \"Your account has been banned. Contact an administrator for details.\"
- WHEN a banned user attempts to create articles or comments, THE system SHALL display: \"This operation is not available to banned users.\"
- WHEN a banned user attempts to edit/delete their own content, THE system SHALL prevent action and show: \"This operation is not available to banned users.\"
- WHEN a user is banned, THEIR existing articles and comments SHALL remain visible to all users.
- WHEN a banner clicks \"View Ban Log\", THE system SHALL show:
  - User ID
  - Ban reason
  - Admin who banned
  - Ban timestamp
  - Status: banned

#### Unbanning Users

- WHEN an administrator unbans a user, THE system SHALL:
  - Change the user's status from \"banned\" to \"active\"
  - Clear the ban reason
  - Clear the ban timestamp
  - Log the unban action with admin ID and timestamp
  - Display: \"User has been unbanned.\"
- WHEN a user is unbanned, THEY SHALL immediately regain full user privileges.
- WHEN a user has been unbanned, THEY SHALL be able to access previously authored content.

### Banned Users List

- WHEN any administrator visits the banned users list, THE system SHALL display:
  - List of all currently banned users
  - For each:
    - Display name
    - Ban reason
    - Administrator who banned
    - Ban timestamp
    - Unban button
- WHEN a user is no longer banned, THEY SHALL NOT appear in this list.

### Access Control Summary

| Feature                      | Guest | Member | Admin | Super Admin |
|------------------------------|-------|--------|-------|-------------|
| Register                     | Yes   | -      | -     | -           |
| Login                        | Yes   | Yes    | Yes   | Yes         |
| View articles                | Yes   | Yes    | Yes   | Yes         |
| View comments                | Yes   | Yes    | Yes   | Yes         |
| View user profiles           | Yes   | Yes    | Yes   | Yes         |
| Create articles              | No    | Yes    | Yes   | Yes         |
| Edit own articles            | No    | Yes    | Yes   | Yes         |
| Delete own articles          | No    | Yes    | Yes   | Yes         |
| Comment on articles          | No    | Yes    | Yes   | Yes         |
| Edit own comments            | No    | Yes    | Yes   | Yes         |
| Delete own comments          | No    | Yes    | Yes   | Yes         |
| Search articles              | Yes   | Yes    | Yes   | Yes         |
| Filter by tags               | Yes   | Yes    | Yes   | Yes         |
| Add files/images to articles | No    | Yes    | Yes   | Yes         |
| Create sections              | No    | No     | Yes   | Yes         |
| Edit sections                | No    | No     | Yes   | Yes         |
| Delete sections              | No    | No     | Yes   | Yes         |
| Delete any article           | No    | No     | Yes   | Yes         |
| Delete any comment           | No    | No     | Yes   | Yes         |
| Ban users                    | No    | No     | Yes   | Yes         |
| Unban users                  | No    | No     | Yes   | Yes         |
| View ban list                | No    | No     | Yes   | Yes         |
| Submit admin request         | Yes   | Yes    | No    | No          |
| Approve admin requests       | No    | No     | No    | Yes         |
| Demote super admins          | No    | No     | No    | Yes         |
| Promote admins to super      | No    | No     | No    | Yes         |
| Delete own profile           | No    | Yes    | Yes   | Yes         |
| See all content              | No    | Yes    | Yes   | Yes         |

### Authentication & Session Flow

- Authentication is handled using stateless JWT tokens with 24-hour expiry.
- Token is stored in HTTP-only, Secure, SameSite=Strict cookie.
- All API endpoints requiring authentication validate the token signature and expiration.
- All admin operations require token validation and role authorization.
- User authentication SHALL be enforced on ALL endpoints that modify data.
- User impersonation is strictly prohibited.
- All actions in system SHALL be logged in audit trail with: user ID, action type, timestamp, IP address, user agent.

### Audit Trail Requirements

- The system SHALL maintain an audit trail for:
  - Login attempts (success/failure)
  - Account creation
  - Password changes
  - Profile edits
  - Article creation
  - Article edits
  - Article deletions
  - Comment creation
  - Comment edits
  - Comment deletions
  - Section creation
  - Section edits
  - Section deletions
  - Admin requests submitted
  - Admin requests approved/rejected
  - Role promotions/demotions
  - User bans/unbans
  - File uploads
  - File downloads
  - Admin login attempts

- Each audit log entry SHALL include:
  - Timestamp (UTC)
  - Actor user ID
  - Action type (string enum)
  - Affected object (article ID, user ID, section ID, etc.)
  - IP address
  - User agent string
  - Optional metadata (e.g., old -> new value for edits)

- Audit logs SHALL be immutable and append-only.
- Users shall not be able to delete or modify logs.
- Only super administrators shall have access to audit logs.

### Workflow Summary

```mermaid
graph TD
    A["User Registration"] --> B["Email/Password Validations"]
    B --> C{"Valid?"}
    C -->|Yes| D["Create Account, Active Status"]
    C -->|No| E["Display Validation Errors"]
    D --> F["Login"]
    F --> G{"Valid Credentials?"}
    G -->|Yes| H["Issue JWT Token"]
    G -->|No| I["Show Invalid Credentials Message"]
    H --> J["User Dashboard"]
    J --> K["View Articles"]
    K --> L["View Section List"]
    L --> M["Browse Articles by Section"]
    M --> N["Post Article"]
    N --> O["Attach Files/Images"]
    N --> P["Apply Tags"]
    P --> Q["Save Article"]
    Q --> R["Article Published"]
    R --> S["Comment on Article"]
    S --> T["Save Comment"]
    T --> U["Comment Visible"]
    U --> V["Search Articles"]
    V --> W["Apply Tag Filters"]
    W --> X["Sort"{"Newest/Oldest"}]
    X --> Y["Paginate Results"]
    Y --> Z["Download Attachments"]
    Z --> AA["User Profile"]
    AA --> AB["Edit Profile"]
    AB --> AC["Update Display Name/Bio"]
    AC --> AD["Save Changes"]
    AD --> AE["Profile Updated"]
    J --> AF["Admin Request"]
    AF --> AG["Submit Reason"]
    AG --> AH{"Super Admin Review?"}
    AH -->|Yes| AI["Approve or Reject"]
    AI --> AJ["Email Notification"]
    AJ --> AK["Role Upgrade if Approved"]
    AK --> AL["Admin Dashboard"]
    AL --> AM["Manage Sections"]
    AM --> AN["Create/Edit/Delete Section"]
    AL --> AO["Ban/Unban Users"]
    AO --> AP["Enter Reason"]
    AP --> AQ{"Is Target Super Admin?"}
    AQ -->|Yes| AR["Cannot Demote Self"]
    AQ -->|No| AS["Apply Ban/Unban"]
    AS --> AT["Update User Status"]
    AT --> AU["Log Action in Audit Trail"]
    AL --> AV["Delete Any Article or Comment"]
    AV --> AW["Confirm Action"]
    AW --> AX["Mark as Deleted in DB"]
    AX --> AY["Audit Record Created"]
    AL --> AZ["View Banned User List"]
    AZ --> BA["Display Ban Reason, Admin, Timestamp"]
```

### System Behavior Summary

- The system is a single-page application with client-side routing.
- All data access is through authenticated API endpoints.
- Frontend never stores user passwords or tokens outside of memory.
- All sensitive operations require server-side authorization checks.
- No client-side permission validation is trusted - all must be re-validated on server.
- Search uses Elasticsearch-style text indexing for performance.
- File and image attachments are stored on separate object storage with CDN support.
- All timestamps use UTC internally, rendered in user's local timezone.
- All user-facing dates use locale-aware formatting (en-US).
- All content is sanitized for XSS before rendering.
- All user input fields are trimmed and sanitized on submission.
- The system is designed to be accessible (WCAG 2.1 AA compliant).
- All error messages avoid technical jargon and guide users to corrective actions.

### Business Model & Scalability

- The platform supports up to 50,000 concurrent users.
- Article and comment counts are cached with TTL 5 minutes.
- Tag popularity is computed hourly via background job.
- Search index is rebuilt daily to accommodate new content.
- The system is stateless and horizontally scalable.
- Database connection pooling is configured for 100 concurrent connections.
- File storage uses geographically distributed CDN for attachment downloads.
- Database backups are performed daily with point-in-time recovery capability.
- API rate limiting is enforced at 100 requests per minute per IP.
- All third-party integrations (email, analytics) are asynchronous.

### Future Considerations

- Mobile app integration using hybrid webview
- Push notifications for replies and admin responses
- Dark mode interface
- Analytics dashboard for administrators
- Moderation AI tools for flagging inappropriate content
- Multi-language interface support
- Community reputation system based on upvotes/downvotes
- Email digest of popular articles
- Activity feed for user interactions
- API access for external applications
- Export functionality for articles and comments

> *Developer Note: This document defines **business requirements only**. All technical implementation details (database schema, API endpoints, server architecture) are determined by the development team and are out of scope for this document.*