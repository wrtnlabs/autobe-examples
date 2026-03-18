**multiUserTodo — Business rules, validation constraints, data browsing expectations, error scenarios**

Business rules, validation constraints, data browsing expectations, error scenarios

# Domain Business Rules

Per-concept business rules, validation logic, and domain constraints.

## User Rules

A user account is identified by an email address and is allowed to use that email to authenticate. An email must be provided at sign-up, must remain associated with the same account, and must be unique among users to prevent ambiguous ownership. A password must be provided during account creation and is required whenever the user authenticates; the system should reject missing or blank password values. Users can change their password only for their own account, and the new password must satisfy the same non-empty requirement as the original. A user account may have a display name used in their personal context, and the display name can be updated after the account is created. The system should not accept a display name that is empty or purely whitespace, because a profile name is expected to be meaningful. When a user deletes their account, the application treats the account as removed so that the user’s associated work is no longer treated as belonging to an active user. If any of these required values are missing or invalid (for example, an email is not provided, or a password is blank), the action should be rejected and the user should be told what must be corrected before proceeding.

### Email Uniqueness and Account Identity

- A user account is identified by an email address provided during sign-up. 
- The system must reject account creation if the provided email address is already associated with an existing user account.
- The system must require an email address as an input for account creation; if no email is provided, the action must be rejected.
- After sign-up, the email address associated with an account must remain associated with that same account for the lifetime of the account (the system must not treat the email as changeable as part of normal profile editing).
- The system must reject any request to authenticate a user if the email address is missing or blank.
- If an action requires an authenticated user, the system must treat the authenticated account as determined by the user’s email used to log in, and must not allow another user’s email to access the current user’s actions.

### Password Requirements for Authentication and Updates

- A password must be provided during account creation; if a password is missing or blank, the action must be rejected.
- During login, the system must require a password; if the password is missing or blank, the login attempt must be rejected.
- A user may change their password only for their own account.
- When a user changes their password, the system must require the new password to be non-empty; if the new password is blank, the password-change action must be rejected.
- If any required password input is missing (for sign-up, login, or password change), the system must reject the action and inform the user that the password value is required.

### Display Name Validation and Edit Behavior

- A user profile includes a display name.
- The system must require a display name value after account creation or as part of account creation/profile initialization as applicable; if a display name is missing, the action must be rejected.
- The system must not accept a display name that is empty or consists only of whitespace; if the display name is blank after trimming whitespace, the action must be rejected.
- A user may edit their own display name.
- When a user submits a display name update, the system must apply the same non-blank rule: the submitted display name must not be empty or whitespace-only, or the update must be rejected.
- If a user attempts to provide an invalid display name for an edit, the system must reject the edit and request a valid non-blank display name.

### Account Deletion Effects on Todo Ownership

- When a user deletes their account, the system must treat the account as removed.
- After the account is deleted, the user’s associated todos must no longer be treated as belonging to an active user.
- All of the user’s todos must be removed from the user’s normal context of ownership after account deletion, including todos that were previously in trash.
- If the user deletes their account, the system must ensure that those todos do not become viewable as belonging to another user; they remain inaccessible to other users by default.
- If any required input for account deletion is missing or invalid, the system must reject the deletion action and must not remove the account or its ownership effects.

### Validation Rejection for Missing or Invalid User Inputs

- For any user-related action that requires an email, the system must reject the action if the email input is missing or blank.
- For any user-related action that requires a password (sign-up, login, or password change), the system must reject the action if the password is missing or blank.
- For any user-related action that requires a display name, the system must reject the action if the display name is missing, empty, or whitespace-only.
- When rejecting an action due to missing or invalid user inputs, the system must communicate what must be corrected so the user can retry (for example, indicating that an email is required, a password is required, or the display name must be non-blank).

## Todo Rules

A todo requires a title to exist and to be meaningfully displayed to the user. The title must not be empty, because todos are presented with their title in lists and detail views. A description is optional, and the user may leave it empty; in that case the todo still remains valid and viewable. Both start date and due date are optional attributes, and a user may create a todo without either date. When a start date or due date is provided, it must represent a valid date value so sorting and display remain consistent. Each new todo starts in an incomplete state by default, meaning completion is not implied by its creation time. When a user marks a todo complete or incomplete, the completion status toggles between the two allowed states without introducing a third status. Editing a todo’s content should preserve the todo’s identity and keep it associated with the same user context, while applying only the provided changes to title, description, start date, and due date. If the user attempts to save an edited todo with an empty title, the system should reject the change and keep the previous valid title intact.

### Todo Title Requirement (Creation and Display)

- A todo must have a title value; the system must reject creating a todo if the provided title is empty.
- The title must not be only whitespace; the system must treat a whitespace-only title as empty and reject the creation.
- The title must remain suitable for display because the todo is shown in both list views and single-todo detail views.
- If a user edits a todo, the system must allow saving only when the edited title is not empty.
- If a user attempts to edit a todo title to an empty value (including whitespace-only), the system must reject the change and keep the existing valid title intact (defined in the section “Reject Empty Title on Edit”).

### Optional Description (May Be Empty)

- A todo may include a description value, but it is optional.
- If a user leaves the description empty (including intentionally clearing it), the todo must still be considered valid.
- If the description is empty, the system must still allow viewing the todo’s details and listing the todo without requiring a description.

### Start Date and Due Date Inputs (Both Optional)

- A todo may be created without a start date; start date input is optional.
- A todo may be created without a due date; due date input is optional.
- If a user edits a todo, changing the start date and/or due date is allowed; a user may also clear them to leave them unset.
- When a start date or due date is provided during creation or editing, the system must treat it as the authoritative value for that field going forward (until the user changes or clears it).

### Valid Date Values for Sorting and Placement

- Whenever a start date is set (defined in the section “Start Date and Due Date Inputs (Both Optional)”), the system must ensure it is a valid date value so that sorting and placement behave consistently.
- Whenever a due date is set (defined in the section “Start Date and Due Date Inputs (Both Optional)”), the system must ensure it is a valid date value so that sorting and placement behave consistently.
- If a user attempts to save a todo with an invalid start date value, the system must reject the change.
- If a user attempts to save a todo with an invalid due date value, the system must reject the change.
- When sorting by start date or due date, todos without a start date or without a due date must be placed at the end of the sorted results (sorting placement expectations are defined in the appropriate browsing/ordering expectations).

### Default Incomplete Status for New Todos

- When a user creates a new todo, the system must set its completion status to incomplete by default.
- A newly created todo must be treated as incomplete until the user explicitly marks it complete or marks it incomplete (toggle rule defined in the section “Completion Status Toggle”).

### Completion Status Toggle (Only Two States)

- A todo’s completion status must only be one of two states: complete or incomplete.
- When a user marks a todo as complete, the system must change the completion status to complete.
- When a user marks a todo as incomplete, the system must change the completion status to incomplete.
- The system must not introduce any third completion status value beyond complete and incomplete.
- The toggle action must be reversible: after marking a todo complete, the user can mark it incomplete, and vice versa.

### Reject Empty Title on Edit

- If a user edits a todo and submits a new title that is empty (including whitespace-only), the system must reject the edit.
- For such a rejected edit, the system must not allow the todo to be saved with an empty title.
- The rejected edit must not affect the todo’s existing title value (see the section “Preserve Existing Title on Invalid Edit”).

### Preserve Existing Title on Invalid Edit

- If an edit attempt fails specifically because the title is empty, the system must preserve the todo’s current valid title value.
- The system must preserve the existing title exactly as it was before the invalid edit attempt.
- Other editable fields (description, start date, due date) must not be allowed to replace the title when the title is invalid; the edit action must be rejected as a whole in a way that keeps the title unchanged.

## TodoEditHistoryEntry Rules

An edit history entry exists only as a record of changes made to a specific todo, capturing the time the edit occurred. Each history entry must have a timestamp indicating when the edit was made, so that the user can review edits from most recent to oldest. For each editable attribute—title, description, start date, and due date—the history entry records what the value changed from and what it changed to only when that attribute was actually modified. If a particular attribute was not changed during the edit, the history entry should not claim a before/after difference for that attribute. Title changes should be captured accurately so the user can see what the title was changed to as well as what it was previously. Description changes follow the same rule: only recorded as changed when the user updates the description content. Start date and due date changes are recorded when the user sets, clears, or updates those dates as part of the edit. The system should support edits that modify any subset of the available fields, producing a history entry that reflects only those modifications. When a history entry is requested for display, its entries must appear in reverse chronological order so the newest edits appear first.

### Edit Timestamp Requirement

- Every edit history entry must include a timestamp indicating when the edit was made.
- If an edit history entry is created for a given edit action, the timestamp shown to the user must correspond to the time that edit action occurred.
- When a user views edit history for a todo, the displayed entries must be based on the stored edit timestamps so that the chronology reflects the actual edit times.

### Record Only Changed Fields

- When a user edits a todo, the system must create exactly one edit history entry for that edit action.
- The edit history entry must record only the fields that the user actually changed during that edit.
- For any todo attribute (title, description, start date, due date) that was not modified in the edit action, the history entry must not claim a before-and-after difference for that attribute.
- If the user makes changes that affect only a subset of the editable attributes, the edit history entry must reflect only those subset changes and omit unchanged attributes from the before/after details.

### Title Change Tracking (From and To)

- If the user changed the todo title during the edit, the edit history entry must include both:
  - the prior title value, and
  - the new title value.
- If the user did not change the todo title during the edit, the edit history entry must not include a title before-and-after change.
- The title values shown in the history must accurately match the values the user had before the edit and the value after the edit.

### Description Change Tracking (From and To)

- If the user changed the todo description during the edit, the edit history entry must include both:
  - the prior description value, and
  - the new description value.
- If the user did not change the todo description during the edit, the edit history entry must not include a description before-and-after change.
- The description values shown in the history must accurately match the values the user had before the edit and the value after the edit.
- This tracking must work whether the description was provided or left empty, such that clearing or setting a description is reflected as a change only when that attribute is modified.

### Start Date Change Tracking (From and To)

- If the user changed the todo start date during the edit, the edit history entry must include both:
  - the prior start date value (or the fact that no start date was set before), and
  - the new start date value (or the fact that no start date is set after).
- If the user did not change the todo start date during the edit, the edit history entry must not include a start date before-and-after change.
- The start date values shown in the history must accurately match what the user had before the edit and what they have after the edit.
- This tracking must support setting a start date, updating it, and clearing it, and only show those changes when the start date attribute was modified.

### Due Date Change Tracking (From and To)

- If the user changed the todo due date during the edit, the edit history entry must include both:
  - the prior due date value (or the fact that no due date was set before), and
  - the new due date value (or the fact that no due date is set after).
- If the user did not change the todo due date during the edit, the edit history entry must not include a due date before-and-after change.
- The due date values shown in the history must accurately match what the user had before the edit and what they have after the edit.
- This tracking must support setting a due date, updating it, and clearing it, and only show those changes when the due date attribute was modified.

### Reject Edits With No Meaningful Changes

- If a user submits an edit request for a todo but the submitted changes do not result in any meaningful differences to the editable attributes (title, description, start date, due date), the system must reject the edit.
- When an edit is rejected due to having no meaningful changes, the system must not create a new edit history entry.
- “No meaningful changes” includes cases where the user leaves all fields unchanged or submits values that result in the same effective title/description/start date/due date as before.

### History Entries Most Recent First

- When a user views the full edit history of a todo, the system must display history entries sorted from most recent to oldest.
- The ordering must be determined by the edit timestamp (newest first).
- If multiple history entries exist, the relative order between entries must follow their timestamps so that the user can see edits in the same order they occurred.

## UserProfile Rules

A user profile contains a display name that represents how the user can be recognized within the application. The display name is expected to be present and meaningful, so the system should reject attempts to set it to an empty value or a value that is only whitespace. Users can edit their own display name, and the change should take effect consistently wherever the display name is shown. The profile’s display name should not affect which todos a user can access, but it must remain stable for the user unless the user explicitly updates it. Because profiles are private, the rules for updating a profile apply only to the profile belonging to the currently acting user, and attempts to update a different user’s profile should not succeed. If an update request fails due to invalid display name input, the system should preserve the existing display name rather than replacing it with an invalid value. When a user deletes their account, their profile is treated as removed as part of the account deletion outcome, so the application no longer considers that profile active. Overall, the display name must always satisfy the basic validity rules so the user interface can reliably show a usable name.

### Display Name Required Value

THE application profile for a user SHALL have a display name that is present.

IF a user attempts to set or update their display name to a value that is missing, THEN the system SHALL reject the update.

IF the system has to display a user profile name, THEN it SHALL use the user’s current display name value.

### Reject Blank or Whitespace Display Name

THE application SHALL treat a display name that is blank or consists only of whitespace as invalid.

IF a user attempts to set or update their display name to a blank or whitespace-only value, THEN the system SHALL reject the update.

IF a user’s current display name was previously accepted as valid, THEN a failed update SHALL not change it.

### Profile Display Name Edit Allowed

WHEN a signed-in user requests to edit their profile display name, THEN the system SHALL allow the update to their own profile.

THE system SHALL reflect the new display name consistently wherever the user’s display name is shown.

IF the update request succeeds, THEN the user’s profile display name SHALL change to the newly accepted value.

### Display Name Update Consistency Across Views

WHILE a user’s display name has been successfully updated, THEN the system SHALL show the updated display name consistently in subsequent places where that profile name is presented.

IF multiple views or list contexts show a user’s display name, THEN they SHALL be based on the same current display name value.

IF an update fails validation, THEN the system SHALL not partially apply the new display name in any place where it is shown.

### No Cross-User Profile Access

THE system SHALL allow a user to view and update only their own profile.

IF a user attempts to access another user’s profile (including viewing or updating a display name), THEN the system SHALL deny the request.

IF access to another user’s profile is attempted, THEN the system SHALL not reveal that other profile’s display name.

### Preserve Existing Name on Invalid Update

IF a user attempts to change their display name and the new value is invalid, THEN the system SHALL preserve the existing (previously valid) display name.

IF the user submits an invalid display name update, THEN the system SHALL not replace the current display name with the invalid value.

IF the invalid update is rejected, THEN the system SHALL leave the user’s profile in its prior state with the existing valid display name.

### Profile Removed with Account Deletion

WHEN a user deletes their account, THEN the system SHALL treat the user’s profile as removed as part of the account deletion outcome.

After account deletion completes, THEN the system SHALL no longer consider that profile active.

IF a user profile has been removed due to account deletion, THEN other users SHALL not be able to access it as an active profile.

### Private Profile Update Rules

THE system SHALL enforce that profile update rules apply only to the profile belonging to the currently acting user.

IF an update request targets a different user’s profile, THEN the system SHALL not succeed.

THE system SHALL ensure that profile privacy is maintained such that users cannot retrieve or modify another user’s profile information.

# Data Browsing Expectations

Business expectations for how users browse, find, and navigate through lists of data.

## List Browsing Expectations

Define business expectations for how users find, filter, and browse lists.

### Filtering Todo Lists

#### Filtering Todo Lists
- Users can view their own todo lists filtered to show **All todos**.
- Users can view their own todo lists filtered to show **Only complete todos**.
- Users can view their own todo lists filtered to show **Only incomplete todos**.
- When a user selects a filter option for the normal todo list, the system returns only todos owned by that user that match the selected completion status.
- When no filter is applied to the normal todo list, the system shows **All todos** by default.
- If the system receives a request with an unrecognized filter option, the request is rejected.
- If the user changes the filter option, the returned list updates to reflect the selected filter while remaining limited to that user’s own todos.

#### Filtering Trash Lists
- Users can filter the **trash** list only by the fact that todos are in trash; i.e., the system shows **only deleted (trashed) todos** for the user’s trash list.
- If the system receives a request that attempts to treat the trash list as including non-deleted todos, the request is rejected.

### Sorting Todo Lists

#### Sorting Todo Lists by Creation Date
- Users can sort their normal todo list by **creation date**.
- Users can choose **newest first** or **oldest first** for creation date sorting.

#### Sorting Todo Lists by Start Date
- Users can sort their normal todo list by **start date**.
- Users can choose **earliest first** or **latest first** for start date sorting.
- Todos without a start date appear at the end when sorting by start date.

#### Sorting Todo Lists by Due Date
- Users can sort their normal todo list by **due date**.
- Users can choose **earliest first** or **latest first** for due date sorting.
- Todos without a due date appear at the end when sorting by due date.

#### Sorting Trash Lists
- Users can sort their trash list using the same sorting options available for the normal todo list (creation date, start date, and due date), including the same “missing date goes to the end” behavior.
- If the system receives an unrecognized sort field or sort direction, the request is rejected.

#### Sorting Consistency
- Sorting applies only to the selected list context (normal todo list vs trash list) and only to that user’s own todos.
- When the user changes sorting preferences, the list order updates accordingly without changing which todos are included.

### Pagination for Todo Lists

#### Pagination for Normal Todo Lists
- Users can navigate their own normal todo list using pagination.
- The system returns a page of todos for the selected filter and sort preferences.
- The system does not mix todos from different users; only the current user’s own todos are included on every page.
- Pagination applies after filtering and sorting are applied.

#### Pagination for Trash Lists
- Users can navigate their own trash list using pagination.
- Each trash page contains only deleted (trashed) todos owned by the user.
- Pagination applies after sorting preferences for the trash list are applied.

#### Pagination Edge Cases
- If the system receives a pagination request that results in an empty page (for example, the user has fewer todos than the requested page selection would imply), the system returns an empty list for that page rather than failing.
- If the system receives an invalid pagination request (for example, a non-numeric page selection or a page selection outside allowed bounds), the request is rejected.

#### Ordering Across Pages
- Across pages, the relative order produced by the selected sorting preferences is preserved, so that moving from one page to the next continues the sorted sequence rather than reordering between pages.

# Error Conditions

Business error scenarios and how the system should respond.

## Error Scenarios

Describe error conditions and expected system responses in natural language.

### General Error Handling and Rejection Conditions

If a user submits a request that violates any validation requirement for the intended operation, the system shall reject the request.
If the user requests an operation on a todo they do not own, the system shall reject the request.
If the user requests an operation on a todo that does not exist, the system shall reject the request.
If the user requests an operation on a todo while it is in a state that does not allow that operation (for example, attempting to restore a todo that is not in trash, or attempting to permanently delete a todo that is not in trash), the system shall reject the request.
When a request is rejected, the system shall provide a clear explanation indicating that the request failed and why it failed in business terms.
If an operation succeeds, the system shall not report it as an error or exception; the response shall reflect success for that operation.

### Validation Failures for Todo Creation and Editing

If a user attempts to create a todo without a title, the system shall reject the request.
If a user attempts to edit a todo such that the title becomes empty (blank or whitespace only), the system shall reject the request.
If a user sets a due date earlier than the start date for a todo, the system shall reject the request.
If a user edits a todo and changes start date or due date such that the due date would become earlier than the start date, the system shall reject the request.
If a user leaves description, start date, or due date empty during creation, the system shall accept the request and treat those fields as not provided.
If a user edits a todo to update only some fields (for example, changing only title or only description), the system shall apply the allowed changes while still enforcing the due-date versus start-date constraint.
If a user attempts to change a field value that violates validation rules (such as blank title or due date earlier than start date), the system shall reject the request and shall not partially apply the edit.

### Validation Failures for Completing and Uncompleting Todos

If a user marks a todo as complete that they own, the system shall accept the request and set the todo completion status accordingly.
If a user marks a todo as incomplete that they own, the system shall accept the request and set the todo completion status accordingly.
If a user attempts to complete or uncomplete a todo they do not own, the system shall reject the request.
If a user attempts to complete or uncomplete a todo that does not exist, the system shall reject the request.

### Filtering and Sorting Failure-Case Handling

If a user requests a todo list with an invalid completion filter choice, the system shall reject the request.
If a user requests a todo list with an invalid sorting option, the system shall reject the request.
If a user requests sorting by start date while the todo has no start date set, the system shall place that todo at the end of the list.
If a user requests sorting by due date while the todo has no due date set, the system shall place that todo at the end of the list.
If a user requests sorting by creation date, the system shall order the user’s todos according to the selected newest-first or oldest-first direction.
If a user requests pagination with an invalid page selection (for example, a page number that cannot be represented within the requested pagination parameters), the system shall reject the request.

### Pagination Rules and Out-of-Range Behavior

If a user requests the first page of a paginated list, the system shall return the earliest segment of that list according to the active filtering and sorting selections.
If a user requests a later page that has no items (because the list is shorter than the requested page), the system shall return an empty list rather than throwing an exception.
If a user requests a paginated trash list, the system shall apply pagination after filtering to only deleted todos.
If a user requests a paginated normal todo list, the system shall apply pagination after filtering to only non-deleted todos.

### Trash, Restore, and Permanent Deletion Exceptions

If a user requests restoring a todo from trash, the system shall restore it to the normal todo list.
If a user requests restoring a todo that is not in trash, the system shall reject the request.
If a user requests permanently deleting a todo from trash, the system shall permanently remove that todo and its edit history.
If a user requests permanently deleting a todo that is not in trash, the system shall reject the request.
If a user requests permanent deletion for a todo they do not own, the system shall reject the request.
If a user requests restoring or permanently deleting a todo that does not exist, the system shall reject the request.
If a user requests deletion of a todo, the system shall perform a soft delete so the todo no longer appears in the normal todo list; if the request is rejected, the todo shall remain in its prior visibility state.

### Edit History Availability and Error Scenarios

If a user requests viewing the edit history of a todo they own, the system shall return the full edit history.
If a user requests viewing the edit history of a todo they do not own, the system shall reject the request.
If a user requests viewing the edit history of a todo that does not exist, the system shall reject the request.
If a todo has never been edited after creation, the system shall return an empty edit history rather than throwing an exception.
If a user requests edit history, the system shall sort history entries from most recent to oldest.

### Privacy and Cross-User Access Rejection

If a user attempts to view, access, or operate on another user’s profile information, the system shall deny access and reject the request.
If a user attempts to view another user’s todo (including details view, edit history view, trash view operations, restore, complete/incomplete, edit, or deletion), the system shall reject the request.
If a user attempts any operation using an identification that corresponds to a todo not owned by them, the system shall reject the request.
If a user searches or browses lists, the system shall only include todos that belong to the requesting user; items belonging to other users shall not appear.

### Error Scenarios for Unexpected Conditions (Exception Handling)

If an unexpected server-side failure occurs while processing an otherwise valid request, the system shall respond with an error indication and shall not perform a partial update that leaves the todo in an inconsistent state.
If an operation fails after any changes would have been applied, the system shall ensure the todo remains in the prior consistent state.
If an operation fails due to a transient condition, the system shall not expose sensitive internal details; it shall provide a generic business-level explanation that the request failed.