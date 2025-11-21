# Error Handling Requirements

This document defines all user-facing error conditions and recovery pathways for the communityBBS system. It ensures that every system failure is communicated clearly, consistently, and helpfully to users, with direct steps for recovery. All error messages are designed to eliminate user confusion, prevent repeat errors, and maintain trust in the platform. Backend developers must implement these behaviors precisely as specified — no technical details about HTTP codes, exception types, or middleware are included here. Only the user experience matters.

## Input Validation Errors

When users submit content or data that does not meet the required format or constraints, the system shall respond with specific, actionable feedback.

WHEN a user submits a post with an empty title, THE system SHALL display: "Please enter a title for your post."

WHEN a user submits a post with a title longer than 200 characters, THE system SHALL display: "Your title is too long. Please keep it under 200 characters."

WHEN a user submits a comment with empty content, THE system SHALL display: "Your comment cannot be empty. Please type something before submitting."

WHEN a user submits a comment longer than 500 characters, THE system SHALL display: "Comments are limited to 500 characters. Please shorten your message."

WHEN a user attempts to register with an invalid email format, THE system SHALL display: "Please enter a valid email address. Examples: user@example.com or admin@organization.org."

WHEN a user attempts to register with an email already in use, THE system SHALL display: "This email address is already registered. If this is your account, try logging in. If you forgot your password, use the \"Forgot Password\" option."

WHEN a user submits a password shorter than 8 characters during registration or change, THE system SHALL display: "Password must be at least 8 characters long. Include a mix of letters, numbers, and symbols for better security."

WHEN a user submits a password that does not contain at least one uppercase letter, one number, and one special character, THE system SHALL display: "Password must include at least one uppercase letter, one number, and one special character (like !, @, #, $)."

WHEN a user submits a username containing invalid characters (spaces, symbols, or non-alphanumeric), THE system SHALL display: "Usernames can only use letters, numbers, hyphens (-), and underscores (_). No spaces or special symbols allowed."

WHEN a user attempts to search with a query under 3 characters, THE system SHALL display: "Search queries must be at least 3 characters long to be meaningful."

## Authentication Failures

When authentication fails or a session becomes invalid, the system shall provide clear instructions for recovery.

WHEN a user enters incorrect email or password during login, THE system SHALL display: "The email or password you entered is incorrect. Please check for typos and try again. If you've forgotten your password, click \"Forgot Password.\""

WHEN a user's access token expires while making a request, THE system SHALL automatically redirect to the login screen with the message: "Your session has expired. Please log in again to continue. Your changes have been saved."

WHEN a user tries to access a protected resource without being logged in, THE system SHALL display: "You must be logged in to do that. Please log in or register if you don't have an account."

WHEN a user fails to verify their email address after registration, THE system SHALL display: "Your email address hasn't been verified yet. Check your inbox for a verification email. If you don't see it, check your spam folder or request a new verification email."

WHEN a user requests a password reset link but their email is not in the system, THE system SHALL display: "We don't recognize that email address. Please check the spelling and try again, or register for a new account."

WHEN a user follows an expired or invalid password reset link, THE system SHALL display: "This password reset link has expired or is invalid. Please request a new one using the \"Forgot Password\" option."

WHEN a user attempts to log in from a blocked country or IP address (per compliance rules), THE system SHALL display: "For your security, access from your current location is restricted. Please try again from a different device or network."

## Permission Denied Errors

When a user attempts an action they are not authorized to perform, the system shall respond based on their actor role and the context of the action.

WHEN a citizen attempts to edit another user's post, THE system SHALL display: "You can only edit your own posts. If you want to suggest changes, you can comment on the post."

WHEN a citizen attempts to delete another user's comment, THE system SHALL display: "You can only delete your own comments."

WHEN a citizen attempts to access the admin dashboard, THE system SHALL display: "You don't have permission to access that area. Only system administrators can access this page."

WHEN a moderator attempts to permanently delete another user's account, THE system SHALL display: "You cannot delete user accounts. Only system administrators have permission to do this. Please report the user if they violate community guidelines."

WHEN a moderator attempts to modify system configuration settings (e.g., email templates, rate limits), THE system SHALL display: "This setting can only be changed by a system administrator."

WHEN an admin attempts to delete a post that has been reported by 5 or more users and flagged for legal review, THE system SHALL display: "This post is under legal review. Only a system administrator with legal clearance can delete it."

WHEN any user attempts to access moderation tools without being a moderator or admin, THE system SHALL display: "You don't have moderation permissions. Contact an administrator if you believe this is an error."

## Service Unavailability

When external or internal services fail, the system shall maintain a consistent, user-friendly experience with clear recovery options.

WHILE email delivery service is unreachable during registration or password reset, THE system SHALL display: "We're having trouble sending your verification email right now. Please wait a few minutes and try again. Check your spam folder in case it was delivered."

WHILE the search index is being rebuilt or temporarily unavailable, THE system SHALL display: "Search is currently unavailable. Please try again in a few minutes."

WHILE the image upload service is down, THE system SHALL display: "We're experiencing technical difficulties with image uploads. You can still post text-only content and try uploading images again later."

WHEN the system cannot connect to the notification queue to deliver replies or mentions, THE system SHALL display: "Your message was posted successfully, but notifications to users may be delayed. They'll see your update as soon as the system catches up."

WHEN a user's device loses connectivity while submitting a post, THE system SHALL display: "We couldn't save your post because your internet connection was lost. Please check your connection and try again. Your draft has been saved locally."

WHEN the system experiences an unexpected internal failure (e.g., database timeout, unhandled exception), THE system SHALL display: "We're sorry, something went wrong on our end. Our team has been notified, and we're working to fix it. Please try again in a few minutes."

## Data Integrity Failures

When the system encounters data conflicts, duplicates, or corruption, it shall enforce integrity rules with clear user impact.

IF a user attempts to submit a post that is identical to one they submitted within the last 2 minutes, THEN THE system SHALL display: "You've posted the same content too recently. Please wait before posting again."

IF a user attempts to edit a comment after the 24-hour edit window has passed, THEN THE system SHALL display: "You can no longer edit this comment. Edits are only allowed within 24 hours of posting."

IF a user attempts to vote on the same post or comment more than once using the same device or account, THEN THE system SHALL display: "You've already voted on this item. You can change your vote only once."

IF a user attempts to report the same content for a second time within 24 hours, THEN THE system SHALL display: "You've already reported this content. The moderation team is reviewing your report. Please wait before reporting again."

IF the system detects a post or comment flagged as spam by automated filters and already has 3 or more reports, THEN THE system SHALL hide the content from public view and display to the author: "Your post has been temporarily hidden because it matches patterns of spam or abuse. It will be reviewed by a moderator."

IF a user attempts to upload a file larger than 10MB, THEN THE system SHALL display: "File size exceeds the 10MB limit. Please compress your file or upload a smaller version."

IF a user attempts to upload a file with an unsupported extension (.exe, .bat, .dll, .js, etc.), THEN THE system SHALL display: "This file type is not supported for security reasons. Please upload images (JPG, PNG, GIF) or PDF files only."

IF a user's profile image upload fails due to corruption (e.g., broken header, unsupported format), THEN THE system SHALL display: "We couldn't process your profile picture. Please try a different image file in JPG, PNG, or GIF format."

## User-Facing Recovery Steps

Every error state shall include clear, concise, and actionable steps for the user to recover, ensuring they are never permanently locked out or left confused.

WHEN any error message is displayed, THE system SHALL also provide one or more links or buttons labeled with the following exact phrases:

- "Try Again"
- "Go Back"
- "View Your Drafts"
- "Request New Verification Email"
- "Forgot Password?"
- "Contact Support"

WHEN an error occurs during post creation, THE system SHALL automatically save the draft in local storage and display: "Your draft has been saved. You can access it later by clicking \"View Your Drafts.\""

WHEN an authentication error occurs, THE system SHALL preserve the user's entered email address if valid and pre-fill it on the login screen on retry.

WHEN a user receives a \"Permission Denied\" message, THE system SHALL display: \"If you believe you should have access to this feature, contact your community administrator.\"

WHEN an error occurs that violates data integrity rules, THE system SHALL display: \"To avoid this issue in the future, please review our [Help Center Guidelines](#).\"

WHEN a service outage occurs for longer than 10 minutes, THE system SHALL display: \"We're currently experiencing higher-than-normal traffic. Please try again later or follow our status page for updates: [status.communitybbs.example](http://status.communitybbs.example)\"

WHEN a user has been temporarily suspended by a moderator, THE system SHALL display: \"Your account has been suspended for violating community guidelines. Suspensions are reviewed automatically every 48 hours. You can appeal via our support portal if you believe this was a mistake.\"

WHEN a user requests data export under GDPR, THE system SHALL display: \"Your personal data export is being prepared. You will receive an email within 24 hours with a secure download link.\"

WHEN a user requests permanent account deletion, THE system SHALL display: \"Your account will be permanently deleted in 14 days. During this period, you can cancel deletion by logging in. After that, all your data will be irreversibly erased.\"