## Content Creation Rules

### Post Submission Requirements
- WHEN a member attempts to submit a new post, THE system SHALL require the post to contain at least 10 characters of text content.
- WHEN a member submits a post with content containing only URLs, emojis, or symbols without meaningful text, THE system SHALL reject the submission and display the message: "Your post must include clear, substantive text about an economic or political topic."
- WHEN a member submits a post, THE system SHALL automatically assign it a "pending" status and hide it from public view until approved by an admin.
- WHILE a post is in "pending" status, THE system SHALL NOT display it to guests or members, but SHALL retain it in the moderation queue for admin review.
- WHEN a post is submitted, THE system SHALL automatically attach the current system timestamp in ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ).

### Topic Assignment Rules
- WHERE a post is submitted without a specified topic, THE system SHALL assign the default topic "General Discussion".
- THE system SHALL support exactly seven predefined topic categories: "Inflation", "Tax Policy", "Elections", "Global Trade", "Monetary Policy", "Labor Markets", "Fiscal Policy".
- WHEN a member attempts to create a custom topic not listed in the seven predefined options, THE system SHALL reject the custom topic and automatically assign "General Discussion".
- THE system SHALL allow topic selection via a dropdown menu with clear, human-readable labels matching the exact predefined topic names above.
- WHERE a topic is manually typed by the member, THE system SHALL perform exact-case-sensitive matching against the seven predefined topics and reject any misspelled or incorrectly capitalized variants.

## Post Moderation Rules

### Mandatory Approval Workflow
- WHEN a member submits any post, THE system SHALL require immediate review by an admin before the post becomes publicly visible.
- WHILe a post is in "pending" status, THE system SHALL display a visual badge to admins labeled: "Awaiting Approval".
- WHEN an admin approves a pending post, THE system SHALL change its status to "published" and make it visible to all users, including guests.
- WHEN an admin rejects a pending post, THE system SHALL change its status to "rejected" and display a system-generated message to the submitting member: "Your post was not published because it did not meet the community guidelines. Topics must be substantive, civil, and focused on economic or political analysis."
- WHEN a post is rejected, THE system SHALL preserve the original content and submission timestamp for audit purposes, but SHALL NOT display it to any user.

### Inappropriate Content Criteria
- IF a post contains direct threats of violence, explicit hate speech, or targeted harassment, THEN THE system SHALL flag it for immediate admin deletion and SHALL notify the submitting member: "Your post contained prohibited content and has been removed. Further violations may result in account suspension."
- IF a post is entirely incoherent, gibberish, or spam (e.g., repeated identical phrases), THEN THE system SHALL reject it as inappropriate.
- IF a post promotes illegal activity, fraud, or scam schemes, THEN THE system SHALL instruct the admin to reject and delete it immediately.

## Edit and Deletion Rules

### Member Post Editing
- WHEN a member attempts to edit their own post, THE system SHALL permit editing only if the post was submitted within the last 24 hours (86,400 seconds) from the original submission timestamp.
- WHEN a member edits a post within the allowed 24-hour window, THE system SHALL update the content and retain the original submission timestamp, but SHALL append a visible edit marker: "[Edited]".
- WHILE a post is in "pending" status, THE member SHALL be permitted to edit their submission even after the 24-hour window expires, until the post is approved or rejected by an admin.
- WHEN a post has been published for more than 24 hours, THE system SHALL disable editing and show the message: "This post cannot be edited as it has been published for more than 24 hours."

### Member Post Deletion
- WHEN a member attempts to delete their own post, THE system SHALL permit deletion only if the post is in "pending" status.
- WHEN a member attempts to delete a published post, THE system SHALL deny the request and display: "You cannot delete a post after it has been published."
- WHEN a member attempts to delete their own draft in "pending" status, THE system SHALL permanently remove the content from the system and notify the member: "Your post has been deleted."

### Admin Content Removal
- WHEN an admin deletes any post (published or pending), THE system SHALL immediately and permanently remove the post from the system, including all metadata and content.
- WHEN an admin deletes a post, THE system SHALL log the admin identifier, timestamp of deletion, and reason (if provided), but SHALL NOT notify the original member about the deletion.
- WHILE a post has been deleted by an admin, THE system SHALL return a generic message to any user attempting to view it: "This post has been removed by a moderator."
- IF a post has been deleted by an admin, THE system SHALL NOT permit recovery or restoration of the content under any circumstances.

## Topic Management Rules

### Topic Library Maintenance
- WHEN an admin attempts to create, rename, or delete a topic category, THE system SHALL permit these actions only for predefined categories listed in the system.
- THE system SHALL NOT permit creation of new external topic categories by any user.
- ELSEWHERE in the system, ALL topic-based filtering, navigation, and categorization SHALL refer exclusively to the seven predefined topics listed above.
- WHEN an admin tries to rename a predefined topic, THE system SHALL require the new name to be grammatically clean and exactly match the format of the original topics (capitalized, no special characters).
- WHEN an admin tries to delete a topic that is associated with one or more published posts, THE system SHALL prevent deletion and display: "This topic is in use by published content and cannot be deleted."
- WHEN the last post using a topic is deleted or rejected, THE system SHALL allow the admin to delete that topic if desired.

## Authentication Rules

### Member Session Handling
- WHEN a member visits the board, THE system SHALL store their authentication state in a single persistent JSON Web Token (JWT) with an expiration of 30 days.
- WHERE a member's session has expired, THE system SHALL require re-login without destroying the member's history of previously submitted posts.
- WHEN a member logs out, THE system SHALL delete the active JWT from client storage on the device.
- WHEN a token is invalidated by an admin, THE system SHALL immediately prevent future access by the associated user.
- WHEN authentication fails due to invalid credentials, THE system SHALL return an error message: "Invalid email or password. Please try again or reset your password."

## Data Retention Policy

### Post and User Data Storage
- THE system SHALL retain all submitted posts indefinitely, regardless of approval status (published, pending, or rejected).
- THE system SHALL retain all modifiable metadata (original timestamps, edit history, moderation notes) for all posts permanently.
- WHERE a post has been deleted by an admin, THE system SHALL remove all public accessibility of the content, but SHALL preserve metadata in an encrypted audit log for legal compliance purposes, including: original author hash (derived from IP address and timestamp), submission time, rejection/approval timestamp, and admin ID.
- WHEN a member account is deactivated, THE system SHALL anonymize all associated posts by replacing the visible author field with: "Anonymous Member" while preserving the underlying data for moderation records.
- THE system SHALL NOT automatically purge or archive any content based on age, activity, or usage patterns.
- WHERE users interact with the platform anonymously using guest access, THE system SHALL assign a system-generated anonymous identifier for session persistence, but SHALL NOT store any personally identifiable information (PII) such as IP addresses, device fingerprints, or cookies beyond the JWT token.