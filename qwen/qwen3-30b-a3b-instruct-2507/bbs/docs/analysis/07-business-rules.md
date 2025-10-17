# Business Rules and Constraints

This document establishes the comprehensive business rules and constraints that govern the operation of the economic/political discussion board. These rules define the system's behavior, user interactions, content management policies, and moderation workflows to ensure a safe, productive, and well-structured discussion environment.

## Content Creation Rules

### Thread Creation Requirements

WHEN a member attempts to create a new discussion thread, THE system SHALL enforce the following content creation rules:

- THE system SHALL require a unique thread title with a minimum length of 10 characters and a maximum length of 200 characters
- THE system SHALL allow a thread description of up to 1,500 characters
- THE system SHALL validate that the thread title does not contain profanity, hate speech, or explicit content
- THE system SHALL reject thread creation if the title contains more than 3 consecutive uppercase letters
- THE system SHALL record the creation timestamp with millisecond precision
- THE system SHALL assign a unique thread identifier in the format 'T-{random-uuid}'

### Post and Reply Specifications

WHEN a member creates a new post or reply within an existing thread, THE system SHALL:

- THE system SHALL limit post content to a maximum of 5,000 characters
- THE system SHALL allow basic text formatting (bold, italics, strikethrough) but NOTrich text or HTML
- THE system SHALL enforce minimum post length of 20 characters for original posts and 10 characters for replies
- THE system SHALL prevent users from posting blank content
- THE system SHALL automatically detect and flag posts containing more than 3 consecutive exclamation marks (!! or !!!)
- THE system SHALL record the post creation timestamp with millisecond precision
- THE system SHALL assign a unique post identifier in the format 'P-{random-uuid}'

### Editing and Modification Policies

WHILE a member is editing their own post, THE system SHALL:

- THE system SHALL allow content modification within 24 hours of creation
- THE system SHALL maintain an edit history showing the previous version and editing timestamps
- THE system SHALL display a "Edited" indicator on posts that have been modified
- THE system SHALL prevent editing of posts that have received replies
- THE system SHALL display a warning message when attempting to edit a post that has been reported
- THE system SHALL log all editing actions with the user ID and timestamp

## Posting Limits and Restrictions

### Creation Frequency Controls

WHEN a member attempts to create new content, THE system SHALL enforce the following posting frequency limits:

- THE system SHALL allow a maximum of 5 new threads per day
- THE system SHALL allow a maximum of 20 new posts/replies per day
- THE system SHALL implement rate limiting with a 15-second cooldown between consecutive thread creations
- THE system SHALL implement rate limiting with a 5-second cooldown between consecutive post/reply creations
- THE system SHALL display a user-friendly message when the limit is reached with the exact time remaining until the limit resets
- THE system SHALL maintain posting frequency counters separately for threads and replies

### Content Size Constraints

WHEN a user submits content, THE system SHALL enforce the following size limitations:

- THE system SHALL reject any thread title exceeding 200 characters
- THE system SHALL reject any thread description exceeding 1,500 characters
- THE system SHALL reject any post or reply exceeding 5,000 characters
- THE system SHALL provide immediate feedback when content length approaches the limit with a visual indicator
- THE system SHALL automatically truncate content that exceeds the limit and inform the user
- THE system SHALL enforce these limits regardless of content formatting or whitespace

## User Behavior Constraints

### Input Validation Requirements

WHEN a user submits any form data, THE system SHALL enforce the following input validation:

- THE system SHALL validate email addresses using standard email format rules
- THE system SHALL reject user names containing special characters other than hyphens and underscores
- THE system SHALL validate that passwords meet minimum complexity requirements (8+ characters, at least one uppercase letter, one lowercase letter, one number, and one special character)
- THE system SHALL prevent SQL injection attempts by sanitizing input
- THE system SHALL prevent cross-site scripting (XSS) attacks by removing or encoding dangerous characters
- THE system SHALL reject specific prohibited words or phrases in content

### Interaction Patterns

WHEN a user interacts with content, THE system SHALL enforce the following behavior constraints:

- THE system SHALL allow each user to upvote a single post or reply per thread
- THE system SHALL allow each user to downvote a single post or reply per thread
- THE system SHALL prevent users from voting on their own content
- THE system SHALL implement a cooldown of 30 seconds between consecutive voting actions
- THE system SHALL display real-time vote counts with a +/- notation
- THE system SHALL prevent users from posting identical content within a 3-minute window

### Content Moderation

WHILE a post has been reported, THE system SHALL:

- THE system SHALL flag content as pending review and record the report timestamp
- THE system SHALL prevent the post from being visible to the general public until reviewed
- THE system SHALL temporarily freeze editing and voting on the post
- THE system SHALL notify the moderator responsible for review with priority alert
- THE system SHALL log all moderation actions with timestamps and user IDs
- THE system SHALL maintain a history of all moderation decisions

## Moderation Policies

### Reporting System Requirements

WHEN a member reports content as inappropriate, THE system SHALL:

- THE system SHALL allow reporting of posts, replies, and threads
- THE system SHALL require a detailed reason for the report with predefined categories (spam, harassment, false information, hate speech, explicit content, other)
- THE system SHALL collect the reporter's user ID and timestamp
- THE system SHALL automatically increment the report counter for the content
- THE system SHALL create a moderation queue entry with priority level based on content severity
- THE system SHALL send a notification to the appropriate moderator

### Review Workflow

WHEN a moderator begins reviewing reported content, THE system SHALL:

- THE system SHALL display the original content with highlighting of the reported section
- THE system SHALL show a summary of all reports received on this content
- THE system SHALL provide access to the user's profile and posting history
- THE system SHALL allow the moderator to view edit history and voting activity
- THE system SHALL provide a decision interface with clear options: "Approve", "Remove", "Mark as Spam", "Notify User", "Further Review"
- THE system SHALL record the moderator's decision with timestamp and rationale

### Enforcement Actions

IF a post is determined to violate community guidelines, THEN THE system SHALL:

- THE system SHALL remove the content from public view
- THE system SHALL notify the original author with the reason for removal
- THE system SHALL log the enforcement action with details
- THE system SHALL apply consequences based on severity and user history
- THE system SHALL add a permanent flag to the content indicating it was removed for policy violation
- THE system SHALL prevent future posting from the affected user under the same conditions

## Verification Requirements

### Account Validation

WHEN a new member registers, THE system SHALL:

- THE system SHALL require email verification before account activation
- THE system SHALL send a verification email with a unique link valid for 24 hours
- THE system SHALL prevent login attempts until email verification is completed
- THE system SHALL automatically expire inactive accounts after 30 days without verification
- THE system SHALL track verification attempts with timestamps
- THE system SHALL provide clear error messages for expired verification links

### User Profile Verification

WHEN a member upgrades to a premium account (if applicable), THE system SHALL:

- THE system SHALL require government-issued ID verification through a secure upload process
- THE system SHALL require facial recognition verification
- THE system SHALL compare the ID photo with the user's profile picture
- THE system SHALL reject requests where the faces do not match
- THE system SHALL maintain all verification documents in encrypted storage
- THE system SHALL provide a verification status indicator on the user profile

## System Constraints

### Performance Limits

WHILE the system is under high load, THE system SHALL:

- THE system SHALL limit search results to a maximum of 50 entries
- THE system SHALL implement a 3-second timeout for search queries
- THE system SHALL reduce the frequency of real-time notifications
- THE system SHALL cache frequently accessed content for 5 minutes
- THE system SHALL prioritize processing of new content over display of older content
- THE system SHALL display a "System under heavy load" notice when performance thresholds are exceeded

### Resource Management

WHEN a user attempts to upload a file, THE system SHALL:

- THE system SHALL limit file size to 10MB
- THE system SHALL restrict file types to images (JPEG, PNG, GIF) and PDF documents
- THE system SHALL perform virus scanning on all uploaded files
- THE system SHALL display upload progress with percentage completion
- THE system SHALL restrict simultaneous uploads to 3 at a time
- THE system SHALL provide immediate feedback if a file type is not supported

### Error Handling

WHEN an error occurs during content creation, THE system SHALL:

- THE system SHALL display a user-friendly error message in the application interface
- THE system SHALL preserve partially entered content in the browser session
- THE system SHALL provide a "Retry" option with the original content
- THE system SHALL log the error with detailed context for development teams
- THE system SHALL provide diagnostic information to administrators without exposing sensitive data
- THE system SHALL prevent system crashes from affecting other users

## Business Rules Diagram

The following Mermaid diagram illustrates the content moderation workflow:

```mermaid
graph LR
    A[