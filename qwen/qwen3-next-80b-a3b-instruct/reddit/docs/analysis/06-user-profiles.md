## User Profile Requirements

User profiles are the central hub for each member’s activity and reputation on the community platform. This document defines exactly what data is displayed, how it is aggregated, sorted, and controlled, and what privacy boundaries apply. Profiles are public by default for members, but users retain control over visibility. The profile system is designed to incentivize positive contribution by showcasing engagement, content quality, and community standing.

### Profile Data Structure

Every user profile must contain a standardized set of data fields that are populated automatically based on system activity. No manual profile editing is allowed beyond the options defined in the Profile Personalization Limits section below.

- Profile page URL: `/u/{username}`
- Username: Displayed as a unique, URL-safe identifier (alphanumeric + underscore, 3–20 characters)
- Display name: Optional, user-set pseudo-name (max 50 characters), visible on profile and posts/comments when different from username
- Avatar: Default system-generated icon (based on username hash) unless user uploads a custom image (JPEG/PNG, max 2MB)
- Member since: Date and time of account registration (ISO 8601 format)
- Location: Optional, user-entered text field (max 100 characters), not a geolocation
- Bio: Optional, user-entered markdown-enabled description (max 500 characters)
- Karma: Numeric value displayed with comma formatting (e.g., 12,345)

### Post History Display

All posts created by the user must be displayed on their profile under the "Posts" tab. The system must aggregate and present posts from all communities the user has contributed to.

- Posts must be sorted chronologically by creation date (newest first)
- Posts must be displayed in paginated lists of 20 items per page
- Each post entry must show:
  - Title (truncated to 80 characters if longer)
  - Community name (linked to the community page)
  - Post type (Text / Link / Image)
  - Date posted (formatted as "Jan 12, 2025")
  - Vote score (upvotes minus downvotes)
  - Number of comments
- Posts older than 90 days must remain visible but may be loaded asynchronously to improve initial page load
- Posts deleted by the user or removed by moderation must not appear
- Archived posts (inactive for more than 1 year) must still be visible and queryable

### Comment History Display

All comments made by the user must be displayed on their profile under the "Comments" tab. Comments are treated separately from posts and have their own display logic.

- Comments must be sorted chronologically by creation date (newest first)
- Comments must be displayed in paginated lists of 30 items per page
- Each comment entry must show:
  - Text content (truncated to 120 characters if longer, with "... Read more" link)
  - Parent post title (linked to the post)
  - Community name (linked to the community page)
  - Date posted (formatted as "Jan 12, 2025")
  - Vote score (upvotes minus downvotes)
- Replies to comments must be included in the comment history as individual entries
- Comments deleted by the user or removed by moderation must not appear
- Comment threads must be indexed individually, not as nested structures

### Subscription List

Users can subscribe to communities to receive updates and gain easier access to content. The subscription list is displayed under the "Subscriptions" tab.

- Lists all communities the user has subscribed to
- Must be sorted alphabetically by community name (ascending)
- Each subscription entry must show:
  - Community name (linked to the community page)
  - Member count (displayed as "X members")
  - Creation date of subscription (formatted as "Joined on Jan 12, 2025")
- Users may unsubscribe from any community at any time
- Subscriptions must not be visible to other users unless explicitly shared
- Subscription activity does not affect karma or reputation

### Karma Display

Karma is the primary reputation metric for users on this platform. It reflects the community's perception of the user's contributions.

- Karma value must be displayed prominently at the top of the profile
- Karma must be formatted with commas for thousands (e.g., "12,345")
- Karma is calculated as:
  - +1 for each upvote on a post
  - -1 for each downvote on a post
  - +1 for each upvote on a comment
  - -1 for each downvote on a comment
  - No karma is gained or lost for self-upvotes or self-downvotes
  - No karma changes occur for unvotes (canceling a vote)
  - No karma is awarded for upvotes/downvotes received before the user registered
- Karma totals are displayed as a single aggregated value regardless of category (posts or comments)
- Experimental features like "Karma per subreddit" are not permitted

### Content/Activity Timeline

Users must have access to a consolidated activity feed on their profile under the "Activity" tab.

- The timeline must show all user-initiated actions in reverse chronological order
- Actions must include:
  - "Posted to {community}"
  - "Commented on {post title}"
  - "Upvoted {post title}"
  - "Downvoted {comment text}"
  - "Subscribed to {community}"
  - "Reported {content}"
- Only user-initiated actions are logged
- System-generated events (e.g., password change, email verification) do not appear
- Timeline entries are limited to the past 500 days
- Entries older than 500 days are archived and not displayed
- Actions must be displayable without paging for the most recent 100 items

### Privacy and Visibility Controls

Users can adjust the visibility of specific components of their profile.

- By default, profiles are publicly visible to all users (including guests)
- Users may choose the following privacy settings:
  - "Hide my profile from guests": Guest users cannot view profile data
  - "Hide all my posts from public view": Posts are only visible in direct links and to subscribers
  - "Hide all my comments from public view": Comments are only visible in direct links and to subscribers
  - "Hide my karma score": All users see "Karma: Hidden" instead of a value
  - "Hide my subscription list": No one can see which communities the user follows
- Privacy settings only apply to the profile tab and user activity pages
- Profile data remains accessible via API to moderators and admins for moderation purposes
- Anonymized data may be used for platform analytics without revealing identity

### Profile Personalization Limits

Users have limited options to personalize their profiles. No custom HTML, CSS, or layouts are permitted.

- Users may set a display name (replaces username visually, does not replace URL identifier)
- Users may upload a single avatar image (2MB max, JPEG/PNG only)
- Users may enter a bio using limited markdown (bold, italic, links, lists)
- Users may select a default theme (Light / Dark / Auto) that applies to their profile display
- Users may choose to enable/disable comment highlighting (coloring replies to their comments)
- No other customization is permitted
- Profiles cannot have banners, widgets, ads, or embedded media
- Default avatar must be used if no image is uploaded

### Data Retention and Archiving Policy

- Profile data is retained permanently as long as the account exists
- Deleted content (posts/comments) is permanently removed from profile history
- Inactive accounts (no login for 2+ years) retain full profile data and visibility
- Suspended accounts hide profile from public view but preserve all data for audit purposes
- Archived profiles (account deleted) are permanently erased from the system
- Users may download a full data export of their profile history including timestamps and content
- Profile data is backed up daily and replicated across geographically distributed servers

### Performance Requirements

- Profile pages must load fully within 2 seconds on a standard mobile device (4G connection)
- Initial profile view must render username, karma, and avatar within 800ms
- Posts and comments tab content must be lazily loaded after initial render
- Pagination must support > 500 pages of data without crash or timeout
- Search within posts/comments on profile must return results in < 1.5 seconds

### Error Handling and Recovery

- IF a user attempts to access a profile for a deleted account, THEN the system SHALL show "This user’s account has been deleted."
- IF a user’s profile contains broken links to deleted communities, THEN the system SHALL display "[Community No Longer Exists]" instead of the community name
- IF a user includes a malformed bio with unsupported markdown, THEN the system SHALL render safe text and log a warning
- IF the karma calculation encounters corrupted vote data, THEN the system SHALL restore from daily backup and notify admin
- IF the profile page times out during loading, THEN the system SHALL display "Profile loading—please try again" and auto-refresh after 5 seconds

### Edge Cases and Special Scenarios

- WHEN a user changes their username, THEN the system SHALL maintain redirects from the old profile URL for 90 days
- WHILE a user is suspended, THEN the system SHALL not display their profile to guests or members, but SHALL allow admins to view all data
- WHEN a user reports multiple posts in a short span, THEN the system SHALL temporarily restrict profile visibility to moderators pending review
- WHERE a user has more than 10,000 posts, THEN the system SHALL still display all in chronological order with pagination
- WHERE a user’s karma drops below 0, THEN the system SHALL still display "-5" and not hide the value
- WHERE a user has no activity in the last 180 days, THEN the system SHALL still maintain their profile in its entirety

### Relationship to Other Documents

- This document references all content defined in [User Actor Structure](./01-user-actors.md) for permission boundaries
- This document depends on [Karma System Requirements](./05-karma-system.md) for calculation logic
- This document depends on [Functional Requirements](./02-functional-requirements.md) for post/comment system behavior
- This document constrains [Authentication Flow](./06-authentication-flow.md) in terms of token payload data
- This document defines the output for [User Journey Documentation](./03-user-journey.md) on the "View Profile" path

### Optional Future Considerations (Not Currently Required)

- Beta feature: "Top Subreddits" badge based on most active communities
- Beta feature: "Meme of the Month" badge for consistently high-karma posts
- Beta feature: Custom profile badges for milestone karma thresholds
- Beta feature: Read-only "Legacy Mode" for historically observed user profiles

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*