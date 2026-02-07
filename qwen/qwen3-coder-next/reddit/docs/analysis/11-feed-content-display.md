# Feed and Content Display Requirements Specification

## Overview

The feed and content display system is the primary interface through which users interact with community content. This document outlines the complete requirements for feed algorithms, sorting mechanisms, pagination, and content display rules that power the Reddit-like community platform's user experience.

## Feed Types

### Home Feed

The Home Feed shows posts exclusively from communities a user has subscribed to, creating a personalized content stream based on their interests and community membership.

#### Access Control
- Available ONLY to authenticated users
- Non-authenticated users CANNOT access this feed
- Users must be logged in to view their personalized feed

#### Content Rules
- THE system SHALL display posts ONLY from communities the user is subscribed to
- THE system SHALL exclude posts from unsubscribed communities
- THE system SHALL include posts from communities the user owns or moderates

#### User Benefits
- Provides focused, relevant content aligned with user interests
- Reduces information overload by filtering to preferred communities
- Creates a personalized news experience based on subscription choices

### Popular Feed

The Popular Feed displays the most engaging content across the entire platform, showing trending and high-scoring posts from all communities.

#### Access Control
- Available to EVERYONE (including non-authenticated users)
- No login required to access popular content
- Functions as a public showcase of platform activity

#### Content Rules
- THE system SHALL display posts from ALL communities across the platform
- THE system SHALL exclude banned users' posts from display
- THE system SHALL prioritize content with high engagement metrics

#### Business Value
- Allows platform growth through content discovery
- Enables new users to sample platform content without registration
- Provides public metrics for community engagement

### Community Feed

The Community Feed shows posts from a specific community, serving as the primary interface for community browsing and engagement.

#### Access Control
- Available to EVERYONE (including non-authenticated users)
- Anyone can view community content
- Users can subscribe from the community feed page

#### Content Rules
- THE system SHALL display posts ONLY from the specified community
- THE system SHALL exclude posts from other communities
- THE system SHALL include pinned posts from that community
- THE system SHALL include posts from banned users (but mark them appropriately)

#### Community Management Benefits
- Allows community owners to showcase their community's content
- Enables new users to evaluate communities before subscribing
- Provides community leaders with visibility into their members' content

## Sorting Algorithms

All three feed types support the same five sorting algorithms, allowing users to view content through different engagement lenses.

### Hot Sort

The Hot Sort prioritizes recently published content that is gaining significant attention, creating a dynamic feed that highlights rising popularity.

#### Algorithm Requirements
- THE system SHALL prioritize posts with recent publication dates
- THE system SHALL prioritize posts with high upvote ratios
- THE system SHALL penalize older posts naturally over time
- THE system SHALL balance recency and engagement

#### Business Logic
- Posts with many recent upvotes appear at the top
- Older posts gradually lose visibility
- New posts with immediate engagement gain rapid visibility
- Posts with declining engagement fall in ranking

#### User Experience
- Users see trending content before it becomes mainstream
- Fresh perspectives and timely content surface quickly
- Community buzz is reflected in real-time rankings

### New Sort

The New Sort displays content based purely on publication date, ensuring users see the most recently created content first.

#### Algorithm Requirements
- THE system SHALL sort posts by creation timestamp (descending)
- THE system SHALL ignore vote scores entirely in sorting
- THE system SHALL prioritize the most recent posts
- THE system SHALL maintain chronological order regardless of engagement

#### Use Cases
- Community owners want to review new member contributions
- Users want to see the latest discussions in their communities
- Moderators need to monitor recent posts for policy violations

#### Performance Considerations
- This is the simplest sorting algorithm (single timestamp field)
- The system SHALL maintain index on post creation timestamp
- Query performance SHALL remain consistent regardless of post volume

### Top Sort

The Top Sort ranks posts by vote score, allowing users to find the highest-quality or most appreciated content.

#### Algorithm Requirements
- THE system SHALL sort posts by total vote score (descending)
- THE system SHALL include a time filter option
- THE system SHALL support multiple time windows for top content

#### Time Filter Options
The system SHALL provide the following time window filters:
- **Today**: Top posts created within the last 24 hours
- **This Week**: Top posts created within the last 7 days
- **This Month**: Top posts created within the last 30 days
- **This Year**: Top posts created within the last 365 days
- **All Time**: All posts regardless of creation date

#### Business Value
- Users can find evergreen, high-quality content
- Community leaders can identify valuable contributors
- Content discovery is enhanced through quality-based ranking

#### Implementation Notes
- Top sort requires calculating vote scores from the voting system
- Time filtering requires filtering by creation timestamp AND score
- Cache invalidation should be considered for performance

### Controversial Sort

The Controversial Sort highlights posts with significant engagement but near-zero scores, revealing content that generates strong opinions on both sides.

#### Algorithm Requirements
- THE system SHALL calculate controversy based on vote count and score proximity to zero
- THE system SHALL prioritize posts with high total votes but low absolute scores
- THE system SHALL use a formula that increases with both volume and balance

#### Controversy Formula
The system SHALL calculate controversy using this business logic:
- Calculate total votes (upvotes + downvotes)
- Calculate score (upvotes - downvotes)
- Calculate controversy as: (total votes) × (1 - |score| / (total votes + 1))
- Sort by controversy score in descending order

#### User Benefits
- Users discover divisive topics that spark discussion
- Moderators can monitor potentially problematic content
- Community leaders understand engagement patterns around difficult topics

#### Business Considerations
- Controversial content may indicate policy violations
- Moderators should review highly controversial posts
- Business monitoring should track controversial post moderation rates

## Pagination

All feeds require pagination to manage performance and user experience with large content volumes.

### Standard Pagination Configuration
- THE system SHALL default to 20 posts per page
- THE system SHALL support configurable page sizes
- THE system SHALL support cursor-based pagination for performance
- THE system SHALL provide next/previous page navigation

### Cursor-Based Pagination
- THE system SHALL use post creation timestamp as cursor for feed pagination
- THE system SHALL provide next_cursor and previous_cursor in responses
- THE system SHALL support forward and backward navigation through cursors
- THE system SHALL ensure consistent ordering across paginated results

### Performance Requirements
- The system SHALL return the first page of results within 2 seconds
- The system SHALL maintain pagination performance with large datasets
- THE system SHALL handle edge cases like deleted posts during pagination

### Edge Case Handling
- IF a user requests a page beyond available content, THE system SHALL return empty array
- IF posts are deleted during pagination, THE system SHALL adjust cursor positions
- IF a user's subscription changes during feed viewing, THE system SHALL refresh content

## Content Display Rules

### Feed List Display

When displaying posts in any feed list, the system SHALL show consistent, concise information to enable quick scanning and engagement decisions.

#### Required Display Fields
For EVERY post in feed lists, THE system SHALL display:
1. **Title**: The post's title text
2. **Author Username**: The user's display username
3. **Community Name**: The community where post was published
4. **Vote Score**: Current total score (upvotes - downvotes)
5. **Comment Count**: Total number of comments on the post
6. **Time Since Posted**: Human-readable time difference (e.g., "3 hours ago")

#### Post-Type-Specific Display Rules

**Text Posts**
- THE system SHALL display the first 200 characters of content as preview
- THE system SHALL truncate content and add ellipsis ("...") if longer than 200 characters
- THE system SHALL preserve word boundaries when truncating
- THE system SHALL NOT display images (text posts may not have images)

**Link Posts**
- THE system SHALL display the domain name of the URL (e.g., "youtube.com")
- THE system SHALL extract and format domain name consistently
- THE system SHALL NOT display full URLs to save space
- THE system SHALL NOT show content previews (external content)

**Image Posts**
- THE system SHALL display a thumbnail of the uploaded image
- THE system SHALL generate appropriate thumbnail dimensions
- THE system SHALL include alt text for accessibility
- THE system SHALL NOT display full content or links

### Post Detail View

When viewing a single post's complete details, the system SHALL display comprehensive information.

#### Detail View Requirements
THE system SHALL display the following fields for individual posts:
1. **Full Content**: Complete post content without truncation
2. **Author Information**: Full user profile details
3. **Community Context**: Community name and description
4. **Vote Score**: Current score with upvote/downvote indicators
5. **Comment Count**: Total comments with link to view them
6. **Time Information**: Exact timestamp and relative time
7. **Moderation Flags**: Any post-stickied or content-removed indicators
8. **Content Type Indicator**: Visual indicator of post type (text/link/image)

#### Display Formatting
- THE system SHALL render markdown content safely (escaped HTML, allowed tags only)
- THE system SHALL handle external links safely (nofollow, target="_blank")
- THE system SHALL display images at appropriate widths for readability
- THE system SHALL maintain responsive design across devices

## Search Functions

Users can search for communities, posts, and content across the platform.

### Community Search

The system SHALL support searching for communities by name.

#### Search Requirements
- THE system SHALL return communities matching search criteria
- THE system SHALL prioritize exact name matches
- THE system SHALL include partial name matches
- THE system SHALL limit results to prevent overload
- THE system SHALL include subscriber counts in search results

#### Search Interface
- THE system SHALL provide search input field in community browsing
- THE system SHALL support real-time search suggestions
- THE system SHALL show results in descending order by subscriber count

### Post Search

The system SHALL support searching for posts across the platform.

#### Search Requirements
- THE system SHALL search post titles and content
- THE system SHALL support keyword matching
- THE system SHALL include community context in results
- THE system SHALL prioritize recent, popular content
- THE system SHALL include pagination for search results

#### Advanced Search Options
The system SHALL support optional filters:
- Filter by community
- Filter by author
- Filter by content type
- Filter by date range
- Filter by vote score range

### Search Performance
- THE system SHALL return search results within 3 seconds
- THE system SHALL cache common search queries
- THE system SHALL handle typos gracefully (fuzzy matching)
- THE system SHALL provide helpful suggestions when no results found

## Algorithm Implementation Considerations

### Scalability Requirements
- THE system SHALL handle millions of posts across thousands of communities
- THE system SHALL maintain consistent performance with growing content volume
- THE system SHALL implement appropriate caching for popular feeds
- THE system SHALL optimize database queries for sorting and filtering

### Cache Strategy
- THE system SHALL cache hot feed results for 1-5 minutes
- THE system SHALL cache popular feed results for 10-15 minutes
- THE system SHALL invalidate cache on user voting actions
- THE system SHALL implement cache warming for frequently accessed feeds

### Real-Time Considerations
- THE system SHALL update vote scores in real-time for user experience
- THE system SHALL refresh feed content on user interactions
- THE system SHALL handle concurrent voting conflicts gracefully
- THE system SHALL provide visual feedback for vote changes

## Error Handling

### Feed-Specific Error Scenarios

**Unauthorized Access**
- IF a non-authenticated user attempts to access Home Feed, THE system SHALL return 401 Unauthorized
- IF a banned user attempts to create posts in a community, THE system SHALL deny access

**Invalid Sorting Parameters**
- IF a user requests an invalid sort type, THE system SHALL default to "Hot"
- IF a user requests an invalid time filter, THE system SHALL return appropriate error
- IF cursor-based pagination has invalid cursor values, THE system SHALL return error

**Empty Feed Handling**
- IF a user's Home Feed has no posts, THE system SHALL show empty state message
- IF a search returns no results, THE system SHALL suggest alternative searches
- IF a community has no posts, THE system SHALL indicate no content available

### Performance Error Responses
- IF feed generation exceeds timeout, THE system SHALL return partial results or error
- IF sorting algorithms encounter data errors, THE system SHALL gracefully degrade
- IF cache systems fail, THE system SHALL fall back to direct database queries

## Business Rules and Constraints

### Content Moderation Integration
- THE system SHALL exclude reported content pending moderator review
- THE system SHALL hide content from banned users in community feeds
- THE system SHALL maintain moderation transparency in feed display
- THE system SHALL respect community-specific content policies

### User Experience Consistency
- THE system SHALL maintain consistent display rules across all feeds
- THE system SHALL preserve voting state (user's current vote) in feed views
- THE system SHALL remember user's last sort preference per feed type
- THE system SHALL handle user preference changes gracefully

### Platform Integrity
- THE system SHALL prevent vote manipulation in sorting algorithms
- THE system SHALL exclude bot-generated content from feeds
- THE system SHALL maintain fair distribution across communities
- THE system SHALL prevent feed spam through algorithmic controls
