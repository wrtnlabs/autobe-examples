# Functional Requirements for Community BBS

This document defines the complete set of functional requirements for the Community BBS system. All requirements are expressed in natural language using the EARS (Easy Approach to Requirements Syntax) format to ensure unambiguous, testable specifications. This document is intended for backend developers who will implement the core business logic of the system. No technical implementation details (APIs, database schemas, or architecture decisions) are specified here — only what the system must do from the user’s perspective.

## Core Features

The Community BBS system enables registered users to participate in a moderated, text-based discussion platform focused on civic engagement, local news, and community dialogue. The platform is designed to foster informed, respectful conversation while preventing spam, abuse, and harassment.

## User-Initiated Actions

### Registration and Account Setup

WHEN a new visitor navigates to the homepage, THE system SHALL display a prominent registration button.
WHEN a user clicks the registration button, THE system SHALL display a form requesting only email address and desired username.
WHEN a user submits a valid email and username, THE system SHALL send a verification email with a one-time link.
WHEN a user clicks the verification link in the email, THE system SHALL activate their account immediately.
WHEN a user attempts to register with an email already in use, THE system SHALL display an error message: "This email is already registered. If you forgot your password, please use the recovery form."
WHEN a user attempts to register with a username already taken, THE system SHALL display an error message: "That username is unavailable. Please choose another."

### Authentication

WHEN a registered user visits the site without an active session, THE system SHALL display a login form with fields for username and password.
WHEN a user submits valid credentials, THE system SHALL authenticate the user and establish a secure session using JWT.
WHEN a user submits invalid credentials, THE system SHALL return HTTP 401 with message: "Invalid username or password."
WHEN a user attempts to log in from a new device, THE system SHALL send a notification to their registered email: "New login detected from [Device/Location]. Click here to review or revoke."
WHEN a user selects "Log out," THE system SHALL immediately terminate their session and clear all session tokens from the client.

### Posting Content

WHEN a citizen is logged in, THE system SHALL allow them to create a new post by clicking the "New Post" button.
WHEN a user creates a new post, THE system SHALL require a title (minimum 5 characters) and body (minimum 10 characters).
WHEN a user submits a post with a title shorter than 5 characters, THE system SHALL display: "Title must be at least 5 characters long."
WHEN a user submits a post with a body shorter than 10 characters, THE system SHALL display: "Your message must be at least 10 characters long."
WHEN a user submits a post with offensive or spam-like content, THE system SHALL hold it for moderator review.
WHEN a post is held for review, THE system SHALL show the user: "Your post is pending review by a moderator. You will be notified when it is approved or rejected."
WHEN a post is approved, THE system SHALL make it visible to all users immediately.
WHEN a post is rejected, THE system SHALL notify the user: "Your post was rejected for violating community guidelines. Please review our rules and try again."
WHEN a user edits their own post, THE system SHALL allow changes only within 24 hours of original posting.
WHEN a user attempts to edit their post after 24 hours, THE system SHALL display: "You can only edit your posts within the first 24 hours after posting."
WHEN a user deletes their own post, THE system SHALL archive it and show a soft-delete notice: "This post has been removed by the author."

### Commenting and Replying

WHEN a citizen is logged in, THE system SHALL allow them to comment on any public post.
WHEN a user posts a comment, THE system SHALL require the comment to be at least 3 characters long.
WHEN a comment is submitted with fewer than 3 characters, THE system SHALL display: "Comments must be at least 3 characters long."
WHEN a user replies to a comment, THE system SHALL nest the reply under the original comment.
WHEN a user clicks "Report" on a comment, THE system SHALL submit an anonymous report to moderators with a reason menu (spam, harassment, off-topic, other).
WHEN a report is submitted, THE system SHALL show: "Thank you for reporting this content. Moderators will review it shortly."

### Following and Notifications

WHEN a user views another user’s profile, THE system SHALL display a "Follow" button if not already following.
WHEN a user clicks "Follow," THE system SHALL add the target user to their following list.
WHEN a user unfollows someone, THE system SHALL remove them from the following list.
WHEN a user they follow posts a new topic or comment, THE system SHALL send a notification to their notifications inbox.
WHEN a user comments on a post where the current user has previously commented, THE system SHALL notify the current user: "[Username] replied to your comment."
WHEN a moderator approves or rejects a post or comment, THE system SHALL notify the author via their notification center.
WHEN a user is banned or temporarily suspended, THE system SHALL notify them via email: "Your account has been suspended due to repeated guideline violations."

### Reporting Content

WHEN a user encounters any content they believe violates community rules, THE system SHALL provide a "Report" button visible on all posts and comments.
WHEN a user reports content, THE system SHALL display a modal with predefined reason categories: "Spam", "Harassment", "Hate Speech", "Off-topic", "Other".
WHEN a user selects "Other", THE system SHALL prompt for a brief explanation (minimum 10 characters).
WHEN a report is submitted, THE system SHALL log the report and assign it to the moderation queue.
WHEN a report is processed by a moderator, THE system SHALL update the report status and send a summary to the reporter: "Your report has been reviewed. Action taken: [Approved] [Rejected] [Removed]."

### Account Management

WHEN a user clicks "Profile," THE system SHALL display their public profile: username, join date, number of posts, number of comments, and follow count.
WHEN a user clicks "Edit Profile," THE system SHALL allow changes to display name, bio (max 500 characters), and profile picture (optional uploaded image).
WHEN a user changes their password, THE system SHALL require current password verification and confirmation of new password.
WHEN a user sets a password that does not match confirmation, THE system SHALL display: "New passwords do not match."
WHEN a user requests a password reset, THE system SHALL email a time-limited reset link valid for 1 hour.
WHEN a user clicks a reset link after 1 hour, THE system SHALL display: "This password reset link has expired. Request a new one."
WHEN a user enables two-factor authentication (2FA), THE system SHALL require them to scan a QR code and confirm with a verification code.
WHEN a user disables 2FA, THE system SHALL require re-authentication and confirmation.

## System Automatic Behaviors

### Content Visibility

WHILE a post is under moderation, THE system SHALL hide it from all public feeds, search results, and user timelines.
WHILE a user is temporarily suspended, THE system SHALL prevent them from posting, commenting, or messaging.
WHILE a user is permanently banned, THE system SHALL hide all their past content from public view and prevent account recovery.
WHEN a user reports a post or comment and it is accepted for removal, THE system SHALL automatically hide it from public view until moderator action is confirmed.
WHEN a post receives 5 or more reports in 24 hours, THE system SHALL automatically elevate it to high-priority moderation queue.
WHEN a user's comment receives 3 or more reports, THE system SHALL auto-hide it and notify the user.
WHEN a moderator approves a posted content, THE system SHALL make it immediately visible to all users.
WHEN a moderator deletes a post or comment, THE system SHALL archive it in a secure audit log and notify the author.
WHEN a user’s reputation score falls below 20 for 7 consecutive days, THE system SHALL temporarily restrict their posting to 1 post per day.
WHEN a user’s reputation score exceeds 90 for 30 days, THE system SHALL automatically notify them: "You’ve earned Trusted Contributor status. Your posts will now bypass initial moderation."

### Reputation Model

WHEN a user's post is upvoted by another user, THE system SHALL increase their reputation by 5 points.
WHEN a user's comment is upvoted, THE system SHALL increase their reputation by 2 points.
WHEN a user’s post is downvoted, THE system SHALL decrease their reputation by 2 points.
WHEN a user’s comment is downvoted, THE system SHALL decrease their reputation by 1 point.
WHEN a user reports content successfully (content is removed), THE system SHALL increase their reputation by 3 points.
WHEN a user posts content that is rejected by a moderator, THE system SHALL decrease their reputation by 10 points.
WHEN a user is found to have submitted fake or bot-created reports, THE system SHALL decrease their reputation by 20 points and flag their account.
WHEN a user’s reputation drops below 0, THE system SHALL restrict access to reporting and posting until it recovers above 10.
WHEN a user’s reputation reaches 100, THE system SHALL unlock "Trusted Contributor" status, enabling posts to bypass initial moderation.

### Spam and Abuse Detection

WHEN a user attempts to post identical text across multiple posts or comments within 5 minutes, THE system SHALL flag it as spam.
WHEN a user posts the same content in more than 3 threads within 24 hours, THE system SHALL issue a warning and temporarily reduce posting privileges.
WHEN a user’s posts or comments contain 5 or more links in 24 hours, THE system SHALL auto-reject them and require moderator approval.
WHEN a user’s account generates 10 or more reports in 7 days, THE system SHALL automatically suspend their account for 48 hours.
WHEN a user’s profile is flagged for impersonation, THE system SHALL prompt moderators to verify identity via email.
WHEN a user’s IP address is used to register 5 or more accounts within 24 hours, THE system SHALL block further registrations from that IP.

### Notification Triggers

WHEN a new follower is added to a user’s profile, THE system SHALL send a notification: "[Username] is now following you."
WHEN a user is mentioned in a post or comment with @username, THE system SHALL send a notification to that user.
WHEN a post receives a comment, THE system SHALL notify all prior commenters on that thread.
WHEN a moderator replies to a user’s report, THE system SHALL notify the reporter.
WHEN a user’s content is approved or rejected by a moderator, THE system SHALL notify the author.
WHEN a user’s access is restricted, suspended, or banned, THE system SHALL send an email and in-app notification.
WHEN a system-wide alert or update occurs, THE system SHALL notify all users via banner and email.

### Legal Compliance

WHEN a user requests deletion of their account, THE system SHALL permanently delete all personally identifiable data within 30 days.
WHEN a user requests a copy of their data, THE system SHALL deliver a structured JSON export including posts, comments, and profile information within 48 hours.
WHEN a request is made to remove content containing illegal material (per jurisdiction), THE system SHALL immediately hide it and notify an admin.
WHEN a government subpoena is received, THE system SHALL flag the account for compliance review and restrict data export.

## Content Lifecycle Management

### Creation → Approval → Publication

WHEN a new post is submitted, THE system SHALL queue it for moderation if it contains keywords associated with spam or sensitive topics.
WHEN a post is approved, THE system SHALL timestamp it and assign a unique ID.
WHEN a post is published, THE system SHALL add it to the public feed, timeline, and category indexes.
WHEN a post is removed by a moderator, THE system SHALL archive it in an audit log with reason and moderator ID.
WHEN a post is deleted by the author, THE system SHALL anonymize it and display: "[Deleted by author]" with a timestamp.

### Editing and Versioning

WHERE a user edits their own post within 24 hours, THE system SHALL save the previous version in a draft history.
WHEN the user edits the post, THE system SHALL display "Updated" label and link to previous versions.
WHEN a user views old versions, THE system SHALL show the edited text side-by-side with the original.
WHEN a post is edited after 24 hours, THE system SHALL prevent change and show an error.
WHEN a moderator edits a post, THE system SHALL override the 24-hour limit and flag the edit with "[Moderator edited]".

### Archival

WHEN a post is older than 5 years, THE system SHALL move it to an archived storage tier.
WHEN a post is archived, THE system SHALL remove it from search results and feed lists.
WHEN a user searches for an archived post, THE system SHALL display: "This post is archived and no longer actively displayed."
WHEN an admin requests access to archived content, THE system SHALL allow retrieval with audit log entry.

## Validation Rules

### Input Validation

WHEN a user submits a username, THE system SHALL validate it contains only alphanumeric characters and underscores.
WHEN a username contains illegal characters (e.g., @, #, spaces), THE system SHALL reject it and display: "Usernames may only include letters, numbers, and underscores."
WHEN a user submits an email, THE system SHALL enforce standard email format: local@domain.tld.
WHEN an email format is invalid, THE system SHALL display: "Please enter a valid email address."
WHEN a user uploads a profile image, THE system SHALL accept only PNG, JPG, or JPEG formats.
WHEN a user uploads a file larger than 5 MB, THE system SHALL reject it with: "Image must be 5 MB or smaller."
WHEN a user submits a comment or post, THE system SHALL limit content to 10,000 characters.
WHEN a user exceeds the 10,000-character limit, THE system SHALL truncate at 9,999 characters and display: "Content truncated to 10,000 characters."
WHEN a user submits a post title, THE system SHALL require at least 5 characters.
WHEN a user submits a comment, THE system SHALL require at least 3 characters.
WHEN a user submits a custom report reason, THE system SHALL require at least 10 characters.

### Rate Limiting

WHILE a user is unauthenticated, THE system SHALL limit post creation to 1 per hour.
WHILE a user is unauthenticated, THE system SHALL limit comment submission to 3 per hour.
WHILE a user is authenticated, THE system SHALL limit post creation to 5 per hour.
WHILE a user is authenticated, THE system SHALL limit comment submission to 10 per hour.
WHILE a user is under 5-day-old account, THE system SHALL limit posting to 2 per day.
WHILE a user has a reputation below 20, THE system SHALL limit posting to 1 per day.
WHEN a user exceeds rate limits, THE system SHALL display: "You've exceeded your posting limit. Please wait before trying again."

## Success Criteria

The system is successful when:

- All registered citizens can create, edit, comment, and follow within 1 minute of registration.
- 95% of user-initiated actions respond in under 1 second on mobile and desktop devices.
- 99% of spam or abusive content is flagged and resolved within 12 hours by moderators.
- 100% of user deletion requests are honored within 30 days as required by law.
- 100% of notifications are delivered with at least 95% success rate and retry capability.
- No user account is accidentally granted moderator or admin privileges by the system.
- All moderation actions are logged, auditable, and tied to admin/moderator IDs.
- No user data is exposed to external systems without explicit consent.
- Every error message provided to users is clear, non-technical, and actionable.
- The system does not silently fail — users always receive feedback for every action.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.