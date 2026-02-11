# Reddit-Style Community Platform

## 1. Service Overview

### 1.1 Executive Summary

The Reddit-Style Community Platform is a modern social media application designed to foster vibrant online communities where users can share content, engage in discussions, and build networks around shared interests. This platform combines the proven success of community-driven content platforms with enhanced moderation capabilities, improved user experience, and robust technical infrastructure.

The platform enables users to create and join communities based on specific topics, share content through posts, participate in threaded discussions, and build reputation through a karma-based scoring system. Users can customize their experience through multiple feed types with various sorting algorithms, ensuring content relevance and engagement.

### 1.2 Vision and Strategic Goals

The platform's vision is to become the premier destination for community-driven content discovery and discussion, empowering users to build and participate in communities that matter to them while fostering constructive dialogue and positive engagement.

**Short-term Goals (0-12 months)**:
- Launch fully functional platform with all core features
- Establish user base of 100,000 active monthly users
- Create 5,000+ active communities across diverse topics
- Achieve 4.5+ user satisfaction rating
- Build reputation for fair moderation and community health

**Medium-term Goals (12-24 months)**:
- Scale to 1 million active monthly users
- Develop premium features for power users and communities
- Establish partnerships with content creators and organizations
- Implement advanced analytics and community management tools
- Achieve 99.9% uptime and sub-second response times

**Long-term Goals (24-36 months)**:
- Become a top-10 social platform in target markets
- Develop AI-powered community health tools
- Expand to mobile-first experiences
- Implement comprehensive monetization options
- Establish self-sustaining community governance models

### 1.3 Target Audience

The platform serves four primary user segments:

**Community Enthusiasts**: Users who actively seek out and participate in communities based on their interests. They value diverse content, meaningful discussions, and opportunities to connect with like-minded individuals.

**Content Creators**: Users who regularly share posts, comments, and other content. They value tools for content creation, audience engagement, and reputation building through the karma system.

**Community Creators**: Users who establish and manage their own communities. They seek powerful moderation tools, community analytics, and customization options to maintain their community's unique culture.

**Casual Users**: Users who consume content without actively creating or managing communities. They value ease of use, content discovery, and quality content experiences.

## 2. Core Functional Requirements

### 2.1 User Account Management

#### 2.1.1 User Registration

**WHEN** a user wants to create an account,
**THE** system SHALL require email address, password, and unique username,
**AND** the system SHALL validate email format, password strength, and username uniqueness,
**AND** the system SHALL create a new user record with initial karma score of 0.

**WHEN** registration validation fails,
**THE** system SHALL provide specific error messages for each validation failure,
**AND** the system SHALL NOT create a user record until all validations pass.

**WHEN** registration succeeds,
**THE** system SHALL send a verification email to the user,
**AND** the system SHALL log the user in automatically after successful registration,
**AND** the system SHALL create a default user profile with empty bio and avatar.

#### 2.1.2 User Login

**WHEN** a user submits login credentials,
**THE** system SHALL verify the email and password against stored credentials,
**AND** the system SHALL validate the user account is not disabled or banned,
**AND** the system SHALL generate JWT access and refresh tokens upon successful authentication.

**WHEN** login credentials are invalid,
**THE** system SHALL provide generic "invalid credentials" error message,
**AND** the system SHALL NOT distinguish between invalid email and invalid password,
**AND** the system SHALL implement rate limiting after multiple failed attempts.

**WHEN** login succeeds,
**THE** system SHALL set secure HTTP-only cookies for token storage,
**AND** the system SHALL record login timestamp and IP address for security.

#### 2.1.3 Password Management

**WHEN** a user wants to change their password,
**THE** system SHALL require the current password for verification,
**AND** the system SHALL require a new password meeting strength requirements,
**AND** the system SHALL re-authenticate the user with the new password after successful change.

**WHEN** a user forgets their password,
**THE** system SHALL allow password reset through email verification,
**AND** the system SHALL send a time-limited password reset link,
**AND** the system SHALL invalidate previous tokens when password is successfully changed.

#### 2.1.4 Account Deletion

**WHEN** a user requests account deletion,
**THE** system SHALL require password verification for security,
**AND** the system SHALL permanently delete all user data including posts, comments, and profile information,
**AND** the system SHALL cascade delete all user-generated content and associations.

**WHEN** account deletion completes,
**THE** system SHALL terminate all active sessions,
**AND** the system SHALL remove all user data from active systems within 30 days,
**AND** the system SHALL provide deletion confirmation to the user.

### 2.2 User Profile Management

#### 2.2.1 Profile Information

**WHEN** a user creates their profile,
**THE** system SHALL allow setting display name (up to 50 characters), bio text (up to 500 characters), and avatar image,
**AND** the system SHALL generate a unique profile URL based on username,
**AND** the system SHALL store profile information separately from core account data.

**WHEN** a user views their own profile,
**THE** system SHALL display editable versions of all profile fields,
**AND** the system SHALL show editing options for display name, bio, and avatar,
**AND** the system SHALL provide profile preview functionality.

#### 2.2.2 Profile Display

**WHEN** a user views another user's profile,
**THE** system SHALL display the display name, bio, and avatar,
**AND** the system SHALL show total karma score, post count, and comment count,
**AND** the system SHALL provide links to view all posts and comments by that user.

**WHEN** viewing a user's content list,
**THE** system SHALL paginate results when content exceeds page size,
**AND** the system SHALL filter out deleted or banned content,
**AND** the system SHALL display content with post title, community, score, and timestamp.

### 2.3 Karma System

#### 2.3.1 Karma Calculation

**WHEN** a user receives a vote on their content,
**THE** system SHALL adjust karma score by +1 for upvotes or -1 for downvotes,
**AND** the system SHALL immediately update the karma score in the user's profile,
**AND** the system SHALL log vote changes for audit trail.

**WHEN** a user's vote is removed or changed,
**THE** system SHALL reverse the karma adjustment for the original vote,
**AND** the system SHALL apply the new karma adjustment for the changed vote,
**AND** the system SHALL calculate net karma change when votes change direction.

**WHEN** karma calculation completes,
**THE** system SHALL ensure karma score can be negative,
**AND** the system SHALL update all cached karma values across the system.

#### 2.3.2 Karma Display

**WHEN** karma scores are displayed,
**THE** system SHALL show formatted numbers (e.g., "1.2k" for 1200, "1.5M" for 1500000),
**AND** the system SHALL show exact number for karma values under 1000,
**AND** the system SHALL include +/- indicators for positive and negative karma.

### 2.4 Community Management

#### 2.4.1 Community Creation

**WHEN** a user wants to create a community,
**THE** system SHALL require a unique community name (alphanumeric, underscores, hyphens only),
**AND** the system SHALL require a community description text,
**AND** the system SHALL allow uploading a community icon image.

**WHEN** community creation is submitted,
**THE** system SHALL validate community name uniqueness and format,
**AND** the system SHALL set the creating user as community owner,
**AND** the system SHALL create the community record with subscriber count of 0.

**WHEN** community creation fails validation,
**THE** system SHALL provide specific error messages for each validation failure,
**AND** the system SHALL NOT create the community until validations pass.

#### 2.4.2 Community Browse and Search

**WHEN** users browse communities,
**THE** system SHALL display a paginated list of all communities,
**AND** the system SHALL show community name, description, icon, and subscriber count,
**AND** the system SHALL sort communities by subscriber count by default.

**WHEN** users search for communities,
**THE** system SHALL provide search functionality by community name,
**AND** the system SHALL support partial name matching and fuzzy search,
**AND** the system SHALL display search results in a dedicated search view.

#### 2.4.3 Community Details

**WHEN** a user views a community page,
**THE** system SHALL display community information including name, description, and icon,
**AND** the system SHALL show subscriber count, creation date, and owner information,
**AND** the system SHALL provide navigation to community posts, rules, and settings.

### 2.5 Subscription Management

#### 2.5.1 Subscribe and Unsubscribe

**WHEN** a user subscribes to a community,
**THE** system SHALL create a subscription record linking user and community,
**AND** the system SHALL increment the community's subscriber count,
**AND** the system SHALL add the community to the user's subscribed communities list.

**WHEN** a user unsubscribes from a community,
**THE** system SHALL remove the subscription record,
**AND** the system SHALL decrement the community's subscriber count,
**AND** the system SHALL remove the community from the user's subscribed communities list.

**WHEN** subscription state changes,
**THE** system SHALL update subscription status in real-time UI indicators,
**AND** the system SHALL refresh all feed caches for the affected user.

#### 2.5.2 Subscribed Communities List

**WHEN** a user views their subscribed communities,
**THE** system SHALL display all communities they are subscribed to,
**AND** the system SHALL show subscriber counts and community icons,
**AND** the system SHALL provide option to unsubscribe directly from the list.

#### 2.5.3 Subscription Requirements

**WHEN** a user attempts to create a post in a community,
**THE** system SHALL verify they are subscribed to that community,
**AND** the system SHALL prevent post creation if not subscribed,
**AND** the system SHALL prompt user to subscribe before proceeding.

### 2.6 Post Management

#### 2.6.1 Post Creation

**WHEN** a user creates a post,
**THE** system SHALL require a title (up to 300 characters),
**AND** the system SHALL require selection of one post type (text, link, or image),
**AND** the system SHALL validate user is subscribed to the target community.

**WHEN** creating a text post,
**THE** system SHALL require or allow text content (optional but recommended),
**AND** the system SHALL validate content length if provided,
**AND** the system SHALL render markdown or plain text content as specified.

**WHEN** creating a link post,
**THE** system SHALL require a valid URL format,
**AND** the system SHALL validate URL is accessible and secure,
**AND** the system SHALL extract domain name for display purposes.

**WHEN** creating an image post,
**THE** system SHALL require image upload within size and format limits,
**AND** the system SHALL generate thumbnail and optimized versions,
**AND** the system SHALL store image metadata including dimensions and file size.

**WHEN** post creation fails validation,
**THE** system SHALL provide specific error messages for each validation failure,
**AND** the system SHALL NOT create the post until all validations pass.

#### 2.6.2 Post Editing

**WHEN** a user wants to edit their own post,
**THE** system SHALL allow editing of title, content, and media,
**AND** the system SHALL maintain post history with edit timestamps,
**AND** the system SHALL notify followers of the post if significant changes are made.

**WHEN** post editing completes,
**THE** system SHALL update the last edited timestamp,
**AND** the system SHALL preserve original creation timestamp,
**AND** the system SHALL maintain edit history for moderation review.

#### 2.6.3 Post Deletion

**WHEN** a user deletes their own post,
**THE** system SHALL permanently remove the post and all associated data,
**AND** the system SHALL cascade delete all comments on that post,
**AND** the system SHALL remove all votes and update karma scores accordingly.

**WHEN** post deletion completes,
**THE** system SHALL update community post counts,
**AND** the system SHALL remove post from all feeds,
**AND** the system SHALL invalidate any cached post data.

#### 2.6.4 Post Display

**WHEN** a user views a single post,
**THE** system SHALL display title, author, community, vote score, comment count,
**AND** the system SHALL display full content based on post type (text, link preview, or image),
**AND** the system SHALL show timestamp with relative time (e.g., "3 hours ago").

**WHEN** displaying post information,
**THE** system SHALL show community information and navigation options,
**AND** the system SHALL show author profile link and karma score,
**AND** the system SHALL show voting controls for logged-in users.

### 2.7 Post Voting System

#### 2.7.1 Vote Submission

**WHEN** a user upvotes a post,
**THE** system SHALL increment post score by +1,
**AND** the system SHALL increment author's karma by +1,
**AND** the system SHALL record vote type as "upvote" linked to user and post.

**WHEN** a user downvotes a post,
**THE** system SHALL decrement post score by -1,
**AND** the system SHALL decrement author's karma by -1,
**AND** the system SHALL record vote type as "downvote" linked to user and post.

**WHEN** a user changes their vote from upvote to downvote (or vice versa),
**THE** system SHALL reverse the previous vote's effect on score and karma,
**AND** the system SHALL apply the new vote's effect on score and karma,
**AND** the system SHALL update vote type in the vote record.

**WHEN** a user removes their vote entirely,
**THE** system SHALL reverse the vote's effect on score and karma,
**AND** the system SHALL delete the vote record,
**AND** the system SHALL set vote status to "removed" for audit trail.

#### 2.7.2 Vote Restrictions

**WHEN** a user attempts to vote on a post,
**THE** system SHALL verify the user is logged in,
**AND** the system SHALL prevent voting on their own post,
**AND** the system SHALL prevent multiple votes from the same user.

**WHEN** vote validation fails,
**THE** system SHALL provide appropriate error messages,
**AND** the system SHALL NOT create or modify the vote record.

### 2.8 Content Feeds

#### 2.8.1 Home Feed

**WHEN** a logged-in user accesses their home feed,
**THE** system SHALL retrieve posts only from communities the user is subscribed to,
**AND** the system SHALL apply default sorting algorithm (hot),
**AND** the system SHALL paginate results based on feed size.

**WHEN** feed generation completes,
**THE** system SHALL cache results for performance optimization,
**AND** the system SHALL refresh cache when user subscribes/unsubscribes from communities.

#### 2.8.2 Popular Feed

**WHEN** any user (logged-in or not) accesses the popular feed,
**THE** system SHALL retrieve posts from all communities across the platform,
**AND** the system SHALL apply sorting algorithm based on user selection,
**AND** the system SHALL respect content visibility and post status.

**WHEN** feed is accessed by non-authenticated users,
**THE** system SHALL provide limited feed functionality,
**AND** the system SHALL prompt for login if user interacts with content.

#### 2.8.3 Community Feed

**WHEN** a user accesses a community feed,
**THE** system SHALL retrieve all posts from that specific community,
**AND** the system SHALL apply sorting algorithm based on user selection,
**AND** the system SHALL show community information alongside posts.

#### 2.8.4 Sorting Algorithms

**WHEN** sorting by "Hot":
**THE** system SHALL prioritize recent posts with high upvote ratios,
**AND** the system SHALL use time-decay algorithm for age relevance,
**AND** the system SHALL balance post age with engagement metrics.

**WHEN** sorting by "New":
**THE** system SHALL show most recently created posts first,
**AND** the system SHALL use creation timestamp as primary sorting factor,
**AND** the system SHALL maintain chronological order regardless of engagement.

**WHEN** sorting by "Top":
**THE** system SHALL order posts by vote score with optional time filter,
**AND** the system SHALL support filters: today, this week, this month, this year, all time,
**AND** the system SHALL use score sum for tie-breaking when scores are equal.

**WHEN** sorting by "Controversial":
**THE** system SHALL prioritize posts with many votes but score close to zero,
**AND** the system SHALL use vote count variance as primary factor,
**AND** the system SHALL identify divisive content that receives mixed reactions.

#### 2.8.5 Pagination and Performance

**WHEN** feeds are paginated,
**THE** system SHALL support cursor-based or offset-based pagination,
**AND** the system SHALL limit page size to prevent performance degradation,
**AND** the system SHALL provide "load more" or infinite scroll functionality.

**WHEN** feed performance optimization is required,
**THE** system SHALL implement database query optimization,
**AND** the system SHALL use caching for frequently accessed feeds,
**AND** the system SHALL implement rate limiting for feed requests.

### 2.9 Post List Display

#### 2.9.1 Feed Item Display

**WHEN** displaying posts in any feed list,
**THE** system SHALL show title, author username, community name,
**AND** the system SHALL show vote score and comment count,
**AND** the system SHALL show time since posted using relative time format.

**WHEN** displaying text posts in feed,
**THE** system SHALL show first 200 characters of content,
**AND** the system SHALL truncate at word boundaries for readability,
**AND** the system SHALL indicate continuation with ellipsis.

**WHEN** displaying image posts in feed,
**THE** system SHALL show thumbnail image with aspect ratio preservation,
**AND** the system SHALL show image dimensions if available,
**AND** the system SHALL provide image loading optimization.

**WHEN** displaying link posts in feed,
**THE** system SHALL show domain name of the URL,
**AND** the system SHALL extract and display main domain from URL,
**AND** the system SHALL show link preview if available.

#### 2.9.2 List Layout

**WHEN** post lists are rendered,
**THE** system SHALL use card-based layout for individual posts,
**AND** the system SHALL maintain consistent spacing and styling,
**AND** the system SHALL support responsive design for mobile devices.

### 2.10 Comment System

#### 2.10.1 Comment Creation

**WHEN** a user creates a comment,
**THE** system SHALL require comment content (up to 10,000 characters),
**AND** the system SHALL validate content length and appropriateness,
**AND** the system SHALL associate comment with parent post.

**WHEN** a user replies to a comment,
**THE** system SHALL allow creating nested comment responses,
**AND** the system SHALL maintain parent-child relationships,
**AND** the system SHALL support unlimited comment depth.

**WHEN** comment creation completes,
**THE** system SHALL increment post's comment count,
**AND** the system SHALL record comment timestamp and user information,
**AND** the system SHALL update all relevant cache entries.

#### 2.10.2 Comment Editing and Deletion

**WHEN** a user edits their own comment,
**THE** system SHALL allow modification of comment content,
**AND** the system SHALL maintain edit history with timestamps,
**AND** the system SHALL preserve original creation timestamp.

**WHEN** a user deletes their own comment,
**THE** system SHALL permanently remove the comment,
**AND** the system SHALL cascade delete all reply comments,
**AND** the system SHALL decrement post's comment count.

#### 2.10.3 Comment Voting

**WHEN** a user votes on a comment,
**THE** system SHALL apply same rules as post voting,
**AND** the system SHALL adjust comment score and author karma,
**AND** the system SHALL allow vote changes and removal.

#### 2.10.4 Comment Sorting

**WHEN** sorting comments by "Best":
**THE** system SHALL prioritize comments with highest vote scores,
**AND** the system SHALL consider comment age and engagement metrics,
**AND** the system SHALL display top comments first.

**WHEN** sorting comments by "New":
**THE** system SHALL show most recently created comments first,
**AND** the system SHALL maintain chronological order,
**AND** the system SHALL preserve thread structure.

**WHEN** sorting comments by "Controversial":
**THE** system SHALL show comments with many votes but low scores,
**AND** the system SHALL identify divisive discussion content,
**AND** the system SHALL balance controversial and high-scoring comments.

### 2.11 Community Moderation

#### 2.11.1 Moderator Roles and Hierarchy

**WHEN** a community is created,
**THE** system SHALL assign the creating user as community owner,
**AND** the system SHALL grant owner all moderation permissions,
**AND** the system SHALL allow owner to add moderators.

**WHEN** adding moderators,
**THE** system SHALL allow owner to grant moderator status to users,
**AND** the system SHALL allow moderators to add other moderators,
**AND** the system SHALL prevent moderators from removing owners.

**WHEN** removing moderators,
**THE** system SHALL allow owners to remove moderator status,
**AND** the system SHALL prevent moderators from removing each other,
**AND** the system SHALL require owner-level permissions for moderator removal.

#### 2.11.2 Moderator Permissions

**WHEN** a moderator wants to delete content,
**THE** system SHALL allow deletion of any post in their community,
**AND** the system SHALL allow deletion of any comment in their community,
**AND** the system SHALL record moderator action for audit trail.

**WHEN** a moderator wants to ban users,
**THE** system SHALL allow banning users from their community,
**AND** the system SHALL prevent banned users from creating posts or comments,
**AND** the system SHALL allow banned users to view content in the community.

**WHEN** a moderator wants to unban users,
**THE** system SHALL restore banned user's posting privileges,
**AND** the system SHALL remove ban record from community,
**AND** the system SHALL update all related cache entries.

#### 2.11.3 Banned User Management

**WHEN** viewing banned users list,
**THE** system SHALL display all banned users for the community,
**AND** the system SHALL show ban date, reason, and ban duration,
**AND** the system SHALL provide unban functionality.

**WHEN** a banned user attempts to post,
**THE** system SHALL verify user ban status before allowing content creation,
**AND** the system SHALL prevent post/comment creation for banned users,
**AND** the system SHALL provide appropriate error message.

### 2.12 Reporting System

#### 2.12.1 Report Creation

**WHEN** a user reports content,
**THE** system SHALL require selection of report type (post or comment),
**AND** the system SHALL require a reason text (up to 1000 characters),
**AND** the system SHALL validate user is not reporting their own content.

**WHEN** report is submitted,
**THE** system SHALL create report record with content details,
**AND** the system SHALL associate report with community for routing,
**AND** the system SHALL notify relevant moderators of new report.

#### 2.12.2 Report Review Process

**WHEN** a moderator views reports for their community,
**THE** system SHALL display all pending reports with content preview,
**AND** the system SHALL show reporter information and reason text,
**AND** the system SHALL show report timestamp and content details.

**WHEN** a moderator reviews a report,
**THE** system SHALL allow approving report (deleting content),
**AND** the system SHALL allow dismissing report (keeping content),
**AND** the system SHALL record moderator decision with timestamp.

**WHEN** a report is resolved,
**THE** system SHALL remove resolved reports from active list,
**AND** the system SHALL notify reporter of resolution outcome,
**AND** the system SHALL update content status as appropriate.

#### 2.12.3 Report History and Analytics

**WHEN** viewing report history,
**THE** system SHALL display historical reports with resolution status,
**AND** the system SHALL allow filtering by date, user, or content type,
**AND** the system SHALL provide export functionality for analysis.

## 3. Non-Functional Requirements

### 3.1 Performance Requirements

**THE** system SHALL support 10,000 concurrent users,
**AND** the system SHALL handle 100,000 daily active users,
**AND** the system SHALL respond to feed requests within 500ms for 95% of requests.

**THE** system SHALL support 1000 posts per second during peak times,
**AND** the system SHALL support 5000 comments per second during peak times,
**AND** the system SHALL maintain database query efficiency with proper indexing.

### 3.2 Security Requirements

**THE** system SHALL implement HTTPS for all communications,
**AND** the system SHALL hash passwords using bcrypt with appropriate cost factor,
**AND** the system SHALL implement CSRF protection for all state-changing operations.

**THE** system SHALL enforce role-based access control for all endpoints,
**AND** the system SHALL validate all user inputs for SQL injection and XSS prevention,
**AND** the system SHALL implement rate limiting for API endpoints.

### 3.3 Availability Requirements

**THE** system SHALL achieve 99.9% uptime for core features,
**AND** the system SHALL have automated backup and recovery procedures,
**AND** the system SHALL implement failover mechanisms for critical services.

### 3.4 Compliance Requirements

**THE** system SHALL comply with GDPR for European users,
**AND** the system SHALL provide data portability and deletion features,
**AND** the system SHALL maintain privacy policy and terms of service documentation.

## 4. Technical Architecture Overview

### 4.1 Technology Stack

**BACKEND FRAMEWORK**: NestJS for robust, enterprise-grade TypeScript backend development

**DATABASE**: Prisma ORM with PostgreSQL for reliable relational data storage

**AUTHENTICATION**: JWT-based authentication with refresh tokens and secure cookie storage

**CACHING**: Redis for high-performance caching of feeds, votes, and user data

**MESSAGE QUEUE**: BullMQ for asynchronous processing of background tasks

**INFRASTRUCTURE**: Docker containerization with Kubernetes orchestration

### 4.2 Core System Components

**USER MANAGEMENT**: Secure authentication, profile management, and karma calculation

**COMMUNITY MANAGEMENT**: Community creation, subscription, and moderation tools

**CONTENT MANAGEMENT**: Post and comment creation, editing, and deletion

**VOTING SYSTEM**: Consistent vote handling across posts and comments with karma integration

**FEED GENERATION**: Multiple feed types with sorting algorithms and caching

**MODERATION TOOLS**: Comprehensive community management and content moderation

**REPORTING SYSTEM**: User reporting with moderator review workflows

### 4.3 Scalability Strategy

**DATABASE SCALING**: Read replicas, connection pooling, and strategic indexing

**CACHING STRATEGY**: Multi-layer caching with distributed Redis cluster

**API DESIGN**: RESTful endpoints with versioning and rate limiting

**LOAD MANAGEMENT**: Auto-scaling groups and load balancing for traffic distribution

## 5. Business Model

### 5.1 Revenue Streams

**PREMIUM SUBSCRIPTION**: Ad-free experience, advanced analytics, and community tools

**COMMUNITY MONETIZATION**: Optional community subscriptions and revenue sharing

**ADVERTISING PLATFORM**: Non-intrusive, interest-based advertising system

**MARKETPLACE INTEGRATION**: Commission on community transactions and services

### 5.2 Success Metrics

**USER ACQUISITION**: 100,000 MAU at 6 months, 1 million at 18 months

**ENGAGEMENT**: Posts per user, comments per post, time on platform

**PLATFORM HEALTH**: Report resolution time, ban appeal rate, user satisfaction

**BUSINESS METRICS**: Revenue growth, LTV:CAC ratio, conversion rates