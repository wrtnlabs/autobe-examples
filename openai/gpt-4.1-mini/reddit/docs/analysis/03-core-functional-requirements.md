# Reddit-like Community Platform Requirements Specification

## User Account

### Registration
- WHEN a user submits a registration request with email, password and chosen username, THE system SHALL validate the uniqueness of the email and username.
- IF the email or username already exists, THEN THE system SHALL reject the registration with an appropriate error message.
- THE system SHALL securely hash and store all passwords.

### Login
- WHEN a user attempts to log in with email and password, THE system SHALL authenticate the credentials.
- IF the credentials are invalid, THEN THE system SHALL deny access and provide an authentication error.
- WHEN successfully authenticated, THE system SHALL create and maintain a secure session or issue a JWT token.

### Password Management
- WHEN a user requests a password change, THE system SHALL verify the current password before allowing the update.
- WHEN the password is changed successfully, THE system SHALL invalidate all existing sessions except for the current session.

### Account Deletion
- WHEN a user requests account deletion, THE system SHALL delete the user account along with all their posts and comments permanently.

## User Profile

### Profile Information
- THE user profile SHALL contain:
  - Display name
  - Bio text
  - Avatar image
  - Total karma score
  - List of posts created
  - List of comments written

### Profile Editing
- WHEN a user views their own profile, THE system SHALL allow editing of display name, bio, and avatar.
- THE system SHALL validate that display names are unique when changed.
- Avatar images SHALL comply with file type and size constraints.

### Profile Viewing
- WHEN any user views another user's profile, THE system SHALL display profile information including display name, bio, avatar, total karma, posts, and comments.
- Editing is prohibited for other users' profiles.

## Karma

- EACH user SHALL have a single karma score.
- WHEN a post or comment receives an upvote, THE system SHALL increase the author's karma by 1.
- WHEN a post or comment receives a downvote, THE system SHALL decrease the author's karma by 1.
- WHEN a vote is removed, THE system SHALL adjust the author's karma accordingly.
- Karma scores MAY be negative.

## Communities

### Creation
- ANY authenticated user SHALL be able to create a community.
- A community SHALL have a unique name, a description, and an icon image.
- The creating user SHALL become the owner of the community.

### Browsing and Searching
- THE system SHALL provide a paginated list of all communities with subscriber counts.
- THE system SHALL support searching communities by name.

## Subscribing

- USERS SHALL be able to subscribe or unsubscribe to any community.
- Subscriptions SHALL be required to create posts in the community.
- USERS SHALL be able to view their list of subscribed communities.

## Posts

### Creation and Types
- USERS SHALL be able to create posts only in communities to which they are subscribed.
- Posts SHALL have a required title and be one of three types:
  - Text post with content text
  - Link post with a valid URL
  - Image post with an uploaded image

### Editing and Deletion
- USERS SHALL be able to edit and delete their own posts.

### Viewing
- WHEN viewing a post, USERS SHALL see title, full content, author, community, vote score, comment count, and timestamp.

## Post Voting

- USERS SHALL be able to upvote or downvote posts.
- ONLY one vote per user per post is allowed.
- USERS SHALL be able to change their vote or remove it entirely.
- The vote score SHALL be calculated as total upvotes minus total downvotes.

## Post Feeds

### Home Feed
- SHOW posts only from communities the user is subscribed to.
- Available only to logged-in users.

### Popular Feed
- SHOW posts from all communities across the platform.
- Available to all users including guests.

### Community Feed
- SHOW posts from a specified community.
- Available to all users.

### Sorting Options
- All feeds SHALL support Hot, New, Top (with time filters today, week, month, year, all), Controversial sorting.
- All feeds SHALL be paginated.

## Post List Display

- Each post in any feed SHALL display:
  - Title
  - Author username
  - Community name
  - Vote score
  - Comment count
  - Time since posting
  - For text posts: first 200 characters of content
  - For image posts: thumbnail image
  - For link posts: domain name from the URL

## Comments

### Creation and Replies
- USERS SHALL be able to write comments on posts and reply to any comment.
- REPLIES SHALL have unlimited nesting depth.

### Editing and Deletion
- USERS SHALL be able to edit and delete their own comments.

### Comment Display
- COMMENTS SHALL display author, content, vote score, time since posted, and nested replies.

## Comment Voting

- USERS SHALL be able to upvote or downvote any comment with the same rules as posts.
- ONE vote per user per comment.
- Votes can be changed or removed.

## Comment Sorting

- COMMENTS SHALL be sorted by Best, New, and Controversial.

## Community Moderation

### Roles and Permissions
- The creator is owner with highest authority.
- OWNERS can add and remove moderators.
- MODERATORS can add other moderators but cannot remove the owner or other moderators.

### Moderator Actions
- MODERATORS can delete any post or comment in their community.
- MODERATORS can ban and unban users in their community.
- BANNED users cannot create posts or comments but can view content.

### Moderator Management
- OWNER can remove moderators.
- MODERATORS cannot remove each other.
- Moderators can view list of banned users.

## Reporting

### Reporting Content
- USERS SHALL be able to report posts or comments with a mandatory reason.

### Moderator Review
- MODERATORS SHALL view all reports for their community.
- Reports SHALL include the reported content, reporting user, and reason.
- MODERATORS can approve reports (delete content) or dismiss them (retain content).
- Dismissed reports SHALL be removed from the report list.

---

```mermaid
graph TB
  A["User Registration"] --> B{"Validate Email & Username"}
  B --|"Valid"| C["Create User Account"]
  B --|"Exists"| D["Reject Registration"]
  C --> E["User Login"]
  E --> F{"Authenticate Credentials"}
  F --|"Success"| G["Create Session Token"]
  F --|"Failure"| H["Deny Access"]

  subgraph "Community Management"
    I["Create Community"] --> J["Assign Owner"]
    K["Subscribe/Unsubscribe"] --> L["Manage Subscription List"]
  end

  G --> I
  G --> K

  subgraph "Post Management"
    M["Create Post"] --> N{"Post Type Decision"}
    N --|"Text"| O["Save Text Content"]
    N --|"Link"| P["Save Link URL"]
    N --|"Image"| Q["Save Image Upload"]

    R["Edit/Delete Post"] --> S["Update/Delete Post Record"]
  end

  subgraph "Voting and Feedback"
    T["Vote on Post or Comment"] --> U["Adjust Karma"]
    U --> V["Update Vote Score"]
  end

  subgraph "Moderation"
    W["Add/Remove Moderators"] --> X["Manage Moderator Roles"]
    Y["Ban/Unban Users"] --> Z["Enforce Ban Restrictions"]
    AA["Handle Reports"] --> AB["Review and Act on Reports"]
  end

  X --> W
  Z --> Y
  AB --> AA

```