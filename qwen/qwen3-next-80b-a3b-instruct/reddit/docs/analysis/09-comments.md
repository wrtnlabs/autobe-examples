# Reddit-like Community Platform Requirements Specification

## User Account Management

### User Registration

WHEN a guest attempts to register a new account, THE system SHALL:
- Require the guest to provide a valid email address in standard RFC 5322 format
- Require the guest to create a password with minimum 8 characters, including at least one uppercase letter, one lowercase letter, one digit, and one special character
- Require the guest to select a unique username that is between 3 and 30 characters long, containing only alphanumeric characters and underscores
- Validate that the email address is not already registered in the system
- Validate that the username is not already taken by another user
- Generate a unique user ID for the new account
- Create a new user record in the database with the provided email, username, hashed password, and default values for display name, bio, avatar, and karma score of 0
- Assign the account a "active" status
- Send a verification email to the provided email address with a unique verification token
- Redirect the user to a "please verify your email" confirmation page

WHEN a user attempts to register with an already registered email or username, THE system SHALL:
- Return HTTP 409 Conflict with appropriate error messages
- Specifically indicate whether the email or username is already in use
- Not create any database records or send any verification emails
- Log the attempted registration as a security event

WHEN a user provides an invalid email format, invalid password, or invalid username during registration, THE system SHALL:
- Return HTTP 422 Unprocessable Entity with detailed error messages for each validation failure
- List all validation errors in a structured format
- Not create any database records
- Not send any verification emails

### User Login

WHEN a user attempts to login, THE system SHALL:
- Accept either email or username as the identifier
- Require a password to be provided
- Locate the user record by email or username
- Verify that the account is active
- Verify that the provided password matches the stored hash using bcrypt with cost factor 12
- Generate a JSON Web Token (JWT) with:
  - User ID as the subject
  - Issued at timestamp
  - Expiration time of 7 days
  - Signature signed with a 256-bit secret key
- Return the JWT in an HTTP-only, Secure, SameSite=Strict cookie named "auth_token"
- Return a 200 OK response with user profile information excluding sensitive data

WHEN a user provides incorrect credentials during login, THE system SHALL:
- Return HTTP 401 Unauthorized
- Prevent information disclosure about whether email/username or password was incorrect
- Implement exponential backoff lockout after 5 failed attempts within 5 minutes
- Log the failed attempt as a security event
- Not reveal whether the account exists or not

WHEN a user attempts to login with a deactivated account, THE system SHALL:
- Return HTTP 403 Forbidden
- Include a message that the account is deactivated and requires support intervention

### Password Change

WHEN a logged-in user requests to change their password, THE system SHALL:
- Require the user to provide their current password
- Require the new password to meet the same complexity requirements as registration (8+ characters, uppercase, lowercase, digit, special character)
- Verify that the current password matches the stored hash
- Hash the new password with bcrypt (cost factor 12)
- Update the password hash in the user record
- Revoke all existing JWT tokens for this user
- Create a new JWT token with 7-day expiration
- Set the new JWT token in the "auth_token" HTTP-only cookie
- Log the password change event with timestamp and IP address

WHEN a user requests a password change without providing the current password, THE system SHALL:
- Return HTTP 400 Bad Request with error message "Current password is required"
- Not perform any database updates

WHEN a current password fails to verify during password change, THE system SHALL:
- Return HTTP 401 Unauthorized with error message "Incorrect current password"
- Not perform any database updates

### Account Deletion

WHEN a logged-in user requests to delete their account, THE system SHALL:
- Require the user to confirm the deletion by entering their password
- Verify the password matches the stored hash
- Begin a cascade deletion process:
  - Delete all posts created by the user
  - Delete all comments created by the user
  - Remove the user from all community subscriptions
  - Clear the user's avatar
  - Clear the user's bio and display name
  - Reset the user's karma to 0
  - Mark the user account as "deleted"
  - Remove the user's email and username from searchable fields (anonymize)
  - Set email to "deleted_" + user_id + "@example.com"
  - Set username to "deleted_user_" + user_id
  - Preserve user_id for audit trail purposes
- Delete the user's authentication token
- Return HTTP 200 OK with success message
- Log the account deletion event with timestamp and IP address

WHEN a user requests account deletion without confirming with their password, THE system SHALL:
- Return HTTP 400 Bad Request with error message "Password confirmation is required for account deletion"
- Not perform any deletion operations

WHEN a user requests account deletion while logged in, THE system SHALL:
- Immediately log the user out after successful deletion
- Clear all session cookies
- Redirect to the homepage with a success notification

## User Profile Management

### Profile Structure and Data

WHEN a user profile is created, THE system SHALL:
- Initialize with default values:
  - display_name: same as username
  - bio: empty string
  - avatar: default placeholder image from /assets/images/default-avatar.png
  - karma_score: 0
  - profile_visibility: "public"

WHEN an avatar is uploaded, THE system SHALL:
- Accept only JPG, PNG, or WebP formats
- Limit file size to 2MB
- Generate three resolutions for responsive display:
  - 100x100 (thumbnail)
  - 200x200 (profile display)
  - 400x400 (full resolution)
- Store each version in cloud storage with unique filename
- Update the user record with URLs to the three image versions
- Delete the original uploaded file

WHEN a display name is updated, THE system SHALL:
- Allow display names between 1 and 50 characters
- Allow alphanumeric characters, spaces, underscores, and hyphens
- Trim leading and trailing whitespace
- Reject display names containing any prohibited characters (HTML tags, script tags, control characters)
- Prevent the use of system reserved words ("admin", "moderator", "system", "support", "bot")

WHEN a bio is updated, THE system SHALL:
- Allow up to 500 characters
- Accept standard text with line breaks
- Convert HTML tags to plain text (escape <, >, &, etc.)
- Remove any script tags or embedded JavaScript
- Preserve whitespace formatting except for excessive consecutive whitespace

### Profile Viewing

WHEN any user (authenticated or guest) views another user's profile, THE system SHALL:
- Display the user's display name, bio, and avatar
- Display the user's total karma score
- Display a list of all public posts by the user
- Display a list of all public comments by the user
- Show "Private Profile" message if profile_visibility is set to "private"
- Show "Account Deleted" message if the user account is marked as deleted
- Always show the user_id as a non-displayed identifier for internal referencing
- Include timestamps for all content to indicate when posts and comments were created

WHEN a user with a private profile attempts to view their own profile, THE system SHALL:
- Display all profile data including private information
- Allow full editing capabilities
- Display all posts and comments

WHEN a moderator views a profile of a user in their community, THE system SHALL:
- Display all profile data regardless of privacy settings
- See all posts and comments, including those marked as deleted (for moderation purposes)
- Have access to IP addresses of original post/comment creation and last login

### Profile Editing

WHEN a user edits their display name, THE system SHALL:
- Validate the new display name against the rules above
- Check for uniqueness (no other active user has the same display name)
- Update the display_name field in the user record
- Update any references to this display name in posts and comments (for display purposes only)
- Return HTTP 200 OK with updated profile data
- Log the display name change event

WHEN a user edits their bio, THE system SHALL:
- Validate that the new bio doesn't exceed 500 characters
- Sanitize for security (escape HTML, remove scripts)
- Update the bio field in the user record
- Return HTTP 200 OK with updated profile data
- Log the bio change event

WHEN a user edits their avatar, THE system SHALL:
- Validate file type (JPG, PNG, WebP)
- Validate file size (≤ 2MB)
- Generate optimized versions at three resolutions
- Store all versions in cloud storage
- Update the user record with new image URLs
- Delete the previous avatar versions from storage
- Return HTTP 200 OK with updated profile data
- Log the avatar change event

WHEN an avatar file is rejected due to type or size violations, THE system SHALL:
- Return HTTP 422 Unprocessable Entity with specific error code
- List exact reasons for rejection (file type, size, etc.)
- Preserve the existing avatar unchanged
- Not delete existing avatar files

WHEN a user attempts to change their username, THE system SHALL:
- Return HTTP 405 Method Not Allowed
- Display message "Usernames cannot be changed after registration. Please create a new account if needed."

## Karma System

### Karma Calculation Logic

WHEN a user receives an upvote on a post or comment, THE system SHALL:
- Increment the user's karma_score by 1
- Record the vote event with timestamp, vote type (upvote), and associated content ID
- Update the karma_score field in the user record

WHEN a user receives a downvote on a post or comment, THE system SHALL:
- Decrement the user's karma_score by 1
- Record the vote event with timestamp, vote type (downvote), and associated content ID
- Update the karma_score field in the user record

WHEN a user removes their vote from a post or comment, THE system SHALL:
- If the user had previously upvoted, decrement karma_score by 1
- If the user had previously downvoted, increment karma_score by 1
- Record the vote removal event with timestamp, previous vote type, and associated content ID
- Update the karma_score field in the user record

WHEN a user's content is deleted by a moderator or by the author, THE system SHALL:
- Recalculate the user's total karma by summing all remaining votes on their active content
- Update the karma_score field in the user record
- Log the recalculated karma value and reason for recalculation

WHEN a user's account is deleted, THE system SHALL:
- Reset karma_score to 0
- Preserve the historical karma log for audit purposes but exclude from current calculation

### Karma Display

WHEN a user profile is displayed, THE system SHALL:
- Show the current karma_score as a single integer
- Display positive scores without a "+" sign
- Display negative scores with a "-" sign
- Show "Karma: 42" for positive score, "Karma: -15" for negative score
- Include a tooltip on hover showing the last 5 karma changes with timestamps and reasons

WHEN a post or comment is displayed, THE system SHALL:
- Show the author's current karma_score next to their username
- Use consistent format: "Username (42k karma)" for scores > 1000, "Username (42 karma)" for scores < 1000
- Format large numbers appropriately: 1,000 → 1k, 1,234,567 → 1.2M

WHEN a user has negative karma, THE system SHALL:
- Display the negative score normally with minus sign
- Not penalize the user's ability to post or comment
- Not change community subscription privileges
- Allow the user to earn back positive karma through contributions

### Karma Integrity Rules

WHEN multiple votes are received simultaneously from different users, THE system SHALL:
- Process votes one by one using atomic transaction operations on the karma_score field
- Ensure accurate incremental changes with database-level locks
- Maintain transactional integrity across all related records

WHEN a vote vote is processed and the karma_score calculation fails, THE system SHALL:
- Roll back the entire transaction
- Return HTTP 500 Internal Server Error
- Log the database error and attempt details
- Notify system administrators

WHEN a user attempts to manually modify their karma_score, THE system SHALL:
- Reject any direct write attempts to karma_score field
- Validate all karma_score changes originate only from approved vote events
- Block any API endpoints that allow direct karma_score modification

WHEN the karma system detects a suspected vote manipulation pattern (rapid voting/unvoting cycles), THE system SHALL:
- Flag the user for manual review by moderation team
- Temporarily freeze karma calculation for the flagged user
- Prevent vote submission from the flagged user until reviewed
- Log all related activity for investigation

## Community Management

### Community Creation

WHEN a user attempts to create a new community, THE system SHALL:
- Require the community name to be between 3 and 25 characters
- Require the name to contain only lowercase alphanumeric characters and hyphens
- Require the name to be unique across all communities
- Allow the creator to provide a description up to 500 characters
- Allow the creator to upload an icon image (JPG, PNG, WebP) with maximum 1MB size
- Generate a unique community ID
- Create a community record with:
  - community_name
  - description
  - icon_url (generated from uploaded image)
  - created_by (user ID of creator)
  - created_at (timestamp)
  - subscriber_count: 1 (automatically includes creator)
  - status: "active"
- Add the creator as the first member of the community with "owner" role
- Set up initial community settings:
  - allow_external_posts: true
  - require_subscription_to_post: true
  - default_sort_order: "hot"
- Return HTTP 201 Created with community details
- Log community creation event
- Send welcome message to creator: "You created \"{community_name}\". You're the owner!"

WHEN a community name is provided that is too short, too long, or contains invalid characters, THE system SHALL:
- Return HTTP 422 Unprocessable Entity
- Detail which validation failed (length, format, etc.)
- Not create any community record

WHEN a community name is already taken, THE system SHALL:
- Return HTTP 409 Conflict
- Provide a message: "A community named '{community_name}' already exists. Please choose another name."
- Not create any community record

WHEN an icon image file is provided but fails validation (wrong format, too large), THE system SHALL:
- Return HTTP 422 Unprocessable Entity
- List specific validation errors
- Create the community without an icon (use default placeholder)
- Log the image upload failure

### Community Settings and Management

WHEN a community owner changes the community description, THE system SHALL:
- Validate new description is ≤ 500 characters
- Sanitize for harmful content
- Update the description field in the community record
- Log the modification
- Return HTTP 200 OK

WHEN a community owner uploads a new icon, THE system SHALL:
- Validate file type (JPG, PNG, WebP)
- Validate file size ≤ 1MB
- Generate optimized versions for different display contexts
- Store new images in cloud storage
- Update community record with new icon URLs
- Delete old icon versions
- Return HTTP 200 OK
- Record the update in activity logs

WHEN a community is deactivated by moderator action, THE system SHALL:
- Change status from "active" to "deactivated"
- Hide the community from public listings and search results
- Allow existing subscribers to view content but prevent new posts and comments
- Preserve all existing content for potential restoration
- Allow owners to reactivate the community

WHEN a community is archived, THE system SHALL:
- Change status from "active" to "archived"
- Hide the community from public listings and search results
- Allow existing subscribers to view content and comments
- Prevent any new posts or comments
- Preserve all existing content indefinitely
- Allow owners to restore the community

WHEN a community is banned, THE system SHALL:
- Change status from "active" to "banned"
- Hide the community from all public views
- Delete all posts and comments in the community
- Remove all subscribers from the community
- Notify all subscribers and community owner of the ban
- Preserve community metadata for audit purposes
- Allow system administrators to review and potentially restore

### Community Search and Discovery

WHEN a user searches for communities, THE system SHALL:
- Accept search queries of 2+ characters
- Perform case-insensitive matching on community_name
- Return communities that contain the search term anywhere in the name
- Sort results by subscriber_count descending, then by community_name ascending
- Limit results to 100 per page
- Support pagination with cursor-based navigation
- Return community data without revealing internal IDs

WHEN a user browses all communities, THE system SHALL:
- Return an ordered list of active communities
- Sort by subscriber_count descending, with communities having 0 subscribers at the bottom
- Display only essential community data: name, description, subscriber_count, icon_url
- Limit results to 50 per page
- Support cursor-based pagination for efficient loading
- Include a "See All" option for users who want to browse further

WHEN a user views the public community list, THE system SHALL:
- Not include deactivated or archived communities
- Not include banned communities
- Include only communities with status "active"
- Ensure that communities with only one member (owner) are displayed normally

### Subscribing to Communities

WHEN a user subscribes to a community, THE system SHALL:
- Verify the user is authenticated
- Verify the community exists and is active
- Add the user to the community's subscriber list
- Increment the community's subscriber_count by 1
- Create a subscription record with user_id, community_id, and subscribed_at timestamp
- Return HTTP 200 OK with updated subscription status
- Log the subscription event
- Send notification: "You're now subscribed to {community_name}"

WHEN a user unsubscribes from a community, THE system SHALL:
- Verify the user is authenticated
- Verify the user is currently subscribed to the community
- Remove the user from the community's subscriber list
- Decrement the community's subscriber_count by 1
- Delete the subscription record
- Return HTTP 200 OK with updated subscription status
- Log the unsubscription event
- Send notification: "You've unsubscribed from {community_name}"

WHEN a user attempts to subscribe to a community they are already subscribed to, THE system SHALL:
- Return HTTP 200 OK
- Return existing subscription status
- Not perform any database changes
- Log the attempted duplicate subscription

WHEN a user attempts to subscribe to a deactivated, archived, or banned community, THE system SHALL:
- Return HTTP 403 Forbidden
- Provide message: "Cannot subscribe to {community_name} because it is not currently active"
- Not make any subscription changes

## Post Management

### Post Creation

WHEN a user creates a new post, THE system SHALL:
- Validate that the user is authenticated
- Validate that the user is subscribed to the target community
- Validate that the community is active
- Validate that the post title is between 3 and 200 characters
- Validate that the post contains at least one type of content (text, URL, or image)
- Validate that text content is ≤ 10,000 characters
- Validate that URL is a properly formatted HTTP/HTTPS link
- Validate that image is JPG, PNG, or WebP ≤ 5MB
- Verify the user has not created a post with identical text/URL/image within the last 2 minutes (anti-spam)
- Generate a unique post_id
- Determine post type based on content provided:
  - Text post: has text_content, no url, no image
  - Link post: has url, no text_content, no image
  - Image post: has image_url, no text_content or url
- Create a post record with:
  - title
  - post_type (text, link, or image)
  - text_content (if applicable)
  - url (if applicable)
  - image_url (if applicable)
  - author_id
  - community_id
  - created_at (timestamp)
  - updated_at (same as created_at)
  - vote_score: 0
  - comment_count: 0
  - is_edited: false
  - is_archived: false
  - status: "active"
- Increment the community's post_count by 1
- Create a post creation event in audit log
- Return HTTP 201 Created with post details

WHEN a user tries to create a post in a community they are not subscribed to, THE system SHALL:
- Return HTTP 403 Forbidden with message: "You must be subscribed to {community_name} to create posts here"
- Not create any post records

WHEN a user creates a post with no title, THE system SHALL:
- Return HTTP 422 Unprocessable Entity with message: "Title is required and must be 3-200 characters long"
- Not create any post records

WHEN a user creates a post with both a URL and text content, THE system SHALL:
- Treat as a link post with supplemental text
- Store both the URL and text content in the record
- Display the link as primary content
- Show the text below the link

WHEN a user creates a post with invalid URL format, THE system SHALL:
- Return HTTP 422 Unprocessable Entity with message: "Invalid URL format. Must be HTTPS with valid domain"
- Not create any post records

WHEN a user uploads an image that exceeds 5MB, THE system SHALL:
- Return HTTP 422 Unprocessable Entity with message: "Image must be 5MB or smaller"
- Not create any post records
- Not delete the uploaded file immediately (allow retry)

WHEN a user uploads an image with invalid format (non-JPG/PNG/WebP), THE system SHALL:
- Return HTTP 422 Unprocessable Entity with message: "Only JPG, PNG, and WebP images are supported"
- Not create any post records
- Not delete the uploaded file immediately (allow retry)

WHEN an image upload fails due to server error, THE system SHALL:
- Return HTTP 500 Internal Server Error
- Preserve any partially uploaded data
- Notify administrators of the failure
- Allow user to retry

### Post Editing

WHEN a user edits their own post, THE system SHALL:
- Verify the authenticated user is the author of the post
- Verify the post is not archived or deleted
- Allow editing of: title, text_content, image (if image post)
- Prevent changing: post_type, community, url (for link posts, must be edited by deleting and creating new)
- Limit title to 200 characters
- Limit text content to 10,000 characters
- Allow only JPG, PNG, WebP images ≤ 5MB for replacement
- If image is changed:
  - Upload new image to cloud storage
  - Generate optimized versions
  - Update image_url field
  - Delete previous image versions
- Set is_edited to true
- Update updated_at timestamp
- Create an edit event in audit log
- Return HTTP 200 OK with updated post data

WHEN a user attempts to edit a post they don't own, THE system SHALL:
- Return HTTP 403 Forbidden with message: "You cannot edit posts created by other users"
- Not modify any data

WHEN a user attempts to edit a post that has been archived or deleted, THE system SHALL:
- Return HTTP 403 Forbidden with message: "Archived or deleted posts cannot be edited"
- Not modify any data

WHEN a user attempts to change the URL of a link post, THE system SHALL:
- Return HTTP 403 Forbidden with message: "URLs for link posts cannot be changed. Delete and recreate the post to use a new URL."
- Not modify any data

WHEN a post edit fails due to content validation errors, THE system SHALL:
- Return HTTP 422 Unprocessable Entity with list of specific validation errors
- Not modify any data
- Preserve the original post content

### Post Deletion

WHEN a user deletes their own post, THE system SHALL:
- Verify the authenticated user is the author of the post
- Verify the post is not archived
- Set post status to "deleted"
- Set is_deleted to true
- Record deletion timestamp
- Remove the post from all feed displays
- Decrement the community's post_count by 1
- Log the deletion event
- Return HTTP 200 OK
- Notify the author: "Your post has been deleted."

WHEN a moderator deletes a post, THE system SHALL:
- Verify the moderator has appropriate permissions in the community
- Set post status to "deleted"
- Set is_deleted to true
- Record deletion timestamp and moderator's ID
- Record the reason for deletion
- Remove the post from all feed displays
- Decrement the community's post_count by 1
- Log the deletion event
- Return HTTP 200 OK
- Notify the post author: "Your post was deleted by moderator in {community_name}. Reason: {reason}" if user is not banned

WHEN a post is deleted, THE system SHALL:
- Keep the post record in the database for audit purposes
- Preserve all associated data (title, text, image, etc.)
- Maintain connection to author and community
- Maintain vote and comment history
- Display "[Post deleted by author]" or "[Post deleted by moderator]" to users
- Allow moderators to view deleted content for investigation

WHEN a user attempts to delete a post they don't own, THE system SHALL:
- Return HTTP 403 Forbidden with message: "You cannot delete posts created by other users"
- Not modify any data

WHEN a post is being viewed and has been deleted, THE system SHALL:
- Display appropriate message: "[Post deleted by author]" or "[Post deleted by moderator]"
- Hide all content and media
- Show creation date and deletion status
- Allow moderators to view content with reason if provided
- Prevent any interaction (voting, commenting)

### Post Visibility and Archiving

WHEN a post is archived by a moderator, THE system SHALL:
- Change post status from "active" to "archived"
- Remove the post from all public feeds and search results
- Allow existing subscribers to still view the post
- Preserve all comments and votes
- Allow moderators to unarchive the post
- Record the archive event with moderator ID and timestamp

WHEN a post is archived, THE system SHALL:
- Hide from "Home", "Popular", and "Community" feeds
- Hide from search results
- Preserve all data for potential restoration
- Notify the author if they are not banned: "Your post has been archived by moderator in {community_name}."

WHEN a user attempts to view an archived post they are not subscribed to, THE system SHALL:
- Return HTTP 404 Not Found if user is not subscribed to the community
- Return HTTP 200 OK with "[Post archived]" message if user is subscribed to the community

WHEN a post is restored from archive, THE system SHALL:
- Change status from "archived" to "active"
- Return to all appropriate feeds based on community subscriptions
- Clear the archive timestamp and reason
- Log the restoral event
- Notify the author: "Your post has been restored by moderator in {community_name}." if they are not banned

## Post Voting System

### Vote Mechanics and Rules

WHEN a user upvotes a post, THE system SHALL:
- Verify the user is authenticated
- Verify the post is active (not deleted or archived)
- Check whether the user has already voted on this post
- If no previous vote:
  - Create a new vote record with user_id, post_id, vote_type = "upvote"
  - Increment post's vote_score by 1
  - Increment the author's karma_score by 1
- If user previously downvoted:
  - Delete existing downvote record
  - Create new upvote record
  - Increment post's vote_score by 2 (from -1 to 1)
  - Increment author's karma_score by 2 (from -1 to 1)
- If user previously upvoted:
  - Return HTTP 400 Bad Request with message: "You've already upvoted this post"
- Record all actions in audit log
- Return HTTP 200 OK with updated score

WHEN a user downvotes a post, THE system SHALL:
- Verify the user is authenticated
- Verify the post is active (not deleted or archived)
- Check whether the user has already voted on this post
- If no previous vote:
  - Create a new vote record with user_id, post_id, vote_type = "downvote"
  - Decrement post's vote_score by 1
  - Decrement the author's karma_score by 1
- If user previously upvoted:
  - Delete existing upvote record
  - Create new downvote record
  - Decrement post's vote_score by 2 (from 1 to -1)
  - Decrement author's karma_score by 2 (from 1 to -1)
- If user previously downvoted:
  - Return HTTP 400 Bad Request with message: "You've already downvoted this post"
- Record all actions in audit log
- Return HTTP 200 OK with updated score

WHEN a user removes their vote from a post, THE system SHALL:
- Verify the user is authenticated
- Verify the post is active (not deleted or archived)
- Check whether the user has voted on this post
- If user had an upvote:
  - Delete the upvote record
  - Decrement post's vote_score by 1
  - Decrement author's karma_score by 1
- If user had a downvote:
  - Delete the downvote record
  - Increment post's vote_score by 1
  - Increment author's karma_score by 1
- If user had no previous vote:
  - Return HTTP 400 Bad Request with message: "You haven't voted on this post yet"
- Record all actions in audit log
- Return HTTP 200 OK with updated score
- Return the current score, which will be the score before the vote was removed

### Vote Display and Performance

WHEN a post's vote score is displayed, THE system SHALL:
- Show as integer: 0, 5, -3, 17, etc.
- For scores ≥ 1000, display with K suffix (1.2K)
- For scores ≥ 1,000,000, display with M suffix (2.5M)
- Use consistent formatting across all feeds
- Hide exact vote breakdown (upvotes/downvotes) from users
- Show only aggregate score

WHEN a user views a feed of posts, THE system SHALL:
- Only load the post vote_score and not fetch individual vote records
- Calculate scores from aggregated totals stored in post table
- Use database indexes on vote_score for performance
- Avoid N+1 query problems by eager loading

WHEN the post score is updated due to a vote change, THE system SHALL:
- Push the updated score to all users viewing the post in real-time via WebSocket channel (if application is connected)
- If WebSocket is not available, return updated score in API response
- Update the score in the UI without requiring page refresh

WHEN the server detects excessive vote activity (>100 votes per second on a single post), THE system SHALL:
- Implement per-post rate limiting
- Temporarily lock voting on that post if abuse is detected
- Notify administrators of the anomaly
- Continue to serve current vote score to users

### Vote Integrity and Security

WHEN the system detects a user attempting to vote multiple times from different IP addresses, THE system SHALL:
- Flag the user for review
- Prevent additional votes while flagged
- Log all IP addresses associated with the user
- Review voting patterns for bot activity

WHEN a user's account is banned, THE system SHALL:
- Automatically remove all votes cast by that user on all posts and comments
- Recalculate all affected post scores
- Recalculate all affected user karma scores
- Record the removal as "votes removed due to account ban"
- Do not notify other users of the vote removal

WHEN a user's account is deleted, THE system SHALL:
- Automatically remove all votes cast by that user on all posts and comments
- Recalculate all affected post scores
- Recalculate all affected user karma scores
- Record the removal as "votes removed due to account deletion"
- Do not notify other users of the vote removal

WHEN an internal vote counting error occurs due to server crash or database failover, THE system SHALL:
- Detect the inconsistency by comparing the sum of vote records and the stored post score
- Recalculate the vote score from all existing vote records
- Update the stored score to the correct value
- Log the correction and details of the discrepancy
- Notify system administrators
- Maintain data integrity above all

## Post Feed System

### Feed Types and Access Control

WHEN a user accesses the Home Feed, THE system SHALL:
- Validate that the user is logged in
- If not logged in, return HTTP 401 Unauthorized
- Retrieve all communities that the user is subscribed to
- Fetch all active posts from those communities
- Sort posts according to requested sorting method
- Limit results to 30 per page
- Return with pagination cursor

WHEN a guest user attempts to access the Home Feed, THE system SHALL:
- Return HTTP 401 Unauthorized
- Redirect to login page with return URL
- Display message: "You must be logged in to view your personal feed"

WHEN a user accesses the Popular Feed, THE system SHALL:
- Authenticate the user if logged in (but don't require it)
- Retrieve all active posts from all communities
- Sort according to requested sorting method
- Limit results to 30 per page
- Return with pagination cursor

WHEN a user accesses the Community Feed for community X, THE system SHALL:
- Retrieve all active posts from community X
- Verify the community exists and has status "active"
- Sort according to requested sorting method
- Limit results to 30 per page
- Return with pagination cursor
- Allow access to unauthenticated guests
- Don't require subscription to the community

WHEN a user attempts to access a community feed for a deactivated, archived, or banned community, THE system SHALL:
- If community is deactivated or archived:
  - Return HTTP 404 Not Found
  - Display message: "This community is not currently active"
- If community is banned:
  - Return HTTP 404 Not Found
  - Display message: "This community has been banned from the platform"

### Feed Sorting Algorithms

#### Hot

WHEN "Hot" sorting is selected, THE system SHALL:
- Calculate a hot score for each post using the formula: 
  `hot_score = log10(score + 1) + (timestamp - created_at) / 36000`
- Where:
  - score is the current vote score
  - timestamp is the current server time
  - created_at is the post creation timestamp in seconds
  - 36000 equals 10 hours in seconds
- Sort posts in descending order of hot_score
- Include posts with score ≥ 0
- Do not include posts older than 30 days
- Return results with page size of 30

WHEN a post's score changes on Hot feed, THE system SHALL:
- Recalculate the hot_score
- Update the post's position in the feed
- Push the updated position to active users via WebSocket

#### New

WHEN "New" sorting is selected, THE system SHALL:
- Sort posts in descending order of created_at (newest first)
- Include all active posts regardless of score
- Don't use time decay
- Return results with page size of 30
- Implement pagination using cursor-based approach (last created_at)

#### Top

WHEN "Top" sorting is selected, THE system SHALL:
- Sort posts in descending order of vote_score
- Apply time filter based on user selection:
  - Today: posts created after now() - 24 hours
  - This week: posts created after now() - 7 days
  - This month: posts created after now() - 30 days
  - This year: posts created after now() - 365 days
  - All time: no time limit
- Only include posts with positive vote_score
- Return results with page size of 30
- Implement cursor pagination

WHEN a user changes the time filter on Top sort, THE system SHALL:
- Reset pagination cursor to beginning
- Recalculate all posts according to new time period
- Return new dataset
- Update URL with selected time filter

#### Controversial

WHEN "Controversial" sorting is selected, THE system SHALL:
- Calculate controversy score for each post using formula:
  `controversy_score = min(upvotes, downvotes) / max(1, ABS(score))`
- Sort posts in descending order of controversy_score
- Include only posts with vote_score > 5 total votes
- Do not include posts with only upvotes or only downvotes
- Return results with page size of 30

WHEN controversial posts are re-sorted, THE system SHALL:
- Calculate new controversy scores for all visible posts on current page
- Re-order the feed accordingly
- Push updates to WebSocket if available

### Feed Performance and Pagination

WHEN a user loads any feed, THE system SHALL:
- Use database indexes on post_status, community_id, vote_score, created_at, and community_status
- Avoid JOIN operations where possible by denormalizing data
- Fetch only required fields: post_id, title, author_id, community_id, post_type, vote_score, comment_count, created_at, text_content, url, image_url
- Use cursor-based pagination with last seen post's created_at timestamp
- Implement infinite scroll using 30-post chunks
- Use database-level caching for frequently accessed feeds
- Set HTTP cache headers for public feeds (Popular, Community)
- Set private cache headers for Home Feed

WHEN the server is under heavy load, THE system SHALL:
- Return degraded service with reduced feed freshness (up to 5-minute delay)
- Serve cached results for popular feeds
- Queue non-critical feed requests
- Maintain minimum performance for login and posting

WHEN a feed returns results, THE system SHALL:
- Include current page number and total results count if applicable
- Include next cursor for pagination
- Include sort type and time filter used
- Include total number of posts available in feed
- Return HTTP 200 OK

### Post List Display

WHEN any feed displays a post list, EACH POST SHALL show:

- **Title**: Truncated to 120 characters if longer, with "..." ellipsis
- **Author username**: Link to author's profile
- **Community name**: Link to community feed
- **Vote score**: Displayed as number (0, 17, -3, 1.2K, etc.)
- **Comment count**: Displayed as number, with "+" prefix if user can comment
- **Time since posted**: Displayed as relative time: "just now", "1 minute ago", "2 hours ago", "3 days ago", "a week ago", etc.
- **For text posts**: First 200 characters of text_content, followed by "..." if longer
- **For image posts**: Thumbnail of image (200x200 pixels) with alt text: "Image post: [shortened title]"
- **For link posts**: Domain name from URL (e.g., "youtube.com") displayed in badge style
- **Additional UI elements**:
  - Upvote and downvote buttons with current state
  - Comment count with link to comment section
  - Post time as tooltip with absolute timestamp
- **Consistency**: The display format must be identical across Home, Popular, and Community feeds

WHEN a post has been deleted, THE system SHALL:
- Show: "[Post deleted by author]" or "[Post deleted by moderator]"
- Hide all other content (title, author, community, vote score, etc.)
- Hide vote buttons and comment count
- Show only the deletion message and timestamp

WHEN a user hovers over a community name, THE system SHALL:
- Show a tooltip with community description (first 100 characters)
- Show the subscriber count
- Show whether the current user is subscribed

WHEN a user clicks on author username, THE system SHALL:
- Navigate to author's profile page
- Use user_id for direct lookup, not username (avoid username conflicts)

WHEN a user clicks on community name, THE system SHALL:
- Navigate to the Community Feed for that community
- Use community_id for direct lookup

WHEN a user clicks on "View all" for comments, THE system SHALL:
- Navigate to the post details page
- Load the first 20 comments with replies
- Load remaining comments on scroll

## Comment Management

### Comment Creation

WHEN a user creates a comment on a post, THE system SHALL:
- Verify the user is authenticated
- Verify the post exists and is active (not deleted or archived)
- Verify the comment content is not empty and ≤ 10,000 characters
- Verify the user has not created an identical comment on the same post within the last 1 minute (anti-spam)
- Generate a unique comment_id
- Create a comment record with:
  - post_id
  - author_id
  - content (sanitized)
  - created_at (timestamp)
  - parent_id (null for top-level, reference to parent for replies)
  - vote_score: 0
  - reply_count: 0
  - is_edited: false
  - updated_at: same as created_at
  - status: "active"
- Update the post's comment_count by 1
- Record comment creation in audit log
- Return HTTP 201 Created with comment details

WHEN a user replies to an existing comment, THE system SHALL:
- Verify the user is authenticated
- Verify the target comment exists and is active (not deleted or archived)
- Verify the reply content is not empty and ≤ 10,000 characters
- Verify the user has not created an identical comment on the same parent within the last 1 minute
- Generate a unique comment_id
- Create a comment record with:
  - post_id (same as parent)
  - author_id
  - content (sanitized)
  - created_at (timestamp)
  - parent_id (set to the ID of the target comment)
  - vote_score: 0
  - reply_count: 0
  - is_edited: false
  - updated_at: same as created_at
  - status: "active"
- Increment the parent comment's reply_count by 1
- Increment the post's comment_count by 1
- Record comment creation in audit log
- Return HTTP 201 Created with comment details

### Comment Editing

WHEN a user edits their own comment, THE system SHALL:
- Verify the user is authenticated and owns the comment
- Verify the comment is not deleted or archived
- Validate that the edit request occurs within 24 hours of comment creation
- Validate that the new content is ≤ 10,000 characters
- Sanitize HTML tags and script content
- Update the comment record:
  - content: new value
  - updated_at: now
  - edit_count: increment by 1
  - is_edited: true
  - preserve original content in audit log
- Return HTTP 200 OK with updated comment

WHEN a user attempts to edit a comment after 24 hours, THE system SHALL:
- Return HTTP 403 Forbidden with message: "You can only edit your comments within 24 hours of posting"
- Prevent update

WHEN a user attempts to edit a comment they don't own, THE system SHALL:
- Return HTTP 403 Forbidden with message: "You cannot edit comments created by other users"
- Prevent update

WHEN a moderator edits any comment, THE system SHALL:
- Verify the moderator has appropriate community permissions
- Allow editing regardless of age
- Update comment content, updated_at, edit_count, is_edited
- Record moderator_id and reason in audit log
- Return HTTP 200 OK

WHEN a comment edit fails due to validation errors, THE system SHALL:
- Return HTTP 422 Unprocessable Entity with field-specific error messages
- Preserve the original comment content
- Not update any records

### Comment Deletion

WHEN a user deletes their own comment, THE system SHALL:
- Verify ownership
- Verify comment is not archived or banned
- Set status to "deleted"
- Mark as deleted in database
- Decrement parent comment's reply_count by 1 (if it exists)
- Decrement post's comment_count by 1
- Record deletion event with user_id and timestamp
- Return HTTP 200 OK

WHEN a moderator deletes any comment, THE system SHALL:
- Verify appropriate permissions
- Set status to "deleted"
- Mark as deleted in database
- Decrement parent comment's reply_count by 1 (if it exists)
- Decrement post's comment_count by 1
- Record deletion event with moderator_id, reason, and timestamp
- Return HTTP 200 OK

WHEN a comment is deleted, THE system SHALL:
- Keep the record in database for audit trail
- Preserve all data including content and relationships
- Display "[Comment deleted by author]" or "[Comment deleted by moderator]" to users
- Show moderator reason if provided
- Prevent any interaction with the comment (voting, replying)
- Maintain parent-reply relationships for comment tree structure

WHEN a deleted comment's parent is also deleted, THE system SHALL:
- Maintain the comment record
- Keep the parent_id reference
- Display properly in tree structure as "[Comment deleted]"

WHEN a user attempts to delete a comment they don't own, THE system SHALL:
- Return HTTP 403 Forbidden
- Prevent deletion

### Comment Visibility and Moderation

WHEN a comment is archived by a moderator, THE system SHALL:
- Set status to "archived"
- Hide the comment from all public views
- Allow existing subscribers and moderators to view it
- Prevent new votes and replies
- Preserve all data
- Record archive event with moderator_id and reason

WHEN a comment is unarchived by a moderator, THE system SHALL:
- Set status to "active"
- Restore to public view
- Allow voting and replies
- Clear archive reason
- Record unarchive event

WHEN a user views a comment thread, THE system SHALL:
- For normal users: hide all deleted and archived comments
- For moderators: show all comments with visual indicators ("[Deleted]", "[Archived]")
- Show full comment tree with depth unlimited
- Use efficient database querying with indexed parent_id
- Limit initial load to first 20 top-level comments with first-level replies
- Load deeper levels on demand via pagination or lazy expand

## Comment Voting System

### Vote Mechanics and Rules

WHEN a user upvotes a comment, THE system SHALL:
- Verify the user is authenticated
- Verify the comment is active (not deleted or archived)
- Check whether the user has already voted on this comment
- If no previous vote:
  - Create a new vote record with user_id, comment_id, vote_type = "upvote"
  - Increment comment's vote_score by 1
  - Increment the author's karma_score by 1
- If user previously downvoted:
  - Delete existing downvote record
  - Create new upvote record
  - Increment comment's vote_score by 2 (from -1 to 1)
  - Increment author's karma_score by 2 (from -1 to 1)
- If user previously upvoted:
  - Return HTTP 400 Bad Request with message: "You've already upvoted this comment"
- Record all actions in audit log
- Return HTTP 200 OK with updated score

WHEN a user downvotes a comment, THE system SHALL:
- Verify the user is authenticated
- Verify the comment is active (not deleted or archived)
- Check whether the user has already voted on this comment
- If no previous vote:
  - Create a new vote record with user_id, comment_id, vote_type = "downvote"
  - Decrement comment's vote_score by 1
  - Decrement the author's karma_score by 1
- If user previously upvoted:
  - Delete existing upvote record
  - Create new downvote record
  - Decrement comment's vote_score by 2 (from 1 to -1)
  - Decrement author's karma_score by 2 (from 1 to -1)
- If user previously downvoted:
  - Return HTTP 400 Bad Request with message: "You've already downvoted this comment"
- Record all actions in audit log
- Return HTTP 200 OK with updated score

WHEN a user removes their vote from a comment, THE system SHALL:
- Verify the user is authenticated
- Verify the comment is active (not deleted or archived)
- Check whether the user has voted on this comment
- If user had an upvote:
  - Delete the upvote record
  - Decrement comment's vote_score by 1
  - Decrement author's karma_score by 1
- If user had a downvote:
  - Delete the downvote record
  - Increment comment's vote_score by 1
  - Increment author's karma_score by 1
- If user had no previous vote:
  - Return HTTP 400 Bad Request with message: "You haven't voted on this comment yet"
- Record all actions in audit log
- Return HTTP 200 OK with updated score
- Return the current score, which will be the score before the vote was removed

### Comment Sorting

WHEN "Best" sorting is selected for comments, THE system SHALL:
- Sort comments in descending order of vote_score
- Include all active comments (not deleted or archived)
- Display replies recursively below each top-level comment
- Use efficient querying with parent_id index

WHEN "New" sorting is selected for comments, THE system SHALL:
- Sort comments in descending order of created_at (newest first)
- Include all active comments
- Display replies recursively below each top-level comment
- Use efficient querying with index on created_at and parent_id

WHEN "Controversial" sorting is selected for comments, THE system SHALL:
- Calculate controversy score for each comment:
  `controversy_score = min(upvotes, downvotes) / max(1, ABS(vote_score))`
- Sort in descending order of controversy_score
- Include only comments with ≥ 5 total votes
- Do not include comments with only upvotes or only downvotes
- Display replies recursively

### Comment Voting Display

WHEN a comment's vote score is displayed, THE system SHALL:
- Show as integer: 0, 5, -3, 17, etc.
- For scores ≥ 1000, display with K suffix (1.2K)
- For scores ≥ 1,000,000, display with M suffix (2.5M)
- Use consistent formatting across all views
- Hide exact vote breakdown (upvotes/downvotes) from users
- Show only aggregate score

WHEN a user hovers over a comment's vote count, THE system SHALL:
- Show tooltip: "{upvotes} upvotes, {downvotes} downvotes"
- Only show to authenticated users
- Not expose this information to guests

WHEN a user interacts with comment vote buttons, THE system SHALL:
- Instantly update display to new score (UI optimistic update)
- Send API request to server
- Roll back if server returns error
- Indicate loading state during operation

WHEN the server detects suspicious voting patterns (multiple votes per second from same user), THE system SHALL:
- Temporarily lock voting for that user on all comments
- Notify system administrators
- Require CAPTCHA verification for future votes
- Allow the user to appeal

## Community Moderation System

### Moderator Roles and Permissions

#### Owner Authority

WHEN a community is created, THE system SHALL:
- Assign the creator as the "Owner" with full administrative permissions
- Allow Owner to add moderators
- Allow Owner to remove moderators
- Allow Owner to add other users to owner role
- Prevent any moderator from removing Owner

WHEN an Owner removes themselves as owner, THE system SHALL:
- Transfer ownership to someone else
- Allow transfer only to an existing moderator
- Require confirmation
- Create audit trail of ownership transfer
- Log the change

#### Moderator Authority

WHEN an existing moderator adds another user as moderator, THE system SHALL:
- Verify the user is subscribed to the community
- Verify the user is not already a moderator or owner
- Verify the person making the request has moderator privileges
- Add the user as a moderator
- Record the action in audit log
- Send notification to the new moderator
- Return HTTP 200 OK

WHEN a moderator attempts to remove another moderator, THE system SHALL:
- Return HTTP 403 Forbidden with message: "Only the community owner can remove moderators"
- Not perform any action
- Log the attempted unauthorized action

WHEN a moderator attempts to remove the community owner, THE system SHALL:
- Return HTTP 403 Forbidden with message: "Only the community owner can remove themselves"
- Not perform any action
- Log the attempted unauthorized action
- Notify the owner of the attempted removal

WHEN an Owner is removed from the platform (account deleted), THE system SHALL:
- Transfer ownership to the first moderator in the list
- Notify the new owner of the transfer
- If no moderators remain, make the community ownerless
- Archive the community if it has content
- Log the transfer event

### Moderator Actions

#### Deleting Content

WHEN a moderator deletes a post, THE system SHALL:
- Verify the moderator has community-level permissions
- Set post status to "deleted"
- Mark is_deleted: true
- Record moderator_id, deletion_time, and reason
- Decrement community's post_count
- Notify the post author (if not banned)

WHEN a moderator deletes a comment, THE system SHALL:
- Verify the moderator has community-level permissions
- Set comment status to "deleted"
- Mark is_deleted: true
- Record moderator_id, deletion_time, and reason
- Decrement parent comment's reply_count (if applicable)
- Decrement post's comment_count
- Notify the comment author (if not banned)

WHEN a moderator deletes multiple comments in bulk, THE system SHALL:
- Support selection of multiple comment IDs
- Process each deletion in atomic transactions
- Return successful/deleted/failed counts
- Allow undo within 5 minutes

#### Banning Users

WHEN a moderator ban a user from a community, THE system SHALL:
- Verify moderator has appropriate permissions
- Check if user is already banned
- Create a ban record with:
  - user_id
  - community_id
  - moderator_id
  - ban_date (timestamp)
  - ban_reason (required text)
  - expiration_date (null for permanent, date for temporary)
- Add user to "banned_users" index for the community
- Remove user from subscribers if subscribed
- Clear all pending reports associated with this user
- Return HTTP 200 OK
- Send notification: "You have been banned from {community_name} by {moderator_name}. Reason: {reason}"
- Display "[Banned from this community]" on the user's profile when viewed in that community

WHEN a moderator unbans a user from a community, THE system SHALL:
- Delete the ban record
- Remove user from "banned_users" index
- Return HTTP 200 OK
- Send notification: "You have been unbanned from {community_name}"
- Allow the user to subscribe to the community again

WHEN a banned user attempts to create a post or comment in the banned community, THE system SHALL:
- Return HTTP 403 Forbidden with message: "You have been banned from {community_name}"
- Not create any content
- Log the violation
- Increase ban duration if repeated offenses occur

WHEN a user's account is deleted, THE system SHALL:
- Automatically remove all bans associated with that user
- Clear all ban records
- Notify moderators of the deletion for audit purposes

#### Viewing Banned Users

WHEN a moderator views the list of banned users in their community, THE system SHALL:
- Show user_id, username, ban_date, ban_reason, moderator_id, expiration_date
- Show whether ban is permanent or temporary
- Allow sorting by ban_date, username, or moderator
- Support pagination
- Allow export as CSV
- Show last active date before ban

### Report Management System

#### Reporting Content

WHEN a user reports a post, THE system SHALL:
- Require the user to be authenticated
- Select a report category from pre-defined list:
  - "Spam"
  - "Harassment"
  - "Illegal content"
  - "Impersonation"
  - "Other"
- If "Other" is selected, require a detailed reason (10-500 characters)
- Include a link to the reported post
- Create a report record with:
  - reporter_id
  - target_id (post_id)
  - target_type: "post"
  - category
  - reason
  - created_at
  - status: "pending"
- Increment report counter for the post
- Return HTTP 201 Created
- Notify moderators of the community

WHEN a user reports a comment, THE system SHALL:
- Require the user to be authenticated
- Select a report category from pre-defined list:
  - "Spam"
  - "Harassment"
  - "Illegal content"
  - "Impersonation"
  - "Other"
- If "Other" is selected, require a detailed reason (10-500 characters)
- Include a link to the reported comment
- Create a report record with:
  - reporter_id
  - target_id (comment_id)
  - target_type: "comment"
  - category
  - reason
  - created_at
  - status: "pending"
- Increment report counter for the comment
- Return HTTP 201 Created
- Notify moderators of the community

WHEN a user reports a post or comment without being logged in, THE system SHALL:
- Return HTTP 401 Unauthorized
- Prompt for login
- Show message: "You must be logged in to report content"

WHEN a user attempts to report the same content repeatedly within 1 hour, THE system SHALL:
- Return HTTP 429 Too Many Requests
- Display message: "You've already reported this content. Please wait before reporting again."
- Increase cooldown based on number of repeated reports
- Record the attempted abuse

#### Reviewing Reports

WHEN a moderator views reports for a community, THE system SHALL:
- Show list of all pending reports in descending order of creation time
- For each report:
  - Show the type (post/comment)
  - Show the reported content with preview
  - Show the reporter's username
  - Show the category
  - Show the reason
  - Show timestamp of report
  - Show any previous actions
- Allow filtering by category or status
- Allow bulk actions

WHEN a moderator approves a report, THE system SHALL:
- Verify moderator has appropriate permissions for the community
- Change report status to "approved"
- Delete the reported content (post or comment)
- Create a deletion audit log with moderator_id and "report approved" reason
- Notify the original author if not banned: "Your {post/comment} has been removed due to a report. Reason: {reason}"
- If the report is for a comment, decrement the associated post's comment count
- If the report is for a post, decrement the associated community's post count
- Record the approval in audit log
- Return HTTP 200 OK
- Mark the report as resolved

WHEN a moderator dismisses a report, THE system SHALL:
- Verify moderator has appropriate permissions for the community
- Change report status to "dismissed"
- Keep the content unchanged
- Record dismissal with moderator_id and reason
- Notify the reporter: "Your report has been dismissed"
- Record in audit log
- Return HTTP 200 OK
- Mark the report as resolved

WHEN a report is approved or dismissed, THE system SHALL:
- Update the total report count for the post or comment
- Hide the report from active report lists
- Keep in history for audit
- Never allow a report to be reopened after resolution
- Prevent automated report cycling

#### Report Integrity Rules

WHEN multiple reports are received on the same content, THE system SHALL:
- Aggregate the reports
- Show total count
- Allow moderator to review all reasons
- Approve or dismiss for all reports at once
- Not require individual approval for each report

WHEN a moderator approves a report that has other similar reports, THE system SHALL:
- Delete the content and mark ALL similar reports as "approved" automatically
- Record all moderators who reported the content
- Notify all reporters that their report was approved

WHEN a moderator abuses the report system by dismissing valid reports, THE system SHALL:
- Flag the moderator's account for review by platform admins
- Restrict moderator's reporting abilities temporarily
- Notify the community owner
- Log all dismissed reports for audit
- Prevent dismissal without reason

WHEN a report is associated with a banned user, THE system SHALL:
- Show "[Banned user reported]" in the report details
- Treat the report as higher priority
- Not automatically approve reports from banned users
- Require moderator judgment

WHEN the system receives a high volume of reports on a single piece of content (>50 reports in 24 hours), THE system SHALL:
- Automatically trigger a high-priority review by platform admins
- Temporarily hide the content from public view
- Notify all moderators and community owner
- Suspend voting on the content until reviewed
- Log the event for compliance review

### Moderation Transparency

WHEN a moderator action is performed, THE system SHALL:
- Record all actions in the moderation audit log
- Show moderator_id, action, target_id, reason, timestamp
- Allow public access to redacted moderation logs (without personal information)
- Show "Moderation activity" section on community page
- Allow community owners to view full audit logs
- Allow users in the community to see that a moderator took action (but not who)

WHEN a user views their own moderation history, THE system SHALL:
- Show actions taken against their content (if any)
- Show reasons and moderators
- Allow appeal process

WHEN a user views moderation logs for a community, THE system SHALL:
- Show summary of total actions over time
- Show type of actions (deletions, bans, etc.)
- Show trend data
- Prevent viewing of personal information

## Performance and Security Requirements

### Response Time Targets

- User authentication and login: ≤ 300ms
- Post creation: ≤ 500ms
- Comment creation: ≤ 400ms
- Feed loading (30 items): ≤ 1 second
- User profile loading: ≤ 600ms
- Comment thread loading (100 comments): ≤ 800ms
- Moderator actions: ≤ 600ms
- Any API endpoint: Never exceed 5 seconds

### Database Design Constraints

- Use PostgreSQL with proper indexing
- Implement connection pooling
- Use read replicas for read-heavy operations (feeds)
- Use caching for frequently accessed data (Redis)
- Avoid N+1 queries with eager loading
- Use database-level constraints for data integrity
- Store all audit logs in separate table for performance

### API Design Standards

- All endpoints use JSON responses
- Use standard HTTP status codes
- Return error objects in consistent format
- Use pagination with cursor-based navigation
- Implement rate limiting: 60 requests/minute per user
- Secure endpoints with JWT authentication
- Use HTTPS everywhere
- Set strict CORS policies
- Validate all inputs on server
- Never trust client-side data

### Security Requirements

- Use bcrypt for password hashing with cost factor 12
- Use 256-bit JWT signing keys
- Validate all file uploads on server
- Sanitize all user input (HTML, JavaScript, CSS)
- Prevent XSS and CSRF attacks
- Implement rate limiting on all authentication endpoints
- Log all security events (failed logins, suspicious voting)
- Use secure cookies (HTTP-only, Secure, SameSite=Strict)
- Implement IP blocking for repeated malicious requests
- Use secure random number generation
- Apply principles of least privilege

### Scalability Requirements

- Support 100,000 concurrent users
- Handle 500 posts per minute
- Handle 2,000 comments per minute
- Scale database and services horizontally
- Use content delivery network for media serving
- Implement auto-scaling for web servers
- Use message queues for background processing

### Backup and Disaster Recovery

- Daily database backups
- Hourly audit log exports
- Multi-region data replication
- Automated failover system
- 99.9% uptime SLA target
- Disaster recovery plan tested quarterly

## Success Criteria

The Reddit-like Community Platform is successful when:

- All user requirements are fully implemented as described
- All business logic is implemented in EARS format
- All workflows are documented and implementable
- All error scenarios are handled gracefully
- All performance targets are met
- The system scales to 100,000 concurrent users
- All security requirements are met
- The codebase is type-safe and passes TypeScript compiler without errors
- All API endpoints are documented and tested
- All data integrity rules are enforced at the database level
- The system is maintainable and extensible

**Note**: This is the canonical requirements document. No external documents override this specification. All development must follow these exact requirements.