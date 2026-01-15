# Core Requirements for Reddit-like Community Platform

## User Registration and Login

### Authentication Requirements

**User Registration Process**

WHEN a new user begins registration, THE system SHALL:
- ACCEPT email address and password (minimum 8 characters, 1 uppercase, 1 number)
- VERIFY email address through confirmation link sent to user's email
- CREATE user account with status PENDING until email confirmed
- SET default user profile picture from available options

**Login Success Conditions**

WHEN a user submits valid credentials, THE system SHALL:
- GENERATE JWT authentication token with 24-hour expiry
- RETURN authentication token to client interface
- UPDATE user's last login timestamp
- SET authentication status to ACTIVE

```mermaid
graph LR
    A[Start Registration] --> B{Valid Email?}
    B -->|Yes| C[Create Account with PENDING Status]
    B -->|No| Z[Return Email Error]
    C --> D[Send Confirmation Email]
    D --> E{User Confirms?}
    E -->|Yes| F[Set Status to ACTIVE]
    E -->|No| G[Expired Link after 24h]
(30-day post volume)
- TRACK subscription count in community statistics
- SEND subscription notification to community admin
- INCLUDE community in user's list of subscriptions immediately

WHEN a user unsubscribes from a community, THE system SHALL:
- REMOVE subscription from user's active list
- UPDATE community activity metrics
- NOTIFY community admin of subscription count change

**Subscription Data Requirements**

WHEN displaying user profiles, THE system SHALL:
- SHOW all communities the user has subscribed to
- INDICATE which communities are visible to other users
- DISPLAY community subscription status (ACTIVE, PENDING)

## Post and Comment Management

### Post Creation Process

**Content Validation**

WHEN a user submits a post, THE system SHALL:
- ACCEPT text, links, and image uploads (PNG/JPEG, max 10MB)
- VALIDATE content against community privacy settings
- PROCESS text for embedded links
- GENERATE post ID using community prefix + timestamp hash

**Post Content Requirements**

WHEN creating a post in a community, THE system SHALL:
- REQUIRE at least 10 characters of content
- LIMIT post title to max 100 characters
- LOG all content creation attempts for moderation
- APPLY community-specific rules to new posts

### Comment System and Hierarchy

**Comment Structure**

WHEN a user adds a comment, THE system SHALL:
- ALLOW nested replies up to 5 levels deep
- REQUIRE minimum 5 characters for comments
- DISPLAY comment thread with user avatars
- SHOW upvote/downvote counts directly adjacent to comments

**Comment Hierarchy Requirements**

WHEN displaying comments, THE system SHALL:
- ORGANIZE comments in reverse chronological order by default
- GROUP child comments under parent comments
- SHOW comment replies with indented bars
- INCLUDE user's own comments in blue text

```mermaid
flowchart TD
    A[Post] --> B[Comment 1]
    A --> C[Comment 2]
    B --> B1[Reply to Comment 1]
    B --> B2[Reply to Comment 1]
    C --> C1[Reply to Comment 2]
    B1 --> B11[Deep Reply]
```