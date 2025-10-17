
# Business Rules and Validation

## Introduction

This document defines the comprehensive business rules, validation requirements, and operational constraints that govern the economic/political discussion board platform. These rules ensure content quality, prevent abuse, maintain civil discourse, and create a fair environment for political and economic discussions.

All business rules are enforced consistently across the platform to provide a predictable user experience and maintain platform integrity. These rules complement the functional requirements defined in related documents and provide the specific constraints needed for implementation.

### Document Purpose

This document serves as the single source of truth for:
- Input validation requirements for all user-generated content
- Rate limiting rules to prevent spam and abuse
- Time-based restrictions for content modification
- Reputation and privilege requirements for platform actions
- Automated quality checks and content filtering
- Business logic constraints across all features

### Relationship to Other Documents

This document works in conjunction with:
- [User Roles and Authentication Document](./02-user-roles-and-authentication.md) - Defines role-based permissions
- [Discussion Management Document](./03-discussion-management.md) - Defines discussion features
- [Voting and Engagement Document](./04-voting-and-engagement.md) - Defines voting mechanics
- [Moderation System Document](./05-moderation-system.md) - Defines moderation workflow
- [Performance and Security Document](./10-performance-and-security.md) - Defines security requirements

### Rule Enforcement Approach

All rules defined in this document are enforced through:
- Server-side validation (mandatory for security)
- Client-side validation (for immediate user feedback)
- Automated background checks (for spam and quality)
- Real-time rate limiting (for abuse prevention)
- Clear user feedback when rules are violated

---

## Content Validation Rules

### Discussion Topic Validation

**Topic Title Requirements:**

WHEN a user creates a discussion topic, THE system SHALL validate the topic title.

THE topic title SHALL be between 10 and 200 characters in length.

THE topic title SHALL NOT consist entirely of uppercase letters.

THE topic title SHALL NOT contain only special characters or numbers.

THE topic title SHALL contain at least 3 alphabetic characters.

WHEN a topic title contains URLs, THE system SHALL reject the topic creation.

WHEN a topic title contains excessive punctuation (more than 3 consecutive punctuation marks), THE system SHALL reject the topic creation.

THE topic title SHALL be trimmed of leading and trailing whitespace before validation.

**Topic Body Requirements:**

WHEN a user creates a discussion topic, THE system SHALL validate the topic body content.

THE topic body SHALL be between 20 and 50,000 characters in length.

THE topic body SHALL NOT be identical to the topic title.

WHEN a topic body contains more than 10 URLs, THE system SHALL reject the topic creation.

WHEN a topic body consists of more than 80% URLs or special characters, THE system SHALL reject the topic creation.

THE topic body SHALL support Markdown formatting but not allow dangerous HTML tags.

**Category and Tag Validation:**

WHEN a user creates a discussion topic, THE system SHALL require exactly one category assignment.

THE assigned category SHALL be one of the predefined categories: "Economics", "Politics", "Current Events", "Policy Analysis", "Economic Theory", "Political Theory", "International Relations", "Domestic Policy".

WHEN a user adds tags to a topic, THE system SHALL allow between 0 and 5 tags.

THE tag length SHALL be between 2 and 30 characters per tag.

THE tag SHALL contain only alphanumeric characters, hyphens, and spaces.

THE tag SHALL NOT consist entirely of numbers.

### Reply and Comment Validation

**Reply Content Requirements:**

WHEN a user posts a reply to a discussion topic, THE system SHALL validate the reply content.

THE reply content SHALL be between 1 and 10,000 characters in length.

WHEN a reply contains more than 5 URLs, THE system SHALL flag it for moderator review.

WHEN a reply is identical to a previous reply by the same user in the same topic, THE system SHALL reject the duplicate reply.

THE reply SHALL support Markdown formatting with the same restrictions as topic bodies.

**Threaded Reply Depth:**

THE system SHALL allow threaded replies up to a maximum depth of 10 levels.

WHEN a user attempts to reply to a comment at the 10th level, THE system SHALL reject the reply and suggest replying to a higher-level comment.

**Quote Validation:**

WHEN a reply includes quoted text from another post, THE quoted text SHALL NOT exceed 50% of the total reply length.

WHEN a reply consists of only quoted text without original content, THE system SHALL reject the reply.

### User Profile Content Validation

**Username Requirements:**

WHEN a user registers an account, THE system SHALL validate the username.

THE username SHALL be between 3 and 30 characters in length.

THE username SHALL contain only alphanumeric characters, underscores, and hyphens.

THE username SHALL NOT start or end with special characters.

THE username SHALL NOT contain offensive words from the prohibited word list.

THE username SHALL be unique across the entire platform.

**Bio and Profile Information:**

WHEN a user updates their profile bio, THE system SHALL validate the bio content.

THE bio SHALL be between 0 and 500 characters in length.

THE bio SHALL NOT contain more than 2 URLs.

WHEN a user updates their display name, THE display name SHALL be between 1 and 50 characters.

### Prohibited Content Types

THE system SHALL reject content containing:
- Explicit calls for violence or harm
- Personal identifying information (PII) of other users
- Malicious URLs or phishing attempts
- Embedded executable code or scripts
- Excessive profanity (more than 2% of content)
- Spam keywords from the spam detection list

WHEN prohibited content is detected, THE system SHALL reject the submission and provide a specific reason to the user.

---

## User Input Constraints

### Text Field Length Limits

THE system SHALL enforce the following character limits for all user input fields:

| Field Type | Minimum Length | Maximum Length | Validation Rule |
|------------|----------------|----------------|-----------------|
| Topic Title | 10 characters | 200 characters | Required, trimmed |
| Topic Body | 20 characters | 50,000 characters | Required, supports Markdown |
| Reply Content | 1 character | 10,000 characters | Required, supports Markdown |
| Username | 3 characters | 30 characters | Required, unique, alphanumeric |
| Display Name | 1 character | 50 characters | Optional |
| User Bio | 0 characters | 500 characters | Optional |
| Tag Name | 2 characters | 30 characters | Alphanumeric with spaces |
| Report Reason | 10 characters | 1,000 characters | Required for reports |
| Search Query | 1 character | 200 characters | Required for search |

### Character Restrictions

**Allowed Characters:**

WHEN validating text input, THE system SHALL allow the following character sets:
- Alphabetic characters (A-Z, a-z, and Unicode letters for international support)
- Numeric characters (0-9)
- Common punctuation (., ,, !, ?, ;, :, ', ", -)
- Standard whitespace (space, newline, tab)
- Special characters for Markdown formatting (*, _, #, [, ], (, ))

**Restricted Characters:**

THE system SHALL reject or escape the following characters in user input:
- HTML tags (except safe Markdown-generated HTML)
- JavaScript event handlers (onclick, onerror, etc.)
- SQL injection patterns ('; DROP TABLE, etc.)
- Null bytes and control characters
- Excessive consecutive special characters (more than 5 in a row)

### Formatting Rules

**Markdown Support:**

THE system SHALL support the following Markdown formatting in topic bodies and replies:
- Headers (# through ###)
- Bold and italic text
- Ordered and unordered lists
- Blockquotes
- Code blocks and inline code
- Links (with URL validation)
- Horizontal rules

THE system SHALL NOT support:
- Embedded HTML (except safe Markdown output)
- JavaScript in links
- iframe or embed tags
- Image uploads via Markdown (links to external images allowed)

**Line Break Handling:**

WHEN a user includes line breaks in content, THE system SHALL preserve up to 3 consecutive blank lines.

WHEN content contains more than 3 consecutive blank lines, THE system SHALL collapse them to 3 blank lines.

### URL Validation

WHEN a user includes URLs in content, THE system SHALL validate each URL.

THE URL SHALL use HTTP or HTTPS protocol only.

THE URL SHALL NOT exceed 2,000 characters in length.

THE URL SHALL NOT point to known malicious domains (checked against blacklist).

WHEN a URL shortener is detected, THE system SHALL expand the URL and validate the destination.

---

## Rate Limiting Rules

### Topic Creation Limits

WHEN a member creates discussion topics, THE system SHALL enforce rate limits to prevent spam.

THE system SHALL allow a maximum of 5 topics per hour per user.

THE system SHALL allow a maximum of 20 topics per day per user.

WHEN a user exceeds the hourly topic limit, THE system SHALL reject the topic creation and inform the user of the cooldown period remaining.

WHERE a user has moderator or administrator role, THE system SHALL exempt them from topic creation rate limits.

### Reply Posting Limits

WHEN a member posts replies, THE system SHALL enforce rate limits to prevent spam.

THE system SHALL allow a maximum of 30 replies per hour per user.

THE system SHALL allow a maximum of 200 replies per day per user.

WHEN a user posts more than 3 replies to the same topic within 5 minutes, THE system SHALL introduce a 2-minute cooldown before allowing the next reply.

WHEN a user exceeds the hourly reply limit, THE system SHALL reject the reply and display the cooldown time remaining.

### Voting Rate Limits

WHEN a member votes on content, THE system SHALL enforce rate limits to prevent vote manipulation.

THE system SHALL allow a maximum of 200 votes per hour per user.

THE system SHALL allow a maximum of 1,000 votes per day per user.

WHEN a user votes and then immediately changes the vote on the same content repeatedly (more than 3 times within 1 minute), THE system SHALL lock the vote for 5 minutes.

WHEN a user exceeds voting rate limits, THE system SHALL reject the vote and inform the user.

### Report Submission Limits

WHEN a user submits content reports, THE system SHALL enforce rate limits to prevent report abuse.

THE system SHALL allow a maximum of 10 reports per hour per user.

THE system SHALL allow a maximum of 50 reports per day per user.

WHEN a user submits multiple reports for the same content within 24 hours, THE system SHALL reject duplicate reports.

### Account Creation Limits

WHEN new accounts are created from the same IP address, THE system SHALL enforce limits to prevent mass account creation.

THE system SHALL allow a maximum of 3 account registrations per IP address per day.

WHEN the IP-based limit is exceeded, THE system SHALL require email verification before allowing additional registrations.

### Search Rate Limits

WHEN a user performs searches, THE system SHALL enforce rate limits to prevent system abuse.

THE system SHALL allow a maximum of 60 search queries per minute per user.

WHEN the search rate limit is exceeded, THE system SHALL queue requests and inform the user of the delay.

### Anti-Spam Measures

**Duplicate Content Detection:**

WHEN a user submits content (topic or reply), THE system SHALL check for duplicate content.

IF the content is identical to content the user posted within the last 24 hours, THEN THE system SHALL reject the submission as duplicate.

WHEN content is 90% similar to recent content by the same user, THE system SHALL flag it for review.

**Rapid-Fire Posting Detection:**

WHEN a user posts content in rapid succession (more than 5 posts within 2 minutes), THE system SHALL introduce progressive cooldown periods:
- First instance: 30-second cooldown
- Second instance: 2-minute cooldown
- Third instance: 5-minute cooldown
- Fourth instance: 15-minute cooldown

**Pattern-Based Spam Detection:**

WHEN content matches known spam patterns, THE system SHALL automatically reject or flag the content:
- Excessive capitalization (more than 50% uppercase)
- Excessive URLs (more than content-to-URL ratio of 10:1)
- Repeated character sequences (same character more than 10 times consecutively)
- Known spam phrases from detection database

---

## Reputation and Privilege Requirements

### Reputation Calculation Rules

THE system SHALL calculate user reputation based on the following factors:

**Positive Reputation Events:**
- Topic receives upvote: +5 reputation points
- Reply receives upvote: +3 reputation points
- Topic is marked as featured by moderator: +20 reputation points
- User account verified via email: +10 reputation points (one-time)

**Negative Reputation Events:**
- Topic receives downvote: -2 reputation points
- Reply receives downvote: -1 reputation point
- Content removed by moderator: -10 reputation points
- User receives warning from moderator: -20 reputation points
- User temporarily suspended: -50 reputation points

**Reputation Boundaries:**

THE minimum reputation score SHALL be 0 (cannot go negative).

THE maximum reputation score SHALL be 100,000 points.

WHEN a user's reputation reaches 0, THE user SHALL retain basic posting privileges but lose advanced features.

### Actions Requiring Minimum Reputation

THE system SHALL require minimum reputation levels for certain actions:

| Action | Minimum Reputation Required | Role Requirement |
|--------|----------------------------|------------------|
| Create new topic | 0 points | Member |
| Post reply | 0 points | Member |
| Vote on content | 10 points | Member |
| Downvote content | 50 points | Member |
| Edit own topic after 24 hours | 100 points | Member |
| Add more than 3 tags to topic | 200 points | Member |
| Create new tag | 500 points | Member |
| Flag content for moderation | 25 points | Member |
| Participate in meta discussions | 100 points | Member |

WHEN a user attempts an action without sufficient reputation, THE system SHALL reject the action and inform the user of the reputation requirement.

### Role-Based Privilege Gates

**Member Privileges:**

WHEN a user has the member role, THE user SHALL have access to:
- Creating discussion topics (subject to rate limits)
- Posting replies (subject to rate limits)
- Voting on content (subject to reputation and rate limits)
- Editing own content (subject to time restrictions)
- Reporting content for moderation
- Managing own profile and preferences
- Blocking other users

**Moderator Privileges:**

WHEN a user has the moderator role, THE user SHALL have access to all member privileges PLUS:
- Viewing moderation queue
- Hiding or removing inappropriate content
- Issuing warnings to users
- Temporarily suspending users (up to 30 days)
- Featuring quality topics
- Viewing content reports
- Adding moderator notes to user accounts
- Bypassing rate limits for posting

**Administrator Privileges:**

WHEN a user has the administrator role, THE user SHALL have access to all moderator privileges PLUS:
- Appointing and removing moderators
- Permanently banning users
- Managing categories and site-wide settings
- Viewing all system audit logs
- Accessing user management tools
- Modifying platform configuration
- Overriding all rate limits and restrictions

### Progressive Permission Unlocking

THE system SHALL unlock additional features as users gain reputation:

**Reputation Milestones:**
- 0 points: Basic posting and reading
- 10 points: Upvoting enabled
- 50 points: Downvoting enabled
- 100 points: Extended editing window
- 200 points: Advanced tagging
- 500 points: Tag creation
- 1,000 points: Meta discussion access
- 5,000 points: Special "Trusted Contributor" badge

WHEN a user reaches a reputation milestone, THE system SHALL notify the user of newly unlocked features.

---

## Content Length Limits

### Topic Length Requirements

**Topic Title Length:**

THE topic title minimum length SHALL be 10 characters.

THE topic title maximum length SHALL be 200 characters.

WHEN a user enters a title shorter than 10 characters, THE system SHALL display an error: "Title must be at least 10 characters long."

WHEN a user enters a title longer than 200 characters, THE system SHALL prevent further input and display a character count indicator.

**Topic Body Length:**

THE topic body minimum length SHALL be 20 characters.

THE topic body maximum length SHALL be 50,000 characters.

WHEN a user attempts to post a topic with a body shorter than 20 characters, THE system SHALL reject the topic and explain the minimum length requirement.

WHEN a user approaches the maximum length (45,000+ characters), THE system SHALL display a warning indicating remaining characters.

### Reply Length Requirements

**Reply Content Length:**

THE reply minimum length SHALL be 1 character (to allow short responses like "Yes" or "Agreed").

THE reply maximum length SHALL be 10,000 characters.

WHEN a reply exceeds 10,000 characters, THE system SHALL prevent submission and suggest breaking the content into multiple replies or creating a new topic.

### User Profile Length Limits

**Bio Length:**

THE user bio maximum length SHALL be 500 characters.

THE user bio minimum length SHALL be 0 characters (bio is optional).

**Display Name Length:**

THE display name minimum length SHALL be 1 character.

THE display name maximum length SHALL be 50 characters.

**Location and Website Fields:**

THE location field maximum length SHALL be 100 characters.

THE website URL maximum length SHALL be 200 characters.

### Category and Tag Constraints

**Category Name Length:**

THE category name minimum length SHALL be 3 characters.

THE category name maximum length SHALL be 50 characters.

**Tag Length and Count:**

THE tag minimum length SHALL be 2 characters.

THE tag maximum length SHALL be 30 characters.

THE maximum number of tags per topic SHALL be 5 tags.

WHEN a user attempts to add a 6th tag, THE system SHALL reject the tag and inform the user of the 5-tag limit.

### Search Query Length

THE search query minimum length SHALL be 1 character.

THE search query maximum length SHALL be 200 characters.

WHEN a search query exceeds 200 characters, THE system SHALL truncate the query and inform the user.

---

## Time-Based Restrictions

### Content Edit Window

**Topic Edit Restrictions:**

WHEN a member creates a topic, THE member SHALL be allowed to edit the topic within 24 hours of creation.

WHEN 24 hours have passed since topic creation, THE system SHALL lock the topic title and body for editing by the original author.

WHERE the user has reputation of 100 points or higher, THE system SHALL extend the edit window to 7 days.

WHERE the user has moderator or administrator role, THE system SHALL allow editing at any time.

WHEN a topic has received more than 10 replies, THE system SHALL lock the topic title to prevent confusion, while allowing body edits within the time window.

**Reply Edit Restrictions:**

WHEN a member posts a reply, THE member SHALL be allowed to edit the reply within 1 hour of posting.

WHEN 1 hour has passed since reply posting, THE system SHALL lock the reply for editing.

WHERE the user has reputation of 100 points or higher, THE system SHALL extend the edit window to 24 hours.

WHERE the user has moderator or administrator role, THE system SHALL allow editing at any time.

**Edit History Tracking:**

WHEN content is edited within the allowed time window, THE system SHALL record the edit timestamp and preserve edit history.

WHEN content has been edited more than 3 times, THE system SHALL display an "edited" indicator on the content.

### Content Deletion Time Constraints

**Topic Deletion Window:**

WHEN a member creates a topic, THE member SHALL be allowed to delete the topic within 1 hour of creation IF the topic has received 0 replies.

WHEN a topic has received 1 or more replies, THE member SHALL NOT be allowed to delete the topic.

WHERE the user has moderator or administrator role, THE system SHALL allow topic deletion at any time.

**Reply Deletion Window:**

WHEN a member posts a reply, THE member SHALL be allowed to delete the reply within 1 hour of posting IF the reply has received 0 direct responses.

WHEN a reply has child replies, THE member SHALL NOT be allowed to delete the reply.

WHERE a reply is deleted within the allowed window, THE system SHALL replace the content with "[deleted by user]" to maintain thread continuity.

### Vote Change Restrictions

WHEN a user votes on content, THE user SHALL be allowed to change or remove the vote within 5 minutes of the original vote.

WHEN 5 minutes have passed since the vote, THE system SHALL lock the vote and prevent changes.

WHEN a user attempts to change a locked vote, THE system SHALL display a message: "Votes can only be changed within 5 minutes of voting."

### Account Age Requirements

**New Account Restrictions:**

WHEN an account is less than 24 hours old, THE system SHALL impose additional restrictions:
- Maximum 3 topics per day (instead of 20)
- Maximum 20 replies per day (instead of 200)
- Cannot downvote content
- Cannot flag content for moderation

WHEN an account reaches 24 hours of age, THE system SHALL automatically lift these restrictions.

**Email Verification Grace Period:**

WHEN an account is created without email verification, THE system SHALL allow 7 days for verification.

WHEN 7 days have passed without email verification, THE system SHALL restrict the account to read-only access until verification is completed.

### Cooldown Periods

**Post-Suspension Cooldown:**

WHEN a user's suspension period ends, THE system SHALL impose a 24-hour cooldown period with reduced posting limits:
- Maximum 5 topics per day
- Maximum 30 replies per day
- All content flagged for automatic moderator review

WHEN the 24-hour cooldown period expires, THE system SHALL restore normal posting privileges.

**Rapid Topic Creation Cooldown:**

WHEN a user creates 3 topics within 10 minutes, THE system SHALL impose a 30-minute cooldown before allowing the next topic creation.

**Rapid Reply Cooldown:**

WHEN a user posts 10 replies within 5 minutes, THE system SHALL impose a 5-minute cooldown before allowing the next reply.

---

## Automated Content Checks

### Spam Detection Rules

**URL Spam Detection:**

WHEN content contains more than 5 URLs, THE system SHALL automatically flag the content for moderator review.

WHEN content has a URL-to-text ratio greater than 1:10 (more URLs than text), THE system SHALL reject the submission as likely spam.

WHEN URLs point to domains on the spam domain blacklist, THE system SHALL reject the submission immediately.

**Repeated Content Detection:**

WHEN a user submits content identical to their previous submission within 24 hours, THE system SHALL reject the submission as duplicate spam.

WHEN content is 85% or more similar to content posted by the same user within 7 days, THE system SHALL flag it for review.

**Pattern Matching for Spam:**

THE system SHALL automatically detect and reject content matching these spam patterns:
- All-caps text (more than 50% uppercase)
- Excessive punctuation (!!!!!!, ??????, etc.)
- Repeated words (same word 5+ times in a row)
- Known spam phrases ("click here now", "limited time offer", etc.)
- Excessive emoji usage (more than 10 emojis in a single post)

### Duplicate Content Detection

**Cross-Topic Duplicate Detection:**

WHEN a user posts a reply, THE system SHALL check if the exact same text was posted by the user in a different topic within the last 7 days.

WHEN an exact duplicate is detected across topics, THE system SHALL reject the submission and suggest posting unique content.

**Self-Plagiarism Detection:**

WHEN a user creates a new topic, THE system SHALL check if the topic body is substantially similar (90%+ match) to a previous topic by the same user.

WHEN substantial similarity is detected, THE system SHALL suggest the user update their original topic instead of creating a duplicate.

### Link Validation

**URL Safety Checks:**

WHEN a user includes a URL in content, THE system SHALL perform the following checks:
- Verify the URL uses HTTP or HTTPS protocol
- Check the domain against malicious domain blacklist
- Verify the URL is not a known phishing site
- Check for URL shorteners and expand them to verify destination

WHEN a URL fails safety checks, THE system SHALL reject the content and inform the user of the security concern.

**Link Integrity Validation:**

WHEN a URL is submitted, THE system SHALL verify the link is properly formatted and does not contain malicious parameters.

WHEN a URL contains suspicious query parameters (e.g., redirect chains, tracking tokens), THE system SHALL strip the parameters or flag for review.

### Profanity and Content Filtering

**Profanity Detection:**

THE system SHALL maintain a configurable profanity word list for detection purposes.

WHEN content contains words from the profanity list, THE system SHALL count the occurrences.

WHEN profanity exceeds 2% of total word count, THE system SHALL flag the content for moderator review.

WHERE the platform is configured for strict filtering, THE system SHALL automatically replace profanity with asterisks.

**Content Quality Checks:**

WHEN content is very short (under 10 words) and contains no meaningful information, THE system SHALL flag it as low-quality.

WHEN a user posts consecutive low-quality content (3 or more flagged posts), THE system SHALL require moderator approval for subsequent posts until quality improves.

### Character Pattern Detection

**Excessive Repetition:**

WHEN content contains the same character repeated more than 10 times consecutively (e.g., "aaaaaaaaaaa"), THE system SHALL flag the content for review.

WHEN content contains repeated character patterns (e.g., "hahahaha" repeated 5+ times), THE system SHALL flag for spam detection.

**Keyboard Mashing Detection:**

WHEN content contains random keyboard sequences (e.g., "asdfghjkl", "qwertyuiop"), THE system SHALL flag the content as potential spam or abuse.

WHEN more than 20% of content consists of non-word character sequences, THE system SHALL reject the submission.

---

## Business Logic Constraints

### Topic State Transitions

**Topic Lifecycle States:**

THE system SHALL manage topics through the following states: "active", "locked", "archived", "deleted".

**Active to Locked Transition:**

WHEN a moderator locks a topic, THE topic state SHALL transition from "active" to "locked".

WHILE a topic is in "locked" state, THE system SHALL prevent new replies but allow viewing.

**Active to Archived Transition:**

WHEN a topic has no new activity for 180 days, THE system SHALL automatically transition the topic to "archived" state.

WHILE a topic is in "archived" state, THE system SHALL allow viewing but prevent new replies and votes.

**Locked to Active Transition:**

WHEN a moderator unlocks a topic, THE topic state SHALL transition from "locked" to "active".

WHERE a topic is "archived", THE system SHALL NOT allow transition back to "active" unless an administrator performs the action.

**Deletion Rules:**

WHEN a moderator deletes a topic, THE topic state SHALL transition to "deleted".

WHILE a topic is in "deleted" state, THE system SHALL hide the topic from all users except moderators and administrators.

THE system SHALL retain deleted topics for 90 days before permanent deletion for audit purposes.

### User Status Changes

**User Status States:**

THE system SHALL manage user accounts through the following states: "active", "suspended", "banned", "pending_verification".

**Active to Suspended Transition:**

WHEN a moderator suspends a user, THE user status SHALL transition to "suspended" with a specified duration.

WHILE a user is in "suspended" state, THE system SHALL prevent the user from creating topics, posting replies, or voting.

WHILE a user is in "suspended" state, THE system SHALL allow the user to view content and edit their profile.

**Suspended to Active Transition:**

WHEN the suspension period expires, THE system SHALL automatically transition the user status back to "active".

WHEN a moderator manually lifts a suspension, THE user status SHALL immediately transition to "active".

**Active to Banned Transition:**

WHEN an administrator bans a user, THE user status SHALL transition to "banned".

WHILE a user is in "banned" state, THE system SHALL prevent all platform access except viewing a ban notice.

**Ban Appeal Process:**

WHEN a banned user submits an appeal, THE system SHALL create an appeal record for administrator review.

IF an administrator approves the appeal, THEN THE user status SHALL transition from "banned" to "active".

### Moderation Action Rules

**Warning Escalation:**

WHEN a user receives their first warning, THE system SHALL record the warning and notify the user.

WHEN a user receives a second warning within 30 days, THE system SHALL automatically apply a 24-hour suspension.

WHEN a user receives a third warning within 90 days, THE system SHALL automatically apply a 7-day suspension.

WHEN a user receives a fourth warning within 180 days, THE system SHALL flag the account for administrator review for potential permanent ban.

**Content Removal Cascading:**

WHEN a moderator removes a topic, THE system SHALL retain all replies for audit purposes but hide them from public view.

WHEN a moderator removes a reply with child replies, THE system SHALL replace the content with "[removed by moderator]" to maintain thread structure.

THE system SHALL NOT delete child replies when a parent reply is removed.

### Vote Integrity Rules

**Vote Ownership:**

WHEN a user votes on content, THE system SHALL record the user ID, content ID, vote type, and timestamp.

THE system SHALL allow only one vote (upvote or downvote) per user per content item.

WHEN a user changes their vote from upvote to downvote (or vice versa), THE system SHALL remove the old vote and apply the new vote.

**Vote Removal on Content Deletion:**

WHEN content is permanently deleted, THE system SHALL remove all associated votes from the database.

WHEN content is soft-deleted (hidden), THE system SHALL retain votes for audit purposes.

**Author Self-Voting Prevention:**

THE system SHALL NOT allow users to vote on their own topics or replies.

WHEN a user attempts to vote on their own content, THE system SHALL reject the vote and display a message: "You cannot vote on your own content."

### Category Assignment Rules

**Single Category Requirement:**

WHEN a user creates a topic, THE system SHALL require exactly one category assignment.

THE system SHALL NOT allow topics without a category.

THE system SHALL NOT allow topics with multiple categories.

**Category Change Restrictions:**

WHEN a topic has been created, THE original author SHALL be allowed to change the category within 1 hour.

WHEN 1 hour has passed, THE system SHALL prevent category changes by the original author.

WHERE a user has moderator or administrator role, THE system SHALL allow category changes at any time.

**Category Deletion Protection:**

WHEN an administrator attempts to delete a category that contains topics, THE system SHALL require reassignment of all topics to a different category before allowing deletion.

THE system SHALL NOT allow deletion of the default categories: "Economics" and "Politics".

---

## Cross-Feature Validation

### Topic Creation Dependencies

WHEN a user creates a topic, THE system SHALL validate:
- User has sufficient reputation (0 points minimum)
- User has not exceeded rate limits (5 per hour, 20 per day)
- User account is not suspended or banned
- Topic title meets length and content requirements
- Topic body meets length and content requirements
- Exactly one valid category is assigned
- All tags (if provided) meet validation requirements
- User's account age allows topic creation

IF any validation fails, THEN THE system SHALL reject the topic and provide specific error feedback.

### Reply Posting Dependencies

WHEN a user posts a reply, THE system SHALL validate:
- Parent topic exists and is in "active" state
- User has sufficient reputation (0 points minimum)
- User has not exceeded rate limits (30 per hour, 200 per day)
- User account is not suspended or banned
- Reply content meets length and validation requirements
- Thread depth does not exceed 10 levels
- Parent topic is not locked or archived

IF any validation fails, THEN THE system SHALL reject the reply and provide specific error feedback.

### Voting Dependencies

WHEN a user votes on content, THE system SHALL validate:
- User has sufficient reputation (10 points for upvote, 50 points for downvote)
- User has not exceeded voting rate limits (200 per hour, 1,000 per day)
- Content being voted on exists and is not deleted
- User is not the author of the content
- User has not already voted on this content (or is within 5-minute change window)
- User account is not suspended or banned

IF any validation fails, THEN THE system SHALL reject the vote and provide specific error feedback.

### Moderation Action Dependencies

WHEN a moderator performs a moderation action, THE system SHALL validate:
- User has moderator or administrator role
- Target content or user exists
- Action is appropriate for target (e.g., cannot suspend an administrator)
- Moderator provides a reason for the action (minimum 10 characters)
- Action does not conflict with existing moderation state

IF any validation fails, THEN THE system SHALL reject the action and provide specific error feedback.

### Search Query Dependencies

WHEN a user performs a search, THE system SHALL validate:
- Search query meets length requirements (1-200 characters)
- User has not exceeded search rate limits (60 per minute)
- Search parameters are valid (category exists, date range is logical)

IF any validation fails, THEN THE system SHALL reject the search or apply default parameters.

### Profile Update Dependencies

WHEN a user updates their profile, THE system SHALL validate:
- User is authenticated and updating their own profile (or is an administrator)
- All profile fields meet length and content requirements
- Username is unique if being changed
- Email is valid format and unique if being changed
- URLs in profile fields pass security validation

IF any validation fails, THEN THE system SHALL reject the update and provide specific error feedback.

---

## Error Handling and User Feedback

### Validation Error Messages

THE system SHALL provide clear, actionable error messages for all validation failures.

**Content Length Errors:**

WHEN a topic title is too short, THE system SHALL display: "Topic title must be at least 10 characters. Current length: [X] characters."

WHEN a topic body is too short, THE system SHALL display: "Topic content must be at least 20 characters. Current length: [X] characters."

WHEN content exceeds maximum length, THE system SHALL display: "Content exceeds maximum length of [MAX] characters. Current length: [X] characters."

**Rate Limit Errors:**

WHEN a user exceeds topic creation rate limit, THE system SHALL display: "You have reached the maximum of [X] topics per [hour/day]. Please wait [Y] minutes before creating another topic."

WHEN a user exceeds reply rate limit, THE system SHALL display: "You have reached the maximum of [X] replies per [hour/day]. Please wait [Y] minutes before posting another reply."

WHEN a user exceeds voting rate limit, THE system SHALL display: "You have reached the maximum number of votes per [hour/day]. Please wait before voting again."

**Reputation Errors:**

WHEN a user lacks sufficient reputation, THE system SHALL display: "This action requires [X] reputation points. Your current reputation is [Y] points. Earn more reputation by contributing quality content."

**Permission Errors:**

WHEN a user lacks permission for an action, THE system SHALL display: "You do not have permission to perform this action. Required role: [ROLE]."

**Content Validation Errors:**

WHEN a topic title contains prohibited content, THE system SHALL display: "Topic title contains prohibited content. Please remove [specific issue] and try again."

WHEN content is detected as spam, THE system SHALL display: "Your submission was flagged as potential spam. If you believe this is an error, please contact support."

WHEN duplicate content is detected, THE system SHALL display: "You have already posted this or very similar content recently. Please post unique content."

### User-Friendly Explanations

THE system SHALL provide contextual help for common validation failures:

**For New Users:**

WHEN a new user encounters reputation restrictions, THE system SHALL provide guidance: "As a new member, certain features unlock as you gain reputation. Reputation is earned by posting quality content that receives upvotes from other members."

**For Content Creators:**

WHEN a user's topic is rejected for quality issues, THE system SHALL provide suggestions: "To improve your topic quality, please ensure your title is descriptive, your content is well-formatted, and you've selected the appropriate category."

**For Edit Restrictions:**

WHEN a user attempts to edit content outside the allowed time window, THE system SHALL explain: "Content can be edited within [X hours/days] of creation. Your content was created [Y] ago. If you need to make changes, please contact a moderator."

### Recovery Guidance

THE system SHALL provide actionable next steps when errors occur:

**Rate Limit Recovery:**

WHEN a rate limit is reached, THE system SHALL display: "You've reached the posting limit. You can post again in [X] minutes. In the meantime, you can browse discussions, read content, or update your profile."

**Content Validation Recovery:**

WHEN content fails validation, THE system SHALL preserve the user's input and highlight specific issues: "Your content has been preserved. Please address the following issues: [list of issues]. Then click submit again."

**Permission Recovery:**

WHEN a user lacks permissions, THE system SHALL suggest a path forward: "To unlock this feature, you need [X] reputation points. You can earn reputation by posting topics and replies that receive upvotes from other members."

### Error Logging and Tracking

WHEN validation errors occur, THE system SHALL log the following information for system monitoring:
- User ID and username
- Attempted action
- Validation rule that failed
- Timestamp of failure
- User's current reputation and role

THE system SHALL track validation error patterns to identify:
- Frequently failing validation rules (may indicate unclear requirements)
- Users repeatedly triggering the same errors (may need additional guidance)
- Spike in validation failures (may indicate system issues or abuse attempts)

---

## Conclusion

This document defines the comprehensive business rules and validation requirements that ensure the economic/political discussion board maintains high content quality, prevents abuse, and provides a fair and predictable user experience. All rules are designed to be enforced consistently across the platform while providing clear feedback to users when validations fail.

These business rules work in conjunction with the functional requirements, authentication rules, and moderation policies defined in related documents to create a complete specification for the discussion board platform.

### Implementation Expectations

Developers implementing these rules should:
- Enforce all validations on the server side for security
- Implement client-side validation for immediate user feedback
- Provide clear, actionable error messages as specified
- Log validation failures for monitoring and improvement
- Test edge cases and boundary conditions thoroughly
- Ensure consistent rule enforcement across all platform features

### Rule Maintenance

As the platform evolves, these rules may be updated to:
- Adjust rate limits based on observed usage patterns
- Modify reputation requirements based on community feedback
- Add new validation rules to address emerging abuse patterns
- Refine error messages for clarity based on user feedback

All rule changes should be documented, versioned, and communicated to the development team and platform users.

> *Developer Note: This document defines business requirements only. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*
