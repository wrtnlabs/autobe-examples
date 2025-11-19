'''
# Non-Functional Requirements

This document outlines the non-functional requirements for the discussion board. These are the quality attributes that define how the system should operate, focusing on the user experience rather than specific features. They ensure the platform is fast, secure, and easy to use.

## Performance

Performance requirements focus on ensuring the system feels responsive and quick to the user. The overall goal is a smooth and seamless experience without frustrating delays.

*   **Ubiquitous Requirement**: THE system SHALL provide a responsive user experience without noticeable delays during normal operations like browsing and reading.
*   **Event-driven Requirement**: WHEN a user accesses the homepage or a list of articles, THE system SHALL display the content within 2 seconds.
*   **Event-driven Requirement**: WHEN a user opens a specific article, THE system SHALL load the full article content and its associated comments almost instantly (under 1.5 seconds).
*   **Event-driven Requirement**: WHEN a member submits a new article or a comment, THE system SHALL provide immediate feedback confirming the submission was successful.
*   **Event-driven Requirement**: WHEN a member uploads a file, THE system SHALL display a progress indicator for any upload expected to take longer than 3 seconds to complete.

## Security

Security requirements are crucial for protecting user data and maintaining the integrity of the platform. Users must feel safe when interacting with the discussion board.

*   **Ubiquitous Requirement**: THE system SHALL store all member passwords in a securely hashed format, never in plain text.
*   **Ubiquitous Requirement**: THE system SHALL prevent a user's private information, such as their email address, from being displayed publicly on the site.
*   **Ubiquitous Requirement**: THE system SHALL enforce access controls based on user roles, ensuring guests cannot perform actions reserved for members or admins.
*   **State-driven Requirement**: WHILE a user is logged in, THE system SHALL maintain a secure session to protect their access.
*   **State-driven Requirement**: WHEN a user logs out or their session expires, THE system SHALL require them to log in again before accessing member-only pages or functions.
*   **Unwanted Behavior Requirement**: IF a guest attempts to access a URL or function that requires authentication (e.g., the "create article" page), THEN THE system SHALL redirect them to the login page.
*   **Unwanted Behavior Requirement**: IF a user attempts to upload a file type that is not on the approved list (as defined in the [File Attachment Requirements](./07-file-attachment-requirements.md)), THEN THE system SHALL reject the file and inform the user why.

## Usability

Usability requirements ensure that the discussion board is intuitive, accessible, and user-friendly, even for those who are not tech-savvy. The design should be simple and straightforward, per the project's core goal.

*   **Ubiquitous Requirement**: THE system SHALL provide clear, consistent, and simple navigation throughout the site.
*   **Ubiquitous Requirement**: THE system SHALL ensure all interactive elements, like buttons and links, are clearly labeled and easy to understand.
*   **Unwanted Behavior Requirement**: IF a user submits a form with missing or invalid information (e.g., forgetting a title when creating an article), THEN THE system SHALL display a user-friendly error message that clearly identifies the problem and how to fix it, without clearing the valid data they have already entered.
*   **Unwanted Behavior Requirement**: IF an unexpected system error occurs, THEN THE system SHALL present a simple, non-technical error page that reassures the user and provides guidance on what to do next (e.g., "try again later" or "return to the homepage").
*   **Unwanted Behavior Requirement**: IF an action fails for a recoverable reason (e.g., a temporary network issue when posting a comment), THEN THE system SHALL notify the user of the failure and allow them to retry the action easily.
'''