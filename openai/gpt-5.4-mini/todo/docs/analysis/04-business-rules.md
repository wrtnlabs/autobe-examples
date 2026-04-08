**todoApp — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

A user account is identified by an email address and password credential. The email must be suitable for sign-in because users use it to create an account and log in. A user can change their password after account creation, and the new password must replace the old credential for future sign-ins. A user can also delete their account as a business action that removes the person from the application. When a user account is deleted, all todos owned by that user are permanently removed, including items that were already in trash. The account rules do not expose any other user accounts or shared access patterns. The user entity is therefore centered on identity, credential management, and account deletion consequences.

### User Account Identity

A user account is the business identity for one person in the application.

A user account is identified by an email address and a password credential.

The account identity is used for sign-up, login, password changes, and account deletion.

A user account belongs to one person only and does not represent a shared account.

The account identity remains private to the owning user and is not used to expose other users' accounts.

### Email-Based Sign-Up

A user signs up with an email address and a password credential.

The email address used during sign-up becomes the account identity for that user account.

The sign-up rule applies to creating the user account and establishing the initial password credential.

A sign-up action does not create any additional account identity beyond the email-based user account.

### Email-Based Login

A user logs in with the email address and password credential associated with the user account.

The login rule uses the same email address that was established during sign-up.

The application treats the email address as the user-facing identity for account access.

Login behavior is limited to authenticating the existing user account and does not alter the account identity.

### Password Credential and Password Change

A user account includes a password credential that is required for future logins.

A user can change the password credential after the account exists.

When the password is changed, the new password replaces the previous password credential for future logins.

A password change affects only the current user account and does not create a new user account.

### Account Deletion and Permanent Removal of Owned Todos

A user can delete their account as a business action.

When account deletion occurs, the user account is removed from the application.

When account deletion occurs, all todos owned by that user are permanently removed.

The permanent removal includes owned todos that were already in trash.

After account deletion, the removed todos are no longer available anywhere in the application.

### User Business Constraints

The user rules are limited to identity management, credential management, and account deletion consequences.

The user rules do not introduce shared access to other users' accounts.

The user rules do not introduce visibility into other users' personal account information.

The user rules remain aligned with the private nature of the application and with the requirement that user-owned todos are tied to the owning account only.

## Profile Rules

Each user has a profile that carries a display name. The display name is the editable profile value users can update over time. The profile exists to present the user in the app, not to expose private account details. The display name should be treated as the only profile attribute in scope for this document. Because the app is private, a profile is not meant to be browsed by other users. Profile rules therefore focus on what the user may present and change about themselves, while keeping the profile concept simple and personal. No additional profile fields are introduced here beyond the display name.

### Profile Display Name

THE todoApp SHALL treat the display name as the profile display name for a member.
THE todoApp SHALL treat the display name as the editable display name on the profile.
THE todoApp SHALL treat the display name as the personal profile value that identifies the member within their own profile.
THE todoApp SHALL treat the display name as the user-facing name for the profile.
THE todoApp SHALL keep the display name as the single profile attribute in scope for this unit.
IF a profile rule in this unit references profile content, THEN THE todoApp SHALL apply it to the display name only.
THE todoApp SHALL not introduce any additional profile attribute in this unit.

### Private Profile

THE todoApp SHALL treat the profile as private.
THE todoApp SHALL keep the profile limited to the owning member.
THE todoApp SHALL prevent the profile from being treated as a browsable profile for other members.
THE todoApp SHALL keep profile rules focused on the member's own profile value rather than on shared profile information.
IF a profile visibility rule is applied in this unit, THEN THE todoApp SHALL apply the private profile constraint.
THE todoApp SHALL not define any shared-profile behavior in this unit.

### Editable Display Name

WHEN the owning member updates the profile, THE todoApp SHALL allow the display name to be edited.
WHEN the display name is edited, THE todoApp SHALL keep the change within the profile's private scope.
WHEN the owning member saves a profile change, THE todoApp SHALL treat the new display name as the current user-facing name.
THE todoApp SHALL allow the editable display name to be changed over time.
IF a profile update targets a value other than the display name, THEN THE todoApp SHALL treat it as outside the editable display name rule.

### Profile Update Rule

WHEN the owning member updates the profile, THE todoApp SHALL apply the update to the display name.
WHEN the display name changes, THE todoApp SHALL keep the profile as a personal profile value for that member.
WHEN a profile update is performed, THE todoApp SHALL preserve the private profile constraint.
THE todoApp SHALL allow profile updates only for the display name in this unit.
IF the profile update does not affect the display name, THEN THE todoApp SHALL not treat it as a valid profile update within this unit.

### Profile Business Constraint

THE todoApp SHALL limit the profile business rules in this unit to the display name.
THE todoApp SHALL treat the display name as the single profile attribute.
THE todoApp SHALL treat the display name as the user-facing name used to represent the member in the app.
THE todoApp SHALL keep the profile as a personal profile value for the owning member only.
IF a rule in this unit concerns profile behavior, THEN THE todoApp SHALL evaluate it against the private profile and the display name only.
THE todoApp SHALL not define additional profile business behavior beyond the editable display name and its private profile constraint.

## Todo Rules

A todo must have a title, and the title is required whenever a todo is created or edited. A description is optional and may be left empty. A start date is optional and may also be left empty. A due date is optional and may also be left empty. Newly created todos begin in an incomplete state by default. A todo can be switched between complete and incomplete, and those two states are the only completion states in scope. Users can edit the title, description, start date, and due date of their todos. A todo may be removed from normal use by deleting it, but the business rule here treats that as a soft delete rather than immediate permanent removal. Todo rules therefore center on required content, optional scheduling details, and completion status.

### Todo Title Required

THE system SHALL require every todo to have a title.
WHEN a todo is created, THE system SHALL reject the todo if the title is missing.
WHEN a todo is edited, THE system SHALL reject the edit if the title is removed.
The title is the required content for a todo.

### Optional Description

THE system SHALL allow a todo description to be empty.
WHEN a todo is created or edited without a description, THE system SHALL accept the todo.
The description is optional content for a todo.

### Optional Start Date

THE system SHALL allow a todo start date to be empty.
WHEN a todo is created or edited without a start date, THE system SHALL accept the todo.
The start date is optional content for a todo.

### Optional Due Date

THE system SHALL allow a todo due date to be empty.
WHEN a todo is created or edited without a due date, THE system SHALL accept the todo.
The due date is optional content for a todo.

### New Todo Incomplete by Default

WHEN a todo is created, THE system SHALL set the todo to incomplete by default.
THE system SHALL apply the incomplete state to every newly created todo.
This default applies before any later completion change.

### Complete and Incomplete States

THE system SHALL allow a todo to be either complete or incomplete.
THE system SHALL treat complete and incomplete as the only completion states for a todo.
WHEN a todo completion state is changed, THE system SHALL switch the todo between complete and incomplete only.

### Todo Editing Fields

THE system SHALL allow a user to edit a todo's title, description, start date, and due date.
WHEN a todo is edited, THE system SHALL apply the change only to those editable fields.
WHEN a todo is edited, THE system SHALL continue to enforce the title requirement defined in this section.

### Soft Delete of Todo

THE system SHALL allow a todo to be deleted from normal use.
WHEN a todo is deleted, THE system SHALL treat the deletion as a soft delete.
THE system SHALL not treat a soft-deleted todo as permanently removed.
A deleted todo remains subject to the later trash rules for restored or permanent removal behavior.

### Todo Business Constraint

THE system SHALL apply the todo rules in this unit consistently to every todo.
IF a todo violates any rule defined in this unit, THEN the system SHALL reject the violating change.
These rules cover required content, optional content, completion state, editing fields, and soft delete behavior only.

## TodoEditHistory Rules

Every time a todo is edited, a history entry must be created. The history entry records when the edit was made so users can understand the sequence of changes. If the title was changed, the new title value is recorded in the history entry. If the description was changed, the new description value is recorded in the history entry. If the start date was changed, the new start date value is recorded in the history entry. If the due date was changed, the new due date value is recorded in the history entry. History entries are kept as part of the todo’s change record and are shown from the most recent entry to the oldest entry. If a todo is permanently deleted from trash, its edit history is also permanently deleted. The history rules focus on capturing change details rather than duplicating the todo itself.

### Todo Edit History

WHEN a todo is edited, THE system SHALL create one history entry for that edit.

WHEN a history entry is created, THE system SHALL record the time the edit was made.

WHEN the title changes during an edit, THE system SHALL record the changed title value in the history entry.

WHEN the description changes during an edit, THE system SHALL record the changed description value in the history entry.

WHEN the start date changes during an edit, THE system SHALL record the changed start date value in the history entry.

WHEN the due date changes during an edit, THE system SHALL record the changed due date value in the history entry.

THE system SHALL present edit history entries from the most recent entry to the oldest entry.

IF a todo is permanently deleted from trash, THEN THE system SHALL permanently delete that todo's edit history.

IF a todo is edited without changing one or more tracked values, THEN THE system SHALL not require a history value for each unchanged value.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Filtering Todo Lists

WHERE the user is viewing their own todo list, THE system SHALL allow the user to filter the list by completion status.
WHEN the user selects the all todos view, THE system SHALL show every todo in the user's list.
WHEN the user selects the complete todos view, THE system SHALL show only todos with a complete completion status.
WHEN the user selects the incomplete todos view, THE system SHALL show only todos with an incomplete completion status.
IF a todo does not match the selected completion status, THEN THE system SHALL not show that todo in the filtered list.
IF no completion-status filter is selected, THEN THE system SHALL show the list without applying a completion-status filter.

### Sorting Todo Lists

WHERE the user is viewing their own todo list, THE system SHALL allow the user to sort the list by creation date, start date, or due date.
WHEN the user sorts by creation date, THE system SHALL order the list by newest first or oldest first.
WHEN the user sorts by start date, THE system SHALL order the list by earliest first or latest first.
WHEN the user sorts by due date, THE system SHALL order the list by earliest first or latest first.
IF a todo has no start date and the list is sorted by start date, THEN THE system SHALL place that todo at the end of the list.
IF a todo has no due date and the list is sorted by due date, THEN THE system SHALL place that todo at the end of the list.

### Pagination for Todo Lists and Trash

WHERE the user is viewing the todo list or the trash list, THE system SHALL present the list as paginated.
THE system SHALL keep pagination in effect when the user changes the filter or sort choice for the same list view.
THE system SHALL show only part of the selected list on each page.
THE system SHALL allow the user to move through the remaining items by browsing additional pages.
IF the current page does not contain any items, THEN THE system SHALL still preserve the pagination state for the selected list view.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### Error Scenarios for Todo Access

WHEN a user tries to view a todo that does not belong to them, THE todoApp SHALL reject the request.

WHEN a user tries to view a deleted todo outside the trash, THE todoApp SHALL reject the request.

WHEN a user tries to view a todo that no longer exists, THE todoApp SHALL reject the request.

IF a todo access request targets a todo that the user cannot access, THEN the todoApp SHALL not reveal the todo's details.

### Rejection Rules for Invalid Todo Changes

WHEN a user tries to create a todo without a title, THE todoApp SHALL reject the request.

WHEN a user tries to edit a todo without a title, THE todoApp SHALL reject the request.

WHEN a user tries to restore a todo that is not in the trash, THE todoApp SHALL reject the request.

WHEN a user tries to permanently delete a todo that is not in the trash, THE todoApp SHALL reject the request.

IF a todo change request is rejected, THEN the todoApp SHALL leave the todo unchanged.

### Failure Cases for Private Profile Access

WHEN a user tries to view another user's profile, THE todoApp SHALL reject the request.

WHEN a user tries to view another user's display name, THE todoApp SHALL reject the request.

IF a user requests private profile data that belongs to another user, THEN the todoApp SHALL not reveal that profile data.

IF a profile access request is rejected, THEN the todoApp SHALL treat the profile as private.

### Exceptions for Todo History and Recovery

WHEN a user views the edit history of one of their todos, THE todoApp SHALL return the history in order from most recent to oldest.

IF a todo has been permanently deleted, THEN the todoApp SHALL reject requests to view its edit history.

IF a todo has been permanently deleted, THEN the todoApp SHALL reject requests to restore it.

WHEN a todo is permanently deleted from the trash, THE todoApp SHALL also delete its edit history.

IF a recovery request is invalid, THEN the todoApp SHALL reject the request.