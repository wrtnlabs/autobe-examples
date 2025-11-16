# User Workflows and Scenarios

## Overview

This document describes the primary user workflows and scenarios that illustrate how guests, members, and moderators interact with the discussion board system. Each workflow follows a user from their initial goal through completion, including decision points, validations, and error handling. These scenarios provide concrete examples of how the system operates in real-world usage.

The discussion board serves three distinct user types with different capabilities and responsibilities. Understanding these workflows helps the development team implement features that support natural user interactions and maintain system quality through moderation.

---

## Guest User Workflows

Guest users are unauthenticated visitors who can view and browse content but cannot create posts or comments.

### Workflow 1: Guest Browsing Recent Articles

**User Goal**: A visitor wants to read recent discussions about economic policy.

**Prerequisites**: Guest has navigated to the discussion board website.

**Steps**:

1. Guest lands on the discussion board homepage
2. System displays a chronological feed of the most recent published articles
3. Guest sees article titles, author names, creation dates, and brief preview text (first 150-200 characters)
4. Articles are organized with newest first in reverse chronological order
5. Guest can scroll or paginate through the list (20 articles per page) to see multiple articles
6. Guest clicks on an article title to view the full article content
7. System loads the article detail page showing:
   - Article title and full content body
   - Author name (display name from user profile)
   - Publication date and timestamp
   - Category tag (Economics, Politics, Other)
   - Number of comments published on the article
   - Any attached images displayed inline below content
   - Any attached files listed as downloadable links with file sizes
8. Guest reads the article and scrolls to view all comments
9. Guest can return to the article list using browser back button or navigation menu
10. Guest can browse other articles from the homepage

**Business Rules Applied**:
- WHEN a guest accesses the homepage, THE system SHALL display only published articles (articles with status "published")
- WHEN a guest views an article, THE system SHALL show all approved comments associated with that article in chronological order
- THE system SHALL display all file attachments and images associated with the article with their original filenames and file sizes
- WHEN guest views an article, THE system SHALL increment the article's view counter by 1
- WHEN an article list is displayed, THE system SHALL sort articles in reverse chronological order (newest first)

**Error Handling**:
- IF an article has been deleted by a moderator after the guest loaded the list, THEN THE system SHALL display error message "This article is no longer available" when the guest tries to view it
- IF an image attachment failed to load, THEN THE system SHALL display placeholder text "[Image unavailable]" in place of the image
- IF a file attachment is corrupted, THEN THE system SHALL display the filename but prevent download with message "[File unavailable]"

**Performance Expectations**:
- WHEN guest loads article list, THE system SHALL respond within 2 seconds
- WHEN guest loads article detail page, THE system SHALL respond within 2 seconds

---

### Workflow 2: Guest Searching for Discussions by Topic

**User Goal**: A guest wants to find all discussions about inflation and economic trends.

**Prerequisites**: Guest is on the discussion board homepage or any page with search functionality.

**Steps**:

1. Guest locates the search box at the top of the page or in the main navigation
2. Guest clicks in the search box
3. Guest enters keywords (e.g., "inflation") into the search field
4. System performs real-time validation:
   - IF keyword length is less than 2 characters, THEN THE system SHALL NOT execute search (display hint "Enter at least 2 characters")
   - IF keyword length is 2+ characters, THE system MAY display search suggestions based on matching article titles
5. Guest clicks search button or presses Enter to submit search
6. System searches for articles containing keywords in title or body content
7. System returns matching results sorted by relevance and date (newest first)
8. System displays search results as a list showing:
   - Article title
   - Author name
   - Publication date
   - Category tag
   - Preview text (first 200 characters with keyword highlighted)
   - Number of comments
   - Pagination controls if results exceed 20 items per page
9. Guest reviews search results and reads the list
10. Guest clicks on relevant article to read full discussion
11. Guest reads article and all comments
12. Guest can modify search query by editing the search box and searching again
13. Guest can also use category filter to browse discussions:
    - Guest clicks "Economics" category filter
    - System displays all published articles marked with "Economics" category
    - System sorts articles by date (newest first)
    - Guest browses economics discussions

**Business Rules Applied**:
- WHEN a guest performs a search, THE system SHALL search article titles and article body content for keyword matches
- WHEN a search is performed, THE system SHALL only return articles with status "published"
- WHEN search results are displayed, THE system SHALL NOT include pending approval articles or rejected articles
- THE system SHALL display search results sorted by date (newest first), not by complex relevance scoring
- THE system SHALL perform case-insensitive keyword matching ("Inflation" matches "inflation")
- WHEN a guest filters by category, THE system SHALL display all published articles marked with that category
- THE system SHALL apply filters in combination (e.g., "Economics" category + "last 7 days" time filter shows only economics articles from last 7 days)

**Error Handling**:
- IF search query contains fewer than 2 characters, THEN THE system SHALL display "Search term must be at least 2 characters"
- IF search returns no matching articles, THEN THE system SHALL display "No articles found. Try different keywords or browse by category"
- IF search request times out (exceeds 5 seconds), THEN THE system SHALL return partial results (most recent articles) and display message "Search returned results (not all results were processed)"
- IF search contains special characters that break functionality, THEN THE system SHALL either filter out special characters or display "Special characters are not supported in searches"

**Performance Expectations**:
- WHEN guest performs search, THE system SHALL return results within 3 seconds for typical queries returning under 100 results
- WHEN guest performs search with 1,000+ results, THE system SHALL paginate results and display first page within 3 seconds

---

### Workflow 3: Guest Viewing Comments and Discussion Thread

**User Goal**: A guest wants to read the discussion and comments about a political topic to understand multiple perspectives.

**Prerequisites**: Guest has opened a specific article detail page with published comments.

**Steps**:

1. Guest views the article content and title
2. Guest scrolls down to see the "Comments" section
3. System displays comments count: "Comments (12)" or similar
4. System displays all published comments below the article content
5. Comments are sorted in chronological order (oldest first, to follow conversation flow)
6. For each comment, guest sees:
   - Author's display name (not username)
   - "Member" designation showing user type
   - Comment text content (1-5,000 characters)
   - Posted date and time in guest's local timezone if possible
   - "(Edited)" indicator with edit timestamp IF comment was modified
   - Any file attachments listed with download links and file sizes
   - Any images embedded inline in the comment
7. Guest reads through the discussion thread, following the conversation chronologically
8. Guest can download any files attached to comments by clicking download link
9. Guest can view images embedded in comments at full resolution by clicking on image
10. IF comment was deleted, guest sees placeholder: "[Comment deleted by author]" or "[Comment removed by moderator]" with no author or content visible
11. IF there are many comments (over 50), guest sees pagination controls to navigate between comment pages
12. Guest can return to article or continue browsing comments

**Business Rules Applied**:
- WHEN guest views comments, THE system SHALL display them in chronological order (oldest first)
- WHEN displaying comments, THE system SHALL show only comments with approved status
- THE system SHALL NOT display comments that moderators have deleted (show placeholder instead)
- THE system SHALL NOT display draft or pending comments to guests
- THE system SHALL display all file attachments with original filenames and file sizes
- THE system SHALL display images at maximum 600px height (responsive to screen size)
- WHEN a comment is edited by author, THE system SHALL display "(edited)" indicator with edit timestamp
- THE system SHALL paginate comments at 50 comments per page if article has more than 50 comments

**Error Handling**:
- IF a comment's attachment file is no longer available in storage, THEN THE system SHALL display filename with "[File unavailable]" instead of download link
- IF an image in a comment fails to load, THEN THE system SHALL display placeholder "[Image unavailable]"
- IF comment author's account was deleted, THEN THE system SHALL display "[Deleted User]" instead of author name

**Performance Expectations**:
- WHEN guest loads article detail with comments, THE system SHALL load all comments within 2 seconds
- WHEN guest navigates to additional comment pages, THE system SHALL load next page within 2 seconds

---

## Member Registration and Onboarding Workflows

Members are registered users who can create articles, post comments, and upload attachments.

### Workflow 4: New User Registration with Email Verification

**User Goal**: A prospective member wants to create an account to participate in discussions and post articles.

**Prerequisites**: Unregistered user is on the discussion board website and sees "Sign Up" or "Register" button.

**Steps**:

1. Unregistered user clicks the "Sign Up" or "Register" button/link
2. System displays registration form with the following required fields:
   - Email address (required, must be valid email format)
   - Username (required, 3-30 characters, alphanumeric with underscore/hyphen only)
   - Password (required, minimum 8 characters, must include uppercase, lowercase, number, special character)
   - Confirm password (required, must match password field exactly)
   - Display name (optional, defaults to username if not provided, max 50 characters)
3. System displays password requirements prominently:
   - "Password must be 8+ characters"
   - "Include uppercase letter, lowercase letter, number, and special character (!@#$%^&*)"
4. User enters their information:
   - Email: "jane.smith@example.com"
   - Username: "jane_smith"
   - Password: "SecurePass2024!"
   - Confirm password: "SecurePass2024!"
   - Display name: "Jane Smith"
5. System validates input in real-time as user types:
   - IF username is entered, THEN system checks availability and displays green checkmark "Available" or red X "In use"
   - IF email is entered, THEN system validates format and displays validation status
   - IF password is entered, THEN system validates complexity and displays which requirements are/aren't met
6. User submits the registration form by clicking "Create Account"
7. System performs server-side validation of all fields:
   - Email format validation (must contain @, valid domain)
   - Email uniqueness check (IF email already registered THEN reject)
   - Username length validation (3-30 characters)
   - Username format validation (alphanumeric, underscore, hyphen only)
   - Username uniqueness check (case-insensitive, IF taken THEN reject)
   - Password complexity validation (8+ chars, uppercase, lowercase, number, special char)
   - Password/confirm match validation
   - Display name length validation (1-50 characters if provided)
8. IF validation succeeds:
   - System creates user account in database with status "unverified"
   - System hashes password using bcrypt before storage
   - System generates unique verification token (valid for 24 hours)
   - System sends verification email to provided email address containing:
     - Unique verification link with token
     - Verification code (8-12 alphanumeric characters)
     - Instruction: "Click the link or enter the code below to verify your email"
   - System displays confirmation message: "Account created successfully! Please check your email to verify your address."
9. User receives email and clicks verification link
10. System validates verification token:
    - IF token is valid and not expired THEN proceed
    - IF token is expired THEN display "Verification link expired. Request a new one" with option to resend
    - IF token is invalid THEN display "Invalid verification code"
11. System updates account status to "verified"
12. System displays success message: "Email verified! Your account is now active. You can now log in and create articles."
13. User can now log in with username and password
14. IF user clicks resend verification email link during unverified period:
    - System generates new verification token (valid 24 hours)
    - System sends new verification email
    - System enforces rate limiting: maximum 1 resend per 5 minutes

**Business Rules Applied**:
- WHEN a user registers, THE system SHALL validate email format and enforce uniqueness
- WHEN a user registers, THE system SHALL enforce password complexity: 8+ characters, uppercase, lowercase, number, special character (!@#$%^&*)
- WHEN a user registers, THE system SHALL not allow passwords containing username or email address
- WHEN a user registers, THE system SHALL send verification email immediately
- WHEN a user's email is unverified, THE system SHALL prevent them from creating articles or commenting
- WHEN a user clicks verification link, THE system SHALL mark account as verified immediately
- WHEN verification token expires (24 hours), THE system SHALL require requesting new verification email
- WHEN user registers, THE system SHALL prevent account creation if email already exists

**Validation Error Handling**:
- IF email is already registered THEN display "Email address already in use"
- IF username already taken THEN display "Username already taken. Try another."
- IF password doesn't meet requirements THEN display "Password requirements not met: [list specific issues]"
- IF passwords don't match THEN display "Passwords do not match"
- IF email format is invalid THEN display "Please enter a valid email address"
- IF username is less than 3 characters THEN display "Username must be at least 3 characters"
- IF username exceeds 30 characters THEN display "Username cannot exceed 30 characters"
- IF username contains invalid characters THEN display "Username can only contain letters, numbers, underscore, and hyphen"
- IF display name exceeds 50 characters THEN display "Display name cannot exceed 50 characters"

**Email Verification Scenarios**:
- IF verification link is clicked after expiration (24+ hours) THEN display "Verification link expired. Resend verification email?" with button to resend
- IF user manually enters verification code instead of clicking link THEN system validates code and marks account verified
- IF user loses verification email THEN they can request resend (rate limited to 1 per 5 minutes)
- IF user tries to register with same email again THEN system displays "This email is already registered" and offers password reset option

**Performance Expectations**:
- WHEN user submits registration form, THE system SHALL validate and respond within 2 seconds
- WHEN verification email is requested, THE system SHALL send within 30 seconds
- WHEN user clicks verification link, THE system SHALL process verification within 1 second

---

### Workflow 5: Member First Login and Optional Profile Setup

**User Goal**: A newly verified member logs in for the first time and optionally customizes their profile.

**Prerequisites**: User has created an account, verified their email, and is ready to access the platform.

**Steps**:

1. Member navigates to login page
2. System displays login form with fields:
   - Email or Username (required)
   - Password (required)
   - "Remember me" checkbox (optional)
3. Member enters their credentials:
   - Email: "jane.smith@example.com"
   - Password: "SecurePass2024!"
4. Member optionally checks "Remember me" to extend session
5. Member clicks "Log In" button
6. System validates credentials:
   - IF email/username exists in system THEN proceed to password check
   - IF email/username not found THEN reject (display generic error "Invalid email or password")
   - IF password hash matches stored hash THEN success
   - IF password is incorrect THEN reject (display generic error "Invalid email or password")
7. System checks account status:
   - IF account is "verified" THEN proceed to session creation
   - IF account is "unverified" THEN display "Email not verified. Click here to resend verification email"
   - IF account is "suspended" THEN display "Your account is suspended until [date]. Please review the email sent to you."
   - IF account is "deleted" THEN display "This account has been deleted"
8. System creates authenticated session:
   - Generate JWT access token (15 minute expiration)
   - Generate JWT refresh token (7 day expiration)
   - Set httpOnly cookies for secure token storage
   - Record login timestamp in user session
9. System redirects member to dashboard/homepage
10. System optionally displays welcome banner: "Welcome back, Jane Smith!"
11. Member can see navigation menu with options:
    - Home (article list)
    - Create Article
    - My Articles
    - My Comments
    - Profile / Account Settings
    - Search
12. Member optionally clicks on "Profile" or "Account Settings"
13. System displays member's profile page showing:
    - Username (display-only, cannot change)
    - Email address (display-only, cannot change without verification)
    - Display name (current value: "Jane Smith")
    - Bio/About section (currently empty)
    - Profile picture (currently default avatar)
    - Account creation date
    - Article count
    - Comment count
    - Account status: "Active"
14. Member clicks "Edit Profile" button
15. System displays profile edit form with editable fields:
    - Display name (required, 1-50 characters)
    - Bio (optional, 0-500 characters)
    - Profile picture (optional, JPG/PNG/GIF, max 5 MB)
    - Notification preferences (checkboxes for email notifications)
    - Display theme preference (light/dark/system)
16. Member can optionally update:
    - Display name: "Dr. Jane Smith" (for public author attribution)
    - Bio: "Economics researcher and policy analyst interested in monetary policy"
    - Upload profile picture (headshot.jpg, 2.3 MB)
    - Enable notifications for article replies
17. System validates profile changes:
    - Display name: 1-50 characters
    - Bio: 0-500 characters (optional)
    - Profile picture: JPG/PNG/GIF format, max 5 MB
    - IF profile picture exceeds size, THEN reject with message "File size exceeds 5 MB limit"
    - IF file format not supported, THEN reject with message "Profile picture must be JPG, PNG, or GIF"
18. Member clicks "Save Changes"
19. System updates profile in database:
    - Display name updated
    - Bio saved
    - Profile picture resized to 200x200px and stored
    - EXIF data and metadata stripped from profile picture
    - Notification preferences recorded
    - Theme preference stored
20. System displays confirmation: "Profile updated successfully!"
21. Member's display name now appears as author name on future articles and comments

**Business Rules Applied**:
- WHEN a member logs in, THE system SHALL create a session with JWT tokens
- WHEN a member logs in, THE system SHALL check account status (verified, suspended, deleted)
- WHEN a member attempts login with unverified email, THE system SHALL display verification message
- WHEN a member updates profile, THE system SHALL validate display name (1-50 characters)
- WHEN a member updates profile, THE system SHALL validate bio (0-500 characters, optional)
- WHEN a member uploads profile picture, THE system SHALL accept only JPG/PNG/GIF formats
- WHEN a member uploads profile picture, THE system SHALL limit to 5 MB maximum
- THE system SHALL automatically resize profile picture to 200x200px for storage
- THE system SHALL strip EXIF metadata from uploaded profile pictures
- THE system SHALL display member's display name (not username) publicly

**Login Error Handling**:
- IF email/username doesn't exist THEN display "Invalid email or password"
- IF password is incorrect THEN display "Invalid email or password"
- IF account is not verified THEN display "Please verify your email before logging in. Resend verification email?"
- IF account is suspended THEN display "Your account is suspended. See suspension email for details."
- IF account is deleted THEN display "This account has been permanently deleted"
- IF failed login attempt occurs, THEN track attempt (IF 5+ failed attempts in 15 minutes THEN lock account for 15 minutes)

**Profile Update Error Handling**:
- IF display name is empty THEN display "Display name cannot be empty"
- IF display name exceeds 50 characters THEN display "Display name too long (max 50 characters)"
- IF bio exceeds 500 characters THEN display "Bio too long (max 500 characters)"
- IF profile picture exceeds 5 MB THEN display "File too large. Maximum 5 MB allowed"
- IF profile picture file format not supported THEN display "File format not supported. Use JPG, PNG, or GIF"

**Performance Expectations**:
- WHEN member submits login, THE system SHALL authenticate and respond within 1 second
- WHEN member updates profile, THE system SHALL save changes and respond within 2 seconds
- WHEN member uploads profile picture, THE system SHALL process and respond within 3 seconds

---

## Member Article Creation Workflow

### Workflow 6: Creating and Publishing a New Discussion Article

**User Goal**: A verified member wants to start a new discussion about current economic policy and share supporting documents.

**Prerequisites**: Member is logged in and authenticated with verified email.

**Steps**:

1. Member clicks "Create Article" button in navigation or dashboard
2. System displays article creation form with required and optional fields:
   - Title (required, 5-200 characters)
   - Category (required, dropdown: "Economics", "Politics", "Economic Policy", "Political Analysis", "Other")
   - Content (required, 10-50,000 characters)
   - Image attachments (optional, up to 5 total per article, 10 MB each)
   - File attachments (optional, up to 3 files per article, 25 MB each, combined 100 MB)
3. Member composes article:
   - Title: "Federal Reserve's New Interest Rate Policy and Small Business Impact"
   - Category dropdown: Member selects "Economic Policy"
   - Content: Member types detailed analysis (2,000 characters) explaining policy implications
4. Member decides to attach supporting documents to strengthen the argument
5. Member clicks "Add Attachment" or "Choose File" button
6. Member selects PDF document: "fed_policy_brief.pdf" (2.5 MB)
7. System validates the file:
   - Checks file extension matches MIME type (PDF header check)
   - Verifies file size: 2.5 MB is within 25 MB limit
   - Scans for malware using antivirus definitions
   - Verifies PDF is readable and not corrupted
8. System displays filename "fed_policy_brief.pdf" with file size "2.5 MB" in attachments list
9. Member can optionally add more files (currently 1 of 3 allowed)
10. Member selects second document: "economic_data.xlsx" (1.8 MB)
11. System validates second file similarly
12. System displays both files in attachment list with removal buttons
13. Member decides to add an image showing economic trends
14. Member clicks image attachment button
15. Member selects image: "inflation_trends_2024.png" (1.2 MB)
16. System validates image:
    - Verifies PNG format and integrity
    - Checks dimensions (1200x800 pixels - within 100px to 8000px range)
    - Confirms file size: 1.2 MB is within 10 MB image limit
17. System generates thumbnail preview and displays in attachment section
18. Member can see attachments summary:
    - 2 documents (fed_policy_brief.pdf 2.5 MB, economic_data.xlsx 1.8 MB)
    - 1 image (inflation_trends_2024.png 1.2 MB)
    - Total: 5.5 MB of 100 MB allowed
19. Member optionally clicks "Preview Article" to see how it will appear to readers:
    - Title, content, category tag displayed
    - Thumbnail image shown
    - Document links listed
20. Member reviews article and decides it's ready
21. Member clicks "Submit for Review" button
22. System performs final validation:
    - Title: 5-200 characters ✓
    - Category: valid selection ✓
    - Content: 10-50,000 characters ✓
    - Attachments: valid files, within limits ✓
23. System creates article record:
    - Assigns unique article ID
    - Sets status to "pending_approval"
    - Records creator (member ID)
    - Records creation timestamp (UTC)
    - Stores all attachment files securely
    - Stores all attachment metadata (filename, size, upload time)
24. System displays confirmation message: "Article submitted successfully! Moderators will review and publish it shortly. Check 'My Articles' to track status."
25. Member is redirected to "My Articles" page
26. Member sees their article listed with status "Pending Review"
27. System sends notification to all moderators:
    - Subject: "New article pending review: Federal Reserve's New Interest Rate Policy..."
    - Content shows article title, author, category, and preview
28. Moderators see pending article in their review queue within 1 minute
29. Member can click "Edit" while article is pending to make changes before moderator reviews

**Business Rules Applied**:
- WHEN a member creates an article, THE system SHALL require title, category, and content
- WHEN a member submits an article, THE system SHALL require title (5-200 characters)
- WHEN a member submits an article, THE system SHALL require category from predefined list
- WHEN a member submits an article, THE system SHALL require content (10-50,000 characters)
- WHEN a member uploads attachments, THE system SHALL validate file types:
  - Images: JPG, PNG, GIF, WebP (maximum 10 MB each)
  - Documents: PDF, DOCX, TXT, XLS, XLSX (maximum 25 MB each)
  - Archives: ZIP (maximum 50 MB each)
- WHEN a member uploads files, THE system SHALL allow maximum 5 images, 3 documents per article
- WHEN a member submits an article, THE system SHALL set status to "pending_approval"
- WHEN an article is submitted, THE system SHALL assign current member as creator
- WHEN an article is submitted, THE system SHALL NOT display it to guests or other members until approved
- WHEN an article is submitted, THE system SHALL send notification to all moderators
- WHEN an article is in "pending_approval" status, THE system SHALL allow only the creator to edit it

**File Validation Rules**:
- WHEN file is uploaded, THE system SHALL verify magic number (file header) matches declared type
- WHEN PDF is uploaded, THE system SHALL verify PDF is readable (not corrupted)
- WHEN image is uploaded, THE system SHALL verify dimensions between 100x100 and 8000x8000 pixels
- WHEN image is uploaded, THE system SHALL check format validity and cannot be spoofed (.jpg.exe rejected)
- WHEN file size exceeds limit, THE system SHALL reject specific file with clear reason
- WHEN total attachments would exceed 100 MB per article, THE system SHALL reject addition

**Error Handling**:
- IF title is less than 5 characters THEN display "Title must be at least 5 characters" and preserve form
- IF title exceeds 200 characters THEN display "Title cannot exceed 200 characters"
- IF content is less than 10 characters THEN display "Content must be at least 10 characters"
- IF content exceeds 50,000 characters THEN display "Content cannot exceed 50,000 characters"
- IF category is not selected THEN display "Category is required"
- IF file upload fails due to size THEN display "File '[filename]' exceeds [limit] MB limit. Your file is [size] MB."
- IF file type not supported THEN display "File type '[type]' not supported. Allowed: PDF, DOCX, TXT, XLS, XLSX, JPG, PNG, GIF"
- IF total attachment size exceeds 100 MB THEN display "Total attachment size exceeds 100 MB limit. Current: [size] MB. You can add [remaining] MB more."
- IF image dimensions exceed maximum THEN display "Image dimensions exceed maximum of 8000x8000 pixels. Your image: [dimensions]"
- IF image dimensions below minimum THEN display "Image dimensions below minimum of 100x100 pixels"
- IF PDF is corrupted THEN display "File appears to be corrupted or invalid. Please check and try again."
- IF submission fails server-side THEN display "Article submission failed. Please try again." and preserve all form data

**Duplicate Prevention**:
- WHEN member submits article, THE system SHALL check for identical title in published articles from last 30 days
- IF identical title found THEN display warning: "An article with this title already exists. Continue anyway?"
- IF member confirms, THE article is submitted despite duplicate title

**Performance Expectations**:
- WHEN member submits article with attachments, THE system SHALL process and respond within 3 seconds
- WHEN member uploads 5 MB file, THE system SHALL complete upload within 5 seconds on typical broadband
- WHEN moderators are notified, THE system SHALL deliver notification within 1 minute

---

### Workflow 7: Editing an Unpublished (Pending) Article

**User Goal**: A member submitted an article for review but realizes there are errors and wants to make corrections before moderators review it.

**Prerequisites**: Member has submitted an article that remains in "pending_approval" status (not yet reviewed by moderators).

**Steps**:

1. Member navigates to "My Articles" page
2. System displays list of member's articles with status labels:
   - "Pending Review" (1 article)
   - "Published" (2 articles)
   - "Rejected" (0 articles)
3. Member sees their pending article: "Federal Reserve's New Interest Rate Policy..."
4. Member clicks "Edit" button on pending article
5. System loads article edit form with current content pre-filled:
   - Title field contains current title
   - Category dropdown shows current selection
   - Content textarea shows full article text
   - Attachment section shows currently attached files with thumbnails
6. Member reviews content and identifies error:
   - Typo in content: "intrest" should be "interest"
7. Member clicks in content field and corrects typo
8. Member also wants to add another attachment:
   - Clicks "Add Attachment"
   - Selects another file: "additional_data.csv" (0.8 MB)
9. System validates new file:
   - Format supported (CSV) ✓
   - Size 0.8 MB within limits ✓
   - Total attachments now 3 files (within 5 limit) ✓
   - Total size now 5.5 MB + 0.8 MB = 6.3 MB (within 100 MB limit) ✓
10. System displays new file in attachment list
11. Member decides to remove one attachment that's no longer relevant:
    - Clicks "Remove" button next to "economic_data.xlsx"
12. System removes file from attachment list
    - Remaining: fed_policy_brief.pdf, inflation_trends_2024.png, additional_data.csv
13. Member clicks "Save Changes"
14. System validates edited article:
    - Title: 5-200 characters ✓
    - Content: 10-50,000 characters ✓
    - Category: valid ✓
    - All attachments: valid ✓
15. System updates article in database:
    - Updates title, content, category, attachments
    - Sets status to "pending_approval" (resets review)
    - Updates "Updated At" timestamp
    - Preserves creation timestamp
16. System displays confirmation: "Article updated successfully. It has been returned to moderators for review."
17. System notifies moderators: "Updated article pending review: Federal Reserve's New Interest Rate Policy..."
18. Member's article remains in "Pending Review" status
19. Moderators see updated version in their review queue

**Business Rules Applied**:
- WHEN a member edits a pending article, THE system SHALL allow modifications to all fields
- WHEN a member edits an article, THE system SHALL allow adding/removing attachments (within limits)
- WHEN a member edits a pending article, THE system SHALL reset status back to "pending_approval"
- WHEN a pending article is edited, THE system SHALL notify moderators of updated submission
- THE system SHALL only allow members to edit their own articles
- WHEN article status is "pending_approval", ONLY the creator can edit it
- WHEN article is edited, THE system SHALL preserve original creation timestamp
- WHEN article is edited, THE system SHALL update the "Updated At" timestamp

**Error Handling**:
- IF member attempts to edit article they did not create THEN display "You do not have permission to edit this article"
- IF member tries to edit a published article THEN display "Published articles cannot be edited. You can delete it and create a new article if needed."
- IF member tries to edit a rejected article THEN display "You can edit rejected articles to improve them before resubmitting"
- IF file upload fails during edit THEN display error specific to file and preserve existing attachments
- IF edit submission fails THEN display "Failed to save changes. Please try again." and preserve all form changes

**Performance Expectations**:
- WHEN member submits edited article, THE system SHALL save and respond within 2 seconds
- WHEN moderators are notified of update, THE system SHALL send notification within 1 minute

---

### Workflow 8: Viewing and Managing Own Articles

**User Goal**: A member wants to see all their articles, check their publication status, and manage their contributions.

**Prerequisites**: Member is logged in.

**Steps**:

1. Member navigates to "My Articles" section from main menu or profile
2. System displays member's article list with columns:
   - Article title
   - Status (Pending Review / Published / Rejected)
   - Creation date
   - Number of comments
   - View / Edit / Delete buttons
3. Member sees list of their articles:
   - 2 published articles with "Published" status badge
   - 1 pending article with "Pending Review" badge
   - (Optional) 1 rejected article with "Rejected" badge
4. For published articles:
   - Title is clickable link to view article
   - "Edit" button is disabled (published articles cannot be edited)
   - "View" button opens article as readers see it
   - "Delete" button is available but shows warning
   - Comment count displayed (e.g., "12 comments")
5. For pending article:
   - "Edit" button is enabled
   - "View" button shows draft version (with "Draft" watermark)
   - "Delete" button available
6. Member clicks "View" on published article
7. System opens article in view mode showing:
   - Full title and content
   - Author name (display name)
   - Publication date and timestamp
   - All comments and discussion
   - View count (e.g., "234 views")
   - All attached images and files
8. Member can see how readers experience their article
9. Member returns to "My Articles" list
10. Member clicks "Delete" on a published article
11. System shows confirmation dialog:
    - "Are you sure you want to delete this article?"
    - "This will also delete all [12] comments on this article."
    - "This cannot be undone."
    - Buttons: "Cancel" or "Delete Permanently"
12. IF member confirms deletion:
    - System permanently removes the article
    - System removes all associated comments
    - System deletes all attached files from storage
    - System updates comment counts for article author
    - System displays: "Article deleted successfully"
13. IF member clicks Cancel:
    - Dialog closes
    - Article remains unchanged
14. Member can also view rejected article (if any):
    - Status shows "Rejected" with rejection reason visible
    - "Edit" button is enabled to make improvements
    - Rejection reason explains why article was not published
15. Member clicks "Edit" on rejected article
16. System loads article edit form with current content
17. Member can make improvements and resubmit
18. Member may view sorting/filtering options:
    - Sort by date (newest/oldest)
    - Sort by comment count
    - Filter by status (Pending / Published / Rejected)

**Business Rules Applied**:
- WHEN member views "My Articles", THE system SHALL show only their own articles
- WHEN member views article list, THE system SHALL display current status for each article
- WHEN member views published article, THE system SHALL NOT allow editing (display "Published articles cannot be edited")
- WHEN member views pending article, THE system SHALL allow editing
- WHEN member views rejected article, THE system SHALL allow editing and resubmission
- THE system SHALL only allow deletion by article creator
- WHEN article is deleted, THE system SHALL also delete all comments on that article
- WHEN article is deleted, THE system SHALL delete all associated attachment files
- THE system SHALL display rejection reason if article was rejected
- THE system SHALL display view count for published articles

**Deletion Rules**:
- WHEN member deletes an article, THE system SHALL require confirmation
- WHEN member deletes published article, THE system SHALL delete all associated comments
- WHEN article is deleted, ALL attached files SHALL be removed from storage within 24 hours
- DELETED articles CANNOT be recovered by member (permanent deletion)
- MODERATORS can still view deleted articles in audit logs if needed

**Error Handling**:
- IF article list is empty THEN display "You haven't created any articles yet. Create your first article?"
- IF member attempts to edit article by another user THEN display "You do not have permission to edit this article"
- IF article was deleted before member tried to edit THEN display "This article is no longer available"
- IF deletion fails THEN display "Failed to delete article. Please try again."

**Performance Expectations**:
- WHEN member loads "My Articles" list, THE system SHALL respond within 2 seconds
- WHEN member views article, THE system SHALL load within 2 seconds
- WHEN member deletes article, THE system SHALL process deletion within 2 seconds

---

## Member Comment and Discussion Workflow

### Workflow 9: Posting a Comment on an Article

**User Goal**: A logged-in member wants to respond to a discussion article with their perspective and supporting evidence.

**Prerequisites**: Member is logged in and viewing a published article.

**Steps**:

1. Member reads a published article about economic policy
2. Member scrolls down past article content to the "Comments" section
3. System displays existing comments in chronological order (oldest first)
4. System shows comment count: "Comments (12)" or "No comments yet"
5. System displays "Post a Comment" text box at bottom of comments section
6. Member clicks in comment text box
7. Member types comment response: "This analysis overlooks the impact on small business operating costs. Many small firms cannot absorb the policy impacts as quickly as large corporations."
8. Member's comment text is now 164 characters (within 5-5,000 character limit)
9. Member decides to attach evidence:
   - Clicks "Choose File" or "Attach File" button
   - Selects PDF document: "small_biz_impact_study.pdf" (1.5 MB)
10. System validates attachment:
    - PDF format supported ✓
    - Size 1.5 MB within 25 MB limit ✓
    - File is readable and not corrupted ✓
11. System displays attachment filename and size: "small_biz_impact_study.pdf (1.5 MB)" with remove button
12. Member can optionally attach 1 more file (comment limit 3 files)
13. Member can attach image: "cost_comparison_chart.png" (0.8 MB)
14. System validates image:
    - PNG format supported ✓
    - Size 0.8 MB within 10 MB image limit ✓
    - Dimensions valid ✓
15. System displays both attachments in comment composition area
16. Member optionally previews comment to see formatting
17. Member reviews comment content: text + 2 attachments
18. Member clicks "Post Comment" button
19. System validates comment:
    - Content is not empty ✓ (164 characters)
    - Content does not exceed 5,000 characters ✓
    - Attachments are valid ✓ (2 files, 2.3 MB total within limits)
    - Member has not exceeded rate limit (max 3 comments/minute on same article) ✓
20. System creates comment record:
    - Assigns unique comment ID
    - Records author (member ID and display name)
    - Records creation timestamp (UTC)
    - Associates with parent article
    - Stores attachment metadata
21. System stores attachment files securely with comment ID reference
22. System displays confirmation: "Comment posted successfully!"
23. System adds comment immediately to article's comment section:
    - At bottom of existing comments
    - Shows author name: "Jane Smith"
    - Shows "Member" designation
    - Shows posted timestamp: "just now"
    - Displays comment text
    - Shows attachments as downloadable links and images
24. Comment count increments: "Comments (13)"
25. System optionally sends notification to article author: "[Member] has commented on your article"
26. System optionally sends notifications to other commenters: "[Member] has commented on [Article]"
27. Member can see their comment immediately on the article page
28. Other members can now view the new comment and see the attachments

**Business Rules Applied**:
- WHEN member posts comment, THE system SHALL require text content (1-5,000 characters minimum)
- WHEN member posts comment, THE system SHALL allow maximum 3 file attachments per comment
- WHEN member posts comment, THE system SHALL allow maximum 50 MB total size per comment
- WHEN comment is posted, THE system SHALL record author, timestamp, and article association
- WHEN comment is posted, THE system SHALL display immediately (no moderation queue required)
- THE system SHALL limit comments to 3 per minute on same article (rate limiting)
- THE system SHALL limit comments to 30 per day total per member
- WHEN comment is posted, THE system SHALL update article comment count
- WHEN comment includes duplicate content posted within 60 seconds, THE system SHALL reject with warning
- WHEN member posts comment, THE system SHALL accept file attachments: PDF, DOCX, TXT, JPG, PNG, GIF

**Rate Limiting Rules**:
- WHEN member posts comment, THE system SHALL track posting timestamps
- IF member posts 3+ comments on same article within 60 seconds THEN reject with "Please wait before posting again"
- IF member posts 30+ comments in 24 hour period THEN reject with "Daily comment limit reached"
- IF member posts duplicate comment within 60 seconds THEN reject with "This appears to be a duplicate of your recent comment"

**Error Handling**:
- IF comment is empty THEN display "Comment cannot be empty"
- IF comment exceeds 5,000 characters THEN display "Comment is too long. Maximum 5,000 characters allowed. Current: [count]"
- IF comment is less than 1 character THEN display "Please enter comment text before posting"
- IF file attachment fails size check THEN display "File '[filename]' exceeds [limit]. Your file is [size] MB"
- IF file type not supported THEN display "File type not supported. Allowed: PDF, DOCX, TXT, JPG, PNG, GIF"
- IF total attachments would exceed 50 MB THEN display "Total attachment size would exceed 50 MB limit"
- IF exceeding rate limit (3 comments/minute same article) THEN display "You're posting too quickly. Please wait before posting another comment"
- IF exceeding daily limit (30 comments/day) THEN display "You have reached your daily comment limit. Try again tomorrow"
- IF duplicate comment within 60 seconds THEN display "This comment appears to be a duplicate of your recent post"
- IF submission fails THEN display "Failed to post comment. Please try again" and preserve form data

**Attachment Validation**:
- WHEN file is uploaded, THE system SHALL check magic number (file header) matches extension
- WHEN image uploaded, THE system SHALL verify dimensions 100x100 to 8000x8000 pixels
- WHEN PDF uploaded, THE system SHALL verify file is readable
- WHEN attachment uploaded, THE system SHALL scan for malware using antivirus database
- IF malware detected THEN reject file and alert moderators

**Performance Expectations**:
- WHEN member submits comment, THE system SHALL process and display within 2 seconds
- WHEN comment is posted, THE system SHALL be visible to all users within 3 seconds
- WHEN file attachment is uploaded, THE system SHALL process within 5 seconds

---

### Workflow 10: Editing a Posted Comment

**User Goal**: A member realizes their posted comment has a typo or wants to clarify a point, so they edit it.

**Prerequisites**: Member has posted a comment that is visible on the article.

**Steps**:

1. Member views article with their comment posted
2. System displays member's comment with author name and timestamp
3. System displays "Edit" button next to comment (visible only to comment author, not other users)
4. Member notices typo: "intrest" should be "interest"
5. Member clicks "Edit" button on their comment
6. System displays comment in edit mode:
    - Text field containing original comment text
    - Attachments list with current files
    - Preview of changes (optional)
7. Member corrects typo: "intrest" → "interest"
8. Member also wants to add clarification attachment
9. Member clicks "Add Attachment"
10. Member selects image: "clarification_chart.png" (1.2 MB)
11. System validates new attachment:
    - Format supported ✓
    - Size within limits ✓
    - Total with existing attachments within 50 MB ✓
12. System displays new attachment in edit form
13. Member can optionally remove existing attachments by clicking "Remove" button
14. Member clicks "Save Changes"
15. System validates edited comment:
    - Content: 1-5,000 characters ✓
    - Attachments: valid files, within limits ✓
16. System updates comment in database:
    - Updates comment text
    - Updates attachments (adds new, removes deleted)
    - Updates "Updated At" timestamp
    - Preserves creation timestamp and author
17. System displays confirmation: "Comment updated successfully!"
18. System marks comment as edited in display:
    - Shows original posted time
    - Shows "(edited)" indicator with edit timestamp
    - Displays updated comment content
    - Shows all current attachments
19. Other members can see comment was edited via "(edited)" indicator
20. Other members can see the corrected content and new attachment

**Business Rules Applied**:
- WHEN member edits comment, THE system SHALL allow text and attachment modifications
- WHEN member edits comment, THE system SHALL update timestamp to "Updated At"
- WHEN comment is edited, THE system SHALL display "(edited)" indicator with timestamp
- WHEN comment is edited, THE system SHALL preserve original creation time
- THE system SHALL only allow comment author to edit their own comments
- THE system SHALL allow editing at any time (no time window restriction for simplicity)
- WHEN comment is edited, THE system SHALL revalidate all content and attachments

**Error Handling**:
- IF member attempts to edit comment after deletion THEN display "This comment is no longer available"
- IF member tries to edit someone else's comment THEN display "You do not have permission to edit this comment"
- IF edit fails validation THEN display specific error and preserve changes
- IF edited comment would create duplicate THEN allow (no duplicate prevention on edits)

**Performance Expectations**:
- WHEN member saves edited comment, THE system SHALL update within 1 second
- WHEN comment update is displayed, THE system SHALL show changes to all users within 2 seconds

---

### Workflow 11: Deleting a Posted Comment

**User Goal**: A member wants to remove a comment they posted because they no longer want it visible on the article.

**Prerequisites**: Member has posted a comment on an article.

**Steps**:

1. Member views article with comments section
2. Member sees their comment posted with timestamp
3. System displays "Delete" button next to member's comment (visible only to comment author)
4. Member clicks "Delete" button
5. System shows confirmation dialog:
    - "Are you sure you want to delete this comment?"
    - "This cannot be undone."
    - Buttons: "Cancel" or "Delete"
6. IF member clicks "Cancel":
    - Dialog closes
    - Comment remains unchanged
7. IF member confirms deletion:
    - System marks comment as deleted
    - System removes comment from article's comment section
    - System deletes all attached files from storage
    - System updates article comment count (decrements by 1)
    - System displays: "Comment deleted successfully"
8. System removes comment from display:
    - Comment no longer appears in comments list
    - Comment count decrements
    - Other members cannot see the deleted comment
9. System preserves comment record in database for audit purposes (soft delete)
10. IF moderator reviews audit log:
    - Moderator can still see deleted comment with deletion timestamp
    - Moderator can see if deleted by author or moderator

**Business Rules Applied**:
- WHEN member deletes comment, THE system SHALL perform soft deletion (preserve record)
- WHEN comment is deleted, THE system SHALL remove associated attachment files
- WHEN comment is deleted, THE system SHALL update article comment count
- THE system SHALL only allow comment author to delete their own comments
- WHEN comment is deleted, THE system SHALL not display it to regular users
- WHEN comment is deleted, THE system SHALL preserve it in database for audit trail

**Error Handling**:
- IF member attempts to delete comment after it was already deleted THEN display "This comment has already been deleted"
- IF member tries to delete someone else's comment THEN display "You do not have permission to delete this comment"
- IF deletion fails THEN display "Failed to delete comment. Please try again."

**Performance Expectations**:
- WHEN member confirms deletion, THE system SHALL remove comment within 1 second
- WHEN deletion completes, THE system SHALL reflect updated comment count within 2 seconds

---

## Moderator Review and Management Workflow

### Workflow 12: Reviewing Pending Articles for Approval or Rejection

**User Goal**: A moderator needs to review submitted articles and decide whether to approve publication or request improvements.

**Prerequisites**: Moderator is logged in with moderator privileges and articles are pending in review queue.

**Steps**:

1. Moderator navigates to "Moderation Dashboard"
2. System displays moderation overview showing:
    - Pending articles awaiting review (count and list)
    - Reported comments awaiting review (count)
    - Suspended users (count)
    - Recent moderation actions
3. Moderator sees "Pending Articles" section listing:
    - Article title
    - Author name (display name)
    - Submission date and time
    - Category
    - Brief preview (first 200 characters)
    - Status badge: "Pending Review"
    - "Review" button
4. Moderator sees 3 pending articles to review
5. Moderator clicks "Review" on first article: "Federal Reserve's New Interest Rate Policy..."
6. System displays full article detail page:
    - Title: "Federal Reserve's New Interest Rate Policy..."
    - Author: "jane_smith" (display name: "Jane Smith")
    - Category: "Economic Policy"
    - Submission date: "2024-12-10 14:30 UTC"
    - Full article content (2,000+ characters)
    - All attached files with names and sizes
    - Thumbnail images embedded
    - Downloadable file links
7. Moderator reads article and evaluates against community guidelines:
    - Is content on-topic? (Yes - economic policy discussion)
    - Is content respectful? (Yes - no personal attacks)
    - Is content substantive? (Yes - detailed analysis with sources)
    - Any policy violations? (No)
8. Moderator decides to approve article
9. Moderator clicks "Approve Article" button
10. System changes article status to "published"
11. System records approval action:
    - Moderator name
    - Timestamp
    - Action: "Approved"
12. System makes article immediately visible:
    - Article appears on homepage feed
    - Article appears in search results
    - Article appears in "Economic Policy" category view
13. System sends notification to article author:
    - Email: "Your article 'Federal Reserve's New Interest Rate Policy...' has been approved and published!"
    - Link to view article
14. System logs action in audit trail
15. System displays: "Article approved and published"
16. Moderator returns to review queue
17. Moderator clicks "Review" on second article: "Political Analysis of Recent Elections"
18. System displays article detail
19. Moderator reads article and identifies issues:
    - Content contains personal attacks on specific political figures
    - Violates guideline: "No harassment or personal attacks"
20. Moderator decides to reject article
21. Moderator clicks "Reject Article" button
22. System displays rejection form:
    - Dropdown: Select reason for rejection
    - Text field: Optional detailed feedback (max 500 characters)
23. Moderator selects reason: "Personal Attacks / Harassment"
24. Moderator enters feedback: "Your article contains personal attacks on specific political figures. Please revise to focus on policies rather than individuals."
25. Moderator clicks "Send Rejection"
26. System updates article status to "rejected"
27. System records rejection:
    - Moderator name
    - Timestamp
    - Reason: "Personal Attacks / Harassment"
    - Feedback: "[entered text]"
28. System sends notification to article author:
    - Email: "Your article 'Political Analysis of Recent Elections' was not approved for publication"
    - Reason: "Personal Attacks / Harassment"
    - Feedback: "Your article contains personal attacks on specific political figures. Please revise to focus on policies rather than individuals."
    - Link to edit and resubmit
29. System logs rejection action in audit trail
30. Article remains invisible to other members and guests
31. System displays: "Article rejected and author notified"
32. Moderator returns to review queue
33. Moderator sees updated pending list (now 2 articles remaining)

**Alternative Workflow: Request Changes**

20. Moderator determines article needs minor improvements
21. Moderator clicks "Request Changes" button
22. System displays request form:
    - Text field for feedback (required, max 500 characters)
23. Moderator enters: "Article is well-researched but needs citation for the economic data in paragraph 3. Please add sources and resubmit."
24. Moderator clicks "Send Request"
25. System keeps article in "pending_approval" status (not rejected, not approved)
26. System sends notification to author with specific feedback
27. Author receives notification: "Your article needs revision. See feedback below..."
28. Author can edit and resubmit article
29. System notifies moderators when revised article is resubmitted
30. Same moderator or different moderator reviews revised version

**Business Rules Applied**:
- WHEN moderator reviews article, THE system SHALL display full content and all attachments
- WHEN moderator approves article, THE system SHALL change status to "published"
- WHEN moderator rejects article, THE system SHALL change status to "rejected"
- WHEN moderator rejects article, THE system SHALL require rejection reason
- WHEN moderator rejects article, THE system SHALL send notification to author with reason
- WHEN article is approved, THE system SHALL make it visible to all users within 1 minute
- WHEN article is rejected, THE system SHALL keep it invisible to other users
- WHEN moderator approves article, THE system SHALL send author notification
- WHEN article is rejected, THE author can edit and resubmit

**Content Evaluation Guidelines**:

Moderators SHALL APPROVE articles that:
- Address economic or political topics substantively
- Present opinions, analysis, or questions for discussion
- Include supporting evidence, sources, or attachments
- Follow community standards and discussion guidelines
- Are written respectfully without harassment or personal attacks

Moderators SHALL REQUEST CHANGES for articles that:
- Lack supporting evidence or sources (ask for citations)
- Have spelling/grammar errors affecting clarity
- Are poorly organized but contain substantive discussion
- Make claims that need verification or sources

Moderators SHALL REJECT articles that:
- Contain spam, commercial advertising, or promotional content
- Include hateful speech, discrimination, or personal attacks
- Contain plagiarized or copyright-infringing content
- Are completely off-topic (unrelated to economics or politics)
- Contain explicit adult content or graphic violence

**Error Handling**:
- IF article was already published before moderator reviewed THEN display "Article has already been published"
- IF article was deleted before review completed THEN display "Article is no longer available for review"
- IF rejection submitted without reason THEN display "Rejection reason is required"
- IF moderator approval fails THEN display "Failed to approve article. Please try again."
- IF author information is missing THEN display "Cannot send author notification. Moderator must note this issue."

**Performance Expectations**:
- WHEN moderator clicks "Review", THE system SHALL load article within 2 seconds
- WHEN moderator clicks "Approve" or "Reject", THE system SHALL process within 1 second
- WHEN author notification is sent, THE system SHALL deliver within 1 minute

---

### Workflow 13: Deleting Inappropriate Comments

**User Goal**: A moderator identifies a comment that violates community guidelines and needs to be removed from public view.

**Prerequisites**: Moderator is viewing article with comments or monitoring reported comments.

**Steps**:

1. Moderator is reviewing articles and comments on discussion board
2. Moderator identifies comment that contains offensive language and violates guidelines
3. System displays comments list with each comment showing:
    - Author name
    - Comment text
    - Timestamp
    - Number of attachments (if any)
    - "Delete" button (visible only to moderators)
    - "Approve" button (if comment is pending - applies only if moderation system requires it)
4. Moderator clicks "Delete" on problematic comment
5. System displays deletion confirmation form:
    - Text showing: "Are you sure you want to delete this comment?"
    - Dropdown: Select deletion reason
      - Reason options: "Offensive Language", "Off-Topic", "Personal Attack", "Spam", "Copyright", "Other"
    - Text field: Optional detailed note (max 300 characters)
6. Moderator selects reason: "Offensive Language"
7. Moderator optionally enters note: "Contains derogatory language targeting specific group"
8. Moderator clicks "Delete Comment"
9. System removes comment from public view:
    - Comment no longer appears in article's comment section
    - Comment count on article decrements by 1
    - Article view updates automatically
10. System soft-deletes comment record (preserves for audit):
    - Deletion timestamp recorded
    - Moderator name recorded
    - Deletion reason recorded
    - Note recorded
11. System displays placeholder in comments thread (optional):
    - "[Comment removed by moderator]" or similar
    - Preserves context without showing offensive content
12. System optionally sends notification to comment author:
    - Email: "[Comment] has been removed for violating community guidelines"
    - Reason: "Offensive Language"
    - Note: "[moderator note]"
    - Option to appeal or request clarification
13. System logs deletion action in audit trail with full details
14. System displays: "Comment deleted successfully"
15. Moderator can continue reviewing other comments
16. IF author of deleted comment has multiple violations:
    - Moderator may proceed to warn user or suspend account
    - System tracks moderation history for this user

**Business Rules Applied**:
- WHEN moderator deletes comment, THE system SHALL remove it from public display
- WHEN comment is deleted, THE system SHALL record deletion in audit trail
- WHEN comment is deleted, THE system SHALL update article comment count
- THE system SHALL only allow moderators to delete comments
- WHEN comment is deleted, THE system SHALL perform soft deletion (preserve for audit)
- WHEN moderator deletes comment, THE system SHALL record reason and timestamp
- WHEN comment is deleted, THE system SHALL optionally notify author
- WHEN moderator deletes content, THE system SHALL delete associated attachment files

**Deletion Reasons Available**:
- Offensive Language (profanity, slurs, etc.)
- Off-Topic (not related to economic or political discussion)
- Personal Attack / Harassment (directed at specific individual)
- Spam (repetitive promotional content, link spam)
- Copyright Violation (reproduces others' content without permission)
- Other (moderator-specified reason)

**Error Handling**:
- IF comment already deleted before moderator action THEN display "Comment has already been deleted"
- IF deletion fails THEN display "Failed to delete comment. Please try again."
- IF moderator does not select reason THEN display "Deletion reason is required"
- IF author notification fails THEN display warning but complete deletion

**Performance Expectations**:
- WHEN moderator deletes comment, THE system SHALL remove from display within 1 second
- WHEN article view updates, THE system SHALL reflect new comment count within 2 seconds

---

### Workflow 14: Suspending and Managing User Accounts

**User Goal**: A moderator needs to suspend a user account due to repeated policy violations.

**Prerequisites**: Moderator has access to user management panel and identified problem user account.

**Steps**:

1. Moderator navigates to "User Management" section from moderation dashboard
2. System displays user list with search/filter options
3. Moderator searches for user by username: "spam_user"
4. System displays matching user account:
    - Username: spam_user
    - Email: spam_user@example.com
    - Display name: "Spam User"
    - Account created: 2024-10-15
    - Status: "Active"
    - Articles created: 8
    - Comments posted: 45
    - Moderation violations: 3 (articles deleted, 2 comments deleted)
5. Moderator clicks on user profile to view detailed information
6. System displays user detail page:
    - Account information (username, email, creation date, status)
    - Articles created (list with status and deletion indicators)
    - Comments posted (list with deletion indicators)
    - Moderation history:
      - Warning issued: 2024-11-20 "Please follow community guidelines"
      - Article deleted: 2024-11-22 "Spam content"
      - Comment deleted: 2024-11-25 "Off-topic spam"
      - Comment deleted: 2024-12-01 "Offensive language"
    - Current status: Active
    - Suspension history: None
7. Moderator reviews violation history
8. Moderator determines repeated violations warrant account suspension
9. Moderator clicks "Suspend Account" button
10. System displays suspension form:
    - Duration options:
      - 1 day
      - 7 days
      - 30 days
      - Custom (moderator-specified)
    - Reason dropdown: "Repeated Policy Violations" (selected)
    - Text field: Optional detailed note for user (max 500 characters)
11. Moderator selects duration: "7 days"
12. Moderator enters note: "Account suspended for repeated violations. Please review community guidelines. Account will be reviewed for permanent ban if violations continue."
13. Moderator clicks "Suspend Account"
14. System updates account status to "suspended"
15. System records suspension:
    - Moderator name
    - Timestamp
    - Duration: 7 days
    - Expiration date (7 days from now): 2024-12-17
    - Reason: "Repeated Policy Violations"
    - Note: "[text entered]"
    - Auto-reactivation scheduled for expiration date
16. System prevents suspended user from logging in:
    - IF user attempts login, system displays: "Your account is suspended until [date]. See the email sent to your account for details."
17. System prevents suspended user from creating articles/comments:
    - IF user tries to create content (via direct URL or API), system displays: "Your account is suspended until [date] and cannot create content"
    - IF user views suspension notice in profile, displays: "This account is suspended until [date]"
18. System allows suspended user to VIEW existing content
19. System sends notification email to user:
    - Subject: "Your account has been suspended"
    - Body:
      - Reason: "Repeated Policy Violations"
      - Duration: "7 days (until 2024-12-17 at 14:30 UTC)"
      - Note: "[moderator note]"
      - Appeal process: "If you believe this is in error, contact moderators"
20. System logs suspension in audit trail
21. System displays: "Account suspended successfully"
22. Moderator can continue with other users

**Alternative Path: Permanent Ban**

8. Moderator reviews severe violations (hate speech, harassment, threats)
9. Moderator determines account should be permanently banned
10. Moderator clicks "Ban Account" (permanent)
11. System displays confirmation:
    - "Are you sure? This will permanently ban the account."
    - "The user will not be able to create a new account with the same email."
    - "This action cannot be undone."
    - Buttons: "Cancel" or "Confirm Ban"
12. IF moderator confirms:
    - System sets account status to "banned"
    - System prevents any login with this account
    - System prevents new registration with this email address
    - System marks all content as hidden from this author: "[Deleted User]"
    - System sends notification email explaining permanent ban and appeal process
    - System logs ban action in audit trail
13. System displays: "Account permanently banned"

**Business Rules Applied**:
- WHEN moderator suspends account, THE system SHALL prevent login during suspension
- WHEN account is suspended, THE system SHALL auto-reactivate on expiration date
- WHEN account is suspended, THE system SHALL prevent content creation
- WHEN account is suspended, THE system SHALL allow content viewing
- WHEN moderator bans account, THE action SHALL be permanent and non-reversible
- WHEN account is banned, THE system SHALL prevent new registration with same email
- WHEN user account is banned, THE system SHALL anonymize their historical content
- THE system SHALL send notification email explaining suspension/ban with reason

**Suspension Duration Options**:
- 1 day: Minor first violation
- 7 days: Repeated minor violations
- 30 days: Serious violations or repeated suspensions
- Custom: Moderator-specified duration for complex cases
- Permanent ban: Severe violations (hate speech, threats, harassment)

**User Appeal Process**:
- WHEN user is suspended or banned, THE email SHALL include appeal contact information
- IF user contacts moderators to appeal, MODERATORS can review the case and potentially reverse
- MODERATORS can manually unsuspend account if appeal is justified
- ALL appeal actions ARE logged in audit trail

**Error Handling**:
- IF user is already suspended THEN display "User is already suspended until [date]"
- IF user is already banned THEN display "User account is permanently banned"
- IF suspension fails THEN display "Failed to suspend account. Please try again."
- IF duration field is empty THEN display "Please select or enter suspension duration"

**Performance Expectations**:
- WHEN moderator suspends account, THE system SHALL update account status within 1 second
- WHEN suspension is applied, THE system SHALL send notification email within 1 minute
- WHEN user attempts login to suspended account, THE system SHALL respond within 1 second

---

## Content Search and Discovery Workflow

### Workflow 15: Member Searching for Articles by Keyword

**User Goal**: A member wants to find discussions about cryptocurrency regulation to learn about recent policy changes.

**Prerequisites**: Member is on the homepage or any page with search functionality.

**Steps**:

1. Member sees search box prominently displayed in page header
2. Member clicks in search box
3. Member begins typing keywords: "crypt"
4. System performs real-time search as member types:
    - Searches article titles and content for keyword matches
    - Displays search suggestions showing matching articles:
      - "Cryptocurrency Regulation and Innovation"
      - "Cryptocurrency Market Impacts on Traditional Finance"
      - "Crypto Tax Policy Debates"
    - Displays "See all results for 'crypt'" link
5. Member completes typing: "cryptocurrency regulation"
6. Member presses Enter or clicks search button
7. System executes search for keyword "cryptocurrency regulation"
8. System searches articles where title OR content contains keywords
9. System returns search results sorted by date (newest first)
10. System displays results page showing:
    - Search query: "cryptocurrency regulation"
    - Number of results found: "8 articles"
    - Results list showing for each article:
      - Title (clickable link)
      - Author name
      - Publication date
      - Category tag
      - Excerpt (preview text with keyword highlighted)
      - Number of comments
      - Pagination showing 20 results per page
11. Member reviews the list of 8 results
12. Member sees most relevant article: "Cryptocurrency Regulation and Innovation"
13. Member clicks article title to view full discussion
14. System loads article detail page:
    - Full article content
    - Author information
    - Comments section
    - Attachments
15. Member reads article and comments
16. Member can go back to search results to review other matches
17. Member can modify search query:
    - Clicks in search box
    - Clears previous query: "cryptocurrency"
    - Types new query: "blockchain"
    - Presses Enter
18. System returns new search results for "blockchain" (different set of articles)
19. Member can also use filter options:
    - Category filter: Select "Economics" or "Politics"
    - Time filter: Select "Last 7 Days", "Last 30 Days", "All Time"
    - Author filter: Search by specific member username
20. Member applies time filter: "Last 7 Days"
21. System updates search results:
    - Shows only articles matching "cryptocurrency regulation" AND created in last 7 days
    - Results count changes (fewer results): "3 articles"
22. Member reviews filtered results
23. Member can clear all filters and search again

**Search Query Validation**:
- IF search query is empty THEN display "Enter search term"
- IF search query is 1 character THEN display "Search term must be at least 2 characters"
- IF search query contains special characters THEN either filter out or display error
- IF search query is valid THEN execute search

**Business Rules Applied**:
- WHEN member searches, THE system SHALL search article titles and content
- WHEN search is performed, THE system SHALL only return articles with status "published"
- THE system SHALL NOT return pending approval or rejected articles to members
- WHEN search results displayed, THE system SHALL sort by date (newest first)
- WHEN search contains special characters, THE system SHALL handle gracefully (filter or reject)
- THE system SHALL search case-insensitive ("Cryptocurrency" matches "cryptocurrency")
- WHEN search returns 1,000+ results, THE system SHALL paginate at 20 per page
- WHEN search returns no results, THE system SHALL display helpful "No results found" message

**Search Performance**:
- WHEN member enters search query and submits, THE system SHALL return results within 3 seconds
- WHEN search results load, THE system SHALL display within 2 seconds on typical internet

**Error Handling**:
- IF search returns no matching articles THEN display "No articles found matching 'cryptocurrency regulation'. Try different keywords or browse by category."
- IF search query is too short (less than 2 characters) THEN display "Search term must be at least 2 characters"
- IF search request times out THEN display "Search took too long. Please try again or browse by category"
- IF search contains only special characters THEN display "Search must contain at least one letter or number"

---

### Workflow 16: Member Browsing Articles by Category

**User Goal**: A member wants to see all recent discussions about politics to stay informed on current events.

**Prerequisites**: Member is on the homepage with category filter options visible.

**Steps**:

1. Member sees category navigation showing:
   - "All Articles" (default view, no filter)
   - "Economics" (category filter)
   - "Politics" (category filter)
   - "Other" (category filter)
2. Member clicks on "Politics" category
3. System filters article list to show only articles marked with category "Politics"
4. System displays filtered article list showing:
    - Filter indicator: "Showing articles in Politics"
    - Article count: "23 articles"
    - All articles with category "Politics" sorted by date (newest first)
    - For each article: title, author, date, preview, comment count
    - Pagination controls
5. Member scrolls through politics articles
6. Member sees article: "Trade Policy and International Relations"
7. Member clicks article to read full content
8. System loads article detail
9. Member reads article and comments
10. Member returns to category view (back button or navigation)
11. System displays Politics category list again
12. Member decides to also filter by time:
    - Clicks time filter: "Last 7 Days"
13. System updates results:
    - Shows "Politics" articles from last 7 days
    - Result count decreases: "7 articles"
14. Member reviews filtered results
15. Member can switch to different category:
    - Clicks "Economics"
16. System displays Economics category articles (time filter still applied)
    - Shows "Economics" articles from last 7 days
    - Result count: "12 articles"
17. Member can clear all filters:
    - Clicks "All Articles" or "Clear Filters"
18. System returns to unfiltered article list

**Business Rules Applied**:
- WHEN member filters by category, THE system SHALL display only articles with that category
- WHEN articles are displayed by category, THE system SHALL sort by date (newest first)
- THE system SHALL only display published articles in category views
- WHEN member applies multiple filters (category + time), THE system SHALL combine filters
- THE system SHALL display active filter indicators to member
- THE system SHALL allow clearing filters to return to all articles

**Category Options**:
- All Articles (no filter, default state)
- Economics (articles with category "Economics")
- Politics (articles with category "Politics")
- Economic Policy (articles with category "Economic Policy")
- Political Analysis (articles with category "Political Analysis")
- Other (articles with category "Other")

**Time Filter Options**:
- All Time (no time filter)
- Last 24 Hours
- Last 7 Days
- Last 30 Days

**Performance Expectations**:
- WHEN member clicks category, THE system SHALL filter and display within 1 second
- WHEN category articles load, THE system SHALL respond within 2 seconds
- WHEN filter is applied, THE system SHALL update results within 1 second

**Error Handling**:
- IF category has no published articles THEN display "No articles in this category yet"
- IF filtering would result in zero results THEN display "No articles matching these filters. Try different options"

---

## Member Account Management Workflow

### Workflow 17: Member Updating Profile Information

**User Goal**: A member wants to update their display name and profile information to reflect their current role/expertise.

**Prerequisites**: Member is logged in and has navigated to account settings.

**Steps**:

1. Member clicks on "Profile" or "Account Settings" in navigation menu
2. System displays member profile page showing current information:
    - Username: "jane_smith" (cannot change)
    - Email: "jane.smith@example.com" (cannot change here)
    - Display name: "Jane Smith"
    - Bio: (empty)
    - Profile picture: (default avatar)
    - Account created: "2024-01-15"
    - Articles posted: 5
    - Comments posted: 23
    - Account status: "Active"
3. Member sees "Edit Profile" button
4. Member clicks "Edit Profile"
5. System displays profile edit form with editable fields:
    - Display name (required, 1-50 characters)
    - Bio (optional, 0-500 characters)
    - Profile picture (optional, JPG/PNG/GIF, max 5 MB)
    - Email preferences (notification settings)
    - Display theme preference
6. Member updates display name:
    - Changes from "Jane Smith" to "Dr. Jane Smith, Economics"
7. Member enters bio:
    - "Economics professor and policy analyst with 15 years research experience. Interested in monetary policy and economic regulation."
8. Member wants to upload profile picture:
    - Clicks "Choose Photo" button
    - Selects file: "jane_headshot.jpg" (1.8 MB)
9. System validates image:
    - File format: JPG ✓
    - File size: 1.8 MB (within 5 MB limit) ✓
    - Image dimensions: 800x600 pixels (within 100-8000 range) ✓
10. System shows preview of image:
    - Displays thumbnail of selected headshot
    - Shows "[Image will be resized to 200x200 pixels]"
11. Member can crop or adjust image (optional feature):
    - System optionally provides crop tool
    - Member confirms crop
12. Member reviews all changes:
    - Display name: "Dr. Jane Smith, Economics"
    - Bio: "Economics professor..." (preview)
    - Profile picture: thumbnail preview
13. Member clicks "Save Changes"
14. System validates all fields:
    - Display name: 1-50 characters ✓ (actually 32 characters)
    - Bio: 0-500 characters ✓ (actually 102 characters)
    - Profile picture: valid image format and size ✓
15. System processes profile picture:
    - Resizes to 200x200 pixels
    - Strips EXIF metadata (location, camera info, etc.)
    - Stores securely
    - Generates thumbnail
16. System saves profile to database:
    - Display name updated
    - Bio saved
    - Profile picture URL stored
    - Updated timestamp recorded
17. System displays confirmation: "Profile updated successfully!"
18. Member sees updated profile:
    - New display name displayed
    - New bio visible
    - New profile picture shown
19. Going forward, member's new display name "Dr. Jane Smith, Economics" appears as author name on articles and comments
20. Member's profile picture appears next to author attribution

**Business Rules Applied**:
- WHEN member updates profile, THE system SHALL validate display name (1-50 characters)
- WHEN member updates profile, THE system SHALL validate bio (0-500 characters, optional)
- WHEN member uploads profile picture, THE system SHALL accept JPG/PNG/GIF only
- WHEN member uploads profile picture, THE system SHALL limit to 5 MB maximum
- WHEN profile picture is uploaded, THE system SHALL resize to 200x200 pixels
- WHEN profile picture is uploaded, THE system SHALL strip EXIF metadata
- THE system SHALL NOT allow username changes through profile editing
- THE system SHALL NOT allow email changes through profile editing (requires separate secure process)
- WHEN profile is updated, THE system SHALL update "Updated At" timestamp
- WHEN display name is changed, THE system SHALL apply to all future posts (not retroactively)

**Field Validation Rules**:
- Display name: Required, 1-50 characters
  - IF empty THEN display "Display name cannot be empty"
  - IF exceeds 50 characters THEN display "Display name too long (max 50 characters)"
- Bio: Optional, 0-500 characters
  - IF provided and exceeds 500 THEN display "Bio too long (max 500 characters)"
- Profile picture: Optional, JPG/PNG/GIF, max 5 MB
  - IF format not supported THEN display "Profile picture must be JPG, PNG, or GIF"
  - IF exceeds 5 MB THEN display "File size exceeds 5 MB limit. Your file: [size] MB"
  - IF dimensions invalid THEN display "Image dimensions invalid"

**Error Handling**:
- IF display name is empty THEN display "Display name cannot be empty"
- IF display name contains only spaces THEN display "Display name cannot be only spaces"
- IF profile picture exceeds 5 MB THEN display "File too large. Maximum 5 MB allowed"
- IF profile picture format not supported THEN display "File format not supported. Use JPG, PNG, or GIF"
- IF profile update fails THEN display "Failed to save profile. Please try again" and preserve all changes

**Performance Expectations**:
- WHEN member submits profile changes, THE system SHALL save within 2 seconds
- WHEN member uploads profile picture, THE system SHALL process and respond within 3 seconds
- WHEN profile changes are saved, THE system SHALL reflect updates site-wide within 2 seconds

---

### Workflow 18: Member Changing Password

**User Goal**: A member wants to change their password for security purposes.

**Prerequisites**: Member is logged in and on their account settings page.

**Steps**:

1. Member navigates to "Account Settings" or "Security"
2. System displays account security options:
    - Change Password
    - Email Management
    - Active Sessions
    - Connected Devices
3. Member clicks "Change Password"
4. System displays password change form requiring:
    - Current password (required)
    - New password (required, must meet complexity)
    - Confirm new password (required, must match)
    - Password requirements displayed:
      - "Password must be 8+ characters"
      - "Must include uppercase, lowercase, number, special character"
5. Member enters current password: "SecurePass2024!"
6. System validates current password against stored hash:
    - IF matches THEN proceed
    - IF incorrect THEN display error (see error handling)
7. Member enters new password: "NewSecure2025@"
8. System validates new password complexity:
    - Length: 14 characters ✓ (8+ required)
    - Uppercase: Y (contains E, S, N) ✓
    - Lowercase: y (contains ew, ecure, tc) ✓
    - Number: Y (contains 2, 0, 2, 5) ✓
    - Special character: Y (contains @) ✓
    - Does not contain username ✓
    - Does not match last 3 passwords ✓
9. Member confirms new password: "NewSecure2025@"
10. System validates password confirmation:
    - New password matches confirmation ✓
11. Member clicks "Change Password"
12. System performs final validation:
    - Current password correct ✓
    - New password meets complexity ✓
    - Passwords match ✓
    - New password different from last 3 ✓
13. System updates password in database:
    - Hashes new password using bcrypt
    - Stores hash with new salt
    - Records password change timestamp
    - Adds previous password to history (for preventing reuse)
14. System invalidates all existing sessions:
    - Member is logged out from all devices/browsers
    - All JWT tokens are revoked
    - Member must log in again with new password
15. System displays message: "Password changed successfully. For security, you are logged out. Please log in again."
16. Member is redirected to login page
17. Member sees message: "Your password has been changed. Log in with your new password."
18. Member enters email and new password
19. System authenticates with new password
20. Member successfully logs in with new credentials

**Business Rules Applied**:
- WHEN member changes password, THE system SHALL require current password for verification
- WHEN member changes password, THE system SHALL enforce complexity (8+ chars, uppercase, lowercase, number, special)
- WHEN member changes password, THE system SHALL prevent reusing last 3 passwords
- WHEN member changes password, THE system SHALL invalidate all existing sessions
- WHEN password is changed, THE system SHALL require re-login from all devices
- WHEN password is changed, THE system SHALL log the change with timestamp
- WHEN member provides invalid current password, THE system SHALL deny and not change password

**Password Complexity Requirements**:
- Minimum 8 characters
- At least one uppercase letter (A-Z)
- At least one lowercase letter (a-z)
- At least one numeric digit (0-9)
- At least one special character from: !@#$%^&*
- Cannot contain username or email address
- Cannot match any of last 3 previously used passwords

**Password Validation Rules**:
- IF current password is incorrect THEN display "Current password is incorrect"
- IF new password is same as current THEN display "New password must be different from current"
- IF new password doesn't meet complexity THEN display specific issues: "Password must include: uppercase letter, number, special character"
- IF new password matches one of last 3 passwords THEN display "You cannot reuse a recent password. Please choose a different password."
- IF passwords don't match THEN display "Passwords do not match"
- IF new password is blank THEN display "New password is required"

**Error Handling**:
- IF current password is incorrect THEN display "Current password is incorrect"
- IF new password fails validation THEN display specific requirements not met
- IF password update fails THEN display "Failed to change password. Please try again."
- IF session invalidation fails THEN display warning but complete password change
- IF user is not logged in THEN redirect to login page

**Performance Expectations**:
- WHEN member submits password change, THE system SHALL validate and respond within 1 second
- WHEN password is changed, THE system SHALL invalidate all sessions within 2 seconds
- WHEN member logs back in with new password, THE system SHALL authenticate within 1 second

---

## Error and Edge Case Scenarios

### Scenario 1: Session Timeout While Composing Article

**Context**: A member has been writing a detailed article but leaves the browser unattended for 35 minutes (exceeding 30-minute inactivity timeout).

**Steps**:

1. Member creates new article and types detailed content (1,500 characters)
2. Member steps away from computer to research additional information
3. Member is inactive for 35 minutes
4. System's session management detects inactivity exceeding 30-minute timeout
5. System invalidates the member's JWT token
6. Member returns and scrolls down in the article form, intending to continue
7. Member clicks "Submit for Review" button
8. System validates request:
    - Checks JWT token validity
    - Token is invalid (expired)
9. System displays error: "Your session has expired. Please log in again."
10. System redirects to login page
11. Member logs in again with username and password
12. System creates new session with new JWT tokens
13. Member navigates back to "Create Article"
14. System displays blank article form (content was not saved)
15. Member's typed content is lost

**Impact**: User loses typed content due to session timeout while composing.

**Expected Behavior to Mitigate**:
- System could auto-save draft content every 30 seconds
- System could warn user 5 minutes before timeout
- System could preserve form content in browser cache
- System could extend session on page activity

**Note**: Current specification requires re-login after 30-minute timeout. System should implement either auto-save drafts or client-side form preservation to prevent content loss.

---

### Scenario 2: File Upload Fails During Article Creation

**Context**: A member uploads a 8 MB PDF file, but network connection drops mid-upload.

**Steps**:

1. Member creates article and enters title, content, category
2. Member selects PDF file for attachment: "research_paper.pdf" (8 MB)
3. Member clicks "Submit for Review"
4. System begins uploading article data and file
5. File upload starts: 2 MB transferred successfully
6. Network connection drops (WiFi disconnects)
7. Upload stalls and times out after 30 seconds
8. System displays error: "File upload failed. Please try again."
9. Member's article form content is preserved
10. Member's file attachment selection is preserved (filename shown in form)
11. Member checks internet connection and reconnects
12. Member clicks "Retry" or "Submit for Review" again
13. System reattempts upload with complete file
14. Upload succeeds
15. Article is submitted successfully

**Expected Behavior**:
- System preserves form data when file upload fails
- System allows retry without re-entering article content
- System provides clear error message
- System cleans up partial uploads

---

### Scenario 3: Member Tries to Post While Email Unverified

**Context**: A member registered recently but hasn't verified their email yet, and tries to create an article.

**Steps**:

1. Member registered account but didn't click verification email
2. Member logs in successfully (verification not required for login itself)
3. Member sees unverified account notice in profile: "Email not verified"
4. Member navigates to "Create Article"
5. Member fills out article form: title, content, category, attachments
6. Member clicks "Submit for Review"
7. System validates request:
    - User is authenticated ✓
    - Checks account status: "unverified"
8. System displays error: "Please verify your email address before creating articles. Check your email for verification link or request a new one."
9. Member cannot proceed with article creation
10. Member clicks "Resend Verification Email"
11. System sends new verification email (rate limited to 1 per 5 minutes)
12. Member checks email and clicks verification link
13. System marks account as verified
14. Member can now create articles
15. Member navigates back to "Create Article" and tries again
16. System allows article creation this time

**Business Rule Applied**:
- WHEN member's email is unverified, THE system SHALL prevent article creation and commenting

---

### Scenario 4: Moderator Rejects Article, Member Resubmits

**Context**: A moderator rejects an article, member makes improvements, and resubmits.

**Steps**:

1. Member submitted article about political policy
2. Moderator reviewed and rejected article
3. System sent notification to member: "Article rejected - Off-topic content"
4. Member receives rejection with feedback: "This article focuses on local politics rather than broader economic/political discussion. Please revise to connect to larger national or international issues."
5. Member navigates to "My Articles" and sees rejected article
6. Member status badge shows "Rejected" in red
7. Member clicks "Edit" on rejected article
8. System loads article in edit form (rejection status allows editing)
9. Member revises content:
    - Adds context connecting local policy to national trends
    - Includes broader policy analysis
    - Adds supporting sources
10. Member reviews changes and clicks "Resubmit for Review"
11. System changes status from "rejected" to "pending_approval"
12. System notifies moderators: "Revised article pending review: [title]"
13. Moderator sees resubmitted article in review queue
14. Moderator reviews revised version
15. Moderator determines now it addresses broader context appropriately
16. Moderator clicks "Approve Article"
17. Article status changes to "published"
18. Member receives notification: "Your article has been approved and published!"
19. Article appears on homepage and in category filters

**Business Rules Applied**:
- WHEN article is rejected, THE system SHALL allow author to edit and resubmit
- WHEN article is resubmitted, THE system SHALL reset status to "pending_approval"
- WHEN article is resubmitted, THE system SHALL notify moderators of update

---

### Scenario 5: Member Uploads Unsupported File Type

**Context**: A member tries to attach a video file (not supported) to their article.

**Steps**:

1. Member creates article with content
2. Member clicks "Choose File" to attach supporting media
3. Member selects file: "policy_interview.mp4" (12 MB video)
4. System validates file type:
    - Extension: .mp4 (not in allowed list)
    - MIME type: video/mp4 (not supported)
5. System displays error: "File type not supported. Allowed types: PDF, DOCX, TXT, XLS, XLSX, JPG, PNG, GIF, ZIP"
6. Member cannot proceed with this file
7. Member clicks "Cancel" and selects different file
8. Member selects "interview_transcript.pdf" (2 MB)
9. System validates:
    - Extension: .pdf ✓
    - MIME type: application/pdf ✓
    - File size: 2 MB (within 25 MB limit) ✓
10. System displays filename in attachment section
11. Member can proceed with article submission

**Business Rule Applied**:
- WHEN file is uploaded, THE system SHALL validate against allowlist of supported types
- WHEN unsupported file selected, THE system SHALL display clear error with list of allowed types

---

### Scenario 6: Guest Tries to Post Comment

**Context**: An unauthenticated guest is reading an article and wants to post a comment.

**Steps**:

1. Guest is viewing published article on discussion board
2. Guest scrolls to "Comments" section
3. System displays published comments from members
4. System displays comment input area with message:
    - "Sign in to post a comment"
    - Links: "Log In" or "Create Account"
5. Guest clicks "Create Account"
6. System redirects to registration page
7. Guest fills out registration form and creates account
8. Guest verifies email
9. Guest logs in
10. Guest returns to article
11. Guest scrolls to comments
12. System now displays active comment text input (guest is now member)
13. Member (formerly guest) can post comment
14. Comment is posted and displayed

**Business Rules Applied**:
- WHEN guest tries to post comment, THE system SHALL deny and require authentication
- WHEN guest is not authenticated, THE system SHALL not display comment input form
- WHEN guest signs up and verifies email, THE system SHALL enable commenting

---

### Scenario 7: Concurrent Edits - Two Members Editing Same Article

**Context**: Two members somehow load the edit form for the same pending article and make changes. Member A saves first.

**Steps**:

1. Member A opens pending article for editing
2. System loads article with current version
3. System stores version hash or timestamp in form: "version_updated: 2024-12-10T14:30:00Z"
4. Member B opens same article for editing
5. System loads article with same current version
6. System stores same version hash in Member B's form
7. Member A makes changes:
    - Corrects typo in title
    - Adds new paragraph
    - Removes one attachment
8. Member A clicks "Save Changes"
9. System validates edits and saves to database
10. System updates article version: "version_updated: 2024-12-10T14:35:00Z"
11. System displays confirmation: "Article updated successfully"
12. Member B continues editing, unaware of Member A's changes
13. Member B makes different changes:
    - Changes category
    - Edits different section
14. Member B clicks "Save Changes"
15. System compares Member B's form version against current database version
16. Versions don't match: Member A's version > Member B's form version
17. System detects conflict
18. System displays error: "This article has been modified by another user. Your changes have not been saved. Please refresh to see the latest version and try again."
19. Member B does not lose their changes - changes are in browser memory
20. Member B clicks "Refresh"
21. System reloads article with latest version (including Member A's changes)
22. Member B can see latest version
23. Member B can choose to re-apply their changes if desired
24. Member B makes changes again and saves successfully

**Prevention Strategy**:
- THE system SHALL implement optimistic locking using version numbers or timestamps
- THE system SHALL detect when edits conflict
- THE system SHALL prevent overwriting another user's changes
- THE system SHALL inform user of conflict
- THE system SHALL allow user to review latest version before re-applying changes

**Error Handling**:
- IF edit conflict detected THEN display "Article has been modified. Refresh to see latest version"
- IF conflict occurs, THE system SHALL NOT overwrite the newer version
- THE system SHALL preserve user's intended changes in browser/form for re-application

---

### Scenario 8: Large File Attachment Causes Article Submission Timeout

**Context**: A member uploads multiple large files (totaling near 100 MB limit) which causes submission to exceed timeout.

**Steps**:

1. Member creates article with multiple large attachments:
   - File 1: 30 MB
   - File 2: 28 MB
   - File 3: 25 MB
   - Total: 83 MB (within 100 MB limit)
2. Member clicks "Submit for Review"
3. System begins uploading files and article data
4. Upload progress: 50 MB transferred (~30 seconds)
5. Upload continues: 70 MB transferred (~50 seconds)
6. Upload continues: 83 MB transferred (~60 seconds) but response hasn't completed
7. Browser times out after 90 seconds
8. System displays error: "Request took too long. Please try again."
9. Network status is unclear - article may have been created or not
10. Member refreshes page
11. System checks if article was already created
12. IF article was created: System displays "Article submitted successfully" and shows article in "My Articles"
13. IF article wasn't created: Form is empty, files need to be re-uploaded

**Mitigation Strategies**:
- THE system MAY implement chunked/multipart file uploads
- THE system MAY implement progress indication for large uploads
- THE system MAY increase timeout for large upload requests
- THE system SHOULD implement optimistic response (acknowledge receipt before all processing complete)

**Business Rule Applied**:
- WHEN large files are uploaded, THE system SHALL not lose form data if timeout occurs

---

### Scenario 9: Moderator Review Queue Grows Faster Than Moderators Can Review

**Context**: Suddenly many new articles are submitted faster than moderators can review, creating backlog.

**Steps**:

1. Morning: 5 pending articles awaiting review
2. Moderators review and approve 2 articles (3 remaining)
3. Afternoon: 15 new articles submitted in 2 hours
4. Pending queue now has 18 articles
5. Moderators working alone can only review ~5-6 per hour
6. At this rate, backlog will grow to 30+ articles
7. Authors of pending articles wonder why their articles aren't published yet
8. System optionally sends notifications to moderators about queue size
9. System displays moderator workload on dashboard: "18 pending articles"
10. Additional moderator comes online to help
11. Two moderators working together can now handle higher volume
12. Backlog starts decreasing

**System Support**:
- THE system SHALL display pending article count in moderation dashboard
- THE system SHOULD send alerts if pending count exceeds threshold (e.g., 20)
- THE system SHOULD provide filtering/sorting options to help moderators prioritize
- THE system SHOULD track average time-to-review metric

---

## Summary of Critical Workflows

This document has provided detailed documentation of the primary workflows that define how the discussion board system operates in real-world usage:

### User Types and Their Workflows:
- **Guests**: Browse articles, search, read comments (read-only)
- **Members**: Create articles, post comments, manage profiles (full participation)
- **Moderators**: Approve articles, delete inappropriate content, manage users (administration)

### Critical Success Paths:
1. **Discovery**: Guests/members can find content via browsing, categories, and search
2. **Participation**: Members can create discussions and engage through comments
3. **Publication**: Articles move from submission → moderator review → publication
4. **Management**: Members can manage their content; moderators can maintain quality
5. **Moderation**: Inappropriate content is removed; problem users are suspended

### Error Prevention:
- Input validation prevents invalid content
- Permission checks prevent unauthorized actions
- Rate limiting prevents spam and abuse
- Session management ensures secure access
- Conflict detection prevents data loss on concurrent edits

### Performance Expectations:
- Page loads: 2 seconds
- Search results: 3 seconds
- File uploads: 5 seconds
- Comment posting: 2 seconds
- Moderation actions: 1 second

These workflows and scenarios provide the complete picture of how users accomplish their goals within the discussion board system, with clear error handling and edge case management. Implementation teams can use these workflows as specifications for development, testing, and user documentation.">
