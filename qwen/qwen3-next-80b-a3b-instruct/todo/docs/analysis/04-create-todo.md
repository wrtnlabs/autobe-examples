# Todo Creation Requirements

## Todo Creation Process

WHEN a user submits a new todo request, THE system SHALL validate input fields, assign default values, and create a persisted todo record with a unique identifier linked to the authenticated user.

## Title Requirements

THE title of a todo SHALL be a non-empty string with a minimum length of 1 character and a maximum length of 255 characters.

WHEN a todo creation request is submitted with a null, empty, or whitespace-only title, THE system SHALL reject the request with HTTP 400 Bad Request and error code TODO_TITLE_MISSING.

WHEN a todo title exceeds 255 characters, THE system SHALL truncate it to 255 characters and log the truncation event for audit purposes.

## Description Handling

THE description of a todo SHALL be an optional string with a maximum length of 10,000 characters.

IF a description is not provided in the request, THE system SHALL store it as a null value in the database.

IF a description exceeds 10,000 characters, THE system SHALL reject the request with HTTP 400 Bad Request and error code TODO_DESCRIPTION_TOO_LONG.

## Start Date & Due Date Rules

WHEN a start date is provided, THE system SHALL validate it is in ISO 8601 date or datetime format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ).

WHEN a due date is provided, THE system SHALL validate it is in ISO 8601 date or datetime format (YYYY-MM-DD or YYYY-MM-DDTHH:mm:ss.sssZ).

IF a start date is provided but is invalid, THE system SHALL reject the request with HTTP 400 Bad Request and error code TODO_START_DATE_INVALID.

IF a due date is provided but is invalid, THE system SHALL reject the request with HTTP 400 Bad Request and error code TODO_DUE_DATE_INVALID.

WHEN both start date and due date are provided, THE system SHALL validate that the due date is not earlier than the start date.

IF the due date is earlier than the start date, THE system SHALL reject the request with HTTP 400 Bad Request and error code TODO_DUE_DATE_BEFORE_START.

IF a date field is provided with invalid timezone information, THE system SHALL reject the request with HTTP 400 Bad Request and error code TODO_DATE_TIMEZONE_INVALID.

## Default Completion Status

WHEN a new todo is created, THE system SHALL set the completion status to false (incomplete) by default, regardless of any provided value.

IF a completion status field is included in the creation request, THE system SHALL ignore it and always use false as the initial state.

## Validation Rules

WHEN a todo creation request is submitted, THE system SHALL perform the following validations in sequence:

1. Authenticate the user session
2. Validate user has permission to create todos (always yes for authenticated users)
3. Validate title exists and is not empty
4. Validate description length (if provided)
5. Validate start date format and semantics (if provided)
6. Validate due date format and semantics (if provided)
7. Validate due date is not before start date (if both provided)
8. Validate that no additional unrecognized fields are included in the request

IF any validation fails, THE system SHALL:
- Return HTTP 400 Bad Request status
- Include an error object in the response with a machine-readable code (e.g., TODO_TITLE_MISSING)
- Include a human-readable message in English
- Not create any todo record

WHERE the request contains unrecognized fields (e.g., "priority", "category", "tags"), THE system SHALL reject the request with HTTP 400 Bad Request and error code TODO_INVALID_FIELD.

WHEN a todo is successfully created, THE system SHALL:
- Generate a UUID as the todo's id
- Set createdAt to the current server time (Asia/Seoul timezone)
- Set updatedAt to the same value as createdAt
- Set completed to false
- Set userId to the authenticated user's ID
- Set description to null if not provided
- Set startDate and dueDate to null if not provided
- Return HTTP 201 Created status
- Return the complete created todo object in the response body including all fields

WHEN the database fails to persist the todo record, THE system SHALL return HTTP 503 Service Unavailable with error code TODO_PERSISTENCE_FAILURE.

## Data Isolation

THE system SHALL ensure that no todo can be created with a userId different from the authenticated user's ID.

IF the authentication token contains a userId different from the userId field in the request body, THE system SHALL reject the request with HTTP 403 Forbidden and error code TODO_USER_MISMATCH.

WHILE a todo record is being created, THE system SHALL enforce strict data isolation: todos are only writable by the authenticated owner and cannot be associated with any other user.

## Error Handling Examples

IF a user sends:
```json
{
  "title": "",
  "description": "Complete project",
  "startDate": "2026-02-06",
  "dueDate": "2026-02-05"
}
```

THEN THE system SHALL respond with:
```json
{
  "error": {
    "code": "TODO_TITLE_MISSING",
    "message": "Todo title is required and cannot be empty."
  }
}
```

IF a user sends:
```json
{
  "title": "Do laundry",
  "description": null,
  "startDate": "2026-02-06",
  "dueDate": "2026-02-05"
}
```

THEN THE system SHALL respond with:
```json
{
  "error": {
    "code": "TODO_DUE_DATE_BEFORE_START",
    "message": "Due date cannot be earlier than start date."
  }
}
```

IF a user sends:
```json
{
  "title": "Send email",
  "description": "Reminder to send quarterly report",
  "startDate": "2026-02-06T09:00:00Z",
  "dueDate": "2026-02-07T17:00:00Z",
  "completed": true,
  "ignoredField": "value"
}
```

THEN THE system SHALL respond with:
```json
{
  "error": {
    "code": "TODO_INVALID_FIELD",
    "message": "Request contains unsupported fields: ignoredField"
  }
}
```

## Request Schema Specification

The todo creation request body MUST adhere to the following JSON Schema:

```json
{
  "type": "object",
  "required": ["title"],
  "properties": {
    "title": {
      "type": "string",
      "minLength": 1,
      "maxLength": 255
    },
    "description": {
      "type": ["string", "null"],
      "maxLength": 10000
    },
    "startDate": {
      "type": ["string", "null"],
      "format": "date-time"
    },
    "dueDate": {
      "type": ["string", "null"],
      "format": "date-time"
    }
  },
  "additionalProperties": false
}
```

## Response Schema Specification

Upon successful creation, THE system SHALL return an HTTP 201 Created response with the following structure:

```json
{
  "id": "string", // UUID of the created todo
  "title": "string",
  "description": "string|null",
  "startDate": "string|null", // ISO 8601 date/time
  "dueDate": "string|null", // ISO 8601 date/time
  "completed": "boolean",
  "createdAt": "string", // ISO 8601 date/time (Asia/Seoul)
  "updatedAt": "string", // ISO 8601 date/time (Asia/Seoul)
  "userId": "string" // UUID of the authenticated user
}
```

## Relationship to Other Features

- This creation process is the entry point for the todo lifecycle
- All created todos are subject to the soft delete and trash mechanisms defined in `08-delete-todo.md` and `09-trash.md`
- All edits to created todos are recorded in the edit history system defined in `07-edit-todo.md`
- Created todos are visible in the user's todo list as defined in `05-view-todo-list.md`
- Created todos may be filtered by completion status, start date, or due date as defined in `10-filters-and-sort.md`

## Implementation Notes for Developers

1. Do not use client-provided completion status — always default to false
2. Use strict ISO 8601 date parsing with timezone awareness
3. Do not allow any fields outside the specification
4. Ensure user-to-todo ownership is enforced at the database query level using userId filtering
5. Log all validation failures to an audit trail
6. Do not return any internal server error messages to clients
7. Use UUID v4 for todo identifiers
8. Store all timestamps in UTC and convert to Asia/Seoul (KST) only for presentation in API responses
9. Validate input before any database operation
10. Reject requests with additional fields — never accept or ignore unknown properties

## Testing Scenarios

| Scenario | Input | Expected Outcome |
|--------|-------|------------------|
| Valid creation | {"title": "Buy milk"} | HTTP 201, todo created with completed=false |
| Missing title | {} | HTTP 400, TODO_TITLE_MISSING |
| Empty title | {"title": ""} | HTTP 400, TODO_TITLE_MISSING |
| Title too long | {"title": "x".repeat(256)} | HTTP 400, TODO_TITLE_TOO_LONG |
| Invalid date format | {"title": "Call mom", "dueDate": "06/02/2026"} | HTTP 400, TODO_DUE_DATE_INVALID |
| Due date before start | {"title": "Finish report", "startDate": "2026-02-08", "dueDate": "2026-02-07"} | HTTP 400, TODO_DUE_DATE_BEFORE_START |
| Description too long | {"title": "Long desc", "description": "x".repeat(10001)} | HTTP 400, TODO_DESCRIPTION_TOO_LONG |
| Extra field | {"title": "Test", "priority": "high"} | HTTP 400, TODO_INVALID_FIELD |
| User ID mismatch | {"title": "Test", "userId": "other-user-id"} | HTTP 403, TODO_USER_MISMATCH |

## Security Considerations

- Input sanitization is mandatory against XSS and SQL injection
- All validation must be performed server-side — never trust client input
- No sensitive data (passwords, tokens) can be included in any todo creation request
- User authentication must be absolutely confirmed before creation
- Timestamps must be generated server-side, never accepted from client
- No arbitrary file uploads or binary fields are permitted

## Future Extension Considerations (NOT to Implement Now)

- Future versions may support tags, categories, or priority levels
- These will be implemented as separate API endpoints or schema extensions
- This document defines the minimum viable creation interface
- The specification must be extended through official versioning — not ad-hoc changes

> *Developer Note: This document defines **business requirements only**. All technical implementations (architecture, APIs, database design, etc.) are at the discretion of the development team.*