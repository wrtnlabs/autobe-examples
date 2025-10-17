# User Interactions and Features

## 1. User Follow System

### 1.1 Overview
The user follow system enables members to build social connections by following other users. This creates a social graph that supports personalized content discovery, activity tracking, and community building within the platform.

### 1.2 Follow Relationship Mechanics

#### Who Can Follow
WHEN a member attempts to follow another user, THE system SHALL verify the following user account exists and is not the same as the member attempting to follow.

THE system SHALL allow members to follow any other member on the platform (following is unidirectional and does not require mutual agreement).

THE system SHALL allow guests to view follower counts but prevent guests from following users.

#### Follow Limitations
WHEN a member follows another user, THE system SHALL record the follow relationship and update both users' follower/following counts.

THE system SHALL prevent a member from following the same user twice; IF a follow relationship already exists, THE system SHALL reject the follow attempt and return HTTP 409 Conflict with error code `FOLLOW_DUPLICATE`.

WHERE a member's account is suspended or deactivated, THE system SHALL not allow new follows from other members to this account, but existing follows SHALL remain in the database with a "inactive_user" status.

THE system SHALL enforce maximum 10,000 follows per user to prevent abuse of social graph.

#### Unfollow Functionality
WHEN a member initiates an unfollow action on a previously followed user, THE system SHALL remove the follow relationship immediately.

THE system SHALL allow members to unfollow users without any confirmation or cooldown period.

THE system SHALL update follower/following counts immediately upon unfollow with atomic database operation.

THE system SHALL remove any cached relationship data immediately upon unfollow.

### 1.3 Follow Relationship State Management

#### Follow State Tracking
THE system SHALL maintain follow relationships with the following data fields:
- `follow_id`: UUID (unique identifier)
- `follower_id`: UUID (user who follows)
- `following_id`: UUID (user being followed)
- `created_at`: Timestamp (when follow occurred, UTC timezone)
- `relationship_status`: Enum (active, blocked, inactive)

#### Active Follow Status
A follow relationship is "active" when the follower user is not blocked by the following user and both accounts are in good standing.

#### Blocked Follow Status
WHERE a following user blocks the follower user, THE system SHALL change relationship_status to "blocked".

BLOCKED followers cannot view the user's profile or activity.

BLOCKED followers' existing follows remain in database with blocked status but are functionally inactive.

#### Inactive Follow Status
WHERE a following user's account is suspended or deleted, THE system SHALL mark relationship as "inactive".

INACTIVE follows do not appear in follower lists but remain in database for analytics purposes.

#### Following List Management
WHEN a member views their following list, THE system SHALL display all active follow relationships.

THE system SHALL display following list sorted by most recent follows first (newest follows at the top).

THE system SHALL enforce maximum 50 results per page with cursor-based pagination.

WHEN a member has a private profile, THE system SHALL hide their following list from users not following them.

#### Follower List Management
WHEN a member views their follower list, THE system SHALL display all active followers.

THE system SHALL display followers sorted by most recent follows first.

THE system SHALL enforce maximum 50 results per page with cursor-based pagination.

WHEN a member has a private profile, THE system SHALL hide their follower list from non-followers.

#### Follow Suggestions
WHEN a member views the "follow suggestions" or "discover users" feature, THE system SHALL recommend users based on:
- Users followed by people they follow (second-degree connections)
- Users who share similar interests based on community subscriptions (communities in common)
- Highly active users in communities the member frequents (top posters by karma)
- Users with high karma and recent activity (reputation-based recommendations)
- Users in trending communities the member shows interest in

THE system SHALL limit follow suggestions to maximum 20 recommendations per page.

THE system SHALL refresh recommendations daily based on updated activity.

THE system SHALL allow members to dismiss suggestions to reduce similar recommendations for 30 days.

THE system SHALL exclude already-followed users from suggestions.

THE system SHALL exclude the member themselves from suggestions.

THE system SHALL exclude blocked or suspended users from suggestions.

### 1.4 Follow System Performance and Caching

#### Follow Count Caching
THE system SHALL cache follower and following counts on user profiles with 1-hour time-to-live (TTL).

WHEN a follow or unfollow occurs, THE system SHALL invalidate the affected user's cache immediately.

THE system SHALL calculate counts from source-of-truth follow records during cache misses.

THE system SHALL verify cache accuracy weekly by reconciling with database.

#### Follow Relationship Queries
WHEN checking if user A follows user B, THE system SHALL use database index on (follower_id, following_id).

QUERY PERFORMANCE: Must return within 100 milliseconds even with 1 million follow relationships.

#### Bulk Follow Operations
WHEN displaying a feed with 30 posts from 15 different authors, THE system SHALL execute single query to check follow status for all authors.

THE system SHALL batch follow relationship checks to minimize database hits.

---

## 2. Notification System

### 2.1 Notification System Overview
The notification system keeps members informed about platform activity relevant to them, including replies to their content, mentions, follows, and moderator actions. Notifications drive engagement and encourage return visits to the platform.

### 2.2 Notification Types and Triggers

#### 2.2.1 Reply Notifications
WHEN a member creates a comment on a post, THE system SHALL send a reply notification to the post author if the commenting member is not the post author.

WHEN a member creates a nested reply to another member's comment, THE system SHALL send a reply notification to the parent comment author if the replying member is not the comment author.

THE notification message SHALL indicate the replying member's username and show a preview of the reply content (first 100 characters).

WHEN a member is notified about a reply, THE notification SHALL include a direct link to the specific comment/reply for navigation.

THE system SHALL send reply notifications within 5 seconds of comment submission.

THE system SHALL NOT send duplicate notifications if multiple replies occur to same content (batch into single notification).

#### 2.2.2 Mention Notifications
WHEN a member is mentioned using the @ symbol (e.g., @username) in a comment or post, THE system SHALL send a mention notification to the mentioned member.

WHEN a mention is detected, THE system SHALL verify the mentioned username exists in the platform before sending the notification.

THE mention notification SHALL indicate which member mentioned them and show a preview of the content where the mention appeared (first 100 characters).

WHERE a member is mentioned multiple times in a single comment, THE system SHALL send only one notification for that comment.

WHERE a member is mentioned in a post they own, THE system SHALL not send a notification.

MENTION NOTIFICATIONS SHALL be sent within 3 seconds of content creation.

#### 2.2.3 Follow Notifications
WHEN a member follows another member, THE system SHALL check if the followed member has notifications enabled for follow events.

IF follow notifications are enabled, THE system SHALL send a follow notification to the followed member indicating who followed them.

THE follow notification SHALL include a link to the follower's profile.

FOLLOW NOTIFICATIONS SHALL be sent within 2 seconds of the follow action.

#### 2.2.4 Moderator Action Notifications
WHEN a post or comment is removed by a moderator, THE system SHALL send a notification to the content author explaining the removal reason and which community rule was violated.

THE notification message FORMAT: "[Content Type] removed: [Rule Violated]. Reason: [Moderator Note]. Appeal: [Link]"

WHEN a member's content is flagged for review or warned by a moderator, THE system SHALL send a notification with details about the violation.

WHEN a member receives a temporary ban or suspension, THE system SHALL send a notification explaining the reason, duration, and appeal process.

MODERATOR NOTIFICATIONS SHALL be sent immediately (within 1 second) upon action.

#### 2.2.5 Upvote Milestone Notifications
WHEN a member's post or comment reaches 10, 100, 1,000, or 10,000 upvotes, THE system MAY send an achievement notification (optional feature).

THE system SHALL send each milestone notification only once per piece of content.

THE notification message FORMAT: "🎉 Your [content type] reached [number] upvotes!"

#### 2.2.6 Community Subscription Notifications
WHEN a new post is created in a community that a member has subscribed to, THE system SHALL NOT automatically send notifications (posts are discovered through feeds instead).

WHERE a member enables "New Post Notifications" for a specific community, THE system SHALL send notifications for new posts in that community.

THE system SHALL batch new post notifications (max 1 notification per hour per community) to avoid notification spam.

THE system SHALL allow member to select minimum post score threshold for notifications (e.g., only notify for posts with 10+ upvotes).

### 2.3 Notification Preferences and Management

#### Notification Settings
WHERE a member accesses their notification settings, THE system SHALL display toggle options for each notification type:
- Reply notifications (default: enabled)
- Mention notifications (default: enabled)
- Follow notifications (default: disabled)
- Moderator action notifications (default: enabled)
- Community new post notifications (default: disabled)
- Upvote milestone notifications (default: disabled)

THE system SHALL allow members to enable or disable each notification type individually.

WHERE a member disables a notification type, THE system SHALL stop generating notifications of that type going forward, but existing notifications SHALL remain in their notification history.

THE system SHALL allow per-community notification settings (enable/disable notifications for specific communities).

THE system SHALL allow quiet hours setting (no notifications between specified times).

#### Notification Delivery Methods
THE system SHALL support notification delivery through:
- In-app notifications (primary method, always available)
- Email notifications (optional, if email service is implemented, disabled by default)
- Web push notifications (optional, if browser push is implemented, disabled by default)

WHEN a member receives a notification, THE system SHALL mark the notification as "unread" initially.

WHEN a member has multiple delivery methods enabled, THE system SHALL send notification through all enabled channels.

THE system SHALL respect quiet hours in all delivery methods.

#### Notification Display and Management

WHEN a member views their notification center, THE system SHALL display notifications in reverse chronological order (newest first).

THE system SHALL display maximum 50 notifications per page with cursor-based pagination.

WHERE a member clicks on a notification, THE system SHALL mark it as "read" and navigate to the relevant content (post, comment, or profile).

WHEN a member marks a notification as read, THE system SHALL update the unread count immediately and reflect in UI.

THE system SHALL allow members to delete individual notifications or clear all notifications at once.

WHEN a notification is deleted, THE system SHALL remove it from the notification list but keep a record in notification history for 90 days.

THE system SHALL display unread notification count in header/navigation with badge (e.g., "5").

THE system SHALL show visual distinction between read and unread notifications.

#### Notification Display Format

EACH NOTIFICATION SHALL display:
- Notification type icon (reply, mention, follow, moderator action, milestone)
- Trigger user's avatar and username
- Content preview or action description
- Relative timestamp ("2 hours ago")
- Action button where applicable (Go to content, View profile)
- Dismissal option (X button)

#### Notification Data Structure
Each notification SHALL include:
- `notification_id`: UUID (unique identifier)
- `recipient_id`: UUID (member receiving notification)
- `notification_type`: Enum (reply, mention, follow, moderator_action, milestone, community_post)
- `trigger_user_id`: UUID (who caused the notification, nullable for system notifications)
- `related_content_id`: UUID (post ID, comment ID, or profile ID)
- `related_content_type`: Enum (post, comment, user)
- `notification_message`: String (display text, max 200 characters)
- `notification_data`: JSON object (additional context like rule violated, ban duration)
- `created_at`: Timestamp (when notification was created, UTC)
- `read_status`: Boolean (read/unread, default false)
- `delivery_status`: Enum (pending, delivered, failed)
- `deleted_at`: Timestamp (when user deleted notification, nullable)

### 2.4 Notification Batch Processing

WHEN multiple notifications of same type are generated for same user within 5 minutes, THE system MAY batch them into single notification.

BATCH NOTIFICATION FORMAT: "You received 3 new replies to your post"

THE system SHALL still preserve individual notifications in history for detailed view.

THE system SHALL prioritize critical notifications (moderator actions, important mentions) and never batch those.

### 2.5 Notification Performance and Delivery

THE system SHALL deliver notifications within following time windows:
- Reply notifications: within 5 seconds
- Mention notifications: within 3 seconds
- Follow notifications: within 2 seconds
- Moderator action notifications: within 1 second
- Email notifications: within 5 minutes
- Web push notifications: within 30 seconds

THE system SHALL use message queue (e.g., RabbitMQ, Kafka) for asynchronous notification processing.

THE system SHALL implement retry logic for failed notifications (max 3 retries with exponential backoff).

THE system SHALL maintain notification delivery logs for audit trail and debugging.

---

## 3. Mention System

### 3.1 Mention Detection and Processing

#### Mention Syntax
THE mention system SHALL recognize @-mentions in the format: @ followed by a valid username (alphanumeric characters, underscores, hyphens).

THE system SHALL detect mentions in post titles, post content, comment text, and reply text.

MENTION PATTERN: `@[a-zA-Z0-9_-]{3,32}` (matches @ followed by 3-32 character valid username)

THE system SHALL support mentions only in English-language content (@ symbol).

WHEN a member types @username, THE system SHALL provide autocomplete suggestions showing matching usernames (maximum 10 suggestions).

THE autocomplete suggestions SHALL display as dropdown below mention input field.

THE system SHALL highlight matching portion of username in suggestions.

#### Mention Validation and Deduplication
WHEN a mention is entered in content (posts or comments), THE system SHALL validate that the mentioned username exists in the system.

IF a mentioned username does not exist, THE system SHALL treat it as plain text (not a mention) and display it as regular text without special formatting or notification.

WHERE a member mentions the same user multiple times in single content item, THE system SHALL only send notification once (deduplication).

WHERE a member mentions themselves using @[their_username], THE system SHALL NOT send a self-mention notification.

WHEN a user changes their username, THE system SHALL update mentions in all content to reference new username.

### 3.2 Mention Display and Formatting

WHEN a post or comment containing mentions is displayed, THE system SHALL format mentions as clickable links to the mentioned user's profile.

THE system SHALL display mentions in a distinct visual style (e.g., different color, bold, or highlighted background) to differentiate them from regular text.

THE link TARGET: `/users/[username]` (user profile page)

WHEN a reader clicks on a mention link, THE system SHALL navigate to the mentioned user's profile.

THE mention link SHALL have hover tooltip showing user's karma and reputation level.

WHEN a mentioned user has deleted their account, THE system SHALL display mention as "[deleted user]" without link.

### 3.3 Mention Notification Details
THE mention notification SHALL include:
- The mention text in context (showing surrounding text for clarity, max 100 characters)
- The community and post where mention occurred
- A direct link to the mentioned content
- The mentioning user's username and avatar

MENTION NOTIFICATION PRIORITY: High (shown before other non-critical notifications)

WHEN a member receives a mention notification, THE system SHALL display it in their notification center with visual distinction from other notification types.

MENTION EMAIL NOTIFICATION: "You were mentioned by [username] in [community]: [preview]"

### 3.4 Mention Recording and Tracking

THE system SHALL record all mentions for analytics and user tracking:
- `mention_id`: UUID
- `mentioned_user_id`: UUID
- `content_id`: UUID (post or comment ID)
- `content_type`: Enum (post, comment)
- `mentioning_user_id`: UUID
- `created_at`: Timestamp
- `notification_sent`: Boolean

THE system SHALL track mention frequency per user for abuse detection.

IF user is mentioned more than 50 times per day from different users, THE system SHALL flag for potential harassment and notify user.

---

## 4. Direct Messaging System

### 4.1 Direct Messaging Overview
The direct messaging system allows members to communicate privately with other members through threaded conversations. Direct messages are separate from comments and notifications, providing private communication channels.

### 4.2 Direct Message Creation and Management

#### Starting a Conversation
WHEN a member initiates a direct message to another member, THE system SHALL create a new conversation thread.

THE system SHALL prevent guests from sending direct messages.

WHEN a member sends their first message to another member, THE system SHALL verify the recipient account exists and is not suspended.

IF recipient account does not exist, THE system SHALL return HTTP 404 Not Found with error code `USER_NOT_FOUND`.

IF recipient has blocked the sender, THE system SHALL return HTTP 403 Forbidden with error code `USER_BLOCKED`.

THE system SHALL allow single conversation per user pair (if conversation exists, new message goes to existing conversation).

THE system SHALL create conversation record with:
- `conversation_id`: UUID
- `participant_1_id`: UUID (older account by ID)
- `participant_2_id`: UUID (newer account by ID)
- `created_at`: Timestamp
- `last_message_at`: Timestamp
- `is_archived_by_1`: Boolean (default false)
- `is_archived_by_2`: Boolean (default false)

#### Message Sending and Receiving
WHEN a member sends a direct message, THE system SHALL store the message with timestamp and mark it as "unread" in the recipient's inbox.

THE system SHALL deliver the message immediately (within 2 seconds).

THE system SHALL notify the recipient that they have a new direct message (if message notifications are enabled).

WHEN a member receives a direct message, THE system SHALL display the message in their direct message inbox.

THE system SHALL allow the recipient to reply to the message, continuing the conversation thread.

THE system SHALL create message record with:
- `message_id`: UUID
- `conversation_id`: UUID
- `sender_id`: UUID
- `recipient_id`: UUID
- `message_body`: String (max 5000 characters)
- `created_at`: Timestamp
- `edited_at`: Timestamp (nullable)
- `read_at`: Timestamp (nullable)
- `deleted_by_sender`: Boolean
- `deleted_by_recipient`: Boolean

#### Message Editing and Deletion
WHEN a member attempts to edit a direct message, THE system SHALL allow editing only if the message was sent within the last 1 hour (edit window).

IF message is older than 1 hour, THE system SHALL return HTTP 403 Forbidden with error code `MESSAGE_EDIT_WINDOW_EXPIRED`.

WHEN a message is edited, THE system SHALL display an "edited" indicator showing the edit timestamp.

THE system SHALL allow unlimited edits within the 1-hour window.

WHEN a member deletes a direct message, THE system SHALL remove it from their view but keep it in the recipient's inbox (one-way deletion).

THE system SHALL set `deleted_by_sender` flag to true, hiding message for sender.

THE system SHALL preserve message content for recipient unless recipient also deletes it.

WHERE a member deletes an entire conversation, THE system SHALL only remove it from their conversation list, but messages SHALL remain visible to the other participant unless they also delete.

WHEN both members delete conversation, THE system SHALL archive it (keep record but hide from UI).

### 4.3 Direct Message Conversation Management

#### Conversation Display
WHEN a member views their direct messages, THE system SHALL display conversations in reverse chronological order (most recent activity first).

THE system SHALL show:
- Other member's username and avatar
- Preview of the last message in conversation (first 50 characters)
- Timestamp of last message (relative: "2 hours ago")
- Unread status (if unread messages exist in conversation, show unread count)

THE system SHALL display maximum 20 conversations per page with pagination.

THE system SHALL support searching conversations by username or message content.

WHEN a member opens a conversation thread, THE system SHALL display all messages in the thread in chronological order (oldest first).

THE system SHALL load maximum 50 messages per page with pagination (older messages load on scroll up).

THE system SHALL mark all unread messages in the thread as "read" when the conversation is opened.

THE system SHALL display message timestamps and "edited" indicators.

#### Message Threading and Conversation State
THE system SHALL maintain all messages between two members in a single threaded conversation.

WHEN a member sends a message, THE system SHALL automatically associate it with the existing conversation thread with that member.

WHERE multiple conversations exist with the same member (edge case), THE system SHALL consolidate them into a single thread upon message send.

THE system SHALL update `last_message_at` timestamp on conversation whenever new message arrives.

THE system SHALL track conversation state (active, archived, muted) for each participant independently.

#### Conversation Archiving and Muting
WHEN a member archives a conversation, THE system SHALL hide it from main conversation list.

THE archived conversation SHALL remain in a separate "archived" view.

WHEN a new message arrives in archived conversation, THE system SHALL NOT automatically unarchive it.

THE user can manually restore archived conversations.

WHEN a member mutes a conversation, THE system SHALL disable notifications for that conversation.

THE muted conversation remains visible but shows "muted" indicator.

### 4.4 Direct Message Blocking

#### User Blocking
WHERE a member blocks another member, THE system SHALL prevent the blocked member from sending direct messages to the blocker.

WHEN a blocked member attempts to send a message to a blocker, THE system SHALL reject the message and return HTTP 403 Forbidden with error code `USER_BLOCKED`.

THE system SHALL show message: "You cannot send messages to this user."

WHERE a member is blocked, THE system SHALL remove existing direct message threads from the blocked member's view (but keep them in blocker's history).

WHEN a member unblocks another member, THE system SHALL restore the ability to send direct messages but SHALL NOT restore deleted conversations.

THE system SHALL send notification to unblocked member: "[User] has unblocked you. You can now message them."

### 4.5 Direct Message Data Structure
Each direct message SHALL include:
- `message_id`: UUID (unique identifier)
- `conversation_id`: UUID (thread identifier)
- `sender_id`: UUID (who sent the message)
- `recipient_id`: UUID (who received the message)
- `message_body`: String (max 5000 characters, plaintext)
- `created_at`: Timestamp (when message was sent, UTC)
- `edited_at`: Timestamp (when message was edited, nullable)
- `read_at`: Timestamp (when message was read, nullable)
- `read_status`: Boolean (has recipient read this message)
- `deleted_by_sender`: Boolean (sender deleted their copy)
- `deleted_by_recipient`: Boolean (recipient deleted their copy)
- `attachment_ids`: Array of UUID (if attachments supported)

### 4.6 Direct Message Privacy and Security

THE system SHALL NOT display direct messages in user profiles or public activity.

THE system SHALL encrypt direct messages at rest using AES-256 encryption.

THE system SHALL transmit messages over HTTPS/TLS only (no unencrypted transmission).

THE system SHALL NOT index or search direct message content for ads or analytics.

THE system SHALL delete all direct message content when user account is deleted (hard delete, not soft delete).

THE system SHALL implement rate limiting on direct messages: maximum 50 messages per hour per recipient to prevent spam.

---

## 5. User Recommendations

### 5.1 Recommendation Types

#### 5.1.1 User Recommendations Algorithm
WHEN a member accesses the "discover users" or "people to follow" section, THE system SHALL display personalized user recommendations.

THE system SHALL recommend users based on weighted algorithm:
1. Second-degree social connections (friends of friends): Weight 40%
   - Users followed by people they follow
   - More connections = higher ranking
2. Shared community subscriptions: Weight 30%
   - Users active in communities they subscribe to
   - Calculate overlap in community interests
3. Shared interests based on engagement patterns: Weight 20%
   - Users who upvote similar content as the member
   - Users who comment in similar discussion topics
4. High-karma users in relevant communities: Weight 10%
   - Top contributors in member's subscribed communities
   - Reputation-based recommendations for learning

RECOMMENDATION SCORE FORMULA:
```
recommendation_score = (second_degree_connections * 0.4) + 
                       (shared_communities * 0.3) + 
                       (shared_interests * 0.2) + 
                       (high_karma_users * 0.1)
```

THE system SHALL exclude already-followed users from recommendations.

THE system SHALL exclude the member themselves from recommendations.

THE system SHALL exclude blocked or suspended users from recommendations.

THE system SHALL exclude users who have disabled discovery (if privacy setting available).

#### 5.1.2 Community Recommendations Algorithm
WHEN a member accesses the "discover communities" feature, THE system SHALL display personalized community recommendations.

THE system SHALL recommend communities based on weighted algorithm:
1. Communities followed by people they follow: Weight 35%
2. Communities related to communities they're subscribed to: Weight 30%
3. Trending communities with growth momentum: Weight 20%
4. Communities matching activity patterns: Weight 15%

COMMUNITY RECOMMENDATION FORMULA:
```
community_score = (followed_by_follows * 0.35) + 
                  (related_communities * 0.3) + 
                  (trending_score * 0.2) + 
                  (pattern_match * 0.15)
```

THE system SHALL exclude already-subscribed communities from recommendations.

THE system SHALL display community recommendations with:
- Community icon/banner
- Community name
- Brief description (50-100 characters)
- Subscriber count
- Recent activity indicator (posts per day)
- Join button

### 5.2 Recommendation Display and Personalization

WHEN recommendations are generated, THE system SHALL display maximum 20 recommendations per page.

THE system SHALL support pagination to show more recommendations (load next 20 with "Load More" button).

THE system SHALL allow members to dismiss recommendations they're not interested in.

WHEN a recommendation is dismissed, THE system SHALL NOT show the same user/community recommendation for at least 30 days.

THE system SHALL track dismissals to improve recommendation algorithm.

THE system SHALL regenerate recommendations daily based on updated activity.

THE system SHALL cache recommendations for 6 hours with background refresh.

THE system SHALL show recommendation reasons to users: "Recommended because you follow [User]" or "Trending in [Category]".

---

## 6. Activity Feed and Timeline

### 6.1 Activity Feed Types

#### 6.1.1 Personal Activity Feed
WHEN a member views their "my activity" or "activity timeline" section, THE system SHALL display a chronological record of their own actions.

THE system SHALL display:
- Posts created (with link to post, community, date, upvote count)
- Comments posted (with link to comment, parent post, date, upvote count)
- Upvotes/downvotes given (optional, can be hidden for privacy - default hidden)
- Communities subscribed to (with subscription date)
- Users followed (with follow date)
- Moderation actions taken (if moderator, with reason and date)

THE system SHALL display activity items in reverse chronological order (newest first).

THE system SHALL limit activity display to actions from the last 1 year (archive older activity to separate storage).

THE system SHALL support filtering by activity type (posts only, comments only, all).

THE system SHALL display maximum 50 items per page with cursor-based pagination.

#### 6.1.2 User Profile Activity Timeline
WHEN a user visits another member's profile, THE system SHALL display the profile owner's activity timeline.

WHEN viewing another member's profile activity, THE system SHALL only show public activity:
- Posts created in the community (all subscribed members can see)
- Comments posted in public communities
- Community subscriptions (if profile is public)

WHERE a member has a private profile setting, THE system SHALL not display their activity timeline to non-followers.

THE system SHALL display same format as personal activity feed: reverse chronological, 50 items per page.

THE system SHALL NOT display the following on public profiles:
- Upvotes/downvotes given (privacy)
- Reports submitted
- Moderation actions (unless user is moderator badge visible)

#### 6.1.3 Homepage Feed (Main Feed)
WHEN a member accesses the homepage or main feed, THE system SHALL display a personalized feed of posts from communities they're subscribed to.

THE system SHALL display posts sorted according to the member's selected sorting preference (hot, new, top, controversial as defined in Content Sorting document).

THE system SHALL include posts from all subscribed communities in a single unified feed (unless user has muted specific communities).

THE system SHALL support pagination with maximum 30 posts per page (20-30 recommended for mobile, 30 for desktop).

THE system SHALL use cursor-based pagination with `next_cursor` to fetch subsequent pages.

THE system SHALL filter out:
- Posts from communities user has unsubscribed from
- Posts from muted communities
- NSFW posts (if user has disabled in settings)
- Posts user has hidden or reported
- Posts from blocked users

### 6.2 Feed Generation and Caching

#### Feed Composition Algorithm
THE system SHALL generate the homepage feed by:
1. Identifying all communities the member is subscribed to
2. Retrieving recent posts from those communities (created in last 30 days)
3. Applying selected sorting algorithm (hot, new, top, controversial)
4. Applying content filters (hidden posts, removed posts, downvoted posts)
5. Mixing in trending posts if applicable (optional, max 2 trending posts per page)
6. Formatting and returning paginated results

FEED GENERATION PERFORMANCE TARGET: Complete within 2 seconds even for users with 500+ community subscriptions.

#### Feed Caching Strategy
WHEN a member applies filters (sort by hot, new, top, controversial), THE system SHALL regenerate the feed with the new sorting applied.

THE system SHALL cache feed results for up to 5 minutes to improve response time for subsequent requests (for same sort order and user).

WHERE a new post is created in a subscribed community, THE system SHALL invalidate the cached feed to show fresh content within 30 seconds.

WHERE a post receives votes (changing hot/controversial score), THE system SHALL invalidate hot and controversial feed cache.

THE system SHALL maintain separate caches per sort order (hot cache, new cache, top cache, controversial cache).

THE system SHALL use efficient cache invalidation (only invalidate affected sort orders, not all caches).

#### Fresh Feed Requests
WHEN a user requests "See New Posts" or manually refreshes, THE system SHALL bypass cache and fetch fresh results.

THE system SHALL return fresh results within 2 seconds.

THE system SHALL show notification badge: "X new posts available" when new posts arrive in subscribed communities.

### 6.3 Activity Timeline Performance

THE system SHALL retrieve activity timelines within following time windows:
- Personal activity feed: within 1 second
- User profile timeline: within 1.5 seconds
- Homepage main feed: within 2 seconds
- Paginated feed requests: within 500 milliseconds

THE system SHALL use database indexes on (user_id, created_at) for efficient sorting.

THE system SHALL denormalize community names and post titles on activity records to avoid expensive joins.

---

## 7. User Statistics and Analytics

### 7.1 User Profile Statistics

#### Public Statistics Displayed on Profile
WHEN a member views a user profile, THE system SHALL display public user statistics:
- Total posts created (all-time count)
- Total comments posted (all-time count)
- Total karma points (sum of all post and comment karma)
- Followers count (number of users following)
- Following count (number of users this user follows)
- Communities joined (subscribed) count
- Member since date (account creation date in format: "Joined November 2024")
- Last active date/time (relative: "Active 2 hours ago")
- Total upvotes received (derived from post/comment karma, calculated as sum of net positive votes)

#### Personal Statistics Dashboard
WHEN a member views their own profile, THE system SHALL display personal statistics including:
- All public statistics listed above
- Personal karma breakdown:
  - Karma from posts (sum of net votes on all posts)
  - Karma from comments (sum of net votes on all comments)
  - Percentage breakdown (X% from posts, Y% from comments)
  - Top posts by karma (last 30 days, maximum 10)
  - Top comments by karma (last 30 days, maximum 10)
- Posts created count
- Comments posted count
- Total downvotes given and received
- Communities moderated (if moderator)
- Karma earned this month (trending metric)
- Karma per post average
- Karma per comment average

#### Community-Specific Statistics
THE system SHALL display a member's activity in each community:
- Posts created in community (count)
- Comments posted in community (count)
- Karma earned in community (sum of votes on posts/comments in this community)
- Member since date in community (when joined)
- Reputation level in community (based on community-specific karma)

### 7.2 User Engagement Tracking

#### Engagement Metrics Tracked
THE system SHALL track the following engagement metrics for each member:
- Daily active days (how many days active per month, percentage)
- Session frequency (how often they visit per week)
- Average session duration (minutes per visit)
- Posts created per week/month (trend over time)
- Comments posted per week/month (trend over time)
- Voting activity (votes per week/month, breakdown of upvotes vs downvotes)
- Report submissions (number of content reports filed)
- Content flagged/removed (moderator view only)
- Follow/follower changes (weekly trend)

#### User Activity Levels
THE system SHALL categorize members by activity level based on tracked metrics:
- **Inactive**: No activity in 30+ days
- **Lurker**: Reads/views but posts <1 time per month or votes <5 times per month
- **Casual**: Occasional posting (1-10 posts per month) and voting
- **Active**: Regular posting (10-50 posts per month) and engagement
- **Power User**: Very frequent posting (50+ posts per month), voting, commenting daily
- **Moderator**: Community moderation focus (moderation actions tracked separately)

THE system SHALL calculate activity level weekly based on last 30 days of metrics.

THE system SHALL display activity level on user profile with visual indicator.

### 7.3 Reputation and Achievement System

#### Karma Levels and Badges
WHERE a member reaches specific karma thresholds, THE system MAY display reputation badges on profile:
- 100 karma: New Member (green badge)
- 1,000 karma: Active Member (blue badge)
- 10,000 karma: Experienced Member (purple badge)
- 100,000 karma: Expert Member (gold badge)
- 1,000,000 karma: Legendary Member (diamond badge)

THE system SHALL award badges automatically when karma threshold reached.

BADGE DISPLAY: Show on user profile, next to username in posts/comments (with hover tooltip showing karma range).

WHERE a member earns specific achievements, THE system MAY display achievement badges:
- Verified Contributor: Verified email + 100+ karma + 10+ posts
- Community Builder: Created community with 100+ members
- Helpful Mentor: Received 50+ upvotes on comments
- Content Creator: Posted 50+ posts
- Moderator: Appointed as community moderator (badge text shows which communities)
- Administrator: System administrator account (special admin badge)
- Active Participator: Posted or commented every day for 30 days straight

THE system SHALL display badges on user profiles with tooltip explaining each badge.

WHEN a member views a profile with badges, THE system SHALL display a tooltip or description explaining what each badge means and how to earn it.

### 7.4 Leaderboards and Rankings (Optional)

WHERE leaderboards are implemented, THE system SHALL display:
- **Top karma earners**: Ranked by total karma (this week, this month, all time)
- **Most active members**: Ranked by posts + comments (this week, this month)
- **Most helpful members**: Ranked by average upvotes per post (last month)
- **Trending members**: Ranked by fastest growing karma (this week)

THE system SHALL limit leaderboards to top 100 or top 1,000 members to avoid performance issues.

THE system SHALL refresh leaderboards daily for week/month rankings and weekly for all-time rankings.

THE system SHALL allow filtering leaderboards by community (top members in each community).

THE system SHALL show user's own rank/position on leaderboard ("You are ranked #47").

### 7.5 Privacy Settings for Statistics

THE system SHALL allow users to control visibility of their statistics:
- **Public**: All statistics visible to all users
- **Members Only**: Statistics visible only to registered members
- **Private**: Statistics visible only to self (hidden from all other users)

DEFAULT: All statistics are public.

WHEN profile is set to private, THE system SHALL hide:
- Follower/following counts
- Activity timeline
- Karma breakdown
- Statistics dashboard

THE public profile still shows username and bio (if any).

---

## 8. User Engagement Tracking and Behavioral Analytics

### 8.1 Engagement Events Tracked

#### Content Interaction Events
THE system SHALL track:
- Post views (each unique viewer session counts as 1 view, max 1 per 24 hours per user)
- Post clicks (when user clicks to open a post from feed)
- Comment reads (when user scrolls to see comments on post)
- Link clicks (when user clicks external links in posts, tracked via redirect service)
- Image views (image post interactions, tracked as post views)
- Time spent on post (how long user stays on post before returning to feed)
- Comment composition time (how long from starting to reply to posting)

#### Social Interaction Events
THE system SHALL track:
- Upvotes given and received (with timestamp)
- Downvotes given and received (with timestamp)
- Comments posted and received (with timestamp)
- Mentions sent and received (with timestamp)
- Follow actions (follows given and received, with timestamp)
- Direct messages sent and received (count, not content)

#### Community Engagement Events
THE system SHALL track:
- Community subscriptions (subscribe/unsubscribe timestamp)
- Community posts viewed (count per community per session)
- Moderation actions taken (for moderators, with timestamp and action type)
- Reports submitted (count, not report details)
- Content flagged actions (viewing flagged content)

### 8.2 Behavioral Signals Derived from Events
THE system SHALL use tracked events to derive behavioral signals:
- **Member interest areas**: Based on community subscriptions and post engagement (which topics does user engage with most)
- **Content preferences**: Text vs. link vs. image posts (which format does user upvote most)
- **Peak activity times**: When is member most active (hour of day, day of week)
- **Posting patterns**: Frequency (daily, weekly), time of day, content type preferences
- **Voting behavior**: Tendency to upvote vs. downvote (ratio), voting speed (how quickly after posting)
- **Response patterns**: How quickly member replies to comments, response time in hours/days
- **Quality assessment**: Which user's posts/comments receive higher engagement (quality metric)
- **Community affinity**: Which communities does user engage with most frequently

### 8.3 Privacy and Data Protection

WHEN tracking user engagement, THE system SHALL:
- Store engagement data securely and encrypted at rest
- Allow members to opt-out of detailed analytics tracking (where legally permitted)
- Never expose individual behavioral data to other members
- Aggregate analytics data before displaying to moderators/admins
- Comply with privacy regulations (GDPR right to erasure, CCPA opt-out, etc.)
- Delete engagement data older than 2 years automatically
- Not use engagement data for targeting advertising or third-party data sales

WHERE a member deletes their account, THE system SHALL delete or anonymize all associated engagement data within 30 days.

WHERE a member opts out of analytics, THE system SHALL stop collecting engagement events (but preserve historical data with anonymization).

THE system SHALL display privacy notice: "Your activity is tracked to improve your experience. You can disable this in privacy settings."

---

## 9. Integration with Other Platform Features

### 9.1 Notification and Follow System Integration

WHEN a member follows another user, THE system SHALL automatically:
- Make followed users' posts more discoverable in recommendations (optional feature)
- Add followed users' posts to priority notifications (optional, if recommendation feature uses follows)
- Enable easy navigation to followed users' profiles via "Following" menu

WHEN a member blocks another user:
- THE blocked user cannot follow THE blocker
- Existing follows from blocked user are marked inactive
- THE blocker won't see blocked user's content in feeds

### 9.2 Mention System Integration

WHEN a member is mentioned in a post or comment:
- THE system SHALL send mention notification (as specified in Section 3)
- THE mention SHALL create clickable link to user profile
- THE system SHALL track mention as engagement event
- THE user's notification count increments
- MENTION APPEARS in notification center with high priority

WHEN user disables mention notifications:
- THE system SHALL stop sending mention notifications
- MENTIONS still appear in content but don't trigger notifications
- Mention count still increments for engagement analytics

### 9.3 Karma System Integration

WHEN karma points are awarded or removed:
- THE system SHALL update user's total karma immediately (atomic transaction)
- THE system SHALL update karma displayed in user statistics and profile
- THE system SHALL check for reputation level changes and award badges if applicable
- THE system SHALL update activity metrics that depend on karma (engagement level)
- THE system SHALL notify user of milestone achievements if enabled

WHEN post/comment is deleted:
- THE system SHALL reverse all karma associated with that content
- AUTHOR'S total karma decreases immediately
- THE system SHALL recalculate user's activity level if karma drops

### 9.4 Moderator Integration

WHEN a moderator takes action on content:
- THE system SHALL track the action in moderator's activity history
- THE system SHALL send notification to content author about moderation action
- THE system SHALL log moderation action in community moderation log
- THE action appears in community moderator's "Actions" feed
- ADMINS can view all moderator actions for oversight

WHEN moderator is promoted or demoted:
- THE system SHALL update their role displays across platform
- THE system SHALL show moderator badge on their posts if in community where they moderate
- THE system SHALL grant/revoke moderation action permissions

### 9.5 Post and Comment Integration

WHEN user creates post or comment:
- THE system SHALL update their activity timeline immediately
- THE system SHALL add to their "My Posts" and "My Comments" views
- THE system SHALL trigger notifications to relevant users (post author for comment, etc.)
- THE system SHALL enable mention functionality in content

WHEN post/comment is edited:
- THE system SHALL update in activity timeline with "edited" indicator
- THE system SHALL update timestamps in statistics
- THE system SHALL preserve original version in edit history

### 9.6 Search and Discovery Integration

WHEN user performs search:
- THE system SHALL include user's activity history in search results (if searching own content)
- THE system SHALL use engagement tracking to rank relevant posts for user
- THE system SHALL suggest communities based on user's follow patterns
- THE system SHALL recommend users based on shared interests (activity tracking)

---

## 10. Performance and Scalability Considerations

### 10.1 Real-Time Features Performance

WHEN implementing real-time features (notifications, live feeds):
- THE system SHOULD use efficient database queries with appropriate indexing on (user_id, created_at, timestamp)
- THE system SHOULD cache frequently accessed data (user profiles, follow relationships, statistics)
- THE system SHOULD implement pagination to limit data returned per request
- THE system SHOULD use asynchronous processing for non-critical operations (analytics, recommendations)
- QUERY PERFORMANCE: All critical queries must execute within 500ms

### 10.2 Notification System Performance
THE notification system SHALL:
- Process notifications asynchronously using message queue (don't block request)
- Batch notifications where appropriate (multiple mentions in same comment = 1 notification)
- Archive old notifications (older than 1 year) to separate cold storage
- Index notifications by recipient_id and created_at for efficient querying
- Cache notification counts per user with 5-minute TTL
- Support delivering 10,000+ notifications per second at peak load

### 10.3 Feed Generation Performance
THE feed generation system SHALL:
- Use efficient sorting algorithms (don't sort all posts, use indexed queries)
- Cache feed results with appropriate time-to-live (TTL of 5 minutes for hot/new/top)
- Implement lazy loading to return results quickly (paginated, 30 items per page)
- Use database indexes on (community_id, created_at), (community_id, net_score), (created_at DESC)
- Complete homepage feed generation in < 2 seconds for users with 500+ subscriptions

### 10.4 Engagement Data Storage
THE engagement analytics system SHALL:
- Aggregate detailed metrics to reduce storage requirements (hourly/daily rollups)
- Archive detailed analytics older than 1 year to cold storage
- Use time-series database or optimized storage for metrics (e.g., InfluxDB, TimescaleDB)
- Implement data retention policies compliant with privacy regulations (max 2 years)
- Store only essential engagement events (views, posts, comments, votes) not keystroke logs
- Clean up deleted user's engagement data within 30 days

### 10.5 Cache Invalidation Strategy
THE system SHALL implement smart cache invalidation:
- Invalidate user notification count when new notification arrives
- Invalidate user statistics cache when karma changes
- Invalidate feed cache when new post created in subscribed community
- Invalidate follow suggestion cache when user follows new user
- Use cache versioning/tagging to batch invalidate related caches
- Implement cache warming for frequently accessed data

---

## 11. User Interaction Feature Constraints and Rules

### 11.1 System-Wide Constraints

WHEN implementing user interaction features:
- THE system SHALL maintain referential integrity (users must exist before being followed, mentioned, etc.)
- THE system SHALL handle concurrent interactions safely (two members following each other simultaneously)
- THE system SHALL prevent notification loops (e.g., don't send notification about notification)
- THE system SHALL implement rate limiting on notification generation to prevent spam
- THE system SHALL enforce maximum capacity limits (10,000 follows per user, 50,000 followers maximum)
- THE system SHALL validate all user IDs exist before creating relationships
- THE system SHALL use database constraints (foreign keys, unique constraints) to enforce rules

### 11.2 Role-Based Access to Features

#### Guest Access
Guests SHALL:
- View user profiles (public information only)
- View follower/following counts
- See notification examples (not personal notifications)
- View public activity timelines
- Browse user profiles and statistics
- Cannot follow users or send messages
- Cannot mention users
- Cannot receive notifications

#### Member Access
Members SHALL:
- Follow and unfollow other users (all actions available)
- Receive all notification types
- Send and receive mentions
- Send and receive direct messages
- Access personal activity timeline
- View personal statistics and karma
- Access full user discovery and recommendations
- Participate in all engagement activities

#### Moderator Access
Moderators SHALL:
- Access all member features
- Receive additional moderator action notifications
- View moderation-related statistics
- Track moderation activity in their communities
- See reports and moderator action logs
- Receive notifications about content requiring review
- Access extended analytics on community engagement

#### Admin Access
Admins SHALL:
- Access all member and moderator features
- View platform-wide statistics
- Access analytics dashboard (aggregate metrics)
- View all user activity and engagement metrics
- See deleted user data (if retention enabled) for auditing
- Access moderation logs across all communities
- Override any user interaction feature

### 11.3 Feature Validation Rules

IF a member attempts to follow a non-existent user, THE system SHALL return HTTP 404 Not Found with error code `USER_NOT_FOUND`.

IF a member attempts to send a direct message to a user who has blocked them, THE system SHALL return HTTP 403 Forbidden with error code `USER_BLOCKED`.

IF a member attempts to mention a non-existent username, THE system SHALL treat it as plain text (not a mention).

IF a member attempts to send a direct message to a suspended/deactivated account, THE system SHALL return HTTP 403 Forbidden with error code `ACCOUNT_INACTIVE`.

IF mention count exceeds 50 mentions per message, THE system SHALL process only first 50 mentions and display warning.

IF follow count exceeds maximum 10,000 follows, THE system SHALL reject new follow with error code `FOLLOW_LIMIT_EXCEEDED`.

IF direct message exceeds character limit (5000), THE system SHALL return HTTP 400 Bad Request with remaining character count.

---

## 12. Error Scenarios and User-Facing Messages

### 12.1 Follow System Errors

| Scenario | Error Code | HTTP Status | Error Message | Action |\n|----------|-----------|------------|---------------|--------|\n| Attempt to follow non-existent user | USER_NOT_FOUND | 404 | "User not found" | Search for user |\n| Attempt to follow self | FOLLOW_SELF | 400 | "You cannot follow yourself" | Show user's own profile |\n| Follow relationship already exists | FOLLOW_DUPLICATE | 409 | "You are already following this user" | Show unfollow button |\n| User is blocked by target | USER_BLOCKED | 403 | "You cannot follow this user" | Show contact support |\n| User is suspended/banned | ACCOUNT_INACTIVE | 403 | "This user account is unavailable" | Search for other users |\n| Follow limit exceeded | FOLLOW_LIMIT_EXCEEDED | 429 | "You've reached the maximum follows. Unfollow someone first." | Show most recent follows to unfollow |\n\n### 12.2 Direct Message Errors\n\n| Scenario | Error Code | HTTP Status | Error Message | Action |\n|----------|-----------|------------|---------------|--------|\n| Recipient does not exist | USER_NOT_FOUND | 404 | "User not found" | Search for user |\n| Message to self | MESSAGE_SELF | 400 | "You cannot message yourself" | Show other users |\n| Recipient has blocked sender | USER_BLOCKED | 403 | "This user is not accepting messages" | Show support info |\n| Recipient is suspended | ACCOUNT_INACTIVE | 403 | "Cannot message inactive accounts" | Show other users |\n| Message exceeds character limit | MESSAGE_TOO_LONG | 400 | "Message must be 5000 characters or less. Current: [X]" | Show character counter |\n| Message is empty | MESSAGE_EMPTY | 400 | "Message cannot be empty" | Focus message field |\n| Edit window expired | MESSAGE_EDIT_WINDOW_EXPIRED | 403 | "Can only edit messages within 1 hour of sending" | Show original message |\n\n### 12.3 Mention System Errors\n\n| Scenario | Error Code | HTTP Status | Error Message | Action |\n|----------|-----------|------------|---------------|--------|\n| Mentioned user not found | (treat as plain text) | N/A | No error, treat as text | Show help text |\n| Invalid mention format | (treat as plain text) | N/A | No error, ignore | Show autocomplete examples |\n| Too many mentions (50+) | TOO_MANY_MENTIONS | 400 | "Maximum 50 mentions per message. Extra mentions will be ignored." | Suggest removing mentions |\n\n### 12.4 Notification System Errors\n\n| Scenario | Error Code | HTTP Status | Error Message | Action |\n|----------|-----------|------------|---------------|--------|\n| Notification delivery failed | NOTIFICATION_FAILED | 500 | "Unable to send notification. Try again." | Show retry button |\n| Notification preferences update failed | PREFERENCES_UPDATE_FAILED | 500 | "Could not update notification preferences. Try again." | Show retry button |\n| Notification history too large | HISTORY_SIZE_EXCEEDED | 413 | "Notification history is full. Oldest notifications will be deleted." | Offer to clear old notifications |\n\n---\n\n## 13. Success Criteria for Implementation\n\n### 13.1 Follow System Success\n- Users can successfully follow/unfollow other users (testable: follow button toggles)\n- Follow counts are accurate and update immediately within 2 seconds\n- Follow relationships persist correctly across sessions and restarts\n- Unfollow removes relationship completely and updates counts\n- Following list displays in correct order (newest first)\n- Follow suggestions regenerate daily with fresh recommendations\n- Performance: Follow/unfollow completes within 500ms\n\n### 13.2 Notification System Success\n- All notification types trigger correctly based on defined triggers\n- Notifications are delivered within specified time windows (reply: 5s, mention: 3s, follow: 2s, moderation: 1s)\n- Unread counts are accurate and update immediately\n- Members can disable notification types and functionality respects preferences\n- No duplicate notifications for the same event\n- Notifications persist in history for 90 days\n- Notification delivery success rate > 99.5%\n- Email/push notifications deliver within specified timeframes\n\n### 13.3 Mention System Success\n- Mentions are detected correctly in all content types (posts, comments)\n- Mention autocomplete suggests valid usernames\n- Mention notifications are sent to correct recipients\n- Mentions create clickable links to user profiles\n- Non-existent usernames are not treated as mentions\n- Mentions display with distinct visual styling\n- Performance: Mention detection completes within 100ms\n\n### 13.4 Direct Messaging Success\n- Members can send and receive direct messages (testable: message appears in conversation)\n- Conversations maintain threading correctly with chronological order\n- Unread status is accurate and message counts correct\n- Blocking prevents message sending successfully\n- Messages persist across sessions and restarts\n- Edit functionality works within 1-hour window\n- Delete functionality works (one-way deletion)\n- Performance: Message delivery within 2 seconds\n\n### 13.5 User Recommendation Success\n- Recommendations are personalized to member interests\n- Recommendations do not include already-followed users or already-subscribed communities\n- Dismissed recommendations are not shown for 30 days\n- Recommendations regenerate daily with new activity\n- Recommendation algorithm works fairly for all user types\n- Performance: Recommendations load within 1 second\n\n### 13.6 Activity Feed Success\n- Personal activity feeds display correct member actions in reverse chronological order\n- Homepage feeds show posts from subscribed communities correctly\n- Activity is displayed in correct chronological order\n- Filtering works correctly (by type, date range)\n- Feed performance meets acceptable latency standards (< 2 seconds)\n- Pagination works correctly with cursor-based pagination\n- Caching improves response time for repeated requests\n\n### 13.7 User Statistics Success\n- All statistics are calculated correctly and match manual verification\n- Statistics update in real-time as events occur (within 5 seconds)\n- Historical statistics are preserved accurately\n- Reputation badges display correctly when earned\n- Karma breakdowns are accurate\n- Leaderboards rank users correctly and update daily\n- Privacy settings are respected (public/private visibility)\n- Performance: Statistics load within 1 second\n\n---\n\n## 14. Related Documentation and Integration Points\n\nThis document defines user interaction and engagement features for the community platform. For related information, refer to:\n\n- [User Roles and Authentication Specification](./02-user-roles-authentication.md) - Permission levels and access control for user interaction features\n- [User Management and Profiles](./03-user-management-profiles.md) - User profile structure that integrates with follow system and statistics\n- [Voting and Karma System](./06-voting-karma-system.md) - Karma calculations that drive user statistics and reputation\n- [Content Moderation and Reporting](./09-content-moderation-reporting.md) - Moderation actions that trigger notifications and engagement events\n- [Comments and Discussions](./07-comments-discussions.md) - Comment interactions that trigger reply notifications and mentions\n- [Communities Management](./04-communities-management.md) - Community subscription integration with feed and recommendations\n- [Posts Creation and Management](./05-posts-creation-management.md) - Post interactions tracked in activity feeds\n- [Content Sorting and Discovery](./08-content-sorting-discovery.md) - Feed generation and recommendation algorithms\n- [Error Handling and Edge Cases](./11-error-handling-edge-cases.md) - Error scenarios and validation rules\n\n---\n\n## 15. Conclusion\n\nThe User Interactions and Features system creates engaging social experiences through follows, notifications, mentions, recommendations, and activity tracking. These features drive platform engagement, help users discover content and people, and build community connections.\n\nImplementation should prioritize:\n1. **Real-time notifications** with reliable delivery and user preferences respected\n2. **Efficient recommendation algorithms** that improve over time\n3. **Scalable infrastructure** for millions of follows and messages\n4. **Privacy protection** for user data and engagement tracking\n5. **Clear error handling** with helpful user-facing messages\n6. **Performance optimization** through caching and indexing\n\nBackend developers implementing this specification should focus on database indexing, efficient algorithms, proper caching strategies, and comprehensive error handling to ensure these features scale reliably as the platform grows.\n\n> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, notification infrastructure, caching strategies, recommendation engines) are at the discretion of the development team.*"