# Core Features of the Discussion Board

This document defines the essential functional requirements for the discussion board platform. It outlines what users can do directly, without specifying any technical implementation. This document is intended for backend developers to understand exactly what behaviors to implement.

## Post Creation

### User Post Submission
- WHEN a citizen submits a new post, THE system SHALL create a draft with title, content, and timestamp.
- WHEN a citizen submits a new post, THE system SHALL assign it a unique identifier.
- WHEN a citizen submits a new post, THE system SHALL store it as unpublished until explicitly published.
- WHILE a post is in draft state, THE system SHALL allow the citizen to edit its title and content.
- WHILE a post is in draft state, THE system SHALL allow the citizen to delete it completely.
- IF a citizen attempts to create a post with empty title and empty content, THEN THE system SHALL reject submission and show error message: "Post must have a title or content."
- IF a citizen attempts to create a post with only whitespace in title or content, THEN THE system SHALL reject submission and show error message: "Post must have a title or content."

## Image and File Attachments

### Attachment Upload Process
- WHEN a citizen is composing a post, THE system SHALL provide a "Add attachment" button.
- WHEN a citizen clicks "Add attachment", THE system SHALL open a file browser dialog.
- WHEN a citizen selects one or more files, THE system SHALL validate each file before upload.
- WHEN a citizen selects a file, THE system SHALL display the filename and file size next to the upload button.
- WHEN a citizen uploads an image file, THE system SHALL generate a thumbnail preview.
- WHILE uploading an attachment, THE system SHALL show a progress bar.
- WHILE uploading multiple attachments, THE system SHALL show individual progress bars for each file.
- IF a file upload fails, THEN THE system SHALL show a clear error message and allow the citizen to retry.
- IF a file upload is interrupted, THEN THE system SHALL cancel the upload and remove the file from the draft.

### Attachment Limits and Types
- WHERE a post contains attachments, THE system SHALL allow up to 5 files per post.
- WHERE a post contains image attachments, THE system SHALL accept JPEG, PNG, GIF, and WebP formats.
- WHERE a post contains file attachments, THE system SHALL accept PDF, DOC, DOCX, XLS, XLSX, TXT, and ZIP formats.
- WHERE a file attachment exceeds 20 MB, THEN THE system SHALL reject it and show error message: "File too large. Maximum size is 20 MB."
- WHERE an image attachment exceeds 10 MB, THEN THE system SHALL reject it and show error message: "Image too large. Maximum size is 10 MB."
- WHERE a file has an unsupported format, THEN THE system SHALL reject it and show error message: "Unsupported file type. Allowed types: JPEG, PNG, GIF, WebP, PDF, DOC, DOCX, XLS, XLSX, TXT, ZIP."
- WHERE a citizen attempts to attach more than 5 files, THEN THE system SHALL reject the additional files and show error message: "Maximum 5 attachments per post. You've selected 6."

### Attachment Storage and Display
- THE system SHALL store all attachments as permanent files linked to the post.
- THE system SHALL generate a unique URL for each attachment.
- WHEN a post is viewed, THE system SHALL display each attachment as an icon with its filename.
- WHEN a user clicks on an image attachment, THE system SHALL open the image in a lightbox viewer.
- WHEN a user clicks on a non-image attachment, THE system SHALL initiate a download.
- THE system SHALL preserve original filenames, but prevent malicious or unsafe characters in filenames.
- THE system SHALL not execute, render, or interpret any attachment files.

## Commenting System

### Posting Comments
- WHEN a citizen views a post, THE system SHALL display a comment section below it.
- WHEN a citizen clicks "Add comment", THE system SHALL present a text input field.
- WHEN a citizen submits a comment, THE system SHALL append it to the post's comment list.
- WHEN a citizen submits a comment, THE system SHALL assign it a timestamp and link it to the user's profile.
- WHILE a comment is being composed, THE system SHALL allow the citizen to edit or cancel it.
- IF a comment is submitted with only whitespace, THEN THE system SHALL reject it and show error message: "Comment cannot be empty."
- IF a comment exceeds 2000 characters, THEN THE system SHALL truncate it to 2000 characters and show message: "Comment truncated to 2000 characters."

### Comment Moderation
- WHEN a moderator views a post with comments, THE system SHALL highlight comments flagged by users.
- WHEN a moderator selects a comment, THE system SHALL show options to "Edit", "Hide", or "Delete".
- WHEN a moderator deletes a comment, THE system SHALL remove it permanently and log the action.
- WHEN a moderator edits a comment, THE system SHALL preserve original authorship but show "[Edited by moderator]".
- WHEN a comment is hidden, THE system SHALL still show "1 hidden comment" to other users.
- WHEN a citizen reports a comment, THE system SHALL submit a report to the moderator queue with context.
- WHEN a comment receives 3 reports, THE system SHALL automatically flag it for moderator review.

### Reply Chains
- WHEN a citizen clicks "Reply" on a comment, THE system SHALL open a text field at the bottom of the comment.
- WHEN a citizen replies to a comment, THE system SHALL nest it visually under the original comment.
- THE system SHALL allow replies to replies (2 levels deep).
- THE system SHALL not show reply chains beyond 2 levels to maintain readability.
- WHEN a parent comment is deleted, THE system SHALL also delete all direct replies to it.
- WHEN a reply is deleted, THE system SHALL show "[Reply removed]" in place of the reply text.

## Content Visibility

### Post Visibility Rules
- WHEN a citizen publishes a post, THE system SHALL make it visible to all users immediately.
- WHEN a citizen creates a post, THE system SHALL display it only to the citizen until published.
- WHEN a post is published, THE system SHALL add it to the main feed sorted by latest first.
- WHEN a post is edited after publication, THE system SHALL display "Updated" timestamp below the post.
- WHEN a post is edited after publication, THE system SHALL NOT reset its position in the feed.
- WHEN a post contains no text and only attachments, THE system SHALL still be published and visible.
- WHEN a post contains no attachments and only text, THE system SHALL be published and visible.

### Visibility Restrictions
- WHEN a moderator hides a post, THE system SHALL remove it from public feeds.
- WHEN a moderator hides a post, THE system SHALL still allow the original author to view it in their profile.
- WHEN a post is hidden, THE system SHALL show a message to regular users: "This post has been hidden by a moderator."
- WHEN a post is hidden, THE system SHALL still allow moderators to view it with full editing tools.
- WHEN a post is reported 5 times, THE system SHALL automatically hide it pending moderator review.
- IF a post is hidden due to reports and later restored by a moderator, THE system SHALL restore it to its original position in the feed.

## Search Functionality

### Search Input and Display
- WHEN a user enters text in the search bar, THE system SHALL filter results in real time.
- WHEN a user submits a search, THE system SHALL show posts matching the query.
- WHEN a user searches for text, THE system SHALL match against post titles and post content.
- WHEN a user searches for text, THE system SHALL match against comment text within posts.
- WHEN a user searches, THE system SHALL highlight matching text in results.
- WHEN a user searches with no results, THE system SHALL show message: "No posts match your search."
- WHEN a user searches with at least one result, THE system SHALL show up to 20 posts per page.

### Search Behavior
- WHERE search terms are shorter than 3 characters, THE system SHALL not return results and show message: "Search terms must be at least 3 characters long."
- WHERE search terms contain only symbols or numbers, THE system SHALL not return results and show message: "Search must include letters."
- WHERE a search term matches a post author's username, THE system SHALL include posts by that author in results.
- WHERE a search term matches an attached filename, THE system SHALL include posts with that attachment in results.
- WHERE a post contains multiple matches, THE system SHALL still list it only once in results.
- WHERE a search returns more than 20 results, THE system SHALL show "Load more" button to load next 20.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*