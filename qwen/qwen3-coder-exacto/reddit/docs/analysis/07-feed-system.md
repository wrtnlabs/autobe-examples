# Reddit-like Community Platform - Feed System Requirements

## 1. Feed Types

### Home Feed
WHEN a user accesses their home feed, THE system SHALL display posts only from communities that the user is subscribed to.
WHILE a user is not logged in, THE system SHALL NOT grant access to the home feed and SHALL redirect to the login page.

### Popular Feed
THE system SHALL provide a popular feed that displays posts from all communities across the platform.
WHEN any user accesses the popular feed, THE system SHALL show the same content regardless of authentication status.

### Community Feed
WHEN a user accesses a specific community feed, THE system SHALL display posts from only that community.
THE system SHALL allow access to community feeds for both authenticated and unauthenticated users.

## 2. Feed Sorting Options

### Hot Sorting
WHEN a user selects hot sorting, THE system SHALL order posts by a score that prioritizes recent posts with many upvotes.
THE system SHALL calculate the hot score using an algorithm that considers: post creation time, upvote count, and downvote count.

### New Sorting
WHEN a user selects new sorting, THE system SHALL order posts with the most recently created posts appearing first.
THE system SHALL use the post creation timestamp as the primary sorting factor for new sorting.

### Top Sorting
WHEN a user selects top sorting, THE system SHALL order posts by vote score (total upvotes minus total downvotes) in descending order.
THE system SHALL provide time filters for top sorting including: "today", "this week", "this month", "this year", and "all time".

### Controversial Sorting
WHEN a user selects controversial sorting, THE system SHALL order posts with many votes but a score close to zero appearing first.
THE system SHALL calculate controversy score based on the total number of votes with a low net score differential.

## 3. Feed Display Requirements

### General Feed Display
WHEN displaying any feed, THE system SHALL show each post with the following information: title, author username, community name, vote score, comment count, and time since posted.

### Text Post Display
WHEN displaying a text post in a feed, THE system SHALL show the first 200 characters of the post content.
IF a text post content is longer than 200 characters, THEN the system SHALL append an ellipsis to indicate truncated content.

### Image Post Display
WHEN displaying an image post in a feed, THE system SHALL show a thumbnail preview of the image.
THE system SHALL generate thumbnails with a standard size that maintains aspect ratio.

### Link Post Display
WHEN displaying a link post in a feed, THE system SHALL show the domain name of the URL (e.g., "youtube.com").
THE system SHALL extract the domain name from the URL and display it as text.

## 4. Pagination

### Pagination Controls
THE system SHALL paginate all feeds with a fixed page size of 20 posts per page.
WHEN a user navigates between pages, THE system SHALL provide next/previous page controls.

### Page Navigation
WHEN a user accesses the first page of a feed, THE system SHALL disable the previous page button.
WHEN a user accesses a page with fewer than 20 posts, THE system SHALL disable the next page button.

### Continuous Scrolling Alternative
WHERE the client supports continuous scrolling, THE system SHALL provide an API endpoint with cursor-based pagination.
THE system SHALL use cursor-based pagination to improve performance for large result sets.

## 5. Access Controls

### Home Feed Access
WHEN an unauthenticated user attempts to access the home feed, THE system SHALL redirect them to the login page.
THE system SHALL require valid authentication for home feed access.

### Popular Feed Access
THE system SHALL allow access to the popular feed without authentication.
WHEN an unauthenticated user accesses the popular feed, THE system SHALL provide read-only access.

### Community Feed Access
THE system SHALL allow access to community feeds without authentication.
WHEN an unauthenticated user accesses community feeds, THE system SHALL provide read-only access.
WHERE a user is authenticated, THE system SHALL provide personalized elements like "Join Community" or "Leave Community" buttons.

### Content Visibility
WHEN a user accesses any feed, THE system SHALL hide deleted posts from display.
THE system SHALL display removed content as placeholder messages to maintain feed structure.

## 6. Feed Personalization

### Subscribed Communities
WHEN generating a home feed, THE system SHALL filter posts to only show content from communities the user has subscribed to.
THE system SHALL update the home feed in real-time when users subscribe or unsubscribe from communities.

### Voting State Awareness
WHERE a user is authenticated, THE system SHALL indicate the user's previous vote (upvoted, downvoted, or no vote) on each post in the feed.
THE system SHALL visually distinguish already voted posts to improve user experience.

### Community Moderation
WHEN a moderator accesses any feed, THE system SHALL provide moderation tools for posts in their communities.
WHERE a user is a moderator of a community, THE system SHALL highlight posts from their communities with moderation options.