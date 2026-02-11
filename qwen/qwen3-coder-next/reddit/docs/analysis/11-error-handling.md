# Requirements Specification: Reddit-like Community Platform

## Overview

This document provides the complete requirements specification for the Reddit-like Community Platform - a modern social media application designed to foster vibrant online communities where users can share content, engage in discussions, and build networks around shared interests.

## Business Requirements

### User Account Management

WHEN a user signs up with email and password, THE system SHALL create a new account with unique username.

WHEN a user logs in with email and password, THE system SHALL authenticate the user and establish a session.

WHEN a user changes their password, THE system SHALL verify the current password and update the new password securely.

WHEN a user deletes their account, THE system SHALL cascade delete all their posts and comments.

### User Profile

WHEN a user creates a profile, THE system SHALL store display name, bio text, and avatar image.

WHEN a user edits their profile, THE system SHALL validate and update display name, bio, and avatar.

WHEN a user views another user's profile, THE system SHALL display display name, bio, avatar, total karma score, posts created, and comments written.

### Karma System

WHEN a user receives an upvote on a post or comment, THE system SHALL increase their karma score by 1.

WHEN a user receives a downvote on a post or comment, THE system SHALL decrease their karma score by 1.

WHEN a user removes their vote, THE system SHALL adjust karma scores accordingly.

WHEN a user's karma score is calculated, THE system SHALL compute a single score based on post karma plus comment karma.

### Community Management

WHEN a user creates a community, THE system SHALL create a unique name, description, and icon image with the creator as owner.

WHEN users browse communities, THE system SHALL display all communities with subscriber count.

WHEN users search for communities, THE system SHALL search by name and return matching results.

### Subscription System

WHEN a user subscribes to a community, THE system SHALL add the community to their subscription list.

WHEN a user unsubscribes from a community, THE system SHALL remove the community from their subscription list.

WHEN a user views their subscriptions, THE system SHALL list all communities they are subscribed to.

WHEN a user creates a post, THE system SHALL verify they are subscribed to the target community.

### Post Management

WHEN a user creates a post, THE system SHALL accept title (required), and one of: text content, URL, or uploaded image.

WHEN a user edits their post, THE system SHALL allow modification of title and content fields.

WHEN a user deletes their post, THE system SHALL remove the post from public view.

WHEN a user views a post, THE system SHALL display title, full content, author, community, vote score, comment count, and posting timestamp.

### Post Voting

WHEN a user upvotes a post, THE system SHALL add 1 to the post's vote score.

WHEN a user downvotes a post, THE system SHALL subtract 1 from the post's vote score.

WHEN a user votes on a post, THE system SHALL limit them to one vote per post.

WHEN a user changes their vote, THE system SHALL adjust the score by 2 points.

WHEN a user removes their vote, THE system SHALL revert the score adjustment.

### Content Feeds

WHEN a user accesses the Home Feed, THE system SHALL show posts only from subscribed communities (member-only).

WHEN any user accesses the Popular Feed, THE system SHALL show posts from all communities.

WHEN any user accesses a Community Feed, THE system SHALL show posts from the specific community.

WHEN viewing any feed, THE system SHALL support sorting by: Hot, New, Top (with time filter), and Controversial.

WHEN viewing any feed, THE system SHALL paginate results.

WHEN displaying posts in a feed list, THE system SHALL show: title, author username, community name, vote score, comment count, time since posting, and content preview based on post type.

### Comment System

WHEN a user writes a comment, THE system SHALL accept content and associate it with a post.

WHEN a user replies to a comment, THE system SHALL create a nested reply with unlimited depth.

WHEN a user edits their comment, THE system SHALL allow content modification.

WHEN a user deletes their comment, THE system SHALL remove the comment.

WHEN viewing a comment, THE system SHALL display author, content, vote score, time since posting, and nested replies.

### Comment Voting

WHEN a user votes on a comment, THE system SHALL follow the same rules as post voting.

WHEN a user upvotes a comment, THE system SHALL add 1 to the comment's score.

WHEN a user downvotes a comment, THE system SHALL subtract 1 from the comment's score.

WHEN a user votes on a comment, THE system SHALL limit them to one vote per comment.

### Comment Sorting

WHEN viewing comments on a post, THE system SHALL support sorting by: Best (by score), New (by creation time), and Controversial (votes but score near zero).

### Community Moderation

WHEN a community is created, THE system SHALL assign the creator as owner (highest authority).

WHEN an owner adds a moderator, THE system SHALL grant moderator permissions to that user.

WHEN an owner removes a moderator, THE system SHALL revoke moderator permissions from that user.

WHEN a moderator adds another moderator, THE system SHALL grant moderator permissions (moderators can add moderators).

WHEN a moderator attempts to remove the owner, THE system SHALL deny the action (moderators cannot remove owner).

WHEN a moderator attempts to remove another moderator, THE system SHALL deny the action (moderators cannot remove each other).

WHEN a moderator deletes a post, THE system SHALL remove it from the community.

WHEN a moderator deletes a comment, THE system SHALL remove it from the community.

WHEN a moderator bans a user, THE system SHALL prevent that user from creating posts or comments in the community.

WHEN a moderator unbans a user, THE system SHALL restore the user's ability to participate in the community.

WHEN viewing banned users, THE system SHALL list all banned users for that community.

### Reporting System

WHEN a user reports content, THE system SHALL require a reason text.

WHEN reports are created, THE system SHALL make them visible to moderators of the relevant community.

WHEN viewing reports, THE system SHALL show: reported content, reporter information, and reason.

WHEN a moderator approves a report, THE system SHALL delete the reported content.

WHEN a moderator dismisses a report, THE system SHALL remove it from the report list.

## Technical Requirements

### Performance Standards

- Home feed loads in under 2 seconds
- Post/comment creation responses in under 1 second
- Voting updates appear within 1 second
- Support 1,000 concurrent users
- Support posts with up to 10,000 comments

### Data Integrity

- All karma calculations must be consistent across concurrent operations
- Vote counting must prevent race conditions
- Comment threading must maintain structural integrity
- Community subscription counts must be accurate in real-time

### Security Requirements

- All passwords hashed with bcrypt (cost factor 12)
- JWT access tokens expire after 15 minutes
- JWT refresh tokens expire after 30 days
- Rate limiting: 6 posts/hour, 20 comments/hour, 100 votes/hour
- Email verification required within 24 hours of registration

### Error Handling

- All API responses must include clear error messages
- Authentication errors return HTTP 401
- Authorization errors return HTTP 403
- Validation errors return HTTP 400 with specific field errors
- System errors return HTTP 500 with error tracking ID

## Success Criteria

- Platform supports all specified user workflows
- All business requirements implemented and validated
- System meets performance targets under expected load
- Security requirements fully implemented
- Error handling provides clear feedback for users and developers

## Notes

This requirements specification serves as the foundation for the backend implementation. All technical implementation decisions—including architecture, API design, database schemas, and code structure—are at the discretion of the development team, provided they meet the business requirements outlined above.