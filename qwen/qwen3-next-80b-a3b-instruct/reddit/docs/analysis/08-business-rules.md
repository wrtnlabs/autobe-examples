```md
# Business Rules and Operational Constraints

This document defines the complete set of business rules, validation logic, and operational constraints governing the community platform. These rules determine how the system behaves under all user interactions and edge cases. This document is implementation-ready and must be followed exactly by backend developers. All requirements are written in natural language using EARS syntax where applicable.

## Content Validation Rules

### Text Post Validation
- WHEN a member submits a text post, THE system SHALL require the post title to contain at least 5 characters and not exceed 300 characters. 
- WHEN a member submits a text post, THE system SHALL require the content body to contain at least 10 characters and not exceed 10,000 characters. 
- WHEN a member submits a text post with only whitespace or non-printable characters, THE system SHALL reject the post and return error code POST_INVALID_CONTENT. 
- WHEN a member submits a text post containing more than 15 consecutive URLs, THE system SHALL reject the post and return error code POST_SPAM_SUSPECTED. 

### Link Post Validation
- WHEN a member submits a link post, THE system SHALL require the URL field to contain a valid, fully-qualified HTTP or HTTPS URI (e.g., https://example.com). 
- WHEN a member submits a link post with a malformed URL (missing protocol, invalid domain, or invalid characters), THE system SHALL reject the post and return error code POST_INVALID_URL. 
- WHEN a member submits a link post to a domain blacklisted by the platform (e.g., known malware or spam domains), THE system SHALL reject the post and return error code POST_BLACKLISTED_DOMAIN. 
- WHEN a member submits a link post, THE system SHALL extract the page title automatically if the URL is reachable and returns HTTP 200, and populate the post title field with it if the member leaves the title field empty. 

### Image Post Validation
- WHEN a member submits an image post, THE system SHALL require the uploaded file to be one of the following formats: JPG, JPEG, PNG, GIF, WEBP. 
- WHEN a member submits an image post, THE system SHALL require the file size to be no more than 10MB. 
- WHEN a member submits an image post with a file size less than 1KB, THE system SHALL reject the post and return error code POST_IMAGE_TOO_SMALL. 
- WHEN a member submits an image post that is corrupted, incomplete, or cannot be decoded, THE system SHALL reject the post and return error code POST_CORRUPTED_IMAGE. 
- WHEN a member submits an image post, THE system SHALL generate and store a 320x320px thumbnail to optimize feed loading performance. 

### Post Title Uniqueness Constraint
- WHERE a member attempts to create a post with a title identical to another post in the same community within the last 60 minutes, THE system SHALL prevent duplicate posting and return error code POST_DUPLICATE_TITLE. 

## Voting Logic Constraints

### Generic Voting Rules
- WHEN a member attempts to upvote or downvote a post or comment, THE system SHALL record the vote only if the member is authenticated and has not previously voted on that item. 
- WHEN a member attempts to upvote or downvote a post or comment they authored, THE system SHALL reject the vote and return error code VOTE_ON_OWN_CONTENT. 
- WHEN a member changes their vote on a post or comment (e.g., from upvote to downvote), THE system SHALL subtract the previous vote and add the new vote, updating the total score immediately. 
- WHEN a guest attempts to vote on a post or comment, THE system SHALL deny access, show a login prompt, and return error code VOTE_AUTH_REQUIRED. 

### Vote Counting Rules
- THE system SHALL calculate the net score of a post or comment as: total upvotes minus total downvotes. 
- THE system SHALL display only the net score to all users (e.g., +15, -3, 0). 
- THE system SHALL NOT display the individual number of upvotes and downvotes unless requested by a moderator or admin. 

### Voting Rate Limiting
- WHILE a member is interacting, THE system SHALL allow no more than 20 vote operations per minute. 
- IF a member exceeds 20 vote operations in 60 seconds, THE system SHALL block further voting for 60 seconds and return error code VOTE_RATE_LIMIT_EXCEEDED. 
- IF a member exceeds 50 vote operations in 5 minutes, THE system SHALL temporarily restrict voting privileges for 2 hours and flag the account for review. 

## Comment Nesting Rules

### Depth Limit
- WHEN a member replies to a comment, THE system SHALL allow comment nesting up to a maximum depth of 5 levels. 
- IF a member attempts to reply to a comment at level 5, THE system SHALL display "This comment cannot be replied to." and prevent submission. 

### Reply Limits
- WHILE a comment thread is growing, THE system SHALL allow up to 500 direct replies to a single parent comment. 
- WHEN a parent comment reaches 500 direct replies, THE system SHALL lock the comment from further direct replies and display: "This thread has reached its maximum replies. Reply to individual comments to continue discussion." 
- THE system SHALL allow users to reply to replies outside the 500-reply limit (e.g., replies to child comments) to preserve discussion flow. 

### Comment Content Validation
- WHEN a member submits a comment, THE system SHALL require the comment to contain at least 1 character and not exceed 2,000 characters. 
- WHEN a member submits a comment containing only whitespace or non-printable characters, THE system SHALL reject the comment and return error code COMMENT_INVALID_CONTENT. 
- WHEN a member submits a comment with more than 7 valid URLs, THE system SHALL flag the comment as spam and require moderator review before display. 

## Karma Calculation Rules

### Karma Earning Rules
- WHEN a member's post receives an upvote, THE system SHALL add 1 karma point to the member's total karma. 
- WHEN a member's post receives a downvote, THE system SHALL subtract 1 karma point from the member's total karma. 
- WHEN a member's comment receives an upvote, THE system SHALL add 0.5 karma point to the member's total karma. 
- WHEN a member's comment receives a downvote, THE system SHALL subtract 0.5 karma point from the member's total karma. 
- WHEN a member's post or comment is reported and confirmed as violating policy by a moderator or admin, THE system SHALL deduct 5 karma points from the member's total karma. 

### Karma Penalty Rules
- IF a member's account is suspended for posting spam or inappropriate content, THE system SHALL deduct 50 karma points as a penalty. 
- IF a member's account is permanently banned from the platform, THE system SHALL reset the member's karma to zero and freeze historical karma data. 
- IF a member's karma score drops below -100, THE system SHALL restrict the member's posting and commenting privileges until karma rises above -50. 

### Karma Display Rules
- THE system SHALL display the user's total karma as a whole number rounded to the nearest integer. 
- THE system SHALL NOT display the breakdown of karma from posts versus comments. 
- WHERE a user's karma is 100 or higher, THE system SHALL display a badge next to their username: "High Karma". 
- WHERE a user's karma is 1,000 or higher, THE system SHALL display a badge next to their username: "Trusted Member". 
- WHERE a user's karma is 5,000 or higher, THE system SHALL display a badge next to their username: "Community Veteran". 

### Karma Influence on Moderation
- WHERE a member’s karma is 500 or higher, THE system SHALL permit the member to unlock comment moderation options: 
  - HIDE comments they consider low-quality (visibility restricted to author only) 
  - FLAG comments for review by moderators (not directly modifiable) 
- WHERE a member’s karma is 1,000 or higher, THE system SHALL allow the member to access a feedback form to suggest moderators for their favorite communities. 

### Karma Decay Policy
- WHILE a user has not logged in for 180 days, THE system SHALL reduce their karma by 20%. 
- IF a user logs in before the 180-day window expires, THE karma decay shall be reset. 
- Karma decay shall not reduce karma below 0. 

## Sorting Algorithm Logic

### New (Recent) Sorting
- THE system SHALL sort posts by creation timestamp in descending order (newest first). 
- THE system SHALL use the exact date-time the post was created as the sole sorting criterion. 
- THE system SHALL include all posts regardless of vote count or community. 

### Top (Highly Upvoted) Sorting
- THE system SHALL sort posts by net score (upvotes minus downvotes) in descending order. 
- THE system SHALL include only posts with a net score of 5 or higher. 
- THE system SHALL exclude posts older than 30 days from top lists. 

### Hot (Trending) Sorting
- THE system SHALL calculate a "hot score" using the following formula: 
  hot_score = log10(max(|net_score|, 1)) + (post_age_hours / 4.5) 
- post_age_hours = time elapsed since post creation in hours 
- log10 is the base-10 logarithm function
- The system SHALL sort posts by hot_score in descending order. 
- THE system SHALL recalculate hot scores every 5 minutes. 
- THE system SHALL exclude posts older than 48 hours from the hot list. 
- THE system SHALL treat downvotes as mild penalties: each downvote reduces the hot_score by 0.1. 

### Controversial (High Upvotes + High Downvotes) Sorting
- THE system SHALL calculate a controversy score using the following formula:
  controversy_score = min(upvotes, downvotes) / (1 + abs(upvotes - downvotes)) 
- The system SHALL sort posts by controversy_score in descending order. 
- THE system SHALL include only posts that have at least 20 total votes (upvotes + downvotes). 
- THE system SHALL exclude posts older than 14 days from the controversial list. 

### Runtime Performance Requirements
- THE system SHALL return sorted post lists within 200 milliseconds on average for queries of 20 posts. 
- THE system SHALL initialize and cache top 100 posts for each category (new, hot, top, controversial) using a rolling window flush every 5 minutes. 
- THE system SHALL serve cached results for anonymous users during high-traffic periods to ensure consistent latency. 

## Subscription Behavior Rules

### Subscribe Mechanism
- WHEN a member clicks "Subscribe" on a community, THE system SHALL add the community to their subscription list and increase the community's subscriber count by 1. 
- WHEN a member clicks "Unsubscribe" on a community, THE system SHALL remove the community from their subscription list and decrease the community's subscriber count by 1. 
- WHEN a member subscribes to a community, THE system SHALL automatically trigger their feed to include 3 new posts from that community on their homepage within 10 seconds. 

### Subscription Limits
- THE system SHALL allow a member to subscribe to a maximum of 500 communities. 
- IF a member attempts to subscribe to the 501st community, THE system SHALL prevent subscription and display: "You have reached the maximum of 500 subscribed communities. Unsubscribe from one to add another." 

### Subscription Display
- ON user profile page, THE system SHALL list subscribed communities in order of most recently subscribed (most recent at top). 
- ON community page, THE system SHALL display: "X subscribers" where X is an exact count (not rounded). 

## Reporting and Moderation Workflow Rules

### Reporting Triggers
- WHEN a member selects "Report" on a post or comment, THE system SHALL provide four options: 
  - "Spam or irrelevant" 
  - "Sexually explicit" 
  - "Hate speech or harassment" 
  - "Other" (with optional text explanation) 
- WHEN a member selects "Other" as a reason, THE system SHALL require a minimum of 10 characters of explanatory text. 

### Report Submission Workflow
- WHEN a report is submitted, THE system SHALL: 
  - Record the reporter’s user ID 
  - Record the target object (post or comment) and its ID 
  - Record the selected reason code 
  - Record the timestamp of report 
  - Assign a unique report ID 
  - Store the report in an unprocessed queue 

### Report Prioritization and Escalation
- IF a post or comment receives 3 or more reports from different users within 30 minutes, THE system SHALL immediately escalate for review by a moderator in that community. 
- IF a post or comment receives 10 or more reports from different users within 24 hours, THE system SHALL automatically remove the content and notify the poster. 
- IF a post or comment is reported by an admin, THE system SHALL treat the report as critical and route it to all active admins immediately. 

### Moderator Action Rules
- WHEN a moderator confirms a report as valid, THE system SHALL: 
  - Remove the content from public view 
  - Lock the post/comment from further interaction 
  - Issue a notification to the content creator: "Your content was removed for violating community guidelines." 
  - Deduct karma from the content creator based on severity (2–10 points) 
  - Log reason and moderator action in the audit trail 

### Moderator Override Rules
- WHERE a moderator removes content, THE system SHALL allow the original poster to appeal within 7 days. 
- WHEN an appeal is made, THE system SHALL: 
  - Notify all active admins via push notification 
  - Retain the removed content privately for review 
  - Suspend further moderation on the post until appeal is resolved 
- IF an admin upholds the removal, THE system SHALL close the appeal and notify the member. 
- IF an admin overturns the removal, THE system SHALL restore the content to its original visibility and remove the karma penalty. 

### Report Processing SLA
- THE system SHALL process 90% of all reports within 4 hours of submission. 
- THE system SHALL process reports flagged as "hate speech" or "sexually explicit" within 1 hour. 

## Error Handling and Recovery Rules

### Malformed Input Handling
- IF a request contains invalid JSON or malformed parameters, THE system SHALL return HTTP 400 with error code REQUEST_INVALID_FORMAT. 
- IF a POST request body exceeds 1MB in size, THE system SHALL return HTTP 413 with error code REQUEST_TOO_LARGE. 
- IF a user submits a request with an expired or invalid JWT token, THE system SHALL return HTTP 401 with error code AUTH_TOKEN_INVALID. 

### Service Outage Recovery
- IF a database connection fails during a write operation, THE system SHALL: 
  - Return HTTP 503 with error code SERVICE_TEMPORARILY_UNAVAILABLE 
  - Queue the write operation for retry within 5 seconds 
  - Retry up to 3 times before giving up 
- IF all retries fail, THE system SHALL log the failed operation and notify admin team via internal alert. 
- IF user attempts to view content during outage, THE system SHALL display: "We're experiencing technical difficulties. Our team is working to restore service. Please try again soon." 

### Session Recovery
- WHEN a user’s session expires unexpectedly, THE system SHALL redirect to login page with message: "Your session has expired. Please log in again to continue." 
- THE system SHALL preserve the user’s intended destination (e.g., post URL or comment reply form) and redirect them there after successful re-login. 

### Vote Deletion Recovery
- IF a vote is deleted (e.g., when user deletes their account), THE system SHALL update the post/comment score immediately to reflect the loss. 
- THE system SHALL NOT revert or remove historical vote records — only the score is recalcuated. 

### Content Visibility Recovery
- IF content is removed as a result of moderation and later restored via appeal, THE system SHALL restore all upvotes/downvotes and comment threads associated with the content. 
- THE system SHALL not restore the karma penalties applied to the author upon removal if the appeal is upheld. 

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*
```