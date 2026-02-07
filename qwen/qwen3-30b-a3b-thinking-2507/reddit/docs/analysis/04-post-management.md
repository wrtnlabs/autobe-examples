# Reddit Community Platform Requirements Specification

## Introduction
This document specifies comprehensive business requirements for the Reddit-like community platform, detailing all user interactions, content management systems, and engagement mechanics. The specification follows EARS format for all requirements and includes complete business context to guide backend implementation.

## 1. User Account Management

### Account Creation Requirements

WHEN a new user submits a valid email address, password, and unique username, THE system SHALL validate the email format (must include @ and domain), password strength (minimum 8 characters with at least one uppercase letter and one number), AND username uniqueness.

WHEN the email address is already registered, THE system SHALL display: 'Email is already registered. Please choose another email or log in.'

WHEN the username is already taken, THE system SHALL display: 'Username is already taken. Please choose a different username.'

WHEN the password fails security validation, THE system SHALL display: 'Password must contain at least 8 characters with at least one uppercase letter and one number.'

### Authentication Requirements

WHEN a user provides a registered email and valid password during login, THE system SHALL authenticate and establish a secure session with JWT token expiration of 24 hours.

WHEN a user enters invalid credentials, THE system SHALL display: 'Invalid email or password. Please check your credentials and try again.'

WHEN the user attempts to login from an unrecognized device, THE system SHALL send a confirmation email and require code verification for security.

### Password Management

WHEN a user requests a password change, THE system SHALL require the current password for authentication.

WHEN the new password is less than 8 characters, THE system SHALL display: 'New password must be at least 8 characters.'

WHEN the new password confirmation does not match the entered password, THE system SHALL display: 'New password and confirmation do not match. Please try again.'

### Account Deletion Protocol

WHEN a user initiates account deletion, THE system SHALL display: 'Are you sure you want to delete your account and all associated content? This action cannot be undone.'

WHEN a user confirms deletion, THE system SHALL permanently remove all associated records (posts, comments, karma adjustments) and send a confirmation email.

WHEN a user's account is deleted, THE system SHALL automatically remove all their content from all community feeds and update karma calculations for affected users.

## 2. User Profile

### Profile Management

WHEN a user edits their display name, THE system SHALL validate the name is not empty and does not exceed 30 characters.

WHEN a user submits a bio exceeding 250 characters, THE system SHALL display: 'Bio cannot exceed 250 characters. Please shorten your bio.'

WHEN a user uploads an avatar file that exceeds 5MB, THE system SHALL display: 'Avatar image must be less than 5MB.'

WHEN a user submits a valid avatar, THE system SHALL accept JPG, PNG, or GIF formats and store a thumbnail and full-size version.

### Profile Visibility Requirements

WHEN a user views another user's profile, THE system SHALL display:
- Display name
- Bio text (truncated to 250 characters if longer)
- Profile image
- Total karma score (as integer)
- Linked list of user's posts (titles only)
- Linked list of user's comments

WHEN a user views their own profile, THE system SHALL provide edit controls for display name, bio, and avatar with real-time previews.

## 3. Karma System

### Core Calculation Rules

WHEN a user receives an upvote on a post or comment, THE system SHALL increase the author's karma by 1.

WHEN a user receives a downvote on a post or comment, THE system SHALL decrease the author's karma by 1.

WHEN a user changes their vote from up to down on a post or comment, THE system SHALL decrease the author's karma by 2 (1 for removing upvote, 1 for adding downvote).

WHEN a user removes their vote on a post or comment, THE system SHALL adjust the author's karma based on the previous vote type.

### Karma Display Requirements

WHEN displaying karma on a user profile, THE system SHALL show the numeric value as an integer with no formatting (e.g., "-5" not "negative 5").

WHEN a user's karma reaches zero, THE system SHALL display as "0" without special formatting.

WHEN a user's karma is negative, THE system SHALL treat it identically to positive values for all display purposes.

### Karma Impact on User Experience

WHEN a user's karma changes, THE system SHALL provide a subtle visual indicator (e.g., slight animation) showing the value increase or decrease for 3 seconds.

WHEN a user views their profile after a karma change, THE system SHALL update the value without requiring a page refresh.

## 4. Communities

### Community Creation

WHEN a user creates a new community, THE system SHALL assign them as the community owner and generate a unique community URL.

WHEN a community name is already registered, THE system SHALL display: 'Community name is already taken. Please choose a different name.'

WHEN a user attempts to create a community with no description, THE system SHALL display: 'Community must have a description. Please provide a brief description of your community.'

### Community Management

WHEN a user views the list of communities, THE system SHALL display:
- Community name
- Description (first 100 characters)
- Community icon image
- Subscriber count

WHEN a user searches communities by name, THE system SHALL display matching communities ordered by relevance (name match first, then description).

WHEN a user views a community's page, THE system SHALL display:
- Community name and icon
- Description text
- Current subscriber count
- Community creation date
- Creator's display name

## 5. Community Subscription

### Subscription Rules

WHEN a user wants to subscribe to a community, THE system SHALL check if they are already subscribed.

WHEN a user attempts to subscribe to a community they are already subscribed to, THE system SHALL display: 'You are already subscribed to this community.'

WHEN a user subscribes to a community, THE system SHALL update their subscription status and add the community to their subscribed list.

### Unsubscribe Process

WHEN a user unsubscribes from a community, THE system SHALL remove their subscription and prevent future posts in that community.

WHEN a user views their list of subscribed communities, THE system SHALL display all communities they are subscribed to with clear unsubscribe buttons.

## 6. Posts

### Post Creation Requirements

WHEN a user creates a post in a community they are subscribed to, THE system SHALL validate the community subscription.

WHEN a user attempts to create a post in an unsubscribed community, THE system SHALL display: 'You must be subscribed to this community to create posts.'

WHEN a post title exceeds 100 characters, THE system SHALL display: 'Title must be no longer than 100 characters.'

WHEN creating a text post, THE system SHALL store the first 200 characters as content preview for feeds.

### Post Types Requirements

#### Text Posts

WHEN a user selects text post type, THE system SHALL display a text area with 2,000 character limit.

WHEN a user submits text exceeding 2,000 characters, THE system SHALL display: 'Text content cannot exceed 2,000 characters.'

WHEN a text post is viewed in a feed, THE system SHALL display the first 200 characters followed by '...'

#### Link Posts

WHEN a user submits a URL as a link, THE system SHALL validate the URL format.

WHEN a URL is invalid, THE system SHALL display: 'Invalid URL format. Please provide a valid example (e.g., https://example.com)'.

WHEN a link post is viewed in a feed, THE system SHALL display only the domain name (e.g., 'example.com').

#### Image Posts

WHEN a user uploads an image for a post, THE system SHALL accept JPG, PNG, or GIF formats with max size 5MB.

WHEN an image exceeds 5MB, THE system SHALL display: 'Image file must be less than 5MB.'

WHEN an image post is viewed in a feed, THE system SHALL display a thumbnail version of the image.

## 7. Post Management

### Post Editing

WHEN a user attempts to edit a post within 24 hours of creation, THE system SHALL permit the edit operation.

WHEN a user attempts to edit a post after 24 hours, THE system SHALL display: 'Posts can only be edited within 24 hours of creation.'

WHEN a post is edited, THE system SHALL update the modification timestamp and display a notification that the post was updated.

### Post Deletion

WHEN a user deletes a post, THE system SHALL confirm deletion with: 'Are you sure you want to delete this post? This cannot be undone.'

WHEN a user confirms deletion, THE system SHALL remove the post from all feeds and update the author's karma based on remaining votes.

WHEN a post is deleted, THE system SHALL automatically delete all associated comments.

## 8. Post Voting

### Voting Mechanics

WHEN a user clicks upvote on a post or comment, THE system SHALL record an upvote and update the vote score.

WHEN a user changes an existing upvote to downvote, THE system SHALL update the vote score by -2 (remove upvote + add downvote).

WHEN a user removes their vote, THE system SHALL update the score by the previous vote type (e.g., +1 if they previously upvoted).

### Voting Rules

WHEN a user votes on their own post, THE system SHALL display: 'You cannot vote on your own content.'

WHEN a user attempts to vote on a post in a community they are not subscribed to, THE system SHALL display: 'You must be subscribed to this community to vote on posts.'

WHEN a user is banned from a community, THE system SHALL prevent voting in that community.

## 9. Feed Management

### Feed Types

WHEN a user is logged in, THE system SHALL display Home Feed (posts from subscribed communities).

WHEN a user is not logged in, THE system SHALL display Popular Feed (all platform posts).

WHEN viewing a specific community, THE system SHALL display Community Feed (all posts from that community).

### Feed Sorting Options

WHEN a user selects 'Hot' sort on any feed, THE system SHALL display posts with highest recent activity first.

WHEN a user selects 'New' sort, THE system SHALL sort posts by most recent creation date.

WHEN a user selects 'Top' sort with 'today' time filter, THE system SHALL display posts created within the last 24 hours with highest vote scores.

## 10. Comment Management

### Comment Creation

WHEN a user writes a comment on a post, THE system SHALL validate the comment is not empty.

WHEN a comment exceeds 500 characters, THE system SHALL display: 'Comment cannot exceed 500 characters.'

WHEN a comment is submitted, THE system SHALL display it immediately with the commenter's username and time since posted.

### Comment Nesting

WHEN a user replies to a comment, THE system SHALL create a new comment with the parent ID reference.

WHEN comments are nested, THE system SHALL display them with proportional indentation matching their depth.

WHEN viewing a comment thread, THE system SHALL display all nested replies in a hierarchical tree structure.

## 11. Report System

### Report Submission

WHEN a user reports content, THE system SHALL require a reporting category selection and optional reason text.

WHEN a user submits a report without category selection, THE system SHALL display: 'Please select a reporting category before submitting your report.'

WHEN a user submits a report with empty reason, THE system SHALL display: 'Please provide a valid reason for your report.'

### Moderation Response

WHEN a moderator approves a report, THE system SHALL delete the reported content and adjust the reporter's karma by +1.

WHEN a moderator dismisses a report, THE system SHALL keep the content and notify the reporter: 'Your report has been reviewed. We determine the content does not violate our community guidelines.'

## 12. Moderation System

### Moderator Actions

WHEN a community owner adds a new moderator, THE system SHALL send an email confirmation to the new moderator.

WHEN a moderator bans a user from a community, THE system SHALL remove the banned user's posts and comments and display the community owner or moderators with the ban reason.

WHEN a banned user attempts to post in a community, THE system SHALL display: 'You are banned from this community. For more information, contact a community moderator.'

### Community Ownership

WHEN a community owner deletes their account, THE system SHALL transfer ownership to the next highest ranking moderator.

WHEN a community has no moderators, THE system SHALL make the owner the only moderator and display a warning: 'This community has no moderators. Owner should add moderators for proper management.'

## Business Rules Summary

- All content must be reviewed before deletion to maintain data integrity.
- Karma is a public metric that reflects community validation of contributions.
- Users can vote on posts and comments they can view, with no voting on their own content.
- Moderation actions must have recorded reasons for accountability.
- Community subscriptions are required for content creation in those communities.

## Critical Performance Requirements

- Profile views should load in <1.5 seconds
- Post creation should complete within 2 seconds
- Feed pagination should load next 20 posts in <1.8 seconds
- Vote updates should reflect within 500 milliseconds
- Report submission should complete within 1.2 seconds