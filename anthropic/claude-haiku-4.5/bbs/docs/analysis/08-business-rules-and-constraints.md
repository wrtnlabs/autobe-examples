# Business Rules and Constraints

## Introduction

This document defines the business rules and constraints that govern all system behavior in the discussion board. These rules ensure consistent implementation of business logic across all features and protect system integrity. Backend developers must implement these rules to ensure the system operates according to business requirements.

All requirements in this document use EARS (Easy Approach to Requirements Syntax) format to eliminate ambiguity and provide clear, testable specifications. The format uses specific keywords:
- **THE** - identifies the system or component
- **SHALL** - indicates mandatory behavior
- **WHEN** - indicates a triggering event or condition
- **IF** - indicates conditional logic
- **WHILE** - indicates a state or continuous condition
- **WHERE** - indicates optional or conditional features

---

## 1. Discussion Creation Rules

### Core Creation Rules

WHEN a member creates a new discussion topic, THE system SHALL require the following:
- A discussion title between 5 and 200 characters
- A discussion description/body between 20 and 5,000 characters
- Selection of exactly one category from available discussion categories
- THE discussion SHALL be created with status "Active" by default

WHEN a member submits a new discussion, THE system SHALL validate that the member has not exceeded their daily discussion creation limit of 10 new discussions per 24-hour period.

WHEN a member attempts to create a discussion in a category they don't have access to (based on moderation assignments), THE system SHALL deny the creation and display an appropriate error message.

### Title and Content Validation

THE system SHALL reject discussion titles containing only whitespace, numbers, or special characters without meaningful text.

THE system SHALL reject discussion titles that are exact duplicates of existing active discussions by the same user within the past 7 days.

THE system SHALL accept discussions in multiple languages and not restrict content based on language, provided content complies with community guidelines.

THE system SHALL normalize whitespace in discussion titles and descriptions (collapse multiple spaces into single spaces, trim leading/trailing whitespace).

### Discussion Status Rules

WHEN a discussion is created, THE system SHALL set it to "Active" status.

WHILE a discussion has "Active" status, THE system SHALL allow members to create new comments and replies.

IF a moderator closes a discussion, THE system SHALL change status to "Closed" and prevent creation of new comments, though existing comments remain visible.

IF an administrator deletes a discussion, THE system SHALL remove it completely (or mark as "Deleted") and prevent access to all content within it, except for administrators who can view deleted discussions for audit purposes.

---

## 2. Content Validation Rules

### General Content Standards

THE system SHALL validate all user-generated content (discussions, comments, replies) against the following minimum standards:
- Content must be at least 1 character (excluding whitespace) and maximum 5,000 characters
- Content must not consist entirely of whitespace, emojis, or special characters
- Content must not be marked as deleted or spam by moderators

### Comment and Reply Validation

WHEN a member posts a comment or reply, THE system SHALL validate that:
- Comment length is between 1 and 2,000 characters
- The parent discussion exists and is not in "Closed" status
- The parent comment exists (for nested replies) and has not been deleted
- The member has not been banned or muted by moderators

### Link and Mention Validation

THE system SHALL allow URLs in content but SHALL validate that URLs are properly formatted (must start with http:// or https://).

THE system SHALL allow user mentions using @username format but SHALL only recognize mentions where the username exists in the system.

THE system SHALL not automatically create notifications for mentions unless explicitly configured as a feature.

### Content Sanitization

THE system SHALL strip or escape HTML tags and JavaScript code from all user input to prevent injection attacks.

THE system SHALL preserve markdown-style formatting if markdown is supported (but this is not a requirement for the basic system).

---

## 3. User Interaction Rules

### Posting and Commenting Rules

WHEN a member posts a comment, THE system SHALL record:
- The comment content
- The member who created it
- The timestamp of creation (server time, UTC)
- The parent discussion ID
- The parent comment ID (if this is a nested reply)
- Current edit count (initially 0)

THE system SHALL allow members to view all comments on a discussion they can access, ordered by creation time (oldest first) or most recent first based on user preference.

### Comment Thread Rules

IF a comment is a reply to another comment, THE system SHALL preserve the parent-child relationship and display it in a threaded conversation view.

THE system SHALL allow nested replies up to a maximum depth of 5 levels (a reply to a reply to a reply to a reply to a reply, where the 5th level cannot have replies).

IF a user attempts to reply to a comment that is already at maximum nesting depth (5 levels), THE system SHALL show an error message directing them to post their reply at a shallower level.

### Visibility Rules for Deleted or Removed Content

IF a comment is deleted by the member who created it (within 24 hours) or removed by a moderator, THE system SHALL:
- Remove the comment from public view
- Update the comment count on the parent discussion
- Preserve the comment in the database for audit purposes (mark as deleted)
- Display "[deleted]" or similar placeholder in place of the original comment if other comments have nested replies to it

IF a comment is deleted and other comments reference it (are replies to it), THE system SHALL maintain the parent-child relationships for these child comments but display them at the root level of the discussion.

---

## 4. Voting Rules

### Vote Creation and Recording

WHEN a member votes on a discussion or comment, THE system SHALL:
- Record whether the vote is positive (like/upvote) or negative (dislike/downvote)
- Store the voter identity, the target (discussion or comment), and the timestamp
- Update the vote count for that content piece

THE system SHALL allow each member to cast exactly one vote per piece of content (one vote per discussion, one vote per comment).

IF a member attempts to vote on the same content twice, THE system SHALL replace the previous vote with the new vote (changing upvote to downvote, or vice versa).

IF a member votes on content they authored, THE system SHALL still record this vote (members can vote on their own content).

### Vote Display Rules

THE system SHALL display a vote count (or karma score) for each discussion and comment, calculated as (positive votes - negative votes).

THE system SHALL not display individual voter identities in public view (voting is pseudonymous from other members' perspective, but recorded for the member).

THE system SHALL prevent members from seeing which specific members voted on a piece of content (voting privacy).

### Vote Removal Rules

IF a member deletes their account, THE system SHALL remove all their votes from the system.

IF moderators delete content, THE system SHALL also delete all associated votes on that content.

---

## 5. Time-Based Rules

### Content Editing Windows

WHEN a member creates a discussion, comment, or reply, THE system SHALL allow that member to edit their own content for up to 24 hours after creation.

IF a member attempts to edit content older than 24 hours, THE system SHALL deny the edit and display an error message: "This content cannot be edited after 24 hours of creation."

IF a member successfully edits content, THE system SHALL:
- Update the content with the new text
- Record the edit timestamp (seconds precision, UTC)
- Increment the edit count for that content
- Display a marker (e.g., "[edited 24 minutes ago]") on the edited content showing time since last edit

THE system SHALL allow moderators to edit any member's content at any time without the 24-hour limitation.

### Content Deletion Windows

WHEN a member creates content, THE system SHALL allow them to delete their own content for up to 72 hours after creation without moderator intervention.

IF a member attempts to delete content older than 72 hours, THE system SHALL require moderator approval (flagging the content for deletion request).

IF a member successfully deletes content they authored, THE system SHALL mark it as deleted and remove it from public view within that 72-hour window.

THE system SHALL allow moderators to delete any content at any time regardless of age.

### Discussion Lifecycle

THE system SHALL track the creation date and last activity date for each discussion.

THE system SHALL consider a discussion's last activity as the timestamp of the most recent comment or reply posted to it.

THE system SHALL not automatically archive or close discussions based on time alone; only moderators and administrators can explicitly close discussions.

### Account Activity Tracking

THE system SHALL track the last login timestamp for each member account (with seconds precision).

IF a member has not logged in for 365 consecutive days, THE system MAY (but is not required to) mark their account as inactive, though the account remains in the system unless explicitly deleted by administrator or user.

---

## 6. Data Storage and Retention Rules

### Data Retention Policies

THE system SHALL retain all discussion content (discussions, comments, replies) indefinitely unless explicitly deleted by moderators or administrators.

THE system SHALL retain all user account data indefinitely unless a user requests account deletion.

IF a user requests account deletion, THE system SHALL:
- Mark the account as deleted within 1 hour
- Anonymize the user's personal information (email becomes null, display name becomes "[deleted user]")
- Retain content authored by the deleted user (discussions, comments) but attribute it to "[deleted user]"
- Retain voting history for analytics purposes but disassociate it from the user

### Vote and Engagement Data

THE system SHALL retain all voting records (who voted, what they voted on, when) for 2 years minimum for moderation and analytics purposes.

After 2 years, THE system MAY archive or delete historical voting records unless needed for active investigations or legal holds.

### Moderation and Audit Records

THE system SHALL retain all moderation actions (content removed, users warned, users banned) permanently for audit and compliance purposes.

THE system SHALL not delete moderation records even if the moderated content is deleted.

THE moderation action record SHALL include: moderator ID, action type, content ID, reason, timestamp, and any notes.

### Personal Data Retention

THE system SHALL retain user account data (email, password hash, profile information) until the user requests deletion or their account is inactive for 5 years.

IF an account is inactive for 5 consecutive years (no login), THE system MAY delete it, but SHALL send a warning email 30 days before deletion if the email address is still valid.

IF the warning email is undeliverable (bounce), THE system SHALL proceed with deletion after 35 days of inactivity.

---

## 7. Rate Limiting and Abuse Prevention

### Discussion Creation Rate Limits

WHEN a member creates a new discussion, THE system SHALL check if they have exceeded their daily limit of 10 discussions per 24-hour rolling window.

IF a member has created 10 discussions in the past 24 hours, THE system SHALL reject creation of an 11th discussion and display a message: "You can create a maximum of 10 discussions per day. You have 10 remaining this 24-hour period."

THE 24-hour rolling window SHALL be calculated as the past 86,400 seconds from the current time, not calendar days.

### Comment and Reply Rate Limits

WHEN a member posts a comment or reply, THE system SHALL check if they have exceeded their hourly limit of 30 comments/replies per 1-hour rolling window.

IF a member has posted 30 comments in the past hour, THE system SHALL reject the 31st comment and display message: "You are posting comments too quickly. Maximum 30 per hour. Please wait."

THE 1-hour rolling window SHALL be calculated as the past 3,600 seconds from current time.

### Voting Rate Limits

WHEN a member votes, THE system SHALL allow up to 60 votes per minute (1 vote per second average, allowing bursts).

IF a member executes more than 60 votes per minute, THE system SHALL reject further votes and temporarily block voting for that member for 5 minutes.

THE rate limit SHALL be calculated as 60 votes per 60-second rolling window.

### New Account Protections

WHEN a new account is created (account age less than 24 hours from email verification), THE system SHALL apply stricter rate limits:
- Maximum 3 new discussions per 24 hours (instead of 10)
- Maximum 10 comments/replies per hour (instead of 30)
- Maximum 30 votes per minute (instead of 60)

THE stricter limits for new accounts expire automatically 24 hours after email verification completes.

### Duplicate Content Prevention

THE system SHALL prevent members from posting the same exact comment text (identical word-for-word, case-sensitive) more than once within a 10-minute period in the same discussion.

IF a member attempts to post duplicate content within 10 minutes of their previous identical post in the same discussion, THE system SHALL reject it with message: "This comment is too similar to your recent post in this discussion."

THE system SHALL allow re-posting of identical content to different discussions or after the 10-minute window expires.

### Spam and Abuse Thresholds

IF a member receives 5 or more moderation actions (content removals, warnings) within 30 days, THE system SHALL flag the account for moderator review as a potential repeat offender.

IF a member receives 10 or more moderation actions within 90 days, THE system MAY automatically temporarily mute the account (preventing posting) for 24 hours pending administrative review.

THE automatic mute SHALL notify the user and provide them with information about appeals.

---

## 8. Category Management Rules

### Category Structure

THE system SHALL organize discussions into predefined categories related to economics and politics.

THE system SHALL allow administrators (only) to create, edit, and delete categories.

Each category SHALL have:
- A unique name (3-50 characters, alphanumeric and hyphens only)
- A description (maximum 500 characters)
- Optional set of rules or guidelines specific to that category
- A creation timestamp
- A last-modified timestamp

### Category Rules and Tags

THE system SHALL allow each category to have optional subcategories or tags to further organize discussions.

WHEN a member creates a discussion, THE system SHALL require selection of exactly one primary category.

THE system SHALL allow members to add optional secondary tags/labels to discussions they create (maximum 5 tags per discussion, each tag 2-30 characters).

IF a member uses tags that don't exist in the system, THE system SHALL create those tags automatically and make them available for future use.

### Category-Specific Moderation

THE system SHALL allow moderators to be assigned to specific categories (one moderator can be assigned to multiple categories).

WHEN a moderator is assigned to a category, THEY SHALL have moderation authority only within that category and shall not be able to moderate in other categories.

### Archived Categories

IF an administrator marks a category as archived, THE system SHALL:
- Prevent creation of new discussions in that category
- Keep existing discussions visible but marked as read-only
- Display a message: "This category is archived and no longer accepts new discussions"
- Prevent archiving of a category that has active discussions unless explicitly confirmed by administrator

---

## 9. Search and Discovery Rules

### Search Functionality

WHEN a member performs a search, THE system SHALL search across:
- Discussion titles
- Discussion descriptions/body text
- Comment text content
- Discussion category names and tags

THE system SHALL return results ordered by relevance (discussions with matching titles ranked higher than body matches) and recency (more recent matches ranked higher when relevance is equal).

### Search Result Filtering

THE system SHALL allow members to filter search results by:
- Category (single or multiple categories)
- Date range (discussions created between X and Y dates, inclusive)
- Vote count/popularity (discussions with minimum vote threshold)
- Member who created the content (search within one user's content)

### Search Result Visibility

THE system SHALL only return search results for content visible to the searching member based on their role.

GUESTS SHALL see only public discussions and comments that have not been flagged as deleted or spam.

MEMBERS SHALL see their own content even if it's been flagged or hidden, but not content by other members that's been removed by moderators.

MODERATORS SHALL see all content within their assigned categories, including flagged and deleted content, plus all content in unassigned categories.

ADMINISTRATORS SHALL see all content system-wide, including deleted and hidden content.

### Search Limitations and Performance

THE system SHALL not return deleted content in search results for members (members should not be able to find deleted discussions or comments through search).

THE system SHALL not search within flagged/spam discussions unless the searcher is a moderator with authority over that content or an administrator.

WHEN a user performs a search with common keywords, THE system SHALL return results within 2 seconds.

---

## 10. Permission and Access Control Rules

### Role-Based Access to Functions

THE system SHALL enforce the following functional permissions (detailed role definitions are in document 03-user-roles-and-permissions.md):

| Function | Guest | Member | Moderator | Administrator |
|----------|-------|--------|-----------|-----------------|
| View Public Discussions | ✅ | ✅ | ✅ | ✅ |
| Create Discussion | ❌ | ✅ | ✅ | ✅ |
| Comment on Discussion | ❌ | ✅ | ✅ | ✅ |
| Edit Own Content (24h) | N/A | ✅ | ✅ | ✅ |
| Delete Own Content (72h) | N/A | ✅ | ✅ | ✅ |
| Vote on Content | ❌ | ✅ | ✅ | ✅ |
| Flag/Report Content | ❌ | ✅ | ✅ | ✅ |
| View User Profiles | ✅ | ✅ | ✅ | ✅ |
| Edit Own Profile | N/A | ✅ | ✅ | ✅ |
| Remove Others' Content | ❌ | ❌ | ✅† | ✅ |
| Warn/Mute Users | ❌ | ❌ | ✅† | ✅ |
| Ban Users | ❌ | ❌ | ❌ | ✅ |
| Manage Categories | ❌ | ❌ | ❌ | ✅ |
| Manage Moderators | ❌ | ❌ | ❌ | ✅ |
| View System Analytics | ❌ | ❌ | ❌ | ✅ |
| Configure Settings | ❌ | ❌ | ❌ | ✅ |

**Legend**: † = Within assigned category scope only

### Access to Restricted Content

IF a member is banned or muted, THE system SHALL prevent them from creating new discussions, comments, or voting, but SHALL allow them to view existing content.

IF a discussion is closed by moderators, THE system SHALL prevent creation of new comments but SHALL allow viewing existing comments.

IF content is marked as spam or inappropriate by moderators, THE system SHALL:
- Hide it from public view (only moderators and administrators can see it)
- Preserve it in the database for audit purposes
- Display a notice to the original author that their content has been removed
- Provide the original author with reason for removal and appeal instructions

---

## 11. Content Editing and Deletion Rules

### Editing Rules

WHEN a member edits their content, THE system SHALL store:
- The original content (previous version) in edit history
- The edited content (current version) as the display version
- The timestamp of the edit (seconds precision, UTC)
- The edit count (incremented with each edit, initially 0)

THE system SHALL display an "[edited X minutes ago]" marker on edited content visible to all users.

THE system SHALL NOT allow editing of content older than 24 hours by the original author.

THE system SHALL allow members to view their own edit history (all previous versions).

### Deletion Rules

WHEN a member deletes their own content within 72 hours of creation, THE system SHALL immediately remove it from public view.

WHEN a member attempts to delete content older than 72 hours, THE system SHALL:
- Deny the deletion request
- Display message: "Content older than 72 hours cannot be self-deleted. You may request moderator review."
- Suggest that they request moderator review if they believe the content should be removed

WHEN a moderator deletes content, THE system SHALL:
- Remove it from public view immediately
- Mark it as deleted in the database with a deletion timestamp
- Preserve it for audit purposes (not permanently destroy database records)
- Notify the content creator that their content was removed with reason reference

WHEN an administrator deletes content, THE system SHALL:
- Perform the same actions as moderators
- Generate an audit log entry for administrative review
- Allow complete purge of content from database if needed

### Cascading Deletion

IF a discussion is deleted, THE system SHALL also delete or archive all comments and nested replies within that discussion (hard delete option for admins, soft delete for moderators).

IF a comment is deleted, THE system SHALL either:
- Delete all nested replies to that comment if deleted by member or moderator, OR
- Preserve nested replies but display them at a higher level in the discussion thread (admin option)

---

## 12. User Account Rules

### Account Creation

WHEN a new user registers, THE system SHALL require:
- A valid email address (format validated with standard email regex pattern)
- A username between 3 and 30 characters (alphanumeric characters, underscores, and hyphens only)
- A password with minimum 8 characters containing uppercase, lowercase, numbers, and special characters
- Explicit agreement to terms of service and privacy policy

THE system SHALL validate that the email is not already registered within 1 second.

THE system SHALL validate that the username is not already taken within 1 second.

THE system SHALL send a verification email to the registered email address within 1 minute of registration.

### Email Verification

WHEN a user registers, THE system SHALL set their account status to "Unverified".

THE system SHALL send a verification link via email that expires after 24 hours.

IF the user clicks the verification link within 24 hours, THE system SHALL set their account status to "Active" within 10 seconds.

IF 24 hours pass without verification, THE system SHALL allow the user to request a new verification email up to 5 times per day.

AFTER 5 new verification emails are requested in a single day, THE system SHALL block additional requests until the next calendar day.

### Profile Information

WHEN a member creates or updates their profile, THE system SHALL allow:
- Display name (3-50 characters, different from username if desired)
- Bio/About section (maximum 500 characters)
- Profile image/avatar (maximum 5 MB file size)
- Website URL (optional, validated as valid URL format starting with http:// or https://)
- Location (optional, text field, maximum 100 characters)
- Joined date (system-generated, read-only, displayed as "Member since [date]")

THE system SHALL not require members to fill all profile fields; most are optional except display name (if different from username).

### Account Status and Flags

THE system SHALL support the following account statuses:
- "Active" - normal account, can post and participate fully
- "Muted" - account can view but cannot post, vote, or participate
- "Banned" - account is suspended (same functionality as muted but flagged as disciplinary action)
- "Deleted" - user requested deletion, account data is anonymized
- "Inactive" - account has not logged in for 365+ consecutive days (optional flag)

WHEN an account is in "Muted" or "Banned" status, THE system SHALL reject any attempt to create content with message "Your account is currently unable to post. Contact support for details."

WHEN an account status changes from "Active" to "Muted" or "Banned", THE system SHALL:
- Notify user via email within 15 minutes
- Invalidate all active sessions
- Prevent new logins for the duration of the mute/ban

### Account Deletion

WHEN a member requests account deletion, THE system SHALL:
- Require confirmation (email confirmation link or re-authentication with password)
- Mark the account as deleted within 1 hour
- Anonymize personal data (username becomes "[deleted user]", email removed, profile cleared)
- Retain authored content but attribute it to "[deleted user]"
- Retain voting records for analytics but remove association with the user

THE deletion request SHALL be processed within 24 hours after confirmation.

THE system SHALL allow admins to delete user accounts immediately without user request (administrative action).

---

## 13. Conflict Resolution and Edge Cases

### Simultaneous Edit Conflicts

IF two members attempt to edit the same comment simultaneously, THE system SHALL:
- Allow the first edit to complete successfully
- Reject the second edit with HTTP 409 Conflict status
- Display message: "This content has been modified since you started editing. Please refresh and try again."
- Advise the second member to refresh and resubmit if desired

### Conflicting Moderation Actions

IF a moderator and administrator take contradicting actions on the same content simultaneously (e.g., moderator removes content while admin approves it), THE system SHALL:
- Prioritize the administrator action as the authoritative decision
- Log both actions with timestamps for audit purposes
- Notify moderator of the conflict and admin override
- Resolve the conflict in favor of the more restrictive action (if there's ambiguity)

### Vote Count Consistency

THE system SHALL ensure that vote counts are always consistent by:
- Implementing atomic operations when recording votes (database transaction level)
- Recalculating vote counts periodically (daily batch job) to correct any discrepancies
- Logging any vote count corrections for audit purposes
- Alerting administrators if discrepancies exceed 1% of total votes

### Duplicate Discussion Prevention

THE system SHALL detect and prevent obvious duplicate discussions:
- IF a discussion with identical title is created within 60 minutes of another by the same user, display warning: "A similar discussion was recently created by you. Consider replying instead."
- Warning is advisory only; user can proceed if they confirm intentionality

### Comment Thread Nesting Edge Cases

IF a user replies to the maximum nesting depth (level 5), THE system SHALL:
- Reject the reply attempt with message "Comments are nested too deep. Please reply to a higher-level comment."
- Display the maximum nesting depth limit in UI
- Prevent accidental creation of deeply nested threads

---

## 14. Summary of Key Constraints

The following table summarizes critical numerical constraints defined throughout this document:

| Constraint | Limit | Notes |
|-----------|-------|-------|
| Discussion Title Length | 5-200 characters | Validated on submission |
| Discussion Description Length | 20-5,000 characters | Validated on submission |
| Comment/Reply Length | 1-2,000 characters | Validated on submission |
| Daily Discussion Creation Limit | 10 per 24 hours | Rolling window; 3 for new accounts |
| Hourly Comment/Reply Limit | 30 per hour | Rolling window; 10 for new accounts |
| Per-Minute Voting Limit | 60 votes per minute | Rolling window; 30 for new accounts |
| Maximum Comment Nesting Depth | 5 levels | Hard limit enforced |
| Content Edit Window | 24 hours after creation | Members only; no limit for mods/admins |
| Content Delete Window (Member) | 72 hours after creation | Requires moderator approval after |
| Content Deletion via Moderator | Any time | No time restriction |
| Moderation Record Retention | Permanent | Minimum 2 years archive |
| Vote History Retention | 2 years minimum | Can be archived after |
| User Account Inactivity Threshold | 365 days (1 year) | Before optional deletion |
| Maximum Tags per Discussion | 5 tags | Per discussion |
| Username Length | 3-30 characters | Alphanumeric, underscore, hyphen |
| Display Name Length | 3-50 characters | Can differ from username |
| Bio/Profile Length | Maximum 500 characters | Optional field |
| Category Name Length | 3-50 characters | Unique, alphanumeric, hyphen |
| Category Description Length | 200 characters maximum | Optional |
| Duplicate Content Prevention Window | 10 minutes | Same content, same discussion |
| Email Verification Link Expiration | 24 hours | Single-use |
| Password Reset Link Expiration | 30 minutes | Single-use |
| Moderation Actions Before Flag | 5 actions per 30 days | Triggers moderator review |
| Auto-Mute Threshold | 10 actions per 90 days | 24-hour automatic mute |
| Discussion Closure Notification | 10 minutes | Via email to discussion author |
| New Account Restrictions Duration | 24 hours post-verification | After email verified |
| Verification Email Retry Limit | 5 per day | Daily limit |

---

## Implementation Guidance for Developers

### Timestamp Handling
All timestamps SHALL use UTC timezone internally, with seconds precision (UNIX epoch format). User-facing timestamps SHALL be converted to user's local timezone based on their account settings (default to UTC if not set).

### Rolling Window Calculations
All rate limiting calculations use rolling time windows based on current system time, not calendar boundaries. Example: user can create 10 discussions per 86,400-second rolling window from current moment.

### Atomic Operations
Critical operations (voting, comment posting, discussion creation) MUST use database transactions to ensure atomicity—either the entire operation succeeds or fails completely, preventing inconsistent states.

### Audit Trail Requirements
Every business rule enforcement action SHALL be logged in the audit trail: timestamp, user, action taken, affected resource, and reason/result.

---

> *Developer Note: This document defines **business rules and constraints only**. All technical implementations (architecture, APIs, database design, enforcement mechanisms, etc.) are at the discretion of the development team. This document specifies WHAT rules must be enforced, not HOW to enforce them.*