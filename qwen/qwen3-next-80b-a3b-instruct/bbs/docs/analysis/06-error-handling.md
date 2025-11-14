## Error Handling Requirements

This document defines how the system must respond to errors, failures, and unexpected user behavior from the perspective of the end user. All error responses must be user-friendly, action-oriented, and never expose technical details, system architecture, or internal error codes.

### Authentication Errors

WHEN a user attempts to log in with an incorrect email or password, THE system SHALL display the message: "The email or password you entered is incorrect. Please try again or reset your password."

WHEN a user attempts to log in but has not verified their email address, THE system SHALL display the message: "Your email address has not been verified. Please check your inbox for a verification link. If you don’t see it, click 'Resend Verification Email'."

WHILE a user’s session has expired due to inactivity, THE system SHALL automatically redirect them to the login page and display the message: "Your session has expired. Please log in again to continue."

IF a user enters an invalid email format (missing @, no domain, etc.), THEN THE system SHALL prevent submission and show: "Please enter a valid email address in the format name@example.com."

IF a user tries to log in from a new device or location, THEN THE system SHALL display: "A login was detected from a new device. For your security, we sent a confirmation code to your email. Please check your inbox and enter the code below."

### Content Submission Failures

WHEN a user tries to create a post with no title or content, THE system SHALL prevent submission and display: "Please enter a title and some text before posting."

WHEN a user submits a post exceeding 10,000 characters, THE system SHALL prevent submission and display: "Your post is too long. Please limit it to 10,000 characters (about 1,500 words)."

WHEN a user attempts to submit a post containing only punctuation or symbols with no meaningful text, THE system SHALL prevent submission and display: "Your post appears to be empty or invalid. Please add a meaningful message."

WHEN a user tries to comment with an empty field, THE system SHALL prevent submission and display: "Please type a comment before submitting."

WHEN a user submits a comment exceeding 1,500 characters, THE system SHALL prevent submission and display: "Your comment is too long. Please limit it to 1,500 characters."

IF a post title contains only whitespace or special characters (e.g., !@#$%%), THEN THE system SHALL prevent submission and display: "Your title must contain readable text. Please enter a clear, meaningful title."

### Upload Failures

WHEN a user attempts to upload a file larger than 10 MB, THE system SHALL prevent upload and display: "The file you selected is too large. Maximum file size is 10 MB. Please choose a smaller file."

WHEN a user tries to upload a file type other than .jpg, .jpeg, .png, .gif, .pdf, .doc, .docx, .txt, or .mp3, THE system SHALL prevent upload and display: "This file type is not supported. Please upload an image (.jpg, .png, .gif), document (.pdf, .doc, .docx), or audio file (.mp3)."

WHEN an image file upload fails due to corruption, THE system SHALL display: "The image file appears to be damaged. Please try uploading a different file."

WHEN a file upload fails due to network interruption, THE system SHALL display: "Upload failed due to a network issue. Please check your connection and try again."

WHILE an image or file is being uploaded, THE system SHALL show a progress bar with appropriate text: "Uploading... 35% complete" (updating in real time)

WHEN a user tries to upload more than 3 files in a single post, THE system SHALL prevent upload and display: "You can upload up to 3 files per post. Remove one file to add another."

### Permission Denials

IF a citizen tries to delete a post they do not own, THEN THE system SHALL prevent the action and display: "You cannot delete this post. Only the author or a moderator can remove it."

IF a citizen tries to edit a post older than 24 hours, THEN THE system SHALL prevent the action and display: "You can only edit your own posts within 24 hours of posting. After that, only moderators can make changes."

IF a citizen tries to access the moderator dashboard, THEN THE system SHALL prevent access and display: "Access denied. You do not have moderator privileges."

IF a citizen tries to lock a thread or mark a post as verified, THEN THE system SHALL prevent the action and display: "Only moderators can perform this action."

IF a moderator attempts to delete another moderator’s post, THEN THE system SHALL prevent the action and display: "You cannot delete another moderator’s content. Please contact system administrator if urgent action is required."

### System Interruptions

WHILE the server is undergoing planned maintenance, THE system SHALL display a maintenance banner at the top of all pages with the message: "We’re performing scheduled maintenance. The site will be back shortly. Thank you for your patience."

IF the server experiences an unexpected outage, THE system SHALL display a generic error page with: "We’re sorry, but the site is currently unavailable. Please try again in a few minutes. If the problem continues, check our status page."

WHEN a search request times out after 5 seconds, THE system SHALL display: "Search took too long. Try refining your keywords or check back later."

WHEN the database connection fails unexpectedly, THE system SHALL display: "We’re experiencing temporary technical difficulties. Your content is safe. Please refresh the page in a moment."

IF rate limiting triggers due to excessive API calls from one user, THEN THE system SHALL display: "You’ve made too many requests recently. Please wait a minute before trying again."

WHEN a user refreshes a page during a post submission, and the server takes longer than 10 seconds to respond, THE system SHALL display: "Your post is still being saved. Do not close this window. Check your profile to see if it posted."