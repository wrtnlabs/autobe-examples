# Content Sorting Algorithms Requirements

## Introduction

This document defines the business requirements for content sorting algorithms on the Reddit-like community platform. Sorting mechanisms are critical for content discovery, user engagement, and ensuring that valuable content surfaces to users at the right time. The platform implements four primary sorting methods: Hot, New, Top, and Controversial, each serving distinct user needs and content discovery patterns.

This document specifies the behavioral requirements, business logic, and user experience expectations for each sorting algorithm. All requirements are written from a business and user perspective, focusing on what the system should achieve rather than technical implementation details.

## Sorting Algorithm Overview

### Purpose and User Value

Content sorting algorithms serve multiple critical purposes:

- **Content Discovery**: Enable users to find relevant and engaging content quickly
- **Timely Information**: Surface fresh content while balancing quality and recency
- **Quality Recognition**: Reward high-quality contributions with visibility
- **Diverse Perspectives**: Allow users to explore different content ranking approaches
- **User Control**: Empower users to choose how they consume community content

### Sorting Methods Summary

The platform provides four distinct sorting methods:

1. **Hot**: Surfaces trending posts that are gaining traction recently, balancing recency with engagement
2. **New**: Displays posts in reverse chronological order, showing the most recently created content first
3. **Top**: Ranks posts by total score (upvotes minus downvotes) within specified time periods
4. **Controversial**: Highlights posts with significant debate, having substantial both upvotes and downvotes

### Context and Applicability

Sorting algorithms apply to:

- Community feeds (posts within a specific community)
- Homepage feed (posts from subscribed communities)
- Global "All" feed (posts from all public communities)
- User profile post listings

Each context uses the same sorting logic but operates on different content sets.

## Hot Sorting Algorithm Requirements

### Business Objective

The Hot sorting algorithm identifies and surfaces posts that are currently trending and generating engagement. It balances two competing factors: how much engagement a post has received (votes) and how recent that engagement is. This ensures the feed stays fresh while promoting quality content.

### Core Hot Sorting Behavior

**THE system SHALL rank posts using a hot score that combines total vote score and post age.**

**WHEN calculating hot score, THE system SHALL give higher weight to recent posts compared to older posts with similar vote counts.**

**WHEN two posts have identical vote scores, THE system SHALL rank the more recent post higher.**

**THE system SHALL decay the influence of older posts over time, ensuring content older than 24-48 hours gradually moves down in hot rankings even with high scores.**

### Hot Score Calculation Principles

**THE hot score SHALL increase when a post receives upvotes.**

**THE hot score SHALL decrease when a post receives downvotes.**

**THE hot score SHALL naturally decrease as time passes since post creation, independent of voting activity.**

**WHEN a post is newly created (less than 1 hour old), THE system SHALL provide a recency boost to give it initial visibility.**

### Time Decay Behavior

**THE system SHALL apply time decay using the post's creation timestamp as the reference point.**

**WHEN a post reaches 12 hours old, THE system SHALL begin noticeable decay in its hot score.**

**WHEN a post reaches 24 hours old, THE system SHALL apply significant decay, requiring substantially more votes to maintain position.**

**WHEN a post reaches 48 hours or older, THE system SHALL heavily decay the hot score, making it difficult to compete with recent content.**

### Vote Momentum Considerations

**WHEN a post receives multiple upvotes in a short time period (within 1 hour), THE system SHALL interpret this as strong positive momentum.**

**WHEN a post receives votes shortly after creation, THE system SHALL weight these votes more favorably than votes on older posts.**

**THE system SHALL NOT give special weight to votes based on the voter's karma score or account age.**

### Edge Cases and Special Scenarios

**WHEN a post has a negative total score (more downvotes than upvotes), THE system SHALL still calculate a hot score but rank it below all positive-scoring posts.**

**WHEN a post receives no votes within the first hour, THE system SHALL gradually reduce its initial recency boost.**

**IF a community has very low posting volume (fewer than 5 posts per day), THE system SHALL extend the time decay period to ensure content remains visible longer.**

**WHEN a post is edited, THE system SHALL NOT reset or modify its hot score or creation timestamp.**

### Hot Sorting Display Order

**THE system SHALL display posts sorted by hot score in descending order (highest hot score first).**

**WHEN multiple posts have identical hot scores, THE system SHALL use post creation time as a tiebreaker, with newer posts first.**

**THE system SHALL recalculate hot scores in real-time or near-real-time to reflect new votes and time passage.**

### Performance Expectations

**WHEN a user selects hot sorting, THE feed SHALL load and display results instantly (perceived as immediate response).**

**WHEN a user refreshes a hot-sorted feed, THE system SHALL reflect vote changes and new posts that occurred since the last load.**

**THE system SHALL support smooth pagination through hot-sorted content without jarring ranking changes between pages.**

## New Sorting (Chronological) Requirements

### Business Objective

The New sorting method displays posts in reverse chronological order based on creation time. This allows users to see the absolute latest content in their communities, regardless of engagement levels. It's essential for time-sensitive information and for giving all new posts initial visibility.

### Core New Sorting Behavior

**THE system SHALL sort posts by creation timestamp in descending order (newest first).**

**WHEN displaying new-sorted content, THE system SHALL show the most recently created post at the top of the feed.**

**THE new sorting method SHALL completely ignore vote counts, scores, and karma when determining order.**

**THE new sorting method SHALL completely ignore post type (text, link, or image) when determining order.**

### Timestamp Reference

**THE system SHALL use the post's original creation timestamp as the sole ranking factor.**

**WHEN a post is edited, THE system SHALL NOT update or modify the creation timestamp.**

**THE system SHALL store creation timestamps with precision to seconds to ensure accurate chronological ordering.**

### Tiebreaking for Simultaneous Posts

**WHEN multiple posts have identical creation timestamps (same second), THE system SHALL use the post's unique identifier as a consistent tiebreaker.**

**THE tiebreaking order SHALL remain stable across multiple page loads and user sessions.**

### New Sorting Display Order

**THE system SHALL display posts with the most recent creation time first.**

**WHEN a user views a new-sorted feed, THE system SHALL present an unambiguous chronological sequence.**

**IF a user refreshes the feed, THE system SHALL show any new posts created since the last load at the top.**

### Context-Specific Behavior

**WHEN viewing a community feed with new sorting, THE system SHALL show only posts from that community in chronological order.**

**WHEN viewing the homepage with new sorting, THE system SHALL show posts from all subscribed communities in chronological order.**

**WHEN viewing the global feed with new sorting, THE system SHALL show posts from all public communities in chronological order.**

### Performance Expectations

**WHEN a user selects new sorting, THE feed SHALL load and display results instantly.**

**THE system SHALL efficiently handle communities with high posting volume (100+ posts per hour) without performance degradation.**

**WHEN paginating through new-sorted content, THE system SHALL maintain consistent ordering even as new posts are created.**

### Edge Cases

**WHEN a post is deleted or removed, THE system SHALL immediately exclude it from new-sorted feeds.**

**WHEN viewing new-sorted content as a guest user, THE system SHALL show the same chronological order as authenticated members would see.**

**IF system clocks are temporarily incorrect during post creation, THE system SHALL still maintain consistent ordering based on recorded timestamps.**

## Top Sorting with Time Filters Requirements

### Business Objective

The Top sorting method ranks posts by their total score (upvotes minus downvotes) within specified time windows. This allows users to discover the highest-quality or most popular content from different time periods, from the past hour to all time.

### Core Top Sorting Behavior

**THE system SHALL sort posts by total score in descending order (highest score first).**

**THE total score SHALL be calculated as the number of upvotes minus the number of downvotes.**

**WHEN calculating top ranking, THE system SHALL NOT apply any time decay or recency weighting.**

**THE top sorting method SHALL purely rank by score within the selected time filter.**

### Time Filter Options

**THE system SHALL provide the following time filter options for top sorting:**
- **Now/Past Hour**: Posts created within the last 60 minutes
- **Today**: Posts created within the last 24 hours
- **This Week**: Posts created within the last 7 days
- **This Month**: Posts created within the last 30 days
- **This Year**: Posts created within the last 365 days
- **All Time**: All posts regardless of age

**WHEN a user selects a time filter, THE system SHALL only include posts created within that time window.**

**THE system SHALL calculate time windows based on the current moment when the feed is loaded.**

### Time Window Calculation

**WHEN applying the "Past Hour" filter, THE system SHALL include posts created from exactly 60 minutes ago until now.**

**WHEN applying the "Today" filter, THE system SHALL include posts created from exactly 24 hours ago until now.**

**WHEN applying the "This Week" filter, THE system SHALL include posts created from exactly 7 days (168 hours) ago until now.**

**WHEN applying the "This Month" filter, THE system SHALL include posts created from exactly 30 days ago until now.**

**WHEN applying the "This Year" filter, THE system SHALL include posts created from exactly 365 days ago until now.**

**WHEN applying the "All Time" filter, THE system SHALL include all posts regardless of creation date.**

### Score Calculation for Top Sorting

**THE system SHALL calculate score as: (number of upvotes) - (number of downvotes).**

**WHEN a post has 100 upvotes and 20 downvotes, THE system SHALL calculate a score of 80.**

**WHEN a post has equal upvotes and downvotes, THE system SHALL calculate a score of 0.**

**WHEN a post has more downvotes than upvotes, THE system SHALL calculate a negative score.**

**THE system SHALL include posts with zero or negative scores in top-sorted feeds, ranked below all positive-scoring posts.**

### Display Order and Tiebreaking

**THE system SHALL display posts in descending order by total score (highest score first).**

**WHEN multiple posts have identical scores, THE system SHALL use creation timestamp as a tiebreaker, with newer posts first.**

**WHEN multiple posts have identical scores and timestamps, THEN system SHALL use the post's unique identifier as a final tiebreaker.**

### Default Time Filter

**WHEN a user first accesses top sorting without specifying a time filter, THE system SHALL default to "Today" (past 24 hours).**

**THE system SHALL remember a user's last-selected time filter preference for top sorting during their session.**

**WHEN a user's session ends and they return, THE system SHALL default back to "Today" unless user preferences specify otherwise.**

### Time Filter Persistence

**WHEN an authenticated member selects a time filter, THE system SHALL remember this preference for the current session.**

**WHEN a user navigates between different communities while using top sorting, THE system SHALL maintain the selected time filter.**

**WHEN a user switches to a different sorting method and then returns to top sorting, THE system SHALL restore their previously selected time filter.**

### Edge Cases and Special Scenarios

**WHEN viewing top posts for "Past Hour" in a low-activity community, THE system SHALL show only posts from that period even if the result is empty or contains few posts.**

**WHEN a post's votes change while a user is viewing a top-sorted feed, THE system SHALL NOT automatically reorder the feed until the user refreshes.**

**WHEN a post crosses the time boundary (e.g., moves from "Today" to "This Week" category), THE system SHALL reflect this change on next feed load.**

**IF a community has no posts within the selected time filter, THE system SHALL display an empty feed with appropriate messaging.**

### Performance Expectations

**WHEN a user selects top sorting with any time filter, THE feed SHALL load and display results instantly.**

**WHEN a user switches between time filters, THE system SHALL update the feed instantly without full page reload.**

**THE system SHALL efficiently calculate scores for high-volume communities with thousands of posts.**

## Controversial Sorting Requirements

### Business Objective

The Controversial sorting method surfaces posts that have generated significant debate and divided opinion. These are posts that have received substantial numbers of both upvotes and downvotes, indicating disagreement or polarized responses from the community.

### Core Controversial Sorting Behavior

**THE system SHALL identify controversial posts based on the balance between upvotes and downvotes.**

**WHEN a post has similar numbers of upvotes and downvotes with high total vote volume, THE system SHALL rank it as highly controversial.**

**WHEN a post has unanimous voting (all upvotes or all downvotes), THE system SHALL NOT rank it as controversial regardless of vote count.**

**THE controversial sorting method SHALL favor posts with more total votes over posts with fewer votes, when controversy levels are similar.**

### Controversy Score Calculation Principles

**THE system SHALL consider a post more controversial when the ratio of upvotes to downvotes approaches 1:1.**

**THE system SHALL consider a post more controversial when the total vote count is high.**

**WHEN a post has 100 upvotes and 95 downvotes, THE system SHALL rank it as highly controversial.**

**WHEN a post has 10 upvotes and 9 downvotes, THE system SHALL rank it as less controversial than the previous example due to lower total engagement.**

**WHEN a post has 1000 upvotes and 50 downvotes, THE system SHALL rank it as low controversy due to clear majority opinion.**

### Controversy Detection Rules

**A post SHALL be considered controversial WHEN it has received at least 10 total votes (upvotes plus downvotes).**

**A post SHALL achieve maximum controversy score WHEN the upvote percentage is close to 50% (equal upvotes and downvotes).**

**A post SHALL achieve minimum controversy score WHEN upvotes or downvotes dominate overwhelmingly (90% or more in one direction).**

**THE controversy score SHALL increase with total vote volume, rewarding posts with more community engagement.**

### Display Order

**THE system SHALL display posts sorted by controversy score in descending order (most controversial first).**

**WHEN multiple posts have identical controversy scores, THE system SHALL use total vote count as a tiebreaker, with higher vote counts first.**

**WHEN multiple posts have identical controversy scores and vote counts, THE system SHALL use creation timestamp as a final tiebreaker, with newer posts first.**

### Time Considerations

**THE controversial sorting method SHALL consider all posts regardless of age by default.**

**THE system MAY optionally support time filters for controversial sorting (similar to top sorting), showing controversial posts within specific time periods.**

**IF time filters are supported, THE system SHALL use the same time windows as top sorting (hour, day, week, month, year, all time).**

### Minimum Engagement Threshold

**THE system SHALL NOT display posts in controversial sorting if they have fewer than 10 total votes.**

**WHEN a post has fewer than 10 votes, THE system SHALL exclude it from controversial feeds even if the vote ratio is close to 50/50.**

**THE minimum vote threshold SHALL prevent low-engagement posts from dominating controversial feeds.**

### Edge Cases and Special Scenarios

**WHEN a post has exactly 0 votes (no upvotes or downvotes), THE system SHALL exclude it from controversial sorting.**

**WHEN a post has only upvotes and no downvotes, THE system SHALL rank it with minimal controversy score.**

**WHEN a post has only downvotes and no upvotes, THE system SHALL rank it with minimal controversy score.**

**WHEN voting patterns change over time, THE system SHALL update controversy scores to reflect current vote distribution.**

**IF a community has no posts meeting the controversy criteria, THE system SHALL display an empty feed with appropriate messaging.**

### Controversy Score Examples

To clarify the business logic, here are example scenarios:

- **Highly Controversial**: Post with 500 upvotes and 480 downvotes (49% upvote ratio, 980 total votes)
- **Moderately Controversial**: Post with 200 upvotes and 150 downvotes (57% upvote ratio, 350 total votes)
- **Low Controversy**: Post with 1000 upvotes and 100 downvotes (91% upvote ratio, 1100 total votes)
- **Not Controversial**: Post with 5 upvotes and 4 downvotes (too few total votes, below 10-vote threshold)

### Performance Expectations

**WHEN a user selects controversial sorting, THE feed SHALL load and display results instantly.**

**THE system SHALL efficiently calculate controversy scores for all posts in the selected context.**

**WHEN vote counts change, THE system SHALL recalculate controversy scores to reflect updated data on next feed load.**

## Default Sorting Behavior

### Purpose of Default Sorting

Default sorting ensures users have a predictable, optimized initial experience when viewing content. Different contexts benefit from different default sorting methods based on user intent and content discovery patterns.

### Default Sorting by Context

**WHEN a guest user visits the global "All" feed, THE system SHALL default to hot sorting.**

**WHEN an authenticated member visits their homepage feed, THE system SHALL default to hot sorting.**

**WHEN a user visits a specific community feed for the first time, THE system SHALL default to hot sorting.**

**WHEN a user visits their own profile to view their posts, THE system SHALL default to new sorting (most recent first).**

**WHEN a user visits another user's profile to view their posts, THE system SHALL default to top sorting with "All Time" filter.**

### Default Sorting Persistence

**WHEN a user explicitly changes the sorting method on a feed, THE system SHALL remember this preference for the current session.**

**WHEN a user navigates away from a feed and returns within the same session, THE system SHALL restore their previously selected sorting method.**

**WHEN a user's session ends and they return in a new session, THE system SHALL revert to default sorting unless user-level preferences override this.**

### User Preference Override

**WHERE a user has set a preferred default sorting method in their account settings, THE system SHALL use that preference instead of system defaults.**

**THE user SHALL be able to set different default sorting preferences for different contexts (homepage, communities, profiles).**

**WHEN a user sets a default preference, THE system SHALL apply it across all sessions until the user changes it.**

### Context-Specific Default Behavior

**WHEN viewing a community focused on breaking news or time-sensitive content, THE system MAY allow community moderators to set the community's default sorting to "New".**

**WHEN viewing archived or historical communities, THE system MAY default to top sorting with longer time filters.**

**THE system SHALL clearly indicate which sorting method is currently active through visual highlighting or labels.**

### Guest User vs Authenticated Member Defaults

**WHEN a guest user accesses any feed, THE system SHALL always use hot sorting as default.**

**WHEN an authenticated member accesses feeds, THE system SHALL respect their saved preferences if they exist.**

**IF an authenticated member has no saved preferences, THE system SHALL use the same defaults as guest users.**

## User Sorting Preferences

### Preference Management

**Authenticated members SHALL be able to save their preferred default sorting method for different feed contexts.**

**THE system SHALL provide sorting preference options in user account settings.**

**WHEN a member saves a sorting preference, THE system SHALL apply it immediately to all applicable feeds.**

### Available Preference Options

**Members SHALL be able to set default sorting for:**
- Homepage feed (subscribed communities)
- Global "All" feed
- Individual community feeds
- Their own profile

**FOR each context, members SHALL be able to choose from:**
- Hot
- New
- Top (with default time filter)
- Controversial

**WHEN setting top sorting as a default, members SHALL also be able to specify their preferred time filter.**

### Preference Scope

**Sorting preferences SHALL be user-specific and SHALL NOT affect other users' experiences.**

**WHEN a member changes their sorting preference, THE system SHALL NOT change the preferences of other community members.**

**Community moderators SHALL NOT be able to force a specific sorting method on individual users.**

### Temporary Sorting Overrides

**WHEN a member manually changes sorting on a specific feed, THE system SHALL treat this as a temporary session-level override.**

**THE temporary override SHALL persist for that specific feed during the current session.**

**WHEN the session ends, THE system SHALL revert to the user's saved default preference on next visit.**

**WHEN a user visits a different feed or community, THE system SHALL apply the appropriate default preference for that context, not the temporary override from another feed.**

### Preference Reset

**Members SHALL be able to reset their sorting preferences to system defaults at any time.**

**WHEN a member resets preferences, THE system SHALL immediately revert all feeds to use system default sorting behavior.**

## Performance and User Experience Requirements

### Load Time Expectations

**WHEN a user selects any sorting method, THE system SHALL display results instantly from the user's perspective.**

**"Instantly" SHALL mean perceived loading time of less than 1 second under normal network conditions.**

**WHEN switching between sorting methods on the same feed, THE system SHALL update the view instantly without full page reload.**

**WHEN paginating through sorted content, THE system SHALL load the next page instantly.**

### Real-Time Updates

**WHEN viewing hot-sorted content, THE system SHALL reflect vote changes and new posts on feed refresh.**

**THE system SHALL NOT automatically reorder feeds while users are actively viewing them.**

**WHEN a user manually refreshes a feed, THE system SHALL recalculate all sorting scores based on current data.**

**THE system SHALL provide a manual refresh mechanism for users to update their feed on demand.**

### Consistency Across Devices

**WHEN a member switches devices mid-session, THE system SHALL maintain their sorting preferences.**

**WHEN a member uses multiple devices simultaneously, THE system SHALL show consistent sorting results based on the same underlying data.**

**Sorting preferences SHALL sync across all devices for authenticated members.**

### Pagination Behavior

**THE system SHALL maintain stable pagination when users navigate through sorted feeds.**

**WHEN a user moves to page 2 of a sorted feed and then returns to page 1, THE system SHALL show the same content unless data has materially changed.**

**THE system SHALL use appropriate pagination techniques to prevent duplicate or missing posts when scrolling through large sorted feeds.**

### High-Volume Performance

**WHEN a community has thousands of posts, THE system SHALL calculate sorting scores efficiently without user-perceivable delays.**

**WHEN the global feed includes posts from hundreds of communities, THE system SHALL still deliver instant sorting results.**

**THE system SHALL handle voting activity spikes (e.g., 100+ votes on a single post within minutes) without performance degradation.**

### Error Handling and Degradation

**IF sorting calculation encounters errors, THE system SHALL fall back to new (chronological) sorting and notify users of temporary issues.**

**IF a specific sorting method is temporarily unavailable, THE system SHALL offer alternative sorting methods and explain the situation.**

**THE system SHALL never display a completely broken or empty feed due to sorting algorithm failures.**

## Sorting Interaction Rules

### Sorting and Voting Integration

**WHEN a member upvotes a post, THE system SHALL immediately update that post's score for future sorting calculations.**

**WHEN a member changes their vote (upvote to downvote or vice versa), THE system SHALL recalculate the post's score accordingly.**

**WHEN a member removes their vote, THE system SHALL adjust the post's score to reflect the vote removal.**

**THE system SHALL NOT immediately reorder a feed that a user is actively viewing, even when votes change.**

### Sorting and Post Lifecycle

**WHEN a post is deleted by its author, THE system SHALL immediately remove it from all sorted feeds.**

**WHEN a post is removed by a moderator, THE system SHALL immediately exclude it from all sorted feeds.**

**WHEN a post is edited, THE system SHALL NOT reset any timestamps or scores that affect sorting.**

**WHEN a post is restored after deletion, THE system SHALL reintegrate it into sorted feeds at its appropriate position.**

### Sorting Across Communities

**WHEN viewing the homepage with posts from multiple subscribed communities, THE system SHALL apply the selected sorting algorithm across all posts uniformly.**

**THE system SHALL NOT give preference to posts from specific communities when sorting, unless the user has explicitly configured community priorities.**

**WHEN viewing the global "All" feed, THE system SHALL treat all public communities equally in sorting calculations.**

### Sorting and Content Types

**THE sorting algorithms SHALL apply uniformly to all post types (text, link, image).**

**THE system SHALL NOT favor or penalize specific post types in sorting calculations.**

**WHEN calculating scores and rankings, THE system SHALL only consider votes and timestamps, not content type.**

### Sorting Transparency

**THE system SHALL clearly display which sorting method is currently active through visual indicators.**

**THE system SHALL make it obvious to users how to change the sorting method.**

**WHERE appropriate, THE system MAY show metadata that helps users understand sorting (e.g., post age, vote count, score).**

## Edge Cases and Special Scenarios

### New Communities and Low Activity

**WHEN a community has fewer than 10 posts total, THE system SHALL still apply all sorting algorithms but results may appear similar across methods.**

**WHEN a community receives no new posts for extended periods (weeks or months), THE hot sorting SHALL gradually show older content to prevent empty feeds.**

**IF a community has zero posts, THE system SHALL display an appropriate empty state message regardless of selected sorting.**

### Tied Rankings

**WHEN multiple posts have identical scores across all tiebreaking criteria, THE system SHALL maintain a consistent ordering based on post identifiers.**

**THE system SHALL ensure that repeated page loads show the same ordering for tied posts to prevent confusing user experiences.**

### Rapid Voting Activity

**WHEN a post receives 50+ votes within a 5-minute period, THE system SHALL immediately recognize this as high engagement for hot sorting purposes.**

**THE system SHALL handle vote brigading or unusual voting patterns gracefully without breaking sorting functionality.**

**WHEN vote manipulation is detected and votes are removed, THE system SHALL recalculate sorting positions accordingly.**

### Time Zone Considerations

**THE system SHALL calculate all timestamps in UTC for consistency across global users.**

**WHEN displaying "Today" or other time-based filters, THE system SHALL calculate relative to the current UTC time.**

**THE system SHALL ensure users in different time zones see consistent sorting results based on UTC calculations.**

### Deleted or Removed Content

**WHEN a user views a sorted feed and then a post is removed, the next refresh SHALL exclude that post.**

**THE system SHALL not show gaps or placeholders for removed content in sorted feeds.**

**IF a highly-ranked post is removed, THE system SHALL promote the next post in the sorted order.**

### Private and Restricted Communities

**WHEN sorting posts in private communities, THE system SHALL only include posts visible to the current user based on their access permissions.**

**WHEN a community becomes private, THE system SHALL immediately exclude its posts from global sorted feeds for users without access.**

**Community-level sorting SHALL respect all access control rules established for that community.**

### User Blocks and Filters

**IF a user has blocked specific users, THE system SHALL exclude blocked users' posts from all sorted feeds for that user.**

**User-level content filtering SHALL apply before sorting calculations, ensuring unwanted content never appears regardless of sorting method.**

### Archived Posts

**IF the platform implements post archiving (locking old posts), archived posts SHALL still appear in sorted feeds based on their scores and timestamps.**

**THE sorting algorithms SHALL NOT treat archived posts differently from active posts.**

### System Maintenance and Data Migration

**DURING system maintenance, IF sorting functionality is temporarily degraded, THE system SHALL fall back to chronological (new) sorting.**

**WHEN migrating historical data, THE system SHALL preserve accurate creation timestamps to maintain sorting integrity.**

**IF vote data is recalculated or corrected, THE system SHALL update sorting positions to reflect the corrected data.**

## Related Business Rules

### Interaction with Karma System

**THE sorting algorithms SHALL use raw vote counts (upvotes and downvotes), not karma scores, for ranking calculations.**

**User karma SHALL NOT influence how posts are sorted or ranked.**

**High-karma users' posts SHALL NOT receive preferential sorting treatment.**

### Interaction with Community Rules

**Community moderators SHALL NOT be able to manipulate sorting algorithms to favor or suppress specific posts.**

**All posts in a community SHALL compete equally in sorting algorithms based solely on votes and timestamps.**

**Moderator actions (pinning posts) MAY override sorting for pinned posts, but SHALL NOT affect the sorting of non-pinned posts.**

### Sorting and Algorithmic Fairness

**THE sorting algorithms SHALL apply the same rules to all posts regardless of author, community size, or content type.**

**THE system SHALL NOT use machine learning or opaque algorithms that could introduce bias into content ranking.**

**All sorting logic SHALL be deterministic and explainable based on clear business rules defined in this document.**

### Future Extensibility

**THE system architecture SHALL support adding new sorting methods in the future without disrupting existing sorting functionality.**

**IF new sorting methods are added, THE system SHALL preserve all existing sorting methods and user preferences.**

**New sorting methods SHALL be documented with the same level of detail as the methods defined in this document.**

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-14  
**Related Documents**:
- [Voting and Karma System Requirements](./05-voting-karma-system.md)
- [Content Feeds and Discovery Requirements](./08-content-feeds-discovery.md)
- [User Actors and Authentication Requirements](./02-user-actors-authentication.md)
- [Content Creation and Posts Requirements](./04-content-creation-posts.md)