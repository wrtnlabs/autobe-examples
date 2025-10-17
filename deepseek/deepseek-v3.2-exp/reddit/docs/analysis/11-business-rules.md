# Business Rules Documentation

## 1. Content Validation Rules

### Content Creation Constraints

**Post Content Validation**
- WHEN a user attempts to create a post, THE system SHALL validate that the title length is between 5 and 300 characters.
- WHEN a user attempts to create a post, THE system SHALL validate that the content length does not exceed 40,000 characters for text posts.
- WHERE a post contains links, THE system SHALL validate that all URLs are properly formatted and accessible.
- WHERE a post contains images, THE system SHALL validate that image files are in supported formats (JPEG, PNG, GIF) and do not exceed 10MB in size.
- IF a post title contains profanity or prohibited language, THEN THE system SHALL reject the post and notify the user of content policy violation.
- WHEN creating text posts, THE system SHALL support basic markdown formatting including bold, italics, links, and lists.
- WHERE users submit link posts, THE system SHALL extract metadata including title, description, and thumbnail images when available.
- IF image posts contain explicit content, THEN THE system SHALL require NSFW tagging before publication.

**Comment Content Validation**
- WHEN a user attempts to post a comment, THE system SHALL validate that the comment length does not exceed 10,000 characters.
- WHERE a comment contains nested replies, THE system SHALL limit nesting depth to 10 levels maximum.
- IF a comment contains only whitespace or empty content, THEN THE system SHALL reject the comment as invalid.
- WHERE a comment contains external links, THE system SHALL check for known malicious URLs and block them.
- WHEN comments contain excessive capitalization or repetitive characters, THE system SHALL flag them for potential spam.
- WHERE comments are posted in rapid succession, THE system SHALL enforce a 10-second cooldown between comments.

**Content Quality Rules**
- THE system SHALL automatically flag posts with titles containing all capital letters for moderator review.
- THE system SHALL detect and prevent spam patterns such as identical posts across multiple communities within short time periods.
- WHERE content contains prohibited keywords, THE system SHALL automatically filter and flag for manual review.
- WHEN posts receive multiple user reports, THE system SHALL temporarily reduce their visibility pending review.
- WHERE users consistently create low-quality content, THE system SHALL apply posting restrictions automatically.
- THE system SHALL monitor for coordinated voting patterns that suggest manipulation.

## 2. User Behavior Constraints

**Posting Frequency Limits**
- WHILE a user has "new member" status (first 7 days), THE system SHALL limit posts to 5 per day.
- WHERE a user has established member status, THE system SHALL allow up to 50 posts per day.
- WHEN a user attempts to post in rapid succession, THE system SHALL enforce a minimum 30-second cooldown between posts.
- WHERE users consistently create popular content, THE system SHALL gradually increase their posting limits.
- IF users abuse posting privileges, THEN THE system SHALL temporarily reduce their posting limits.

**Commenting Constraints**
- THE system SHALL limit comments to 100 per user per day to prevent spam.
- WHEN a user receives multiple downvotes on consecutive comments, THE system SHALL temporarily reduce their commenting frequency.
- WHERE a user's comments consistently receive negative karma, THE system SHALL flag their account for review.
- WHEN users post comments in rapid succession, THE system SHALL enforce a 5-second minimum delay between comments.
- WHERE comment chains become excessively long, THE system SHALL encourage users to create new posts instead.

**Voting Restrictions**
- THE system SHALL prevent users from voting on their own posts and comments.
- WHEN a user attempts to vote on the same content multiple times, THE system SHALL count only the most recent vote.
- WHERE vote manipulation is detected (multiple accounts voting in patterns), THE system SHALL invalidate suspicious votes.
- THE system SHALL limit users to 1,000 votes per day to prevent automated voting.
- WHEN users consistently vote against community consensus, THE system SHALL review their voting patterns.

## 3. System Operation Boundaries

**Community Creation Limits**
- WHEN a user attempts to create a community, THE system SHALL require the user account to be at least 30 days old.
- WHERE a user has created multiple communities, THE system SHALL limit active community ownership to 10 per user.
- IF a community remains inactive (no posts) for 90 days, THEN THE system SHALL automatically archive the community.
- WHEN a community experiences rapid growth, THE system SHALL provide additional moderation tools to the creator.
- WHERE communities violate platform policies, THE system SHALL suspend or remove them after investigation.

**Subscription Management**
- THE system SHALL limit the number of community subscriptions per user to 1,000.
- WHEN a user subscribes to a community, THE system SHALL immediately update their personalized feed.
- WHERE a community becomes private, THE system SHALL automatically unsubscribe non-approved users.
- WHEN users subscribe to multiple similar communities, THE system SHALL recommend content diversification.
- WHERE subscription limits are approached, THE system SHALL suggest organizing subscriptions into categories.

**Content Display Thresholds**
- THE system SHALL require posts to have at least 1 upvote to appear in "hot" sorting algorithms.
- WHERE posts receive significant downvotes (below -10 score), THE system SHALL automatically collapse them in feeds.
- WHEN comments receive negative karma below -5, THE system SHALL hide them by default with option to expand.
- THE system SHALL prioritize content from communities where users are most active.
- WHERE content receives rapid engagement, THE system SHALL temporarily boost its visibility.

## 4. Business Logic Requirements

**Karma Calculation Rules**
- THE system SHALL calculate user karma as the sum of post karma and comment karma.
- WHEN a post receives an upvote, THE system SHALL award the post author 1 karma point.
- WHEN a post receives a downvote, THE system SHALL deduct 1 karma point from the post author.
- WHERE a comment receives an upvote, THE system SHALL award the comment author 1 karma point.
- WHERE a comment receives a downvote, THE system SHALL deduct 1 karma point from the comment author.
- THE system SHALL cap maximum karma gain or loss from a single post or comment at ±100 points.
- WHEN content is removed by moderators, THE system SHALL reverse any karma gained from that content.
- WHERE users consistently receive negative karma, THE system SHALL restrict their posting abilities.

**Content Ranking Algorithms**
- THE system SHALL calculate "hot" ranking using the formula: (upvotes - downvotes) / (age_in_hours + 2)^1.8
- THE system SHALL calculate "top" ranking as total score (upvotes - downvotes) over specific time periods (day, week, month, year, all-time).
- THE system SHALL calculate "controversial" ranking using the formula: (upvotes + downvotes) / MAX(|upvotes - downvotes|, 1)
- THE system SHALL calculate "new" ranking based solely on creation timestamp.
- THE system SHALL calculate "rising" ranking based on recent vote velocity and engagement acceleration.
- WHERE communities have specific ranking preferences, THE system SHALL allow custom sorting algorithms.

**User Reputation Tiers**
- WHILE a user has karma below 100, THE system SHALL classify them as "New Member" with posting restrictions.
- WHERE a user has karma between 100 and 10,000, THE system SHALL classify them as "Active Member" with standard privileges.
- WHERE a user has karma above 10,000, THE system SHALL classify them as "Trusted Member" with reduced restrictions.
- WHEN users reach specific karma milestones, THE system SHALL award special badges or flairs.
- WHERE users maintain high-quality contributions, THE system SHALL provide additional moderation tools.

## 5. Automated Enforcement Mechanisms

**Spam Detection**
- THE system SHALL automatically detect and flag posts containing identical content across multiple communities.
- WHEN a user posts the same comment repeatedly across different posts, THE system SHALL flag the behavior as potential spam.
- WHERE a new account exhibits rapid posting behavior, THE system SHALL apply rate limiting and additional verification.
- THE system SHALL monitor for bot-like patterns including consistent posting intervals and similar content.
- WHEN spam is confirmed, THE system SHALL automatically remove content and restrict account capabilities.

**Content Quality Automation**
- THE system SHALL automatically collapse posts with vote ratios below 25% (upvotes/total votes).
- WHEN posts receive multiple user reports, THE system SHALL automatically hide them pending moderator review.
- WHERE users consistently receive content removals, THE system SHALL automatically restrict their posting privileges.
- THE system SHALL flag content with suspicious voting patterns for manual review.
- WHEN content receives rapid downvotes from diverse users, THE system SHALL reduce its visibility automatically.

**User Behavior Automation**
- THE system SHALL automatically suspend accounts that receive multiple community bans within 30 days.
- WHEN users exhibit vote manipulation patterns, THE system SHALL automatically reset their voting history.
- WHERE users harass other users through comments or messages, THE system SHALL automatically restrict their communication abilities.
- THE system SHALL monitor for coordinated behavior across multiple accounts.
- WHEN users consistently violate community guidelines, THE system SHALL apply progressive restrictions.

## 6. Community Guidelines Enforcement

**Content Prohibitions**
- THE system SHALL prohibit content that violates laws, including copyright infringement, harassment, and illegal activities.
- WHEN content contains personal information without consent, THE system SHALL automatically remove it.
- WHERE content promotes hate speech or violence, THE system SHALL immediately remove and report it.
- THE system SHALL prohibit spam, commercial solicitation, and deceptive practices.
- WHEN content threatens user safety, THE system SHALL take immediate action and involve law enforcement if necessary.

**Community-Specific Rules**
- WHERE communities establish specific content guidelines, THE system SHALL enforce those rules for all posts within that community.
- WHEN moderators set community-specific posting requirements, THE system SHALL validate posts against those requirements.
- IF a user repeatedly violates community rules, THEN THE system SHALL allow moderators to permanently ban them from that community.
- THE system SHALL provide tools for communities to customize their moderation approaches.
- WHERE communities develop unique cultures, THE system SHALL support their self-governance while maintaining platform standards.

## 7. Content Moderation Rules

**Automated Moderation Triggers**
- THE system SHALL automatically flag posts containing URLs from newly registered domains.
- WHEN comments contain excessive profanity based on predefined word lists, THE system SHALL flag them for review.
- WHERE users receive multiple reports within short time periods, THE system SHALL temporarily limit their posting abilities.
- THE system SHALL use machine learning to identify potentially problematic content patterns.
- WHEN automated systems flag content, THE system SHALL provide clear reasons for human moderators.

**Moderator Action Requirements**
- WHEN moderators remove content, THE system SHALL require them to select a removal reason from predefined categories.
- WHERE moderators ban users from communities, THE system SHALL notify the user with the reason and duration.
- IF moderators take action on reported content, THEN THE system SHALL notify the reporting users of the outcome.
- THE system SHALL track moderator actions for consistency and accountability.
- WHEN moderators escalate issues to administrators, THE system SHALL provide complete context and history.

## 8. User Reputation Management

**Account Standing Rules**
- THE system SHALL track user standing based on content compliance and community reception.
- WHEN users receive multiple content removals, THE system SHALL downgrade their account standing.
- WHERE users maintain positive karma and compliance, THE system SHALL improve their account standing.
- THE system SHALL consider both automated and manual moderation actions in standing calculations.
- WHEN users successfully appeal moderation actions, THE system SHALL restore their standing appropriately.

**Privilege Management**
- WHILE users have good standing, THE system SHALL grant them additional posting and moderation privileges.
- WHERE users have poor standing, THE system SHALL restrict their ability to create new communities.
- IF users reach the lowest standing tier, THEN THE system SHALL require manual review for all their posts.
- THE system SHALL provide clear pathways for users to improve their standing through positive contributions.
- WHEN users demonstrate consistent positive behavior, THE system SHALL gradually restore privileges.

## 9. Voting System Constraints

**Vote Validation Rules**
- THE system SHALL validate that each vote comes from a unique, authenticated user account.
- WHEN users attempt to vote on content they've already voted on, THE system SHALL update rather than duplicate the vote.
- WHERE voting patterns suggest automated behavior, THE system SHALL investigate and potentially invalidate votes.
- THE system SHALL prevent vote manipulation through coordinated account activity.
- WHEN suspicious voting patterns are detected, THE system SHALL flag them for moderator review.

**Vote Weighting**
- THE system SHALL apply equal weight to all user votes regardless of user karma or standing.
- WHEN content receives votes from multiple accounts with similar patterns, THE system SHALL flag for potential manipulation.
- WHERE communities enable contest mode, THE system SHALL randomize vote display to prevent bandwagon effects.
- THE system SHALL consider vote velocity when detecting manipulation patterns.
- WHEN vote manipulation is confirmed, THE system SHALL remove illegitimate votes and apply penalties.

## 10. Content Ranking Logic

**Algorithm Parameters**
- THE system SHALL use time decay in ranking algorithms to ensure fresh content surfaces regularly.
- WHEN calculating "hot" ranking, THE system SHALL consider both vote score and time since posting.
- WHERE posts receive rapid engagement, THE system SHALL temporarily boost their ranking in feeds.
- THE system SHALL factor in comment activity and user engagement when ranking content.
- WHEN content receives diverse engagement from multiple communities, THE system SHALL increase its visibility.

**Personalization Rules**
- THE system SHALL prioritize content from communities that users frequently interact with.
- WHEN users consistently engage with specific content types, THE system SHALL adjust their feed accordingly.
- WHERE users hide or block certain communities, THE system SHALL exclude that content from their feeds.
- THE system SHALL consider user voting history when personalizing content recommendations.
- WHEN users follow specific topics or users, THE system SHALL prioritize related content.

**Quality Assurance**
- THE system SHALL demote content that receives high report-to-engagement ratios.
- WHEN posts receive significant downvotes shortly after publication, THE system SHALL reduce their visibility.
- WHERE content consistently receives positive engagement from diverse users, THE system SHALL increase its distribution.
- THE system SHALL monitor for quality indicators including comment depth and user retention.
- WHEN content demonstrates educational or informative value, THE system SHALL promote it in relevant contexts.

## Implementation Notes

All business rules defined in this document must be implemented with appropriate validation, logging, and monitoring. The system should provide administrators with visibility into rule enforcement and exception handling.

**Rule Enforcement Transparency**
- THE system SHALL provide users with clear explanations when content is removed or restricted.
- WHERE automated systems make decisions, THE system SHALL allow for human review and appeal.
- WHEN rules are updated, THE system SHALL notify users and moderators of changes.
- THE system SHALL maintain audit trails of all automated and manual enforcement actions.

**Continuous Improvement**
- THE system SHALL regularly review rule effectiveness and adjust based on community feedback.
- WHERE rules create unintended consequences, THE system SHALL modify them appropriately.
- WHEN new abuse patterns emerge, THE system SHALL update detection and prevention mechanisms.
- THE system SHALL balance automated enforcement with human judgment for complex cases.

This comprehensive business rules document provides clear, actionable requirements for implementing a fair, transparent, and effective content management system that supports community growth while maintaining platform quality and user safety.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*