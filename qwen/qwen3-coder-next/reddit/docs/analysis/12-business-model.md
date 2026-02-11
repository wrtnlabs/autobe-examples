# Requirements Specification Document: Reddit-like Community Platform

## Document Overview

This requirements specification document provides comprehensive business requirements for the Reddit-like community platform. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team as per project standards. This document focuses on **business requirements only** in natural language, following EARS format where applicable.

---

## 1. Authentication and User Account Management

### 1.1 User Registration

WHEN a user registers with email and password, THE system SHALL create a new account with the provided email, a unique username (user-selected), and an initial karma score of zero. The system SHALL mark the account as unverified until email verification is completed.

WHEN email verification is required, THE system SHALL send a verification token to the user's email address and mark the account as pending until verification is completed.

WHERE a user attempts to register with an existing email, THEN THE system SHALL return an appropriate error message.

WHERE a user attempts to register with an existing username, THEN THE system SHALL return an appropriate error message.

### 1.2 User Login

WHEN a user logs in with email and password, THE system SHALL validate credentials and create a new session if authentication succeeds.

WHERE login fails due to invalid credentials, THEN THE system SHALL return appropriate error message.

WHERE login fails due to unverified email, THEN THE system SHALL return appropriate error message.

### 1.3 Password Management

WHEN a user changes their password, THE system SHALL require current password verification and update with new password.

WHEN a user requests password reset, THE system SHALL send a reset token to their email address.

WHERE a user attempts to use an expired reset token, THEN THE system SHALL return appropriate error message.

### 1.4 Account Deletion

WHEN a user deletes their account, THE system SHALL perform cascading deletion of all their posts and comments, and deactivate their account.

WHERE account deletion is requested, THE system SHALL require user confirmation and verify account ownership.

---

## 2. User Profile Management

### 2.1 Profile Information

EACH user profile SHALL contain: display name, bio text, and avatar image.

WHERE a user creates their profile, THEN THE system SHALL allow them to set display name, bio, and upload avatar.

WHERE a user views another user's profile, THEN THE system SHALL show their display name, bio, avatar, total karma score, posts they have created, and comments they have written.

### 2.2 Profile Editing

WHEN a user edits their profile, THE system SHALL allow modification of display name, bio, and avatar.

WHERE a user updates their profile, THEN THE system SHALL validate uniqueness of display name and image file format.

WHERE a user attempts to edit another user's profile, THEN THE system SHALL deny the request with appropriate error message.

---

## 3. Karma System

### 3.1 Karma Calculation

EACH user SHALL have a single karma score calculated as sum of all post karma plus sum of all comment karma.

POST karma equals: (upvotes received on posts) minus (downvotes received on posts).

COMMENT karma equals: (upvotes received on comments) minus (downvotes received on comments).

WHERE a user's karma is adjusted, THEN THE system SHALL update the karma score in real-time.

### 3.2 Karma Display

WHEN displaying karma, THE system SHALL show total karma score on user profile and next to user's posts and comments.

WHERE a user's karma is negative, THEN THE system SHALL display it clearly with negative sign.

WHERE a user's karma is zero, THEN THE system SHALL display it as zero.

WHERE a user's karma is positive, THEN THE system SHALL display it with positive sign or no sign.

### 3.3 Karma Adjustment Scenarios

WHEN a user's post receives an upvote, THEN THE system SHALL increase the post author's karma by 1.

WHEN a user's post receives a downvote, THEN THE system SHALL decrease the post author's karma by 1.

WHEN a user removes their upvote from a post, THEN THE system SHALL decrease the post author's karma by 1.

WHEN a user removes their downvote from a post, THEN THE system SHALL increase the post author's karma by 1.

WHEN a user changes their vote from upvote to downvote on a post, THEN THE system SHALL decrease the post author's karma by 2.

WHEN a user changes their vote from downvote to upvote on a post, THEN THE system SHALL increase the post author's karma by 2.

THE same karma adjustment logic applies to comments.

---

## 4. Community Management

### 4.1 Community Creation

WHEN a user creates a community, THE system SHALL accept unique community name, description text, and icon image.

WHERE a user creates a community, THEN THE system SHALL set them as community owner.

WHERE a user creates a community, THEN THE system SHALL initialize subscriber count to one (creator's subscription).

WHERE a community name already exists, THEN THE system SHALL return appropriate error message.

WHERE a user attempts to create a community without authentication, THEN THE system SHALL require login first.

### 4.2 Community Listing

WHEN browsing all communities, THE system SHALL display community name, description, subscriber count, and icon.

WHERE communities are listed, THEN THE system SHALL support pagination and search functionality.

WHERE a user searches for communities, THEN THE system SHALL return matching communities by name.

### 4.3 Community Subscription

WHEN a user subscribes to a community, THE system SHALL add community to user's subscription list and increment subscriber count.

WHERE a user subscribes to a community, THEN THE system SHALL allow them to create posts in that community.

WHERE a user attempts to subscribe to a community they are already subscribed to, THEN THE system SHALL ignore the request.

WHERE a user unsubscribes from a community, THEN THE system SHALL remove community from user's subscription list and decrement subscriber count.

WHERE a user unsubscribes from a community, THEN THE system SHALL prevent new post creation in that community.

### 4.4 Community Profile

WHEN viewing a community profile, THE system SHALL display community name, description, icon, subscriber count, owner, moderators, banned users list, creation date, and statistics.

WHERE a user views their own community profile, THEN THE system SHALL show subscription status and subscribe/unsubscribe button.

WHERE a user views a community they are banned from, THEN THE system SHALL indicate their banned status.

---

## 5. Post Management

### 5.1 Post Creation

WHEN a user creates a post, THE system SHALL require a title (required) and one of three content types.

WHEN creating a text post, THE system SHALL require text content field.

WHEN creating a link post, THE system SHALL require URL field with valid HTTP/HTTPS format.

WHEN creating an image post, THE system SHALL require uploaded image file.

WHERE a user creates a post, THEN THE system SHALL require them to be subscribed to the community.

WHERE a user creates a post, THEN THE system SHALL set initial vote score to zero and comment count to zero.

### 5.2 Post Editing

WHEN a user edits their own post, THE system SHALL allow modification of title and content fields.

WHERE a user attempts to edit another user's post, THEN THE system SHALL deny the request with appropriate error message.

WHERE a post is edited, THEN THE system SHALL update "last edited" timestamp.

### 5.3 Post Deletion

WHEN a user deletes their own post, THE system SHALL soft-delete the post (mark as deleted, preserve data).

WHERE a post is deleted, THEN THE system SHALL clear content fields to remove sensitive information.

WHERE a post is deleted, THEN THE system SHALL maintain post metadata for comment thread integrity.

WHERE a moderator deletes a post, THEN THE system SHALL record moderator metadata and deletion reason.

### 5.4 Post Display Information

WHEN viewing a single post, THE system SHALL display: title, full content, author, community, vote score, comment count, and posting time.

WHEN displaying post in feed, THE system SHALL show: title, author username, community name, vote score, comment count, time since posting, and content preview.

WHERE a text post is displayed in feed, THEN THE system SHALL show first 200 characters of content.

WHERE an image post is displayed in feed, THEN THE system SHALL show thumbnail image.

WHERE a link post is displayed in feed, THEN THE system SHALL show domain name of the URL.

---

## 6. Post Voting System

### 6.1 Voting Actions

WHEN a user upvotes a post, THE system SHALL add 1 to post's vote score.

WHEN a user downvotes a post, THE system SHALL subtract 1 from post's vote score.

WHERE a user votes on a post, THEN THE system SHALL allow them to change their vote from upvote to downvote or vice versa.

WHERE a user votes on a post, THEN THE system SHALL allow them to remove their vote entirely.

WHERE a user has already voted on a post, THEN THE system SHALL update their existing vote rather than creating duplicate.

### 6.2 Vote Restrictions

WHERE a user attempts to vote on their own post, THEN THE system SHALL deny the vote request with appropriate error message.

WHERE a non-authenticated user attempts to vote, THEN THE system SHALL require authentication first.

WHERE a user attempts to vote on a deleted post, THEN THE system SHALL deny the vote request.

### 6.3 Vote Score Calculation

THE post vote score SHALL equal total upvotes minus total downvotes.

WHERE a post receives no votes, THEN THE system SHALL display vote score as zero.

WHERE a post has more downvotes than upvotes, THEN THE system SHALL allow negative vote score.

### 6.4 Vote History

WHERE a user views their own profile, THEN THE system SHALL provide option to view their voting history.

WHERE a moderator reviews reported content, THEN THE system SHALL provide vote history for investigation purposes.

---

## 7. Content Feeds and Sorting

### 7.1 Home Feed

WHEN a logged-in user accesses their home feed, THE system SHALL display posts only from communities they are subscribed to.

WHERE a non-authenticated user attempts to access home feed, THEN THE system SHALL redirect them to login page.

WHERE a user subscribes to new communities, THEN THE system SHALL update home feed to include posts from new communities.

### 7.2 Popular Feed

WHEN any user accesses popular feed, THE system SHALL display posts from all communities across the platform.

WHERE popular feed is accessed by non-authenticated user, THEN THE system SHALL allow full viewing capability.

WHERE popular feed contains posts, THEN THE system SHALL sort them by selected algorithm.

### 7.3 Community Feed

WHEN any user accesses community feed, THE system SHALL display posts from one specific community.

WHERE community feed is accessed, THEN THE system SHALL show community name and description in header.

WHERE community feed is accessed, THEN THE system SHALL indicate current user's subscription status.

### 7.4 Sorting Algorithms

**Hot Sorting**

WHEN hot sorting is applied, THE system SHALL prioritize recent posts with many upvotes.

WHEN comparing posts, THEN THE system SHALL consider both vote count and recency.

**New Sorting**

WHEN new sorting is applied, THE system SHALL show most recently created posts first.

WHERE posts have identical timestamps, THEN THE system SHALL use post ID as secondary sort criterion.

**Top Sorting**

WHEN top sorting is applied, THE system SHALL show highest vote score posts first.

WHERE time filter is applied, THEN THE system SHALL restrict results to specified timeframe.

**Controversial Sorting**

WHEN controversial sorting is applied, THE system SHALL prioritize posts with many votes but scores close to zero.

WHERE controversial sorting is applied, THEN THE system SHALL calculate controversy ratio of upvotes to downvotes.

### 7.5 Pagination

WHEN any feed is accessed, THE system SHALL implement pagination with 20 posts per page.

WHERE a user loads subsequent pages, THEN THE system SHALL use cursor-based pagination for consistency.

WHERE no more posts are available, THEN THE system SHALL indicate end of feed.

---

## 8. Comment Management

### 8.1 Comment Creation

WHEN a user writes a comment on a post, THE system SHALL accept comment content and parent reference.

WHERE a comment is created, THEN THE system SHALL link it to the appropriate post.

WHERE a comment is created, THEN THE system SHALL initialize score to zero.

WHERE a comment exceeds length limit, THEN THE system SHALL reject submission with appropriate error.

### 8.2 Comment Threading

THE system SHALL support unlimited comment thread depth for replies.

WHILE a comment system operates, THEN THE system SHALL maintain parent-child relationships between comments.

WHERE a comment has replies, THEN THE system SHALL display them as nested threads.

### 8.3 Comment Editing

WHEN a user edits their own comment, THE system SHALL allow content modification and update timestamp.

WHERE a user attempts to edit another user's comment, THEN THE system SHALL deny the request.

WHERE a comment is edited, THEN THE system SHALL mark it with edited indicator.

### 8.4 Comment Deletion

WHEN a user deletes their own comment, THE system SHALL soft-delete the comment and update karma scores.

WHERE a moderator deletes a comment, THEN THE system SHALL record moderator metadata and deletion reason.

WHERE a comment is deleted, THEN THE system SHALL maintain thread structure integrity.

### 8.5 Comment Sorting

**Best Sort**

WHEN best sort is applied, THE system SHALL order comments by vote score with recency consideration.

**New Sort**

WHEN new sort is applied, THE system SHALL order comments by creation timestamp, newest first.

**Controversial Sort**

WHEN controversial sort is applied, THE system SHALL prioritize comments with many votes but scores near zero.

---

## 9. Community Moderation

### 9.1 Moderator Roles

THE community creator SHALL be the owner (highest authority).

WHERE the owner adds a moderator, THEN THE system SHALL grant them moderation permissions.

WHERE the owner removes a moderator, THEN THE system SHALL revoke their moderation permissions.

WHERE a moderator attempts to remove the owner, THEN THE system SHALL deny the request.

WHERE a moderator attempts to remove another moderator, THEN THE system SHALL deny the request.

### 9.2 Moderator Actions

**Content Moderation**

WHERE a moderator deletes a post, THEN THE system SHALL remove it from community view.

WHERE a moderator deletes a comment, THEN THE system SHALL remove it from thread view.

**User Management**

WHERE a moderator bans a user, THEN THE system SHALL prevent them from creating posts and comments.

WHERE a moderator unbans a user, THEN THE system SHALL restore their participation rights.

WHERE a moderator views banned users, THEN THE system SHALL display list of banned users.

**Ban Enforcement**

WHERE a banned user attempts to post, THEN THE system SHALL deny the post creation request.

WHERE a banned user attempts to comment, THEN THE system SHALL deny the comment creation request.

WHERE a banned user views community, THEN THE system SHALL allow content viewing but prevent interaction.

---

## 10. Reporting System

### 10.1 Reporting Process

WHEN a user reports content, THE system SHALL require a reason (text) for the report.

WHERE a user reports a post, THEN THE system SHALL store post details, reporter information, and reason.

WHERE a user reports a comment, THEN THE system SHALL store comment details, reporter information, and reason.

WHERE a user reports content they authored, THEN THE system SHALL deny the report request.

### 10.2 Report Review

WHEN a moderator views reports, THE system SHALL display reported content, reporter information, and reason.

WHERE a moderator approves a report, THEN THE system SHALL delete the reported content.

WHERE a moderator dismisses a report, THEN THE system SHALL keep the reported content.

WHERE a report is dismissed, THEN THE system SHALL remove it from active report list.

### 10.3 Report Resolution

WHERE a report is approved, THEN THE system SHALL notify the content author of deletion.

WHERE a report is dismissed, THEN THE system SHALL indicate content remains after review.

WHERE content is restored after appeal, THEN THE system SHALL update all related reports.

---

## 11. Business Logic and Workflows

### 11.1 User Registration Workflow

1. User submits registration form with email, password, and username
2. System validates uniqueness of email and username
3. System creates account with unverified status
4. System sends verification email with token
5. User clicks verification link
6. System marks email as verified and activates account

### 11.2 Post Creation Workflow

1. User navigates to community they are subscribed to
2. User clicks "Create Post" button
3. User selects post type (text, link, or image)
4. User fills in required fields
5. System validates input data
6. System creates post with zero initial scores
7. System updates karma for author

### 11.3 Comment Reply Workflow

1. User views post with comments
2. User clicks "Reply" on desired comment or post
3. User types comment content
4. System validates comment length
5. System creates comment linked to parent
6. System updates karma for author

### 11.4 Voting Workflow

1. User views post or comment
2. User clicks upvote or downvote button
3. System validates user hasn't already voted on content
4. System records vote and updates score
5. System updates karma for content author

### 11.5 Community Subscription Workflow

1. User views community profile
2. User clicks "Subscribe" button
3. System validates user is not already subscribed
4. System adds user to subscribers and increments count
5. System updates UI to show "Unsubscribe" button

---

## 12. Non-Functional Requirements

### 12.1 Performance Requirements

WHILE loading feeds, THE system SHALL complete initial page load within 3 seconds.

WHILE loading post details, THE system SHALL complete within 2 seconds.

WHILE submitting posts or comments, THE system SHALL complete within 2 seconds.

WHERE feeds contain many posts, THEN THE system SHALL support pagination without degradation.

### 12.2 Security Requirements

WHERE user credentials are stored, THEN THE system SHALL use bcrypt hashing with cost factor 12.

WHERE authentication tokens are used, THEN THE system SHALL implement JWT tokens with RS256 algorithm.

WHERE user data is transmitted, THEN THE system SHALL use TLS 1.3 encryption.

WHERE sensitive operations occur, THEN THE system SHALL implement appropriate rate limiting.

### 12.3 Usability Requirements

WHERE content is displayed, THEN THE system SHALL show relative time (e.g., "3 hours ago").

WHERE vote scores are displayed, THEN THE system SHALL format large numbers (e.g., "1.2k").

WHERE errors occur, THEN THE system SHALL provide clear, user-friendly error messages.

---

## Document Metadata

- **Document Type**: Requirements Specification
- **Target Audience**: Development Team
- **Document Status**: Production-Ready
- **Last Updated**: Current Date

---

> *Note: This document defines business requirements only. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*
