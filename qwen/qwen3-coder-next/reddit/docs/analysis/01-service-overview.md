# Reddit-like Community Platform - Requirements Specification Document

## 1. Service Overview

### 1.1 Service Vision

RedditClone is a community-driven social media platform that empowers users to create, share, and discover content within specialized interest communities. The platform aims to recreate the engaging, participatory experience of Reddit while providing a robust foundation for diverse communities to thrive.

The core philosophy is that passionate communities create valuable content, and users should have direct influence over what content rises to prominence. By combining community moderation with sophisticated algorithms, RedditClone delivers personalized, relevant content feeds while maintaining open access to public discussions.

### 1.2 Market Positioning

Key differentiators include:
- **Community Ownership**: Users create and govern their own communities
- **Transparent Voting**: Simple upvote/downvote system for content ranking
- **Open Access**: Public feeds accessible to non-members
- **Karma System**: Transparent reputation tracking
- **Moderation Autonomy**: Communities maintain unique culture and standards

### 1.3 Platform Goals

- Become primary destination for niche interest communities
- Focus on quality discussions rather than viral content
- Attract users seeking authentic, meaningful interactions

## 2. User Account Management

### 2.1 Registration

WHEN a user wants to create an account, THE system SHALL:
- Require valid email address with format validation
- Require unique password meeting security requirements (minimum 8 characters, mix of letters and numbers)
- Require unique username (alphanumeric, underscores, 3-20 characters)
- Validate email uniqueness and username availability
- Create account with default values for optional fields
- Send verification email (optional but recommended)

THE system SHALL provide:
- Clear error messages for validation failures
- Email format validation feedback
- Username availability checking in real-time

### 2.2 Login

WHEN a user submits login credentials, THE system SHALL:
- Validate email format and password requirements
- Verify email exists in system
- Verify password matches stored hash
- Generate JWT access token (15-minute expiry) and refresh token (7-day expiry)
- Update last login timestamp
- Return authentication tokens and user profile data

ERROR SCENARIOS:
- Invalid credentials: Return "Invalid email or password" message
- Locked account: Return "Account temporarily locked" message
- Unverified email: Return "Please verify your email address" message

### 2.3 Password Management

WHEN a user requests password change, THE system SHALL:
- Require current password for verification
- Validate new password meets security requirements
- Ensure new password differs from current password
- Hash new password with strong encryption
- Invalidate all active sessions after successful change

ERROR SCENARIOS:
- Incorrect current password: Return "Current password does not match" message
- New password too weak: Return specific strength requirements
- New password same as current: Return "New password must differ from current" message

### 2.4 Account Deletion

WHEN a user requests account deletion, THE system SHALL:
- Verify user authentication and password
- Delete all user-generated content (posts, comments)
- Delete user profile and authentication data
- Remove user from all subscriptions
- Invalidate all active sessions
- Schedule complete data erasure (7-day retention period)

ERROR SCENARIOS:
- Authentication failure: Return "Authentication required" message
- Deletion in progress: Return "Account deletion already pending" message

## 3. User Profile Management

### 3.1 Profile Structure

Each user profile includes:
- Display name (optional, 1-50 characters)
- Bio text (optional, 0-500 characters)
- Avatar URL (optional, stored as image reference)
- Username (unique identifier)
- Member since timestamp
- Total karma score
- Post count
- Comment count

### 3.2 Profile Viewing

WHEN any user views a profile page, THE system SHALL:
- Display display name, bio, and avatar
- Show username and member since date
- Display total karma score with color coding
- Show post count and comment count
- List all posts created by the user (with metadata)
- List all comments written by the user (with metadata)

### 3.3 Profile Editing

WHEN a user edits their profile, THE system SHALL:
- Allow display name changes (1-50 characters)
- Allow bio text updates (0-500 characters)
- Allow avatar image uploads (max 5MB, supported formats: JPG, PNG, GIF)
- Validate all input lengths and formats
- Update profile and return confirmation

ERROR SCENARIOS:
- Display name too long: Return "Display name must be 50 characters or less" message
- Bio too long: Return "Bio must be 500 characters or less" message
- Invalid image format: Return "Invalid image format. Use JPG, PNG, or GIF" message
- Image too large: Return "Image size must be under 5MB" message

## 4. Karma System

### 4.1 Karma Calculation

Every user has a single karma score calculated as:
- Initial karma: 0
- +1 karma for each upvote received on posts and comments
- -1 karma for each downvote received on posts and comments
- Karma adjustments when votes are removed or changed
- Karma can be negative (no minimum threshold)

### 4.2 Karma Display

WHEN karma is displayed, THE system SHALL:
- Show absolute karma score with color coding
- Show color based on score ranges:
  - Negative scores: Red (-500 or below), Orange (-100 to -499)
  - Neutral: Gray (0 to 99)
  - Positive: Green (100-499), Blue (500-999), Purple (1000+)
- Show tooltip with total votes breakdown when hovered

### 4.3 Karma Adjustments

WHEN a vote is cast on user content, THE system SHALL:
- Update karma immediately for both post/comment author
- Adjust karma when vote is changed or removed
- Log karma changes for audit purposes
- Ensure karma calculation is atomic and consistent

ERROR SCENARIOS:
- Vote on own content: Return "Cannot vote on own content" message
- Duplicate vote: Return "Vote already registered" message

## 5. Community Management

### 5.1 Community Creation

WHEN a user creates a community, THE system SHALL:
- Require unique community name (alphanumeric, underscores, 3-30 characters)
- Accept community description (optional, 0-1000 characters)
- Accept community icon upload (optional, max 5MB, supported formats)
- Set creator as community owner and default moderator
- Create community with zero subscribers initially

ERROR SCENARIOS:
- Duplicate community name: Return "Community name already taken" message
- Invalid community name: Return "Community name must be 3-30 alphanumeric characters" message
- Invalid icon format: Return "Invalid image format. Use JPG, PNG, or GIF" message
- Icon too large: Return "Icon size must be under 5MB" message

### 5.2 Community Browsing

WHEN users browse communities, THE system SHALL:
- Display all communities with subscriber counts
- Show community name, description, and icon
- Enable search by community name
- Support pagination for large community lists
- Sort options: Most subscribers, Newest, Name

### 5.3 Community Search

WHEN a user searches for communities, THE system SHALL:
- Match community names case-insensitively
- Support partial name matching
- Return results sorted by relevance
- Show top 10 results per search
- Highlight matching text in results

### 5.4 Community Display

Each community page shows:
- Community name, description, and icon
- Owner username and profile link
- Subscriber count
- Member since date
- Moderators list
- Community rules and guidelines

## 6. Subscription System

### 6.1 Subscription Creation

WHEN a user subscribes to a community, THE system SHALL:
- Verify community exists and is accessible
- Add user to community subscribers list
- Increment community subscriber count
- Update user's subscription list
- Return subscription confirmation

ERROR SCENARIOS:
- Already subscribed: Return "Already subscribed to this community" message
- Community not found: Return "Community not found" message
- Community banned user: Return "You are banned from this community" message

### 6.2 Subscription Removal

WHEN a user unsubscribes from a community, THE system SHALL:
- Verify user subscription exists
- Remove user from community subscribers list
- Decrement community subscriber count
- Update user's subscription list
- Return unsubscription confirmation

### 6.3 Subscription Listing

WHEN a user views their subscriptions, THE system SHALL:
- Display all subscribed communities
- Show community name, description, and icon
- Show subscriber counts
- Include unsubscribe button for each community
- Support pagination for large subscription lists

### 6.4 Subscription Requirements

WHEN creating a post, THE system SHALL:
- Verify user is subscribed to target community
- Return "Must be subscribed to create posts in this community" error if not
- Allow posting immediately after subscription
- Allow posting during subscription grace period (if applicable)

## 7. Post System

### 7.1 Post Creation

WHEN a user creates a post, THE system SHALL:
- Require post title (1-300 characters)
- Validate user subscription to target community
- Require one of three post types with respective fields:
  - **Text post**: Content text (required, 1-10,000 characters)
  - **Link post**: URL (required, valid HTTP/HTTPS format, max 2,000 characters)
  - **Image post**: Image upload (required, max 20MB, supported formats)
- Create post with initial vote score of 0
- Increment user post count
- Increment community post count

ERROR SCENARIOS:
- Title too long: Return "Title must be 300 characters or less" message
- Content too long: Return "Content must be 10,000 characters or less" message
- Invalid URL format: Return "Invalid URL format. Must start with http:// or https://" message
- Community not subscribed: Return "Must be subscribed to post in this community" message
- Invalid image format: Return "Invalid image format. Use JPG, PNG, GIF" message
- Image too large: Return "Image size must be under 20MB" message

### 7.2 Post Display

WHEN viewing a single post, THE system SHALL:
- Display title, author username with profile link
- Show community name with link to community page
- Show vote score with upvote/downvote buttons
- Show comment count with link to comments
- Display creation timestamp with "X time ago" format
- Show post content based on type:
  - **Text post**: Full content text
  - **Link post**: URL with domain name display
  - **Image post**: Image thumbnail and full image
- Show "edited" indicator if post was modified
- Display edit/delete buttons if user is author or moderator

### 7.3 Post Listing

WHEN viewing post lists (feeds), THE system SHALL:
- Display title, author username, community name
- Show vote score and comment count
- Display time since posted
- Show content preview based on post type:
  - **Text post**: First 200 characters of content
  - **Link post**: Domain name of URL
  - **Image post**: Image thumbnail
- Include post type indicator
- Show user's current vote status if authenticated

### 7.4 Post Editing

WHEN a user edits their post, THE system SHALL:
- Verify user is author or moderator
- Allow title modification (1-300 characters)
- Allow content modification based on post type
- Update "edited" timestamp
- Return updated post data

ERROR SCENARIOS:
- Not authorized: Return "Not authorized to edit this post" message
- Title too long: Return "Title must be 300 characters or less" message
- Content too long: Return "Content must be 10,000 characters or less" message
- Invalid URL format: Return "Invalid URL format" message
- Invalid image format: Return "Invalid image format" message
- Image too large: Return "Image size must be under 20MB" message

### 7.5 Post Deletion

WHEN a user deletes their post, THE system SHALL:
- Verify user is author or moderator
- Soft delete post (mark as deleted, preserve for moderation)
- Decrement user post count
- Decrement community post count
- Cascade delete all comments on post
- Return deletion confirmation

ERROR SCENARIOS:
- Not authorized: Return "Not authorized to delete this post" message
- Post already deleted: Return "Post already deleted" message

## 8. Post Voting System

### 8.1 Vote Mechanics

WHEN a user votes on a post, THE system SHALL:
- Allow upvote (+1 to score, +1 to karma)
- Allow downvote (-1 to score, -1 to karma)
- Allow vote removal (adjust score and karma accordingly)
- Prevent duplicate votes
- Enforce one vote per user per post
- Update vote immediately

### 8.2 Vote Changes

WHEN a user changes their vote, THE system SHALL:
- Remove previous vote
- Apply new vote
- Recalculate post score and user karma
- Update vote record with new value
- Return updated vote state

### 8.3 Vote Display

WHEN vote information is displayed, THE system SHALL:
- Show net vote score (upvotes - downvotes)
- Show user's current vote status if authenticated
- Color-code vote score (green for positive, red for negative)
- Show tooltip with vote breakdown when hovered

### 8.4 Vote Restrictions

ERROR SCENARIOS:
- Vote on own post: Return "Cannot vote on own post" message
- Not authenticated: Return "Must be logged in to vote" message
- Community banned user: Return "Cannot vote while banned" message
- Duplicate vote: Return "Vote already registered" message

## 9. Feed System

### 9.1 Home Feed

**Availability**: Authenticated users only
**Content**: Posts from subscribed communities

WHEN a user loads their home feed, THE system SHALL:
- Verify user authentication
- Fetch posts only from subscribed communities
- Support sorting by: Hot, New, Top, Controversial
- Support time filters for Top sorting
- Support pagination (20 posts per page)
- Show user's vote status for each post
- Display community subscription status

### 9.2 Popular Feed

**Availability**: All users (including guests)
**Content**: Posts from all communities

WHEN a user loads the popular feed, THE system SHALL:
- Accept unauthenticated requests
- Fetch posts from all communities
- Support sorting by: Hot, New, Top, Controversial
- Support time filters for Top sorting
- Support pagination (20 posts per page)
- Show post score and community information

### 9.3 Community Feed

**Availability**: All users (including guests)
**Content**: Posts from specific community

WHEN a user loads a community feed, THE system SHALL:
- Accept unauthenticated requests
- Fetch posts from specified community
- Support sorting by: Hot, New, Top, Controversial
- Support time filters for Top sorting
- Support pagination (20 posts per page)
- Show community information and subscription status

### 9.4 Sorting Algorithms

**Hot Sort**: Algorithm based on recent activity and engagement score
**New Sort**: Chronological ordering by creation timestamp
**Top Sort**: Score-based with configurable time filters:
- Today (24 hours)
- This week (7 days)
- This month (30 days)
- This year (365 days)
- All time (no time limit)
**Controversial Sort**: Posts with many votes but scores close to zero

### 9.5 Feed Display

WHEN feed posts are displayed, THE system SHALL:
- Show title, author username, community name
- Display vote score and comment count
- Show time since posted
- Include content preview based on post type
- Display post type indicator
- Show user's vote status if authenticated
- Include subscription status for community

## 10. Comment System

### 10.1 Comment Creation

WHEN a user creates a comment, THE system SHALL:
- Require comment content (1-5,000 characters)
- Allow nesting under posts or other comments
- Validate user is not banned from community
- Create comment with initial vote score of 0
- Increment comment count on parent post

ERROR SCENARIOS:
- Content too long: Return "Comment must be 5,000 characters or less" message
- Community banned user: Return "Cannot comment while banned" message
- Parent not found: Return "Parent comment or post not found" message

### 10.2 Comment Display

WHEN viewing comments, THE system SHALL:
- Show author username and profile link
- Display content with formatting support
- Show vote score with voting controls
- Show time since posted
- Display nested replies in thread structure
- Show comment deletion and editing buttons if authorized
- Indicate comment depth for visual hierarchy

### 10.3 Comment Sorting

WHEN comments are sorted, THE system SHALL:
- **Best sort**: Order by vote score descending
- **New sort**: Order by creation timestamp descending
- **Controversial sort**: Order by vote score proximity to zero with vote count factor
- Support pagination (20 comments per page)

### 10.4 Comment Editing

WHEN a user edits their comment, THE system SHALL:
- Verify user is author or moderator
- Allow content modification (1-5,000 characters)
- Update "edited" timestamp
- Return updated comment data

ERROR SCENARIOS:
- Not authorized: Return "Not authorized to edit this comment" message
- Content too long: Return "Comment must be 5,000 characters or less" message

### 10.5 Comment Deletion

WHEN a user deletes their comment, THE system SHALL:
- Verify user is author or moderator
- Soft delete comment (preserve for moderation)
- Decrement comment count on parent post
- Cascade delete all nested replies
- Return deletion confirmation

ERROR SCENARIOS:
- Not authorized: Return "Not authorized to delete this comment" message
- Comment already deleted: Return "Comment already deleted" message

## 11. Comment Voting System

### 11.1 Vote Mechanics

WHEN a user votes on a comment, THE system SHALL:
- Allow upvote (+1 to score, +1 to karma)
- Allow downvote (-1 to score, -1 to karma)
- Allow vote removal (adjust score and karma accordingly)
- Prevent duplicate votes
- Enforce one vote per user per comment
- Update vote immediately

### 11.2 Vote Changes

WHEN a user changes their vote, THE system SHALL:
- Remove previous vote
- Apply new vote
- Recalculate comment score and user karma
- Update vote record with new value
- Return updated vote state

### 11.3 Vote Display

WHEN comment vote information is displayed, THE system SHALL:
- Show net vote score (upvotes - downvotes)
- Show user's current vote status if authenticated
- Color-code vote score (green for positive, red for negative)
- Show tooltip with vote breakdown when hovered

### 11.4 Vote Restrictions

ERROR SCENARIOS:
- Vote on own comment: Return "Cannot vote on own comment" message
- Not authenticated: Return "Must be logged in to vote" message
- Community banned user: Return "Cannot vote while banned" message
- Duplicate vote: Return "Vote already registered" message

## 12. Moderation System

### 12.1 Moderator Roles

**Community Owner**:
- Created the community
- Has all moderator permissions
- Can add/remove other moderators
- Can remove themselves as owner (requires appointing new owner)

**Moderator**:
- Appointed by community owner or existing moderators
- Has content management permissions
- Cannot remove community owner
- Cannot remove other moderators (only owner can)

### 12.2 Moderator Permissions

**Content Management**:
- Delete any post in the community
- Delete any comment in the community
- View all content in the community

**User Management**:
- Ban users from the community
- Unban users from the community
- View banned users list
- Edit user comments and posts

**Community Settings**:
- Configure community settings
- View community analytics
- Manage community rules and guidelines

### 12.3 Ban System

WHEN a moderator bans a user, THE system SHALL:
- Verify moderator authorization
- Add user to community ban list
- Remove user from community subscriptions
- Prevent banned user from creating posts or comments
- Allow banned user to view content normally
- Log ban action with reason and timestamp

ERROR SCENARIOS:
- Not authorized: Return "Not authorized to ban users" message
- User already banned: Return "User already banned from this community" message
- Ban community owner: Return "Cannot ban community owner" message

WHEN a moderator unbans a user, THE system SHALL:
- Verify moderator authorization
- Remove user from community ban list
- Restore user subscription if previously subscribed
- Allow user to create posts and comments again
- Log unban action with timestamp

### 12.4 Moderator Hierarchy

**Permission Chain**:
- Owner can add/remove any moderator
- Owner can remove themselves
- Moderators can add other moderators
- Moderators cannot remove owners
- Moderators cannot remove other moderators
- New moderators require existing owner or moderator approval

## 13. Reporting System

### 13.1 Reporting Process

WHEN a user reports content, THE system SHALL:
- Require content ID (post or comment)
- Require report reason (text, 1-500 characters)
- Validate user is not banned from community
- Create report record with user, content, and reason
- Notify moderators of the community
- Return report confirmation

ERROR SCENARIOS:
- Already reported by user: Return "Content already reported by you" message
- Not authenticated: Return "Must be logged in to report content" message
- Reporting own content: Return "Cannot report your own content" message
- Community banned user: Return "Cannot report while banned" message

### 13.2 Report Viewing

WHEN moderators view community reports, THE system SHALL:
- Display all pending reports for their community
- Show reported content (post or comment)
- Show reporter username and profile link
- Show report reason
- Show report timestamp
- Include view content button
- Include review action buttons

### 13.3 Report Review Actions

WHEN a moderator reviews a report, THE system SHALL:
- **Approve report** (delete content):
  - Soft delete reported content
  - Remove report from pending list
  - Log moderator action
  - Notify reporter of action
- **Dismiss report** (keep content):
  - Remove report from pending list
  - Keep reported content intact
  - Log moderator action
  - Notify reporter of action

### 13.4 Report Resolution

WHEN a report is resolved, THE system SHALL:
- Remove report from pending queue
- Update report status (approved/dismissed)
- Log resolution timestamp and moderator
- Update reported content status if approved
- Maintain report history for audit

### 13.5 Report History

WHEN users view their report history, THE system SHALL:
- Show all reports they have submitted
- Display report status (pending/approved/dismissed)
- Show content type and summary
- Show resolution timestamp if resolved
- Show action taken if approved

## 14. Security and Authentication Requirements

### 14.1 Authentication

- JWT-based authentication with access and refresh tokens
- Access token: 15-minute expiry
- Refresh token: 7-day expiry with rotation
- Password hashing: bcrypt with salt rounds of 12
- Session management: Track active sessions per user
- Rate limiting: 100 requests per minute per IP

### 14.2 Data Protection

- Input validation: All user inputs sanitized and validated
- SQL injection prevention: Parameterized queries
- XSS prevention: Content escaping for user-generated HTML
- CSRF protection: Token-based protection for state changes
- HTTPS enforcement: All communications encrypted

### 14.3 Authorization

- Role-based access control (RBAC) for user types
- Community-based access control for community-specific actions
- Ownership-based access for content management
- Moderator access control for content moderation

## 15. Error Handling

### 15.1 Error Response Format

All error responses include:
- Error code (e.g., "VALIDATION_ERROR", "UNAUTHORIZED", "NOT_FOUND")
- Human-readable error message
- Timestamp of error occurrence
- Request ID for debugging

### 15.2 HTTP Status Codes

- 200: Success
- 201: Created
- 400: Bad Request (validation errors)
- 401: Unauthorized (authentication required)
- 403: Forbidden (insufficient permissions)
- 404: Not Found
- 409: Conflict (duplicate operations)
- 429: Too Many Requests (rate limiting)
- 500: Internal Server Error

## 16. Business Requirements Summary

### 16.1 User Experience Requirements

- Fast page loads (under 1 second for feeds)
- Real-time updates for votes and interactions
- Intuitive navigation and community discovery
- Clear feedback for all user actions
- Mobile-responsive design

### 16.2 Community Requirements

- Community-specific moderation and rules
- Transparent moderation actions
- Community growth tracking
- Engagement metrics for community health

### 16.3 Content Requirements

- Multiple post types for diverse content
- Threaded discussions with unlimited depth
- Fair voting system with karma tracking
- Quality content discovery through sorting algorithms

### 16.4 Moderation Requirements

- Community-driven content management
- Transparent moderation tools
- User appeal processes
- Fair and consistent enforcement

## 17. Non-Functional Requirements

### 17.1 Performance

- Page load times under 1 second for feeds
- API response times under 200ms for 95% of requests
- Support for 10,000 concurrent users
- Ability to process 1,000 posts per minute

### 17.2 Scalability

- Horizontal scaling for all services
- Database replication for read-heavy operations
- CDN for image and static asset delivery
- Caching layer for frequently accessed data

### 17.3 Reliability

- 99.9% uptime SLA
- Automatic failover for critical services
- Regular backups with Point-in-Time Recovery
- Comprehensive monitoring and alerting

### 17.4 Security

- Regular security audits and penetration testing
- Compliance with GDPR and data protection regulations
- Secure password policies and encryption
- Input validation and sanitization

## 18. Implementation Considerations

### 18.1 Technology Stack

- Backend: NestJS for robust, scalable architecture
- Database: Prisma ORM for type-safe database access
- Authentication: JWT tokens with refresh rotation
- File Storage: Cloud storage service for images
- Caching: Redis for high-performance data access

### 18.2 Architecture Patterns

- Microservices approach for scalability
- Event-driven architecture for real-time features
- Repository pattern for data access abstraction
- DTO pattern for API contracts

### 18.3 Deployment Strategy

- CI/CD pipeline for automated testing and deployment
- Blue-green deployment for zero-downtime releases
- Feature flags for gradual feature rollout
- A/B testing infrastructure for experimentation

## Conclusion

This requirements specification document provides comprehensive coverage of the Reddit-like community platform functionality. All business requirements, user workflows, error scenarios, and quality standards are documented to ensure successful implementation.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*