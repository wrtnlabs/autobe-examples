# User Flows and Workflows

## Introduction

This document describes the user workflows and processes for the discussion board application. Each section outlines the step-by-step actions users take to accomplish their goals, including error scenarios and recovery processes. All workflows are described from the user's perspective in natural language.

The discussion board supports three types of users:
- **Guests**: Anonymous visitors who can view public content but cannot create or interact with discussions
- **Members**: Authenticated users who can create articles, attach files, and participate in discussions
- **Admins**: Users with moderation powers who can manage content and users

All workflows emphasize simplicity and minimal steps as requested by the business requirements.

## Article Creation Process

The article creation process allows authenticated members to write and publish articles on economic or political topics.

### Basic Article Creation Flow

WHEN a member chooses to create a new article, THE system SHALL:

1. Display an article creation form with the following fields:
   - Article title (required, 1-100 characters)
   - Article content (required, rich text editor with basic formatting)
   - Category selection (economic, political, or other)
   - Optional image or file attachments

2. Allow the user to write and format the article content

3. Let the user preview the article before submission

4. IF the user submits the article, THE system SHALL validate the input and save the article as a draft

5. WHEN the user chooses to publish the article, THE system SHALL make it publicly visible

### Detailed Step-by-Step Process

WHEN a member clicks "Create New Article" button, THE system SHALL:

1. **Authentication Check**: Verify the user is logged in as a member
   - IF not authenticated, redirect to login page
   - IF authenticated, proceed to article form

2. **Form Display**: Show the article creation interface
   - Title field (text input, maximum 100 characters)
   - Content area (rich text editor with bold, italic, lists)
   - Category dropdown (Economic, Political, Other)
   - Attachment section (drag-and-drop or file browse)

3. **Content Entry**: Allow real-time editing
   - Auto-save drafts every 30 seconds
   - Character count display for title and content

4. **Attachment Process**: Enable adding images/files
   - Upload files individually or in batches
   - Show progress indicators during upload
   - Preview images after upload completes

5. **Preview and Validation**
   - Generate preview of formatted article
   - Check for required fields
   - Validate attachment file types and sizes

6. **Publication Decision**
   - User can save as draft for later editing
   - User can publish immediately
   - User can cancel and discard the article

### Visual Flow Diagram

```mermaid
graph LR
  A["Member Clicks 'Create Article'"] --> B{"User Authenticated?"}
  B -->|"`No"|" C["Redirect to Login"]
  B -->|"`Yes"|" D["Show Article Creation Form"]
  D --> E["User Enters Title and Content"]
  E --> F{"Add Attachments?"}
  F -->|"`Yes"|" G["Upload Files/Images"]
  F -->|"`No"|" H["Skip to Preview"]
  G --> H["Preview Article"]
  H --> I{"Validation Errors?"}
  I -->|"`Yes"|" J["Show Errors, Allow Corrections"]
  J --> E
  I -->|"`No"|" K["Save as Draft or Publish"]
  K --> L["Article Created Successfully"]
```

## Discussion Participation

The discussion feature allows members to comment on articles and engage in threaded conversations.

### Basic Discussion Flow

WHEN a member views an article, THE system SHALL display existing comments and allow new comment creation if authenticated.

Comment features include:
- Threaded replies to other comments
- Basic text formatting
- Like/dislike reactions (optional)
- Report inappropriate content

### Detailed Comment Process

WHEN a member wants to comment on an article, THE system SHALL:

1. **Display Comments Section**: Show all comments sorted by newest first
   - Load comments with pagination (20 per page)
   - Show comment count and thread structure

2. **Comment Entry**: Provide comment input field
   - Maximum 500 characters
   - Basic formatting (bold, italic, links)
   - Attachment support (images only)

3. **Submission Process**:
   - Preview comment before posting
   - Post comment immediately or save as draft

4. **Reply System**: Allow nested replies up to 3 levels deep

5. **Interaction Features**:
   - Users can edit their own comments within 5 minutes
   - Users can delete their own comments
   - Users can flag comments for moderation

### Visual Flow Diagram

```mermaid
graph LR
  A["User Views Article with Comments"] --> B{"User Logged In?"}
  B -->|"`No"|" C["Display Comments (Read-Only)"]
  B -->|"`Yes"|" D["Show Comment Input Field"]
  D --> E["User Types Comment"]
  E --> F["Preview Comment (Optional)"]
  F --> G["Submit or Edit"]
  G --> H{"Reply to Existing Comment?"}
  H -->|"`Yes"|" I["Create Threaded Reply"]
  H -->|"`No"|" J["Post as Root Comment"]
  I --> K["Comment Added to Thread"]
  J --> K
  K --> L["Notify Article Author (Optional)"]
  L --> M["Display Updated Comments"]
```

## Attachment Upload

The attachment system supports images and files for articles and comments.

### Supported File Types

- Images: JPEG, PNG, GIF, WebP (maximum 5MB each)
- Documents: PDF, DOC, DOCX (maximum 10MB each)
- Spreadsheets: XLS, XLSX (maximum 10MB each)
- Presentations: PPT, PPTX (maximum 15MB each)

### Upload Process

WHEN a user adds attachments during article creation or commenting, THE system SHALL:

1. **File Selection**: Allow drag-and-drop or browse selection
   - Show drag-and-drop area clearly marked
   - Support multiple file selection

2. **Validation Check**:
   - Verify file type is supported
   - Check file size against limits
   - Scan for security threats (conceptual)

3. **Upload Progress**: Show real-time upload status
   - Progress bar for each file
   - Ability to cancel uploads in progress

4. **Attachment Management**:
   - Display list of attached files
   - Allow removal of files before submission
   - Show file preview for images

### Visual Flow Diagram

```mermaid
graph LR
  A["User Selects Files to Attach"] --> B["Check File Count and Size"]
  B --> C{"Within Limits?"}
  C -->|"`No"|" D["Show Error: File Too Large/Bad Type"]
  D --> E["Allow User to Try Again"]
  C -->|"`Yes"|" F["Start Upload Process"]
  F --> G["Show Progress Indicators"]
  G --> H["Validate File Security"]
  H --> I{"Security Check Passed?"}
  I -->|"`No"|" J["Quarantine File, Show Error"]
  I -->|"`Yes"|" K["Display Attachment Preview"]
  K --> L["File Successfully Attached"]
```

## Moderation Workflow

Admins have the ability to moderate content and manage user interactions.

### Moderation Actions Available

Admins can:
- Approve or reject pending articles
- Edit article content or remove inappropriate posts
- Ban or suspend users
- Mark comments as approved or hidden
- View moderation logs

### Moderation Process

WHEN an admin accesses the moderation dashboard, THE system SHALL:

1. **Dashboard Display**: Show pending content requiring approval
   - List of unpublished articles
   - Reported comments
   - User complaints

2. **Content Review Process**:
   - View full article content
   - Check attachments for inappropriate material
   - Review comment threads

3. **Decision Making**:
   - Approve and publish content
   - Send back for revisions with feedback
   - Remove content entirely
   - Issue warnings to users

4. **Action Logging**: Record all moderation actions for audit trail

### Visual Flow Diagram

```mermaid
graph LR
  A["Admin Logs Into Moderation Panel"] --> B["Load Pending Content Queue"]
  B --> C["Review First Item in Queue"]
  C --> D["Read Full Content and Comments"]
  D --> E{"Approval Decision"}
  E -->|"`Approve"|" F["Publish Content Immediately"]
  E -->|"`Reject"|" G["Mark as Rejected with Reason"]
  E -->|"`Edit Required"|" H["Send Back to Author for Changes"]
  F --> I["Move to Next Item in Queue"]
  G --> I
  H --> I
  I --> J{"Queue Empty?"}
  J -->|"`No"|" C
  J -->|"`Yes"|" K["Moderation Complete"]
```

## Search and Discovery

Users can discover content through search functionality and browsing features.

### Search Features

The search system supports:
- Keyword search in article titles and content
- Category filtering (economic, political, other)
- Date range filtering
- Author search
- Popularity sorting (most commented, most viewed)

### Discovery Process

WHEN a user wants to find articles, THE system SHALL:

1. **Access Search Interface**: Available on home page and navigation
   - Prominent search bar
   - Quick category filters

2. **Execute Search**:
   - Accept keyword input
   - Apply selected filters
   - Return results instantly (under 1 second preferred)

3. **Results Display**:
   - List articles with title, excerpt, author, date
   - Show relevance highlighting
   - Pagination for large result sets

4. **Advanced Features**:
   - Saved searches for registered users
   - Recent searches history
   - Suggested related articles

### Visual Flow Diagram

```mermaid
graph LR
  A["User Accesses Search Page"] --> B["Enter Search Keywords"]
  B --> C["Select Optional Filters"]
  C --> D["Execute Search Query"]
  D --> E["Display Loading Indicator"]
  E --> F{"Results Found?"}
  F -->|"`Yes"|" G["Show Search Results List"]
  F -->|"`No"|" H["Show 'No Results' Message"]
  G --> I["Highlight Matching Keywords"]
  I --> J["Allow Sorting and Refining"]
  J --> K["User Selects Desired Article"]
  H --> L["Suggest Related Searches"]
  L --> M["User Can Try New Search"]
```

## Error Handling Scenarios

This section describes common error situations and how the system responds.

### File Upload Errors

IF a user attempts to upload a file that exceeds size limits, THEN THE system SHALL:
- Display clear error message specifying the limit
- Show current file size vs. limit
- Allow the user to choose a smaller file or compress the current one

IF a user uploads an unsupported file type, THEN THE system SHALL:
- List accepted file formats clearly
- Suggest conversion options where possible
- Allow the user to remove the file and try again

### Content Submission Errors

IF a user submits an article without a required title, THEN THE system SHALL:
- Highlight the empty title field in red
- Display message "Title is required"
- Prevent form submission until fixed

IF an article content exceeds reasonable limits, THEN THE system SHALL:
- Show character count with visual indicators
- Display "Content too long" message at submission
- Allow the user to edit and resubmit

### Authentication Errors

IF a user tries to comment without being logged in, THEN THE system SHALL:
- Save the comment draft in browser storage
- Redirect to login page
- Restore the comment draft after successful login
- Allow seamless continuation of the comment process

IF a user's session expires during content creation, THEN THE system SHALL:
- Autosave current draft every 30 seconds
- Prompt for re-authentication
- Restore the draft after login
- Allow the user to continue exactly where they left off

### Visual Error Recovery Diagram

```mermaid
graph LR
  A["User Encounters Error"] --> B{"Error Type"}
  B -->|"`File Upload"|" C["Show Upload Limits and Options"]
  B -->|"`Missing Fields"|" D["Highlight Required Fields"]
  B -->|"`Auth Expired"|" E["Prompt for Re-login"]
  C --> F["User Corrects and Retries"]
  D --> F
  E --> F
  F --> G{"Second Attempt"}
  G -->|"`Success"|" H["Process Completes Normally"]
  G -->|"`Failure"|" I["Show Detailed Error Explanation"]
  I --> J["Contact Support Link (if needed)"]
  J --> K["User Completes Alternative Action"]
```

## Permission Errors

IF a guest user attempts to access a member-only feature, THEN THE system SHALL:
- Display clear message explaining the limitation
- Show benefits of creating an account
- Provide prominent "Sign Up" or "Log In" buttons
- Preserve the user's current navigation state for seamless return after authentication

IF a member attempts to edit an article that they did not author, THEN THE system SHALL:
- Deny the edit attempt immediately
- Show error message "You can only edit your own content"
- Log the attempt for moderation review if suspicious
- Redirect the user back to their own content or dashboard

These workflows ensure the discussion board remains straightforward and minimal while providing essential functionality for economic and political discussion. All processes are designed with simplicity in mind, avoiding unnecessary complexity as requested.