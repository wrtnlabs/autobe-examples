# Functional Requirements - Discussion Board System

## Overview

This document defines all functional requirements for the discussion board system from a business perspective. It specifies what the system must do to enable users to participate in economic and political discussions, how content is managed, and what capabilities are available to different user roles. All requirements are written in natural language and focus on business logic and user needs, not technical implementation.

For detailed information about user roles and their permissions, please refer to the [User Roles and Permissions Document](./03-user-roles-and-permissions.md). For user scenarios and workflows, see the [User Personas and Scenarios Document](./04-user-personas-and-scenarios.md).

---

## 1. User Account Management

### 1.1 User Registration

THE system SHALL allow guests to register new user accounts by providing an email address, username, and password.

WHEN a guest enters registration information, THE system SHALL validate that:
- The email address is valid (must match standard email format: user@domain.extension) and has not been registered before
- The username is unique within the system, contains only alphanumeric characters and underscores, is 3-20 characters long, and does not match reserved system usernames
- The password meets security requirements (minimum 8 characters, includes uppercase letter, lowercase letter, number, and special character)
- All required fields are provided with no empty values

WHEN registration validation fails, THE system SHALL display specific error messages for each validation failure:
- Email already registered: "This email address is already registered. Please use a different email or log in."
- Invalid email format: "Please enter a valid email address (example: user@domain.com)."
- Username taken: "This username is not available. Please choose a different username."
- Username invalid: "Username must be 3-20 characters and contain only letters, numbers, and underscores."
- Password too weak: "Password must be at least 8 characters and contain uppercase, lowercase, number, and special character."

WHEN registration is successful, THE system SHALL:
- Create a new member account with status "pending_verification"
- Generate a unique verification token with 24-hour expiration
- Send a verification email to the provided email address within 30 seconds
- Display a success message: "Account created successfully. Please check your email to verify your account."
- Redirect user to a verification confirmation page

THE system SHALL prevent registration of the same email address within 1 hour if the previous registration was abandoned (no email verification attempted).

### 1.2 Email Verification

WHEN a verification email is sent, THE email SHALL contain:
- A unique verification link that expires after exactly 24 hours
- A direct clickable button labeled "Verify Email Address"
- Instructions for manual verification if the link doesn't work
- A note explaining that unverified accounts cannot create discussions or post comments

WHEN a user clicks the verification link, THE system SHALL:
- Validate that the link has not expired
- Check that the verification token has not already been used
- Mark the email address as verified
- Set the account status to "active"
- Display a success message: "Email verified successfully. You can now log in and participate in discussions."
- Optionally log the user in directly and redirect to the discussion board

IF the verification link has expired, THE system SHALL display a message: "Your verification link has expired. Click here to request a new verification email" with a clickable link.

WHEN a user requests a new verification email, THE system SHALL:
- Generate a new verification token with 24-hour expiration
- Send the verification email within 30 seconds
- Display confirmation: "A new verification email has been sent to your address."
- Allow the user to request only 3 new verification emails within 24 hours to prevent email spam

THE system SHALL NOT allow any posting, discussion creation, or voting from unverified accounts. These accounts MAY view discussions and read comments.

### 1.3 User Login

WHEN a member attempts to log in, THE system SHALL require their registered email address and password.

WHEN credentials are submitted, THE system SHALL:
- Validate the email address is registered in the system
- Validate the password matches the stored password hash for that email
- Check that the account status is "active" (email verified)
- Check that the account is not suspended or banned
- Create a session upon successful authentication and return authentication token
- Log the login attempt with timestamp and IP address

IF the email is not registered, THE system SHALL display a generic error message: "Invalid email or password." (WITHOUT indicating which field is incorrect, to prevent email enumeration attacks).

IF the password is incorrect, THE system SHALL display the same generic error message: "Invalid email or password."

IF the email is registered but email is not verified, THE system SHALL display: "Please verify your email address before logging in. Check your email for the verification link, or click here to request a new one."

IF the email is registered but the account is suspended, THE system SHALL display: "Your account is temporarily suspended. Your access will be restored on [DATE]. If you believe this is an error, please contact support."

IF the email is registered but the account is banned, THE system SHALL display: "Your account has been permanently banned. For more information, please contact support."

WHEN a user fails to log in 5 consecutive times within 15 minutes, THE system SHALL:
- Lock the account temporarily
- Display message: "Too many failed login attempts. Your account is temporarily locked for 30 minutes for security. You can still reset your password if needed."
- Send a security alert email: "Multiple failed login attempts were detected on your account from IP address [IP]. If this was not you, please reset your password immediately."

THE system SHALL automatically unlock the account after exactly 30 minutes and reset the failed login counter.

### 1.4 Password Management

#### Password Reset Flow

WHEN a member clicks "Forgot Password," THE system SHALL display a form requesting the email address associated with the account.

WHEN an email is submitted to the password reset form, THE system SHALL:
- Verify that the email is registered (WITHOUT confirming whether the email exists or not, to prevent user enumeration)
- Send a password reset email to the address (if registered) within 30 seconds
- Display message to user: "If an account exists with that email, you will receive a password reset link within a few minutes."
- Log the password reset request with timestamp and IP address for security auditing

WHEN a password reset email is received, THE email SHALL contain:
- A unique password reset link that expires after exactly 1 hour
- A security note: "If you did not request this password reset, please ignore this email. Your password will not change."
- Instructions to reset the password
- Alternative security question challenge if the link doesn't work

WHEN a user clicks the reset link, THE system SHALL:
- Validate that the reset link has not expired
- Validate that the reset token has not already been used (single-use tokens)
- Display a form to enter the new password
- Require the new password to meet all security requirements (8+ characters, uppercase, lowercase, number, special character)
- Allow the user to submit the new password

WHEN the new password is submitted, THE system SHALL:
- Validate the password meets all requirements
- Update the password hash in the database
- Invalidate all existing sessions for that user (force logout from all devices)
- Display success message: "Your password has been successfully changed. Please log in with your new password."
- Send a confirmation email: "Your password was successfully changed. If you did not make this change, please contact support immediately."

IF the reset link has expired, THE system SHALL display: "Your password reset link has expired. Click here to request a new reset email."

THE system SHALL NOT allow the new password to be the same as the current password.

#### Password Change (For Logged-In Users)

WHEN a logged-in member accesses their account settings and clicks "Change Password," THE system SHALL display a form with:
- Current password field (required)
- New password field (required, must meet complexity requirements)
- Confirm new password field (required)

WHEN the member submits the password change form, THE system SHALL:
- Validate that the current password is correct (verify against stored hash)
- Validate that the new password meets all complexity requirements
- Validate that new password is not the same as current password
- Validate that new password and confirmation password match exactly
- Update the password hash
- Invalidate all existing sessions for that user immediately
- Log the password change event with timestamp

WHEN password change is successful, THE system SHALL display: "Your password has been successfully changed. You have been logged out from all devices for security. Please log in again."

### 1.5 User Logout

WHEN a member clicks logout, THE system SHALL:
- Invalidate the current session token immediately
- Add the token to a token blacklist (preventing reuse)
- Clear all local session data
- Log the logout event with timestamp
- Redirect the user to the login page or home page with message: "You have been successfully logged out."

WHEN a user logs out, THE system SHALL ensure they cannot access protected features until logging in again. IF an expired session token is used, THE system SHALL return HTTP 401 Unauthorized response.

### 1.6 User Profile Management

THE system SHALL allow members to view and edit their own profiles, including:
- Display name (3-50 characters, different from username if desired)
- Email address (must remain registered and unique)
- Bio or about text (maximum 500 characters)
- Profile avatar/picture (image file, maximum 5 MB)
- Account creation date (read-only, system-generated)
- Last login timestamp (read-only, visible to the member only)
- Number of discussions created (read-only, calculated)
- Number of comments posted (read-only, calculated)
- Member reputation score (read-only, calculated from votes)
- Member join date (read-only)

WHEN a member edits their email address, THE system SHALL:
- Validate that the new email is not already registered
- Send a verification email to the new email address
- Require verification of the new email before the change takes effect
- Temporarily disable the old email until the new email is verified
- Send a confirmation email to the old email address: "Your email address change is pending verification. If you did not request this, please click here to cancel."

WHEN a member edits their display name, THE system SHALL:
- Validate that the display name is 3-50 characters
- Allow special characters and spaces (unlike username which only allows alphanumeric and underscores)
- Update the display name immediately across all discussions and comments

WHEN a member uploads a profile avatar, THE system SHALL:
- Validate the file is an image (JPEG, PNG, or WebP format)
- Validate the file size does not exceed 5 MB
- Crop or resize the image to 200x200 pixels for storage
- Replace the member's previous avatar if one exists
- Make the new avatar visible in discussions and comments within 5 minutes

WHEN a member clicks "Delete Profile Picture," THE system SHALL:
- Remove the avatar file from storage
- Replace with default avatar in all displays
- Process the deletion within 1 hour

WHEN a member updates their password while logged in, THE system SHALL:
- Require entry of the current password (verify it matches)
- Display new password field with complexity requirements
- Require confirmation of new password (must match exactly)
- Validate all requirements
- Update password hash
- Display message: "Your password has been successfully changed. You remain logged in on this device."
- The user stays logged in on the current device but must re-authenticate on other devices

### 1.7 Account Preferences and Settings

THE system SHALL allow members to configure their account preferences, including:
- Email notification frequency (immediate, daily digest, weekly digest, or never)
- Email notification types (replies, mentions, moderator actions, announcements)
- Display preference (show full name or username only)
- Profile visibility (public or members-only)
- Online status visibility (show/hide when currently active)
- Activity privacy (show/hide discussion history to other users)

WHEN a member updates a preference, THE system SHALL:
- Save the preference immediately
- Apply the new preference to all future actions
- For notification preferences, apply retroactively to all future notifications
- Display confirmation message: "Your preferences have been updated successfully."

---

## 2. Discussion Topic Management

### 2.1 Creating Discussion Topics

WHEN a member navigates to create a new discussion, THE system SHALL display a discussion creation form containing:
- Title field (required, 5-200 characters)
- Category dropdown field (required, showing all available categories)
- Description/content field (required, 20-5,000 characters)
- Optional rich text formatting toolbar (bold, italic, lists, links)
- Character count display (current/maximum)
- Preview button to see formatted content before posting
- Submit button and Cancel button

WHEN a member enters content into the form, THE system SHALL:
- Display real-time character count for title and description
- Display preview of formatted content when preview button is clicked
- Validate that category has been selected
- Validate that title is 5-200 characters (not less, not more)
- Validate that description is 20-5,000 characters (not less, not more)
- Trim leading and trailing whitespace from all fields
- Collapse multiple consecutive spaces to single spaces

WHEN a member submits a new discussion, THE system SHALL:
- Perform all validation checks before creating
- Check that the title is not a duplicate of recent discussions by the same member (within 7 days)
- Check that the member has not exceeded daily creation limit (10 discussions per 24-hour rolling window)
- Create the discussion record with status "active"
- Assign the member as the discussion owner
- Record the exact creation timestamp (server time, UTC)
- Record the category assignment
- Generate a unique discussion ID for reference
- Create an initial comment representing the discussion (the original post)
- Display success message: "Your discussion has been created successfully and is now visible to all members."
- Redirect to the newly created discussion page
- Update member's discussion count
- Notify members following the category (if that feature exists)

IF the member has already created 10 discussions within the past 24 hours, THE system SHALL display error: "You have reached the maximum of 10 discussions per 24 hours. You can create another discussion in [X hours and Y minutes]."

IF the title is too short (less than 5 characters), THE system SHALL display: "Discussion title must be at least 5 characters long."

IF the title is too long (more than 200 characters), THE system SHALL display: "Discussion title must not exceed 200 characters. Current: [X] characters."

IF the description is too short (less than 20 characters), THE system SHALL display: "Discussion description must be at least 20 characters long."

IF the description is too long (more than 5,000 characters), THE system SHALL display: "Discussion description must not exceed 5,000 characters. Current: [X] characters."

IF the category is not selected, THE system SHALL display: "Please select a category for your discussion."

THE system SHALL NOT create the discussion if validation fails. The user's input SHALL be preserved in the form for editing.

### 2.2 Viewing Discussions

WHEN a guest or member navigates to the discussion list page, THE system SHALL:
- Load all active discussions in reverse chronological order (newest first)
- Display for each discussion: title, creator name, creation date and time, category, number of replies, number of votes, short preview of content
- Provide pagination with 20 discussions per page
- Display page navigation (Previous, page numbers, Next)
- Show total discussion count: "Showing [20] of [1,234] discussions"

WHEN a user clicks on a discussion title, THE system SHALL:
- Load the complete discussion including the original post
- Load and display all comments in chronological order (oldest first) by default
- Display the discussion creator's name and avatar
- Display creation timestamp and any edit indicators
- Display the current vote count
- For members (not guests), display voting buttons and reply buttons
- Display a category tag
- Display discussion metadata: number of replies, number of votes, last updated timestamp

THE system SHALL load the initial page view within 2 seconds.

WHEN a discussion has more than 20 comments, THE system SHALL implement pagination:
- Display comments 1-20 initially
- Show "Load More Comments" button at the bottom
- Load next 20 comments when user clicks button
- Update the page to show newly loaded comments

### 2.3 Editing Discussions

WHEN a member opens a discussion they created, THE system SHALL display an "Edit" button if:
- They are the original discussion creator, OR
- They have moderator or administrator role

WHEN a member clicks the edit button, THE system SHALL:
- Display the discussion title and content in editable form
- Display the category (non-editable after creation)
- Show the current content with formatting
- Display character count fields
- Provide preview functionality
- Show an "Edit History" link to view all previous versions

WHEN a member saves edited discussion content, THE system SHALL:
- Validate all content requirements (title 5-200 chars, description 20-5,000 chars)
- Update the discussion content in the database
- Record an edit timestamp
- Increment the edit counter
- Display "[edited 23 minutes ago]" indicator on the discussion
- Update the last activity timestamp for the discussion
- Display success message: "Your discussion has been updated successfully."

THE system SHALL only allow editing within 7 days of creation for regular members. Moderators and administrators may edit discussions at any time.

IF a member attempts to edit a discussion older than 7 days, THE system SHALL display: "You can only edit discussions within 7 days of creation. For older discussions, please contact a moderator."

### 2.4 Deleting Discussions

WHEN a member opens a discussion they created, THE system SHALL display a "Delete" button only if:
- They are the discussion creator AND the discussion has no comments/replies, OR
- They have moderator or administrator role

WHEN delete is clicked, THE system SHALL:
- Display a confirmation dialog: "Are you sure you want to delete this discussion? This action cannot be undone."
- Explain what will happen: "Deleting a discussion will remove it from public view and archive it for moderation records."

WHEN deletion is confirmed, THE system SHALL:
- Remove the discussion from public view
- Archive the discussion in the database (marked as "deleted" with timestamp)
- Update the member's discussion count
- Display success message: "Your discussion has been deleted successfully."
- Redirect to the discussion list

THE system SHALL prevent deletion of discussions with 5 or more comments. THE system SHALL display: "This discussion cannot be deleted because it has [5] comments. Please contact a moderator if you need this discussion removed."

Moderators and administrators may delete any discussion regardless of comment count.

### 2.5 Discussion Status and Closure

THE system SHALL maintain discussion status as one of: "active", "closed", "archived", or "hidden".

WHEN a discussion is created, THE system SHALL set status to "active".

WHILE a discussion has "active" status, THE system SHALL allow members to create new comments and replies.

WHEN a moderator closes a discussion, THE system SHALL:
- Change discussion status to "closed"
- Prevent creation of new comments
- Allow viewing of existing comments
- Display closure notice at top: "This discussion has been closed. The following comments remain visible for reference: [closure reason if provided]"

WHEN a discussion is closed, THE system SHALL allow viewing all content but prevent clicking reply buttons. THE reply button SHALL display disabled with message: "This discussion is closed and no longer accepting comments."

WHEN an administrator archives a discussion, THE system SHALL:
- Change discussion status to "archived"
- Remove from normal discussion lists
- Keep accessible via direct link or search
- Display archive notice: "This discussion has been archived. You can still read all comments but cannot reply."

WHEN a moderator hides a discussion due to violations, THE system SHALL:
- Change discussion status to "hidden"
- Remove from public view entirely
- Only visible to moderators and administrators
- Display notice to original author: "Your discussion has been hidden due to policy violations. [Reason if provided]"

---

## 3. Discussion Categories

### 3.1 Viewing and Browsing Categories

THE system SHALL provide a browsable list of discussion categories on the main navigation and home page.

For each category, THE system SHALL display:
- Category name (clickable link to browse that category)
- Category description (50-100 word summary of topics covered)
- Number of active discussions in the category
- Number of members who have participated in the category
- Most recent discussion timestamp ("Last post: [X] hours ago")
- Category icon or color indicator (for visual organization)

WHEN a member clicks on a category, THE system SHALL:
- Display all active discussions in that category in reverse chronological order (newest first)
- Show pagination with 20 discussions per page
- Display category description at the top of the page
- Display category-specific guidelines or rules (if configured by administrators)
- Show filter options (sort by newest, most popular, most commented)

### 3.2 Category Organization and Rules

THE system SHALL allow members to understand which category is appropriate for their discussion through:
- Clear category names and descriptions
- Category-specific guidelines (optional, managed by administrators)
- Example discussions from each category

THE system SHALL enforce one discussion per exactly one category. A discussion cannot exist in multiple categories or no category.

WHEN a member creates a discussion, THE system SHALL require selection of exactly one category from the available list.

THE system SHALL NOT allow members to create new categories. Only administrators can create categories.

### 3.3 Administrator Category Management

WHEN an administrator accesses the category management section, THE system SHALL display:
- List of all categories
- For each category: name, description, number of discussions, status (active/archived)
- Buttons to create, edit, or delete categories

WHEN an administrator creates a new category, THE system SHALL require:
- Unique category name (required, 3-50 characters)
- Category description (required, 20-200 characters)
- Optional category-specific rules or guidelines
- Optional category color or icon

WHEN the administrator submits the new category, THE system SHALL:
- Validate that all required fields are provided
- Validate that the category name is unique (no duplicate category names)
- Create the category record
- Make the category immediately available for new discussions
- Display success message: "Category '[Name]' has been created successfully."

WHEN an administrator edits a category, THE system SHALL:
- Allow editing of name, description, and guidelines
- NOT allow changing a category if discussions exist in it without explicit confirmation
- Update all references to the category
- Display success message: "Category has been updated successfully."

WHEN an administrator marks a category as archived, THE system SHALL:
- Prevent creation of new discussions in that category
- Keep existing discussions visible but read-only (cannot add new comments)
- Display archive notice: "This category is archived and no longer accepting new discussions."
- Allow access to existing discussions for reference

WHEN an administrator attempts to delete a category, THE system SHALL:
- Check if any active discussions exist in that category
- IF discussions exist, display warning: "This category contains [X] active discussions. Please archive or move these discussions before deleting the category."
- Only allow deletion of empty categories
- Display confirmation dialog before deletion: "Are you sure you want to delete this category? This action cannot be undone."
- Delete the category and remove it from all displays

---

## 4. Content Creation and Editing

### 4.1 Posting Comments and Replies

WHEN a member views an active discussion, THE system SHALL display a comment composition area with:
- Text input field (minimum 1 character, maximum 2,000 characters)
- Optional rich text formatting toolbar
- Character count display (current/maximum)
- Preview button
- Submit button ("Post Comment" or "Reply")
- Cancel button

WHEN a member types into the comment field, THE system SHALL:
- Display real-time character count
- Enable/disable submit button based on content presence (disabled if empty)
- Show preview of formatted content when preview is clicked

WHEN a member submits a comment, THE system SHALL:
- Validate that content is provided and within character limits
- Validate that the discussion is still active (not closed)
- Check that the member is not in muted/banned status
- Create the comment record with status "visible"
- Assign the member as the comment author
- Record the exact creation timestamp (server time, UTC)
- Determine if this is a top-level comment or nested reply (parent discussion or parent comment)
- For nested replies, validate that the parent comment exists and has not been deleted
- Display success message: "Your comment has been posted successfully."
- Refresh the discussion view to display the new comment in proper position
- Clear the comment field
- Update comment count on the discussion
- Notify affected users (discussion author, parent comment author if applicable)

IF the member is on rate limit (posted 30+ comments in last hour), THE system SHALL display: "You are posting too quickly. You can post another comment in [X] minutes."

IF the discussion is closed, THE system SHALL display: "This discussion is closed and no longer accepting new comments."

IF the discussion has been deleted, THE system SHALL display: "This discussion is no longer available."

THE system SHALL prevent guests from posting comments. THE comment form SHALL display for guests only a message: "Please log in to post a comment" with login link.

### 4.2 Nested Reply Threading

THE system SHALL support threaded conversations where:
- Comments on a discussion are top-level comments
- Replies to comments are nested one level deeper
- Replies to replies (nested replies) are grouped under their parent comment
- All nested replies to the same parent comment are visible when the parent is expanded

WHEN displaying replies, THE system SHALL:
- Show the parent comment with a visual indent or nesting indicator
- Show all child comments indented further than the parent
- Show child comments in chronological order (oldest first)
- Display a count of child comments: "[X] replies"
- Provide expand/collapse functionality for threads with 3+ replies

WHEN a member clicks "Reply" on a comment, THE system SHALL:
- Display a composition form positioned next to the parent comment
- Reference the parent comment clearly: "Replying to: [parent comment preview]"
- Associate the reply with the parent comment in the database
- On submission, position the reply immediately below the parent comment

THE system SHALL NOT allow nesting deeper than 5 levels. IF a user tries to reply to a comment that is already at maximum nesting depth, THE system SHALL display: "Replies cannot be nested more than 5 levels deep. Please post your response as a top-level comment instead."

### 4.3 Editing Comments

WHEN a member views a comment they created, THE system SHALL display an "Edit" button if:
- They created the comment AND less than 24 hours have passed since creation, OR
- They have moderator or administrator role

WHEN a member clicks edit on their comment, THE system SHALL:
- Display the comment content in editable form
- Show the current formatted content
- Display character count field
- Provide preview functionality
- Display "Save Changes" and "Cancel" buttons

WHEN a member saves edited comment, THE system SHALL:
- Validate that content meets requirements (1-2,000 characters)
- Update the comment content
- Record the edit timestamp
- Increment the edit counter
- Display edit indicator: "[edited 5 minutes ago]" on the comment
- Display success message: "Your comment has been updated successfully."

WHEN a moderator or administrator edits a user's comment, THE system SHALL:
- Allow editing at any time regardless of age
- Record in audit log: "[Moderator Name] edited comment on [Date] at [Time]"
- Display moderator edit notice: "[Moderated by: Moderator Name]" on the comment

THE system SHALL NOT allow editing of comments older than 24 hours by the original author. THE edit button SHALL not display. THE system SHALL display message: "Comments can only be edited within 24 hours of creation."

### 4.4 Deleting Comments

WHEN a member views a comment they created, THE system SHALL display a "Delete" button only if:
- They created the comment AND it has no nested replies, OR
- They have moderator or administrator role

WHEN a member clicks delete, THE system SHALL display confirmation: "Are you sure you want to delete your comment? This action cannot be undone."

WHEN deletion is confirmed, THE system SHALL:
- Remove the comment from public view immediately
- If the comment has nested replies, replace the comment with "[deleted by author]" placeholder to preserve thread integrity
- If the comment has no replies, remove it completely and adjust numbering
- Update comment count on the discussion
- Display success message: "Your comment has been deleted successfully."

THE system SHALL prevent deletion of comments with 3+ nested replies. THESE comments SHALL display message: "You cannot delete this comment because it has [3] replies. Please contact a moderator if you need this comment removed."

Moderators and administrators may delete any comment regardless of replies.

---

## 5. Voting and Engagement System

### 5.1 Voting on Discussions and Comments

WHEN a member views a discussion or comment, THE system SHALL display:
- Upvote button (thumbs up icon or up arrow)
- Downvote button (thumbs down icon or down arrow)
- Current vote count (displayed as net votes: upvotes - downvotes)
- Visual indication of the member's current vote (if any) on that content

WHEN a member clicks the upvote button on content they have not voted on, THE system SHALL:
- Record the upvote in the database
- Increment the vote count by 1
- Update the vote display immediately (within 200ms)
- Visually highlight the upvote button to show the member's vote
- Update the voting member's reputation score (+2 points for receiving upvote if they created the content)

WHEN a member clicks the downvote button on content they have not voted on, THE system SHALL:
- Record the downvote in the database
- Decrement the vote count by 1
- Update the vote display immediately (within 200ms)
- Visually highlight the downvote button
- Update the voting member's reputation score (-3 points for receiving downvote if they created the content)

IF a member clicks their current vote again (e.g., clicks upvote when they already upvoted), THE system SHALL:
- Remove their vote
- Reset the vote count (subtract the previous vote)
- Reset the visual highlighting to neutral state
- Update reputation scores to reverse the previous vote impact

WHEN a member clicks the opposite vote button (e.g., click downvote after upvoting), THE system SHALL:
- Remove the previous vote
- Record the new vote
- Update vote count appropriately (if was +1, now becomes -1: total change of -2)
- Update visual highlighting to show new vote
- Update reputation scores to reflect the change

GUESTS cannot vote. WHEN a guest attempts to vote, THE system SHALL display: "Please log in to vote on discussions and comments" with a login link.

### 5.2 Vote Display and Sorting

THE system SHALL display vote counts on all discussions and comments in the format: "[+/-X] votes" or similar.

WHEN a discussion or comment has zero votes, THE system SHALL display: "0 votes" or "No votes yet".

THE system SHALL allow sorting discussions by votes. WHEN "Sort by Most Popular" is selected, THE system SHALL display discussions ordered by vote count (highest to lowest).

THE system SHALL NOT automatically hide or remove discussions/comments with negative votes. All content remains visible regardless of vote count unless moderated for policy violations.

### 5.3 Vote Integrity and Constraints

THE system SHALL allow each member to cast exactly one vote per piece of content (one vote per discussion, one vote per comment).

THE system SHALL prevent the same member from voting multiple times on the same content even if they:
- Log out and log back in
- Access from different browsers
- Access from different devices
- Clear their cookies or cache

THE system SHALL validate vote integrity by checking member ID against the content ID, preventing duplicate votes at the database level.

---

## 6. Search and Discovery

### 6.1 Search Functionality

WHEN a user (guest or member) accesses the search interface, THE system SHALL provide:
- Search input field (text, minimum 1 character, maximum 200 characters)
- Submit button or automatic search as user types
- Search results display showing matching discussions and comments

WHEN a user enters search terms, THE system SHALL search across:
- Discussion titles (weighted heavily for relevance)
- Discussion descriptions
- Comment text content
- Discussion tags/categories (if applicable)

THE system SHALL return results ordered by:
- Relevance (discussions with search terms in title ranked highest)
- Recency (within same relevance tier, newer content ranked higher)
- Vote count (optional secondary sort within same relevance tier)

THE system SHALL display search results with:
- Result type indicator (Discussion or Comment)
- Title or excerpt (first 150 characters)
- Creator name
- Creation date and time
- Category
- Vote count
- Number of replies (for discussions)
- Direct link to full content

WHEN search returns no results, THE system SHALL display: "No discussions found matching '[search term]'. Try different keywords or browse categories below:" followed by list of all categories.

THE system SHALL display search results within 2 seconds for average queries.

### 6.2 Search Filtering

WHEN viewing search results, THE system SHALL allow filtering by:
- Category (show only discussions in selected category)
- Date range (Last week, Last month, Last year, All time)
- Sort options (Most relevant, Newest, Most popular, Most commented)

WHEN a filter is applied, THE system SHALL:
- Update results immediately to reflect filter
- Display applied filters clearly so user knows what filters are active
- Provide "Clear all filters" link to reset to unfiltered search
- Show result count: "Showing [X] results"

### 6.3 Browse and Discovery Features

WHEN a member navigates to a category, THE system SHALL display:
- Category title and description
- All active discussions in that category (paginated, 20 per page)
- Sorting options (Newest, Most popular, Most active)
- Filter options (Last week, Last month, All time)

THE system SHALL allow browsing all categories from a category index page showing all available categories with preview information.

---

## 7. Notification System

### 7.1 In-App Notifications

WHEN a member receives activity that generates notifications, THE system SHALL display a notification in the in-app notification center, including:
- Someone replied to their comment
- Someone upvoted their discussion or comment
- A discussion they are following has new activity
- A moderator takes action on their content (removes, warns, etc.)
- An administrator sends a message or announcement

WHEN a member opens the notification center, THE system SHALL display:
- List of recent notifications (newest first)
- Unread notifications highlighted or marked as unread
- Notification type icon or indicator (reply, vote, moderation, etc.)
- Brief notification text ("User X replied to your comment")
- Timestamp (relative: "2 hours ago")
- Link to the relevant content

WHEN a member clicks a notification, THE system SHALL:
- Mark the notification as read
- Navigate to the relevant content (discussion, comment, etc.)

THE system SHALL mark notifications as read automatically when viewed, or provide a "Mark as read" button for bulk operations.

THE system SHALL display unread notification count in header or notification bell icon.

### 7.2 Email Notifications (Optional)

WHEN a member receives a notification event AND has email notifications enabled for that event type, THE system SHALL queue an email notification.

Email notifications MAY be sent for:
- Direct replies to comments the member has posted
- Significant upvotes on content (configurable threshold, default: 10 upvotes)
- Mentions of the member by name
- Administrative announcements
- Moderation actions against their content

THE system SHALL respect member privacy settings and ONLY send email notifications if the member has explicitly enabled them for that notification type.

### 7.3 Notification Preferences

WHEN a member accesses their account settings, THE system SHALL display notification preference options:
- Enable/disable in-app notifications (global toggle)
- Enable/disable email notifications (global toggle)
- Email notification frequency (Immediate, Daily digest, Weekly digest, Never)
- Specific notification types to enable/disable:
  - Notifications when someone replies to my comments
  - Notifications when someone upvotes my content
  - Notifications about moderation actions
  - Announcements and important system messages

WHEN a member updates notification preferences, THE system SHALL:
- Save preferences immediately
- Apply preferences to all future notifications
- Display confirmation: "Your notification preferences have been updated."

### 7.4 Notification History and Management

WHEN a member opens the notification center, THE system SHALL provide options to:
- View recent notifications (default: last 30 notifications)
- Mark notifications as read (individually or all at once)
- Clear/delete old notifications
- Archive notifications

THE system SHALL retain notification history for minimum 30 days. Notifications older than 30 days may be automatically deleted.

---

## 8. Moderation Functions

### 8.1 User Reporting and Flagging

WHEN a member encounters inappropriate content, THE system SHALL display a "Report" or "Flag" button on discussions and comments.

WHEN a member clicks the report button, THE system SHALL display a report form with:
- Dropdown menu to select violation category:
  - Violence or Safety Threats
  - Harassment or Abuse
  - Misinformation or False Information
  - Spam or Manipulation
  - Illegal Content
  - Platform Abuse
  - Other
- Optional text field for detailed explanation (maximum 500 characters)
- Submit and Cancel buttons

WHEN a member submits a report, THE system SHALL:
- Record the report with timestamp
- Record the reporting member's identity
- Record the reported content
- Create a unique report ID
- Display confirmation message: "Thank you for your report. Our moderation team will review it shortly."
- Queue the report for moderator review

ONLY authenticated members can submit reports. GUESTS clicking report SHALL be prompted to log in.

### 8.2 Moderator Review Workflow

WHEN a moderator logs into their account, THE system SHALL display:
- Moderation dashboard with link to pending reports
- Number of pending reports requiring review
- Unreviewed flag count (e.g., "12 pending reports")

WHEN a moderator accesses the report queue, THE system SHALL display:
- List of all pending reports (oldest first, or by severity)
- For each report: reported content preview, report reason, reporter notes, report date/time
- Filter options (by category, by date, by status)
- Search functionality to find specific reports

WHEN a moderator clicks on a report, THE system SHALL display:
- Full reported content in context (the comment/discussion with surrounding posts)
- Report reason and reporter's explanation
- Content creator's posting history
- Content creator's warning/violation history
- Available moderation actions (approve, remove, edit, warn, temporary ban, permanent ban)
- Notes field for documenting the moderation decision

### 8.3 Moderation Actions

WHEN a moderator reviews flagged content, THE moderator can choose from these actions:

**Approve Content**
- THE system SHALL mark the report as invalid/dismissed
- THE system SHALL log the approval in audit trail
- THE system SHALL keep the content visible
- THE system SHALL close the report as "no action needed"

**Remove Content**
- THE system SHALL remove the content from public view
- THE system SHALL display "[removed by moderator]" or similar placeholder
- THE system SHALL preserve the content in the database for audit purposes
- THE system SHALL send notification to content creator: "Your post was removed for violating community guidelines. [Reason if provided]"
- THE system SHALL close the report as "resolved - content removed"

**Edit Content**
- THE system SHALL display editing interface
- THE system SHALL allow moderator to modify specific portions of the content
- THE system SHALL preserve original version in edit history
- THE system SHALL update the content with edited version
- THE system SHALL display moderator edit notice on the content: "[Edited by moderation team]"
- THE system SHALL send notification to content creator: "Your post was edited by moderation team to remove [specific violation]. [Reason if provided]"

**Issue Warning**
- THE system SHALL record the warning against the user's account
- THE system SHALL send notification to user: "Your post violates community guidelines. [Reason]. This is a warning. Further violations may result in suspension."
- THE system SHALL NOT remove content with warning only
- THE system SHALL increment user's warning counter
- THE system SHALL display warning on user's moderation record

**Temporary Suspension**
- THE system SHALL disable the user's account for specified duration (1 day, 7 days, 30 days)
- THE system SHALL prevent the user from creating discussions or comments during suspension
- THE system SHALL archive user's recent content
- THE system SHALL send notification: "Your account has been temporarily suspended for [duration] due to policy violations. [Reason]"
- THE system SHALL display suspension notice when user tries to access account

**Permanent Ban**
- THE system SHALL permanently disable the user's account
- THE system SHALL prevent any login attempts
- THE system SHALL display ban notice when user attempts login: "Your account has been permanently banned. [Reason if provided]"
- THE system SHALL send notification with appeal instructions if appeal is allowed

### 8.4 Warning and Suspension Management

WHEN a user receives multiple warnings, THE system SHALL automatically escalate the response:
- After 1st warning: Educational message, content preserved
- After 2nd warning within 30 days: Content removal, 24-hour suspension
- After 3rd warning within 60 days: 7-day suspension
- After 4th warning within 90 days: 30-day suspension or permanent ban review

THE system SHALL display warning count to moderators viewing the user's record, helping them make informed decisions about escalation.

---

## 9. Administrator Functions

### 9.1 User Account Management

WHEN an administrator accesses the user management section, THE system SHALL display:
- Searchable list of all registered users
- For each user: username, email, join date, last login, account status (active/banned/suspended), warning count
- Ability to click on user to view full profile and account details

THE system SHALL allow administrators to:
- Search users by username, email, or user ID
- Filter users by status (active, suspended, banned, inactive)
- Filter users by join date
- View user's complete activity history (discussions created, comments posted, warnings received)
- Edit user information (username, email, display name)
- Reset user passwords (send password reset email)
- Change user role (promote to moderator, demote to member)
- Manually suspend users temporarily
- Permanently ban users
- Delete user accounts

### 9.2 Category Management

WHEN an administrator accesses category management, THE system SHALL display:
- List of all categories (active and archived)
- For each category: name, description, number of discussions, status
- Buttons to create, edit, archive, or delete categories

WHEN creating a new category, THE system SHALL require:
- Unique category name (3-50 characters)
- Category description (20-200 characters)
- Optional category-specific rules/guidelines

WHEN editing a category, THE system SHALL:
- Allow modification of name, description, and guidelines
- Display warning if discussions exist in the category
- Require confirmation if major changes are made

WHEN archiving a category, THE system SHALL:
- Prevent new discussions in that category
- Keep existing discussions accessible in read-only mode

WHEN deleting a category, THE system SHALL:
- Only allow if category is empty (no discussions)
- Display confirmation dialog
- Permanently remove the category

### 9.3 Moderator Management

WHEN an administrator accesses moderator management, THE system SHALL display:
- List of current moderators
- For each moderator: name, categories assigned, moderation activity (reports processed)
- Option to assign new moderators or remove moderator status

WHEN promoting a member to moderator, THE system SHALL:
- Display confirmation dialog
- Allow selection of categories to assign
- Grant moderator permissions
- Send confirmation email to new moderator

WHEN removing moderator status, THE system SHALL:
- Revoke all moderator permissions
- Revert to member role
- Preserve all their previous comments and posts

### 9.4 Platform Settings and Configuration

WHEN an administrator accesses platform settings, THE system SHALL allow configuration of:
- Platform name and description
- Community guidelines text (displayed to all users)
- Terms of Service text
- Privacy Policy text
- Notification settings and email templates
- Content filtering keywords (for automatic flagging)
- Rate limiting thresholds
- Maintenance mode (enable/disable public access)
- Third-party service configurations (email provider, storage service, etc.)

WHEN an administrator updates a setting, THE system SHALL:
- Save the change immediately
- Apply to all future operations/notifications
- Display confirmation message
- Log the configuration change in audit trail

### 9.5 Analytics and System Reporting

WHEN an administrator accesses the analytics dashboard, THE system SHALL display:
- Total registered users
- Active users (logged in within last 7 days)
- New users (joined this week/month)
- Total discussions created
- Total comments posted
- Activity by category (which categories most active)
- Engagement metrics (average comments per discussion, vote activity)
- Moderation statistics (reports processed, content removed, users warned/banned)
- System performance metrics (response times, error rates, uptime)
- Trend analysis (growth over time, activity patterns)

WHEN an administrator views analytics, THE system SHALL:
- Display data with configurable date ranges
- Provide options to filter by category, user type, etc.
- Allow exporting analytics data to CSV or similar format
- Show trends and comparisons (this week vs. last week, etc.)

---

## 10. Business Rules and Validation

### 10.1 Content Length Constraints

- Discussion title: minimum 5 characters, maximum 200 characters
- Discussion description: minimum 20 characters, maximum 5,000 characters
- Comment: minimum 1 character, maximum 2,000 characters
- Username: minimum 3 characters, maximum 20 characters
- Display name: minimum 3 characters, maximum 50 characters
- Category name: maximum 50 characters
- Category description: maximum 200 characters
- User bio: maximum 500 characters

### 10.2 Rate Limiting Rules

- Discussion creation: maximum 10 per member per 24-hour rolling window
- Comment posting: maximum 30 per member per 1-hour rolling window
- Voting: maximum 60 votes per member per 1-minute window
- New user restrictions: maximum 3 discussions per 24 hours and maximum 10 comments per hour for accounts less than 24 hours old

### 10.3 Time Windows and Constraints

- Edit window for comments: 24 hours after creation
- Edit window for discussions: 7 days after creation (members), unlimited (moderators/admins)
- Delete window for member content: 72 hours (without moderator approval)
- Email verification link validity: 24 hours
- Password reset link validity: 1 hour
- Session timeout: 24 hours of inactivity
- Token expiration: 15 minutes (access), 7 days (refresh)

### 10.4 Error Handling and Validation

ALL user input SHALL be validated before processing. THE system SHALL display specific error messages identifying exactly what validation failed (not generic "invalid input" messages).

THE system SHALL prevent SQL injection, XSS attacks, and other security vulnerabilities through input sanitization and parameterized queries.

---

## Completeness and Implementation

For backend developers implementing these functional requirements:

✅ All EARS requirements are explicit and testable (WHEN... THE... SHALL...)
✅ All role-based access control is specified (guests, members, moderators, administrators)
✅ All validation rules are defined with specific character limits and constraints
✅ Error messages are user-friendly and actionable
✅ All rate limiting parameters are specified with exact numerical values
✅ All time windows are defined precisely (hours, days, minutes)
✅ All CRUD operations are fully specified for each feature
✅ All edge cases and error scenarios are documented
✅ All business logic is explicit and unambiguous
✅ Performance expectations integrate with functional specs (response times where relevant)

These requirements define WHAT the system must do from a business perspective. Implementation approach, technology selection, and architectural decisions are at the discretion of the development team.
