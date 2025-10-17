### Guest Journey: Viewing Content

WHEN a visitor accesses the economicBoard website for the first time, THE system SHALL display the homepage with a chronological list of all public posts, organized by topic categories. 

WHEN a guest scrolls through the post list, THE system SHALL display the following for each post: title, author (displayed as "Anonymous"), topic category, timestamp (in "YYYY-MM-DD HH:mm" format), and the first 150 characters of content.

WHILE a guest is viewing the homepage, THE system SHALL enable filtering of posts by topic category using a visible sidebar or dropdown menu containing all predefined topics (e.g., "Inflation", "Tax Policy", "Elections", "Global Trade", "Regulation").

WHEN a guest selects a topic category, THE system SHALL immediately filter the post list to show only posts tagged with that topic, preserving chronological order.

WHEN a guest clicks on a post title, THE system SHALL navigate to a detail page displaying the full content of the post, all associated replies, the original timestamp, and the topic category.

WHEN a guest attempts to reply to a post, THE system SHALL disable the reply input field and display a message: "You must be a registered member to reply. Register to join the discussion."

WHEN a guest attempts to create a new post, THE system SHALL disable the "New Post" button and display a message: "You must be a registered member to create a post. Register to contribute your ideas."

WHEN a guest navigates to a topic page with no posts, THE system SHALL display: "No posts yet in this category. Be the first to start the conversation!"

WHEN a guest performs a search using the global search bar, THE system SHALL return posts containing matching keywords in title or content, sorted by relevance with newest matching posts appearing first.

WHILE a guest is viewing any page, THE system SHALL clearly display the current topic filter status (e.g., "Viewing: Inflation").


### Member Journey: Creating and Editing Posts

WHEN an anonymous user clicks the "Register" button, THE system SHALL redirect them to an email-based registration form requiring only a valid email address and password.

WHEN a user submits a valid registration, THE system SHALL send a verification email to the provided address with a one-time link to confirm account ownership.

WHEN a user clicks the verification link, THE system SHALL mark their account as "verified" and grant member privileges immediately.

WHEN a verified member navigates to the homepage and clicks "New Post", THE system SHALL display a modal with two fields: "Topic" (dropdown with predefined topics) and "Content" (text area with a 2,000-character limit).

WHEN a member submits a new post, THE system SHALL immediately save the post with status "pending moderation".

WHEN a member submits a new post, THE system SHALL display a confirmation banner: "Your post has been submitted for review. It will appear publicly once approved by an administrator."

WHEN a member views any page after submitting a pending post, THE system SHALL display a persistent status indicator next to their username: " awaiting moderation".

WHILE a member's post is pending moderation, THE system SHALL prevent editing, deletion, or replaying of the post.

WHEN a member attempts to edit their own post within 24 hours of submission, THE system SHALL enable the "Edit" button.

WHEN a member clicks "Edit" on a post they authored and the 24-hour window is active, THE system SHALL load the previous content into an editable form.

WHEN a member submits an edit to their own post, THE system SHALL update the post content and update the "last edited" timestamp.

WHEN a member attempts to edit their own post after the 24-hour window has expired, THE system SHALL disable the "Edit" button and display: "Edits are only permitted for 24 hours after posting."

WHEN a member attempts to delete their own post during the 24-hour window, THE system SHALL display a confirmation dialog: "Are you sure you want to delete this post? This cannot be undone."

WHEN a member confirms deletion of their own post, THE system SHALL immediately remove the post from public view and retain no trace in the system.

WHEN a member's post is rejected by an administrator, THE system SHALL place a visible banner on the post: "This post was removed by an administrator for violating community guidelines."

WHEN a member's post is rejected by an administrator, THE system SHALL send the member an email notification: "Your post titled '[Title]' was removed. Reason: [Reason provided by admin]."

WHEN a member attempts to view a post that has been deleted by an administrator, THE system SHALL redirect them to a page displaying: "This post has been removed by an administrator."


### Admin Journey: Moderating Content

WHEN an admin logs in, THE system SHALL display a dedicated moderation dashboard with two primary tabs: "Pending Posts" and "All Posts".

WHEN an admin opens the "Pending Posts" tab, THE system SHALL display a list of all new posts submitted by members with status "pending moderation".

WHEN an admin views a pending post, THE system SHALL show the full content, timestamp, author email (hidden from members), and topic.

WHEN an admin approves a pending post, THE system SHALL immediately change the post status to "public" and remove it from the pending queue.

WHEN an admin approves a pending post, THE system SHALL send an email notification to the author: "Your post titled '[Title]' has been approved and is now visible to all members."

WHEN an admin rejects a pending post, THE system SHALL enter a modal requiring a reason for rejection (e.g., "Violates neutrality", "Contains personal attacks", "Off-topic", "Duplicate").

WHEN an admin submits a rejection reason, THE system SHALL set the post status to "rejected", remove it from public view, and notify the author via email.

WHEN an admin opens the "All Posts" tab, THE system SHALL display a searchable, filterable list of all published posts and rejected posts, sorted by most recent activity.

WHEN an admin selects a public post for review, THE system SHALL display an option to "Delete Post".

WHEN an admin clicks "Delete Post", THE system SHALL display a confirmation modal: "Are you sure you want to permanently delete this post? This action cannot be undone." 

WHEN an admin confirms a deletion, THE system SHALL remove the post from all visible lists and databases, with no record retained.

WHEN an admin deletes a post, THE system SHALL notify the author: "Your post titled '[Title]' has been permanently deleted. Reason: [Admin's reason]."

WHILE an admin is moderating, THE system SHALL display a notification badge on the moderation tab whenever new posts are submitted.

WHEN an admin navigates to edit category topics, THE system SHALL display a form to add, rename, or deprecate topics, with a warning for topics in active use.


### Error Scenarios and Recovery

IF a member's email verification link expires (after 7 days), THEN THE system SHALL display: "Your verification link has expired. Please request a new one." and provide a "Resend Verification Email" button.

IF a member attempts to register with an email already in use, THEN THE system SHALL display: "This email is already registered. Log in or reset your password."

IF a member attempts to submit a post with empty content, THEN THE system SHALL prevent submission and highlight the content field with: "Post content cannot be empty."

IF a member attempts to submit a post with content exceeding 2,000 characters, THEN THE system SHALL truncate the input preview and display: "Your post exceeds the 2,000-character limit. Please shorten your message."

IF a guest searches for a keyword with no results, THEN THE system SHALL display: "No posts found matching '[search term]'. Try a different keyword or browse topics."

IF the system experiences an outage during post submission, THEN THE system SHALL inform the member: "We're experiencing technical difficulties. Your post has been saved locally and will be submitted when the system is back up."

IF a member loses connection before their post is approved, THEN THE system SHALL retain and display their pending post upon reconnection.


### Post Approval Workflow

WHEN a member submits a post, THE system SHALL assign it to the "pending moderation" queue.

WHILE a post is in "pending moderation", THE system SHALL not display it to guests or other members.

WHEN an admin approves a post, THE system SHALL immediately transition its status to "published" and remove it from moderation queue.

WHEN a post is approved, THE system SHALL notify the author by email and make the post visible to all users.

WHEN an admin rejects a post, THE system SHALL retain a record of rejection for audit purposes but SHALL not make the post visible to any user.

IF an admin has not reviewed a post within 48 hours, THE system SHALL send Monday morning email reminders to all active admins: "You have 3 pending posts awaiting moderation."


### Topic Navigation Flow

WHEN a guest or member clicks on a topic label (e.g., "Inflation"), THE system SHALL apply that topic as a live filter, redirecting the user to /topics/[topic-name].

WHILE a topic filter is active, THE system SHALL display a persistent breadcrumb: "Home > [Topic]".

WHEN a user clicks the "Home" link in the breadcrumb, THE system SHALL clear the topic filter and return to the full post list.

WHEN a member submits a new post, THE system SHALL allow them to select only one of the predefined topics from a restricted dropdown menu (no custom topics allowed).

WHEN an admin adds a new topic, THE system SHALL make it available to members as a selection option within 10 seconds.

WHEN a topic has no posts for 90 days, THE system SHALL suggest deprecating it to the admin with the option to preserve or permanently remove it.

WHEN a deprecated topic is selected, THE system SHALL display: "This topic is no longer active. Posts under this category may be archived."

WHEN a deprecated topic is accessed via direct link, THE system SHALL display a notice: "This topic has been deprecated and may be removed soon."


> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*