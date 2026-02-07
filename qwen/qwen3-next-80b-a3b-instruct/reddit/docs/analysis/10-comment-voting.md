# Comment Voting Requirements

## Overview

The comment voting system enables community members to express approval or disapproval of comments, influencing content visibility and user reputation. The system must provide fair, transparent, and abuse-resistant mechanisms for voting, with distinct sorting algorithms to surface the most relevant comments based on different criteria. Voting directly impacts comment visibility and indirectly influences user karma through its relationship with the core karma system.

## Core Voting Mechanics

WHEN a member submits a vote on a comment, THE system SHALL record the vote according to the following rules:

- THE system SHALL allow only one active vote per member per comment
- THE system SHALL accept two vote types: upvote and downvote
- THE system SHALL record the time of each vote
- THE system SHALL associate each vote with the member's unique identifier
- THE system SHALL prevent voting on comments by non-authenticated users (guests)
- THE system SHALL prevent voting on comments that have been deleted
- THE system SHALL prevent voting on comments belonging to communities where the member is banned
- THE system SHALL prevent comments from being voted on if they belong to a community that has been suspended

## One-Vote-Per-Comment Rule

WHEN a member attempts to vote on a comment they have already voted on, THE system SHALL:

- IF the new vote is identical to the existing vote, THEN THE system SHALL ignore the request and return a "vote unchanged" status
- IF the new vote is different from the existing vote, THEN THE system SHALL:
  - Remove the existing vote
  - Record the new vote
  - Adjust the comment's score by -1 (for removing previous vote) and +1 (for new vote)
  - Adjust the member's karma by -1 (removing previous impact) and +1 (adding new impact)
- THE system SHALL update the comment's score immediately after vote modification

WHILE a member has an existing vote on a comment, THE system SHALL NOT allow the member to submit a second vote without first changing or removing their existing vote

## Vote Type Changes

WHEN a member changes their vote on a comment, THE system SHALL:

- IF member had an upvote and submits a downvote, THEN THE system SHALL:
  - Decrease comment score by 2 (remove +1, add -1)
  - Decrease member karma by 2 (remove +1, add -1)
- IF member had a downvote and submits an upvote, THEN THE system SHALL:
  - Increase comment score by 2 (remove -1, add +1)
  - Increase member karma by 2 (remove -1, add +1)
- THE system SHALL record the modification timestamp
- THE system SHALL maintain audit trail of all vote changes
- THE system SHALL not alter the vote history of other members

## Vote Removal Process

WHEN a member removes their vote on a comment, THE system SHALL:

- IF member had an upvote, THEN THE system SHALL decrease comment score by 1 and decrease member karma by 1
- IF member had a downvote, THEN THE system SHALL increase comment score by 1 and increase member karma by 1
- THE system SHALL delete the membership-vote relationship
- THE system SHALL record the removal timestamp and reason (user-initiated)
- THE system SHALL update the comment score immediately
- THE system SHALL ensure the member cannot re-vote until an explicit new vote is submitted

## Vote Score Calculation

THE comment score SHALL be calculated as:

- comment_score = total_upvotes - total_downvotes
- THE score SHALL be displayed as an integer
- THE score SHALL not be cached
- THE score SHALL be recalculated from the database every time the comment is retrieved
- THE system SHALL update comment score atomically when votes are added, changed, or removed
- THE system SHALL prevent manual manipulation of comment score through any API or interface

## Sorting Algorithms

Comment sorting on a post page SHALL support three modes: Best, New, Controversial. Each mode determines content presentation according to distinct business logic.

### Best Sort Algorithm

WHEN comment sorting is set to "Best", THE system SHALL:

- Arrange comments by vote score in descending order (highest first)
- For comments with identical scores, sort chronologically by creation timestamp with newest first
- THE system SHALL apply no time decay to scores
- THE system SHALL include comments from all depths of nesting
- THE system SHALL rank replies directly under their parent comment based on their score
- THE system SHALL prioritize high-vote comments regardless of age
- THE system SHALL not apply any bias toward comments by moderators or community owners

### New Sort Algorithm

WHEN comment sorting is set to "New", THE system SHALL:

- Arrange comments chronologically by creation timestamp in descending order (newest first)
- THE system SHALL ignore vote scores entirely when sorting
- THE system SHALL include comments from all depths of nesting
- THE system SHALL display replies in the order they were created, grouped under their parent
- THE system SHALL prioritize recency over popularity

### Controversial Sort Algorithm

WHEN comment sorting is set to "Controversial", THE system SHALL:

- Calculate controversy score for each comment using:

  controversy_score = total_downvotes + total_upvotes

- Arrange comments by controversy_score in descending order (most controversial first)
- WHERE controversy_score is equal, sort by absolute value of vote_score in ascending order (closest to zero first)
- WHERE controversy_score and vote_score are equal, sort chronologically by creation timestamp with newest first
- THE system SHALL apply no time decay
- THE system SHALL include comments from all depths of nesting
- THE system SHALL identify and surface comments with high engagement but balanced approval/disapproval
- THE system SHALL not modify the actual vote score, only use it for ranking

## Vote Display

THE system SHALL display the comment vote score in the following manner:

- Show the integer score immediately below the comment text
- Show upvotes and downvotes only after a user hovers or taps the score
- Show "Upvote" and "Downvote" buttons to authenticated members
- Show "You upvoted" or "You downvoted" as overlay if member has voted
- Show "Vote" button for non-authenticated users (guests)
- Show a visual indicator (e.g., color or icon) for comments with negative scores
- Hide vote counts entirely for comments that have been deleted
- Display "Vote" as the default state for guests

## Vote Integrity Rules

WHILE the comment voting system is operational, THE system SHALL:

- Prevent any direct update or manipulation of comment scores through admin interfaces or API endpoints without audit trail
- Prevent any actor from voting on their own comment
- Prevent any actor from voting on comments posted by members they have blocked
- Prevent any actor from voting on comments posted by banned members
- Prevent any actor from voting on comments posted in communities they have banned from
- Prevent any script or automated tool from submitting multiple votes in rapid succession (rate limiting)
- Prevent vote manipulation through proxy IPs or fake accounts (fraud detection)
- Log all vote actions with timestamp, IP address, user agent, and user ID
- Allow moderators to disable voting entirely on specific comments
- Allow moderators to reset or remove all votes on a comment as an administrative action
- Allow administrator to audit all votes on any comment in the system

## Relationship to Karma System

WHEN a vote on a comment changes (added, changed, removed), THE system SHALL:

- Update the karma of the comment's author by ±1 depending on vote type change
- Update the karma of the voting member if they had a previous vote to compensate for removal
- The karma change SHALL be immediate and non-delayed
- Karma change SHALL be recorded in the user's karma history log
- Karma score SHALL be visible on the user's profile
- Karma score SHALL be used as a reputation indicator, but never as a gate for voting privileges

## Relationship to Moderation System

IF a comment has been reported, THEN THE system SHALL:

- Still allow members to vote on the comment
- Continue to display the comment's vote score
- Prevent voting on comments that have been deleted by moderators
- Allow moderators to set a "lock voting" flag on comments to prevent any changes
- Allow moderators to clear all votes on a comment during review

WHILE a comment is under moderation review, THE system SHALL continue to allow normal voting behavior unless explicitly disabled by moderator

## User Experience Expectations

THE system SHALL ensure:

- Vote updates appear instantaneously when clicked (under 500ms response time)
- Page load of a comment thread with voting indicators shall complete in under 1.5 seconds
- Vote changes shall persist across page refreshes
- Vote buttons shall be accessible by keyboard
- Comment vote counts shall be visible without requiring scrolling or interaction

## Edge Cases Handling

IF a comment is restored after being deleted, THEN THE system SHALL:

- Restore the comment's original vote score
- Restore the vote associations with users
- Restore vote timestamps
- Restore the audit trail of all previous votes
- Update comment visibility if parent post has been deleted or hidden

WHEN a user account is permanently deleted, THEN THE system SHALL:

- Remove all of the user's votes from the comment vote tables
- Recalculate each affected comment's score accordingly
- Reduce the karma of comment authors by the total impact of the deleted votes
- Preserve the comment content but remove all association with the deleted user
- Mark the vote removal as "user deleted" in audit logs

WHEN a user is permanently banned from the system, THEN THE system SHALL:

- Remove their votes from all comment records
- Recalculate scores of all impacted comments
- Reduce karma of comment authors proportionally
- Mark removal in audit logs as "ban removal" 
- Retain the comment content and any votes from other users

## Data Validation and Constraints

WHERE comment votes are stored and retrieved, THE system SHALL:

- Validate that all user IDs are valid existing members
- Validate that comment IDs are valid and not already deleted
- Validate that vote direction is either 'up' or 'down'
- Reject votes submitted with malformed data
- Reject votes submitted from non-existent sessions
- Reject votes submitted without authentication token
- Reject votes on non-existent comments
- Reject votes from blacklisted IP addresses
- Reject votes with timestamps more than 24 hours in the future

## Historical Consistency

THE system SHALL:

- Preserve all historical votes indefinitely
- Never purge vote records when comments are archived
- Maintain vote history for compliance and moderation purposes
- Retain vote records for deleted users for audit trail
- Prevent any retroactive modification of votes from other members
- Maintain vote record integrity regardless of subsequent content edits or deletions

## Performance Requirements

THE system SHALL:

- Return comment vote counts within 1 second for threads under 500 comments
- Update vote scores atomically under 100ms when submitted
- Support up to 5,000 concurrent vote operations per second
- Maintain 99.9% availability for vote submission endpoints
- Return correct vote counts even under high concurrent load

## Testability Criteria

All requirements are testable with clear pass/fail criteria:

- ✓ Upvote on clean comment increases score by +1
- ✓ Downvote on clean comment decreases score by -1
- ✓ Upvote then downvote on same comment results in net 0 score change
- ✓ Vote removal on upvote reduces score by -1
- ✓ Controversial sort returns comments with 10 upvotes and 9 downvotes before 5 upvotes and 1 downvote
- ✓ Best sort returns 100 score comment before 99 score comment
- ✓ New sort returns 2026-02-06T12:52:27Z comment before 2026-02-06T12:52:25Z comment
- ✓ Guest cannot vote on any comment
- ✓ Banned user cannot vote on any community comment
- ✓ Moderator can disable voting on comment
- ✓ Deletion of user removes their votes and recalculates scores
- ✓ System prevents duplicate votes
- ✓ System prevents self-voting
- ✓ System logs all vote actions
- ✓ System prevents vote manipulation
- ✓ Karma system adjusts correctly based on voting changes

## Diagram: Comment Voting Workflow

```mermaid
graph LR
    A["User Interacts with Comment"] --> B{"Authenticated?"}
    B -->|No| C["Show \"Vote\" button"]
    B -->|Yes| D["Show Current Vote Status"]
    D --> E["User Clicks Upvote"]
    D --> F["User Clicks Downvote"]
    D --> G["User Clicks Vote Button again"]
    E --> H{"Existing Vote?"}
    F --> H
    G --> H
    H -->|No| I["Add Vote, Increment Score, Update Karma"]
    H -->|Yes, Same| J["Ignore Request"]
    H -->|Yes, Different| K["Remove Old Vote, Add New Vote, Adjust Score ±2"]
    H -->|Yes, Remove| L["Remove Vote, Adjust Score ±1, Adjust Karma"]
    I --> M["Update UI"]
    K --> M
    L --> M
    M --> N["Display Updated Vote Count"]
    N --> O["Log Vote Action"]
    O --> P["Complete"]
```

## Critical Integrity Constraints

- Comment voting MUST NOT be affected by the time of posting
- Comment vote scores MUST be calculated in real-time from the database, not stored as static values
- Vote counts MUST only be modified through the approved voting interface or moderation action
- The karma system MUST never directly influence the comment voting system (e.g., no bonus votes for high karma users)
- The "Controversial" sort algorithm MUST not penalize new comments with low vote totals

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*

}},