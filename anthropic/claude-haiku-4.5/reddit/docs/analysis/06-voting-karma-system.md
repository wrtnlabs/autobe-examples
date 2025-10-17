# Voting and Karma System Requirements - Enhanced Specification

## 1. Post Sorting Algorithms

**Note**: The voting and karma system forms the foundation for content sorting algorithms. This section briefly references sorting integration; detailed sorting specifications are in [08-content-sorting-discovery.md](./08-content-sorting-discovery.md).

### 1.1 Hot Algorithm Integration with Voting
WHEN posts are sorted using the hot algorithm, THE system SHALL rank posts based on engagement velocity derived from vote counts and timestamps.

THE hot algorithm relies on net upvotes (upvotes minus downvotes) as the primary engagement signal.

WHEN a new vote is cast on a post, THE post's hot score is recalculated within 30 seconds for feed regeneration.

### 1.2 Top Algorithm Integration with Voting
THE top algorithm aggregates votes over configurable time windows (day, week, month, all-time).

WHEN sorting by top, THE system SHALL rank posts by net vote count in descending order within the selected time window.

### 1.3 Controversial Algorithm Integration
THE controversial algorithm specifically uses the relationship between upvotes and downvotes to identify polarizing content.

WHEN sorting by controversial, THE system SHALL prioritize posts with balanced high voting in both directions (many upvotes AND many downvotes).

THE formula for controversial scoring uses: `min(upvotes, downvotes) * 2 + abs(upvotes - downvotes)` to surface posts generating strong divided opinion.

---

## 2. Vote Types and Mechanics

### 2.1 Upvote Functionality

WHEN a member user clicks the upvote button on a post or comment, THE system SHALL record the upvote and increase the vote count by one.

THE upvote represents community approval and appreciation for the content. Upvotes are the primary mechanism for surfacing quality content.

WHEN a member user attempts to upvote a post or comment in a community they do not have access to, THE system SHALL deny the action and display an appropriate error message.

WHEN a member user upvotes content, THE system SHALL immediately increase the vote count visible to all users (within 2 seconds) and recalculate the content creator's karma.

### 2.2 Downvote Functionality

WHEN a member user clicks the downvote button on a post or comment, THE system SHALL record the downvote and decrease the vote count by one.

THE downvote represents community disapproval or disagreement with the content. Downvotes are important for identifying low-quality or irrelevant content.

WHEN a member user attempts to downvote a post or comment in a community they do not have access to, THE system SHALL deny the action.

WHEN a member user downvotes content, THE system SHALL immediately decrease the vote count and recalculate karma accordingly.

### 2.3 Vote Restrictions and Permissions

WHEN a guest user attempts to vote on any content, THE system SHALL deny the action and prompt the user to log in or register.

THE error message SHALL display: "Please log in to vote. Guests cannot participate in voting."

WHEN a member user attempts to vote on their own post or comment, THE system SHALL deny the action and display an error message indicating that self-voting is not permitted.

THE error message SHALL display: "You cannot vote on your own content. This helps maintain voting integrity."

WHEN a member user attempts to vote on content in a private community they do not subscribe to, THE system SHALL deny the action.

THE error message SHALL display: "You do not have access to this community."

WHEN a moderator or admin user votes on content, THE system SHALL apply the same voting rules as regular members (moderators have no special voting privileges).

### 2.4 Self-Voting Prevention Implementation

THE system SHALL enforce self-voting prevention at the database level using a check constraint or application-level validation.

WHEN processing a vote request, THE system SHALL verify the voter's user ID does not match the content creator's user ID before recording the vote.

IF the IDs match, THE system SHALL reject the vote with HTTP 403 Forbidden and error code `VOTE_SELF_VOTE`.

---

## 3. Vote State Management

### 3.1 Vote Submission and Confirmation

WHEN a member user clicks upvote or downvote, THE system SHALL update the vote state within 2 seconds and reflect the change in the UI.

WHEN a member user votes on content, THE system SHALL record the following vote metadata: user ID, content ID, vote type (upvote/downvote), timestamp of vote, and optionally IP address for fraud detection.

THE vote submission is immediate and the change is reflected in real-time, creating a responsive user experience.

WHEN a vote is successfully recorded, THE system SHALL return HTTP 200 OK with updated vote count and current user's vote status.

### 3.2 Vote Tracking in Database

THE system SHALL maintain a vote record for each unique user-content pair, preventing duplicate entries and ensuring data consistency.

THE database table structure SHALL include: vote_id (primary key), user_id (foreign key), content_id (foreign key), vote_type (upvote or downvote), created_at (timestamp), updated_at (timestamp for vote changes).

WHEN querying vote counts, THE system SHALL calculate the vote count as the total upvotes minus total downvotes for each post or comment.

WHEN a vote is recorded, THE system SHALL use a database transaction to ensure that both the vote record creation and karma update happen atomically (all-or-nothing).

### 3.3 Vote History and Audit Trail

THE system SHALL maintain a complete audit trail of all votes cast on the platform, including vote changes and revocations, for fraud detection and platform analytics purposes.

WHEN a moderator or admin reviews a user's voting activity, THE system SHALL display the vote history including timestamps, content voted on, and vote type (if permissions allow).

THE audit trail SHALL NOT be publicly accessible but SHALL be available to moderators and admins for investigating suspicious voting patterns.

WHEN a vote is changed (user changes upvote to downvote), THE system SHALL update the vote record's vote_type field and update_at timestamp, preserving the original creation timestamp.

---

## 4. Changing and Revoking Votes

### 4.1 Vote Modification Rules

WHEN a member user has upvoted a post or comment and clicks the downvote button, THE system SHALL change their vote to a downvote and update the vote count accordingly.

THE change SHALL result in reducing upvote count by one and increasing downvote count by one (net change of -2 to the score).

WHEN a member user has downvoted a post or comment and clicks the upvote button, THE system SHALL change their vote to an upvote and update the vote count accordingly.

THE change SHALL result in reducing downvote count by one and increasing upvote count by one (net change of +2 to the score).

Users SHALL be able to change their votes as many times as they wish without restrictions, except where rate limiting applies.

### 4.2 Vote Removal Process

WHEN a member user has voted on content (upvote or downvote) and clicks the vote button again, THE system SHALL remove their vote completely.

THE vote button clicked SHALL toggle: if upvoted, clicking again removes the vote; if downvoted, clicking again removes the vote.

WHEN a vote is removed, THE system SHALL decrease the appropriate vote count (upvote or downvote) by one and preserve the historical vote record for audit purposes.

THE vote removal is immediate and visible within 2 seconds to all users.

### 4.3 Vote Change Notifications and Karma Impact

WHEN a member user changes their vote on a post or comment, THE system SHALL immediately recalculate the content creator's karma based on the new net vote count.

WHEN a member user removes their vote, THE system SHALL recalculate the content creator's karma, potentially causing negative karma change if the removed vote was an upvote.

Vote changes immediately impact karma calculations, ensuring that karma always reflects current community sentiment.

WHEN a user removes an upvote they previously gave, THE content creator's karma decreases by 1.

WHEN a user changes an upvote to a downvote, THE content creator's karma decreases by 2 (loses +1, gains -1).

---

## 5. Karma Calculation Formula

### 5.1 Post Karma Calculation

Post karma is calculated using the following formula:

**Post Karma = Total Upvotes - Total Downvotes**

Each upvote adds one karma point to the post creator, and each downvote subtracts one karma point.

The post's karma is always the net difference between positive and negative votes.

WHEN a member user receives an upvote on their post, THE system SHALL add one karma point to their total user karma.

WHEN a member user receives a downvote on their post, THE system SHALL subtract one karma point from their total user karma.

### 5.1.1 Post Karma Calculation Example

Example: A post with 150 upvotes and 50 downvotes generates (150 - 50) = 100 karma points for the author.

IF a post receives an edit, THE system SHALL NOT reset the karma. The post retains all accumulated karma points despite content changes.

WHEN a post is deleted by the author or moderators, THE system SHALL reverse all karma points associated with that post. The author loses the karma they gained from that post.

### 5.2 Comment Karma Calculation

Comment karma uses the identical calculation mechanism as post karma:

**Comment Karma = Total Upvotes - Total Downvotes**

WHEN a member user receives an upvote on their comment, THE system SHALL add one karma point to their total user karma.

WHEN a member user receives a downvote on their comment, THE system SHALL subtract one karma point from their total user karma.

WHEN a comment is deleted by the author or moderators, THE system SHALL reverse all karma points associated with that comment.

### 5.2.1 Comment Karma Calculation Example

Example: A comment with 45 upvotes and 10 downvotes generates (45 - 10) = 35 karma points for the comment author.

### 5.3 Net Vote Calculation

WHEN calculating net votes for a post or comment, THE system SHALL subtract the total downvote count from the total upvote count.

**Net Vote = Upvotes - Downvotes**

WHEN the result is negative (more downvotes than upvotes), THE system SHALL display the vote count as a negative number (e.g., "-5").

THE system SHALL NOT hide or truncate negative vote counts; they are displayed as-is.

### 5.4 Rounding and Precision Rules

THE system SHALL use whole numbers for all karma calculations with no decimal places.

THE system SHALL NOT apply rounding, truncation, or other transformations to karma values.

WHEN displaying karma in different contexts, THE system SHALL use the exact calculated value:
- User profile karma: Exact total (e.g., 2,547)
- Post karma breakdown: Exact per-post value (e.g., 89)
- Karma leaderboards: Exact rankings based on exact karma values

---

## 6. Karma Distribution

### 6.1 Karma Earned by Content Creators

Karma is earned exclusively by content creators when their posts or comments receive votes from other users.

Karma reflects the community's assessment of content quality and relevance.

THE system SHALL award one karma point per upvote received on posts and comments.

THE system SHALL deduct one karma point per downvote received on posts and comments.

WHEN a user creates a post or comment, THE initial karma contribution is zero. Karma accumulates as votes arrive.

WHEN a post or comment is created, THE user's total karma does NOT automatically increase. Karma increases only when votes are received.

### 6.2 Voter Karma (Non-Participatory)

Voting itself does not award or cost karma to the voter. The act of voting does not affect the voter's karma balance.

WHEN a member user votes on content, THE system SHALL NOT modify the voter's karma score.

WHEN a member user downvotes content, THE downvoting user does not lose karma or pay any cost.

The lack of downvote cost encourages quality control and community policing of low-quality content.

### 6.3 Minimum and Maximum Karma Boundaries

THE system SHALL allow user karma scores to go negative without limitation.

Users can have extremely negative karma (e.g., -1,000, -10,000, or lower) if their posts and comments receive sufficient downvotes.

THE system SHALL NOT impose a maximum karma limit.

Users can accumulate unlimited positive karma through many highly-voted posts and comments.

### 6.4 Negative Karma Handling

WHEN a member user's karma becomes negative, THE system SHALL NOT automatically restrict their ability to post or comment.

NEGATIVE KARMA: Negative karma is permitted and displays to other users, serving as a reputation signal of problematic behavior.

WHEN a member user's karma becomes significantly negative (below -100), THE system MAY apply optional features such as rate limiting, post moderation queues, or visual warnings (implementation is at the development team's discretion and not specified here).

DISPLAY: THE system SHALL display negative karma clearly as negative numbers: "-50", "-150", not as "0" or truncated values.

---

## 7. Reputation Levels and Badges

### 7.1 Karma Threshold Levels

The platform defines reputation levels based on cumulative user karma. These levels provide visual recognition and serve as signals of user credibility and community participation.

| Karma Range | Reputation Level | Badge Display | Icon |
|-------------|------------------|---------------|----|
| < -50 | Notorious | ⚠️ Red warning icon | Display with caution indicator |
| -50 to -1 | Controversial | 🔴 Gray neutral circle | Display with caution indicator |
| 0 to 99 | Newbie | 🟢 Green leaf icon | Display as new member |
| 100 to 499 | Contributor | ⭐ Single gold star | Display as active contributor |
| 500 to 1,999 | Active Member | ⭐⭐ Double gold star | Display as experienced |
| 2,000 to 9,999 | Trusted Member | ⭐⭐⭐ Triple gold star | Display as highly trusted |
| 10,000 to 49,999 | Influential | 👑 Crown icon | Display as influential |
| 50,000+ | Legendary | 👑✨ Crown with sparkle | Display as legendary |

### 7.2 Reputation Level Display

WHEN a user views another user's profile, THE system SHALL display the user's current reputation level badge alongside their username.

WHEN a user views a post or comment, THE system SHALL display the author's current reputation level badge next to their name.

THE reputation level is calculated based on CURRENT karma, not historical karma.

IF a user's karma drops below a threshold, THEIR reputation level badge automatically updates to the appropriate lower level.

EXAMPLE: User with 3,000 karma has "Trusted Member" badge. If they receive enough downvotes to drop to 1,500 karma, their badge automatically changes to "Active Member."

### 7.3 Special Badges for Achievements

Beyond reputation levels, the system may award achievement badges for specific accomplishments:

| Badge | Criteria | Display | Description |
|-------|----------|---------|-------------|
| Verified Contributor | Verified email + 100+ karma + 10+ posts | ✓ Checkmark | Email verified, active contributor |
| Community Builder | Created community with 100+ members | 🏗️ Building icon | Created thriving community |
| Helpful Mentor | Received 50+ upvotes on comments | 🎓 Graduation cap | Known for helpful comments |
| Content Creator | Posted 50+ posts | 📝 Document icon | Prolific poster |
| Moderator | Appointed as community moderator | 🛡️ Shield icon | Community moderator role |
| Administrator | System administrator account | ⚙️ Gear icon | Platform admin role |
| First Post | Created 1+ posts | 🎉 Confetti | First-time poster badge |

### 7.4 Badge Prerequisites and Unlocking

WHEN a member user meets the criteria for a badge, THE system SHALL automatically award the badge.

BADGE CRITERIA: Badges are awarded based on actions and achievements, not karma milestones (unlike reputation levels).

WHEN a member user's karma drops below the threshold required for their current reputation level badge, THE system SHALL update their displayed badge to the appropriate lower level.

EXAMPLE: User with 10,500 karma displays "Influential" badge. If they receive downvotes reducing karma to 9,800, their badge remains "Influential" (still within 10,000+ range). If karma drops to 8,500, badge changes to "Trusted Member."

MULTIPLE BADGES: Users can have multiple achievement badges displayed simultaneously (one reputation level + zero or more achievement badges).

---

## 8. Karma Display and Tracking

### 8.1 User Profile Karma Display

WHEN viewing a user's profile, THE system SHALL display the following karma information:
- Current total karma score (prominently displayed)
- Reputation level badge with label
- Breakdown of post karma vs. comment karma
- Karma earned in the last 30 days (trending metric)
- All-time karma statistics

THE user's karma score SHALL be displayed prominently on their profile header.

WHEN a user views their own profile, THE system SHALL additionally display:
- Karma trends (graphical representation of karma over time)
- Top posts and comments by karma
- Recent votes and karma changes
- Karma sources (which posts/comments earned the most karma)
- Breakdown by community (karma earned in each subscribed community)

### 8.2 Post and Comment Karma Visibility

WHEN viewing a post in a feed or community, THE system SHALL display the post's net vote count prominently.

THE net vote count is displayed as: "↑ 150 ↓ 45" or simplified as "↑ 105" (net upvotes minus downvotes).

WHEN viewing a comment, THE system SHALL display the comment's net vote count alongside the comment text.

THE format for comment vote display: Small upvote/downvote indicators with count, typically "↑ 23" for a comment with 23 more upvotes than downvotes.

WHEN viewing a post or comment detail page, THE system SHALL display a breakdown showing total upvotes and total downvotes separately.

EXAMPLE: "Votes: ↑ 150 upvotes | ↓ 45 downvotes | Net: +105"

### 8.3 Karma History and Statistics

WHEN a member user accesses their profile settings or dashboard, THE system SHALL provide access to detailed karma history showing:
- Daily karma changes for the last 90 days
- All posts and comments with their individual karma
- Total karma earned from posts vs. comments
- Karma trends and averages (karma per post, karma per comment)
- Community-specific karma breakdown

THE system SHALL allow filtering karma history by time period (last week, month, 3 months, all-time).

### 8.4 Leaderboards and Rankings

THE system SHALL generate leaderboards ranking users by total karma.

WHEN viewing the global karma leaderboard, THE system SHALL display:
- Top 100 users ranked by all-time karma
- Top 100 users by karma earned in the last 30 days
- Top 100 users by karma earned in the last 7 days
- User's own rank and position within each leaderboard
- Approximate rank if user is outside top 100

WHEN viewing a community, THE system SHALL display a community-specific leaderboard showing top 50 contributors by karma earned within that community.

LEADERBOARDS: Updated every 1 hour to balance freshness with performance.

---

## 9. Vote Integrity and Fraud Prevention

### 9.1 Duplicate Voting Prevention

THE system SHALL prevent a user from casting multiple votes on the same content (each user can only have one active vote per piece of content at any given time).

WHEN a member user attempts to vote on the same content twice without changing their vote, THE system SHALL silently ignore the duplicate request and return the current vote state.

THE system SHALL use a database unique constraint on (user_id, content_id) to prevent duplicate vote records at the database level.

IF a duplicate vote request is detected, THE system SHALL return HTTP 200 OK (idempotent behavior) with the current vote information, not an error.

### 9.2 Vote Manipulation Detection

THE system SHALL monitor for suspicious voting patterns that may indicate fraud or manipulation, including:
- Multiple votes from the same IP address within an impossibly short timeframe (10+ votes in 1 second)
- Coordinated voting patterns from multiple accounts (all voting on same content within 1 minute)
- Users consistently voting in clusters or with statistical anomalies
- Rapid voting on content from the same user before other users discover it
- Users exclusively voting on content from a single creator (sockpuppet accounts)

WHEN the system detects suspicious voting patterns, THE system MAY quarantine affected votes, flag accounts for manual review, or apply temporary restrictions (implementation details are at the development team's discretion).

DETECTION MECHANISM: Automated scoring system identifies suspicious patterns and flags for review by moderators.

### 9.3 Sockpuppet Account Prevention

THE system SHALL track and analyze voting patterns to identify potential sockpuppet accounts (multiple accounts controlled by the same person used to artificially inflate votes).

THE system MAY apply protections such as:
- Requiring new accounts to wait 24-48 hours before voting
- Limiting voting privileges for accounts that have not verified their email address
- Monitoring for accounts that exclusively vote on content from a single creator
- Flagging accounts with suspiciously similar voting patterns for manual review

IMPLEMENTATION: These protections are optional and at the development team's discretion.

### 9.4 Rate Limiting on Voting

THE system SHALL implement rate limiting to prevent voting spam:

WHEN a member user casts more than 50 votes within a 5-minute window, THE system SHALL temporarily restrict that user's voting ability.

THE error message SHALL display: "You are voting too quickly. Please wait 5 minutes before voting again."

WHEN a member user is rate-limited, THE system SHALL allow voting to resume automatically after a 5-minute cooldown period.

VOTING RATE LIMITS:
- Maximum 50 votes per 5 minutes per user
- Maximum 100 votes per minute per IP address
- Moderators and admins are NOT subject to standard rate limiting when performing their duties

---

## 10. Business Rules and Validation

### 10.1 Vote Submission Validation

Before accepting a vote, the system must validate the following conditions:

1. **User Authentication**: THE user must be authenticated as a member (guests cannot vote)
2. **Content Existence**: THE content being voted on must exist and not be deleted
3. **User Authorization**: THE user must have permission to access the community containing the content
4. **Self-Voting Check**: THE user cannot be the original creator of the content
5. **Content State**: THE content must not be hidden by moderators or locked
6. **Vote Type**: THE vote must be either upvote or downvote (no other values accepted)

WHEN any validation check fails, THE system SHALL return a specific error message indicating the reason and refuse the vote.

### 10.2 Vote Consistency Rules

THE system SHALL maintain consistency between vote counts and user karma:

IF a post or comment is permanently deleted, THEN THE system SHALL remove all associated votes and recalculate affected users' karma accordingly.

IF a user's account is deleted, THEN THE system SHALL preserve vote records for audit purposes but set the user reference to null and exclude these votes from karma calculations.

IF a post or comment is restored after deletion, THEN THE system SHALL restore associated votes and recalculate karma.

CONSISTENCY CHECK: The system SHALL verify vote count accuracy weekly via background job comparing vote records to cached counts.

### 10.3 Vote Count Display Precision

THE system SHALL always display vote counts as integers (whole numbers only).

WHEN displaying vote counts in feeds or listings, THE system MAY use abbreviated formats for readability:
- 1,200 votes displays as "1.2k"
- 1,000,000 votes displays as "1M"

BUT THE system SHALL display exact counts on detail pages and in user statistics.

EXAMPLE: Post in feed shows "1.2k" upvotes, but detailed post view shows "1,247" upvotes.

---

## 11. Performance and Scalability Considerations

### 11.1 Vote Query Performance

WHEN querying vote counts for displaying posts in feeds, THE system SHOULD return results within 500 milliseconds even with millions of votes in the system.

PERFORMANCE OPTIMIZATION: THE system SHALL implement caching strategies for frequently-accessed vote counts to ensure responsive user experience.

CACHING STRATEGY:
- Vote counts cached for 5-10 minutes
- Cache invalidated immediately when vote is added/removed
- Use cache-aside pattern (check cache, miss = fetch from DB, update cache)

### 11.2 Karma Calculation Efficiency

WHEN recalculating user karma, THE system SHOULD complete the operation within 1 second.

THE system SHALL implement batching strategies for karma recalculations rather than calculating individually for each vote.

BATCHING: If 100 votes arrive in 5 seconds, batch them together for a single karma recalculation instead of 100 separate recalculations.

### 11.3 Concurrent Vote Handling

WHEN multiple users vote on the same content simultaneously, THE system SHALL handle these concurrently without data corruption or missed votes.

THE system SHALL use database-level mechanisms (row locking, atomic operations) to ensure vote count accuracy under concurrent load.

TESTING: Concurrent vote handling should be tested with 1000+ simultaneous votes on the same content.

### 11.4 Karma Calculation Under Load

THE system SHALL maintain karma calculation accuracy even with millions of concurrent votes across the platform.

ACCURACY VERIFICATION: Spot-check random user karma against manual calculation of all their content votes at least weekly.

IF discrepancies are found, THE system SHALL recalculate from source of truth (vote records) and update cached karma values.

### 11.5 Database Indexing

THE system SHALL maintain proper database indexing for optimal performance:

CRITICAL INDEXES:
- Index on (content_id) for retrieving all votes on a piece of content
- Index on (user_id) for retrieving user's voting history
- Index on (created_at) for sorting votes by time
- Composite index on (content_id, vote_type) for vote count calculation

WITH PROPER INDEXING: Queries should execute in under 100ms even with millions of vote records.

---

## 12. Integration with Other Platform Components

### 12.1 Relationship to Post Sorting

The voting system is fundamental to the post sorting algorithms defined in the [Content Sorting and Discovery document](./08-content-sorting-discovery.md). Specifically:

- The "hot" sorting algorithm relies on upvote/downvote ratios and velocity (votes per hour)
- The "top" sorting algorithm uses all-time vote counts with time window filtering
- The "controversial" sorting algorithm uses the relationship between upvotes and downvotes to surface polarizing content
- All sorting is based on accurate vote tracking and karma calculations

### 12.2 Relationship to User Karma System

The [User Management and Profiles document](./03-user-management-profiles.md) defines how karma is displayed on user profiles and integrated into user reputation. This document provides the mechanism for earning karma; that document specifies the display and profile integration.

INTEGRATION POINTS:
- Karma scores updated in real-time when votes are cast
- Reputation levels automatically calculated from current karma
- Achievement badges awarded based on karma and activity
- User statistics show karma breakdowns and trends

### 12.3 Relationship to Content Moderation

The [Content Moderation and Reporting document](./09-content-moderation-reporting.md) specifies how moderators can remove votes or manage vote-related abuse, separate from this system's core voting mechanics.

MODERATION INTEGRATION:
- Moderators can review voting patterns on suspected manipulated content
- Moderators can remove accounts engaged in vote manipulation
- Vote fraud reports go through standard moderation workflow
- Audit trail tracks all voting and karma recalculations

---

## 13. Error Handling and User Feedback

### 13.1 Vote Operation Errors

WHEN a vote operation fails, THE system SHALL return one of the following error responses:

| Error Scenario | Error Message | HTTP Status |
|----------------|---------------|--------------|
| User not authenticated | "Please log in to vote" | 401 Unauthorized |
| User is guest | "Guests cannot vote. Register to participate." | 403 Forbidden |
| Self-voting attempt | "You cannot vote on your own content" | 400 Bad Request |
| Content not found | "This content is no longer available" | 404 Not Found |
| No community access | "You don't have permission to vote on content in this community" | 403 Forbidden |
| Content deleted | "This content has been removed" | 410 Gone |
| Rate limit exceeded | "You're voting too quickly. Please wait 5 minutes." | 429 Too Many Requests |
| Invalid vote type | "Vote must be 'upvote' or 'downvote'" | 400 Bad Request |
| Content locked | "Voting is disabled on this content" | 403 Forbidden |

### 13.2 Vote Change Feedback

WHEN a user successfully votes, THE system SHALL immediately:
- Update the vote count in real-time (within 2 seconds)
- Update the user's karma display (if applicable)
- Show visual confirmation (button highlight, count update)
- Return success response to the client

WHEN a user changes their vote, THE system SHALL clearly communicate the change with:
- Updated vote count reflecting new vote type
- Visual indication of vote type change (button state change)
- Immediate karma recalculation
- Smooth animation or transition of vote count

---

## 14. Future Considerations and Extensibility

### 14.1 Weighted Voting (Future Enhancement)

The current system uses equal weighting (1 upvote = 1 karma point). Future implementations could introduce weighted voting where:
- Votes from users with higher reputation count more
- Moderator votes count differently than member votes (e.g., 1.5x weight)
- Initial votes on new content count more (recency factor)
- Expert votes in specific communities count more

THE CURRENT ARCHITECTURE: Supports these extensions without restructuring - vote weight can be added as a field.

### 14.2 Voting Filters and Hiding (Future Enhancement)

Future versions might allow users to:
- Hide heavily downvoted content automatically (threshold: -10 karma)
- Filter posts by minimum vote count (show only posts with 10+ upvotes)
- Customize personal voting thresholds

THESE FEATURES: Should be implemented as user settings without changing core voting mechanics.

### 14.3 Community-Specific Voting Rules (Future Enhancement)

Some communities might implement custom voting rules:
- Disable downvoting (upvote-only communities)
- Weighted voting for moderators in specific communities
- Custom karma calculation formulas per community
- Temporary voting locks on recent posts (no voting for 1 hour after creation)

IMPLEMENTATION: These should be configurable per-community without affecting global voting behavior.

---

## 15. Summary of Critical Requirements

| Requirement | Detail | Enforcement |
|-------------|--------|------------|
| Vote Types | Upvote and downvote only | Input validation |
| Vote Per User | One active vote per user per content piece | Database unique constraint |
| Vote Changes | Users can change votes unlimited times | No technical limit |
| Vote Removal | Users can remove votes by clicking voted button again | Toggle state management |
| Karma Formula | Net upvotes minus downvotes | Mathematical calculation |
| Self-Voting | Strictly prevented at all times | User ID validation |
| Guest Voting | Not permitted for any user without authentication | Permission check |
| Downvote Cost | Does NOT cost karma (voter unaffected) | No karma deduction for voter |
| Negative Karma | Allowed without limit (users can have -1000+) | No minimum boundary |
| Reputation Levels | 8 levels based on karma thresholds | Automatic calculation |
| Vote Fraud Prevention | IP monitoring, pattern detection, rate limiting | Automated + manual review |
| Performance | Vote display within 500ms, karma recalc within 1s | Caching + indexing |
| Audit Trail | Complete history maintained for all votes | Database logging |
| Real-Time Updates | Votes reflected within 2 seconds | Immediate processing |
| Consistency | Vote count = COUNT(upvotes) - COUNT(downvotes) | Weekly verification |

---

## 16. Related Documentation

This document works in conjunction with the following specifications:

- **[01-service-overview.md](./01-service-overview.md)** - Platform business model and vision
- **[03-user-management-profiles.md](./03-user-management-profiles.md)** - User profiles and karma display
- **[05-posts-creation-management.md](./05-posts-creation-management.md)** - Post types and lifecycle
- **[07-comments-discussions.md](./07-comments-discussions.md)** - Comments and voting integration
- **[08-content-sorting-discovery.md](./08-content-sorting-discovery.md)** - Sorting algorithms using vote data
- **[09-content-moderation-reporting.md](./09-content-moderation-reporting.md)** - Moderation of voting abuse
- **[10-user-interactions-features.md](./10-user-interactions-features.md)** - User notifications about voting

---

## Final Notes for Backend Developers

This document provides comprehensive business requirements for the voting and karma system. Implementation details, technology choices, architecture patterns, and coding approaches are entirely at your discretion.

**You have full autonomy** in selecting:
- Database technologies and optimization strategies
- API design and endpoint structure
- Caching technologies and strategies
- Programming languages and frameworks
- Deployment and scaling approaches

**This document specifies WHAT the system must do.** How you build it is your decision.

The voting and karma system is foundational to the platform's success. Ensure it handles high load, maintains accuracy, and provides real-time feedback to users.