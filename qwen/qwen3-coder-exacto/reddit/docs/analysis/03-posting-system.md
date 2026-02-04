# Reddit-like Community Platform Requirements Specification

## 1. Overview and Platform Vision

### 1.1 Platform Purpose

The RedditClone platform is a community-driven content sharing service that enables users to create topic-based communities where they can share content, engage in discussions, and build reputation through a karma system. The platform supports multiple content types (text posts, link posts, and image posts) with robust community management features.

### 1.2 Core Value Proposition

- **Community-Centric Design**: Users can create and participate in specialized communities
- **Content Diversity**: Support for text, link, and image-based posts
- **Reputation-Based Engagement**: Karma system that rewards valuable contributions
- **Democratic Content Curation**: Voting mechanisms for posts and comments
- **Effective Moderation Tools**: Community management features for maintaining quality
- **Personalized Content Discovery**: Multiple feed types with customizable sorting

### 1.3 Platform Architecture Overview

The platform follows a service-oriented architecture with modular components that handle user management, community management, content creation and curation, voting systems, moderation tools, and reporting mechanisms. All components are designed to support horizontal scaling and high availability.

## 2. Core Features and User Personas

### 2.1 User Personas

#### Standard User (`user`)
Regular platform participant who can create posts, comment, vote, and subscribe to communities. They can participate in all community activities but have no moderation privileges.

#### Moderator (`moderator`)
Community-specific authority with content management privileges within designated communities. They can manage content, ban users, and handle reports within their assigned communities.

#### Community Owner (`communityOwner`)
Creator of a specific community with full administrative privileges over that community. They can add/remove moderators, modify community settings, and permanently delete their community.

#### System Administrator (`admin`)
Platform-wide authority with unrestricted access to all system functions. They can manage all users, handle system-level reports, and modify global settings.

### 2.2 Cross-Cutting Concerns

All users interact with the platform through a consistent set of cross-cutting features:
- Authentication and authorization mechanisms
- Content creation and management workflows
- Voting systems for engagement metrics
- Reporting systems for content moderation
- Feed systems for content discovery
- Comment systems for threaded discussions

## 3. User Account System

### 3.1 Account Creation and Management

WHEN a guest visits the platform, THE system SHALL provide a registration form with fields for email address, password, and username.

WHEN a guest submits registration information, THE system SHALL validate all fields according to the following rules:
  - Email address SHALL be in valid email format
  - Password SHALL be at least 8 characters long
  - Username SHALL be unique across the platform
  - Username SHALL contain only alphanumeric characters and underscores
  - Username SHALL not exceed 20 characters in length

WHEN an account is created, THE system SHALL generate a unique verification token and associate it with the user account.

WHEN an account is created, THE system SHALL send a verification email containing a link with the verification token to the user's email address.

### 3.2 Authentication

WHEN a guest or user visits the login page, THE system SHALL display a form with fields for email address and password.

WHEN a user submits login credentials, THE system SHALL validate the email address format.

WHEN email format is valid, THE system SHALL check if an account exists with the provided email address.

WHEN an account exists with the provided email, THE system SHALL verify the password against the stored hash.

WHEN login is successful, THE system SHALL generate a JWT access token containing the user ID, username, account status, and current permissions array.

THE system SHALL maintain user sessions using JWT tokens with a 30-minute expiration time.

THE system SHALL provide refresh tokens with a 30-day expiration for persistent login.

WHEN a user logs out, THE system SHALL invalidate the current session tokens.

### 3.3 Profile Management

THE system SHALL maintain the following profile information for each user:
  - Display name (optional text, max 50 characters)
  - Bio text (optional text, max 500 characters)
  - Avatar image (optional image file)
  - Karma score (integer, can be negative)
  - Account creation timestamp

WHEN an authenticated user visits their profile edit page, THE system SHALL display a form pre-populated with their current profile information.

WHEN a user submits profile update information, THE system SHALL validate all fields according to the following rules:
  - Display name SHALL not exceed 50 characters
  - Bio text SHALL not exceed 500 characters
  - Avatar SHALL be a valid image file not exceeding 5MB

WHEN profile update is successful, THE system SHALL redirect the user to their updated profile page.

WHEN any user visits another user's profile page, THE system SHALL display:
  - The user's display name
  - The user's bio text
  - The user's avatar image
  - The user's total karma score
  - A list of all posts created by the user
  - A list of all comments written by the user

### 3.4 Account Security

THE system SHALL hash all passwords using industry-standard bcrypt or argon2 algorithm with appropriate work factors.

THE system SHALL implement rate limiting on authentication endpoints to prevent brute force attacks:
  - Maximum 5 login attempts per email per hour
  - Maximum 3 password reset requests per email per hour

WHEN a user requests account deletion, THE system SHALL display a confirmation dialog warning about permanent data loss.

WHEN a user confirms account deletion, THE system SHALL begin the account deletion process by removing all user-generated content from the platform.

## 4. Community Management

### 4.1 Community Creation

WHEN a user navigates to the community creation page, THE system SHALL display a form requesting a unique community name, description text, and icon image upload.

WHEN a user submits the community creation form with valid information, THE system SHALL create a new community with the provided details and assign the creating user as the community owner.

THE system SHALL enforce that community names are unique across the platform.

THE system SHALL require community names to be between 3 and 50 characters in length.

### 4.2 Community Discovery

THE system SHALL display a paginated list of all communities on the community discovery page.

THE system SHALL show each community's name, description preview (first 200 characters), icon, and subscriber count in the listing.

THE system SHALL provide a search bar that allows users to search for communities by name.

### 4.3 Community Subscription

WHEN a logged-in user visits a community page, THE system SHALL display a "Subscribe" button if the user is not already subscribed to that community.

WHEN a logged-in user clicks the "Subscribe" button for a community, THE system SHALL add that user to the community's subscriber list and update the button to "Unsubscribe".

WHEN a logged-in user clicks the "Unsubscribe" button for a community, THE system SHALL remove that user from the community's subscriber list and update the button to "Subscribe".

## 5. Content Creation and Management

### 5.1 Post Creation Requirements

WHEN a user wishes to create a post, THE system SHALL require the user to be authenticated with a valid account.

WHEN a user attempts to create a post, THE system SHALL verify that the user is subscribed to the target community.

WHEN a user successfully submits a valid post, THE system SHALL create the post with the following attributes:
- Title from user input (1-300 characters)
- Content based on post type
- Author set to the current user
- Community set to selected community
- Creation timestamp set to current time
- Initial vote score of 0
- Comment count of 0
- Visibility set to public

### 5.2 Post Types

WHERE a user selects text post type, THE system SHALL provide a text input field supporting up to 40,000 characters.

WHERE a user selects link post type, THE system SHALL provide a URL input field.

WHEN a user submits a link post, THE system SHALL validate that the URL:
- Is properly formatted according to RFC 3986 standard
- Begins with http:// or https://
- Does not exceed 2,048 characters in length

WHERE a user selects image post type, THE system SHALL provide an image upload interface.

WHEN a user uploads an image, THE system SHALL accept files in the following formats: JPEG, PNG, GIF, WEBP.

WHEN a user uploads an image, THE system SHALL validate that the file does not exceed 10MB in size.

### 5.3 Post Editing and Deletion

WHERE a user is the author of a post, THE system SHALL allow the user to edit their post.

WHEN a user accesses the edit interface for their post, THE system SHALL allow modification of:
  - Post title
  - Post content (based on original post type)

WHEN a user successfully edits a post, THE system SHALL update the post's last edited timestamp.

WHERE a user is the author of a post, THE system SHALL allow the user to delete their post.

WHEN a user initiates post deletion, THE system SHALL prompt for confirmation before proceeding.

WHEN a user confirms post deletion, THE system SHALL mark the post as deleted and remove it from public feeds.

## 6. Voting System

### 6.1 Voting Mechanics

THE system SHALL support three vote types for posts and comments:
- Upvote (adds 1 to score)
- Downvote (subtracts 1 from score)
- No vote (neutral, 0 impact on score)

WHEN a user votes on a post, THE system SHALL ensure that each user can only have one active vote per post.

WHEN a user votes on a post they authored, THE system SHALL prevent the vote and display an appropriate message.

### 6.2 Vote Impact on Scores

WHEN a user upvotes a post, THE system SHALL increase the post's vote score by 1.

WHEN a user downvotes a post, THE system SHALL decrease the post's vote score by 1.

WHEN a user removes their vote from a post, THE system SHALL adjust the post's vote score accordingly.

### 6.3 Vote Impact on Karma

WHEN a user's post receives an upvote, THE system SHALL increase the post author's karma score by 1.

WHEN a user's post receives a downvote, THE system SHALL decrease the post author's karma score by 1.

WHEN a user's vote is removed from a post, THE system SHALL adjust the post author's karma score accordingly.

## 7. Feed Systems

### 7.1 Feed Types

THE system SHALL provide three distinct post feeds:

#### Home Feed
WHERE a user is authenticated, THE system SHALL provide a home feed containing posts from communities the user is subscribed to.

#### Popular Feed
THE system SHALL provide a popular feed accessible to all users containing posts from all communities.

#### Community Feed
THE system SHALL provide a community-specific feed for each community containing only posts from that community.

### 7.2 Feed Sorting Options

THE system SHALL support four sorting algorithms for all feeds:

#### Hot Sorting
WHEN posts are sorted by hot, THE system SHALL rank posts using an algorithm that prioritizes recent posts with high vote activity.

#### New Sorting
WHEN posts are sorted by new, THE system SHALL display posts in chronological order with newest posts first.

#### Top Sorting
WHEN posts are sorted by top, THE system SHALL rank posts by vote score with the following time filters:
- Today (posts from last 24 hours)
- This week (posts from last 7 days)
- This month (posts from last 30 days)
- This year (posts from last 365 days)
- All time (all posts)

#### Controversial Sorting
WHEN posts are sorted by controversial, THE system SHALL rank posts that have high total vote counts but scores close to zero.

### 7.3 Feed Display Requirements

WHEN displaying a single post, THE system SHALL display:
- Post title in full
- Author username with link to profile
- Community name with link to community
- Creation timestamp
- Current vote score
- Comment count
- Content appropriate to post type

WHEN displaying posts in any feed, THE system SHALL display each post with:
- Title
- Author username
- Community name
- Vote score
- Comment count
- Time since posted
- Content preview appropriate to post type

## 8. Comment System

### 8.1 Comment Creation

WHEN a user is authenticated and viewing a post, THE system SHALL allow them to create a new comment with text content.

WHEN a user submits a comment with empty text content, THE system SHALL reject the submission and display an error message.

THE system SHALL support nested comments with unlimited depth, allowing users to reply to any existing comment.

### 8.2 Comment Display

WHEN displaying a comment, THE system SHALL show the following information:
- Author's username
- Comment content text
- Timestamp indicating when the comment was posted
- Current vote score
- Reply functionality
- Edit and delete options (for the comment author)
- Visual indication of nesting level within the comment thread

### 8.3 Comment Editing and Deletion

WHEN the author of a comment accesses their comment, THE system SHALL provide options to edit or delete the comment.

WHEN a user deletes a comment, THE system SHALL mark the comment as deleted but preserve it to maintain conversation context.

### 8.4 Comment Voting System

WHEN an authenticated user views a comment, THE system SHALL display upvote and downvote options.

WHEN a user upvotes a comment, THE system SHALL increase the comment's vote score by 1 and increase the comment author's karma score by 1.

### 8.5 Comment Sorting

THE system SHALL provide sorting options for comments on a post, including:

- Best: Comments sorted by highest vote score first
- New: Comments sorted by most recently posted first
- Controversial: Comments with many votes but score close to zero

## 9. Moderation and Reporting

### 9.1 Moderator Roles and Hierarchy

THE system SHALL implement a four-tier user role system with distinct permissions and responsibilities:
- Standard User (user)
- Moderator (moderator)
- Community Owner (communityOwner)
- System Administrator (admin)

THE community owner SHALL be the only role capable of removing moderator status from any moderator in their community.

THE Community Owner SHALL have the authority to add existing users as Moderators to their community.

### 9.2 Content Moderation Tools

THE system SHALL provide Moderators with comprehensive tools to manage posts and comments within their assigned communities.

WHEN a Moderator deletes a post, THE system SHALL remove the post from all feeds and notify the author with reason for deletion.

WHEN a Moderator deletes a comment, THE system SHALL remove the comment from all displays and notify the author with reason for deletion.

### 9.3 User Management

WHEN a Moderator bans a user from their community, THE system SHALL:
- Prevent the banned user from creating new posts in that community
- Prevent the banned user from creating new comments in that community
- Prevent the banned user from voting on content in that community
- Allow the banned user to continue viewing content in that community

### 9.4 Reporting System

WHEN a user encounters inappropriate content, THE system SHALL provide options to report both posts and comments.

WHEN a user submits a report without providing a reason, THE system SHALL display an error message and prevent submission.

THE system SHALL validate that report reasons are between 10 and 500 characters in length.

WHEN a moderator approves a report, THE system SHALL delete the reported content and remove it from public view.

## 10. User Reputation (Karma System)

### 10.1 Karma Calculation Rules

THE karma system SHALL track a single numerical score for each user that represents their reputation on the platform.

THE system SHALL initialize each user's karma score to zero upon account creation.

WHEN a user creates a post that receives an upvote, THE system SHALL increase the post author's karma by 1.

WHEN a user creates a comment that receives a downvote, THE system SHALL decrease the comment author's karma by 1.

THE system SHALL allow a user's karma score to be negative when they receive more downvotes than upvotes.

### 10.2 Voting Impact on Karma

THE system SHALL prevent users from voting multiple times on the same post or comment.

WHEN a user changes their existing vote on a post or comment, THE system SHALL update the content creator's karma score with the new vote value.

### 10.3 Karma Display

THE system SHALL display each user's total karma score on their profile page.

WHEN displaying a post in any feed, THE system SHALL show the author's karma score alongside their username.

THE system SHALL display karma scores in the user list views alongside usernames.

## 11. Data Privacy and Security Considerations

### 11.1 Data Protection

THE system SHALL hash all passwords using industry-standard bcrypt or argon2 algorithm.

THE system SHALL store JWT secrets using secure environment variables.

THE system SHALL implement rate limiting on authentication endpoints to prevent brute force attacks.

### 11.2 Session Security

THE system SHALL use HttpOnly and Secure flags for all authentication cookies.

THE system SHALL generate cryptographically secure random tokens for email verification and password resets.

### 11.3 Account Deletion

WHEN a user confirms account deletion, THE system SHALL begin the account deletion process by removing all user-generated content from the platform.

THE system SHALL maintain logs of account deletion events for security auditing.

THE system SHALL implement measures to prevent automated account creation including CAPTCHA or similar mechanisms.