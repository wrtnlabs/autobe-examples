## 1. Service Overview

The Reddit Community Platform enables users to create, join, and interact with interest-based communities that facilitate content sharing, discussion, and engagement through posts, comments, and voting systems. The platform operates as a public-facing social network where communities serve as primary organizational units for content curation and user interaction. 

### Core Purpose
The platform's purpose is to provide a decentralized, scalable environment for users to participate in discussions and share content across thematic communities while maintaining community moderation through user-driven engagement metrics.

### Business Value
This platform addresses the need for customizable, community-focused social interactions beyond traditional social media, offering users direct control over their content visibility and community participation through voting systems and Karma metrics.

## 2. Business Model

### Revenue Strategy
Platform will generate revenue through premium community subscriptions and targeted advertising based on user engagement patterns and community niche. Basic community creation and participation will be free, with enhanced features available through tiered subscription plans.

### Growth Strategy
User acquisition focuses on viral community sharing mechanisms, with onboarding processes emphasizing community discovery and personalized interest matching. Viral loops will be implemented where users earn additional Karma for inviting new community members.

### Success Metrics
- User Retention Rate: ≥70% after 30 days
- Active Communities: ≥50,000 by Year 2
- Monthly Active Users: ≥500,000 by Year 2
- Average Time Spent Per Session: ≥15 minutes

## 3. User Actors and Permissions

| Actor | Permissions | Description |
|-------|-------------|-------------|
| Guest | Read-only, View Communities | Users without accounts, limited to public content access |
| Member | Full functionality with limitations | Registered users with community subscriptions |
| Community Moderator | Community-specific moderation tools | Users appointed to a community for content moderation |
| Admin | System-wide management privileges | Platform administrators with full feature access |

### Authentication Requirements
WHEN a user attempts to access a community feature, THE system SHALL authenticate the user through the authentication service within 2 seconds of their request.

## 4. Core Functional Requirements

### 4.1 User Registration and Login

WHEN a new user creates an account, THE system SHALL require email validation with confirmation email containing unique verification link.

WHEN a user attempts to log in with invalid credentials, THE system SHALL display clear, actionable error message within 1 second, indicating the specific issue (e.g., 'Invalid email or password').

### 4.2 Content Creation

WHEN a user creates a post in a community, THE system SHALL validate post content to ensure: 

- Maximum 2000 characters
- Minimum 15 characters
- No disallowed content types without moderation approval

### 4.3 User Interaction Features

WHEN a user upvotes a post, THE system SHALL immediately reflect the change on the interface without reloading the page, updating the vote count in real-time.

WHEN a user downvotes a post, THE system SHALL update the vote count immediately and store the interaction for Karma calculation.

## 5. Post and Comment Management

### 5.1 Post Creation Process

![](data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2ZmZiIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzAwMCIgZm9udC1mYW1pbHk9IlNhbXBsZSBBcmlhbCIgZm9udC1zaXplPSIxNnB4IiBmaWxsLW9wYWNpdHk9IjEiPkJyZWFraW5nIEluZm9ybWF0aW9uIHdpdGggQ29tcHJlc3Npb248L3RleHQ+PC9zdmc+)

### 5.2 Comment System and Hierarchy

WHEN a user posts a comment on a post, THE system SHALL create a top-level comment visible in the comment thread.

WHEN a user replies to a comment, THE system SHALL nest the reply immediately under the parent comment with visual indentation indicating hierarchy.

### 5.3 Upvote/Downvote Mechanics

WHEN a user upvotes a comment, THE system SHALL increment the comment's upvote count and update the comment's rank in the community's sorting algorithm within 100ms.

## 6. Community Management

### 6.1 Community Creation and Configuration

WHEN a user creates a new community, THE system SHALL require: 

- Community name (2-50 characters)
- Description (max 200 characters)
- Visibility setting (public/private)

### 6.2 Community Subscription

WHEN a user subscribes to a community, THE system SHALL notify the community's moderators via email about the new subscriber.

## 7. Authentication Flow

### 7.1 Registration Process

![](data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAxMDAgMTAwIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iI2ZmZiIvPjx0ZXh0IHg9IjUwIiB5PSI1MCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzAwMCIgZm9udC1mYW1pbHk9IlNhbXBsZSBBcmlhbCIgZm9udC1zaXplPSIxNnB4IiBmaWxsLW9wYWNpdHk9IjEiPkJyZWFraW5nIEluZm9ybWF0aW9uIHdpdGggQ29tcHJlc3Npb248L3RleHQ+PC9zdmc+)

### 7.2 Login and Session Management

WHEN a user successfully logs in, THE system SHALL generate a JWT access token with 1 hour expiration and store it securely in HTTP-only cookies.

## 8. User Profiles

### 8.1 Activity History Display

WHEN a user views another user's profile, THE system SHALL display a complete history of all posts and comments made by that user within the platform.

## 9. Karma System

### 9.1 Karma Calculation Logic

WHEN a user upvotes a post, THE system SHALL add 5 points to the post owner's Karma.

WHEN a user upvotes a comment, THE system SHALL add 2 points to the comment owner's Karma.

## 10. Sorting and Filtering

### 10.1 Hot Sorting Logic

WHEN a user selects 'hot' sorting, THE system SHALL rank posts by a proprietary algorithm that combines recent upvotes with the number of upvotes over time, with the formula:

`score = (upvotes) / (2 * (age + 1))` where age is time since post creation in hours.

## 11. Reporting System

### 11.1 Content Reporting Process

WHEN a user reports inappropriate content, THE system SHALL: 

1. Store report with timestamp and reason
2. Notify community moderators via email
3. Display confirmation message to user within 3 seconds