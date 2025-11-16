# Post Sorting and Content Discovery

## Overview

This document specifies how the communityPlatform ranks, sorts, and presents posts to users. The sorting algorithms directly impact user engagement, content visibility, and platform success. This specification defines four primary sorting methods (hot, new, top, controversial) and content discovery mechanisms that help users find relevant discussions.

## 1. Hot Posts Algorithm

The "hot" algorithm is the primary sorting method that surfaces timely, engaging content. It balances recency with engagement metrics to keep the community active and engaged.

### 1.1 Hot Posts Calculation

THE communityPlatform SHALL calculate a "hotness" score for each post using the following formula:

```
Hotness Score = (Base Score) × (Time Decay Factor)

Where:
  Base Score = (Upvotes - Downvotes + Comments × 0.5)
  Time Decay Factor = 1 / (1 + (Hours Since Posted / 24))
  
Example:
  Post with 100 net votes (upvotes - downvotes) and 20 comments posted 12 hours ago:
  Base Score = 100 + (20 × 0.5) = 110
  Time Decay = 1 / (1 + (12 / 24)) = 1 / 1.5 = 0.667
  Hotness Score = 110 × 0.667 = 73.4
```

### 1.2 Hot Posts Display Requirements

WHEN a user requests posts sorted by "hot", THE communityPlatform SHALL:
- Sort posts by descending hotness score
- Recalculate scores every 5 minutes to reflect recent activity
- Return posts ordered from highest to lowest hotness score
- Include the calculated hotness score in the response for transparency

### 1.3 Community-Specific Hot Algorithm Configuration

WHERE a community has custom settings enabled, THE system SHALL apply community-specific weighting to the hotness calculation:
- Communities can adjust comment weight multiplier (default 0.5, configurable range 0.1 to 1.0)
- Communities can adjust time decay rate (default 24 hours, configurable range 12 to 72 hours)
- These settings are applied per-community and configured by moderators
- THE communityPlatform SHALL store these settings in the community configuration
- Changes to hot algorithm settings apply only to new score calculations; existing cached scores expire after 5 minutes

### 1.4 Hot Posts Boost Period for New Content

WHEN a post is first created, THE communityPlatform SHALL apply a temporary engagement boost for the first 2 hours:
- Posts in their first 2 hours receive 1.5× multiplier to engagement metrics (upvotes and comments)
- This encourages visibility of new content during the critical initial activity window
- After 2 hours elapse, normal hotness calculation applies without boost
- The boost mechanism helps surface diverse content rather than favoring only old popular posts
- Boost period is consistent across all communities

### 1.5 Time Decay Boundaries and Cutoff Rules

THE communityPlatform SHALL enforce the following time decay rules:
- Posts older than 6 months SHALL NOT appear in hot sorting
- Posts with calculated hotness scores below 0.1 SHALL be filtered from results to maintain feed quality
- A post's hotness score never falls below 0 (minimum floor)
- The time decay calculation ensures older posts naturally deprioritize as time passes
- Users viewing "hot" feeds SHALL see primarily content from the past 48 hours

### 1.6 Hot Algorithm Practical Examples

THE following examples illustrate hotness scoring:

**Example 1: Brand New Popular Post**
- Post created 1 hour ago
- 50 upvotes, 2 downvotes = 48 net votes
- 5 comments
- Base Score = 48 + (5 × 0.5) = 50.5
- Time Decay = 1 / (1 + 1/24) = 0.96
- Hotness Score = 50.5 × 0.96 = 48.5

**Example 2: Aging Popular Post**
- Post created 24 hours ago
- 200 upvotes, 10 downvotes = 190 net votes
- 50 comments
- Base Score = 190 + (50 × 0.5) = 215
- Time Decay = 1 / (1 + 24/24) = 0.5
- Hotness Score = 215 × 0.5 = 107.5

**Example 3: Old Post with Steady Engagement**
- Post created 72 hours ago
- 300 upvotes, 20 downvotes = 280 net votes
- 100 comments
- Base Score = 280 + (100 × 0.5) = 330
- Time Decay = 1 / (1 + 72/24) = 0.25
- Hotness Score = 330 × 0.25 = 82.5

These examples demonstrate how newer posts with good engagement can outrank older posts with more votes due to time decay.

## 2. New Posts Sorting

The "new" sorting method displays the most recently created posts, allowing community members to see emerging discussions immediately.

### 2.1 New Posts Chronological Ordering

WHEN a user requests posts sorted by "new", THE communityPlatform SHALL:
- Sort all visible posts by creation timestamp in descending order (newest first)
- Return posts from most recent to oldest without engagement-based filtering
- Include creation timestamp in response for clarity
- NOT apply any engagement-based metrics to new posts sorting
- Display posts in a consistent order without randomization

### 2.2 Visibility Rules for New Posts

THE communityPlatform SHALL NOT include in "new" sorting:
- Posts that have been removed by moderators (soft-deleted with visibility="removed")
- Posts from users who have been suspended from the platform
- Permanently deleted posts (hard-deleted)
- Posts from communities the member user has not subscribed to (when viewing personalized feed)
- Posts from private/archived communities (unless user is moderator or owner of that community)
- Posts flagged as spam pending moderator review (hidden from all users except moderators)

### 2.3 Tie-Breaking for Simultaneous Posts

IF two or more posts are created within the same second (millisecond precision), THE communityPlatform SHALL break ties by:
- Using the unique post ID as a secondary sort key
- Consistently ordering by post ID in ascending order (lower IDs first when timestamps identical)
- Ensuring deterministic results across all requests
- Maintaining consistent ordering for users browsing the same timeframe across multiple sessions

### 2.4 New Posts Time Window Definition

THE communityPlatform SHALL define "new" posts as those created within the last 30 days:
- Posts older than 30 days are still sortable by other methods but excluded from "new" sorting
- This prevents infinite scrolling through months of historical content
- Users can explicitly search for older content using search/filter features (see Section 6)
- The 30-day window applies globally across all communities consistently

### 2.5 New Posts Feed Composition

WHEN displaying the "new" feed, THE communityPlatform SHALL:
- Include all posts from communities the user is subscribed to
- NOT filter by engagement level, score, or quality metrics
- Display in strict reverse chronological order
- Allow users to see all recent contributions regardless of popularity
- Enable discovery of niche or specialized content that might not rank in hot/top

## 3. Top Posts Ranking

The "top" sorting method shows the most successful posts based on net votes. Users can view top posts over different time periods to discover high-quality or highly appreciated content.

### 3.1 Top Posts Time Windows

THE communityPlatform SHALL support the following configurable time windows for "top" sorting:
- **Today**: Posts created in the last 24 hours, ranked by net votes highest to lowest
- **This Week**: Posts created in the last 7 days, ranked by net votes highest to lowest
- **This Month**: Posts created in the last 30 days, ranked by net votes highest to lowest
- **All Time**: All posts throughout platform history, ranked by net votes highest to lowest
- **Custom Window** (admin/moderator feature): Users with elevated permissions can specify start and end dates for ranking

### 3.2 Top Posts Scoring Methodology

WHEN calculating top post scores, THE communityPlatform SHALL:
- Calculate net votes as (Total Upvotes - Total Downvotes)
- Sort posts in descending order by net vote count (highest to lowest)
- Apply NO time-decay factor within the selected time window
- Include posts with 0 or negative vote counts in the sortable pool (not filtered)
- Recalculate and resort when new votes arrive (real-time updates)

### 3.3 Top Posts Filtering and Visibility Rules

THE communityPlatform SHALL apply the following filters to top posts:
- Exclude removed posts (marked as deleted by moderator with visibility="removed")
- Exclude posts from suspended users
- Exclude posts from hidden or deleted communities
- IF user is not a member of a private community, EXCLUDE those posts from results
- Include archived posts (older than 6 months) as they remain rankable for historical analysis
- Include all public posts regardless of engagement level

### 3.4 Top Posts Minimum Engagement Threshold

WHERE community moderation settings specify minimum engagement requirements:
- Communities can require minimum net votes (default 0) for posts to appear in top rankings
- This prevents trivial posts with single upvotes from appearing in "top" sorting
- Configurable setting range: 0 to 100 votes minimum per community
- Applied per-community by community moderators
- Setting affects all time windows equally

### 3.5 Top Posts Tie-Breaking Logic

IF multiple posts have identical net vote counts, THE communityPlatform SHALL break ties by:
- Secondary sort by comment count (descending - more discussion ranked higher)
- Tertiary sort by creation time (newer posts ranked higher than older posts with same votes)
- Quaternary sort by post ID (lowest ID first for determinism)
- These tiebreaker rules ensure consistent, predictable ordering across requests

### 3.6 Top Posts Examples

THE following examples show top posts ranking:

**Time Window: This Month**
- Post A: 500 upvotes, 10 downvotes = 490 net votes, 85 comments
- Post B: 300 upvotes, 5 downvotes = 295 net votes, 120 comments
- Post C: 200 upvotes, 2 downvotes = 198 net votes, 40 comments
- Post D: 100 upvotes, 200 downvotes = -100 net votes, 50 comments
- Ranking: Post A (490), Post B (295), Post C (198), Post D (-100)

Even Post D with substantial engagement (100 upvotes, 50 comments) ranks last because net votes are negative.

## 4. Controversial Posts Ranking

The "controversial" sorting method highlights posts with balanced engagement from opposing viewpoints, indicating significant community discussion and divided opinion.

### 4.1 Controversy Score Calculation Formula

THE communityPlatform SHALL calculate a controversy score using the following mathematical methodology:

```
Controversy Score = (Total Votes) × (Vote Ratio Variance)

Where:
  Total Votes = Upvotes + Downvotes
  Upvote Ratio = Upvotes / Total Votes
  Downvote Ratio = Downvotes / Total Votes
  Vote Ratio Variance = 1 - |Upvote Ratio - 0.5| × 2
  
Example 1: Highly Controversial Post
  Post with 100 upvotes and 90 downvotes:
  Total Votes = 190
  Upvote Ratio = 100/190 = 0.526
  Downvote Ratio = 90/190 = 0.474
  Vote Ratio Variance = 1 - |0.526 - 0.5| × 2 = 1 - 0.052 = 0.948
  Controversy Score = 190 × 0.948 = 180.1

Example 2: Consensus Post
  Post with 200 upvotes and 5 downvotes:
  Total Votes = 205
  Upvote Ratio = 200/205 = 0.976
  Downvote Ratio = 5/205 = 0.024
  Vote Ratio Variance = 1 - |0.976 - 0.5| × 2 = 1 - 0.952 = 0.048
  Controversy Score = 205 × 0.048 = 9.84

Example 3: Perfectly Divided Post
  Post with 150 upvotes and 150 downvotes:
  Total Votes = 300
  Upvote Ratio = 0.5
  Downvote Ratio = 0.5
  Vote Ratio Variance = 1 - |0.5 - 0.5| × 2 = 1.0
  Controversy Score = 300 × 1.0 = 300 (highest possible score)
```

This formula prioritizes posts where engagement is highest (total votes) AND opinion is most divided (upvotes close to downvotes).

### 4.2 Controversial Posts Minimum Engagement Requirements

THE communityPlatform SHALL only include posts in controversial sorting if they meet ALL of these criteria:
- Minimum 20 total votes (upvotes + downvotes combined) to ensure meaningful sample size
- Vote split ratio between 40% and 60% for each direction (ensures genuine controversy, not consensus)
- THIS MEANS: Upvotes must be between 40%-60% of total, and downvotes between 40%-60% of total
- Posts with stronger consensus (e.g., 80% upvotes, 20% downvotes) do not meet the "controversial" threshold
- Purpose of minimum threshold: Prevent low-engagement posts from appearing as controversial

### 4.3 Controversial Posts Display and Metadata

WHEN a user requests posts sorted by "controversial", THE communityPlatform SHALL:
- Sort posts by controversy score in descending order (highest controversy first)
- Include only posts meeting minimum engagement thresholds from Section 4.2
- Return metadata showing upvote/downvote split for transparency (e.g., "47% upvotes, 53% downvotes")
- Apply no time decay (all posts regardless of age eligible if they meet criteria)
- Update sorting in real-time as new votes arrive

### 4.4 Fraud Detection in Controversial Ranking

THE communityPlatform SHALL detect and filter potentially fraudulent controversial posts:
- IF a post receives 20+ downvotes within 1 hour from a new user account, mark for manual review
- IF vote velocity is abnormal (more than 50 votes per hour on a normally slow-growing post), flag for moderation
- Suspected brigaded posts (coordinated voting from multiple accounts) are temporarily hidden from controversial ranking pending moderator review
- Moderators receive alerts for suspicious voting patterns on trending posts
- Confirmed fraudulent votes are reversed; affected post's controversy score is recalculated

### 4.5 Controversial Posts Edge Cases

IF a post becomes extremely unpopular with more downvotes than upvotes:
- Posts with net negative votes (downvotes > upvotes) still appear in controversial ranking if they meet vote split criteria
- Example: Post with 30 upvotes and 70 downvotes meets controversial threshold (30% upvotes, 70% downvotes is within 40-60% range? NO, 30% is outside 40%, so excluded)
- This prevents highly controversial but unpopular content from dominating the controversial feed
- System displays warning indicators for highly negative posts (moderator-level alerts)

## 5. Feed Generation and Personalization

The home feed is the primary entry point for authenticated users. It combines multiple sorting strategies and personalization rules to create engaging experiences.

### 5.1 Home Feed Assembly for Authenticated Members

WHEN an authenticated member requests their home feed, THE communityPlatform SHALL:
- Include posts from all communities the user is subscribed to
- Sort by hot algorithm as the default sorting method (unless user has changed preference)
- Return the first 30 posts by hotness score in the initial page load
- Exclude posts from hidden/removed communities
- Exclude posts from users the member has blocked
- Respect user's content filtering preferences (NSFW content, specific post types)

### 5.2 Home Feed Personalization Rules

WHERE user preferences indicate sorting preference, THE communityPlatform SHALL:
- Allow members to change default sorting method from hot to new, top, or controversial
- Remember the selected sorting preference per user in their account settings
- Apply filtering preferences (hide specific communities, hide specific post types, etc.)
- Respect "hide adult content" and similar content filters set in user preferences
- Reapply personalization settings on every feed load

### 5.3 Home Feed for Unauthenticated Guests

WHEN a guest (unauthenticated user) requests a home feed, THE communityPlatform SHALL:
- Display popular posts from public communities
- Use hot algorithm to surface trending content
- Return top 50 posts sorted by hotness score
- Include a prominent sign-up/login prompt
- Not require any subscriptions or preferences
- Show posts from newly created, trending communities to encourage discovery

### 5.4 Community Feed Assembly

WHEN a user (authenticated or guest) requests posts from a specific community, THE communityPlatform SHALL:
- Include only posts from that community
- Default to hot sorting (unless user has changed preference)
- Allow user to switch to new, top, or controversial sorting
- Apply community-specific sorting rules if configured
- Respect community privacy settings (public vs private access)
- Display community metadata (description, subscriber count, moderators)

### 5.5 Feed Refresh and Update Mechanisms

THE communityPlatform SHALL support the following feed refresh patterns:

**Pull-to-Refresh**: User explicitly requests new posts by refreshing
- Returns latest hot posts from their subscribed communities
- Prioritizes newest content while maintaining hot algorithm sorting
- Completes within 500ms

**Infinite Scroll**: Additional posts loaded as user scrolls down
- Implements cursor-based pagination for consistent results
- Loads next batch (20-30 posts) without full page reload
- Cursor preserves position in feed even as new votes change scores

**Real-time Updates (Optional Enhancement)**:
- New posts appear dynamically for currently viewing users
- Existing posts' hotness scores update as votes arrive
- Vote count updates visible in real-time (within 1-2 seconds)
- Implementation uses WebSocket or polling every 30 seconds

**Background Score Refresh**:
- Every 5 minutes, hotness scores recalculate for visible posts
- Ordering may change without page reload
- Visible posts' engagement metrics update automatically

### 5.6 Feed Caching Strategy for Performance

THE communityPlatform SHALL implement intelligent caching for feed performance:
- Cache hot feed results per user for 1 minute (personalized feed caching)
- Cache top posts results per time window for 5 minutes (less frequently changing)
- Cache new posts results for 2 minutes (frequently changing)
- Invalidate cache immediately when new votes or comments arrive on visible posts
- Cache includes sorting metadata and calculated scores
- Cache includes timestamp to enable conditional requests (If-Modified-Since)

## 6. Search and Content Discovery

Beyond algorithmic sorting, users need search capabilities and discovery mechanisms to find relevant content and topics.

### 6.1 Full-Text Search Capabilities

THE communityPlatform SHALL provide comprehensive full-text search with the following scope:
- Search post titles (high relevance weighting)
- Search post body content (medium relevance weighting)
- Search comment content (lower relevance weighting due to volume)
- Return results ranked by relevance (relevance score based on keyword frequency and position)
- Return results limited to last 2 years to maintain performance (older content archived)
- Support multi-word searches with AND/OR logic (default: AND for all words present)

### 6.2 Search Filters and Refinement Options

WHEN a user performs a search, THE communityPlatform SHALL allow filtering by:
- **Community**: Narrow results to specific community or search across all communities (default)
- **User**: Show only posts/comments created by specific user(s)
- **Date Range**: Filter by custom date window or predefined periods (today, this week, this month, this year)
- **Post Type**: Filter by text posts, link posts, or image posts independently
- **Sort Order**: Sort results by relevance (default), hot, new, or top
- **Score Range**: Filter by minimum post score (useful for finding high-quality content only)
- **Engagement Level**: Filter by minimum comment count to find discussion-heavy posts

### 6.3 Search Result Ranking Methodology

WHEN returning search results, THE communityPlatform SHALL:
- Rank by keyword relevance using TF-IDF (Term Frequency-Inverse Document Frequency) algorithm
- Weight post titles higher than body content (title matches worth 1.5x body matches)
- Apply secondary sort by hotness score within matching results
- Highlight matching keywords in result snippets (bold or color highlighting)
- Include preview text (first 200 characters of matching content) with keywords in context
- Display metadata: author, community, creation date, current vote count
- Show match confidence percentage (e.g., "94% match")

### 6.4 Trending Content Discovery Features

THE communityPlatform SHALL surface trending content through multiple mechanisms:

**Trending Posts Tab**:
- Display top 10 posts by hotness updated hourly
- Shows posts from user's subscribed communities (if logged in)
- Shows global trending for guests
- Includes trend indicators (e.g., "↑ 45% increase in last hour")

**Trending Communities**:
- Communities with fastest subscriber growth (new communities)
- Communities with highest activity this week
- Updated daily with new rankings
- Shows community name, subscriber growth, and activity level

**Trending Topics**:
- Hashtags or keywords appearing frequently in new posts (last 24 hours)
- Clickable topics that link to posts/comments using that keyword
- Shows trend direction (increasing/stable/decreasing)
- Top 20 trends displayed with frequency counts

**Fresh Content Discovery**:
- For both members and guests
- Surfaces underrated posts (good engagement, few viewers)
- Shows emerging topics before they go mainstream
- Enables serendipitous discovery of quality content

### 6.5 Search Result Exclusion Rules

THE communityPlatform SHALL NOT include in search results:
- Deleted or removed posts/comments (soft-deleted with visibility="deleted" or "removed")
- Posts from suspended users (their content becomes hidden)
- Comments flagged for moderation (hidden from search pending review)
- Private community content (unless user is member, moderator, or administrator)
- Posts from communities user has explicitly blocked
- Spam content identified by automated systems
- Draft or unpublished posts

## 7. Pagination and Performance

All sorting and discovery results must support efficient pagination for users and meet strict performance targets.

### 7.1 Pagination Methods and Approaches

THE communityPlatform SHALL support two distinct pagination approaches:

**Offset-Based Pagination** (for consistent result sets):
- WHEN user requests page 2 of hot posts, THE system SHALL skip the first 30 posts and return next 30
- Supports explicit page number requests (page=1, page=2, page=3, etc.)
- Suitable for sorted data where order is stable and doesn't change between requests
- Default pagination method for browse-style navigation
- Issue: May show duplicates if new content arrives between page requests (handled by cursor-based alternative)

**Cursor-Based Pagination** (for real-time feeds):
- WHEN user requests feed with cursor token, THE system SHALL start from specified position
- Cursor encodes the last post ID and timestamp to provide consistent checkpoint
- Handles new posts appearing at top of feed gracefully (no duplicate or missed items)
- Prevents duplicate results when new posts arrive between requests
- Better for infinite scroll implementations
- Recommended for home feed and real-time feeds

### 7.2 Default Page Sizes by Client Type

THE communityPlatform SHALL apply these default page sizes:
- Mobile clients: 15-20 posts per page (smaller screens, less bandwidth)
- Desktop clients: 25-30 posts per page (larger screens, more comfortable reading)
- Users can customize page size through settings (configurable range: 10-100 posts per page)
- Comments per post default: 10 top-level comments per page
- Search results: 25 results per page by default

### 7.3 Pagination Response Metadata

WHEN returning paginated results, THE communityPlatform SHALL include metadata:
- **Total Result Count**: Total number of results matching query (for offset pagination)
- **Next Cursor Token**: Opaque token for retrieving next page (for cursor pagination)
- **Has More Results**: Boolean flag indicating if additional pages exist
- **Current Page Number**: Current page (for offset pagination)
- **Page Size Used**: Number of items returned in this response
- **Query Execution Time**: Milliseconds to execute query (for performance monitoring)

### 7.4 Performance Requirements and SLAs

THE communityPlatform SHALL meet these performance targets:
- WHEN retrieving hot posts (first page), THE system SHALL respond within 500ms for 95% of requests
- WHEN retrieving top posts, THE system SHALL respond within 1 second for 95% of requests
- WHEN performing search, THE system SHALL respond within 2 seconds for 95% of requests
- WHEN loading additional pages, THE system SHALL respond within 500ms for 95% of requests
- All response times measured at 95th percentile with normal load conditions
- Response time includes network latency plus server processing time

### 7.5 Database Query Optimization Strategy

THE communityPlatform SHALL optimize database queries through strategic indexing and design:
- Index all sorting fields (vote_counts, creation_timestamp, hotness_score) for fast retrieval
- Index community_id and visibility fields for filtering operations
- Use database materialized views for pre-calculated top posts rankings
- Pre-calculate hotness scores every 5 minutes rather than on-demand during queries
- Use composite indexes on frequently combined query criteria
- Example: Composite index on (community_id, created_at DESC) for community feed queries
- Monitor query execution plans and refactor slow queries

### 7.6 Multi-Level Caching for Performance

THE communityPlatform SHALL implement intelligent caching across layers:

**Application Cache (Redis)**:
- Cache calculated hotness scores for all active posts (1-minute TTL)
- Cache hot feed results per user (1-minute TTL to avoid stale personalization)
- Cache top posts results per time window (5-minute TTL - changes less frequently)
- Cache new posts listings (2-minute TTL - changes frequently with new posts)
- Cache community metadata and settings (15-minute TTL)

**Browser Cache**:
- HTTP Cache headers for static content (profiles, community pages)
- ETag support for conditional requests (If-None-Match)
- Cache-Control: max-age=300 for feed data (5-minute browser cache)
- Cache-Control: max-age=3600 for images (1-hour browser cache)

**Cache Invalidation**:
- Invalidate feed caches when new votes/comments arrive on visible posts
- Invalidate user feed cache when user subscribes/unsubscribes from community
- Invalidate top posts cache when post is removed/deleted
- Invalidate hotness scores cache when post voting activity slows (periodic refresh)

## 8. Edge Cases and Special Scenarios

The system must handle unusual situations gracefully to ensure consistent behavior.

### 8.1 Handling Tied Posts (Multiple Posts with Identical Scores)

WHEN multiple posts have identical primary sort criteria:
- Use secondary sort criteria as specified in each algorithm section (tiebreaker rules)
- Ensure consistent ordering across all requests (deterministic sorting without randomization)
- Post ID used as final tiebreaker for absolute determinism
- IF user requests same page twice, identical results returned both times

### 8.2 Archived and Locked Posts Treatment

WHEN a community or post is archived (flagged as inactive):
- Posts remain visible in all sorting methods (hot, new, top, controversial)
- Posts cannot receive new votes or comments (archive is read-only state)
- Archived status displayed in post metadata
- Users cannot change existing votes on archived posts
- Archived posts are not ranked in trending content (implicit demotion)

### 8.3 Deleted Content Visibility Rules

WHEN a post is soft-deleted by user or moderator:
- Post is completely hidden from all sorting algorithms and feeds
- Post is hidden from search results
- Post is hidden from user profiles and history (except to user themselves)
- Comments referencing deleted post show "[deleted]" placeholder to maintain thread continuity
- Post data retained in database for audit purposes, not shown to users

### 8.4 Moderator-Removed Content Handling

WHEN a moderator removes a post:
- Post is hidden from public sorting algorithms
- Moderators and post author can still view the post with removal notice
- Removal reason is logged in audit trail
- Author receives notification with removal reason and appeal instructions
- Post can be appealed by author through appeal process (see moderation requirements)

### 8.5 Suspended User Content Visibility

WHEN a user account is suspended:
- All posts and comments from that user become hidden from sorting and feeds
- Content is hidden from search results
- User's profile becomes inaccessible to other users
- IF user is later reinstated, content reappears automatically
- Permanent bans result in content being permanently inaccessible

### 8.6 Admin and Moderator Content Overrides

WHERE a moderator needs to override normal sorting:
- Moderators can pin up to 3 posts at top of community feed (appear above all sorted results)
- Pinned posts remain at top regardless of hotness/engagement
- Admin can manually adjust visibility of any content (hide/show)
- All overrides logged with timestamp and reason in audit trail

### 8.7 Vote Reversal and Score Recalculation

WHEN a user removes or changes their vote:
- Hotness scores recalculated automatically within 5 seconds
- Top post rankings updated within 5 minutes (batch update)
- Controversial scores updated immediately (high priority)
- Feed automatically refreshed for currently viewing users
- Post may move up/down in sorted feeds based on new score

### 8.8 New User Content Visibility

WHEN a new user (account < 24 hours old) posts for the first time:
- Post is subject to automated quality checks and spam detection
- IF quality passes: Post appears in all sorting algorithms normally
- IF quality is questionable: Post placed in moderation queue, invisible to most users
- Original author and moderators can view pending posts
- Post appears after moderator approval or automatic approval after 24 hours

### 8.9 Community-Specific Sorting Customization

WHERE a community has configured custom sorting behavior:
- Community moderators can disable specific sort methods (e.g., disable controversial for sensitive topics)
- Communities can set custom time decay rates for hot algorithm (adjust how quickly posts fade)
- Communities can require minimum user karma for post visibility (quality threshold)
- These rules override platform defaults only within that community
- All communities maintain access to basic sorting (new, top, hot)

### 8.10 Closed Communities Without New Posts

WHEN a community is closed to new posts (archived state):
- Existing posts remain visible and sortable normally
- New posts cannot be created
- Sorting algorithms continue working on existing posts
- Users can still comment on existing posts (unless post is locked)
- Community remains discoverable but marked as "archived/closed"

## 9. Performance Monitoring and Optimization

### 9.1 Sorting Performance Metrics

THE system SHALL track and monitor:
- Query execution times for each sort type (hot, new, top, controversial)
- Cache hit/miss rates
- Sort recalculation frequency and duration
- Pagination request patterns
- Search query performance and result quality metrics

### 9.2 Optimization Triggers

IF sorting performance falls below SLA targets:
- Query optimization: Add indexes, refactor slow queries
- Caching improvements: Increase cache TTL, add pre-warming
- Algorithm tuning: Adjust time decay factors or comment weighting
- Infrastructure scaling: Add database replicas, increase Redis memory

## Summary of All Sorting and Discovery Requirements

The sorting and discovery system must:

1. **Hot Algorithm**: Balance recency and engagement with time decay, provide 1.5x boost for first 2 hours of new posts
2. **New Algorithm**: Simple chronological sorting, exclude old posts (> 30 days), maintain deterministic ordering
3. **Top Algorithm**: Support 4 time windows (today, week, month, all-time), no time decay, include negative-scored posts
4. **Controversial Algorithm**: Use precise mathematical formula, minimum 20 votes and 40-60% vote split, detect fraud
5. **Feed Generation**: Personalize for members based on subscriptions, default to hot sort, support preference override
6. **Search and Discovery**: Full-text search across posts/comments, multi-factor filtering, trending content surfacing
7. **Pagination**: Support offset and cursor-based pagination, default to 25-30 posts per page, include metadata
8. **Performance**: Meet SLA targets (hot <500ms, top <1s, search <2s for 95th percentile)
9. **Edge Cases**: Handle tied posts, archived content, deleted posts, moderator overrides, new user content
10. **Optimization**: Implement multi-level caching, strategic database indexing, real-time score updates\n\n---\n\n> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, query optimization strategies) are at the discretion of the development team.*"