# User Profiles Requirements for RedditClone Platform

## Profile Information

THE user profile system SHALL display the following information for each member:
- Username (unique identifier selected during registration)
- Account creation date
- Karma score (derived from upvotes received on posts and comments)
- Community subscriptions count
- Brief user bio text (optional, up to 200 characters)
- Post count (total posts created by the user)
- Comment count (total comments created by the user)

THE user profile system SHALL allow users to view their own profile with additional information:
- Email address (private, visible only to the profile owner)
- Account status (active, suspended, etc.)
- Last login timestamp
- Connected social accounts (if any)

THE user profile system SHALL display moderator badge for users who moderate at least one community.

THE user profile system SHALL display admin badge for users with administrative privileges.

WHEN a guest accesses a user profile, THE system SHALL show only public information and exclude private details.

WHEN a member accesses another member's profile, THE system SHALL show only public information and exclude private details.

WHEN a user accesses their own profile, THE system SHALL display both public and private information.

THE profile system SHALL display user's karma score prominently at the top of their profile.

THE profile system SHALL show subscription count as a numerical value.

THE profile system SHALL limit bio text to 200 characters maximum.

IF a user's bio text exceeds 200 characters, THEN THE system SHALL truncate the text and show error message "Bio must be 200 characters or less".

THE profile system SHALL calculate and display total post count in real-time.

THE profile system SHALL calculate and display total comment count in real-time.

## Activity Display

THE activity display system SHALL organize user content into filterable tabs:
- "Overview" tab showing recent posts and comments
- "Posts" tab showing user's post history
- "Comments" tab showing user's comment history

THE activity display system SHALL show at most 10 items per page in the overview tab.

THE activity display system SHALL load additional content through pagination when users navigate to next pages.

WHEN a user accesses a profile, THE system SHALL display the overview tab by default.

WHEN a user selects the posts tab, THE system SHALL show only posts created by that user.

WHEN a user selects the comments tab, THE system SHALL show only comments created by that user.

THE activity display system SHALL show relative timestamps (e.g., "2 hours ago", "3 days ago") for all activity items.

THE activity display system SHALL display community names as links to the respective community pages.

THE activity display system SHALL indicate deleted posts or comments with "[deleted]" text when displayed in activity feeds.

THE activity display system SHALL indicate removed posts or comments by moderators with "[removed]" text when displayed in activity feeds.

WHILE loading profile activity, THE system SHALL display a loading indicator.

IF profile activity fails to load, THEN THE system SHALL display error message "Unable to load user activity. Please try again later."

THE activity display system SHALL sort items in descending chronological order (newest first) by default.

WHERE a user has no activity, THE system SHALL display message "This user has no activity yet" in the respective tab.

## Post History

THE post history system SHALL display all posts created by a user in the posts tab.

THE post history system SHALL organize posts by the following criteria:
- Creation date (newest first by default)
- Community where posted
- Post type (text, link, image)

THE post history system SHALL show at most 20 posts per page.

THE post history system SHALL display the following information for each post:
- Post title
- Post type indicator (text/link/image)
- Community name where posted
- Creation timestamp
- Upvote count
- Downvote count
- Comment count
- Preview text for text posts (first 100 characters)
- Preview image for image posts (thumbnail)
- Domain name for link posts

WHEN viewing their own post history, THE system SHALL show draft posts and scheduled posts.

WHEN viewing another user's post history, THE system SHALL exclude draft posts and scheduled posts.

THE post history system SHALL indicate NSFW posts with appropriate badge.

THE post history system SHALL indicate spoiler posts with appropriate badge.

THE post history system SHALL indicate locked posts with appropriate badge.

THE post history system SHALL indicate pinned posts with appropriate badge.

IF a post's community has been deleted, THEN THE system SHALL display "[community deleted]" instead of the community name.

IF a post has been deleted by its author, THEN THE system SHALL show "[deleted by author]" message.

IF a post has been removed by a moderator, THEN THE system SHALL show "[removed by moderator]" message.

THE post history system SHALL enable sorting by:
- New (creation date, newest first)
- Top (highest karma first)
- Controversial (controversy score)

## Comment History

THE comment history system SHALL display all comments created by a user in the comments tab.

THE comment history system SHALL organize comments by:
- Creation date (newest first by default)
- Thread context (post title that comment belongs to)
- Community context (community of the post)

THE comment history system SHALL show at most 20 comments per page.

THE comment history system SHALL display the following information for each comment:
- Post title (that the comment belongs to)
- Community name where the post exists
- Creation timestamp
- Upvote count
- Downvote count
- Comment text preview (first 100 characters)
- Reply count to the comment

THE comment history system SHALL enable sorting by:
- New (creation date, newest first)
- Top (highest karma first)
- Controversial (controversy score)

THE comment history system SHALL include comments on posts in communities the viewing user doesn't have access to, but SHALL hide post and community information, displaying only "[restricted]" text.

IF a comment's parent post has been deleted, THEN THE system SHALL display "[parent post deleted]" instead of the post title.

IF a comment has been deleted by its author, THEN THE system SHALL show "[deleted by author]" message.

IF a comment has been removed by a moderator, THEN THE system SHALL show "[removed by moderator]" message.

IF a comment's text exceeds 100 characters, THEN THE system SHALL truncate for preview and show "..." indicator.

THE comment history system SHALL display nested context for replies with indentation visual cues.

THE comment history system SHALL limit displayed nesting depth to 5 levels for performance reasons.

WHEN viewing their own comment history, THE system SHALL include deleted comments with appropriate indicators.

WHEN viewing another user's comment history, THE system SHALL exclude comments deleted by the author or removed by moderators from display.

## Privacy and Visibility Controls

THE profile visibility system SHALL allow users to set their profile as:
- Public (visible to all users including guests)
- Private (visible only to the user themselves)

THE profile visibility system SHALL default to Public for all new user accounts.

WHEN a user sets their profile to private, THE system SHALL restrict access to their profile information for all users except the account owner.

WHEN a guest attempts to access a private profile, THE system SHALL deny access and redirect to login page with message "This user's profile is private. You need to login to view profiles."

WHEN a member attempts to access a private profile that is not their own, THE system SHALL deny access and display message "This user's profile is private."

THE bio text SHALL be visible only when the profile visibility is set to Public.

THE post history SHALL be visible only when the profile visibility is set to Public.

THE comment history SHALL be visible only when the profile visibility is set to Public.

THE subscription information SHALL be visible only when the profile visibility is set to Public.

THE karma score SHALL be visible even when profile visibility is set to Private.

## Performance Requirements

WHEN a user accesses any profile page, THE system SHALL load and display the page within 2 seconds under normal conditions.

WHEN filtering or sorting profile content, THE system SHALL update the view within 1 second.

THE profile system SHALL cache user activity data to meet performance requirements.

THE profile system SHALL implement pagination for all history listings to maintain performance with large data sets.

## Error Handling

IF a requested user profile does not exist, THEN THE system SHALL return HTTP 404 with message "User profile not found."

IF a user account has been suspended, THEN THE profile system SHALL display message "This user account has been suspended" instead of normal profile information.

IF the profile system experiences a temporary failure, THEN THE system SHALL display message "Profiles are temporarily unavailable. Please try again later."

IF a user attempts to sort by an invalid criterion, THEN THE system SHALL default to sorting by creation date (newest first) and log the error.