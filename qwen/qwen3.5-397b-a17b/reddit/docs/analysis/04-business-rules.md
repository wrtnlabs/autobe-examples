**redditCommunity — Data isolation, business rules, filtering/sorting/pagination, error catalog**

Data isolation, business rules, filtering/sorting/pagination, error catalog

# Data Isolation and Ownership

Data ownership rules and tenant/user-level isolation policies.

## Ownership and Isolation Rules

Define data ownership semantics and isolation boundaries for multi-user access.

### Content Ownership

THE system SHALL assign ownership of a community to the user who creates it.

THE system SHALL assign ownership of a post to the user who creates it.

THE system SHALL assign ownership of a comment to the user who creates it.

THE system SHALL allow only the owner of a community to add or remove moderators.

THE system SHALL allow only the owner of a post to edit or delete that post.

THE system SHALL allow only the owner of a comment to edit or delete that comment.

THE system SHALL allow moderators to delete any post within their community regardless of ownership.

THE system SHALL allow moderators to delete any comment within their community regardless of ownership.

WHEN a user deletes their account, THE system SHALL delete all posts owned by that user.

WHEN a user deletes their account, THE system SHALL delete all comments owned by that user.

WHEN a user deletes their account, THE system SHALL transfer or remove their community ownership.

### Data Isolation Boundaries

THE system SHALL make all community information visible to all users including guests.

THE system SHALL make all posts visible to all users including guests.

THE system SHALL make all comments visible to all users including guests.

THE system SHALL restrict the home feed to authenticated users only.

THE system SHALL make the popular feed available to all users including guests.

THE system SHALL make community feeds available to all users including guests.

THE system SHALL hide user email addresses from all other users.

THE system SHALL display only the username and profile information of users to other users.

WHILE a user is banned from a community, THE system SHALL allow them to view content in that community.

THE system SHALL isolate each community's moderator actions to that community only.

### Multi-User Access Control

THE system SHALL allow multiple users to subscribe to the same community.

THE system SHALL allow multiple users to vote on the same post.

THE system SHALL allow multiple users to vote on the same comment.

THE system SHALL restrict each user to one vote per post.

THE system SHALL restrict each user to one vote per comment.

THE system SHALL allow multiple users to comment on the same post.

THE system SHALL allow multiple users to report the same content.

WHEN multiple users vote on the same post, THE system SHALL calculate the vote score as total upvotes minus total downvotes.

WHEN multiple users subscribe to a community, THE system SHALL increment the subscriber count accordingly.

THE system SHALL allow moderators to view all reports filed within their community.

### Community-Level Isolation

THE system SHALL restrict post creation to users subscribed to that community.

THE system SHALL restrict comment creation in a community for users banned from that community.

THE system SHALL restrict post creation in a community for users banned from that community.

THE system SHALL allow banned users to view all content within the community they are banned from.

THE system SHALL isolate ban enforcement to the specific community where the ban was issued.

THE system SHALL allow a user banned from one community to participate in other communities.

THE system SHALL isolate subscription status to each individual community.

THE system SHALL allow users to view their list of subscribed communities.

WHEN a user unsubscribes from a community, THE system SHALL remove that community from their home feed.

THE system SHALL isolate moderator permissions to communities where the user has moderator status.

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

Users sign up with email and password, choosing a unique username that identifies them on the platform. Email addresses must be unique among all active accounts to prevent duplicate registrations. Users log in using their email and password combination. Users can change their password at any time to maintain account security. Users can delete their account permanently, which also removes all posts and comments they have created across the platform. Username selection is permanent and cannot be changed after account creation. Account deletion cascades to all user-generated content, removing posts and comments from public view. Each user maintains a single account tied to one email address.

### User Registration Flow

WHEN a user registers for an account, THE system SHALL require an email address.

WHEN a user registers for an account, THE system SHALL require a password.

WHEN a user registers for an account, THE system SHALL require a username selection.

IF the provided email address already belongs to an existing account, THE system SHALL reject the registration.

IF the provided username already belongs to an existing account, THE system SHALL reject the registration.

THE system SHALL ensure that each email address is associated with only one active account.

THE system SHALL ensure that each username is unique across all accounts.

WHEN registration is successful, THE system SHALL create a new user account with the provided credentials.

IF the email address is invalid or improperly formatted, THE system SHALL reject the registration.

IF the password does not meet security requirements, THE system SHALL reject the registration.

IF the username contains invalid characters or violates naming conventions, THE system SHALL reject the registration.

### Login Credential Validation

WHEN a user attempts to log in, THE system SHALL require an email address.

WHEN a user attempts to log in, THE system SHALL require a password.

WHEN a user submits login credentials, THE system SHALL validate that the email exists in the system.

WHEN a user submits login credentials, THE system SHALL validate that the password matches the stored credentials for that email.

IF the email address does not exist in the system, THE system SHALL reject the login attempt.

IF the password does not match the stored credentials, THE system SHALL reject the login attempt.

IF the login credentials are valid, THE system SHALL grant access to the user account.

THE system SHALL treat email and password combinations as case-sensitive for security purposes.

### Password Change Capability

WHEN an authenticated user requests to change their password, THE system SHALL allow the password change.

WHEN a user changes their password, THE system SHALL require verification of the current password.

IF the current password provided does not match the stored credentials, THE system SHALL reject the password change request.

IF the new password does not meet security requirements, THE system SHALL reject the password change request.

WHEN a password change is successful, THE system SHALL update the stored credentials immediately.

THE system SHALL allow users to change their password at any time while authenticated.

IF the user is not authenticated, THE system SHALL reject the password change request.

### Account Deletion Cascade

WHEN a user requests to delete their account, THE system SHALL permanently remove the user account.

WHEN a user deletes their account, THE system SHALL delete all posts created by that user.

WHEN a user deletes their account, THE system SHALL delete all comments created by that user.

THE system SHALL cascade account deletion to all user-generated content across the platform.

WHEN account deletion is complete, THE system SHALL remove the user's profile information from public view.

IF the user has posts in communities, those posts SHALL be removed upon account deletion.

IF the user has comments on any posts, those comments SHALL be removed upon account deletion.

THE system SHALL not allow recovery of deleted accounts or associated content.

WHEN a user account is deleted, THE system SHALL release the username for potential future use.

WHEN a user account is deleted, THE system SHALL release the email address for potential future registration.

### Permanent Username Policy

THE system SHALL treat usernames as permanent identifiers once an account is created.

IF a user attempts to change their username after account creation, THE system SHALL reject the request.

THE system SHALL not provide any mechanism for username modification after registration.

WHEN a user account is deleted, THE system SHALL make the username available for new registrations.

THE system SHALL ensure that active usernames remain unique and unchanged throughout the account lifecycle.

IF two users attempt to register with the same username simultaneously, THE system SHALL allow only one registration to succeed.

## Profile Rules

Each user has a profile containing a display name, bio text, and avatar image. Users can edit their own display name, bio, and avatar at any time. Any user can view another user's profile to see their public information. A user's profile page displays their display name, bio, avatar, and total karma score. The profile also shows a list of all posts the user has created and all comments they have written. Display names can be changed independently from usernames. Bio text is optional and users can leave it blank. Avatar images visually represent users across the platform.

### Profile Editing Rights

WHEN a user edits their own profile, THE system SHALL allow changes to display name, bio text, and avatar image.

WHEN a user attempts to edit another user's profile, THE system SHALL reject the request.

THE system SHALL allow users to edit their profile at any time after account creation.

IF a user's account is deleted, THE system SHALL delete the associated profile.

THE system SHALL maintain a single profile per user account.

WHEN a user updates their profile, THE system SHALL save all changes atomically.

THE system SHALL allow users to edit their display name independently from their username.

IF a user has not set a display name, THE system SHALL use their username as the default display value.

### Display Name Customization

WHEN a user sets their display name, THE system SHALL allow any text value within the defined length limits.

THE system SHALL allow users to change their display name as many times as desired.

WHEN a user changes their display name, THE system SHALL update the display name across all existing posts and comments.

THE system SHALL allow display names to contain spaces and special characters.

IF a display name exceeds the maximum length limit, THE system SHALL reject the update.

THE system SHALL allow users to use the same display name as other users.

WHEN viewing a post or comment, THE system SHALL display the author's current display name.

IF a user has not customized their display name, THE system SHALL display their username instead.

### Bio Text Management

THE system SHALL allow users to leave their bio text blank.

WHEN a user provides bio text, THE system SHALL store it as part of their profile.

THE system SHALL allow users to update their bio text at any time.

IF a bio text exceeds the maximum length limit, THE system SHALL reject the update.

WHEN viewing a user's profile, THE system SHALL display the bio text if it exists.

IF a user has not provided bio text, THE system SHALL not display a bio section on their profile.

THE system SHALL allow bio text to contain multiple paragraphs and line breaks.

WHEN a user clears their bio text, THE system SHALL treat it as empty rather than deleted.

### Avatar Image Management

WHEN a user uploads an avatar image, THE system SHALL store it as part of their profile.

THE system SHALL allow users to replace their avatar image at any time.

WHEN a user removes their avatar image, THE system SHALL display a default avatar.

IF an uploaded avatar image exceeds the file size limit, THE system SHALL reject the upload.

IF an uploaded avatar image is in an unsupported format, THE system SHALL reject the upload.

THE system SHALL display the user's avatar image on their profile page.

THE system SHALL display the user's avatar image next to their posts and comments.

WHEN a user's account is deleted, THE system SHALL delete their avatar image.

### Public Profile Visibility

WHEN any user views another user's profile, THE system SHALL display the public profile information.

THE system SHALL allow guests to view any user's public profile.

THE system SHALL display the user's display name, bio text, and avatar image on their profile.

THE system SHALL display the user's total karma score on their profile.

THE system SHALL display a list of all posts created by the user on their profile.

THE system SHALL display a list of all comments written by the user on their profile.

IF a user's account is deleted, THE system SHALL make their profile inaccessible.

THE system SHALL allow users to view their own profile using the same interface as viewing others.

### Karma Score Display

THE system SHALL display the user's total karma score on their profile page.

WHEN a user's karma changes due to voting on their posts or comments, THE system SHALL update the displayed karma score.

THE system SHALL allow karma scores to be negative.

WHEN displaying karma, THE system SHALL show the exact integer value.

THE system SHALL calculate karma as the sum of all vote effects on the user's posts and comments.

WHEN a vote is removed from a user's post or comment, THE system SHALL adjust the karma score accordingly.

THE system SHALL display karma scores on user profiles visible to all users.

IF a user has no votes on their content, THE system SHALL display a karma score of zero.

### User Post History

WHEN viewing a user's profile, THE system SHALL display all posts created by that user.

THE system SHALL display posts in the user's post history regardless of which community they were posted in.

WHEN a post is deleted by its author, THE system SHALL remove it from the user's post history.

WHEN a post is deleted by a moderator, THE system SHALL remove it from the user's post history.

THE system SHALL display the post title, community name, vote score, comment count, and time since posted for each post in the history.

IF a user has never created a post, THE system SHALL display an empty post history.

WHEN viewing a user's post history, THE system SHALL apply the same display rules as post lists in feeds.

THE system SHALL include all post types (text, link, image) in the user's post history.

### User Comment History

WHEN viewing a user's profile, THE system SHALL display all comments written by that user.

THE system SHALL display comments in the user's comment history regardless of which post or community they were written in.

WHEN a comment is deleted by its author, THE system SHALL remove it from the user's comment history.

WHEN a comment is deleted by a moderator, THE system SHALL remove it from the user's comment history.

THE system SHALL display the comment content, vote score, time since posted, and the post title for each comment in the history.

IF a user has never written a comment, THE system SHALL display an empty comment history.

THE system SHALL include all nested replies in the user's comment history.

WHEN viewing a user's comment history, THE system SHALL show the comment content truncated if it exceeds the display length limit.

## Community Rules

Any user can create a community on the platform. Each community has a unique name, description text, and icon image. The user who creates a community automatically becomes its owner with highest authority. Users can browse all communities in a list to discover new communities. Users can search for communities by name to find specific communities. Each community displays its subscriber count publicly. Community names must be unique across the entire platform. Community owners have special privileges including moderator management.

### Community Creation and Ownership

WHEN a user creates a community, THE system SHALL:
1. Verify the user is authenticated as a member
2. Require a unique community name
3. Assign the creating user as the community owner automatically
4. Record the community creation timestamp

IF the community name already exists on the platform, THE system SHALL reject the creation request.
IF the user is not authenticated, THE system SHALL reject the creation request.
IF the community name violates naming conventions, THE system SHALL reject the creation request.

WHILE the community exists, THE system SHALL maintain the original owner assignment unless explicitly transferred by platform administration.

THE community owner SHALL have highest authority over the community including moderator management and content oversight.

### Community Attributes

WHEN a community is created, THE system SHALL:
1. Require a community name that is unique across the platform
2. Allow optional description text for the community
3. Allow optional icon image for the community

WHILE the community exists, THE system SHALL:
1. Preserve the uniqueness of the community name
2. Display the community description text when viewing the community
3. Display the community icon image when viewing the community

WHEN the community owner edits community attributes, THE system SHALL:
1. Allow updates to the description text
2. Allow updates to the icon image
3. Prevent changes to the community name to maintain URL stability

IF the description text exceeds maximum length limits, THE system SHALL reject the update request.
IF the icon image does not meet format requirements, THE system SHALL reject the upload request.

### Community Discovery

WHEN a user browses all communities, THE system SHALL:
1. Display communities in a list format
2. Show the subscriber count for each community
3. Show the community name and icon for each community

WHEN a user searches for communities by name, THE system SHALL:
1. Match community names against the search query
2. Return communities with matching names
3. Display subscriber counts for all matching communities

WHILE viewing any community, THE system SHALL:
1. Display the current subscriber count publicly
2. Update the subscriber count in real-time when users subscribe or unsubscribe

IF no communities match the search query, THE system SHALL display an empty result message.
IF the user is viewing the community list as a guest, THE system SHALL provide the same browsing experience as authenticated users.

## Post Rules

Users can create a post only in communities they are subscribed to. Every post must have a title, which is required for all post types. A post must be one of three types: text post with text content, link post with a URL, or image post with an uploaded image. Users can edit their own posts after creation to update content. Users can delete their own posts permanently. When viewing a single post, users see the title, full content, author, community, vote score, comment count, and creation time. Post type determines what content field is used.

### Post Creation Requirements

WHEN a user creates a post, THE system SHALL require the user to be subscribed to the community where the post is being created.

WHEN a user creates a post, THE system SHALL require a title to be provided for the post.

WHEN a user creates a post, THE system SHALL require the user to select one of three post types: text post, link post, or image post.

IF the user is not subscribed to the community, THEN THE system SHALL reject the post creation request.

IF the title is not provided, THEN THE system SHALL reject the post creation request.

IF the post type is not selected, THEN THE system SHALL reject the post creation request.

WHEN a post is successfully created, THE system SHALL associate the post with the creating user as the author.

WHEN a post is successfully created, THE system SHALL associate the post with the specified community.

WHEN a post is successfully created, THE system SHALL initialize the vote score to zero.

WHEN a post is successfully created, THE system SHALL initialize the comment count to zero.

### Post Content Rules

WHEN a user creates a text post, THE system SHALL require text content to be provided.

WHEN a user creates a link post, THE system SHALL require a URL to be provided.

WHEN a user creates an image post, THE system SHALL require an image file to be uploaded.

IF a text post is created without text content, THEN THE system SHALL reject the request.

IF a link post is created without a URL, THEN THE system SHALL reject the request.

IF an image post is created without an uploaded image, THEN THE system SHALL reject the request.

WHEN viewing a single post, THE system SHALL display the title for all post types.

WHEN viewing a single post, THE system SHALL display the full text content for text posts.

WHEN viewing a single post, THE system SHALL display the full URL for link posts.

WHEN viewing a single post, THE system SHALL display the uploaded image for image posts.

WHEN viewing a post in a list, THE system SHALL display the first 200 characters of content for text posts.

WHEN viewing a post in a list, THE system SHALL display a thumbnail of the image for image posts.

WHEN viewing a post in a list, THE system SHALL display the domain name of the URL for link posts.

### Post Modification Rules

WHEN a user edits their own post, THE system SHALL allow the user to update the title.

WHEN a user edits their own post, THE system SHALL allow the user to update the content based on the post type.

IF a user attempts to edit a post they do not own, THEN THE system SHALL reject the request.

WHEN a user deletes their own post, THE system SHALL permanently remove the post from the system.

WHEN a post is deleted, THE system SHALL also delete all comments associated with that post.

IF a user attempts to delete a post they do not own, THEN THE system SHALL reject the request.

IF a user attempts to delete a post that does not exist, THEN THE system SHALL reject the request.

WHEN a post is deleted, THE system SHALL adjust the author's karma score by removing the vote score that the post contributed.

WHEN a post is deleted, THE system SHALL decrement the comment count display for the community.

## Comment Rules

Users can write a comment on any post regardless of subscription status. Users can reply to any comment to create threaded discussions. Replies can have replies with no depth limit, allowing unlimited nesting. Users can edit their own comments after posting to correct or update content. Users can delete their own comments permanently. Each comment displays the author, content, vote score, time since posted, and nested replies. Comment voting follows the same rules as post voting. Comments appear nested under their parent comment or post.

### Comment Creation and Reply Rights

WHEN a user views any post, THE system SHALL allow them to create a comment regardless of subscription status.

WHEN a user views any comment, THE system SHALL allow them to reply to that comment.

WHILE a user is not banned from the community containing the post, THE system SHALL permit comment creation and replies.

IF a user is banned from the community, THEN THE system SHALL reject comment creation and reply attempts.

THE system SHALL associate each comment with the creating user as the author.

THE system SHALL associate each comment with the target post.

WHEN a user replies to a comment, THE system SHALL establish a parent-child relationship between the comments.

### Comment Nesting Structure

THE system SHALL support unlimited nesting depth for comment replies.

WHEN comments are displayed, THE system SHALL show nested replies indented under their parent comment.

THE system SHALL maintain the threaded structure showing which comment is a reply to which.

THE system SHALL preserve the parent-child relationship even when comments are edited.

WHEN sorting is applied to comments, THE system SHALL maintain the threaded structure within the sorted order.

### Comment Editing and Deletion

WHILE a user is the author of a comment, THE system SHALL allow them to edit that comment.

WHILE a user is the author of a comment, THE system SHALL allow them to delete that comment.

WHEN a user edits a comment, THE system SHALL preserve the original creation timestamp.

WHEN a user deletes a comment, THE system SHALL permanently remove the comment content.

IF a moderator deletes a comment in their community, THEN THE system SHALL remove the comment content.

WHEN a comment with replies is deleted, THE system SHALL preserve child comments with modified display indicating the parent was removed.

IF a deleted comment has no visible content and no replies, THEN THE system SHALL remove the comment entirely from the thread.

### Comment Display Requirements

WHEN displaying a comment, THE system SHALL show the author's username.

WHEN displaying a comment, THE system SHALL show the comment content.

WHEN displaying a comment, THE system SHALL show the vote score.

WHEN displaying a comment, THE system SHALL show the time since posting (e.g., '3 hours ago').

WHEN displaying a comment with replies, THE system SHALL show nested replies in threaded structure.

THE system SHALL display comments nested under their parent comment or post.

WHEN a comment is edited, THE system SHALL indicate that the comment was edited.

### Comment Voting Application

Comment voting follows the same mechanics as post voting (defined in Vote Rules section).

THE system SHALL allow users to upvote any comment, adding 1 to the comment's vote score.

THE system SHALL allow users to downvote any comment, subtracting 1 from the comment's vote score.

THE system SHALL enforce one vote per user per comment.

THE system SHALL allow users to change their vote from upvote to downvote or vice versa.

THE system SHALL allow users to remove their vote entirely.

WHEN a vote is cast, changed, or removed on a comment, THE system SHALL adjust the comment author's karma score accordingly.

IF a comment vote is removed, THEN THE system SHALL reverse the karma adjustment made when the vote was cast.

## Vote Rules

Users can upvote a post or comment, which adds 1 to its score. Users can downvote a post or comment, which subtracts 1 from its score. Each user can only vote once per post or comment at any time. Users can change their vote from upvote to downvote or vice versa. Users can remove their vote entirely, which adjusts the score accordingly. Vote score equals total upvotes minus total downvotes. When someone upvotes your post or comment, your karma increases by 1. When someone downvotes your post or comment, your karma decreases by 1. Karma can be negative based on vote totals.

### Vote Actions and Score Calculation

WHEN a user upvotes a post or comment, THE system SHALL add 1 to the vote score of that post or comment.

WHEN a user downvotes a post or comment, THE system SHALL subtract 1 from the vote score of that post or comment.

THE system SHALL calculate the vote score as total upvotes minus total downvotes.

WHEN a user upvotes content, THE system SHALL record the vote direction as up.

WHEN a user downvotes content, THE system SHALL record the vote direction as down.

THE system SHALL display the current vote score on all posts and comments.

### Vote Restrictions and Transitions

THE system SHALL allow each user to cast only one vote per post or comment at any time.

WHEN a user attempts to vote on content where they already have a vote, THE system SHALL replace the existing vote with the new vote.

WHEN a user changes their vote from upvote to downvote, THE system SHALL adjust the vote score by subtracting 2.

WHEN a user changes their vote from downvote to upvote, THE system SHALL adjust the vote score by adding 2.

WHEN a user removes their vote, THE system SHALL delete the vote record and adjust the score accordingly.

IF a user removes an upvote, THE system SHALL subtract 1 from the vote score.

IF a user removes a downvote, THE system SHALL add 1 to the vote score.

THE system SHALL allow users to remove their vote entirely from any post or comment.

### Karma Adjustments

WHEN a user's post or comment receives an upvote, THE system SHALL increase that user's karma score by 1.

WHEN a user's post or comment receives a downvote, THE system SHALL decrease that user's karma score by 1.

WHEN a vote is removed from a user's post or comment, THE system SHALL reverse the karma adjustment accordingly.

WHEN a user changes their vote on another user's content, THE system SHALL adjust the content owner's karma based on the vote change.

THE system SHALL allow karma scores to be negative.

THE system SHALL display each user's total karma score on their profile page.

IF a user's karma becomes negative due to downvotes, THE system SHALL display the negative value.

WHEN content is deleted, THE system SHALL reverse all karma adjustments associated with votes on that content.

## Subscription Rules

Users can subscribe to any community on the platform. Users can unsubscribe from any community they are currently subscribed to. Users can view a list of all communities they are subscribed to. Subscribing to a community is required to create posts in that community. Home feed shows posts only from communities the user is subscribed to. Home feed is available only to logged-in users. Subscription status determines which posts appear in the user's home feed. Users can subscribe to multiple communities without limit.

### Community Subscription

WHEN a user subscribes to a community, THE system SHALL:
1. Record the subscription with the current timestamp
2. Associate the user with the specified community
3. Increment the community's subscriber count by 1
4. Make the community appear in the user's subscribed communities list
5. Enable the user to create posts in that community

IF the user is already subscribed to the community, THE system SHALL reject the subscription request.
IF the community does not exist, THE system SHALL reject the subscription request.
IF the user is not authenticated, THE system SHALL reject the subscription request.

Users can subscribe to an unlimited number of communities without restriction. THE system SHALL track subscription status for each user-community pair to prevent duplicate subscriptions.

### Community Unsubscription

WHEN a user unsubscribes from a community, THE system SHALL:
1. Remove the subscription record
2. Decrement the community's subscriber count by 1
3. Remove the community from the user's subscribed communities list
4. Prevent the user from creating new posts in that community
5. Preserve the user's existing posts and comments in that community

IF the user is not subscribed to the community, THE system SHALL reject the unsubscription request.
IF the community does not exist, THE system SHALL reject the unsubscription request.
IF the user is not authenticated, THE system SHALL reject the unsubscription request.

WHEN a user unsubscribes, THE system SHALL NOT delete any posts or comments the user previously created in that community.

### Subscribed Communities List

WHEN a user views their subscribed communities list, THE system SHALL:
1. Display all communities the user is currently subscribed to
2. Show each community's name, description, and icon
3. Show each community's current subscriber count
4. Sort communities by subscription date (most recent first) by default
5. Support pagination for users with many subscriptions

IF the user is not authenticated, THE system SHALL reject the request to view subscribed communities list.
IF the user has no subscriptions, THE system SHALL display an empty list.

THE system SHALL update the subscribed communities list immediately when a user subscribes or unsubscribes from a community.

### Subscription Posting Requirement

WHEN a user attempts to create a post in a community, THE system SHALL:
1. Verify the user is subscribed to that community
2. Allow the post creation only if the subscription exists
3. Reject the post creation if the user is not subscribed

IF the user is not subscribed to the community, THE system SHALL reject the post creation request with a message indicating subscription is required.
IF the user's subscription was removed after post creation, THE system SHALL NOT delete existing posts but SHALL prevent new post creation.

THE system SHALL enforce subscription requirement before allowing any post creation operation in a community.

### Home Feed Subscription Filter

WHEN a logged-in user views their home feed, THE system SHALL:
1. Display only posts from communities the user is subscribed to
2. Exclude posts from communities the user is not subscribed to
3. Apply the selected sorting option (hot, new, top, controversial) to filtered posts
4. Support pagination for the filtered results

IF the user has no subscriptions, THE system SHALL display an empty home feed.
IF a community is deleted after user subscription, THE system SHALL exclude posts from that community from the home feed.

THE home feed SHALL dynamically reflect changes in subscription status. WHEN a user subscribes to a new community, posts from that community SHALL immediately appear in the home feed. WHEN a user unsubscribes, posts from that community SHALL immediately disappear from the home feed.

### Home Feed Access Control

WHEN a user attempts to access the home feed, THE system SHALL:
1. Verify the user is authenticated (logged in)
2. Allow access only to authenticated users
3. Reject access for unauthenticated users (guests)

IF the user is not authenticated, THE system SHALL reject the home feed access request.
IF the user is authenticated but has no subscriptions, THE system SHALL allow access but display an empty feed.

THE home feed SHALL be available exclusively to logged-in users. Guests SHALL NOT have access to the home feed feature. Guests MAY access the popular feed and community feeds instead.

## Report Rules

Users can report any post or comment they encounter on the platform. When reporting, users must provide a reason as text explaining why they are reporting the content. Moderators can view all reports for their community to review flagged content. Each report shows the reported content, who reported it, and the reason provided. Moderators can approve a report, which deletes the reported content. Moderators can dismiss a report, which keeps the content and removes the report from the list. Dismissed reports are removed from the report list and no longer visible to moderators.

### Report Creation and Reason Requirements

WHEN a user reports a post or comment, THE system SHALL:
1. Require the user to provide a reason as text
2. Associate the report with the reporting user
3. Associate the report with the reported content (post or comment)
4. Associate the report with the community containing the content
5. Set the initial status to pending

IF the report reason is missing or empty, THE system SHALL reject the report submission.

IF the user attempts to report the same content multiple times, THE system SHALL prevent duplicate reports.

### Moderator Report Access and Display

WHILE a user has moderator or owner role in a community, THE system SHALL allow them to view all reports for that community.

WHEN a moderator views a report, THE system SHALL display:
1. The reported content (post or comment)
2. The reporter's username
3. The reason provided for the report
4. The report status (pending, approved, or dismissed)
5. When the report was filed

IF the user is not a moderator or owner of the community, THE system SHALL deny access to the report list.

### Report Resolution Actions

WHEN a moderator approves a report, THE system SHALL:
1. Delete the reported content (post or comment)
2. Remove the report from the report list

WHEN a moderator dismisses a report, THE system SHALL:
1. Keep the reported content visible
2. Remove the report from the report list

IF the user is not a moderator or owner of the community, THE system SHALL reject the report approval or dismissal request.

IF the report has already been resolved (approved or dismissed), THE system SHALL reject any further action on the report.

## Ban Rules

Moderators can ban users from their community to restrict their participation. Moderators can unban users to restore their participation rights. Moderators can view the list of banned users for their community. Banned users cannot create posts or comments in that community. Banned users can still view content in the community despite being banned. The community creator is the owner with highest authority over bans. Owner can add moderators who gain ban capabilities. Moderators cannot remove the owner or other moderators.

### Moderator Ban Capability

WHEN a moderator bans a user from their community, THE system SHALL:
1. Record the ban with the community identifier
2. Associate the ban with the targeted user
3. Record the moderator who issued the ban
4. Allow an optional reason text for the ban
5. Timestamp the ban creation

THE system SHALL allow the community owner to ban any user from their community.
THE system SHALL allow moderators to ban any user from their community except the owner.
THE system SHALL prevent moderators from banning other moderators.
THE system SHALL prevent moderators from banning the community owner.

IF a moderator attempts to ban the community owner, THE system SHALL reject the request.
IF a moderator attempts to ban another moderator, THE system SHALL reject the request.
IF the user is already banned from the community, THE system SHALL reject the duplicate ban request.

### Moderator Unban Capability

WHEN a moderator unbans a user from their community, THE system SHALL:
1. Remove the ban record for that user in the community
2. Restore the user's ability to create posts in the community
3. Restore the user's ability to create comments in the community
4. Record the unban action timestamp

THE system SHALL allow the community owner to unban any user from their community.
THE system SHALL allow moderators to unban any user from their community.

IF the user is not currently banned from the community, THE system SHALL reject the unban request.
IF a moderator attempts to unban a user they did not ban and are not the owner, THE system SHALL allow the action (any moderator can unban).

### Banned Users List Access

WHEN a moderator views the banned users list for their community, THE system SHALL:
1. Display all users currently banned from the community
2. Show the username of each banned user
3. Show the ban reason if one was provided
4. Show the date when each ban was issued
5. Show which moderator issued each ban

THE system SHALL allow the community owner to view the complete banned users list.
THE system SHALL allow moderators to view the complete banned users list.

IF a user is not a moderator or owner of the community, THE system SHALL deny access to the banned users list.
IF the community has no banned users, THE system SHALL display an empty list.

### Banned User Posting and Commenting Restrictions

WHILE a user is banned from a community, THE system SHALL:
1. Prevent the user from creating new posts in that community
2. Prevent the user from creating new comments in that community
3. Prevent the user from replying to existing comments in that community

IF a banned user attempts to create a post in the community, THE system SHALL reject the request.
IF a banned user attempts to create a comment in the community, THE system SHALL reject the request.
IF a banned user attempts to reply to a comment in the community, THE system SHALL reject the request.

THE system SHALL allow banned users to edit their existing posts created before the ban.
THE system SHALL allow banned users to edit their existing comments created before the ban.
THE system SHALL allow banned users to delete their own posts and comments regardless of ban status.

### Banned User Viewing Access

WHILE a user is banned from a community, THE system SHALL:
1. Allow the user to view the community page
2. Allow the user to view posts in the community
3. Allow the user to view comments in the community
4. Allow the user to view other user profiles in the community
5. Allow the user to subscribe or unsubscribe from the community

THE system SHALL maintain viewing access for banned users to all public community content.

IF a banned user attempts to view community content, THE system SHALL NOT display any ban warning or restriction notice on the content itself.
IF a banned user attempts to interact with content (vote, report), THE system SHALL allow these actions unless otherwise restricted.

# Detailed Validation Rules

Detailed validation rules with boundary values and format requirements.

## User Validation Rules

User email addresses must follow standard email format and be unique across all active accounts. Usernames must be unique and cannot be changed after account creation. Passwords must meet security requirements including minimum length and complexity. Email addresses are verified through confirmation links sent during registration. Verification links expire after a set period requiring users to request new ones. Duplicate email registration attempts are rejected with appropriate messaging. Username availability is checked in real-time during the signup process. Account deletion removes all associated user data including posts and comments. Password changes require the user to be authenticated with their current credentials.

### Email Format and Verification

THE system SHALL validate that email addresses follow standard email format including local-part, @ symbol, and domain.

THE system SHALL require email verification for all new user registrations before account activation.

WHEN a user registers, THE system SHALL send a verification link to the provided email address.

THE system SHALL set verification links to expire 24 hours after issuance.

IF a verification link expires, THE system SHALL require the user to request a new verification link.

THE system SHALL reject registration attempts when the email address is already associated with an active account.

THE system SHALL display an appropriate error message when duplicate email registration is attempted.

WHILE an email address remains unverified, THE system SHALL restrict the account from full platform access.

THE system SHALL allow users to request a new verification link if the original expires or is not received.

THE system SHALL invalidate verification links immediately after successful use.

IF a user attempts to register with an email format that is invalid, THE system SHALL reject the registration request.

THE system SHALL normalize email addresses to lowercase before checking for duplicates.

WHEN a verification link is clicked, THE system SHALL verify the link has not expired before activating the account.

THE system SHALL prevent multiple active verification requests for the same email address simultaneously.

### Username Validation

THE system SHALL ensure usernames are unique across all registered users.

WHEN a user selects a username during registration, THE system SHALL check availability in real-time.

THE system SHALL reject username selection if the username is already taken by another user.

THE system SHALL prevent users from changing their username after account creation.

THE system SHALL reserve certain usernames to prevent impersonation of platform administrators.

IF a username contains invalid characters, THE system SHALL reject the username selection.

THE system SHALL enforce minimum and maximum length requirements for usernames.

WHEN checking username availability, THE system SHALL perform case-insensitive comparison.

THE system SHALL provide immediate feedback on username availability during the registration process.

IF a user attempts to register with a username that becomes unavailable between availability check and submission, THE system SHALL reject the registration and prompt for a different username.

### Password Security Requirements

THE system SHALL enforce minimum password length of 8 characters.

THE system SHALL require passwords to contain at least one uppercase letter.

THE system SHALL require passwords to contain at least one lowercase letter.

THE system SHALL require passwords to contain at least one numeric digit.

THE system SHALL require passwords to contain at least one special character.

THE system SHALL store passwords using secure hashing algorithms, never in plain text.

WHEN a user changes their password, THE system SHALL require authentication with the current password.

IF the current password provided during password change is incorrect, THE system SHALL reject the request.

THE system SHALL prevent users from setting passwords that match their username or email address.

THE system SHALL maintain a history of previous passwords to prevent immediate reuse.

WHEN a user successfully changes their password, THE system SHALL invalidate all existing sessions except the current one.

THE system SHALL enforce password complexity requirements during both registration and password change operations.

IF a password does not meet complexity requirements, THE system SHALL provide specific feedback on which requirements are not met.

### Account Lifecycle Rules

WHEN a user deletes their account, THE system SHALL delete all posts created by the user.

WHEN a user deletes their account, THE system SHALL delete all comments created by the user.

WHEN a user deletes their account, THE system SHALL remove all votes cast by the user.

WHEN a user deletes their account, THE system SHALL cancel all community subscriptions associated with the user.

THE system SHALL require user authentication before allowing account deletion.

THE system SHALL warn users that account deletion is permanent and cannot be undone.

THE system SHALL implement rate limiting on registration attempts to prevent abuse.

THE system SHALL limit registration attempts to 5 per hour per IP address.

IF registration rate limit is exceeded, THE system SHALL reject further registration attempts until the limit period resets.

THE system SHALL notify users when their registration attempt is rejected due to rate limiting.

WHEN account deletion is initiated, THE system SHALL process the deletion within 24 hours.

THE system SHALL retain anonymized data for analytics purposes after account deletion where required by law.

## Profile Validation Rules

Display names can be edited by users at any time and have character length limits. Bio text is optional and supports multi-line content with maximum length restrictions. Avatar images must be in supported image formats and meet file size requirements. Profile updates are validated before being saved to ensure data integrity. Empty display names are not permitted and require user input. Bio content is sanitized to prevent injection of malicious code. Avatar uploads are rejected if they exceed the maximum file size limit. Profile images must meet minimum dimension requirements for display quality. Users can remove their avatar and revert to a default image.

### Display Name Validation

WHEN a user sets or updates their display name, THE system SHALL:
1. Require the display name to be non-empty
2. Enforce a minimum character length
3. Enforce a maximum character length
4. Allow any Unicode characters
5. Trim leading and trailing whitespace before validation

IF the display name is empty or contains only whitespace, THE system SHALL reject the request.

IF the display name is shorter than the minimum length, THE system SHALL reject the request.

IF the display name exceeds the maximum length, THE system SHALL reject the request.

WHILE a profile update is in progress, THE system SHALL validate the display name before saving changes.

### Bio Text Validation

WHEN a user sets or updates their bio text, THE system SHALL:
1. Allow the bio to be empty (optional field)
2. Enforce a maximum character length
3. Support multi-line content with line breaks
4. Sanitize the content to prevent malicious code injection

IF the bio text exceeds the maximum length, THE system SHALL reject the request.

IF the bio content contains potentially malicious scripts or code, THE system SHALL sanitize the content before saving.

WHILE a profile update is in progress, THE system SHALL validate the bio text before saving changes.

### Avatar Image Format Support

WHEN a user uploads an avatar image, THE system SHALL:
1. Accept only supported image file formats
2. Validate the file format before processing
3. Reject files that do not match supported formats

IF the uploaded file is not in a supported image format, THE system SHALL reject the request.

WHEN validating an avatar upload, THE system SHALL check the file content type matches the declared format.

WHILE a profile update is in progress, THE system SHALL validate the avatar image format before saving changes.

### Avatar File Size and Dimension Limits

WHEN a user uploads an avatar image, THE system SHALL:
1. Enforce a maximum file size limit
2. Require minimum image dimensions for display quality
3. Validate file size before processing the upload
4. Validate image dimensions before accepting the upload

IF the uploaded file exceeds the maximum file size limit, THE system SHALL reject the request.

IF the uploaded image dimensions are below the minimum requirements, THE system SHALL reject the request.

WHILE a profile update is in progress, THE system SHALL validate both file size and dimensions before saving changes.

### Avatar Removal and Default Fallback

WHEN a user chooses to remove their avatar, THE system SHALL:
1. Allow the user to delete their custom avatar image
2. Automatically assign a default avatar image upon removal
3. Update the profile to reflect the default avatar state

WHEN a user has no custom avatar uploaded, THE system SHALL display the default avatar image.

WHEN viewing any user profile, IF the user has not uploaded a custom avatar, THE system SHALL show the default avatar fallback.

IF a user removes their avatar, THE system SHALL immediately apply the default avatar to their profile.

## Community Validation Rules

Community names must be unique across the platform and follow naming conventions. Community descriptions are optional text fields with maximum character limits. Community icons must be uploaded in supported image formats. Icon images have maximum file size restrictions to ensure platform performance. Community name changes are not permitted after creation to maintain URL stability. Description updates are allowed and validated for appropriate content length. Icon uploads are processed and validated before being associated with the community. Duplicate community name attempts are rejected during the creation process. Community names cannot contain special characters or spaces.

### Community Name Validation

### Community Name Uniqueness

WHEN a user creates a community, THE system SHALL:
1. Verify the community name is unique across the platform
2. Reject the creation if the name already exists
3. Perform case-insensitive comparison for uniqueness checks

IF the community name already exists, THE system SHALL reject the request with an error indicating the name is taken.

### Community Naming Conventions

WHEN a user provides a community name, THE system SHALL:
1. Require the name to be between 3 and 21 characters in length
2. Allow only alphanumeric characters (a-z, A-Z, 0-9) and underscores
3. Prohibit spaces, special characters, and symbols
4. Require the name to start with a letter (not a number or underscore)

IF the community name contains spaces, THEN THE system SHALL reject the request.
IF the community name contains special characters, THEN THE system SHALL reject the request.
IF the community name is shorter than 3 characters, THEN THE system SHALL reject the request.
IF the community name exceeds 21 characters, THEN THE system SHALL reject the request.
IF the community name starts with a number or underscore, THEN THE system SHALL reject the request.

### Community Name Immutability

WHILE a community exists, THE system SHALL:
1. Prevent any changes to the community name after creation
2. Maintain the original name for URL stability and reference integrity

IF a user attempts to change the community name, THEN THE system SHALL reject the request.

### Duplicate Name Rejection

WHEN a community creation request is submitted, THE system SHALL:
1. Check for existing communities with the same name before processing
2. Reject the request immediately if a duplicate is found
3. Return an error message indicating the name is unavailable

IF the name matches an existing community (case-insensitive), THEN THE system SHALL reject the request.

### Community Description Validation

### Description Character Limits

WHEN a user provides a community description, THE system SHALL:
1. Allow descriptions up to 5000 characters in length
2. Accept empty descriptions (description is optional)
3. Count all characters including spaces and special characters

IF the description exceeds 5000 characters, THEN THE system SHALL reject the request.

### Description Update Validation

WHEN a user updates a community description, THE system SHALL:
1. Verify the user has permission to edit the community (owner or moderator)
2. Validate the new description against character limit rules
3. Allow the description to be changed to empty text
4. Preserve the update timestamp for audit purposes

IF the user does not have edit permission, THEN THE system SHALL reject the request.
IF the new description exceeds the character limit, THEN THE system SHALL reject the request.

WHILE updating a description, THE system SHALL:
1. Sanitize the content to prevent injection attacks
2. Preserve line breaks and formatting within the character limit

### Community Icon Validation

### Icon Image Format Validation

WHEN a user uploads a community icon, THE system SHALL:
1. Accept only PNG, JPG, JPEG, and GIF image formats
2. Validate the file format by checking the file signature (not just extension)
3. Reject files that do not match supported image formats

IF the uploaded file is not a valid image format, THEN THE system SHALL reject the request.
IF the file extension does not match the actual file content, THEN THE system SHALL reject the request.

### Icon File Size Restrictions

WHEN a user uploads a community icon, THE system SHALL:
1. Enforce a maximum file size of 5MB
2. Reject uploads that exceed the size limit
3. Validate file size before processing the image

IF the uploaded file exceeds 5MB, THEN THE system SHALL reject the request with an error indicating the size limit.

### Icon Upload Processing

WHEN a community icon is uploaded, THE system SHALL:
1. Validate the file format and size before accepting
2. Generate a unique filename for storage
3. Create thumbnail versions for different display contexts
4. Associate the processed image with the community
5. Remove any previous icon when a new one is uploaded

IF the upload validation fails, THEN THE system SHALL reject the request and not store the file.
IF the upload succeeds, THEN THE system SHALL make the icon visible on the community profile.

WHILE processing an icon upload, THE system SHALL:
1. Scan the file for malicious content
2. Optimize the image for web display
3. Maintain aspect ratio when generating thumbnails

## Post Validation Rules

Post titles are required for all post types and have maximum character length limits. Posts must be classified as one of three types: text, link, or image. Text posts require content body with minimum and maximum length requirements. Link posts must contain valid URLs that follow standard URL format. Image posts require uploaded images in supported formats meeting size requirements. Post type cannot be changed after the post is created. Title content is validated to prevent empty or whitespace-only submissions. Link URLs are validated to ensure they point to accessible web resources. Image uploads are validated for format, size, and dimensions before acceptance.

### Title Required Validation

WHEN a user creates a post, THE system SHALL require a title for all post types.

IF the title field is empty, THE system SHALL reject the post creation request.

IF the title contains only whitespace characters, THE system SHALL reject the post creation request.

THE system SHALL enforce a maximum character limit of 300 characters for post titles.

IF the title exceeds 300 characters, THE system SHALL reject the post creation request.

THE system SHALL allow titles containing alphanumeric characters, spaces, and common punctuation marks.

IF the title contains prohibited special characters, THE system SHALL reject the post creation request.

WHEN a user edits an existing post, THE system SHALL apply the same title validation rules.

IF an edited title becomes empty or whitespace-only, THE system SHALL reject the edit request.

IF an edited title exceeds the character limit, THE system SHALL reject the edit request.

### Post Type Classification

WHEN a user creates a post, THE system SHALL require the user to classify the post as one of three types: text, link, or image.

THE system SHALL not allow posts without a specified type classification.

IF an invalid post type is provided, THE system SHALL reject the post creation request.

WHILE a post exists, THE system SHALL not allow the post type to be changed.

IF a user attempts to change the post type after creation, THE system SHALL reject the request.

THE system SHALL display the post type indicator on all post listings and detail views.

WHEN a post is created, THE system SHALL validate that the content matches the declared post type.

IF a text post is created without text content, THE system SHALL reject the request.

IF a link post is created without a URL, THE system SHALL reject the request.

IF an image post is created without an uploaded image, THE system SHALL reject the request.

### Text Post Content Length

WHEN a user creates a text post, THE system SHALL require content body text.

THE system SHALL enforce a minimum content length of 1 character for text posts.

IF the text post content is empty, THE system SHALL reject the post creation request.

THE system SHALL enforce a maximum content length of 40,000 characters for text posts.

IF the text post content exceeds 40,000 characters, THE system SHALL reject the post creation request.

WHEN a user edits a text post, THE system SHALL apply the same content length validation.

IF an edited text post content becomes empty, THE system SHALL reject the edit request.

IF an edited text post content exceeds the maximum length, THE system SHALL reject the edit request.

THE system SHALL count all characters including spaces and line breaks toward the content length limit.

WHEN displaying text posts in feeds, THE system SHALL show only the first 200 characters of content.

### Link Post URL Format

WHEN a user creates a link post, THE system SHALL require a valid URL.

THE system SHALL validate that the URL follows standard URL format including protocol (http or https).

IF the URL does not include a valid protocol, THE system SHALL reject the post creation request.

IF the URL format is malformed, THE system SHALL reject the post creation request.

THE system SHALL validate that the URL points to an accessible web resource.

IF the URL is inaccessible or returns an error, THE system SHALL reject the post creation request.

THE system SHALL extract and store the domain name from the URL for display purposes.

WHEN displaying link posts in feeds, THE system SHALL show the domain name (e.g., "youtube.com").

WHEN a user edits a link post, THE system SHALL re-validate the URL format and accessibility.

IF the edited URL is invalid or inaccessible, THE system SHALL reject the edit request.

### Image Post Format Support

WHEN a user creates an image post, THE system SHALL require an uploaded image file.

THE system SHALL accept image files in the following formats: JPEG, PNG, GIF, and WebP.

IF the uploaded file is not in a supported format, THE system SHALL reject the post creation request.

THE system SHALL enforce a maximum file size limit of 20MB for image uploads.

IF the uploaded image exceeds 20MB, THE system SHALL reject the post creation request.

THE system SHALL validate that uploaded images meet minimum dimension requirements of 100x100 pixels.

IF the uploaded image dimensions are below 100x100 pixels, THE system SHALL reject the post creation request.

THE system SHALL validate that uploaded images do not exceed maximum dimensions of 16,000x16,000 pixels.

IF the uploaded image dimensions exceed 16,000x16,000 pixels, THE system SHALL reject the post creation request.

WHEN displaying image posts in feeds, THE system SHALL generate and display a thumbnail version of the image.

### Post Content Sanitization

WHEN a user submits post content, THE system SHALL sanitize all text content to prevent security vulnerabilities.

THE system SHALL remove or escape any HTML tags from post titles and text content.

IF malicious scripts are detected in post content, THE system SHALL reject the submission.

THE system SHALL sanitize URLs in link posts to prevent redirect attacks.

IF a URL contains suspicious parameters or known malicious domains, THE system SHALL reject the post creation request.

THE system SHALL sanitize image metadata to remove potentially harmful embedded content.

WHEN displaying post content, THE system SHALL render sanitized content that prevents cross-site scripting attacks.

THE system SHALL preserve legitimate formatting such as line breaks and basic text formatting in sanitized content.

IF content fails sanitization checks, THE system SHALL provide a clear error message indicating the issue.

THE system SHALL apply sanitization rules consistently across all post types and content fields.

## Comment Validation Rules

Comment content is required and cannot be empty or whitespace-only. Comments have maximum character length limits to maintain readability. Comment content is sanitized to prevent malicious code injection. Nested replies have no depth limit but each reply must meet content requirements. Comment edits are allowed and validated against the same rules as new comments. Deleted comments are removed from view but may leave placeholder indicators. Comment content supports basic text formatting within defined boundaries. Empty comment submissions are rejected with validation error messages. Comment length is enforced consistently across all nesting levels.

### Comment Content Requirements

### Comment Content Required

WHEN a user submits a comment, THE system SHALL require comment content to be provided.

IF the comment content is missing, THEN THE system SHALL reject the request.

IF the comment content contains only whitespace characters, THEN THE system SHALL reject the request.

### Comment Maximum Length

THE system SHALL enforce a maximum length of 10,000 characters for comment content.

IF the comment content exceeds 10,000 characters, THEN THE system SHALL reject the request.

### Comment Length Enforcement

THE system SHALL validate comment length before accepting the comment.

WHEN counting comment length, THE system SHALL include all characters including spaces and punctuation.

THE system SHALL apply the same length enforcement to all comments regardless of nesting level.

### Empty Comment Rejection

IF a user attempts to submit an empty comment, THEN THE system SHALL display a validation error message.

THE system SHALL reject comments that become empty after whitespace trimming.

### Content Sanitization and Formatting

### Comment Content Sanitization

THE system SHALL sanitize all comment content to prevent malicious code injection.

WHEN a comment is submitted, THE system SHALL remove or escape any script tags or executable code.

THE system SHALL sanitize comment content before storing and before displaying.

### Text Formatting Support

THE system SHALL support basic text formatting within comment content.

WHEN processing comment content, THE system SHALL preserve line breaks and paragraph structure.

THE system SHALL render formatted text while maintaining sanitization rules.

IF text formatting conflicts with sanitization rules, THEN THE system SHALL prioritize security by removing potentially harmful formatting.

### Reply and Nesting Rules

### Nested Reply Validation

WHEN a user creates a reply to a comment, THE system SHALL validate the reply content against the same rules as new comments.

THE system SHALL require that each nested reply has valid content before accepting it.

IF a nested reply fails validation, THEN THE system SHALL reject the entire reply submission.

### Reply Depth Unlimited

THE system SHALL allow unlimited nesting depth for comment replies.

WHILE creating a reply at any nesting level, THE system SHALL apply the same validation rules.

THE system SHALL not impose any maximum depth limit on nested replies.

IF a reply is created at any depth level, THEN THE system SHALL validate it identically to top-level comments.

### Edit and Delete Handling

### Comment Edit Validation

WHEN a user edits an existing comment, THE system SHALL validate the edited content against the same rules as new comments.

IF the edited comment content is empty or whitespace-only, THEN THE system SHALL reject the edit request.

IF the edited comment content exceeds the maximum length, THEN THE system SHALL reject the edit request.

THE system SHALL sanitize edited comment content before saving changes.

### Deleted Comment Handling

WHEN a user deletes their comment, THE system SHALL remove the comment content from view.

THE system SHALL preserve the comment structure to maintain reply threading.

### Placeholder Indicator Display

WHEN a comment is deleted, THE system SHALL display a placeholder indicator in place of the original content.

THE placeholder indicator SHALL show that the comment was deleted without revealing the original content.

THE system SHALL display the placeholder indicator for all deleted comments regardless of nesting level.

IF a deleted comment has replies, THEN THE system SHALL maintain the reply structure with the placeholder indicator visible.

## Vote Validation Rules

Votes must be cast as either upvote or downvote direction with no neutral option. Each user can only have one active vote per post or comment at any time. Users can change their vote from upvote to downvote or vice versa. Users can remove their vote entirely returning the item to zero votes from that user. Vote direction changes are validated to ensure only valid transitions occur. Multiple vote attempts on the same item are rejected after the first vote. Vote removal is treated as a distinct action from casting a new vote. Vote timestamps are recorded for tracking vote history and karma calculations. Self-voting on own content is not permitted and rejected by validation.

### Vote Direction Validation

WHEN a user casts a vote on a post or comment, THE system SHALL validate that the vote direction is either upvote or downvote.

THE system SHALL reject any vote attempt with a direction value other than upvote or downvote.

IF a vote direction is null or undefined, THE system SHALL reject the vote attempt.

THE system SHALL not allow a neutral or abstain vote option.

WHEN validating vote direction, THE system SHALL ensure the value matches one of the two permitted enum values: upvote or downvote.

IF an invalid vote direction is submitted, THE system SHALL return an error indicating the vote direction must be upvote or downvote.

### Single Vote Per User Enforcement

WHEN a user attempts to vote on a post or comment where they already have an active vote, THE system SHALL reject the duplicate vote attempt.

THE system SHALL enforce that each user can have only one active vote per post at any time.

THE system SHALL enforce that each user can have only one active vote per comment at any time.

IF a user attempts to cast a second vote on the same post without removing or changing their existing vote, THE system SHALL reject the request.

IF a user attempts to cast a second vote on the same comment without removing or changing their existing vote, THE system SHALL reject the request.

THE system SHALL validate that no duplicate votes exist for the same user and target item combination before accepting a new vote.

### Vote Modification Rules

WHEN a user changes their vote from upvote to downvote, THE system SHALL validate that the user has an existing upvote on the target item.

WHEN a user changes their vote from downvote to upvote, THE system SHALL validate that the user has an existing downvote on the target item.

WHEN a user removes their vote, THE system SHALL validate that the user has an existing vote on the target item.

THE system SHALL treat vote removal as a distinct action from casting a new vote.

IF a user attempts to change their vote without having an existing vote, THE system SHALL reject the request.

IF a user attempts to remove a vote that does not exist, THE system SHALL reject the request.

THE system SHALL only permit valid vote transitions: upvote to downvote, downvote to upvote, upvote to removed, or downvote to removed.

IF an invalid vote transition is attempted, THE system SHALL reject the request with an appropriate error message.

### Vote Recording and Tracking

WHEN a vote is successfully cast, changed, or removed, THE system SHALL record the timestamp of the action.

THE system SHALL store vote timestamps for tracking vote history and karma calculations.

WHEN calculating a user's karma score, THE system SHALL use the recorded vote timestamps to determine which votes are active.

THE system SHALL update the vote score of a post or comment immediately when a vote is cast, changed, or removed.

THE system SHALL maintain a complete history of vote actions for each user and target item combination.

WHEN a vote is removed, THE system SHALL record the removal timestamp to track when the vote was withdrawn.

THE system SHALL use vote timestamps to calculate karma adjustments when votes are changed or removed.

### Self-Vote Prevention

IF a user attempts to vote on their own post, THE system SHALL reject the vote attempt.

IF a user attempts to vote on their own comment, THE system SHALL reject the vote attempt.

THE system SHALL validate that the voting user is not the author of the target post before accepting the vote.

THE system SHALL validate that the voting user is not the author of the target comment before accepting the vote.

WHEN a vote attempt is made, THE system SHALL check the authorship of the target item and reject self-votes.

IF self-voting is attempted, THE system SHALL return an error indicating users cannot vote on their own content.

THE system SHALL prevent self-voting on both posts and comments regardless of the vote direction.

## Subscription Validation Rules

Users can subscribe to any community that exists on the platform. Subscription requires the user to be authenticated and logged in. Duplicate subscriptions to the same community are not permitted. Users can unsubscribe from any community they are currently subscribed to. Subscription status is validated before allowing post creation in a community. Subscription attempts for non-existent communities are rejected. Unsubscribe actions are validated to ensure the subscription exists first. Subscription timestamps are recorded for tracking user community engagement. Users can view their subscription list with validation ensuring only valid subscriptions display.

### Subscription Authentication Requirements

WHEN a user attempts to subscribe to a community, THE system SHALL verify the user is authenticated and logged in.

IF the user is not authenticated, THE system SHALL reject the subscription request.

WHEN a guest user attempts to subscribe, THE system SHALL reject the request.

THE system SHALL require valid session credentials for all subscription actions.

IF authentication expires during a subscription request, THE system SHALL reject the request.

### Community Existence Validation

WHEN a user attempts to subscribe to a community, THE system SHALL verify the community exists on the platform.

IF the community does not exist, THE system SHALL reject the subscription request.

WHEN a user attempts to subscribe using an invalid community name, THE system SHALL reject the request.

THE system SHALL validate community existence before processing any subscription action.

IF a community is deleted while subscriptions exist, THE system SHALL handle orphaned subscriptions appropriately.

### Duplicate Subscription Prevention

WHEN a user attempts to subscribe to a community, THE system SHALL check for existing active subscriptions.

IF the user already has an active subscription to the community, THE system SHALL reject the duplicate subscription request.

THE system SHALL enforce one active subscription per user per community.

WHEN a duplicate subscription attempt is detected, THE system SHALL inform the user they are already subscribed.

IF a subscription was previously cancelled, THE system SHALL allow resubscription to the same community.

### Subscription Existence Verification

WHEN checking subscription status, THE system SHALL verify the subscription record exists.

IF the subscription does not exist, THE system SHALL report the user is not subscribed to the community.

THE system SHALL validate subscription existence before allowing unsubscribe actions.

WHEN subscription status is queried, THE system SHALL return current active subscription state.

IF subscription data is corrupted or missing, THE system SHALL treat the user as not subscribed.

### Unsubscribe Validation Rules

WHEN a user attempts to unsubscribe from a community, THE system SHALL verify an active subscription exists.

IF no active subscription exists, THE system SHALL reject the unsubscribe request.

THE system SHALL validate the user owns the subscription before allowing unsubscription.

WHEN unsubscribe is successful, THE system SHALL remove the active subscription status.

IF the user attempts to unsubscribe from a community they never joined, THE system SHALL reject the request.

### Subscription Posting Requirement

WHEN a user attempts to create a post in a community, THE system SHALL verify active subscription status.

IF the user is not subscribed to the community, THE system SHALL reject the post creation request.

THE system SHALL validate subscription status before allowing any post creation in a community.

WHEN subscription is cancelled, THE system SHALL prevent further post creation in that community.

IF a user tries to post without subscription, THE system SHALL inform them they must subscribe first.

### Subscription Timestamp Management

WHEN a subscription is created, THE system SHALL record the subscription timestamp.

THE system SHALL store the exact date and time when the user subscribed to the community.

WHEN subscription timestamp is queried, THE system SHALL return the original subscription date.

THE system SHALL use subscription timestamps for tracking user community engagement.

IF subscription timestamp is missing, THE system SHALL reject operations requiring timestamp data.

### Subscription List Integrity

WHEN a user requests their subscription list, THE system SHALL validate all subscriptions are active and valid.

IF a community in the subscription list no longer exists, THE system SHALL exclude it from the display.

THE system SHALL ensure only valid, active subscriptions appear in the user's subscription list.

WHEN displaying subscription list, THE system SHALL verify each subscription's community still exists.

IF subscription data is inconsistent, THE system SHALL clean up invalid entries before displaying the list.

## Report Validation Rules

Report reason is required and must contain meaningful text describing the issue. Reports can be submitted for any post or comment on the platform. Report reasons have minimum and maximum character length requirements. Report status starts as pending and can transition to approved or dismissed. Duplicate reports on the same content by the same user are not permitted. Report content is validated to prevent empty or generic submissions. Report reasons are sanitized to prevent injection of malicious content. Approved reports result in content deletion while dismissed reports are removed from queue. Report submission requires the reported content to exist and be accessible.

### Report Reason Requirements

### Report Reason Required

WHEN a user submits a report, THE system SHALL require a reason text describing the issue.

IF the reason field is empty, THE system SHALL reject the report submission.

### Report Reason Length Limits

WHEN a user provides a report reason, THE system SHALL enforce the following length requirements:
1. Minimum 10 characters
2. Maximum 1000 characters

IF the reason contains fewer than 10 characters, THE system SHALL reject the report.

IF the reason exceeds 1000 characters, THE system SHALL reject the report.

### Report Reason Sanitization

WHEN a report reason is submitted, THE system SHALL sanitize the text to prevent injection of malicious content.

IF the reason contains script tags or executable code, THE system SHALL remove or escape such content before storage.

### Report Status and Transitions

### Pending Report Status

WHEN a report is successfully submitted, THE system SHALL set its initial status to pending.

WHILE a report status is pending, THE system SHALL make it visible to community moderators for review.

### Report Status Transitions

WHEN a moderator reviews a pending report, THE system SHALL allow the status to transition to either approved or dismissed.

IF a report status is approved, THE system SHALL prevent any further status changes.

IF a report status is dismissed, THE system SHALL prevent any further status changes.

THE system SHALL NOT allow a report to transition from approved back to pending.

THE system SHALL NOT allow a report to transition from dismissed back to pending.

### Duplicate Report Prevention

### Duplicate Report Prevention

WHEN a user attempts to report a post or comment, THE system SHALL check if that user has already submitted a report on the same content.

IF the user has already reported the same post or comment, THE system SHALL reject the duplicate report submission.

THE system SHALL allow multiple different users to report the same post or comment.

IF a user's previous report on the same content was dismissed, THE system SHALL still prevent that user from submitting another report on the same content.

### Report Content Validation

### Reported Content Existence

WHEN a user submits a report, THE system SHALL verify that the reported post or comment exists.

IF the reported post or comment does not exist, THE system SHALL reject the report submission.

IF the reported post or comment has been deleted, THE system SHALL reject the report submission.

### Report Submission Validation

WHEN a report is submitted, THE system SHALL validate the following conditions:
1. The reporting user is authenticated
2. The reported content exists and is accessible
3. The report reason meets length requirements (defined in Report Reason Requirements)
4. The user has not previously reported the same content (defined in Duplicate Report Prevention)

IF any validation condition fails, THE system SHALL reject the report submission with an appropriate error message.

### Report Resolution Actions

### Approved Report Deletion

WHEN a moderator approves a report on a post, THE system SHALL delete the reported post from the community.

WHEN a moderator approves a report on a comment, THE system SHALL delete the reported comment and all its nested replies.

IF the deleted content belongs to a user, THE system SHALL adjust the user's karma score accordingly (defined in Karma).

### Dismissed Report Removal

WHEN a moderator dismisses a report, THE system SHALL remove the report from the moderator's report queue.

IF a report is dismissed, THE system SHALL retain the reported content unchanged.

WHEN a report is dismissed, THE system SHALL prevent the same report from reappearing in the moderator's queue.

## Ban Validation Rules

Ban reason is optional and can be provided by moderators when banning users. Bans are applied at the community level not platform-wide. Ban duration can be temporary or permanent based on moderator decision. Banned users retain ability to view community content but cannot post or comment. Ban creation requires the user to be banned to exist in the system. Duplicate bans on the same user in the same community are not permitted. Ban removal restores user posting and commenting privileges immediately. Ban records include timestamps for tracking ban history and duration. Moderator authority is validated before allowing ban creation or removal actions.

### Ban Creation Validation

WHEN a moderator creates a ban, THE system SHALL validate that the moderator has authority in the community.

IF the user is not a moderator or owner of the community, THE system SHALL reject the ban creation request.

THE ban reason field is optional when creating a ban.

IF the ban reason is provided, THE system SHALL accept text content up to 500 characters.

WHEN creating a ban, THE system SHALL validate that the user to be banned exists in the system.

IF the user does not exist, THE system SHALL reject the ban creation request.

THE system SHALL prevent duplicate bans on the same user within the same community.

IF a ban already exists for the user in the community and has not been removed, THE system SHALL reject the new ban creation request.

THE ban applies at the community level only, not platform-wide.

IF a user is banned from a community, THE system SHALL NOT restrict their access to other communities.

### Ban Duration and Type

WHEN creating a ban, THE system SHALL support two duration types: temporary and permanent.

THE moderator SHALL specify whether the ban is temporary or permanent at creation time.

IF the ban is temporary, THE system SHALL allow the moderator to specify an end date and time.

IF the ban is permanent, THE system SHALL NOT require an end date.

WHILE a temporary ban is active, THE system SHALL enforce all ban restrictions on the user.

WHEN a temporary ban reaches its end date, THE system SHALL automatically restore the user's posting and commenting privileges.

THE system SHALL record the ban type (temporary or permanent) for each ban record.

### Ban Effects and Restrictions

WHEN a user is banned from a community, THE system SHALL restrict their ability to create posts in that community.

IF a banned user attempts to create a post in the banned community, THE system SHALL reject the request.

WHEN a user is banned from a community, THE system SHALL restrict their ability to create comments in that community.

IF a banned user attempts to create a comment on a post in the banned community, THE system SHALL reject the request.

THE banned user SHALL retain the ability to view all content in the community.

WHILE banned, THE system SHALL allow the user to browse posts, comments, and community information.

WHILE banned, THE system SHALL allow the user to vote on posts and comments in the community.

THE ban restrictions apply only to the specific community where the ban was issued.

IF a user is banned from one community, THE system SHALL NOT restrict their posting or commenting in other communities.

### Ban Removal and Restoration

WHEN a moderator or owner removes a ban, THE system SHALL immediately restore the user's posting privileges in the community.

WHEN a ban is removed, THE system SHALL immediately restore the user's commenting privileges in the community.

THE system SHALL record a timestamp when each ban is created.

THE system SHALL record a timestamp when each ban is removed.

IF a temporary ban expires automatically, THE system SHALL record the expiration timestamp.

THE system SHALL maintain ban history with timestamps for tracking ban duration and patterns.

WHEN a ban is removed, THE system SHALL NOT delete the ban record but SHALL mark it as removed with the removal timestamp.

IF a user was previously banned and the ban was removed, THE system SHALL allow a new ban to be created for the same user in the same community.

# Filtering, Sorting, and Pagination

List query specifications for filtering, sorting, and pagination.

## List Query Specifications

Define filtering, sorting, and pagination rules for list operations.

### Feed Filtering Rules

WHEN a logged-in user requests the Home Feed, THE system SHALL display only posts from communities the user is subscribed to.

WHEN any user requests the Popular Feed, THE system SHALL display posts from all communities across the platform.

WHEN any user requests a Community Feed, THE system SHALL display only posts belonging to that specific community.

WHEN a guest user requests the Home Feed, THE system SHALL reject the request as Home Feed requires authentication.

WHILE filtering posts for any feed, THE system SHALL exclude posts that have been deleted by their author.

WHILE filtering posts for any feed, THE system SHALL exclude posts that have been deleted by community moderators.

IF a community is banned or removed, THEN THE system SHALL exclude all posts from that community in the Popular Feed.

WHILE filtering the Community Feed, THE system SHALL include posts regardless of the viewer's subscription status.

WHILE filtering the Home Feed, THE system SHALL update the results in real-time when the user subscribes or unsubscribes from communities.

### Post Sorting Specifications

WHEN a user selects Hot sorting, THE system SHALL rank posts by combining recency and vote score, with recent posts having many upvotes appearing first.

WHEN a user selects New sorting, THE system SHALL rank posts by creation time, with the most recently created posts appearing first.

WHEN a user selects Top sorting, THE system SHALL rank posts by vote score in descending order, with highest score appearing first.

WHEN a user selects Top sorting, THE system SHALL allow filtering by time period: today, this week, this month, this year, or all time.

WHEN a time filter is applied to Top sorting, THE system SHALL only consider votes cast within that time period for ranking.

WHEN a user selects Controversial sorting, THE system SHALL rank posts that have many votes but a vote score close to zero, appearing first.

WHILE calculating Controversial ranking, THE system SHALL consider posts with high total votes (upvotes plus downvotes) and low net score.

IF no sorting option is selected, THEN THE system SHALL default to Hot sorting for all feeds.

WHILE applying any sorting option, THE system SHALL maintain consistent ordering for posts with identical scores by using creation time as a tiebreaker.

### Pagination and Cursor Rules

WHEN any feed is requested, THE system SHALL return results in paginated form.

WHEN a user requests the first page of any feed, THE system SHALL return the initial set of posts without requiring a cursor.

WHEN a user requests subsequent pages, THE system SHALL require a cursor value from the previous page response.

WHILE implementing pagination, THE system SHALL use cursor-based pagination rather than page numbers.

WHEN the end of results is reached, THE system SHALL indicate no further pages are available.

WHILE generating cursors, THE system SHALL encode the position in the sorted result set, not a simple offset.

IF an invalid cursor is provided, THEN THE system SHALL reject the request and return an error indicating the cursor is invalid.

WHILE paginating through a feed, THE system SHALL maintain consistent sorting across all pages.

WHEN new posts are created while a user is paginating, THE system SHALL not guarantee those posts appear in the current pagination session.

WHILE paginating, THE system SHALL return a consistent number of items per page as defined by the default page size.

### Comment Sorting Rules

WHEN a user views comments on a post, THE system SHALL provide sorting options: Best, New, and Controversial.

WHEN a user selects Best sorting for comments, THE system SHALL rank comments by vote score in descending order, with highest score appearing first.

WHEN a user selects New sorting for comments, THE system SHALL rank comments by creation time, with the most recently created comments appearing first.

WHEN a user selects Controversial sorting for comments, THE system SHALL rank comments that have many votes but a vote score close to zero, appearing first.

IF no comment sorting option is selected, THEN THE system SHALL default to Best sorting.

WHILE sorting comments, THE system SHALL maintain the parent-child relationship structure regardless of sort order.

WHILE applying comment sorting, THE system SHALL sort top-level comments by the selected criterion.

WHILE displaying nested replies, THE system SHALL maintain chronological order within each reply thread regardless of parent sorting.

WHILE calculating comment rankings, THE system SHALL apply the same vote score calculation as post voting (upvotes minus downvotes).

### Query Result Limits

WHEN returning a paginated feed, THE system SHALL limit the number of posts per page to a reasonable default value.

WHEN returning comments on a post, THE system SHALL limit the number of top-level comments returned per page.

WHILE displaying post lists, THE system SHALL include for each post: title, author username, community name, vote score, comment count, time since posted, and type-specific preview.

WHILE displaying text posts in a list, THE system SHALL show the first 200 characters of content as a preview.

WHILE displaying image posts in a list, THE system SHALL show a thumbnail of the image.

WHILE displaying link posts in a list, THE system SHALL show the domain name of the URL.

WHILE displaying comments, THE system SHALL include for each comment: author, content, vote score, time since posted, and nested replies.

IF a query would return more results than the maximum limit, THEN THE system SHALL truncate results and provide a cursor for additional pages.

WHILE calculating time since posted, THE system SHALL display relative time (e.g., "3 hours ago") rather than absolute timestamps in list views.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Authentication and Authorization Errors

WHEN a user attempts to log in with incorrect credentials, THE system SHALL reject the login attempt.

WHEN a user attempts to access a logged-in feature without authentication, THE system SHALL deny access.

WHEN a user's session expires, THE system SHALL require re-authentication for protected actions.

IF a user attempts to change their password with an incorrect current password, THEN THE system SHALL reject the request.

IF a user attempts to delete their account while having an active session, THEN THE system SHALL require re-authentication.

WHEN authentication fails, THE system SHALL NOT reveal whether the email or password was incorrect.

WHEN authorization fails, THE system SHALL indicate that the user lacks permission for the requested action.

**Error Scenarios:**
- Login with invalid email or password results in rejection
- Accessing home feed without authentication results in redirection to login
- Password change with wrong current password results in failure
- Account deletion without recent authentication results in failure

### Resource Access Errors

WHEN a user requests a non-existent community, THE system SHALL indicate the community does not exist.

WHEN a user requests a non-existent post, THE system SHALL indicate the post does not exist.

WHEN a user requests a non-existent comment, THE system SHALL indicate the comment does not exist.

WHEN a user requests another user's profile that has been deleted, THE system SHALL indicate the user does not exist.

IF a user attempts to view a post in a community they cannot access, THEN THE system SHALL deny access.

WHEN a deleted resource is requested, THE system SHALL indicate the content is no longer available.

**Error Scenarios:**
- Requesting a community by name that does not exist results in not found error
- Requesting a post by ID that does not exist results in not found error
- Requesting a comment that has been deleted results in content unavailable error
- Viewing a profile of a deleted account results in user not found error

### Operation Violation Errors

WHEN a user attempts to create a post in a community they are not subscribed to, THE system SHALL reject the request.

WHEN a user attempts to vote on their own post, THE system SHALL reject the vote.

WHEN a user attempts to vote on their own comment, THE system SHALL reject the vote.

WHEN a user attempts to subscribe to a community they are already subscribed to, THE system SHALL reject the duplicate subscription.

WHEN a user attempts to unsubscribe from a community they are not subscribed to, THE system SHALL reject the request.

IF a user attempts to edit a post they did not author, THEN THE system SHALL reject the request.

IF a user attempts to delete a post they did not author, THEN THE system SHALL reject the request.

IF a user attempts to edit a comment they did not author, THEN THE system SHALL reject the request.

IF a user attempts to delete a comment they did not author, THEN THE system SHALL reject the request.

WHEN a user attempts to report content they authored, THE system SHALL reject the self-report.

WHEN a user attempts to submit a duplicate report on the same content, THE system SHALL reject the duplicate report.

**Failure Cases:**
- Posting to unsubscribed community results in subscription required error
- Self-voting on posts or comments results in vote rejection
- Duplicate subscription results in already subscribed error
- Editing or deleting another user's content results in permission denied error
- Self-reporting content results in report rejection
- Duplicate reporting results in report already exists error

### Content Restriction Errors

WHILE a user is banned from a community, THE system SHALL prevent them from creating posts in that community.

WHILE a user is banned from a community, THE system SHALL prevent them from creating comments in that community.

WHEN a banned user attempts to post in a community they are banned from, THE system SHALL reject the request and indicate the ban.

WHEN a banned user attempts to comment in a community they are banned from, THE system SHALL reject the request and indicate the ban.

IF a moderator attempts to ban the community owner, THEN THE system SHALL reject the ban.

IF a moderator attempts to ban another moderator, THEN THE system SHALL reject the ban.

IF a user attempts to remove a moderator without owner privileges, THEN THE system SHALL reject the request.

WHEN a user attempts to create a community with a name that already exists, THE system SHALL reject the duplicate name.

WHEN a user attempts to register with an email that already exists, THE system SHALL reject the duplicate registration.

WHEN a user attempts to register with a username that already exists, THE system SHALL reject the duplicate username.

**Exception Scenarios:**
- Banned user posting results in ban restriction error
- Banned user commenting results in ban restriction error
- Moderator banning owner results in authority violation error
- Moderator banning another moderator results in permission error
- Non-owner removing moderator results in permission denied error
- Duplicate community name results in name already exists error
- Duplicate email registration results in email already registered error
- Duplicate username registration results in username already taken error

# File Validation Rules

Validation rules and policies for file uploads and storage.

## File Validation and Policies

Define file type restrictions, virus scanning requirements, content validation, and retention policies for uploaded files.

### File Type Validation

WHEN a user uploads an avatar image, THE system SHALL accept only JPEG, PNG, and GIF formats.

WHEN a user uploads a community icon image, THE system SHALL accept only JPEG, PNG, and GIF formats.

WHEN a user creates an image post, THE system SHALL accept only JPEG, PNG, GIF, and WebP formats.

IF the uploaded file format is not in the allowed list, THE system SHALL reject the upload.

WHEN a file is uploaded, THE system SHALL validate that the file extension matches the actual file content type.

IF the file extension does not match the content type, THE system SHALL reject the upload.

THE system SHALL reject any file that is corrupted or cannot be opened as a valid image.

### Virus Scanning Requirements

WHEN any file is uploaded to the platform, THE system SHALL scan the file for malware and viruses before storing it.

IF a file fails the virus scan, THE system SHALL reject the upload and notify the user that the file is unsafe.

IF a file fails the virus scan, THE system SHALL NOT store the file.

THE system SHALL quarantine files that are flagged as suspicious during scanning.

THE system SHALL log all virus scan failures for security review.

WHILE a file is being scanned, THE system SHALL NOT make the file available to other users.

### File Retention Policies

WHEN a user deletes their account, THE system SHALL delete all files uploaded by that user including avatar images, community icons, and post images.

WHEN a community is deleted, THE system SHALL delete the community icon image.

WHEN a post is deleted, THE system SHALL delete any image files associated with that post.

THE system SHALL retain files for as long as the associated content exists on the platform.

IF a file is no longer referenced by any content, THE system SHALL delete the file within 30 days.

WHEN a user replaces their avatar image, THE system SHALL delete the previous avatar image.

WHEN a user replaces a community icon, THE system SHALL delete the previous icon image.