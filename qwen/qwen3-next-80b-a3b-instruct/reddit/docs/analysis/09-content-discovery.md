# Content Discovery Requirements

## Sorting Algorithms

THE communityBbs system SHALL implement five primary post sorting methods: hot, new, top, controversial, and default.

WHEN a user selects "Hot", THE system SHALL calculate a dynamic score using the following algorithm:

WHEN a post is created, THE system SHALL assign an initial hot score of 0.

WHILE a post exists, THE system SHALL recalculate its hot score every 5 minutes using this formula:

hot_score = log_10(absolute_upvotes + 1) + (hours_since_posted * 0.1) - (hours_since_posted * 0.1 * votes_score)

WHERE absolute_upvotes = (upvotes - downvotes) + 1

WHERE votes_score = (if (upvotes + downvotes) > 0 then (|upvotes - downvotes| / (upvotes + downvotes)) else 0)

WHEN a user votes on a post, THE system SHALL trigger an immediate recalculation of the hot score.

WHEN a user selects "New", THE system SHALL sort all posts by creation timestamp in descending order (most recent first).

WHEN a user selects "Top", THE system SHALL sort posts by total net votes (upvotes - downvotes) in descending order.

WHEN a user selects "Controversial", THE system SHALL sort posts by the product of upvotes and downvotes, divided by total votes + 1, in descending order.

WHERE controversial_score = (upvotes * downvotes) / (upvotes + downvotes + 1)

WHEN no sorting option is selected, THE system SHALL display posts in "Default" order, which is equivalent to "New" sort.

## Time Scopes

WHILE a user is viewing post listings, THE system SHALL provide time scope filters for top and controversial sorts: All Time, Today, This Week, This Month, This Year.

WHEN the "Today" time scope is selected, THE system SHALL only include posts created within the last 24 hours.

WHEN the "This Week" time scope is selected, THE system SHALL only include posts created within the last 7 days.

WHEN the "This Month" time scope is selected, THE system SHALL only include posts created within the last 30 days.

WHEN the "This Year" time scope is selected, THE system SHALL only include posts created within the last 365 days.

WHEN the "All Time" time scope is selected, THE system SHALL include all posts regardless of creation date.

WHEN a user selects "Top" or "Controversial" with a specific time scope, THE system SHALL apply the time constraint before sorting.

## Search Functionality

WHEN a user enters a search query, THE system SHALL execute a full-text search across post titles and post bodies.

THE system SHALL rank search results by relevance using this formula:

relevance_score = (title_match_weight * title_occurrences) + (body_match_weight * body_occurrences) + (community_boost * community_subscription_factor) + (karma_multiplier * author_karma_weight)

WHERE title_match_weight = 3.0
WHERE body_match_weight = 1.0
WHERE community_boost = 0.5
WHERE community_subscription_factor = (if user_subscribed_to_community then 1.2 else 1.0)
WHERE karma_multiplier = (if author_karma > 100 then 1.5 else if author_karma > 10 then 1.2 else 1.0)
WHERE author_karma_weight = 0.2

WHEN a search query contains more than 3 words, THE system SHALL prioritize exact phrase matching over individual word matches.

WHEN a search query returns fewer than 10 results, THE system SHALL automatically expand the search to include community names and tags.

WHEN a search query returns zero results, THE system SHALL display "No results found" and suggest alternative related search terms based on trending tags in the user's subscribed communities.

## Trending Content

WHILE a user is viewing the homepage, THE system SHALL display a "Trending" section showing communities and posts with rapidly increasing engagement.

THE system SHALL calculate trending score using this formula:

trending_score = (recent_engagement_rate * 0.7) + (community_popularity * 0.3)

WHERE recent_engagement_rate = (total_votes_in_last_2_hours / hours_since_creation)

WHERE community_popularity = (total_subscribers / 1000)

WHEN a community or post exceeds a trending_threshold of 500, THE system SHALL include it in the Trending section.

WHEN a post has been featured in the Trending section for more than 8 hours, THE system SHALL reduce its trending_priority to 0.5 to prevent repetition.

WHEN a post receives more than 100 votes within 30 minutes of creation, THE system SHALL trigger a "Rapid Rise" badge.

WHEN a community exceeds 1,000 subscribers and maintains a 5% daily growth rate, THE system SHALL apply a "Rising Community" badge.

## Recommended Communities

WHILE a user is viewing their subscription list, THE system SHALL display "Recommended Communities" based on three factors.

THE system SHALL recommend communities using this weighted algorithm:

recommendation_score = (content_similarity * 0.5) + (user_similarity * 0.3) + (trending_factor * 0.2)

WHERE content_similarity = (number_of_common_tags / total_tags_in_target_community)

WHERE user_similarity = (number_of_common_subscriptions / total_subscriptions_of_similar_user)

WHERE trending_factor = (if community_trending > 100 then 1.5 else 1.0)

WHEN a user subscribes to a community, THE system SHALL increase weight of community_similarity by 0.1 for future recommendations.

WHEN a user has fewer than 3 subscriptions, THE system SHALL recommend the top 10 most popular communities globally using a popularity score derived from total subscribers.

WHEN a user has 5 or more subscriptions, THE system SHALL recommend communities with at least 2 common tags and a minimum of 100 subscribers.

WHEN a user actively upvotes content within a community, THE system SHALL increase the recommendation weight for similar communities by 0.2 for the next 24 hours.

WHEN a user reports content from a community, THE system SHALL immediately reduce its recommendation score by 0.5 for that user, but not for other users.

WHEN a user unsubscribes from a community, THE system SHALL reduce its recommendation weight by 0.3 for that user for the next 30 days.

WHEN a user views a community page, THE system SHALL record this interaction and use it to boost recommendation scores for similar communities.

WHEN a post's comments receive over 50 replies within 1 hour, THE system SHALL promote the parent post to "Popular Discussion" status and recommend it to users subscribed to related communities.


THE system SHALL ensure all sorting algorithms, search logic, and recommendations respect user privacy and anonymity:

THE system SHALL NOT store individual user engagement patterns for tracking purposes.

THE system SHALL NOT display specific user behavior analytics to community moderators or administrators.

THE system SHALL calculate trends and recommendations using aggregated, anonymized data only.

THE system SHALL allow users to opt-out of personalized recommendations with a single toggle setting.

THE system SHALL not use personal information such as name, email, or IP address in any recommendation calculation.