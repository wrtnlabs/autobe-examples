# Reddit Community Platform Requirements Specification

## 1. Service Overview
This platform provides a community-driven content sharing system where users can create, vote, and discuss posts across multiple themed communities. The platform implements a karma-based reputation system to incentivize quality contributions and engagement.

## 2. User Actors Specification

### Core Actors
- **Guest**: Unauthenticated users viewing public content
- **Member**: Authenticated users with full platform access including post creation and voting

### Authentication Requirements
WHEN a user attempts to access protected features, THE system SHALL require authentication via email/password credentials. AUTHENTICATION shall follow JWT token-based session management with 30-minute session expiration.

## 3. User Profile Management

### Profile Structure
Each user profile shall store: display name, bio text (max 500 characters), avatar image (stored as cloud file URL), and karma score (int, default 0).

### Profile Editing
WHEN a member updates their profile, THE system SHALL validate display name and bio constraints, update the database, and notify the user of successful changes. The user's avatar shall be processed through cloud storage before updates are finalized.

### Profile Display
WHEN a profile is viewed, THE system SHALL display: display name, bio text, avatar, karma score, post count, and comment count. The karma score shall be presented as "Total Karma: [score]" with color-coding for positive/negative values.

## 4. Karma System

### Calculation Rules
WHEN a post or comment receives a vote, THE system SHALL adjust the author's karma by +1 for upvotes and -1 for downvotes. Karma changes shall reflect immediately across all interfaces.

### Display Requirements
WHEN the karma score is negative, THE system SHALL display it with a red color indicator, while positive values shall show with green. Zero values shall display in neutral gray.

## 5. Community Management

### Community Creation
WHEN a member requests to create a community, THE system SHALL verify community name availability, store description (max 500 characters), and assign the creator as owner. The community icon shall be processed as a cloud-stored image file before creation confirmation.

### Community Search
WHEN a search query is submitted, THE system SHALL return communities matching the query string in a paginated list with community names, descriptions, and subscriber counts. Search shall be case-insensitive and support partial matches.

## 6. Subscriptions

### Subscription Management
WHEN a member subscribes to a community, THE system SHALL create a subscription record linking user and community identifiers. The member's activity on posts within that community shall be restricted to subscribed communities only.

### Subscription View
WHEN a member views their subscriptions, THE system SHALL display a paginated list of communities including name, icon, and subscriber count. Users shall be able to subscribe or unsubscribe with single-click actions.

## 7. Post Management

### Post Creation
WHEN a member creates a post in a subscriber community, THE system SHALL validate title (min 5 characters), content (as per post type), and community membership. The post shall be stored with creator ID, community ID, timestamp, and type identifier.

### Post Types
- **Text Post**: Requires text content (min 10 characters)
- **Link Post**: Requires valid URL (starts with http/https)
- **Image Post**: Requires uploaded image file (max 5MB)

### Post Editing/Deletion
WHEN a member edits their post, THE system SHALL update the content type and fields while maintaining the original post creation timestamp. FOR DELETE, WHEN a member requests deletion, THE system SHALL remove association with communities, comments, and karma adjustments.

## 8. Post Voting

### Voting Mechanics
WHEN a member votes on a post, THE system SHALL record the vote with a unique voter ID, update the vote count, and adjust the author's karma. Voting shall be restricted to logged-in members only.

### Vote Change Rules
WHEN a member changes their vote from up to down or vice versa, THE system SHALL recalculate the vote score by the difference between previous and new votes. Each user may have only one vote per post.

## 9. Content Feeds

### Home Feed
WHEN a member views the Home feed, THE system SHALL display posts exclusively from subscribed communities. The feed shall be filtered, sorted, and paginated with the specified sorting options.

### Popular Feed
WHEN a visitor views the Popular feed, THE system SHALL display posts from all communities without login requirements. The feed shall use 'Hot' sorting by default.

### Sorting Requirements
The platform SHALL support four sorting options:
1. **Hot**: Recent posts with high upvote count
2. **New**: Most recently created posts
3. **Top**: Highest vote score (time filters: today, week, month, year, all time)
4. **Controversial**: High vote total with near-zero score

## 10. Comment System

### Comment Creation
WHEN a member writes a comment, THE system SHALL validate content length (max 1000 characters), associate with parent post, and record the author. Comments shall be displayed in nested thread structures.

### Comment Reply System
WHEN a comment has replies, THE system SHALL create a parent-child hierarchy with indented display and proper navigation. Replies can have unlimited depth with clear visual separation.

## 11. Comment Voting

### Voting Mechanics
SAME RULES AS POST VOTING APPLY TO COMMENTS. Each comment shall display its score, voting buttons, and last voting timestamp.

## 12. Community Moderation

### Moderator Roles
THE COMMUNITY OWNER SHALL be assigned as the primary moderator. MODERATORS can be added by owners and have all moderation capabilities except removing the owner. Owners shall retain sole ownership rights and authority to manage all moderator permissions.

### Moderation Actions
WHEN a moderator deletes a post or comment, THE system SHALL mark the content as deleted without permanent data removal and adjust the author's karma. BANNING a user FROM A COMMUNITY SHALL be restricted to community-specific actions.

## 13. Content Reporting

### Reporting Process
WHEN a member reports content, THE system SHALL collect report reason (text, max 500 characters) and associate with the reporting user. The report shall be marked as pending for moderator review.

### Moderation Resolution
WHEN a moderator approves a report, THE system SHALL delete the reported content and notify the reporting user. DISMISSAL of a report shall remove the report from the moderator's queue with user notification.

## 14. System Constraints
- All user input must be validated for length and format
- All external references (image URLs) must be processed through cloud storage
- All time-sensitive operations must be recorded with UTC timestamps
- The application must support 10k concurrent users for basic operations
- All password storage shall use bcrypt with 12+ round complexity

## 15. Critical Business Processes
```
mermaid
graph LR
    A[User Registration] --> B[Profile Setup]
    B --> C[Community Subscription]
    C --> D[Post Creation]
    D --> E[Vote Interaction]
    E --> F[Content Display]
    F --> G[Report Submission]
    G --> H[Moderation Review]
    H --> I[Resolution]
```

> *Note: This document specifies business requirements only. Technical implementations including API structure, database schema, and authentication details are defined in subsequent development phases.*