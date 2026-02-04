# Reddit-like Community Platform Requirements Specification

## 1. Introduction and Vision

The Reddit-like Community Platform is a social discussion platform that enables users to create and participate in topic-specific communities. Named RedditClone, this platform follows the core principles of community-driven content sharing with voting mechanisms, nested comment systems, and user reputation through karma scoring.

The platform centers around user-generated content organized into thematic communities where members can share posts, engage in discussions, and contribute to community moderation. Key features include:

- Multi-tiered user roles (Standard User, Moderator, Community Owner, Administrator)
- Content creation with multiple post types (text, link, image)
- Real-time voting systems affecting user reputation
- Nested comment threads with unlimited depth
- Advanced moderation tools with reporting mechanisms
- Personalized content feeds based on user subscriptions
- Community discovery and search functionality

This specification provides the comprehensive business requirements for all core platform features, ensuring a complete implementation that supports scalable community engagement while maintaining content quality through robust moderation systems.

## 2. Core Entities Overview

### 2.1 User Accounts

User accounts form the foundation of the platform with email-based authentication and profile management. Each user has:

- Unique email address for authentication
- Secure password with industry-standard hashing
- Chosen username serving as public identifier
- Profile with display name, bio, and avatar
- Single karma score representing community reputation
- Subscription list to communities of interest
- Role-based permissions within the system

### 2.2 Communities

Communities are topic-specific hubs where users share content and engage in discussions. Each community includes:

- Unique name following specific naming conventions
- Detailed description of community purpose
- Visual icon for identification
- Subscriber count reflecting community popularity
- Creator as initial Community Owner
- List of appointed moderators for content management
- Collection of user-generated posts
- Banned users list for access control

### 2.3 Posts

Posts are primary content units created by users within communities. Supported post types:

- Text posts containing written content
- Link posts sharing external URLs
- Image posts displaying attached visuals

Each post maintains:

- Required title serving as content headline
- Content based on post type
- Author information with user details
- Community association with归属 community
- Creation timestamp for temporal ordering
- Vote score tracking community reception
- Comment count summarizing engagement
- Visibility status for content management

### 2.4 Comments

Comments facilitate threaded discussions on posts with hierarchical nesting. Comment features:

- Text-based content responding to posts or other comments
- Author attribution to content creator
- Parent-child relationships for thread structure
- Creation timestamp for chronological ordering
- Vote score reflecting community approval
- Nesting with unlimited depth capability
- Status markers for content management

## 3. User Roles and Permissions

### 3.1 Role Definitions

The platform implements a four-tier role system governing user capabilities:

1. **Standard User (`user`)**: Base participant with general platform access
2. **Moderator (`moderator`)**: Community-specific authority with content management privileges
3. **Community Owner (`communityOwner`)**: Creator of specific community with administrative control
4. **System Administrator (`admin`)**: Platform-wide authority with unrestricted access

### 3.2 Permission Matrix

| Action | Standard User | Moderator | Community Owner | Administrator |
|--------|---------------|-----------|-----------------|---------------|
| Create posts/comments | ✅ | ✅ | ✅ | ✅ |
| Vote on content | ✅ | ✅ | ✅ | ✅ |
| Subscribe to communities | ✅ | ✅ | ✅ | ✅ |
| View community reports | ❌ | ✅ | ✅ | ✅ |
| Resolve community reports | ❌ | ✅ | ✅ | ✅ |
| Delete any post/comment | ❌ | ✅ | ✅ | ✅ |
| Ban/unban users | ❌ | ✅ | ✅ | ✅ |
| View banned users list | ❌ | ✅ | ✅ | ✅ |
| Add moderators | ❌ | ✅ | ✅ | ✅ |
| Remove moderators | ❌ | ❌ | ✅ | ✅ |
| Manage community settings | ❌ | ❌ | ✅ | ✅ |
| Access all system reports | ❌ | ❌ | ❌ | ✅ |
| Manage all users | ❌ | ❌ | ❌ | ✅ |
| Modify system settings | ❌ | ❌ | ❌ | ✅ |

### 3.3 Role Hierarchy

Roles follow a strict hierarchy with higher roles inheriting lower role permissions:

- Administrators have all platform capabilities
- Community Owners control their specific community with Moderator capabilities
- Moderators manage designated communities with User capabilities
- Standard Users have base platform interaction abilities

## 4. Karma System

### 4.1 Karma Calculation

Karma represents user reputation through a single numerical score that can be positive, negative, or zero. Calculation rules:

- New users start with 0 karma
- Upvotes on user content increase karma by 1
- Downvotes on user content decrease karma by 1
- Vote changes adjust karma by 2 (removing old, applying new)
- Vote removals reverse original karma adjustments
- Deleted content reverses associated karma changes
- Account deletion removes user's voting contributions

### 4.2 Voting Impact

User votes directly affect content creator karma scores:

- Post upvotes increase creator's karma by 1
- Post downvotes decrease creator's karma by 1
- Comment upvotes increase creator's karma by 1
- Comment downvotes decrease creator's karma by 1
- Vote changes produce doubled karma adjustments
- Self-voting prevention for content integrity

### 4.3 Karma Display

Karma visibility throughout the platform:

- Profile page displays total karma score
- User listings show karma alongside usernames
- Posts display author karma with username
- Comments display author karma with username
- Negative scores show with minus sign prefix

## 5. Community Structure

### 5.1 Community Creation

Users can create new communities following strict requirements:

- Unique names between 3-50 characters
- Alphanumeric characters, hyphens, and underscores only
- No leading/trailing hyphens or underscores
- Descriptions up to 1000 characters
- Icon images in JPEG/PNG/GIF formats under 5MB
- Automatic resizing to 256x256 dimensions

### 5.2 Subscription Management

Subscription mechanics for community access:

- "Subscribe" button for non-subscribers
- "Unsubscribe" button for subscribers
- Authentication required for subscription changes
- Real-time subscriber count updates
- Personalized subscription lists for users

### 5.3 Community Discovery

Platform-wide community exploration features:

- Paginated listings of all communities
- Real-time search with 300ms debouncing
- Preview information (name, description, icon, subscribers)
- Sorting by popularity, creation date, or alphabetical order
- Personalized recommendations for interested communities

### 5.4 Community Roles

Community-specific role management:

- Creator automatically becomes Community Owner
- Owner appoints additional Moderators
- Moderators can appoint other Moderators
- Owner exclusively removes Moderators
- Regular subscribers with default permissions
- Clear permission boundaries for each role

## 6. Content Management

### 6.1 Post Creation

Post composition with multi-type support:

- Authentication required for all post creation
- Community subscription mandatory for posting
- Title requirements (1-300 characters)
- Text posts supporting 40,000 characters
- Link posts with URL format validation
- Image posts with file type/size constraints
- Content preview generation for listings

### 6.2 Comment System

Threaded discussion capabilities:

- Text-only comment content
- Unlimited nesting depth for replies
- Parent-child relationship preservation
- Visual nesting level differentiation
- Collapse/expand functionality for readability
- Preservation of structure when deleting comments

### 6.3 Content Editing

User modification permissions:

- Authors can edit their own posts/comments
- Pre-population with existing content
- Maintained creation timestamps
- Updated last edited timestamps
- Permission validation before modifications
- Appropriate error messages for denials

### 6.4 Content Deletion

Deletion mechanics for content management:

- Authors can delete their own content
- Moderators can delete community content
- Soft deletion with placeholder maintenance
- Immediate feed removal upon deletion
- Reverse karma adjustments for deletions
- Audit logging of all deletion actions

## 7. Voting System

### 7.1 Post Voting

Voting mechanics for content rating:

- Three vote types (upvote, downvote, neutral)
- One active vote per user per content
- Self-voting prevention with notifications
- Score calculation (upvotes minus downvotes)
- Vote score display on all content views
- Visual indication of user's vote status

### 7.2 Comment Voting

Comment-specific voting features:

- Identical rules to post voting
- Real-time score updates without refresh
- Immediate karma adjustments for creators
- Visual voting state indicators
- Authentication requirements for voting

### 7.3 Vote Management

Vote change and removal handling:

- Single vote replacement on user action
- Score adjustments reflecting vote changes
- Karma recalculations for content creators
- Removal of votes with reversals
- Prevention of multiple votes per content

## 8. Moderation Features

### 8.1 Moderator Management

Moderation team administration:

- Community Owner appoints Moderators
- Moderators can appoint additional Moderators
- Community Owner exclusively removes Moderators
- List view of community Moderators
- Automatic privilege assignment
- Prevention of self-removal by Owners

### 8.2 Content Moderation

Community content management tools:

- Post deletion with author notifications
- Comment deletion with thread preservation
- Vote removal from moderated content
- Locking mechanisms for posts/comments
- Content transfer between communities
- Moderation action logging with details

### 8.3 User Moderation

Community access control features:

- User banning with restriction enforcement
- User unbanning with privilege restoration
- Persistent banned users list
- Ban status notifications to users
- Community-specific ban records
- Maintained content visibility for banned users

### 8.4 Moderator Interface

Moderation dashboard capabilities:

- Summary of pending community reports
- Quick access to management tools
- Recent activity log viewing
- Community health statistics
- Banned users list access
- Community settings management

## 9. Reporting System

### 9.1 Report Creation

User-driven content flagging:

- Post and comment reporting capabilities
- Predefined reason categories (spam, harassment, etc.)
- Required reason text (10-500 characters)
- Prevention of duplicate reports
- Anonymous reporting option
- Timestamp recording for reports
- Status tracking (pending, resolved, dismissed)

### 9.2 Report Management

Moderator report handling:

- Dashboard display of community reports
- Content preview with context
- Reporter information display
- Filtering by date, reason, content type
- Search functionality for reports
- Audit trail of all report actions

### 9.3 Report Resolution

Content action processing:

- Post removal with nested comment deletion
- Comment removal with reply preservation
- Creator notifications with reasons
- Karma adjustments for removed content
- Report status updates to resolved
- Reporter notifications of outcomes

### 9.4 Report Dismissal

Invalid report handling:

- Status change to dismissed
- Content preservation in feeds
- Reporter notifications with explanations
- Creator notifications of dismissal
- Retention in system for review
- False reporting detection mechanisms

## 10. Technical Requirements

### 10.1 Feed System

Content display mechanisms:

- Home feed (subscribed communities only)
- Popular feed (all platform content)
- Community feeds (specific communities)
- Authentication restrictions for feeds
- Consistent post display formatting
- Real-time voting state awareness
- Pagination with fixed page sizes
- Sorting by hot, new, top, controversial

### 10.2 Security Requirements

Platform protection measures:

- Industry-standard password hashing
- JWT token authentication (30-min access)
- Refresh token rotation (30-day cycle)
- Rate limiting for authentication endpoints
- HTTPS encryption for all communications
- Role-based access control enforcement
- Data encryption for sensitive information
- Account lockout after failed attempts

### 10.3 Performance Standards

System responsiveness benchmarks:

- Feed loading within 500 milliseconds
- Search results within 1 second
- Report processing within 1 second
- Notification delivery within 5 seconds
- Concurrent user support for 1000+ users
- Caching for frequently accessed content
- Graceful degradation under high load
- Real-time notification delivery

### 10.4 Compliance Measures

Regulatory adherence requirements:

- GDPR compliance for European users
- Data retention policies for 30+ days
- Right to data access and deletion
- Age verification for account creation
- Audit logging for security events
- Data encryption at rest and in transit
- Privacy dashboard for user controls
