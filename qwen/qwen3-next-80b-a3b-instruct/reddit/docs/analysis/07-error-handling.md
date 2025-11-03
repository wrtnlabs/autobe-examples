# Error Handling Requirements

This document defines all error conditions, edge cases, system failures, and recovery processes as experienced by the user. These requirements are written from the user’s perspective to ensure robust, user-friendly responses to unintended behavior. All responses must be clear, actionable, and avoid technical jargon.

## Authentication Failures

### Login Failures

IF a user enters an incorrect email address or password, THEN THE system SHALL display the message: "Invalid email or password. Please try again."

IF a user attempts to log in with an unverified email address, THEN THE system SHALL display the message: "Your email address has not been verified. Please check your inbox for a verification link."

IF a user enters invalid email format (e.g., missing @, no domain), THEN THE system SHALL display the message: "Please enter a valid email address."

IF a user is locked out after five consecutive failed login attempts, THEN THE system SHALL display the message: "Too many failed attempts. Your account has been temporarily locked. Try again in 30 minutes, or reset your password."

### Logout Failures

IF a user attempts to log out while not authenticated, THEN THE system SHALL silently ignore the request and remain on the current page with no error message.

## Registration Validation Errors

IF a user attempts to register with an email address already in use, THEN THE system SHALL display the message: "This email address is already registered. If you’ve forgotten your password, reset it instead."

IF a user attempts to register with a password shorter than 8 characters, THEN THE system SHALL display the message: "Password must be at least 8 characters long."

IF a user attempts to register with a password that does not contain at least one number, THEN THE system SHALL display the message: "Password must contain at least one number."

IF a user attempts to register with a username that already exists, THEN THE system SHALL display the message: "This username is already taken. Please choose another."

IF a user attempts to register with a username longer than 20 characters, THEN THE system SHALL display the message: "Username must be 20 characters or less."

IF a user does not check the "I agree to the Terms of Service" box during registration, THEN THE system SHALL display the message: "You must agree to the Terms of Service to register."

IF the email verification service fails to send a confirmation email, THEN THE system SHALL display the message: "We couldn’t send your verification email. Please check your spam folder or try again later."

## Content Submission Errors

IF a guest attempts to create a post, THEN THE system SHALL display the message: "You must be logged in to create posts. Please log in or register." and redirect to the login page.

IF a member attempts to submit a post with an empty title, THEN THE system SHALL display the message: "Please enter a title for your post."

IF a member attempts to submit a post with an empty body and no link or image, THEN THE system SHALL display the message: "A post must contain text, a link, or an image."

IF a member attempts to submit a post with a link that is malformed (e.g., missing http:// or https://), THEN THE system SHALL display the message: "Please enter a valid URL (e.g., https://example.com)."

IF a member attempts to upload an image larger than 10MB, THEN THE system SHALL display the message: "Image file must be under 10MB. Compress or resize the image and try again."

IF a member attempts to upload a non-image file (e.g., .exe, .zip) as an image, THEN THE system SHALL display the message: "Only image files (PNG, JPG, GIF, WebP) are allowed."

IF a member attempts to create a post in a community they were banned from, THEN THE system SHALL display the message: "You’ve been banned from this community and cannot post here."

IF a member attempts to create a post in a community that has been permanently removed by admins, THEN THE system SHALL display the message: "This community no longer exists."

## Voting Limit Violations

IF a guest attempts to upvote or downvote a post, THEN THE system SHALL display the message: "You must be logged in to vote. Please log in or register."

IF a member attempts to vote on their own post, THEN THE system SHALL display the message: "You cannot vote on your own posts."

IF a member attempts to vote on their own comment, THEN THE system SHALL display the message: "You cannot vote on your own comments."

IF a member attempts to cast more than one vote on the same post within 5 seconds, THEN THE system SHALL display the message: "You’ve already voted on this post. Please wait before changing your vote."

IF a member attempts to vote on a post that has been deleted, THEN THE system SHALL display the message: "This post has been removed."

IF a member attempts to vote on a comment that has been deleted, THEN THE system SHALL display the message: "This comment has been removed."

## Comment Submission Issues

IF a guest attempts to comment on a post, THEN THE system SHALL display the message: "You must be logged in to comment. Please log in or register."

IF a member attempts to submit a comment with an empty body, THEN THE system SHALL display the message: "Your comment can't be empty. Please add some text."

IF a member attempts to submit a comment longer than 10,000 characters, THEN THE system SHALL display the message: "Comments are limited to 10,000 characters. Please shorten your comment."

IF a member attempts to reply to a comment that no longer exists (deleted or removed), THEN THE system SHALL display the message: "The comment you're replying to has been removed."

IF a member attempts to post a comment in a post that has been locked, THEN THE system SHALL display the message: "Comments on this post are closed."

IF a member attempts to post in a community they have been banned from, THEN THE system SHALL display the message: "You’ve been banned from this community and cannot comment here."

## Subscription Conflicts

IF a guest attempts to subscribe to a community, THEN THE system SHALL display the message: "You must be logged in to subscribe to communities. Please log in or register."

IF a member attempts to subscribe to a community they are already subscribed to, THEN THE system SHALL display the message: "You’re already subscribed to this community."

IF a member attempts to subscribe to a community that has been removed or banned by admins, THEN THE system SHALL display the message: "This community has been removed and is no longer available."

IF a member attempts to subscribe to their own community, THEN THE system SHALL display the message: "You can't subscribe to your own community."

## Reporting Processing Failures

IF a guest attempts to report content, THEN THE system SHALL display the message: "You must be logged in to report content. Please log in or register."

IF a member attempts to report a post that has already been removed, THEN THE system SHALL display the message: "This content has already been removed."

IF a member attempts to report a post with no reason selected, THEN THE system SHALL display the message: "Please select a reason for your report."

IF a member submits a report with a reason of "Other" but leaves the text field empty, THEN THE system SHALL display the message: "Please describe the issue in detail when selecting 'Other'."

IF a member attempts to report more than 10 pieces of content in a single minute, THEN THE system SHALL display the message: "You've reported too many items in a short time. Please wait a few minutes before reporting again."

IF a member attempts to report content that belongs to an admin, THEN THE system SHALL display the message: "This content belongs to a system administrator and cannot be reported."

IF the system fails to confirm receipt of a report after submission, THEN THE system SHALL display the message: "Your report was not submitted successfully. Please try again. If the problem continues, contact support."

## Community Management Restrictions

IF a guest attempts to create a community, THEN THE system SHALL display the message: "You must be logged in to create a community. Please log in or register."

IF a member attempts to create a community with a name that is already taken, THEN THE system SHALL display the message: "A community with this name already exists. Choose another name."

IF a member attempts to create a community with a name shorter than 3 characters, THEN THE system SHALL display the message: "Community name must be at least 3 characters long."

IF a member attempts to create a community with a name longer than 25 characters, THEN THE system SHALL display the message: "Community name must be 25 characters or less."

IF a member attempts to delete a community they do not own, THEN THE system SHALL display the message: "Only the creator of this community can delete it."

IF a member attempts to change the name of a community they do not own, THEN THE system SHALL display the message: "Only the creator of this community can change its name."

IF a member attempts to change the description of a community they do not own, THEN THE system SHALL display the message: "Only the creator of this community can edit its description."

## Karma System Errors

IF a member’s karma score drops below 0 due to downvotes, THEN THE system SHALL still display their score as 0 visually, but store the negative balance internally.

IF a member attempts to check another user’s karma and the user has never posted or commented, THEN THE system SHALL display the message: "This user has no karma yet. They haven’t posted or commented on anything."

IF a member attempts to give karma directly by any manual method (e.g., gift feature), THEN THE system SHALL display the message: "Karma is earned only through community participation. Direct karma gifts are not allowed."

IF a member’s karma is permanently frozen due to violations (spam, abuse), THEN THE system SHALL display the message: "Your karma is frozen due to policy violations. You can still post and comment, but your karma values are temporarily disabled."

## System-Level Failures and Recovery

IF the database experiences a temporary downtime, THEN THE system SHALL display a user-friendly message: "We’re experiencing a temporary issue. Please try again in a few minutes."

IF the entire platform is completely offline (scheduled or unscheduled maintenance), THEN THE system SHALL display a message on all pages: "We’re performing maintenance. We’ll be back soon. Thank you for your patience."

IF a user’s session expires due to inactivity, THEN THE system SHALL redirect them to the login page with the message: "Your session has expired. Please log in again."

IF a server timeout occurs during a complex operation (e.g., bulk loading top posts), THEN THE system SHALL display the message: "The request took too long to process. Please try again or select a different sorting option."

IF the system discovers a duplicate post (exact title, link, image hash) created by same user within 1 hour, THEN THE system SHALL display the message: "You already shared this exact post within the last hour. Please wait or try something different."

IN ANY CASE of unhandled server-side error, THEN THE system SHALL display a consistent message: "Something went wrong on our end. We’re working to fix it. Please try again later."

## Network and Connectivity Errors

WHILE a user has an unstable or no internet connection, THE system SHALL disable all input fields (post, comment, vote) and display a banner at the top of every page: "No internet connection. You’re offline."

WHEN a user regains internet connection, THE system SHALL automatically retry any failed submissions (e.g., unposted draft, unsubmitted comment) and display a toast notification: "Your post was successfully submitted."

IF a network error occurs during image upload, THE system SHALL preserve the draft and display: "Your image didn’t upload. Check your connection and try again."

IF a network error occurs during post submission, THE system SHALL preserve the text, link, and image selections so the user can retry without re-creating content.

## Rate Limiting Consequences

IF a member submits more than 5 posts within one minute, THEN THE system SHALL display the message: "You’ve posted too frequently. Please wait a few minutes before posting again."

IF a member submits more than 20 comments within one minute, THEN THE system SHALL display the message: "You’ve commented too frequently. Please slow down to avoid triggering spam filters.

IF a member performs more than 50 votes in one minute, THEN THE system SHALL display the message: "You’ve voted too quickly. Please slow down. We only allow a limited number of votes per minute." 

IF a member requests a password reset more than 3 times in 10 minutes, THEN THE system SHALL display the message: "Too many reset requests. Please wait 1 hour before trying again."

IF a member attempts to access their profile more than 30 times in one minute, THEN THE system SHALL display the message: "Too many requests. Please wait before trying again."

IF a member attempts to view more than 100 posts in a community within 10 seconds using quick scroll, THEN THE system SHALL display the message: "Too many rapid requests. Please scroll normally."

IF a member attempts to perform a search query more than 10 times in 15 seconds, THEN THE system SHALL display the message: "You’ve searched too quickly. Please wait a few seconds before searching again."


> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*