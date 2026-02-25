# Reddit-like Community Platform

## User Account

- WHEN a user signs up with an email and password, AND chooses a unique username, THE system SHALL create a new user account.
- WHEN a user logs in with email and password, THE system SHALL authenticate the user and establish a session.
- WHEN a user requests to change their password, THE system SHALL verify the current password and update it upon successful verification.
- WHEN a user deletes their account, THE system SHALL delete the user’s account and all associated posts and comments permanently.
- WHEN a request requiring authentication is made without proper credentials, THE system SHALL deny access with an HTTP 401 Unauthorized response.

## User Profile

- WHEN a user creates an account, THE system SHALL create a corresponding user profile with display name, bio text, and avatar image fields.
- WHEN a user edits their profile, THE system SHALL allow editing of display name, bio text, and avatar image.
- WHEN any user views another user's profile, THE system SHALL display that user's display name, bio text, avatar image, total karma score, list of their posts, and list of their comments.

## Karma

- WHEN a user receives an upvote on a post or comment, THE system SHALL increment that user’s karma score by 1.
- WHEN a user receives a downvote on a post or comment, THE system SHALL decrement that user’s karma score by 1.
- WHEN a vote is removed, THE system SHALL adjust the karma score accordingly.
- Karma score MAY be negative.

## Communities

- WHEN any user creates a community with a unique name, description text, and icon image, THE system SHALL register the community and assign ownership to the creator.
- WHEN users browse communities, THE system SHALL display a list of communities with subscriber counts.
- WHEN users search communities by name, THE system SHALL return matching communities.

## Subscribing

- WHEN a user subscribes to a community, THE system SHALL add the user to the subscriber list.
- WHEN a user unsubscribes from a community, THE system SHALL remove the user from the subscriber list.
- WHEN a user views their subscriptions, THE system SHALL provide a list of all communities the user is subscribed to.
- Users SHALL be required to subscribe to a community before creating posts in it.

## Posts

- WHEN a subscribed user creates a post in a community, THE system SHALL accept a post with a required title and content appropriate to the post type.
- Post types: 
  - Text post with text content
  - Link post with a valid URL
  - Image post with an uploaded image file
- WHEN a user edits their own post, THE system SHALL update the post content.
- WHEN a user deletes their own post, THE system SHALL delete the post and all associated comments.
- WHEN a post is viewed individually, THE system SHALL display the title, full content, author username, community name, vote score, comment count, and timestamp of creation.

## Post Voting

- WHEN a logged-in user votes on a post, THE system SHALL allow an upvote or downvote.
- WHEN a user votes, THE system SHALL update the vote score accordingly.
- A user MAY only vote once per post but MAY change their vote from upvote to downvote or remove their vote completely.
- Vote score SHALL be calculated as total upvotes minus total downvotes.

## Post Feeds

- The platform SHALL provide three post feeds:
  - **Home Feed:** Shows posts from communities the logged-in user subscribes to.
  - **Popular Feed:** Shows posts from all communities, accessible to all users.
  - **Community Feed:** Shows posts from a specific community, accessible to all users.

- All feeds SHALL support sorting options:
  - Hot: recent posts with many upvotes appear first
  - New: most recent posts appear first
  - Top: by highest vote score with filters for today, this week, this month, this year, all time
  - Controversial: posts with many votes but score close to zero

- Feed results SHALL be paginated.

## Post List Display

- Each post in feeds SHALL show:
  - Title
  - Author username
  - Community name
  - Vote score
  - Comment count
  - Time since posted
  - For text posts: First 200 characters of content
  - For image posts: Thumbnail
  - For link posts: Domain name extracted from URL

## Comments

- WHEN a user writes a comment on a post, THE system SHALL create the comment.
- WHEN a user replies to a comment, THE system SHALL associate the reply as a nested child comment, allowing infinite depth.
- WHEN a user edits their own comment, THE system SHALL update the comment content.
- WHEN a user deletes their comment, THE system SHALL delete it and all its nested replies.
- Each comment SHALL display author username, content, vote score, time since posted, and nested replies.

## Comment Voting

- Comment voting SHALL follow the same rules as post voting.
- Users MAY upvote or downvote any comment once.
- Users MAY change or remove their vote.

## Comment Sorting

- Comments SHALL be sortable by:
  - Best: Highest vote score first
  - New: Most recent first
  - Controversial: Many votes but score near zero

## Community Moderation

### Moderator Roles

- The community owner SHALL be the highest authority for that community.
- The owner MAY add or remove moderators.
- Moderators MAY add other moderators.
- Moderators CANNOT remove the owner or other moderators.

### Moderator Actions

- Moderators MAY delete any post or comment within their community.
- Moderators MAY ban or unban users from their community.
- Moderators MAY view a list of banned users.
- Banned users CANNOT post or comment but CAN view content.

## Reporting

- Users MAY report posts or comments, providing a reason in text.
- Moderators SHALL be able to view reports for their community.
- Reports SHALL indicate reported content, reporter, and reason.
- Moderators MAY approve reports to delete reported content.
- Moderators MAY dismiss reports to keep content; dismissed reports SHALL be removed.

## Error Handling and Performance Expectations

### Common Error Scenarios

- WHEN a user tries to sign up with an already registered email, THE system SHALL reject with an error message.
- WHEN user login fails due to incorrect credentials, THE system SHALL respond with authentication failure message without revealing which credential was incorrect.
- WHEN a password change is attempted with an incorrect existing password, THE system SHALL deny the request.
- WHEN unauthenticated users attempt authenticated actions, THE system SHALL return HTTP 401 Unauthorized.
- WHEN invalid authentication tokens are received, THE system SHALL reject requests and prompt re-authentication.
- WHEN users try unauthorized actions (editing others' posts, etc.), THE system SHALL deny access with permission errors.
- WHEN banned users attempt to post or comment in banned communities, THE system SHALL block the action with an error message.
- WHEN community creation uses an existing name, THE system SHALL notify the user.
- WHEN post title is missing, THE system SHALL reject post creation.
- WHEN image uploads exceed size limits, THE system SHALL reject with an error.
- WHEN invalid URLs are submitted in link posts, THE system SHALL reject post creation.
- WHEN users attempt edits or deletions of content they do not own, THE system SHALL deny the request.
- WHEN vote actions by unauthenticated users occur, THE system SHALL reject the vote.
- WHEN duplicate votes are attempted without changing previous votes, THE system SHALL prevent them.
- WHEN vote update fails, THE system SHALL notify user and retry in background.
- WHEN reports are submitted without reasons, THE system SHALL reject reports.
- WHEN moderators handle reports outside their communities, THE system SHALL deny such actions.
- WHEN content deletion fails during moderation, THE system SHALL notify moderators and log for manual action.
- WHEN unexpected system errors occur, THE system SHALL return generic error messages without disclosing internal details.
- WHEN database connections fail, THE system SHALL queue write operations and retry.
- WHEN file uploads fail due to network errors, THE system SHALL allow users retry options.

### Error Recovery

- The system SHALL provide clear user-friendly error messages and suggested actions.
- Transient failures SHALL prompt users to retry operations.
- Vote and karma update failures SHALL be retried automatically maintaining data consistency.
- Moderator deletion failures SHALL be logged with notifications to moderators.

### Performance

- Login validation SHALL complete within 2 seconds.
- Account creation and confirmation SHALL complete within 3 seconds.
- Password changes SHALL complete within 3 seconds.
- Feed loading SHALL deliver first 20 posts within 2 seconds.
- Subsequent paginated feed requests SHALL return within 2 seconds.
- Community search SHALL respond within 2 seconds.
- Profile and community pages SHALL load within 3 seconds.
- Vote and karma updates SHALL respond within 1 second.
- Moderation actions SHALL complete within 2 seconds.
- Report handling SHALL process within 2 seconds.

### System Availability

- The system SHALL maintain 99.9% uptime excluding scheduled maintenance.
- Users SHALL be notified prior to planned maintenance.
- Failover mechanisms SHALL minimize service disruption.
- Critical errors SHALL be logged with administrator monitoring.

---

## Mermaid Diagram: Error Handling and Recovery Flow

```mermaid
graph LR
  A["User Action"] --> B{"Is Action Authorized?"}
  B --|"No"| C["Return Permission Error"]
  B --|"Yes"| D{"Is Input Valid?"}
  D --|"No"| E["Return Validation Error"]
  D --|"Yes"| F["Perform Action"]
  F --> G{"Did Action Succeed?"}
  G --|"No"| H["Return Generic Error"]
  G --|"Yes"| I["Update System State"]
  H --> J["Log Error"]
  J --> K["Notify User and Allow Retry"]

  style A fill:#f9f,stroke:#333,stroke-width:2px
  style B fill:#bbf,stroke:#333,stroke-width:2px
  style D fill:#bbf,stroke:#333,stroke-width:2px
  style G fill:#bbf,stroke:#333,stroke-width:2px
  style J fill:#fcc,stroke:#333,stroke-width:2px
  style K fill:#afa,stroke:#333,stroke-width:2px
```
