# Content Sorting Algorithms Requirements

## 1. Introduction and Overview

### 1.1 Purpose of Content Sorting

Content sorting is the mechanism that determines the order in which posts appear to users throughout the community platform. The sorting system directly impacts user engagement, content discovery, and overall platform experience by presenting the most relevant, interesting, or timely content based on user preferences.

Effective sorting algorithms ensure that:
- High-quality content receives appropriate visibility
- Fresh content gets opportunities for engagement
- Users can customize their content consumption experience
- The platform maintains dynamic and engaging feeds
- Content creators receive fair exposure based on community reception

### 1.2 Importance to User Experience

The sorting system is fundamental to the platform's success because:
- **Content Discovery**: Users discover valuable content through intelligent ranking
- **Engagement Optimization**: Proper sorting maximizes user interaction and time spent on platform
- **Community Health**: Fair sorting prevents content stagnation and encourages participation
- **User Control**: Multiple sorting options empower users to consume content their preferred way
- **Platform Dynamics**: Sorting algorithms create the "feel" of the platform and influence community culture

### 1.3 Relationship to Voting and Karma System

Content sorting is intrinsically linked to the voting and karma system detailed in the [Voting and Karma System Requirements](./06-voting-karma-system.md). The sorting algorithms consume vote data (upvotes, downvotes, net scores) as primary inputs for ranking calculations. Additionally:

- Vote counts directly influence hot, top, and controversial sorting
- Vote velocity (rate of voting over time) affects hot sorting
- Vote ratios determine controversial sorting
- Post creation metadata works alongside votes for comprehensive ranking
- User voting behavior shapes what content surfaces through different sort methods

For complete details on how votes are collected, validated, and counted, refer to the [Voting and Karma System Requirements](./06-voting-karma-system.md).

### 1.4 Document Scope

This document specifies the business requirements for four primary sorting algorithms:
1. **Hot**: Balances post popularity with recency to surface trending content
2. **New**: Shows newest content first for users wanting latest posts
3. **Top**: Ranks by total vote score with time-based filtering options
4. **Controversial**: Highlights content with divisive voting patterns

All requirements are written from a business perspective, describing WHAT the system should do from a user's viewpoint, not HOW to implement it technically. Implementation decisions including algorithms, data structures, caching strategies, and technical architecture are at the discretion of the development team.

## 2. Sorting System Architecture

### 2.1 Overview of Sorting Mechanisms

The platform provides four distinct sorting methods that users can select to customize their content viewing experience. Each sorting method serves different user needs:

- **Hot Sorting**: For users who want to see trending, currently popular content that's actively being discussed
- **New Sorting**: For users who want to see the latest posts regardless of popularity, often used to discover fresh content early
- **Top Sorting**: For users who want to see the highest-rated content over specific time periods, useful for finding the "best of" content
- **Controversial Sorting**: For users interested in divisive topics that generate both strong support and opposition

All sorting methods operate on the same pool of posts but apply different ranking logic to determine display order. The sorting system must handle posts from multiple sources:
- Individual community feeds (all posts within a specific community)
- Personalized home feeds (posts from communities the user has subscribed to)
- All communities feed (posts from across the entire platform)

### 2.2 Default Sorting Behaviors

#### 2.2.1 Community Feed Default Sorting

WHEN a user views a community feed without having previously selected a sorting preference, THE system SHALL display posts sorted by "Hot" by default.

The hot sorting default ensures that community feeds show currently engaging content that represents active community discussion, providing the best first impression for new visitors.

#### 2.2.2 Personalized Home Feed Default Sorting

WHEN a user views their personalized home feed (containing posts from subscribed communities) without having previously selected a sorting preference, THE system SHALL display posts sorted by "Hot" by default.

This default prioritizes recent, popular content from the communities the user cares about, maximizing engagement with their curated feed.

#### 2.2.3 All Communities Feed Default Sorting

WHEN a user views the "All" feed (containing posts from all public communities) without having previously selected a sorting preference, THE system SHALL display posts sorted by "Hot" by default.

The hot default for the all communities feed surfaces the most engaging content across the platform, providing an exciting and dynamic browsing experience.

#### 2.2.4 First-Time User Experience

WHEN a user accesses the platform for the first time, THE system SHALL display all feeds using "Hot" sorting by default.

First-time users benefit from seeing trending, popular content that demonstrates the platform's value and encourages exploration.

### 2.3 User Sorting Preferences and Controls

#### 2.3.1 Sorting Selection Interface

THE system SHALL provide users with a sorting selector interface that allows instant switching between Hot, New, Top, and Controversial sorting methods.

The sorting selector must be:
- Clearly visible on all feed pages
- Accessible without scrolling (persistent or easily accessible)
- Responsive to user selection without page reload (instant application)
- Clearly indicate the currently active sorting method

#### 2.3.2 Sorting Preference Persistence Per Context

WHEN a user selects a sorting method for a specific community feed, THE system SHALL remember that preference for that specific community.

WHEN a user selects a sorting method for their personalized home feed, THE system SHALL remember that preference for the home feed.

WHEN a user selects a sorting method for the all communities feed, THE system SHALL remember that preference for the all communities feed.

Each context (individual communities, home feed, all feed) maintains its own sorting preference independently. This allows users to prefer "New" sorting in one community while preferring "Hot" sorting in another, based on their relationship with each community.

#### 2.3.3 Sorting Preference Persistence Duration

THE system SHALL persist user sorting preferences across sessions, storing the preference for each user.

Sorting preferences should remain active until the user explicitly changes them, providing a consistent experience across multiple visits to the platform.

#### 2.3.4 Cross-Device Preference Synchronization

WHEN a user is authenticated, THE system SHALL synchronize sorting preferences across all devices and browsers where the user is logged in.

This ensures a consistent experience whether the user accesses the platform from desktop, mobile, or multiple browsers.

#### 2.3.5 Anonymous User Sorting Preferences

WHEN an anonymous (non-authenticated) user selects a sorting preference, THE system SHALL store the preference in the browser session.

Anonymous user preferences may be stored locally (browser storage) and will apply during the current browsing session but may not persist across devices or after browser data is cleared.

### 2.4 Sorting Algorithm Execution Context

All sorting algorithms operate on posts that are already filtered by the current viewing context:
- When viewing a community feed, sorting applies only to posts within that community
- When viewing the personalized home feed, sorting applies only to posts from subscribed communities
- When viewing the all communities feed, sorting applies to all public posts across the platform

The sorting system does not need to handle post filtering by community membership; it receives a pre-filtered set of posts and applies the ranking logic.

## 3. Hot Sorting Algorithm

### 3.1 Business Logic and Purpose

Hot sorting is designed to surface content that is currently generating significant engagement and discussion. The algorithm balances two competing factors:

1. **Popularity**: Posts with more upvotes should rank higher than posts with fewer upvotes
2. **Recency**: Newer posts should have advantages over older posts, even if older posts have accumulated more total votes

The goal is to create a dynamic feed where:
- Fresh content has the opportunity to rise quickly if it's well-received
- Popular content stays visible while it's actively being engaged with
- Older content naturally decays from the hot feed, making room for newer discussions
- The feed feels "alive" with current conversations

### 3.2 Ranking Factors

The hot sorting algorithm must consider the following factors when ranking posts:

#### 3.2.1 Vote Score Impact

WHEN calculating hot ranking, THE system SHALL give significant weight to the post's net vote score (upvotes minus downvotes).

Posts with higher net scores should generally rank higher than posts with lower net scores when other factors are equal. The vote score represents community approval and interest.

#### 3.2.2 Time Decay Impact

WHEN calculating hot ranking, THE system SHALL apply time-based decay to post rankings such that older posts gradually lose ranking position even if their vote scores remain constant.

Time decay ensures that:
- Posts from weeks or months ago don't dominate the hot feed indefinitely
- The hot feed refreshes regularly with newer content
- Users see recent discussions rather than archived content

The rate of time decay should be tuned such that:
- Exceptional content can remain in hot feed for hours, not just minutes
- Average content cycles out of hot feed within several hours
- The feed has noticeable changes when refreshed after 30-60 minutes

#### 3.2.3 Vote Velocity Consideration

WHEN calculating hot ranking, THE system SHOULD consider the rate at which a post is receiving votes, not just the total vote count.

Posts that are rapidly accumulating upvotes (high vote velocity) should rank higher than posts with similar total scores but slower voting rates. This ensures that "trending" content rises quickly.

Vote velocity represents current community interest and helps surface emerging popular content before it accumulates enough total votes to rank highly on vote score alone.

#### 3.2.4 Post Age Consideration

WHEN calculating hot ranking, THE system SHALL use the post's creation timestamp as the baseline for time decay calculations.

The age of a post (time elapsed since creation) is the primary temporal factor in hot ranking. Older posts should decay faster than newer posts.

#### 3.2.5 Minimum Threshold for Hot Ranking

WHEN calculating hot ranking, THE system MAY establish a minimum vote threshold that posts must exceed to appear in hot sorting.

Posts with very low vote counts (e.g., 0 or 1 net votes) may be deprioritized in hot sorting even if they're recent, as they haven't demonstrated sufficient community interest.

### 3.3 Hot Sorting Functional Requirements

#### 3.3.1 Hot Ranking Calculation

WHEN a user selects "Hot" sorting for a feed, THE system SHALL rank posts using an algorithm that combines vote score and time decay to produce a hotness score for each post.

THE system SHALL order posts by their hotness score in descending order, with the highest hotness scores appearing first.

#### 3.3.2 Real-Time Ranking Updates

WHEN new votes are cast on posts, THE system SHALL update hot rankings to reflect the new vote data.

The hot feed should feel dynamic and responsive to ongoing voting activity. Users should see ranking changes when they refresh the feed after significant voting activity has occurred.

#### 3.3.3 Time Decay Progression

THE system SHALL continuously apply time decay to all posts in hot sorting, ensuring that as time passes, older posts naturally decline in ranking regardless of their vote scores.

Even if no new votes occur, the hot feed should evolve over time as posts age and decay, making room for newer content.

#### 3.3.4 Handling Negative-Scored Posts

WHEN a post has a negative net vote score (more downvotes than upvotes), THE system SHALL rank it lower than posts with positive or neutral scores in hot sorting.

Negative-scored posts should decay faster and may be excluded from hot feeds entirely if their scores are sufficiently negative, as they represent content the community has rejected.

#### 3.3.5 Tiebreaker Logic

WHEN multiple posts have identical or very similar hotness scores, THE system SHALL use post creation timestamp as a tiebreaker, with newer posts ranking higher than older posts.

This ensures deterministic, consistent ordering even when hotness scores are equal.

### 3.4 Performance Expectations

#### 3.4.1 Hot Feed Load Time

WHEN a user requests a feed with hot sorting, THE system SHALL display the sorted posts within 2 seconds under normal load conditions.

Users expect instant or near-instant feed loading, and hot sorting must perform efficiently even with large numbers of posts.

#### 3.4.2 Hot Ranking Calculation Efficiency

THE system SHALL calculate hot rankings efficiently such that feeds with thousands of posts can be sorted without degrading user experience.

Hot sorting performance should scale appropriately as post volume grows within communities and across the platform.

#### 3.4.3 Ranking Refresh Rate

THE system SHALL refresh hot rankings frequently enough that users notice ranking changes when significant voting activity occurs.

Users who refresh the feed after 5-10 minutes should see updated rankings if substantial voting has occurred during that time.

## 4. New Sorting Algorithm

### 4.1 Business Logic and Purpose

New sorting is the simplest sorting algorithm, designed to show users the most recently created content first. This sorting method serves several important use cases:

- **Early Discovery**: Users can discover brand-new content before it has accumulated votes or attention
- **Completeness**: Users can browse all new content in a community without popularity bias
- **Fairness**: New content gets visibility regardless of initial vote performance
- **Real-Time Monitoring**: Active community members can monitor all new posts as they're created

New sorting ignores vote scores entirely, focusing solely on creation time. This creates a purely chronological feed.

### 4.2 Chronological Ordering Requirements

#### 4.2.1 Creation Timestamp as Sole Ranking Factor

WHEN a user selects "New" sorting, THE system SHALL rank posts exclusively by their creation timestamp, with the most recently created posts appearing first.

Vote scores, vote counts, user karma, and all other factors must be ignored in new sorting. Only the post creation time determines ranking.

#### 4.2.2 Descending Time Order

THE system SHALL display posts in new sorting in descending chronological order, meaning:
- The newest post (most recent creation timestamp) appears at the top
- The oldest post (earliest creation timestamp) appears at the bottom
- Posts are ordered from newest to oldest consistently

### 4.3 New Sorting Functional Requirements

#### 4.3.1 New Sorting Ranking Calculation

WHEN a user selects "New" sorting for a feed, THE system SHALL order all posts by their creation timestamp in descending order.

The implementation should use the post creation timestamp stored when the post was originally created, ensuring accurate chronological ordering.

#### 4.3.2 Precise Timestamp Ordering

THE system SHALL use precise timestamps (including hours, minutes, seconds, and milliseconds if available) to determine post order in new sorting.

Posts created within the same second should have deterministic ordering based on the most precise timestamp available.

#### 4.3.3 Feed Consistency Across Refreshes

WHEN a user refreshes a feed with new sorting active, THE system SHALL maintain consistent ordering for existing posts while adding any newly created posts at the top.

Posts that existed before the refresh should not change their relative order (unless new posts are inserted above them). This ensures stable, predictable browsing.

#### 4.3.4 Real-Time New Post Integration

WHEN new posts are created after a user loads a feed with new sorting, THE system SHALL be capable of inserting those new posts at the top of the feed when the user refreshes or reloads.

New sorting must feel fresh and immediate, showing users the latest content as soon as they refresh the feed.

#### 4.3.5 Vote Data Irrelevance

THE system SHALL NOT consider vote scores, vote counts, karma, or any voting-related data when calculating new sorting order.

Even posts with negative scores or no votes should appear in their correct chronological position in new sorting.

### 4.4 New Sorting Display Considerations

#### 4.4.1 Timestamp Display

WHEN displaying posts in new sorting, THE system SHOULD show clear creation timestamps on each post so users can understand the chronological progression.

Timestamps help users gauge post freshness and understand the time distribution of content in the feed.

#### 4.4.2 Time Zone Handling

THE system SHALL display creation timestamps in the user's local time zone for readability, while using UTC or a consistent time zone internally for sorting calculations.

Users should see timestamps that make sense in their context (e.g., "posted 5 minutes ago" or "posted at 3:45 PM"), but the underlying sorting should use consistent time measurement.

### 4.5 Performance Expectations

#### 4.5.1 New Feed Load Time

WHEN a user requests a feed with new sorting, THE system SHALL display the sorted posts within 1 second under normal load conditions.

New sorting should be the fastest sorting algorithm since it requires only simple timestamp comparison without complex calculations.

#### 4.5.2 Scalability

THE system SHALL efficiently sort posts by timestamp even when communities contain tens of thousands or hundreds of thousands of posts.

Chronological sorting should leverage database indexing and efficient query patterns to maintain fast performance at scale.

## 5. Top Sorting Algorithm

### 5.1 Business Logic and Purpose

Top sorting ranks posts by their total vote score (upvotes minus downvotes) within specified time windows, allowing users to discover the highest-rated content over different time periods. This sorting method serves several important purposes:

- **Quality Discovery**: Users can find the best-received content in a community or across the platform
- **Historical Exploration**: Users can browse highly-rated content from specific time periods
- **Community Highlights**: Top sorting showcases content that the community values most
- **Archival Access**: Users can discover excellent older content that may no longer appear in hot feeds

Unlike hot sorting, top sorting does not apply time decay—it's a pure popularity contest within the selected time window.

### 5.2 Time Filter Options

Top sorting must support multiple time filter options that define the window of time from which posts are included and ranked:

#### 5.2.1 Today Time Filter

WHEN a user selects "Top" sorting with "Today" time filter, THE system SHALL include only posts created within the current calendar day (from midnight to the current time in the user's time zone or platform time zone).

THE system SHALL rank these posts by their net vote score (upvotes minus downvotes) in descending order.

#### 5.2.2 This Week Time Filter

WHEN a user selects "Top" sorting with "This Week" time filter, THE system SHALL include only posts created within the current calendar week (from the start of the week to the current time).

THE system SHALL rank these posts by their net vote score in descending order.

The week start day should be defined consistently (e.g., Monday or Sunday) across the platform.

#### 5.2.3 This Month Time Filter

WHEN a user selects "Top" sorting with "This Month" time filter, THE system SHALL include only posts created within the current calendar month (from the first day of the month to the current time).

THE system SHALL rank these posts by their net vote score in descending order.

#### 5.2.4 This Year Time Filter

WHEN a user selects "Top" sorting with "This Year" time filter, THE system SHALL include only posts created within the current calendar year (from January 1 to the current time).

THE system SHALL rank these posts by their net vote score in descending order.

#### 5.2.5 All Time Filter

WHEN a user selects "Top" sorting with "All Time" time filter, THE system SHALL include all posts regardless of creation date.

THE system SHALL rank these posts by their net vote score in descending order, allowing users to discover the highest-rated content in the community's entire history.

### 5.3 Vote Count Ranking Requirements

#### 5.3.1 Net Vote Score as Primary Ranking Factor

WHEN calculating top sorting rankings, THE system SHALL use the net vote score (total upvotes minus total downvotes) as the sole ranking factor.

Posts with higher net scores should always rank above posts with lower net scores within the selected time window.

#### 5.3.2 No Time Decay in Top Sorting

THE system SHALL NOT apply time decay to posts in top sorting.

A post created at the beginning of the time window should have the same ranking opportunity as a post created at the end of the time window if their vote scores are equal. Only vote score determines ranking.

#### 5.3.3 Handling Negative Scores

WHEN posts have negative net vote scores, THE system SHALL include them in top sorting but rank them below posts with zero or positive scores.

Posts should be ranked in descending order by score, so a post with -2 net votes ranks above a post with -10 net votes, but both rank below posts with 0 or positive scores.

#### 5.3.4 Score Tiebreaker

WHEN multiple posts have identical net vote scores within the selected time window, THE system SHALL use post creation timestamp as a tiebreaker, with newer posts ranking higher than older posts.

This ensures deterministic, consistent ordering when scores are tied.

### 5.4 Top Sorting Functional Requirements

#### 5.4.1 Time Filter Selection Interface

THE system SHALL provide users with a time filter selector when top sorting is active, allowing selection between: Today, This Week, This Month, This Year, and All Time.

The time filter selector should be:
- Clearly visible when top sorting is active
- Easy to switch between time periods
- Clearly indicate the currently selected time filter

#### 5.4.2 Default Time Filter for Top Sorting

WHEN a user selects "Top" sorting without having previously selected a time filter preference, THE system SHALL default to "All Time" time filter.

This default provides the broadest view of top content and aligns with user expectations of "top" meaning "best ever."

#### 5.4.3 Time Filter Preference Persistence

WHEN a user selects a specific time filter for top sorting, THE system SHALL remember that preference for that feed context.

The next time the user selects top sorting in the same context (e.g., a specific community), the previously selected time filter should be automatically applied.

#### 5.4.4 Time Window Calculation Accuracy

THE system SHALL calculate time windows accurately based on calendar boundaries or rolling time periods as appropriate.

For calendar-based filters (Today, This Week, This Month, This Year):
- Time windows should align with calendar boundaries (days, weeks, months, years)
- The system should handle time zone considerations appropriately
- Window boundaries should be recalculated when users access the feed at different times

#### 5.4.5 Dynamic Time Window Updates

WHEN a user keeps a top-sorted feed open across a time boundary (e.g., from 11:59 PM to 12:01 AM, crossing into a new day), THE system SHALL update the time window when the feed is refreshed.

Users who refresh a "Today" feed after midnight should see the new day's top posts, not the previous day's.

#### 5.4.6 Vote Score Updates in Top Sorting

WHEN votes are cast on posts after they appear in a top-sorted feed, THE system SHALL reflect the updated vote scores when the user refreshes the feed.

Top sorting rankings should update in real-time (on refresh) to reflect current vote totals, ensuring the feed shows the current top-rated content.

### 5.5 Performance Expectations

#### 5.5.1 Top Feed Load Time

WHEN a user requests a feed with top sorting and any time filter, THE system SHALL display the sorted posts within 2 seconds under normal load conditions.

Top sorting with time filters may require filtering large datasets, but performance should remain fast enough for good user experience.

#### 5.5.2 Time Filter Switching Performance

WHEN a user switches between different time filters while top sorting is active, THE system SHALL display the newly filtered and sorted results within 1-2 seconds.

Time filter switching should feel instant or near-instant, encouraging users to explore different time periods.

#### 5.5.3 Scalability with Large Time Windows

THE system SHALL efficiently handle top sorting with "All Time" filter even in communities with hundreds of thousands of posts accumulated over years.

The implementation should leverage database optimization, indexing, and efficient querying to maintain performance regardless of historical post volume.

## 6. Controversial Sorting Algorithm

### 6.1 Business Logic and Purpose

Controversial sorting identifies and surfaces posts that have generated divisive reactions from the community—content that has received substantial upvotes AND substantial downvotes, indicating disagreement or polarization.

The purpose of controversial sorting is to:
- **Surface Debate**: Highlight posts that have sparked community disagreement and discussion
- **Explore Diverse Opinions**: Show content where the community is split, not unified
- **Identify Hot Topics**: Find subjects that generate strong reactions on both sides
- **Provide Alternative Perspective**: Offer a different lens than purely popular or recent content

A truly controversial post is one where many users strongly agreed (upvoted) while many users strongly disagreed (downvoted), resulting in a relatively low net score but high total vote volume.

### 6.2 Controversy Calculation Logic

#### 6.2.1 Balance Between Upvotes and Downvotes

WHEN calculating controversy ranking, THE system SHALL consider both the total number of votes and the balance between upvotes and downvotes.

The most controversial posts are those where:
- Both upvote count and downvote count are high (lots of total engagement)
- The ratio of upvotes to downvotes is close to 1:1 (balanced division)

Less controversial posts are those where:
- One side dominates (e.g., 100 upvotes and 5 downvotes, or 5 upvotes and 100 downvotes)
- Total vote count is low (e.g., 2 upvotes and 2 downvotes shows balance but not significance)

#### 6.2.2 Controversy Score Factors

The controversial sorting algorithm should consider:

1. **Total Vote Volume**: Posts with more total votes (upvotes + downvotes) should generally rank higher than posts with fewer votes, when vote balance is similar. A post with 100 upvotes and 98 downvotes is more controversial than a post with 10 upvotes and 8 downvotes.

2. **Vote Ratio Balance**: Posts where upvotes and downvotes are nearly equal are more controversial than posts where one side dominates. A 50/50 split is maximally controversial, while a 90/10 split is less controversial.

3. **Net Score Consideration**: Posts with very high net positive or negative scores are less controversial than posts with scores near zero, assuming similar total vote volumes.

#### 6.2.3 Optimal Controversy Pattern

WHEN ranking posts by controversy, THE system SHALL rank highest those posts that have:
- High total vote counts (significant engagement)
- Vote ratios close to 50% upvotes and 50% downvotes (maximum disagreement)
- Net scores near zero (indicating balance, not consensus)

Example of highly controversial post: 500 upvotes, 480 downvotes (net score: +20, total votes: 980, ratio: 51%/49%)

Example of non-controversial post: 500 upvotes, 20 downvotes (net score: +480, total votes: 520, ratio: 96%/4%)

### 6.3 Controversial Sorting Functional Requirements

#### 6.3.1 Controversy Ranking Calculation

WHEN a user selects "Controversial" sorting, THE system SHALL calculate a controversy score for each post based on the balance and volume of upvotes versus downvotes.

THE system SHALL rank posts by their controversy score in descending order, with the most controversial posts appearing first.

#### 6.3.2 Minimum Vote Threshold for Controversy

WHEN calculating controversial sorting, THE system MAY establish a minimum total vote threshold that posts must meet to be considered controversial.

Posts with very few total votes (e.g., 1 upvote and 1 downvote) may not appear in controversial sorting despite having perfect vote balance, as they lack sufficient engagement to be meaningfully controversial.

A reasonable minimum threshold might be 10-20 total votes, ensuring that only posts with substantive community engagement appear.

#### 6.3.3 Time Considerations in Controversial Sorting

THE system SHOULD consider post age when calculating controversy, potentially applying mild time decay or time windows to controversial sorting.

Options include:
- **No time filter**: Show the most controversial posts of all time (default)
- **Time filters similar to top sorting**: Allow users to see controversial posts from today, this week, etc.
- **Mild time decay**: Slightly favor recent controversial posts over very old ones

The exact time handling approach may be tuned based on platform needs, but controversial sorting should generally not apply aggressive time decay like hot sorting does.

#### 6.3.4 Handling Posts with Consensus

WHEN posts have highly skewed vote ratios (e.g., 95% upvotes or 95% downvotes), THE system SHALL rank them lower in controversial sorting than posts with balanced vote ratios.

Posts that represent community consensus (whether positive or negative) are not controversial and should not appear high in controversial sorting.

#### 6.3.5 Vote Updates and Controversy Ranking

WHEN votes are cast on posts after they appear in controversial sorting, THE system SHALL recalculate controversy scores and update rankings when the feed is refreshed.

As posts receive more votes, their controversy scores may change (increasing if votes remain balanced, or decreasing if votes become skewed toward one side).

#### 6.3.6 Tiebreaker for Equal Controversy Scores

WHEN multiple posts have identical or very similar controversy scores, THE system SHALL use total vote count as the first tiebreaker (more votes = higher rank), and post creation timestamp as the second tiebreaker (newer = higher rank).

This ensures deterministic, consistent ordering when controversy scores are similar.

### 6.4 Controversial Sorting User Experience

#### 6.4.1 User Understanding of Controversial Sorting

THE system SHOULD provide clear explanations or tooltips describing what "controversial" means in the platform context.

Many users may not intuitively understand that controversial sorting shows posts with balanced upvote/downvote ratios. Clear communication helps users understand why certain posts appear in controversial sorting.

#### 6.4.2 Controversial Sorting Use Cases

Controversial sorting is particularly useful for:
- Political or opinion-based communities where disagreement is common
- Communities discussing subjective topics (e.g., taste, preferences, ethics)
- Identifying topics that need more nuanced discussion
- Finding posts that sparked debate rather than consensus

Users should be able to access controversial sorting in the same manner as other sorting options, through the standard sorting selector interface.

### 6.5 Performance Expectations

#### 6.5.1 Controversial Feed Load Time

WHEN a user requests a feed with controversial sorting, THE system SHALL display the sorted posts within 2 seconds under normal load conditions.

Controversial sorting may involve more complex calculations than new or top sorting, but performance should remain acceptable for good user experience.

#### 6.5.2 Controversy Calculation Efficiency

THE system SHALL calculate controversy scores efficiently, potentially using pre-calculated or cached values when appropriate to maintain fast feed loading.

Since controversy depends on vote counts that change frequently, the balance between real-time calculation accuracy and performance should be carefully managed.

## 7. Feed Generation and Sorting Application

### 7.1 Sorting Application Across Different Feed Types

The sorting algorithms described in this document apply across multiple feed contexts within the platform. Each feed type presents a filtered set of posts, and the selected sorting algorithm determines the order in which those posts appear.

### 7.2 Community Feed Sorting

#### 7.2.1 Community Feed Context

WHEN a user views a specific community feed (e.g., /r/technology, /r/gaming), THE system SHALL display posts from only that community.

The sorting algorithm selected by the user determines the order of posts within that single community.

#### 7.2.2 Community Feed Sorting Options

THE system SHALL provide all four sorting options (Hot, New, Top, Controversial) for community feeds.

Users should be able to switch between sorting methods to explore the community's content in different ways:
- Hot: See what's currently trending in this community
- New: See the latest posts in this community
- Top: See the highest-rated posts in this community over various time periods
- Controversial: See the most divisive posts in this community

#### 7.2.3 Community-Specific Sorting Preferences

WHEN a user selects a sorting method for a specific community, THE system SHALL remember that preference for that community independently of other communities.

A user might prefer "New" sorting in a news community but "Hot" sorting in an entertainment community, and these preferences should be maintained separately.

### 7.3 Personalized Home Feed Sorting

#### 7.3.1 Personalized Feed Context

WHEN a user views their personalized home feed, THE system SHALL display posts from all communities the user has subscribed to.

The sorting algorithm operates on the aggregated posts from all subscribed communities, not on each community individually.

#### 7.3.2 Personalized Feed Sorting Behavior

WHEN a user selects "Hot" sorting for their home feed, THE system SHALL rank all posts from subscribed communities by their hotness scores, intermixing posts from different communities.

WHEN a user selects "New" sorting for their home feed, THE system SHALL display posts from all subscribed communities in chronological order, intermixing posts from different communities.

WHEN a user selects "Top" sorting for their home feed, THE system SHALL rank all posts from subscribed communities by their vote scores within the selected time window, intermixing posts from different communities.

WHEN a user selects "Controversial" sorting for their home feed, THE system SHALL rank all posts from subscribed communities by their controversy scores, intermixing posts from different communities.

The home feed should feel like a unified stream of content from the user's interests, not separate streams from each community.

#### 7.3.3 Home Feed Sorting Preference Independence

WHEN a user changes sorting method for their home feed, THE system SHALL NOT affect sorting preferences for individual community feeds.

Home feed sorting and community feed sorting are independent preferences.

### 7.4 All Communities Feed Sorting

#### 7.4.1 All Communities Feed Context

WHEN a user views the "All" or "Popular" feed, THE system SHALL display posts from all public communities across the platform.

This feed provides discovery across the entire platform and showcases the most engaging content platform-wide.

#### 7.4.2 All Communities Feed Sorting Options

THE system SHALL provide all four sorting options (Hot, New, Top, Controversial) for the all communities feed.

- Hot: Platform-wide trending content
- New: Latest posts from across all communities
- Top: Highest-rated content platform-wide over time periods
- Controversial: Most divisive content across the platform

#### 7.4.3 All Communities Feed Sorting Preference Independence

WHEN a user changes sorting method for the all communities feed, THE system SHALL NOT affect sorting preferences for the home feed or individual community feeds.

All communities feed sorting is an independent preference.

### 7.5 Feed Refresh and Sorting Consistency

#### 7.5.1 Sorting Persistence During Session

WHEN a user navigates between different feeds and returns to a previously viewed feed, THE system SHALL maintain the sorting method that was active when the user left that feed.

Users should not need to re-select their preferred sorting method each time they navigate back to a feed.

#### 7.5.2 Feed Refresh Behavior

WHEN a user refreshes a feed (either manually or by navigating back to it), THE system SHALL recalculate rankings based on current vote data and post data while maintaining the selected sorting method.

Posts may appear in different positions after refresh if voting activity has occurred, but the sorting method should remain consistent.

#### 7.5.3 New Posts in Sorted Feeds

WHEN new posts are created after a user loads a feed, THE system SHALL incorporate those new posts into the sorting when the feed is refreshed.

- In "New" sorting, new posts appear at the top
- In "Hot" sorting, new posts appear according to their hotness scores
- In "Top" sorting, new posts appear according to their vote scores (which may be zero initially)
- In "Controversial" sorting, new posts appear according to their controversy scores (which may be low initially)

## 8. User Experience Requirements

### 8.1 Sorting Selection Interface Requirements

#### 8.1.1 Sorting Selector Visibility

THE system SHALL display a sorting selector control on all feed pages, including:
- Community feeds
- Personalized home feed
- All communities feed

The sorting selector must be easily discoverable and accessible to users without scrolling or searching.

#### 8.1.2 Sorting Selector Design Requirements

THE system SHALL design the sorting selector to include:
- Clear labels for each sorting option: "Hot", "New", "Top", "Controversial"
- Visual indication of the currently active sorting method
- One-click or one-tap access to change sorting methods
- Responsive interaction that applies the new sorting immediately

The sorting selector may be implemented as:
- A dropdown menu
- A set of tab buttons
- A segmented control
- Any other interface pattern that provides clear, immediate access to sorting options

#### 8.1.3 Time Filter Selector for Top Sorting

WHEN "Top" sorting is active, THE system SHALL display an additional time filter selector allowing users to choose between: Today, This Week, This Month, This Year, and All Time.

The time filter selector should be:
- Clearly associated with the Top sorting option
- Easy to switch between time periods
- Visible only when Top sorting is active (or always visible but disabled when other sorting is active)

#### 8.1.4 Sorting Change Responsiveness

WHEN a user selects a different sorting method, THE system SHALL apply the new sorting and display the re-ranked feed within 1-2 seconds.

Sorting changes should feel instant or near-instant. Users should not experience long loading delays when switching between sorting methods.

#### 8.1.5 Sorting State Indication

THE system SHALL clearly indicate to users which sorting method and (for Top sorting) which time filter is currently active.

Visual indicators might include:
- Highlighted or selected state on the active sorting button/tab
- Bold text for the active option
- Color changes or icons indicating active state
- Text label stating "Sorted by: Hot" or similar

### 8.2 Default Sorting Per Context

#### 8.2.1 First Visit Defaults

WHEN a user visits any feed for the first time without having established a sorting preference, THE system SHALL apply "Hot" sorting as the default.

This default applies to:
- First-time users visiting any feed
- Authenticated users visiting a new community for the first time
- Any feed context where the user has not previously selected a sorting preference

#### 8.2.2 Returning User Defaults

WHEN an authenticated user returns to a feed where they have previously selected a sorting preference, THE system SHALL apply that user's preferred sorting method for that feed context.

Users should experience consistency—their sorting choices persist across sessions.

#### 8.2.3 Anonymous User Defaults

WHEN an anonymous (non-authenticated) user selects a sorting preference, THE system SHOULD store that preference in browser local storage or session storage.

Anonymous user sorting preferences may persist during the browsing session but will not sync across devices or persist indefinitely.

### 8.3 Sorting Persistence and Preferences

#### 8.3.1 Per-Context Preference Storage

THE system SHALL store sorting preferences independently for each feed context:
- Each community has its own sorting preference
- The home feed has its own sorting preference
- The all communities feed has its own sorting preference

A user's sorting preference in one context does not affect their preferences in other contexts.

#### 8.3.2 Time Filter Preference Storage

WHEN a user selects a time filter for Top sorting, THE system SHALL store that time filter preference for that feed context.

The next time the user selects Top sorting in the same context, the previously selected time filter should be automatically applied.

#### 8.3.3 Cross-Session Persistence

WHEN an authenticated user logs out and logs back in, THE system SHALL restore all sorting preferences the user had established before logging out.

Sorting preferences are user account data and should persist indefinitely until changed by the user.

#### 8.3.4 Cross-Device Synchronization

WHEN an authenticated user accesses the platform from multiple devices, THE system SHALL synchronize sorting preferences across all devices.

Changing sorting preference on a mobile device should update the preference for desktop and vice versa.

### 8.4 Performance and Responsiveness Expectations

#### 8.4.1 Initial Feed Load Performance

WHEN a user navigates to any feed, THE system SHALL display the sorted feed within 2 seconds under normal load conditions, regardless of which sorting method is active.

Users expect fast, responsive feed loading. Performance must be optimized for all sorting algorithms.

#### 8.4.2 Sorting Method Switch Performance

WHEN a user switches from one sorting method to another, THE system SHALL display the re-sorted feed within 1-2 seconds.

Switching sorting should feel instant. Long delays discourage users from exploring different sorting methods.

#### 8.4.3 Time Filter Switch Performance

WHEN a user switches time filters while Top sorting is active, THE system SHALL display the filtered and re-sorted feed within 1-2 seconds.

Time filter switching should be as fast as sorting method switching.

#### 8.4.4 Smooth Scrolling and Pagination

THE system SHALL support smooth scrolling and pagination within sorted feeds, maintaining sorting order as users scroll through multiple pages or infinite scroll loads more posts.

Users should be able to browse deep into sorted feeds without performance degradation or sorting inconsistencies.

#### 8.4.5 Feed Refresh Performance

WHEN a user refreshes a feed (by pull-to-refresh gesture, clicking refresh, or navigating back), THE system SHALL reload and re-sort the feed within 2 seconds.

Feed refresh should be fast enough to encourage users to check for new content frequently.

### 8.5 Mobile and Responsive Design Considerations

#### 8.5.1 Mobile Sorting Interface

THE system SHALL provide an accessible sorting selector interface on mobile devices that is easy to tap and use with touch input.

Mobile sorting controls should be:
- Large enough for easy tapping (minimum 44x44 pixels touch target)
- Positioned for easy thumb access
- Clear and uncluttered on smaller screens

#### 8.5.2 Responsive Sorting Performance on Mobile

THE system SHALL maintain the same performance expectations for sorting on mobile devices as on desktop.

Mobile users expect fast, responsive sorting even on slower network connections or less powerful devices.

## 9. Functional Requirements (EARS Format)

### 9.1 Hot Sorting Requirements

#### FR-HOT-001: Hot Ranking Calculation
WHEN a user selects "Hot" sorting for any feed, THE system SHALL calculate a hotness score for each post based on vote score and time decay.

#### FR-HOT-002: Hot Ranking Order
WHEN displaying posts with Hot sorting, THE system SHALL order posts by hotness score in descending order, with highest scores first.

#### FR-HOT-003: Vote Score Impact on Hot Ranking
WHEN calculating hotness score, THE system SHALL give significant weight to the post's net vote score (upvotes minus downvotes).

#### FR-HOT-004: Time Decay Application
WHEN calculating hotness score, THE system SHALL apply time-based decay such that older posts gradually decline in ranking even if vote scores remain constant.

#### FR-HOT-005: Vote Velocity Consideration
WHEN calculating hotness score, THE system SHOULD consider the rate at which posts are receiving votes, favoring posts with high vote velocity.

#### FR-HOT-006: Negative Score Handling
WHEN a post has negative net vote score, THE system SHALL rank it lower than posts with positive or neutral scores in hot sorting.

#### FR-HOT-007: Hot Ranking Updates
WHEN new votes are cast on posts, THE system SHALL update hot rankings to reflect new vote data when feeds are refreshed.

#### FR-HOT-008: Hot Sorting Tiebreaker
WHEN multiple posts have identical hotness scores, THE system SHALL use post creation timestamp as tiebreaker, with newer posts ranking higher.

#### FR-HOT-009: Hot Sorting Default
WHEN a user views any feed without having previously selected a sorting preference, THE system SHALL apply "Hot" sorting by default.

### 9.2 New Sorting Requirements

#### FR-NEW-001: New Sorting Chronological Order
WHEN a user selects "New" sorting, THE system SHALL rank posts exclusively by creation timestamp in descending order (newest first).

#### FR-NEW-002: Vote Irrelevance in New Sorting
WHEN calculating New sorting order, THE system SHALL NOT consider vote scores, vote counts, karma, or any voting-related data.

#### FR-NEW-003: Precise Timestamp Ordering
WHEN ordering posts in New sorting, THE system SHALL use precise timestamps including hours, minutes, seconds, and milliseconds to determine exact order.

#### FR-NEW-004: New Post Integration
WHEN new posts are created after a feed is loaded, THE system SHALL insert those posts at the top of New sorting when the feed is refreshed.

#### FR-NEW-005: New Sorting Consistency
WHEN a user refreshes a feed with New sorting active, THE system SHALL maintain consistent ordering for existing posts while adding newly created posts at the top.

### 9.3 Top Sorting Requirements

#### FR-TOP-001: Top Sorting Vote Score Ranking
WHEN a user selects "Top" sorting, THE system SHALL rank posts by net vote score (upvotes minus downvotes) in descending order.

#### FR-TOP-002: No Time Decay in Top Sorting
WHEN calculating Top sorting rankings, THE system SHALL NOT apply time decay to posts.

#### FR-TOP-003: Today Time Filter
WHEN a user selects "Top" sorting with "Today" time filter, THE system SHALL include only posts created within the current calendar day and rank them by vote score.

#### FR-TOP-004: This Week Time Filter
WHEN a user selects "Top" sorting with "This Week" time filter, THE system SHALL include only posts created within the current calendar week and rank them by vote score.

#### FR-TOP-005: This Month Time Filter
WHEN a user selects "Top" sorting with "This Month" time filter, THE system SHALL include only posts created within the current calendar month and rank them by vote score.

#### FR-TOP-006: This Year Time Filter
WHEN a user selects "Top" sorting with "This Year" time filter, THE system SHALL include only posts created within the current calendar year and rank them by vote score.

#### FR-TOP-007: All Time Filter
WHEN a user selects "Top" sorting with "All Time" time filter, THE system SHALL include all posts regardless of creation date and rank them by vote score.

#### FR-TOP-008: Top Sorting Default Time Filter
WHEN a user selects "Top" sorting without having previously selected a time filter, THE system SHALL default to "All Time" time filter.

#### FR-TOP-009: Top Sorting Tiebreaker
WHEN multiple posts have identical net vote scores, THE system SHALL use post creation timestamp as tiebreaker, with newer posts ranking higher.

#### FR-TOP-010: Time Window Recalculation
WHEN a user refreshes a Top-sorted feed after crossing a time boundary (e.g., midnight for "Today" filter), THE system SHALL recalculate the time window and display appropriate posts for the new time period.

#### FR-TOP-011: Top Ranking Vote Updates
WHEN votes are cast on posts after they appear in Top sorting, THE system SHALL reflect updated vote scores when the feed is refreshed.

### 9.4 Controversial Sorting Requirements

#### FR-CON-001: Controversy Score Calculation
WHEN a user selects "Controversial" sorting, THE system SHALL calculate a controversy score for each post based on the balance and volume of upvotes versus downvotes.

#### FR-CON-002: Controversy Ranking Order
WHEN displaying posts with Controversial sorting, THE system SHALL order posts by controversy score in descending order, with most controversial posts first.

#### FR-CON-003: Vote Balance Impact
WHEN calculating controversy score, THE system SHALL favor posts where upvote and downvote counts are nearly equal (close to 50/50 ratio).

#### FR-CON-004: Total Vote Volume Impact
WHEN calculating controversy score, THE system SHALL favor posts with higher total vote counts (upvotes + downvotes) over posts with lower total vote counts, when vote balance is similar.

#### FR-CON-005: Consensus Handling
WHEN posts have highly skewed vote ratios (e.g., 95% upvotes or 95% downvotes), THE system SHALL rank them lower than posts with balanced vote ratios.

#### FR-CON-006: Minimum Vote Threshold
WHEN calculating controversial sorting, THE system MAY establish a minimum total vote threshold that posts must meet to be considered controversial.

#### FR-CON-007: Controversy Ranking Updates
WHEN votes are cast on posts after they appear in Controversial sorting, THE system SHALL recalculate controversy scores and update rankings when the feed is refreshed.

#### FR-CON-008: Controversial Sorting Tiebreaker
WHEN multiple posts have identical controversy scores, THE system SHALL use total vote count as first tiebreaker (more votes = higher rank) and post creation timestamp as second tiebreaker (newer = higher rank).

### 9.5 Sorting Interface Requirements

#### FR-INT-001: Sorting Selector Availability
THE system SHALL display a sorting selector control on all feed pages, including community feeds, personalized home feed, and all communities feed.

#### FR-INT-002: Sorting Options Display
THE system SHALL provide clear labels for each sorting option in the sorting selector: "Hot", "New", "Top", and "Controversial".

#### FR-INT-003: Active Sorting Indication
THE system SHALL visually indicate which sorting method is currently active in the sorting selector.

#### FR-INT-004: Time Filter Selector Display
WHEN "Top" sorting is active, THE system SHALL display a time filter selector with options: Today, This Week, This Month, This Year, and All Time.

#### FR-INT-005: Sorting Change Application
WHEN a user selects a different sorting method, THE system SHALL apply the new sorting and display the re-ranked feed within 1-2 seconds.

#### FR-INT-006: Time Filter Change Application
WHEN a user switches time filters while Top sorting is active, THE system SHALL display the filtered and re-sorted feed within 1-2 seconds.

### 9.6 Sorting Preference Requirements

#### FR-PREF-001: Per-Context Preference Storage
THE system SHALL store sorting preferences independently for each feed context (each community, home feed, all communities feed).

#### FR-PREF-002: Time Filter Preference Storage
WHEN a user selects a time filter for Top sorting, THE system SHALL store that preference for that feed context.

#### FR-PREF-003: Cross-Session Persistence
WHEN an authenticated user logs out and logs back in, THE system SHALL restore all sorting preferences established before logout.

#### FR-PREF-004: Cross-Device Synchronization
WHEN an authenticated user accesses the platform from multiple devices, THE system SHALL synchronize sorting preferences across all devices.

#### FR-PREF-005: Anonymous User Preference Storage
WHEN an anonymous user selects a sorting preference, THE system SHALL store that preference in browser local storage or session storage for the current browsing session.

#### FR-PREF-006: Preference Restoration
WHEN a user returns to a feed where they previously selected a sorting preference, THE system SHALL automatically apply that preferred sorting method.

### 9.7 Performance Requirements

#### FR-PERF-001: Initial Feed Load Performance
WHEN a user navigates to any feed, THE system SHALL display the sorted feed within 2 seconds under normal load conditions.

#### FR-PERF-002: Sorting Switch Performance
WHEN a user switches sorting methods, THE system SHALL display the re-sorted feed within 1-2 seconds.

#### FR-PERF-003: Feed Refresh Performance
WHEN a user refreshes a feed, THE system SHALL reload and re-sort the feed within 2 seconds.

#### FR-PERF-004: Scalability for Large Post Volumes
THE system SHALL efficiently sort and display feeds even in communities with tens of thousands or hundreds of thousands of posts.

#### FR-PERF-005: Mobile Performance Parity
THE system SHALL maintain the same performance expectations for sorting on mobile devices as on desktop devices.

## 10. Business Rules and Constraints

### 10.1 Content Eligibility for Sorting

#### BR-001: All Posts Eligible for All Sorting Methods
THE system SHALL include all posts in all sorting methods, regardless of vote scores, age, or other attributes.

No posts should be excluded from sorting unless they have been deleted, removed by moderators, or hidden by content filters unrelated to sorting.

#### BR-002: Deleted or Removed Posts Exclusion
WHEN posts are deleted by users or removed by moderators, THE system SHALL exclude those posts from all sorting methods and feeds.

Deleted/removed posts should not appear in any sorted feed.

#### BR-003: User-Blocked Content Filtering
WHEN a user has blocked another user or muted a community, THE system SHALL exclude posts from those blocked sources before applying sorting algorithms.

Sorting operates on the filtered set of posts that the user is eligible to see.

### 10.2 Vote Weight Considerations

#### BR-004: All Votes Equal Weight
THE system SHALL treat all votes equally when calculating vote scores for sorting purposes.

A vote from a new user should have the same weight as a vote from a high-karma user. No vote weighting based on voter reputation or karma.

#### BR-005: Vote Validation
THE system SHALL only include validated votes in sorting calculations.

Votes that have been identified as fraudulent, spam, or from banned users should not affect sorting rankings.

### 10.3 Time Zone Handling

#### BR-006: Consistent Internal Time Representation
THE system SHALL use a consistent time zone (UTC recommended) for all internal timestamp storage and sorting calculations.

All post creation timestamps and time-based calculations should use UTC or another consistent time zone to ensure sorting consistency across users in different time zones.

#### BR-007: User-Facing Time Display
THE system SHALL display post creation times and relative timestamps (e.g., "posted 2 hours ago") in the user's local time zone or a user-selected time zone.

While internal calculations use consistent time zone, user-facing displays should be localized for readability.

#### BR-008: Calendar Boundary Calculations
WHEN calculating time windows for Top sorting filters (Today, This Week, This Month, This Year), THE system SHALL use calendar boundaries appropriate to the user's time zone or a platform-standard time zone.

For example, "Today" should mean the current calendar day in the user's time zone, not necessarily UTC day.

### 10.4 Caching and Performance Optimization Requirements

#### BR-009: Sorting Calculation Optimization
THE system MAY use pre-calculated scores, cached rankings, or other performance optimization techniques to achieve the required response times for sorting operations.

While real-time accuracy is important, reasonable caching strategies (e.g., recalculating hot scores every 5 minutes rather than on every request) are acceptable if they maintain good user experience.

#### BR-010: Feed Pagination Consistency
WHEN users paginate through sorted feeds (scrolling through pages or infinite scroll), THE system SHALL maintain consistent sorting within the user's browsing session.

Posts should not jump between pages or disappear due to ranking changes while the user is actively browsing. Ranking updates should apply when the user refreshes or starts a new session.

#### BR-011: Large Community Performance
THE system SHALL implement performance optimizations for sorting in very large communities (those with hundreds of thousands or millions of posts).

Techniques such as limiting the sorting window, using approximate ranking for lower-ranked posts, or other optimization strategies may be employed to maintain required performance.

### 10.5 Sorting Algorithm Evolution

#### BR-012: Algorithm Tuning Flexibility
THE system SHOULD allow for tuning and adjustment of sorting algorithm parameters (e.g., hot sorting time decay rate, controversial balance formulas) without requiring code changes.

Sorting algorithm behavior may need to be adjusted based on platform growth, user feedback, and observed behavior. Configuration-based tuning is preferred over hard-coded values.

#### BR-013: A/B Testing Support
THE system MAY support A/B testing of different sorting algorithm variations to optimize user engagement and satisfaction.

Different users or cohorts may experience different sorting algorithm implementations to determine which performs better.

#### BR-014: Algorithm Transparency
THE system SHOULD provide users with basic understanding of how each sorting method works through tooltips, help text, or documentation.

Users should understand that:
- Hot = trending content balancing popularity and recency
- New = newest content first
- Top = highest-rated content over time periods
- Controversial = content with balanced upvotes and downvotes

### 10.6 Sorting and Moderation Interaction

#### BR-015: Removed Content Exclusion
WHEN posts are removed by moderators, THE system SHALL immediately exclude them from all sorting methods and feeds.

Removed posts should not appear even if they had high rankings before removal.

#### BR-016: Pinned Posts Priority
WHEN community moderators pin posts to the top of a community, THE system MAY display pinned posts above normally sorted posts regardless of sorting method.

Pinned posts override sorting for visibility purposes. The specific behavior of pinned posts relative to sorting should be clearly defined.

#### BR-017: Reported Content Visibility
WHEN posts are reported but not yet removed, THE system SHALL continue to include them in normal sorting.

Reported posts should not be hidden from sorting until moderators take action to remove them.

### 10.7 Special Sorting Scenarios

#### BR-018: Zero-Vote Post Handling
WHEN posts have zero net votes (either no votes at all, or equal upvotes and downvotes), THE system SHALL include them in all sorting methods using appropriate logic:
- Hot sorting: Very low hotness score due to lack of engagement
- New sorting: Position based solely on creation time
- Top sorting: Low ranking due to zero score
- Controversial sorting: May rank highly if they have equal upvotes/downvotes with sufficient volume

#### BR-019: Newly Created Post Handling
WHEN posts are first created, THE system SHALL immediately make them available in New sorting and other sorting methods.

New posts should appear instantly in New sorting (at the top) and in Hot sorting (with appropriate initial hotness score based on age).

#### BR-020: Archived Post Handling
IF the platform implements post archiving (locking old posts from new votes/comments), THE system SHALL continue to include archived posts in all sorting methods using their final vote scores.

Archived posts can still appear in Top sorting for historical periods and should be handled consistently across sorting methods.

---

## Document Summary

This document has defined comprehensive business requirements for the content sorting system of the communityPlatform, covering:

- **Four sorting algorithms** (Hot, New, Top, Controversial) with detailed business logic
- **User interface requirements** for sorting selection and time filter controls
- **Sorting persistence and preferences** across sessions and devices
- **Performance expectations** for all sorting operations
- **Functional requirements** in EARS format for implementation clarity
- **Business rules and constraints** governing sorting behavior

The sorting system is critical to user experience and engagement on the platform. Implementation should prioritize:
1. **Performance**: All sorting operations must be fast and responsive
2. **Consistency**: Sorting behavior should be predictable and reliable
3. **Flexibility**: Users should have full control over how they view content
4. **Scalability**: Sorting must perform well as post volume grows

All technical implementation decisions, including specific algorithms, data structures, caching strategies, database indexing, and performance optimization techniques, are at the discretion of the development team. This document provides the business requirements that the implementation must satisfy from a user and functional perspective.