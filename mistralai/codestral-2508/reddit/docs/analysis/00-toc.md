# Functional Requirements for Reddit-like Community Platform

## Table of Contents

1. [User Registration and Login](#user-registration-and-login)
2. [Community Creation](#community-creation)
3. [Posting Content](#posting-content)
4. [Voting System](#voting-system)
5. [Commenting System](#commenting-system)
6. [Karma System](#karma-system)
7. [Post Sorting](#post-sorting)
8. [Community Subscription](#community-subscription)
9. [User Profiles](#user-profiles)
10. [Content Reporting](#content-reporting)

## User Registration and Login

### User Registration

- Users can register with a username, email, and password
- Users must verify their email address to complete registration
- Users can register using social media accounts (optional)

### User Login

- Users can log in with their email and password
- Users can log in using social media accounts (optional)
- Users can reset their password if forgotten
- Users can change their password

### User Authentication

- Users must be authenticated to access certain features
- Authentication tokens must be secure and expire after a set period
- Users can log out to end their session

## Community Creation

### Community Creation

- Users can create communities (subreddits)
- Communities must have a unique name and description
- Users can set community rules and guidelines

### Community Management

- Community creators can appoint moderators
- Moderators can manage posts and comments
- Community creators can delete their community

## Posting Content

### Post Creation

- Users can create text posts, link posts, and image posts
- Posts must have a title and content
- Users can edit their posts
- Users can delete their posts

### Post Management

- Moderators can remove posts that violate community rules
- Admins can remove any posts

## Voting System

### Voting on Posts

- Users can upvote and downvote posts
- Users can change their vote
- Users can remove their vote

### Voting on Comments

- Users can upvote and downvote comments
- Users can change their vote
- Users can remove their vote

## Commenting System

### Comment Creation

- Users can comment on posts
- Users can reply to comments (nested replies)
- Users can edit their comments
- Users can delete their comments

### Comment Management

- Moderators can remove comments that violate community rules
- Admins can remove any comments

## Karma System

### Karma Tracking

- Users earn karma for upvoted posts and comments
- Users lose karma for downvoted posts and comments
- Users can view their karma score

### Karma Display

- Karma scores are displayed on user profiles
- Karma scores are displayed next to posts and comments

## Post Sorting

### Sorting Options

- Posts can be sorted by hot, new, top, and controversial
- Users can choose their preferred sorting method

### Sorting Logic

- Hot: Posts with recent activity and high engagement
- New: Posts sorted by creation date
- Top: Posts sorted by total votes
- Controversial: Posts with high upvote/downvote ratio

## Community Subscription

### Subscription Management

- Users can subscribe to communities
- Users can unsubscribe from communities
- Users can view their subscribed communities

### Subscription Notifications

- Users can receive notifications for new posts in subscribed communities
- Users can customize notification preferences

## User Profiles

### Profile Management

- Users can create and edit their profiles
- Users can upload a profile picture
- Users can add a bio and other personal information

### Profile Display

- User profiles display posts and comments
- User profiles display karma score
- User profiles display subscribed communities

## Content Reporting

### Reporting Content

- Users can report posts and comments
- Reports must include a reason for reporting
- Users can view the status of their reports

### Report Management

- Moderators can review reports
- Moderators can take action on reported content
- Admins can review and manage all reports

> *Developer Note: This document defines business requirements only. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*