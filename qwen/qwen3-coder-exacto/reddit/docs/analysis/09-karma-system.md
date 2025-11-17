## Karma and Reputation System Requirements

### Overview

The karma system serves as the core reputation mechanism for the community platform, quantifying user contributions and engagement to establish trust, credibility, and community standing. This system incentivizes quality contributions by rewarding valuable content while discouraging spam or harmful behavior.

### Karma Calculation Methods

WHEN a user's post receives an upvote, THE system SHALL increment the post author's post karma by 1 point.
WHEN a user's post receives a downvote, THE system SHALL decrement the post author's post karma by 1 point.
WHEN a user's comment receives an upvote, THE system SHALL increment the comment author's comment karma by 1 point.
WHEN a user's comment receives a downvote, THE system SHALL decrement the comment author's comment karma by 1 point.
WHEN a user deletes a post that has received upvotes, THE system SHALL reverse all karma points awarded for those upvotes from the post author.
WHEN a user deletes a comment that has received upvotes, THE system SHALL reverse all karma points awarded for those upvotes from the comment author.
THE system SHALL calculate total user karma as the sum of post karma and comment karma.
THE system SHALL update user karma scores in real-time as voting actions occur.

### Post Karma Rules

WHEN a user creates a post, THE system SHALL initialize that post's karma score to 0.
WHEN a user's post receives an upvote, THE system SHALL increment that post's karma score by 1.
WHEN a user's post receives a downvote, THE system SHALL decrement that post's karma score by 1.
WHEN a user deletes their own post, THE system SHALL remove that post's karma score from calculations.
THE system SHALL track post karma separately from comment karma to enable detailed reputation metrics.
THE system SHALL prevent users from voting on their own posts.
WHEN a user attempts to vote on their own post, THE system SHALL reject the vote and return an error.

### Comment Karma Rules

WHEN a user creates a comment, THE system SHALL initialize that comment's karma score to 0.
WHEN a user's comment receives an upvote, THE system SHALL increment that comment's karma score by 1.
WHEN a user's comment receives a downvote, THE system SHALL decrement that comment's karma score by 1.
WHEN a user deletes their own comment, THE system SHALL remove that comment's karma score from calculations.
THE system SHALL track comment karma separately from post karma to enable detailed reputation metrics.
THE system SHALL prevent users from voting on their own comments.
WHEN a user attempts to vote on their own comment, THE system SHALL reject the vote and return an error.

### Karma Display

THE system SHALL display a user's total karma score on their profile page.
THE system SHALL display a user's post karma and comment karma as separate values on their profile page.
THE system SHALL display karma scores next to usernames in community listings.
THE system SHALL display karma scores next to post and comment authors.
WHEN a user's karma score is negative, THE system SHALL display the score in red formatting.
WHEN a user's karma score is positive, THE system SHALL display the score in green formatting.
WHEN a user's karma score is zero, THE system SHALL display the score in neutral gray formatting.

### Karma-Based Privileges

WHERE a user's total karma exceeds 50 points, THE system SHALL grant the privilege to create communities.
WHERE a user's total karma exceeds 100 points, THE system SHALL grant the privilege to flair their posts.
WHERE a user's total karma exceeds 200 points, THE system SHALL grant the privilege to upload images in posts.
WHERE a user's total karma exceeds 500 points, THE system SHALL grant the privilege to moderate small communities (under 1000 members).
WHERE a user's total karma is below -10 points, THE system SHALL restrict posting privileges to once per day.
WHERE a user's total karma is below -50 points, THE system SHALL restrict commenting privileges to once per hour.
WHERE a user's total karma is below -100 points, THE system SHALL automatically place the user in read-only mode for 24 hours.

### Karma Decay

WHEN a user has not participated in the community for 30 consecutive days, THE system SHALL begin karma decay at a rate of 1 point per day.
THE system SHALL pause karma decay if the user returns to active participation.
WHERE a user's karma score reaches 0 through decay, THE system SHALL stop further decay.
THE system SHALL not apply karma decay to users with karma scores over 1000 points.
THE system SHALL send a notification to users when karma decay begins, informing them of the rate and how to prevent further decay.

### Additional Karma System Features

THE system SHALL maintain a karma history log for auditing purposes.
THE system SHALL prevent karma farming through repetitive voting patterns by monitoring for suspicious activity.
WHEN the system detects potential karma manipulation, THE system SHALL flag the activity for moderator review.
THE system SHALL allow moderators to adjust karma scores when correcting voting manipulation incidents.

```mermaid
graph LR
  A["User Registers"] 
  B["User Creates Content"]
  C["Community Interaction"]
  D["Karma Calculation"]
  E["Karma Display"]
  F["Privilege Assignment"]
  G["Karma Decay"]
  
  A -- "Initializes Karma"  B
  B -- "Post Creation"  C
  C -- "Voting Actions"  D
  D -- "Score Updates"  E
  E -- "Threshold Checks"  F
  F -- "Permission Updates"  G