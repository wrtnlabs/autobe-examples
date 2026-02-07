# Communities

## Business Model

### Why This Service Exists

The community platform exists to create decentralized, interest-based discussion spaces where users can share content, build relationships, and participate in meaningful conversations around shared topics. Unlike centralised social media platforms that prioritize engagement at the cost of quality, this system empowers users to create and moderate their own communities, fostering authentic discourse and reducing algorithmic manipulation. The service fills a market gap for user-owned, transparent, and ad-free discussion forums that scale horizontally through organic community growth.

### Revenue Strategy

The service will generate revenue through optional, non-intrusive premium features:
- Custom community branding (advanced icons, banners)
- Analytics dashboards for community owners
- API access for third-party integration
- Premium moderation tools

Revenue will not be derived from advertising, user data sales, or subscription fees for core functionality, preserving the platform's neutrality and trustworthiness.

### Growth Plan

Growth will be driven by:
- Network effects: Communities attract users based on content quality, not artificial promotion
- Organic discovery: Search and feed algorithms surface valuable communities naturally
- User advocacy: Satisfied community owners become evangelists for their niche topics
- Cross-promotion: Communities link to each other through shared interests
- Search engine optimization: High-quality community pages rank well for topic-based searches

### Success Metrics

Key performance indicators include:
- **Community Activation Rate**: Percentage of created communities with at least one post
- **Community Retention Rate**: Percentage of communities with activity over 30 days
- **Average Subscribers per Active Community**: Indicator of community health
- **Search Success Rate**: Percentage of community searches resulting in successful selections
- **Moderation Effectiveness**: Ratio of reported content successfully handled vs. false reports
- **User Retention**: Long-term engagement of users who have subscribed to at least one community

## Community Creation Rules

### Core Creation Requirements

THE system SHALL allow any authenticated member to create a community.

WHEN a member submits a community creation request, THE system SHALL validate that the community name is unique across the platform.

WHEN a member submits a community creation request, THE system SHALL require a community description of at least 10 characters.

WHEN a member submits a community creation request, THE system SHALL require selection or upload of a community icon.

WHEN a member submits a community creation request, THE system SHALL assign the member as the community owner.

WHEN a community is created, THE system SHALL immediately create a record in the communities table with status="active".

WHEN a community is created, THE system SHALL add the creator to the subscribers list of that community.

WHEN a community creation request violates naming rules or contains prohibited content, THE system SHALL return an error message with specific reasons for rejection.

### Naming Constraints

THE community name SHALL consist only of alphanumeric characters and underscores.

THE community name SHALL have a minimum length of 3 characters.

THE community name SHALL have a maximum length of 25 characters.

THE community name SHALL be case-insensitive for comparison purposes.

THE system SHALL normalize community names to lowercase for storage and lookup.

THE system SHALL reject community names that match reserved system terms (e.g., "home", "popular", "search", "admin", "moderator").

### Community Creation Flow

WHEN a member initiates community creation, THE system SHALL display a form with:
- Community name field
- Description text area
- Icon upload or selection interface

WHEN a member submits the creation form, THE system SHALL:
- Validate all fields according to constraints
- Check name uniqueness against existing communities
- Sanitize all input to prevent XSS and injection attacks
- Create community record with auto-generated UUID
- Assign the submitter as owner
- Add the submitter as first subscriber
- Return the created community object with confirmation

IF a community with the requested name already exists, THEN THE system SHALL return error message "Community name already taken".

IF the community name contains invalid characters, THEN THE system SHALL return error message "Community name can only contain letters, numbers, and underscores".

IF the community description is empty or under 10 characters, THEN THE system SHALL return error message "Community description must be at least 10 characters long".

IF the icon upload fails or is not in acceptable format (PNG, JPEG, GIF up to 2MB), THEN THE system SHALL return error message "Icon must be a PNG, JPEG, or GIF file under 2MB".

## Owner Rights

### Ownership Privileges

WHEN a user creates a community, THE system SHALL grant them owner status with full permissions.

THE owner SHALL be able to add other members as moderators.

THE owner SHALL be able to remove any moderator including other owners (though owner removal is disallowed by system design).

THE owner SHALL be able to transfer ownership to any existing moderator.

THE owner SHALL be able to delete the community entirely.

THE owner SHALL be able to edit the community description and icon.

THE owner SHALL be able to view all reports within their community.

THE owner SHALL be able to approve or dismiss any report within their community.

THE owner SHALL be able to view the list of banned users in their community.

THE owner SHALL be able to unban any banned user.

THE owner SHALL be able to ban any user from their community.

THE owner SHALL be able to view the complete history of community actions and moderation events.

### Permission Hierarchy

THE owner SHALL have higher authority than all moderators in their community.

THE owner SHALL be able to revoke moderator status from any user who holds it.

THE owner SHALL be unable to remove themselves as owner (system enforces at least one owner per community).

THE owner SHALL be the only actor capable of transferring ownership to another user.

THE owner SHALL be immune from being banned from their own community.

THE owner SHALL be notified immediately of any reports involving their own content.

WHILE the community is active, THE system SHALL ensure at least one owner exists at all times.

WHEN ownership is transferred, THE system SHALL:
- Remove the previous owner's owner status
- Add the new user's owner status
- Notify both parties via system message
- Maintain all existing moderator relationships
- Preserve community history and settings

## Community Settings

### Default Community Settings

WHEN a new community is created, THE system SHALL set default settings as follows:
- Post visibility: public
- Comment visibility: public
- Subscription requirement for posting: enabled
- Automatic moderation: disabled
- Reporting enabled: enabled
- Avatar type: uploaded
- Default sort order: hot

### Editable Community Settings

THE owner SHALL be able to change the following community settings:
- Community description text
- Community icon image
- Post visibility (public/private)
- Comment visibility (public/private)
- Subscription requirement for posting (enabled/disabled)
- Automatic moderation level (none, suspicious keywords only, strict)
- Reporting status (enabled/disabled)
- Default sort order (hot, new, top, controversial)

WHEN a community setting is changed, THE system SHALL record:
- Timestamp of change
- User who made the change
- Previous value
- New value
- Reason provided (if any)

### System-Managed Settings

THE system SHALL manage the following settings automatically:
- Community creation timestamp
- Last active timestamp
- Subscriber count (calculated in real-time)
- Total posts count
- Total comments count
- Status (active/suspended/delete-requested)
- Community slug (URL-friendly name derived from community name)

## Subscription Requirements

### Subscription Rules

WHEN a user subscribes to a community, THE system SHALL add them to the community's subscriber list.

WHEN a user unsubscribes from a community, THE system SHALL remove them from the community's subscriber list.

WHEN a user attempts to create a post in a community, THE system SHALL verify they are subscribed to that community.

WHEN a user attempts to comment on a post in a community, THE system SHALL verify they are subscribed to that community.

WHEN a user tries to subscribe to an already-subscribed community, THE system SHALL do nothing and return success message "Already subscribed".

WHEN a user tries to unsubscribe from a community they are not subscribed to, THE system SHALL do nothing and return success message "Not subscribed".

WHEN a community is deleted, THE system SHALL automatically unsubscribe all subscribers from that community.

WHEN a user account is deleted, THE system SHALL automatically unsubscribe them from all communities.

WHEN a user is banned from a community, THE system SHALL immediately unsubscribe them from that community.

WHEN a user is unbanned from a community, THE system SHALL not automatically re-subscribe them.

### Subscription Visibility

WHEN a user views their profile, THE system SHALL display a list of all communities they are subscribed to.

WHEN a user views another user's profile, THE system SHALL display a list of the other user's subscribed communities.

WHEN a user searches for communities, THE system SHALL indicate which communities they are subscribed to.

THE system SHALL NOT expose the complete lists of subscribers for any community to non-moderators.

## Community Naming

### Name Validation System

THE system SHALL validate all community names against the following rules:

- Only alphanumeric characters and underscores are permitted
- Minimum 3 characters
- Maximum 25 characters
- Must not match reserved system terms ("home", "popular", "search", "admin", "moderator", "about", "help", "terms", "privacy")
- Must not be empty or contain only whitespace

WHEN a community name violates naming rules, THE system SHALL reject the request with specific error messages:

IF the name is less than 3 characters, THEN THE system SHALL return "Community name must be at least 3 characters long".

IF the name exceeds 25 characters, THEN THE system SHALL return "Community name cannot exceed 25 characters".

IF the name contains invalid characters, THEN THE system SHALL return "Community name can only contain letters, numbers, and underscores".

IF the name matches a reserved term, THEN THE system SHALL return "This name is reserved for system use".

### Normalization Process

THE system SHALL normalize all community names to lowercase before storage and comparison.

THE system SHALL store community names exactly as entered by the user for display purposes (preserving capitalization).

THE system SHALL convert community names to lowercase for all database lookups and uniqueness checks.

WHEN displaying community names in UI elements, THE system SHALL show the original capitalization provided by the creator.

WHEN generating community URL slugs, THE system SHALL use lowercase normalized names.

### Reserved Terms List

THE system SHALL maintain a built-in list of reserved community names:
- "home"
- "popular"
- "search"
- "admin"
- "moderator"
- "about"
- "help"
- "terms"
- "privacy"
- "signup"
- "login"
- "logout"
- "profile"
- "settings"
- "notifications"
- "reports"
- "feedback"
- "contact"
- "faq"
- "status"
- "api"
- "developer"

THE system SHALL allow administrators to extend this list via system configuration.

WHEN adding a new reserved term, THE system SHALL validate it against existing communities and flag any conflicts.

## Icon Usage

### Icon Requirements

WHEN a community icon is uploaded, THE system SHALL accept images in PNG, JPEG, or GIF format.

WHEN a community icon is uploaded, THE system SHALL enforce a maximum file size of 2MB.

WHEN a community icon is uploaded, THE system SHALL validate the file as a valid image type.

THE system SHALL accept uploaded icons of any dimensions.

THE system SHALL generate and store resized versions of icons for different display contexts:
- Profile view: 128x128 pixels
- Feed listing: 64x64 pixels
- Search results: 32x32 pixels
- Mobile display: 48x48 pixels

WHEN a community icon is not uploaded, THE system SHALL generate a default icon based on the community name's first letter.

THE system SHALL store the original uploaded icon for archival and potential restoration.

WHEN a community icon is deleted or changed, THE system SHALL archive the previous icon for 30 days before permanent deletion.

### Icon Display Rules

WHEN displaying a community icon in a feed list, THE system SHALL use the 64x64 pixel version.

WHEN displaying a community icon in search results, THE system SHALL use the 32x32 pixel version.

WHEN displaying a community icon on the community's own page, THE system SHALL use the 128x128 pixel version.

WHEN displaying a community icon on a user's profile, THE system SHALL use the 48x48 pixel version.

THE system SHALL cache all community icons for 24 hours and respect cache headers from the image storage service.

THE system SHALL use appropriate alt text for community icons: "Community icon for 'community_name'"

WHEN an image fails to load, THE system SHALL display the default icon based on the first letter of the community name.

## Search Functionality

### Community Search Requirements

THE system SHALL allow users to search for communities by name.

THE system SHALL return community search results in real-time as the user types (with 300ms debounce).

WHEN a user enters a search query, THE system SHALL match against:
- Community name (primary match)
- Community description (secondary match)

THE system SHALL prioritize search results by:
1. Exact match on community name
2. Partial match starting with query text
3. Partial match containing query text anywhere in name
4. Description matches

THE system SHALL return a maximum of 20 search results per query.

WHEN a user searches for a community name that matches exactly one community, THE system SHALL redirect to that community immediately after search result is chosen.

WHEN a user's search yields no results, THE system SHALL display message "No communities found matching \"[query]\"".

WHEN a user searches for a query less than 3 characters, THE system SHALL show "Type at least 3 characters to search".

### Search Performance Requirements

WHEN searching for communities, THE system SHALL return results within 500ms for 95% of queries.

WHEN searching for communities with 10,000+ registered communities, THE system SHALL return results within 1000ms for 95% of queries.

THE system SHALL use full-text search indexing with proper case normalization for search performance.

THE search index SHALL update within 1 second of any community creation, update, or deletion.

WHEN 100+ concurrent users perform searches simultaneously, THE system SHALL maintain response times below 1000ms for 90% of requests.

### Search User Experience

WHEN search results are displayed, THE system SHALL show for each community:
- Community name
- Description (truncated to 80 characters)
- Subscriber count
- Icon
- "Subscribe" button (if not subscribed)

WHEN a user searches while logged in, THE system SHALL highlight communities they are already subscribed to with a visual indicator.

WHEN a user searches while logged out, THE system SHALL display the same results but without "Subscribe" buttons (or with login prompt).

## Subscriber Count Calculation

### Real-Time Counting

THE system SHALL maintain an accurate, real-time subscriber count for each community.

WHEN a user subscribes to a community, THE system SHALL increment the subscriber count by 1.

WHEN a user unsubscribes from a community, THE system SHALL decrement the subscriber count by 1.

WHEN a user account is deleted, THE system SHALL decrement the subscriber count of all communities they were subscribed to by 1.

WHEN a user is banned from a community, THE system SHALL decrement the subscriber count by 1.

WHEN a community is deleted, THE system SHALL set the subscriber count to 0.

WHEN a new community is created, THE system SHALL initialize the subscriber count to 1 (the creator).

### Count Integrity Checks

THE system SHALL perform daily integrity checks to verify subscriber counts match actual subscription records.

IF discrepancies are found between the stored subscriber count and the actual subscription records, THEN THE system SHALL log the error and automatically correct the count.

IF a community's subscriber count shows negative value, THEN THE system SHALL log a critical error and reset the count to 0.

WHEN a community has 0 subscribers, THE system SHALL not display "0 subscribers" but "No subscribers".

WHEN a community has 1 subscriber, THE system SHALL display "1 subscriber".

WHEN a community has more than 1 subscriber, THE system SHALL display "n subscribers".

### Display Precision

WHEN displaying subscriber counts:
- For 0-999 subscribers: show exact number
- For 1,000-9,999 subscribers: show as "1.0K" (rounded to one decimal)
- For 10,000-99,999 subscribers: show as "10.0K" (rounded to one decimal)
- For 100,000-999,999 subscribers: show as "100K" (rounded to nearest integer)
- For 1,000,000+ subscribers: show as "1M" (rounded to nearest integer)

WHEN displaying subscriber counts in lists, THE system SHALL apply the above formatting rules consistently.

WHEN calculating top communities by subscribers, THE system SHALL sort by raw count (not formatted display values).

### Performance Considerations

THE system SHALL avoid database queries for subscriber counts during high-load scenarios.

THE system SHALL cache subscriber counts in memory for 2 seconds.

THE system SHALL use incremental updates to maintain count accuracy rather than recalculating from subscription records on every view.

WHEN a user views a community page, THE system SHALL render the cached subscriber count immediately while updating the cache in background.

WHEN a user modifies their subscription status (subscribe/unsubscribe), THE system SHALL update the cache immediately and propagate the change to the database asynchronously.

### Data Synchronization

THE system SHALL maintain consistency between the subscriber count and the subscription table.

THE system SHALL queue all subscriber count update operations and process them sequentially when high concurrency is detected.

WHEN multiple subscription/unsubscription events occur simultaneously for the same community, THE system SHALL use atomic operations to prevent race conditions.

WHEN a data replication failure occurs between distributed database nodes, THE system SHALL display the last known correct subscriber count and continue updating.

WHEN the community subscriber count is displayed on the popular feed, THE system SHALL use the same counting mechanism as all other community views.