
# Business Rules

This document outlines the specific business rules that govern the behavior of the Todo List application. These rules are not functional requirements themselves but are the low-level constraints and validations that ensure data integrity, system consistency, and adherence to the core business logic. Adhering to these rules is critical for creating a reliable and predictable system.

All rules in this document are categorized to provide clarity for developers implementing the core logic.

## User Account Rules

These rules apply to the `user` actor and their account information.

- **EARS-1 (Ubiquitous):** THE system SHALL ensure that every user account is associated with a unique email address.
- **EARS-2 (Event-driven):** WHEN a user creates a new account, THE system SHALL validate that the provided email address follows a standard email format (e.g., `name@domain.com`).
- **EARS-3 (Unwanted Behavior):** IF a user attempts to register with an email address that already exists in the system, THEN THE system SHALL prevent the registration and inform the user that the email is already in use.
- **EARS-4 (Event-driven):** WHEN a user creates an account or updates their password, THE system SHALL enforce that the password has a minimum length of 8 characters, containing at least one uppercase letter, one lowercase letter, one number, and one special character.

## Authentication and Session Rules

These rules govern how user sessions are managed and secured via token-based authentication.

- **EARS-5 (State-driven):** WHILE a user is authenticated, THE system SHALL manage their session using a short-lived JWT Access Token and a long-lived Refresh Token.
- **EARS-6 (Ubiquitous):** THE system SHALL set the expiration time for Access Tokens to 15 minutes.
- **EARS-7 (Ubiquitous):** THE system SHALL set the expiration time for Refresh Tokens to 7 days.
- **EARS-8 (Event-driven):** WHEN a user's Access Token expires, THE system SHALL provide a mechanism to use the Refresh Token to obtain a new Access Token without requiring the user to log in again.

## Data Ownership Rules

These rules ensure that users can only interact with their own data, forming the basis of the system's data isolation and security.

- **EARS-9 (Ubiquitous):** THE system SHALL associate every to-do item directly with the single `user` account that created it.
- **EARS-10 (State-driven):** WHILE a user is authenticated, THE system SHALL only permit them to read, update, or delete the to-do items that they own.
- **EARS-11 (Unwanted Behavior):** IF an authenticated user attempts to read, update, or delete a to-do item that belongs to another user, THEN THE system SHALL deny the request with an "Authorization Error" (e.g., HTTP 403 Forbidden or 404 Not Found).
- **EARS-12 (Ubiquitous):** THE system SHALL NOT allow a to-do item to be created without being assigned to a specific user.

## Todo Validation Rules

These rules define the structural and content constraints for a `todo` item.

- **EARS-13 (Event-driven):** WHEN a user creates or updates a to-do, THE system SHALL validate that the `title` field is not empty and does not consist solely of whitespace.
- **EARS-14 (Event-driven):** WHEN a user creates or updates a to-do, THE system SHALL enforce that the trimmed `title` length is between 1 and 255 characters.
- **EARS-15 (Unwanted Behavior):** IF a user attempts to create a to-do with an empty or whitespace-only `title`, THEN THE system SHALL reject the request and return an "Invalid Input" error.
- **EARS-16 (Optional Feature):** WHERE a `description` is provided for a to-do item, THE system SHALL validate that its length does not exceed 1000 characters.

## Status Management Rules

These rules define the constraints for managing the status of a to-do item.

- **EARS-17 (Ubiquitous):** THE system SHALL ensure that a to-do item's `status` is always one of the following values: "incomplete" or "complete".
- **EARS-18 (Event-driven):** WHEN a new to-do item is created, THE system SHALL automatically assign it a default `status` of "incomplete".
- **EARS-19 (State-driven):** WHILE a to-do item has a `status` of "incomplete", THE `completed_at` timestamp associated with it SHALL be `null`.
- **EARS-20 (Event-driven):** WHEN a to-do item's `status` is changed to "complete", THE system SHALL record the current timestamp in the `completed_at` field.
