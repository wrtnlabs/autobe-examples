# Reddit-like Community Platform Requirements Specification

## 1. User Account Management

### Registration
WHEN a user initiates registration, THE system SHALL require a unique email address meeting RFC 5322 format standards and a password meeting minimum 12-character strength requirements (including uppercase, lowercase, number, and special character). THE system SHALL validate email uniqueness in real-time and provide immediate feedback during input. THE system SHALL store passwords using bcrypt with a cost factor of 12 and require explicit GDPR consent during sign-up.

### Login
WHEN a user attempts to log in, THE system SHALL verify credentials against the database with rate limiting (max 5 failed attempts within 1 hour), returning distinct error messages to prevent account enumeration. THE system SHALL issue JWT tokens with 24-hour expiration for secure session management.

### Password Management
WHEN a user requests a password change, THE system SHALL require current password verification before allowing new password entry. THE system SHALL enforce password history checks (preventing reuse of last 5 passwords) and send confirmation email to primary address within 5 minutes.

### Account Deletion
WHEN a user requests account deletion, THE system SHALL permanently delete all personally identifiable information including account details, posts, comments, and karma data within 30 days per GDPR requirements. THE system SHALL send deletion confirmation email to primary address after 30-day completion, with anonymized activity data retained for 180 days as required by data retention policies.

## 2. User Profile System

### Profile Content
WHEN a user accesses their profile, THE system SHALL display display name (limited to 30 characters), bio text (max 250 characters), and avatar image. THE system SHALL enforce validation during edits: display name must contain at least one non-numeric character, bio must not contain HTML, and avatar must be JPEG/PNG under 5MB.

### Profile Accessibility
WHEN a user views another user's profile, THE system SHALL display public information only (display name, bio, karma), with private data like email inaccessible. THE system SHALL limit profile load requests to prevent abuse (max 100 profiles per hour per user).

### Karma Score
WHEN users create new posts or comments, THE system SHALL increment karma score (+1 for upvotes, -1 for downvotes) in real-time. THE system SHALL display karma as a positive integer or negative number with "Karma" label, updating every 3 seconds during vote changes.

## 3. Community Management

### Community Creation
WHEN a user creates a new community, THE system SHALL require a unique name (max 25 characters, alphanumeric only), description (max 500 characters), and icon image (JPG/PNG, 1MB max). THE system SHALL assign the creator as owner, granting all moderator permissions immediately.

### Community Discovery
WHEN users browse communities, THE system SHALL display a paginated list (20 per page) sorted by subscriber count (descending). THE system SHALL allow search by community name with real-time keyword matching (case-insensitive, partial matches allowed).

### Community Subscription
WHEN a user subscribes to a community, THE system SHALL track this relationship in the database, requiring subscription for post creation. THE system SHALL automatically unsubscribe users after 180 days of inactivity with a notification email before deletion.

## 4. Post Management

### Post Creation
WHEN a user creates a post in a subscribed community, THE system SHALL require title (min 5 characters, max 100) and content type-specific data. For text posts: max 5000 characters. For link posts: valid URL starting with https:// or http://. For image posts: single file upload under 10MB. THE system SHALL validate content against community-specific rules before saving.

### Post Editing & Deletion
WHEN a user edits their post, THE system SHALL allow modification within 30 minutes of creation. THE system SHALL display version history for post edits, retaining previous content for moderation review. WHEN a user deletes their post, THE system SHALL remove it immediately and update the post count for the community and user.

### Post Voting System
WHEN users vote on posts, THE system SHALL enforce one vote per user per post (upvote or downvote). THE system SHALL update vote counts immediately across all views. WHEN votes are changed or removed, THE system SHALL adjust karma scores for authors in real-time within 2 seconds.

## 5. Community Feed Systems

### Home Feed
WHEN a logged-in user views the Home Feed, THE system SHALL display only posts from subscribed communities, sorted by default to 'Hot' (recent posts with high upvote count). THE system SHALL paginate results at 25 entries per page with load-more functionality.

### Popular Feed
WHEN a user (logged-in or guest) views the Popular Feed, THE system SHALL display posts from all communities, sorted by 'Hot' by default. THE system SHALL display the author username, community name, vote score, and time since posted with precise timestamps.

### Community Feed
WHEN a user views a specific community feed, THE system SHALL filter posts by community ID with pagination set to 30 entries per page. THE system SHALL show author, content preview, and current votes score prominently in the feed.

## 6. Comment System

### Comment Creation
WHEN a user submits a comment on a post, THE system SHALL require minimum 5 characters content with no HTML. THE system SHALL allow nested comments up to 4 levels deep. THE system SHALL display comments in 'Best' order by default (highest vote score).

### Comment Management
WHEN a user edits their comment, THE system SHALL limit edits to 10 minutes after posting. THE system SHALL track comment history with timestamps for moderation review. WHEN a user deletes their comment, THE system SHALL remove it immediately and update the comment count for the post.

#### Comment Voting
WHEN users vote on comments, THE system SHALL allow one vote per user per comment, with real-time score updates. THE system SHALL display upvote/downvote buttons with current score. WHEN votes are modified, THE system SHALL update karma scores for comment authors instantly.

## 7. Moderation System

### Moderator Roles
WHEN a community owner adds a moderator, THE system SHALL grant all moderator permissions except owner management. THE system SHALL require owner approval for new moderators. THE system SHALL log all moderator additions and removals with timestamps.

### Moderator Actions
WHEN a moderator deletes a post, THE system SHALL notify the author via email with reason (customizable by moderator). THE system SHALL prevent banned users from creating new posts in the community with immediate 403 errors. THE system SHALL maintain a searchable list of banned users with ban dates and reasons.

### Reporting System
WHEN a user submits a report on content, THE system SHALL require a reason text (min 10 characters). THE system SHALL notify moderators of new reports immediately. WHEN a moderator approves a report, THE system SHALL delete the content and notify the reporter. THE system SHALL maintain a dashboard for all reports sorted by date with status indicators.

## 8. Security & Compliance Integration

### Data Handling
WHEN users submit personal information, THE system SHALL ensure GDPR-compliant data handling with explicit consent, minimal data collection, and anonymized retention after 180 days of inactivity per data retention policies.

### Account Privacy
WHEN users delete accounts, THE system SHALL permanently remove all personal data including associated content within 30 days. THE system SHALL process deletion requests within GDPR compliance timelines with automated confirmation email.

## 9. Performance Requirements

### API Response Times
THE system SHALL maintain API response times of under 200ms for 95% of requests. THE system SHALL handle 10,000 concurrent users with a maximum 500ms response time under normal conditions.

### Content Delivery
THE system SHALL load post lists at 25 entries per page with content previews within 1.5 seconds on mobile connections. THE system SHALL provide image thumbnails within 1.2 seconds for all image posts.

## 10. Validation Rules

### Username Rules
WHEN users choose usernames, THE system SHALL ensure uniqueness, alphanumeric characters only (max 20 characters), and disallow offensive terms. THE system SHALL check for existing usernames in real-time and provide alternative suggestions if taken.

### Post Content Rules
WHEN users submit posts, THE system SHALL validate content against community rules, blocking inappropriate content using keyword filtering and AI-based content scanning (with moderator override for false positives). THE system SHALL enforce maximum content limits with clear error messages.