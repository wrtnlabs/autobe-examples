# Business Rules for Economic/Political Discussion Board

## Overview

This document specifies the business rules and validation requirements for the economic/political discussion board system. These rules govern how the system validates data, enforces constraints, and maintains consistency across all operations.

## Content Validation Rules

### Post Content Requirements

THE discussion board SHALL validate all post content submissions to ensure they contain meaningful content.

WHEN a member submits a new post, THE system SHALL require:
- A title containing at least 5 characters and no more than 200 characters
- Content body containing at least 10 characters and no more than 10,000 characters
- At least one category selection (economic or political)

WHEN a member attempts to create a post without a title, THE system SHALL reject the submission and display an error message indicating that titles are required.

WHEN a member attempts to create a post with a title exceeding 200 characters, THE system SHALL reject the submission and inform the user of the character limit.

WHEN a member attempts to create a post with content body containing fewer than 10 characters, THE system SHALL reject the submission and inform the user of the minimum content requirement.

### Post Modification Constraints

WHEN a member attempts to edit a post more than 72 hours after initial creation, THE system SHALL deny the edit request and inform the user that editing is time-limited.

THE system SHALL allow members to edit their posts only when the posts are in "published" status and have not been locked by a moderator.

### Comment Content Validation

WHEN a member submits a comment, THE system SHALL require:
- Comment content containing at least 1 character and no more than 2,000 characters

WHEN a member attempts to submit a comment exceeding 2,000 characters, THE system SHALL reject the submission and inform the user of the character limit.

## User Interaction Rules

### Authentication and Authorization

WHEN a guest attempts to create a post, THE system SHALL deny access and redirect the user to the login page.

WHEN a guest attempts to comment on a post, THE system SHALL deny access and display a message indicating that authentication is required.

WHEN a member attempts to delete another member's post, THE system SHALL deny the request and log the attempt for security monitoring.

WHEN a member attempts to edit another member's post, THE system SHALL deny the request and notify the user that editing privileges are restricted to post authors.

### Voting and Engagement

WHEN a guest attempts to upvote or downvote a post, THE system SHALL deny access and display a message indicating that authentication is required for voting.

THE system SHALL allow each authenticated member to cast only one vote (up or down) per post.

WHEN a member attempts to vote multiple times on the same post, THE system SHALL accept only the first vote and ignore subsequent attempts.

## Moderation Rules

### Content Review Process

WHEN a member creates a new post, THE system SHALL set the post status to "pending_review" until a moderator approves it.

WHEN a moderator approves a post, THE system SHALL change the post status to "published" and make it visible to all users.

WHEN a moderator rejects a post, THE system SHALL change the post status to "rejected" and notify the author with a reason.

### Content Removal and Reporting

WHEN a moderator deletes a post, THE system SHALL:
- Change the post status to "deleted"
- Preserve the post data for audit purposes
- Remove the post from public view
- Notify the post author of the deletion

WHEN a member reports a post for inappropriate content, THE system SHALL:
- Log the report with timestamp and reporter information
- Flag the post for moderator review
- Prevent the reporting feature from being abused (rate limiting)

## Data Integrity Rules

### User Account Integrity

THE system SHALL ensure that each user account has a unique email address.

WHEN a user attempts to register with an email address already in use, THE system SHALL reject the registration and inform the user that the email is already registered.

WHEN a user attempts to change their email address to one that is already registered to another account, THE system SHALL reject the change and inform the user of the conflict.

### Content Referential Integrity

WHEN a post is deleted, THE system SHALL preserve all comments associated with that post but mark them as "orphaned" for administrative review.

WHEN a user account is deleted, THE system SHALL:
- Anonymize all posts and comments by that user
- Preserve the content for historical purposes
- Update author references to "deleted_user"

## File Attachment Rules

### Image Attachment Validation

WHEN a member uploads an image attachment, THE system SHALL validate that:
- The file is in a supported format (JPEG, PNG, GIF)
- The file size does not exceed 5MB
- The file contains valid image data

WHEN a member attempts to upload an image exceeding 5MB, THE system SHALL reject the upload and inform the user of the size limit.

WHEN a member attempts to upload a file with an unsupported image format, THE system SHALL reject the upload and display a list of supported formats.

### General File Attachment Validation

WHEN a member uploads a file attachment, THE system SHALL validate that:
- The file size does not exceed 10MB
- The file type is one of the approved formats (PDF, DOC, DOCX, TXT, XLS, XLSX)
- The filename contains no executable code or scripts

WHEN a member attempts to upload a file exceeding 10MB, THE system SHALL reject the upload and inform the user of the size limitation.

WHEN a member attempts to upload a file with an unapproved file type, THE system SHALL reject the upload and display a list of acceptable formats.

WHEN a member attempts to upload more than 5 attachments per post, THE system SHALL reject additional uploads and inform the user of the attachment limit.

### Attachment Security

THE system SHALL sanitize all uploaded filenames to prevent directory traversal or other security exploits.

WHEN a file attachment contains potentially malicious content, THE system SHALL reject the upload and log the attempt for security review.

## User Account Rules

### Registration Requirements

WHEN a guest submits a registration request, THE system SHALL validate that:
- Email address is in a valid format
- Password is at least 8 characters long
- Password contains at least one uppercase letter, one lowercase letter, and one number
- Username is between 3 and 30 characters long
- Username contains only alphanumeric characters and underscores

WHEN a guest attempts to register with a password shorter than 8 characters, THE system SHALL reject the registration and specify the minimum length requirement.

WHEN a guest attempts to register with a username containing special characters other than underscores, THE system SHALL reject the registration and specify valid character constraints.

### Account Status Management

WHEN a member's account is flagged for violating community guidelines, THE system SHALL notify a moderator for review.

THE system SHALL automatically deactivate accounts that have not been accessed for 2 years, preserving content but preventing login.

WHEN a member requests account deletion, THE system SHALL:
- Confirm the request through email verification
- Anonymize the user's content rather than deleting it
- Mark the account as "deactivated"

## Category and Tag Rules

### Category Management

THE discussion board SHALL support exactly two categories: "economic" and "political".

WHEN a member creates a post, THE system SHALL require selection of at least one category.

WHEN a member attempts to create a post without selecting a category, THE system SHALL reject the submission and prompt for category selection.

### Tag Validation

WHEN a member adds tags to a post, THE system SHALL:
- Allow a maximum of 10 tags per post
- Restrict each tag to 30 characters or fewer
- Prevent duplicate tags on the same post
- Sanitize tags to remove special characters that could cause display issues

WHEN a member attempts to add more than 10 tags to a post, THE system SHALL accept the first 10 and ignore additional tags while informing the user of the limit.

## Comment Rules

### Comment Structure

WHEN a member submits a comment, THE system SHALL validate that:
- The comment is associated with an existing post
- The post is in "published" status
- The comment content meets length requirements (1-2000 characters)

WHEN a member attempts to comment on a post that does not exist, THE system SHALL reject the comment and display an appropriate error.

WHEN a member attempts to comment on a post with "deleted" or "rejected" status, THE system SHALL reject the comment with a message indicating the post is unavailable.

### Comment Moderation

WHEN a moderator deletes a comment, THE system SHALL:
- Change the comment status to "deleted"
- Preserve the comment data for audit purposes
- Replace the comment content with "[deleted]" in public view
- Notify the comment author of the deletion

WHEN a member reports a comment for inappropriate content, THE system SHALL flag the comment for moderator review.

### Comment Hierarchy

THE system SHALL support threaded comments with a maximum depth of 3 levels.

WHEN a member attempts to reply to a comment that is already at the maximum nesting depth, THE system SHALL attach the reply at the parent level instead.

## Future Considerations

WHERE the service grows to support additional user roles, THE system SHALL extend the permission matrix to accommodate new authorization requirements.

WHERE the community expands beyond economic and political topics, THE system SHALL allow administrators to configure additional categories.

WHERE user demand increases for additional file formats, THE system SHALL allow administrators to approve new attachment types through system configuration.