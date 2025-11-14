# Functional Requirements Specification for Todo App

This document defines all functional requirements for the Todo App system in natural language, following the EARS (Easy Approach to Requirements Syntax) format. All requirements are specified from the end-user and administrator perspective, without reference to APIs, database schemas, or frontend implementation details.

## Todo Item Creation

WHEN a user submits a new todo item with a title, THE system SHALL create a new todo record linked to the authenticated user.

WHEN a todo item title is submitted with zero characters, THE system SHALL reject the request and prevent creation.

WHEN a todo item title is submitted with more than 255 characters, THE system SHALL reject the request and prevent creation.

WHEN the system receives a request to create a todo item while the user is not authenticated, THE system SHALL deny the request and return an access error.

WHEN the user creates a todo item, THE system SHALL assign a unique internal identifier and set its completion status to false by default.

WHEN a user creates a todo item, THE system SHALL automatically record the creation timestamp in UTC.

IF the user submits a duplicate todo title for the same user, THEN THE system SHALL still create a new item with identical title.

## Todo Item Retrieval

WHEN a user requests a specific todo item by its identifier, THE system SHALL return the item if it belongs to the authenticated user.

WHEN a user requests a specific todo item that does not exist, THE system SHALL return an empty response without error.

WHEN an admin requests a specific todo item by its identifier, THE system SHALL return the item regardless of ownership.

WHEN a non-admin user requests a todo item that belongs to another user, THE system SHALL return an empty response without error.

## Todo Item Update

WHEN a user edits a todo item's title and submits the change, THE system SHALL update the title and timestamp of the corresponding item.

WHEN a user attempts to update a todo item with a title containing zero characters, THE system SHALL reject the update and retain the original title.

WHEN a user attempts to update a todo item with a title containing more than 255 characters, THE system SHALL reject the update and retain the original title.

WHEN a user attempts to update a todo item that does not belong to them, THE system SHALL reject the update and return an access error.

WHEN a user updates a todo item, THE system SHALL automatically update the last modified timestamp to the current UTC time.

WHEN an admin updates any todo item's title, THE system SHALL permit the change and update the timestamp.

## Todo Item Deletion

WHEN a user deletes a todo item, THE system SHALL permanently remove the item from storage.

WHEN a user attempts to delete a todo item that does not belong to them, THE system SHALL return an access error without deleting any item.

WHEN an admin deletes a todo item, THE system SHALL permanently remove the item from storage regardless of ownership.

WHEN a todo item is deleted, THE system SHALL ensure no trace of the item remains in persistent storage.

WHEN a user deletes all of their todo items, THE system SHALL allow the action to complete without error.

## Todo List Retrieval

WHEN a user requests their entire list of todo items, THE system SHALL return all items owned by that user, sorted by creation timestamp in descending order (newest first).

WHEN a user has no todo items, THE system SHALL return an empty array without error.

WHEN a user requests their entire list of todo items while being unauthenticated, THE system SHALL deny the request and return an authentication error.

WHEN an admin requests all todo items from a specific user, THE system SHALL return every item created by that user in descending creation order.

WHEN an admin requests all todo items from the system, THE system SHALL return every todo item from every user in descending creation order.

WHEN a user requests their todo list, THE system SHALL include the full metadata for each item: internal identifier, title, completion status, creation timestamp, and last modified timestamp.

WHILE a user is actively viewing their todo list, THE system SHALL respond to refresh requests within 1 second.

## User Authentication

WHEN a user registers with an email and password, THE system SHALL create a new user account.

WHEN a user attempts registration with an email that is already in use, THE system SHALL reject the registration with an appropriate error message.

WHEN a user attempts to log in with valid credentials, THE system SHALL authenticate the user and issue a secure, time-limited JWT access token.

WHEN a user attempts to log in with invalid credentials, THE system SHALL reject the login and return an authentication error.

WHEN a user logs in, THE system SHALL verify that the password matches the stored bcrypt hash.

WHEN a password is provided during registration, THE system SHALL hash it using bcrypt with a cost factor of 12 before storage.

WHEN a password is provided during login, THE system SHALL compare it against the stored bcrypt hash.

WHEN a user logs in from a new device, THE system SHALL generate a new session and refresh token.

WHEN an admin attempts to log into the system, THE system SHALL authenticate the user and issue an admin-scoped JWT.

WHEN an admin attempts to access administrative functions, THE system SHALL verify the presence of the admin role in the JWT claims.

WHEN a user logs out, THE system SHALL immediately invalidate the current JWT and deny further access using that token.

## Session Management

WHEN a user logs in, THE system SHALL issue an access token with a lifetime of 15 minutes.

WHEN a user logs in, THE system SHALL issue a refresh token with a lifetime of 30 days.

WHEN the access token expires, THE system SHALL allow the user to obtain a new access token using a valid refresh token.

WHEN a refresh token expires, THE system SHALL require the user to log in again to obtain new tokens.

WHEN a refresh token is used to obtain a new access token, THE system SHALL issue a new refresh token with a reset 30-day expiration.

WHEN the system detects an invalid or tampered JWT, THE system SHALL reject all associated requests with authentication failure.

WHILE a user session is active, THE system SHALL validate the JWT signature and expiration on every request.

WHEN a user changes their password, THE system SHALL immediately invalidate all existing refresh tokens associated with that account.

WHEN a user revokes access from all devices, THE system SHALL invalidate all refresh tokens for that user.

## Todo Item Completion Tracking

WHEN a user marks a todo item as completed, THE system SHALL set its completion status to true.

WHEN a user unmarks a completed todo item, THE system SHALL set its completion status to false.

WHEN a todo item is marked as completed, THE system SHALL preserve the completion timestamp for auditing purposes.

WHEN a todo item is marked as completed, THE system SHALL not alter its title or creation timestamp.

WHEN a user requests their todo list, THE system SHALL include the completion status of each item.

WHEN a user marks a todo item as completed, THE system SHALL immediately update the item's state in memory and persist the change.

WHEN an admin updates the completion status of any todo item, THE system SHALL permit the change and record the update.

WHEN a user loads their todo list and has 1,000 or more todo items, THE system SHALL return the full list within 1.5 seconds.