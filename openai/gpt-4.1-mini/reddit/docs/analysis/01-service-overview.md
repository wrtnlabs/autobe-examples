# Reddit-like Community Platform

## User Account

Users shall be able to sign up with an email and password and select a unique username. When a user signs up, the system shall verify that the email is not already registered and that the username is unique across the platform.

WHEN a user provides a valid email and password and a unique username, THE system SHALL create a new user account.

Users shall be able to log in with their registered email and password.

WHEN a user submits a login request with valid credentials, THE system SHALL authenticate the user and establish a user session.

Users shall be able to change their password.

WHEN a user requests a password change, THE system SHALL verify the user's identity and update the password accordingly.

Users shall be able to delete their account.

WHEN a user deletes their account, THE system SHALL also delete all posts and comments created by the user.

## User Profile

Each user shall have a profile consisting of a display name, bio text, and avatar image.

Users shall be able to edit their display name, bio, and avatar.

WHEN a user accesses their profile edit form and submits changes, THE system SHALL update their profile information accordingly.

Users shall be able to view any other user's profile.

WHEN a user views another user's profile page, THE system SHALL display that user's display name, bio, avatar image, total karma score, a list of all posts created by that user, and a list of all comments written by that user.

## Karma

Every user shall have a single karma score represented by an integer.

WHEN any registered user upvotes a post or comment authored by another user, THE system SHALL increase the karma score of the author by 1.

WHEN any registered user downvotes a post or comment authored by another user, THE system SHALL decrease the karma score of the author by 1.

WHEN a user removes their vote from a post or comment, THE system SHALL adjust the karma score of the author accordingly.

Karma scores SHALL be allowed to be negative.

## Communities

Any registered user shall be able to create a community.

WHEN a user creates a community, THE system SHALL require a unique community name, description text, and an icon image to be provided.

The user who creates the community SHALL become its owner.

Users shall be able to browse all communities in a paginated list.

Users shall be able to search for communities by name.

Each community shall display the total subscriber count on its information page.

## Subscribing

Users shall be able to subscribe to any community.

WHEN a user subscribes to a community, THE system SHALL add the user to the subscriber list of that community.

Users shall be able to unsubscribe from any community.

WHEN a user unsubscribes from a community, THE system SHALL remove the user from the subscriber list of that community.

Users shall be able to view a list of all communities they are subscribed to.

Subscribing to a community shall be required to create posts within that community.

WHEN a user attempts to create a post in a community, THE system SHALL verify that the user is subscribed to that community.

## Posts

Users shall be able to create posts in communities to which they are subscribed.

Posts SHALL have a required title.

Posts SHALL be one of three types: text posts, link posts, or image posts.

Text posts SHALL contain text content.

Link posts SHALL contain a valid URL.

Image posts SHALL contain an uploaded image.

Users shall be able to edit their posts.

WHEN a user edits a post that they have authored, THE system SHALL update the post content accordingly.

Users shall be able to delete their posts.

WHEN a user deletes a post that they have authored, THE system SHALL remove it from the system.

When viewing a single post, the system SHALL display the post's title, full content, author username, community name, vote score, comment count, and the timestamp when it was posted.

## Post Voting

Users shall be able to upvote posts, which adds 1 to the post's vote score.

Users shall be able to downvote posts, which subtracts 1 from the post's vote score.

Each user SHALL have only one vote per post.

Users shall be able to change their vote from upvote to downvote or vice versa.

Users shall be able to remove their vote from a post entirely.

The vote score of a post SHALL be the total number of upvotes minus total number of downvotes.

## Post Feeds

Three types of post feeds SHALL be available:

- Home Feed: displays posts only from communities the user is subscribed to. Available only to logged-in users.
- Popular Feed: displays posts from all communities, visible to all users including guests.
- Community Feed: displays posts from one specific community, visible to all users.

All feeds SHALL support sorting options: hot, new, top, and controversial.

Sorting options SHALL behave as follows:

- Hot: recent posts with many upvotes appear first.
- New: most recent posts appear first.
- Top: highest vote score posts appear first, with time filters such as today, this week, this month, this year, and all time.
- Controversial: posts with many votes and scores close to zero appear first.

All feeds SHALL be paginated.

## Post List Display

When showing any feed, each post SHALL display the title, author username, community name, vote score, comment count, and time since posted.

For text posts, the first 200 characters of the content SHALL be shown.

For image posts, a thumbnail SHALL be shown.

For link posts, the domain name of the URL SHALL be shown.

## Comments

Users shall be able to write comments on any post.

Comments SHALL support unlimited nested replies.

Users shall be able to edit and delete their own comments.

Each comment SHALL display the author username, content, vote score, time since posted, and any nested replies.

## Comment Voting

Comment voting SHALL follow the same rules as post voting.

Users SHALL only have one vote per comment.

Users SHALL be able to upvote, downvote, change their vote, or remove their vote on comments.

## Comment Sorting

Comments on a post SHALL be sortable by best, new, or controversial.

- Best sorting orders comments by highest vote score first.
- New sorting orders comments by most recent first.
- Controversial sorting orders comments by many votes but scores near zero first.

## Community Moderation

The community creator SHALL be the owner with the highest authority.

Owners SHALL have the permission to add and remove moderators.

Moderators SHALL have the permission to add additional moderators.

Moderators SHALL NOT have the permission to remove the owner.

Moderators SHALL NOT have the permission to remove other moderators.

Moderators SHALL be able to delete any post or comment within their community.

Moderators SHALL be able to ban and unban users within their community.

Moderators SHALL be able to view the list of banned users.

Banned users SHALL NOT be able to create posts or comments in the community but SHALL be able to view content.

## Reporting

Users SHALL be able to report any post or comment.

When reporting, users SHALL provide a reason text.

Moderators SHALL be able to view all reports for their community.

Each report SHALL display the reported content, who reported it, and the reason.

Moderators SHALL have the ability to approve (delete content) or dismiss (keep content) each report.

Dismissed reports SHALL be removed from the report list.