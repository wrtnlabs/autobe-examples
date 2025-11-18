# Glossary for Todo List Application

## Key Terms

| Term            | Definition                                                                 |
|-----------------|----------------------------------------------------------------------------|
| Todo Item       | A single actionable task recorded by a user within the application.        |
| Task            | Synonym for todo item.                                                     |
| User            | An authenticated individual managing their own todo items.                  |
| Completed       | The status of a todo item when its action is finished by the user.         |
| Incomplete      | The default state of a todo item; not yet marked as completed.             |
| Delete          | To permanently remove a todo item so it is no longer accessible.           |
| Ownership       | The condition where specific data (e.g., a todo item) is accessible and manageable only by the authenticated user who created it. |
| API             | Interface through which users interact programmatically with the system.    |
| Minimum Functionality | The essential set of actions enabling users to create, manage, complete, and delete their own todo items, without any extra or optional features. |

## Abbreviations

| Abbreviation | Meaning              |
|--------------|---------------------|
| API          | Application Programming Interface |
| JWT          | JSON Web Token       |
| CRUD         | Create, Read, Update, Delete |

## Definitions

### Todo Item / Task
A single entry created by a user representing something they want to remember or complete. Each todo item has basic attributes: a description (what needs to be done), a completion status (complete or incomplete), and ownership (belongs to the user who created it).

### User
An individual who authenticates with the service and is able to create and manage their own set of todo items. Each user's data is isolated–users cannot access, modify, or view the todo items of others.

### Completed
The condition of a todo item after a user has finished the associated task. Marking an item as completed does not remove it from the system; it simply indicates its status. Items can be un-completed if needed.

### Incomplete
The initial status of a todo item when created; it has not yet been finished by the user.

### Delete
A permanent action that removes a todo item from the user's list. Once deleted, an item is no longer accessible or restorable from the API.

### Ownership
The business rule that restricts access and modification of todo items to their creator. The application enforces this by requiring user authentication and associating each item with a single user. No user can view, edit, or delete any item they do not own.

### API (Application Programming Interface)
The technical interface through which users interact with backend functionality, including adding, updating, completing, or deleting todo items. The API upholds all business rules around authentication and ownership.

### Minimum Functionality
The core set of capabilities required for a usable Todo list application: create a new todo, view existing todos, update (edit) a todo, mark a todo as complete/incomplete, and delete a todo. Non-essential features (tags, reminders, prioritization, etc.) are not included.

### JWT (JSON Web Token)
The mechanism used for securely transmitting information about users during authentication. It encodes user identity and permissions, allowing the API to enforce ownership and data access constraints.

### CRUD
An acronym for Create, Read, Update, Delete—the four basic actions performed on todo items.

---

This glossary is intended to be referenced throughout all project documentation. Maintaining consistent use of these definitions helps ensure clarity for the entire development team and all business stakeholders.
