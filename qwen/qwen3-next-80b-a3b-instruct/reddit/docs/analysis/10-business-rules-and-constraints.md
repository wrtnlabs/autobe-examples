# Reddit-Like Community Platform Requirements

## Service Summary

The platform enables users to create and participate in topic-based communities by posting content, engaging through upvotes/downvotes, and building reputation through a karma system. Communities function as self-moderated forums where users can share text, links, and images, and engage in threaded discussions. The platform prioritizes user-generated content moderation through community-driven reporting and karma-based privileges.

## Business Model

The platform operates as a publicly accessible community hub with no subscription fees. Revenue generation will occur through targeted advertising based on user engagement patterns and community interests. Growth is achieved through word-of-mouth network effects and community-driven content discovery. Success is measured by active user count, daily post volume, and community engagement depth.

## User Actors

### Guest User
- Can browse all public content and communities
- Cannot post, comment, vote, create communities, or report content
- Must register to engage interactively

### Member User
- Can create and join communities
- Can post text, links, and images
- Can comment on posts with nested replies
- Can upvote or downvote posts and comments
- Can report inappropriate content
- Can subscribe to communities
- Can view their profile with their activity history
- Earn and lose karma based on community feedback
- Can edit their own posts and comments (within edit window)

### Admin User
- Has full system access and oversight
- Can ban users, delete any content, or suspend communities
- Can view all reports and audit logs
- Can adjust karma values manually in exceptional cases
- Can set system-wide policies and content moderation guidelines
- Can override automated moderation systems when necessary

## Authentication System

### Registration Flow

WHEN a guest attempts to register:
- THE system SHALL require a unique username (3-30 characters, alphanumeric + underscore)
- THE system SHALL require a valid email address (standard format)
- THE system SHALL send a verification email with a time-limited token
- THE system SHALL block registration if the username or email is already in use
- THE system SHALL prevent registration from IP addresses with more than 10 pending registrations
- THE system SHALL require users to accept community guidelines terms
- THE system SHALL create a default profile with 0 karma
- THE system SHALL place new users in a 24-hour "cool-down" period before content posting
- THE system SHALL require email verification before any interaction with content

### Login Flow

WHEN a user attempts to log in:
- THE system SHALL accept username or email + password combination
- THE system SHALL verify password against salted hash
- THE system SHALL lock account after 5 consecutive failed login attempts for 15 minutes
- THE system SHALL provide "Forgot Password" flow with email-based token reset
- THE system SHALL enforce HTTPS-only authentication endpoints
- THE system SHALL issue JWT tokens with 24-hour expiration
- THE system SHALL refresh JWT tokens automatically on subsequent requests
- THE system SHALL invalidate all tokens upon password change

### Session Management

THE system SHALL:
- Maintain active sessions for up to 24 hours of inactivity
- Allow concurrent sessions across devices with separate tokens
- Show active sessions on user profile for security monitoring
- Allow users to revoke individual sessions
- Automatically refresh tokens when requests are made within last hour of validity
- Store session metadata including IP address, device fingerprint, and timestamp

### Authentication Tokens

THE system SHALL:
- Use JWT tokens signed with RS256 algorithm
- Include user ID, role, and expiration time in token payload
- Set token expiration to 24 hours
- Issue refresh tokens with 7-day expiration stored securely on server
- Validate token signatures on every protected request
- Reject tokens with expired, tampered, or malformed signatures
- Implement token blacklisting for revoked sessions

### Cross-Platform Support

THE system SHALL support authentication through:
- Web browsers (Chrome, Firefox, Safari, Edge)
- iOS native app (minimum iOS 14)
- Android native app (minimum Android 9)
- Web view integrations in third-party apps
- API-based authentication using OAuth2.0

## Core Functional Requirements

### Community Creation and Management

WHEN a member attempts to create a community:
- THE system SHALL require a name between 3 and 21 characters
- THE system SHALL only allow alphanumeric characters and underscores in name
- THE system SHALL reject community names that match existing communities (case-insensitive)
- THE system SHALL prohibit community names containing banned terms (e.g., "admin", "mod", "support", "help")
- THE system SHALL require minimum karma score of 10 for community creation
- THE system SHALL require a description of at least 10 characters
- THE system SHALL allow only one community creation per user until approved by admin after the first 5
- THE system SHALL auto-create the community as "active" with creator as first moderator
- THE system SHALL record the timestamp of community creation

WHILE a community exists, THE system SHALL:
- Limit moderators to 10 per community
- Require moderator selection from users with at least 3 comments in the community
- Prevent community name changes after creation
- Archive communities with zero posts after 90 consecutive days
- Require all community rules to be written in clear, human-readable language
- Limit community descriptions to 5,000 characters
- Prohibit community descriptions from containing URLs
- Allow community moderators to set custom rules up to 2,000 characters
- Allow community owners to transfer ownership to another moderator
- Prevent creation of communities with identical names to deleted communities for 30 days

### Post Creation and Types

WHEN a member creates a post:
- THE system SHALL require a title between 5 and 200 characters
- THE system SHALL allow up to 5,000 characters in body text
- THE system SHALL permit three post types: text-only, link-only, or image-only
- THE system SHALL require at least one character of non-whitespace content
- THE system SHALL reject posts consisting only of emojis or symbols
- THE system SHALL allow up to 10 URLs per post
- THE system SHALL restrict image uploads to JPEG, PNG, GIF, or WebP formats
- THE system SHALL limit image sizes to 10MB maximum
- THE system SHALL block posts with more than 20 consecutive identical characters
- THE system SHALL prevent posts with more than 15% URL-encoded content
- THE system SHALL flag posts with URLs matching domain blacklists

WHILe a post exists, THE system SHALL:
- Store all post metadata including creation time, author, community, and type
- Allow editing of posts within 5 minutes of creation
- Allow deletion of posts by author or moderators
- Prevent deletion if post has received more than 5 votes
- Store post history for moderation review
- Count all votes regardless of author status
- Track the number of comments per post
- Store image metadata including file size, format, and dimensions
- Implement automatic thumbnail generation for images

### Upvote/Downvote System

WHEN a member votes on a post or comment:
- THE system SHALL allow only one vote per user per post/comment
- THE system SHALL permit upvote (+1) or downvote (-1) options
- THE system SHALL prevent users from voting on their own content
- THE system SHALL immediately apply vote counts and display results
- THE system SHALL allow users to change their vote (e.g., from upvote to downvote)
- THE system SHALL remove the vote change from karma count if it reverses previous vote
- THE system SHALL apply a 24-hour cooldown period before votes from new accounts count toward karma
- THE system SHALL ignore votes from banned or suspended accounts

WHILE a post exists, THE system SHALL:
- Calculate net score as upvotes minus downvotes
- Store individual vote records with user ID and timestamp
- Allow only one active vote per user per content item
- Prevent voting on posts that have been removed or archived
- Apply karma changes only after 24-hour cooling period for new users
- Reset karma changes if post or comment is deleted by moderator

### Commenting and Nested Replies

WHEN a member posts a comment:
- THE system SHALL allow up to 2,500 characters in comment body
- THE system SHALL permit nested replies with up to 5 levels deep
- THE system SHALL prevent comments consisting only of whitespace
- THE system SHALL prevent comments with more than 20 consecutive identical characters
- THE system SHALL prevent comments with more than 15% URL-encoded content
- THE system SHALL flag comments containing URLs matching domain blacklists
- THE system SHALL allow editing within 5 minutes of posting
- THE system SHALL allow deletion by author or moderator
- THE system SHALL store comment hierarchy with parent-child relationships
- THE system SHALL store exact nesting level for each comment

WHILE a comment exists, THE system SHALL:
- Display replies in threaded format beneath parent comment
- Only show replies to comments that have not been deleted
- Count votes independently for each comment
- Apply karma changes to comment author
- Prevent commenting on archived or removed posts
- Apply 24-hour cooldown for karma from new accounts
- Ignore votes from banned or suspended accounts
- Reset karma changes if comment is deleted by moderator
- Store metadata including creation time, deletion status, and parent ID
- Limit reply chains to 5 levels deep

### Karma System

WHILE a member has active posts and comments, THE system SHALL calculate karma according to:

- EACH upvote on post: +1 karma
- EACH downvote on post: -1 karma
- EACH upvote on comment: +1 karma
- EACH downvote on comment: -1 karma
- Capped karma gain per post/comment: +100 maximum

WHILE a member's karma is below 10, THE system SHALL prevent:

- Creating new communities
- Posting links in content
- Uploading images
- Commenting more than 5 times per day

THE system SHALL:

- Not consider votes from banned or suspended accounts when calculating karma
- Reset karma changes for posts/comments deleted by moderators
- Not display karma values less than 0 to other users (show as 0)
- Apply 24-hour cooling period before karma changes from new accounts are counted
- Prevent users from voting on their own posts or comments
- Remove karma if user's account is flagged for suspicious activity

### Post Sorting

THE system SHALL implement the following post sorting algorithms:

#### Hot
- Based on weighted combination of current votes and recency
- Weighted score = (log(upvotes + 1) + timestamp) / time_in_hours^1.8
- Updated every 5 minutes
- Considers community size as a multiplier
- Favors recent content with high engagement

#### New
- Sorted by creation timestamp (most recent first)
- No weighting of votes
- Updated in real-time
- Includes posts from past 24 hours
- No algorithmic manipulation

#### Top
- Sorted by total vote count (upvotes minus downvotes)
- High-value posts rise to top regardless of age
- Minimum 10 votes required to appear
- Updated on each vote change
- Includes all time data

#### Controversial
- Based on ratio of upvotes to downvotes with significant activity
- Controversy score = min(upvotes, downvotes) * log(total_votes)
- High controversy requires substantial voting from both sides
- Minimum 15 total votes required to appear
- Updated every 10 minutes

### Subscription System

WHEN a member subscribes to a community:
- THE system SHALL allow only one subscription per community per user
- THE system SHALL track subscription date in user-community pair
- THE system SHALL display subscribed communities prominently on user dashboard
- THE system SHALL show a "new" indicator for communities with posts since last visit
- THE system SHALL update feed priority based on subscription
- THE system SHALL allow unsubscription at any time
- THE system SHALL prevent subscription if user is banned from community
- THE system SHALL count subscriptions as an engagement metric
- THE system SHALL limit total subscriptions to 100 per user
- THE system SHALL display subscription count publicly for each community
- THE system SHALL block user from subscribing to community that doesn't exist

### User Profile

THE system SHALL display for each user:

- Username and display name
- Karma score (minimum 0)
- Account creation date
- Number of posts created
- Number of comments posted
- Number of communities subscribed to
- Number of communities created
- Badges (if applicable)
- Recent posts (last 10)
- Recent comments (last 10)
- Activity timeline (posts/comments grouped by date)
- Subscriptions list
- Communities created list (with moderation status)

THE system SHALL:

- Allow users to view private profile only after authentication
- Show public profile version to guests
- Prevent username changes more than once every 180 days
- Display account status (active, suspended, banned)
- Hide private information from unauthenticated users
- Allow users to download their profile data
- Include profile photo upload functionality (max 5MB, JPEG/PNG)
- Allow users to set bio (max 500 characters)

### Content Reporting

WHEN content is reported:

- THE system SHALL require selection of one of five reasons: hate speech, harassment/bullying, spam, misinformation, other
- THE system SHALL require authentication (guests cannot report)
- THE system SHALL limit users to 5 reports per day
- THE system SHALL prevent users from reporting their own content
- THE system SHALL allow report withdrawal within 24 hours if user is not banned
- THE system SHALL store reporter ID with report record
- THE system SHALL timestamp each report

THE system SHALL automatically respond based on report thresholds:

- After 3 reports from different users: content hidden from public feeds, "Pending Review" notice shown, comment and post locking enabled
- After 5 reports from different users: content flagged for human review, reporter notified
- After 7 reports from different users: post locked from further comments and votes
- After 15 reports from different users: user account suspended for investigation
- After 50 community-wide reports in 30 days: community archived
- After 20 moderator-related reports in 14 days: moderator removed

WHEN a post receives 3 reports from different users, THE system SHALL:

- Remove post from public feeds
- Show "Pending Review" notice
- Send automated notification to poster: "This post has been reported for potential violations. Please review our community guidelines."
- Block new comments and votes on the post
- Record all report timestamps and user IDs

WHEN a comment receives 5 reports from different users, THE system SHALL:

- Hide comment from public view
- Show "Reported" notice
- Send automated notification to commenter: "This comment has been reported for potential violations. Please review our community guidelines."
- Block additional replies
- Record all report timestamps and user IDs

## User Scenarios

### New User Journey

1. Guest visits website and browses communities without registration
2. Guest clicks "Join" on interesting post and prompted to register
3. Guest provides email, username, and password
4. Guest receives verification email and clicks link
5. Guest logs in after 24-hour cooling period
6. Guest subscribes to 3 communities based on interest
7. Guest views feed with new posts from subscribed communities
8. Guest upvotes a post and receives karma +1
9. Guest comments on a post and receives karma +2
10. Guest discovers their karma is now 3

### Active Member Journey

1. Member logs in and sees personalized feed sorted by "Hot"
2. Member scrolls through communities they've subscribed to
3. Member creates new post with image and receives 5 upvotes
4. Member receives +5 karma
5. Member replies to two comments on their post
6. Member receives +3 karma from replies
7. Member reports a spam comment with 2 votes
8. Member creates new community after reaching 10 karma
9. Member adds 3 moderators to new community
10. Member edits post title within 5-minute window

### Admin Moderation Journey

1. Admin logs in and accesses moderation dashboard
2. Admin reviews flagged content from automated reports
3. Admin receives notification of community with 45 reports in 20 days
4. Admin reviews report history and user actions
5. Admin decides to archive community and notifies members
6. Admin reviews user with 32 reports against their content
7. Admin suspends user account pending further investigation
8. Admin removes moderator from community with 18 reports
9. Admin checks user with negative karma for suspicious behavior
10. Admin reviews weekly moderation statistics

### Community Creation Journey

1. User reads community guidelines and decides to create a niche topic
2. User verifies they have 10+ karma
3. User navigates to "Create Community" button
4. User enters name "tech-crypto" (3-21 characters, alphanumeric)
5. User provides description: "Discussion about cryptocurrency technology and infrastructure"
6. User accepts community creation terms
7. System validates name uniqueness and checks banned terms
8. System creates community "tech-crypto" with user as primary moderator
9. System displays "Your community has been created. Invite others!"
10. System updates user profile to reflect new community creation

### Content Reporting Journey

1. Member encounters post with harmful content
2. Member clicks "Report" button on post
3. Member selects reason: "Hate speech"
4. Member confirms action
5. System records report with timestamp and member ID
6. System shows "Thank you for reporting. This will be reviewed."
7. Post accumulates 2 more reports from other members
8. System hides post from public view
9. System sends automated message to author: "This post has been reported..."
10. System sends admin notification with three reports, flagged for review

## Performance Expectations

THE system SHALL:

- Render community feeds within 1,500 milliseconds on average
- Process user votes and comments within 800 milliseconds
- Display user profiles within 1,200 milliseconds
- Support 5,000 concurrent users with full functionality
- Process report submissions within 1,000 milliseconds
- Support 500,000 active posts simultaneously
- Store all user data with guaranteed 99.9% availability
- Handle 30,000 API requests per minute during peak hours
- Maintain search response time under 1,000 milliseconds
- Serve high-traffic communities within 1,200 milliseconds
- Rebuild search indexes within 5 minutes after data updates
- Process image uploads within 3,000 milliseconds

## Error Handling

### Authentication Errors

WHEN authentication fails:
- THE system SHALL return code 401 when credentials are invalid
- THE system SHALL return code 403 when token is expired or revoked
- THE system SHALL return code 429 when too many login attempts
- THE system SHALL provide specific error messages ("invalid email", "password incorrect", "email not verified")
- THE system SHALL not reveal if username/email exists
- THE system SHALL prevent enumeration attacks
- THE system SHALL track failed attempts by IP

### Content Validation Errors

WHEN content validation fails:
- THE system SHALL return code 422 with detailed field-specific errors
- THE system SHALL specify which field failed (title length, image size, URL format, etc.)
- THE system SHALL provide maximum length constraints
- THE system SHALL return format requirements for invalid inputs
- THE system SHALL prevent content submission with partial errors
- THE system SHALL provide clear user-facing error messages

### Rate Limiting

WHEN rate limits are exceeded:
- THE system SHALL return code 429 with retry-after header
- THE system SHALL limit:
  - 20 posts per day per user
  - 50 comments per day per user
  - 25 replies per day per user
  - 5 reports per day per user
  - 3 image uploads per day per user
  - 10 link shares per day per user
- THE system SHALL reset limits daily at midnight Seoul time
- THE system SHALL allow temporary increase for verified users
- THE system SHALL log rate limit violations for abuse detection

### System Failures

WHEN system fails:
- THE system SHALL return generic 500 error with no technical details
- THE system SHALL log detailed errors for debugging
- THE system SHALL trigger automated alert to on-call engineer
- THE system SHALL maintain service with degraded mode (read-only)
- THE system SHALL provide user-friendly message: "We're experiencing technical difficulties. Please try again later."
- THE system SHALL implement circuit breaker pattern for dependent services
- THE system SHALL maintain availability even during external API failures

### Conflict Resolution

WHEN concurrent edits occur:
- THE system SHALL use optimistic locking with version numbers
- THE system SHALL reject edit if version doesn't match current
- THE system SHALL display conflict warning to user
- THE system SHALL allow user to resolve conflict manually
- THE system SHALL preserve both versions for review
- THE system SHALL log concurrent edit attempts

### Recovery Procedures

WHEN data is corrupted:
- THE system SHALL maintain hourly database backups
- THE system SHALL support point-in-time recovery
- THE system SHALL restore from last backup if corruption detected
- THE system SHALL notify users of data restoration
- THE system SHALL allow users to restore deleted content within 7 days
- THE system SHALL verify data integrity after recovery

## Security and Compliance

### Data Privacy

THE system SHALL:

- Store all user data in encrypted form at rest
- Use TLS 1.3 for all data transmission
- Never store passwords in plain text
- Use PBKDF2 with 120,000 iterations for password hashing
- Implement GDPR-compliant data processing
- Allow users to download their data
- Allow users to delete their account permanently
- Delete account data within 14 days of deletion request
- Never sell user data to third parties
- Provide clear privacy policy
- Allow user to opt-out of analytics
- Anonymize user data in public-facing statistics

### Content Moderation

THE system SHALL:

- Implement automated content scanning for prohibited categories
- Use external services for image recognition
- Maintain a domain blacklist of known malicious sites
- Allow human moderators to override automated decisions
- Store all moderated content for audit purposes
- Apply moderation rules consistently across all users
- Notify users when content is removed or banned
- Provide appeal process for removed content
- Limit administrative power with role-based access
- Never bypass user reporting for content removal

### Access Control

THE system SHALL:

- Implement RBAC based on actors (guest, member, admin)
- Enforce permission checks on every API endpoint
- Validate token claims before processing requests
- Implement API key rotation every 90 days
- Restrict admin access to internal interfaces
- Log all admin actions with audit trail
- Implement multi-factor authentication for admin accounts
- Limit super-user access to small group
- Require re-authentication for sensitive operations
- Never expose raw database queries to user input

### Audit Logging

THE system SHALL:

- Record all user activity for security audit
- Log all content creation, edits, and deletions
- Store all report submissions with metadata
- Track all authentication events
- Record all administrative actions
- Implement write-only audit logs
- Retain logs for minimum 180 days
- Protect audit logs from tampering
- Allow export of audit data for compliance
- Encrypt audit logs at rest

### Regulatory Compliance

THE system SHALL:

- Comply with GDPR for European users
- Comply with COPPA for users under 13
- Comply with CCPA for California residents
- Implement age-gating for adult content
- Provide data subject access requests
- Designate data protection officer
- Implement data processing agreements with third-parties
- Conduct annual security audits
- Implement breach notification protocol
- Obtain appropriate legal certifications

## Business Rules and Constraints

### Content Rules

#### Prohibited Content Types

WHEN a user attempts to submit content, THE system SHALL prohibit the following types of content:

- Content promoting hate, violence, or discrimination based on race, religion, gender, sexual orientation, disability, or nationality
- Threats of physical harm or direct threats to individuals or groups
- Non-consensual intimate imagery (revenge porn)
- Child exploitation material
- Illegal acts or instructions for criminal activity
- Spam, phishing, or malicious link schemes
- Impersonation of other users or entities
- Privacy violations (doxxing) including personally identifiable information

#### Content Validation Rules

WHEN a user submits a post, THE system SHALL validate content according to the following rules:

- Title must be between 5 and 200 characters
- Body text must be between 1 and 5000 characters
- URLs must be valid, properly formatted, and not include malicious or suspicious domains
- Image sizes must not exceed 10MB in file size
- Image formats must be JPEG, PNG, GIF, or WebP
- Posts must contain at least one character of non-whitespace content
- Posts cannot be submitted if they contain only emojis or symbols
- Posts must not contain more than 10 URLs
- Links to domain blacklists must be automatically rejected
- Content cannot contain more than 20 consecutive identical characters
- Posts must not exceed 15% of text that is URL-encoded

#### Image Moderation Rules

WHEN an image is uploaded, THE system SHALL:

- Automatically scan for known visual patterns that match prohibited content databases
- Apply content recognition algorithms to detect nudity, weapons, or extreme violence
- Flag images with text overlays that contain prohibited language
- Restrict image uploads if the metadata contains geolocation or identifying information
- Block images with embedded executable code or malicious payloads

### Karma Rules

#### Karma Earning Logic

WHILE a member has active posts and comments, THE system SHALL calculate karma according to the following rules:

- Each upvote on a post earns the author +1 karma
- Each downvote on a post deducts -1 karma from the author
- Each upvote on a comment earns the author +1 karma
- Each downvote on a comment deducts -1 karma from the author
- Karma earned from posts and comments is cumulative
- The maximum karma gain from any single post or comment is capped at +100

#### Karma Loss Prevention

WHILE a member's karma is below 10, THE system SHALL prevent the following:

- The ability to create new communities
- The ability to post with hyperlinks
- The ability to upload images or videos
- The ability to comment on posts more than 5 times per day

#### Karma Calculation Constraints

THE system SHALL:

- Not consider votes from banned or suspended accounts when calculating karma
- Reset any karma changes from posts or comments deleted by moderators
- Not display karma values less than 0 to other users (show as 0)
- Apply a 24-hour cooling period before karma changes from new accounts are counted
- Prevent users from voting on their own posts or comments
- Remove karma if a user's account is flagged for suspicious activity

### Community Rules

#### Community Creation Requirements

WHEN a user attempts to create a community, THE system SHALL require:

- The community name must be between 3 and 21 characters
- Community names must contain only alphanumeric characters and underscores
- Community names must not be identical to existing communities regardless of case
- Community names must not match common banned terms (e.g., "admin", "mod", "support", "help")
- Each member may only create one community at a time
- The creator must have a karma score of at least 10
- Community creation requires a title and a short description (minimum 10 characters)

#### Community Management Rules

WHILE a community exists, THE system SHALL enforce:

- Community moderators can only be selected from members who have 3+ posted comments
- Communities cannot have more than 10 moderators
- Community rules must be written in clear language and cannot exceed 2000 characters
- Community descriptions must not contain URLs
- Communities that remain inactive (no posts) for 90 consecutive days shall be archived
- Community names cannot be changed after creation
- Community creation must be approved by a system administrator for the first 5 communities created by a member

#### Community Subscription Rules

WHEN a member subscribes to a community, THE system SHALL:

- Allow only one subscription per community
- Allow users to unsubscribe at any time
- Display subscribed communities prominently in the user feed
- Show a "new" indicator for communities with posts since last visit
- Track subscription date for each user-community pair
- Prevent users from subscribing to communities they have been banned from
- Count subscription as an engagement metric for community popularity
- Prevent creation of communities with identical names to deleted communities for 30 days

### Reporting Rules

#### Content Reporting Triggers

WHEN a post or comment is reported, THE system SHALL:

- Require users to select a reason for reporting from a predefined list of 5 options:
  1. Hate speech
  2. Harassment/bullying
  3. Spam
  4. Misinformation
  5. Other

- Accept reports only from registered members (non-authenticated users cannot report)
- Limit users to 5 reports per day
- Prevent users from reporting their own content
- Allow users to withdraw their report within 24 hours
- Store the reporting user's ID with the report for audit purposes

#### Reporting Thresholds

WHEN a post or comment has been reported, THE system SHALL:

- Automatically hide content after 3 reports from different users
- Flag content for human review after 5 reports from different users
- Temporarily lock posts from further comments after 7 reports from different users
- Suspend the user who posted content after 15 reports from different users
- Archive a community if its posts accumulate 50 reports across all members in 30 days
- Remove a moderator if their community has 20 reports from users in 14 days

#### Automated Response Rules

IF a post receives 3 reports from different users, THEN THE system SHALL:

- Remove the post from public feeds
- Show a "Pending Review" notice to all users
- Send an automated notification to the poster: "This post has been reported for potential violations. Please review our community guidelines."
- Block the post from receiving new comments or votes
- Record all report timestamps and user IDs

IF a comment receives 5 reports from different users, THEN THE system SHALL:

- Hide the comment from public view
- Show a "Reported" notice to all users
- Send an automated notification to the commenter: "This comment has been reported for potential violations. Please review our community guidelines."
- Block the comment from receiving additional replies
- Record all report timestamps and user IDs

### System Limits

#### User Limits

THE system SHALL:

- Allow each user to have only one account
- Block automatic account creation from shared IP addresses (>10 accounts per IP)
- Limit maximum username length to 30 characters
- Require email verification before posting any content
- Limit new users from posting until 24 hours after registration (anti-spam)
- Prevent users from changing their username more than once every 180 days

#### Posting Limits

THE system SHALL:

- Limit posts per day: 20 per user
- Limit comments per day: 50 per user
- Limit replies per day: 25 per user
- Limit community creation: 5 per user
- Limit subscriptions: 100 per user
- Limit reports per day: 5 per user
- Limit image uploads: 3 per day
- Limit link sharing: 10 per day

#### Community Limits

THE system SHALL:

- Allow a maximum of 500,000 active communities per user
- Limit community member count to 10,000,000 per community
- Prohibit community names longer than 21 characters
- Restrict community description to 5000 characters
- Limit community moderators to 10 per community
- Set minimum community age before archive consideration: 90 days
- Allow only one community "featured" status at a time

#### Performance Constraints

THE system SHALL:

- Render community feeds within 1,500 milliseconds on average
- Process votes and comments within 800 milliseconds
- Display user profiles within 1,200 milliseconds
- Support 5,000 concurrent users with full functionality
- Process report submissions within 1,000 milliseconds
- Support 500,000 active posts simultaneously
- Store all user data with guaranteed 99.9% availability

---
> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*

