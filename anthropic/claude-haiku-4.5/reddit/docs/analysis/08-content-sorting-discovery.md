# Content Sorting, Discovery, and Feed Generation

## 1. Post Sorting Algorithms

### 1.1 Overview

THE system SHALL support four primary sorting mechanisms for displaying posts: hot, new, top, and controversial. These sorting algorithms serve different user intents and help surface content based on different criteria. Each algorithm uses different combinations of engagement metrics, temporal decay, and community engagement patterns.

All sorting algorithms SHALL apply consistently across:
- Community-specific post feeds (showing posts within a single community)
- Homepage feeds (showing posts from multiple subscribed communities)
- Search results (ranking posts by relevance)
- User profile pages (displaying user's own posts)

WHILE a post is sorted, THE system SHALL consider:
- Post creation timestamp and age
- Total vote counts (upvotes and downvotes)
- Comment counts and engagement
- Post view counts
- Current user's subscription status to the community
- Current time for temporal decay calculations

### 1.2 Hot Post Algorithm

**Purpose**: Identify currently trending and actively engaging posts that generate recent activity and discussion.

THE hot algorithm SHALL rank posts based on a combination of engagement velocity, recency, and total engagement. Posts that are currently receiving votes and comments SHALL rank higher than posts with static engagement.

**Algorithm Specification:**

```
hot_score = (upvotes - downvotes) / (hours_elapsed ^ 1.8)

Where:
- upvotes = total upvotes on the post
- downvotes = total downvotes on the post
- hours_elapsed = time since post creation in hours (minimum 1 hour to prevent division issues)
- 1.8 = decay exponent (higher values = faster decay for older posts)
```

**Hot Score Modifiers:**

THE system SHALL apply the following engagement modifiers to the hot score:

- IF the post has received votes or comments in the last 15 minutes, THEN THE system SHALL multiply the hot_score by 1.5
- IF the post has more than 50 comments, THEN THE system SHALL multiply the hot_score by 1.2
- IF the post has more than 500 views, THEN THE system SHALL multiply the hot_score by 1.1

**Example Calculations:**

- New post (1 hour old) with 100 upvotes, 5 downvotes: score = 95 / 1^1.8 = 95
- 6-hour-old post with 100 upvotes, 5 downvotes: score = 95 / 6^1.8 = 3.1
- 24-hour-old post with 1000 upvotes, 50 downvotes: score = 950 / 24^1.8 = 2.3

**Edge Case: Posts with Zero or Negative Net Votes**

WHEN a post has zero net votes (equal upvotes and downvotes), THE system SHALL:
- Calculate hot_score as 0 / hours_elapsed = 0
- Apply modifiers only if post has recent activity (within 15 minutes)
- Posts with negative net votes (more downvotes than upvotes) SHALL receive negative hot_scores
- Negative hot_score posts rank below zero-score posts

**Edge Case: Very New Posts (Less Than 1 Hour Old)**

WHEN a post is extremely new (created less than 1 hour ago), THE system SHALL:
- Use minimum hours_elapsed of 1.0 to prevent extremely high scores for brand-new content
- Allow very new posts with engagement to rank highly but prevent gaming via rapid voting
- Apply recent activity modifier (1.5x) to encourage early engagement on fresh content

**Hot Algorithm Behavior:**

- Hot posts are recalculated continuously throughout the day, not just when requested
- Hot posts will eventually "age out" as hours_elapsed increases, pushing older posts down
- WHEN a user visits the homepage, THE system SHALL retrieve posts sorted by hot_score in descending order
- Recalculation frequency: every 30 minutes for caching efficiency, or on-demand with cached fallback
- THE system SHALL preserve hot scores from previous calculation to detect significant changes
- IF hot score changes by >20% due to new votes, THE system SHALL trigger feed invalidation

**Hot Algorithm Examples:**

Post A: 2 hours old, 50 net upvotes, 30 comments, last vote 5 minutes ago
- Base score: 50 / 2^1.8 = 13.4
- With recent activity modifier: 13.4 × 1.5 = 20.1
- With comment modifier: 20.1 × 1.2 = 24.12
- With view modifier: 24.12 × 1.1 = 26.53 (final hot_score)

Post B: 12 hours old, 200 net upvotes, 20 comments, last vote 2 hours ago
- Base score: 200 / 12^1.8 = 3.2
- With comment modifier: 3.2 × 1.2 = 3.84
- No recent activity modifier (last vote > 15 min ago)
- Final hot_score: 3.84 (ranks below Post A despite more upvotes)

### 1.3 New Post Sorting

**Purpose**: Show the most recently created posts regardless of engagement level. Useful for users who want to discover emerging discussions.

THE new sorting algorithm SHALL rank posts strictly by creation timestamp in descending order (newest first).

**Algorithm Specification:**

```
new_score = post_creation_timestamp

Sort by: new_score DESC (descending)
```

**New Post Behavior:**

- WHEN sorting by "new", THE system SHALL list posts in reverse chronological order (most recent first)
- IF two posts were created at the exact same second, THEN THE system SHALL use the post ID as a tiebreaker (higher post ID first, indicating later creation)
- New sorting does NOT apply engagement decay or community-level filtering beyond subscription status
- New sorting is deterministic and does not require recalculation - it can be retrieved directly from timestamp indexes
- THE system SHALL not apply any modifiers or adjustments to new sorting (pure timestamp ordering)

**Edge Case: Posts with Identical Timestamps**

WHEN two posts have exactly the same creation timestamp (millisecond precision), THE system SHALL:
- Use the post's unique ID as final tiebreaker (higher ID = created later)
- Ensure deterministic ordering (same order on every request)
- Log this edge case for analysis if it occurs frequently

**Edge Case: Deleted Posts in New Feed**

WHEN retrieving new posts, THE system SHALL:
- Exclude any posts marked as deleted (is_deleted = true)
- Exclude any posts removed by moderators (status = "removed")
- Ensure deleted posts don't appear even with newer timestamp

**New Feed Pagination:**

WHEN displaying new posts with pagination, THE system SHALL:
- Return 20-30 posts per page by creation date descending
- Use post ID as cursor for next page: GET /feed?sort=new&cursor=[last_post_id]
- Ensure cursor-based pagination handles deleted posts correctly

### 1.4 Top Post Sorting

**Purpose**: Surface high-quality, well-received posts that have accumulated significant net positive votes over time. "Top" posts represent community consensus on valuable content.

The top algorithm aggregates votes over configurable time windows. Different time windows show top posts from different periods (last day, last week, all-time).

**Algorithm Specification:**

```
top_score = (upvotes - downvotes)

Where:
- upvotes = total upvotes on the post within the selected time window
- downvotes = total downvotes on the post within the selected time window
- Time window is configurable: 1 day, 1 week, 1 month, all-time
```

**Top Post Time Windows:**

THE system SHALL support the following top post time windows:

| Time Window | Duration | Default Behavior | Use Case |
|-------------|----------|------------------|----------|
| Top (Day) | Last 24 hours | Posts created or voted on in the last 24 hours | Daily trending content |
| Top (Week) | Last 7 days | Posts created or voted on in the last 7 days | Weekly highlights |
| Top (Month) | Last 30 days | Posts created or voted on in the last 30 days | Monthly popular posts |
| Top (All-Time) | All posts | Posts from the entire history of the community | Community classics |

**Top Score Modifiers:**

- IF a post has more than 100 net upvotes AND was created more than 1 day ago, THEN THE system SHALL consider it an "established top post" and display a badge
- IF the post has exactly zero net votes, THEN THE system SHALL use the post ID as a tiebreaker (higher post ID first)
- IF a post is tied with identical net votes, THEN THE system SHALL sort by comment count (higher comments first) as secondary tiebreaker

**Top Algorithm Examples:**

Time Window: Last 24 Hours

Post A: Created 12 hours ago, 250 upvotes, 30 downvotes within window
- Top score (day): 250 - 30 = 220

Post B: Created 18 hours ago, 300 upvotes, 50 downvotes within window
- Top score (day): 300 - 50 = 250
- Ranks #1 in top (day)

Time Window: All-Time

Post C: Created 1 year ago, 5000 upvotes, 200 downvotes all-time
- Top score (all-time): 5000 - 200 = 4800
- Established top post badge displayed

Post D: Created 2 months ago, 100 upvotes, 5 downvotes all-time
- Top score (all-time): 100 - 5 = 95
- Ranks much lower than Post C

**Top Algorithm Behavior:**

- Top is recalculated per time window, allowing the same post to appear in multiple top lists
- Example: A post created 25 days ago might appear in "Top (Month)" but not "Top (Week)"
- Top sorting does not apply temporal decay - old posts with many votes stay high
- Top sorting is ideal for archive browsing and discovering well-received historical content
- THE system SHALL cache top post scores per time window with 1-hour TTL

**Edge Case: Window Boundary Crossing**

WHEN a post created 23.5 hours ago receives votes and crosses into "Top (Day)" window, THE system SHALL:
- Include votes from entire post lifetime
- Calculate top_score including all votes on the post
- Post may appear in both "Top (Day)" and "Top (Week)" simultaneously

**Edge Case: Zero Vote Posts in Top Feed**

WHEN retrieving top posts and multiple posts have exactly zero net votes, THE system SHALL:
- Use post ID as tiebreaker (higher ID = created later)
- OR use comment count as secondary sort (more discussion = higher rank)
- Display these zero-vote posts at bottom of top list

### 1.5 Controversial Post Sorting

**Purpose**: Surface posts that generate the most discussion and disagreement in the community. Controversial posts have high upvote counts AND high downvote counts, indicating divided opinion.

**Algorithm Specification:**

```
controversy_score = min(upvotes, downvotes) * 2 + abs(upvotes - downvotes)

Where:
- upvotes = total upvotes on the post
- downvotes = total downvotes on the post
- min(upvotes, downvotes) = the smaller of the two vote counts
- abs(upvotes - downvotes) = absolute difference between upvotes and downvotes
```

**Controversial Score Examples:**

- Post with 100 upvotes, 5 downvotes: score = min(100,5)*2 + |100-5| = 10 + 95 = 105
- Post with 100 upvotes, 95 downvotes: score = min(100,95)*2 + |100-95| = 190 + 5 = 195 (MORE controversial)
- Post with 50 upvotes, 50 downvotes: score = min(50,50)*2 + |50-50| = 100 + 0 = 100
- Post with 150 upvotes, 140 downvotes: score = min(150,140)*2 + |150-140| = 280 + 10 = 290 (MOST controversial)

**Controversial Algorithm Behavior:**

- Controversial posts require balanced voting - purely upvoted or downvoted posts score lower
- Controversial posts can be old or new - the algorithm does not apply temporal decay
- WHEN sorting by controversial, THE system SHALL rank posts by controversy_score in descending order
- Controversial sorting is useful for finding active debates and discussions where the community disagrees
- THE system SHALL ensure minimum vote threshold of 5 total votes to prevent tiny posts from ranking high

**Controversial Post Minimum Threshold:**

WHEN a post has fewer than 5 total votes (upvotes + downvotes < 5), THE system SHALL:
- Exclude from controversial sorting to prevent noise
- Display message: "Not enough votes to calculate controversy"
- Require minimum 5 votes before post appears in controversial feed

**Edge Case: Posts with No Downvotes**

WHEN a post has zero downvotes, THE system SHALL:
- Calculate as: min(upvotes, 0)*2 + |upvotes - 0| = 0 + upvotes = upvotes
- Post ranks low in controversial (equivalent to net upvotes only)
- Purely upvoted posts are NOT controversial (expected behavior)

**Edge Case: Posts with No Upvotes**

WHEN a post has zero upvotes, THE system SHALL:
- Calculate as: min(0, downvotes)*2 + |0 - downvotes| = 0 + downvotes = downvotes
- Post ranks low in controversial
- Purely downvoted posts are NOT controversial

---

## 2. Feed Generation System

### 2.1 Homepage Feed Overview

The homepage feed is the primary content discovery mechanism for authenticated users. The feed shows a personalized selection of posts from communities the user has subscribed to, ranked using the selected sorting algorithm.

THE homepage feed SHALL:
- Display posts only from communities the user has subscribed to
- Allow users to select the sorting algorithm (hot, new, top, controversial)
- Support pagination to efficiently load large numbers of posts
- Prioritize recently active communities the user engages with
- Cache feed data to meet performance targets
- Update in real-time as new posts and votes arrive

### 2.2 Feed Generation Process

**Feed Generation Steps:**

WHEN a user requests the homepage feed, THE system SHALL execute the following steps in order:

1. **Identify Subscribed Communities**: Retrieve all communities the user is currently subscribed to
   - IF the user has no subscriptions, THEN retrieve popular default communities (see section 2.4)
   - THE system SHALL cache subscription list for 5 minutes per user

2. **Retrieve Recent Posts**: Get posts from subscribed communities created in the last 30 days
   - Posts older than 30 days can be archived to separate storage for efficiency
   - THE system SHALL filter to only active (not deleted, not archived) posts
   - THE system SHALL exclude posts marked as hidden or removed

3. **Apply Sorting Algorithm**: Rank posts using the selected algorithm (hot/new/top/controversial)
   - Sorting is applied after posts are retrieved, not as part of the database query
   - THE system SHALL calculate sort scores in-memory for efficiency
   - THE system SHALL apply sort in consistent order across pagination

4. **Apply Filters**: Remove posts that meet any of these conditions:
   - Posts from communities the user has muted (if muting feature is available)
   - Posts explicitly hidden by the user
   - NSFW posts (if user has disabled NSFW content in settings)
   - Removed or deleted posts
   - Posts from suspended users

5. **Paginate Results**: Return a page of posts (typically 20-25 posts per page)
   - Subsequent pages are retrieved by passing the last_post_id as a cursor
   - THE system SHALL maintain consistent sort order across pagination boundaries

6. **Cache the Feed**: Store the result in cache with 5-minute TTL
   - Reduces database load for rapidly accessed feeds
   - Subsequent identical requests within 5 minutes return cached results
   - THE system SHALL invalidate cache when new posts added to subscribed communities

**Feed Display Order:**

WHEN displaying the feed, THE system SHALL present posts in the following order:
1. Pinned posts from any subscribed community (if applicable)
2. Regular posts sorted by the selected algorithm in descending order
3. Pagination indicates when more posts are available

**Feed Generation Example:**

User subscribed to communities: r/Technology, r/Science, r/Gaming
Sort preference: Hot

Step 1: Retrieve subscriptions (cached) → 3 communities
Step 2: Get posts from 3 communities (last 30 days) → 5000 posts
Step 3: Calculate hot_score for each post
Step 4: Filter out deleted, NSFW (if disabled), hidden posts → 4500 posts remain
Step 5: Paginate - return top 25 by hot_score
Step 6: Cache result for 5 minutes
Result: User sees 25 most "hot" posts from subscribed communities

### 2.3 Personalized Feed Ranking

THE system SHALL rank posts within the homepage feed using secondary ranking factors beyond the primary sorting algorithm:

**Secondary Ranking Factors (Applied After Primary Sort):**

- IF a user frequently engages with a particular community (many upvotes, comments), THEN posts from that community should be weighted slightly higher
- IF a community has posted new content in the last hour, THEN posts from that community should be slightly elevated
- IF the user has not visited a subscribed community in the last 7 days, THEN posts from that community should be slightly deprioritized (showing more recent active content first)

**Feed Personalization Preservation:**

- The personalization ranking is subtle and does NOT override the primary sorting algorithm
- Users can always explicitly select a sorting algorithm (hot/new/top) to get consistent results
- THE system SHALL apply personalization consistently within pagination

### 2.4 Default Feed for Guests and New Users

WHEN a guest (unauthenticated user) views the homepage, THE system SHALL display a default feed of popular posts from major public communities.

WHEN a newly registered user creates their first account and has not subscribed to any communities, THE system SHALL:
- Display the default popular communities feed
- Recommend 5-10 popular communities for the user to subscribe to
- Show a prompt encouraging the user to find and subscribe to communities

**Default Feed Algorithm:**

The default feed uses the "hot" algorithm but applies different time horizons:
- Default feed posts are filtered to those created in the last 7 days (vs. 30 days for member feeds)
- Default feed is updated every 1 hour (vs. on-demand for member feeds)
- Default feed includes only communities with more than 100 subscribers (to ensure quality)

**Default Feed Composition:**

THE system SHALL:
1. Retrieve all public communities with 100+ subscribers
2. Get hot posts from these communities (last 7 days)
3. Calculate hot_score for each post
4. Return top 30-50 posts by hot_score
5. Cache result for 1 hour
6. Display with "Popular Now" or "Trending" label

### 2.5 Feed Pagination

Feeds are too large to load all posts at once. Pagination allows efficient loading of posts in manageable chunks.

**Pagination Mechanism:**

- THE system SHALL return 20-25 posts per page by default
- Users can request a different page size (minimum 5, maximum 100)
- THE system SHALL use cursor-based pagination (post ID or timestamp cursor) rather than offset
- Cursor-based pagination is more efficient for large datasets than offset-based pagination

**Pagination Response:**

WHEN returning a paginated feed, THE system SHALL include:
- `posts`: Array of post objects (20-25 items)
- `next_cursor`: Cursor to fetch the next page (omitted if no more posts available)
- `has_more`: Boolean indicating whether more posts are available
- `total_count`: Approximate total number of posts available (may be estimated for performance)

**Example Pagination Flow:**

```
Request 1: GET /feed?sort=hot&limit=25
Response: [Post 1, Post 2, ..., Post 25], next_cursor="post_id_25"

Request 2: GET /feed?sort=hot&limit=25&cursor=post_id_25
Response: [Post 26, Post 27, ..., Post 50], next_cursor="post_id_50"

Request 3: GET /feed?sort=hot&limit=25&cursor=post_id_50
Response: [Post 51, ..., Post 73], has_more=false (no next_cursor)
```

**Cursor Pagination Edge Cases:**

WHEN cursor points to deleted post, THE system SHALL:
- Skip the deleted post
- Continue with next available post
- Maintain correct order despite gap

WHEN cursor is invalid or expired, THE system SHALL:
- Return HTTP 400 Bad Request
- Display message: "Pagination token expired. Refresh the page."
- Require user to restart pagination from beginning

### 2.6 Feed Performance Requirements

THE system SHALL meet the following performance targets for feed generation:

| Metric | Target |
|--------|--------|
| Feed generation time (hot sort) | < 2 seconds |
| Feed generation time (new sort) | < 500 milliseconds |
| Feed generation time (top sort) | < 1 second |
| Feed generation time (controversial sort) | < 2 seconds |
| Feed page load time (with all content) | < 3 seconds |
| First meaningful paint (partial feed visible) | < 1 second |
| Pagination response time | < 500 milliseconds |

**Performance Optimization Strategies:**

- CACHING: Recent hot feeds are pre-calculated and cached every 30 minutes
- INDEXING: Database indexes on (community_id, created_at) for quick post retrieval
- DENORMALIZATION: Vote counts and comment counts are denormalized on posts to avoid expensive joins
- BACKGROUND JOBS: Ranking calculations happen asynchronously, not on critical path
- CDN: Static content (post text, images metadata) is served from CDN

**Performance Monitoring:**

THE system SHALL monitor feed performance and alert if:
- Feed generation time exceeds 5 seconds (double target)
- P95 response time exceeds 3 seconds
- Cache hit rate drops below 50%
- Database query time for feed retrieval exceeds 2 seconds

### 2.7 Real-Time Feed Updates

THE system SHALL support real-time updates to the feed as new content arrives and votes are cast.

**Real-Time Update Mechanisms:**

- IF the user has the feed open and a new post is created in a subscribed community, THEN notify the user that a new post is available (typically: "X new posts available" prompt)
- IF the user has the feed open and the hot ranking changes significantly, THEN update the post order (after a delay to batch updates)
- IF a post the user is viewing receives new comments or votes, THEN update the vote count in real-time

**Update Batching:**

- Real-time updates are batched and sent in intervals (not on every single vote)
- Feed order updates are batched every 5 seconds to avoid overwhelming the client
- Vote count updates are sent in real-time but batched on display side

**Real-Time Implementation:**

THE system MAY use:
- WebSockets for pushing updates to clients
- Server-Sent Events (SSE) for streaming updates
- Polling as fallback (client requests updates every 5-10 seconds)
- THE system SHALL choose based on scalability requirements

---

## 3. Search Functionality

### 3.1 Search Scope and Targets

THE system SHALL support full-text search across multiple content types:

| Search Target | What is Searched | Scope |
|---------------|------------------|-------|
| Posts | Post title, post content/text, post URL | Across all communities |
| Communities | Community name, community description, community rules | All communities |
| Users | Username, user bio, user display name | All users |
| Comments | Comment text only (no comment titles) | Within specific posts or across all |

**Search Scope Examples:**

- "Global search": Search posts and communities across the entire platform
- "Community search": Search posts within a specific community only
- "User search": Find specific users by username
- "Comment search": Find comments containing specific text (within a post or across all)

### 3.2 Search Query Requirements

THE system SHALL accept search queries with the following characteristics:

**Query Input Validation:**

- Search query minimum length: 1 character
- Search query maximum length: 500 characters
- Search queries are case-insensitive
- Special characters in search queries are handled as follows:
  - Quotes (\"...\") indicate exact phrase search
  - Hyphens (-) before a word indicate exclusion (NOT search)
  - Asterisks (*) are wildcards
  - Other special characters are either removed or treated as spaces

**Example Queries:**

- `"climate change"` - Exact phrase search for posts containing this exact phrase
- `artificial -intelligence` - Contains "artificial" but NOT "intelligence"
- `climate*` - Wildcard matching "climate", "climatic", "climatology", etc.
- `python OR javascript` - Boolean OR search (if supported)
- `title:blockchain` - Field-specific search (if supported)

**Wildcard Expansion:**

WHEN user enters wildcard query `python*`, THE system SHALL:
- Match: "python", "python3", "pythonic", "python-dev", etc.
- Return up to 100 wildcard matches per search (prevent runaway queries)
- Display message if wildcard expands to >100 matches: "Query matched 500+ results. Refine your search for better results."

### 3.3 Search Results Ranking

Search results are ranked by relevance to help users find the most useful content first.

**Relevance Scoring Factors:**

THE system SHALL rank search results using the following factors:

1. **Keyword Matching** (Highest Weight - 60%):
   - Exact phrase matches score highest
   - Matches in title score higher than matches in content
   - Earlier keyword matches (start of text) score higher
   - Multiple keyword matches increase score
   - Proximity of keywords (how close together) affects score

2. **Content Quality** (Medium Weight - 30%):
   - Post upvote-to-downvote ratio (higher ratio = higher rank)
   - Comment count on posts (more discussion = higher rank for posts)
   - User reputation for search results about users
   - View count (more viewed = more relevant/popular)

3. **Recency** (Low Weight - 10%):
   - More recent content is slightly favored (minor factor)
   - Very old content is deprioritized but not hidden
   - Freshness bonus: Recent posts within last 24 hours get +10% boost

4. **Community Popularity** (Low Weight - included in quality):
   - Posts from larger, more active communities are slightly elevated
   - Personal subscriptions may affect ranking
   - Community growth rate affects relevance

**Relevance Score Formula:**

```
relevance_score = (keyword_match_score * 0.6) + (quality_score * 0.3) + (recency_bonus * 0.1)

Where:
- keyword_match_score: 0-100 based on exact/partial/location of matches
  - Exact phrase match: 100
  - Partial match in title: 80
  - Partial match in body: 50
  - Multiple matches: base score × (1 + number_of_matches × 0.1)
- quality_score: 0-100 based on votes and engagement
  - Upvote ratio (upvotes / total_votes) × 100
  - Comment count / 100 (capped at 100)
  - Average: (upvote_ratio + comment_boost) / 2
- recency_bonus: 0-10 based on post age
  - Posts < 24 hours old: +10
  - Posts < 7 days old: +5
  - Posts < 30 days old: +2
  - Posts > 30 days old: 0
```

**Search Result Ranking Example:**

Search: "machine learning"

Post A (Title contains exact phrase "machine learning"):
- keyword_match: 100 (exact phrase in title)
- quality_score: 85 (500 upvotes, 50 downvotes, 200 comments)
- recency: 5 (created 5 days ago)
- Final: (100 × 0.6) + (85 × 0.3) + (5 × 0.1) = 60 + 25.5 + 0.5 = 86

Post B (Body contains "machine" and "learning" but separated):
- keyword_match: 60 (partial matches in body, separated)
- quality_score: 75 (100 upvotes, 20 downvotes, 50 comments)
- recency: 2 (created 2 weeks ago)
- Final: (60 × 0.6) + (75 × 0.3) + (2 × 0.1) = 36 + 22.5 + 0.2 = 58.7

Post A ranks higher (86 > 58.7)

### 3.4 Search Result Pagination

Search results follow the same pagination model as feeds.

**Search Pagination:**

- WHEN search results are returned, THE system SHALL paginate results in pages of 20 items
- THE system SHALL use cursor-based pagination for consistency with feed pagination
- WHEN a user changes the search query, THE system SHALL reset pagination to the first page
- THE system SHALL remember previous search queries for quick re-search

**Search History:**

THE system SHALL track user's recent searches and allow:
- Quick re-search from history
- Clearing search history for privacy
- Disabling search history in preferences

### 3.5 Search Performance Requirements

THE system SHALL meet the following performance targets for search:

| Metric | Target |
|--------|--------|
| Search query execution time | < 1 second |
| Full-text search index response | < 500 milliseconds |
| Pagination of search results | < 500 milliseconds |
| Typo tolerance (fuzzy matching) | < 1 second |

**Search Optimization:**

- Full-text search is performed using dedicated search indexes (e.g., Elasticsearch, PostgreSQL FTS)
- Search indexes are kept in sync with post/community/user data
- Frequently searched terms are cached
- Search is performed asynchronously and results are paginated to limit memory usage
- Search queries are analyzed to detect and prevent malicious patterns

### 3.6 Search Filters

THE system SHALL support optional filters to refine search results:

**Available Search Filters:**

| Filter | Options | Description |
|--------|---------|-------------|
| Content Type | Posts, Communities, Users, Comments | Limit results to specific content types |
| Time Range | Last day, Last week, Last month, All-time | Limit results to specific time periods |
| Sort Order | Relevance, New, Top | Sort results by different criteria |
| Community | [Specific community name] | Limit results to a specific community |
| Minimum Upvotes | [Number] | Limit results to posts with minimum upvotes |
| Language | [Language code] | Limit results to specific languages |

**Filter Application:**

- Filters are applied AFTER relevance ranking, not before (user always sees most relevant first)
- Multiple filters are combined with AND logic (all filters must match)
- Filters can be combined with search queries for precise results
- THE system SHALL display active filters clearly and allow quick removal

**Filter Examples:**

Search: "python" with filters [Content Type: Posts, Time Range: Last week, Minimum Upvotes: 10]
Results: Posts about Python created in last 7 days with 10+ upvotes, ranked by relevance

Search: "javascript" with filters [Community: r/webdev, Sort: New]
Results: JavaScript posts in r/webdev community, sorted by newest first (within relevance ranking)

---

## 4. Trending and Discovery

### 4.1 Trending Posts Algorithm

Trending posts are posts that are currently receiving significant engagement and attention. They represent "hot" content that is gaining momentum.

**Trending Score Calculation:**

THE system SHALL calculate trending score differently than the hot algorithm to emphasize current momentum:

```
trending_score = (recent_upvotes / hours_elapsed ^ 1.5) * engagement_multiplier

Where:
- recent_upvotes = upvotes received in the last 6 hours
- hours_elapsed = hours since post creation (minimum 0.5 hours)
- engagement_multiplier = 1 + (comment_count / 100) + (view_count / 1000)
```

**Trending Posts Criteria:**

A post is eligible for the trending list if:
- The post was created in the last 7 days
- The post has at least 5 net upvotes
- The post has been receiving votes in the last 6 hours (showing recent momentum)

**Trending Post Display:**

THE system SHALL display trending posts in a dedicated section:
- Trending section shows top 10-20 trending posts
- Trending section is updated every 30 minutes
- Trending section includes posts from all communities (not just subscribed communities)
- Trending section includes a "Trending in [Community Name]" view for each community

**Trending Post Calculation Example:**

Post X: Created 2 hours ago, 30 upvotes in last 6 hours, 20 comments, 500 views
- Base score: 30 / 2^1.5 = 10.6
- Engagement multiplier: 1 + (20/100) + (500/1000) = 1.7
- Final trending_score: 10.6 × 1.7 = 18.02

Post Y: Created 12 hours ago, 50 upvotes in last 6 hours, 10 comments, 200 views
- Base score: 50 / 12^1.5 = 1.2
- Engagement multiplier: 1 + (10/100) + (200/1000) = 1.21
- Final trending_score: 1.2 × 1.21 = 1.45

Post X is more trending (18.02 > 1.45) despite fewer total upvotes

### 4.2 Trending Communities Algorithm

Trending communities are communities that are gaining new subscribers and activity quickly.

**Community Trending Score:**

```
community_trending_score = (new_subscribers_last_7_days / 7) * (avg_posts_per_day) * (community_age_factor)

Where:
- new_subscribers_last_7_days = number of new subscriptions in the last 7 days
- avg_posts_per_day = average number of posts per day in the last 30 days
- community_age_factor = 1 + (1 / log(community_age_in_days)) capped at 2
```

**Community Age Factor Explanation:**

The age factor boosts newer communities while maintaining recognition for established ones:
- Brand new community (1 day old): factor = 2.0 (maximum boost)
- Young community (7 days old): factor ≈ 1.35
- Established community (30 days old): factor ≈ 1.10
- Very old community (1 year old): factor ≈ 1.02

**Trending Communities Display:**

- Trending communities section shows top 20-30 trending communities
- Trending communities section is updated every 1 hour
- Communities under 30 days old are weighted higher (encouraging new community growth)
- Communities with zero or very low activity are excluded (minimum 1 post/week)

**Trending Communities Calculation Example:**

Community A: 7 days old, 50 new subscribers last 7 days, avg 5 posts/day
- Score: (50/7) × 5 × 1.35 = 7.14 × 1.35 = 9.64

Community B: 60 days old, 100 new subscribers last 7 days, avg 20 posts/day
- Score: (100/7) × 20 × 1.07 = 14.29 × 20 × 1.07 = 305.6

Community B trends higher despite being older (more activity, more new subscribers)

### 4.3 Community Recommendations

THE system SHALL recommend communities to users based on their subscription history and interests.

**Recommendation Algorithm:**

THE system SHALL recommend communities using the following logic:

1. **User Similarity**: Find users with similar subscription patterns to the current user
2. **Community Similarity**: Identify communities that similar users are subscribed to but the current user is not
3. **Content Similarity**: Recommend communities with content similar to communities the user already subscribes to
4. **Popularity**: Weight recommendations by community size (larger, established communities score higher)

**Recommendation Presentation:**

- Recommendations are shown to users in a "Recommended Communities" section
- Each recommendation includes: community name, brief description, subscriber count
- Users can subscribe directly from the recommendation or "dismiss" to reduce similar recommendations
- THE system SHALL display 5-10 recommendations per page

**Recommendation Quality:**

THE system SHALL prioritize recommendation quality:
- Avoid recommending communities similar to ones user recently unsubscribed from
- Boost recommendations based on user's posting/comment history in related communities
- Consider community activity level (active communities ranked higher)
- Exclude private communities user can't access

### 4.4 Popular Content Discovery

THE system SHALL provide multiple mechanisms for users to discover popular content:

**Discovery Mechanisms:**

1. **Popular by Community**: Each community page shows its own popular posts (hot, top)
2. **Popular Globally**: Platform-wide view of currently hot posts across all communities
3. **Rising Trends**: Posts that are climbing in votes faster than average
4. **Collections/Curated**: If the platform supports, community moderators can curate featured posts
5. **Discovery Feed**: A dedicated feed showing one-of-a-kind, diverse content from unexpected communities

**Popular Content Time Windows:**

Popular content is categorized by time window:
- Right Now (last hour) - Shows hottest content
- Today (last 24 hours) - Shows daily popular posts
- This Week (last 7 days) - Shows weekly highlights
- All-Time - Shows most popular posts in community history

**Discovery Feed Algorithm:**

THE system MAY use the discovery feed to surface unique content:
- Show posts from communities the user doesn't subscribe to but similar users do
- Diversity is prioritized (don't show similar content repeatedly)
- Each post includes "Why you're seeing this" explanation
- Users can rate recommendations helpful/not helpful to improve algorithm

### 4.5 Seasonal and Temporal Trends

THE system SHALL recognize and surface seasonal patterns and special occasions.

**Temporal Trend Features:**

- IF today is a major holiday or special event, THEN posts related to that event are temporarily boosted in trending lists
- IF a specific date or anniversary recurs annually, THEN related content is discoverable on that date
- IF a topic experiences a surge in global attention (news event), THEN related posts are temporarily elevated

**Seasonal Content Examples:**

- New Year: Posts about resolutions, goals boosted in January
- Holiday season: Posts with holiday content boosted in November-December
- Summer: Seasonal-specific community content elevated
- Election day: Political discussion posts elevated

**Event-Based Boosting:**

WHEN major news event occurs (natural disaster, major legislation, popular event), THE system SHALL:
- Identify related communities and posts
- Temporarily boost these posts in trending/popular sections
- Display "Trending due to [Event Name]" label
- Return to normal ranking after event recedes from news cycle (1-7 days)

---

## 5. Content Discovery Best Practices

### 5.1 Discovery Diversity

THE system SHALL ensure that content discovery surfaces diverse perspectives and communities:

**Diversity Principles:**

- THE system SHALL NOT create filter bubbles where users only see content from a narrow subset of perspectives
- THE system SHALL occasionally surface posts from communities users don't subscribe to (with clear labeling: "From communities you might like")
- THE system SHALL ensure that smaller, newer communities have a pathway to visibility even if they can't compete with large communities in raw vote count
- THE system SHALL surface controversial posts to show diverse viewpoints (in addition to highly-agreed-upon posts)

**Diversity Implementation:**

- Trending sections explicitly include diverse communities (at least 20% from communities with <1000 subscribers)
- Recommendations include diverse viewpoints and communities
- "Explore" or "Discover" features surface random or unique communities
- Discovery algorithm monitors for echo chambers and actively breaks them

**Filter Bubble Prevention:**

THE system SHALL actively work against filter bubbles by:
- Occasionally showing content from outside user's subscription circle (clearly labeled)
- Recommending communities with diverse viewpoints on topics user engages with
- Detecting and alerting users to one-sided information sources
- Promoting cross-community discussions

### 5.2 Algorithmic Transparency

THE system SHALL be transparent about how content is ranked and discovered to users:

**Transparency Features:**

- WHEN displaying sorted content, THE system SHALL show which algorithm is being used (Hot/New/Top/Controversial)
- THE system SHALL allow users to understand why a post appears in their feed (hover explanation: "Trending because 50+ comments in last 2 hours")
- THE system SHALL provide explanation text for recommended communities
- THE system SHALL allow users to adjust recommendation preferences
- ADMIN USERS SHALL have access to algorithm documentation and can see algorithm parameters

**User Control:**

Users SHALL be able to:
- Hide specific communities from feed (mute)
- Customize feed sorting preference
- Adjust recommendation frequency
- View their "feed explanation" showing why posts were selected
- Temporarily disable recommendations if desired

---

## 6. Edge Cases and Special Handling

### 6.1 Posts with No Votes

WHEN sorting posts, special handling applies to posts with no votes:

- IF a post has exactly zero net votes, THEN THE system SHALL use post creation timestamp as secondary sort
- IF multiple posts have zero net votes and same creation timestamp, THEN THE system SHALL use post ID as final tiebreaker
- Posts with zero votes are NOT hidden - they appear in feeds and search results with lower ranking
- THE system SHALL display posts with no votes in "new" sorting normally (pure timestamp-based)

### 6.2 Posts with Zero Comments

THE system SHALL handle posts with no comments appropriately:

- Posts with zero comments are not penalized in hot, new, or top algorithms
- Controversial algorithm may rank posts with zero comments lower (since controversy requires disagreement)
- THE system SHALL display comment count accurately even if zero
- Zero-comment posts are discoverable through search and browse functions

### 6.3 Archived and Deleted Posts

- IF a post is deleted, THEN THE system SHALL remove it from all feeds, searches, and trending lists immediately
- IF a post is archived (older than 6 months), THEN THE system SHALL exclude it from "new" and "hot" feeds but include it in "top" and "controversial" and search
- Archived posts do not accept new votes or comments (read-only)
- THE system SHALL clearly mark archived posts: "[Archived]"

### 6.4 Restricted Communities

IF a community has restricted visibility settings:

- IF a community is private, THEN THE system SHALL only show its posts to subscribed members
- IF a community is hidden, THEN THE system SHALL exclude its posts from trending and public search (but show to members)
- IF a user is banned from a community, THEN THE system SHALL filter out that community's posts from feeds and searches
- THE system SHALL respect all community visibility settings in all feeds

### 6.5 NSFW and Mature Content

THE system SHALL handle age-restricted content appropriately:

- IF a post is marked NSFW, THEN THE system SHALL hide it by default for logged-out users
- IF a post is marked NSFW, THEN THE system SHALL show it to logged-in users but with a warning/blur (unless user disables)
- NSFW posts are excluded from trending and public discovery sections by default
- Users can opt-in to see NSFW content in their settings
- THE system SHALL display NSFW label prominently on marked content

### 6.6 Very New Posts (Ranking Artifacts)

WHEN post is extremely new (created less than 1 second ago):

- THE system SHALL use minimum 1 second in hot algorithm to prevent artificial scores
- Brand-new posts with single vote don't receive inflated hot scores
- THE system SHALL apply recent activity modifier to encourage early engagement
- Posts stabilize in ranking within 5 minutes as more votes arrive

### 6.7 Posts with Extreme Vote Ratios

WHEN post has extreme voting pattern (1 upvote, 100 downvotes):

- THE system SHALL calculate controversial score normally (not controversial by definition)
- THE system SHALL NOT penalize or hide purely downvoted posts
- THE system SHALL allow users to see and evaluate low-rated content
- Moderation actions (removal) are separate from algorithmic ranking

---

## 7. Caching Strategy

### 7.1 Cache Layers

THE system SHALL implement multiple layers of caching for performance:

**Cache Layers:**

| Layer | What is Cached | TTL | Purpose |
|-------|----------------|-----|---------| 
| Browser Cache | Feed HTML, assets, static content | 1 hour | Reduce server load, improve perceived speed |
| CDN Cache | Post images, static content | 24 hours | Global content delivery, faster access |
| API Cache | Hot/new/top feeds, trending lists | 5-30 minutes | Reduce database hits |
| Database Query Cache | Frequently run queries | 5-10 minutes | Reduce database load |
| Session Cache | User preferences, subscriptions | Session duration | Personalization without DB hits |

**Caching Details:**

- HOT FEED CACHE: 5 minute TTL, invalidate on new post/vote in subscribed communities
- NEW FEED CACHE: 10 minute TTL, invalidate on new post in subscribed communities
- TOP FEED CACHE: 1 hour TTL per time window, invalidate hourly
- TRENDING CACHE: 30 minute TTL, recalculate every 30 minutes
- SEARCH CACHE: 10 minute TTL per query, invalidate on new content

### 7.2 Cache Invalidation

THE system SHALL invalidate caches appropriately when content changes:

**Cache Invalidation Triggers:**

- WHEN a new post is created in a community, THEN invalidate: hot feed, new feed, community feed caches for that community
- WHEN a vote is cast on a post, THEN invalidate: hot feed cache, top feed cache, controversial feed cache for that post's community
- WHEN a user subscribes to a community, THEN invalidate: that user's homepage feed cache
- WHEN a post is deleted, THEN invalidate: all feed caches and trending cache
- WHEN a post is edited, THEN invalidate: hot/new/top feed caches (vote counts unchanged, but may affect ranking)
- WHEN comment is posted on post, THEN invalidate: hot feed cache (comment modifier affects score)

**Proactive Cache Warming:**

THE system SHALL proactively warm caches:
- Pre-calculate top posts hourly (populate cache before user requests)
- Pre-calculate trending posts every 30 minutes
- Pre-calculate popular communities every 1 hour
- Pre-calculate default feed every 1 hour

### 7.3 Cache Miss Recovery

WHEN cache miss occurs (expired or invalidated cache):

- THE system SHALL recalculate from source data
- THE system SHALL return results within 2 seconds (performance target met)
- THE system SHALL update cache for future requests
- THE system SHALL log cache miss for monitoring

---

## 8. Algorithm Configuration and Tuning

### 8.1 Algorithm Parameters

The algorithms specified in this document use specific parameters (decay exponents, multipliers, etc.). These parameters should be configurable to allow tuning:

**Tunable Parameters:**

| Parameter | Current Value | Configurable | Purpose | Valid Range |
|-----------|---------------|--------------|---------|-----------| 
| Hot decay exponent | 1.8 | Yes | Controls how quickly hot posts age | 1.0 - 3.0 |
| Hot engagement multiplier | 1.5 | Yes | Controls impact of recent activity | 1.0 - 5.0 |
| Hot recent activity window | 15 minutes | Yes | Time window for recent activity bonus | 5-60 minutes |
| Trending time window | 6 hours | Yes | How recent for "trending" | 3-24 hours |
| Feed cache TTL | 5 minutes | Yes | How long to cache feeds | 1-30 minutes |
| New feed filter | 30 days | Yes | Maximum age of posts in new feed | 7-90 days |
| Controversy min balance | Equal votes | Yes | Minimum balance for controversial posts | 0-50% |
| Top algorithm boost | None | No | Top uses pure net votes (no boost) | N/A |

**Configuration Management:**

- Algorithm parameters are stored in configuration system (not hardcoded)
- Parameters can be updated without deploying new code
- Parameter changes take effect within 1 hour (after cache expiry)
- Administrators can run A/B tests with different parameter values
- Changes are logged for audit trail

### 8.2 Monitoring and Analytics

THE system SHALL monitor algorithm performance and provide analytics:

**Monitoring Metrics:**

- Click-through rate on posts (are users actually clicking ranked posts?)
- Time spent reading posts from different feeds (engagement depth)
- User satisfaction with feed quality (via user feedback/surveys)
- Diversity of posts shown (are users seeing variety or echo chamber?)
- Community discovery rate (are users finding new communities?)
- Search effectiveness (click rate on search results)
- Trending accuracy (do trending posts match user interest?)

**Algorithm Health Dashboard:**

THE system SHALL provide admin dashboard showing:
- Feed generation performance (response times)
- Cache hit rates
- Algorithm score distribution
- User engagement metrics per sorting algorithm
- A/B test results
- Anomalies or algorithm issues

**Feedback Loop:**

THE system SHALL use user feedback to improve algorithms:
- Track "helpful/not helpful" on recommendations
- Monitor report rates (posts being reported after appearing in feeds)
- Track user complaints about feed quality
- Implement feedback signal into algorithm weighting over time

---

## 9. Technical Implementation Guidelines

### 9.1 Database Indexes Required

To support efficient sorting and searching, the following database indexes are REQUIRED:

**Critical Indexes:**

```
Posts table:
- (community_id, created_at DESC) - For retrieving community posts
- (created_at DESC) - For "new" sorting
- (user_id, created_at DESC) - For user profile posts
- (status, created_at DESC) - For filtering deleted posts
- Full-text index on (title, content) - For search

Votes table:
- (post_id) - For counting votes per post
- (user_id, post_id) - For user's vote history
- (created_at) - For trending votes (last 6 hours)

Communities table:
- (subscriber_count DESC) - For popular communities
- Full-text index on (name, description) - For community search
- (created_at DESC) - For trending communities

Users table:
- Full-text index on (username, display_name) - For user search
- (created_at DESC) - For new user discovery
```

**Index Performance Impact:**

- Index on (community_id, created_at) reduces post retrieval time from 5s to 100ms
- Full-text index reduces search time from 10s to 500ms
- Vote count index reduces vote aggregation from 30s to 1s for high-engagement posts

### 9.2 Denormalization Recommendations

For query performance, the following data should be denormalized on posts:

**Denormalized Post Fields:**

- `upvote_count` - Count of upvotes (updated in real-time)
- `downvote_count` - Count of downvotes (updated in real-time)
- `net_vote_score` - Calculated as upvote_count - downvote_count
- `comment_count` - Count of comments (updated in real-time)
- `view_count` - Number of times post was viewed (updated hourly)
- `last_activity_at` - Timestamp of last vote or comment
- `hot_score_cached` - Pre-calculated hot score (recalculated every 30 min)
- `author_username` - Username of post creator (for display)
- `community_name` - Name of community (for display)

These denormalized fields allow efficient sorting without requiring joins or expensive aggregations.

### 9.3 Query Optimization Examples

**Hot Sort Query (Denormalized):**

```sql
SELECT post_id, title, hot_score_cached, author_username, community_name
FROM posts
WHERE community_id IN (SELECT community_id FROM subscriptions WHERE user_id = ?)
  AND created_at > NOW() - INTERVAL 30 days
  AND status = 'active'
ORDER BY hot_score_cached DESC
LIMIT 25;
```

Performance: 200ms (with proper indexes)

**Search Query (Full-Text Index):**

```sql
SELECT post_id, title, relevance_score
FROM posts
WHERE to_tsvector(title || ' ' || content) @@ plainto_tsquery(?)
ORDER BY relevance_score DESC, created_at DESC
LIMIT 20;
```

Performance: 500ms for typical search

---

## 10. Performance Targets Summary

| Operation | Target Response Time | Caching Strategy |
|-----------|---------------------|------------------|
| Load homepage feed | < 2 seconds | Cache hot 5 min, new 10 min |
| Load community feed | < 1.5 seconds | Cache per community 10 min |
| Hot sort calculation | < 2 seconds | Pre-calculated every 30 min |
| New sort | < 500 ms | No cache needed (timestamp sort) |
| Top sort | < 1 second | Cache per time window 1 hour |
| Controversial sort | < 2 seconds | Cache 30 min |
| Search query | < 1 second | Cache popular queries |
| Trending posts | < 500 ms | Pre-calculated hourly |
| Community recommendations | < 1 second | Cache per user 24 hours |
| Feed pagination | < 500 ms | Cursor-based, no heavy caching |

---

## 11. Integration with Other Systems

### 11.1 Vote System Integration

The sorting algorithms depend on accurate vote counts and timestamps:

- Vote counts from [Voting and Karma System](./06-voting-karma-system.md) are denormalized to posts
- Vote timestamps are used in hot algorithm calculations
- Vote ratio (upvotes/total votes) is used in controversial calculations
- Real-time vote updates trigger feed cache invalidation

### 11.2 Post Content Integration

Sorting depends on post metadata:

- Post titles and content from [Posts Creation and Management](./05-posts-creation-management.md)
- Post creation timestamps and edited timestamps
- Post status (active, deleted, removed) from moderation system
- Post view counts are tracked per user session

### 11.3 Community Data Integration

Feed generation requires community information:

- User subscriptions from [Communities Management](./04-communities-management.md)
- Community visibility settings (public/private)
- Community categorization and rules
- Community growth metrics for trending calculation

### 11.4 User Data Integration

Personalization requires user information:

- User subscription history
- User voting history
- User engagement metrics
- User preferences from [User Management and Profiles](./03-user-management-profiles.md)

### 11.5 Comment System Integration

Feed quality depends on comment engagement:

- Comment counts on posts affect hot algorithm
- Comments drive engagement metrics for trending
- Comment-based engagement signals used in recommendations

---

## 12. Error Handling for Sorting and Search

### 12.1 Search Error Scenarios

**Invalid Search Query:**
- WHEN search query contains only wildcard characters, THE system SHALL display error: \"Search term too vague. Please include at least one regular character.\"

**Search Timeout:**
- WHEN search takes longer than 10 seconds, THE system SHALL timeout and display: \"Search taking too long. Try refining your search terms.\"

**Search Index Unavailable:**
- WHEN search index is down, THE system SHALL disable search and show: \"Search temporarily unavailable. Try again later.\"

### 12.2 Feed Generation Errors

**No Subscriptions:**
- WHEN user has zero subscriptions, THE system SHALL display default popular feed instead of empty feed

**Feed Cache Corruption:**
- WHEN cache contains invalid data, THE system SHALL delete cache entry and recalculate from database

**Subscription Sync Error:**
- WHEN subscription list is out of sync with cache, THE system SHALL invalidate and rebuild cache

---

## 13. Future Enhancements

### 13.1 Machine Learning Integration

The algorithms specified in this document are rule-based. In the future:

- Machine learning models could predict which posts users would be interested in
- Personalized ranking could improve beyond subscription-based filtering
- Recommendation engine could become more sophisticated using collaborative filtering

### 13.2 Advanced Algorithm Features

Future enhancements could include:

- User engagement predictors (estimated upvotes before post published)
- Sentiment analysis integration
- Topic modeling for better discovery
- Cascade recommendations based on comment activity

### 13.3 Community-Specific Algorithms

Current algorithms are platform-wide:

- Communities could define custom sorting algorithms for their feeds
- Moderators could adjust algorithm parameters for their communities
- Community values could influence ranking (e.g., emphasize older posts in history-focused communities)

---

## Summary

The Content Sorting, Discovery, and Feed Generation system is fundamental to the Community Platform's value proposition. It ensures users can find relevant content, discover new communities, and stay engaged with the platform. The system prioritizes:

1. **Algorithmic Fairness**: Multiple sorting options (hot, new, top, controversial) serve different user needs
2. **Performance**: All operations meet strict performance targets with caching and optimization
3. **Transparency**: Users understand how content is ranked and discover why posts appear
4. **Discovery**: Multiple mechanisms help users find new communities and diverse content
5. **Scalability**: Caching, indexing, and denormalization support millions of users and posts

Backend developers implementing this specification should prioritize database indexing, efficient sorting algorithms, comprehensive caching, and real-time updates to create a responsive, engaging platform.

> *Developer Note: This document defines **business requirements only**. All technical implementations (database design, API endpoints, caching infrastructure, search engine selection) are at the discretion of the development team. Developers have full autonomy in choosing technologies, architecture patterns, and implementation details to meet these business requirements.*