## 1. Login and Authentication Errors

WHEN a user attempts to log in with an incorrect email or password, THE system SHALL display the message: "Invalid email or password. Please try again or reset your password." WHERE the User Input does not match any registered account, THE system SHALL NOT reveal whether the email exists or not to prevent enumeration attacks.

WHEN a user attempts to log in while their account is suspended system-wide by an administrator, THE system SHALL display the message: "Your account has been suspended. Contact support for more information." and SHALL prevent session creation.

WHILE a user is locked out due to five consecutive failed login attempts within 15 minutes, THE system SHALL display the message: "Too many failed attempts. Your account is temporarily locked. Please try again in 30 minutes." and SHALL block all login attempts until the lockout period expires.

WHEN a user submits a login request with an unverified email address, THE system SHALL display the message: "Please verify your email address before logging in. Check your inbox for a verification link." and SHALL send a new verification email if requested.

WHEN a user attempts to log in from a new device or location, THE system SHALL allow login but SHALL display a notification: "New device detected. Click here to review recent activity." and SHALL log the event for audit purposes.

## 2. Registration Validation Errors

WHEN a user submits a registration form with an email that is already registered, THE system SHALL display the message: "This email address is already in use. Did you forget your password?" and SHALL NOT reveal whether the account is verified or suspended.

WHEN a user submits a registration form with an email that does not contain a valid format (e.g., missing @ or domain), THE system SHALL display the message: "Please enter a valid email address (e.g., user@example.com)."

WHEN a user submits a password that is fewer than 8 characters, THE system SHALL display the message: "Password must be at least 8 characters long and include a combination of letters and numbers."

WHEN a user submits a password that is commonly used or appears in known breach databases, THE system SHALL display the message: "This password is too common. Please choose a stronger, unique password."

WHEN a user submits a username that contains non-alphanumeric characters (except underscore and hyphen), THE system SHALL display the message: "Username may only contain letters, numbers, underscores (_), and hyphens (-)."

WHEN a user submits a username that is already taken, THE system SHALL display the message: "This username is already taken. Please choose another."

WHEN a user submits a registration form with missing fields (e.g., no email, no password), THE system SHALL display the message: "Please fill in all required fields (Email, Username, Password)."

## 3. Post Submission Failures

WHEN a member submits a post with an empty content field (no text, no link, no image), THE system SHALL display the message: "Your post must contain at least text, a link, or an image. Please add content before posting."

WHEN a user attempts to post more than 5 times within a 1-minute period, THE system SHALL display the message: "You’re posting too quickly. Please wait 30 seconds before posting again."

WHEN a user attempts to submit a post in a community that has been deleted or deactivated, THE system SHALL display the message: "This community is no longer available. Please choose another community to post in."

WHEN a user attempts to submit a link that is malformed or invalid (e.g., not starting with http:// or https://), THE system SHALL display the message: "The URL you entered is invalid. Make sure it starts with http:// or https://."

WHEN a user attempts to upload an image file larger than 20MB, THE system SHALL display the message: "Image files must be 20MB or smaller. Compress your image or select a smaller file."

WHEN a user attempts to submit a post with content flagged by automated moderation as likely violating community guidelines, THE system SHALL display the message: "Your post has been blocked due to potential policy violations. Please review our community guidelines and try again." and SHALL queue the post for moderator review.

## 4. Voting Errors (Rate Limiting)

WHEN a user attempts to upvote or downvote a post or comment more than once, THE system SHALL display the message: "You’ve already voted on this post. You may change your vote by clicking again."

WHEN a user attempts to vote on their own post or comment, THE system SHALL display the message: "You cannot vote on your own content."

WHEN a user attempts to cast 10 or more votes within 10 seconds, THE system SHALL display the message: "You're voting too quickly. Please wait 5 seconds between votes."

WHEN a guest (unauthenticated user) attempts to vote on a post or comment, THE system SHALL display the message: "You must be logged in to vote. Sign in or create an account to participate."

WHEN the system is unable to record a vote due to database unavailability, THE system SHALL display the message: "We couldn't record your vote right now. Please try again in a few moments. Your vote will not be lost if you retry."

## 5. Comment Submission Errors

WHEN a user submits a comment with empty content, THE system SHALL display the message: "Your comment cannot be empty. Please add some text before posting."

WHEN a user attempts to submit a comment longer than 10,000 characters, THE system SHALL display the message: "Comments are limited to 10,000 characters. Please shorten your comment and try again."

WHEN a user attempts to reply to a comment that does not exist or has been deleted, THE system SHALL display the message: "This comment is no longer available. The original poster may have deleted it."

WHEN a user attempts to create a reply deeper than 8 levels nested (e.g., reply to a reply to a reply that’s already 8 levels deep), THE system SHALL display the message: "Comments can only be nested up to 8 levels deep. Please reply to a higher-level comment instead."

WHEN a user attempts to submit a comment in a community they are not subscribed to, and the community requires subscription to comment, THE system SHALL display the message: "You must subscribe to this community before you can comment. Click 'Subscribe' above to join."

WHEN a user attempts to submit a comment containing text flagged by automated moderation, THE system SHALL display the message: "Your comment contains content that violates our guidelines. Please edit and try again."

## 6. Report Submission Errors

WHEN a user attempts to submit a report without selecting a reason (e.g., spam, harassment, NSFW, etc.), THE system SHALL display the message: "Please select a reason for your report from the options provided."

WHEN a user attempts to report their own post or comment, THE system SHALL display the message: "You cannot report your own content. If you want to delete it, you can edit or remove it directly."

WHEN a user attempts to report a piece of content that has already been reviewed and removed, THE system SHALL display the message: "This content has already been reviewed and removed. Thank you for helping keep the community safe."

WHEN a user attempts to submit a report with text longer than 500 characters, THE system SHALL display the message: "Report descriptions are limited to 500 characters. Please summarize your concern clearly."

WHEN a guest attempts to report content, THE system SHALL display the message: "You must be logged in to report content. Sign in or create an account to report inappropriate posts or comments."

WHEN the system receives 5 or more reports on the same content within 1 hour, THE system SHALL queue the content for immediate moderator review but shall not notify the reporter of this event. The reporter SHALL see: "Thank you for reporting this. Our moderators are reviewing it."

## 7. Community Creation Failures

WHEN a user attempts to create a community with a name less than 3 characters long, THE system SHALL display the message: "Community names must be at least 3 characters long."

WHEN a user attempts to create a community with a name that uses disallowed characters (e.g., spaces, special symbols), THE system SHALL display the message: "Community names may only contain letters, numbers, underscores (_), and hyphens (-)."

WHEN a user attempts to create a community with a name that is already taken, THE system SHALL display the message: "A community with this name already exists. Try a different name."

WHEN a user attempts to create more than 5 communities within a 24-hour period, THE system SHALL display the message: "You can only create up to 5 communities per day. Please wait before creating another one."

WHEN a user attempts to create a community while their account is suspended, THE system SHALL display the message: "Your account is suspended. You cannot create communities until your suspension is lifted."

WHEN the system cannot generate a unique community slug due to a collision, THE system SHALL retry internally, and if multiple attempts fail after 5 tries, SHALL display: "We had trouble creating your community. Please try again."

## 8. System Temporarily Unavailable

WHEN the backend services are experiencing high load or partial failure, THE system SHALL display a standardized message: "We're experiencing temporary technical difficulties. Please try again in a few moments. Our team is working to fix this."

WHILE the system is undergoing scheduled maintenance, THE system SHALL show: "The platform is currently down for scheduled maintenance. We'll be back shortly. Check our status page for updates: https://status.communityplatform.com"

WHEN a critical outages occur affecting authentication or posting services, THE system SHALL service a static maintenance page with HTTP 503 status code, with no login or content interaction options available.

WHEN a user is in the middle of a draft-and-unsaved action (e.g., typing a post) and the connection drops unexpectedly, THE system SHALL store the draft in local browser storage and SHALL restore it upon next visit, even if they log out and back in.

## 9. Display or Data Loading Failures

WHEN a user’s profile page fails to load due to a database timeout, THE system SHALL display: "We couldn't load your profile right now. Try refreshing the page. Your posts and comments are safely saved."

WHEN a post's comment thread takes longer than 4 seconds to load, THE system SHALL display a spinner and the message: "Loading comments... This may take a moment."

WHEN a post's image cannot be retrieved from hosting (e.g., broken link or external image removed), THE system SHALL display the text: "[Image not available]" and a placeholder icon, and SHALL log the incident for review.

WHEN a user attempts to load a community with no posts, THE system SHALL display: "This community doesn't have any posts yet. Be the first to create one!"

WHEN an API response for sorting (e.g., "top", "controversial") is missing or malformed, THE system SHALL fall back to "new" order and display: "We couldn't load this sort option. Showing newest posts instead."

## 10. Interruptions During Editing/Submitting

WHEN a user edits a post or comment and navigates away from the page before saving, THE system SHALL prompt: "You have unsaved changes. Do you want to leave this page? Your changes will be lost." If the user confirms, the draft SHALL be saved locally.

WHEN a user submits an edited post or comment and the network fails before confirmation, THE system SHALL display: "Your changes were not saved. Try again. You can find your draft in your browser's history."

WHILE a user is editing a post that has since been deleted by a moderator, THE system SHALL display: "This post was deleted by a moderator. You can no longer edit it."

WHEN a user tries to edit a comment or post after 24 hours have passed since creation, THE system SHALL display: "You can only edit your posts and comments within 24 hours of posting. After that, they are locked for editing."

WHEN a user tries to edit a post while offline and then reconnects, THE system SHALL detect the network return and SHALL prompt: "You have unsaved edits. Would you like to try submitting them again?" and SHALL attempt to resubmit automatically upon confirmation.


> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*