# Content Sorting and Algorithm Requirements

## Overview

THE platform SHALL provide multiple sorting mechanisms for displaying posts to users, ensuring relevant content surface while accommodating different user preferences and content discovery patterns. THE sorting system SHALL support four primary algorithms: Hot (engagement-based), New (chronological), Top (vote-based), and Controversial (polarization-based).

THE platform SHALL maintain consistent sorting behavior across all communities while allowing community-specific configurations when appropriate. THE sorting algorithms SHALL update in real-time as user interactions (votes, comments, reports) occur and reflect the current state of content engagement.

WHEN a user accesses a community or the platform's main feed, THE system SHALL apply the selected sorting algorithm to determine post visibility and ranking. THE underlying logic SHALL balance content freshness, user engagement, and quality metrics to provide an optimal user experience.

### Business Objectives

THE sorting system SHALL prioritize user engagement while preventing content manipulation and ensuring diverse content representation. THE algorithms SHALL surface high-quality content that encourages meaningful discussions while preventing spam or low-effort posts from dominating feeds.

THE platform SHALL support both algorithm-driven discovery and user-controlled sorting preferences, allowing users to choose their preferred browsing experience. THE default sorting mechanism SHALL optimize for sustained user engagement and community health.

## Hot Algorithm

### Algorithm Overview

WHEN "Hot" sorting is selected, THE system SHALL calculate post ranking based on a combination of engagement velocity, vote score, post age, and community-specific factors. THE algorithm SHALL prioritize content that generates rapid engagement shortly after posting while gradually decreasing visibility as posts age.

THE hot algorithm SHALL consider multiple engagement signals including upvotes, downvotes, comments, awards (if implemented), and user interaction patterns. THE calculation SHALL normalize scores across different communities to ensure fair representation regardless of community size.

### Ranking Factors

THE hot score SHALL incorporate the following weighted factors:
- Vote score differential (upvotes minus downvotes) weighted at 40% of total score
- Comment engagement rate weighted at 25% of total score
- Post age factor using logarithmic decay weighted at 20% of total score
- Community size normalization factor weighted at 10% of total score
- User report penalties (if applicable) weighted at 5% of total score

WHEN calculating vote score impact, THE system SHALL use the net score difference rather than total votes to prevent manipulation through vote brigading. THE algorithm SHALL apply diminishing returns to prevent single high-engagement posts from dominating feeds indefinitely.

### Age Decay Implementation

THE hot algorithm SHALL implement time-based decay to ensure content freshness and prevent old posts from remaining at the top of feeds. THE decay function SHALL use logarithmic scaling where posts lose significant ranking power after 24 hours and minimal impact after 7 days.

THE age calculation SHALL use timestamps rounded to the nearest hour to prevent microsecond-level gaming. Recent posts (less than 2 hours old) SHALL receive a slight boost multiplier, while posts older than 24 hours SHALL have their scores reduced by 50% from the base calculation.

### Community Normalization

THE algorithm SHALL normalize scores across communities of different sizes to prevent large communities from dominating the platform-wide hot feed. THE normalization SHALL consider subscriber count, average daily posts, and typical engagement rates for each community.

WHEN displaying community-specific hot feeds, THE normalization SHALL be less aggressive to reflect the community's internal dynamics while still preventing manipulation through artificial engagement inflation.

## New Sorting

### Chronological Display

WHEN "New" sorting is selected, THE system SHALL display posts in reverse chronological order with the most recently created posts appearing first. THE sort SHALL use the post creation timestamp as the primary sorting key without consideration of engagement metrics.

THE new sorting SHALL provide a level playing field for all content regardless of popularity, allowing users to discover fresh content before it accumulates votes. THE system SHALL display timestamps in a user-friendly format and update the display dynamically as time progresses.

### Handling Multiple Posts

WHEN multiple posts have identical timestamps (to the minute), THE system SHALL use post ID as a secondary sorting mechanism to ensure consistent ordering. THE display SHALL show full timestamp information including date and time in the user's timezone.

THE new sort SHALL respect community-specific posting rate limits and display appropriate messages when rate limits prevent immediate posting. THE system SHALL cache the timestamp of the user's last post to enforce rate limiting rules.

## Top Algorithm

### Vote-Based Ranking

WHEN "Top" sorting is selected, THE system SHALL rank posts primarily by their vote score with the highest-scoring content appearing first. THE algorithm SHALL consider both the net vote difference and the total engagement as ranking factors.

THE top algorithm SHALL provide time-based filters allowing users to view top content from different time periods (past 24 hours, past week, past month, past year, all time). THE time filtering SHALL use UTC timestamps to ensure consistency across time zones.

### Vote Score Calculation

THE top score SHALL be calculated as the difference between upvotes and downvotes. THE algorithm SHALL implement anti-manipulation measures including vote velocity detection and user reputation factors to prevent artificial score inflation.

WHEN posts have identical vote scores, THE system SHALL use secondary factors including comment count, award count (if implemented), and creation timestamp to break ties. THE algorithm SHALL be transparent about the sorting criteria to allow community members to understand content ranking.

### Time Period Options

THE top sorting SHALL support multiple predefined time periods and remember user preferences across sessions. THE time period selection SHALL be clearly displayed with intuitive labels that users can easily understand.

THE platform SHALL maintain separate top rankings for different time periods, updating scores in real-time while pre-calculating period-based aggregations for performance optimization during peak usage.

## Controversial Algorithm

### Identifying Divisive Content

THE controversial algorithm SHALL identify posts that generate significant disagreement by analyzing the distribution of upvotes and downvotes. THE system SHALL flag content with high vote engagement but a relatively even split between positive and negative reactions.

THE algorithm SHALL calculate controversy score using the formula that considers both the total vote count and the ratio of upvotes to downvotes. THE scoring SHALL ensure that posts with 20% to 80% upvote ratio and meaningful vote totals are considered controversial.

### Controversy Thresholds

THE system SHALL establish minimum thresholds for controversial content including minimum total votes (10 votes), minimum engagement velocity, and maximum score differential (preventing extremely negative content from being labeled controversial).

THE controversy score SHALL decay over time with a half-life of 48 hours, ensuring that controversial content gradually moves down in rankings as the community moves on from divisive discussions. THE algorithm SHALL suppress known troll accounts or banned users from affecting controversy calculations.

### Display Considerations

THE controversial sort SHALL include user warnings about potentially divisive content and allow users to disable controversial sorting if they prefer to avoid potentially upsetting content. THE display SHALL clearly indicate why content is flagged as controversial.

THE system SHALL not use controversial sorting as a default algorithm but shall make it easily accessible for users who find value in engaging with divisive topics. THE algorithm SHALL be periodically reviewed to ensure it doesn't inadvertently promote harmful content.

## User Preferences

### Preference Management

THE platform SHALL allow users to set their preferred default sorting method for both community-specific feeds and the platform-wide feed. THE system SHALL persist sorting preferences across sessions and devices when users are authenticated.

WHEN users change their sorting preference, THE system SHALL immediately update the displayed content and save the preference for future sessions. THE preference system SHALL support separate defaults for different content types (communities, user profiles, searches) when appropriate.

### Sorting Preference Options

THE platform SHALL provide clear and accessible controls for changing sorting methods with intuitive labels that explain the purpose of each sorting type. THE interface SHALL make it easy to temporarily change sorting without affecting default preferences.

THE preference system SHALL handle edge cases including deleted or renamed sorting methods by gracefully falling back to alternative options while notifying users of the change through appropriate messaging.

### Accessibility Considerations

THE sorting controls SHALL be keyboard accessible and screen reader compatible with proper ARIA labels and roles. THE system SHALL provide alternative text descriptions for sorting icons and clear focus indicators for keyboard navigation.

THE sorting preference system SHALL respect user accessibility settings including high contrast mode, large text, and motion sensitivity preferences. THE platform shall test sorting interfaces with assistive technologies to ensure usability.

## Default Sorting

### Platform Defaults

THE platform's default sorting method SHALL be "Hot" for the main feed and community pages to optimize for engagement and user retention. THE default SHALL be configurable by platform administrators to respond to changing community needs or business objectives.

WHEN no user preference is set, THE system SHALL use the platform default with the ability for communities to set their own default sorting when appropriate. THE default selection SHALL consider user acquisition, retention, and community health metrics.

### Community-Specific Defaults

Community moderators SHALL have the ability to set default sorting for their community within reasonable parameters defined by the platform. THE community default SHALL apply to visitors who have not expressed a preference and shall not override logged-in users' explicit preferences.

THE community default setting SHALL require clear communication to community members about the change and provide mechanisms for feedback. The platform SHALL monitor the impact of community-specific defaults on user engagement and satisfaction.

### Fallback Behaviors

WHEN sorting algorithm calculations fail or become unavailable, THE system SHALL fall back to chronological sorting with appropriate error handling and user notification. THE fallback mechanism SHALL maintain user experience consistency while alerting administrators to technical issues.

THE sorting system SHALL implement graceful degradation ensuring that if advanced algorithms are unavailable, basic sorting by time or votes remains functional. THE platform SHALL log sorting failures for debugging while maintaining user experience continuity.

### Performance Requirements

THE sorting algorithms SHALL deliver results within 200 milliseconds for standard queries and 500 milliseconds for complex multi-criteria sorting. THE system SHALL implement caching at multiple levels (algorithm calculations, user preferences, community defaults) to maintain performance during peak usage periods.

THE platform SHALL use pre-calculated indices for hot and top sorting algorithms, updating these indices every 5 minutes or when significant engagement events occur. THE system SHALL monitor sorting performance metrics and automatically scale resources to maintain response time requirements.