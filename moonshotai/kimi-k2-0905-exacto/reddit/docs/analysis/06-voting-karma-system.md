# Voting and Karma System Requirements

## Voting System Overview

The Reddit-like community platform implements a comprehensive voting system that enables users to express their opinions on content through upvotes and downvotes. This system drives content ranking, user reputation through karma, and overall community engagement. The voting mechanism serves as the primary method for content curation and quality control across all communities on the platform.

### Core Voting Principles

THE voting system SHALL enable users to cast upvotes and downvotes on posts and comments within communities they have access to. THE system SHALL calculate karma scores based on voting activity and display these scores publicly. THE voting mechanism SHALL prevent abuse through rate limiting and user restrictions based on account age and karma levels.

WHEN a visitor browses the platform, THE system SHALL display voting buttons but disable voting functionality. WHEN a member is authenticated, THE system SHALL allow voting on posts and comments in public communities. WHEN a member has joined a private community, THE system SHALL extend voting privileges for content within that community.

WHILE a communityModerator manages their community, THE system SHALL preserve their voting rights as regular members. WHEN a platformModerator reviews content, THE system SHALL maintain their ability to vote normally to avoid detection.

## Upvote/Downvote Logic

### Vote Casting Process

WHEN a member clicks the upvote button on a post or comment, THE system SHALL record one positive vote for that content. WHEN a member clicks the downvote button on a post or comment, THE system SHALL record one negative vote for that content. THE system SHALL immediately update the displayed vote count after recording each vote.

IF a member attempts to vote on their own content, THEN THE system SHALL reject the vote and display an appropriate error message indicating that users cannot vote on their own posts or comments. THE error message SHALL state "You cannot vote on your own content" and remain visible for 3 seconds.

### Vote Modification and Removal

WHEN a member clicks the same vote button twice, THE system SHALL remove their existing vote and reset the button to unvoted state. WHEN a member clicks the opposite vote button after already voting, THE system SHALL change their vote to the new selection and update vote counts accordingly.

THE system SHALL maintain a complete history of all votes cast by each user, including timestamp, content ID, vote direction, and current status. THE vote history SHALL be accessible to users through their profile settings but not publicly visible to other users.

### Anti-Abuse Measures

THE system SHALL implement rate limiting to prevent vote manipulation, allowing a maximum of 30 votes per minute per user account. IF a user exceeds this limit, THEN THE system SHALL temporarily disable voting for 5 minutes and display a warning message about voting too quickly.

WHEN detecting suspicious voting patterns, THE system SHALL flag accounts for review by platformModerators. Suspicious patterns include rapid consecutive voting on content from the same user, voting on ancient content suddenly, or coordinated voting from multiple accounts sharing IP addresses.

## Karma Calculation Algorithm

### Post Karma Calculation

THE system SHALL calculate post karma using the formula: (upvotes - downvotes) with additional factors for engagement quality. WHEN a post receives its first 10 upvotes within the first hour of posting, THE system SHALL apply a 1.2x multiplier to subsequent votes for the next 6 hours to reward timely, engaging content.

IF a post reaches the front page of a community or the main front page, THEN THE system SHALL apply a logarithmic scaling function to prevent karma inflation from viral content. THE scaling SHALL reduce the karma impact of each additional vote as total votes increase, ensuring no single post can generate excessive karma.

### Comment Karma Calculation

THE system SHALL calculate comment karma more conservatively than post karma to encourage thoughtful discussion over simple agreement. WHEN a comment receives upvotes, THE system SHALL award full karma value. WHEN a comment receives downvotes, THE system SHALL apply a 0.5x penalty to discourage downvote brigades.

THE system SHALL track comment thread depth and apply slight karma multipliers for high-quality nested comments. Comments at depth 3 or greater that receive net positive votes SHALL receive a 1.1x multiplier to reward meaningful deep discussion participation.

### Karma Aging and Decay

THE system SHALL implement karma decay where votes on content older than 6 months contribute only 50% to the recipient's karma score. Votes on content older than 1 year contribute only 25% to karma calculations. THE decay mechanism SHALL prevent users from accumulating excessive karma from ancient popular content.

WHILE calculating total user karma, THE system SHALL apply time-based weighting that favors recent contributions. Karma earned in the past 30 days counts at full value, karma from 31-90 days ago counts at 90% value, and karma decreases by 10% for each subsequent 30-day period.

## Karma Display

### Public Karma Visibility

THE system SHALL display user karma totals prominently on user profiles, showing both post karma and comment karma separately. THE total karma SHALL be calculated as the sum of all post karma plus all comment karma earned by the user across all communities and time periods.

WHEN displaying karma information, THE system SHALL show the breakdown between post karma and comment karma to provide transparency about user contribution types. THE system SHALL also display the user's account age and join date to provide context for karma accumulation rate.

### Karma History and Trends

THE system SHALL maintain detailed karma history tracking daily karma changes for each user. THE karma history SHALL include the source of each karma change (post ID, comment ID, vote direction, timestamp) and be accessible through the user dashboard for personal review.

THE system SHALL generate karma trend graphs showing weekly and monthly karma accumulation patterns. THE trending data SHALL help users understand their contribution patterns and identify their most successful content types and posting times.

### Community-Specific Karma

THE system SHALL track karma earned within individual communities separately from overall platform karma. WHEN viewing a user's profile from within a specific community, THE system SHALL display that user's karma specifically earned within that community context alongside their total platform karma.

THE community-specific karma SHALL include both post and comment karma earned from content posted in that community, regardless of where the voting occurred. THE system SHALL use this data to identify active community members and potential community moderator candidates.

## Voting Restrictions

### Account-Based Restrictions

THE system SHALL prevent newly created accounts from voting until they have verified their email address and their account is at least 24 hours old. WHEN an unverified account attempts to vote, THE system SHALL display a message prompting email verification and explaining the 24-hour waiting period.

THE system SHALL implement escalating voting restrictions for users with negative karma balances. WHEN a user has -50 or lower karma, THE system SHALL limit them to 10 votes per day. WHEN a user has -100 or lower karma, THE system SHALL suspend their voting privileges and require moderator review for account restoration.

### Community-Specific Voting Rules

THE system SHALL allow communityModerators to set minimum karma requirements for voting within their communities. WHEN a community has minimum karma requirements, THE system SHALL check user karma before allowing votes and display appropriate messages to users who don't meet requirements.

THE system SHALL support community-specific voting restrictions including minimum account age, minimum community karma, and content type limitations. THE communityModerator MUST be able to configure these restrictions through community settings with changes taking effect immediately.

### Time-Based Voting Limitations

THE system SHALL implement cooling-off periods between votes from the same user on content from the same author. WHEN a user votes on multiple posts or comments from the same author within a 10-minute window, THE system SHALL introduce progressively longer delays between vote acceptances to prevent targeted harassment.

THE system SHALL track and limit the rate at which users can vote on archived content (content older than 6 months). WHEN voting on archived content, THE system SHALL allow only 5 such votes per day per user to prevent manipulation of historical content rankings.

## Karma Impact

### User Privilege System

THE system SHALL gate certain platform features behind karma requirements to ensure quality participation. WHEN a user has less than 10 karma, THE system SHALL limit them to creating 3 posts and 10 comments per day. WHEN a user reaches 100 karma, THE system SHALL remove daily posting limits and enable community creation privileges.

THE system SHALL use karma as a factor in content ranking algorithms, where users with higher karma have slightly increased visibility for their new content. THE karma influence SHALL be subtle enough to prevent gaming while rewarding consistent quality contributors with better initial content exposure.

### Community Participation Requirements

THE system SHALL allow communities to set minimum karma thresholds for posting and commenting. WHEN a user attempts to post or comment in a community with karma requirements they don't meet, THE system SHALL display a clear message explaining the requirement and suggesting participation in other communities to build karma.

THE system SHALL track community-specific karma and allow communities to base participation requirements on either total platform karma or karma earned specifically within that community. THE communityModerator SHALL have the flexibility to choose which karma calculation method applies to their community restrictions.

### Reputation and Trust System

THE system SHALL incorporate karma into a broader reputation system that affects content moderation and spam filtering. WHEN a user has consistently high karma over extended periods, THE system SHALL apply reduced spam filtering to their content and faster approval for moderated submissions.

THE system SHALL use karma trends to identify potential quality contributors for community moderator recommendations. WHEN a user demonstrates consistent positive karma growth and community engagement, THE system SHALL suggest them as potential moderators to existing communityModerators, with final approval remaining a human decision.