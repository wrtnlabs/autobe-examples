# Functional Requirements Specification

## 1. Service Overview

### 1.1. Service Name

**Reddit-Style Community Platform**

### 1.2. Service Purpose

A modern social media platform that enables users to create, share, and discover content within self-organized communities. Users can participate in discussions through posts and comments, express opinions through voting, and build reputation through a karma system. The platform emphasizes community-driven content moderation and user control over their experience.

### 1.3. Target Users

- Community members who want to share and discuss content
- Content creators looking to build audiences
- Community organizers who want to manage their spaces
- Anonymous users who want to consume content without account

### 1.4. Success Metrics

- 100,000 monthly active users in first year
- 1,000+ communities created in first 3 months
- 50% user retention at 30 days
- 99.9% system uptime

## 2. User Account Management

### 2.1. User Registration

**Business Rule**: Users must provide valid email and password to register.

**WHEN** a user submits registration with email and password:
- **THE** system **SHALL** create a new user account
- **THE** system **SHALL** generate a unique username from the email if no username provided
- **THE** system **SHALL** set initial karma score to 0
- **THE** system **SHALL** require unique email address across platform
- **THE** system **SHALL** require unique username across platform

**VALIDATION RULES**:
- Email must be valid format (RFC 5322)
- Password must be minimum 8 characters
- Username must be 3-21 characters (alphanumeric with underscores/hyphens)
- Email and username must be unique

### 2.2. User Login

**Business Rule**: Authenticated users can access protected features.

**WHEN** a user submits login credentials:
- **THE** system **SHALL** validate email and password
- **THE** system **SHALL** return authentication tokens on success
- **THE** system **SHALL** lock account after 5 consecutive failed attempts

### 2.3. Password Management

**WHEN** a user requests password change:
- **THE** system **SHALL** require current password verification
- **THE** system **SHALL** validate new password meets security requirements
- **THE** system **SHALL** update password hash in database

**WHEN** a user forgets password:
- **THE** system **SHALL** send password reset email with token
- **THE** system **SHALL** expire reset token after 1 hour
- **THE** system **SHALL** invalidate token after use

### 2.4. Account Deletion

**Business Rule**: Account deletion removes all user content.

**WHEN** a user requests account deletion:
- **THE** system **SHALL** delete all posts created by user
- **THE** system **SHALL** delete all comments created by user
- **THE** system **SHALL** delete user account record
- **THE** system **SHALL** delete all votes cast by user
- **THE** system **SHALL** delete user sessions
- **THE** system **SHALL** remove user from subscribed communities

**CASCADING DELETION**:
- Delete user sessions first
- Delete user votes
- Delete user subscriptions
- Delete user posts
- Delete user comments
- Delete user profile data
- Final user record deletion

## 3. User Profile

### 3.1. Profile Fields

**REQUIRED FIELDS**:
- Display Name: User-chosen name (up to 50 characters)
- Bio Text: User description (up to 1,000 characters)
- Avatar Image: User profile image (JPEG, PNG, max 5MB)
- Username: System-generated or user-chosen unique identifier
- Karma Score: Calculated sum of all post and comment karma

### 3.2. Profile Management

**WHEN** a user edits their profile:
- **THE** system **SHALL** allow display name modification
- **THE** system **SHALL** allow bio text modification
- **THE** system **SHALL** allow avatar image upload
- **THE** system **SHALL** validate uniqueness of display name
- **THE** system **SHALL** update modification timestamp

**WHEN** viewing another user's profile:
- **THE** system **SHALL** display display name, bio, avatar
- **THE** system **SHALL** display total karma score
- **THE** system **SHALL** display list of user's posts
- **THE** system **SHALL** display list of user's comments
- **THE** system **SHALL** indicate if viewing user is subscribed

### 3.3. Profile Privacy

**PUBLICLY VISIBLE**:
- Display name, bio, avatar
- Total karma score
- List of posts and comments
- Account creation date

**PRIVATE (visible only to user)**:
- Email address
- Password information
- Session tokens
- Private preferences

## 4. Karma System

### 4.1. Karma Calculation

**Business Rule**: Karma = Total upvotes received - Total downvotes received.

**WHEN** a user receives an upvote:
- **THE** system **SHALL** increase their karma by 1
- **THE** system **SHALL** apply to both posts and comments

**WHEN** a user receives a downvote:
- **THE** system **SHALL** decrease their karma by 1
- **THE** system **SHALL** apply to both posts and comments

**WHEN** a vote is removed:
- **THE** system **SHALL** reverse the karma adjustment
- **THE** system **SHALL** restore karma to previous value

**WHEN** a vote changes direction:
- **THE** system **SHALL** apply net adjustment of ±2
- **UPVOTE to DOWNVOTE**: Decrease karma by 2
- **DOWNVOTE to UPVOTE**: Increase karma by 2

**KARMA RULES**:
- Users can have negative karma scores
- Karma is cumulative across all content
- karma calculation must be atomic to prevent race conditions

### 4.2. Karma Display

**WHERE** karma is displayed:
- User profiles show total karma
- Posts and comments show author's karma
- Karma scores shown as integers (positive, negative, zero)
- Large numbers formatted (e.g., 1.5k, 2.3M)

## 5. Community Management

### 5.1. Community Creation

**WHEN** a user creates a community:
- **THE** system **SHALL** assign creator as community owner
- **THE** system **SH SHALL** require unique community name
- **THE** system **SHALL** accept optional description (max 500 chars)
- **THE** system **SHALL** accept optional icon image (max 5MB)
- **THE** system **SHALL** initialize subscriber count to 1

**COMMUNITY NAME REQUIREMENTS**:
- Alphanumeric characters only
- Underscores and hyphens allowed
- 3-21 characters in length
- Case-insensitive uniqueness
- Cannot start with number

### 5.2. Community Listing

**WHEN** browsing communities:
- **THE** system **SHALL** display community name, description, icon
- **THE** system **SHALL** display subscriber count
- **THE** system **SHALL** show subscription status for current user
- **THE** system **SHALL** support pagination (20 communities/page)
- **THE** system **SHALL** support search by name

### 5.3. Subscription Management

**WHEN** a user subscribes to a community:
- **THE** system **SHALL** add community to user's subscriptions
- **THE** system **SHALL** increment community subscriber count
- **THE** system **SHALL** allow immediate post creation in community

**WHEN** a user unsubscribes from a community:
- **THE** system **SHALL** remove community from user's subscriptions
- **THE** system **SHALL** decrement community subscriber count
- **THE** system **SHALL** prevent future post creation in community

**SUBSCRIPTION REQUIREMENTS**:
- Users must be subscribed to create posts in a community
- Banned users cannot subscribe or create content
- Duplicate subscription requests ignored

## 6. Post Management

### 6.1. Post Creation

**REQUIRED FIELDS**:
- Title: Non-empty string (max 300 characters)
- Community: Valid community ID (user must be subscribed)

**CONTENT TYPE FIELDS** (mutually exclusive):
- Text Post: Content text (min 1 character, max 50,000 characters)
- Link Post: URL (valid HTTP/HTTPS format)
- Image Post: Image upload (JPEG, PNG, GIF, WEBP, max 10MB)

**WHEN** a user creates a post:
- **THE** system **SHALL** validate all required fields
- **THE** system **SHALL** verify user subscription to community
- **THE** system **SHALL** set initial score to 0
- **THE** system **SHALL** set initial comment count to 0
- **THE** system **SHALL** increment community post count
- **THE** system **SHALL** set creation timestamp

**POST CREATION VALIDATION**:
- Title must not be empty
- User must be subscribed to target community
- Content type fields must match selected type
- Image files must pass security validation

### 6.2. Post Editing

**WHEN** a user edits their own post:
- **THE** system **SHALL** allow modification of title and content
- **THE** system **SHALL** update edit timestamp
- **THE** system **SHALL** maintain creation timestamp
- **THE** system **SHALL** apply same validation as creation

**IF** a user attempts to edit another user's post:
- **THE** system **SHALL** deny the request
- **THE** system **SHALL** return 403 Forbidden error

### 6.3. Post Deletion

**WHEN** a user deletes their own post:
- **THE** system **SHALL** soft delete the post (mark as deleted)
- **THE** system **SHALL** clear content fields
- **THE** system **SH SHALL** update karma scores
- **THE** system **SHALL** update community post count
- **THE** system **SHALL** maintain comment thread structure

**WHEN** a moderator deletes a post:
- **THE** system **SHALL** record moderator identity
- **THE** system **SHALL** store deletion reason
- **THE** system **SHALL** apply same soft deletion process

## 7. Post Voting System

### 7.1. Voting Rules

**ONE VOTE PER USER**:
- Users can have only one active vote per post
- Initial vote creates new vote record
- Subsequent votes modify existing record
- Vote removal deletes vote record

**VOTE TYPE ACTIONS**:
- Upvote: +1 to post score, +1 to voter karma, +1 to author karma
- Downvote: -1 to post score, -1 to voter karma, -1 to author karma
- Vote Change: ±2 to post score (net effect of removing old, adding new)
- Vote Removal: Reverse of original vote action

**OWN CONTENT RESTRICTION**:
- Users cannot vote on their own posts
- Attempted self-votes are denied
- Error message returned for self-voting

### 7.2. Voting Implementation

**WHEN** a user votes on a post:
- **THE** system **SHALL** create vote record (new vote)
- **THE** system **SHALL** update post score
- **THE** system **SHALL** adjust voter karma
- **THE** system **SHALL** adjust author karma
- **THE** system **SHALL** store vote timestamp and type

**WHEN** a user changes their vote:
- **THE** system **SHALL** update vote type in existing record
- **THE** system **SHALL** adjust post score by ±2
- **THE** system **SHALL** adjust karma scores accordingly

**WHEN** a user removes their vote:
- **THE** system **SHALL** delete vote record
- **THE** system **SHALL** reverse post score adjustment
- **THE** system **SHALL** reverse karma adjustments

### 7.3. Score Calculation

**POST SCORE FORMULA**:
- Score = (Total Upvotes) - (Total Downvotes)
- Minimum score: unlimited (can be negative)
- Score updates must be atomic
- Concurrent votes handled with optimistic locking

**DISPLAY REQUIREMENTS**:
- Score displayed as integer
- Positive scores shown in green
- Negative scores shown in red
- Zero score shown in neutral color

## 8. Content Feeds

### 8.1. Home Feed

**ACCESS REQUIREMENTS**:
- Requires user authentication
- Shows posts from subscribed communities only
- Default sorting: Hot

**WHEN** a user views home feed:
- **THE** system **SHALL** load posts from subscribed communities
- **THE** system **SHALL** apply requested sorting algorithm
- **THE** system **SHALL** support pagination
- **THE** system **SHALL** show vote score and comment count

**GUEST ACCESS**:
- Guest users redirected to login
- Error message for unauthenticated access

### 8.2. Popular Feed

**ACCESS REQUIREMENTS**:
- No authentication required
- Shows posts from all communities
- Default sorting: Hot

**WHEN** a user views popular feed:
- **THE** system **SHALL** load posts from all communities
- **THE** system **SHALL** apply requested sorting algorithm
- **THE** system **SHALL** support pagination
- **THE** system **SHALL** include posts with various scores

### 8.3. Community Feed

**ACCESS REQUIREMENTS**:
- No authentication required
- Shows posts from specific community
- Default sorting: New

**WHEN** a user views community feed:
- **THE** system **SHALL** load posts from specified community
- **THE** system **SHALL** apply requested sorting algorithm
- **THE** system **SHALL** show community metadata
- **THE** system **SHALL** show subscription status

### 8.4. Sorting Algorithms

#### Hot Sorting

**WHEN** hot sorting applied:
- **THE** system **SHALL** prioritize recent, high-engagement content
- **THE** system **SHALL** use algorithm: log10(upvotes + downvotes + 1) * sign(score) + seconds_since_post / 45000
- **THE** system **SHALL** apply decay factor to older content
- **THE** system **SHALL** display flame icon for hot posts

#### New Sorting

**WHEN** new sorting applied:
- **THE** system **SHALL** order by creation timestamp descending
- **THE** system **SHALL** ignore score in sorting
- **THE** system **SHALL** show newest content first

#### Top Sorting

**WHEN** top sorting applied:
- **THE** system **SHALL** order by vote score descending
- **THE** system **SHALL** support time filters: today, this week, this month, this year, all time
- **THE** system **SHALL** default to all time filter
- **THE** system **SHALL** include posts with any score

#### Controversial Sorting

**WHEN** controversial sorting applied:
- **THE** system **SHALL** calculate: min(upvotes, downvotes) / max(upvotes, downvotes, 1)
- **THE** system **SHALL** require minimum 10 total votes
- **THE** system **SHALL** prioritize balanced vote distribution
- **THE** system **SHALL** display balance scale icon

### 8.5. Feed Display Requirements

**WHEN** a post appears in feed:
- **THE** system **SHALL** show title (truncated if >100 chars)
- **THE** system **SHALL** show author username and link
- **THE** system **SHALL** show community name and link
- **THE** system **SHALL** show vote score and comment count
- **THE** system **SHALL** show time since posting
- **THE** system **SHALL** show content preview based on type:
  - Text: First 200 characters
  - Image: Thumbnail image
  - Link: Domain name

## 9. Comment System

### 9.1. Comment Creation

**WHEN** a user creates a comment:
- **THE** system **SHALL** accept comment content (min 1 character)
- **THE** system **SHALL** accept parent reference (post or comment)
- **THE** system **SHALL** limit content to 10,000 characters
- **THE** system **SHALL** set initial score to 0
- **THE** system **SHALL** increment post comment count
- **THE** system **SHALL** establish parent-child relationship

**COMMENT VALIDATION**:
- Content must not be empty
- Parent must be valid post or comment
- User must be authenticated
- Comment must belong to accessible community

### 9.2. Comment Threading

**UNLIMITED DEPTH SUPPORT**:
- Comments can reply to posts or other comments
- No artificial limit on nesting levels
- Visual indentation indicates reply hierarchy
- Thread integrity maintained during sorting

**THREAD VISUALIZATION**:
- Parent comments shown in main list
- Child comments indented below parents
- "view more replies" option for collapsed threads
- Expand/collapse functionality for readability

### 9.3. Comment Voting

**SAME RULES AS POST VOTING**:
- One vote per user per comment
- Upvote (+1 score) and downvote (-1 score)
- Vote change (±2 score adjustment)
- Vote removal (reverse adjustment)
- No voting on own content

**COMMENT KARMA**:
- Upvotes increase author karma by 1
- Downvotes decrease author karma by 1
- Vote changes apply ±2 karma adjustment
- Vote removal reverses karma adjustment

### 9.4. Comment Sorting

#### Best Sort (Default)

**WHEN** best sorting applied:
- **THE** system **SHALL** prioritize high-score comments
- **THE** system **SHALL** consider recency for tie-breaking
- **THE** system **SHALL** show most valuable comments first

#### New Sort

**WHEN** new sorting applied:
- **THE** system **SHALL** order by creation timestamp
- **THE** system **SHALL** show most recent comments first
- **THE** system **SHALL** ignore score in sorting

#### Controversial Sort

**WHEN** controversial sorting applied:
- **THE** system **SHALL** use same algorithm as post controversial
- **THE** system **SHALL** require minimum 10 total votes
- **THE** system **SHALL** show balanced opinion comments first

## 10. Moderation System

### 10.1. Moderator Roles

**COMMUNITY OWNER**:
- Created community automatically becomes owner
- Has all moderator permissions plus administrative rights
- Can add and remove moderators
- Can transfer ownership to other users
- Cannot be removed by moderators

**COMMUNITY MODERATOR**:
- Appointed by community owner
- Has content moderation permissions
- Can ban and unban users
- Cannot add or remove other moderators
- Cannot remove community owner

**MODERATOR HIERARCHY**:
- Owner > Moderator > Member > Guest
- Permissions cascade from higher to lower roles
- Owner has final authority on all decisions

### 10.2. Moderator Permissions

**POST MODERATION**:
- Delete any post in their community
- View reported posts
- Approve or dismiss reports
- Edit community settings

**COMMENT MODERATION**:
- Delete any comment in their community
- View reported comments
- Approve or dismiss reports
- View comment author information

**USER MODERATION**:
- Ban users from their community
- Unban users from their community
- View banned users list
- View user activity in community

### 10.3. Ban System

**TEMPORARY BANS**:
- 1 hour for minor violations
- 24 hours for repeated minor violations
- 7 days for significant violations
- 30 days for severe violations

**PERMANENT BANS**:
- Indefinite until manually unbanned
- Applied for severe or repeated violations
- Can be appealed through community process

**BAN EFFECTS**:
- Cannot create new posts in community
- Cannot create new comments in community
- Cannot edit existing posts or comments
- Can still view community content
- Can still view their own content

### 10.4. Content Management

**MODERATOR DELETION**:
- Soft delete posts and comments
- Record moderator identity and timestamp
- Store original content for audit
- Update karma scores for affected users

**RESTORATION**:
- Owners can restore recently deleted content
- Original content and comments preserved
- Community post count updated
- Karma scores recalculated

## 11. Reporting System

### 11.1. Report Submission

**WHEN** a user reports content:
- **THE** system **SHALL** require reason selection from predefined categories
- **THE** system **SHALL** accept optional user description
- **THE** system **SHALL** record reporting user and timestamp
- **THE** system **SHALL** store content metadata at time of reporting
- **THE** system **SHALL** prevent user from reporting own content

**REPORT CATEGORIES**:
- Spam or misleading content
- Hate speech or harassment
- Sexually explicit content
- Violence or dangerous content
- Copyright or legal violations
- Other policy violations
- Not a policy violation

### 11.2. Report Review

**WHEN** a moderator reviews a report:
- **THE** system **SHALL** display full content context
- **THE** system **SHALL** show all report information
- **THE** system **SHALL** provide approve/dismiss options
- **THE** system **SHALL** record moderator decision and explanation

**APPROVAL ACTIONS**:
- Remove or hide reported content
- Notify content author of removal
- Adjust author karma appropriately
- Record violation for progressive penalties

**DISMISSAL ACTIONS**:
- Remove report from active queue
- Record moderator explanation
- Update analytics for report accuracy

### 11.3. Report Resolution

**APPROVED REPORT**:
- Content removed from public view
- Author notified of removal and reason
- Vote on author's karma adjusted
- Author's account flagged for repeat violations

**DISMISSED REPORT**:
- Report removed from queue
- No action taken on content
- No notification to content author
- Report accuracy tracked for user analysis

## 12. Performance Requirements

### 12.1. Response Time Targets

**CRITICAL PATH**:
- Home feed load: < 2 seconds
- Popular feed load: < 2 seconds
- Community feed load: < 2 seconds
- Post creation: < 1 second
- Comment creation: < 1 second
- Vote action: < 1 second
- Profile load: < 1 second
- Comment sorting change: < 1 second

**DATA INTEGRITY**:
- Karma calculations: Atomic operations
- Score updates: Optimistic locking
- Concurrent vote handling: Transaction isolation
- Feed consistency: Snapshot isolation

### 12.2. Scalability Requirements

**USER CAPACITY**:
- Support 100,000 concurrent users
- Handle 1,000 posts per second during peak
- Support 100,000 comments per thread
- Maintain 99.9% uptime during peak load

**DATABASE**:
- Replication for read scaling
- Connection pooling for efficiency
- Indexing for common queries
- Sharding strategy for growth

## 13. Security Requirements

### 13.1. Authentication Security

**PASSWORD STORAGE**:
- bcrypt hashing with cost factor 12
- Salt per password
- No reversible encryption

**SESSION MANAGEMENT**:
- JWT access tokens (15 minutes)
- JWT refresh tokens (30 days)
- Token rotation on refresh
- Session storage with expiration

**ACCOUNT LOCKOUT**:
- 5 failed login attempts trigger lockout
- 15-minute lockout period
- Automatic unlock after period
- Admin override capability

### 13.2. Data Protection

**CONTENT SECURITY**:
- Image validation (file type, size, content scanning)
- XSS prevention in all user content
- SQL injection prevention with parameterized queries
- CSRF protection for state-changing operations

**DATA ENCRYPTION**:
- TLS 1.3 for all communications
- At-rest encryption for sensitive data
- Database encryption at rest
- Secure key management

### 13.3. Privacy Requirements

**USER DATA**:
- Email protected from public view
- Passwords never stored in plaintext
- Session tokens secure from theft
- User activity audit logging

**CONTENT PRIVACY**:
- Banned users' content accessible only to moderators
- Reporting user identity protected from content author
- Report data encrypted at rest
- Audit trail for compliance

## 14. Error Handling Requirements

### 14.1. Authentication Errors

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| AUTH_INVALID_CREDENTIALS | 401 | Invalid email or password |
| AUTH_ACCOUNT_NOT_FOUND | 401 | No account found |
| AUTH_TOKEN_EXPIRED | 401 | Token expired |
| AUTH_TOKEN_INVALID | 401 | Token invalid |
| AUTH_ACCOUNT_SUSPENDED | 403 | Account suspended |
| AUTH_EMAIL_NOT_VERIFIED | 403 | Email not verified |

### 14.2. Authorization Errors

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| AUTH_UNAUTHORIZED | 403 | Insufficient permissions |
| AUTH_BANNED | 403 | User banned from community |
| AUTH_OWN_CONTENT_PROHIBITED | 403 | Cannot perform action on own content |
| AUTH_MODERATOR_REQUIRED | 403 | Moderator permissions required |

### 14.3. Validation Errors

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| VALIDATION_INVALID_EMAIL | 400 | Invalid email format |
| VALIDATION_WEAK_PASSWORD | 400 | Password doesn't meet requirements |
| VALIDATION_DUPLICATE_EMAIL | 400 | Email already registered |
| VALIDATION_DUPLICATE_USERNAME | 400 | Username already taken |
| VALIDATION_POST_REQUIRED_FIELDS | 400 | Missing required post fields |
| VALIDATION_COMMENT_CONTENT_EMPTY | 400 | Comment content is empty |

### 14.4. Business Logic Errors

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| BUSINESS_NOT_SUBSCRIBED | 403 | Must subscribe to community |
| BUSINESS_POST_DELETED | 404 | Post no longer exists |
| BUSINESS_COMMENT_DELETED | 404 | Comment no longer exists |
| BUSINESS_VOTE_OWN_CONTENT | 400 | Cannot vote on own content |
| BUSINESS_BANNED_USER | 403 | User banned from community |

### 14.5. System Errors

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| SYSTEM_DATABASE_ERROR | 500 | Database error |
| SYSTEM_CACHE_ERROR | 500 | Cache error |
| SYSTEM_FILE_UPLOAD_ERROR | 500 | File upload error |
| SYSTEM_EMAIL_ERROR | 500 | Email service error |
| SYSTEM_RATE_LIMITED | 429 | Rate limit exceeded |

### 14.6. User Feedback

**ERROR DISPLAY REQUIREMENTS**:
- Clear, user-friendly error messages
- Error codes for troubleshooting
- Specific field validation messages
- Recovery options where applicable

**ERROR MESSAGE EXAMPLES**:
- "Invalid email or password. Please try again."
- "You must be subscribed to this community to post."
- "This post no longer exists or has been deleted."
- "Your vote on this content could not be recorded."
- "Content creation rate limit exceeded. Please try again later."