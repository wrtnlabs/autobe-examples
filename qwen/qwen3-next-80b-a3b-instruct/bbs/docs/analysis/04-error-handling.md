## Error Handling Requirements for Discussion Board

This document defines all user-facing error conditions and recovery processes for the discussion board. All errors are described from the user's perspective, with clear guidance on how users can recover or avoid the issue. Technical implementation details (API codes, database constraints, system logs) are deliberately excluded. All applicable requirements are expressed in EARS format.

### Authentication Failures

WHEN a user tries to log in with an incorrect email or password, THE system SHALL display the message: "The email or password you entered is incorrect. Please try again."

WHEN a user attempts to log in with an email that has not been verified, THE system SHALL display the message: "Please verify your email address before logging in. Check your inbox for a verification link."

WHEN a user’s authentication token has expired or is invalid, THE system SHALL redirect them to the login page with the message: "Your session has expired. Please log in again to continue."

WHILE a user is logged out, THE system SHALL prevent access to posting and commenting functions and display a banner: "You must be logged in to create posts or comments. Please log in."

IF a user submits a login form with an empty email or password field, THEN THE system SHALL display the message: "Please enter both your email and password to log in."

WHERE a user has attempted to log in five times with incorrect credentials within five minutes, THE system SHALL display the message: "Too many failed login attempts. Please wait 15 minutes before trying again."

### Upload Failures

WHEN a user tries to upload a file larger than 10 MB, THE system SHALL display the message: "The file you selected is too large. Please choose a file under 10 MB." 

WHEN a user tries to upload a file type that is not supported, THE system SHALL display the message: "This file type is not allowed. Please upload only images (JPG, PNG) or documents (PDF, TXT, DOCX)."

WHEN the upload is interrupted due to a lost network connection, THE system SHALL display the message: "Upload failed due to network issues. Please check your connection and try again."

WHEN the server rejects a file upload due to corruption or unexpected format, THE system SHALL display the message: "The file appears to be corrupted. Please select a valid file and try again."

IF a user tries to attach more than five files to a single post or comment, THEN THE system SHALL display the message: "You can attach up to five files per post or comment. Please select fewer files and try again."

IF a user tries to upload the same file twice within the same post, THEN THE system SHALL display the message: "This file has already been uploaded to this post. Please select a different file."

WHERE a user is not logged in and attempts to upload a file, THE system SHALL display the message: "You must be logged in to upload files. Please sign in first."

### Content Moderation Errors

WHEN a moderator attempts to delete a post that has been reported by users, THE system SHALL display the message: "This post has been reported by others. Are you sure you want to delete it permanently?"

WHEN a moderator attempts to edit a post that has been pinned by another moderator, THE system SHALL display the message: "This post is pinned and cannot be edited. Only an administrator can unpinned it first."

WHEN a citizen tries to delete a post or comment they did not create, THE system SHALL display the message: "You cannot delete posts or comments created by other users."

WHEN a citizen tries to edit a comment more than 24 hours after posting it, THE system SHALL display the message: "You can only edit your comments within 24 hours of posting. After that, the content is locked for editing."

WHEN a user submits a post that contains terms on the system’s blocked word list, THE system SHALL display the message: "Your post contains prohibited terms and cannot be submitted. Please revise your content."

WHEN a post is flagged for moderation but the system fails to display it correctly to a moderator, THE system SHALL display the message to the user: "Your post has been submitted for review. It will appear once approved."

### System-Level Errors

WHEN the system is temporarily unavailable due to maintenance or overload, THE system SHALL display the message: "We are currently experiencing technical difficulties. Please try again in a few minutes."

WHEN the search function fails to retrieve results due to a backend error, THE system SHALL display the message: "We couldn't search for posts right now. Please try again later."

WHEN a user tries to load a post that no longer exists (e.g., has been deleted or expired), THE system SHALL display the message: "The post you're looking for does not exist or has been removed."

WHILE the system is in degraded mode (e.g., file uploads disabled), THE system SHALL display a persistent banner at the top of the page: "Attention: File uploads are temporarily unavailable. All other features are working normally."

IF a user's device clocks are out of sync by more than five minutes and the system detects authentication issues as a result, THEN THE system SHALL display the message: "Your device's time is not synchronized. Please ensure your device time is set correctly to avoid login issues."

WHERE a user has JavaScript disabled in their browser, THE system SHALL display the message: "This website requires JavaScript to function properly. Please enable JavaScript in your browser settings."

### Concurrency and Validation Errors

WHEN two users try to edit the same comment at the same time, and the first user saves before the second, THE system SHALL display to the second user: "This comment has been updated by someone else. Please refresh the page and make your changes again."

WHEN a user submits a comment with empty content or only whitespace, THE system SHALL display the message: "Your comment cannot be empty. Please type something before submitting."

WHEN a user submits a post title longer than 200 characters, THE system SHALL display the message: "Post titles must be 200 characters or shorter. Please shorten your title and try again."

WHEN a user submits a comment longer than 500 characters, THE system SHALL display the message: "Comments cannot exceed 500 characters. Please shorten your message and try again."

IF a user tries to create a post with a duplicate title and content within 24 hours of a previous post, THEN THE system SHALL display the message: "You have posted nearly identical content within the last 24 hours. Please wait before posting again."

### Recovery and User Guidance

WHEN an error occurs, THE system SHALL provide at least one clear recovery option in the message text (such as "try again," "refresh," or "login").

WHEN a user encounters an error while logged in, THE system SHALL retain their form input (post content, comment text, file selections) where technically feasible to avoid forcing them to re-enter it.

WHEN a user encounters an error during file upload, THE system SHALL allow them to select and retry the upload without losing their text content.

WHERE an error message is displayed, THE system SHALL allow the user to continue using other unrelated features of the site (e.g., browsing posts) without requiring a page reload.

WHEN any error modal or alert is dismissed by the user, THE system SHALL NOT require any further validation or confirmation unless it is a critical system message.

THE system SHALL never display technical error codes, stack traces, internal status codes, or system timestamps to users.

THE system SHALL never crash, freeze, or redirect users to a blank error page under any circumstance.

THE system SHALL always provide friendly, human-readable guidance in the default language of the user's browser or country setting (en-US in this case).