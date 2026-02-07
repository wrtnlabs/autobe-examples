# Reddit-like Community Platform - Requirements Specification Document

## Executive Summary

This document defines the comprehensive business requirements for a Reddit-like community platform backend system. The platform will enable users to create and participate in communities around shared interests, share content through posts, engage in discussions via comments, and interact through a sophisticated voting and karma system.

The system will be implemented using TypeScript, NestJS, and Prisma, with a focus on scalability, performance, and user experience. All business requirements have been documented using EARS format where applicable, with natural language descriptions localized to the user's language locale.

## Core Functional Areas

### User Account Management
- Email and password registration with unique username selection
- Secure login and session management
- Password change and account deletion capabilities
- Profile management with display name, bio, and avatar
- Karma score tracking and display

### Community System
- User-created communities with unique names and descriptions
- Community subscription and unsubscription workflows
- Community browsing and search functionality
- Community ownership and moderator assignment system
- Community-specific moderation and banning capabilities

### Content Management
- Text, link, and image post types with creation and editing
- Comment system with unlimited threading depth
- Post and comment deletion workflows
- Content search across the platform
- Content preview and display rules

### Voting and Engagement
- Upvote and downvote functionality for posts and comments
- Single vote per user per content item
- Vote modification and removal capabilities
- Karma calculation and distribution
- Vote score display and sorting algorithms

### Feed and Discovery
- Personalized home feed from subscribed communities
- Popular feed showing platform-wide content
- Community-specific feeds
- Multiple sorting algorithms (Hot, New, Top, Controversial)
- Advanced search functionality
- Pagination support

### Moderation and Reporting
- Community moderator roles and permissions hierarchy
- Content deletion authority
- User banning and unbanning system
- Reporting workflow for community members
- Report review and resolution system

## Business Requirements

### User Account Management Requirements

#### Account Registration
- WHEN a visitor creates an account, THE system SHALL require email address, password, and unique username
- WHEN registration data is submitted, THE system SHALL validate email format, password strength, and username uniqueness
- WHEN registration data is valid, THE system SHALL create a new user account with karma score of zero
- WHEN registration fails validation, THE system SHALL display specific error messages
- WHEN a user account is created, THE system SHALL set initial karma score to zero

#### Account Authentication
- WHEN a user submits login credentials, THE system SHALL verify email and password match an existing account
- WHEN authentication succeeds, THE system SHALL generate an authentication token and maintain an active session
- WHEN authentication fails, THE system SHALL return appropriate error indicating invalid credentials
- WHEN a user logs out, THE system SHALL terminate the active session and invalidate the authentication token
- WHEN a session expires, THE system SHALL require re-authentication

#### Password Management
- WHEN a user requests a password change, THE system SHALL verify their current password
- WHEN a user submits a new password, THE system SHALL validate the new password meets security requirements
- WHEN password change is successful, THE system SHALL update the stored password hash
- WHEN a user forgets their password, THE system SHALL provide a secure password recovery process
- WHEN a user deletes their account, THE system SHALL permanently remove all account data

#### Account Deletion
- WHEN a user initiates account deletion, THE system SHALL require confirmation through password verification
- WHEN account deletion is confirmed, THE system SHALL permanently remove all user data including posts and comments
- WHEN account deletion completes, THE system SHALL terminate all active sessions for that user
- WHEN account deletion fails, THE system SHALL provide clear error messages explaining why deletion could not complete

### Profile Management Requirements

#### Profile Information
- WHEN a user creates their profile, THE system SHALL allow specification of display name, bio text, and avatar image
- WHEN a user edits their profile, THE system SHALL update the stored profile information
- WHEN a user views another user's profile, THE system SHALL display the profile information and activity statistics
- WHEN a user profile is displayed, THE system SHALL show the current karma score

#### Profile View
- WHEN a user visits another user's profile page, THE system SHALL show the profile information, karma score, posts list, and comments list
- WHEN displaying a user's posts, THE system SHALL show title, community, post type, score, and posting date
- WHEN displaying a user's comments, THE system SHALL show content preview, post title, comment score, and posting date
- WHEN a user views their own profile, THE system SHALL indicate ownership clearly

### Karma System Requirements

#### Karma Calculation
- WHEN a user receives an upvote, THE system SHALL increase their karma score by one point
- WHEN a user receives a downvote, THE system SHALL decrease their karma score by one point
- WHEN a user's vote is removed, THE system SHALL adjust karma accordingly (restore to previous state)
- WHEN a user's vote changes from upvote to downvote, THE system SHALL adjust karma by two points (reverse + new vote)
- WHEN karma is calculated, THE system SHALL consider all valid votes on user's content

#### Karma Display
- WHEN a user's profile is viewed, THE system SHALL display the current karma score
- WHEN a user views their own profile, THE system SHALL show the karma score prominently
- WHEN karma changes, THE system SHALL update the display in real-time

### Community Management Requirements

#### Community Creation
- WHEN a user creates a community, THE system SHALL assign them as the community owner
- WHEN a community is created, THE system SHALL generate a unique name and store description and icon
- WHEN community creation fails validation, THE system SHALL provide specific error messages
- WHEN a user creates a community, THE system SHALL set initial subscriber count to one (the creator)

#### Community Listing
- WHEN users browse communities, THE system SHALL display a list of all communities with subscriber counts
- WHEN a community list is displayed, THE system SHALL show name, description, icon, and subscriber count
- WHEN a user views their subscribed communities, THE system SHALL show only communities they actively follow

#### Community Search
- WHEN a user searches for communities, THE system SHALL return communities matching the search query
- WHEN search results are displayed, THE system SHALL show matching communities with subscriber counts
- WHEN no communities match search, THE system SHALL indicate no results were found

### Post Management Requirements

#### Post Creation
- WHEN a user creates a post, THE system SHALL require selection of a subscribed community
- WHEN a user creates a post, THE system SHALL require a title and validate it meets length requirements
- WHEN creating a text post, THE system SHALL accept and store text content
- WHEN creating a link post, THE system SHALL accept and validate URL format
- WHEN creating an image post, THE system SHALL accept image upload and store image metadata
- WHEN post creation is successful, THE system SHALL create the post with initial score of zero

#### Post Editing
- WHEN a user edits their own post, THE system SHALL allow modification of title, content, and metadata
- WHEN post editing is successful, THE system SHALL update the stored post information
- WHEN post editing fails validation, THE system SHALL provide specific error messages
- WHEN a user attempts to edit another user's post, THE system SHALL deny access

#### Post Deletion
- WHEN a user deletes their own post, THE system SHALL permanently remove the post
- WHEN a post is deleted, THE system SHALL remove all associated comments
- WHEN post deletion succeeds, THE system SHALL update affected karma scores
- WHEN a user attempts to delete another user's post, THE system SHALL deny access

#### Post View
- WHEN a user views a single post, THE system SHALL display title, full content, author information, community, vote score, comment count, and posting time
- WHEN displaying post content, THE system SHALL show different content based on post type (text, link, or image)
- WHEN displaying a link post, THE system SHALL show the domain name of the URL
- WHEN displaying an image post, THE system SHALL show the uploaded image with appropriate sizing

#### Post List Display
- WHEN displaying a post in a feed, THE system SHALL show title, author username, community name, vote score, comment count, time since posted, and content preview
- WHEN displaying a text post in a feed, THE system SHALL show first 200 characters of content
- WHEN displaying an image post in a feed, THE system SHALL show thumbnail of the image
- WHEN displaying a link post in a feed, THE system SHALL show domain name of the URL

### Comment Management Requirements

#### Comment Creation
- WHEN a user creates a comment, THE system SHALL require association with a post
- WHEN a user replies to a comment, THE system SHALL establish parent-child relationship
- WHEN comment creation succeeds, THE system SHALL store the comment with initial score of zero
- WHEN comment creation fails validation, THE system SHALL provide specific error messages

#### Comment Editing
- WHEN a user edits their own comment, THE system SHALL allow modification of content
- WHEN comment editing is successful, THE system SHALL update the stored comment
- WHEN a user attempts to edit another user's comment, THE system SHALL deny access

#### Comment Deletion
- WHEN a user deletes their own comment, THE system SHALL permanently remove the comment
- WHEN a comment is deleted, THE system SHALL remove all child comments recursively
- WHEN comment deletion succeeds, THE system SHALL update affected karma scores
- WHEN a user attempts to delete another user's comment, THE system SHALL deny access

#### Comment Sorting
- WHEN comments are sorted by "best", THE system SHALL display highest vote score first
- WHEN comments are sorted by "new", THE system SHALL display most recent first
- WHEN comments are sorted by "controversial", THE system SHALL display many votes but score close to zero first

### Voting System Requirements

#### Voting Operations
- WHEN a user upvotes a post or comment, THE system SHALL increase its score by one point
- WHEN a user downvotes a post or comment, THE system SHALL decrease its score by one point
- WHEN a user has already voted and casts the same vote again, THE system SHALL maintain the existing vote
- WHEN a user changes their vote, THE system SHALL adjust the score accordingly
- WHEN a user removes their vote, THE system SHALL return the score to what it was before their vote

#### Vote Storage
- WHEN a vote is recorded, THE system SHALL store the user's vote type (upvote/downvote/none) for that content
- WHEN a user attempts to vote on multiple accounts, THE system SHALL track votes per user per content item
- WHEN votes are retrieved for display, THE system SHALL calculate the total score correctly

### Feed System Requirements

#### Feed Types
- WHEN a logged-in user accesses the home feed, THE system SHALL show posts only from communities they are subscribed to
- WHEN any user (logged-in or not) accesses the popular feed, THE system SHALL show posts from all communities
- WHEN any user accesses a community feed, THE system SHALL show posts only from that specific community

#### Sorting Algorithms
- WHEN posts are sorted by "hot", THE system SHALL rank recent posts with many upvotes first
- WHEN posts are sorted by "new", THE system SHALL rank most recently created posts first
- WHEN posts are sorted by "top", THE system SHALL rank highest vote score first
- WHEN top sorting includes time filters, THE system SHALL apply the time filter to post creation date
- WHEN posts are sorted by "controversial", THE system SHALL rank posts with many votes but score close to zero first

#### Pagination
- WHEN a feed request includes pagination parameters, THE system SHALL return the specified page of results
- WHEN pagination is not specified, THE system SHALL return a default page size
- WHEN requested page exceeds available content, THE system SHALL return empty results or appropriate message

### Moderation System Requirements

#### Moderator Roles
- WHEN a community is created, THE system SHALL assign the creator as owner and highest authority
- WHEN an owner adds a moderator, THE system SHALL grant moderation permissions to that user
- WHEN an owner removes a moderator, THE system SHALL revoke moderation permissions
- WHEN a moderator attempts to remove an owner, THE system SHALL deny the request
- WHEN a moderator attempts to remove another moderator, THE system SHALL deny the request

#### Moderator Permissions
- WHEN a moderator accesses their community, THE system SHALL allow deletion of any post in that community
- WHEN a moderator accesses their community, THE system SHALL allow deletion of any comment in that community
- WHEN a moderator accesses their community, THE system SHALL allow banning users from that community
- WHEN a moderator accesses their community, THE system SHALL allow unbanning users from that community
- WHEN a moderator accesses their community, THE system SHALL allow viewing the list of banned users

#### Banning
- WHEN a user is banned from a community, THE system SHALL prevent them from creating posts in that community
- WHEN a user is banned from a community, THE system SHALL prevent them from creating comments in that community
- WHEN a user is banned from a community, THE system SHALL allow them to still view community content
- WHEN a user is unbanned from a community, THE system SHALL restore their posting and commenting privileges

### Reporting System Requirements

#### Content Reporting
- WHEN a user reports a post, THE system SHALL require selection of a reporting reason
- WHEN a user reports a comment, THE system SHALL require selection of a reporting reason
- WHEN a report is submitted, THE system SHALL store the report with content, reporter, and reason

#### Report Management
- WHEN a moderator accesses their community reports, THE system SHALL show all pending reports for that community
- WHEN displaying a report, THE system SHALL show the reported content, reporter information, and reporting reason
- WHEN a moderator approves a report, THE system SHALL delete the reported content
- WHEN a moderator dismisses a report, THE system SHALL remove the report from the pending list

#### Report Status
- WHEN a report is dismissed, THE system SHALL remove it from the active report list
- WHEN a report is approved, THE system SHALL delete the reported content and remove the report
- WHEN a user views their reported content status, THE system SHALL show the report status

## Business Logic Summary

The business logic has been structured to ensure data integrity and consistent user experiences:

- User permissions and access controls are properly enforced
- Real-time updates for votes and karma are supported
- Efficient feed generation with multiple sorting options
- Comprehensive moderation capabilities
- Robust reporting workflows

## Implementation Notes

This requirements document provides the complete foundation for building the Reddit-like community platform backend. All requirements have been specified in natural language with EARS format where appropriate, focusing on what the system should do rather than how it should be implemented.

The requirements cover all major functional areas of the platform as specified in the original requirements:
- User management and authentication
- Content creation and engagement
- Community operations
- Moderation and reporting
- Feed and content display

These requirements will be translated into technical specifications by the development team using their expertise in NestJS, TypeScript, and Prisma to implement the backend application.

## EARS Requirements Format

All functional requirements have been documented using the EARS format with the following English keywords:
- **WHEN**: Indicates a trigger or initiating event
- **THE**: Specifies the system's response to the trigger
- **SHALL**: Defines the mandatory behavior or requirement
- **IF**: Introduces conditional logic
- **THEN**: Specifies the outcome of a condition
- **WHERE**: Adds context or constraints

This format ensures clarity and precision in requirements specification while maintaining natural language readability.

## Conclusion

This requirements specification document provides a complete foundation for implementing a Reddit-like community platform. All business requirements have been comprehensively documented, covering user account management, profile features, karma system, community operations, content management, voting functionality, feed algorithms, moderation capabilities, and reporting workflows.

The requirements are written in natural language following EARS format to ensure clarity, testability, and implementation readiness for the backend development team.