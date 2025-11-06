# 07. Karma and User Reputation

## 1. Introduction

This document specifies the business requirements for the user reputation system, known as "Karma." Karma is a quantitative score that reflects a user's standing within the community based on the perceived quality of their contributions (posts and comments). The primary objectives of the Karma system are to incentivize the creation of high-quality, engaging content and to provide a community-driven mechanism for granting user privileges and applying restrictions. A user's Karma is a direct result of the upvotes their content receives from other members.

## 2. Karma Calculation Logic

The logic for calculating Karma must be transparent, fair, and consistently applied. It is designed to reward positive contributions.

### 2.1. Initial and Minimum Karma

- **EARS-KR-01**: WHEN a new `member` account is created, THE system SHALL assign an initial total karma score of 1.
- **EARS-KR-02**: THE system SHALL enforce that a `member`'s total karma (the sum of post and comment karma) cannot drop below a minimum value of 1.
- **EARS-KR-03**: IF a user action (e.g., an upvote being retracted) would cause a `member`'s total karma to fall below 1, THEN THE system SHALL set the total karma score to 1, not a lower value.

### 2.2. Karma Modification from Votes

Karma is adjusted based on how other members vote on a user's content. Votes on one's own content do not affect Karma.

- **EARS-KR-04**: WHEN a `member`'s post or comment receives an upvote from another `member`, THE system SHALL increase the author's corresponding karma (post or comment) by 1.
- **EARS-KR-05**: **IF** a `member`'s post or comment receives a downvote from another `member`, **THEN THE** system **SHALL NOT** modify the author's karma score. Downvotes only affect the content's score, not the user's reputation.
- **EARS-KR-06**: IF a `member` retracts their upvote from a post or comment, THEN THE system SHALL decrease the author's corresponding karma by 1.
- **EARS-KR-07**: IF a `member` attempts to vote on their own post or comment, THEN THE system SHALL NOT modify their karma score.

### 2.3. Karma Calculation Flow

The following diagram shows the logic for processing a vote and updating the author's karma.

```mermaid
graph TD
    A['Vote Cast on Content'] --> B{Is the voter the author?};
    B --> |"Yes"| C['End Process (No Karma Change)'];
    B --> |"No"| D{Is it an Upvote?};
    D --> |"Yes"| E['Increment Author's Karma by 1'];
    D --> |"No"| F['End Process (Downvotes do not affect Karma)'];
    E --> G{Would this change cause Karma < 1?};
    G --> |"No"| H['Update Author's Karma Score in Database'];
    G --> |"Yes"| I['Set Author's Total Karma to 1 and update'];
```

## 3. Karma Types

To provide clear insight into a user's contribution style, Karma is divided into two categories.

### 3.1. Post Karma

- **EARS-KT-01**: THE system SHALL calculate a `member`'s Post Karma as the sum of all karma points gained or lost from upvotes on all posts they have submitted.

### 3.2. Comment Karma

- **EARS-KT-02**: THE system SHALL calculate a `member`'s Comment Karma as the sum of all karma points gained or lost from upvotes on all comments they have submitted.

### 3.3. Total Karma

- **EARS-KT-03**: THE system SHALL calculate a `member`'s Total Karma by summing their Post Karma and Comment Karma.

## 4. Karma on Content Deletion

The following rules govern how karma is treated when content is removed from the platform.

- **EARS-KD-01**: WHEN a `member` deletes their own post or comment, THE system SHALL NOT adjust the karma they have already earned from that content.
- **EARS-KD-02**: WHEN an `admin` removes a post or comment due to a rule violation, THE system SHALL reverse any karma the author gained from that content, and this adjustment SHALL be logged for moderation records.

## 5. Displaying Karma on User Profiles

Karma scores must be publicly visible to foster transparency and allow users to gauge a member's reputation.

- **EARS-KD-03**: WHEN any user views a `member`'s profile page, THE system SHALL display the member's Total Karma, Post Karma, and Comment Karma as separate values.
- **EARS-KD-04**: WHERE the user interface supports a user hovercard (a popup on username hover), THE system SHALL display the `member`'s Total Karma on it.

## 6. Impact of Karma on User Privileges

Karma directly influences a `member`'s abilities on the platform, serving as an automated, community-driven moderation and permissions system.

### 6.1. Restrictions for Low-Karma Users

These restrictions are in place to mitigate spam and encourage new users to engage constructively before gaining full posting privileges.

- **EARS-KP-01**: IF a `member`'s total karma is below 10, THEN THE system SHALL limit their ability to create posts to a maximum of one post every 10 minutes.
- **EARS-KP-02**: IF a `member`'s total karma is below 10, THEN THE system SHALL limit their ability to create comments to a maximum of five comments every 10 minutes.
- **EARS-KP-03**: WHILE a `member`'s total karma is 10 or greater, THE system SHALL NOT apply karma-based rate limits for posting or commenting.

### 6.2. Privileges for High-Karma Users

Earning karma rewards users with privileges, signifying they are established members of the community.

- **EARS-KP-04**: IF a `member` attempts to create a new community AND their total karma is less than 50, THEN THE system SHALL deny the request and inform them of the karma requirement.
- **EARS-KP-05**: WHERE a `member` has a total karma score of 50 or more, THE system SHALL grant them the privilege to create a new community. This ensures community creators are experienced users who understand the platform's norms.