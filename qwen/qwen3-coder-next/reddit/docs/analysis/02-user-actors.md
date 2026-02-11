# Reddit-like Community Platform - Requirements Specification

## Overview

### Service Introduction

This document specifies requirements for a Reddit-like community platform. The platform enables users to create and join communities around shared interests, share content through posts and comments, vote on content quality, and participate in community moderation.

### Core Value Proposition

The platform provides:
- **Community Building**: Users can create and join communities around any topic of interest
- **Content Discovery**: Multiple feed types help users find relevant content from their subscribed communities or across the entire platform
- **Reputation System**: Karma scores reward quality contributions and encourage positive community participation
- **Moderation Infrastructure**: Comprehensive moderation tools enable communities to maintain quality and enforce standards
- **Content Reporting**: Reporting system allows users to flag inappropriate content for moderator review

### Target Audience

The primary audience includes:
- **Content Creators**: Users who want to share insights, opinions, and creative work with a community
- **Community Builders**: Users who want to create spaces for niche topics and interests
- **Engaged Readers**: Users who want to discover quality content and participate in discussions
- **Moderators**: Community volunteers who want to maintain quality and enforce community standards

## User Account Management

### Registration and Authentication

#### Registration Workflow

WHEN a user visits the registration page, THE system SHALL provide fields for:
- Email address
- Password (minimum 8 characters with uppercase, lowercase, and number)
- Username (unique alphanumeric identifier)

WHEN a user submits valid registration information, THE system SHALL:
- Create a new user account with the provided email, username, and hashed password
- Generate a unique verification token
- Send a verification email with the token link
- Set initial karma score to zero
- Create an unverified account status
- Return success response with account details

WHEN a user registers, THE system SHALL:
- Require email address validation format
- Enforce password complexity requirements (8+ characters, uppercase, lowercase, number)
- Validate username uniqueness and format (alphanumeric only)
- Store password using bcrypt hashing with cost factor 12
- Generate unique verification token for email confirmation
- Rate limit registration attempts (3 per IP per hour)

WHEN a user attempts to register with an existing email or username, THE system SHALL:
- Return HTTP 409 Conflict with appropriate error code
- Provide clear message indicating which field is duplicated
- Not reveal whether email or username exists for security

#### Email Verification

WHEN a user receives the verification email, THE system SHALL:
- Include a unique verification link with token parameter
- Set token expiration to 24 hours
- Link format: `https://app.com/verify?token={verification_token}`

WHEN a user clicks the verification link, THE system SHALL:
- Validate the verification token
- Check token expiration
- Mark user email as verified
- Activate user account
- Log verification event
- Return success confirmation

WHEN a user attempts to use an expired verification token, THE system SHALL:
- Return HTTP 400 Bad Request with error code VERIFICATION_TOKEN_EXPIRED
- Clear expired token from database
- Allow user to request new verification email

WHEN a user requests verification email resending, THE system SHALL:
- Generate new verification token
- Update expiration time to 24 hours from request
- Send new verification email
- Log verification request event
- Rate limit requests to 3 per hour per user

#### Login and Session Management

WHEN a user submits login credentials, THE system SHALL:
- Validate email format and existence
- Verify password against stored hash
- Check account is not suspended
- Generate new access and refresh tokens
- Store refresh token in database
- Create session record with metadata (IP, device, timestamp)
- Return access and refresh tokens in secure response

WHEN login succeeds, THE system SHALL return:
- Access token (JWT, 15-minute expiration)
- Refresh token (JWT, 30-day expiration)
- User account details
- Session metadata
- Authentication success confirmation

WHEN login fails, THE system SHALL:
- Increment failed login attempt counter
- Return HTTP 401 Unauthorized with appropriate error code
- Log authentication failure for security monitoring
- TEMPORARILY lock account after 5 consecutive failures
- Require CAPTCHA verification after 10 failed attempts

#### Password Management

WHEN a user requests password change, THE system SHALL:
- Require current password verification
- Enforce new password complexity requirements
- Verify new password differs from last 5 passwords
- Hash new password using bcrypt cost factor 12
- Update user record with new password
- Invalidate all active sessions for security
- Send password change confirmation email
- Log password change event

WHEN a user requests password reset, THE system SHALL:
- Validate email address existence
- Generate unique reset token
- Store token with 1-hour expiration
- Send password reset email with reset link
- Log password reset request event
- Rate limit requests to 3 per hour

WHEN a user submits new password via reset link, THE system SHALL:
- Validate reset token and expiration
- Enforce password complexity requirements
- Hash new password using bcrypt cost factor 12
- Update user record with new password
- Invalidate all active sessions
- Send password change confirmation email
- Log password reset completion event

#### Account Deletion

WHEN a user requests account deletion, THE system SHALL:
- Mark account as pending deletion
- Send deletion confirmation email with 24-hour cooling-off period
- Allow account recovery during cooling-off period
- During cooling-off, restrict post and comment creation
- After cooling-off period, cascade delete all content
- Invalidate all active sessions
- Delete all refresh tokens
- Remove all session records
- Securely delete user data
- Log deletion event

The cascade deletion SHALL include:
- All posts created by user
- All comments created by user
- All votes cast by user
- All subscriptions created by user
- All communities owned by user (if no transfer possible)
- All reported content by user
- All notification preferences
- All profile data

WHEN an admin permanently deletes an account, THE system SHALL:
- Immediately cascade delete all user content
- Invalidate all active sessions
- Delete all refresh tokens
- Remove all session records
- Securely delete user data
- Log permanent deletion event

### Error Handling

#### Authentication Errors

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| AUTH_INVALID_CREDENTIALS | 401 | Invalid email or password |
| AUTH_ACCOUNT_NOT_FOUND | 401 | No account found with provided email |
| AUTH_ACCOUNT_SUSPENDED | 403 | Account has been suspended |
| AUTH_TOKEN_EXPIRED | 401 | Access token has expired |
| AUTH_TOKEN_INVALID | 401 | Access token is invalid |
| AUTH_REFRESH_TOKEN_EXPIRED | 401 | Refresh token has expired |
| AUTH_REFRESH_TOKEN_INVALID | 401 | Refresh token is invalid |
| AUTH_TOKEN_REVOKED | 401 | Token has been revoked |
| AUTH_EMAIL_NOT_VERIFIED | 403 | Email has not been verified |
| AUTH_PASSWORD_TOO_WEAK | 400 | Password does not meet security requirements |
| AUTH_EMAIL_EXISTS | 409 | Email already registered |
| AUTH_USERNAME_EXISTS | 409 | Username already taken |

#### Session Errors

| Error Code | HTTP Status | Description |
|------------|-------------|-------------|
| SESSION_NOT_FOUND | 404 | Session does not exist |
| SESSION_INVALID | 400 | Session is invalid |
| SESSION_EXPIRED | 401 | Session has expired |
| SESSION_CONFLICT | 409 | Session conflict detected |

## User Profiles

### Profile Creation and Management

#### Profile Structure

Each user profile SHALL contain:
- Display name (user-selected, up to 50 characters)
- Bio text (optional, up to 500 characters)
- Avatar image (optional, uploaded by user)
- Username (unique, system-generated or user-selected)
- Email address (verified, private)
- Karma score (calculated from votes)
- Account creation date
- Email verification status

#### Profile Editing

WHEN a user edits their profile, THE system SHALL:
- Allow editing of display name, bio, and avatar
- Validate display name length (1-50 characters)
- Validate bio length (0-500 characters)
- Process avatar image upload if provided
- Update profile record in database
- Return updated profile information

WHEN a user uploads an avatar image, THE system SHALL:
- Validate image format (JPEG, PNG, GIF)
- Validate image size (maximum 5MB)
- Resize and optimize image for storage
- Store image with secure naming
- Return image URL for profile update

WHEN a user attempts to edit another user's profile, THE system SHALL:
- Return HTTP 403 Forbidden
- Include error code PROFILE_EDIT_DENIED
- Log unauthorized access attempt

#### Profile Display

WHEN a user views their own profile, THE system SHALL:
- Display all profile information
- Show edit controls for profile management
- Display own posts and comments sections
- Show karma score breakdown
- Provide account management options

WHEN a user views another user's profile, THE system SHALL:
- Display public profile information
- Show posts and comments created by that user
- Display karma score
- Hide private information (email)
- Show only own karma breakdown if viewing own profile

WHEN viewing a user profile, THE system SHALL:
- Display display name as header
- Show bio text if available
- Display avatar image if uploaded
- Show total karma score
- Show account creation date
- Display posts and comments sections with pagination
- Show total post count and comment count

### Profile Privacy

WHEN a user views a profile, THE system SHALL:
- Hide email address from all profile views
- Hide phone number (if added) from public views
- Show only verified account status
- Allow users to hide karma breakdown from public
- Allow users to disable profile visibility entirely

## Karma System

### Karma Calculation

#### Karma Score Definition

Each user has a single karma score that represents their reputation in the community. The karma score is calculated as:

```
karma_score = total_upvotes_received - total_downvotes_received
```

#### Karma Impact Events

WHEN a user receives an upvote on their post or comment, THE system SHALL:
- Increase their karma score by 1
- Log the karma change event
- Update user record in database

WHEN a user receives a downvote on their post or comment, THE system SHALL:
- Decrease their karma score by 1
- Log the karma change event
- Update user record in database

WHEN a user's vote is removed, THE system SHALL:
- Revert the karma impact of the removed vote
- If vote was upvote: decrease karma by 1
- If vote was downvote: increase karma by 1
- Log the karma adjustment event
- Update user record in database

WHEN a user changes their vote from upvote to downvote, THE system SHALL:
- Decrease karma by 2 (remove +1, apply -1)
- Log the karma adjustment event
- Update user record in database

WHEN a user changes their vote from downvote to upvote, THE system SHALL:
- Increase karma by 2 (remove -1, apply +1)
- Log the karma adjustment event
- Update user record in database

#### Negative Karma Handling

Karma scores CAN be negative. The system SHALL:
- Allow karma scores below zero
- Not enforce minimum karma requirements
- Not restrict user functionality based on karma level
- Display negative karma with minus sign (e.g., "-5 karma")

### Karma Display

#### Profile Display

WHEN a user views their own profile, THE system SHALL:
- Display total karma score prominently
- Show breakdown of karma sources:
  - Karma from posts
  - Karma from comments
  - Net change in last 30 days

WHEN a user views another user's profile, THE system SHALL:
- Display total karma score
- Hide detailed breakdown (privacy)
- Show only total karma score

#### Content Display

WHEN a post or comment displays author information, THE system SHALL:
- Show author username
- Show author karma score in parentheses
- Format: `username (karma_score)`

## Communities

### Community Creation

#### Community Structure

Each community SHALL contain:
- Unique name (alphanumeric, underscores, hyphens)
- Description text (up to 1,000 characters)
- Icon image (optional, uploaded by creator)
- Creation date and time
- Owner user reference
- Moderator list
- Subscriber count
- Post count
- Ban list

#### Creation Workflow

WHEN a user creates a community, THE system SHALL:
- Validate community name uniqueness and format
- Create community record with provided information
- Set creating user as community owner
- Add creating user to moderator list with owner permissions
- Initialize subscriber and post counts to zero
- Generate community icon placeholder if not uploaded
- Return community details in response

WHEN a user attempts to create a community with a duplicate name, THE system SHALL:
- Return HTTP 409 Conflict with error code COMMUNITY_NAME_EXISTS
- Provide suggestion for alternative names if possible
- Log creation attempt event

WHEN a user creates a community, THE system SHALL:
- Require unique community name (case-insensitive)
- Validate name format (alphanumeric, underscores, hyphens only)
- Enforce name length (3-50 characters)
- Validate description length (0-1,000 characters)
- Set creation timestamp
- Initialize subscriber count to 1 (creator)
- Initialize post count to 0

### Community Management

#### Owner Management

WHEN a community owner wants to transfer ownership, THE system SHALL:
- Validate target user is a member of the community
- Validate target user is not already an owner or moderator
- Update owner reference to target user
- Remove current owner from owner status (keep as member)
- Update all moderator permissions
- Log ownership transfer event
- Notify both users of ownership change

WHEN a community owner wants to disband the community, THE system SHALL:
- Validate owner permissions
- Archive all posts and comments (mark as deleted)
- Delete community record
- Update all user subscriptions
- Log community deletion event
- Notify all subscribers of community closure

#### Moderator Management

WHEN an owner adds a moderator, THE system SHALL:
- Validate target user is a member of the community
- Validate target user is not already a moderator or owner
- Add user to moderator list with moderator permissions
- Update user's JWT token to include community moderator role
- Log moderator addition event
- Notify added user

WHEN an owner removes a moderator, THE system SHALL:
- Validate owner permissions
- Remove user from moderator list
- Update user's JWT token to remove community moderator role
- Log moderator removal event
- Notify removed user

WHEN a moderator attempts to add/remove another moderator, THE system SHALL:
- Return HTTP 403 Forbidden
- Include error code MODERATOR_PERMISSION_DENIED
- Log unauthorized attempt event

WHEN a moderator attempts to remove the owner, THE system SHALL:
- Return HTTP 403 Forbidden
- Include error code OWNER_PROTECTION_ACTIVE
- Log unauthorized attempt event

#### Community Settings

WHEN a community owner edits community settings, THE system SHALL:
- Validate name uniqueness if changing
- Validate description length
- Process new icon upload if provided
- Update community record in database
- Return updated community information

### Community Subscription

#### Subscription Workflow

WHEN a user subscribes to a community, THE system SHALL:
- Validate user authentication
- Validate community exists
- Check user is not banned from community
- Create subscription record
- Increment community subscriber count
- Update user's subscription list
- Return subscription confirmation

WHEN a user subscribes but is banned from the community, THE system SHALL:
- Return HTTP 403 Forbidden
- Include error code USER_BANNED
- Provide ban expiration information if applicable
- Log subscription attempt event

WHEN a user unsubscribes from a community, THE system SHALL:
- Validate user authentication
- Validate subscription exists
- Delete subscription record
- Decrement community subscriber count
- Update user's subscription list
- Return unsubscription confirmation

WHEN a user creates a post, THE system SHALL:
- Validate user is subscribed to the community
- Return HTTP 403 Forbidden if not subscribed
- Include error code COMMUNITY_SUBSCRIPTION_REQUIRED

#### Subscription Management

WHEN a user views their subscribed communities, THE system SHALL:
- Return list of all subscribed communities
- Include subscriber count and post count
- Include subscription date for each
- Paginate results if user subscribes to many communities

WHEN a user searches for communities, THE system SHALL:
- Search community names and descriptions
- Return matching communities with relevant details
- Include subscriber count
- Support case-insensitive search

### Community Display

#### Community Listing

WHEN users browse all communities, THE system SHALL:
- Return paginated list of communities
- Include name, description, icon, subscriber count
- Support sorting by popularity (subscriber count)
- Support filtering by category (if implemented)

WHEN viewing community details, THE system SHALL:
- Display community name and description
- Show icon image
- Display owner username
- Show current subscriber count
- Show post count
- Show moderator list
- Show ban list (for authorized users only)

## Posts

### Post Creation

#### Post Structure

Each post SHALL contain:
- Title (required, up to 300 characters)
- Content (one of: text content, link URL, image URL)
- Author reference
- Community reference
- Vote score (initially 0)
- Comment count (initially 0)
- Creation timestamp
- Edit timestamp (if applicable)
- Post type (text, link, image)

#### Content Type Validation

WHEN a user creates a post, THE system SHALL:
- Require title field
- Enforce post type selection
- Validate content based on post type:
  - Text post: require text content, validate length (0-50,000 characters)
  - Link post: require valid URL format
  - Image post: validate image upload and format
- Return appropriate validation errors

WHEN a user creates a text post, THE system SHALL:
- Validate title length (1-300 characters)
- Validate text content length (0-50,000 characters)
- Store text content in database
- Set post type to "text"

WHEN a user creates a link post, THE system SHALL:
- Validate URL format and protocol
- Extract domain name for display
- Validate URL length (1-2,000 characters)
- Store URL in database
- Set post type to "link"

WHEN a user creates an image post, THE system SHALL:
- Validate image upload (JPEG, PNG, GIF)
- Validate image size (maximum 20MB)
- Process and optimize image
- Store image URL in database
- Set post type to "image"
- Generate thumbnail image

#### Community Subscription Validation

WHEN a user creates a post, THE system SHALL:
- Validate user is authenticated
- Validate community exists
- Validate user is subscribed to community
- Return HTTP 403 Forbidden if not subscribed
- Include error code COMMUNITY_SUBSCRIPTION_REQUIRED

### Post Management

#### Post Editing

WHEN a user edits their own post, THE system SHALL:
- Validate post ownership
- Validate title length if editing title
- Validate content based on post type
- Update edit timestamp
- Return updated post information

WHEN a user attempts to edit another user's post, THE system SHALL:
- Return HTTP 403 Forbidden
- Include error code POST_EDIT_DENIED
- Log unauthorized edit attempt

WHEN a moderator edits any post in their community, THE system SHALL:
- Validate moderator permissions
- Allow title and content editing
- Log moderation action
- Return updated post information

#### Post Deletion

WHEN a user deletes their own post, THE system SHALL:
- Validate post ownership
- Delete post record
- Decrement community post count
- Update subscribed users' feeds
- Return deletion confirmation

WHEN a user deletes their post, THE system SHALL cascade:
- Delete all comments on the post
- Delete all votes on the post
- Update karma scores for affected users
- Update comment counts in all parent comments

WHEN a moderator deletes any post in their community, THE system SHALL:
- Validate moderator permissions
- Archive post content (not permanently delete)
- Log moderation action
- Update subscribed users' feeds
- Return deletion confirmation

WHEN an admin deletes any post, THE system SHALL:
- Validate admin permissions
- Archive post content
- Log admin action
- Update subscribed users' feeds
- Return deletion confirmation

### Post Voting

#### Voting Workflow

WHEN a user votes on a post, THE system SHALL:
- Validate user authentication
- Validate post exists
- Check user has not already voted (or allow vote change)
- Create or update vote record
- Update post vote score
- Adjust karma score for post author
- Return updated vote status

WHEN a user upvotes a post, THE system SHALL:
- Create or update vote record with upvote status
- Increment post vote score by 1
- Increment author karma by 1
- Log vote event

WHEN a user downvotes a post, THE system SHALL:
- Create or update vote record with downvote status
- Decrement post vote score by 1
- Decrement author karma by 1
- Log vote event

WHEN a user changes vote from upvote to downvote, THE system SHALL:
- Decrement post vote score by 2 (remove +1, apply -1)
- Decrement author karma by 2 (remove +1, apply -1)
- Update vote record with new status
- Log vote change event

WHEN a user changes vote from downvote to upvote, THE system SHALL:
- Increment post vote score by 2 (remove -1, apply +1)
- Increment author karma by 2 (remove -1, apply +1)
- Update vote record with new status
- Log vote change event

WHEN a user removes their vote, THE system SHALL:
- Delete vote record
- Revert vote score adjustment
- Revert karma adjustment
- Log vote removal event

#### Self-Voting Prohibition

WHEN a user attempts to vote on their own post, THE system SHALL:
- Return HTTP 403 Forbidden
- Include error code SELF_VOTING_PROHIBITED
- Log unauthorized vote attempt
- Not modify vote count or karma

#### Vote Limitation

WHEN a user has already voted on a post, THE system SHALL:
- Allow vote change (upvote to downvote or vice versa)
- Allow vote removal (取消投票)
- Return current vote status if no action taken

### Post Display

#### Single Post View

WHEN a user views a single post, THE system SHALL:
- Display post title
- Display content based on post type:
  - Text post: show full text content
  - Link post: show URL with domain name
  - Image post: show image with optional caption
- Display author information (username, karma)
- Display community name and link
- Display vote score
- Display comment count
- Display creation and edit timestamps
- Display vote controls for authenticated users
- Show user's current vote status

#### Post List Display

WHEN posts display in a feed, THE system SHALL show:
- Title (truncated if necessary)
- Author username with link to profile
- Community name with link to community
- Vote score
- Comment count
- Time since posting (e.g., "3 hours ago")
- Post type indicator (text, link, image)

WHEN displaying text posts, THE system SHALL:
- Show first 200 characters of content
- Show "Read more" link if content exceeds limit

WHEN displaying image posts, THE system SHALL:
- Show thumbnail image (100x100 pixels)
- Link to full image view

WHEN displaying link posts, THE system SHALL:
- Show domain name extracted from URL
- Hide full URL in listing (show in full view)

### Post Feeds

#### Home Feed

WHEN an authenticated user accesses their home feed, THE system SHALL:
- Show posts only from communities they are subscribed to
- Sort posts according to selected sorting algorithm
- Paginate results
- Mark posts as unread if new
- Return feed with post details and vote status

WHEN a guest user accesses home feed, THE system SHALL:
- Return HTTP 401 Unauthorized
- Include error code AUTHENTICATION_REQUIRED

#### Popular Feed

WHEN any user (authenticated or not) accesses popular feed, THE system SHALL:
- Show posts from all communities across platform
- Sort posts by hot algorithm (recent posts with many upvotes)
- Paginate results
- Return feed with post details

#### Community Feed

WHEN any user accesses a community feed, THE system SHALL:
- Show posts from specified community
- Sort posts according to selected sorting algorithm
- Paginate results
- Include community information
- Return feed with post details

### Post Sorting Algorithms

#### Hot Algorithm

WHEN posts sort by hot, THE system SHALL:
- Calculate hot score based on:
  - Vote score
  - Time since posting
  - Rate of new votes
- Use formula: `hot_score = vote_score / ((hours_since_post + 2)^1.5)`
- Order by hot score descending
- Include recent posts with many upvotes first

#### New Algorithm

WHEN posts sort by new, THE system SHALL:
- Order by creation timestamp descending
- Include most recent posts first
- Ignore vote scores and hot calculations

#### Top Algorithm

WHEN posts sort by top, THE system SHALL:
- Order by vote score descending
- Support time filters (today, this week, this month, this year, all time)
- Apply time filter to initial query
- Support all time by default

WHEN time filter is applied, THE system SHALL:
- Filter posts by creation timestamp
- Today: posts from current calendar day
- This week: posts from last 7 days
- This month: posts from last 30 days
- This year: posts from last 365 days
- All time: no time filter applied

#### Controversial Algorithm

WHEN posts sort by controversial, THE system SHALL:
- Calculate controversy score based on:
  - Total vote count (upvotes + downvotes)
  - Vote balance ( closeness to zero score)
- Use formula: `controversy_score = total_votes / |score|`
- Order by controversy score descending
- Include posts with many votes but score close to zero first

### Pagination

#### Feed Pagination

WHEN feeds paginate, THE system SHALL:
- Support offset-based pagination
- Default page size: 25 posts
- Maximum page size: 100 posts
- Return total post count for UI
- Include cursor for infinite scroll if supported

WHEN pagination parameters are invalid, THE system SHALL:
- Return HTTP 400 Bad Request
- Include error code INVALID_PAGINATION
- Suggest valid page size range

## Comments

### Comment Creation

#### Comment Structure

Each comment SHALL contain:
- Content text (up to 10,000 characters)
- Author reference
- Post reference
- Parent comment reference (null for top-level)
- Depth level (0 for top-level, increments for replies)
- Vote score (initially 0)
- Creation timestamp
- Edit timestamp (if applicable)
- Reply count

#### Comment Posting

WHEN a user creates a comment, THE system SHALL:
- Validate post exists
- Validate user authentication
- Check user is not banned from post's community
- Validate comment content length (1-10,000 characters)
- Create comment record with provided information
- Increment post comment count
- Return comment details in response

WHEN a user creates a reply, THE system SHALL:
- Validate parent comment exists
- Calculate depth level (parent depth + 1)
- Link reply to parent comment and post
- Increment parent comment reply count
- Return reply details in response

WHEN a banned user attempts to comment, THE system SHALL:
- Return HTTP 403 Forbidden
- Include error code USER_BANNED
- Log unauthorized comment attempt

### Comment Threading

#### Thread Structure

Comments support unlimited depth nesting:
- Top-level comments have parent = null, depth = 0
- Replies have parent = comment ID, depth = parent depth + 1
- All comments reference the original post
- Thread tree maintained by parent-child relationships

#### Thread Display

WHEN displaying comment thread, THE system SHALL:
- Show top-level comments first
- Show replies nested under their parents
- Indent replies based on depth level
- Support expand/collapse for deep threads
- Show total comment count for post

### Comment Voting

#### Voting Rules

Comment voting follows the same rules as post voting:

WHEN a user votes on a comment, THE system SHALL:
- Validate user authentication
- Validate comment exists
- Check user has not already voted (or allow vote change)
- Create or update vote record
- Update comment vote score
- Adjust karma score for comment author
- Return updated vote status

WHEN a user attempts to vote on their own comment, THE system SHALL:
- Return HTTP 403 Forbidden
- Include error code SELF_VOTING_PROHIBITED
- Log unauthorized vote attempt

### Comment Editing

#### Edit Permissions

WHEN a user edits their own comment, THE system SHALL:
- Validate comment ownership
- Validate content length (1-10,000 characters)
- Update edit timestamp
- Return updated comment information

WHEN a user attempts to edit another user's comment, THE system SHALL:
- Return HTTP 403 Forbidden
- Include error code COMMENT_EDIT_DENIED
- Log unauthorized edit attempt

WHEN a moderator edits any comment in their community, THE system SHALL:
- Validate moderator permissions
- Allow content editing
- Log moderation action
- Return updated comment information

WHEN an admin edits any comment, THE system SHALL:
- Validate admin permissions
- Allow content editing
- Log admin action
- Return updated comment information

### Comment Deletion

#### Delete Permissions

WHEN a user deletes their own comment, THE system SHALL:
- Validate comment ownership
- Delete comment record
- Decrement parent comment reply count
- Decrement post comment count
- Cascade delete all replies
- Update karma scores for affected users
- Return deletion confirmation

WHEN a moderator deletes any comment in their community, THE system SHALL:
- Validate moderator permissions
- Archive comment content
- Log moderation action
- Update karma scores for affected users
- Return deletion confirmation

WHEN an admin deletes any comment, THE system SHALL:
- Validate admin permissions
- Archive comment content
- Log admin action
- Update karma scores for affected users
- Return deletion confirmation

### Comment Sorting

#### Sorting Algorithms

Comments support three sorting algorithms:

WHEN comments sort by best, THE system SHALL:
- Order by vote score descending
- Show highest-scoring comments first
- Show comments with most votes first when scores equal

WHEN comments sort by new, THE system SHALL:
- Order by creation timestamp descending
- Show most recent comments first

WHEN comments sort by controversial, THE system SHALL:
- Calculate controversy score
- Order by controversy score descending
- Show divisive comments first

## Moderation

### Moderator Roles and Hierarchy

#### Role Structure

The system supports four moderator roles:

1. **Community Owner** (highest authority)
   - All community permissions
   - Can manage other moderators
   - Can transfer ownership
   - Can disband community

2. **Community Moderator** (appointed by owner)
   - Content moderation permissions
   - Cannot manage other moderators
   - Cannot edit community settings

3. **Admin** (system-wide authority)
   - Platform-wide moderation
   - Can manage all communities
   - Can suspend user accounts

4. **Member** (regular user)
   - Standard platform permissions
   - No moderation capabilities

#### Role Assignment

WHEN an owner adds a moderator, THE system SHALL:
- Validate target user is a member of the community
- Add user to moderator list with appropriate permissions
- Update user's JWT token to include community moderator role
- Log moderator addition event
- Notify added user

WHEN an owner removes a moderator, THE system SHALL:
- Remove user from moderator list
- Update user's JWT token to remove community moderator role
- Log moderator removal event
- Notify removed user

WHEN a moderator attempts to add/remove another moderator, THE system SHALL:
- Return HTTP 403 Forbidden
- Include error code MODERATOR_PERMISSION_DENIED
- Log unauthorized attempt event

### Ban System

#### Banning Workflow

WHEN a moderator bans a user from a community, THE system SHALL:
- Validate ban permissions
- Create ban record with reason (optional)
- Set ban expiration (permanent or time-limited)
- Notify banned user
- Log ban event

WHEN a banned user attempts to create a post in the banned community, THE system SHALL:
- Return HTTP 403 Forbidden
- Include error code USER_BANNED
- Provide ban expiration information if applicable
- Log unauthorized post attempt

WHEN a banned user attempts to create a comment in the banned community, THE system SHALL:
- Return HTTP 403 Forbidden
- Include error code USER_BANNED
- Provide ban expiration information if applicable
- Log unauthorized comment attempt

WHEN a banned user attempts to subscribe to the banned community, THE system SHALL:
- Return HTTP 403 Forbidden
- Include error code USER_BANNED
- Provide ban expiration information if applicable
- Log unauthorized subscription attempt

#### Unbanning Workflow

WHEN a moderator unban a user from a community, THE system SHALL:
- Validate unban permissions
- Delete ban record
- Notify unbanned user
- Log unban event

WHEN a ban expires naturally, THE system SHALL:
- Automatically remove ban record
- Restore user's ability to post and comment
- Log expiration event

### Content Management

#### Moderator Actions

WHEN a moderator deletes a post, THE system SHALL:
- Validate moderator permissions for community
- Archive post content (not permanently delete)
- Update subscribed users' feeds
- Log moderation action
- Return deletion confirmation

WHEN a moderator deletes a comment, THE system SHALL:
- Validate moderator permissions for community
- Archive comment content
- Update karma scores for affected users
- Log moderation action
- Return deletion confirmation

WHEN a moderator views banned users list, THE system SHALL:
- Validate moderator permissions for community
- Return list of banned users with ban details
- Include ban reason and expiration if applicable

#### Admin Actions

WHEN an admin views any community's banned users, THE system SHALL:
- Validate admin permissions
- Return community's banned users list
- Include ban reason and expiration
- Log admin view event

WHEN an admin removes any user's ban from any community, THE system SHALL:
- Validate admin permissions
- Delete ban record
- Notify affected user
- Log admin action

## Reporting System

### Reporting Process

#### Report Creation

WHEN a user reports content, THE system SHALL:
- Validate user authentication
- Validate content exists
- Require report reason (text, 1-500 characters)
- Create report record with content reference, reporter, and reason
- Increment report count on affected content
- Return report confirmation

WHEN a user reports a post, THE system SHALL:
- Reference post ID in report record
- Store post title and content summary
- Store post author information

WHEN a user reports a comment, THE system SHALL:
- Reference comment ID in report record
- Store comment content summary
- Store comment author information
- Store parent post information

#### Report Types

The system supports two report types:

1. **Post Reports**
   - Referenced by post ID
   - Include post title, content, and author
   - Tracked separately per post

2. **Comment Reports**
   - Referenced by comment ID
   - Include comment content and author
   - Tracked separately per comment

### Moderator Review

#### Report Viewing

WHEN a moderator views reports for their community, THE system SHALL:
- Validate moderator permissions
- Return list of pending reports
- Include reported content details
- Include reporter information
- Include report reason
- Include report creation time

WHEN an admin views reports across all communities, THE system SHALL:
- Validate admin permissions
- Return all pending reports
- Include community information for each report
- Include full content details

#### Report Resolution

WHEN a moderator approves a report, THE system SHALL:
- Validate moderator permissions for report's community
- Delete reported content (post or comment)
- Archive content for audit trail
- Update karma scores for affected users
- Increment moderator action log
- Remove report from pending list
- Log moderation action

WHEN a moderator dismisses a report, THE system SHALL:
- Validate moderator permissions for report's community
- Remove report from pending list
- Increment moderator action log
- Log moderation action
- Notify reporter of dismissal

WHEN an admin approves or dismisses any report, THE system SHALL:
- Validate admin permissions
- Process approval or dismissal
- Update all affected records
- Log admin action

### Report History

#### Report Tracking

THE system SHALL track:
- All report creation events
- All report resolution events
- Moderator actions taken
- Content deletion events
- User karma adjustments

#### Report Data Retention

Report records SHALL be retained:
- Pending reports: until resolved or 90 days
- Resolved reports: 1 year
- Audit trail: permanent

## Performance Requirements

### Response Time Targets

The system SHALL meet these response time targets:

| Endpoint Type | P50 Response Time | P95 Response Time | P99 Response Time |
|---------------|-------------------|-------------------|-------------------|
| Authentication | 200ms | 500ms | 1,000ms |
| Feed Loading | 300ms | 800ms | 2,000ms |
| Post Creation | 400ms | 1,000ms | 2,500ms |
| Comment Creation | 400ms | 1,000ms | 2,500ms |
| Voting | 200ms | 500ms | 1,000ms |
| User Profile | 100ms | 300ms | 800ms |
| Community List | 200ms | 500ms | 1,500ms |
| Search | 300ms | 800ms | 2,000ms |

### Concurrency Requirements

The system SHALL support:
- 10,000 concurrent active users
- 1,000 concurrent write operations
- 100 concurrent API requests per user
- No more than 100ms queue time under peak load

### Scalability Targets

The system SHALL scale to:
- 1,000,000 total users
- 100,000 active users per month
- 50,000 posts per day
- 200,000 comments per day
- Vertical scaling with database read replicas

### Reliability Requirements

The system SHALL maintain:
- 99.9% uptime SLA
- Automatic failover to secondary region
- Daily database backups with 30-day retention
- Real-time monitoring and alerting

## Security Requirements

### Authentication Security

THE system SHALL:
- Use HTTPS for all API communications
- Store passwords using bcrypt with cost factor 12
- Implement rate limiting on authentication endpoints
- Support 2FA (two-factor authentication) as optional feature
- Validate all JWT tokens before processing requests
- Invalidate tokens on password change and account deletion

### Data Protection

THE system SHALL:
- Encrypt sensitive data at rest (passwords, emails)
- Implement proper CORS policies
- Sanitize all user input to prevent XSS attacks
- Validate all file uploads for type and size
- Implement CSRF protection for state-changing operations
- Log all security-relevant events

### Privacy Requirements

THE system SHALL:
- Allow users to download their data
- Allow users to delete their accounts
- Hide email addresses from public views
- Respect user privacy settings
- Comply with GDPR and CCPA requirements

## Business Model

### Market Opportunity

The Reddit-like community platform addresses:
- Growing demand for niche community spaces
- Limitations of existing social platforms
- Demand for content creator monetization
- Increasing importance of community moderation

### Revenue Model

The platform will generate revenue through:
- Premium subscription tiers (ad-free, enhanced features)
- Community tipping and donation system
- Promoted content placement
- Analytics and insights for power users
- API access for enterprise customers

### User Acquisition

The platform will acquire users through:
- Content creator partnerships
- Community builder outreach
- Social media marketing
- Search engine optimization
- Referral programs

### Success Metrics

Key performance indicators:
- Daily active users (DAU)
- Monthly active users (MAU)
- Posts per user per day
- Comments per post
- Community growth rate
- User retention rate
- Average session duration

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*