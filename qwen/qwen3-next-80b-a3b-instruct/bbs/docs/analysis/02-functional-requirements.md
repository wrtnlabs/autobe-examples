# Functional Requirements for Discussion Board

## Core Posting Functionality

THE citizen SHALL be able to create a new discussion post by providing a title and content.

WHEN a citizen submits a new post, THE system SHALL require both a title (minimum 5 characters) and content (minimum 10 characters).

WHEN a citizen attempts to create a post with an empty title or content, THE system SHALL prevent submission and display a clear message indicating which field is missing.

THE citizen SHALL be able to select "public" visibility for their post, and the system SHALL display all public posts to all authenticated users.

THE system SHALL automatically assign a unique identifier and timestamp to every post upon creation.

## Commenting System

WHEN a citizen views a post, THE system SHALL display an input field for adding a comment beneath the post.

THE citizen SHALL be able to submit a comment with a minimum of 1 character and a maximum of 1,000 characters.

WHEN a citizen submits a comment, THE system SHALL associate it with the specific post and the citizen who created it.

THE system SHALL display comments in chronological order, with the oldest comment appearing first under each post.

THE moderator SHALL be able to delete any comment at any time, regardless of who posted it.

WHILE a comment exists on a post, THE system SHALL display the username of the author and the time it was posted.

WHEN a moderator deletes a comment, THE system SHALL replace the comment content with "[Deleted by moderator]" and preserve the author name and timestamp.

## Image and File Attachment Support

THE system SHALL allow citizens to attach one or more files to a new post during creation or editing.

THE system SHALL support the following file types for upload:
- Image files: JPEG, PNG, GIF
- Document files: PDF, TXT, DOCX

THE system SHALL limit the total size of all attachments per post to 10 megabytes (MB).

THE system SHALL limit individual file size to 5 megabytes (MB)

WHEN a citizen attempts to upload a file with an unsupported extension, THE system SHALL reject it and display a message listing allowed file types.

WHEN a citizen attempts to upload a file exceeding 5 MB individually or a total post attachment size exceeding 10 MB, THE system SHALL reject the upload and display a clear message indicating the size limit.

THE system SHALL display attached files beneath the post content as clickable links with the original filename.

THE moderator SHALL be able to view, download, and remove any attachment from any post.

WHEN an attachment is removed by a moderator, THE system SHALL replace the file link with "[Attachment removed by moderator]".

## Content Moderation Rules

WHEN a citizen identifies content they believe violates community guidelines, THE system SHALL provide a "Report" button on each post and comment.

WHEN a citizen submits a report, THE system SHALL record the report with the post/comment ID, reporter ID, timestamp, and optional reason.

THE moderator SHALL be able to view all reported items in a dedicated moderation queue, sorted by report timestamp.

THE moderator SHALL be able to review a reported post or comment and select one of the following actions:
- "Dismiss: No violation found"
- "Edit: Fix content violation"
- "Delete: Remove content permanently"

WHEN a moderator selects "Edit", THE system SHALL allow the moderator to modify the post or comment content and save the change with a note: "[Edited by moderator]" appended to the original content.

WHEN a moderator selects "Delete", THE system SHALL remove the post or comment from public view and replace it with "[Removed by moderator for violating guidelines]".

WHEN a post or comment is deleted by a moderator, THE system SHALL notify the original author via system message: "Your post/comment was removed by a moderator. Reason: [reason]."

THE system SHALL retain all deleted content and reports in a private database for audit purposes, but SHALL NOT display them to any user.

## Edit and Delete Policies

THE citizen SHALL be able to edit their own post within 24 hours of creation.

WHEN a citizen edits a post after its initial creation, THE system SHALL append "[Edited]" to the post's timestamp.

THE citizen SHALL be able to delete their own post within 24 hours of creation.

WHEN a citizen deletes their own post, THE system SHALL replace the entire post content with "[Deleted by author]" and preserve the title, author, and timestamp.

THE moderator SHALL be able to edit or delete any post or comment at any time, regardless of its age or ownership.

WHEN a moderator edits a post or comment, THE system SHALL append a note beside the content: "[Edited by moderator]".

WHEN a moderator deletes a post, THE system SHALL replace the entire post with the message: "[Removed by moderator for violating guidelines]" and preserve the title, author, and creation timestamp.

## Search and Discovery

THE system SHALL allow citizens to search for posts using keyword matching in titles and content.

WHEN a citizen performs a search, THE system SHALL return results matching words in either the post title or post content, ordered by creation date descending (newest first).

THE system SHALL display up to 20 posts per search result page.

THE system SHALL allow citizens to browse all public posts sorted chronologically from newest to oldest.

THE system SHALL display the number of comments and attachments on each post in the main listing.

THE system SHALL not allow browsing or searching of deleted or reported posts.

## Performance Expectations

WHEN a citizen loads the main feed of posts, THE system SHALL render the page and display all content within 2 seconds.

WHEN a citizen performs a search with common keywords, THE system SHALL return results immediately (under 1 second).

WHEN a citizen uploads a file under the size limit, THE system SHALL show a progress indicator and complete the upload within 10 seconds for a 5 MB file on average internet connection.

WHEN a citizen clicks an attached file link, THE system SHALL initiate download immediately without requiring additional authentication.

WHILE a citizen is viewing a post with 50+ comments, THE system SHALL load and display comments smoothly without noticeable lag.

WHEN a moderator reviews a reported post, THE system SHALL load all related data (post, comments, reports) in under 1.5 seconds.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.