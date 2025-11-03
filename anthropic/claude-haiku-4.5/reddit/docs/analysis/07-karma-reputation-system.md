# Karma and Reputation System

## System Overview

### Karma System Purpose & Role

The karma system is the foundational reputation mechanism that measures user credibility, engagement quality, and community standing within the community platform. Karma serves multiple critical purposes:

1. **User Trust Signal**: Karma demonstrates that a user has contributed valuable content and earned community approval through upvotes
2. **Quality Incentive**: The system encourages users to create thoughtful posts and comments by rewarding upvoted content
3. **Privilege Gating**: Higher karma users gain additional capabilities and reduced restrictions
4. **Community Health**: Karma helps identify spammers and low-quality contributors through negative karma
5. **Moderation Support**: Karma-based restrictions reduce the burden on human moderators

### Reputation Mechanics Overview

The karma system operates on a points-based model where users accumulate karma through community voting on their posts and comments. Every upvote generates positive karma, while downvotes remove karma or generate negative karma. The system tracks karma globally across the entire platform and separately within individual communities.

### Global vs. Community-Specific Karma

The system maintains two types of karma for each user:

- **Global Karma**: Cumulative karma earned across all communities on the platform, representing the user's platform-wide reputation
- **Community Karma**: Karma earned within specific communities, tracking the user's standing and contribution value within that particular community

Both karma types contribute to the user's overall reputation tier and influence feature access.

### System Architecture Principles

The karma system is built on these core principles:

- **Transparency**: Users can always see how karma is calculated and what actions affect their karma
- **Fairness**: The same karma rules apply equally to all users; no user receives preferential karma treatment based on account age or other factors
- **Anti-Gaming**: The system prevents artificial karma inflation through vote manipulation detection
- **Scalability**: Karma calculations are efficient and can be computed for millions of users without performance degradation
- **Reversibility**: Moderators and admins can reverse karma changes if content is removed or user actions are deemed fraudulent

## Karma Calculation & Points System

### Karma Definition and Point Value

**WHEN** a member's post receives an upvote, **THE** system **SHALL** award the post creator 1 karma point per upvote.

**WHEN** a member's post receives a downvote, **THE** system **SHALL** deduct 1 karma point per downvote from the post creator.

**WHEN** a member's comment receives an upvote, **THE** system **SHALL** award the comment creator 1 karma point per upvote.

**WHEN** a member's comment receives a downvote, **THE** system **SHALL** deduct 1 karma point per downvote from the comment creator.

### Initial Karma for New Users

**WHEN** a new member completes registration and email verification, **THE** system **SHALL** initialize their global karma at 10 points and their karma in each community at 0 points.

The initial 10-point global karma allows new users to participate immediately without triggering low-karma restrictions that would otherwise prevent them from engaging.

### Post Upvote & Downvote Mechanics

**Post Upvote Points**: Each upvote on a post awards 1 karma point to the post author. Posts can accumulate unlimited upvotes and corresponding karma.

**Post Downvote Points**: Each downvote on a post deducts 1 karma point from the post author. Downvotes can reduce karma below the initial 10-point baseline, potentially resulting in negative karma.

**Example Scenario**: A member creates a post that receives 45 upvotes and 12 downvotes. The net karma change is +33 karma points (45 upvotes - 12 downvotes). If the member started with 10 karma, their new total is 43 karma.

### Comment Upvote & Downvote Mechanics

**Comment Upvote Points**: Each upvote on a comment awards 1 karma point to the comment author.

**Comment Downvote Points**: Each downvote on a comment deducts 1 karma point from the comment author.

**Nested Comment Consideration**: Karma calculation for nested comments (replies to other comments) follows the same rules as top-level comments. Nested depth does not affect karma earned per vote.

### Post vs. Comment Karma Weight

Post upvotes and comment upvotes are weighted equally in the global karma calculation - both award 1 karma point per upvote. However, this equal weighting can be perceived differently by users because posts typically receive more engagement and thus generate more voting activity.

**Practical Example**: A well-written comment might receive 5 upvotes (5 karma), while a popular post might receive 150 upvotes (150 karma). The system treats each vote equally, but the visibility and engagement patterns naturally result in posts contributing more to overall karma.

### Karma Bounds & Limits

**Minimum Karma**: There is no minimum karma floor. Users can have negative karma if downvotes exceed upvotes. However, extremely negative karma (below -500 points) triggers automatic account review by platform administrators.

**Maximum Karma**: There is no maximum karma cap. Users can accumulate unlimited karma over their account lifetime.

**Practical Impact**: Most active, long-time users will have karma in the hundreds or thousands. Top contributors across all communities may exceed 100,000 karma points.

## Karma Sources & Distribution

### Actions That Generate Karma

**WHEN** a community member creates a post and that post receives votes, **THE** system **SHALL** apply karma to the post creator based on the cumulative vote count using the point system described above.

**WHEN** a community member creates a comment and that comment receives votes, **THE** system **SHALL** apply karma to the comment creator based on the cumulative vote count.

**WHEN** a post is deleted by its creator or removed by moderators, **THE** system **SHALL** reverse all karma earned from that post. Users who voted on the deleted post do not have their votes reversed, but the post creator loses the associated karma.

**WHEN** a comment is deleted by its creator or removed by moderators, **THE** system **SHALL** reverse all karma earned from that comment.

### Post Creation and Reception

Posts are the primary karma generator for users who create substantial content. When a member creates a post in any community:

1. The post is authored and visible to community members
2. Community members can upvote or downvote the post
3. Each vote modifies the post creator's karma immediately
4. The karma contribution persists as long as the post exists

**High-Impact Posts**: A particularly insightful post in a large community might receive 500+ upvotes, generating 500 karma points for the author in a single post.

**Low-Impact Posts**: A post that generates equal upvotes and downvotes produces no net karma change.

### Comment Creation and Reception

Comments typically generate karma more frequently than posts because members create many more comments than posts. Each comment a member writes is an opportunity to earn or lose karma.

**Comment Visibility**: Comments on popular posts receive more visibility and thus more voting activity. A thoughtful comment on a trending post might earn 50+ karma points.

**Nested Reply Impact**: Nested replies to other comments follow the same karma mechanics. A member's reply to another user's comment earns karma based on votes received, regardless of nesting depth.

### Community-Specific Karma Gains

**WHEN** a member receives upvotes on a post in Community A, **THE** system **SHALL** add karma to both their global karma total AND their Community A-specific karma total.

**WHEN** a member receives upvotes on a comment in Community B, **THE** system **SHALL** add karma to both their global karma total AND their Community B-specific karma total.

**WHEN** a member has not participated in Community C, **THE** system **SHALL** initialize their Community C karma at 0 points upon their first post or comment in that community.

**Community Specialization**: A member might have high karma in "technology" communities but low karma in "cooking" communities if their contributions are concentrated in tech-related content.

### Karma Loss Mechanisms

**WHEN** a member's post or comment is downvoted, **THE** system **SHALL** deduct 1 karma point per downvote from their total karma.

**WHEN** a member's post is deleted or removed, **THE** system **SHALL** reverse all karma earned from that post, deducting it from their current total.

**WHEN** a member receives a moderation warning or temporary suspension, **THE** system **MAY** deduct a portion of their recent karma gains (up to 25% of last 30 days) as a penalty, if approved by platform administrators.

**WHEN** a member is permanently banned, **THE** system **SHALL** reduce their karma to 0 and flag their account so no new karma can be earned or accumulated.

### Negative Karma Scenarios

Members can have negative karma if their downvotes exceed their upvotes. Negative karma typically indicates:

1. **Spam or Low-Quality Content**: The member frequently creates posts or comments that the community rejects
2. **Controversial Opinions**: The member expresses views that the community disagrees with (though this is a natural consequence of Reddit-like voting)
3. **Harassment or Abuse**: The member violates community standards and gets downvoted and reported

**Negative Karma Visibility**: Members with negative karma (below -100) are prominently flagged in the system. Their posts may be hidden by default in some communities or require additional review.

**Recovery from Negative Karma**: Members can recover from negative karma by creating valuable content that receives upvotes. There is no maximum recovery limit.

## Karma Decay & Expiration

### Decay Mechanics and Rationale

The karma system includes a decay mechanism that slowly reduces karma earned long ago. This ensures that karma reflects recent contributions and current standing rather than just historical achievements.

**Rationale**: A user who was active and contributed valuable content five years ago but has been inactive ever since should not maintain the same privileges as an actively engaged user. Decay encourages ongoing participation.

### Decay Calculation Over Time

**WHILE** a member's account exists and karma has been accumulated, **THE** system **SHALL** apply a decay factor to karma earned more than 180 days ago.

Specifically, the decay formula operates as follows:

- Karma earned 0-180 days ago: 100% of karma value retained
- Karma earned 181-365 days ago: 90% of karma value retained
- Karma earned 366-730 days ago (1-2 years): 80% of karma value retained
- Karma earned 731+ days ago (2+ years): 70% of karma value retained

Decay is calculated continuously, not in discrete steps. A piece of karma gradually decays over 180 days after the post/comment was made.

**Example Scenario**: A member earned 100 karma from a post 200 days ago. This karma is subject to decay because it's beyond the 180-day threshold. The decay reduces it to 95 karma (90% of 100, applying the 181-365 day multiplier). As days pass, this karma continues decaying until it reaches the 70% floor after 2 years.

### Inactive Account Considerations

**IF** a member has not posted or commented for 365 days (1 year), **THEN** their entire karma accumulation (except the initial 10 points) **SHALL** be subject to the maximum 70% decay rate.

**IF** a member returns to activity after being inactive for 365+ days, **THEN** their karma is recalculated with decay applied. Upon their return, decay pauses and restarts only after another 180 days of inactivity relative to new contributions.

### Decay Reset Mechanisms

**WHEN** a member creates a new post or comment after a period of inactivity, **THE** system **SHALL** reset the decay timer for new karma earned from that content, starting the 180-day clock fresh for those new points.

This means members can maintain higher karma by staying active. The decay system incentivizes regular participation without punishing occasional returns.

## Reputation Tiers & Badges

### Reputation Tier Definitions

The platform includes five reputation tiers based on global karma. Each tier represents a user's standing and unlocks additional privileges:

| Tier | Karma Range | Name | Color |
|------|-------------|------|-------|
| 1 | 10 - 99 | Bronze | Standard Gray |
| 2 | 100 - 499 | Silver | Light Silver |
| 3 | 500 - 1,999 | Gold | Bright Gold |
| 4 | 2,000 - 9,999 | Platinum | Light Blue |
| 5 | 10,000+ | Diamond | Cyan/Sparkle |

### Tier Transitions

**WHEN** a member's global karma crosses into a higher tier threshold, **THE** system **SHALL** automatically update their tier status and display the new tier on their profile.

**WHEN** a member's global karma drops below a tier threshold due to decay or karma loss, **THE** system **SHALL** update their tier to the appropriate lower tier.

**Tier Visibility**: Members can see their current tier on their profile, in user cards when viewing posts/comments, and in community moderator lists.

### Badge System Overview

Badges are special achievements that recognize specific accomplishments beyond general karma levels. Badges complement karma tiers by highlighting specific types of contributions.

### Badge Types and Earning Conditions

**Verified Expert Badge** (Gold star icon)
- **WHEN** a member reaches 5,000+ karma in a specific community over any time period, **THE** system **SHALL** award the "Verified Expert" badge for that community
- The badge appears on the member's profile with the community name
- Multiple expert badges can be earned in different communities

**Helpful Contributor Badge** (Thumbs up icon)
- **WHEN** a member receives 1,000+ total upvotes on comments (regardless of downvotes), **THE** system **SHALL** award the "Helpful Contributor" badge
- This badge recognizes thoughtful commenting and engagement

**Content Creator Badge** (Document icon)
- **WHEN** a member creates 100+ posts with an average vote ratio of positive (more upvotes than downvotes), **THE** system **SHALL** award the "Content Creator" badge
- This badge recognizes prolific posting of well-received content

**Community Builder Badge** (People icon)
- **WHEN** a member is the creator of a community that reaches 1,000+ subscribers, **THE** system **SHALL** award the "Community Builder" badge
- Communities are named on the badge for context

**Moderator Badge** (Shield icon)
- **WHEN** a member is appointed as a community moderator, **THE** system **SHALL** award the "Moderator" badge for that community
- This badge appears alongside their name in moderated communities
- Multiple moderator badges can be earned for different communities

**Anniversary Badge** (Cake icon)
- **WHEN** a member's account reaches its 1-year, 5-year, or 10-year anniversary, **THE** system **SHALL** award "1 Year Member," "5 Year Member," or "10 Year Member" badges respectively
- These badges recognize long-term platform loyalty

### Badge Display & Visibility

Badges are displayed:
- On the user's profile page
- Next to the user's name in posts and comments they create
- In user cards when hovering over usernames
- In leaderboards and ranking displays

Badges are sorted by importance (Moderator first, then Verified Expert, then others) to ensure the most relevant badges are visible first.

## Karma-Based Privileges & Restrictions

### Low-Karma User Restrictions

**WHEN** a member has karma between 10-49 karma points, **THE** system **SHALL** apply the following restrictions:

1. **Post Creation Rate Limiting**: The member can create at most 5 posts per day in any community
2. **Comment Creation Rate Limiting**: The member can create at most 20 comments per day across all communities
3. **Cross-Community Posting**: The member can only post in communities where they have at least 10 community karma
4. **New Community Restriction**: The member cannot create new communities; they must reach 100+ karma first

**Rationale**: These restrictions prevent spam from brand-new accounts while allowing legitimate new users to participate.

### Mid-Karma User Abilities (50-499 Karma)

**WHEN** a member has between 50-499 karma points, **THE** system **SHALL** remove the rate limits and allow normal posting and commenting.

At this karma level, members can:
- Create unlimited posts per day
- Create unlimited comments per day
- Post in any community they are subscribed to
- Create new communities (but new communities start with limited visibility)
- Access advanced community tools (if they become a moderator)

### High-Karma User Privileges (500+ Karma)

**WHEN** a member has 500+ karma points, **THE** system **SHALL** grant additional privileges:

1. **Community Creation**: High-karma users can create new communities that immediately appear in community discovery
2. **Moderator Eligibility**: High-karma users become eligible for community moderator appointment
3. **Moderation Tools**: High-karma users can access enhanced moderation tools in communities they moderate
4. **Featured Content**: High-karma users' posts can be featured or pinned by moderators more easily
5. **Custom Flair**: High-karma users can set custom user flair (display name customization)

### Community Moderator Karma Requirements

**WHEN** a community moderator position becomes available or a member applies for moderation, **THE** system **SHALL** require the applicant to have:

1. At least 500+ global karma
2. At least 200+ community karma in the specific community they wish to moderate
3. An account age of at least 90 days

These requirements ensure moderators are experienced, committed, and trustworthy.

### Platform Admin Karma Considerations

Platform administrators are appointed by the system operator and are not bound by karma requirements. However:

- Admins typically have extremely high karma (100,000+)
- Admins bypass all karma-based restrictions for administrative duties
- Admin actions are logged separately and do not affect the admin's personal karma

## Community-Specific Karma

### Community-Level Karma Tracking

**WHEN** a member creates a post or comment in Community A, **THE** system **SHALL** track and maintain Community A-specific karma separately from the member's global karma.

**Purpose**: Community-specific karma allows members to be recognized as experts in particular communities even if their global karma is moderate.

### Community Karma Contributions

Each community tracks:
- **Total Community Karma**: The sum of all karma earned from posts and comments in that community
- **Community Rank**: The member's rank within that community based on community karma (1st, 2nd, 3rd, etc.)
- **Community Status**: Whether the member is a verified expert, contributor, or established member in that community

### Community Moderator Status Based on Community Karma

**WHEN** a member has 200+ karma in a specific community, **THE** system **SHALL** mark them as eligible for moderator consideration in that community.

Community moderators are typically selected from members with high community karma, as this indicates deep knowledge and engagement with community-specific topics.

### Karma Transferability Between Communities

Karma is NOT transferable between communities. A member with 5,000 karma in r/technology has 0 karma when they first post in r/cooking, starting from the initial 10-point baseline.

However, global karma DOES aggregate across all communities and influences global privileges like community creation and tier assignment.

## Karma Visibility & Transparency

### User Profile Karma Display

**WHEN** a member views another member's profile, **THE** system **SHALL** display:

1. **Global Karma**: The member's total karma across all communities
2. **Reputation Tier**: The member's current tier (Bronze through Diamond) with visual indicator
3. **Earned Badges**: All earned badges with descriptions
4. **Community Rankings**: List of communities where the member has 50+ community karma, ranked by amount
5. **Post/Comment Statistics**: Total posts, total comments, average upvote ratio
6. **Account Age**: How long the account has existed

### Karma History and Breakdown

**WHEN** a member accesses their own profile, **THE** system **SHALL** provide a detailed karma breakdown showing:

1. **Karma by Time Period**: Karma earned in last 7 days, 30 days, 90 days, all time
2. **Karma Sources**: Breakdown of karma from posts vs. comments
3. **Top Posts**: List of 10 highest-voted posts with their karma contribution
4. **Top Comments**: List of 10 highest-voted comments with their karma contribution
5. **Community Breakdown**: Karma earned in each community

This breakdown is only visible to the member themselves and moderators.

### Leaderboards and Ranking

**WHEN** a member navigates to leaderboard pages, **THE** system **SHALL** display:

1. **Global Leaderboard**: Top 100 members by global karma across all time
2. **Community Leaderboards**: Top 50 members by community karma in each specific community
3. **Time-Based Leaderboards**: Top members by karma earned in last 7 days, 30 days, 90 days
4. **Tier-Based Rankings**: Top members within each reputation tier

**Leaderboard Transparency**: Leaderboards are publicly viewable to all users, showing members their standing and encouraging positive competition.

### Public vs. Private Karma Information

**Publicly Visible**:
- Global karma (shown on profiles and in post/comment displays)
- Reputation tier (displayed prominently)
- Earned badges (shown on profiles)
- Community rankings (if they have significant community karma)
- Account age

**Private/Limited Access**:
- Detailed karma history and breakdowns (only visible to the member and moderators)
- Negative karma warnings (not displayed publicly, but triggers restrictions)
- Karma decay calculations (transparent to member, hidden from others)

### Karma Audit Trail

**THE** system **SHALL** maintain a complete audit trail of all karma changes, including:

- Date and time of karma change
- Source (upvote, downvote, deletion, moderator adjustment, decay)
- Amount of change
- Post/comment ID if applicable
- Moderator notes if moderator-initiated

Members can request their full karma audit trail from their settings page. Moderators and admins can view audit trails for any user as part of moderation duties.

## Karma Management & Recovery

### Karma Reset Scenarios

**WHEN** a member's content is determined to be spam or violates platform policies, **THE** system OR a moderator/admin **MAY** reverse karma earned from that content:

- **Content Removal**: If a post/comment is removed for policy violation, all associated karma is reversed
- **Account Suspension**: Temporary suspension (7-30 days) may include a 25% penalty to recent karma gains
- **Community Ban**: Removal from a community reverses community-specific karma earned in that community (global karma unaffected)

### Moderator Karma Adjustment

**WHEN** a community moderator determines that a user engaged in vote manipulation or other fraudulent activity, **THE** moderator **MAY** submit a karma adjustment request to platform administrators.

Admins can then:
- Reverse specific karma amounts with moderation notes
- Flag the account for ongoing monitoring
- Issue warnings to the user
- Apply restrictions or temporary suspensions

All moderator karma adjustments are logged and require admin approval.

### Admin Karma Management Tools

Platform administrators have access to tools for:

1. **Karma Audit**: View complete karma history for any user
2. **Selective Reversal**: Remove karma from specific posts/comments without removing the content
3. **Account-Level Adjustment**: Add or remove karma in bulk for policy violations
4. **Decay Override**: Disable or adjust decay for specific accounts
5. **Tier Forcing**: Manually set a user's tier (rarely used, only for emergency situations)

All admin actions are logged with timestamps and reasons for audit purposes.

### Karma Appeals and Disputes

**IF** a member believes their karma was incorrectly reduced or reversed, **THE** system **SHALL** provide an appeal mechanism:

1. Member submits appeal through their account settings
2. Platform admins review the appeal with original moderator notes
3. Admin makes determination: Sustain original action or reverse it
4. Member is notified of appeal decision with explanation

Appeals are processed within 7 business days.

### Account Recovery After Suspension

**WHEN** a member returns to the platform after a temporary suspension, **THE** system **SHALL**:

1. Restore their account with all previous karma intact
2. Reset rate limits and restrictions
3. Allow normal posting/commenting immediately
4. NOT apply any additional karma penalties upon return

The suspension penalty is applied at the time of suspension, not upon reactivation.

## Business Rules & Edge Cases

### Minimum Activity Requirements

**WHEN** a user account has been created but the member has never posted or commented, **THE** system **SHALL** NOT include them in karma calculations or leaderboards.

Karma tiers and privileges only apply to members with at least one piece of content (post or comment).

### Vote Fraud Prevention

**THE** system **SHALL** detect and prevent common vote manipulation tactics:

**Self-Voting Prevention**: **WHEN** a member attempts to upvote their own post or comment, **THE** system **SHALL** reject the vote and display an error message. Members cannot vote on their own content.

**Coordinated Voting Detection**: **IF** a post receives more than 50 upvotes from the same community in less than 1 hour, **THE** system **SHALL** flag it for admin review to detect potential vote rings or bot activity.

**Vote Reversal for Fraud**: **IF** vote fraud is detected, **THE** system **SHALL** reverse fraudulent votes and associated karma, plus apply a temporary suspension to the involved accounts.

### Self-Voting Restrictions

**WHEN** a user creates a post or comment, **THE** system **SHALL** automatically prevent them from upvoting or downvoting their own content.

If a user attempts to downvote their own content to artificially lower their karma (in rare cases), the system rejects this action.

### Deleted Content Karma Handling

**WHEN** a member deletes their own post or comment, **THE** system **SHALL**:

1. Reverse all karma associated with that content
2. Preserve the deletion in audit logs
3. Show "deleted by user" to other members who saw the content
4. Return upvote credit to users who upvoted the now-deleted content (they don't lose their vote)

**WHEN** a moderator or admin removes content for policy violations, **THE** system **SHALL**:

1. Reverse all karma associated with the removed content
2. Log the removal with reason code
3. Notify the user that their content was removed
4. Mark the content as "removed by moderators" to other members

### User Ban Karma Impact

**WHEN** a member is permanently banned from the platform, **THE** system **SHALL**:

1. Set their karma to 0
2. Prevent any future karma accumulation
3. Remove them from all leaderboards
4. Archive their content as "posted by banned user"
5. Preserve all deletion and ban records for compliance purposes

Temporary bans do not reset karma to 0 but may apply partial penalties as described in the Karma Reset Scenarios section.

## Integration with Other Systems

### Post-Voting Relationship
- When members vote on posts, THE post's karma score is updated in real-time
- THE voting system is detailed in the [Commenting & Engagement System](./06-commenting-engagement.md)
- Post karma directly contributes to global and community-specific karma totals

### Comment-Voting Relationship
- When members vote on comments, THE comment's karma score is updated in real-time
- Comment voting mechanics are detailed in the [Commenting & Engagement System](./06-commenting-engagement.md)
- Comment karma contributes equally to post karma in tier and privilege calculations

### Content Discovery Integration
- Sorting algorithms use karma as a ranking factor in [Content Discovery & Sorting](./08-content-discovery-sorting.md)
- Post karma influences "Top" and "Controversial" sorting calculations
- User karma influences search result ranking and recommendations

### Moderation System Integration
- Moderation actions that remove content trigger karma reversal
- THE Moderation & Reporting System is detailed in [Moderation & Reporting](./09-moderation-reporting.md)
- Moderators can adjust karma for policy violations
- Platform admins maintain complete audit trails of karma changes

### User Profile Integration
- User profiles display karma and tier information detailed in [User Profiles & Preferences](./10-user-profiles-preferences.md)
- Badges and leaderboards are displayed on user profiles
- Community-specific karma rankings appear in profile community lists

---

*Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, caching strategies, karma calculation engines, etc.) are at the discretion of the development team.*