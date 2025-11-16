# Voting and Karma System

## Introduction

This document defines the complete voting and karma system for the Reddit-like community platform. The voting system enables users to express approval or disapproval of content through upvotes and downvotes, while the karma system aggregates these votes into a reputation score that reflects user contribution quality and community standing.

The voting mechanism serves multiple purposes:
- **Content Quality Signal**: Helps surface valuable content through community consensus
- **User Reputation Building**: Rewards users who contribute quality content with karma points
- **Content Ranking Foundation**: Provides the core data for sorting algorithms (hot, top, controversial)
- **Community Self-Moderation**: Enables communities to collectively curate content quality

This system is designed to encourage positive contributions while discouraging low-quality content and spam, creating a self-regulating community environment.

## Voting Mechanics

### Upvote and Downvote Functionality

The platform supports binary voting on both posts and comments, where users can express positive approval (upvote) or negative disapproval (downvote).

**VT-001**: THE system SHALL support upvoting and downvoting for all posts in public communities.

**VT-002**: THE system SHALL support upvoting and downvoting for all comments in discussion threads.

**VT-003**: WHEN a member clicks the upvote button on content, THE system SHALL record an upvote from that user for that specific content item.

**VT-004**: WHEN a member clicks the downvote button on content, THE system SHALL record a downvote from that user for that specific content item.

**VT-005**: THE system SHALL increment the content's upvote count by 1 when an upvote is recorded.

**VT-006**: THE system SHALL increment the content's downvote count by 1 when a downvote is recorded.

**VT-007**: THE system SHALL calculate the net score as (total upvotes - total downvotes) for every piece of content.

**VT-008**: THE system SHALL update vote counts and scores in real-time without requiring page refresh.

**VT-009**: THE system SHALL visually indicate to the user which vote state is currently active for each content item (upvoted, downvoted, or no vote).

### Vote State Management

Each user can have one of three vote states for any given piece of content: upvoted, downvoted, or no vote (neutral). The system must track and manage transitions between these states.

**VT-010**: THE system SHALL maintain exactly one vote state per user per content item.

**VT-011**: THE system SHALL initialize all content with a neutral vote state (no vote) for all users.

**VT-012**: WHEN a user has not voted on content, THE system SHALL display both upvote and downvote buttons in an inactive visual state.

**VT-013**: WHEN a user has upvoted content, THE system SHALL display the upvote button in an active visual state and the downvote button in an inactive state.

**VT-014**: WHEN a user has downvoted content, THE system SHALL display the downvote button in an active visual state and the upvote button in an inactive state.

**VT-015**: THE system SHALL persist vote states across user sessions, so votes remain when users log out and log back in.

**VT-016**: THE system SHALL associate each vote record with the user ID, content ID, content type (post or comment), and timestamp.

### Vote Changing and Removal

Users can change their minds about votes, switching from upvote to downvote, removing votes entirely, or reversing previous voting decisions.

**VT-017**: WHEN a user clicks upvote on content they previously upvoted, THE system SHALL remove the upvote and return the content to neutral state for that user.

**VT-018**: WHEN a user clicks downvote on content they previously downvoted, THE system SHALL remove the downvote and return the content to neutral state for that user.

**VT-019**: WHEN a user clicks upvote on content they previously downvoted, THE system SHALL remove the downvote, add an upvote, and update the net score by +2 (removing -1 and adding +1).

**VT-020**: WHEN a user clicks downvote on content they previously upvoted, THE system SHALL remove the upvote, add a downvote, and update the net score by -2 (removing +1 and adding -1).

**VT-021**: THE system SHALL adjust vote counts atomically to prevent race conditions when users rapidly change votes.

**VT-022**: WHEN a vote is removed (clicked on active state), THE system SHALL decrement the corresponding vote count by 1.

**VT-023**: THE system SHALL record the timestamp of the most recent vote action for each user-content pair.

**VT-024**: THE system SHALL allow unlimited vote changes on any content item without time restrictions.

### Vote Restrictions by User Actor

Different user actors have different voting permissions based on their authentication status and role.

**VT-025**: WHEN a guest attempts to vote on content, THE system SHALL deny the action and display a message prompting them to log in or register.

**VT-026**: THE system SHALL allow all members to vote on any public post or comment regardless of which community it belongs to.

**VT-027**: THE system SHALL allow members to vote on their own posts and comments.

**VT-028**: THE system SHALL allow moderators to vote with the same rules as regular members (no special voting privileges).

**VT-029**: THE system SHALL prevent any user from casting multiple votes on the same content item simultaneously.

**VT-030**: WHEN a post or comment is deleted, THE system SHALL preserve historical vote data but prevent new votes on the deleted content.

## Karma System Architecture

### Karma Calculation Rules

Karma represents a user's cumulative reputation earned through community engagement. The system tracks karma separately for posts and comments, providing insight into different types of contributions.

**KA-001**: THE system SHALL calculate karma based on the net upvotes received on a user's content.

**KA-002**: THE system SHALL award 1 post karma point for each net upvote on a user's post.

**KA-003**: THE system SHALL award 1 comment karma point for each net upvote on a user's comment.

**KA-004**: WHEN a user's post receives an upvote, THE system SHALL increment that user's post karma by 1.

**KA-005**: WHEN a user's post receives a downvote, THE system SHALL decrement that user's post karma by 1.

**KA-006**: WHEN a user's comment receives an upvote, THE system SHALL increment that user's comment karma by 1.

**KA-007**: WHEN a user's comment receives a downvote, THE system SHALL decrement that user's comment karma by 1.

**KA-008**: THE system SHALL allow karma to be negative if a user's content receives more downvotes than upvotes.

**KA-009**: THE system SHALL initialize new user accounts with 0 post karma and 0 comment karma.

**KA-010**: WHEN a vote is changed from upvote to downvote, THE system SHALL adjust the content author's karma by -2 points in the appropriate category.

**KA-011**: WHEN a vote is changed from downvote to upvote, THE system SHALL adjust the content author's karma by +2 points in the appropriate category.

**KA-012**: WHEN a vote is removed entirely, THE system SHALL adjust the content author's karma by -1 if removing an upvote, or +1 if removing a downvote.

**KA-013**: THE system SHALL recalculate karma in real-time as votes are cast, changed, or removed.

**KA-014**: WHEN content is deleted by its author or a moderator, THE system SHALL NOT remove karma already earned from that content.

**KA-015**: THE system SHALL maintain karma as a permanent historical record of user contributions, even if posts or comments are later deleted.

### Post Karma vs Comment Karma

The platform maintains two separate karma metrics to distinguish between different contribution types and provide users with detailed reputation breakdowns.

**KA-016**: THE system SHALL track post karma and comment karma as separate, independent values for each user.

**KA-017**: THE system SHALL calculate total karma as the sum of post karma and comment karma.

**KA-018**: THE system SHALL never merge post karma and comment karma into a single undifferentiated score in the database.

**KA-019**: THE system SHALL attribute karma only to the original author of the content, not to users who vote on it.

**KA-020**: WHEN displaying user karma, THE system SHALL show post karma, comment karma, and total karma separately.

**KA-021**: THE system SHALL update the appropriate karma type based on the content type that received the vote.

### Karma Aggregation and Display

Karma serves as a public reputation metric visible on user profiles and throughout the platform.

**KA-022**: THE system SHALL display total karma next to usernames in post and comment displays.

**KA-023**: THE system SHALL display detailed karma breakdown (post karma and comment karma) on user profile pages.

**KA-024**: THE system SHALL format karma numbers with comma separators for readability when values exceed 999.

**KA-025**: THE system SHALL display negative karma with a minus sign prefix when users have more downvotes than upvotes.

**KA-026**: THE system SHALL update displayed karma values in real-time as votes are cast.

**KA-027**: THE system SHALL rank users by total karma for potential leaderboard features.

**KA-028**: THE system SHALL calculate karma accurately even for users with thousands of posts and comments.

## Vote Score Display

### Score Calculation and Visibility

Vote scores provide immediate feedback on content quality and community reception.

**VS-001**: THE system SHALL display the net score (upvotes minus downvotes) prominently next to every post and comment.

**VS-002**: THE system SHALL display scores as integers without decimal points.

**VS-003**: WHEN a post or comment has equal upvotes and downvotes, THE system SHALL display a score of 0.

**VS-004**: THE system SHALL display positive scores without a plus sign prefix (e.g., "42" not "+42").

**VS-005**: THE system SHALL display negative scores with a minus sign prefix (e.g., "-5").

**VS-006**: THE system SHALL use a neutral visual style for scores of 0, a positive visual style for scores above 0, and a negative visual style for scores below 0.

**VS-007**: THE system SHALL update score displays within 1 second of a vote being cast.

**VS-008**: THE system SHALL show the same score to all users viewing the same content at approximately the same time.

### Real-time Score Updates

**VS-009**: WHEN a user votes on content, THE system SHALL immediately update the displayed score without requiring a page refresh.

**VS-010**: WHEN multiple users vote on the same content concurrently, THE system SHALL accurately reflect all votes in the final displayed score.

**VS-011**: THE system SHALL handle vote updates efficiently to support hundreds of concurrent users voting on popular content.

**VS-012**: THE system SHALL display updated scores to other users viewing the same content within 2 seconds of vote changes.

**VS-013**: THE system SHALL maintain score accuracy during high-traffic periods without displaying stale or incorrect scores.

## Karma Impact on User Reputation

### Karma as Reputation Metric

Karma functions as the primary indicator of user standing and contribution quality within the community.

**KR-001**: THE system SHALL use karma as a trust signal indicating user contribution history and community acceptance.

**KR-002**: THE system SHALL display karma on user profiles to provide transparency about user reputation.

**KR-003**: THE system SHALL allow users to view any other user's karma by visiting their profile.

**KR-004**: THE system SHALL sort users by karma when generating user rankings or leaderboards.

**KR-005**: THE system SHALL preserve karma history permanently as a record of user contributions over time.

**KR-006**: THE system SHALL calculate karma based solely on community voting, with no manual adjustments by moderators or administrators.

### Karma Display on Profiles

**KR-007**: WHEN a user views a profile, THE system SHALL display the user's total karma prominently near the username.

**KR-008**: THE system SHALL display post karma and comment karma as separate line items on the profile page.

**KR-009**: THE system SHALL show karma earned from deleted content as part of the permanent karma total.

**KR-010**: THE system SHALL update profile karma displays in real-time as the user receives new votes on their content.

**KR-011**: THE system SHALL allow users to see their own karma changes over time.

## Anti-Gaming and Vote Integrity

### Vote Manipulation Prevention

The platform implements multiple safeguards to prevent artificial vote inflation and ensure voting reflects genuine community sentiment.

**AG-001**: THE system SHALL enforce a one-vote-per-user-per-content-item limit.

**AG-002**: THE system SHALL prevent users from voting on the same content from multiple accounts they control (manual moderation may be needed for enforcement).

**AG-003**: THE system SHALL log all voting activity with timestamps and user IDs for audit and fraud detection purposes.

**AG-004**: THE system SHALL monitor for suspicious voting patterns such as a single user rapidly upvoting all content from another specific user.

**AG-005**: IF a user attempts to vote on more than 100 items within 60 seconds, THEN THE system SHALL temporarily rate-limit that user's voting ability.

**AG-006**: THE system SHALL maintain vote integrity by using atomic database operations that prevent duplicate votes.

**AG-007**: THE system SHALL validate that the user making a vote request is authenticated and authorized before recording the vote.

**AG-008**: THE system SHALL reject vote requests that lack proper authentication tokens.

### Rate Limiting

**AG-009**: THE system SHALL implement rate limiting to prevent automated vote botting.

**AG-010**: WHEN a user exceeds 200 votes within a 10-minute period, THE system SHALL temporarily suspend voting for that user for 5 minutes.

**AG-011**: THE system SHALL display a user-friendly message when rate limiting is triggered, explaining the temporary restriction.

**AG-012**: THE system SHALL reset rate limit counters after the restriction period expires.

**AG-013**: THE system SHALL apply rate limiting independently for posts and comments (voting on posts doesn't count against comment vote limits).

### Suspicious Activity Detection

**AG-014**: THE system SHALL flag accounts that consistently vote on all content from specific users, indicating possible vote manipulation.

**AG-015**: THE system SHALL flag voting patterns where multiple accounts from the same IP address consistently vote together.

**AG-016**: THE system SHALL provide moderators with tools to review flagged voting activity for their communities.

**AG-017**: THE system SHALL maintain detailed logs of voting activity for at least 90 days to support fraud investigations.

**AG-018**: THE system SHALL prevent users from voting during the account creation process until their account is at least 5 minutes old.

**AG-019**: IF the system detects coordinated voting rings, THEN moderators and administrators SHALL be alerted for manual review.

## Performance Requirements

**PR-001**: THE system SHALL record vote actions within 500 milliseconds of user interaction.

**PR-002**: THE system SHALL update displayed scores within 1 second for the voting user.

**PR-003**: THE system SHALL calculate and update karma within 2 seconds of vote changes.

**PR-004**: THE system SHALL handle at least 1,000 concurrent vote requests without degradation.

**PR-005**: THE system SHALL cache frequently accessed vote counts to reduce database load.

**PR-006**: THE system SHALL return vote state information (upvoted/downvoted/neutral) for content within 200 milliseconds when loading posts or comments.

**PR-007**: THE system SHALL optimize karma calculations to support users with tens of thousands of posts and comments.

**PR-008**: THE system SHALL scale to handle millions of votes per day across the platform.

## Voting Business Scenarios

### Scenario 1: New Member First Vote

**Background**: A newly registered member encounters a helpful post in their subscribed community and wants to express appreciation.

**Preconditions**:
- User has registered and verified their email
- User is logged in with valid authentication token
- User has navigated to a community feed and is viewing posts
- User has never voted on any content before

**User Actions**:
1. User reads a post titled "Ultimate Guide to Python Web Development"
2. User finds the post extremely helpful and decides to upvote it
3. User clicks the upvote button displayed next to the post

**Expected System Behavior**:
- WHEN the user clicks the upvote button, THE system SHALL validate the user's authentication status
- THE system SHALL verify the user has not previously voted on this post
- THE system SHALL record an upvote from this user for this specific post
- THE system SHALL increment the post's upvote count by 1
- THE system SHALL recalculate the post's net score (upvotes - downvotes)
- THE system SHALL increment the post author's post karma by 1
- THE system SHALL update the upvote button visual state to "active" to indicate the user's current vote
- THE system SHALL display the updated score next to the post within 1 second
- THE system SHALL persist this vote in the database so it remains when the user logs out and returns

**Post-conditions**:
- Post upvote count increased by 1
- Post net score increased by 1
- Post author's post karma increased by 1
- User's vote state for this post is "upvoted"
- Upvote button displays in active visual state for this user
- Vote is logged with user ID, post ID, content type, and timestamp

**Business Value**: Enables new members to immediately participate in content curation, rewarding quality contributors and surfacing valuable content to the community.

### Scenario 2: Changing Vote from Upvote to Downvote

**Background**: A member previously upvoted a post but after reading comments and further reflection, believes the post contains misleading information and wants to change their vote.

**Preconditions**:
- User is authenticated with valid session
- User previously upvoted a specific post (vote state: upvoted)
- The upvote button displays in active state for this user on this post
- Post currently has net score of +47 (based on all votes from all users)
- Post author currently has 1,234 post karma

**User Actions**:
1. User returns to the post they previously upvoted
2. User reads community comments pointing out factual errors in the post
3. User decides to change their vote from upvote to downvote
4. User clicks the downvote button

**Expected System Behavior**:
- WHEN the user clicks downvote on previously upvoted content, THE system SHALL remove the existing upvote
- THE system SHALL add a downvote for this user on this post
- THE system SHALL decrement the post's upvote count by 1
- THE system SHALL increment the post's downvote count by 1
- THE system SHALL update the net score by -2 (removing +1 upvote and adding -1 downvote)
- THE system SHALL adjust the post author's karma by -2 points
- THE system SHALL update the button states: downvote button to active, upvote button to inactive
- THE system SHALL display the new score (45, decreased from 47) within 1 second
- THE system SHALL record the vote change with new timestamp

**Post-conditions**:
- Post upvote count decreased by 1
- Post downvote count increased by 1
- Post net score decreased from 47 to 45 (change of -2)
- Post author's karma decreased from 1,234 to 1,232 (change of -2)
- User's vote state for this post changed from "upvoted" to "downvoted"
- Downvote button displays in active state, upvote button inactive
- Vote change logged with updated timestamp

**Business Value**: Empowers users to correct their voting decisions as they gain new information, ensuring vote accuracy reflects current community consensus rather than initial impressions.

### Scenario 3: Removing a Vote Entirely

**Background**: A member previously downvoted a comment in a heated discussion but after reconsidering, wants to remain neutral rather than express negative sentiment.

**Preconditions**:
- User is authenticated member
- User previously downvoted a specific comment (vote state: downvoted)
- The downvote button displays in active state for this comment
- Comment currently has net score of -3
- Comment author has 567 comment karma

**User Actions**:
1. User revisits the discussion thread
2. User reflects that the comment, while they disagree, wasn't worthy of a downvote
3. User clicks the active downvote button to remove their negative vote

**Expected System Behavior**:
- WHEN the user clicks downvote on content they previously downvoted, THE system SHALL remove the downvote
- THE system SHALL return the user's vote state to neutral (no vote)
- THE system SHALL decrement the comment's downvote count by 1
- THE system SHALL update the net score by +1 (removing -1 downvote)
- THE system SHALL adjust the comment author's karma by +1 point
- THE system SHALL update both upvote and downvote buttons to inactive visual state
- THE system SHALL display the new score (-2, increased from -3) within 1 second
- THE system SHALL record the vote removal with timestamp

**Post-conditions**:
- Comment downvote count decreased by 1
- Comment net score increased from -3 to -2 (change of +1)
- Comment author's karma increased from 567 to 568 (change of +1)
- User's vote state for this comment is neutral (no vote)
- Both upvote and downvote buttons display in inactive state
- Vote removal logged with timestamp

**Business Value**: Provides users flexibility to express neutrality rather than forcing binary judgment, leading to more nuanced community sentiment representation.

### Scenario 4: Guest User Attempting to Vote

**Background**: An unauthenticated visitor discovers interesting content and attempts to vote without creating an account.

**Preconditions**:
- User is browsing as guest (not authenticated)
- User has no authentication token or session
- User is viewing a post in a public community
- Post displays vote buttons to all visitors

**User Actions**:
1. Guest user reads an interesting post about machine learning techniques
2. Guest user finds the content valuable and clicks the upvote button
3. Guest user expects to upvote the post

**Expected System Behavior**:
- WHEN a guest attempts to vote on content, THE system SHALL detect the lack of authentication
- THE system SHALL deny the vote action immediately without recording any data
- THE system SHALL display a modal or message prompting the guest to log in or register
- THE message SHALL explain: "Please log in or create an account to vote on posts and comments"
- THE system SHALL provide direct links to login and registration pages
- THE system SHALL NOT modify the post's vote counts or score
- THE system SHALL NOT modify the post author's karma
- THE system SHALL maintain the guest's current browsing position after dismissing the message

**Post-conditions**:
- No vote recorded in the system
- Post vote counts and score unchanged
- Post author karma unchanged
- Guest user presented with authentication options
- Guest can continue browsing if they decline to register

**Business Value**: Protects vote integrity by requiring authentication while encouraging guest users to register for full platform participation, driving user acquisition.

### Scenario 5: High-Volume Concurrent Voting on Viral Content

**Background**: A post reaches the platform's front page and receives hundreds of simultaneous votes as thousands of users view it.

**Preconditions**:
- A popular post has 5,000 existing votes (3,200 upvotes, 1,800 downvotes, net score: +1,400)
- Post appears on the global "Hot" feed
- 500 users are simultaneously viewing the post
- 200 users decide to vote within the same 10-second window

**Concurrent User Actions**:
- 150 users click upvote simultaneously
- 50 users click downvote simultaneously
- All 200 vote actions occur within a 10-second window
- Multiple users may submit votes in the exact same millisecond

**Expected System Behavior**:
- THE system SHALL process all 200 concurrent vote requests without data corruption
- THE system SHALL use atomic database operations to prevent duplicate or lost votes
- THE system SHALL ensure each of the 200 votes is recorded exactly once
- THE system SHALL increment upvote count by 150 and downvote count by 50
- THE system SHALL calculate new net score: 1,400 + 150 - 50 = 1,500
- THE system SHALL update post author's karma by +100 (net change from new votes)
- THE system SHALL handle vote request queue without exceeding 2-second delay for any individual user
- THE system SHALL display updated scores to all viewing users within 2 seconds of their vote
- THE system SHALL maintain system performance without degradation despite high concurrent load
- THE system SHALL log all 200 votes with individual user IDs and timestamps

**Post-conditions**:
- Post upvote count: 3,350 (increased by 150)
- Post downvote count: 1,850 (increased by 50)
- Post net score: +1,500 (increased by 100)
- Post author karma increased by 100
- All 200 users see their votes reflected in button states and displayed scores
- System performance metrics remain within acceptable thresholds
- No votes lost or duplicated

**Business Value**: Ensures platform reliability during traffic spikes, maintaining vote integrity and user trust when content goes viral, which is critical for platform reputation and user experience.

### Scenario 6: User Voting on Deleted Content

**Background**: A member attempts to vote on content that was deleted by the author or removed by moderators after the member loaded the page.

**Preconditions**:
- User loaded a post page 5 minutes ago
- Post was visible with 234 upvotes and 45 downvotes (net score: +189)
- Post author deleted the post 2 minutes ago
- Post is now marked as deleted in the database
- User has been reading comments and hasn't refreshed the page
- User decides to upvote the post

**User Actions**:
1. User finishes reading all comments on the deleted post (which they loaded before deletion)
2. User clicks the upvote button to vote on the post

**Expected System Behavior**:
- WHEN a user attempts to vote on deleted content, THE system SHALL check the content's deletion status
- THE system SHALL prevent the vote from being recorded
- THE system SHALL NOT increment vote counts for deleted content
- THE system SHALL NOT modify the post author's karma
- THE system SHALL display a message: "This content has been deleted and can no longer be voted on"
- THE system SHALL update the page display to show the content is deleted
- THE system SHALL preserve historical vote data for the deleted content (existing votes remain)
- THE system SHALL maintain the user's session and allow continued browsing

**Post-conditions**:
- No new vote recorded
- Deleted post vote counts remain at 234 upvotes, 45 downvotes
- Post author karma unchanged
- User informed that content is deleted
- Historical votes preserved for audit purposes

**Business Value**: Prevents vote manipulation on deleted content while preserving historical voting data for karma calculation and audit trails, maintaining system integrity.

### Scenario 7: Rapid Vote Changes (Flip-Flopping)

**Background**: A member rapidly changes their vote multiple times while reading ongoing discussions and comment debates about a controversial post.

**Preconditions**:
- User is authenticated member
- User is viewing a controversial political discussion post
- Post has net score of +12
- Post author has 5,678 post karma
- User's initial vote state is neutral (no vote)

**User Action Sequence**:
1. User upvotes the post (vote state: upvoted)
2. 10 seconds later, user reads critical comments and removes upvote (vote state: neutral)
3. 15 seconds later, user reads rebuttal comments and downvotes (vote state: downvoted)
4. 20 seconds later, user reconsiders and removes downvote (vote state: neutral)
5. 30 seconds later, user decides to upvote again (vote state: upvoted)
6. Final decision: upvote remains

**Expected System Behavior for Each Action**:

**Action 1 (upvote)**:
- THE system SHALL record upvote, score changes from +12 to +13, author karma increases to 5,679

**Action 2 (remove upvote)**:
- THE system SHALL remove upvote, score changes from +13 to +12, author karma decreases to 5,678

**Action 3 (downvote)**:
- THE system SHALL record downvote, score changes from +12 to +11, author karma decreases to 5,677

**Action 4 (remove downvote)**:
- THE system SHALL remove downvote, score changes from +11 to +12, author karma increases to 5,678

**Action 5 (upvote)**:
- THE system SHALL record upvote, score changes from +12 to +13, author karma increases to 5,679

**Overall System Requirements**:
- THE system SHALL allow unlimited vote changes without time restrictions
- THE system SHALL adjust vote counts atomically to prevent race conditions during rapid changes
- THE system SHALL maintain accurate karma calculations through all transitions
- THE system SHALL log each vote change with individual timestamps
- THE system SHALL update UI button states instantly with each action
- THE system SHALL not rate-limit the user for changing votes on a single piece of content

**Post-conditions**:
- Final vote state: upvoted
- Final post score: +13 (net change: +1 from initial state)
- Final author karma: 5,679 (net change: +1 from initial state)
- 5 vote actions logged with separate timestamps
- User sees upvote button in active state

**Business Value**: Respects user autonomy to refine their opinions through ongoing discussion, ensuring votes reflect current rather than initial sentiment, leading to more accurate community consensus.

## Business Rules Summary

### Voting Business Rules

1. **One Vote Per User**: Each user can cast only one vote (upvote, downvote, or neutral) per content item
2. **Vote Mutability**: Users can change or remove votes at any time without restrictions
3. **Authentication Required**: Only authenticated members can vote; guests cannot vote
4. **Self-Voting Allowed**: Users can vote on their own content
5. **No Vote Weighting**: All votes count equally regardless of the voter's karma or status
6. **Persistent Votes**: Votes remain even after logout/login cycles
7. **Real-Time Updates**: Vote scores update immediately upon voting actions

### Karma Business Rules

1. **1:1 Karma Ratio**: Each net upvote equals 1 karma point, each net downvote equals -1 karma point
2. **Separate Tracking**: Post karma and comment karma are tracked independently
3. **Permanent Karma**: Karma earned from content is never removed, even if content is deleted
4. **Negative Karma Allowed**: Users can have negative karma if they receive more downvotes than upvotes
5. **Author Attribution**: Karma goes only to the content author, not to voters
6. **No Manual Adjustment**: Karma is calculated automatically from votes; moderators cannot manually adjust karma
7. **Real-Time Calculation**: Karma updates immediately as votes are cast, changed, or removed

### Anti-Gaming Business Rules

1. **Rate Limiting**: Users who vote excessively (200+ votes in 10 minutes) are temporarily restricted
2. **Activity Logging**: All votes are logged with user ID, content ID, and timestamp for fraud detection
3. **Pattern Detection**: Suspicious voting patterns are flagged for moderator review
4. **Account Age Restriction**: New accounts must be at least 5 minutes old before voting
5. **IP Monitoring**: Coordinated voting from the same IP addresses is flagged as suspicious
6. **Atomic Operations**: Vote operations use database transactions to prevent duplicate or invalid votes

### Display and User Experience Rules

1. **Score Visibility**: All users (including guests) can see vote scores on all public content
2. **Karma Visibility**: All users can see any other user's karma on their profile
3. **Visual Feedback**: Active vote state is visually indicated to users (highlighted upvote or downvote button)
4. **Real-Time Updates**: Scores and karma update in real-time without requiring page refresh
5. **Score Format**: Scores display as integers with appropriate formatting for large numbers (commas for thousands)
6. **Karma Breakdown**: Profiles show separate post karma, comment karma, and total karma

---

*This document defines business requirements for the voting and karma system. All technical implementation decisions including database design, API architecture, and frontend interfaces are at the discretion of the development team.*