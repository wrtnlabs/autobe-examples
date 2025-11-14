## Performance Requirements for politicalForum

### Page Load Times

THE politicalForum application SHALL load the home page for a citizen within 2 seconds under normal network conditions (4G or Wi-Fi).

WHEN a citizen navigates to a specific post thread, THE politicalForum application SHALL display the post and its comments within 3 seconds.

WHILE a post thread is loading, THE politicalForum application SHALL display a visual indicator (skeleton loader or progress bar) to maintain user perception of responsiveness.

IF the home page takes longer than 5 seconds to load, THE politicalForum application SHALL display a retry button with the message ‘We’re having trouble loading the feed. Please try again.’

WHERE a citizen has previously visited the site, THE politicalForum application SHALL use local caching to display cached content immediately, then refresh in the background.

### Post Submission Speed

WHEN a citizen submits a new post with text and attachments, THE politicalForum application SHALL confirm successful submission and display the new post in the feed within 2 seconds.

IF a citizen submits a post exceeding file size limits, THE politicalForum application SHALL display an error message within 1 second of submission: ‘Your file is too large. Maximum size is 20MB.’

IF a citizen submits a post with unsupported file type, THE politicalForum application SHALL display an error message within 1 second of submission: ‘Only JPG, PNG, PDF, and MP4 files are allowed.’

WHEN a citizen edits their own post within 24 hours, THE politicalForum application SHALL update the post immediately and reflect the change in the feed without a page refresh.

### Search Responsiveness

WHEN a citizen types a search term into the search field, THE politicalForum application SHALL begin returning suggestions within 500 milliseconds.

WHEN a citizen submits a search query, THE politicalForum application SHALL display results within 1.5 seconds for common terms (up to 10 characters).

WHILE search results are loading, THE politicalForum application SHALL show a loading spinner next to the search box.

IF the search term returns no results, THE politicalForum application SHALL display: ‘No posts found for “{search term}”. Try different keywords.’

WHERE a search term contains special characters like @, #, or \, THE politicalForum application SHALL ignore them and search for the underlying text.

### File Upload Completion Time

WHEN a citizen uploads a 5MB image, THE politicalForum application SHALL complete the upload and display a preview within 5 seconds on a typical Wi-Fi connection.

WHEN a citizen uploads a 20MB MP4 video, THE politicalForum application SHALL complete the upload within 30 seconds on a typical 4G connection.

IF an upload fails, THE politicalForum application SHALL display: ‘Upload failed. Please check your internet connection and try again.’

WHEN an upload is in progress, THE politicalForum application SHALL show a clear progress bar with percentage completed.

WHILE an upload is in progress, THE citizen SHALL be able to continue navigating other parts of the site.

### Moderation Actions

WHEN a moderator deletes a post, THE politicalForum application SHALL remove it from all views within 1 second.

WHEN a moderator locks a thread, THE politicalForum application SHALL disable comment input immediately and display: ‘This thread is locked by a moderator.’

WHEN a moderator marks a post as verified, THE politicalForum application SHALL display a verified badge next to the post within 1 second.

IF a moderator attempts to delete a post while the system is offline, THE politicalForum application SHALL show: ‘Server unavailable. Action will be queued when connection resumes.’

WHILE a moderator is reviewing posts, THE politicalForum application SHALL allow the moderator to navigate between posts with no delay greater than 500 milliseconds.

THE politicalForum application SHALL log all moderation actions internally, but SHALL NOT notify the post author unless explicitly configured by the system administrator.