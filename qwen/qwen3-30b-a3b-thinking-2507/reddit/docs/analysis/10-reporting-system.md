# Reddit-like Community Platform

## Service Overview

### Problem Statement

Online communities struggle with content moderation, user engagement, and seamless content discovery. THE platform SHALL provide a structured environment where users can create and participate in communities with features that foster meaningful interaction while maintaining community health.

WHEN a user wants to join discussions, THE platform SHALL provide intuitive interfaces for posting, commenting, voting, and subscribing to communities. THE system SHALL handle all content moderation through a transparent reporting system. THE system SHALL ensure that user activities directly impact community metrics like karma scores.

### Core Value Proposition

The platform delivers a complete, self-sustaining community ecosystem that:
- Provides users with tools to create and manage communities
- Enables meaningful interaction through structured content formats (text, links, images)
- Maintains community health through a transparent moderation and reporting system
- Encourages positive contributions via karma-driven incentives

## User Accounts

### Account Management

WHEN a user signs up, THE system SHALL require email, password, and unique username. THE system SHALL validate all inputs against these rules:

- Email must be in valid format (RFC 5322)
- Password must be at least 8 characters with at least one special character
- Username must be alphanumeric and 3-20 characters

WHEN a user changes their password, THE system SHALL require their current password for validation. THE system SHALL send an email confirmation upon successful password change.

WHEN a user deletes their account, THE system SHALL:
1. Remove all associated content (posts, comments)
2. Delete all user-specific data
3. Update karma metrics
4. Notify account owner of account deletion

### Authentication Workflow

USER -> PLATFORM: Submit login credentials (email/password)
PLATFORM -> AUTH SERVICE: Validate user credentials
AUTH SERVICE -> PLATFORM: Return JWT token on successful validation
PLATFORM -> USER: Return JWT token for API access

## User Profiles

### Profile Management

WHEN a user edits their profile, THE system SHALL allow modification of:
- Display name (1-50 characters)
- Bio text (min 10 characters, max 500 characters)
- Avatar image (JPG/PNG, max 5MB)

THE system SHALL NOT allow users to change their username after initial creation. THE system SHALL apply all profile changes immediately without requiring confirmation.

### Profile Display Requirements

User profile page SHALL display:

- User's display name
- Bio text
- Avatar image
- Total karma score (formatted as integer)
- List of all posts created (with title, community, time posted)
- List of all comments written (with comment content, community, time posted)

WHEN a user views another user's profile, THE system SHALL:
- Show public profile information
- Include karma score for context
- Display recent activity (posts and comments)

## Karma System

### Karma Calculation Rules

Karma score SHALL be a single integer value that changes based on user interactions:

WHEN a user upvotes a post or comment, THEIR karma increases by 1.
WHEN a user downvotes a post or comment, THEIR karma decreases by 1.
WHEN a user removes their vote, THEIR karma changes by the opposite direction.

WHEN a post receives 10 upvotes and 5 downvotes, THEIR karma increases by 5 (net +5).

### Reporting System Integration

WHEN a user reports content and the report is approved by moderators, THEIR karma increases by 1. THE system SHALL:
- Log the karma increase in audit trail
- Notify the reporter: "Your report was valid. Content has been removed."

WHEN content is deleted due to a valid report, THE system SHALL decrease the author's karma by 1. THE system SHALL:
- Track karma changes in audit log
- Apply negative karma if score goes below zero

## Communities

### Community Management

WHEN a user creates a community, THE system SHALL require:
- Unique name (3-50 characters)
- Description text (min 10 characters)
- Community icon image (JPG/PNG, max 5MB)

THE system SHALL automatically make the creator the owner. THE system SHALL:
- Assign community to the creator's ownership
- Provide initial community dashboard
- Generate a unique community ID for references

### Community Operations

USER -> PLATFORM: Search for community by name
PLATFORM -> DATABASE: Query communities with LIKE '%search term%'
DATABASE -> PLATFORM: Return matching communities
PLATFORM -> USER: Display list of found communities

THE platform SHALL display:
- Community name
- Description text
- Subscriber count
- Community icon

## Subscribers

### Subscription Workflow

WHEN a user wants to subscribe to a community, THE system SHALL:
- Verify user is logged in
- Check if user is already subscribed
- If not subscribed, create subscription record
- Update community subscriber count

WHEN a user unsubscribes from a community, THE system SHALL:
- Remove subscription record
- Update community subscriber count
- Remove community from user's subscription list

### Subscription Requirements

THE user SHALL be subscribed to a community to create posts in that community. THE system SHALL reject post creation attempts without valid subscription.

## Posts

### Post Creation

WHEN a user creates a post in a subscribed community, THE system SHALL require:
- Title (min 5 characters, no HTML)
- Content type (must be one of: 'text', 'link', 'image')
- For text posts: content (min 10 characters)
- For link posts: valid URL
- For image posts: valid image file

WHEN a post is created, THE system SHALL:
- Assign post ID
- Track time of creation
- Record author user ID
- Record community ID
- Initialize vote score to 0

### Post Display Requirements

When viewing a single post, the platform SHALL display:

- Title
- Full content (truncated to display limit)
- Author username and profile link
- Community name and link
- Vote score (calculated as upvotes - downvotes)
- Comment count
- Time since posted (e.g., "3 hours ago")

## Voting System

### Voting Mechanics

WHEN a user votes on a post or comment, THE system SHALL:
- Allow one vote per user
- Allow upvote (adds 1 to score) or downvote (subtracts 1 from score)
- Allow changing vote from up to down or vice versa
- Allow removing vote entirely

THE vote score SHALL be calculated as: vote_score = total_upvotes - total_downvotes

## Feeds

### Feed Types

The platform SHALL provide three feed types:

1. **Home Feed**:
   - Shows posts from communities user is subscribed to
   - Requires user to be logged in

2. **Popular Feed**:
   - Shows posts from all communities
   - Available to all users (logged-in or not)

3. **Community Feed**:
   - Shows posts from a specific community
   - Available to all users (logged-in or not)

### Feed Sorting

The platform SHALL support sorting options:

- **Hot**: Recent posts with many upvotes first
- **New**: Most recently created posts first
- **Top**: Highest vote score first (with time filter: today, this week, this month, this year, all time)
- **Controversial**: Posts with many votes but score close to zero first

### Feed Pagination

THE platform SHALL paginate all feeds with page size limit of 20 posts per page. THE system SHALL:
- Provide "Previous" and "Next" navigation
- Display current page number
- Handle "No more content" display

## Post List Display

When viewing any feed, each post SHALL display:

- Title (truncated to 80 characters)
- Author username
- Community name
- Vote score
- Comment count
- Time since posted
- For text posts: first 200 characters of content
- For image posts: thumbnail image
- For link posts: domain name (e.g., "youtube.com")

## Comments

### Comment Creation

WHEN a user writes a comment on a post, THE system SHALL require:
- Comment content (min 1 character, max 2000 characters)
- Comment context (post ID)

THE system SHALL support nested comments with unlimited depth. THE platform SHALL:
- Display comment thread structure
- Show comment depth level
- Provide "Reply" functionality on comments

### Comment Display Requirements

Each comment SHALL display:

- Author username
- Comment content
- Vote score
- Time since posted
- Nested replies (if any)

## Comment Voting

Comment voting follows identical rules to post voting:

- One vote per user per comment
- Upvote/downvote functionality
- Vote modification allowed
- Vote removal allowed

## Comment Sorting

Comments on a post SHALL support sorting:

- **Best**: Highest vote score first
- **New**: Most recent comment first
- **Controversial**: Most comments with score near zero first

## Moderation

### Moderator Workflow

The community owner SHALL be the highest authority. THE platform SHALL support:

- Owner can add/remove moderators
- Moderators can add other moderators
- Moderators cannot remove owner or other moderators

### Moderation Actions

WHEN a moderator takes action, THE system SHALL:
- Allow deletion of any post/comment in community
- Allow banning users from community
- Show list of banned users
- Track ban duration (permanent or temporary)

WHEN a user is banned from a community, THE platform SHALL:
- Prevent them from creating posts/comments in that community
- Allow them to view community content
- Display ban message when attempting restricted actions

## Reporting System

### Report Submission

WHEN a user reports content, THE system SHALL:
- Allow selection of reporting category
- Require at least one character in reason text
- Create report record with timestamp

WHEN a report is submitted, THE system SHALL send notification to relevant moderators.

### Report Processing

Moderators SHALL see reports in priority queue with:

- Report status (New, Pending, Processing, Approved, Dismissed)
- Category and reason
- Content being reported
- Reporter information

WHEN a moderator approves a report, THE system SHALL:
- Delete content
- Add 1 karma to reporter
- Decrease author's karma by 1

WHEN a moderator dismisses a report, THE system SHALL keep the content and notify reporter.

## Mermaid Diagram: Key User Flows

```mermaid
graph TD
  A[User Account Creation] -->|Validation| B{Valid Inputs?}
  B -->|Yes| C[Create Account]
  B -->|No| D[Show Validation Errors]
  C --> E[Login]
  E --> F[Home Feed]
  F --> G{Community Subscription}
  G -->|Subscribed| H[Create Post]
  G -->|Not Subscribed| I[Subscribe First]
  H --> J[Post Creation]
  J --> K{Post Type}
  K -->|Text| L[Enter Text]
  K -->|Link| M[Enter URL]
  K -->|Image| N[Upload Image]