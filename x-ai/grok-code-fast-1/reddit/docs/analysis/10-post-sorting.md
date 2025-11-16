# Post Sorting Requirements

## Purpose
This document specifies the business requirements for sorting posts within the Reddit-like community platform. It defines the algorithms and rules for organizing content by hot, new, top, and controversial criteria to enhance user engagement and content discovery. The specifications focus on the logical behavior and performance expectations from a user experience perspective, ensuring posts are ranked effectively to surface the most relevant and intriguing content.

## Table of Contents
- [Sorting Algorithms Overview](#sorting-algorithms-overview)
- [Hot Sort Formula](#hot-sort-formula)
- [New Sort Logic](#new-sort-logic)
- [Top Sort Rules](#top-sort-rules)
- [Controversial Sort Calculation](#controversial-sort-calculation)
- [Performance Requirements](#performance-requirements)
- [Business Rules for Sorting](#business-rules-for-sorting)
- [User Scenarios](#user-scenarios)

## Sorting Algorithms Overview
The platform supports multiple sorting methods to cater to different user preferences and content discovery needs. Each sorting algorithm determines the order in which posts are displayed within communities and user feeds. The sorting affects how users perceive content value and engagement, directly impacting community health and user retention.

THE system SHALL provide four sorting options for posts: hot, new, top, and controversial. WHEN a user selects a sorting option, THE system SHALL order posts according to the respective algorithm instantly.

Users can view posts sorted differently depending on their interests—hot for trending discussions, new for latest updates, top for highest-quality content, and controversial for balanced debates.

## Hot Sort Formula
Hot sorting prioritizes posts that are currently popular and actively generating discussion, creating a dynamic feed that reflects real-time community interest.

THE hot sort algorithm SHALL calculate a score for each post based on upvotes, downvotes, and time decay. WHEN calculating the hot score, THE system SHALL use the formula: score = (upvotes - downvotes) / (hours_since_post + 2)^1.5, where hours_since_post is the time elapsed in hours. THE system SHALL display posts in descending order of hot score, with higher scores appearing first.

For example, a post with 100 upvotes and 10 downvotes posted 1 hour ago would have a hot score of approximately 61.04, while the same post posted 24 hours ago would have a lower score of about 1.05. IF two posts have identical hot scores, THEN THE system SHALL break ties by displaying the post with the more recent timestamp first.

The formula ensures that newly popular posts rank higher than older ones with similar engagement, maintaining feed freshness.

## New Sort Logic
New sorting presents posts in chronological order to highlight the most recent additions to the community.

THE new sort SHALL order posts by their creation timestamp, with the most recently created posts appearing first. WHEN a user selects new sort, THE system SHALL display posts in descending chronological order based on when they were posted.

No complex calculations are involved; it's purely temporal. IF two posts were created at the exact same timestamp (unlikely in practice), THEN THE system SHALL break the tie by displaying the post with the more recent creation timestamp first.

This sorting helps users stay updated with the latest developments in subscribed communities.

## Top Sort Rules
Top sorting emphasizes quality and consensus by prioritizing posts with the highest net positive feedback over time.

THE top sort SHALL calculate a score using net upvotes (upvotes minus downvotes) and rank posts in descending order of this score. WHEN determining top posts, THE system SHALL consider the total positive votes regardless of time decay, focusing on enduring quality.

For instance, a post with 500 upvotes and 50 downvotes has a top score of 450, appearing higher than a post with 200 upvotes and 10 downvotes (190 score). IF two posts have the same top score, THEN THE system SHALL break the tie by displaying the post with the more recent creation timestamp first.

This method rewards consistently well-received content, encouraging thoughtful contributions.

## Controversial Sort Calculation
Controversial sorting highlights posts that generate passionate but balanced discussions, where both positive and negative opinions are strongly represented.

THE controversial sort algorithm SHALL calculate a score using the ratio of upvote-to-downvote ratio while considering total engagement. WHEN computing the controversial score, THE system SHALL use the formula: score = (upvotes + downvotes) / (abs(upvotes - downvotes) + 1), normalized by time to prevent gaming. THE system SHALL display posts in descending order of controversial score, bringing attention to divisive topics.

A post with 100 upvotes and 90 downvotes (ratio close to 1) would score higher on controversial than one with 200 upvotes and 5 downvotes (ratio heavily skewed). However, to incorporate balance, the denominator includes absolute difference plus one. IF controversial scores are tied, THEN THE system SHALL break ties by displaying the post with higher total votes first.

For example, with upvotes U and downvotes D: score = (U + D) / (|U - D| + 1). This ensures posts with roughly equal up and down votes rank highly.

The algorithm amplifies contentious yet engaging content, fostering diverse discourse.

## Performance Requirements
Sorting operations must be efficient to maintain a responsive user experience, especially with large volumes of posts in active communities.

WHEN a user requests a sorted list of posts, THE system SHALL return results within 500 milliseconds for feeds with up to 1,000 posts. THE system SHALL optimize sorting algorithms to handle up to 10,000 concurrent requests per minute without degrading performance. IF sorting involves complex calculations, THEN THE system SHALL cache intermediate results for frequently accessed posts to reduce computation time.

Performance expectations include instant feedback for sort option changes—users should perceive no delay when switching between sorting methods.

## Business Rules for Sorting
Core rules govern how sorting integrates with platform features, ensuring fairness and user satisfaction.

THE system SHALL apply sorting consistently across community pages, user profiles, and search results. WHEN a user subscribes to communities, THE hot sort SHALL be the default sorting method for their personalized feed. IF a post has been deleted or removed, THEN THE system SHALL exclude it from all sorting calculations and lists.

Karma of post authors SHALL not directly influence sorting scores to maintain objectivity, though voting power based on user karma may indirectly affect rankings through voting patterns.

Admin actors MAY override sorting visibility for moderation purposes, such as promoting important announcements in special sorted feeds, but this SHALL not alter core algorithms unless explicitly configured.

## User Scenarios
Detailed scenarios illustrate how sorting affects user interactions.

Scenario: New User Discovery. A guest user browses a popular community and selects "Hot" sort. The feed shows trending posts with active comments, helping them discover current trends without prior knowledge.

Scenario: Deep Dive into Community. An authenticated user checks a subscribed community with "New" sort, seeing recent posts about breaking news, allowing them to contribute timely opinions.

Scenario: Quality Research. A user sorts posts as "Top" in a technical community to find well-vetted solutions and expert advice, ranking articles by long-term community approval.

Scenario: Balanced Debate. In a political forum, controversial sort surfaces posts with 50/50 upvote splits, encouraging users to engage in nuanced discussions and consider multiple perspectives.

Scenario: Performance Testing. During peak hours, admin monitors system response times for sorting operations, ensuring the platform handles 5,000 simultaneous sorting requests without timeouts.

These scenarios ensure sorting algorithms align with user journeys, promoting engagement and retention.

To view related voting system details, refer to the [Voting System Requirements Document](./08-voting-system.md). The voting mechanics directly influence sorting scores, particularly for hot, top, and controversial algorithms.

*Developer Note: This document defines business requirements only. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*