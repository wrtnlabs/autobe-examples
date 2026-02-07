# Requirements Specification Document

## Introduction and Service Overview

### Service Description

The Reddit-like community platform is a social networking application that enables users to create and participate in communities around shared interests. The platform supports content sharing through text posts, link posts, and image posts, along with voting, commenting, and community moderation capabilities.

WHEN a visitor accesses the platform, THE system SHALL provide access to public content including the popular feed and community browsing. WHERE a user creates an account, THE system SHALL enable full participation including content creation, voting, and community subscription.

### Core Features

The platform provides the following core capabilities:

- **User Management**: Registration, authentication, profile customization, and account deletion
- **Community System**: Creation, subscription, search, and management of communities
- **Content System**: Creation, editing, and deletion of posts and comments
- **Voting System**: Upvote, downvote, and vote removal for posts and comments
- **Karma System**: User reputation calculation based on content quality and community engagement
- **Feed System**: Personalized content delivery through home, popular, and community feeds
- **Moderation System**: Community management with moderator roles and user banning
- **Reporting System**: Content reporting and moderator review workflow

## User Account Management

### User Registration

WHEN a visitor accesses the registration page, THE system SHALL present a registration form requiring email address, password, and username. THE system SHALL validate that the email address is in valid format, password meets minimum security requirements (minimum 8 characters), and username is unique and follows platform naming rules (alphanumeric with underscores, 3-20 characters).

WHEN a user submits valid registration data, THE system SHALL create a new user account with initial karma score of zero and default profile settings. THE system SHALL send a verification email containing a unique verification link with expiration time of 24 hours.

IF registration data fails validation, THEN THE system SHALL display specific error messages for each failed validation rule. WHERE a user attempts to register with an email already in use, THEN THE system SHALL return HTTP 409 with error code "REGISTRATION_EMAIL_ALREADY_EXISTS".

### User Login

WHEN a user submits login credentials, THE system SHALL verify the email address exists and the password matches the stored hash using secure comparison functions. WHILE credential verification is processing, THE system SHALL display appropriate loading state and prevent multiple simultaneous login requests.

WHEN login credentials are valid, THE system SHALL generate access and refresh JWT tokens. Access tokens SHALL expire after 30 minutes. Refresh tokens SHALL expire after 30 days and must be rotated on each use.

IF login credentials are invalid, THEN THE system SHALL return HTTP 401 with error code "AUTH_INVALID_CREDENTIALS". WHERE an account is banned or deleted, THEN THE system SHALL return HTTP 403 with error code "AUTH_ACCOUNT_DISABLED".

### Account Deletion

WHEN a user initiates account deletion, THE system SHALL permanently remove the user account and all associated data. THE system SHALL delete all posts, comments, votes, and subscriptions created by the user. WHILE account deletion is processing, THE system SHALL display appropriate status and prevent concurrent deletion requests.

WHERE user data deletion is requested, THEN THE system SHALL perform hard deletion of all user data within 30 days as required by data protection regulations.

### Password Management

WHEN a user changes their password, THE system SHALL validate the new password meets security requirements and confirm the change. THE system SHALL invalidate all active sessions and require re-authentication on all devices.

IF password change fails validation, THEN THE system SHALL return HTTP 400 with error code "PASSWORD_INVALID". WHERE password validation fails, THEN THE system SHALL return HTTP 400 with specific error details for each failed validation rule.

## User Profile Management

### Profile Information

Each user profile contains the following information:

- **Display Name**: User's chosen public name (alphanumeric with spaces, 3-50 characters)
- **Bio**: Short biographical text (maximum 1000 characters)
- **Avatar**: Profile image uploaded by the user

WHEN a user creates their profile, THE system SHALL store the display name, bio, and avatar reference. WHERE a user updates profile information, THE system SHALL validate all fields and update the stored values.

### Profile Viewing

WHEN a user views any profile, THE system SHALL display the display name, bio, avatar, total karma score, list of posts created, and list of comments written. THE system SHALL show content in reverse chronological order (most recent first).

WHERE a user views their own profile, THE system SHALL include additional administrative options including profile edit and account deletion. WHERE a user views another user's profile, THE system SHALL provide options to report or block that user.

### Profile Editing

WHEN a user edits their profile, THE system SHALL validate all updated fields according to platform rules. THE system SHALL update the display name, bio, and avatar reference as provided.

IF profile editing fails validation, THEN THE system SHALL return HTTP 400 with error code "PROFILE_INVALID_DATA" and specific error details for each failed validation rule. WHERE a user attempts to change their display name to one already in use, THEN THE system SHALL return HTTP 409 with error code "PROFILE_NAME_ALREADY_EXISTS".

## Karma System

### Karma Calculation

Every user has a single karma score calculated as the sum of all vote scores received on their content.

WHEN a user's post receives an upvote, THE system SHALL increase the user's karma score by 1. WHERE a user's post receives a downvote, THE system SHALL decrease the user's karma score by 1. IF a user's post vote is removed, THE system SHALL adjust the karma score by removing the previous vote's impact.

WHEN a user's comment receives an upvote, THE system SHALL increase the user's karma score by 1. WHERE a user's comment receives a downvote, THE system SHALL decrease the user's karma score by 1. IF a user's comment vote is removed, THE system SHALL adjust the karma score by removing the previous vote's impact.

### Karma Display

WHEN a user views any profile, THE system SHALL display the total karma score prominently. WHERE karma score is negative, THE system SHALL display it with a minus sign. WHERE karma score is positive, THE system SHALL display it with an optional plus sign for clarity.

### Karma Application

Karma scores are used for:

- **Reputation System**: High karma users may receive additional platform privileges
- **Content Visibility**: Very low karma content may be hidden by default
- **Moderator Trust**: High karma contributes to moderator appointment considerations

## Community Management

### Community Creation

WHEN a user creates a community, THE system SHALL require a unique name (alphanumeric with hyphens and underscores, 3-30 characters), description text (maximum 500 characters), and icon image. THE system SHALL validate that the community name is not already in use.

WHEN a community is created, THE system SHALL assign the creating user as the community owner. THE system SHALL initialize the subscriber count to zero and create the community with default settings.

IF community creation fails validation, THEN THE system SHALL return HTTP 400 with error code "COMMUNITY_INVALID_DATA". WHERE a user attempts to create a community with a name already in use, THEN THE system SHALL return HTTP 409 with error code "COMMUNITY_NAME_ALREADY_EXISTS".

### Community Listing and Search

WHEN a user browses communities, THE system SHALL display all communities with their name, description, icon, subscriber count, and creation date. THE system SHALL paginate the results with configurable page size.

WHERE a user searches for communities, THE system SHALL search by community name and display matching results. THE system SHALL support case-insensitive partial matching.

### Community Subscription

WHEN a user subscribes to a community, THE system SHALL add the community to their subscription list and increment the community's subscriber count. WHERE a user is already subscribed, THE system SHALL return HTTP 409 with error code "COMMUNITY_ALREADY_SUBSCRIBED".

WHEN a user unsubscribes from a community, THE system SHALL remove the community from their subscription list and decrement the community's subscriber count. WHERE a user attempts to unsubscribe from a community they are not subscribed to, THE system SHALL return HTTP 409 with error code "COMMUNITY_NOT_SUBSCRIBED".

## Post Management

### Post Types and Creation

Users can create three types of posts:

- **Text Post**: Contains text content (maximum 5000 characters)
- **Link Post**: Contains a URL (valid HTTP/HTTPS format)
- **Image Post**: Contains an uploaded image reference

WHEN a user creates a post, THE system SHALL require a title (1-300 characters), community ID, and the appropriate content for the post type. WHERE a user is not subscribed to the target community, THEN THE system SHALL return HTTP 403 with error code "POST_COMMUNITY_SUBSCRIPTION_REQUIRED".

WHEN a post is created, THE system SHALL set the initial vote score to zero, record the creation timestamp, and associate the post with the author and community. THE system SHALL return the complete post data including auto-generated fields.

### Post Editing and Deletion

WHEN a user edits their own post, THE system SHALL validate all updated fields and update the stored values. WHERE a post has been edited, THE system SHALL record the last edit timestamp.

WHERE a user attempts to edit another user's post, THEN THE system SHALL return HTTP 403 with error code "POST_EDIT_PERMISSION_DENIED". IF post editing fails validation, THEN THE system SHALL return HTTP 400 with error code "POST_INVALID_DATA".

WHEN a user deletes their own post, THE system SHALL mark the post as deleted and decrement the community's post count. THE system SHALL also delete all comments on that post and notify affected users.

WHERE a user attempts to delete another user's post, THEN THE system SHALL return HTTP 403 with error code "POST_DELETE_PERMISSION_DENIED".

### Post Display and Feeds

WHEN a post is displayed, THE system SHALL show the title, full content, author username, community name, vote score, comment count, creation timestamp, and any media content.

### Post Search

WHEN a user searches for posts, THE system SHALL search by title and content (for text posts). WHERE a user filters by community, THE system SHALL limit search results to that community.

## Comment System

### Comment Creation and Threads

WHEN a user writes a comment on a post, THE system SHALL store the comment content, associate it with the post and author, and initialize the vote score to zero. WHERE a comment replies to another comment, THE system SHALL establish the parent-child relationship.

WHEN a comment is created, THE system SHALL increment the post's comment count. WHERE a comment is deleted, THE system SHALL decrement the post's comment count.

### Comment Editing and Deletion

WHEN a user edits their own comment, THE system SHALL validate the updated content and update the stored values. WHERE a comment has been edited, THE system SHALL record the last edit timestamp.

WHERE a user attempts to edit another user's comment, THEN THE system SHALL return HTTP 403 with error code "COMMENT_EDIT_PERMISSION_DENIED".

WHEN a user deletes their own comment, THE system SHALL mark the comment as deleted and decrement the post's comment count. WHERE a comment has replies, THE system SHALL mark all replies as deleted recursively.

WHERE a user attempts to delete another user's comment, THEN THE system SHALL return HTTP 403 with error code "COMMENT_DELETE_PERMISSION_DENIED".

### Comment Sorting

Comments can be sorted by:

- **Best**: Highest vote score first, with ties broken by creation time
- **New**: Most recent comments first
- **Controversial**: Comments with many votes but score close to zero first

WHEN a user selects a comment sorting method, THE system SHALL reorder comments according to the specified criteria.

## Voting System

### Vote Operations

Users can perform the following vote operations:

- **Upvote**: Adds 1 to the content's vote score
- **Downvote**: Subtracts 1 from the content's vote score
- **Remove Vote**: Returns the content's vote score to its previous value

WHEN a user votes on content, THE system SHALL validate that the user is not the author, store the vote record, and update the content's vote score. WHERE a user changes their vote, THE system SHALL adjust the vote score by 2 (removing old vote and adding new vote).

IF a user attempts to vote on their own content, THEN THE system SHALL return HTTP 403 with error code "VOTE_OWN_CONTENT_DENIED". WHERE a vote operation fails validation, THEN THE system SHALL return HTTP 400 with error code "VOTE_INVALID_OPERATION".

### Vote Limits and Changes

Each user can only vote once per content item. The vote record includes:

- **Content ID**: The post or comment being voted on
- **User ID**: The user who cast the vote
- **Vote Type**: "UPVOTE" or "DOWNVOTE"
- **Timestamp**: When the vote was cast

WHERE a user changes their vote, THE system SHALL update the existing vote record and adjust the content's vote score accordingly. IF a vote type is invalid, THEN THE system SHALL return HTTP 400 with error code "VOTE_TYPE_INVALID".

## Feed System

### Feed Types

The platform provides three types of feeds:

- **Home Feed**: Shows posts only from communities the user is subscribed to
- **Popular Feed**: Shows posts from all communities across the platform
- **Community Feed**: Shows posts from one specific community

WHERE a user accesses the home feed without being logged in, THEN THE system SHALL redirect to the popular feed. WHERE a user accesses a community feed for a banned community, THEN THE system SHALL return HTTP 403 with error code "FEED_COMMUNITY_ACCESS_DENIED".

### Feed Sorting

All feeds support the following sorting options:

- **Hot**: Recent posts with many upvotes appear first
- **New**: Most recently created posts appear first
- **Top**: Highest vote score first, with optional time filters (today, this week, this month, this year, all time)
- **Controversial**: Posts with many votes but score close to zero appear first

WHEN a user selects a feed sort order, THE system SHALL reorder posts according to the specified algorithm. WHERE a time filter is applied for top sorting, THE system SHALL limit results to posts created within the specified timeframe.

### Feed Pagination

WHEN a feed exceeds the page size limit, THE system SHALL paginate results with configurable page size. WHERE a user requests the next page, THE system SHALL return the next set of results.

## Moderation System

### Moderator Roles and Permissions

Moderators are appointed by community owners to help maintain community standards. The permission hierarchy is:

- **Owner**: Full permissions including moderator management
- **Moderator**: Content moderation and user management permissions

WHEN a community owner appoints a moderator, THE system SHALL grant the appointed user moderator permissions for that community. WHERE a user is appointed moderator, THE system SHALL notify them and update their permissions.

### Moderator Actions

Moderators can perform the following actions within their assigned communities:

- Delete any post or comment
- Ban users temporarily or permanently
- Unban users
- Review and act on reports
- Approve or dismiss reports

WHERE a moderator deletes content, THE system SHALL record the deletion and notify the content author. WHERE a moderator bans a user, THE system SHALL prevent the user from creating content in that community.

IF a moderator attempts to delete content from outside their assigned community, THEN THE system SHALL return HTTP 403 with error code "MODERATOR_COMMUNITY_PERMISSION_DENIED". WHERE a non-owner attempts to remove a moderator, THEN THE system SHALL return HTTP 403 with error code "MODERATOR_REMOVE_PERMISSION_DENIED".

## Reporting System

### Content Reporting

WHEN a user reports content, THE system SHALL require a reason text (1-500 characters) and store the report with the content ID, reporting user ID, and timestamp. THE system SHALL immediately notify moderators of the reported content.

WHERE a user attempts to report their own content, THEN THE system SHALL return HTTP 403 with error code "REPORT_OWN_CONTENT_DENIED". WHERE report creation fails validation, THEN THE system SHALL return HTTP 400 with error code "REPORT_INVALID_DATA".

### Report Review

Moderators can view all reports for their communities and take one of two actions:

- **Approve**: Delete the reported content and notify the content author
- **Dismiss**: Keep the content and remove the report from the active report list

WHEN a moderator reviews a report, THE system SHALL record the moderator action and timestamp. WHERE a report is approved, THE system SHALL delete the content and decrement the relevant counters.

## Authentication and Authorization

### Token Management

The platform uses JWT-based authentication with access and refresh tokens.

- **Access Token**: Expires after 30 minutes, included in API requests
- **Refresh Token**: Expires after 30 days, used to obtain new access tokens

WHEN an access token expires, THE system SHALL attempt automatic refresh using the refresh token. WHERE refresh fails, THE system SHALL return HTTP 401 and require re-authentication.

### Session Security

WHEN a user logs in, THE system SHALL establish a secure session. WHERE sensitive operations are performed, THE system SHALL require re-authentication.

IF a user changes their password, THE system SHALL invalidate all active sessions. WHERE account deletion is requested, THEN THE system SHALL delete all user data and invalidate all sessions.

### Error Handling

All authentication and authorization errors SHALL return appropriate HTTP status codes and error codes:

- HTTP 401 with "AUTH_INVALID_CREDENTIALS" for invalid login
- HTTP 401 with "AUTH_TOKEN_EXPIRED" for expired tokens
- HTTP 403 with "AUTH_ACCOUNT_DISABLED" for disabled accounts
- HTTP 403 with "AUTH_SESSION_EXPIRED" for expired sessions
- HTTP 403 with "VOTE_OWN_CONTENT_DENIED" for voting on own content
- HTTP 403 with "REPORT_OWN_CONTENT_DENIED" for reporting own content
- HTTP 409 with "REGISTRATION_EMAIL_ALREADY_EXISTS" for duplicate registration
- HTTP 409 with "COMMUNITY_NAME_ALREADY_EXISTS" for duplicate community
- HTTP 409 with "POST_COMMUNITY_SUBSCRIPTION_REQUIRED" for unsubscribed community

The system SHALL provide clear, user-friendly error messages without exposing internal implementation details.