## Sorting Algorithms

This document defines the exact mathematical formulas, time-based weighting rules, and performance requirements for the four primary post-sorting algorithms: New, Top, Hot, and Controversial. These algorithms determine how posts are ranked and presented to users and are central to the platform's content discovery mechanics.

All sorting metrics are calculated server-side and cached for performance. The system must return sorted post lists within 500 milliseconds for 95% of requests under 1,000 concurrent users.

### New (Recent) Sorting

The "New" view displays posts in reverse chronological order based on creation time. This sorting method provides users with immediate access to the most recently published content.

- WHEN a user selects the "New" sort option, THE system SHALL sort all posts in the selected community or across the platform by creation timestamp in descending order (most recent first).
- THE system SHALL not apply any weighting, scoring, or decay function to the creation time.
- WHILE the post is publicly visible, THE system SHALL maintain its original creation timestamp as immutable.
- IF a post is edited after creation, THE system SHALL NOT update its sorting position in the New feed.
- WHERE the user selects "All Communities", THE system SHALL include posts from all public communities, sorted by creation timestamp.
- WHERE the user selects a specific community, THE system SHALL include only posts from that community, sorted by creation timestamp.
- THE system SHALL apply pagination of 50 posts per page in the New feed.

### Top (Highly Upvoted) Sorting

The "Top" view ranks posts by total net upvotes, with the highest-scoring posts appearing first. This method surfaces content that has been broadly favored by the community.

- WHEN a user selects the "Top" sort option, THE system SHALL sort posts by net vote score (upvotes minus downvotes) in descending order.
- THE system SHALL calculate net vote score as: `net_score = upvotes - downvotes`
- THE system SHALL include only posts with a net score of 1 or greater in the Top feed.
- IF a post has a net score of 0 or less, THE system SHALL exclude it from the Top feed entirely.
- WHILE the feed is active, THE system SHALL recalculate the net vote score every time a vote is cast.
- WHERE the user selects "All Time", THE system SHALL include all posts ever made in the community.
- WHERE the user selects "Past 24 Hours", "Past Week", or "Past Month", THE system SHALL filter posts by creation date before calculating net score.
- THE system SHALL apply pagination of 50 posts per page in the Top feed.

### Hot (Trending) Sorting

The "Hot" view ranks posts based on a time-sensitive engagement score, emphasizing recent activity to surface trending content. This algorithm balances popularity with freshness.

- WHEN a user selects the "Hot" sort option, THE system SHALL calculate a hot score for each post using the following formula:
  
  `hot_score = log10(max(|net_score|, 1)) + (timestamp_seconds - created_at_seconds) / 45000`
  
  Where:
  - `net_score` = upvotes - downvotes (sign preserved)
  - `timestamp_seconds` = current Unix timestamp at time of calculation
  - `created_at_seconds` = post creation Unix timestamp
  - `log10(max(|net_score|, 1))` ensures minimum log value of 0 when net_score = 0
  
- THE system SHALL normalize the hot score by string matching the community's total activity level to prevent larger communities from dominating.
- THE system SHALL use a circular buffer to store vote history for every post for the last 72 hours.
- THE system SHALL recalculate hot scores every 30 seconds for all active posts.
- IF a post is older than 72 hours, THE system SHALL remove it from the Hot feed.
- THE system SHALL exclude posts with fewer than 3 total votes from appearing in the Hot feed.
- WHERE the user selects "All Time", THE system SHALL return only posts created within the last 72 hours.
- WHERE the user selects "Past Hour" or "Past Two Hours", THE system SHALL restrict time range accordingly and recalculate scores using only votes within the selected window.
- THE system SHALL apply pagination of 50 posts per page in the Hot feed.
- THE system SHALL cache the top 500 hot posts per community in memory to respond to queries within 300ms.

### Controversial (High Upvotes + High Downvotes) Sorting

The "Controversial" view prioritizes posts that receive both high upvotes and high downvotes, surfacing divisive or debated content. This algorithm identifies community polarization.

- WHEN a user selects the "Controversial" sort option, THE system SHALL calculate a controversial score for each post using the following formula:
  
  `controversial_score = min(upvotes, downvotes) / (1 + abs(upvotes - downvotes))`
  
  Where:
  - `upvotes` = total positive votes
  - `downvotes` = total negative votes
  - `min(upvotes, downvotes)` emphasizes posts with balanced strong support and opposition
  - `(1 + abs(upvotes - downvotes))` penalizes posts that are overwhelmingly one-sided
  
- THE system SHALL exclude posts with fewer than 5 total votes from appearing in the Controversial feed.
- IF both upvotes and downvotes are equal to 0, THE system SHALL assign a controversial score of 0.
- IF either upvotes or downvotes is 0, THE system SHALL exclude the post from the Controversial feed.
- THE system SHALL apply time decay only for posts older than 96 hours.
- WHERE the user selects "All Time", THE system SHALL include all posts regardless of age, applying the above scoring function.
- WHERE the user selects "Past 24 Hours", THE system SHALL filter posts by creation date (created within last 24 hours) before calculating controversial score.
- THE system SHALL apply pagination of 50 posts per page in the Controversial feed.
- THE system SHALL order posts with identical controversial scores by total votes (upvotes + downvotes) in descending order to break ties.

### Time-Based Weighting Rules

The following time restrictions apply to all sorting views and interact with voting thresholds to maintain relevance:

- For "New": No time decay - only creation timestamp matters.
- For "Top": Time decay is disabled unless filtered by period (past 24h, week, month). When filtered, posts older than the period are excluded.
- For "Hot": Posts older than 72 hours are automatically removed from the feed.
- For "Controversial": Posts older than 96 hours are subject to period-based filtering, but can still be viewed in "All Time" mode.
- ALL sorting algorithm time windows are based on server-side current time in ISO 8601 format (UTC).
- ALL timestamps are stored as Unix integer seconds to ensure precision.

### Vote Ratio Calculations

Vote ratios are used to calculate engagement depth and polarization:

- The ratio of upvotes to total votes (`upvotes / (upvotes + downvotes)`) is used internally to determine skew for controversial scoring.
- If upvotes + downvotes < 5, the post is not eligible for controversial ranking.
- If upvotes + downvotes >= 5 and upvotes = downvotes, the controversial score reaches maximum.
- If the upvote ratio exceeds 95% (`upvotes / (upvotes + downvotes) > 0.95`), the post is excluded from controversial ranking.
- If the downvote ratio exceeds 95% (`downvotes / (upvotes + downvotes) > 0.95`), the post is excluded from controversial ranking.

### Sorting Algorithm Parameters

All sorting algorithms use the following consistent system parameters:

| Parameter | Value | Description |
|----------|-------|-------------|
| Cache Expiration | 30 seconds | Hot and controversial scores updated and cached every 30s |
| Page Size | 50 | Posts per pagination page for all views |
| Minimum Votes for Hot | 3 | Posts need 3+ total votes to appear in Hot |
| Minimum Votes for Controversial | 5 | Posts need 5+ total votes to appear in Controversial |
| Hot Time Window | 72 hours | Posts older than 72h are removed from Hot feed |
| Controversial Time Window | 96 hours | Posts older than 96h are excluded from non-"All Time" views |
| Network Decaying Factor | 0.001 | Faculty applied to community volume normalization |
| Minimum Net Score for Top | 1 | Posts must have net_score >= 1 to appear in Top |
| Time Unit | Unix seconds | All timestamps stored and processed as integer seconds since epoch |

### Performance and Cache Requirements

All sorting operations must meet strict latency thresholds to ensure a responsive user experience:

- WHEN a user loads a sorted feed, THE system SHALL respond within 500 milliseconds for 95% of requests.
- WHEN the platform has 1,000 concurrent users making sort requests, THE system SHALL maintain 99% availability of sorted results.
- THE system SHALL maintain in-memory Redis caches for:
  - Top ranked posts per community (last 1,000 posts)
  - Hot ranked posts per community (last 500 posts)
  - Controversial ranked posts per community (last 500 posts)
- WHEN a vote is cast, THE system SHALL immediately invalidate the relevant cache entries (Top, Hot, Controversial) for that post and community.
- THE system SHALL trigger asynchronous recalculation of Hot and Controversial scores every 30 seconds using a background worker queue.
- THE system SHALL pre-generate and preload the top 50 posts for "New" view for all public communities every 5 minutes to reduce latency.