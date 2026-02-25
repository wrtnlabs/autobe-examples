# Reddit-like Community Platform

## User Account

- WHEN a user signs up, THE community platform SHALL require a unique email and password.
- WHEN a user signs up, THE community platform SHALL require the user to choose a unique username.
- WHEN a user logs in, THE community platform SHALL authenticate the user by verifying the email and password.
- WHEN a user requests a password change, THE community platform SHALL verify the user's identity and allow the update.
- WHEN a user deletes their account, THE community platform SHALL delete the user account along with all their posts and comments.

## User Profile

- EACH user SHALL have an editable profile containing display name, bio text, and avatar image.
- WHEN a user edits their profile, THE community platform SHALL allow changes to display name, bio, and avatar.
- ALL users SHALL be able to view any other user's profile.
- WHEN viewing a user profile, THE community platform SHALL display the display name, bio, avatar, total karma score, posts created by the user, and comments written by the user.

## Karma

- EACH user SHALL have a single karma score represented by an integer, which can be positive or negative.
- WHEN a post or comment receives an upvote, THE community platform SHALL increase the author's karma by 1.
- WHEN a post or comment receives a downvote, THE community platform SHALL decrease the author's karma by 1.
- WHEN a vote is removed, THE community platform SHALL adjust the karma score accordingly.

## Communities

- ANY authenticated user SHALL be able to create a community.
- EACH community SHALL have a unique name, description text, and icon image.
- THE user who creates a community SHALL become the community owner.
- ALL users SHALL be able to browse all communities in a list.
- USERS SHALL be able to search communities by name.
- EACH community SHALL display its subscriber count.

## Subscribing

- USERS SHALL be able to subscribe or unsubscribe to any community.
- ONLY subscribed users SHALL be able to create posts in that community.
- USERS SHALL be able to view a list of all communities to which they are subscribed.

## Posts

- WHEN a subscribed user creates a post in a community, THE community platform SHALL require the post to have a title.
- POSTS SHALL be one of the following types: text, link, or image.
- Text posts SHALL have text content.
- Link posts SHALL have a valid URL.
- Image posts SHALL have an uploaded image.
- USERS SHALL be allowed to edit or delete only their own posts.
- WHEN viewing a single post, THE platform SHALL display the title, full content, author, community, vote score, comment count, and time since posted.

## Post Voting

- USERS SHALL be able to upvote or downvote any post.
- EACH user SHALL be allowed only one vote per post.
- USERS SHALL be able to change their vote from upvote to downvote and vice versa.
- USERS SHALL be able to remove their vote entirely.
- VOTE score SHALL be calculated as the sum of all upvotes minus the sum of all downvotes.

## Post Feeds

- HOME feed SHALL show posts from communities the user subscribes to and SHALL be accessible only to authenticated users.
- POPULAR feed SHALL show posts from all communities, accessible to anyone.
- COMMUNITY feed SHALL show posts from a specific community, accessible to anyone.
- ALL feeds SHALL support sorting: Hot, New, Top (with time filters like today, this week, this month, this year, all time), and Controversial.
- ALL feeds SHALL be paginated.

## Post List Display

- POSTS displayed in any feed SHALL show title, author username, community name, vote score, comment count, and time since posted.
- Text posts SHALL display the first 200 characters of content.
- Image posts SHALL display a thumbnail.
- Link posts SHALL display the domain name extracted from the URL.

## Comments

- USERS SHALL be able to write comments and replies (nested indefinitely).
- USERS SHALL be able to edit or delete their own comments.
- EACH comment SHALL display author, content, vote score, time since posted, and nested replies.

## Comment Voting

- Comment voting SHALL follow the same rules as post voting: one vote per user per comment, ability to upvote, downvote, change, or remove vote.

## Comment Sorting

- COMMENTS SHALL be sortable by Best (highest vote score), New (most recent), and Controversial (many votes but score near zero).

## Community Moderation

### Moderator Roles

- THE community owner SHALL be the highest authority.
- OWNERS SHALL be able to add or remove moderators.
- MODERATORS SHALL be able to add other moderators but SHALL NOT be able to remove the owner or other moderators.

### Moderator Actions

- MODERATORS SHALL be able to delete any post or comment in their community.
- MODERATORS SHALL be able to ban or unban users in their community.
- THE community SHALL maintain a list of banned users.
- BANNED users SHALL NOT be able to create posts or comments but MAY view content.

## Reporting

- USERS SHALL be able to report any post or comment with a reason text.
- MODERATORS SHALL be able to view reports, see reported content, the user who reported it, and the reason.
- MODERATORS SHALL be able to approve reports (deleting the content) or dismiss them (keeping the content).
- DISMISSED reports SHALL be removed from the report list.
