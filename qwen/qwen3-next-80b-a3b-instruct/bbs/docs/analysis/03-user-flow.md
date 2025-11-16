## Citizen Journey: Posting Content

WHEN a citizen accesses the economic board, THE system SHALL present them with a visible and accessible 'New Post' button on the dashboard. 

WHEN a citizen clicks the 'New Post' button, THE system SHALL open a form with two mandatory fields: "Title" and "Content", both accepting plain text up to 10,000 characters each. 

WHEN a citizen submits a new post, THE system SHALL immediately mark the post as "Pending Review" and prevent it from appearing in public feeds or search results.

WHILE a post is in "Pending Review" state, THE system SHALL NOT display it to any non-moderator user.

IF a post contains content flagged by automated filters as potentially violating community rules (e.g., hate speech, threats, doxxing), THEN THE system SHALL automatically notify the nearest available moderator and preserve the post in a queued moderation list.

WHEN a post has been reviewed and approved by a moderator, THE system SHALL change its status to "Published" and make it immediately visible in all public feeds, categories, and search results.

WHEN a post is rejected by a moderator, THE system SHALL notify the citizen via in-app message explaining the reason for rejection and close the original post submission.

## Citizen Journey: Commenting on Posts

WHEN a citizen views a published post, THE system SHALL display a "Comment" input field beneath the post content.

WHEN a citizen types a comment and submits it, THE system SHALL immediately assign the comment a timestamp and associate it with the citizen's authenticated account.

WHILE a post remains "Published", THE system SHALL allow comments to be added continuously by any authenticated citizen.

WHEN a comment is submitted, THE system SHALL display it immediately below the original post for all viewers, with the commenter's display name and submission time.

IF a comment exceeds 500 characters, THEN THE system SHALL truncate the content at 500 characters and append "..." as an indicator, then notify the citizen that their comment was truncated.

## Citizen Journey: Uploading Attachments

WHEN a citizen is composing a new post, THE system SHALL display an "Attach File" button next to the submit button.

WHEN a citizen clicks the "Attach File" button, THE system SHALL open a system file picker dialog allowing selection of one file.

WHERE a file is selected, THE system SHALL validate its size and type immediately.

IF the selected file exceeds 10MB in size, THEN THE system SHALL prevent submission and display an error message: "File too large. Maximum allowed size is 10MB."

IF the selected file is not one of the allowed types (JPG, PNG, GIF, WEBP), THEN THE system SHALL prevent submission and display an error message: "Invalid file type. Only JPG, PNG, GIF, and WEBP images are supported."

WHEN a file passes validation, THE system SHALL display a preview thumbnail (for images) and file name below the post editor with a "Remove" link.

WHEN a citizen submits a post with a valid attachment, THE system SHALL link the file to the post in the database and store it in object storage under a unique identifier.

WHEN a post is published, THE system SHALL display the attached file's thumbnail or icon next to the post content with a clickable link to download the file.

## Moderator Journey: Reviewing Pending Posts

WHEN a moderator logs in to the system, THE system SHALL display a "Moderation Queue" badge on the navigation menu with a count of pending posts.

WHEN a moderator clicks the "Moderation Queue" link, THE system SHALL load a list of all unpublished posts, sorted by submission time (oldest first).

WHEN a moderator selects a post from the queue, THE system SHALL display a full view of the post content, any attached files, and the submitting citizen's username.

WHEN a moderator clicks "Approve", THE system SHALL change the post status from "Pending Review" to "Published", trigger an in-app notification to the citizen, and remove the post from the moderation queue.

WHEN a moderator clicks "Reject", THE system SHALL open an input field for entering a rejection reason, requiring at least 10 characters.

IF the rejection reason entry is less than 10 characters, THEN THE system SHALL prevent rejection and display: "Rejection reason must be at least 10 characters long."

WHEN a moderator submits a rejection reason, THE system SHALL send a personalized message to the citizen, store the reason in the audit log, and archive the post.

## Moderator Journey: Managing Violations

WHEN a moderator identifies a published post that violates community guidelines after publication, THE system SHALL allow them to click a "Remove Post" button.

WHEN a moderator clicks "Remove Post", THE system SHALL immediately hide the post from public view and change its status to "Removed".

WHEN a post is removed, THE system SHALL notify the submitting citizen with a message: "Your post has been removed for violating community guidelines. Reason: [moderator-entered reason]."

WHEN a post is removed, THE system SHALL preserve it in an audit trail accessible only to moderators and administrators.

WHEN a moderator identifies a citizen who repeatedly violates rules, THE system SHALL allow them to click "Issue Warning" on the citizen's profile.

WHEN an issue warning is issued, THE system SHALL record the warning in the citizen's account with a timestamp and reason, and display a notification to the citizen.

WHILE a citizen has three or more active warnings, THE system SHALL prevent them from creating new posts or comments until warnings expire after 30 days.

## Error Recovery Flows

IF a citizen's internet connection is lost while composing a post, THEN THE system SHALL automatically save the draft content in browser localStorage, with an expiration of 7 days.

WHEN a citizen returns to the post editor after a connection loss, THE system SHALL automatically restore the saved draft content.

IF the file upload server fails during attachment upload, THEN THE system SHALL interrupt the upload, display "Upload failed. Please try again.", and preserve the post content (without the attachment) as a draft.

IF the authentication token expires during a post submission, THEN THE system SHALL redirect the citizen to the login page, preserve the draft and attachment metadata, and allow resumption of submission after login.

IF a moderator attempts to reject a post without providing a reason, THEN THE system SHALL block the action and highlight the reason field in red with "This field is required to provide transparency to the user."

IF a citizen attempts to edit a post after 24 hours of submission, THEN THE system SHALL disable the edit button and display: "You can only edit your posts within 24 hours of creating them."

IF a moderator attempts to delete a post while offline, THEN THE system SHALL queue the action locally and retry automatically when connectivity is restored.

WHEN a moderator restores a removed post, THE system SHALL revert it to "Published" status and notify the citizen: "Your previously removed post has been restored."