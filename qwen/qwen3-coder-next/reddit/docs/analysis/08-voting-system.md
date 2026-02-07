# Voting System Requirements Specification

## Introduction to Voting System

The voting system is a fundamental component of the Reddit-like community platform that enables users to express approval or disapproval of content created by other users. This system powers user engagement, content ranking algorithms, and user reputation calculations through karma scores. Every user interaction with posts and comments through voting contributes to the platform's social dynamics and content discovery mechanisms.

The voting system must support both upvoting (approval) and downvoting (disapproval) for posts and comments, while maintaining accurate vote counts and enabling users to modify or remove their votes over time. The system must also handle karma calculations for content authors based on the aggregate vote scores of their contributions.

## Core Voting Concepts

### Vote Types and Values

Each vote consists of two primary attributes:

- **Vote Direction**: The direction of the vote, which can be either "upvote" (approval) or "downvote" (disapproval)
- **Vote Value**: The numeric contribution to the score, where upvotes add +1 and downvotes subtract -1 from the total score

**WHEN a user upvotes content, THE system SHALL add +1 to that content's vote score.**

**WHEN a user downvotes content, THE system SHALL subtract -1 from that content's vote score.**

**THE system SHALL calculate the total vote score as the sum of all upvotes minus the sum of all downvotes.**

### User-Content Vote Relationship

The voting system operates on a one-vote-per-user-per-content basis:

**WHEN a user votes on a specific post or comment, THE system SHALL record exactly one vote from that user for that content.**

**WHEN a user attempts to vote on content they have already voted on, THE system SHALL update their existing vote rather than creating a duplicate.**

**THE system SHALL prevent users from voting on their own content to maintain fairness.**

## Post Voting System

### Post Voting Capabilities

Users can interact with posts through the following voting operations:

**WHEN a user accesses a post, THE system SHALL display the current vote score and the user's own vote status (upvoted, downvoted, or not voted).**

**WHEN a logged-in user upvotes a post, THE system SHALL record the upvote, increase the post's vote score by +1, and update the user's vote record.**

**WHEN a logged-in user downvotes a post, THE system SHALL record the downvote, decrease the post's vote score by -1, and update the user's vote record.**

**WHEN a logged-in user removes their vote from a post, THE system SHALL remove the vote record, adjust the post's vote score by the opposite of the original vote direction, and clear the user's vote status.**

**WHEN a user attempts to vote on a post they have already voted on, THE system SHALL update their existing vote to the new direction.**

**IF a non-authenticated user attempts to vote on a post, THE system SHALL deny the vote request and return an appropriate error.**

### Vote Status Display

Each post display must include relevant vote information:

**WHEN displaying a post, THE system SHALL show the current vote score.**

**WHEN displaying a post for an authenticated user, THE system SHALL indicate whether the current user has upvoted, downvoted, or not voted on that post.**

**WHEN displaying a post list (feed), THE system SHALL show the vote score next to each post.**

**WHEN displaying a post list (feed), THE system SHALL indicate the current user's vote status for each post in the list.**

## Comment Voting System

### Comment Voting Capabilities

The comment voting system mirrors the post voting system with identical rules and operations:

**WHEN a logged-in user upvotes a comment, THE system SHALL record the upvote, increase the comment's vote score by +1, and update the user's vote record.**

**WHEN a logged-in user downvotes a comment, THE system SHALL record the downvote, decrease the comment's vote score by -1, and update the user's vote record.**

**WHEN a logged-in user removes their vote from a comment, THE system SHALL remove the vote record, adjust the comment's vote score by the opposite of the original vote direction, and clear the user's vote status.**

**WHEN a user attempts to vote on a comment they have already voted on, THE system SHALL update their existing vote to the new direction.**

**IF a non-authenticated user attempts to vote on a comment, THE system SHALL deny the vote request and return an appropriate error.**

**THE system SHALL prevent users from voting on their own comments to maintain fairness.**

### Vote Status Display for Comments

**WHEN displaying a comment, THE system SHALL show the current vote score.**

**WHEN displaying a comment for an authenticated user, THE system SHALL indicate whether the current user has upvoted, downvoted, or not voted on that comment.**

**WHEN displaying nested comments in a thread, THE system SHALL show each comment's vote score and the current user's vote status.**

## Karma Calculation Logic

### User Karma System

Every user in the system has a single karma score that represents their overall contribution and reputation within the community. The karma system is the primary mechanism for recognizing valuable contributions and encouraging positive community participation.

**THE system SHALL maintain a karma score for each user.**

**WHEN a user receives an upvote on their post or comment, THE system SHALL increase their karma score by +1.**

**WHEN a user receives a downvote on their post or comment, THE system SHALL decrease their karma score by -1.**

**WHEN a user's vote is removed (from a post or comment), THE system SHALL adjust their karma score by the opposite of the original vote direction.**

**Karma scores CAN be negative.**

### Karma Calculation Examples

**Example Scenario 1: Basic Karma Accumulation**
- User A creates a post that receives 15 upvotes and 2 downvotes
- Post score = 15 - 2 = 13
- User A's karma increases by 15 (from upvotes) and decreases by 2 (from downvotes)
- Net karma change: +13

**Example Scenario 2: Vote Removal**
- User B creates a comment that receives 5 upvotes (karma +5)
- User C upvotes the comment, increasing User B's karma to +5
- User C later removes their upvote
- User B's karma decreases by 1 (opposite of upvote direction)
- Net karma change: -1

**Example Scenario 3: Downvote Adjustment**
- User D creates a post that receives 3 upvotes and 10 downvotes
- User E's downvote contributed to User D's karma decreasing by 1
- User E later changes their downvote to an upvote
- User D's karma increases by 2 (reversing -1 and adding +1)
- Net karma change: +2

### Karma Display Requirements

**WHEN displaying a user's profile, THE system SHALL show their total karma score.**

**WHEN displaying a user's posts list on their profile, THE system SHALL associate each post with its contribution to their karma.**

**WHEN displaying a user's comments list on their profile, THE system SHALL associate each comment with its contribution to their karma.**

## Vote Management Rules

### Vote Limit Enforcement

To prevent abuse and ensure fair participation, the voting system must enforce several limits:

**THE system SHALL allow exactly one vote per user per post.**

**THE system SHALL allow exactly one vote per user per comment.**

**WHEN a user has already voted on a post and attempts to vote again, THE system SHALL update their existing vote.**

**WHEN a user has already voted on a comment and attempts to vote again, THE system SHALL update their existing vote.**

**THE system SHALL not allow a user to vote on their own post.**

**THE system SHALL not allow a user to vote on their own comment.**

### Vote Change Rules

Users can modify their votes through the following operations:

**WHEN a user upvotes content they previously downvoted, THE system SHALL change their vote from downvote to upvote and adjust the content's score by +2.**

**WHEN a user downvotes content they previously upvoted, THE system SHALL change their vote from upvote to downvote and adjust the content's score by -2.**

**WHEN a user removes their vote entirely, THE system SHALL clear their vote record and adjust the content's score by the opposite of the original vote direction.**

**WHEN a user changes their vote, THE system SHALL update the karma scores of the content author accordingly.**

### Vote Removal Workflow

Users can remove their votes with the following behavior:

**WHEN a user removes their vote from a post, THE system SHALL delete their vote record, adjust the post's vote score by the opposite of the original vote direction, and clear their vote status for that post.**

**WHEN a user removes their vote from a comment, THE system SHALL delete their vote record, adjust the comment's vote score by the opposite of the original vote direction, and clear their vote status for that comment.**

**WHEN a user removes their vote, THE system SHALL adjust the karma scores of the content author by the opposite of the original vote direction.**

**WHEN a post or comment is deleted, THE system SHALL remove all associated vote records.**

**WHEN a user account is deleted, THE system SHALL remove all vote records associated with that user.**

## User Experience Requirements

### Real-time Vote Feedback

**WHEN a user successfully casts a vote, THE system SHALL immediately update the displayed vote score.**

**WHEN a user successfully removes a vote, THE system SHALL immediately update the displayed vote score.**

**WHEN a user changes their vote, THE system SHALL immediately reflect the new vote direction.**

**WHEN a user views a feed, THE system SHALL display vote scores for each post.**

**WHEN a user views a comment thread, THE system SHALL display vote scores for each comment.**

### Error Handling and Validation

**IF a user attempts to vote on a post or comment that does not exist, THE system SHALL return an appropriate error message.**

**IF a user attempts to vote on content they created, THE system SHALL deny the vote and return an appropriate error message.**

**IF a user attempts to vote on content while not authenticated, THE system SHALL deny the vote request.**

**IF a user attempts to remove a vote that does not exist, THE system SHALL return an appropriate error message.**

**IF a vote operation fails due to system error, THE system SHALL revert any partial changes and return an appropriate error message.**

### Performance Requirements

**THE system SHALL retrieve vote scores for posts and comments within 200 milliseconds for single-item queries.**

**THE system SHALL update vote records and scores within 500 milliseconds of user action.**

**THE system SHALL support at least 1,000 concurrent voting operations per second.**

**THE system SHALL maintain vote data consistency even during network partitions or system failures.**

## Voting System Integration with Other Features

### Integration with Feed Sorting

The voting system directly enables several feed sorting algorithms:

**WHEN displaying a "hot" feed, THE system SHALL sort posts by a combination of vote score and recency.**

**WHEN displaying a "top" feed, THE system SHALL sort posts by vote score.**

**WHEN displaying a "controversial" feed, THE system SHALL sort posts by vote activity (total votes) relative to vote score balance.**

### Integration with Community Moderation

**WHEN a moderator deletes a post or comment, THE system SHALL remove all associated vote records.**

**WHEN a report is approved by a moderator, THE system SHALL delete the reported content and all associated vote records.**

**WHEN a user is banned from a community, THE system SHALL retain their vote history but prevent further voting in that community.**

### Integration with User Profiles

**WHEN displaying a user's profile page, THE system SHALL show their total karma score.**

**WHEN displaying a user's posts on their profile, THE system SHALL show each post's vote score.**

**WHEN displaying a user's comments on their profile, THE system SHALL show each comment's vote score.**

## Voting System Entity Relationships

### Data Model Overview

The voting system involves several core entities with the following relationships:

- **User**: The entity casting the vote
- **Post**: The content that can receive upvotes and downvotes
- **Comment**: The content that can receive upvotes and downvotes
- **Vote**: The entity representing a user's vote on specific content

**THE system SHALL maintain vote records linking users to posts or comments.**

**THE system SHALL enforce uniqueness constraints so each user can vote only once per post and once per comment.**

**THE system SHALL store vote direction, timestamp, and content type reference.**

### Vote Record Structure

Each vote record SHALL contain:

- **User ID**: Reference to the user who cast the vote
- **Content ID**: Reference to the specific post or comment being voted on
- **Content Type**: Indicator of whether the vote is on a post or comment
- **Vote Direction**: The direction of the vote (upvote or downvote)
- **Timestamp**: When the vote was cast or last modified
- **Version**: For concurrency control and consistency

**THE system SHALL use the vote record to track all vote-related information and enable accurate karma calculations.**

## Summary

The voting system is the foundation of user engagement on the Reddit-like community platform, enabling users to express approval or disapproval of content and influencing content ranking, community discovery, and user reputation. This system must support comprehensive voting operations including creation, modification, and removal of votes while maintaining accurate vote scores and karma calculations.

The system enforces fairness through several mechanisms: preventing users from voting on their own content, limiting each user to one vote per content item, and enabling vote modifications. These rules ensure that the voting system remains a reliable indicator of community sentiment and content quality.

Through integration with other platform features like feeds, moderation, and user profiles, the voting system enables sophisticated content organization and community dynamics that are essential for a successful Reddit-like platform. The detailed requirements specified in this document provide a complete foundation for implementing a robust and reliable voting system that supports all platform functionality.