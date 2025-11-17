# Business Rules Document for redditCommunity

## Introduction and Scope
This document provides comprehensive and unambiguous business rules for the redditCommunity platform. It specifies all necessary logic for voting mechanisms, karma calculations, content visibility controls, subscription management, and reporting and moderation procedures. These rules are foundational for backend implementation and must be adhered to strictly to ensure consistent and fair community operations.

## Voting Logic

### Overview
Voting is a core interaction where registered users express approval or disapproval of content through upvotes and downvotes. Votes affect content ranking and user karma.

### Functional Requirements

- WHEN a registeredUser casts an upvote on a post or comment, THE system SHALL increment the vote count for that content immediately and recalculate associated scores within 1 second.
- WHEN a registeredUser casts a downvote on a post or comment, THE system SHALL decrement the vote count for that content immediately and recalculate associated scores within 1 second.
- IF a registeredUser attempts to vote more than once on the same post or comment, THEN THE system SHALL reject the subsequent vote and return a specific error message "DUPLICATE_VOTE" with HTTP status 409.
- WHEN a guest attempts to vote, THE system SHALL deny the operation and respond with HTTP status 401 prompting user login.

### Error Handling

- IF vote action fails due to system error, THEN THE system SHALL log the failure and notify the user with a generic error message.

### Performance Requirements

- THE vote update operation SHALL complete within 2 seconds.

### Mermaid Diagram

```mermaid
graph LR
  A["User Requests to Vote"] --> B{"Is User a registeredUser?"}
  B --|"No"| C["Deny Vote, Request Login"]
  B --|"Yes"| D{"Has User Already Voted?"}
  D --|"Yes"| E["Reject Duplicate Vote"]
  D --|"No"| F["Process Vote, Update Counts"]
  F --> G["Recalculate Scores"]
  G --> H["Confirm Vote"]
```

## Karma Calculation

### Overview
Karma reflects user reputation based on community voting activity. It incentivizes quality contributions.

### Functional Requirements

- WHEN a post receives an upvote, THE system SHALL add 10 karma points to the post author’s total immediately.
- WHEN a post receives a downvote, THE system SHALL subtract 2 karma points from the post author’s total immediately.
- WHEN a comment receives an upvote, THE system SHALL add 5 karma points to the comment author’s total immediately.
- WHEN a comment receives a downvote, THE system SHALL subtract 1 karma point from the comment author’s total immediately.
- WHEN a user’s karma changes, THE system SHALL update the user’s profile karma score in real-time for display.

### Error Handling

- IF karma update fails, THEN THE system SHALL retry the operation up to 3 times, logging failures.

### Performance Requirements

- Karma updates SHALL be reflected within 2 seconds of vote action.

## Content Visibility Rules

### Overview
Content visibility determines which posts and comments users can see and the order in which they appear.

### Functional Requirements

- WHEN a user views posts in any community, THE system SHALL provide sorting options by hot, new, top, and controversial posts.
- WHILE a post is under active report review, THE system SHALL hide the post and its comments from all users except moderators and admins.
- WHEN a post or comment is deleted by moderators or admins, THE system SHALL remove it from all public listings immediately.
- WHEN a user subscribes to a community and views the community feed, THE system SHALL prioritize that user’s subscribed communities posts in ordering and display.

### Error Handling

- IF content cannot be retrieved, THEN THE system SHALL notify the user with an informative error message.

### Performance Requirements

- Content retrieval and sorting SHALL respond within 3 seconds under normal load.

## Subscription Rules

### Overview
Subscription allows users to follow communities and receive updates.

### Functional Requirements

- WHEN a registeredUser subscribes to a community, THE system SHALL add the community identifier to the user’s subscription list without duplication.
- WHEN a registeredUser unsubscribes from a community, THE system SHALL remove the community from the user’s subscription list.
- IF a user attempts to unsubscribe from a community they are not subscribed to, THEN THE system SHALL return an error code "NOT_SUBSCRIBED" with HTTP status 400.

### Error Handling

- Errors in subscription management SHALL be logged and users notified with clear messages.

## Reporting and Moderation Rules

### Overview
Reporting and moderation ensure content compliance and community standards.

### Functional Requirements

- WHEN a registeredUser submits a report on a post or comment, THE system SHALL log the report with details and notify community moderators within 1 minute.
- WHEN moderators review reports, THE system SHALL allow actions to dismiss, delete content, or escalate to admins.
- WHEN content is deleted through moderation, THE system SHALL send a notification to the original content author explaining the deletion.
- IF a user abuses reporting (e.g., submits excessive false reports), THEN THE system SHALL track abuse and limit the user’s ability to report further content.

### Error Handling

- Failed report processing SHALL retry up to 3 times and alert admins if unresolved.

### Performance Requirements

- Reporting actions SHALL be processed and logged within 5 seconds.

### Mermaid Diagram

```mermaid
graph LR
  A["User Submits Report"] --> B["System Logs Report"]
  B --> C["Notify Moderators"]
  C --> D{"Moderator Review"}
  D --|"Dismiss"| E["Close Report"]
  D --|"Delete Content"| F["Remove Content, Notify Author"]
  D --|"Escalate"| G["Notify Admins"]
```

---

This document provides business requirements only. All technical implementation decisions belong to the developers. Developers have full autonomy over architecture, APIs, and database design. This document describes WHAT the system should do, not HOW to build it.