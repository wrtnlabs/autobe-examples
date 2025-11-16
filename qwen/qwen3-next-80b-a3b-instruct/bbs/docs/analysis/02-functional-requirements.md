# Functional Requirements for Economic/Political Discussion Board

This document defines all functional requirements for the economic/political discussion board system in natural language, using EARS (Easy Approach to Requirements Syntax) format for precision and implementability. All requirements are expressed in business terms without technical implementation details.

## Core Functional Requirements

The system shall support all core discussion board functionality for citizens and moderators as defined by user actors, including content creation, interaction, moderation, and editing within specified business constraints.

## Post Creation

WHEN a citizen attempts to create a new discussion post, THE system SHALL require the citizen to provide a title and content.

WHEN a citizen submits a new discussion post, THE system SHALL place the post in a "pending review" state.

WHILE a post is in "pending review" state, THE system SHALL prevent all non-moderator users from viewing or interacting with the post.

WHEN a moderator approves a pending post, THE system SHALL change the post status to "published" and make it visible to all citizens.

WHEN a moderator rejects a pending post, THE system SHALL mark the post as "rejected" and prevent it from ever becoming visible to citizens.

WHEN a post is rejected, THE system SHALL send an email notification to the citizen who created the post, explaining the reason for rejection if available.

## Comment System

WHEN a citizen views a published post, THE system SHALL allow the citizen to submit a comment on that post.

WHEN a citizen submits a comment on a published post, THE system SHALL immediately make the comment visible to all other citizens.

WHILE a citizen is typing a comment, THE system SHALL display a real-time character counter showing remaining characters.

THE system SHALL limit each comment to 500 characters.

WHEN a citizen attempts to submit a comment exceeding 500 characters, THE system SHALL prevent submission and highlight the character limit violation.

THE system SHALL not allow citizens to comment on rejected or pending posts.

THE system SHALL not allow moderators to comment on posts unless the moderator is also acting as a citizen (i.e., has a citizen account).

## Attachment Handling

WHEN a citizen creates a new post, THE system SHALL allow the citizen to attach one or more files to the post.

THE system SHALL accept the following file formats for image attachments: JPG, PNG, GIF, and WEBP.

THE system SHALL accept the following file formats for document attachments: PDF, TXT, DOC, DOCX, XLS, XLSX, PPT, PPTX.

THE system SHALL limit each attached file to a maximum size of 10 megabytes.

WHEN a citizen attempts to upload a file larger than 10MB, THE system SHALL prevent the upload and display a clear message stating the 10MB size limit.

WHEN a citizen attempts to upload a file with an unsupported format, THE system SHALL prevent the upload and list the supported formats.

WHEN a post is published, THE system SHALL display all attached files as downloadable links below the post content.

WHEN a citizen clicks on an attached file link, THE system SHALL initiate a direct file download with the original filename preserved.

THE system SHALL not replace or modify uploaded files—files shall be stored and served exactly as uploaded.

WHEN a moderator views a post, THE system SHALL allow the moderator to view all attached files—including those attached to pending or rejected posts.

THE system SHALL preserve all attachments even after a post has been deleted by a moderator.

## Content Moderation

WHEN a moderator is logged in, THE system SHALL display a moderation dashboard listing all posts in "pending review" status.

WHEN a moderator views a pending post, THE system SHALL allow the moderator to approve or reject the post with a single click.

WHEN a moderator approves a post, THE system SHALL immediately make the post visible to all citizens and move it out of the pending review queue.

WHEN a moderator rejects a post, THE system SHALL immediately remove the post from the pending review queue and mark it as "rejected" with no possibility of auto-reinstatement.

WHEN a moderator deletes any published post, THE system SHALL immediately remove the post from public view and archive it as a deleted post.

WHEN a moderator deletes a published post, THE system SHALL preserve all attachments associated with that post.

WHEN a moderator deletes a post, THE system SHALL retain a record of the deletion including the moderator's identity, timestamp, and reason for deletion if specified.

WHEN a moderator locks a discussion, THE system SHALL prevent all future comments on that post while preserving existing comments and allowing the post to remain visible.

WHEN a moderator locks a discussion, THE system SHALL add a visual indicator on the post stating "Discussion Locked".

WHILE a discussion is locked, THE system SHALL prevent all citizens from submitting new comments.

WHEN a moderator assigns a warning to a citizen, THE system SHALL record the warning in the citizen's account history with timestamp and reason.

THE system SHALL allow moderators to unassign warnings only through administrator override.

THE system SHALL block users from creating new posts if they have 3 active warnings.

WHEN a citizen with 3 active warnings attempts to create a new post, THE system SHALL deny the creation and display a message stating the citizen is temporarily suspended for policy violations.

## Editing and Deletion

WHEN a citizen creates a post, THE system SHALL allow the citizen to edit that post for 24 hours after the original submission time.

WHEN 24 hours have passed since a citizen's post was created, THE system SHALL disable all editing capabilities for that post.

WHEN a citizen attempts to edit a post after the 24-hour window, THE system SHALL prevent the edit and display a message stating "You can no longer edit this post after 24 hours."

WHEN a citizen edits a post within the 24-hour window, THE system SHALL preserve the original version and create a new revision history entry.

THE system SHALL maintain a revision history for all edits made within the 24-hour window.

WHEN a citizen deletes their own post, THE system SHALL remove the post from public view but preserve it in an "archived" state.

WHEN a contributor deletes their own post, THE system SHALL send an email notification to all moderators who reviewed the post.

WHEN a moderator deletes any post, THE system SHALL override all citizen edit/delete permissions and remove the post from public view.

THE system SHALL prevent citizens from deleting posts created by other citizens.

THE system SHALL prevent citizens from undeleting any post, even their own.

WHEN a moderator permanently deletes a post, THE system SHALL remove it from all public and private indexes and archive it in secure storage for 90 days.

WHEN a moderator permanently deletes a post, THE system SHALL preserve the attachments for audit purposes for 180 days.

## Search and Discovery

WHEN a citizen performs a search for discussion posts using keywords, THE system SHALL return results within 2 seconds.

WHEN a search query returns matches, THE system SHALL display posts in descending chronological order (newest first).

WHEN a search query returns no results, THE system SHALL display a friendly message suggesting alternative search terms and showing trending topics.

THE system SHALL show 20 results per page in search results.

WHEN a citizen clicks on a category filter, THE system SHALL return only posts tagged with that category.

THE system SHALL support category search for predefined tags: economy, politics, policy, markets, global, local, and history.

WHEN a citizen selects a category, THE system SHALL display the category name visibly in the search results header.

WHEN a citizen views a post, THE system SHALL display all tags associated with the post below the post title.

## Notification Requirements

WHEN a moderator rejects a post, THE system SHALL send a notification email to the citizen who submitted the post.

WHEN a moderator permanently deletes a post created by a citizen, THE system SHALL send a notification email to the citizen who created the post.

WHEN a citizen's comment receives a reply, THE system SHALL send a notification to the original commenter.

WHEN a moderator locks a discussion that a citizen has commented on, THE system SHALL send a notification to all participants in that discussion.

WHEN a citizen is granted or revoked warning status, THE system SHALL send an email notification to the affected citizen.

WHEN a citizen's account becomes suspended due to 3 warnings, THE system SHALL send an email notifying the citizen that their posting privileges are suspended.

WHEN a moderator approves a post that a citizen submitted, THE system SHALL send a notification to the submitting citizen.

WHEN a notification is sent, THE system SHALL include the post title and link to the relevant content when applicable.

THE system SHALL store all notification history for each user for 1 year.

THE system SHALL allow citizens to disable non-essential notifications in their account settings.

THE system SHALL reserve the right to send system-critical notifications regardless of notification preferences (e.g., account suspension, moderation decisions).