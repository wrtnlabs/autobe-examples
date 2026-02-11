# Content Feeds and Sorting Requirements

## Introduction

This document defines the complete feed system requirements for the Reddit-like community platform. The feed system is the primary mechanism for content discovery and consumption, enabling users to view posts organized by their preferences, community subscriptions, and engagement metrics.

The platform implements three distinct feed types that serve different user needs:

- **Home Feed**: Personalized content from subscribed communities
- **Popular Feed**: Platform-wide popular content for public discovery
- **Community Feed**: Focused content from specific communities

Each feed supports multiple sorting algorithms and pagination to ensure optimal content discovery and user experience.

## User Actors and Feed Access

### Actor-Based Feed Availability

| Feed Type | Guest Access | Member Access | Admin Access |
|-----------|--------------|---------------|--------------|
| Home Feed | ❌ No | ✅ Yes | ✅ Yes |
| Popular Feed | ✅ Yes | ✅ Yes | ✅ Yes |
| Community Feed | ✅ Yes | ✅ Yes | ✅ Yes |

**Business Rule**: Guest users can browse public content but must authenticate to access personalized feeds and interactive features.

### Home Feed Requirements

**Purpose**: Provide members with content from communities they actively follow, creating a personalized content stream.

**WHEN a member navigates to their home feed, THE system SHALL display posts from communities they are subscribed to.**

**WHILE a member is viewing the home feed, THE system SHALL only show posts from their subscribed communities.**

**WHEN a member unsubscribes from a community, THE system SHALL stop showing posts from that community in their home feed immediately.**

**WHEN a member subscribes to a new community, THE system SHALL begin showing posts from that community in their home feed within one minute.**

**IF a member has no active subscriptions, THEN THE system SHALL display a message inviting them to browse and subscribe to communities.**

**WHERE home feed is accessed by a non-authenticated user, THEN THE system SHALL redirect them to the login page or show appropriate error message.**

**WHEN a member visits their home feed for the first time after authentication, THE system SHALL load the most recent 20 posts from their subscribed communities.**

### Popular Feed Requirements

**Purpose**: Enable all users (including guests) to discover trending and high-quality content across the entire platform.

**WHEN any user accesses the popular feed, THE system SHALL display posts from all communities across the platform.**

**WHERE popular feed is accessed by a non-authenticated user, THEN THE system SHALL allow full viewing capability without authentication.**

**WHILE a user views the popular feed, THE system SHALL include posts from both authenticated and community-submitted sources.**

**THE popular feed SHALL be available as the default landing page for non-authenticated users.**

**WHEN the platform has zero posts, THEN THE system SHALL display appropriate placeholder content.**

**WHEN a user views the popular feed for the first time, THE system SHALL show the 20 most popular posts based on the selected sorting method.**

### Community Feed Requirements

**Purpose**: Display all posts from a specific community, enabling focused content discovery and community engagement.

**WHEN any user accesses a community feed, THE system SHALL display posts from the specified community.**

**WHERE community feed is accessed by a non-authenticated user, THEN THE system SHALL allow full viewing capability without authentication.**

**WHEN a user visits a community feed, THE system SHALL display the community name, description, and icon in the header.**

**WHEN a user views a community feed, THE system SHALL indicate whether they are subscribed to that community.**

**WHEN a member views their own community's feed, THE system SHALL display a prominent subscribe button if they are not currently subscribed.**

**WHEN a user attempts to post in a community they are not subscribed to, THEN THE system SHALL deny the action and prompt them to subscribe first.**

**WHERE community feed is accessed for a community that does not exist, THEN THE system SHALL return a 404 error with user-friendly message.**

**WHEN a user views a community feed, THE system SHALL display posts in chronological order by default unless another sorting method is selected.**

## Sorting Algorithms

### Common Sorting Parameters

All feeds support the following sorting options that can be selected by the user:

1. **Hot**: Algorithm balancing recency and engagement
2. **New**: Most recent posts first
3. **Top**: Highest voted posts first
4. **Controversial**: Posts with many votes but near-zero score

**WHEN a user selects a sorting method, THE system SHALL apply it consistently across the entire feed.**

**WHEN a user changes the sorting method, THE system SHALL refresh the feed with content sorted according to the new criteria.**

**THE system SHALL store user's preferred sorting method for each feed type and apply it on subsequent visits.**

**WHERE no sorting method is explicitly selected, THEN THE system SHALL default to 'Hot' sorting for home and popular feeds, and 'New' for community feeds.**

### Hot Sorting Algorithm

**Purpose**: Surface content that is both recent and popular, balancing timely discussion with community engagement.

**WHEN hot sorting is applied, THE system SHALL calculate a hot score for each post using: (log10(upvotes + downvotes + 1) * sign(+1 for upvote, -1 for downvote) + seconds_since_post / 45000) / 1.8.**

**WHILE calculating hot score, THE system SHALL apply decay factor to older posts, making recent content more prominent.**

**WHEN a post receives its first vote, THE system SHALL assign it a baseline hot score that reflects both vote direction and recency.**

**THE hot sorting algorithm SHALL prioritize posts that have received significant engagement within the last 24 hours.**

**WHEN comparing two posts with identical vote counts, THE system SHALL rank the more recently posted content higher.**

**WHERE two posts were posted at the same time, THEN THE system SHALL use vote score as the tiebreaker.**

### New Sorting Algorithm

**Purpose**: Display the most recently created content first, ensuring users see the latest discussions and updates.

**WHEN new sorting is applied, THE system SHALL order posts by creation timestamp in descending order.**

**WHILE applying new sorting, THE system SHALL ignore vote scores and engagement metrics in sorting.**

**THE newest posts SHALL appear at the top of the feed regardless of their vote score.**

**WHEN posts are created within the same second, THE system SHALL use post ID as secondary sort criterion.**

**WHEN a user views the new feed for the first time, THE system SHALL load the 20 most recent posts across the platform.**

### Top Sorting Algorithm

**Purpose**: Show posts with the highest vote scores, with configurable time filters for relevance.

**WHEN top sorting is selected, THE system SHALL display posts ordered by vote score in descending order.**

**WHERE top sorting is applied, THEN THE system SHALL provide time filter options: today, this week, this month, this year, all time.**

**WHEN a time filter is selected, THE system SHALL restrict top posts to those created within that timeframe.**

**THE default time filter for top sorting SHALL be 'all time'.**

**WHEN multiple posts have identical vote scores, THE system SHALL sort them by creation timestamp (newer first).**

**WHEN a user changes the time filter, THE system SHALL refresh the feed with posts from the specified timeframe.**

**WHERE top sorting includes posts with zero or negative scores, THEN THE system SHALL include them in the results.**

### Controversial Sorting Algorithm

**Purpose**: Surface posts that generate divided opinions—posts with many votes but scores close to zero.

**WHEN controversial sorting is applied, THE system SHALL calculate controversy score using: min(upvotes, downvotes) / max(upvotes, downvotes, 1).**

**WHILE calculating controversy score, THE system SHALL only consider posts that have received at least 10 total votes.**

**THE controversial sorting SHALL prioritize posts where upvotes and downvotes are approximately equal.**

**WHEN comparing controversial posts, THE system SHALL sort by controversy score in descending order.**

**WHERE posts have identical controversy scores, THEN THE system SHALL use total vote count as secondary sort criterion.**

**WHEN controversial sorting is applied, THE system SHALL exclude posts with fewer than 10 total votes.**

**THE controversial sorting algorithm SHALL highlight content that generates strong divided opinions.**

## Pagination Implementation

### Pagination Requirements

**WHEN any feed is accessed, THE system SHALL implement pagination to limit results per page.**

**THE system SHALL use cursor-based pagination for all feeds to ensure consistency during content updates.**

**WHEN a user loads a feed page, THE system SHALL return exactly 20 posts per page.**

**WHEN there are fewer than 20 posts remaining, THE system SHALL return all remaining posts.**

**WHERE a feed has no posts, THEN THE system SHALL return an empty array with appropriate metadata.**

**WHEN a user requests the next page, THE system SHALL return posts starting from the cursor position.**

**WHEN a user reaches the end of available posts, THE system SHALL indicate no more content is available.**

### Cursor-Based Pagination

**WHEN pagination is applied, THE system SHALL use timestamp and post ID as cursor components.**

**THE cursor SHALL be encoded as: {timestamp}:{postId} to uniquely identify pagination position.**

**WHEN loading subsequent pages, THE system SHALL use the cursor from the last post of the previous page.**

**WHERE multiple posts share identical timestamps, THEN THE system SHALL use postId as tiebreaker.**

**WHEN a user loads page 1, THE system SHALL use default cursor (none or null).**

**WHEN a user scrolls to bottom of feed, THE system SHALL automatically load next page if more content exists.**

**WHEN post creation or deletion occurs during pagination, THE system SHALL ensure no posts are duplicated or skipped.**

### Page Navigation Features

**WHEN a user reaches the first page, THE system SHALL disable previous page navigation controls.**

**WHEN no next page exists, THE system SHALL disable next page navigation controls.**

**THE system SHALL display page number indicators for cursor-based pagination.**

**WHEN a user manually enters a page number, THE system SHALL navigate to that page using appropriate cursor.**

**WHERE pagination request fails, THEN THE system SHALL retry up to three times before showing error message.**

**WHEN pagination takes longer than 2 seconds, THE system SHALL display loading indicator.**

**THE system SHALL maintain pagination state when user navigates between feeds and returns.**

## Feed Content Display Specifications

### Post List Item Display

**WHEN any feed displays a post in list view, THE system SHALL show the following information:**

- **Title**: Full post title (truncated at 100 characters if needed)
- **Author Username**: Display name of the post creator
- **Community Name**: Name of the community where post was created
- **Vote Score**: Current score (upvotes - downvotes)
- **Comment Count**: Number of comments on the post
- **Time Since Posted**: Human-readable relative time (e.g., "3 hours ago")
- **Content Preview**:
  - For text posts: First 200 characters of content
  - For image posts: Thumbnail image
  - For link posts: Domain name of the URL

**WHEN a post preview is displayed, THE system SHALL handle missing content gracefully.**

**WHERE a post title exceeds display limits, THEN THE system SHALL truncate with ellipsis (...) and show full title on hover.**

**WHEN a post has zero comments, THE system SHALL display "0 comments" instead of hiding the indicator.**

**WHEN showing time since posted, THE system SHALL update display dynamically for time-sensitive feeds.**

**THE system SHALL display content type indicators for link and image posts.**

**WHEN a user hovers over a post thumbnail, THE system SHALL show original image size in a tooltip.**

**WHERE a post's domain cannot be determined, THEN THE system SHALL display "unknown-domain" as fallback.**

### Visual Display Requirements

**WHEN a post is displayed in feed, THE system SHALL use consistent styling across all feed types.**

**THE system SHALL highlight posts from subscribed communities in home feed.**

**WHEN a user has voted on a post, THE system SHALL show their vote direction in the feed.**

**WHERE a post score is negative, THEN THE system SHALL display it in red color.**

**WHEN a post score is positive, THE system SHALL display it in green color.**

**THE system SHALL display score of zero in neutral color (gray).**

**WHEN sorting by hot score, THE system SHALL indicate hot posts with a flame icon.**

**WHEN sorting by controversial score, THE system SHALL indicate controversial posts with a balance scale icon.**

**THE system SHALL apply different styling to posts from different communities in popular feed.**

**WHEN a post was deleted by its author, THE system SHALL display "[Post Deleted]" as title and hide content preview.**

**WHEN a post was deleted by a moderator, THE system SHALL display "[Post Removed by Moderator]" with reason if available.**

**WHERE a post contains only an image, THEN THE system SHALL show the image as content preview instead of text.**

**WHEN a post contains only a link, THE system SHALL show the domain name as content preview.**

**THE system SHALL maintain consistent spacing and layout across all feed items for visual consistency.**

### Content Type Specific Display

#### Text Post Display

**WHEN a text post is displayed, THE system SHALL show the first 200 characters of content.**

**WHERE a text post has fewer than 200 characters, THEN THE system SHALL show the complete content.**

**THE system SHALL append "..." to truncated text to indicate continuation.**

**WHEN a text post contains images, THE system SHALL display a placeholder icon instead of text preview.**

**WHEN a user clicks on a truncated text post, THE system SHALL navigate to the full post view.**

#### Image Post Display

**WHEN an image post is displayed, THE system SHALL show a thumbnail image in the feed.**

**THE thumbnail SHALL maintain 16:9 aspect ratio for visual consistency.**

**WHEN an image post is displayed, THE system SHALL show the original image dimensions.**

**WHERE image loading fails, THEN THE system SHALL display a placeholder with image icon.**

**WHEN a user clicks on an image thumbnail, THE system SHALL open image in lightbox view.**

**THE system SHALL support both static and animated images (GIF) with appropriate preview generation.**

#### Link Post Display

**WHEN a link post is displayed, THE system SHALL show the domain name of the URL.**

**WHERE a link has a favicon, THEN THE system SHALL display it next to the domain name.**

**THE system SHALL attempt to fetch and display link metadata (title, description) if available.**

**WHEN link metadata cannot be fetched, THE system SHALL show the URL as fallback.**

**WHEN a link is from a known service (YouTube, Twitter, etc.), THE system SHALL display appropriate service icon.**

**WHERE a link has been reported or flagged, THEN THE system SHALL display warning indicator.**

### Feed Performance Requirements

**WHEN a feed is loaded, THE system SHALL display content within 3 seconds for the initial page.**

**WHEN pagination is used, THE system SHALL load subsequent pages within 1 second.**

**THE system SHALL cache feed content for 5 minutes to reduce server load and improve performance.**

**WHEN feed content changes due to new posts or votes, THE system SHALL update display within 30 seconds.**

**WHERE feed contains more than 1,000 posts, THEN THE system SHALL implement infinite scrolling instead of page numbers.**

**WHEN a user has slow connection, THE system SHALL prioritize loading content and defer thumbnails.**

**THE system SHALL display skeleton loaders while feed content is loading to improve perceived performance.**

**WHEN feed loading fails, THE system SHALL retry up to 3 times with exponential backoff.**

**WHERE feed fails to load after retries, THEN THE system SHALL display user-friendly error message with reload option.**

## Business Rules

### Content Visibility

**WHEN a member views any feed, THE system SHALL include posts from communities they can legally access.**

**WHILE a user is banned from a community, THE system SHALL exclude posts from that community in their feeds.**

**THE system SHALL respect user's content preferences and filtering settings.**

**WHERE a user has blocked another user, THEN THE system SHALL exclude blocked user's posts from all feeds.**

**WHEN a post is reported and under review, THE system SHALL hide it from feeds until moderator decision.**

**THE system SHALL prioritize content from communities user interacts with most.**

**WHEN a post is edited after being in feed, THE system SHALL update feed display within 30 seconds.**

**IF a post is deleted, THEN THE system SHALL remove it from all feeds within 10 seconds.**

### Feed Integrity

**THE system SHALL prevent duplicate posts from appearing in same feed.**

**WHEN sorting algorithm produces identical scores, THE system SHALL use deterministic tiebreaker.**

**THE system SHALL maintain feed consistency during concurrent user actions.**

**WHEN posts are created rapidly, THE system SHALL batch update feeds to prevent overload.**

**THE system SHALL ensure feed sorting remains stable during pagination requests.**

**WHEN user performance is degraded, THE system SHALL prioritize feed content over meta information.**

## Error Handling

### Feed-Specific Errors

**IF a user accesses home feed without authentication, THEN THE system SHALL return HTTP 401 Unauthorized.**

**IF a user accesses community feed for non-existent community, THEN THE system SHALL return HTTP 404 Not Found.**

**IF pagination cursor is invalid or expired, THEN THE system SHALL return HTTP 400 Bad Request with error code PAGINATION_INVALID_CURSOR.**

**IF sorting algorithm encounters invalid parameters, THEN THE system SHALL default to safe sorting method and log warning.**

**IF feed contains posts from deleted communities, THEN THE system SHALL exclude those posts from results.**

**IF a user subscribes to community during feed session, THEN THE system SHALL refresh feed to include new community posts within 60 seconds.**

**IF post score calculation encounters inconsistency, THEN THE system SHALL log error and use fallback calculation.**

### User Feedback Errors

**WHEN feed fails to load, THE system SHALL display message: "Unable to load feed. Please check your connection and try again."**

**WHEN no posts match selected criteria, THE system SHALL display appropriate message for that feed type.**

**WHEN user has no subscriptions for home feed, THE system SHALL suggest communities to subscribe to.**

**WHEN pagination shows no more content, THE system SHALL display message: "You're all caught up!"**

**WHEN sorting changes take effect, THE system SHALL briefly highlight the sorted content for user awareness.**

## Performance Requirements

### Response Time Targets

**WHEN home feed is loaded, THE system SHALL complete response within 3 seconds.**

**WHEN popular feed is loaded, THE system SHALL complete response within 2 seconds.**

**WHEN community feed is loaded, THE system SHALL complete response within 2 seconds.**

**WHEN pagination is applied, THE system SHALL return next page within 1 second.**

**THE system SHALL maintain sub-second response times for sort method changes.**

**WHERE feed contains complex sorting, THEN THE system SHALL pre-calculate scores for optimal performance.**

### Concurrency Requirements

**THE system SHALL support 1,000 concurrent users viewing feeds simultaneously.**

**WHEN 100 users change sorting method simultaneously, THE system SHALL handle requests without degradation.**

**THE system SHALL maintain feed consistency during 100 concurrent post creations per community.**

**WHERE feed traffic spikes occur, THEN THE system SHALL gracefully degrade by showing cached content.**

### Memory and Storage

**THE system SHALL cache feed results for 5 minutes to reduce database load.**

**WHEN feed cache is invalidated, THE system SHALL refresh content within 30 seconds.**

**THE system SHALL use cursor-based pagination to minimize memory usage for large datasets.**

**WHERE feed contains more than 10,000 posts, THEN THE system SHALL implement lazy loading.**

**THE system SHALL limit maximum feed depth to 50 pages to prevent resource exhaustion.**

## Security Considerations

### Access Control

**THE system SHALL verify user authentication before serving home feed.**

**THE system SHALL respect community subscription requirements for post inclusion.**

**WHERE a post is from a banned community, THEN THE system SHALL exclude it from all feeds.**

**THE system SHALL apply user blocking rules to prevent unwanted content.**

**WHEN sorting by controversial score, THE system SHALL exclude posts from banned users.**

**THE system SHALL audit log all feed access for security monitoring.**

### Data Protection

**THE system SHALL encrypt feed data in transit using TLS 1.3.**

**THE system SHALL hash all user identifiers in logs for privacy protection.**

**WHERE feed contains user data, THEN THE system SHALL apply data retention policies.**

**THE system SHALL implement rate limiting to prevent feed scraping.**

**WHEN feed includes user-generated content, THE system SHALL validate and sanitize all inputs.**

## Success Metrics

### User Engagement

**THE system SHALL track home feed engagement rate (posts viewed vs. total shown).**

**THE system SHALL measure average time spent on each feed type.**

**THE system SHALL monitor feed-specific bounce rate within first 30 seconds.**

**WHERE controversial sorting is used, THEN THE system SHALL track user interaction rate.**

**THE system SHALL measure pagination effectiveness (pages per session).**

### Technical Performance

**THE system SHALL maintain 99.9% uptime for feed delivery.**

**THE system SHALL ensure less than 1% error rate for feed requests.**

**THE system SHALL limit average feed load time to under 3 seconds.**

**WHERE feed caching is implemented, THEN THE system SHALL achieve over 80% cache hit rate.**

**THE system SHALL maintain consistent sorting stability during pagination.**

## Future Considerations

### Potential Enhancements

**The system MAY be extended to support:**

- Personalized feed recommendations based on user history
- Filter by post type (text, image, link only)
- Filter by community size or activity level
- Custom sorting weight configurations
- Social feed showing friends' activity
- Trending topics integrated into feeds

**WHERE these enhancements are implemented, THEN THE system SHALL maintain backward compatibility with existing feeds.**

**THE system SHALL preserve current feed behavior as baseline while introducing experimental sorting methods.**

---

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*