# Reddit-like Community Platform: Voting and Karma System Requirements

## Executive Summary

THE voting system SHALL serve as the primary mechanism for content curation and user reputation management in the Reddit-like community platform. THE system SHALL enable users to express approval or disapproval of content through upvotes and downvotes, WHILE maintaining content quality through sophisticated karma calculations and anti-manipulation measures.

WHEN users engage with content through voting, THE system SHALL update content rankings in real-time and adjust user karma accordingly. THE karma system SHALL provide community-driven reputation scoring that reflects user contribution quality and engagement history.

## 1. Voting Mechanisms

### 1.1 Core Voting Functions

WHEN a member views a post or comment, THE system SHALL display the current vote count and the user's voting status (upvoted, downvoted, or no vote).

WHEN a member clicks the upvote button on content they have not previously voted on, THE system SHALL:
- Record an upvote for that user-content pair
- Increase the content's vote score by 1
- Update the content's ranking in real-time
- Award karma to the content author
- Store the vote action with timestamp and user ID

WHEN a member clicks the downvote button on content they have not previously voted on, THE system SHALL:
- Record a downvote for that user-content pair
- Decrease the content's vote score by 1
- Update the content's ranking in real-time
- Deduct karma from the content author
- Store the vote action with timestamp and user ID

### 1.2 Vote Reversal and Changes

WHEN a member clicks the same vote button on content they previously voted on, THE system SHALL:
- Remove their existing vote (unvote)
- Revert the content's vote score by 1 in the opposite direction
- Revert the karma change from the original vote
- Update the content's ranking accordingly

WHEN a member clicks the opposite vote button on content they previously voted on, THE system SHALL:
- Change their vote from upvote to downvote or vice versa
- Adjust the content's vote score by 2 (removing original vote and applying new vote)
- Apply the appropriate karma changes to the content author
- Update the content's ranking to reflect the score change

### 1.3 Vote Storage and Tracking

THE system SHALL store each vote with the following information:
- User ID of the voting user
- Content ID (post or comment ID)
- Content type (post or comment)
- Vote type (upvote or downvote)
- Timestamp of the vote
- IP address of the voter
- User agent string for fraud detection

WHILE a vote exists in the system, THE system SHALL prevent duplicate votes from the same user on the same content.

## 2. Karma Calculation

### 2.1 Post Karma Calculation

THE system SHALL calculate post karma using the following formula:
- Each upvote on a post SHALL award the author 1 karma point
- Each downvote on a post SHALL deduct 1 karma point from the author
- Post karma SHALL be calculated as: (upvotes - downvotes) with a minimum of 0

THE system SHALL apply karma changes to the author immediately WHEN a vote occurs on their content.

### 2.2 Comment Karma Calculation

THE system SHALL calculate comment karma using the following formula:
- Each upvote on a comment SHALL award the author 1 karma point
- Each downvote on a comment SHALL deduct 1 karma point from the author
- Comment karma SHALL be calculated as: (upvotes - downvotes) with a minimum of 0

THE system SHALL track comment karma separately from post karma for more granular reputation tracking.

### 2.3 Total User Karma

THE system SHALL calculate total user karma as the sum of:
- All post karma earned by the user
- All comment karma earned by the user
- Any bonus karma from awards or achievements (if implemented)

THE system SHALL update the user's total karma in real-time WHEN any vote affects their content.

### 2.4 Karma Weighting and Maturity

THE system SHALL implement karma weighting based on content age:
- WHEN content is less than 1 hour old, votes SHALL receive full karma weight (1:1 ratio)
- WHEN content is between 1-24 hours old, votes SHALL receive 0.8x karma weight
- WHEN content is between 1-7 days old, votes SHALL receive 0.5x karma weight
- WHEN content is older than 7 days, votes SHALL receive 0.2x karma weight

THE system SHALL apply this weighting to prevent karma farming on old content and encourage timely engagement.

## 3. User Reputation

### 3.1 Karma-Based Reputation Levels

THE system SHALL assign reputation levels based on total karma earned:
- 0-100 karma: New User
- 101-500 karma: Regular User
- 501-1000 karma: Active User
- 1001-5000 karma: Established User
- 5001-10000 karma: Veteran User
- 10001+ karma: Elite User

THE system SHALL display the user's current reputation level on their profile and next to their username in posts and comments.

### 3.2 Karma-Based Permissions

THE system SHALL unlock additional features based on karma thresholds:
- WHEN a member reaches 100 karma, THEY SHALL be able to create communities
- WHEN a member reaches 50 karma, THEY SHALL be able to moderate communities they create
- WHEN a member reaches 25 karma, THEY SHALL be able to report content with higher priority
- WHEN a member reaches 10 karma, THEY SHALL be able to customize their profile extensively

IF a member's karma drops below these thresholds due to downvotes, THEN THE system SHALL revoke these permissions until karma is restored.

### 3.3 Karma Display and Privacy

THE system SHALL display user karma prominently on:
- User profile pages
- Next to usernames in posts and comments
- In user hover cards/pop-ups
- In community member lists

THE system SHALL allow users to hide their karma display in their privacy settings, BUT THE karma SHALL still be calculated and used for internal ranking purposes.

## 4. Content Ranking

### 4.1 Hot Algorithm

THE system SHALL implement a "hot" ranking algorithm that considers:
- Vote score (upvotes minus downvotes)
- Content age
- Vote velocity (rate of voting over time)
- User karma of voters

THE hot score SHALL be calculated using a logarithmic scale to prevent early votes from having disproportionate impact.

WHEN calculating hot score, THE system SHALL:
- Apply logarithmic scaling to vote count: log10(max(abs(score), 1))
- Consider vote velocity by analyzing votes per hour
- Apply time decay based on content age
- Normalize scores across different communities

### 4.2 Top Algorithm

THE system SHALL implement "top" ranking based purely on vote score within specified time periods:
- Today: highest scores in the last 24 hours
- This Week: highest scores in the last 7 days
- This Month: highest scores in the last 30 days
- This Year: highest scores in the last 365 days
- All Time: highest scores overall

THE system SHALL exclude content with scores below 0 from top rankings.

### 4.3 Controversial Algorithm

THE system SHALL identify controversial content using:
- High vote activity with balanced upvotes and downvotes
- High comment-to-vote ratio indicating discussion
- Mixed sentiment in comments

THE controversial score SHALL be calculated as: (upvotes + downvotes) / |upvotes - downvotes| WHERE the denominator is not zero.

WHILE content receives both positive and negative engagement simultaneously, THE system SHALL increase its controversial score. WHEN controversial content becomes stable (engagement velocity decreases), THE system SHALL gradually reduce its visibility.

## 5. Voting Restrictions

### 5.1 Anti-Manipulation Measures

THE system SHALL prevent vote manipulation through:
- IP-based vote limiting: maximum 10 votes per IP address per hour
- Account age requirements: accounts must be at least 24 hours old to vote
- Email verification: users must verify email before voting
- Karma requirements: users must have at least 1 karma to downvote

WHEN the system detects suspicious voting patterns, IT SHALL:
- Flag the votes for review
- Apply reduced karma weight to suspicious votes
- Notify moderators of potential manipulation
- Temporarily restrict voting from suspicious accounts

### 5.2 Community-Specific Restrictions

THE system SHALL allow moderators to set community-specific voting rules:
- Minimum account age to vote in the community
- Minimum karma requirement to vote in the community
- Vote visibility settings (show/hide vote counts)
- Comment karma requirements to vote

WHERE moderators enable these restrictions, THE system SHALL enforce them strictly and notify users who don't meet requirements.

### 5.3 Vote Privacy

THE system SHALL protect vote privacy by:
- Not revealing individual voters (except to moderators for abuse investigation)
- Only showing aggregate vote counts publicly
- Requiring moderator privileges to see detailed vote breakdowns
- Anonymizing vote data in analytics and exports

## 6. Karma History

### 6.1 Karma Tracking

THE system SHALL maintain a complete history of karma changes for each user, including:
- Source of karma change (post ID, comment ID, or system action)
- Type of karma change (upvote, downvote, award, or manual adjustment)
- Timestamp of the karma change
- Net karma change amount
- Karma balance after the change

### 6.2 Karma Analytics

THE system SHALL provide karma analytics showing:
- Daily karma earned/lost breakdown
- Top performing posts and comments by karma
- Karma trends over time
- Most active voting communities
- Peak voting times and patterns

### 6.3 Karma Notifications

THE system SHALL send notifications WHEN:
- A user's content reaches significant karma milestones (10, 50, 100, 500, 1000)
- A user's total karma crosses threshold levels
- Their content becomes highly ranked in a community
- They receive awards or special recognition

Users SHALL be able to customize notification preferences for karma-related events.

## 7. Error Handling and Edge Cases

### 7.1 Voting Errors

IF a member attempts to vote on their own content, THEN THE system SHALL:
- Prevent the vote from being recorded
- Display an appropriate error message: "You cannot vote on your own content"
- Log the attempt for potential abuse tracking

IF a member attempts to vote without meeting requirements (unverified email, insufficient karma, etc.), THEN THE system SHALL:
- Prevent the vote from being recorded
- Display a clear error message explaining the requirement
- Provide guidance on how to meet the requirement

IF the system encounters a database error during vote recording, THEN THE system SHALL:
- Roll back any partial vote changes
- Display a user-friendly error message
- Log the technical error for debugging
- Allow the user to retry the vote

### 7.2 Karma Calculation Errors

IF the system detects karma calculation inconsistencies (mismatched totals), THEN THE system SHALL:
- Log the discrepancy with details
- Recalculate karma from vote history
- Update the user's karma to the corrected value
- Notify administrators of the correction

### 7.3 Abuse Handling

WHEN the system detects vote brigading or coordinated manipulation, THEN THE system SHALL:
- Identify the source of manipulation
- Reverse votes from identified manipulation sources
- Apply karma penalties to involved accounts
- Temporarily or permanently restrict voting privileges
- Notify moderators and administrators

THE system SHALL implement sophisticated algorithms to detect:
- Vote farming (artificial vote exchanges between users)
- Brigading (coordinated voting campaigns)
- Bot voting (automated voting patterns)
- Vote buying (purchased votes or karma)

## 8. Performance Requirements

THE system SHALL process votes and update rankings in real-time with a maximum latency of 500ms.

THE system SHALL handle vote spikes during popular content events without degradation of service.

THE system SHALL cache karma calculations to improve performance WHILE ensuring real-time accuracy for active users.

THE system SHALL implement efficient database indexing for vote queries to support millions of votes per day.

## 9. Future Considerations

THE system SHALL be designed to accommodate future enhancements such as:
- Award systems with special karma bonuses
- Community-specific karma systems
- Karma-weighted voting (more experienced users' votes count more)
- Integration with external reputation systems
- Advanced analytics and machine learning for fraud detection

This comprehensive voting and karma system SHALL create an engaging, fair, and manipulation-resistant environment that encourages quality content creation and meaningful community participation.