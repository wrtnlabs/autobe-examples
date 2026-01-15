# User Journey: Creating a Post with Attachments

## Introduction

This document details the complete end-to-end user journey for citizens creating a new post with image and file attachments in the economic/political discussion board system. It describes every interaction from authentication through post visibility, including attachment handling and system behaviors. All requirements are written in natural language using EARS format where applicable, and focus exclusively on business requirements — not technical implementation.

This journey is performed by the "citizen" actor. Moderators may view published posts but do not create posts as part of this workflow.

## Step 1: Login/Register

Citizens must be authenticated to create posts. The system provides two entry points: registration for new users and login for existing users.

WHEN a new citizen visits the discussion board, THE system SHALL display a prominent "Register" button and a "Log In" link in the header.

WHEN a citizen clicks "Register", THE system SHALL present a form requesting:
- Email address (required, valid email format)
- Username (required, 3-30 characters, alphanumeric and underscores only)
- Password (required, minimum 8 characters)
- Password confirmation (required, must match password)

WHEN a citizen submits the registration form, THE system SHALL validate all fields and respond as follows:
- IF email is already registered, THEN THE system SHALL display "This email address is already in use."
- IF username is already taken, THEN THE system SHALL display "This username is already taken."
- IF password and confirmation do not match, THEN THE system SHALL display "Passwords do not match."
- IF all fields are valid, THEN THE system SHALL send a verification email to the provided address and display "Your account has been created. Please check your email to verify your address."

WHEN a citizen clicks "Log In", THE system SHALL present a form requesting:
- Email address (required)
- Password (required)

WHEN a citizen submits login credentials, THE system SHALL validate them and respond as follows:
- IF email or password is incorrect, THEN THE system SHALL display "Invalid email or password."
- IF credentials are valid and email is unverified, THEN THE system SHALL display "Please verify your email address before logging in."
- IF credentials are valid and email is verified, THEN THE system SHALL establish a session and redirect to the home page.

WHILE a citizen is logged in, THE system SHALL display their username in the header and provide a "Logout" option.

WHEN a citizen clicks "Logout", THE system SHALL terminate the session and redirect to the home page.

## Step 2: Compose New Post

WHEN a logged-in citizen navigates to the home page, THE system SHALL display a "New Post" button prominently at the top of the content feed.

WHEN a citizen clicks "New Post", THE system SHALL open a modal or dedicated page with a post editor containing:
- Title field (required, maximum 200 characters)
- Content textarea (required, minimum 10 characters, maximum 10,000 characters)
- Categories dropdown (predefined list: Economics, Politics, International, Society, Culture, Other)
- File upload section
- Preview toggle

WHEN a citizen types in the title field, THE system SHALL count and display remaining characters (e.g., "187/200").

WHEN a citizen types in the content field, THE system SHALL count and display remaining characters (e.g., "8,423/10,000").

WHEN a citizen selects a category, THE system SHALL apply the selected category and store it with the post.

WHEN a citizen toggles "Preview", THE system SHALL render a formatted preview of the post content with Markdown rendering (bold, italic, lists, blockquotes) but not executable code. Images and files do not render in preview.

WHEN a citizen closes the post editor without saving, THE system SHALL prompt: "You have unsaved changes. Are you sure you want to discard them?" If confirmed, THE system SHALL discard all edits and return to the home page.

## Step 3: Add Attachments

WHEN a citizen clicks "Add Attachment" in the post editor, THE system SHALL open a file picker dialog with the following rules:

- Files of any type may be selected, but only specific types are allowed upon upload. Allowable types:
  - Images: .jpg, .jpeg, .png, .gif, .webp
  - Documents: .pdf, .doc, .docx, .txt, .md
  - Spreadsheets: .xls, .xlsx
  - Archives: .zip, .rar, .7z

- File size limit: Each attachment must be under 20MB.

- Maximum number of attachments per post: 5.

WHEN a citizen selects a file, THE system SHALL:
- Verify file extension against allowed types
- Verify file size against 20MB limit
- Display file name and size in the attachment list
- Show progress indicator during upload

WHEN a file exceeds 20MB, THE system SHALL display an error: "File is too large. Maximum size is 20MB."

WHEN a file has an unsupported extension, THE system SHALL display an error: "This file type is not allowed. Use JPG, PNG, PDF, DOC, TXT, ZIP, or other approved formats."

WHEN a citizen tries to add a sixth attachment, THE system SHALL display: "You may only attach up to 5 files per post."

WHEN a file uploads successfully, THE system SHALL show a success icon, embed the file in the post as a link with a preview thumbnail for images, and display "Uploaded successfully."

WHEN a citizen clicks "Remove" on an attached file before publishing, THE system SHALL remove it from the list and free up the upload slot.

WHILE a file is uploading, THE system SHALL disable the publish button and display: "Uploading attachments... Please wait."

WHEN an upload fails due to network error, THE system SHALL display: "Upload failed. Check your connection and try again."

WHERE a citizen has previously uploaded 3 files, THE system SHALL allow 2 more attachments.

## Step 4: Publish

WHEN a citizen has completed the title, content, category, and attachments, THE system SHALL enable the "Publish" button.

WHEN a citizen clicks "Publish", THE system SHALL:
- Validate that title is not empty
- Validate that content is not empty
- Confirm all attachments have completed uploading
- Submit the post for moderation

WHEN content is empty but the citizen clicks "Publish", THE system SHALL display: "Post cannot be empty. Please enter some content."

WHEN title is empty but the citizen clicks "Publish", THE system SHALL display: "Please enter a title for your post."

WHEN any attachment upload is still in progress, THE system SHALL display: "All attachments must finish uploading before publishing."

WHEN all validations pass and all attachments have completed, THE system SHALL send the post to the moderation queue and display: "Your post has been submitted for review. You will be notified when it is approved."

WHILE a post is in moderation, THE system SHALL show a status badge on the user's profile: "Awaiting approval".

## Step 5: View Published Post

WHEN a post is approved by a moderator, THE system SHALL change its status to "Published" and make it visible in the main feed.

WHEN a citizen views a published post, THE system SHALL display:
- Post title
- Author username
- Publication timestamp (e.g., "Posted 3 minutes ago")
- Category tag
- Post content with Markdown rendering
- All attached files as clickable links with icons (image thumbnails if image)
- Download count for each attachment

WHEN a citizen clicks an image attachment, THE system SHALL open the image in a modal viewer with zoom and download options.

WHEN a citizen clicks a document attachment, THE system SHALL present a download prompt with file name and size.

WHEN a citizen views a post from the "Awaiting approval" state, THE system SHALL display: "This post is currently under review. It will be visible once approved by a moderator."

WHEN a citizen views their own post in "Awaiting approval" state, THE system SHALL also display: "You cannot edit or delete this post while it is under review."

## Error Scenarios

IF a citizen refreshes the page while uploading a file, THEN THE system SHALL cancel the upload and clear the incomplete attachment from the list.

IF a citizen tries to open a broken attachment link (e.g., file deleted by moderator), THEN THE system SHALL display: "This file is no longer available."

IF a moderator removes a post after publication, THEN THE system SHALL replace the post content with: "This post has been removed by a moderator." and disable all interactions.

IF a post is flagged for review and found to violate content rules, THEN THE system SHALL notify the citizen via email and display: "Your post was rejected because it violates our content policy."

IF a citizen exceeds 3 moderated posts with 1 or more rejections in 30 days, THEN THE system SHALL temporarily disable their posting privilege and display: "Your posting privileges are suspended. Contact support for assistance."

## Performance Expectations

WHEN a citizen opens the post editor, THE system SHALL display the form within 1.5 seconds.

WHEN a citizen uploads an image under 20MB, THE system SHALL complete upload and processing in under 10 seconds on a typical broadband connection.

WHEN a citizen uploads a 20MB PDF file, THE system SHALL complete upload and thumbnail generation in under 15 seconds.

WHEN a citizen views a page with 20 posts each with 3 attachments, THE system SHALL render the full page, including image thumbnails, within 2 seconds.

WHEN a citizen clicks "Refresh" on the feed, THE system SHALL update content instantly with no visible loading spinner for unchanged data.

WHEN a citizen searches for a keyword in the search bar, THE system SHALL return results in under 500 milliseconds for common queries.

This document is complete. All business requirements for the post creation and attachment workflow have been documented. No technical implementation details are included. Developers have full autonomy over architecture, API design, and database schema.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*