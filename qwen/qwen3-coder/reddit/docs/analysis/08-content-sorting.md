# Content Sorting Requirements

## Overview
THE redditClone platform SHALL provide users with multiple content sorting algorithms to help them discover relevant posts based on their preferences.

## Sorting Algorithms

### Hot Posts Calculation
WHEN calculating hot posts, THE system SHALL use the following algorithm:
- Score = Log10(Max(|upvotes - downvotes|, 1)) + Sign × TimeFactor
- Where Sign = 1 if (upvotes > downvotes), 0 if (upvotes = downvotes), -1 if (upvotes < downvotes)
- TimeFactor = (Post creation time - Epoch reference time) / 45000
- Epoch reference time SHALL be set to January 1, 2025 00:00:00 UTC

WHEN a post receives a new vote, THE system SHALL recalculate its hotness score immediately.

THE system SHALL order posts by hotness score in descending order.

Posts created within the last 24 hours SHALL receive a 10% boost to their hotness score.

Posts with deleted or banned status SHALL be excluded from hot sorting.

### Top Posts Periods
THE system SHALL provide these time period filters for top posts:
- All time: All posts since platform inception
- Year: Posts from the past 365 days
- Month: Posts from the past 30 days
- Week: Posts from the past 7 days
- Day: Posts from the past 24 hours

WHEN a user accesses "Top" sorting without specifying a time period, THE system SHALL default to "All time" sorting.

THE system SHALL calculate top post scores using the formula: Score = upvotes - downvotes.

Posts SHALL be ordered by this score in descending order within each time period.

Posts with deleted or banned status SHALL be excluded from top sorting results.

### Controversial Posts
WHEN identifying controversial posts, THE system SHALL apply these criteria:
- Posts with at least 5 upvotes AND 5 downvotes
- Posts with a vote ratio between 0.25 and 0.75 (where ratio = upvotes / (upvotes + downvotes))

THE system SHALL calculate controversy scores using the formula: Score = Max(upvotes, downvotes) / |upvotes - downvotes|.

Posts SHALL be ordered by this controversy score in descending order.

Posts with deleted or banned status SHALL be excluded from controversial sorting.

### New Posts
THE system SHALL order new posts by creation time in descending order (newest first).

WHEN a user accesses a community with "New" sorting, THE system SHALL display all new posts in chronological order.

Each page of new posts SHALL contain exactly 25 posts.

Posts with deleted or banned status SHALL be excluded from new sorting results.

## User Interface

### Sorting Options Display
THE system SHALL provide a dropdown menu on all community pages with these sorting options:
- Hot (default)
- New
- Top (with submenu for time periods)
- Controversial

WHERE a user has set a preferred sorting method in their profile settings, THE system SHALL use that preference as default for all community browsing.

WHEN a user changes sorting options, THE system SHALL preserve that setting for their current browsing session.

### Performance Requirements
THE system SHALL load sorted post listings within 2 seconds for communities with fewer than 10,000 posts.

THE system SHALL implement pagination for sorted post listings with 25 posts per page.

WHEN retrieving sorted posts from the database, THE system SHALL utilize indexed queries for optimal performance.

THE system SHALL cache hot post rankings for 5 minutes to reduce computational overhead.

### Error Handling
IF a sorting algorithm calculation fails due to data inconsistencies, THEN THE system SHALL log the error and default to sorting by creation time (New).

IF a user attempts to access a non-existent sorting method, THEN THE system SHALL return HTTP 400 with error code SORT_INVALID_METHOD.

IF database queries for sorted posts exceed timeout limits, THEN THE system SHALL return an empty result set with error code SORT_QUERY_TIMEOUT.

WHEN a community has no posts available for sorting, THE system SHALL display an appropriate message informing the user that no content is available.