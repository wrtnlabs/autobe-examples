## Karma System Requirements

### Karma Definition and Purpose

Karma is a reputation score that reflects a user's contribution to the community based on the quality and reception of their content and interactions. It serves as a gamification mechanism to encourage positive participation and signal trustworthiness. Higher karma indicates a user who consistently contributes valuable content, while lower karma may indicate low-quality, disruptive, or manipulative behavior. Karma does not affect basic platform access for members but influences visibility privileges, moderation capabilities, and community trust.

### How Karma is Earned

WHEN a member creates a post that receives an upvote, THE system SHALL award +1 karma to the post author.
WHEN a member writes a comment that receives an upvote, THE system SHALL award +1 karma to the comment author.
WHEN a member's first post in a community receives at least 5 upvotes within 24 hours, THE system SHALL award +5 karma to the post author.
WHEN a member's comment receives 10 upvotes on a single post, THE system SHALL award +3 karma to the comment author.
WHERE a member has an active subscription to a community, AND they post content in that community, THE system SHALL award +1 karma for each upvote received on their post.

### How Karma is Lost

WHEN a member creates a post that receives a downvote, THE system SHALL deduct -1 karma from the post author.
WHEN a member writes a comment that receives a downvote, THE system SHALL deduct -1 karma from the comment author.
IF a post is removed by a moderator due to violation of community guidelines, THEN THE system SHALL deduct -5 karma from the post author.
IF a comment is removed by a moderator due to violation of community guidelines, THEN THE system SHALL deduct -3 karma from the comment author.
WHEN a member's account is flagged for karma farming (system detect pattern of multiple low-quality posts within 1 minute), THEN THE system SHALL deduct -10 karma and apply an auto-restriction for 6 hours.

### Karma Display Rules

THE system SHALL display karma as a whole number with no decimal places.
THE system SHALL display karma on user profiles, post headers, and comment headers.
WHEN a user's karma is less than 0, THE system SHALL display it as a negative number (e.g., "-15").
WHEN a user's karma is 0, THE system SHALL display it as "0".
WHEN a user's karma is greater than 1000, THE system SHALL display it with a comma separator (e.g., "1,250").
WHEN a user's karma is greater than 10,000, THE system SHALL append "+" to the number (e.g., "10,000+").
THE system SHALL NOT display karma to guests viewing member profiles.

### Karma Threshold Effects

WHERE a member's karma is greater than or equal to 25, THE system SHALL allow them to create a new community.
WHERE a member's karma is greater than or equal to 100, THE system SHALL allow them to upload images directly in posts without external link validation.
WHERE a member's karma is greater than or equal to 500, THE system SHALL remove the 60-second cooldown between posts.
WHERE a member's karma is greater than or equal to 1000, THE system SHALL allow them to view the full list of report reasons during submission.
WHERE a member's karma is greater than or equal to 2500, THE system SHALL display a "Trusted Member" badge on their profile and posts.

### Karma Decay Policy

WHILE a user has been inactive for 90 consecutive days, THE system SHALL reduce their karma by 10% every 30 days, with a minimum threshold of 10 points.
WHEN a user returns to the platform after inactivity, THE system SHALL notify them "Your karma has been partially reduced due to inactivity. This helps ensure reputation reflects current engagement."
Karma decay does not apply to members who have posted or commented in the last 30 days.

### Karma and Moderation Privileges

WHERE a member's karma is greater than or equal to 5000, THE system SHALL allow them to be nominated as a moderator candidate for any community they subscribe to.
WHEN a community admin approves a moderator candidate, THE system SHALL assign them moderator privileges for that community, but their karma score does NOT change as a result.
Moderator status is granted based on community vote and admin approval, not karma alone.
Karma does NOT grant any platform-wide admin privileges.

### Karma Fraud Prevention

IF a user performs more than 20 upvotes or downvotes in a single minute, THEN THE system SHALL block further voting for 10 minutes and flag the account for review.
IF a user’s posts receive upvotes from 5 or more accounts created within the same hour, THEN THE system SHALL investigate for sock puppet behavior and may apply a karma deduction of -5 per bot-like account.
WHEN a user receives more than 100 upvotes within 5 minutes on a single post or comment, THE system SHALL automatically pause further ranking changes and require manual review by an admin.
THE system SHALL NOT award karma to accounts created within the past 5 minutes for any action on posts.
IF a user repeatedly votes on their own content using new accounts, THE system SHALL detect and remove associated karma, ban the abusive accounts, and dilute the karma gain from those votes across the network.
WHERE a user's karma ratio (upvotes / total votes) is below 0.3 for their last 50 total votes, THE system SHALL trigger a "low-quality contributor" flag and limit visibility of their future posts in "Top" and "Hot" sorts for 24 hours.