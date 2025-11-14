# User Journey Documentation

This document details the complete end-to-end user interaction flows for the politicalForum system. All workflows are described in natural language, focusing solely on user actions, system responses, and business logic conditions. No technical API, database, or UI specifications are included. Developers are free to implement these flows using any architecture that satisfies the behavioral requirements.

## Citizen: Create a Post

A citizen begins by navigating to the homepage or a selected discussion category. They locate and select the "New Post" button. The system displays a form with a title field, a rich text editor for content, and an optional attachment section.

WHEN a citizen fills the title field with text, THE system SHALL enable the "Post" button only if the title contains at least 3 characters and no more than 150 characters. 

WHEN a citizen enters content into the rich text editor, THE system SHALL enable the "Post" button only if the content contains at least 10 characters and no more than 5,000 characters. The system SHALL NOT allow submission if the content is empty or contains only spaces or non-printable characters.

WHEN the citizen clicks the "Post" button, THE system SHALL validate that the user is authenticated. IF the user is not authenticated, THEN THE system SHALL display the message "You must be logged in to create a post." and redirect the user to the login page.

WHEN the post is submitted successfully, THE system SHALL create a new post entity with a unique identifier, the citizen’s user ID, timestamp, title, content, and status set to "pending_review". 

WHERE the post contains URLs or keywords flagged in the moderation database (e.g., hate speech, threats, harassment), THEN THE system SHALL display the message "Your post is under review by a moderator and will be visible once approved." and disable editing for 5 minutes.

WHILE the post is in "pending_review" status, THE system SHALL NOT display the post publicly in feeds or search results. 

WHEN the post is approved by a moderator, THE system SHALL automatically update its status to "published" and make it visible to all users. 

WHEN a post is rejected by a moderator, THE system SHALL notify the citizen with the message "Your post was not approved. It may have violated community guidelines." and allow the citizen to revise and resubmit. 

## Citizen: Upload Attachment

During the creation or editing of a post, a citizen may choose to attach files or images. The system displays an "Add Attachment" button that opens a file picker dialog.

WHEN a citizen selects a file, THE system SHALL validate the file type and size before uploading. 

WHERE the file type is not an image (JPG, JPEG, PNG, GIF, WEBP) or a document (PDF, DOC, DOCX, TXT, CSV), THEN THE system SHALL display the message "Only images and common document files are allowed." and prevent the file from being selected.

WHERE the file size exceeds 10 MB, THEN THE system SHALL display the message "Files must be 10 MB or smaller." and prevent the upload.

WHILE uploading, THE system SHALL display a progress indicator showing percentage completed. The upload SHALL be interrupted and canceled if the network connection is lost.

WHEN an upload completes successfully, THE system SHALL attach the file to the post draft with a unique identifier and display its filename and thumbnail (if image) in the attachment preview area. The citizen SHALL be able to remove the attachment before submitting the post.

WHEN a post containing attachments is submitted, THE system SHALL create a corresponding attachment record linked to the post and store the file in secure cloud storage. 

WHEN a citizen edits a post after submission, THEY SHALL NOT be allowed to remove or replace attachments that have already been published unless the Moderator has unlocked the post for revision.

## Citizen: Comment on a Post

A citizen views a published post and locates the comment section. They click within the comment input box and type their message.

WHEN a citizen submits a comment, THE system SHALL validate that the comment text contains at least 1 character and no more than 500 characters. IF the comment is blank or contains only whitespace, THEN THE system SHALL display "Your comment cannot be empty." and retain focus on the input field.

WHEN a comment is successfully submitted, THE system SHALL create a comment entity linked to the post and the citizen’s user ID, with a timestamp and status set to "approved" by default.

WHILE the parent post is still in "pending_review" status, THE system SHALL NOT allow new comments to be submitted. 

IF a citizen attempts to comment on a post that has been locked by a moderator, THEN THE system SHALL display the message "This thread has been locked. No new comments are allowed." and disable the comment input.

WHEN a comment is flagged by other users (via "Report" button), THE system SHALL mark the comment as "under_review" and hide it from public view until a moderator reviews it. 

WHERE the comment contains the same flagged keywords as in post moderation, THEN THE system SHALL automatically mark the comment as "under_review" without waiting for user reports.

## Citizen: Edit Own Post

A citizen views one of their own published posts and sees an "Edit" button below the post content.

WHEN a citizen clicks the "Edit" button, THE system SHALL check the timestamp of the post. IF the current time is more than 24 hours after the post’s creation timestamp, THEN THE system SHALL display the message "You can no longer edit this post. It has been more than 24 hours since you submitted it." and disable the edit interface.

WHEN the edit is allowed, THE system SHALL load the original title and content into editable fields. The attachment preview shall remain visible, and attachments may be removed or replaced.

WHEN the citizen clicks "Save Changes", THE system SHALL validate the updated title and content against the same character limits as initial creation. IF validation fails, THEN THE system SHALL display the appropriate error message and retain the draft.

WHEN the update is successful, THE system SHALL update the post’s last_edited field, retain the original creation timestamp, and increment an edit counter.

WHEN a post is edited after having been approved, THE system SHALL automatically set its status to "editted_review" and temporarily hide it from public view. The invited moderator then re-reviews the content. 

IF a moderator denies the revised version, THE system SHALL revert to the original published version and notify the citizen: "Your edit was rejected. Your original post remains published."

WHERE a citizen attempts to edit a post they did not create, THEN THE system SHALL display "You cannot edit this post." and prevent access to the editor.

## Moderator: Delete a Post

A moderator accesses the moderation dashboard and inspects the list of flagged or reported content. They locate a specific post and select the "Delete Post" action.

WHEN a moderator clicks "Delete Post", THE system SHALL display a confirmation dialog: "Are you sure you want to delete this post? This action cannot be undone."

WHEN the moderator confirms deletion, THE system SHALL mark the post’s status as "deleted" and immediately remove it from all public feeds, search results, and comment threads.

WHEN a post is deleted, THE system SHALL retain a public record of deletion for audit purposes (user ID, post ID, timestamp, moderator ID, reason). THIS RECORD SHALL NOT be visible to citizens.

WHEN a post is deleted, THE system SHALL NOT delete the associated attachments from cloud storage immediately. They SHALL be marked for deletion and removed after 7 days unless re-attached to another active post.

WHEN a post is deleted, THE system SHALL notify the original citizen with the message: "Your post has been removed by a moderator. Reason: [Reason provided by moderator]." The post’s content shall not be disclosed in the notification.

IF a moderator attempts to delete a post already marked as "deleted" or "rejected", THEN THE system SHALL display "This post has already been removed." and disable the action.

## Moderator: Lock a Thread

A moderator observes a post thread that has devolved into harassment, spam, or repeated policy violations. They select the "Lock Thread" option in the moderation panel.

WHEN a moderator selects "Lock Thread", THE system SHALL display a modal requiring a reason to be specified (minimum 10 characters). IF no reason is entered, THEN THE system SHALL prevent the action.

WHEN a thread is locked, THE system SHALL change the status of the parent post to "locked" and disable all new comment submissions.

WHEN a thread is locked, THE system SHALL display a banner above the comment section: "This thread has been locked by a moderator. No further comments can be added."

WHILE a thread is locked, THE system SHALL continue to allow existing comments to be reported or flagged, but SHALL NOT permit any new comments.

WHERE a moderator attempts to lock a thread that is already locked, THE system SHALL display "This thread is already locked." and disable the option.

WHEN a moderator unlocks a thread, THE system SHALL change the status back to "published" and allow new comments to be submitted again.

## Moderator: Mark as Verified

A moderator reviews a post that demonstrates exceptional insight, accurate information, or authoritative contribution to the discussion. They select the "Mark as Verified" action.

WHEN a moderator selects "Mark as Verified", THE system SHALL add a badge icon (e.g., "✓ Verified") next to the post’s title and author name. The badge SHALL appear to all users, including anonymous visitors.

WHEN a post is marked as verified, THE system SHALL lock the post’s editing privileges permanently for the original citizen, even within the 24-hour window.

WHEN a post is marked as verified, THE system SHALL log the action in a private audit log with the moderator’s ID and timestamp. This log SHALL NOT be visible to citizens.

WHEN a post is marked as verified, THE system SHALL NOT affect the moderation status of comments attached to the post — comments follow the same approval rules as always.

WHERE a moderator attempts to mark their own post as verified, THE system SHALL prevent the action and display: "You cannot verify your own post. Please request another moderator to review it."

IF a post is later removed from verification status (by another moderator), THE system SHALL remove the badge and log the unverification event. The citizen SHALL NOT be notified unless the post is also deleted.

The system SHALL allow only one "Verified" badge per post. No additional badges may be assigned.