## Viewing Posts

WHEN a guest visits the economicBoard homepage, THE system SHALL display the 20 most recent posts, ordered by creation date descending (newest first).

WHEN a member accesses the homepage, THE system SHALL display the 20 most recent posts, ordered by creation date descending, with published timestamp displayed next to each post.

WHEN an admin accesses the homepage, THE system SHALL display the 20 most recent posts, ordered by creation date descending, with an indicator flag showing which posts are currently pending moderation.

WHILE the user is viewing a list of posts, THE system SHALL include the following metadata for each post:
- Author name (displayed as "Anonymous" for guest posts and member posts)
- Post creation timestamp in ISO 8601 format (e.g., "2025-10-07T15:00:00Z")
- Topic category (e.g., "Inflation", "Tax Policy")
- Total reply count
- Moderation status ("Published", "Pending", "Rejected")

WHERE a topic filter is selected, THE system SHALL display only posts tagged with that topic, ordered chronologically descending.

WHEN a user clicks on a post title, THE system SHALL navigate to the post detail page showing the full content, author, timestamp, topic, and all associated replies.

## Creating Posts

WHEN a member submits a new post through the "New Topic" form, THE system SHALL require the following fields:
- Subject (text input, minimum 5 characters, maximum 120 characters)
- Content (text area, minimum 10 characters, maximum 5,000 characters)
- Topic selection (from predefined list of categories)

WHEN a member submits a new post, THE system SHALL immediately store the post in "Pending" status and return a success message: "Your post is under review and will be published after moderation."

WHEN a guest attempts to submit a new post, THE system SHALL deny the request and display: "Only registered members can create new topics. Please log in or register to participate."

WHILE a post is in "Pending" status, THE system SHALL NOT display it on public feeds or category views.

## Replying to Posts

WHEN a member clicks the "Reply" button on a published post, THE system SHALL open a text input field for user input.

WHEN a member submits a reply, THE system SHALL require:
- Content (minimum 5 characters, maximum 1,000 characters)
- Anonymous submission (no username required)

WHEN a member submits a reply to a post, THE system SHALL:
- Assign the reply to the original post by its unique identifier
- Set the reply timestamp to the current UTC time
- Mark the reply as "Published" immediately (no moderation required for replies)
- Increment the reply counter on the parent post

WHEN a guest attempts to reply to a post, THE system SHALL deny the request and display: "Only registered members can reply to posts. Please log in or register to participate."

## Editing Posts

WHILE a member's post is in "Published" status and less than 24 hours old, THE system SHALL allow the member to edit their own post.

WHEN a member edits their own post, THE system SHALL:
- Allow modification of subject and content (within original character limits)
- Preserve the original creation timestamp
- Set an "Edited" flag with the time of the last edit
- Maintain the post's moderation status ('Published')

WHEN a member attempts to edit a post older than 24 hours, THE system SHALL deny the edit and display: "You can only edit your posts within 24 hours of creation."

WHEN a member attempts to edit another user's post, THE system SHALL deny the request and display: "You can only edit your own posts."

## Deleting Posts

WHEN an admin deletes a post, THE system SHALL:
- Mark the post as "Deleted" in the database
- Remove the post from all public views and search results
- Not allow recovery
- Log the admin who performed the deletion and the deletion timestamp
- Display confirmation: "Post has been permanently deleted."

WHEN a member attempts to delete their own post, THE system SHALL deny the request and display: "Only administrators can delete posts."

WHEN a guest attempts to delete a post, THE system SHALL deny the request and display: "You cannot delete posts."

## Topic Filtering

WHEN a user clicks on a topic label (e.g., "Inflation") in the topic sidebar, THE system SHALL filter all post lists to display only posts with that topic.

WHEN a user selects "All Topics", THE system SHALL display all published posts regardless of topic.

THE system SHALL maintain a predefined list of 15 topic categories including:
"Inflation", "Tax Policy", "Elections", "Monetary Policy", "Global Trade", "Unemployment", "Wage Growth", "Government Debt", "Fiscal Stimulus", "Central Banking", "Economic Recession", "Market Regulation", "Consumer Spending", "Financial Markets", "Housing Market"

WHEN a user selects a topic filter, THE system SHALL preserve the selection during navigation until explicitly changed or cleared.

## Post Moderation

WHEN a post is submitted by a member, THE system SHALL place it in a "Pending Review" queue accessible only to admins.

WHILE a post is in "Pending Review" status, THE system SHALL NOT show it to guests or members.

WHEN an admin reviews a post in the moderation queue, THE system SHALL allow administrators to:
- Approve the post, changing its status to "Published"
- Reject the post, changing its status to "Rejected" and removing it from public view
- Delete the post permanently

WHEN an admin approves a post, THE system SHALL:
- Move the post to all public topic feeds
- Send a system notification to the original author: "Your post has been published."

WHEN an admin rejects a post, THE system SHALL:
- Remove the post from public view
- Send a system notification to the author: "Your post was rejected. Reason: [admin-entered reason]."

WHEN an admin deletes a post, THE system SHALL have the same effect as described in the "Deleting Posts" section.

## User Authentication

WHEN a new user visits the site for the first time, THE system SHALL treat them as a "guest" with no authentication state.

WHEN a member creates their first post, THE system SHALL automatically generate an anonymous account with a unique internal user ID and store the user's session in a secure JWT token.

THE system SHALL NOT require email signup, password creation, or profile setup.

WHEN a user navigates away from the site, THE system SHALL preserve their authentication state for up to 30 days using an expires-in refresh token.

WHEN a user has not interacted with the system for more than 30 days, THE system SHALL expire their session and revert them to "guest" status.

WHEN a user logs out, THE system SHALL delete the authentication token and switch them to "guest" status.

## Search Functionality

WHEN a user enters a search term in the global search bar, THE system SHALL return results that match the query in subject or content fields.

WHEN a user performs a search, THE system SHALL return results in order of relevance (text match quality) and then by post creation date (newest first).

WHEN search results are returned, THE system SHALL display results as preview cards showing:
- Post title
- First 100 characters of content
- Topic category
- Creation timestamp
- Author label (Anonymous)

WHILE a search is being processed, THE system SHALL indicate loading state with a spinner; results SHALL appear within 2 seconds.

## System Feedback

WHEN a user performs an action successfully, THE system SHALL render a temporary success message (e.g., "Post submitted!") in the top-right corner, which disappears after 5 seconds.

WHEN a user performs an action that is denied, THE system SHALL display a clear, user-friendly error message in red text below the input field.

WHEN a user encounters an unexpected system error (e.g., server timeout, database failure), THE system SHALL display: "We're sorry, something went wrong. Please try again later."

WHEN a post is approved, rejected, or deleted by an admin, THE system SHALL notify the post's author via in-system message accessible through their profile.

WHILE a post remains in "Pending" status, THE system SHALL show the author: "Your post is pending moderator review. You will receive a notification when it's approved or rejected."

WHEN a user's session expires due to inactivity, THE system SHALL redirect them to the homepage and display: "Your session has expired. Please continue browsing as a guest or create a new post to log back in."