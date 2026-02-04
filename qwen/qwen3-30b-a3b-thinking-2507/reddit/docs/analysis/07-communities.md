# Reddit-like Community Platform Requirements

## 1. User Account Management

### 1.1 Account Creation

WHEN a user attempts to create an account, THE system SHALL request an email address, password, and username.

WHEN the email format is invalid, THE system SHALL display a "Please enter a valid email address" error message.

WHEN the username is already taken, THE system SHALL show a "Username already exists" error.

WHEN the password does not meet complexity requirements (minimum 8 characters, mixed case, number), THE system SHALL display a password strength error.

### 1.2 Login Process

WHEN a user submits valid credentials, THE system SHALL authenticate the user and create a session token.

WHEN login fails (invalid credentials), THE system SHALL display a "Invalid email or password" message with a 5-second delay between attempts to prevent brute-force attacks.

### 1.3 Password Management

WHEN a user requests to change their password, THE system SHALL verify the current password before allowing the change.

WHEN the new password does not meet complexity requirements, THE system SHALL display appropriate validation errors.

WHEN password change is successful, THE system SHALL invalidate all active session tokens for the user.

### 1.4 Account Deletion

WHEN a user deletes their account, THE system SHALL permanently remove all content associated with the account including:
- Posts and comments
- Profile information
- Subscription history
- Karma points

WHEN account deletion is confirmed, THE system SHALL send a notification email to the user's registered address.

## 2. User Profile System

### 2.1 Profile Structure

EVERY user SHALL have profile with:
- Display name (customizable)
- Bio text (up to 500 characters)
- Avatar image (PNG/JPEG, maximum 5MB)
- Karma score (integer, can be negative)

### 2.2 Profile Management

WHEN a user edits their profile, THE system SHALL validate:
- Display name (not empty, max 30 characters)
- Bio (max 500 characters)
- Avatar (valid image format, size)

WHEN profile update completes, THE system SHALL save changes and reflect in all user-facing views immediately.

### 2.3 Profile Viewing

WHEN a user views another user's profile, THE system SHALL display:
- Display name and bio
- Avatar image
- Karma score
- List of posts created by the user (with pagination)
- List of comments written by the user (with pagination)

## 3. Karma System

### 3.1 Calculation Rules

WHEN a user upvotes a post or comment, THE system SHALL increase the target user's karma by 1.

WHEN a user downvotes a post or comment, THE system SHALL decrease the target user's karma by 1.

WHEN a user removes their vote, THE system SHALL adjust the target user's karma by the inverse change (upvote removal decreases karma by 1, downvote removal increases by 1).

### 3.2 Display Requirements

EACH user profile SHALL display the user's current karma score prominently.

Karma score SHALL be visible on all post and comment listings.

Karma value shall be rendered as: "Karma: {value"

## 4. Community Management

### 4.1 Community Creation

WHEN a user creates a community, THE system SHALL require:
- Unique community name (alphanumeric with hyphens, max 50 chars)
- Description (max 500 characters)
- Icon image (PNG/JPEG, max 2MB)

WHEN community name is not unique, THE system SHALL show "Community name already exists" error.

WHEN community is created, THE system SHALL assign the creator as community owner.

### 4.2 Community Browsing

WHEN browsing all communities, THE system SHALL display:
- Community name
- Description (first 100 characters)
- Subscriber count
- Icon image

WHEN searching by community name, THE system SHALL filter results in real-time.

## 5. Community Subscription

### 5.1 Subscription Process

WHEN a user subscribes to a community, THE system SHALL add it to their subscription list.

WHEN the user unsubscribes, THE system SHALL remove the community from their subscription list.

### 5.2 Community Access Rules

WHEN a user attempts to create a post in a community, THE system SHALL verify:
- User is logged in
- User is subscribed to the community

WHEN user is not subscribed, THE system SHALL display "You must subscribe to this community to create posts".

## 6. Post Creation and Management

### 6.1 Post Types

WHEN creating a post, THE system SHALL require:
- Community selection (from user's subscriptions)
- Post title (required, max 200 characters)
- Post type (text, link, image)
- Content (based on type):
  - Text: Content body (max 5000 characters)
  - Link: Valid URL (http/https)
  - Image: Upload image (PNG/JPEG, max 10MB)

### 6.2 Post Display

WHEN viewing a single post, THE system SHALL display:
- Title
- Author username
- Community name
- Full content (with proper formatting)
- Vote score
- Comment count
- Time since posted (e.g., "3 hours ago")

### 6.3 Post Modification

WHEN a user edits their own post, THE system SHALL allow:
- Updating title
- Changing content
- Changing post type (with appropriate conversion)

WHEN editing a post, THE system SHALL save changes with a revision history.

## 7. Voting System

### 7.1 Vote Mechanics

WHEN a user casts a vote on a post, THE system SHALL:
- Record the vote type (up/down)
- Adjust corresponding count
- Update the vote score

WHEN a user changes their vote, THE system SHALL:
- Remove previous vote
- Apply the new vote
- Update all counts and scores accordingly

## 8. Post Feeds

### 8.1 Feed Types

EACH user SHALL access three distinct feed types:

**Home Feed:**
- Shows posts from communities the user is subscribed to
- Accessible only to logged-in users

**Popular Feed:**
- Shows posts from all communities
- Accessible to all users

**Community Feed:**
- Shows posts from one specific community
- Accessible to all users

### 8.2 Sort Options

WHEN applying sort, THE system SHALL support:

- Hot: Recent posts with high engagement first
- New: Most recent posts first
- Top: Highest voting score first with time filter options
- Controversial: Many votes with score near zero first

### 8.3 Feed Display

WHEN displaying posts in feeds, EACH entry SHALL show:
- Title
- Author username
- Community name
- Vote score
- Comment count
- Time since posted
- Preview (first 200 characters for text, image thumbnail, or URL domain)

## 9. Comment System

### 9.1 Comment Structure

WHEN a user writes a comment on a post, THE system SHALL:
- Save content (max 5000 characters)
- Associate with the parent post
- Set timestamp
- Record the comment's vote score

### 9.2 Nested Comments

WHEN a user replies to a comment, THE system SHALL create a new comment object with parent reference.

WHEN viewing comments, THE system SHALL display nested replies with appropriate indentation.

## 10. Moderation System

### 10.1 Community Ownership

THE community creator SHALL automatically be designated as the owner.

THE owner SHALL be the only user who can remove themselves as ownership.

### 10.2 Moderator Management

WHEN a user is added as moderator, THE system SHALL record their permission level.

WHEN a user is removed as moderator, THE system SHALL remove their moderation privileges.

### 10.3 Moderation Actions

WHEN a moderator deletes a post, THE system SHALL:
- Remove post content from all feeds
- Deduct karma for post author (if applicable)
- Log the action

WHEN a moderator bans a user, THE system SHALL:
- Prevent user from creating posts/comments
- Maintain the ban across all communities
- Allow ban duration specification (permanent or temporary)