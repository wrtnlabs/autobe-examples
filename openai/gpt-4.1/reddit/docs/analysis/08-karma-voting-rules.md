# Karma, Voting, and Content Ranking Business Rules for Community Platform

## Introduction
Karma and voting are foundational to a Reddit-like community platform, designed to incentivize positive contributions, surface quality content, and build trust through transparent, fair, and abuse-resistant mechanisms. This document defines the concrete business logic, requirements, and user-facing rules for karma calculation, voting flows, and content ranking that guide the platform’s integrity and growth.

## User Karma Calculation Rules
Karma serves as both a reputation metric and reward system for user participation. Its calculation and application must be fair, transparent, and tamper-resistant.

### Karma Types and Visibility
- THE platform SHALL assign each user two primary karma scores: post karma and comment karma, as well as a total karma displayed on profiles.
- THE system SHALL display post, comment, and total karma on each user’s profile.
- WHEN a user submits or deletes a post or comment, THE system SHALL adjust their respective karma in real-time.
- THE system SHALL offer community-based karma if local ranking per community is a desired feature, shown on the user’s community page.

### Karma Sources and Sinks
#### Positive Karma (Sources)
- WHEN a user’s post receives an upvote, THE system SHALL increment the user’s post karma by 1.
- WHEN a user’s comment receives an upvote, THE system SHALL increment the user’s comment karma by 1.
- WHEN a user’s post or comment receives multiple upvotes, THE system SHALL increment karma by the net upvote count (upvotes minus downvotes).

#### Negative Karma (Sinks)
- WHEN a user’s post receives a downvote, THE system SHALL decrement the user’s post karma by 1.
- WHEN a user’s comment receives a downvote, THE system SHALL decrement the user’s comment karma by 1.
- WHEN a user deletes their post or comment, THE system SHALL decrement their karma by the net votes the deleted content had accrued.
- IF karma would drop below zero, THEN THE system SHALL allow negative karma to indicate poor standing, unless otherwise specified.

### Special Karma Adjustments and Business Rules
- WHEN a user’s post or comment is removed for violating community rules, THE system SHALL remove any associated karma from that content.
- WHEN a moderator restores content, THE system SHALL restore previously lost karma if votes remain.
- WHERE moderators adjust karma for moderation actions, THE system SHALL keep a log for audit purposes.
- WHEN a user receives karma, THE system SHALL update their karma within 3 seconds of the event.
- WHEN a user’s content is heavily downvoted or reported for abuse, THE system SHALL flag their account if net karma drops below a configurable threshold (e.g., -50).
- WHERE required for abuse analysis, THE system SHALL provide an API to export karma logs for administrative review.

## Upvoting and Downvoting Logic
Voting is central to content discovery and community curation. Voting flows must be transparent, rate-limited, and permission-controlled per actor.

### Voting Actors and Permissions
- Users (registered) SHALL be allowed to upvote or downvote posts and comments, subject to community restrictions.
- Moderators and administrators SHALL have the same voting rights as regular users, but moderator votes SHALL NOT carry additional weight in karma calculation unless explicitly configured.
- Non-authenticated guests SHALL NOT be able to vote.

### Voting Rules and Rate Limits
- WHEN a user upvotes or downvotes, THE system SHALL increment/decrement the content’s vote count and update author karma accordingly.
- THE system SHALL allow a user to vote only once per post or comment; subsequent votes by the same user SHALL toggle or revert their previous vote (upvote to downvote or remove vote entirely).
- THE system SHALL enforce a rate limit (e.g., 60 votes/hour/user) to prevent spam and bot voting.
- WHERE a user votes multiple times within the rate limit, THE system SHALL allow these votes but SHALL never exceed one recorded vote per user per content item.
- IF a user attempts to vote on the same content more than once without toggling, THEN THE system SHALL return an error indicating “Already voted.”
- IF a user attempts to exceed their voting rate limit, THEN THE system SHALL block additional votes and return an error: “Voting rate limit exceeded.”
- THE system SHALL allow vote changes up to 24 hours after the initial vote; after this window, votes become locked.
- IF a user attempts to vote on their own content, THEN THE system SHALL reject the action and return an error: “Cannot vote on own content.”

### Voting Transparency and Display
- THE system SHALL display the current aggregate vote count for each post and comment.
- WHERE community configuration hides scores for new content, THE system SHALL follow community-specific display rules.
- WHEN a vote is cast, THE system SHALL reflect the vote outcome to the user within 2 seconds for real-time feedback.
- WHEN content is edited after votes are cast, THE system SHALL retain the original voting.

## Content Sorting and Ranking
Sorting rules determine what users see. Sorting must align with user expectations, business value, and fairness. The primary sorting options are “Hot,” “New,” “Top,” and “Controversial.”

### Sorting by Hot
- THE system SHALL provide “Hot” sorting to surface trending content, balancing recency and votes.
- Hot sorting SHALL rank items by a formula combining vote score and post age, giving higher rank to recent, highly upvoted content.
- THE exact formula for “Hot” MUST NOT be disclosed publicly to prevent gaming but SHALL be auditable for business oversight.

### Sorting by New
- THE system SHALL provide “New” sorting that orders content strictly by creation time, newest first.
- WHEN viewing “New,” THE system SHALL update the order in real-time as new content is submitted.

### Sorting by Top
- THE system SHALL provide “Top” sorting by cumulative net votes (upvotes minus downvotes) over specified intervals (e.g., daily, weekly, all time).
- Users SHALL be able to select a time range; THE system SHALL recalculate rankings with each selection.
- Ties in votes SHALL be broken by recency (newer first).

### Sorting by Controversial
- THE system SHALL provide a “Controversial” sorting mode ranking posts and comments with large numbers of both upvotes and downvotes (i.e., highly polarizing content).
- THE system SHALL use a business-defined formula to rank controversial content and SHALL adjust it as needed to best reflect genuine disagreement (not random noise or coordinated attack).

### Community and Personalized Ranking
- WHERE a community sets custom sorting preferences, THE system SHALL allow community moderators to define local default sorting.
- WHERE user personalization is supported, THE system SHALL use user karma, subscribed communities, and voting history to recommend content, subject to privacy and explainability rules.

## Abuse Prevention and Detection
Safeguarding the fairness and integrity of karma and voting is critical.

### Anti-Abuse Mechanisms
- WHEN a single user attempts more than the allowed votes on content, THE system SHALL block and log the attempt.
- THE system SHALL detect rapid, repeated voting from the same IP, bot-like behaviors, or coordinated actions (“brigading”) and flag for investigation.
- WHEN networked accounts upvote/downvote the same content together, THE system SHALL use anomaly detection thresholds to suspend suspicious votes pending review.
- THE system SHALL track and rate-limit new accounts’ voting ability and karma gains to prevent “karma farming.”
- WHEN abuse is suspected, THE system SHALL lock or revert affected votes and notify administrators within 1 hour.
- WHERE required, THE system SHALL maintain an immutable audit log of votes, flagged actions, and karma changes for investigation.

### Moderator and Admin Oversight
- Moderators SHALL receive automated alerts when content in their community undergoes unusual voting or karma swings.
- Administrators SHALL have global access to abuse detection dashboards and karma audit logs.
- WHEN a dispute arises over voting or karma consequences, THE system SHALL allow admins to manually adjust votes or karma with full logging and alerting.

## Error Scenarios and User Recovery
Ensuring high trust and clarity during errors is essential.

- IF a user is rate-limited or otherwise prevented from voting, THEN THE system SHALL display a clear explainer and recovery action (e.g., try again later).
- IF backend storage failure or lag occurs, THEN THE system SHALL show a temporary error, retry up to 3 times, and inform the user if unsuccessful.
- WHEN a user’s vote or karma change is not instantly reflected, THE system SHALL retry in the background and notify the user upon completion or persistent failure.
- IF a user’s account is flagged due to karma manipulation or abuse, THEN THE system SHALL inform the user and provide appropriate follow-up or appeal workflows.

## Performance and User Experience
- WHEN a user takes a voting or karma action, THE system SHALL update the related count on screen within 2 seconds for perceived real-time responsiveness.
- THE system SHALL guarantee backend consistency for all voting and karma actions within 3 seconds of request.
- Karma and vote totals SHALL always match in UI and backend within 5 seconds of any action.
- User reports of mismatched counts SHALL generate an immediate review task for technical support.

## Mermaid Diagram: Voting and Karma Flow
```mermaid
graph LR
  subgraph "Voting Flow"
    U["User Action (Upvote/Downvote)"] --> V["Validate Vote Permissions"]
    V --> RL{"Rate Limit Exceeded?"}
    RL --|"No"|--> PV["Process Vote"]
    RL --|"Yes"|--> ER1["Show Rate Limit Error"]
    PV --> RAC{"Repeat Vote/Toggle?"}
    RAC --|"Yes"|--> RT["Toggle Vote / Remove Previous Vote"]
    RAC --|"No"|--> AV["Add Vote"]
    AV --> PA["Adjust Author Karma"]
    RT --> PA
    PA --> UD["Update Display"]
    ER1 --> UD
  end
  subgraph "Abuse Detection"
    PV --> AC["Abuse Check (IP, Pattern, New Account)"]
    AC --|"Suspicious"|--> FL1["Flag/Review, Lock Votes"]
    AC --|"Clean"|--> PA
  end
```

## Business-Level Success Criteria
- THE system SHALL ensure that karma and voting rules incentivize honest contribution and meaningful community engagement.
- THE business SHALL review karma and voting analytics quarterly to calibrate thresholds and formulas to maximize fairness and retention.

