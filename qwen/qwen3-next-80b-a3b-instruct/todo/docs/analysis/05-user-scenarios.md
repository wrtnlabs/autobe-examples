# User Scenarios for Todo List Application

## Primary User Journey

The primary user journey describes how an authenticated user creates, manages, and completes their personal todo items.

When a user opens the Todo list application for the first time after authentication, THE system SHALL display an empty list of todo items with a clear "Add New Task" button. WHEN the user clicks the "Add New Task" button, THE system SHALL display a text input field with a placeholder "What needs to be done?" and two buttons: "Cancel" and "Save". WHEN the user types a task description and clicks "Save", THE system SHALL create a new todo item with the entered text, set its status to "pending", assign the current timestamp as the creation date, and immediately display the new item in the list. WHEN the user clicks the "Cancel" button, THE system SHALL close the input field without creating any item. User can repeat this process to add as many todo items as required.

WHEN a user sees a pending todo item in the list, THE system SHALL display a checkbox next to the task text, a timestamp showing when the item was created, and a "Delete" button. WHEN the user checks the checkbox next to a todo item, THE system SHALL update the item's status from "pending" to "completed" and visually strike through the text. WHEN the user unchecks the checkbox of a completed item, THE system SHALL update the item's status from "completed" back to "pending" and remove the strikethrough formatting. The system SHALL preserve the original creation timestamp and only change the status.

WHEN a user sees a todo item in the list and clicks the "Delete" button, THE system SHALL display a confirmation dialog with the text "Are you sure you want to delete this task?" and two buttons: "Cancel" and "Delete". WHEN the user clicks "Delete" in the confirmation dialog, THE system SHALL remove the item permanently from the list. WHEN the user clicks "Cancel" in the confirmation dialog, THE system SHALL close the dialog without deleting the item. The system SHALL NOT delete any item without explicit confirmation.

## Secondary Scenarios

WHERE a user has multiple todo items in their list, THE system SHALL display them in descending chronological order by creation date, with the newest items appearing at the top of the list. WHERE a user has completed todo items, THE system SHALL retain them in the list with visual distinction (strikethrough text) but SHALL NOT hide them. WHERE a user has zero todo items, THE system SHALL display a neutral message below the "Add New Task" button saying "You have no tasks yet. Add one to get started!".

WHEN a user logs into the application from a different device, THE system SHALL load their complete todo list exactly as it was on their previous device, showing all pending and completed items with original timestamps. WHILE a user has an active session, THE system SHALL persist their todo list changes immediately without requiring manual save operations. WHILE a user is logged out, THE system SHALL NOT retain any todo list data or allow access to previous items.

## Error Recovery Flows

IF a user attempts to create a todo item with an empty task description, THEN THE system SHALL prevent submission of the form and display a warning message below the input field saying "Task cannot be empty." The system SHALL keep the input field visible with the cursor focused, allowing the user to enter valid text. IF the user tries to click "Save" again without entering text, THE system SHALL re-display the same warning message without changing any state.

IF a user attempts to delete a todo item that no longer exists (due to concurrent deletion), THEN THE system SHALL display a temporary notification saying "Task not found" for 3 seconds, then return to the regular list view without removing any items. The system SHALL NOT delete any item for which no record can be found.

IF authentication fails during a user session (token expired or invalidated), THEN THE system SHALL immediately redirect the user to the login page with a message "Session expired. Please log in again." All incomplete tasks in the client must remain safely stored and reload automatically after successful re-authentication.

## Edge Cases

WHILE a user is offline and attempts to create a new todo item, THE system SHALL store the item locally in temporary storage with a "draft" status and display it with a tooltip saying "Pending sync". WHEN the user regains network connectivity, THE system SHALL automatically attempt to sync the draft item. IF sync fails (server down, network error), THE system SHALL maintain the draft item indefinitely and display a persistent notification saying "Unable to sync. Check your connection." until successful. IF sync succeeds, THE system SHALL update the draft item to "pending" status and remove the "Pending sync" indicator.

WHILE multiple users access the service simultaneously, THE system SHALL ensure that each user can only access and modify their own todo items. WHERE one user attempts to access an item created by another user, THE system SHALL block the request and return "Access denied" for all operations related to items owned by others.

WHERE a user has more than 1,000 todo items in their list, THE system SHALL continue to display all items without pagination or truncation. The system SHALL maintain performance through client-side rendering optimizations but SHALL NOT hide any items regardless of quantity.

WHEN a user changes their password, THE system SHALL invalidate all existing authentication tokens and require re-authentication on all devices. The system SHALL preserve all todo items on re-authentication and continue to allow full access to the complete task list.

The system SHALL never expose any user's todo items to another user under any circumstances, even if the other user knows the exact ID of the item. The system SHALL always verify ownership of every todo item before returning it in any response.