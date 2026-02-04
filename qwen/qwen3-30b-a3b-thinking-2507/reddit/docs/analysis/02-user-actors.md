# Reddit-like Community Platform Requirements Specification

## 1. User Accounts

### 1.1 Registration
WHEN a user provides email and password during registration, THEN the system SHALL validate email format as per RFC 5322 standards and require password with minimum 8 characters including alphanumeric and special characters. WHEN registration is successful, THEN the system SHALL send confirmation email with verification link. WHEN verification link is clicked, THEN the system SHALL activate the account and redirect to login.

### 1.2 Authentication
WHEN a user attempts login with valid email and password, THEN the system SHALL authenticate against stored credentials and generate secure JWT token. WHEN login fails three consecutive times, THEN the system SHALL lock account for 15 minutes. WHEN password reset is requested, THEN the system SHALL send recovery email with time-limited token.

### 1.3 Account Management
WHEN a user requests account deletion, THEN the system SHALL delete all associated posts, comments, karma, and personal data. WHEN a user changes password, THEN the system SHALL require current password verification before applying new password. WHEN profile updates are made, THEN the system SHALL update the user's display name, bio, and avatar images within 200ms.

## 2. User Profiles

### 2.1 Profile Display
WHEN a user views another user's profile, THEN the system SHALL display the profile's display name, bio, avatar image, total karma score, and subscriber count. WHEN a user views their own profile, THEN the system SHALL include additional edit controls for profile information.

### 2.2 Profile Management
WHEN a user edits their display name, THEN the system SHALL allow maximum 25 characters with alphanumeric and space characters only. WHEN a user updates their bio, THEN the system SHALL allow maximum 500 characters with markdown formatting. WHEN a user uploads a new avatar, THEN the system SHALL automatically resize and compress the image to 200x200 pixels at 75% quality.

## 3. Karma System

### 3.1 Karma Calculation
WHEN a user upvotes a post or comment, THEN the system SHALL increment the author's karma by 1. WHEN a user downvotes a post or comment, THEN the system SHALL decrement the author's karma by 1. WHEN a user removes their vote, THEN the system SHALL adjust karma by +1 or -1 according to the previous vote.

### 3.2 Karma Display
WHEN a profile page loads, THEN the system SHALL display the user's total karma as a numeric value. WHEN karma is negative, THEN the system SHALL display it with a red background and prefix 'Negative: ' for visual distinction. When karma is zero, THEN the system SHALL display it as '0' without special formatting.

## 4. Communities

### 4.1 Community Creation
WHEN a user creates a new community, THEN the system SHALL require unique name, description (max 500 characters), and icon image. WHEN the community owner is set, THEN the system SHALL grant full moderation rights to that user only. WHEN community creation is complete, THEN the system SHALL assign a unique 8-character community code.

### 4.2 Community Management
WHEN a user searches communities by name, THEN the system SHALL return results matching any partial string in the name. WHEN a user browses all communities, THEN the system SHALL sort by subscriber count descending. WHEN a user views community details, THEN the system SHALL display description, icon, subscriber count, and last activity timestamp.

## 5. Posts

### 5.1 Post Types
WHEN a user selects text post type, THEN the system SHALL require text content with 10-5000 characters. WHEN a user selects link post type, THEN the system SHALL validate URL format and extract domain name for display. WHEN a user selects image post type, THEN the system SHALL accept images up to 10MB with common formats (JPG, PNG, GIF).

### 5.2 Post Display
WHEN viewing post list, THEN the system SHALL show title, author username, community name, vote score, comment count, and time since posted. WHEN viewing image posts, THEN the system SHALL display a 100x100px thumbnail. WHEN viewing text posts, THEN the system SHALL show first 200 characters of content with 'Read More' link.

## 6. Voting System

### 6.1 Post and Comment Voting
WHEN a user upvotes a post, THEN the system SHALL increment the vote score by 1 and prevent further votes from that user until they change their vote. WHENThe vote is removed by the user, THEN the system SHALL adjust the score by -1 for previous upvote or +1 for previous downvote. When the owner is changed, THEN the system SHALL prevent vote from that user on their post.

### 6.2 Vote Visibility
WHEN viewing post details, THEN the system SHALL show the current vote score (upvotes - downvotes) prominently. WHEN the voting system is used, THEN the client SHALL show the user's current vote choice with visible styling (color-coding). The system SHALL update the vote count without refreshing the entire page.

## 7. Moderation

### 7.1 Community Ownership
WHEN a user creates a community, THEN the system SHALL grant them the highest authority (owner role). WHEN a community owner adds a moderator, THEN the system SHALL send confirmation notification to the new moderator. WHEN a moderator is added, THEN the system SHALL grant them all moderator capabilities within that community.

### 7.2 Content Moderation
WHEN a moderator deletes a post, THEN the system SHALL permanently remove it from all feeds and notify the author. WHEN a moderator bans a user, THEN the system SHALL prevent them from interacting with the community for the duration specified (default 30 days) with clear notification. WHEN a moderator views reports, THEN the system SHALL display all active reports with content details, reporter, and reason.

## 8. Feed Systems

### 8.1 Feed Types
WHEN a logged-in user views Home Feed, THEN the system SHALL show posts only from subscribed communities. WHEN viewing Popular Feed, THEN the system SHALL display posts from all communities regardless of login status. WHEN viewing Community Feed, THEN the system SHALL limit to posts from the selected community.

### 8.2 Sorting and Pagination
WHEN sorting by 'Hot,' THEN the system SHALL prioritize posts with high vote scores and recent activity. WHEN sorting by 'Top' with time filter 'This Year,' THEN the system SHALL display highest score posts made within the last 365 days. Pagination SHALL default to 20 items per page, with 'Load More' button for additional content.

## 9. Comment System

### 9.1 Comment Functionality
WHEN a user writes a comment, THEN the system SHALL allow text up to 1000 characters. WHEN a user replies to a comment, THEN the system SHALL add a nested level with appropriate visual styling. When editing a comment, THEN the system SHALL show the previous content for comparison and maintain the edit history for moderation purposes.

### 9.2 Comment Sorting
WHEN viewing comments, THEN the system SHALL default to 'Best' sort order (highest vote score). WHEN selecting 'Controversial,' THEN the system SHALL display comments with high vote counts but low net scores (close to zero) first. When sorting comments, THEN the client SHALL update the view immediately without full page reload.

## 10. Business Validation

### 10.1 Data Validation
WHEN user submits content, THEN the system SHALL validate all fields to match business rules. Email validation SHALL follow standard patterns. Text content SHALL prevent dangerous HTML. Vote actions SHALL prevent duplicate submissions from the same user.

### 10.2 Error Handling
WHEN validation fails, THEN the system SHALL provide specific error messages to the user. Login failures SHALL not reveal account existence. Account deletion requests SHALL require confirmation to prevent accidental data loss. All errors SHALL be logged with context for support purposes.