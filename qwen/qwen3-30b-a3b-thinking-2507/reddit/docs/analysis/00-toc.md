# Reddit-like Community Platform Requirements Specification

## 1. User Account

### 1.1 Account Creation
WHEN a user submits registration form with valid email, password, and unique username, THE system SHALL create a new user account with a confirmation email sent to the provided address.

WHEN a user attempts to register with an already taken username, THE system SHALL reject the registration attempt and display a clear error message indicating the username availability.

### 1.2 Authentication
WHEN a user submits valid email and password for login, THE system SHALL authenticate the user and return a JWT token for subsequent secure API access.

WHEN a user attempts login with invalid credentials more than 5 times within 15 minutes, THE system SHALL temporarily block further attempts for 30 minutes and inform the user of the security lockout.

### 1.3 Password Management
WHEN a user initiates a password change request with current password verification, THE system SHALL allow password update after confirming the current password matches the stored hash.

WHEN a user requests account deletion, THE system SHALL permanently remove all user data including posts, comments, and profile information within 24 hours, while retaining anonymized usage statistics for analytics.

## 2. User Profile

### 2.1 Profile Information
WHEN a user completes profile setup with a display name, bio, and avatar, THE system SHALL store the profile data and make it publicly accessible on the profile page.

### 2.2 Profile Display
WHEN a user views another user's profile, THE system SHALL display the user's display name, bio text, avatar image, total karma score, list of posts, and list of comments in chronological order by default.

WHEN a user requests to edit their profile, THE system SHALL allow updating of display name (max 30 characters), bio (max 255 characters), and avatar image (JPG/PNG, max 10MB).

## 3. Karma System

### 3.1 Karma Calculation
WHEN a user receives an upvote on a post or comment, THE system SHALL increase the user's karma score by 1.

WHEN a user receives a downvote on a post or comment, THE system SHALL decrease the user's karma score by 1.

WHEN a user removes their vote on a post or comment, THE system SHALL adjust the karma score by -1 for an upvoted item or +1 for a downvoted item.

### 3.2 Negative Karma
WHEN a user's karma score reaches a negative value, THE system SHALL continue to display the negative score without additional restrictions or special handling.

## 4. Communities

### 4.1 Community Creation
WHEN a user creates a new community with a unique name, description, and icon, THE system SHALL assign the creator as the community owner with full administrative privileges.

WHEN a user attempts to create a community with a name that already exists, THE system SHALL reject the request with a clear error message about name availability.

### 4.2 Community Management
WHEN a user browses all communities, THE system SHALL display a paginated list showing community name, description, subscriber count, and icon in alphabetical order by community name.

WHEN a user searches communities by name, THE system SHALL filter and display matching communities without requiring exact matches.

## 5. Subscription Management

### 5.1 Subscribing
WHEN a user subscribes to a community, THE system SHALL add the community to the user's subscription list and allow creating posts within that community.

WHEN a user unsubscribes from a community, THE system SHALL remove the community from the user's subscription list and prevent future post creation in that community.

### 5.2 Subscription Access
WHEN a user is not subscribed to a community, THE system SHALL prevent them from creating new posts in that community, but still allow viewing the community's content.

## 6. Posts

### 6.1 Post Creation
WHEN a user creates a post in a subscribed community, THE system SHALL require the post title and content (text, URL, or image). THE system SHALL enforce the post content type based on content provided (text, link, image).

### 6.2 Post Types
WHEN a user creates a text post, THE system SHALL store the full text content and display first 200 characters in feeds.

WHEN a user creates a link post, THE system SHALL store the URL and display the domain name (e.g., youtube.com) in feeds.

WHEN a user creates an image post, THE system SHALL store the image URL and display a thumbnail in feeds.

## 7. Post Voting

### 7.1 Voting Rules
WHEN a user votes on a post, THE system SHALL track the vote and prevent multiple votes from the same user on the same post.

WHEN a user changes their vote from up to down, THE system SHALL adjust the vote score by -2 (reversing the upvote and applying the downvote).

## 8. Post Feeds

### 8.1 Feed Access
WHEN a user is logged in, THE system SHALL show Home Feed (posts from subscribed communities) as their default feed.

WHEN a user is not logged in, THE system SHALL show Popular Feed (all communities) as the visible feed.

### 8.2 Feed Sorting
WHEN a user selects "Hot" sorting in any feed, THE system SHALL sort posts by (upvotes + (post age in hours × 0.5)) descending.

WHEN a user selects "Top" with time filter "all time", THE system SHALL sort posts by total upvotes minus downvotes descending.

## 9. Comments

### 9.1 Comment Creation
WHEN a user writes a comment on a post, THE system SHALL store the comment content and associate it with the post and user.

WHEN a user replies to a comment, THE system SHALL create a nested comment structure with the parent comment reference.

### 9.2 Comment Voting
WHEN a user votes on a comment, THE system SHALL prevent multiple votes from the same user on the same comment.

WHEN a user changes their vote on a comment, THE system SHALL adjust the comment's vote score accordingly.

## 10. Community Moderation

### 10.1 Moderator Roles
WHEN a community owner adds a moderator, THE system SHALL grant the new moderator all moderator permissions while keeping owner status for the creator.

WHEN a moderator attempts to remove the community owner, THE system SHALL reject the action with an error message.

### 10.2 Moderation Actions
WHEN a moderator deletes a post, THE system SHALL permanently remove the post from all feeds and content display.

WHEN a moderator bans a user from a community, THE system SHALL prevent the user from creating posts and comments in that community while still allowing content viewing.

## 11. Reporting System

### 11.1 Report Submission
WHEN a user reports a post or comment, THE system SHALL require a text reason (min 10 characters, max 500) as part of the submission.

### 11.2 Report Resolution
WHEN a moderator approves a report, THE system SHALL permanently delete the reported content.

WHEN a moderator dismisses a report, THE system SHALL retain the content and remove the report from the moderation queue.

## 12. Implementation Notes

- All user interactions must be authenticated through JWT tokens with 24-hour expiration.
- All API endpoints follow REST conventions with standard HTTP statuses.
- Database schema will be generated automatically from these requirements using Prisma.
- Business logic is completely separated from presentation layer.
- All user-facing messages use natural language instead of technical terms.