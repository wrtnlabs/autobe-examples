## User Journey Documentation

This document details the complete end-to-end user journeys for all actor types within the community platform. It maps the sequential steps, decision points, conditional branches, and system responses users experience from initial interaction through engagement and moderation. Each journey is written in natural language using EARS format where applicable, focusing strictly on business logic and user behavior—not technical implementation.

---

### Guest Visitor Journey

A guest is an unauthenticated user who accesses the platform to explore communities and content without registering.

WHEN a guest visits the homepage, THE system SHALL display a curated list of trending communities.

WHEN a guest clicks on a community name, THE system SHALL navigate to that community’s landing page showing the latest posts.

WHEN a guest clicks on a post, THE system SHALL display the full post content including title, body, images, links, upvote/downvote counts, comment count, and author karma.

WHEN a guest attempts to upvote or downvote a post, THE system SHALL display a message: "Log in to vote. Create an account to participate in discussions."

WHEN a guest attempts to comment on a post, THE system SHALL display a message: "Log in to comment. Register to join the conversation."

WHEN a guest clicks the "Create Community" button, THE system SHALL redirect to the registration page.

WHEN a guest clicks the "Login" button, THE system SHALL display the login form with email and password fields.

WHEN a guest clicks the "Sign Up" button, THE system SHALL redirect to the registration form.

WHILE a guest is browsing, THE system SHALL NOT display any user-specific data such as karma, subscriptions, or personalized recommendations.

IF a guest tries to access a profile page directly via URL, THE system SHALL show a public view of the profile with posts and comments but without edit or subscription controls.

---

### New Member Registration Journey

The registration journey transforms a guest into a verified member with full posting and interaction privileges.

WHEN a guest clicks "Sign Up", THE system SHALL display a registration form requiring email address and password.

WHEN a guest submits the registration form, THE system SHALL validate the email format and password strength (minimum 8 characters, at least one number).

WHEN validation passes, THE system SHALL create a new member account with status "unverified" and assign default karma of 1.

WHEN the account is created, THE system SHALL send a verification email containing a unique one-time link.

WHEN a guest clicks the verification link in the email, THE system SHALL validate the token and change account status to "verified".

WHEN the account is verified, THE system SHALL automatically log the user in and redirect to the homepage.

WHEN a user attempts to log in with an unverified email, THE system SHALL display: "Please verify your email before logging in. Check your inbox or request a new verification link."

WHEN a user requests a new verification email, THE system SHALL send a replacement verification link (valid for 24 hours).

WHEN a guest enters an email already registered, THE system SHALL display: "An account with this email already exists. Log in or reset your password."

WHERE a user has enabled two-factor authentication (future feature), THE system SHALL require a code after password entry.

---

### Member Posting Journey

This journey describes the steps a member takes to create and publish content in a community.

WHEN a member clicks "Create Post" in a community, THE system SHALL display a modal with three options: "Text", "Link", "Image".

WHEN a member selects "Text", THE system SHALL display a text input field with a 10,000-character limit and a title field with a 300-character limit.

WHEN a member selects "Link", THE system SHALL display a URL input field with validation (must start with http:// or https://) and a title field.

WHEN a member selects "Image", THE system SHALL display a file picker with supported formats (.jpg, .png, .gif, .webp) and maximum size 10MB.

WHEN a member fills all required fields and selects a community, THE system SHALL offer an optional "NSFW" toggle.

WHEN a member submits the post, THE system SHALL validate:
- Title is not empty
- Content is not empty (for text)
- URL is valid and accessible (for link)
- File is valid (for image)
- Member has not submitted an identical post (based on title + content hash) in the last 5 minutes

IF validation fails, THE system SHALL highlight the error field and display a specific error message (e.g., "URL must start with http:// or https://" or "File exceeds 10MB limit").

WHEN submission is valid, THE system SHALL create a new post with status "pending_moderation".

WHEN a post is created, THE system SHALL assign the post to the selected community and attach the member’s userId, timestamp, and karma.

WHEN a post is submitted to a community moderated by a moderator, THE system SHALL notify the moderator via internal alert system.

WHEN a post is submitted to an unmoderated community or a community with no moderator assigned, THE system SHALL automatically approve the post and make it public.

WHEN a post is approved, THE system SHALL display it to all users and increment the community’s post count.

WHEN a post is rejected, THE system SHALL notify the member: "Your post was removed for violating community rules. Contact moderators for details."

---

### Member Voting Journey

This journey defines how members interact with posts and comments through upvotes and downvotes.

WHEN a member clicks the upvote button on a post, THE system SHALL:
- Increment the post’s upvote count by 1
- Decrement the post’s downvote count by 1 if the member previously downvoted
- Add the member’s userId to the post’s upvotedUsers array
- Remove the member’s userId from the post’s downvotedUsers array if present
- Increment the member’s karma by 1

WHEN a member clicks the downvote button on a post, THE system SHALL:
- Increment the post’s downvote count by 1
- Decrement the post’s upvote count by 1 if the member previously upvoted
- Add the member’s userId to the post’s downvotedUsers array
- Remove the member’s userId from the post’s upvotedUsers array if present
- Decrement the member’s karma by 1

WHEN a member clicks an upvote button they’ve already pressed, THE system SHALL remove their vote:
- Decrement the post’s upvote count by 1
- Remove the member’s userId from the post’s upvotedUsers array
- Decrement the member’s karma by 1

WHEN a member clicks a downvote button they’ve already pressed, THE system SHALL remove their vote:
- Decrement the post’s downvote count by 1
- Remove the member’s userId from the post’s downvotedUsers array
- Increment the member’s karma by 1

WHEN a member attempts to vote on a post they created, THE system SHALL prevent the action and display: "You cannot vote on your own posts."

WHEN a member attempts to vote on a removed or deactivated post, THE system SHALL disable the vote buttons and display: "This post is no longer available."

WHEN a member is blocked by a community moderator, THE system SHALL disable voting on all posts in that community and display: "You are muted in this community."

IF the member’s karma is less than -100, THE system SHALL disable their voting privileges until karma is restored above -100.

---

### Member Commenting Journey

This journey describes how members create and reply to nested comments.

WHEN a member clicks "Comment" on a post, THE system SHALL display a text area with a 500-character limit.

WHEN a member submits a comment, THE system SHALL validate:
- Content is not empty
- Content does not contain prohibited language (list maintained by admin)
- Member has not submitted the same comment within the last 2 minutes

IF validation fails, THE system SHALL display a specific error message (e.g., "Comment too short" or "Spam protection triggered. Try again later.").

WHEN a comment is submitted, THE system SHALL:
- Create a comment object linked to the post and member
- Assign timestamp and karma
- Increment the post’s comment count by 1
- Add the comment to the top-level comments list
- Increase member karma by 1

WHEN a member clicks "Reply" on any comment (top-level or nested), THE system SHALL:
- Open a reply box below the comment
- Pre-fill the reply context with "@username:"

WHEN a reply is submitted, THE system SHALL:
- Create a reply comment linked to the parent comment
- Assign the same timestamp and karma
- Increase member karma by 1
- Increase parent comment’s reply count by 1

WHEN a comment or reply is submitted, THE system SHALL limit the nesting depth to 5 levels.

WHEN a comment is deleted or flagged as inappropriate, THE system SHALL mark it as "hidden" and display: "This comment was removed for violating community rules."

WHEN a user types in a reply box while another user is also typing, THE system SHALL show: "[Other user is typing...]".

WHEN a comment has more than 50 replies, THE system SHALL display: "Show 50+ replies" with a toggle to load additional replies in batches of 20.

WHEN a comment contains a URL, THE system SHALL render it as a clickable link (nofollow).

---

### Moderator Content Management Journey

Moderators manage content and behavior within their assigned communities.

WHEN a moderator logs in, THE system SHALL highlight communities they moderate on the sidebar.

WHEN a moderator clicks "Moderation Dashboard" for a community, THE system SHALL display:
- List of pending posts
- List of reported posts and comments
- List of banned users
- List of recent activity

WHEN a moderator approves a pending post, THE system SHALL:
- Change post status from "pending_moderation" to "public"
- Notify the member: "Your post in [Community] has been approved and is now visible."
- Update the community’s public posts counter

WHEN a moderator rejects a post, THE system SHALL:
- Change post status to "rejected"
- Notify the member: "Your post in [Community] was rejected for violating [specific rule]. You may appeal this decision."
- Add entry to moderation log with reason and timestamp

WHEN a moderator deletes a comment, THE system SHALL:
- Mark the comment as "removed_by_moderator"
- Notify the commenter: "Your comment in [Community] was removed by a moderator. Reason: [reason]."
- Record the action in moderation audit log

WHEN a moderator bans a user from a community, THE system SHALL:
- Prevent the user from posting or commenting in that community
- Prevent the user from voting in that community
- Remove all prior user content from public view (but retain for audit)
- Notify the user: "You have been banned from [Community]. Reason: [reason]. Send an appeal if you believe this was in error."
- Record the ban in the community’s moderation log

WHEN a moderator reports a user for platform-wide abuse, THE system SHALL send an alert to platform admin with:
- User ID
- Moderated community
- List of violations
- Timestamps

WHILE a user is banned from a community, THE system SHALL prevent the user from viewing private messages from moderators and subscribing to new communities.

WHEN a moderator unsubscribes from a community they moderate, THE system SHALL prompt: "Unsubscribing from this community will remove your moderator privileges. Are you sure?" with "Confirm" and "Cancel".

---

### Admin Account Management Journey

Admins manage the entire platform, enforce global rules, and handle escalated issues.

WHEN an admin logs in, THE system SHALL display a global admin dashboard with:
- Total active members
- Total reported content
- System-wide pending actions
- Recent user bans
- Platform statistics (posts, comments, karma distribution)

WHEN an admin suspends a user account, THE system SHALL:
- Immediately revoke all access
- Hide all user content from public view
- Notify the user via email: "Your access to [Platform] has been suspended due to violation of Terms of Service. Reason: [specific violation]. This action is final."
- Record the suspension in the global audit log

WHEN an admin restores a suspended account, THE system SHALL:
- Reactivate the account
- Restore user’s ability to log in
- Optionally restore visibility of content based on integrity review
- Notify the user: "Your account has been reinstated. Review the rules to avoid future suspensions."

WHEN an admin creates a new community, THE system SHALL allow:
- Naming without restrictions (except prohibited keywords)
- Assigning a moderator
- Setting initial mod permissions
- Configuring NSFW toggle

WHEN an admin removes a community, THE system SHALL:
- Archive all posts and comments (mark as "deleted_by_admin")
- Notify all members: "The community [Community] has been permanently removed. All content is no longer available."
- Unsubscribe all members from the community
- Record the deletion in global audit log

WHEN an admin handles a user report, THE system SHALL:
- Review all related content from the reported user
- Check if the user has prior violations
- Consult moderators if applicable
- Decide to:
  - Ignore (no action)
  - Warn (email notification)
  - Temporarily suspend (1-7 days)
  - Permanently ban

WHEN an admin sees a post/hostile trend emerging, THE system SHALL apply a platform-wide "Cool Down" mode:
- Delay all new posts for 30 seconds
- Limit downvotes from new users
- Deploy AI-assisted filtering
- Notify moderators to monitor

WHEN an admin updates system-wide rules, THE system SHALL:
- Propagate the new rules to all communities
- Notify all members: "Platform rules updated. Review changes here: [link]."

---

### Journey Cross-Reference Matrix

This matrix maps how user actions interact across actor types.

| Action | Guest | Member | Moderator | Admin |
|--------|-------|--------|-----------|-------|
| View post | ✅ | ✅ | ✅ | ✅ |
| Upvote post | ❌ | ✅ | ✅ | ✅ |
| Downvote post | ❌ | ✅ | ✅ | ✅ |
| Create post | ❌ | ✅ | ✅ | ✅ |
| Comment | ❌ | ✅ | ✅ | ✅ |
| Reply to comment | ❌ | ✅ | ✅ | ✅ |
| Create community | ❌ | ✅ (limited) | ✅ (requires approval) | ✅ (direct) |
| Approve pending post | ❌ | ❌ | ✅ | ✅ |
| Remove content | ❌ | ❌ | ✅ | ✅ |
| Ban user | ❌ | ❌ | ✅ (community-only) | ✅ (platform-wide) |
| Suspend user account | ❌ | ❌ | ❌ | ✅ |
| Report content | ❌ | ✅ | ✅ | ✅ |
| View own profile | ❌ | ✅ | ✅ | ✅ |
| View others’ profiles | ✅ | ✅ | ✅ | ✅ |
| Subscribe to community | ❌ | ✅ | ✅ | ✅ |
| Unsubscribe from community | ❌ | ✅ | ✅ | ✅ |
| Verify email | ❌ | ✅ | ✅ | ✅ |
| Reset password | ❌ | ✅ | ✅ | ✅ |

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*