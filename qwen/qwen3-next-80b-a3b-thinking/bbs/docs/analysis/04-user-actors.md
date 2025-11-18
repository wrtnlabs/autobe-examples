## User Actors and Permissions for EconomicBbs Discussion Board

### Overview of User Actors

This document defines the user actors and permissions for the EconomicBbs economic/political discussion board system. The system supports a simple two-tier user model: **Guests** and **Members**. The purpose of this documentation is to provide backend developers with complete business requirements for implementing authentication, authorization, and user access control systems.

The system is designed to be minimal and straightforward - a simple discussion board where users can engage in economic and political discussions. There are no complex role hierarchies or extensive permissions, maintaining a focus on core functionality.

The **Business Model** for this system is centered around fostering open discussion of economic and political topics without subscription-based revenue streams. The service exists to provide free and open access to informed discussion about economic principles and political developments. The success of the system will be measured by engagement metrics such as active users, content diversity, and quality interactions.

This document aligns with the overall business objectives described in 01-service-overview.md and provides the specific user access control requirements needed to implement the features described in 05-functional-requirements.md.

### Guest Actor Specifications

Guests are unauthenticated users who visit the EconomicBbs discussion board. Guests represent the broadest user category within the system and have limited access to ensure system security while maintaining open access to public content.

#### Guest Capabilities

Guests can view and read all public articles and comments on the discussion board. Guests are the primary audience for the system's content and represent the most basic user experience:

- Guests can browse and read articles in the public feed
- Guests can view all article details including text content
- Guests can see article comments and their content
- Guests can view article metadata such as publication date and author
- Guests can view basic article statistics (e.g., comment count)

#### Guest Limitations

Guests have no ability to create or modify content. This is a security measure to prevent unauthenticated users from creating spam, offensive content, or misleading information:

- Guests cannot create new articles
- Guests cannot post comments
- Guests cannot edit or delete any content
- Guests cannot upload files or images
- Guests cannot view personal information of other users
- Guests cannot access system administration or moderation features

#### Business Rules for Guest Access

The following business rules ensure consistent and secure guest experiences while protecting system integrity:

- WHEN a guest visits the discussion board, THE system SHALL display all public articles with no filtering based on content type
- WHEN guests view article details, THE system SHALL show all comments for that article regardless of comment author status
- WHEN a guest attempts to create a new article, THE system SHALL display error message "Registration required to create content. Please log in or sign up."
- WHEN guests navigate to an article creation page, THE system SHALL automatically redirect to login page
- WHILE guests are viewing discussion content, THE system SHALL NOT display any controls for content modification or creation
- WHERE content is protected by privacy settings (none for guests), THE system SHALL NOT display content to guests

### Member Actor Specifications

Members are authenticated users who have registered with a unique email address and password. Members represent the active participants of the EconomicBbs discussion board community and have expanded capabilities that enable meaningful engagement with the system.

#### Member Capabilities

Members are the primary creators of content on the EconomicBbs discussion board. Their capabilities include:

- Members can create new articles on economic or political topics
- Members can write comments on articles and engage in discussions
- Members can edit their own posts within a 24-hour window of publication
- Members can delete their own posts without restriction
- Members can attach images to their content for visual support of their arguments
- Members can view their own published content history
- Members can log out to terminate their session
- Members can receive notifications of replies to their comments

#### Member Limitations

Members have specific boundaries to ensure appropriate use of the system and to protect the integrity of discussions:

- Members cannot edit other users' content
- Members cannot delete other users' comments or articles
- Members cannot moderate or approve content from other users
- Members cannot change article publication dates or access other users' personal data
- Members cannot access system administration or moderation functionality
- Members cannot upload files other than images (JPEG, PNG, GIF)

#### Specific Image Attachment Rules

Since this document focuses on discussion board simplicity, attachment handling is strictly limited to images:

- WHEN a member creates a new article, THE system SHALL allow up to 3 image attachments
- WHEN members upload images for article attachments, THE system SHALL ONLY accept JPEG, PNG, and GIF formats
- WHEN members upload images for comments, THE system SHALL only allow single image attachment per comment
- THE system SHALL enforce a maximum file size of 2MB per image attachment
- WHEN image uploads exceed 2MB in size, THE system SHALL return error "Image file too large. Maximum allowed size is 2MB."
- WHILE a member is uploading images, THE system SHALL provide visual progress indication
- WHERE image upload fails, THE system SHALL display clear error message with specific reason for failure

#### Member Authentication Requirements

All member functionality depends on successful authentication:

- WHEN a member attempts to access their account page, THE system SHALL require valid authentication
- WHEN members attempt to create new articles, THE system SHALL verify member authentication before processing
- WHILe members are logged in, THE system SHALL maintain a secure session token to enable content creation
- IF member authentication fails, THE system SHALL display error message "Invalid credentials. Please try again."
- IF member session expires, THE system SHALL redirect to login page with notification "Your session has expired. Please log in again."
- WHERE members log out, THE system SHALL immediately terminate session and clear all session data
- WHEN members view their own articles, THE system SHALL display "Edit" link only for their own content

#### Member-Specific Business Rules

The following business rules define expectations for member engagement:

- WHEN members submit article content, THE system SHALL check for explicit content violations before publishing
- WHEN members attempt to edit their own articles, THE system SHALL only allow editing within 24 hours of original publication
- WHILE members are editing their content, THE system SHALL track the remaining edit window with clear countdown
- WHERE members attempt to edit beyond 24-hour window, THE system SHALL disable the Edit option
- IF members attempt to create comments while logged out, THE system SHALL redirect to login page with message "Login required to comment. Please authenticate first."
- IF members attempt to delete their own content after deletion window, THE system SHALL show "Cannot delete content. Only editors can view this content."
- WHEN members post content, THE system SHALL timestamp all submissions with precise UTC time
- WHEN members log out, THE system SHALL clear all session data immediately to enhance security

### Permission Matrix

This permission matrix shows exactly what actions are possible for each user type within the EconomicBbs system. This table provides backend developers a clear reference for implementation-specific access control logic.

| Action | Guest | Member |
|--------|-------|--------|
| View public articles | ✅ | ✅ |
| View article details (text and comments) | ✅ | ✅ |
| View article metadata (author, date, comment count) | ✅ | ✅ |
| Create new article | ❌ | ✅ |
| Edit own articles | ❌ | ✅ (within 24 hours window) |
| Delete own articles | ❌ | ✅ (immediately) |
| Create comments on articles | ❌ | ✅ |
| Edit own comments | ❌ | ✅ (within 24 hours window) |
| Delete own comments | ❌ | ✅ (immediately) |
| Add image attachments to articles | ❌ | ✅ (up to 3 images) |
| Add image attachments to comments | ❌ | ✅ (one image per comment) |
| Edit other users' content | ❌ | ❌ |
| Delete other users' content | ❌ | ❌ |
| Access moderation tools | ❌ | ❌ |
| View personal information of other users | ❌ | ❌ |
| Access admin features | ❌ | ❌ |
| Login functionality | ❌ | ✅ (as required for member actions) |
| Logout functionality | ❌ | ✅ (when logged in) |

### System Interaction Scenarios

This section describes key user interaction flows for both guests and members. These scenarios provide context for how the system should behave in common usage patterns.

#### Guest Scenario: Browsing Public Articles

A guest visiting the EconomicBbs discussion board for the first time:

- The system automatically displays public articles from the feed
- No login or registration prompt appears on the main page
- Articles display title, author (if known), summary text, publication date, and comment count
- When the guest clicks an article title, the system loads detailed article page
- On detailed article page, guests see full article content and all associated comments
- Guests cannot see any edit, delete, or comment controls anywhere on the interface
- The interface always appears read-only for guests
- When guests see "Login" button, clicking it takes them to authentication page

#### Member Scenario: Creating an Article with Image Attachment

A logged-in member creating a new article:

- When members navigate to article creation page, THE system SHALL display creation template
- Members can enter article title and content in provided text editor
- Members can click "Add Image" button to upload an image file
- When images are selected, THE system SHALL validate size (≤ 2MB) and format (JPEG, PNG, GIF)
- If image is invalid size or format, THE system SHALL display specific error message
- Members can add up to 3 images before publishing
- When member clicks "Publish", THE system SHALL validate required fields
- If all requirements are met, THE system SHALL publish article immediately
- If validation fails (e.g., empty title), THE system SHALL show specific error
- After publication, member is redirected to newly created article page
- On article page, member sees visible "Edit" button for their own content
- Member can only click "Edit" button if within 24 hours of publication

#### Member Scenario: Editing and Deleting Own Content

A member interacting with their own content:

- When a member views an article they created, THE system SHALL display "Edit" button
- WHEN member clicks "Edit" before 24-hour window expires, THE system SHALL allow full content editing
- WHILE member is editing, THE system SHALL show countdown to edit window expiration
- WHEN member clicks "Delete" on their own article, THE system SHALL ask for confirmation
- AFTER confirmation, THE system SHALL immediately remove the article
- WHEN member tries to delete their own article after 24-hour window, THE system SHALL disable delete functionality
- WHEN member comments on an article, THE system SHALL display "Edit" button only for their comment
- WHEN member updates comment within edit window, THE system SHALL update comment in real-time
- WHEN the 24-hour edit window expires, THE system SHALL hide "Edit" buttons on the member's content

#### System Error Handling Scenarios

All errors must be handled with clear user-oriented messages:

- WHEN an image is uploaded larger than 2MB, THE system SHALL display error message "Image file exceeds maximum size of 2MB."
- WHEN a member uploads image with unsupported format (e.g., PDF), THE system SHALL display error message "Unsupported file format. Only JPEG, PNG, and GIF images are allowed."
- WHEN multiple images exceed the 3-image limit for articles, THE system SHALL display error message "Maximum 3 images allowed per article."
- WHEN members attempt to log out while not authenticated, THE system SHALL silently ignore request
- WHEN authentication credentials are invalid, THE system SHALL display "Invalid email or password. Please try again."
- WHEN members attempt to perform restricted actions while unauthenticated, THE system SHALL redirect to login page with explanation message
- WHEN system detects potential spam in user content, THE system SHALL retain content for review and notify member of pending moderation
- WHEN members attempt to edit content beyond 24-hour window, THE system SHALL display "Editing window closed. You can no longer edit this content."

#### Business Rule Summary

The following business rules apply consistently across both guest and member experiences:

- THE system SHALL preserve user privacy by not displaying personal information of other users
- THE system SHALL protect against spam by restricting public creation capabilities
- THE system SHALL ensure content integrity by limiting editing and deletion rights
- THE system SHALL provide clear user guidance when restrictions apply
- THE system SHALL handle file attachments with strict validation for size and format
- THE system SHALL maintain session security by properly terminating user sessions upon logout

This document provides backend developers with the complete business requirements for user actor implementations. All requirements are written in business terms and do not specify technical implementations. Developers have full autonomy to choose appropriate authentication mechanisms, database schemas, API designs, and security protocols to satisfy these requirements.

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*

### Performance Requirements

The following performance expectations apply to member actions with content creation:

- WHEN members upload images for articles, THE system SHALL complete processing within 3 seconds of file submission
- WHEN members create new articles, THE system SHALL publish content within 5 seconds of submission
- WHILE members are editing content, THE system SHALL update changes instantly with no noticeable delay
- THE system SHALL handle up to 100 concurrent users with article editing functionality without performance degradation
- When members log in, THE system SHALL authenticate within 2 seconds for 95% of requests
- WHEN members view public articles, THE system SHALL load pages within 2 seconds even with 100+ comments
- THE system SHALL support 10,000 articles with search response times under 3 seconds for common queries
- WHEN image uploads are in progress, THE system SHALL display visual progress indicator
- WHEN uploading large images, THE system SHALL provide estimated time remaining based on current upload speed