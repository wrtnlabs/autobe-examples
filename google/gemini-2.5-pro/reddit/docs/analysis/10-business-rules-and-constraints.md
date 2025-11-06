# 10 - Business Rules and Constraints

This document consolidates and defines the specific, authoritative business rules and system constraints that govern the entire community platform. This document is the single source of truth for these rules. In any case of discrepancy, the rules defined herein supersede those mentioned in other documents.

## 1. Voting and Karma Rules

These rules define the mechanics of the voting system and its direct impact on user reputation (karma). The logic must be applied consistently across all posts and comments to ensure a fair and transparent reputation system.

### 1.1. Voting Mechanics

*   **WHEN** a `member` casts a vote on a post or comment, **THE system SHALL** verify that the `member` is not the author of the content.
*   **IF** a `member` attempts to vote on their own post or comment, **THEN THE system SHALL** prevent the action without providing any feedback.
*   **WHEN** a `member` who has not voted on content selects the upvote option, **THE system SHALL** increment the content's score by 1 and record an upvote for the user.
*   **WHEN** a `member` who has not voted on content selects the downvote option, **THE system SHALL** decrement the content's score by 1 and record a downvote for the user.
*   **WHEN** a `member` who has already upvoted content selects the upvote option again, **THE system SHALL** treat this as a vote retraction, decrement the content's score by 1, and remove the user's vote record.
*   **WHEN** a `member` who has already downvoted content selects the downvote option again, **THE system SHALL** treat this as a vote retraction, increment the content's score by 1, and remove the user's vote record.
*   **WHEN** a `member` who has already upvoted content selects the downvote option, **THE system SHALL** change the vote, decrement the content's score by 2, and update the user's vote record from upvote to downvote.
*   **WHEN** a `member` who has already downvoted content selects the upvote option, **THE system SHALL** change the vote, increment the content's score by 2, and update the user's vote record from downvote to upvote.

### 1.2. Karma Calculation

Karma is a direct reflection of a user's contributions to the community, as judged by other members. For a high-level overview, refer to the [Karma and User Reputation](./07-karma-and-user-reputation.md) document.

*   **THE system SHALL** calculate a user's total karma as the sum of their post karma and comment karma.
*   **WHEN** another `member` upvotes a post or comment authored by a user, **THE system SHALL** increment that user's corresponding karma (post or comment) by 1.
*   **WHEN** another `member` downvotes a post or comment authored by a user, **THE system SHALL** decrement that user's corresponding karma (post or comment) by 1.
*   **THE system SHALL** ensure that a user's total karma score (the sum of post and comment karma) cannot fall below a minimum value of 1.
*   **IF** a karma-modifying action would cause a user's total karma to fall below 1, **THEN THE system SHALL** set the total karma to 1.

### 1.3. Karma and Voting Logic Summary

| Action | Effect on Content Score | Effect on Author's Karma | Constraint |
| :--- | :--- | :--- | :--- |
| Upvote | +1 | +1 | User cannot vote on their own content. |
| Downvote | -1 | -1 | Author's total karma cannot go below 1. |
| Retract an Upvote | -1 | -1 | Karma returns to its previous state. |
| Retract a Downvote | +1 | +1 | Karma returns to its previous state. |
| Flip Upvote to Downvote | -2 | -2 | Karma changes by the delta. |
| Flip Downvote to Upvote | +2 | +2 | Karma changes by the delta. |

## 2. Content Limitations

To ensure system performance, data integrity, and a consistent user interface, all user-generated content is subject to the following limitations.

### 2.1. Post Limitations

*   **WHEN** a user submits a post, **THE system SHALL** enforce a maximum length of 300 characters for the post title.
*   **IF** a user submits a text post, **THEN THE system SHALL** enforce a maximum length of 40,000 characters for the post body.
*   **IF** a user submits a link post, **THEN THE system SHALL** validate that the submitted URL is a well-formed web address.
*   **IF** a user submits an image post, **THEN THE system SHALL** only accept files in JPEG, PNG, or GIF formats and enforce a maximum file size of 20 MB.
*   **IF** a user submits content that violates these limits, **THEN THE system SHALL** reject the submission and return an error message detailing the specific rule that was violated.

### 2.2. Comment Limitations

*   **WHEN** a user submits a comment, **THE system SHALL** enforce a maximum length of 10,000 characters.
*   **IF** a user submits a comment that exceeds this limit, **THEN THE system SHALL** reject the submission and inform the user of the character limit.

## 3. Rate Limiting for Actions

Rate limiting is critical to prevent spam, bot activity, and system abuse. These limits apply on a per-member basis.

*   **IF** a `member` attempts to create a post less than 5 minutes after their last post, **THEN THE system SHALL** reject the request.
*   **IF** a `member` attempts to create their 6th comment within a 1-minute window, **THEN THE system SHALL** reject the request.
*   **IF** a `member` attempts to create a new community less than 24 hours after their last one, **THEN THE system SHALL** reject the request.
*   **WHEN** a user triggers a rate limit, **THE system SHALL** return an error message indicating how long they must wait before performing the action again.
*   **IF** 5 consecutive login attempts fail for the same username or from the same IP address, **THEN THE system SHALL** implement a temporary account/IP lockout for 15 minutes.

## 4. User and Community Naming Policies

Naming policies ensure uniqueness, prevent conflicts, and maintain a civil environment on the platform.

### 4.1. Username Policy

*   **WHEN** a user registers, **THE system SHALL** require their username to be unique (checked case-insensitively).
*   **THE system SHALL** enforce that usernames are between 3 and 20 characters long.
*   **THE system SHALL** restrict usernames to only contain alphanumeric characters (a-z, 0-9) and underscores (_).
*   **THE system SHALL NOT** allow a user to change their username after registration is complete.
*   **IF** a chosen username violates these criteria during registration, **THEN THE system SHALL** reject it and provide feedback on the violated rule.

### 4.2. Community Name Policy

*   **WHEN** a `member` creates a community, **THE system SHALL** require its name to be unique (checked case-insensitively).
*   **THE system SHALL** enforce that community names are between 3 and 21 characters long.
*   **THE system SHALL** restrict community names to only contain alphanumeric characters (a-z, 0-9).
*   **THE system SHALL NOT** allow a community's name to be changed after it has been created.
*   **IF** a chosen community name does not meet these criteria during creation, **THEN THE system SHALL** reject it and provide feedback to the user.

## 5. Consolidated Constraints Table

This table provides a quick reference for all key numerical constraints and business rules for developers.

| Category | Item | Constraint | Value |
| :--- | :--- | :--- | :--- |
| **Karma** | Initial Karma on Registration | Equals | 1 |
| | Minimum Total Karma | Minimum | 1 |
| | Community Creation Requirement | Minimum Total Karma | 50 |
| | Post Rate Limit | Total Karma below | 10 |
| **Content** | Post Title Length | Max Characters | 300 |
| | Text Post Body Length | Max Characters | 40,000 |
| | Comment Length | Max Characters | 10,000 |
| | Image Post Upload Size | Max File Size | 20 MB |
| | Image Post Formats | Allowed Types | JPEG, PNG, GIF |
| **Rate Limits** | Post Creation Frequency | 1 per | 5 minutes |
| | Comment Creation Frequency | 5 per | 1 minute |
| | Community Creation Frequency | 1 per | 24 hours |
| | Failed Login Attempts | Max Attempts | 5 |
| | Login Lockout Duration | Duration | 15 minutes |
| **Naming** | Username Length | Characters | 3-20 |
| | Username Characters | Pattern | Alphanumeric, Underscore (_)
| | Community Name Length | Characters | 3-21 |
| | Community Name Characters | Pattern | Alphanumeric |