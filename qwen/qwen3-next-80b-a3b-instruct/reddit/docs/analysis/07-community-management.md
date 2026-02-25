# Community Management Requirements

## Community Creation

### Creation Eligibility
WHEN a member attempts to create a community, THE system SHALL allow the action if the member has completed email verification.
WHEN a guest attempts to create a community, THE system SHALL deny the request and prompt login.
WHEN a member creates a community, THE system SHALL assign them as the community owner automatically.

### Required Information
WHEN creating a community, THE system SHALL require the following information:
- Unique community name (lowercase alphanumeric with dashes, max 50 characters)
- Description text (max 500 characters)
- Optional icon image (JPEG, PNG, up to 5MB)
IF the community name is not unique, THEN THE system SHALL return error code COMMUNITY_NAME_TAKEN.
IF the community name contains invalid characters, THEN THE system SHALL return error code COMMUNITY_NAME_INVALID.

### Ownership Assignment
WHEN a community is successfully created, THE system SHALL:
- Create a new community record with the provided details
- Assign the creator as the owner with full administrative rights
- Add the creator as the first subscriber
- Initialize the subscriber count to 1

## Community Attributes

### Defined Properties
THE community SHALL have the following immutable and mutable attributes:
- communityId (unique identifier)
- name (unique, immutable after creation)
- description (mutable)
- iconUrl (immutable unless explicitly updated)
- ownerId (immutable)
- createdDate (immutable)
- subscriberCount (mutable)
- isPublic (always true)

### Name Uniqueness
THE system SHALL enforce unique community names across the entire platform.
WHEN a community name is changed during editing, THE system SHALL validate uniqueness before saving.
IF a claimed community name conflicts with an existing community, THEN THE system SHALL reject the update and return COMMUNITY_NAME_TAKEN.

### Description and Icon
WHILE a community exists, THE system SHALL allow the owner to update the description and icon.
THE system SHALL store the icon as a public URL accessible to all users.
IF no icon is uploaded, THE system SHALL use a default placeholder derived from the community name.

## Subscription Rules

### Subscription Requirement for Posting
WHEN a member attempts to create a post in a community, THE system SHALL verify that the member is subscribed to that community.
IF the member is not subscribed to the target community, THEN THE system SHALL deny the post creation and return error code NOT_SUBSCRIBED_TO_COMMUNITY.

### Subscription Process
WHEN a member clicks "Subscribe", THE system SHALL:
- Add the member to the community's subscriber list
- Increment the community's subscriberCount by 1
- Add the community to the member's subscription list

WHEN a member clicks "Unsubscribe", THE system SHALL:
- Remove the member from the community's subscriber list
- Decrement the community's subscriberCount by 1
- Remove the community from the member's subscription list

### Access Control During Subscription
WHILE a user is subscribed to a community, THE system SHALL grant the following permissions:
- Create posts in the community
- Comment on posts in the community
- Vote on posts and comments in the community
- View all content in the community

WHILE a user is not subscribed to a community, THE system SHALL allow:
- Viewing the community page
- Viewing community posts and comments
- Reading all public content
- Browsing the community list
BUT SHALL deny:
- Creating posts
- Creating comments
- Voting

## Discovery and Search

### Community Discovery
THE system SHALL provide a community directory that displays:
- All communities ordered alphabetically by name
- Search functionality by community name
- Filter option for "Popular" communities (top 100 by subscriber count)
- Filter option for "New" communities (created in last 7 days)

### Search Functionality
WHEN a user enters text in the search field, THE system SHALL:
- Return communities where the name contains the search term (case-insensitive)
- Rank results by matching prefix, then substring relevance
- Limit results to 100 matches
- Include the subscriber count alongside each result
- Display "No communities found" if no matches exist

### Community Listing
WHEN viewing the community directory, THE system SHALL display for each community:
- Community name
- Description preview (first 150 characters)
- Icon image
- Subscriber count
- Creation date
- Owner username
- "Subscribe" button (if not already subscribed)
- "View" button (to open community feed)

## Subscriber Count Management

### Calculation Rule
THE subscriberCount SHALL be calculated as the total number of users currently subscribed to the community.
THE subscriberCount SHALL not include guests or banned users.

### Updates and Timing
WHEN a user subscribes, THE system SHALL increment the subscriberCount immediately.
WHEN a user unsubscribes, THE system SHALL decrement the subscriberCount immediately.
WHEN a user is banned from a community, THE system SHALL remove them from subscriber count.
WHEN a user is unbanned, THE system SHALL re-add them to subscriber count if their subscription state was active.

### Display Scope
THE subscriberCount SHALL be displayed:
- On the community's main page
- In the community directory listing
- In community search results
- Inside the feed listing for each community-tagged post

### Caching Strategy
THE system SHALL cache the subscriberCount for 5 seconds to improve performance.
WHEN a subscription action occurs, THE cache SHALL be invalidated and refreshed immediately.


> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*